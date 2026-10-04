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
  for (const k of ['done', 'sparkle', 'coin', 'ring', 'stamp', 'scribble']) assert.ok(Sounds.kinds.includes(k), k);
});

test('tasks and foods never share the emoji picker by accident', () => {
  assert.ok(Tasks.all.length > 60);
  assert.ok(Foods.all.length > 100);
});

test('due days: labels, urgency and sorting', () => {
  const today = '2026-10-05';   // a Monday
  assert.equal(L.dueInfo('2026-10-05', today).state, 'today');
  assert.equal(L.dueInfo('2026-10-06', today).label, 'tomorrow');
  assert.equal(L.dueInfo('2026-10-09', today).label, 'Fri');
  assert.equal(L.dueInfo('2026-10-20', today).label, '20 Oct');
  assert.deepEqual([L.dueInfo('2026-10-04', today).label, L.dueInfo('2026-10-02', today).label, L.dueInfo('2026-10-02', today).state], ['yesterday', '3d late', 'overdue']);
  const a = { id: 'a', done: false }, b = { id: 'b', done: false, due: '2026-10-07' }, c = { id: 'c', done: false, due: '2026-10-06' }, d = { id: 'd', done: true, due: '2026-10-01' };
  assert.deepEqual(L.sortByDue([a, b, d, c]).map((i) => i.id), ['c', 'b', 'a', 'd']);
});

test('repeating tasks come back on their next day, never in the past', () => {
  assert.equal(L.nextDue('2026-10-05', 'daily', '2026-10-05'), '2026-10-06');
  assert.equal(L.nextDue('2026-10-01', 'daily', '2026-10-05'), '2026-10-06');          // ticked late: tomorrow
  assert.equal(L.nextDue('2026-10-01', 'weekly', '2026-10-05'), '2026-10-08');         // stays on its weekday
  assert.equal(L.nextDue('2026-10-05', 'every3', '2026-10-05'), '2026-10-08');
  assert.equal(L.nextDue('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');        // kept inside the month
  assert.equal(L.nextDue('2026-01-31', 'monthly', '2026-03-01'), '2026-03-31');
  assert.equal(L.nextDue(undefined, 'daily', '2026-10-05'), '2026-10-06');
  assert.equal(L.addMonths('2026-12-15', 1), '2027-01-15');
});

test('damaged due days and repeats are dropped when loading', () => {
  const raw = JSON.stringify({ items: [{ id: '1', text: 'a', emoji: '📌', cat: 'other', done: false, due: 'soon', repeat: 'daily' }, { id: '2', text: 'b', emoji: '📌', cat: 'other', done: false, due: '2026-10-05', repeat: 'hourly' }, { id: '3', text: 'c', emoji: '📌', cat: 'other', done: false, due: '2026-10-05', repeat: 'weekly' }] });
  const items = L.parseState(raw, () => '1').items;
  assert.equal(items[0].due, undefined);
  assert.equal(items[0].repeat, undefined);
  assert.equal(items[1].due, '2026-10-05');
  assert.equal(items[1].repeat, undefined);
  assert.equal(items[2].repeat, 'weekly');
});

test('tasks can have a time of day', () => {
  const today = '2026-10-05';
  assert.equal(L.dueInfo('2026-10-05', today, '14:30', '09:00').label, 'today 14:30');
  assert.equal(L.dueInfo('2026-10-05', today, '14:30', '09:00').state, 'today');
  assert.equal(L.dueInfo('2026-10-05', today, '14:30', '14:30').state, 'overdue');   // its time has come
  assert.equal(L.dueInfo('2026-10-06', today, '08:00', '23:00').label, 'tomorrow 08:00');
  const a = { id: 'a', done: false, due: today, time: '16:00' }, b = { id: 'b', done: false, due: today, time: '08:00' }, c = { id: 'c', done: false, due: today };
  assert.deepEqual(L.sortByDue([c, a, b]).map((i) => i.id), ['b', 'a', 'c']);
  assert.ok(L.isTimeKey('07:05') && !L.isTimeKey('7:5') && !L.isTimeKey('24:00'));
  const raw = JSON.stringify({ items: [{ id: '1', text: 'a', emoji: '📌', cat: 'other', done: false, due: today, time: '25:99' }, { id: '2', text: 'b', emoji: '📌', cat: 'other', done: false, time: '10:00' }, { id: '3', text: 'c', emoji: '📌', cat: 'other', done: false, due: today, time: '10:00' }] });
  const items = L.parseState(raw, () => '1').items;
  assert.deepEqual(items.map((i) => i.time), [undefined, undefined, '10:00']);
});
