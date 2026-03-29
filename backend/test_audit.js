// test_audit.js
const db = require('./database/db');
const { auditLog } = require('./services/auditLogService');
try {
  auditLog('test-actor', 'user', 'test.action', 'user:test', { details: { foo: 'bar' } });
  console.log('✅ auditLog INSERT works fine');
} catch(e) {
  console.error('❌ auditLog INSERT FAILED:', e.message);
  console.error(e.stack);
}
process.exit(0);
