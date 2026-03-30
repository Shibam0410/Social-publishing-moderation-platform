// services/notificationService.js
// ─────────────────────────────────────────────────────────────
// Helper functions for creating and fetching notifications.
// ─────────────────────────────────────────────────────────────

const db   = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new notification for a user.
 *
 * @param {string} userId
 * @param {string} type           - 'like' | 'comment' | 'mention' | 'moderation_decision' | etc.
 * @param {string} message        - Human-readable message
 * @param {string|null} postId    - The post this notification relates to
 * @param {string|null} actorUsername - Who triggered the action
 */
function createNotification(userId, type, message, postId = null, actorUsername = null) {
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, message, post_id, actor_username)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, type, message, postId || null, actorUsername || null);
}

/**
 * Get all notifications for a user, newest first.
 *
 * For notifications WITH a post_id, we JOIN directly to the post.
 * For old notifications WITHOUT a post_id but with actor_username:
 *   - For 'like'    → look up the most recent like by that actor on any of the recipient's posts
 *   - For 'comment' → look up the most recent comment by that actor on any of the recipient's posts
 *
 * This ensures both old and new notifications show post context.
 */
function getNotifications(userId) {
  const notifications = db.prepare(`
    SELECT n.*
    FROM notifications n
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
  `).all(userId);

  // Enrich each notification with its linked post
  return notifications.map(n => {
    let post = null;

    if (n.post_id) {
      // Direct link — fast path
      post = db.prepare(`
        SELECT p.id, p.content, p.post_type, p.status, p.created_at AS post_created_at,
               u.username AS post_author,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
               c.name AS community_name
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE p.id = ?
      `).get(n.post_id);
    } else if (n.actor_username && (n.type === 'like' || n.type === 'comment' || n.type === 'mention')) {
      // Fallback for old notifications without post_id:
      // Find the most recent post the actor interacted with that belongs to this user
      if (n.type === 'like') {
        const actor = db.prepare(`SELECT id FROM users WHERE username = ?`).get(n.actor_username);
        if (actor) {
          const like = db.prepare(`
            SELECT l.post_id FROM likes l
            JOIN posts p ON l.post_id = p.id
            WHERE l.user_id = ? AND p.user_id = ?
            ORDER BY l.created_at DESC
            LIMIT 1
          `).get(actor.id, userId);
          if (like) {
            post = db.prepare(`
              SELECT p.id, p.content, p.post_type, p.status, p.created_at AS post_created_at,
                     u.username AS post_author,
                     (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                     (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                     c.name AS community_name
              FROM posts p
              JOIN users u ON p.user_id = u.id
              LEFT JOIN communities c ON p.community_id = c.id
              WHERE p.id = ?
            `).get(like.post_id);
          }
        }
      } else if (n.type === 'comment') {
        const actor = db.prepare(`SELECT id FROM users WHERE username = ?`).get(n.actor_username);
        if (actor) {
          const comment = db.prepare(`
            SELECT c.post_id FROM comments c
            JOIN posts p ON c.post_id = p.id
            WHERE c.user_id = ? AND p.user_id = ?
            ORDER BY c.created_at DESC
            LIMIT 1
          `).get(actor.id, userId);
          if (comment) {
            post = db.prepare(`
              SELECT p.id, p.content, p.post_type, p.status, p.created_at AS post_created_at,
                     u.username AS post_author,
                     (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                     (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                     c.name AS community_name
              FROM posts p
              JOIN users u ON p.user_id = u.id
              LEFT JOIN communities c ON p.community_id = c.id
              WHERE p.id = ?
            `).get(comment.post_id);
          }
        }
      }
    }

    return {
      ...n,
      linked_post: post || null,
    };
  });
}

/**
 * Mark a single notification as read.
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
 */
function markAllAsRead(userId) {
  db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE user_id = ?
  `).run(userId);
}

module.exports = { createNotification, getNotifications, markAsRead, markAllAsRead };
