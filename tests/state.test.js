const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic, Wardrobe } = require('./load');

function ids() { let n = 0; return () => 'id' + (n++); }

test('a first launch opens with the sample list and the default pet', () => {
  const s = PetLogic.parseState(null, ids());
  assert.equal(s.items.length, 8);
  assert.equal(s.items[0].text, 'Bananas');
  assert.equal(s.items[0].emoji, '🍌');
  assert.ok(s.items.every((i) => !i.done));
  assert.deepEqual(s.pet, { name: 'Nibble', species: 'mochi', outfit: { hat: 'none' }, achievements: {} });
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
  assert.deepEqual(back.pet, { name: 'Mugi', species: 'penguin', outfit: { hat: 'sunhat' }, achievements: {} });
  assert.deepEqual(back.items, s.items);
});

test('older saves without pet details get the defaults', () => {
  const old = JSON.stringify({ items: [], overrides: {}, quiet: true });
  const s = PetLogic.parseState(old, ids());
  assert.deepEqual(s.pet, { name: 'Nibble', species: 'mochi', outfit: { hat: 'none' }, achievements: {} });
  assert.equal(s.quiet, true);
  const noHat = PetLogic.parseState(JSON.stringify({ items: [], pet: { name: 'Bo', species: 'cow' } }), ids());
  assert.deepEqual(noHat.pet, { name: 'Bo', species: 'cow', outfit: { hat: 'none' }, achievements: {} });
});

test('wardrobe hats have unique ids and a drawing', () => {
  const hatIds = Wardrobe.map((w) => w.id);
  assert.deepEqual(hatIds, ['tophat', 'maid', 'sunhat']);
  assert.equal(new Set(hatIds).size, hatIds.length);
  for (const w of Wardrobe) {
    assert.equal(w.slot, 'hat');
    assert.match(w.svg, /^<g[\s\S]*<\/g>$/);
  }
});
