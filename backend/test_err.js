const cp = require('child_process');
const fs = require('fs');
try {
  const out = cp.execSync('node test_scheduler.js', { encoding: 'utf-8' });
  fs.writeFileSync('err.log', out);
} catch (e) {
  fs.writeFileSync('err.log', e.stdout + '\n\n' + e.stderr);
}
