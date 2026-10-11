// "Big push": merge main in, run the tests and, only if they pass, push the session branch to main (never forced). Then say what the push changes.
//   node tools/bigpush.js            (from the session branch)
// Prints the push range, whether desktop/ changed (needs the new installer) and the files changed there. The Mini Fumu version is the next
// "Build the desktop app (Windows)" run number: the latest release tag (get_latest_release) plus one when desktop/ changed.
const { execSync, spawnSync } = require('child_process');
const run = (c) => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const branch = run('git rev-parse --abbrev-ref HEAD');
if (branch === 'main' || branch === 'stable') { console.error('Run this from the session branch, not ' + branch); process.exit(1); }
run('git fetch origin main');
const merged = run('git merge origin/main 2>&1 || true');
if (/CONFLICT/.test(merged)) { console.error('Merge conflict: resolve it first.\n' + merged); process.exit(1); }
const t = spawnSync('npm', ['test'], { encoding: 'utf8' });
const pass = /# pass (\d+)/.exec(t.stdout), fail = /# fail (\d+)/.exec(t.stdout);
console.log('tests: ' + (pass ? pass[1] : '?') + ' pass, ' + (fail ? fail[1] : '?') + ' fail');
if (t.status !== 0) { console.error('Tests failed: not pushing.\n' + t.stdout.split('\n').filter((l) => /^not ok|error:/.test(l)).join('\n')); process.exit(1); }
const before = run('git rev-parse origin/main');
const push = run('git push origin ' + branch + ':main 2>&1');
console.log(push.split('\n').pop());
const desk = run('git diff --stat ' + before + ' HEAD -- desktop');
console.log(desk ? 'desktop/ CHANGED (needs the new installer):\n' + desk : 'desktop/ unchanged (the page only, an app restart is enough)');
console.log('Builds in this push:\n' + run('git log ' + before + '..HEAD --format=%s').split('\n').slice(0, 15).join('\n'));
