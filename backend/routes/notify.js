require('dotenv').config();
const express = require('express');
const router  = express.Router();
const { notifyAccountVerified, notifyAccountRejected } = require('../services/notify');

// ── POST /api/notify/verified ─────────────────────────────────
router.post('/notify/verified', async (req, res) => {
  const { full_name, email, phone } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({ error: 'Missing resident info' });
  }

  await notifyAccountVerified({ full_name, email, phone });
  res.json({ success: true, message: 'Verification notifications sent' });
});

// ── POST /api/notify/rejected ─────────────────────────────────
router.post('/notify/rejected', async (req, res) => {
  const { full_name, email, phone, reason } = req.body;

  if (!email || !full_name || !reason) {
    return res.status(400).json({ error: 'Missing resident info or reason' });
  }

  await notifyAccountRejected({ full_name, email, phone }, reason);
  res.json({ success: true, message: 'Rejection notifications sent' });
});

module.exports = router;
