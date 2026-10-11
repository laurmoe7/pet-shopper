'use strict';
// The page serves its own fonts (fonts/, fonts.css, written by tools/fetch-fonts.js): nothing is fetched from Google.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('every font fonts.css and the service worker name is in fonts/, and the page loads no font from Google', () => {
  const css = fs.readFileSync(path.join(root, 'fonts.css'), 'utf8');
  const files = [...css.matchAll(/url\(fonts\/([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(files.length >= 8);
  for (const f of files) assert.ok(fs.existsSync(path.join(root, 'fonts', f)), f);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const cached = new Function('return ' + /var FONTS = (\[[^\]]*\]);/.exec(sw)[1])();
  for (const f of cached) assert.ok(files.includes(f.replace('fonts/', '')), f + ' is cached on install but not in fonts.css');
  for (const family of ['Kiwi Maru', 'M PLUS Rounded 1c', 'Pixelify Sans', 'EB Garamond']) assert.ok(css.includes("font-family: '" + family + "'"), family);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="fonts\.css">/);
  assert.doesNotMatch(html + fs.readFileSync(path.join(root, 'styles.css'), 'utf8'), /fonts\.(googleapis|gstatic)\.com/);
});
