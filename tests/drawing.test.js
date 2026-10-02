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
