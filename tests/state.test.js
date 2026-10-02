const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic, Wardrobe, Decor } = require('./load');

function ids() { let n = 0; return () => 'id' + (n++); }

test('a first launch opens with the sample list and the default pet', () => {
  const s = PetLogic.parseState(null, ids());
  assert.equal(s.items.length, 8);
  assert.equal(s.items[0].text, 'Bananas');
  assert.equal(s.items[0].emoji, '🍌');
  assert.ok(s.items.every((i) => !i.done));
  assert.deepEqual(s.pet, { name: 'Nibble', species: 'mochi', outfit: { hat: 'none' }, achievements: {}, room: {}, guard: { day: '', words: [], lastSeen: 0 } });
});

test('broken saved data falls back to a fresh start', () => {
  const s = PetLogic.parseState('{not json', ids());
  assert.equal(s.items.length, 8);
  assert.equal(s.pet.name, 'Nibble');
});

test('name, species and hat survive a save and load', () => {
  const s = PetLogic.parseState(null, ids());
  s.pet.name = 'Mugi';
  s.pet.species = 'penguin';
  s.pet.outfit.hat = 'sunhat';
  const back = PetLogic.parseState(JSON.stringify(s), ids());
  assert.deepEqual(back.pet, { name: 'Mugi', species: 'penguin', outfit: { hat: 'sunhat' }, achievements: {}, room: {}, guard: { day: '', words: [], lastSeen: 0 } });
  assert.deepEqual(back.items, s.items);
});

test('older saves without pet details get the defaults', () => {
  const old = JSON.stringify({ items: [], overrides: {}, quiet: true });
  const s = PetLogic.parseState(old, ids());
  assert.deepEqual(s.pet, { name: 'Nibble', species: 'mochi', outfit: { hat: 'none' }, achievements: {}, room: {}, guard: { day: '', words: [], lastSeen: 0 } });
  assert.equal(s.quiet, true);
  const noHat = PetLogic.parseState(JSON.stringify({ items: [], pet: { name: 'Bo', species: 'cow' } }), ids());
  assert.deepEqual(noHat.pet, { name: 'Bo', species: 'cow', outfit: { hat: 'none' }, achievements: {}, room: {}, guard: { day: '', words: [], lastSeen: 0 } });
});

test('wardrobe hats have unique ids and a drawing', () => {
  const hatIds = Wardrobe.map((w) => w.id);
  assert.deepEqual(hatIds, ['tophat', 'maid', 'sunhat', 'cap', 'hoodie']);
  assert.equal(new Set(hatIds).size, hatIds.length);
  for (const w of Wardrobe) {
    assert.equal(w.slot, 'hat');
    assert.match(w.svg, /^<g[\s\S]*<\/g>$/);
    assert.ok(Array.isArray(w.lines) && w.lines.length > 0, w.id + ' needs dressing-room lines');
    assert.ok(!w.layer || w.layer === 'body', w.id);
  }
});

test('the cow hoodie covers the whole pet and tucks its ears away', () => {
  const hoodie = Wardrobe.find((w) => w.id === 'hoodie');
  assert.equal(hoodie.layer, 'body');
  assert.equal(hoodie.hood, true);
  // horns, ears and spots, with a hole for the face
  assert.match(hoodie.svg, /hood-horn/);
  assert.match(hoodie.svg, /hood-ear/);
  assert.match(hoodie.svg, /hood-spot/);
  assert.match(hoodie.svg, /fill-rule="evenodd"/);
});

test('the room has a window, a beanbag and a cuckoo clock', () => {
  assert.deepEqual(Decor.map((d) => d.id), ['window', 'beanbag', 'clock']);
  for (const d of Decor) {
    assert.ok(d.label && d.svg && d.view, d.id);
    assert.ok(d.x >= 0 && d.x <= 1 && d.y >= 0 && d.y <= 1, d.id + ' default spot is in the room');
    assert.ok(d.w > 0 && d.h > 0, d.id);
  }
});

test('decor can be placed, moved within the room and taken away', () => {
  const room = {};
  const win = Decor.find((d) => d.id === 'window');
  assert.equal(PetLogic.toggleDecor(room, win), true);
  assert.deepEqual(room.window, { x: win.x, y: win.y });
  assert.equal(PetLogic.moveDecor(room, 'window', 0.25, 0.5), true);
  assert.deepEqual(room.window, { x: 0.25, y: 0.5 });
  PetLogic.moveDecor(room, 'window', 1.7, -3);
  assert.deepEqual(room.window, { x: 1, y: 0 });
  assert.equal(PetLogic.moveDecor(room, 'clock', 0.5, 0.5), false);
  assert.equal(PetLogic.toggleDecor(room, win), false);
  assert.deepEqual(room, {});
});

test('the room is saved with the pet', () => {
  const s = PetLogic.parseState(null, ids());
  PetLogic.toggleDecor(s.pet.room, Decor[1]);
  const back = PetLogic.parseState(JSON.stringify(s), ids());
  assert.deepEqual(back.pet.room, { beanbag: { x: Decor[1].x, y: Decor[1].y } });
});
