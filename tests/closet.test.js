const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L } = require('./load');

const worn = (o) => Object.assign({ hat: 'none', body: 'none', face: 'none', mouth: 'none', neck: 'none', feet: 'none' }, o);

test('a new pet has an empty closet, and bad saved data is ignored', () => {
  assert.deepEqual(L.petProfile({}).closet, []);
  assert.deepEqual(L.petProfile({ closet: 'nope' }).closet, []);
  const c = L.petProfile({ closet: [null, { name: '  Beach   day  ', outfit: { hat: 'sunhat' } }, { outfit: 5 }] }).closet;
  assert.equal(c.length, 2);
  assert.equal(c[0].name, 'Beach day');
  assert.equal(c[0].outfit.hat, 'sunhat');
  assert.equal(c[0].outfit.feet, 'none');
  assert.equal(c[1].name, 'Outfit 2');
});

test('saving an outfit names it, copies it and refuses nothing-worn, repeats and a full closet', () => {
  const closet = [];
  const mine = worn({ hat: 'sunhat', feet: 'clogs' });
  const r = L.saveOutfit(closet, '', mine, 'a');
  assert.equal(r.entry.name, 'Outfit 1');
  mine.hat = 'none';
  assert.equal(closet[0].outfit.hat, 'sunhat', 'the saved outfit is a copy');
  assert.equal(L.saveOutfit(closet, 'again', worn({ feet: 'clogs', hat: 'sunhat' }), 'b').why, 'same');
  assert.equal(closet.length, 1);
  assert.equal(L.saveOutfit(closet, 'x', worn(), 'c').why, 'empty');
  assert.equal(L.saveOutfit(closet, 'Cosy', worn({ body: 'hoodie' }), 'd').entry.name, 'Cosy');
  assert.equal(L.saveOutfit(closet, '', worn({ neck: 'scarf' }), 'e').entry.name, 'Outfit 3');
  for (let i = 0; closet.length < L.CLOSET_MAX; i++) closet.push({ id: 'z' + i, name: 'z', outfit: worn({ hat: 'hat' + i }) });
  assert.equal(L.saveOutfit(closet, 'more', worn({ hat: 'cap' }), 'f').why, 'full');
});

test('outfit names are tidied to 16 characters', () => {
  assert.equal(L.cleanOutfitName('   '), '');
  assert.equal(L.cleanOutfitName('a very very long outfit name'), 'a very very long');
});
