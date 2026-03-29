// backend/database/migrate_missing_features.js
const db = require('./db');

console.log('Starting migrations for missing features...');

try {
  // 1. Add mfa_secret and mfa_enabled to users
  console.log('Adding MFA columns to users table...');
  try {
    db.prepare('ALTER TABLE users ADD COLUMN mfa_secret TEXT').run();
    db.prepare('ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0').run();
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('MFA columns already exist.');
    } else {
      throw err;
    }
  }

  // 2. Add oauth_provider and oauth_id to users
  console.log('Adding OAuth columns to users table...');
  try {
    db.prepare('ALTER TABLE users ADD COLUMN oauth_provider TEXT').run();
    db.prepare('ALTER TABLE users ADD COLUMN oauth_id TEXT').run();
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('OAuth columns already exist.');
    } else {
      throw err;
    }
  }

  // 3. Add scheduled_date to posts
  console.log('Adding scheduled_date column to posts table...');
  try {
    db.prepare('ALTER TABLE posts ADD COLUMN scheduled_date DATETIME').run();
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('scheduled_date column already exists.');
    } else {
      throw err;
    }
  }

  // 4. Add original_post_id to posts (for reposts)
  console.log('Adding original_post_id column to posts table...');
  try {
    db.prepare('ALTER TABLE posts ADD COLUMN original_post_id TEXT').run();
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('original_post_id column already exists.');
    } else {
      throw err;
    }
  }

  console.log('Migrations completed successfully.');
} catch (error) {
  console.error('Migration failed:', error);
}
