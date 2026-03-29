// services/auditLogService.js
// ─────────────────────────────────────────────────────────────
// Centralised audit logging service.
// All controllers should use this instead of local auditLog() helpers.
//
// Action naming convention  (category.verb):
//   post.created    post.edited     post.deleted
//   post.approved   post.removed    post.status_changed
//   report.submitted  report.escalated  report.decision   report.updated
//   user.warned     user.suspended  user.banned    user.restored
//   user.role_changed
//   compliance.data_export   compliance.deletion_approved  compliance.deletion_rejected

const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

/**
 * Write an immutable audit log entry.
 *
 * @param {string}  actorId     - ID of the user performing the action
 * @param {string}  actorRole   - Role of that user at the time
 * @param {string}  action      - Namespaced action string, e.g. 'post.edited'
 * @param {string}  targetId    - Prefixed target ref, e.g. 'post:<uuid>' or 'user:<uuid>'
 * @param {object}  [opts]      - Optional extras
 * @param {object}  [opts.before]   - State snapshot before the change
 * @param {object}  [opts.after]    - State snapshot after the change
 * @param {object}  [opts.details]  - Arbitrary extra context
 */
function auditLog(actorId, actorRole, action, targetId, opts = {}) {
  const { before = null, after = null, details = null } = (opts || {});
  db.prepare(`
    INSERT INTO audit_logs
      (id, admin_id, actor_role, action, target_id, before_state, after_state, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    actorId,
    actorRole || null,
    action,
    targetId || null,
    before  ? JSON.stringify(before)  : null,
    after   ? JSON.stringify(after)   : null,
    details ? JSON.stringify(details) : null
  );
}

// ── KNOWN ACTION CATALOGUE ──────────────────────────────────
const ACTION_TYPES = {
  'post.created':                'User created a new post',
  'post.edited':                 'Post content was edited by the author',
  'post.deleted':                'Post was permanently deleted',
  'post.approved':               'Moderator approved a post',
  'post.removed':                'Moderator removed a post',
  'post.status_changed':         'Post status was changed by a moderator',
  'report.submitted':            'User submitted a content report',
  'report.escalated':            'Report was escalated to senior moderators',
  'report.decision':             'Final decision made on a report',
  'report.updated':              'Report status updated by a moderator',
  'user.warned':                 'User received an official warning',
  'user.suspended':              'User account was temporarily suspended',
  'user.banned':                 'User account was permanently banned',
  'user.restored':               'User account was restored to ACTIVE',
  'user.role_changed':           'User role was changed by an admin',
  'user.login':                  'User logged in',
  'user.register':               'New user account registered',
  'compliance.data_export':      'User data exported for compliance',
  'compliance.deletion_approved':'GDPR deletion request approved and data erased',
  'compliance.deletion_rejected':'GDPR deletion request rejected',
};

module.exports = { auditLog, ACTION_TYPES };
