// controllers/adminController.js
// ─────────────────────────────────────────────────────────────
// Admin-only endpoints for managing users, roles, and suspensions

const db = require('../database/db');
const { createNotification } = require('../services/notificationService');
const { auditLog } = require('../services/auditLogService');

// ── GET USERS
function getUsers(req, res) {
  const users = db.prepare(`
    SELECT id, username, email, first_name, last_name, role, status, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();
  
  return res.json({ users });
}

// ── CHANGE ROLE
function changeRole(req, res) {
  const { id: userId } = req.params;
  const { role } = req.body;

  const validRoles = ['user', 'creator', 'moderator', 'senior_moderator', 'admin', 'compliance_officer', 'analyst'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
  }

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, userId);
  auditLog(req.user.id, req.user.role, 'user.role_changed', `user:${userId}`, {
    before: { role: user.role }, after: { role }
  });
  createNotification(userId, 'role_change', `Your account role has been updated to: ${role}`);

  return res.json({ message: `User role updated to ${role}.` });
}

// ── WARN USER (Admin context)
function warnUser(req, res) {
  const { id: userId } = req.params;
  const { reason = 'You violated our terms of service.' } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`UPDATE users SET status = 'WARNING' WHERE id = ?`).run(userId);
  auditLog(req.user.id, req.user.role, 'user.warned', `user:${userId}`, {
    before: { status: user.status }, after: { status: 'WARNING' }, details: { reason }
  });
  createNotification(userId, 'warning', `ADMIN WARNING: ${reason}`);

  return res.json({ message: 'User moved to WARNING status and notified.' });
}

// ── SUSPEND USER
function suspendUser(req, res) {
  const { id: userId } = req.params;
  const { reason = 'Temporary suspension due to rules violation.' } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`UPDATE users SET status = 'TEMP_SUSPENDED' WHERE id = ?`).run(userId);
  auditLog(req.user.id, req.user.role, 'user.suspended', `user:${userId}`, {
    before: { status: user.status }, after: { status: 'TEMP_SUSPENDED' }, details: { reason }
  });
  createNotification(userId, 'suspension', `Your account has been temporarily suspended. Reason: ${reason}`);

  return res.json({ message: 'User moved to TEMP_SUSPENDED status and notified.' });
}

// ── BAN USER
function banUser(req, res) {
  const { id: userId } = req.params;
  const { reason = 'Permanent ban due to severe rules violation.' } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`UPDATE users SET status = 'PERMANENTLY_BANNED' WHERE id = ?`).run(userId);
  auditLog(req.user.id, req.user.role, 'user.banned', `user:${userId}`, {
    before: { status: user.status }, after: { status: 'PERMANENTLY_BANNED' }, details: { reason }
  });
  createNotification(userId, 'suspension', `Your account has been permanently banned. Reason: ${reason}`);

  return res.json({ message: 'User moved to PERMANENTLY_BANNED status and notified.' });
}

// ── UNBAN / RESTORE USER
function restoreUser(req, res) {
  const { id: userId } = req.params;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`UPDATE users SET status = 'ACTIVE' WHERE id = ?`).run(userId);
  auditLog(req.user.id, req.user.role, 'user.restored', `user:${userId}`, {
    before: { status: user.status }, after: { status: 'ACTIVE' }
  });
  createNotification(userId, 'unban', `Your account has been fully restored to ACTIVE status.`);

  return res.json({ message: 'User restored to ACTIVE status and notified.' });
}

// ── ADMIN UPDATE USER (email + role)
function adminUpdateUser(req, res) {
  const { id: userId } = req.params;
  const { email, role } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const updates = [];
  const params = [];

  if (email && email.trim() !== user.email) {
    // Check email uniqueness
    const emailConflict = db.prepare(`SELECT id FROM users WHERE email = ? AND id != ?`).get(email.trim(), userId);
    if (emailConflict) return res.status(409).json({ error: 'Email already in use by another account.' });
    updates.push('email = ?');
    params.push(email.trim());
  }

  if (role) {
    const validRoles = ['user', 'creator', 'moderator', 'senior_moderator', 'admin', 'compliance_officer', 'analyst'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }
    updates.push('role = ?');
    params.push(role);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update. Provide email and/or role.' });
  }

  params.push(userId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updatedUser = db.prepare(`SELECT id, username, email, first_name, last_name, role, status FROM users WHERE id = ?`).get(userId);

  auditLog(req.user.id, req.user.role, 'user.admin_updated', `user:${userId}`, {
    before: { email: user.email, role: user.role },
    after: { email: updatedUser.email, role: updatedUser.role }
  });

  if (role && role !== user.role) {
    createNotification(userId, 'role_change', `Your account role has been updated to: ${role}`);
  }
  if (email && email.trim() !== user.email) {
    createNotification(userId, 'moderation_decision', 'Your email address has been updated by an admin.');
  }

  return res.json({ message: 'User updated.', user: updatedUser });
}

module.exports = {
  getUsers,
  changeRole,
  adminUpdateUser,
  warnUser,
  suspendUser,
  banUser,
  restoreUser
};
