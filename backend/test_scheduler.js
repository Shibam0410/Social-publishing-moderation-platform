// test_scheduler.js
// A testing script to manually trigger all 4 node-cron background jobs
require('./database/db'); // ensure DB init
const { 
  sweepUserRiskScores, 
  calculateTrendingTopics, 
  enforceModerationSLA, 
  generateWeeklyAnalytics 
} = require('./services/scheduler');
const db = require('./database/db');

console.log("=== RUNNING SCHEDULER JOBS INDIVIDUALLY ===");

console.log("\n1. Running calculateTrendingTopics()");
calculateTrendingTopics();
const trends = db.prepare('SELECT * FROM trending_topics').all();
console.log("-> Current trends computed:", trends);

console.log("\n2. Running sweepUserRiskScores()");
sweepUserRiskScores();
// Check if anyone was flagged
const flaggedUsers = db.prepare("SELECT username, status FROM users WHERE status IN ('WARNING', 'TEMP_SUSPENDED')").all();
console.log("-> Users flagged by risk sweeper:", flaggedUsers);

console.log("\n3. Running enforceModerationSLA()");
enforceModerationSLA();
const escalations = db.prepare("SELECT id, report_status FROM reports WHERE report_status = 'ESCALATED'").all();
console.log("-> Escalated reports count:", escalations.length);

console.log("\n4. Running generateWeeklyAnalytics()");
generateWeeklyAnalytics();
const weekStats = db.prepare('SELECT * FROM weekly_analytics ORDER BY created_at DESC LIMIT 1').get();
console.log("-> Latest weekly analytics snapshot:", weekStats);

console.log("\n✅ ALL SCHEDULER JOBS EXECUTED SECURELY.");
