// migrate_comments.js — ensures all core tables exist in the live DB
const db = require('./db');

console.log('Running ensure-tables migration...');

const tables = [
  {
    name: 'comments',
    sql: `CREATE TABLE IF NOT EXISTS comments (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`
  },
  {
    name: 'likes',
    sql: `CREATE TABLE IF NOT EXISTS likes (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    )`
  },
  {
    name: 'bookmarks',
    sql: `CREATE TABLE IF NOT EXISTS bookmarks (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    )`
  }
];

for (const t of tables) {
  try {
    db.exec(t.sql);
    console.log(`✅ Table "${t.name}" ensured.`);
  } catch (err) {
    console.error(`❌ Failed on "${t.name}":`, err.message);
  }
}

// Also ensure the post_count column helpers exist via the engagement_counters approach
// Check if comment_count column exists on posts, add if missing
try {
  db.prepare('ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0').run();
  console.log('✅ comment_count column added to posts.');
} catch (err) {
  if (err.message.includes('duplicate column')) {
    console.log('ℹ️  comment_count already exists.');
  } else {
    console.error('❌ comment_count:', err.message);
  }
}

try {
  db.prepare('ALTER TABLE posts ADD COLUMN like_count INTEGER DEFAULT 0').run();
  console.log('✅ like_count column added to posts.');
} catch (err) {
  if (err.message.includes('duplicate column')) {
    console.log('ℹ️  like_count already exists.');
  } else {
    console.error('❌ like_count:', err.message);
  }
}

console.log('Migration complete.');
