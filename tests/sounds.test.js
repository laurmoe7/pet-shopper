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

test('chips and crisps crunch, even with "potato" in the name', () => {
  for (const t of ['potato chips', 'crisps', 'pringles', 'popcorn', 'pretzels', 'peanuts']) assert.equal(soundOf(t), 'crunch', t);
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

test('the dressing room sounds exist', () => {
  assert.ok(Sounds.kinds.includes('ooh'));
  assert.ok(Sounds.kinds.includes('excited'));
});

test('the toy and bedtime sounds exist', () => {
  for (const kind of ['toss', 'bounce', 'squeak', 'tuck', 'snore', 'click']) assert.ok(Sounds.kinds.includes(kind), kind);
});

test('menu sounds exist and never play the same variant twice in a row', () => {
  for (const kind of ['tap', 'pick', 'open', 'close', 'on', 'off', 'locked', 'place', 'remove']) {
    assert.ok(Sounds.kinds.includes(kind), kind);
    let last = Sounds.variant(kind);
    for (let i = 0; i < 40; i++) {
      const next = Sounds.variant(kind);
      assert.notEqual(next, last, kind);
      last = next;
    }
  }
});
