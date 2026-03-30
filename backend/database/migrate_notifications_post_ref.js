/**
 * migrate_notifications_post_ref.js
 * Adds `post_id` column to notifications table (if it doesn't already exist)
 * and adds `actor_username` column for richer display.
 * Safe to run multiple times (uses IF NOT EXISTS pattern via PRAGMA).
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for consistency
db.pragma('journal_mode = WAL');

const cols = db.pragma('table_info(notifications)').map(c => c.name);

if (!cols.includes('post_id')) {
  db.exec(`ALTER TABLE notifications ADD COLUMN post_id TEXT REFERENCES posts(id) ON DELETE SET NULL`);
  console.log('✅  Added post_id column to notifications');
} else {
  console.log('ℹ️   post_id column already exists — skipping');
}

if (!cols.includes('actor_username')) {
  db.exec(`ALTER TABLE notifications ADD COLUMN actor_username TEXT`);
  console.log('✅  Added actor_username column to notifications');
} else {
  console.log('ℹ️   actor_username column already exists — skipping');
}

db.close();
console.log('Migration complete.');
