// controllers/complianceController.js
// ─────────────────────────────────────────────────────────────
// Full GDPR-aware Compliance module:
//   - Multi-format data export  (JSON / CSV / PDF)
//   - Data deletion request workflow
//   - Audit log listing (paginated + filterable)
//   - Access / login history per user

const { v4: uuidv4 } = require('uuid');
const { Parser }     = require('json2csv');
const PDFDocument    = require('pdfkit');
const db             = require('../database/db');

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Collect every piece of user data into one structured object */
function collectUserData(userId) {
  const user     = db.prepare(`SELECT id, username, email, role, status, created_at FROM users WHERE id = ?`).get(userId);
  const posts    = db.prepare(`SELECT id, content, post_type, status, created_at FROM posts WHERE user_id = ?`).all(userId);
  const comments = db.prepare(`SELECT id, post_id, content, created_at FROM comments WHERE user_id = ?`).all(userId);
  const likes    = db.prepare(`SELECT id, post_id, created_at FROM likes WHERE user_id = ?`).all(userId);
  const bookmarks= db.prepare(`SELECT id, post_id, created_at FROM bookmarks WHERE user_id = ?`).all(userId);
  const reports  = db.prepare(`SELECT id, post_id, reason, report_status, risk_score, created_at FROM reports WHERE reporter_id = ?`).all(userId);
  const warnings = db.prepare(`SELECT id, type, message, created_at FROM notifications WHERE user_id = ? AND type IN ('warning','suspension','ban','unban')`).all(userId);
  const logins   = db.prepare(`SELECT ip_address, user_agent, created_at FROM access_history WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
  return { user, posts, comments, likes, bookmarks, reports, warnings, logins, exported_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────

function getAuditLogs(req, res) {
  const { limit = 50, page = 1, action, admin_id } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query  = `SELECT a.*, u.username AS admin_name, u.email AS admin_email FROM audit_logs a LEFT JOIN users u ON a.admin_id = u.id WHERE 1=1`;
  const params = [];

  if (action)   { query += ` AND a.action = ?`;   params.push(action); }
  if (admin_id) { query += ` AND a.admin_id = ?`; params.push(admin_id); }

  query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), offset);

  const logs  = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as count FROM audit_logs`).get().count;

  return res.json({ total, page: Number(page), limit: Number(limit), logs });
}

// ─────────────────────────────────────────────────────────────
// DATA EXPORT — JSON
// ─────────────────────────────────────────────────────────────

function exportUserDataJSON(req, res) {
  const { id: userId } = req.params;
  const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const data = collectUserData(userId);
  res.setHeader('Content-Disposition', `attachment; filename="user_${userId}_export.json"`);
  res.setHeader('Content-Type', 'application/json');
  return res.json(data);
}

// ─────────────────────────────────────────────────────────────
// DATA EXPORT — CSV
// ─────────────────────────────────────────────────────────────

function exportUserDataCSV(req, res) {
  const { id: userId } = req.params;
  const user = db.prepare(`SELECT id, username, email FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const data       = collectUserData(userId);
  const sections   = [];

  // Flatten posts
  if (data.posts.length) {
    const parser = new Parser({ fields: ['id', 'content', 'post_type', 'status', 'created_at'] });
    sections.push(`\n## POSTS\n${parser.parse(data.posts)}`);
  }
  // Flatten comments
  if (data.comments.length) {
    const parser = new Parser({ fields: ['id', 'post_id', 'content', 'created_at'] });
    sections.push(`\n## COMMENTS\n${parser.parse(data.comments)}`);
  }
  // Flatten likes
  if (data.likes.length) {
    const parser = new Parser({ fields: ['id', 'post_id', 'created_at'] });
    sections.push(`\n## LIKES\n${parser.parse(data.likes)}`);
  }
  // Login history
  if (data.logins.length) {
    const parser = new Parser({ fields: ['ip_address', 'user_agent', 'created_at'] });
    sections.push(`\n## LOGIN HISTORY\n${parser.parse(data.logins)}`);
  }

  const header = `GDPR Data Export for: ${user.username} (${user.email})\nExported at: ${data.exported_at}\n`;
  const csv    = header + sections.join('\n');

  res.setHeader('Content-Disposition', `attachment; filename="user_${userId}_export.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  return res.send(csv);
}

// ─────────────────────────────────────────────────────────────
// DATA EXPORT — PDF
// ─────────────────────────────────────────────────────────────

function exportUserDataPDF(req, res) {
  const { id: userId } = req.params;
  const userRow = db.prepare(`SELECT id, username, email FROM users WHERE id = ?`).get(userId);
  if (!userRow) return res.status(404).json({ error: 'User not found.' });

  const data = collectUserData(userId);

  res.setHeader('Content-Disposition', `attachment; filename="user_${userId}_export.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('GDPR Data Export', { align: 'center' });
  doc.fontSize(11).font('Helvetica').text(`User: ${data.user.username}  |  Email: ${data.user.email}`, { align: 'center' });
  doc.text(`Role: ${data.user.role}  |  Status: ${data.user.status}`, { align: 'center' });
  doc.text(`Exported: ${data.exported_at}`, { align: 'center' });
  doc.moveDown(1.5);

  // Section helper
  function section(title, rows, columns) {
    doc.fontSize(13).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
    if (!rows.length) {
      doc.fontSize(10).font('Helvetica').text('  No records.').moveDown(0.5);
      return;
    }
    rows.forEach((row, i) => {
      const line = columns.map(c => `${c}: ${row[c] ?? ''}`).join('   ');
      doc.fontSize(9).font('Helvetica').text(`${i + 1}. ${line}`);
    });
    doc.moveDown(0.8);
  }

  section('Posts', data.posts, ['post_type', 'status', 'created_at']);
  section('Comments', data.comments, ['post_id', 'created_at']);
  section('Likes', data.likes, ['post_id', 'created_at']);
  section('Bookmarks', data.bookmarks, ['post_id', 'created_at']);
  section('Reports Submitted', data.reports, ['reason', 'report_status', 'risk_score', 'created_at']);
  section('Moderation Actions Received', data.warnings, ['type', 'message', 'created_at']);
  section('Login History', data.logins, ['ip_address', 'user_agent', 'created_at']);

  doc.end();
}

// ─────────────────────────────────────────────────────────────
// EXPORT ROUTER (single endpoint, ?format= query param)
// ─────────────────────────────────────────────────────────────

function exportUserData(req, res) {
  const fmt = (req.query.format || 'json').toLowerCase();
  if (fmt === 'csv')  return exportUserDataCSV(req, res);
  if (fmt === 'pdf')  return exportUserDataPDF(req, res);
  return exportUserDataJSON(req, res);
}

// ─────────────────────────────────────────────────────────────
// ACCESS HISTORY
// ─────────────────────────────────────────────────────────────

function getAccessHistory(req, res) {
  const { id: userId } = req.params;
  const { limit = 30, page = 1 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const history = db.prepare(`
    SELECT ip_address, user_agent, created_at
    FROM access_history
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, Number(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM access_history WHERE user_id = ?`).get(userId).count;

  return res.json({ total, page: Number(page), limit: Number(limit), history });
}

// ─────────────────────────────────────────────────────────────
// DATA DELETION REQUESTS
// ─────────────────────────────────────────────────────────────

function requestDeletion(req, res) {
  const { id: userId } = req.params;
  const { reason } = req.body;

  // Only the user themselves OR a compliance officer/admin can file on behalf
  if (req.user.id !== userId && !['compliance_officer', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'You can only submit a deletion request for your own account.' });
  }

  const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Prevent duplicate pending requests
  const existing = db.prepare(`SELECT id FROM data_deletion_requests WHERE user_id = ? AND status = 'PENDING'`).get(userId);
  if (existing) return res.status(409).json({ error: 'A pending deletion request already exists for this user.' });

  const requestId = uuidv4();
  db.prepare(`
    INSERT INTO data_deletion_requests (id, user_id, requested_by, reason)
    VALUES (?, ?, ?, ?)
  `).run(requestId, userId, req.user.id, reason || null);

  return res.status(201).json({ message: 'Deletion request submitted and is pending review.', requestId });
}

function listDeletionRequests(req, res) {
  const { status = 'PENDING' } = req.query;
  const requests = db.prepare(`
    SELECT d.*,
           u.username  AS user_username,
           r.username  AS requested_by_username
    FROM data_deletion_requests d
    JOIN users u ON d.user_id      = u.id
    JOIN users r ON d.requested_by = r.id
    WHERE d.status = ?
    ORDER BY d.created_at ASC
  `).all(status);

  return res.json({ requests });
}

function resolveDeletion(req, res) {
  const { id: requestId } = req.params;
  const { decision, reason } = req.body; // decision: 'APPROVE' | 'REJECT'

  if (!['APPROVE', 'REJECT'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'APPROVE' or 'REJECT'." });
  }

  const request = db.prepare(`SELECT * FROM data_deletion_requests WHERE id = ?`).get(requestId);
  if (!request) return res.status(404).json({ error: 'Deletion request not found.' });
  if (request.status !== 'PENDING') return res.status(409).json({ error: 'This request has already been resolved.' });

  const now = new Date().toISOString();

  if (decision === 'REJECT') {
    db.prepare(`UPDATE data_deletion_requests SET status = 'REJECTED', reason = ?, resolved_at = ? WHERE id = ?`)
      .run(reason || 'Rejected by compliance officer.', now, requestId);
    return res.json({ message: 'Deletion request rejected.' });
  }

  // APPROVE — erase user activity data (keep account row for audit trail)
  const userId = request.user_id;

  db.prepare(`DELETE FROM posts      WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM comments   WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM likes      WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM bookmarks  WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM reports    WHERE reporter_id = ?`).run(userId);
  db.prepare(`DELETE FROM notifications WHERE user_id = ?`).run(userId);

  // Anonymise the account so it cannot be logged into
  db.prepare(`UPDATE users SET email = ?, username = ?, password = 'DELETED', status = 'PERMANENTLY_BANNED' WHERE id = ?`)
    .run(`deleted_${userId}@redacted.invalid`, `deleted_${userId.slice(0, 8)}`, userId);

  db.prepare(`UPDATE data_deletion_requests SET status = 'COMPLETED', resolved_at = ? WHERE id = ?`)
    .run(now, requestId);

  return res.json({ message: 'User data has been erased and account anonymised per GDPR.' });
}

module.exports = {
  getAuditLogs,
  exportUserData,
  getAccessHistory,
  requestDeletion,
  listDeletionRequests,
  resolveDeletion
};
