// controllers/analyticsController.js
const db = require('../database/db');

// Platform Summary (Admin & Analyst)
function getPlatformSummary(req, res) {
  // 1. Active Users (Users who created a post, comment, or like in the last 7 days)
  const activeUsersRow = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count FROM (
      SELECT user_id FROM posts WHERE created_at >= datetime('now', '-7 days')
      UNION
      SELECT user_id FROM comments WHERE created_at >= datetime('now', '-7 days')
      UNION
      SELECT user_id FROM likes WHERE created_at >= datetime('now', '-7 days')
    )
  `).get();
  
  // 2. Content Growth (Posts last 7 days vs previous 7 days)
  const recentPosts = db.prepare(`SELECT COUNT(*) as count FROM posts WHERE created_at >= datetime('now', '-7 days')`).get().count;
  const oldPosts = db.prepare(`SELECT COUNT(*) as count FROM posts WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')`).get().count;
  const contentGrowth = oldPosts === 0 ? 100 : Math.round(((recentPosts - oldPosts) / oldPosts) * 100);

  // 3. Flagged Content Ratio
  const totalPosts = db.prepare(`SELECT COUNT(*) as count FROM posts`).get().count;
  const flaggedPosts = db.prepare(`SELECT COUNT(*) as count FROM posts WHERE status = 'FLAGGED' OR status = 'REMOVED'`).get().count;
  const flaggedRatio = totalPosts === 0 ? 0 : (flaggedPosts / totalPosts).toFixed(2);

  // 4. Trending Topics (Calculated every 15 mins by the Scheduler)
  const trendingTopics = db.prepare(`
    SELECT hashtag, use_count 
    FROM trending_topics
    ORDER BY use_count DESC
    LIMIT 5
  `).all();

  // 5. Moderation SLA (Average age of pending reports in hours)
  // Simulating SLA tracking by measuring how long pending items have been sitting
  const pendingSLA = db.prepare(`
    SELECT CAST(AVG((julianday('now') - julianday(created_at)) * 24) AS INTEGER) as avg_hours
    FROM reports
    WHERE report_status IN ('SUBMITTED', 'ESCALATED')
  `).get();

  // 6. Trending Communities (Top 5 communities by members)
  const trendingCommunities = db.prepare(`
    SELECT c.id, c.name, 
           (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count
    FROM communities c
    ORDER BY member_count DESC
    LIMIT 5
  `).all();

  return res.json({
    summary: {
      active_users_7d: activeUsersRow.count,
      content_growth_percent: contentGrowth,
      flagged_content_ratio: parseFloat(flaggedRatio),
      trending_topics: trendingTopics,
      trending_communities: trendingCommunities,
      moderation_sla_hours: pendingSLA.avg_hours || 0
    }
  });
}

// Creator Analytics
function getCreatorAnalytics(req, res) {
  const { id: postId } = req.params;

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  // Only the creator or an admin/analyst can view this
  if (post.user_id !== req.user.id && !['admin', 'analyst'].includes(req.user.role)) {
    return res.status(403).json({ error: 'You can only view analytics for your own posts.' });
  }

  const views = db.prepare(`SELECT views_count, snapshot_date FROM analytics_snapshots WHERE post_id = ? ORDER BY snapshot_date DESC LIMIT 7`).all(postId);
  const likes = db.prepare(`SELECT COUNT(*) as count FROM likes WHERE post_id = ?`).get(postId).count;
  const comments = db.prepare(`SELECT COUNT(*) as count FROM comments WHERE post_id = ?`).get(postId).count;
  const reach = db.prepare(`SELECT MAX(reach_score) as reach FROM analytics_snapshots WHERE post_id = ?`).get(postId).reach || 0;

  return res.json({
    post_id: postId,
    lifetime_metrics: {
      likes,
      comments,
      peak_reach: reach
    },
    weekly_views: views
  });
}

module.exports = {
  getPlatformSummary,
  getCreatorAnalytics
};
