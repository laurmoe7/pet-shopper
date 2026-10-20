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
  // with today given, undated tasks come after today's and late ones but before later days
  const t = { id: 't', done: false, due: today }, late = { id: 'l', done: false, due: '2026-10-03' };
  assert.deepEqual(L.sortByDue([b, a, t, late, c], today).map((i) => i.id), ['l', 't', 'a', 'c', 'b']);
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

test('speech is split into list items', () => {
  assert.deepEqual(L.splitSpoken('milk, eggs and bread'), ['Milk', 'Eggs', 'Bread']);
  assert.deepEqual(L.splitSpoken('Melk, eieren en brood.'), ['Melk', 'Eieren', 'Brood']);
  assert.deepEqual(L.splitSpoken('  add bananas '), ['Bananas']);
  assert.deepEqual(L.splitSpoken(''), []);
  assert.deepEqual(L.splitSpoken('call mum and dad, book dentist', 'todo'), ['Call mum and dad', 'Book dentist']);
  assert.deepEqual(L.splitSpoken('pay rent then water plants', 'todo'), ['Pay rent', 'Water plants']);
  assert.equal(L.splitSpoken('x'.repeat(200))[0].length, 80);
  assert.equal(L.splitSpoken(Array(30).fill('a').join(',')).length, 20);
});

test('shopping items are grouped into aisles in shop order', () => {
  const mk = (t) => L.createItem(t, {}, t, 1);
  const aisle = (t) => L.aisleOf(mk(t));
  assert.equal(aisle('bananas'), 'produce');
  assert.equal(aisle('carrots'), 'produce');
  assert.equal(aisle('bread'), 'bakery');
  assert.equal(aisle('chicken'), 'meat');
  assert.equal(aisle('chickpeas'), 'pantry');   // beans and nuts are not with the meat
  assert.equal(aisle('milk'), 'dairy');
  assert.equal(aisle('rice'), 'pantry');
  assert.equal(aisle('cola'), 'drinks');
  assert.equal(aisle('chocolate'), 'treats');
  assert.equal(aisle('sponge'), 'home');
  assert.equal(aisle('paracetamol'), 'health');
  assert.equal(aisle('zzzz'), 'other');
  const groups = L.groupByAisle(['chocolate', 'milk', 'apples', 'bananas'].map(mk));
  assert.deepEqual(groups.map((g) => g.aisle.id), ['produce', 'dairy', 'treats']);
  assert.deepEqual(groups[0].items.map((i) => i.text), ['apples', 'bananas']);
  assert.ok(L.AISLES.every((a) => a.emoji));
});

test('calendar months, tasks on a day and the stamp book', () => {
  const oct = L.monthGrid(2026, 9);   // October 2026 starts on a Thursday
  assert.equal(oct.length, 35);
  assert.equal(oct[0].day, '2026-09-28');            // weeks start on Monday
  assert.equal(oct[0].inMonth, false);
  assert.equal(oct[3].day, '2026-10-01');
  assert.equal(oct.filter((d) => d.inMonth).length, 31);
  assert.equal(L.monthGrid(2027, 1).length, 28);      // Feb 2027 is exactly four Monday-first weeks
  assert.equal(L.monthGrid(2026, 1).length, 35);      // Feb 2026 starts on a Sunday, so it needs five
  const a = { id: 'a', done: true, due: '2026-10-05' }, b = { id: 'b', done: false, due: '2026-10-05' }, c = { id: 'c', done: false, due: '2026-10-06' };
  assert.deepEqual(L.tasksOn([a, b, c], '2026-10-05').map((i) => i.id), ['b', 'a']);
  assert.equal(L.nextDue('2026-03-02', 'yearly', '2026-10-05'), '2027-03-02');   // a birthday comes back next year
  const p = L.petProfile({});
  assert.equal(L.addStamp(p, 'chore', 1), 1);
  L.addStamp(p, 'call', 2);
  assert.equal(L.stampTotal(p), 3);
  assert.equal(L.addStamp(p, 'chore', -5), 0);          // never below zero, and an empty kind is dropped
  assert.deepEqual(Object.keys(p.stamps), ['call']);
});

test('plans further than 10 days away are hidden from the to-do list', () => {
  const today = '2026-10-05';
  const at = (n, done) => ({ id: 'x', done: !!done, due: L.addDays(today, n) });
  assert.equal(L.isFarOff(at(10), today), false);
  assert.equal(L.isFarOff(at(11), today), true);
  assert.equal(L.isFarOff(at(40, true), today), false);   // a done one is never hidden
  assert.equal(L.isFarOff({ id: 'y', done: false }, today), false);   // no date: always shown
  assert.equal(L.isFarOff(at(-3), today), false);
});

test('a slot can hold several things at once', () => {
  const o = { hat: 'none', face: 'shades' };
  assert.deepEqual(L.wornIds(o, 'hat'), []);
  assert.equal(L.toggleWorn(o, 'hat', 'tophat'), true);
  assert.equal(L.toggleWorn(o, 'hat', 'butterflyclip'), true);
  assert.deepEqual(L.wornIds(o, 'hat'), ['tophat', 'butterflyclip']);
  assert.equal(L.toggleWorn(o, 'hat', 'tophat'), false);   // tapping again takes just that one off
  assert.equal(o.hat, 'butterflyclip');
  L.toggleWorn(o, 'hat', 'butterflyclip');
  assert.equal(o.hat, 'none');
  L.toggleWorn(o, 'hat', 'tophat'); L.toggleWorn(o, 'hat', 'cap');
  L.toggleWorn(o, 'hat', 'none');                            // "nothing" clears the slot
  assert.equal(o.hat, 'none');
  assert.deepEqual(L.wornIds(o, 'face'), ['shades']);        // a saved single id still reads
  L.toggleWorn(o, 'feet', 'boots'); L.toggleWorn(o, 'feet', 'clogs');
  assert.deepEqual(L.wornIds(o, 'feet'), ['clogs']);         // only one pair of shoes at a time
});

test('glasses and mouth things stack in the order they were put on', () => {
  const o = { face: 'none', mouth: 'none' };
  L.toggleWorn(o, 'mouth', 'mustache');
  L.toggleWorn(o, 'face', 'shades');
  assert.deepEqual(L.faceStack(o).map((e) => e.id), ['mustache', 'shades']);   // the shades are on top of the mustache
  L.toggleWorn(o, 'face', 'eyepatch');
  L.toggleWorn(o, 'mouth', 'hay');
  assert.deepEqual(L.faceStack(o).map((e) => e.id), ['mustache', 'shades', 'eyepatch', 'hay']);
  L.toggleWorn(o, 'face', 'shades');                                              // taking one off keeps the rest in order
  assert.deepEqual(L.faceStack(o).map((e) => e.id), ['mustache', 'eyepatch', 'hay']);
  assert.deepEqual(L.faceStack({ face: 'shades', mouth: 'hay' }).map((e) => e.id), ['shades', 'hay']);   // an old save: glasses, then mouth
  L.toggleWorn(o, 'mouth', 'none');
  assert.deepEqual(L.faceStack(o).map((e) => e.id), ['eyepatch']);
});

test('a repeat can run for a span and then stops', () => {
  assert.equal(L.untilFor('2026-10-05', '1w'), '2026-10-11');
  assert.equal(L.untilFor('2026-10-05', '2m'), '2026-12-04');
  assert.equal(L.untilFor('2026-10-05', ''), '');
  const ok = L.cleanTask({ due: '2026-10-05', repeat: 'weekly', until: '2026-12-04' });
  assert.equal(ok.until, '2026-12-04');
  assert.equal(L.cleanTask({ due: '2026-10-05', until: '2026-12-04' }).until, undefined, 'no repeat, no end');
  assert.equal(L.cleanTask({ due: '2026-10-05', repeat: 'weekly', until: 'soon' }).until, undefined);
});

test('a repeat on certain weekdays comes back on the next chosen one', () => {
  // 2026-10-06 is a Tuesday
  assert.equal(L.nextDue('2026-10-06', 'days', '2026-10-06', [2, 4]), '2026-10-08');
  assert.equal(L.nextDue('2026-10-08', 'days', '2026-10-08', [2, 4]), '2026-10-13');
  assert.equal(L.nextDue('2026-10-09', 'weekdays', '2026-10-09'), '2026-10-12', 'Friday to Monday');
  assert.equal(L.nextDue('2026-10-10', 'weekends', '2026-10-10'), '2026-10-11');
  assert.equal(L.nextDue('2026-09-01', 'days', '2026-10-06', [1]), '2026-10-12', 'ticked late: the next one is after today');
  assert.equal(L.firstOnDays('2026-10-06', [4]), '2026-10-08');
  assert.deepEqual(L.cleanTask({ due: '2026-10-06', repeat: 'days', days: [4, 4, 9, 'x'] }).days, [4]);
  assert.equal(L.cleanTask({ due: '2026-10-06', repeat: 'days' }).repeat, undefined, 'certain days needs at least one day');
});

test('cleanTask keeps a short amount and drops a bad one', () => {
  const L = require('./load.js').PetLogic;
  assert.strictEqual(L.cleanTask({ id: 'a', text: 'x', qty: '  2 tbsp ' }).qty, '2 tbsp');
  assert.strictEqual(L.cleanTask({ id: 'a', text: 'x', qty: 5 }).qty, undefined);
  assert.strictEqual(L.cleanTask({ id: 'a', text: 'x', qty: '' }).qty, undefined);
});

test('phone alerts: one per task with a day and a time still to come, soonest first', () => {
  const now = new Date(2026, 9, 20, 12, 0).getTime();
  const t = (id, due, time, more) => Object.assign({ id, text: id, emoji: '📌', due, time, done: false }, more);
  const plan = L.alertPlan([
    t('later', '2026-10-21', '09:00'),
    t('soon', '2026-10-20', '12:30'),
    t('past', '2026-10-20', '11:59'),            // its time has gone: Fumu covers it in the app
    t('done', '2026-10-20', '15:00', { done: true }),
    t('notime', '2026-10-20', undefined),       // a day alone gets no alert
    t('far', '2026-12-25', '10:00'),            // more than 30 days away
    { id: 'shop', text: 'Milk' }
  ], now);
  assert.deepEqual(plan.map((a) => a.task), ['soon', 'later']);
  assert.equal(plan[0].at, new Date(2026, 9, 20, 12, 30).getTime());
  assert.equal(plan[0].id, L.alertId('soon'));
  // numbers are whole, positive, stay the same, and a snooze (+2^29) stays under the morning ones and Android's 2^31
  for (const id of ['a', 'task-1729-abc', '9'.repeat(40)]) {
    const n = L.alertId(id);
    assert.ok(Number.isInteger(n) && n > 0 && n <= L.ALERT_SNOOZE && n + L.ALERT_SNOOZE < L.ALERT_MORNING, id);
    assert.equal(n, L.alertId(id));
  }
  const many = Array.from({ length: 60 }, (_, i) => t('m' + i, '2026-10-22', '10:00'));
  assert.equal(L.alertPlan(many, now).length, 40);   // Android keeps a limited number waiting
});

test('morning alerts: one a day with the tasks due that day and how many are late by then', () => {
  const now = new Date(2026, 9, 20, 9, 0).getTime();   // Tuesday 20 October, 9:00
  const t = (id, due, time, more) => Object.assign({ id, text: id, due, time, done: false }, more);
  const items = [t('gym', '2026-10-20', '18:00'), t('call', '2026-10-21', '15:00'), t('bins', '2026-10-21'), t('done', '2026-10-22', undefined, { done: true }), t('rent', '2026-10-24')];
  const plan = L.morningPlan(items, now, '08:00');
  // today's 8:00 has gone; Wednesday has two (tasks without a time first, then by time), Thursday and Friday
  // still have the gym and call late, and Saturday has rent
  assert.deepEqual(plan.map((p) => p.day), ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']);
  assert.deepEqual(plan[0].today, ['bins', 'call']);
  assert.equal(plan[0].late, 1);
  assert.equal(plan[0].at, new Date(2026, 9, 21, 8, 0).getTime());
  assert.equal(plan[0].id, L.ALERT_MORNING + 1);
  assert.deepEqual(plan[3].today, ['rent']);
  assert.equal(plan[3].late, 3);
  // later in the morning, today counts too; nothing due means no alerts; a bad time means none
  assert.equal(L.morningPlan(items, now, '10:30')[0].day, '2026-10-20');
  assert.deepEqual(L.morningPlan([t('x', undefined)], now, '08:00'), []);
  assert.deepEqual(L.morningPlan(items, now, '8am'), []);
});

test('settings keep the morning alert time, and start with it off', () => {
  const s = L.settings({ morningTime: '07:30' });
  assert.equal(s.morningTime, '07:30');
  assert.equal(s.morningAlert, false);
  assert.equal(L.settings({ morningTime: 'soon' }).morningTime, '08:00');
});
