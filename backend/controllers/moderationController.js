const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { createNotification } = require('../services/notificationService');
const { auditLog } = require('../services/auditLogService');

// ── LIST REPORTS
function listReports(req, res) {
  const { status = 'SUBMITTED' } = req.query; // 'SUBMITTED', 'AUTO_RISK_SCORING', 'MODERATOR_REVIEW', etc.

  const reports = db.prepare(`
    SELECT r.*,
           u.username AS reporter_name,
           p.user_id  AS post_author_id,
           pa.username AS post_author_username,
           p.content AS post_content,
           p.post_type AS post_type
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    JOIN posts p ON r.post_id = p.id
    LEFT JOIN users pa ON p.user_id = pa.id
    WHERE r.report_status = ?
    ORDER BY r.created_at ASC
  `).all(status);

  return res.json({ reports });
}

// ── LIST FLAGGED POSTS
function listFlaggedPosts(req, res) {
  const posts = db.prepare(`
    SELECT p.*, u.username AS author_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'FLAGGED'
    ORDER BY p.created_at DESC
  `).all();

  return res.json({ posts });
}

// ── ESCALATED REPORTS QUEUE
function listEscalatedReports(req, res) {
  const reports = db.prepare(`
    SELECT r.*, 
           u.username AS reporter_name, 
           p.user_id AS post_author_id,
           pa.username AS post_author_username,
           p.content AS post_content,
           p.post_type AS post_type
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    JOIN posts p ON r.post_id = p.id
    LEFT JOIN users pa ON p.user_id = pa.id
    WHERE r.report_status = 'ESCALATED'
    ORDER BY r.created_at ASC
  `).all();

  return res.json({ reports });
}

// ── SET POST STATUS (UNDER_REVIEW / FLAGGED / ARCHIVED)
function setPostStatus(req, res) {
  const { id: postId } = req.params;
  const { status } = req.body;
  
  const allowed = ['UNDER_REVIEW', 'FLAGGED', 'ARCHIVED'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  db.prepare(`UPDATE posts SET status = ? WHERE id = ?`).run(status, postId);
  auditLog(req.user.id, req.user.role, 'post.status_changed', `post:${postId}`, {
    before: { status: post.status }, after: { status }
  });

  return res.json({ message: `Post status updated to ${status}.` });
}

// ── APPROVE POST
function approvePost(req, res) {
  const { id: postId } = req.params;

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  db.prepare(`UPDATE posts SET status = 'APPROVED' WHERE id = ?`).run(postId);
  auditLog(req.user.id, req.user.role, 'post.approved', `post:${postId}`, {
    before: { status: post.status }, after: { status: 'APPROVED' }
  });

  return res.json({ message: 'Post approved.' });
}

// ── REMOVE POST
function removePost(req, res) {
  const { id: postId } = req.params;
  const { reason = 'Violated community guidelines.' } = req.body;

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  db.prepare(`UPDATE posts SET status = 'REMOVED' WHERE id = ?`).run(postId);
  auditLog(req.user.id, req.user.role, 'post.removed', `post:${postId}`, {
    before: { status: post.status }, after: { status: 'REMOVED' }, details: { reason }
  });

  createNotification(post.user_id, 'moderation_decision', `Your post was removed. Reason: ${reason}`);

  return res.json({ message: 'Post removed.' });
}

// ── ESCALATE REPORT
function escalateReport(req, res) {
  const { id: reportId } = req.params;

  const report = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId);
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  db.prepare(`UPDATE reports SET report_status = 'ESCALATED' WHERE id = ?`).run(reportId);
  auditLog(req.user.id, req.user.role, 'report.escalated', `report:${reportId}`, {
    before: { report_status: report.report_status }, after: { report_status: 'ESCALATED' }
  });

  return res.json({ message: 'Report escalated to senior moderators.' });
}

// ── UPDATE REPORT STATUS
function updateReportStatus(req, res) {
  const { id: reportId } = req.params;
  const { status } = req.body; // 'MODERATOR_REVIEW', 'DECISION', 'CLOSED'

  const allowed = ['MODERATOR_REVIEW', 'DECISION', 'CLOSED'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  const report = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId);
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  db.prepare(`UPDATE reports SET report_status = ? WHERE id = ?`).run(status, reportId);
  auditLog(req.user.id, req.user.role, 'report.decision', `report:${reportId}`, {
    before: { report_status: report.report_status }, after: { report_status: status }
  });

  createNotification(report.reporter_id, 'report_outcome', `Your report has been updated to: ${status}.`);

  return res.json({ message: `Report marked as ${status}.` });
}

// ── WARN USER
function warnUser(req, res) {
  const { id: targetUserId } = req.params;
  const { reason = 'You violated our terms of service.' } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(targetUserId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  createNotification(targetUserId, 'warning', `MODERATOR WARNING: ${reason}`);
  auditLog(req.user.id, req.user.role, 'user.warned', `user:${targetUserId}`, {
    details: { reason }
  });

  return res.json({ message: `Warning sent to user ${user.username}.` });
}

// ── SUSPEND USER
function suspendUser(req, res) {
  const { id: targetUserId } = req.params;
  const { reason = 'Temporary suspension due to rules violation.' } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(targetUserId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`UPDATE users SET status = 'suspended' WHERE id = ?`).run(targetUserId);
  
  createNotification(targetUserId, 'suspension', `ACCOUNT SUSPENDED: ${reason}`);
  auditLog(req.user.id, req.user.role, 'user.suspended', `user:${targetUserId}`, { details: { reason } });

  return res.json({ message: `User ${user.username} has been suspended.` });
}

// ── BAN USER
function banUser(req, res) {
  const { id: targetUserId } = req.params;
  const { reason = 'Permanent ban due to severe rules violation.' } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(targetUserId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`UPDATE users SET status = 'banned' WHERE id = ?`).run(targetUserId);

  auditLog(req.user.id, req.user.role, 'user.banned', `user:${targetUserId}`, { details: { reason } });

  return res.json({ message: `User ${user.username} has been permanently banned.` });
}

module.exports = {
  listReports,
  listFlaggedPosts,
  listEscalatedReports,
  setPostStatus,
  approvePost,
  removePost,
  escalateReport,
  updateReportStatus,
  warnUser,
  suspendUser,
  banUser
};
