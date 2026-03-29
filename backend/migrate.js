const db = require('./database/db.js');
try {
  db.prepare(`ALTER TABLE posts ADD COLUMN language TEXT NOT NULL DEFAULT 'en';`).run();
  console.log("Migration successful: added language column");
} catch(e) {
  console.log("Migration skipped/failed: ", e.message);
}
