// routes/compliance.js
const express = require('express');
const router  = express.Router();

const {
  getAuditLogs,
  exportUserData,
  getAccessHistory,
  requestDeletion,
  listDeletionRequests,
  resolveDeletion
} = require('../controllers/complianceController');

const { ACTION_TYPES } = require('../services/auditLogService');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole    = require('../middleware/roleMiddleware');

// Compliance officers and admins can do everything
const complianceGuard = [authMiddleware, requireRole('compliance_officer', 'admin')];

// ── Audit Logs
router.get('/audit-logs',              ...complianceGuard, getAuditLogs);
router.get('/audit-logs/action-types', ...complianceGuard, (req, res) => res.json({ action_types: ACTION_TYPES }));

// ── Data Export  (format=json|csv|pdf via query string)
router.get('/users/:id/export',          ...complianceGuard, exportUserData);

// ── Access / Login History
router.get('/users/:id/access-history',  ...complianceGuard, getAccessHistory);

// ── Data Deletion Requests
// Any authenticated user can file a request for their own account
router.post('/users/:id/deletion-request', authMiddleware, requestDeletion);

// Compliance officers / admins manage the queue
router.get('/deletion-requests',           ...complianceGuard, listDeletionRequests);
router.patch('/deletion-requests/:id',     ...complianceGuard, resolveDeletion);

module.exports = router;
