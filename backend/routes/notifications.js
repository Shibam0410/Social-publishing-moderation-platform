// routes/notifications.js
// ─────────────────────────────────────────────────────────────
// Notification routes — mounted at /api/notifications in server.js
//
//   GET   /api/notifications            → Get my notifications
//   PATCH /api/notifications/:id/read   → Mark one as read
//   PATCH /api/notifications/read-all   → Mark all as read
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const { getNotifications, markAsRead, markAllAsRead } = require('../services/notificationService');
const authMiddleware = require('../middleware/authMiddleware');

// All notification routes require login
router.use(authMiddleware);

// Get all notifications for the logged-in user
router.get('/', (req, res) => {
  const notifications = getNotifications(req.user.id);
  return res.json({ notifications });
});

// Mark all as read (must be defined BEFORE /:id/read to avoid route conflict)
router.patch('/read-all', (req, res) => {
  markAllAsRead(req.user.id);
  return res.json({ message: 'All notifications marked as read.' });
});

// Mark a single notification as read
router.patch('/:id/read', (req, res) => {
  markAsRead(req.params.id, req.user.id);
  return res.json({ message: 'Notification marked as read.' });
});

module.exports = router;
