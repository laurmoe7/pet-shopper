const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L, Foods, Personalities } = require('./load');

const day = (h = 12) => new Date(2026, 9, 1, h);
const food = (text) => ({ text, ...Foods.match(text) });

test('the personality list is valid data', () => {
  assert.equal(Personalities[0].id, 'foodie');
  assert.equal(Personalities[0].earn, null, 'the first personality is there from the start');
  assert.equal(new Set(Personalities.map((p) => p.id)).size, Personalities.length);
  for (const p of Personalities) {
    assert.ok(p.label && p.icon && p.text && p.likes.length && p.lines.length, p.id);
    if (p.earn) assert.ok(p.earn.count > 0 && p.earn.cats.length, p.id);
  }
});

test('every suggestion is a food that personality likes', () => {
  for (const p of Personalities) {
    for (const t of p.suggests) {
      const m = Foods.match(t);
      assert.ok(p.likes.includes(m.cat), `${p.id}: ${t} is ${m.cat}`);
    }
  }
});

test('a new pet is a foodie with no tastes yet', () => {
  const pet = L.petProfile();
  assert.equal(pet.personality, 'foodie');
  assert.deepEqual(pet.tastes, {});
});

test('feeding sweets earns the sweet tooth personality', () => {
  const pet = L.petProfile();
  const sweet = Personalities.find((p) => p.id === 'sweet');
  assert.equal(L.personalityProgress(pet, sweet).done, false);
  for (let i = 0; i < 9; i++) L.recordTaste(pet, food(i % 2 ? 'cookies' : 'bread'), day());
  assert.deepEqual(L.personalityProgress(pet, sweet), { count: 9, goal: 10, done: false });
  L.recordTaste(pet, food('donuts'), day());
  assert.equal(L.personalityProgress(pet, sweet).done, true);
});

test('only real food that sat on the list counts as a taste', () => {
  const pet = L.petProfile();
  assert.equal(L.recordTaste(pet, food('tissues'), day()), false);
  assert.equal(L.recordTaste(pet, food('zzzz'), day()), false);
  const quick = { ...food('cookies'), added: day().getTime() - 60 * 1000 };
  assert.equal(L.recordTaste(pet, quick, day()), false);
  assert.deepEqual(pet.tastes, {});
});

test('putting an item back takes its taste back', () => {
  const pet = L.petProfile();
  const tea = food('tea');
  L.recordTaste(pet, tea, day());
  L.refundTaste(pet, tea);
  assert.equal(pet.tastes.drink, 0);
  L.refundTaste(pet, tea);
  assert.equal(pet.tastes.drink, 0, 'never below zero');
});

test('personalities like their own kinds of food', () => {
  const green = Personalities.find((p) => p.id === 'green');
  assert.ok(L.likes(green, food('broccoli')));
  assert.ok(!L.likes(green, food('cookies')));
});

test('suggestions skip things already on the list', () => {
  const sipper = Personalities.find((p) => p.id === 'sipper');
  const items = sipper.suggests.slice(1).map((t, i) => L.createItem(t, {}, 'i' + i));
  assert.equal(L.suggestion(sipper, items, () => 0.99), sipper.suggests[0]);
  items.push(L.createItem(sipper.suggests[0], {}, 'x'));
  assert.equal(L.suggestion(sipper, items), null);
});

test('personality and tastes are saved with the pet', () => {
  const s = L.parseState(null, () => 'x');
  s.pet.personality = 'chef';
  L.recordTaste(s.pet, food('eggs'), day());
  const back = L.parseState(JSON.stringify(s), () => 'y').pet;
  assert.equal(back.personality, 'chef');
  assert.deepEqual(back.tastes, { dairy: 1 });
});
