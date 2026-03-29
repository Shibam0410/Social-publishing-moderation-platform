// controllers/authController.js
// Handles user authentication:
//   POST /api/auth/register  → Create a new account (always role: 'user')
//   POST /api/auth/login     → Login and receive a JWT
//   GET  /api/auth/profile   → View the logged-in user's profile
//   PUT  /api/auth/profile   → Update username, first_name, last_name (NOT email – admin only)

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db     = require('../database/db');
const { auditLog } = require('../services/auditLogService');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_super_secret';
const MFA_SECRET = process.env.MFA_SECRET || 'changeme_mfa_secret_temporary';
const JWT_EXPIRES = '24h';

// ── REGISTER ─────────────────────────────────────────────────
/**
 * POST /api/auth/register
 * Body: { username, email, password }
 *
 * All self-registered users always get role 'user'.
 * Admins can change roles via the Admin panel after registration.
 */
async function register(req, res) {
  try {
    let { username, email, password } = req.body;
    if (email) email = email.toLowerCase().trim();
    if (username) username = username.trim();

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = db.prepare(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `).get(username, email);

    if (existing) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Always assign 'user' role — role assignment is admin-only after registration
    db.prepare(`
      INSERT INTO users (id, username, email, password, role)
      VALUES (?, ?, ?, ?, 'user')
    `).run(userId, username, email, hashedPassword);

    auditLog(userId, 'user', 'user.register', `user:${userId}`, {
      details: { username, email }
    });

    return res.status(201).json({ message: 'Account created successfully. You can now log in.' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

// ── LOGIN ─────────────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    let { email, password } = req.body;
    if (email) email = email.toLowerCase().trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const user = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'TEMP_SUSPENDED') {
      return res.status(403).json({ error: 'Your account is temporarily suspended.' });
    }
    if (user.status === 'PERMANENTLY_BANNED') {
      return res.status(403).json({ error: 'Your account has been permanently banned.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // CHECK MFA
    if (user.mfa_enabled === 1) {
      const mfaToken = jwt.sign({ id: user.id, username: user.username, role: user.role, mfaPending: true }, MFA_SECRET, { expiresIn: '5m' });
      return res.json({ mfaRequired: true, mfaToken });
    }

    // Log access history
    try {
      const { v4: uuid2 } = require('uuid');
      db.prepare(`INSERT INTO access_history (id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)`)
        .run(uuid2(), user.id, req.ip || null, req.headers['user-agent'] || null);
    } catch (_) {}

    auditLog(user.id, user.role, 'user.login', `user:${user.id}`, {});

    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

// ── GET PROFILE ────────────────────────────────────────────────
/**
 * GET /api/auth/profile
 */
function getProfile(req, res) {
  const user = db.prepare(`
    SELECT id, username, email, first_name, last_name, role, status, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ user });
}

// ── UPDATE PROFILE ──────────────────────────────────────────────
/**
 * PUT /api/auth/profile
 * 
 * Regular users: update username, first_name, last_name ONLY.
 * Email and role changes require admin via /api/admin/users/:id.
 */
async function updateProfile(req, res) {
  try {
    const { username, first_name, last_name } = req.body;
    const userId = req.user.id;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    // Check username uniqueness
    const conflict = db.prepare(`SELECT id FROM users WHERE username = ? AND id != ?`).get(username.trim(), userId);
    if (conflict) {
      return res.status(409).json({ error: 'Username already in use.' });
    }

    db.prepare(`
      UPDATE users SET username = ?, first_name = ?, last_name = ? WHERE id = ?
    `).run(username.trim(), first_name?.trim() || null, last_name?.trim() || null, userId);

    const updatedUser = db.prepare(`
      SELECT id, username, email, first_name, last_name, role, status FROM users WHERE id = ?
    `).get(userId);

    // Refresh JWT so updated username propagates immediately
    const payload = { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    auditLog(userId, req.user.role, 'user.profile_updated', `user:${userId}`, {
      after: { username: updatedUser.username }
    });

    return res.json({ message: 'Profile updated.', user: updatedUser, token });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
}

// ── OAUTH LOGIN (MOCK) ──────────────────────────────────────────
async function oauthLogin(req, res) {
  try {
    const { provider, email, name, oauthId } = req.body;
    if (!provider || !email || !oauthId) return res.status(400).json({ error: 'Missing OAuth parameters.' });
    
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const userId = uuidv4();
      const username = name ? name.toLowerCase().replace(/\\s+/g, '') + Math.floor(Math.random() * 1000) : email.split('@')[0];
      const hashedPassword = await bcrypt.hash(uuidv4(), 10); // Random password since it's oauth
      db.prepare(`
        INSERT INTO users (id, username, email, password, role, oauth_provider, oauth_id)
        VALUES (?, ?, ?, ?, 'user', ?, ?)
      `).run(userId, username, email, hashedPassword, provider, oauthId);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      auditLog(userId, 'user', 'user.register_oauth', 'user:' + userId, { details: { provider } });
    } else {
      // Update with oauth provider if not linked
      if (!user.oauth_provider) {
        db.prepare('UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?').run(provider, oauthId, user.id);
      }
    }

    if (user.status === 'TEMP_SUSPENDED') return res.status(403).json({ error: 'Account suspended.' });
    if (user.status === 'PERMANENTLY_BANNED') return res.status(403).json({ error: 'Account banned.' });

    if (user.mfa_enabled === 1) {
      const mfaToken = jwt.sign({ id: user.id, username: user.username, role: user.role, mfaPending: true }, MFA_SECRET, { expiresIn: '5m' });
      return res.json({ mfaRequired: true, mfaToken });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('OAuth error:', err);
    return res.status(500).json({ error: 'OAuth registration/login failed.' });
  }
}

// ── MFA SETUP ───────────────────────────────────────────────────
async function setupMFA(req, res) {
  try {
    const userId = req.user.id;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (user.mfa_enabled === 1) return res.status(400).json({ error: 'MFA already enabled.' });

    const secret = authenticator.generateSecret();
    db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(secret, userId);

    const otpauth = authenticator.keyuri(user.email, 'SocialPublishing', secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    return res.json({ secret, qrCodeUrl });
  } catch (err) {
    console.error('MFA Setup error:', err);
    return res.status(500).json({ error: 'Failed to setup MFA.' });
  }
}

// ── MFA VERIFY & ENABLE ─────────────────────────────────────────
function verifyMFA(req, res) {
  const { token } = req.body;
  const userId = req.user.id;
  const user = db.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(userId);

  if (!user.mfa_secret) return res.status(400).json({ error: 'MFA not setup.' });

  const isValid = authenticator.verify({ token, secret: user.mfa_secret });
  if (!isValid) return res.status(400).json({ error: 'Invalid MFA token.' });

  db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(userId);
  return res.json({ message: 'MFA enabled successfully.' });
}

// ── MFA LOGIN ───────────────────────────────────────────────────
function mfaLogin(req, res) {
  const { mfaToken, token: mfaCode } = req.body;
  if (!mfaToken || !mfaCode) return res.status(400).json({ error: 'MFA token and code required.' });

  try {
    const payload = jwt.verify(mfaToken, MFA_SECRET);
    if (!payload.mfaPending) throw new Error('Invalid token type.');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user || user.mfa_enabled !== 1) return res.status(400).json({ error: 'Invalid user or MFA state.' });

    const isValid = authenticator.verify({ token: mfaCode, secret: user.mfa_secret });
    if (!isValid) return res.status(401).json({ error: 'Invalid MFA code.' });

    auditLog(user.id, user.role, 'user.login_mfa', 'user:' + user.id, {});

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, status: user.status } });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired MFA session.' });
  }
}

module.exports = { register, login, getProfile, updateProfile, oauthLogin, setupMFA, verifyMFA, mfaLogin };
