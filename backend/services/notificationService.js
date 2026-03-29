// services/notificationService.js
// ─────────────────────────────────────────────────────────────
// Helper functions for creating and fetching notifications.
// Notifications are stored in the `notifications` table and
// are delivered in-app (no email/push for now — easy to extend).
// ─────────────────────────────────────────────────────────────

const db   = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new notification for a user.
 *
 * @param {string} userId  - The recipient user's ID
 * @param {string} type    - Notification type: 'like' | 'comment' | 'ban' | 'report_resolved' | etc.
 * @param {string} message - Human-readable message to display
 */
function createNotification(userId, type, message) {
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, message)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, type, message);
}

/**
 * Get all notifications for a user, newest first.
 *
 * @param {string} userId
 * @returns {Array} List of notification objects
 */
function getNotifications(userId) {
  return db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
}

/**
 * Mark a single notification as read.
 *
 * @param {string} notificationId
 * @param {string} userId - Only the owner can mark their own notification
 */
function markAsRead(notificationId, userId) {
  db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?
  `).run(notificationId, userId);
}

/**
 * Mark ALL notifications for a user as read.
 *
 * @param {string} userId
 */
function markAllAsRead(userId) {
  db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE user_id = ?
  `).run(userId);
}

module.exports = { createNotification, getNotifications, markAsRead, markAllAsRead };
