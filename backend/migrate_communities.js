const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);

console.log('Migration started on', dbPath);

try {
    // 1. Add created_by column
    db.exec('ALTER TABLE communities ADD COLUMN created_by TEXT');
    console.log('✅ Added created_by column');
} catch (e) {
    console.log('⚠️ Column might exist:', e.message);
}

// 2. Backfill created_by
const firstAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (firstAdmin) {
    const res = db.prepare('UPDATE communities SET created_by = ? WHERE created_by IS NULL').run(firstAdmin.id);
    console.log('✅ Backfilled:', res.changes, 'rows with admin', firstAdmin.id);
} else {
    const firstUser = db.prepare("SELECT id FROM users LIMIT 1").get();
    if (firstUser) {
        const res = db.prepare('UPDATE communities SET created_by = ? WHERE created_by IS NULL').run(firstUser.id);
        console.log('✅ Backfilled:', res.changes, 'rows with user', firstUser.id);
    }
}

const info = db.prepare('PRAGMA table_info(communities)').all();
console.log('Final Columns:', info.map(c => c.name).join(', '));

db.close();
console.log('Migration finished.');
