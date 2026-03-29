// services/emailService.js
// Handles all outbound emails: invite links and password reset links.
// Uses nodemailer with SMTP transport configured via environment variables.
//
// Required .env variables:
//   EMAIL_HOST     - SMTP host (e.g. smtp.gmail.com)
//   EMAIL_PORT     - SMTP port (e.g. 587)
//   EMAIL_USER     - SMTP username / from address
//   EMAIL_PASS     - SMTP password or app password
//   FRONTEND_URL   - Base URL of the frontend (e.g. http://localhost:5173)

const nodemailer = require('nodemailer');

// ── Transport ─────────────────────────────────────────────────────────────────
function getTransporter() {
  // If EMAIL_HOST is not configured, use nodemailer's Ethereal for safe dev preview
  if (!process.env.EMAIL_HOST) {
    console.warn('[emailService] No EMAIL_HOST set — emails will be logged to console only (dev mode).');
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const FROM_ADDRESS = process.env.EMAIL_USER || 'noreply@vibecast.app';

// ── Send Invite Email ─────────────────────────────────────────────────────────
async function sendInviteEmail({ toEmail, role, token, invitedByUsername }) {
  const link = `${FRONTEND_URL}/accept-invite?token=${token}`;
  const roleLabel = role.replace(/_/g, ' ');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
      <h2 style="color:#1e293b; margin-bottom: 8px;">You've been invited to VibeCast 🎉</h2>
      <p style="color:#64748b; font-size:15px; line-height:1.6;">
        <strong>${invitedByUsername}</strong> has invited you to join VibeCast as a <strong>${roleLabel}</strong>.
        Click the button below to set up your account. This link expires in <strong>10 minutes</strong>.
      </p>
      <a href="${link}" style="display:inline-block; margin: 24px 0; padding: 12px 28px; background:#3b82f6; color:#fff; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">
        Accept Invitation &amp; Set Password
      </a>
      <p style="color:#94a3b8; font-size:12px; margin-top:24px;">
        If you didn't expect this email, you can ignore it safely.<br/>
        This link expires at: ${new Date(Date.now() + 10 * 60 * 1000).toUTCString()}
      </p>
    </div>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    // Dev fallback — print to console
    console.log('\n──────────────────────────────────');
    console.log('[EMAIL DEV] INVITE EMAIL');
    console.log('To:', toEmail);
    console.log('Role:', roleLabel);
    console.log('Link:', link);
    console.log('──────────────────────────────────\n');
    return;
  }
  await transporter.sendMail({
    from: `"VibeCast" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: `You're invited to VibeCast as ${roleLabel}`,
    html,
  });
}

// ── Send Password Reset Email ─────────────────────────────────────────────────
async function sendPasswordResetEmail({ toEmail, token }) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
      <h2 style="color:#1e293b; margin-bottom: 8px;">Reset your VibeCast password 🔐</h2>
      <p style="color:#64748b; font-size:15px; line-height:1.6;">
        We received a request to reset your password. Click the button below — this link expires in <strong>10 minutes</strong>.
      </p>
      <a href="${link}" style="display:inline-block; margin: 24px 0; padding: 12px 28px; background:#3b82f6; color:#fff; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">
        Reset Password
      </a>
      <p style="color:#94a3b8; font-size:12px; margin-top:24px;">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
    </div>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    console.log('\n──────────────────────────────────');
    console.log('[EMAIL DEV] PASSWORD RESET EMAIL');
    console.log('To:', toEmail);
    console.log('Link:', link);
    console.log('──────────────────────────────────\n');
    return;
  }
  await transporter.sendMail({
    from: `"VibeCast" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: 'Reset your VibeCast password',
    html,
  });
}

module.exports = { sendInviteEmail, sendPasswordResetEmail };
