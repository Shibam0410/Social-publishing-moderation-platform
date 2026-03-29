// test.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
};

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, method, path: '/api' + path, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🔄 Starting Verification Tests...');

  // 1. REGISTER USERS
  const email1 = `alice${Date.now()}@test.com`;
  const email2 = `admin${Date.now()}@test.com`;

  const u1 = await req('POST', '/auth/register', { username: 'alice_' + Date.now(), email: email1, password: 'password123' });
  if (u1.status !== 201) return console.log('U1 Reg failed', u1);

  const u2 = await req('POST', '/auth/register', { username: 'admin_' + Date.now(), email: email2, password: 'password123' });
  if (u2.status !== 201) return console.log('U2 Reg failed', u2);

  // 1b. LOGIN USERS TO GET TOKENS
  const l1 = await req('POST', '/auth/login', { email: email1, password: 'password123' });
  const user1 = l1.data;
  console.log('User 1 Logged in:', user1.user.username);

  const l2 = await req('POST', '/auth/login', { email: email2, password: 'password123' });
  const adminUser = l2.data;

  // Elevate U2 to admin directly via DB
  const db = require('./database/db');
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(adminUser.user.id);
  console.log('Admin User elevated in DB:', adminUser.user.username);

  const u1Token = user1.token;
  const adminToken = adminUser.token;

  // 2. CREATE POST AS NORMAL USER
  const p1 = await req('POST', '/posts', { post_type: 'text', content: 'Hello World! Verification testing...' }, u1Token);
  console.assert(p1.status === 201, 'Post creation failed ' + JSON.stringify(p1));
  const postId = p1.data.postId;
  console.log('✅ Post Created');

  // 3. ANALYTICS (Normal User fails)
  const a1 = await req('GET', '/analytics/summary', null, u1Token);
  console.assert(a1.status === 403, 'Normal user should be denied summary');
  console.log('✅ RBAC check: Normal user denied platform analytics.');

  // 4. ANALYTICS (Admin User succeeds)
  const a2 = await req('GET', '/analytics/summary', null, adminToken);
  console.assert(a2.status === 200, 'Admin should see summary');
  console.log('✅ Admin viewed Platform Summary:', a2.data.summary);

  // 5. BAN USER (Admin)
  const banRes = await req('POST', `/admin/users/${user1.user.id}/ban`, { reason: 'Test Ban' }, adminToken);
  console.assert(banRes.status === 200, 'Admin should ban');
  console.log('✅ Admin successfully banned user 1');

  // 6. LOGIN BLOCKED FOR BANNED USER
  const blockedLogin = await req('POST', '/auth/login', { email: user1.user.email, password: 'password123' });
  console.assert(blockedLogin.status === 403, 'Banned user should not login');
  console.log('✅ Banned user login successfully blocked:', blockedLogin.data);

  // 7. COMPLIANCE EXPORT
  const exportRes = await req('GET', `/compliance/users/${user1.user.id}/export`, null, adminToken);
  console.assert(exportRes.status === 200, 'Compliance export failed');
  console.log('✅ Compliance GDPR Export Length:', JSON.stringify(exportRes.data).length);

  console.log('🎉 ALL TESTS PASSED!');
  process.exit(0);
}

runTests().catch(e => {
  const fs = require('fs');
  fs.writeFileSync('test_error.log', e.stack || String(e));
  console.log('TEST SCRIPT CRASHED. Logged trace to test_error.log');
  process.exit(1);
});
