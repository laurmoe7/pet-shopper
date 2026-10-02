const test = require('node:test');
const assert = require('node:assert/strict');
const { Foods, PetLogic, Sounds } = require('./load');

const soundOf = (text) => PetLogic.soundFor(Foods.match(text));

test('each kind of food gets its own sound', () => {
  assert.equal(soundOf('beer'), 'glug');
  assert.equal(soundOf('orange juice'), 'glug');
  assert.equal(soundOf('soup'), 'slurp');
  assert.equal(soundOf('ramen'), 'slurp');
  assert.equal(soundOf('coffee'), 'sip');
  assert.equal(soundOf('apples'), 'crunch');
  assert.equal(soundOf('carrots'), 'crunch');
  assert.equal(soundOf('bananas'), 'squish');
  assert.equal(soundOf('cheese'), 'squish');
  assert.equal(soundOf('steak'), 'chomp');
});

test('sweets, spicy, non-food and mystery items always use their own sound', () => {
  assert.equal(soundOf('chocolate'), 'sweet');
  assert.equal(soundOf('cake'), 'sweet');
  assert.equal(soundOf('hot sauce'), 'spicy');
  assert.equal(soundOf('toilet paper'), 'huh');
  assert.equal(soundOf('something weird'), 'mystery');
});

test('every food maps to a sound the sound kit can play', () => {
  for (const e of Foods.all) {
    const kind = PetLogic.soundFor({ emoji: e, cat: Foods.categoryOf(e) });
    assert.ok(Sounds.kinds.includes(kind), `${e} -> ${kind}`);
  }
});
