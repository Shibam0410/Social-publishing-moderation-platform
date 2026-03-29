const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'database', 'data.sqlite');
const db = new Database(dbPath);

console.log('Starting full database wipe (preserving/creating admin: shibam.seal4@gmail.com)...');

const tables = [
    'follows', 'community_members', 'communities', 'poll_votes', 'poll_options', 'polls',
    'comments', 'likes', 'bookmarks', 'reports', 'notifications', 'audit_logs',
    'analytics_snapshots', 'data_deletion_requests', 'access_history',
    'trending_topics', 'weekly_analytics', 'invite_tokens', 'password_reset_tokens',
    'posts'
];

try {
    db.prepare('PRAGMA foreign_keys = OFF').run();
    db.transaction(() => {
        // 1. Wipe all activity tables
        for (const table of tables) {
            db.prepare(`DELETE FROM ${table}`).run();
            console.log(`✅ Cleared table: ${table}`);
        }

        // 2. Clear all users except shibam.seal4@gmail.com
        const KEEP_EMAIL = 'shibam.seal4@gmail.com';
        db.prepare('DELETE FROM users WHERE email != ?').run(KEEP_EMAIL);
        console.log(`✅ Wiped all other users.`);

        // 3. Assure admin user exists and password is set
        const newPasswordHash = bcrypt.hashSync('December05@1996', 10);
        let adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get(KEEP_EMAIL);
        
        if (adminUser) {
            db.prepare('UPDATE users SET password = ?, role = "admin", status = "ACTIVE" WHERE email = ?').run(newPasswordHash, KEEP_EMAIL);
            console.log(`✅ Updated existing admin password and ensured role is admin.`);
        } else {
            const userId = uuidv4();
            db.prepare(`
              INSERT INTO users (id, username, email, password, role, status)
              VALUES (?, ?, ?, ?, 'admin', 'ACTIVE')
            `).run(userId, 'Shibam4', KEEP_EMAIL, newPasswordHash);
            console.log(`✅ Created admin user from scratch.`);
        }
    })();
    db.prepare('PRAGMA foreign_keys = ON').run();
} catch (err) {
    console.error('❌ Reset failed:', err.message);
} finally {
    db.close();
}

console.log('Database reset complete.');
