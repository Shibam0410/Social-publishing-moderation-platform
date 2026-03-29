// routes/moderation.js
const express = require('express');
const router  = express.Router();

const {
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
} = require('../controllers/moderationController');

const authMiddleware = require('../middleware/authMiddleware');
const requireRole    = require('../middleware/roleMiddleware');

// All moderation endpoints require a valid token AND at least 'moderator' role
// 'senior_moderator' and 'admin' also have these permissions due to their hierarchy
const modGuard = [authMiddleware, requireRole('moderator', 'senior_moderator', 'admin')];

router.get('/reports',               ...modGuard, listReports);
router.get('/escalated',             ...modGuard, listEscalatedReports);
router.get('/flagged-posts',         ...modGuard, listFlaggedPosts);

router.patch('/posts/:id/status',    ...modGuard, setPostStatus);
router.post('/posts/:id/approve',    ...modGuard, approvePost);
router.post('/posts/:id/remove',     ...modGuard, removePost);

router.patch('/reports/:id/escalate',...modGuard, escalateReport);
router.patch('/reports/:id',         ...modGuard, updateReportStatus);

router.post('/users/:id/warn',       ...modGuard, warnUser);
router.post('/users/:id/suspend',    ...modGuard, suspendUser);
router.post('/users/:id/ban',        ...modGuard, banUser);

module.exports = router;
