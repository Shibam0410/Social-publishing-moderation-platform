// controllers/communitiesController.js
// ─────────────────────────────────────────────────────────────
// Business logic for Communities

const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { createNotification } = require('../services/notificationService');

// ── LIST ALL COMMUNITIES
function listCommunities(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    
    const rules = db.prepare(`
      SELECT c.*,
            u.username AS created_by_name,
            (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) AS member_count
      FROM communities c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY member_count DESC
    `).all();

    // If a user is logged in, attach their specific membership role to each community
    const isPlatformMod = userId ? ['moderator', 'senior_moderator', 'admin'].includes(req.user.role) : false;

    const communities = rules.map(comm => {
      let user_role = null;
      let user_is_member = false;
      let user_request_pending = false;
      
      if (userId) {
        const mem = db.prepare('SELECT role, status FROM community_members WHERE community_id = ? AND user_id = ?').get(comm.id, userId);
        if (mem) {
          if (mem.status === 'approved') {
            user_is_member = true;
            user_role = mem.role;
          } else if (mem.status === 'pending') {
            user_request_pending = true;
          }
        }
        // Platform moderators can always view private communities
        if (isPlatformMod) {
          user_is_member = true;
        }
      }
      
      return { ...comm, user_is_member, user_role, user_request_pending, is_private: !!comm.is_private };
    });
    
    return res.json({ communities });
  } catch (err) {
    console.error('listCommunities error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message, stack: err.stack });
  }
}

// ── CREATE A COMMUNITY
function createCommunity(req, res) {
  const { name, description, is_private = false } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required.' });

  const exists = db.prepare(`SELECT id FROM communities WHERE name = ?`).get(name);
  if (exists) return res.status(409).json({ error: 'Community name already exists.' });

  const communityId = uuidv4();
  const isPrivateInt = is_private ? 1 : 0;
  db.prepare(`
    INSERT INTO communities (id, name, description, created_by, is_private)
    VALUES (?, ?, ?, ?, ?)
  `).run(communityId, name, description || null, req.user.id, isPrivateInt);

  // Auto-join the creator as 'moderator' with status 'approved'
  db.prepare(`
    INSERT INTO community_members (id, community_id, user_id, role, status) VALUES (?, ?, ?, 'moderator', 'approved')
  `).run(uuidv4(), communityId, req.user.id);

  return res.status(201).json({ message: 'Community created.', communityId });
}

// ── EDIT A COMMUNITY
function editCommunity(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required.' });

  // Only community moderator or platform admin can edit
  if (!isCommunityMod(id, req.user.id) && !isPlatformMod(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised to edit this community.' });
  }

  const exists = db.prepare(`SELECT id FROM communities WHERE name = ? AND id != ?`).get(name, id);
  if (exists) return res.status(409).json({ error: 'Community name already exists.' });

  db.prepare(`UPDATE communities SET name = ?, description = ? WHERE id = ?`).run(name, description || null, id);
  return res.json({ message: 'Community updated successfully.' });
}

// ── GET SINGLE COMMUNITY
function getCommunity(req, res) {
  const community = db.prepare(`
    SELECT c.*,
           u.username AS created_by_name,
           (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) AS member_count
    FROM communities c
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!community) return res.status(404).json({ error: 'Community not found.' });

  return res.json({ community });
}

// ── JOIN A COMMUNITY
function joinCommunity(req, res) {
  const { id: communityId } = req.params;
  const userId = req.user.id;

  const community = db.prepare(`SELECT * FROM communities WHERE id = ?`).get(communityId);
  if (!community) return res.status(404).json({ error: 'Community not found.' });

  const alreadyMember = db.prepare(`
    SELECT * FROM community_members WHERE community_id = ? AND user_id = ?
  `).get(communityId, userId);

  if (alreadyMember) {
    if (alreadyMember.status === 'pending') {
      return res.status(409).json({ error: 'Join request already pending.' });
    }
    return res.status(409).json({ error: 'You are already a member.' });
  }

  const status = community.is_private ? 'pending' : 'approved';
  db.prepare(`INSERT INTO community_members (id, community_id, user_id, status) VALUES (?, ?, ?, ?)`).run(uuidv4(), communityId, userId, status);

  if (status === 'pending') {
    return res.json({ message: `Join request sent for "${community.name}".` });
  }
  return res.json({ message: `Joined community "${community.name}".` });
}

// ── LEAVE A COMMUNITY
function leaveCommunity(req, res) {
  const { id: communityId } = req.params;
  const userId = req.user.id;

  const result = db.prepare(`DELETE FROM community_members WHERE community_id = ? AND user_id = ?`).run(communityId, userId);
  if (result.changes === 0) return res.status(400).json({ error: 'Not a member.' });

  return res.json({ message: 'Left community.' });
}

// ── COMMUNITY POSTS
function getCommunityPosts(req, res) {
  const { id: communityId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const userId = req.user ? req.user.id : null;

  const community = db.prepare(`SELECT * FROM communities WHERE id = ?`).get(communityId);
  if (!community) return res.status(404).json({ error: 'Community not found.' });

  if (community.is_private) {
    if (!userId) return res.status(403).json({ error: 'Must be logged in to view private community posts.' });
    
    const isPlatformMod = ['moderator', 'senior_moderator', 'admin'].includes(req.user.role);
    const isMember = db.prepare(`SELECT * FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`).get(communityId, userId);
    
    if (!isMember && !isPlatformMod) {
      return res.status(403).json({ error: 'You must be an approved member to view these posts.' });
    }
  }

  const posts = db.prepare(`
    SELECT p.*, u.username AS author_name,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
           (SELECT COUNT(*) FROM dislikes WHERE post_id = p.id) AS dislike_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
           c.name AS community_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN communities c ON p.community_id = c.id
    WHERE p.community_id = ? AND p.status = 'PUBLISHED'
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(communityId, Number(limit), offset);

  return res.json({ posts });
}

// ── HELPER: Check Community Moderator
function isCommunityMod(communityId, userId) {
  const member = db.prepare(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ?`).get(communityId, userId);
  return member && member.role === 'moderator';
}

function isPlatformMod(role) {
  return ['moderator', 'senior_moderator', 'admin'].includes(role);
}

// ── SET MODERATION POLICY
function setPolicy(req, res) {
  const { id } = req.params;
  const { policy } = req.body;

  if (!isCommunityMod(id, req.user.id) && !isPlatformMod(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised to set community policy.' });
  }

  db.prepare(`UPDATE communities SET moderation_policy = ? WHERE id = ?`).run(policy, id);
  return res.json({ message: 'Community moderation policy updated.' });
}

// ── KICK MEMBER
function removeMember(req, res) {
  const { id: communityId, userId: targetUserId } = req.params;

  if (!isCommunityMod(communityId, req.user.id) && !isPlatformMod(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised.' });
  }

  const result = db.prepare(`DELETE FROM community_members WHERE community_id = ? AND user_id = ?`).run(communityId, targetUserId);
  if (result.changes === 0) return res.status(404).json({ error: 'User is not a member.' });

  const community = db.prepare(`SELECT name FROM communities WHERE id = ?`).get(communityId);
  createNotification(targetUserId, 'moderation_decision', `You were removed from community "${community.name}".`);

  return res.json({ message: 'Member removed.' });
}

// ── REMOVE POST
function removeCommunityPost(req, res) {
  const { id: communityId, postId } = req.params;

  if (!isCommunityMod(communityId, req.user.id) && !isPlatformMod(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised.' });
  }

  const post = db.prepare(`SELECT * FROM posts WHERE id = ? AND community_id = ?`).get(postId, communityId);
  if (!post) return res.status(404).json({ error: 'Post not found in this community.' });

  db.prepare(`UPDATE posts SET status = 'REMOVED' WHERE id = ?`).run(postId);

  createNotification(post.user_id, 'moderation_decision', 'Your post was removed by a community moderator.', postId, null);
  return res.json({ message: 'Post removed by community moderator.' });
}

// ── MANAGE JOIN REQUESTS
function getJoinRequests(req, res) {
  const { id: communityId } = req.params;
  
  if (!isCommunityMod(communityId, req.user.id) && !isPlatformMod(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised.' });
  }

  const requests = db.prepare(`
    SELECT u.id, u.username, u.email, cm.joined_at AS requested_at
    FROM community_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.community_id = ? AND cm.status = 'pending'
    ORDER BY cm.joined_at ASC
  `).all(communityId);

  return res.json({ requests });
}

function approveJoinRequest(req, res) {
  const { id: communityId, userId: targetUserId } = req.params;

  if (!isCommunityMod(communityId, req.user.id) && !isPlatformMod(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised.' });
  }

  const result = db.prepare(`UPDATE community_members SET status = 'approved' WHERE community_id = ? AND user_id = ? AND status = 'pending'`).run(communityId, targetUserId);
  if (result.changes === 0) return res.status(404).json({ error: 'Request not found.' });

  const community = db.prepare(`SELECT name FROM communities WHERE id = ?`).get(communityId);
  createNotification(targetUserId, 'moderation_decision', `Your request to join "${community.name}" was approved.`);

  return res.json({ message: 'Request approved.' });
}

function rejectJoinRequest(req, res) {
  const { id: communityId, userId: targetUserId } = req.params;

  if (!isCommunityMod(communityId, req.user.id) && !isPlatformMod(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised.' });
  }

  const result = db.prepare(`DELETE FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'pending'`).run(communityId, targetUserId);
  if (result.changes === 0) return res.status(404).json({ error: 'Request not found.' });

  const community = db.prepare(`SELECT name FROM communities WHERE id = ?`).get(communityId);
  createNotification(targetUserId, 'moderation_decision', `Your request to join "${community.name}" was declined.`);

  return res.json({ message: 'Request rejected.' });
}

// ── GET COMMUNITY MEMBERS
function getCommunityMembers(req, res) {
  const { id: communityId } = req.params;
  const userId = req.user ? req.user.id : null;

  const community = db.prepare(`SELECT * FROM communities WHERE id = ?`).get(communityId);
  if (!community) return res.status(404).json({ error: 'Community not found.' });

  if (community.is_private) {
    if (!userId) return res.status(403).json({ error: 'Must be logged in to view private community members.' });
    const isMember = db.prepare(`SELECT * FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`).get(communityId, userId);
    const isPlatformMod = ['moderator', 'senior_moderator', 'admin'].includes(req.user.role);
    if (!isMember && !isPlatformMod) {
      return res.status(403).json({ error: 'You must be an approved member to view members.' });
    }
  }

  const members = db.prepare(`
    SELECT u.id, u.username, cm.role, cm.joined_at
    FROM community_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.community_id = ? AND cm.status = 'approved'
    ORDER BY cm.joined_at ASC
  `).all(communityId);

  return res.json({ members });
}

module.exports = {
  listCommunities,
  createCommunity,
  editCommunity,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  getCommunityPosts,
  setPolicy,
  removeMember,
  removeCommunityPost,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getCommunityMembers
};
