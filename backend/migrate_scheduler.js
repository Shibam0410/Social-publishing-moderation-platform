// migrate_scheduler.js
const db = require('./database/db');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trending_topics (
      hashtag TEXT PRIMARY KEY,
      use_count INTEGER DEFAULT 0,
      last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_analytics (
      id TEXT PRIMARY KEY,
      week_start_date DATE NOT NULL,
      active_users INTEGER DEFAULT 0,
      new_users INTEGER DEFAULT 0,
      new_posts INTEGER DEFAULT 0,
      flagged_content_ratio REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Scheduler tables successfully created.");
} catch (err) {
  console.error("Migration failed:", err);
}
