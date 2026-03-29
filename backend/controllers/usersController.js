const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { createNotification } = require('../services/notificationService');

// ── GET PUBLIC USER PROFILE
function getUserProfile(req, res) {
  const { username } = req.params;
  const user = db.prepare(`SELECT id, username, first_name, last_name, role, created_at FROM users WHERE username = ?`).get(username);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const followerCount = db.prepare(`SELECT COUNT(*) as count FROM follows WHERE following_id = ?`).get(user.id).count;
  const followingCount = db.prepare(`SELECT COUNT(*) as count FROM follows WHERE follower_id = ?`).get(user.id).count;

  let isFollowing = false;
  if (req.user) {
    const follows = db.prepare(`SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?`).get(req.user.id, user.id);
    if (follows) isFollowing = true;
  }

  return res.json({ profile: { ...user, followers: followerCount, following: followingCount, isFollowing } });
}

// ── FOLLOW USER
function followUser(req, res) {
  const { id: followingId } = req.params;
  const followerId = req.user.id;

  if (followerId === followingId) return res.status(400).json({ error: 'Cannot follow yourself.' });

  const exists = db.prepare(`SELECT * FROM follows WHERE follower_id = ? AND following_id = ?`).get(followerId, followingId);
  if (exists) return res.status(400).json({ error: 'Already following this user.' });

  db.prepare(`INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)`).run(uuidv4(), followerId, followingId);

  const currentUser = db.prepare(`SELECT username FROM users WHERE id = ?`).get(followerId);
  createNotification(followingId, 'mention', `${currentUser.username} started following you.`);

  return res.json({ message: 'Successfully followed user.' });
}

// ── UNFOLLOW USER
function unfollowUser(req, res) {
  const { id: followingId } = req.params;
  const followerId = req.user.id;

  const result = db.prepare(`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`).run(followerId, followingId);
  if (result.changes === 0) return res.status(400).json({ error: 'Not following this user.' });

  return res.json({ message: 'Successfully unfollowed user.' });
}

// ── GET FOLLOWERS
function getFollowers(req, res) {
  const { id } = req.params;
  const followers = db.prepare(`
    SELECT u.id, u.username, u.first_name, u.last_name, f.created_at
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
  `).all(id);

  return res.json({ followers });
}

// ── GET FOLLOWING
function getFollowing(req, res) {
  const { id } = req.params;
  const following = db.prepare(`
    SELECT u.id, u.username, u.first_name, u.last_name, f.created_at
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
  `).all(id);

  return res.json({ following });
}

// ── GET SUGGESTED USERS
function getSuggestedUsers(req, res) {
  const currentUserId = req.user ? req.user.id : null;
  const limit = req.query.limit ? Number(req.query.limit) : 5;

  const users = db.prepare(`
    SELECT u.id, u.username, u.first_name, u.last_name,
           (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND status = 'PUBLISHED') as post_count,
           (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count
    FROM users u
    WHERE u.id != ? AND u.status = 'ACTIVE'
    ORDER BY follower_count DESC, post_count DESC
    LIMIT ?
  `).all(currentUserId || 'ANONYMOUS', limit);

  return res.json({ users });
}

// ── SEARCH USERS
function searchUsers(req, res) {
  const currentUserId = req.user ? req.user.id : null;
  const q = req.query.q || '';
  const limit = req.query.limit ? Number(req.query.limit) : 20;

  if (!q.trim()) return res.json({ users: [] });

  const searchTerm = `%${q.trim()}%`;
  
  const users = db.prepare(`
    SELECT u.id, u.username, u.first_name, u.last_name, u.role, u.status,
           (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers,
           (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following,
           CASE WHEN ? IS NOT NULL THEN
             EXISTS (SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id)
           ELSE 0 END as isFollowing
    FROM users u
    WHERE u.status = 'ACTIVE' 
      AND (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)
    ORDER BY followers DESC
    LIMIT ?
  `).all(currentUserId, currentUserId, searchTerm, searchTerm, searchTerm, limit);

  // Convert SQLite boolean
  users.forEach(u => u.isFollowing = !!u.isFollowing);

  return res.json({ users });
}

module.exports = {
  getUserProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getSuggestedUsers,
  searchUsers
};
