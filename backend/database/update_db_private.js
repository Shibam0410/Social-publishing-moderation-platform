const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data.sqlite');
console.log(`Connecting to database at: ${dbPath}`);
const db = new Database(dbPath);

console.log('Running schema migrations for Private Communities...');

try {
  // Add is_private to communities
  db.prepare(`ALTER TABLE communities ADD COLUMN is_private INTEGER DEFAULT 0`).run();
  console.log('✅ Added is_private to communities table.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('⚠️ Column is_private already exists in communities table.');
  } else {
    console.error('❌ Error adding is_private:', err.message);
  }
}

try {
  // Add status to community_members
  db.prepare(`ALTER TABLE community_members ADD COLUMN status TEXT DEFAULT 'approved'`).run();
  console.log('✅ Added status to community_members table.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('⚠️ Column status already exists in community_members table.');
  } else {
    console.error('❌ Error adding status:', err.message);
  }
}

console.log('Migration complete.');
db.close();
