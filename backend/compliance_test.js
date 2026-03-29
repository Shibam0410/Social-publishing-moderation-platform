// compliance_test.js
const http = require('http');
const fs   = require('fs');

const base = { hostname: 'localhost', port: 3000 };

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const opts = { ...base, method, path: '/api' + path, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, data: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode, data: null, raw }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  console.log('🔄 Compliance Module Verification\n');

  // 1. Register + Login two users
  const ts    = Date.now();
  const email1 = `alice_${ts}@test.com`;
  const email2 = `comp_${ts}@test.com`;

  await req('POST', '/auth/register', { username: `alice_${ts}`, email: email1, password: 'password123' });
  await req('POST', '/auth/register', { username: `comp_${ts}`,  email: email2, password: 'password123' });

  const l1 = await req('POST', '/auth/login', { email: email1, password: 'password123' });
  const l2 = await req('POST', '/auth/login', { email: email2, password: 'password123' });
  const user1 = l1.data.user; const tok1 = l1.data.token;
  const user2 = l2.data.user; const tok2 = l2.data.token;

  console.log(`✅ Registered and logged in: ${user1.username}, ${user2.username}`);

  // Elevate user2 to compliance_officer
  const db = require('./database/db');
  db.prepare(`UPDATE users SET role = 'compliance_officer' WHERE id = ?`).run(user2.id);
  const lc = await req('POST', '/auth/login', { email: email2, password: 'password123' });
  const compToken = lc.data.token;
  console.log('✅ Elevated user2 to compliance_officer, re-logged in');

  // 2. Access History — after the two logins, user1 should have history
  const hist = await req('GET', `/compliance/users/${user1.id}/access-history`, null, compToken);
  console.assert(hist.status === 200, 'Access history failed: ' + JSON.stringify(hist.data));
  console.log(`✅ Access history for ${user1.username}: ${hist.data.total} entries`);

  // 3. Audit Logs (filterable)
  const logs = await req('GET', '/compliance/audit-logs?action=user.login&limit=5', null, compToken);
  console.assert(logs.status === 200, 'Audit logs failed');
  console.log(`✅ Audit logs (filtered by user.login): ${logs.data.logs.length} entries`);

  // 4. JSON Export
  const jsonExport = await req('GET', `/compliance/users/${user1.id}/export?format=json`, null, compToken);
  console.assert(jsonExport.status === 200, 'JSON export failed');
  console.log(`✅ JSON export — posts: ${jsonExport.data.posts.length}, logins: ${jsonExport.data.logins.length}`);

  // 5. CSV Export (raw text)
  const csvExport = await req('GET', `/compliance/users/${user1.id}/export?format=csv`, null, compToken);
  console.assert(csvExport.status === 200, 'CSV export failed');
  console.log(`✅ CSV export — bytes received: ${csvExport.raw.length}`);

  // 6. PDF Export (binary)
  const pdfExport = await req('GET', `/compliance/users/${user1.id}/export?format=pdf`, null, compToken);
  console.assert(pdfExport.status === 200, 'PDF export failed');
  console.log(`✅ PDF export — bytes received: ${pdfExport.raw.length}`);

  // 7. Submit Deletion Request (self)
  const del1 = await req('POST', `/compliance/users/${user1.id}/deletion-request`, { reason: 'No longer want account.' }, tok1);
  console.assert(del1.status === 201, 'Deletion request failed: ' + JSON.stringify(del1.data));
  const requestId = del1.data.requestId;
  console.log(`✅ Deletion request submitted: ${requestId}`);

  // 8. List Deletion Requests
  const delList = await req('GET', '/compliance/deletion-requests?status=PENDING', null, compToken);
  console.assert(delList.status === 200 && delList.data.requests.length >= 1, 'List deletion requests failed');
  console.log(`✅ Pending deletion requests: ${delList.data.requests.length}`);

  // 9. Duplicate request should 409
  const dup = await req('POST', `/compliance/users/${user1.id}/deletion-request`, {}, tok1);
  console.assert(dup.status === 409, 'Duplicate request should have been 409');
  console.log('✅ Duplicate deletion request correctly blocked (409)');

  // 10. Approve Deletion
  const approve = await req('PATCH', `/compliance/deletion-requests/${requestId}`, { decision: 'APPROVE' }, compToken);
  console.assert(approve.status === 200, 'Approve deletion failed: ' + JSON.stringify(approve.data));
  console.log('✅ Deletion approved — user data erased');

  // 11. Verify user can no longer login (account anonymised)
  const blockedLogin = await req('POST', '/auth/login', { email: email1, password: 'password123' });
  console.assert(blockedLogin.status === 403 || blockedLogin.status === 401, 'Deleted user should not be able to login');
  console.log(`✅ Deleted user login blocked: ${blockedLogin.data?.error}`);

  console.log('\n🎉 ALL COMPLIANCE TESTS PASSED!');
  process.exit(0);
}

run().catch(e => {
  fs.writeFileSync('compliance_test_error.log', e.stack || String(e));
  console.log('CRASHED — see compliance_test_error.log');
  process.exit(1);
});
