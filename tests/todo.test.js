const test = require('node:test');
const assert = require('node:assert/strict');
const { Foods, Tasks, PetLogic: L, Sounds } = require('./load');

test('tasks get an emoji and a kind from their words', () => {
  const kind = (t) => Tasks.match(t).cat;
  assert.equal(Tasks.match('Call mum').emoji, '📞');
  assert.equal(kind('Book dentist'), 'health');
  assert.equal(kind('pay rent'), 'money');
  assert.equal(kind('water the plants'), 'care');
  assert.equal(kind('do laundry'), 'chore');
  assert.equal(kind('cleaning the bathroom'), 'chore');   // a keyword also finds longer forms of the word
  assert.equal(kind('gym'), 'fitness');
  assert.equal(kind('gymnastics'), 'other');              // short keywords match whole words only
  assert.deepEqual(Tasks.match('something odd'), { emoji: '📌', cat: 'other', keyword: null });
});

test('every task emoji has a kind the app knows', () => {
  for (const e of Tasks.all) assert.ok(Tasks.kinds.includes(Tasks.categoryOf(e)), e);
});

test('the to-do list uses tasks and the shopping list uses foods', () => {
  assert.equal(L.emojiFor('bananas', {}, 'shop').emoji, '🍌');
  assert.equal(L.emojiFor('call the bank', {}, 'todo').cat, 'call');
  const item = L.createItem('Book dentist', {}, 'a', 1, 'todo');
  assert.equal(item.emoji, '🦷');
  assert.equal(L.createItem('Bananas', {}, 'b', 1).emoji, '🍌');
  // a picked emoji is a task kind in the to-do list
  const state = { mode: 'todo', items: [item], overrides: {} };
  assert.ok(L.pickEmoji(state, 'a', '🎁'));
  assert.equal(item.cat, 'social');
});

test('saved state keeps the other list in the stash and the mode', () => {
  const fresh = L.parseState(null, () => '1');
  assert.equal(fresh.mode, 'shop');
  assert.deepEqual(fresh.stash, []);
  const saved = L.parseState(JSON.stringify({ items: [], stash: [{ id: 'x', text: 'Call mum', emoji: '📞', cat: 'call', done: false }], mode: 'todo' }), () => '1');
  assert.equal(saved.mode, 'todo');
  assert.equal(saved.stash.length, 1);
  assert.equal(L.parseState(JSON.stringify({ items: [], mode: 'nonsense' }), () => '1').mode, 'shop');
});

test('the to-do sounds exist', () => {
  for (const k of ['done', 'sparkle', 'coin', 'ring', 'stamp']) assert.ok(Sounds.kinds.includes(k), k);
});

test('tasks and foods never share the emoji picker by accident', () => {
  assert.ok(Tasks.all.length > 60);
  assert.ok(Foods.all.length > 100);
});
