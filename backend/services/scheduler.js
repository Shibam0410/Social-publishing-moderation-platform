const cron = require('node-cron');
const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('./auditLogService');
const { createNotification } = require('./notificationService');

/**
 * JOB 1: Risk Scoring Sweep (Runs every hour)
 * Evaluates user activity risk. If they have >= 3 removed posts, issue WARNING.
 * If they have >= 5 removed posts, TEMP_SUSPEND.
 */
function sweepUserRiskScores() {
  console.log('[Scheduler] Executing sweepUserRiskScores...');
  try {
    // Find users with their removed post count where status is currently ACTIVE or WARNING
    const usersRisk = db.prepare(`
      SELECT 
        u.id, u.username, u.email, u.status, u.role,
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.status = 'REMOVED') as removed_posts
      FROM users u
      WHERE u.status IN ('ACTIVE', 'WARNING') AND u.role NOT IN ('admin')
    `).all();

    const updateUserStatus = db.prepare('UPDATE users SET status = ? WHERE id = ?');

    let processedCount = 0;
    for (const user of usersRisk) {
      if (user.removed_posts >= 5 && user.status !== 'TEMP_SUSPENDED') {
        updateUserStatus.run('TEMP_SUSPENDED', user.id);
        const afterUser = { ...user, status: 'TEMP_SUSPENDED' };
        auditLog({
          admin_id: 'system_scheduler',
          actor_role: 'system',
          action: 'user.suspended',
          target_id: user.id,
          before_state: user,
          after_state: afterUser,
          details: { reason: "Automated risk sweep (>= 5 removed posts)" }
        });
        createNotification(user.id, 'suspension', 'Your account has been temporarily suspended due to repeated community violations.');
        processedCount++;
      } 
      else if (user.removed_posts >= 3 && user.status === 'ACTIVE') {
        updateUserStatus.run('WARNING', user.id);
        const afterUser = { ...user, status: 'WARNING' };
        auditLog({
          admin_id: 'system_scheduler',
          actor_role: 'system',
          action: 'user.warned',
          target_id: user.id,
          before_state: user,
          after_state: afterUser,
          details: { reason: "Automated risk sweep (>= 3 removed posts)" }
        });
        createNotification(user.id, 'warning', 'Official Warning: Multiple of your posts have been removed for policy violations. Further violations will result in suspension.');
        processedCount++;
      }
    }
    console.log(`[Scheduler] sweepUserRiskScores completed. Flagged ${processedCount} accounts.`);
  } catch (err) {
    console.error('[Scheduler] sweepUserRiskScores failed:', err);
  }
}

/**
 * JOB 2: Trending Recalculation (Runs every 15 mins)
 * Scans published posts from the last 24H, extracts #hashtags, aggregates counts.
 */
function calculateTrendingTopics() {
  console.log('[Scheduler] Executing calculateTrendingTopics...');
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Fetch recent posts
    const recentPosts = db.prepare(`
      SELECT content FROM posts 
      WHERE status = 'PUBLISHED' AND created_at >= ?
    `).all(twentyFourHoursAgo);

    const hashtagCounts = {};
    const hashtagRegex = /#[\w]+/g;

    recentPosts.forEach(post => {
      const tags = post.content.match(hashtagRegex);
      if (tags) {
        // Unique tags per post to prevent artificial inflation by repeating a tag 100 times in one post
        const uniqueTags = [...new Set(tags.map(t => t.toLowerCase()))];
        uniqueTags.forEach(tag => {
          hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
      }
    });

    // Clear existing cache and insert new top tags
    const deleteOld = db.prepare('DELETE FROM trending_topics');
    const insertTag = db.prepare('INSERT INTO trending_topics (hashtag, use_count) VALUES (?, ?)');
    
    // Transaction for atomic replacement
    db.transaction(() => {
      deleteOld.run();
      
      const sortedTags = Object.entries(hashtagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50); // Keep top 50
        
      sortedTags.forEach(([tag, count]) => {
        insertTag.run(tag, count);
      });
    })();
    
    console.log(`[Scheduler] calculateTrendingTopics completed. Extracted ${Object.keys(hashtagCounts).length} unique tags.`);
  } catch (err) {
    console.error('[Scheduler] calculateTrendingTopics failed:', err);
  }
}

/**
 * JOB 3: Moderation SLA Monitor (Runs every hour)
 * Scans reports older than 48H. If neglected, auto-escalates to senior_moderator.
 */
function enforceModerationSLA() {
  console.log('[Scheduler] Executing enforceModerationSLA...');
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const neglectedReports = db.prepare(`
      SELECT * FROM reports 
      WHERE report_status IN ('SUBMITTED', 'AUTO_RISK_SCORING', 'MODERATOR_REVIEW')
      AND created_at <= ?
    `).all(fortyEightHoursAgo);

    if (neglectedReports.length === 0) {
      console.log('[Scheduler] enforeModerationSLA: No breached SLAs found.');
      return;
    }

    const escalateReport = db.prepare(`UPDATE reports SET report_status = 'ESCALATED' WHERE id = ?`);
    
    db.transaction(() => {
      neglectedReports.forEach(report => {
        escalateReport.run(report.id);
        const afterReport = { ...report, report_status: 'ESCALATED' };
        
        auditLog(
          'system_scheduler',
          'system',
          'report.escalated.sla_breach',
          `report:${report.id}`,
          {
            before: report,
            after: afterReport,
            details: { reason: '48H SLA breached. Auto-escalating for senior review.' }
          }
        );
      });
    })();
    
    console.log(`[Scheduler] enforceModerationSLA completed. Escalated ${neglectedReports.length} reports.`);
  } catch (err) {
    console.error('[Scheduler] enforceModerationSLA failed:', err);
  }
}

/**
 * JOB 4: Weekly Analytics Report (Runs Sunday at midnight)
 * Snapshot active users, new content, and flagged ratio over trailing 7 days.
 */
function generateWeeklyAnalytics() {
  console.log('[Scheduler] Executing generateWeeklyAnalytics...');
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // 1. Metric: Active Users (who accessed history)
    const activeUsersRow = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as active 
      FROM access_history WHERE created_at >= ?
    `).get(sevenDaysAgo);
    
    // 2. Metric: New Users created
    const newUsersRow = db.prepare(`
      SELECT COUNT(id) as counts FROM users WHERE created_at >= ?
    `).get(sevenDaysAgo);
    
    // 3. Metric: New Posts Published
    const newPostsRow = db.prepare(`
      SELECT COUNT(id) as counts FROM posts WHERE created_at >= ?
    `).get(sevenDaysAgo);
    
    // 4. Metric: Flagged content ratio logic
    // Count reported posts / total new posts
    const reportedPostsRow = db.prepare(`
      SELECT COUNT(DISTINCT post_id) as counts FROM reports WHERE created_at >= ?
    `).get(sevenDaysAgo);
    
    const postsCount = newPostsRow.counts || 1; // avoid division by 0
    let flagRatio = (reportedPostsRow.counts / postsCount) * 100;

    const data = {
      id: uuidv4(),
      week_start_date: sevenDaysAgo.slice(0, 10), // 'YYYY-MM-DD'
      active_users: activeUsersRow.active || 0,
      new_users: newUsersRow.counts || 0,
      new_posts: newPostsRow.counts || 0,
      flagged_content_ratio: flagRatio
    };

    db.prepare(`
      INSERT INTO weekly_analytics (id, week_start_date, active_users, new_users, new_posts, flagged_content_ratio)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.id, data.week_start_date, data.active_users, data.new_users, data.new_posts, data.flagged_content_ratio);
    
    console.log(`[Scheduler] generateWeeklyAnalytics completed. Snapshot saved:`, data);
  } catch (err) {
    console.error('[Scheduler] generateWeeklyAnalytics failed:', err);
  }
}

/**
 * JOB 5: Publish Scheduled Posts (Runs every minute)
 * Finds posts with status SCHEDULED where scheduled_date <= NOW() and publishes them.
 */
function publishScheduledPosts() {
  try {
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE posts 
      SET status = 'PUBLISHED' 
      WHERE status = 'SCHEDULED' AND scheduled_date <= ?
    `).run(now);
    
    if (result.changes > 0) {
      console.log(`[Scheduler] publishScheduledPosts: Published ${result.changes} scheduled posts.`);
    }
  } catch (err) {
    console.error('[Scheduler] publishScheduledPosts failed:', err);
  }
}

/**
 * Bootstrapper: Registers jobs with node-cron and starts them.
 */
function startScheduler() {
  console.log('[Scheduler] Starting background jobs mapping...');
  
  // Job 1: Sweep scores every hour at minute 0
  cron.schedule('0 * * * *', sweepUserRiskScores);
  
  // Job 2: Recalculate trending every 15 minutes (minute 0,15,30,45)
  cron.schedule('*/15 * * * *', calculateTrendingTopics);
  
  // Job 3: Monitor SLAs every hour at minute 30
  cron.schedule('30 * * * *', enforceModerationSLA);
  
  // Job 4: Weekly analytics on Sunday at 00:00
  cron.schedule('0 0 * * 0', generateWeeklyAnalytics);
  
  // Job 5: Publish scheduled posts every minute
  cron.schedule('* * * * *', publishScheduledPosts);
  
  console.log('[Scheduler] Background jobs successfully scheduled.');
}

module.exports = {
  startScheduler,
  // Expose directly for manual validation scripts in testing
  sweepUserRiskScores,
  calculateTrendingTopics,
  enforceModerationSLA,
  generateWeeklyAnalytics,
  publishScheduledPosts
};
