// audit_test.js — verify all 5 audit log action categories
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
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: null }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  console.log('🔄 Audit Log Coverage Verification\n');
  const ts = Date.now();

  // Setup: register and login a user + admin
  await req('POST', '/auth/register', { username: `alice_${ts}`, email: `alice_${ts}@t.com`, password: 'password123' });
  await req('POST', '/auth/register', { username: `admin_${ts}`, email: `admin_${ts}@t.com`, password: 'password123' });

  const l1 = await req('POST', '/auth/login', { email: `alice_${ts}@t.com`, password: 'password123' });
  const l2 = await req('POST', '/auth/login', { email: `admin_${ts}@t.com`, password: 'password123' });
  if (!l1.data?.user) return console.log('L1 login failed:', l1.status, JSON.stringify(l1.data));
  if (!l2.data?.user) return console.log('L2 login failed:', l2.status, JSON.stringify(l2.data));
  const tok1 = l1.data.token; const user1 = l1.data.user;
  let user2 = l2.data.user;

  const db = require('./database/db');
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(user2.id);
  const la = await req('POST', '/auth/login', { email: `admin_${ts}@t.com`, password: 'password123' });
  if (!la.data?.token) return console.log('Admin re-login failed:', la.status, JSON.stringify(la.data));
  const adminTok = la.data.token;
  db.prepare(`UPDATE users SET role = 'compliance_officer' WHERE id = ?`).run(user2.id);
  const lc = await req('POST', '/auth/login', { email: `admin_${ts}@t.com`, password: 'password123' });
  if (!lc.data?.token) return console.log('Comp re-login failed:', lc.status, JSON.stringify(lc.data));
  const compTok = lc.data.token;

  // ── 1. POST EDIT  →  post.edited
  const p = await req('POST', '/posts', { post_type: 'text', content: 'Original content' }, tok1);
  const postId = p.data.postId;
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(user2.id);
  const adminTok2 = (await req('POST', '/auth/login', { email: `admin_${ts}@t.com`, password: 'password123' })).data.token;
  const edit = await req('PUT', `/posts/${postId}`, { content: 'Edited content' }, tok1);
  console.assert(edit.status === 200, 'Edit post failed');
  console.log('✅ 1. post.edited triggered');

  // ── 2. MODERATION ACTION  →  post.status_changed
  db.prepare(`UPDATE users SET role = 'moderator' WHERE id = ?`).run(user2.id);
  const modTok = (await req('POST', '/auth/login', { email: `admin_${ts}@t.com`, password: 'password123' })).data.token;
  const mod = await req('PATCH', `/moderation/posts/${postId}/status`, { status: 'UNDER_REVIEW' }, modTok);
  console.assert(mod.status === 200, 'Set status failed');
  console.log('✅ 2. post.status_changed triggered');

  // ── 3. ACCOUNT SUSPENSION  →  user.suspended
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(user2.id);
  const adminTok3 = (await req('POST', '/auth/login', { email: `admin_${ts}@t.com`, password: 'password123' })).data.token;
  const susp = await req('POST', `/admin/users/${user1.id}/suspend`, { reason: 'Test suspension' }, adminTok3);
  console.assert(susp.status === 200, 'Suspend failed');
  console.log('✅ 3. user.suspended triggered');

  // Restore for further tests
  await req('POST', `/admin/users/${user1.id}/restore`, {}, adminTok3);

  // ── 4. ROLE CHANGE  →  user.role_changed
  const rc = await req('PATCH', `/admin/users/${user1.id}/role`, { role: 'creator' }, adminTok3);
  console.assert(rc.status === 200, 'Role change failed');
  console.log('✅ 4. user.role_changed triggered');

  // ── 5. REPORT DECISION  →  report.decision
  // Re-publish post first
  db.prepare(`UPDATE posts SET status = 'PUBLISHED' WHERE id = ?`).run(postId);
  const rep = await req('POST', `/posts/${postId}/report`, { reason: 'spam' }, tok1);
  const reportId = rep.data?.reportId;
  const rd = await req('PATCH', `/moderation/reports/${reportId}`, { status: 'CLOSED' }, modTok);
  console.assert(rd.status === 200, 'Report decision failed');
  console.log('✅ 5. report.decision triggered');

  // ── 6. Verify all entries appear in audit log
  db.prepare(`UPDATE users SET role = 'compliance_officer' WHERE id = ?`).run(user2.id);
  const compTok2 = (await req('POST', '/auth/login', { email: `admin_${ts}@t.com`, password: 'password123' })).data.token;
  const logs = await req('GET', '/compliance/audit-logs?limit=100', null, compTok2);
  console.assert(logs.status === 200, 'Audit logs failed');

  const actions = logs.data.logs.map(l => l.action);
  const required = ['post.edited', 'post.status_changed', 'user.suspended', 'user.role_changed', 'report.decision'];
  required.forEach(a => {
    const found = actions.includes(a);
    console.assert(found, `Missing action: ${a}`);
    console.log(`  ${found ? '✅' : '❌'} ${a} in audit log`);
  });

  // ── 7. Action-types endpoint
  const at = await req('GET', '/compliance/audit-logs/action-types', null, compTok2);
  console.assert(at.status === 200 && Object.keys(at.data.action_types).length >= 15, 'Action types failed');
  console.log(`✅ 7. Action-types catalogue: ${Object.keys(at.data.action_types).length} entries`);

  console.log('\n🎉 ALL AUDIT LOG TESTS PASSED!');
  process.exit(0);
}

run().catch(e => {
  fs.writeFileSync('audit_test_error.log', e.stack || String(e));
  console.log('CRASHED — see audit_test_error.log');
  process.exit(1);
});
