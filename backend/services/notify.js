require('dotenv').config();
const nodemailer = require('nodemailer');

// ── Email transporter ─────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// ── Send Email ────────────────────────────────────────────────
async function sendEmail(to, subject, htmlBody) {
  try {
    await transporter.sendMail({
      from: `"Barangay E-Gov Portal" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlBody,
    });
    console.log('Email sent to:', to);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// ── Send SMS via Semaphore ────────────────────────────────────
async function sendSMS(phone, message) {
  try {
    const params = new URLSearchParams({
      apikey:      process.env.SEMAPHORE_KEY,
      number:      phone,
      message:     message,
      sendername:  process.env.SENDER_NAME || 'BarangayEGov',
    });

    const response = await fetch(
      `https://api.semaphore.co/api/v4/messages?${params.toString()}`,
      { method: 'POST' }
    );

    const result = await response.json();
    console.log('SMS sent to:', phone, result);
  } catch (err) {
    console.error('SMS error:', err.message);
  }
}

// ── Account Verified notification ────────────────────────────
async function notifyAccountVerified(resident) {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1A56A0;">Barangay E-Government Portal</h2>
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #16a34a; margin: 0 0 10px;">Account Verified!</h3>
        <p style="color: #374151; margin: 0;">Dear <strong>${resident.full_name}</strong>,</p>
        <p style="color: #374151;">Your account has been verified by our staff. You can now log in and submit document requests.</p>
      </div>
      <p style="color: #6b7280; font-size: 13px;">If you have any questions, please visit the barangay hall.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>
      <p style="color: #9ca3af; font-size: 12px;">Barangay E-Government Service Request System</p>
    </div>
  `;

  const smsMessage = `Barangay E-Gov: Hello ${resident.full_name}, your account has been verified! You can now log in at ${process.env.FRONTEND_URL || 'our portal'} and submit document requests.`;

  await Promise.all([
    sendEmail(resident.email, 'Your Account Has Been Verified - Barangay E-Gov', emailBody),
    sendSMS(resident.phone, smsMessage),
  ]);
}

// ── Account Rejected notification ────────────────────────────
async function notifyAccountRejected(resident, reason) {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1A56A0;">Barangay E-Government Portal</h2>
      <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #dc2626; margin: 0 0 10px;">Account Registration Rejected</h3>
        <p style="color: #374151; margin: 0;">Dear <strong>${resident.full_name}</strong>,</p>
        <p style="color: #374151;">Unfortunately, your account registration could not be approved.</p>
        <p style="color: #374151;"><strong>Reason:</strong> ${reason}</p>
        <p style="color: #374151;">You may re-register with a valid ID. Please visit the barangay hall if you need assistance.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>
      <p style="color: #9ca3af; font-size: 12px;">Barangay E-Government Service Request System</p>
    </div>
  `;

  const smsMessage = `Barangay E-Gov: Hello ${resident.full_name}, your account registration was rejected. Reason: ${reason}. Please re-register with a valid ID or visit the barangay hall.`;

  await Promise.all([
    sendEmail(resident.email, 'Account Registration Update - Barangay E-Gov', emailBody),
    sendSMS(resident.phone, smsMessage),
  ]);
}

module.exports = { notifyAccountVerified, notifyAccountRejected };
