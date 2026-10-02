const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

test('the pet outline is drawn smooth, without the wobbly displacement filter', () => {
  assert.doesNotMatch(html, /feDisplacementMap/);
  assert.doesNotMatch(html, /class="pet-body"[^>]*filter=/);
});

test('every ear is in a left or right group so it can jiggle', () => {
  const ears = html.match(/<path class="ear"|<circle class="ear"|<ellipse class="ear"/g) || [];
  const groups = html.match(/<g class="ear-g ear-[lr]">/g) || [];
  assert.ok(ears.length > 0);
  assert.equal(groups.length, ears.length);
  assert.match(css, /@keyframes ear-jiggle-l/);
  assert.match(css, /@keyframes ear-jiggle-r/);
});

test('birds have no mouth of their own, only a beak', () => {
  const { PetLogic } = require('./load');
  assert.ok(PetLogic.isBird('chick') && PetLogic.isBird('penguin'));
  assert.ok(!PetLogic.isBird('pig'));
  for (const b of PetLogic.BIRDS) assert.match(html, new RegExp('data-sp="' + b + '" class="beak"'), b + ' has a beak');
  assert.match(css, /\.pet\.beaked\[data-mouth\] \[data-mouth\] \{ display: none; \}/);
});

test('there are dances for every pet', () => {
  assert.match(css, /@keyframes shuffle/);
  assert.match(css, /@keyframes boogie/);
});

test('Dress up, Edit pet and Goals are in one drop-down menu', () => {
  const menu = html.match(/<div class="pet-menu" id="petMenu"[\s\S]*?<\/div>/)[0];
  for (const id of ['dressBtn', 'editPetBtn', 'goalsBtn']) assert.match(menu, new RegExp('id="' + id + '"'));
  assert.match(html, /id="petMenuBtn" aria-haspopup="true" aria-expanded="false"/);
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

test('the mochi twist grows out of the head: its line stops on the outline and its fill covers it', () => {
  const twist = html.match(/<g data-sp="mochi" class="twist">([\s\S]*?)<\/g>/)[1];
  const fill = twist.match(/class="twist-fill" d="([^"]+)"/)[1];
  const line = twist.match(/class="twist-line" d="([^"]+)"/)[1];
  assert.ok(fill.startsWith(line), 'the fill follows the line');
  // the fill reaches below the outline (y 38, 2.6 wide) and the line's ends sit on it
  assert.ok(Math.max(...fill.match(/[\d.]+/g).filter((_, i) => i % 2).map(Number)) > 39.3);
  for (const y of [line.match(/^M[\d.]+ ([\d.]+)/)[1], line.match(/([\d.]+)$/)[1]]) assert.ok(Math.abs(Number(y) - 38) < 1.3, y);
});

test('snug headwear tucks the mochi twist and chick tuft under it', () => {
  const { Wardrobe } = require('./load');
  for (const id of ['bandana', 'headphones', 'mintphones']) assert.equal(Wardrobe.find((w) => w.id === id).snug, true, id);
  assert.match(css, /\.pet\.snug \.twist, \.pet\.snug \.tuft \{ display: none; \}/);
});

test('the headphones are over-ear: padded band, hinges, round cups with rims and cushions, and a cable', () => {
  const { Wardrobe } = require('./load');
  for (const id of ['headphones', 'mintphones']) {
    const svg = Wardrobe.find((w) => w.id === id).svg;
    for (const part of ['phones-band', 'phones-band-in', 'phones-hinge', 'phones-cup', 'phones-rim', 'phones-cushion', 'phones-cable']) {
      assert.match(svg, new RegExp('class="' + part + '"'), id + ' ' + part);
    }
    assert.equal((svg.match(/class="phones-cup"/g) || []).length, 2);
  }
  assert.match(Wardrobe.find((w) => w.id === 'mintphones').svg, /phones-mint/);
});

test('the pet has places for neckwear (under the face) and shoes (over the feet)', () => {
  const neck = html.indexOf('<g class="outfit-neck">'), face = html.indexOf('<g class="outfit-face">');
  const feet = html.indexOf('<g class="outfit-feet">'), arms = html.indexOf('<g class="arm arm-r">');
  assert.ok(neck > 0 && neck < html.indexOf('class="redface"') && neck < face);
  assert.ok(feet > arms, 'shoes are drawn in front of the body');
  assert.match(html, /id="neckStrip"/);
  assert.match(html, /id="feetStrip"/);
});
