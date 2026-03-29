// services/analyticsService.js
const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// Add missing columns to analytics_snapshots if they don't exist yet
// (Schema had views_count + reach_score; we also need likes + comments)
const missingCols = [
  { col: 'likes_count',   sql: 'ALTER TABLE analytics_snapshots ADD COLUMN likes_count INTEGER DEFAULT 0' },
  { col: 'comments_count',sql: 'ALTER TABLE analytics_snapshots ADD COLUMN comments_count INTEGER DEFAULT 0' },
];
for (const { col, sql } of missingCols) {
  try { db.prepare(sql).run(); } catch (e) { /* column already exists */ }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ensureTodayRow(postId) {
  try {
    const exists = db.prepare(
      `SELECT id FROM analytics_snapshots WHERE post_id = ? AND snapshot_date = ?`
    ).get(postId, today());

    if (!exists) {
      db.prepare(
        `INSERT INTO analytics_snapshots (id, post_id, snapshot_date) VALUES (?, ?, ?)`
      ).run(uuidv4(), postId, today());
    }
  } catch (e) {
    console.warn('[Analytics] ensureTodayRow failed:', e.message);
  }
}

function recordView(postId) {
  try {
    ensureTodayRow(postId);
    db.prepare(
      `UPDATE analytics_snapshots SET views_count = views_count + 1 WHERE post_id = ? AND snapshot_date = ?`
    ).run(postId, today());
  } catch (e) {
    console.warn('[Analytics] recordView failed:', e.message);
  }
}

function recordLike(postId) {
  try {
    ensureTodayRow(postId);
    db.prepare(
      `UPDATE analytics_snapshots SET likes_count = likes_count + 1 WHERE post_id = ? AND snapshot_date = ?`
    ).run(postId, today());
  } catch (e) {
    console.warn('[Analytics] recordLike failed:', e.message);
  }
}

function recordComment(postId) {
  try {
    ensureTodayRow(postId);
    db.prepare(
      `UPDATE analytics_snapshots SET comments_count = comments_count + 1 WHERE post_id = ? AND snapshot_date = ?`
    ).run(postId, today());
  } catch (e) {
    console.warn('[Analytics] recordComment failed:', e.message);
  }
}

function getPostAnalytics(postId) {
  try {
    return db.prepare(
      `SELECT * FROM analytics_snapshots WHERE post_id = ? ORDER BY snapshot_date DESC`
    ).all(postId);
  } catch (e) {
    return [];
  }
}

function getPlatformSummary() {
  try {
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(views_count),    0) AS total_views,
        COALESCE(SUM(likes_count),    0) AS total_likes,
        COALESCE(SUM(comments_count), 0) AS total_comments
      FROM analytics_snapshots
    `).get();
    const postCount = db.prepare(`SELECT COUNT(*) AS total_posts FROM posts`).get();
    return { ...totals, total_posts: postCount.total_posts };
  } catch (e) {
    return { total_views: 0, total_likes: 0, total_comments: 0, total_posts: 0 };
  }
}

module.exports = { recordView, recordLike, recordComment, getPostAnalytics, getPlatformSummary };
