'use strict';
// The app and Mini Fumu share one theme: the lists in the page, the shell and the settings window must agree.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ids = (src, re) => [...re.exec(src)[1].matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1]).filter((x, i, a) => a.indexOf(x) === i);

test('the page, the shell and the settings window offer the same themes', () => {
  const page = [...read('app-options.js').match(/var THEMES = \[(.*)\];/)[1].matchAll(/\['([a-z0-9]+)'/g)].map((m) => m[1]);
  const shell = ids(read('desktop/main.js'), /const THEMES = \[(.*?)\];/);
  const panel = [...read('desktop/panel-ui.js').match(/\[\['auto'.*?\]\]\.forEach/)[0].matchAll(/\['([a-z0-9]+)'/g)].map((m) => m[1]);
  assert.deepStrictEqual(page, ['auto', 'light', 'dark', 'sweet', 'quest2', 'osrs', 'bonfire']);
  assert.deepStrictEqual(shell, page);
  assert.deepStrictEqual(panel, page);
});
test('the removed looks are gone from the styles and the settings window', () => {
  for (const f of ['styles.css', 'desktop/panel.html']) assert.ok(!/scribble|al-cool|al-paper|al-night|data-look="(paper|night|cool)"/.test(read(f)), f);
});
