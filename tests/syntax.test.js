const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// the app-*.js page scripts aren't loaded by the other tests, so a typo in one would only show in the browser
test('every page script parses', () => {
  const root = path.join(__dirname, '..');
  const files = fs.readdirSync(root).filter((f) => /^(app(-[a-z]+)?|sketch|backdrops)\.js$/.test(f));
  assert.ok(files.length > 10);
  for (const f of files) {
    assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }), f);
  }
});
