// controllers/inviteController.js
// Handles: invite flow (admin sends invite) + password reset flow + accept-invite

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { sendInviteEmail, sendPasswordResetEmail } = require('../services/emailService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_super_secret';

// Ensure token tables exist (migration-safe)
db.exec(`
  CREATE TABLE IF NOT EXISTS invite_tokens (
    id TEXT PRIMARY KEY, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
    token TEXT UNIQUE NOT NULL, invited_by TEXT NOT NULL,
    expires_at DATETIME NOT NULL, used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL, expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Helper: generate a secure random token ────────────────────────────────────
function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Helper: 10 minutes from now as ISO string ─────────────────────────────────
function tenMinutesFromNow() {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

// ── ADMIN: INVITE USER ────────────────────────────────────────────────────────
/**
 * POST /api/admin/invite
 * Body: { email, role }
 * Requires: admin role
 *
 * Creates a pending invite token and sends an email to the invitee.
 * If the user already exists, we return a helpful error.
 */
async function inviteUser(req, res) {
  try {
    let { email, role = 'user' } = req.body;
    if (email) email = email.toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'email is required.' });

    const validRoles = ['user', 'creator', 'moderator', 'senior_moderator', 'admin', 'compliance_officer', 'analyst'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Choose from: ${validRoles.join(', ')}` });
    }

    // Check if user already exists
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existing) return res.status(409).json({ error: 'A user with this email already exists.' });

    // Invalidate any previous unused invites for this email
    db.prepare(`DELETE FROM invite_tokens WHERE email = ? AND used = 0`).run(email);

    const token = makeToken();
    const expiresAt = tenMinutesFromNow();
    const invitor = db.prepare(`SELECT username FROM users WHERE id = ?`).get(req.user.id);

    db.prepare(`
      INSERT INTO invite_tokens (id, email, role, token, invited_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), email, role, token, req.user.id, expiresAt);

    await sendInviteEmail({
      toEmail: email,
      role,
      token,
      invitedByUsername: invitor?.username || 'Admin'
    });

    return res.json({ message: `Invitation sent to ${email} for role: ${role}` });
  } catch (err) {
    console.error('Invite error:', err);
    return res.status(500).json({ error: 'Failed to send invite. Check server logs.' });
  }
}

// ── ACCEPT INVITE ─────────────────────────────────────────────────────────────
/**
 * POST /api/auth/accept-invite
 * Body: { token, username, password }
 *
 * Creates the user account using information from the invite token.
 */
async function acceptInvite(req, res) {
  try {
    const { token, username, password } = req.body;
    if (!token || !username || !password) {
      return res.status(400).json({ error: 'token, username, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const invite = db.prepare(`SELECT * FROM invite_tokens WHERE token = ?`).get(token);
    if (!invite) return res.status(400).json({ error: 'Invalid invite link.' });
    if (invite.used) return res.status(400).json({ error: 'This invite link has already been used.' });
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invite link has expired (10-minute limit). Please ask the admin to resend.' });
    }

    // Check username uniqueness
    const existingUsername = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
    if (existingUsername) return res.status(409).json({ error: 'Username already taken. Please choose another.' });

    // Check if email already registered (shouldn't happen but guard)
    const existingEmail = db.prepare(`SELECT id FROM users WHERE email = ?`).get(invite.email);
    if (existingEmail) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)
    `).run(userId, username, invite.email, hashedPassword, invite.role);

    // Mark invite as used
    db.prepare(`UPDATE invite_tokens SET used = 1 WHERE id = ?`).run(invite.id);

    return res.status(201).json({ message: 'Account created! You can now log in.' });
  } catch (err) {
    console.error('Accept invite error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Sends a password reset email if the email is registered.
 * Always returns 200 to avoid email enumeration.
 */
async function forgotPassword(req, res) {
  try {
    let { email } = req.body;
    if (email) email = email.toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'email is required.' });

    const user = db.prepare(`SELECT id, username FROM users WHERE email = ?`).get(email);

    if (user) {
      // Invalidate previous tokens
      db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ? AND used = 0`).run(user.id);

      const token = makeToken();
      const expiresAt = tenMinutesFromNow();
      db.prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), user.id, token, expiresAt);

      await sendPasswordResetEmail({ toEmail: email, token });
    }

    // Always return 200 (don't reveal if email exists)
    return res.json({ message: "If that email is registered, you'll receive a reset link shortly." });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const record = db.prepare(`SELECT * FROM password_reset_tokens WHERE token = ?`).get(token);
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link.' });
    if (record.used) return res.status(400).json({ error: 'This reset link has already been used.' });
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired (10-minute limit). Please request a new one.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hashed, record.user_id);
    db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`).run(record.id);

    return res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

// ── VALIDATE INVITE TOKEN (GET — to pre-fill email on the form) ───────────────
/**
 * GET /api/auth/validate-invite?token=...
 * Returns the email and role associated with a token (for pre-filling the form).
 */
function validateInviteToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token is required.' });

  const invite = db.prepare(`SELECT email, role, expires_at, used FROM invite_tokens WHERE token = ?`).get(token);
  if (!invite) return res.status(400).json({ error: 'Invalid invite link.' });
  if (invite.used) return res.status(400).json({ error: 'This invite link has already been used.' });
  if (new Date(invite.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This invite link has expired. Please ask the admin to resend.' });
  }

  return res.json({ email: invite.email, role: invite.role, expiresAt: invite.expires_at });
}

module.exports = { inviteUser, acceptInvite, forgotPassword, resetPassword, validateInviteToken };
