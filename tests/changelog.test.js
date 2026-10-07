const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// every build gets a heading in CHANGELOG.md, so a forgotten entry fails here instead of slipping through
test('the current build has a changelog entry', () => {
  const root = path.join(__dirname, '..');
  const build = /var BUILD = '(\d+)'/.exec(fs.readFileSync(path.join(root, 'app.js'), 'utf8'))[1];
  const log = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.match(log, new RegExp('^## Build ' + build + '\\b', 'm'), 'add "## Build ' + build + '" to CHANGELOG.md');
});
