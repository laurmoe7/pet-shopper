const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic } = require('./load');

function list(...texts) {
  let n = 0;
  return texts.map((t) => PetLogic.createItem(t, {}, 'i' + (n++)));
}
const order = (items) => items.map((i) => i.text + (i.done ? '✓' : ''));

test('checking an item off moves it to the bottom of the eaten list', () => {
  let items = list('Bananas', 'Milk', 'Bread');
  items = PetLogic.toggleDone(items, 'i0').items;
  assert.deepEqual(order(items), ['Milk', 'Bread', 'Bananas✓']);
  items = PetLogic.toggleDone(items, 'i2').items;
  assert.deepEqual(order(items), ['Milk', 'Bananas✓', 'Bread✓']);
});

test('putting an item back moves it to the end of the to-buy list', () => {
  let items = list('Bananas', 'Milk', 'Bread');
  items = PetLogic.toggleDone(items, 'i0').items;
  items = PetLogic.toggleDone(items, 'i1').items;
  const result = PetLogic.toggleDone(items, 'i0');
  assert.equal(result.item.text, 'Bananas');
  assert.equal(result.item.done, false);
  assert.deepEqual(order(result.items), ['Bread', 'Bananas', 'Milk✓']);
});

test('toggling an unknown id changes nothing', () => {
  const items = list('Bananas');
  const result = PetLogic.toggleDone(items, 'nope');
  assert.equal(result.item, null);
  assert.deepEqual(order(result.items), ['Bananas']);
});

test('new items go above the eaten ones', () => {
  let items = list('Bananas', 'Milk');
  items = PetLogic.toggleDone(items, 'i0').items;
  PetLogic.addToList(items, PetLogic.createItem('Eggs', {}, 'x'));
  assert.deepEqual(order(items), ['Milk', 'Eggs', 'Bananas✓']);
});

test('the pet mood follows the list', () => {
  assert.equal(PetLogic.mood([]), 'sleepy');
  let items = list('Bananas', 'Milk');
  assert.equal(PetLogic.mood(items), 'curious');
  items = PetLogic.toggleDone(items, 'i0').items;
  assert.equal(PetLogic.mood(items), 'happy');
  items = PetLogic.toggleDone(items, 'i1').items;
  assert.equal(PetLogic.mood(items), 'stuffed');
});

test('picking an emoji updates every item with that word and future ones', () => {
  const state = { items: list("Oma's cake", 'Bread', "OMA'S CAKE"), overrides: {} };
  assert.equal(PetLogic.pickEmoji(state, 'i0', '🎂'), true);
  assert.deepEqual(state.items.map((i) => i.emoji), ['🎂', '🍞', '🎂']);
  assert.equal(state.items[0].cat, 'sweets');
  assert.equal(PetLogic.createItem("oma's cake", state.overrides, 'y').emoji, '🎂');
  assert.equal(PetLogic.pickEmoji(state, 'missing', '🍕'), false);
});

test('the pet only sleeps once put to bed, and stays asleep until something is checked off', () => {
  const day = new Date(2026, 9, 4, 14, 0), night = new Date(2026, 9, 4, 23, 0), early = new Date(2026, 9, 5, 6, 30), morning = new Date(2026, 9, 5, 8, 0);
  const tonight = PetLogic.nightOf(night);
  assert.equal(PetLogic.restingMood([], day), 'curious');
  assert.equal(PetLogic.restingMood([], night), 'curious', 'night alone does not put it to sleep');
  assert.equal(PetLogic.restingMood([], night, tonight), 'sleepy', 'put to bed');
  assert.equal(PetLogic.restingMood([], early, tonight), 'sleepy', 'still asleep after midnight');
  assert.equal(PetLogic.restingMood([], morning, tonight), 'curious', 'awake in the morning');
  let items = list('Bananas');
  assert.equal(PetLogic.restingMood(items, night, tonight), 'sleepy', 'adding to the list does not wake it');
  assert.equal(PetLogic.restingMood(items, night, '2026-10-01'), 'curious', 'an old night does not count');
  items = PetLogic.toggleDone(items, 'i0').items;
  assert.equal(PetLogic.restingMood(items, day), 'stuffed', 'full after a finished list');
  assert.equal(PetLogic.restingMood(items, night), 'stuffed');
  assert.equal(PetLogic.petProfile({ dozing: tonight }).dozing, tonight);
  assert.equal(PetLogic.petProfile({}).dozing, '');
});

test('a night lasts from the evening to the morning, so a tuck-in holds past midnight', () => {
  const evening = PetLogic.nightOf(new Date(2026, 9, 4, 22, 30));
  assert.equal(evening, '2026-10-04');
  assert.equal(PetLogic.nightOf(new Date(2026, 9, 5, 1, 0)), evening);
  assert.equal(PetLogic.nightOf(new Date(2026, 9, 5, 6, 59)), evening);
  assert.notEqual(PetLogic.nightOf(new Date(2026, 9, 5, 22, 30)), evening);
});
