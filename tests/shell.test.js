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

test('the stable channel has cache names of its own, and each channel only clears its own old caches', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(sw, /CACHE = CACHE\.replace\('nibble-', 'nibble-stable-'\)/);
  assert.match(sw, /KEEP = KEEP\.replace\('nibble-', 'nibble-stable-'\)/);
  assert.match(sw, /keys\.filter\(function \(k\) \{ return ownCache\(k\) && k !== CACHE && k !== KEEP; \}\)/);
  const own = new Function('STABLE', sw.match(/function ownCache[^\n]*/)[0] + '; return ownCache;');
  assert.deepEqual(['nibble-v5', 'nibble-emoji-v1', 'nibble-stable-v5', 'nibble-stable-emoji-v1', 'other'].filter(own(false)), ['nibble-v5', 'nibble-emoji-v1']);
  assert.deepEqual(['nibble-v5', 'nibble-emoji-v1', 'nibble-stable-v5', 'nibble-stable-emoji-v1', 'other'].filter(own(true)), ['nibble-stable-v5', 'nibble-stable-emoji-v1']);
});
