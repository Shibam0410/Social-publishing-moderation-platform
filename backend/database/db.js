// database/db.js
// ─────────────────────────────────────────────────────────────
// Sets up the SQLite database connection using better-sqlite3.
// better-sqlite3 is SYNCHRONOUS — no callbacks or promises needed,
// which makes the code much easier to follow for beginners.
// ─────────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// Path where the SQLite file will be stored (now cleanly within the database folder)
const DB_PATH     = path.join(__dirname, 'data.sqlite');
// Path to the SQL file that defines all our tables
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Open (or create) the database file
const db = new Database(DB_PATH);

// Enable WAL mode for better performance with concurrent reads
db.pragma('journal_mode = WAL');
// Enforce foreign key constraints (SQLite disables them by default)
db.pragma('foreign_keys = ON');

// Read the schema file and run it on startup.
// This creates tables IF THEY DON'T ALREADY EXIST, so it's safe
// to call every time the server starts.
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

console.log('✅ Database connected and schema applied.');

// Export the db instance so any other file can import and use it
module.exports = db;
