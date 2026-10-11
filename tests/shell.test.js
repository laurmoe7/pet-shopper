'use strict';
// A new script goes in index.html and in the service worker's SHELL (the offline copy): a missing one would break the app offline.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('every script in index.html is in the service worker shell', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length > 20);
  const shell = new Function('return ' + /var SHELL = (\[[^\]]*\]);/.exec(sw)[1])();
  assert.deepEqual(scripts.filter((s) => !shell.includes(s)), []);
});
