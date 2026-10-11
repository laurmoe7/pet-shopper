'use strict';
// A species or skin may be at most 10% bigger than the default (--pet-size in styles.css): the desktop window and the stage are made for that.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('no pet is more than 10% bigger than the default', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  const sizes = [...css.matchAll(/--pet-size:\s*([\d.]+)\s*;/g)].map((m) => parseFloat(m[1]));
  assert.ok(sizes.length > 0);
  for (const s of sizes) assert.ok(s <= 1.1, '--pet-size ' + s + ' is over 1.1');
});
