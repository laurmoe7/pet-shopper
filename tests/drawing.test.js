const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

test('the pet outline is drawn smooth, without the wobbly displacement filter', () => {
  assert.doesNotMatch(html, /feDisplacementMap/);
  assert.doesNotMatch(html, /class="pet-body"[^>]*filter=/);
  assert.doesNotMatch(css, /\.pet-svg \{[^}]*filter: url/, 'no species draws its outline through a filter (it caused a seam on her phone)');
});

test('every ear is in a left or right group so it can jiggle', () => {
  // the axolotl's gills (.gill-fill) are its ears
  const ears = html.match(/<path class="ear"|<circle class="ear"|<ellipse class="ear"|<g class="gill-fill"/g) || [];
  const groups = html.match(/<g class="ear-g ear-[lr]">/g) || [];
  assert.ok(ears.length > 0);
  assert.equal(groups.length, ears.length);
  assert.match(css, /@keyframes ear-jiggle-l/);
  assert.match(css, /@keyframes ear-jiggle-r/);
});

test('birds have no mouth of their own, only a beak', () => {
  const { PetLogic } = require('./load');
  assert.ok(PetLogic.isBird('birdie'));
  assert.ok(!PetLogic.isBird('pig'));
  for (const b of PetLogic.BIRDS) assert.match(html, new RegExp('data-sp="' + b + '" class="beak"'), b + ' has a beak');
  assert.match(css, /\.pet\.beaked\[data-mouth\] \[data-mouth\] \{ display: none; \}/);
});

test('there are dances for every pet', () => {
  assert.match(css, /@keyframes shuffle/);
  assert.match(css, /@keyframes boogie/);
});

test('the main pet buttons sit in a bar at the bottom of the screen', () => {
  const dock = html.match(/<nav class="dock"[\s\S]*?<\/nav>/)[0];
  for (const id of ['dressBtn', 'roomBtn', 'treatBtn', 'favBtn', 'goalsBtn', 'editPetBtn']) assert.match(dock, new RegExp('id="' + id + '"'));
  assert.doesNotMatch(html, /petMenu/);
});

test('glasses have their own place on the pet, over the eyes', () => {
  assert.match(html, /<g class="outfit-face"><\/g>/);
  assert.match(html, /id="faceStrip"/);
});

test('furniture has its own panel, outside the full-page dressing room', () => {
  const dress = html.match(/<dialog[^>]*id="dressSheet"[\s\S]*?<\/dialog>/)[0];
  const room = html.match(/<dialog[^>]*id="roomSheet"[\s\S]*?<\/dialog>/)[0];
  assert.match(dress, /dress-full/);
  assert.doesNotMatch(dress, /decorStrip/);
  assert.match(room, /id="decorStrip"/);
  assert.match(html, /id="roomBtn"/);
});

test('the head outline starts at the bottom, so no join shows on top of the head', () => {
  const skin = html.match(/<path class="skin" d="([^"]+)"/)[1];
  assert.match(skin, /^M80 139 /);
  assert.match(css, /\.skin \{[^}]*stroke-linejoin: round/);
});

test('the mochi head and twist are one outline, so no cut or overlap can show a seam', () => {
  const plain = html.match(/<path class="skin" d="([^"]+)"/)[1];
  const mochi = html.match(/<path data-sp="mochi" class="skin skin-twist" d="([^"]+)"/)[1];
  assert.match(mochi, /^M80 139 /);
  assert.equal((mochi.match(/M/g) || []).length, 1, 'one path, one outline');
  assert.ok(mochi.includes('C74 31 80 27 86 30'), 'the twist is part of the outline');
  assert.notEqual(mochi, plain);
  assert.doesNotMatch(html, /twist-fill|twist-line/);
});

test('snug headwear tucks the mochi twist and chick tuft under it', () => {
  const { Wardrobe } = require('./load');
  for (const id of ['bandana', 'headphones']) assert.equal(Wardrobe.find((w) => w.id === id).snug, true, id);
  assert.match(css, /\.pet\.snug \.skin-twist, \.pet\.hooded \.skin-twist \{ display: none; \}/);
  assert.match(css, /\.pet\.snug \.tuft \{ display: none; \}/);
});

test('the headphones are over-ear: padded band, hinges, round cups with rims and cushions, and a cable', () => {
  const { Wardrobe } = require('./load');
  for (const id of ['headphones']) {
    const svg = Wardrobe.find((w) => w.id === id).svg;
    for (const part of ['phones-band', 'phones-band-in', 'phones-hinge', 'phones-cup', 'phones-rim', 'phones-cushion', 'phones-cable']) {
      assert.match(svg, new RegExp('class="' + part + '"'), id + ' ' + part);
    }
    assert.equal((svg.match(/class="phones-cup"/g) || []).length, 2);
  }
});

test('the pet has places for neckwear (under the face) and shoes (over the feet)', () => {
  const neck = html.indexOf('<g class="outfit-neck">'), face = html.indexOf('<g class="outfit-face">');
  const feet = html.indexOf('<g class="outfit-feet">'), arms = html.indexOf('<g class="arm arm-r">');
  assert.ok(neck > 0 && neck < html.indexOf('class="redface"') && neck < face);
  assert.ok(feet > arms, 'shoes are drawn in front of the body');
  assert.match(html, /id="neckStrip"/);
  assert.match(html, /id="feetStrip"/);
});

test('the build number shown in Options matches the service worker cache, so a stale copy is easy to spot', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.equal(sw.match(/CACHE = 'nibble-v(\d+)'/)[1], app.match(/var BUILD = '(\d+)'/)[1]);
  assert.match(html, /id="buildLabel"/);
  assert.match(sw, /fetch\(e\.request, \{ cache: 'no-cache' \}\)/, 'the app files come from the network first');
});

test('plain ellipses sit under the head and the penguin skin belly, so a GPU hairline crack inside a big path shows skin, not the background', () => {
  assert.match(html, /<ellipse class="skin-under"[^>]*\/>\s*<path class="skin" /);
  assert.match(html, /<ellipse data-sk="penguin" class="belly belly-under"/);
  assert.match(css, /\.skin-under \{ fill: var\(--pet-skin\); \}/);
});

test('mouth items (toast, mustache) are drawn in front of the face, neckwear under it', () => {
  const { Wardrobe } = require('./load');
  const mouth = html.indexOf('<g class="outfit-mouth">');
  assert.ok(mouth > html.indexOf('<g class="outfit-face">') && mouth < html.indexOf('<g class="arm arm-r">'));
  assert.equal(Wardrobe.find((w) => w.id === 'toast').slot, 'mouth');
  assert.equal(Wardrobe.find((w) => w.id === 'mustache').slot, 'mouth');
  assert.ok(!Wardrobe.some((w) => w.front), 'nothing uses the old front flag: mouth items have their own slot');
});

test('speech bubbles are always on: quiet mode and no option can hide them', () => {
  const app = fs.readdirSync(path.join(__dirname, '..')).filter((f) => /^app.*\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  assert.doesNotMatch(app, /settings\.bubbles/);
  assert.doesNotMatch(app, /key: 'bubbles'/);
  assert.match(app, /function say\(text, ms, own\) \{\s+if \(!text\) return;/);
});

test('the whole-pet moves on .squash only slide (scaling or rotating them left a seam on her phone)', () => {
  assert.doesNotMatch(css, /\.squash \{[^}]*animation: (?!breathe|jelly)/, 'squash and stretch are drawn by svgSquish, not on .squash');
  for (const name of ['breathe', 'jelly']) {
    const m = css.match(new RegExp('@keyframes ' + name + ' \\{[^\\n]*\\}\\n'));
    assert.ok(m, name + ' exists');
    assert.doesNotMatch(m[0], /scale|rotate/, name + ' only translates');
  }
});

test('no app script defines the same top-level function twice (a later one silently replaces the first)', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const seen = {};
  fs.readdirSync(root).filter((f) => /^app.*\.js$/.test(f)).forEach((f) => {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of src.matchAll(/^function (\w+)\s*\(/gm)) {
      assert.ok(!seen[m[1]], m[1] + ' is defined in both ' + seen[m[1]] + ' and ' + f);
      seen[m[1]] = f;
    }
  });
});
