// create_admin.js
// One-time script to create the admin user: Shibam.seal4@gmail.com
// Run: node create_admin.js  (from the /backend folder)

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database/db');

const EMAIL    = 'Shibam.seal4@gmail.com';
const PASSWORD = 'Shibam04@1996';
const USERNAME = 'Shibam';
const ROLE     = 'admin';

async function createAdmin() {
  try {
    // Check if user already exists
    const existing = db.prepare(`SELECT id, role FROM users WHERE email = ?`).get(EMAIL);

    if (existing) {
      if (existing.role === 'admin') {
        console.log(`✅ Admin user already exists: ${EMAIL} (id: ${existing.id})`);
      } else {
        // Upgrade existing user to admin
        db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(existing.id);
        console.log(`⬆️  Upgraded existing user ${EMAIL} to admin role.`);
      }
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, username, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, USERNAME, EMAIL, hashedPassword, ROLE);

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   Email   : ${EMAIL}`);
    console.log(`   Username: ${USERNAME}`);
    console.log(`   Role    : ${ROLE}`);
    console.log(`   ID      : ${userId}`);
    console.log(`\nYou can now log in at http://localhost:5173/login\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:', err.message);
    process.exit(1);
  }
}

createAdmin();
