require('dotenv').config();
const express          = require('express');
const router           = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { notifyAccountVerified, notifyAccountRejected } = require('../services/notify');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── Audit log helper ──────────────────────────────────────────
async function logAction(userId, action, targetTable, targetId, details) {
  await supabase.schema('public').from('audit_logs').insert({
    user_id:      userId,
    action:       action,
    target_table: targetTable,
    target_id:    targetId,
    details:      details,
    timestamp:    new Date(),
  });
}

// ── POST /api/notify/verified ─────────────────────────────────
router.post('/notify/verified', async (req, res) => {
  const { full_name, email, phone, staff_id, resident_id } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({ error: 'Missing resident info' });
  }

  await notifyAccountVerified({ full_name, email, phone });

  // Log the verification action
  await logAction(
    staff_id || null,
    'VERIFIED_ACCOUNT',
    'users',
    resident_id || null,
    `Verified account for ${full_name} (${email})`
  );

  res.json({ success: true, message: 'Verification notifications sent' });
});

// ── POST /api/notify/rejected ─────────────────────────────────
router.post('/notify/rejected', async (req, res) => {
  const { full_name, email, phone, reason, staff_id, resident_id } = req.body;

  if (!email || !full_name || !reason) {
    return res.status(400).json({ error: 'Missing resident info or reason' });
  }

  await notifyAccountRejected({ full_name, email, phone }, reason);

  // Log the rejection action
  await logAction(
    staff_id || null,
    'REJECTED_ACCOUNT',
    'users',
    resident_id || null,
    `Rejected account for ${full_name} (${email}). Reason: ${reason}`
  );

  res.json({ success: true, message: 'Rejection notifications sent' });
});

module.exports = router;