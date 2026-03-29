require('dotenv').config();
const express          = require('express');
const router           = express.Router();
const { createClient } = require('@supabase/supabase-js');
const generatePDF      = require('../services/generatePDF');

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

router.post('/approve/:id', async (req, res) => {
  const { id } = req.params;
  const staffId = req.body.staff_id || null;

  try {
    console.log('Request ID received:', id);

    const { data: request, error: reqError } = await supabase
      .schema('public').from('requests')
      .select('id, purpose, age, civil_status, resident_id, document_type_id, status')
      .eq('id', id)
      .single();

    console.log('Request data:', request);
    console.log('Request error:', reqError);

    if (reqError || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ error: 'Request already approved' });
    }

    const { data: resident, error: residentError } = await supabase
      .schema('public').from('users')
      .select('full_name, email, phone, address')
      .eq('id', request.resident_id)
      .single();

    console.log('Resident:', resident, residentError);

    const { data: docType, error: docTypeError } = await supabase
      .schema('public').from('document_types')
      .select('name')
      .eq('id', request.document_type_id)
      .single();

    console.log('DocType:', docType, docTypeError);

    const docNumber = `${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const pdfBuffer = await generatePDF({
      id:            request.id,
      resident_name: resident.full_name.toUpperCase(),
      age:           request.age,
      civil_status:  request.civil_status,
      purpose:       request.purpose.toUpperCase(),
      document_name: docType.name,
      doc_number:    docNumber,
    });

    console.log('PDF generated, size:', pdfBuffer.length);

    const fileName = `documents/${id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('issued-documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    console.log('Upload error:', uploadError);

    if (uploadError) {
      return res.status(500).json({ error: 'PDF upload failed: ' + uploadError.message });
    }

    const { data: urlData } = supabase.storage
      .from('issued-documents')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;
    console.log('PDF URL:', pdfUrl);

    const { error: insertError } = await supabase
      .schema('public').from('issued_documents').insert({
        request_id: id,
        pdf_url:    pdfUrl,
        issued_at:  new Date(),
        is_valid:   true,
      });

    console.log('issued_documents insert error:', insertError);

    await supabase.schema('public').from('requests')
      .update({ status: 'approved', updated_at: new Date() })
      .eq('id', id);

    // Log the action
    await logAction(
      staffId,
      'APPROVED_REQUEST',
      'requests',
      id,
      `Approved ${docType.name} for ${resident.full_name}`
    );

    res.json({ success: true, pdf_url: pdfUrl });

  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/verify/:id ───────────────────────────────────────
router.get('/verify/:id', async (req, res) => {
  const { id } = req.params;

  console.log('Verify ID received:', id);

  const { data, error } = await supabase
    .schema('public').from('issued_documents')
    .select('id, issued_at, is_valid, request_id')
    .eq('request_id', id)
    .maybeSingle();

  console.log('issued_documents data:', data);
  console.log('issued_documents error:', error);

  if (error || !data) {
    return res.status(404).json({ valid: false, message: 'Document not found or invalid.' });
  }

  const { data: request, error: reqError } = await supabase
    .schema('public').from('requests')
    .select('purpose, resident_id, document_type_id')
    .eq('id', data.request_id)
    .single();

  console.log('Request for verify:', request, reqError);

  const { data: resident } = await supabase
    .schema('public').from('users')
    .select('full_name')
    .eq('id', request?.resident_id)
    .single();

  const { data: docType } = await supabase
    .schema('public').from('document_types')
    .select('name')
    .eq('id', request?.document_type_id)
    .single();

  console.log('Resident for verify:', resident);
  console.log('DocType for verify:', docType);

  res.json({
    valid:         data.is_valid,
    document_type: docType?.name,
    resident_name: resident?.full_name,
    purpose:       request?.purpose,
    issued_at:     data.issued_at,
    message:       data.is_valid
      ? 'This document is genuine and was officially issued.'
      : 'This document has been invalidated.',
  });
});

module.exports = router;