// controllers/postsController.js
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { calculateRiskScore } = require('../services/riskScoringService');
const { recordView, recordLike, recordComment } = require('../services/analyticsService');
const { createNotification } = require('../services/notificationService');
const { auditLog } = require('../services/auditLogService');

// Ensure mentions trigger notifications
// Ensure mentions trigger notifications
function extractAndNotifyMentions(content, sourceUserId, postId) {
  if (!content) return;
  const mentions = content.match(/@\w+/g);
  if (mentions) {
    const uniqueUsernames = [...new Set(mentions.map(m => m.substring(1)))];
    const sourceUser = db.prepare(`SELECT username FROM users WHERE id = ?`).get(sourceUserId);
    
    uniqueUsernames.forEach(username => {
      const targetUser = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
      if (targetUser && targetUser.id !== sourceUserId) {
        createNotification(targetUser.id, 'mention', `${sourceUser.username} mentioned you in a post/comment.`);
      }
    });
  }
}

function attachPollsAndReposts(posts, userId) {
  const getPollStmt = db.prepare(`SELECT * FROM polls WHERE post_id = ?`);
  const getOptionsStmt = db.prepare(`SELECT * FROM poll_options WHERE poll_id = ?`);
  const checkVoteStmt = db.prepare(`SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?`);
  
  const getOriginalPostStmt = db.prepare(`
    SELECT p.*, u.username AS author_name 
    FROM posts p JOIN users u ON p.user_id = u.id 
    WHERE p.id = ?
  `);

  for (const post of posts) {
    if (post.post_type === 'poll') {
      const poll = getPollStmt.get(post.id);
      if (poll) {
        poll.options = getOptionsStmt.all(poll.id);
        if (userId && userId !== 'ANONYMOUS_USER') {
          const vote = checkVoteStmt.get(poll.id, userId);
          poll.user_voted_option_id = vote ? vote.option_id : null;
        }
        post.poll = poll;
      }
    }
    if (post.original_post_id) {
      post.original_post = getOriginalPostStmt.get(post.original_post_id);
    }
  }
}

// ── CREATE POST
function createPost(req, res) {
  try {
    const { content, community_id, post_type = 'text', original_post_id, poll_options, language = 'en', scheduled_date } = req.body;
    const userId = req.user.id;

    if (post_type !== 'poll' && !original_post_id && !content) {
      return res.status(400).json({ error: 'content is required.' });
    }

    const validTypes = ['text', 'image', 'video', 'poll', 'thread', 'scheduled'];
    if (!validTypes.includes(post_type)) return res.status(400).json({ error: 'Invalid post_type' });

    // --- PUBLISHING RULES ---
    // Rule 1: Rate Limit for new accounts (< 7 days) -> max 3 posts per day
    const user = db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId);
    if (user) {
      const accountAgeDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < 7) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const postsToday = db.prepare(`SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND date(created_at) = ?`).get(userId, todayStr).count;
        if (postsToday >= 3) {
          return res.status(429).json({ error: 'New accounts are limited to 3 posts per day.' });
        }
      }
    }

    let status = 'PUBLISHED';
    if (post_type === 'scheduled') {
      if (!scheduled_date) return res.status(400).json({ error: 'scheduled_date required for scheduled posts.' });
      status = 'SCHEDULED';
    }

    // Rule 2: Community pre-moderation
    if (community_id && status === 'PUBLISHED') {
      const comm = db.prepare('SELECT moderation_policy FROM communities WHERE id = ?').get(community_id);
      if (comm && comm.moderation_policy === 'strict') {
        status = 'UNDER_REVIEW';
      }
    }
    // ------------------------

    const postId = uuidv4();
    
    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO posts (id, user_id, community_id, content, post_type, status, original_post_id, language, scheduled_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(postId, userId, community_id || null, content || '', post_type, status, original_post_id || null, language, scheduled_date || null);

      if (post_type === 'poll') {
        const pollId = uuidv4();
        const question = content || 'Poll';
        db.prepare(`INSERT INTO polls (id, post_id, question) VALUES (?, ?, ?)`).run(pollId, postId, question);
        
        if (Array.isArray(poll_options)) {
          const stmt = db.prepare(`INSERT INTO poll_options (id, poll_id, option_text) VALUES (?, ?, ?)`);
          for (const opt of poll_options) {
            if (opt.trim()) {
              stmt.run(uuidv4(), pollId, opt.trim());
            }
          }
        }
      }
    });

    createTx();
    
    extractAndNotifyMentions(content || '', userId, postId);

    return res.status(201).json({ message: 'Post created.', postId, status });
  } catch (err) {
    console.error('createPost error:', err);
    return res.status(500).json({ error: err.message || 'Server error creating post.' });
  }
}

// ── LIST POSTS
function listPosts(req, res) {
  const { community_id, feed_type, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const userId = req.user ? req.user.id : null;

  let where = `WHERE p.status = 'PUBLISHED'`;
  const params = [];

  // ALWAYS pass userId as the first parameter for the LEFT JOIN ON condition
  params.push(userId || 'ANONYMOUS_USER');

  let joinFollowing = '';
  if (feed_type === 'following' && userId) {
    joinFollowing = 'JOIN follows f ON p.user_id = f.following_id';
    where += ' AND f.follower_id = ?';
    params.push(userId);
  }

  if (community_id) {
    where += ` AND p.community_id = ?`;
    params.push(community_id);
  } else {
    // Exclude private communities unless user is an approved member
    where += ` AND (c.id IS NULL OR c.is_private = 0 OR cm.status = 'approved')`;
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
    LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = ?
    ${joinFollowing}
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  attachPollsAndReposts(posts, userId);

  return res.json({ posts });
}

// ── SEARCH POSTS
function searchPosts(req, res) {
  const { q = '', startDate, endDate, minEngagement = 0, language = '', page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const userId = req.user ? req.user.id : null;

  let where = `WHERE p.status = 'PUBLISHED'`;
  where += ` AND (c.id IS NULL OR c.is_private = 0 OR cm.status = 'approved')`;
  
  const params = [];
  params.push(userId || 'ANONYMOUS_USER');

  if (q) {
    where += ` AND p.content LIKE ?`;
    params.push(`%${q}%`);
  }
  if (startDate) {
    where += ` AND p.created_at >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    where += ` AND p.created_at <= ?`;
    params.push(endDate);
  }
  if (language && language !== 'all') {
    where += ` AND p.language = ?`;
    params.push(language);
  }

  // Subquery for engagement threshold
  const postsQuery = `
    SELECT * FROM (
      SELECT p.*, u.username AS author_name,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
             (SELECT COUNT(*) FROM dislikes WHERE post_id = p.id) AS dislike_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
             c.name AS community_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN communities c ON p.community_id = c.id
      LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = ?
      ${where}
    ) AS results
    WHERE (like_count + comment_count) >= ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Number(minEngagement), Number(limit), offset);

  const posts = db.prepare(postsQuery).all(...params);
  attachPollsAndReposts(posts, userId);

  return res.json({ posts });
}

// ── GET SINGLE POST
function getPost(req, res) {
  const { id } = req.params;
  const userId = req.user ? req.user.id : null;
  const userRole = req.user ? req.user.role : null;
  const isPlatformMod = ['moderator', 'senior_moderator', 'admin'].includes(userRole);

  const statusCondition = isPlatformMod ? "" : "AND p.status = 'PUBLISHED'";

  const post = db.prepare(`
    SELECT p.*, u.username AS author_name,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
           (SELECT COUNT(*) FROM dislikes WHERE post_id = p.id) AS dislike_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ? ${statusCondition}
  `).get(id);

  if (!post) return res.status(404).json({ error: 'Post not found or unavailable.' });
  recordView(id);

  attachPollsAndReposts([post], req.user ? req.user.id : null);

  return res.json({ post });
}

// ── UPDATE POST
function updatePost(req, res) {
  const { id } = req.params;
  const { content } = req.body;

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Only author can edit.' });

  const oldContent = post.content;
  db.prepare(`UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?`).run(content || post.content, id);

  auditLog(req.user.id, req.user.role, 'post.edited', `post:${id}`, {
    before: { content: oldContent },
    after:  { content: content || post.content }
  });

  return res.json({ message: 'Post updated.' });
}

// ── DELETE POST
function deletePost(req, res) {
  const { id } = req.params;
  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const isOwner = post.user_id === req.user.id;
  const isModOrAdmin = ['moderator', 'senior_moderator', 'admin'].includes(req.user.role);

  if (!isOwner && !isModOrAdmin) return res.status(403).json({ error: 'Not authorised.' });

  db.prepare(`DELETE FROM posts WHERE id = ?`).run(id);

  auditLog(req.user.id, req.user.role, 'post.deleted', `post:${id}`, {
    before: { post_type: post.post_type, status: post.status, content: post.content.slice(0, 120) },
    details: { deleted_by: req.user.id }
  });

  return res.json({ message: 'Post deleted.' });
}

// ── LIKE / UNLIKE
function toggleLike(req, res) {
  const { id: postId } = req.params;
  const userId = req.user.id;

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const existingLike = db.prepare(`SELECT * FROM likes WHERE post_id = ? AND user_id = ?`).get(postId, userId);

  if (existingLike) {
    db.prepare(`DELETE FROM likes WHERE post_id = ? AND user_id = ?`).run(postId, userId);
    return res.json({ message: 'Like removed.', liked: false });
  } else {
    db.prepare(`DELETE FROM dislikes WHERE post_id = ? AND user_id = ?`).run(postId, userId);
    db.prepare(`INSERT INTO likes (id, post_id, user_id) VALUES (?, ?, ?)`).run(uuidv4(), postId, userId);
    recordLike(postId);

    if (post.user_id !== userId) {
      createNotification(post.user_id, 'like', `${req.user.username} liked your post.`);
    }
    return res.json({ message: 'Post liked.', liked: true });
  }
}

// ── DISLIKE / UNDISLIKE
function toggleDislike(req, res) {
  const { id: postId } = req.params;
  const userId = req.user.id;

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const existingDislike = db.prepare(`SELECT * FROM dislikes WHERE post_id = ? AND user_id = ?`).get(postId, userId);

  if (existingDislike) {
    db.prepare(`DELETE FROM dislikes WHERE post_id = ? AND user_id = ?`).run(postId, userId);
    return res.json({ message: 'Dislike removed.', disliked: false });
  } else {
    db.prepare(`DELETE FROM likes WHERE post_id = ? AND user_id = ?`).run(postId, userId);
    db.prepare(`INSERT INTO dislikes (id, post_id, user_id) VALUES (?, ?, ?)`).run(uuidv4(), postId, userId);
    return res.json({ message: 'Post disliked.', disliked: true });
  }
}

// ── BOOKMARK / UNBOOKMARK
function toggleBookmark(req, res) {
  const { id: postId } = req.params;
  const userId = req.user.id;

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const existing = db.prepare(`SELECT * FROM bookmarks WHERE post_id = ? AND user_id = ?`).get(postId, userId);

  if (existing) {
    db.prepare(`DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?`).run(postId, userId);
    return res.json({ message: 'Bookmark removed.', bookmarked: false });
  } else {
    db.prepare(`INSERT INTO bookmarks (id, post_id, user_id) VALUES (?, ?, ?)`).run(uuidv4(), postId, userId);
    return res.json({ message: 'Post bookmarked.', bookmarked: true });
  }
}

// ── GET BOOKMARKS
function getBookmarks(req, res) {
  const userId = req.user.id;
  const bookmarks = db.prepare(`
    SELECT p.*, u.username AS author_name 
    FROM bookmarks b
    JOIN posts p ON b.post_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId);

  return res.json({ bookmarks });
}

// ── ADD COMMENT
function addComment(req, res) {
  const { id: postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content) return res.status(400).json({ error: 'content required.' });

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const commentId = uuidv4();
  db.prepare(`INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)`).run(commentId, postId, userId, content);
  recordComment(postId);

  extractAndNotifyMentions(content, userId, postId);

  if (post.user_id !== userId) {
    createNotification(post.user_id, 'comment', `${req.user.username} commented on your post.`);
  }

  return res.status(201).json({ message: 'Comment added.', commentId });
}

// ── GET COMMENTS
function getComments(req, res) {
  const { id: postId } = req.params;
  const comments = db.prepare(`
    SELECT c.*, u.username AS author_name
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(postId);

  return res.json({ comments });
}

// ── VOTE PUBLIC POLL
function votePoll(req, res) {
  const { id: postId } = req.params;
  const { option_id } = req.body;
  const userId = req.user.id;

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post || post.post_type !== 'poll') return res.status(404).json({ error: 'Poll not found.' });

  const poll = db.prepare(`SELECT id FROM polls WHERE post_id = ?`).get(postId);
  if (!poll) return res.status(404).json({ error: 'Poll data missing.' });

  const option = db.prepare(`SELECT id FROM poll_options WHERE id = ? AND poll_id = ?`).get(option_id, poll.id);
  if (!option) return res.status(400).json({ error: 'Invalid poll option.' });

  const existingVote = db.prepare(`SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?`).get(poll.id, userId);

  const voteTx = db.transaction(() => {
    if (existingVote) {
      if (existingVote.option_id === option_id) {
        // Unpoll logic
        db.prepare(`DELETE FROM poll_votes WHERE id = ?`).run(existingVote.id);
        db.prepare(`UPDATE poll_options SET votes = MAX(0, votes - 1) WHERE id = ?`).run(option_id);
        return { action: 'unpolled', optionId: null };
      } else {
        // Change vote logic
        db.prepare(`UPDATE poll_options SET votes = MAX(0, votes - 1) WHERE id = ?`).run(existingVote.option_id);
        db.prepare(`UPDATE poll_votes SET option_id = ? WHERE id = ?`).run(option_id, existingVote.id);
        db.prepare(`UPDATE poll_options SET votes = votes + 1 WHERE id = ?`).run(option_id);
        return { action: 'changed', optionId: option_id };
      }
    } else {
      // New vote logic
      db.prepare(`INSERT INTO poll_votes (id, poll_id, option_id, user_id) VALUES (?, ?, ?, ?)`).run(uuidv4(), poll.id, option_id, userId);
      db.prepare(`UPDATE poll_options SET votes = votes + 1 WHERE id = ?`).run(option_id);
      return { action: 'voted', optionId: option_id };
    }
  });

  const result = voteTx();
  return res.json({ message: 'Vote updated successfully.', action: result.action, user_voted_option_id: result.optionId });
}

// ── REPORT POST
function reportPost(req, res) {
  const { id: postId } = req.params;
  const { reason } = req.body;
  const reporterId = req.user.id;

  const validReasons = ['hate speech', 'spam', 'misinformation', 'harassment', 'nsfw content'];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({ error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` });
  }

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  // 1. Calculate Risk Score
  const toxicityScore = calculateRiskScore(post.content); 
  
  // 2. Count existing reports
  const reportsCount = db.prepare(`SELECT COUNT(*) as count FROM reports WHERE post_id = ?`).get(postId).count;
  
  // 3. Determine Report Status & Action
  let reportStatus = 'SUBMITTED';
  let postAction = null;

  if (reportsCount + 1 > 5) {
    reportStatus = 'ESCALATED';
  } else if (toxicityScore > 0.85) {
    postAction = 'FLAGGED';
  }

  // 4. Save Report
  const reportId = uuidv4();
  db.prepare(`
    INSERT INTO reports (id, post_id, reporter_id, reason, report_status, risk_score)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(reportId, postId, reporterId, reason, reportStatus, toxicityScore);

  // 5. Update Post if needed
  if (postAction === 'FLAGGED' && post.status !== 'FLAGGED') {
    db.prepare(`UPDATE posts SET status = 'FLAGGED' WHERE id = ?`).run(postId);
    createNotification(post.user_id, 'moderation_decision', 'Your post has been automatically flagged due to high toxicity score.');
  }

  return res.status(201).json({ 
    message: 'Report submitted.', 
    reportId,
    reportStatus,
    toxicityScore,
    postActionTaken: postAction 
  });
}

// ── REPOST
function repost(req, res) {
  try {
    const { id: original_post_id } = req.params;
    const userId = req.user.id;

    const original = db.prepare('SELECT * FROM posts WHERE id = ?').get(original_post_id);
    if (!original) return res.status(404).json({ error: 'Original post not found.' });

    const postId = uuidv4();
    db.prepare(`
      INSERT INTO posts (id, user_id, community_id, content, post_type, status, original_post_id)
      VALUES (?, ?, ?, '', 'text', 'PUBLISHED', ?)
    `).run(postId, userId, original.community_id, original_post_id);

    return res.status(201).json({ message: 'Reposted successfully.', postId });
  } catch (err) {
    console.error('repost error:', err);
    return res.status(500).json({ error: 'Server error creating repost.' });
  }
}

module.exports = {
  createPost,
  listPosts,
  searchPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleDislike,
  toggleBookmark,
  getBookmarks,
  addComment,
  getComments,
  reportPost,
  votePoll,
  repost
};
