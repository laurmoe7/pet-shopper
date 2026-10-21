const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L, Sync } = require('./load');

function ids() { let n = 0; return () => 'id' + (n++); }
const T = 1700000000000;   // a fixed "now"
const clone = (x) => JSON.parse(JSON.stringify(x));
const texts = (list) => list.map((i) => i.text);
const find = (s, text) => s.items.concat(s.stash).find((i) => i.text === text);

/** Two devices that start with exactly the same list and pet, both already stamped. */
function pair() {
  const a = L.parseState(null, ids());
  a.sync.device = 'devicea';
  a.stash = [L.createItem('Call mum', {}, 'task1', undefined, 'todo')];
  Sync.stamp(a, T);
  const b = clone(a);
  b.sync.device = 'deviceb';
  return { a, b };
}
/** One round of syncing a device with the shared document; returns the new shared document. */
function round(dev, shared, now) { const r = Sync.sync(dev, shared, now); return r.doc; }

// ---------- the saved format ----------

test('a first launch is stamped as never edited, so there is nothing to send yet', () => {
  const s = L.parseState(null, ids());
  assert.equal(s.sync.v, 1);
  assert.match(s.sync.device, /^[a-z0-9]{6}$/);
  assert.equal(Object.keys(s.sync.items).length, 8);
  assert.ok(Object.values(s.sync.items).every((m) => m.at === 0 && m.list === 'shop'));
  assert.ok(Sync.FIELD_NAMES.every((n) => s.sync.fields[n] && s.sync.fields[n].at === 0));
  assert.deepEqual(Sync.stamp(s, T), { items: 0, deleted: 0, fields: [] });
});

test('an older save without sync details gets a device name, and is stamped at the first save', () => {
  const old = JSON.stringify({ items: [{ id: '5', text: 'Milk', emoji: '🥛', cat: 'dairy', done: false }], stash: [], overrides: {} });
  const s = L.parseState(old, ids());
  assert.match(s.sync.device, /^[a-z0-9]{6}$/);
  assert.deepEqual(s.sync.items, {});
  const found = Sync.stamp(s, T);
  assert.equal(found.items, 1);
  assert.equal(s.sync.items['5'].at, T);
  assert.deepEqual(s.items.map((i) => i.id), ['5']);   // the items themselves are untouched
});

test('the sync table survives a save and load, and damaged tables are replaced', () => {
  const s = L.parseState(null, ids());
  s.items[0].done = true;
  Sync.stamp(s, T);
  const back = L.parseState(JSON.stringify(s), ids());
  assert.deepEqual(back.sync, s.sync);
  const broken = clone(s);
  broken.sync = { v: 1, device: 5, items: { id1: { at: 'x' }, id2: { at: 1, by: 'a', list: 'nowhere' } }, fields: { nonsense: { at: 1, by: 'a' } } };
  const fixed = L.parseState(JSON.stringify(broken), ids());
  assert.match(fixed.sync.device, /^[a-z0-9]{6}$/);
  assert.deepEqual(fixed.sync.items, {});
  assert.deepEqual(fixed.sync.fields, {});
});

// ---------- noticing changes ----------

test('stamp finds added, changed and deleted items, and nothing when nothing changed', () => {
  const { a } = pair();
  assert.deepEqual(Sync.stamp(a, T + 1000), { items: 0, deleted: 0, fields: [] });
  a.items.push(L.createItem('Oat milk', {}, 'new1', T));
  find(a, 'Bananas').done = true;
  a.items = a.items.filter((i) => i.text !== 'Quark');
  const found = Sync.stamp(a, T + 2000);
  assert.deepEqual([found.items, found.deleted, found.fields], [2, 1, []]);
  assert.equal(a.sync.items.new1.at, T + 2000);
  assert.equal(a.sync.items.id0.at, T + 2000);   // Bananas
  assert.equal(a.sync.items.id0.by, 'devicea');
  const gone = Object.values(a.sync.items).filter((m) => m.del);
  assert.equal(gone.length, 1);
  assert.deepEqual(Sync.stamp(a, T + 3000), { items: 0, deleted: 0, fields: [] });
});

test('swapping the shopping and to-do lists is not a change', () => {
  const { a } = pair();
  const shown = a.items; a.items = a.stash; a.stash = shown; a.mode = 'todo';
  assert.deepEqual(Sync.stamp(a, T + 1000), { items: 0, deleted: 0, fields: [] });
  a.items.push(L.createItem('Pay rent', {}, 'task2', undefined, 'todo'));
  Sync.stamp(a, T + 2000);
  assert.equal(a.sync.items.task2, undefined);   // to-dos are private: never noted for syncing
  assert.equal(a.sync.items.task1, undefined);
});

test('stamp finds changes to the pet and to your name', () => {
  const { a } = pair();
  a.pet.name = 'Fumufumu';
  a.pet.outfit.hat = 'sunhat';
  a.player.name = 'Lauren';
  a.pet.tastes.fruit = 3;   // counters have no times: they are not "changed", they merge by size
  const found = Sync.stamp(a, T + 1000);
  assert.deepEqual(found.fields.sort(), ['pet.look', 'pet.name', 'player']);
});

test('changes always get a later time than anything already seen, even on a slow clock', () => {
  const { a } = pair();
  a.sync.seen = T + 5000;
  a.items.push(L.createItem('Rice', {}, 'new2', T));
  Sync.stamp(a, T + 1000);   // this device's clock is behind
  assert.equal(a.sync.items.new2.at, T + 5001);
  find(a, 'Rice').text = 'Brown rice';
  Sync.stamp(a, T + 1000);
  assert.equal(a.sync.items.new2.at, T + 5002);   // two quick edits stay in order
});

test('removed markers are dropped after 30 days, not before', () => {
  const { a } = pair();
  a.items = a.items.filter((i) => i.text !== 'Quark');
  Sync.stamp(a, T + 1000);
  const id = Object.keys(a.sync.items).find((k) => a.sync.items[k].del);
  Sync.stamp(a, T + 1000 + 29 * 86400000);
  assert.ok(a.sync.items[id]);
  Sync.stamp(a, T + 1000 + 31 * 86400000);
  assert.equal(a.sync.items[id], undefined);
});

// ---------- merging ----------

test('two devices adding different things both keep both', () => {
  const { a, b } = pair();
  a.items.push(L.createItem('Eggs', {}, 'ea', T));
  b.items.push(L.createItem('Flour', {}, 'eb', T));
  const shared = round(b, round(a, null, T + 1000), T + 2000);
  round(a, shared, T + 3000);
  assert.ok(texts(a.items).includes('Eggs') && texts(a.items).includes('Flour'));
  assert.ok(texts(b.items).includes('Eggs') && texts(b.items).includes('Flour'));
  assert.deepEqual(texts(a.items).sort(), texts(b.items).sort());
});

test('the later change to the same item wins', () => {
  const { a, b } = pair();
  find(a, 'Bananas').qty = '6';
  const first = round(a, null, T + 1000);
  find(b, 'Bananas').qty = '12';
  const second = round(b, first, T + 2000);   // b changed it later
  round(a, second, T + 3000);
  assert.equal(find(a, 'Bananas').qty, '12');
  assert.equal(find(b, 'Bananas').qty, '12');
});

test('ticking one item on a device and editing another on the other loses neither', () => {
  const { a, b } = pair();
  find(a, 'Bananas').done = true;
  find(b, 'Quark').qty = '4';
  const shared = round(b, round(a, null, T + 1000), T + 2000);
  round(a, shared, T + 3000);
  for (const d of [a, b]) { assert.equal(find(d, 'Bananas').done, true); assert.equal(find(d, 'Quark').qty, '4'); }
});

test('a deletion reaches the other device, and a later edit beats an earlier deletion', () => {
  const { a, b } = pair();
  a.items = a.items.filter((i) => i.text !== 'Quark');
  let shared = round(a, null, T + 1000);
  round(b, shared, T + 2000);
  assert.equal(find(b, 'Quark'), undefined);
  // b brings it back with a new edit of an item a had deleted: here, editing Bread while a deletes it earlier
  const { a: a2, b: b2 } = pair();
  a2.items = a2.items.filter((i) => i.text !== 'Bananas');
  shared = round(a2, null, T + 1000);
  find(b2, 'Bananas').qty = '9';
  shared = round(b2, shared, T + 5000);   // edited after the deletion
  round(a2, shared, T + 6000);
  assert.equal(find(a2, 'Bananas').qty, '9');
});

test('a later deletion beats an earlier edit', () => {
  const { a, b } = pair();
  find(a, 'Bananas').qty = '9';
  const shared = round(a, null, T + 1000);
  b.items = b.items.filter((i) => i.text !== 'Bananas');
  const next = round(b, shared, T + 5000);
  round(a, next, T + 6000);
  assert.equal(find(a, 'Bananas'), undefined);
});

test('a device that was offline for days still merges', () => {
  const { a, b } = pair();
  for (let d = 1; d <= 5; d++) { find(a, 'Bananas').qty = String(d); round(a, null, T + d * 86400000); }
  b.items.push(L.createItem('Tea', {}, 'eb', T));
  const shared = round(a, null, T + 6 * 86400000);
  round(b, shared, T + 7 * 86400000);
  assert.equal(find(b, 'Bananas').qty, '5');
  assert.ok(find(b, 'Tea'));
});

test('single things: the later change wins, and the look stays together', () => {
  const { a, b } = pair();
  a.pet.name = 'Mugi';
  b.pet.species = 'cat'; b.pet.skin = 'siamese'; b.pet.outfit.hat = 'sunhat';
  a.pet.species = 'frog'; a.pet.skin = '';
  const first = round(a, null, T + 1000);
  const second = round(b, first, T + 2000);   // b's look is later
  round(a, second, T + 3000);
  assert.equal(a.pet.name, 'Mugi');
  assert.deepEqual([a.pet.species, a.pet.skin, a.pet.outfit.hat], ['cat', 'siamese', 'sunhat']);
  assert.deepEqual([b.pet.species, b.pet.skin, b.pet.name], ['cat', 'siamese', 'Mugi']);
});

test('counters keep the larger value and never go down', () => {
  const { a, b } = pair();
  a.pet.tastes = { fruit: 5, dairy: 1 };
  b.pet.tastes = { fruit: 3, meat: 2 };
  a.pet.stamps = { chore: 4 }; b.pet.stamps = { chore: 7 };
  a.pet.achievements = { fruit: { count: 10, day: '2026-10-01', today: 2 } };
  b.pet.achievements = { fruit: { count: 12, day: '2026-09-30', today: 1 }, veg: { count: 1, day: '2026-10-02', today: 1 } };
  a.pet.favourites = { milk: { label: 'Milk', emoji: '🥛', count: 3, day: '2026-10-01' } };
  b.pet.favourites = { milk: { label: 'Milk', emoji: '🥛', count: 3, day: '2026-10-05' } };
  a.pet.prizes = { star: 2 }; b.pet.prizes = { star: 1, bow: 1 };
  a.pet.plant = { water: 4, last: 1200 }; b.pet.plant = { water: 3, last: 1211 };
  const shared = round(b, round(a, null, T + 1000), T + 2000);
  round(a, shared, T + 3000);
  for (const d of [a, b]) {
    assert.deepEqual(d.pet.tastes, { fruit: 5, dairy: 1, meat: 2 });
    assert.deepEqual(d.pet.stamps, { chore: 7 });
    assert.equal(d.pet.achievements.fruit.count, 12);
    assert.equal(d.pet.achievements.veg.count, 1);
    assert.equal(d.pet.favourites.milk.day, '2026-10-05');
    assert.deepEqual(d.pet.prizes, { star: 2, bow: 1 });
    assert.deepEqual(d.pet.plant, { water: 4, last: 1211 }, 'the plant keeps the larger counts');
  }
});

test('gift boxes, treats and the fair-play memory join on the same day and follow the later day', () => {
  const { a, b } = pair();
  a.pet.gifts = { '2026-10-06': ['x'], '2026-10-07': ['y'] };
  b.pet.gifts = { '2026-10-07': ['z', 'y'] };
  a.pet.treats = { day: '2026-10-07', used: ['apple'] };
  b.pet.treats = { day: '2026-10-07', used: ['cake'] };
  a.pet.guard = { day: '2026-10-06', words: ['milk'], lastSeen: 50 };
  b.pet.guard = { day: '2026-10-07', words: ['egg'], lastSeen: 40 };
  const shared = round(b, round(a, null, T + 1000), T + 2000);
  round(a, shared, T + 3000);
  for (const d of [a, b]) {
    assert.deepEqual(d.pet.gifts, { '2026-10-06': ['x'], '2026-10-07': ['y', 'z'] });
    assert.deepEqual(d.pet.treats, { day: '2026-10-07', used: ['apple', 'cake'] });
    assert.deepEqual(d.pet.guard, { day: '2026-10-07', words: ['egg'], lastSeen: 40, trip: '' });
  }
  const same = Sync.merge({ counters: { guard: { day: 'd', words: ['a'], lastSeen: 9 } } }, { counters: { guard: { day: 'd', words: ['b'], lastSeen: 3 } } });
  assert.deepEqual(same.counters.guard, { day: 'd', words: ['a', 'b'], lastSeen: 9 });
  // the day of the last trip stamp: the later one, whichever guard wins
  const trips = Sync.merge({ counters: { guard: { day: 'd', words: [], lastSeen: 1, trip: '2026-10-05' } } }, { counters: { guard: { day: 'd', words: [], lastSeen: 1, trip: '2026-10-07' } } });
  assert.equal(trips.counters.guard.trip, '2026-10-07');
  const laterDay = Sync.merge({ counters: { guard: { day: 'e', words: [], lastSeen: 1 } } }, { counters: { guard: { day: 'd', words: [], lastSeen: 1, trip: '2026-10-07' } } });
  assert.deepEqual(laterDay.counters.guard, { day: 'e', words: [], lastSeen: 1, trip: '2026-10-07' });
});

test('sleep, options and the developer switches stay on each device', () => {
  const { a, b } = pair();
  a.pet.dozing = '2026-10-07'; a.settings.sounds = false; a.dev.noWait = true; a.quiet = true;
  const shared = round(a, null, T + 1000);
  round(b, shared, T + 2000);
  assert.equal(b.pet.dozing, '');
  assert.equal(b.settings.sounds, true);
  assert.equal(b.dev.noWait, false);
  assert.equal(b.quiet, false);
  assert.equal(JSON.stringify(shared).includes('2026-10-07'), false);
});

// ---------- the rules of merging ----------

/** A small deterministic random number generator, so a failing case can be rerun. */
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

function randomDoc(r, by) {
  const doc = { v: 1, items: {}, fields: {}, counters: {} };
  for (let i = 0; i < 6; i++) {
    if (r() < 0.3) continue;
    const id = 'i' + Math.floor(r() * 5);
    const at = Math.floor(r() * 4);
    doc.items[id] = r() < 0.3 ? { at, by, list: 'shop', del: 1 } : { at, by, list: r() < 0.5 ? 'shop' : 'todo', item: { id, text: 't' + Math.floor(r() * 3), emoji: 'e', cat: 'c', done: r() < 0.5 } };
  }
  ['pet.name', 'player'].forEach((n) => { if (r() < 0.7) doc.fields[n] = { at: Math.floor(r() * 4), by, value: 'v' + Math.floor(r() * 3) }; });
  doc.counters = {
    tastes: { fruit: Math.floor(r() * 5), meat: Math.floor(r() * 5) },
    achievements: r() < 0.5 ? { g: { count: Math.floor(r() * 4), day: 'd' + Math.floor(r() * 2), today: Math.floor(r() * 3) } } : {},
    gifts: { d1: r() < 0.5 ? ['a'] : ['b', 'a'] },
    guard: { day: 'd' + Math.floor(r() * 2), words: r() < 0.5 ? ['x'] : ['y'], lastSeen: Math.floor(r() * 9) }
  };
  // take-backs: each device's own, and sometimes a copy of another's
  for (const dev of [by, r() < 0.5 ? 'aaaa' : 'bbbb']) {
    if (r() < 0.3) continue;
    const value = {};
    for (const p of ['t:fruit', 'g:x', 'g:y', 'at:g', 'fd:milk']) if (r() < 0.6) value[p] = [p === 't:fruit' ? '' : 'd' + Math.floor(r() * 2), Math.floor(r() * 3), Math.floor(r() * 2), r() < 0.5 ? '' : 'p' + Math.floor(r() * 2)];
    doc.fields['back.' + dev] = { at: Math.floor(r() * 4), by: dev, value };
  }
  return doc;
}

test('merging gives the same result in any order, any grouping, and twice', () => {
  const r = rng(42);
  for (let n = 0; n < 200; n++) {
    const x = randomDoc(r, 'aaaa'), y = randomDoc(r, 'bbbb'), z = randomDoc(r, 'cccc');
    assert.deepEqual(Sync.merge(x, y), Sync.merge(y, x));
    assert.deepEqual(Sync.merge(Sync.merge(x, y), z), Sync.merge(x, Sync.merge(y, z)));
    assert.deepEqual(Sync.merge(x, x), Sync.merge(x, Sync.merge(x, x)));
    const m = Sync.merge(x, y);
    assert.deepEqual(Sync.merge(m, x), m);
    assert.deepEqual(Sync.merge(m, y), m);
  }
});

test('two changes at the very same moment still settle the same way on both devices', () => {
  const x = { items: { i1: { at: 5, by: 'aaaa', list: 'shop', item: { id: 'i1', text: 'A', emoji: 'e', cat: 'c', done: false } } }, fields: {}, counters: {} };
  const y = { items: { i1: { at: 5, by: 'bbbb', list: 'shop', item: { id: 'i1', text: 'B', emoji: 'e', cat: 'c', done: false } } }, fields: {}, counters: {} };
  assert.equal(Sync.merge(x, y).items.i1.item.text, 'B');
  assert.equal(Sync.merge(y, x).items.i1.item.text, 'B');
});

test('a damaged or empty document is ignored, not a crash', () => {
  const { a } = pair();
  const good = Sync.snapshot(a, T + 1000);
  for (const bad of [null, undefined, 5, 'x', [], { items: 5, fields: 'x', counters: [] }, { items: { id9: { at: 'now' }, id8: { at: 1, by: 'x', list: 'shop' } } }]) {
    const m = Sync.merge(good, bad);
    assert.deepEqual(m.items, good.items);
    assert.deepEqual(m.fields, good.fields);
  }
  const before = JSON.stringify(a.items);
  Sync.apply(a, { items: { id0: { at: 99, by: 'zzzz', list: 'shop', item: { id: 'id0', text: 5 } } }, fields: { 'pet.name': { at: 99, by: 'zzzz', value: 123 } }, counters: { tastes: 'lots' } });
  assert.equal(JSON.stringify(a.items), before);   // the bad item is ignored
  assert.equal(typeof a.pet.name, 'string');       // a bad name is replaced by a valid one
  assert.deepEqual(a.pet.tastes, {});
});

// ---------- writing the result back ----------

test('after syncing, the device sees nothing of its own to send, and a second round changes nothing', () => {
  const { a, b } = pair();
  a.items.push(L.createItem('Eggs', {}, 'ea', T));
  a.pet.name = 'Mugi';
  b.items = b.items.filter((i) => i.text !== 'Quark');
  const shared = round(b, round(a, null, T + 1000), T + 2000);
  round(a, shared, T + 3000);
  for (const d of [a, b]) {
    assert.deepEqual(Sync.stamp(d, T + 4000), { items: 0, deleted: 0, fields: [] });
    const again = Sync.sync(d, shared, T + 5000);
    assert.deepEqual(again.applied, { added: 0, changed: 0, removed: 0, fields: [] });
    assert.deepEqual(again.doc, shared);
  }
});

test('new items from another device go at the end of the to-buy part; eaten ones stay below', () => {
  const { a, b } = pair();
  find(a, 'Bananas').done = true;
  a.items = a.items.filter((i) => !i.done).concat(a.items.filter((i) => i.done));
  a.items.splice(a.items.findIndex((i) => i.done), 0, L.createItem('Eggs', {}, 'ea', T));
  const shared = round(a, null, T + 1000);
  round(b, shared, T + 2000);
  const order = texts(b.items);
  assert.equal(order[order.length - 1], 'Bananas');             // eaten: at the bottom
  assert.equal(order[order.length - 2], 'Eggs');                // new to-buy item: after the other to-buy items
  assert.equal(b.items.filter((i) => i.done).length, 1);
  assert.ok(b.items.slice(0, -1).every((i) => !i.done));
});

test('each list lands in its own place whichever list is showing, and to-dos travel too', () => {
  const { a, b } = pair();
  b.mode = 'todo'; { const s = b.items; b.items = b.stash; b.stash = s; }   // b shows its to-dos
  a.stash.push(L.createItem('Water plants', {}, 'task9-devicea', undefined, 'todo'));
  a.items.push(L.createItem('Eggs', {}, 'ea', T));
  const shared = round(a, null, T + 1000);
  assert.equal(shared.items['task9-devicea'].list, 'todo');
  round(b, shared, T + 2000);
  assert.deepEqual(texts(b.items).sort(), ['Call mum', 'Water plants']);   // the to-do list is showing
  assert.ok(texts(b.stash).includes('Eggs') && !texts(b.stash).includes('Water plants'));
  assert.equal(b.mode, 'todo');
});

test('a ticked or removed to-do on one device is ticked or removed on the other', () => {
  const { a, b } = pair();
  round(b, round(a, null, T + 1000), T + 2000);
  a.stash[0].done = true;
  b.stash.push(L.createItem('Dentist', {}, 'task2-deviceb', undefined, 'todo'));
  let doc = round(a, round(b, round(a, null, T + 3000), T + 4000), T + 5000);
  round(b, doc, T + 6000);
  assert.equal(find(b, 'Call mum').done, true);
  assert.equal(find(a, 'Dentist').done, false);
  b.stash = b.stash.filter((i) => i.text !== 'Dentist');
  doc = round(b, doc, T + 7000);
  round(a, doc, T + 8000);
  assert.equal(find(a, 'Dentist'), undefined);
});

test('a to-do from another device lands in due order, not at the end', () => {
  const { a, b } = pair();
  const today = L.dayKey(new Date()), later = L.dayKey(new Date(Date.now() + 5 * 86400000));
  b.stash.push(Object.assign(L.createItem('Later thing', {}, 'late-deviceb', undefined, 'todo'), { due: later }));
  a.stash.push(Object.assign(L.createItem('Today thing', {}, 'now-devicea', undefined, 'todo'), { due: today }));
  round(b, round(a, null, T + 1000), T + 2000);
  assert.deepEqual(texts(b.stash), ['Today thing', 'Call mum', 'Later thing']);   // (the app's order: today's dated tasks, then undated ones, then later ones)
});

test('shared items in a personal document are left alone', () => {
  const { a, b } = pair();
  const doc = round(a, null, T + 1000);
  doc.items['h1-x'] = { at: T + 5, by: 'x', list: 'shared', item: L.createItem('Their soup', {}, 'h1-x', T) };
  const before = texts(b.items).concat(texts(b.stash));
  round(b, doc, T + 2000);
  assert.deepEqual(texts(b.items).concat(texts(b.stash)), before);
  assert.equal(b.sync.items['h1-x'], undefined);
  assert.deepEqual(b.otherShop, []);
});

test('to-dos from before ids named the device get the device name, and a repeat keeps its link', () => {
  const a = L.parseState(null, ids());
  a.sync.device = 'devicea';
  a.stash = [Object.assign(L.createItem('Bins', {}, '17', undefined, 'todo'), { spawned: '18' }), L.createItem('Bins', {}, '18', undefined, 'todo')];
  const doc = Sync.snapshot(a, T);
  assert.deepEqual(a.stash.map((i) => i.id), ['17-devicea', '18-devicea']);
  assert.equal(a.stash[0].spawned, '18-devicea');
  assert.ok(doc.items['17-devicea'] && !doc.items['17']);
  Sync.stamp(a, T + 1);
  assert.deepEqual(a.stash.map((i) => i.id), ['17-devicea', '18-devicea'], 'only once');
});

// ---------- households: a second document with only the shared shopping list ----------

/** Two people (not two devices of one person): each their own pet, list and to-dos, in one household. */
function housemates() {
  const mk = (device, task) => {
    const s = L.parseState(null, ids());
    s.sync.device = device;
    s.items = [L.createItem('Own ' + device, {}, 'own-' + device, T)];
    s.stash = [L.createItem(task, {}, 'task-' + device, undefined, 'todo')];
    s.otherShop = [];
    Sync.stamp(s, T);
    return s;
  };
  return { sam: mk('samaaa', 'Sam task'), kim: mk('kimbbb', 'Kim task') };
}
const houseRound = (dev, doc, now) => Sync.sync(dev, doc, now, { house: true }).doc;

test('the shared list syncs on its own: no own shopping list, to-dos, pet or counters in it, and none taken from it', () => {
  const { sam, kim } = housemates();
  Sync.showShop(sam, 'shared');
  sam.items.push(L.createItem('Milk', {}, 'm-samaaa', T));
  sam.pet.tastes = { milk: 4 };
  const doc = houseRound(sam, null, T + 1000);
  assert.deepEqual(Object.keys(doc), ['v', 'items']);
  assert.deepEqual(Object.keys(doc.items), ['m-samaaa']);
  // the personal document has Sam's own list and to-dos, never the shared one
  const mine = Sync.snapshot(sam, T + 1000);
  assert.ok(mine.items['own-samaaa'] && mine.items['task-samaaa'] && !mine.items['m-samaaa']);
  // Kim gets it in the list not on show, and nothing else of Kim's changes
  const kimPet = JSON.stringify(kim.pet);
  houseRound(kim, Object.assign({}, doc, { fields: { 'pet.name': { at: T + 9, by: 'x', value: 'Evil' } }, counters: { tastes: { milk: 99 } } }), T + 2000);
  assert.deepEqual(texts(kim.otherShop), ['Milk']);
  assert.deepEqual(texts(kim.items), ['Own kimbbb']);
  assert.deepEqual(texts(kim.stash), ['Kim task']);
  assert.equal(JSON.stringify(kim.pet), kimPet);
  // the item is in the list on show if Kim looks at the shared list
  Sync.showShop(kim, 'shared');
  assert.deepEqual(texts(kim.items), ['Milk']);
  assert.deepEqual(texts(kim.otherShop), ['Own kimbbb']);
  assert.deepEqual(texts(Sync.listArray(kim, 'shop')), ['Own kimbbb']);
});

test('an item ticked by someone else arrives without their pet\'s marks, so it never counts or refunds here; the ticker keeps theirs', () => {
  const { sam, kim } = housemates();
  Sync.showShop(sam, 'shared'); Sync.showShop(kim, 'shared');
  sam.items.push(L.createItem('Apple', {}, 'a-samaaa', T));
  let doc = houseRound(kim, houseRound(sam, null, T + 1000), T + 2000);
  // Sam ticks it: Sam's pet counts it and notes that on the item
  Object.assign(sam.items[0], { done: true, doneBy: 'Sam', counted: ['fruit-basket'], countedDay: L.dayKey(new Date(T)), tasted: 'apple', fav: 'apple' });
  doc = houseRound(sam, doc, T + 3000);
  assert.equal(doc.items['a-samaaa'].item.done, true);
  assert.equal(doc.items['a-samaaa'].item.doneBy, 'Sam');
  Sync.MARKS.forEach((k) => assert.equal(doc.items['a-samaaa'].item[k], undefined, k + ' stays with Sam'));
  houseRound(kim, doc, T + 4000);
  const k = kim.items.find((i) => i.id === 'a-samaaa');
  assert.equal(k.done, true);
  Sync.MARKS.forEach((m) => assert.equal(k[m], undefined));
  // Kim unticks it: Kim's pet has nothing to give back
  const pet = JSON.stringify(kim.pet);
  L.refundEaten(kim.pet, k, new Date(T + 5000), globalThis.Achievements);
  assert.equal(JSON.stringify(kim.pet), pet);
  // Sam's marks survive the round trip, and an edit by Kim while it stays ticked
  houseRound(sam, doc, T + 6000);
  assert.deepEqual(sam.items[0].counted, ['fruit-basket']);
  k.qty = '2';
  doc = houseRound(kim, doc, T + 7000);
  houseRound(sam, doc, T + 8000);
  assert.equal(sam.items[0].qty, '2');
  assert.equal(sam.items[0].tasted, 'apple');
  // a tick on Sam's own device is not a change to send: the marks are Sam's business
  assert.equal(Sync.stamp(sam, T + 9000).items, 0);
  // Kim unticks and ticks it again before Sam syncs: the tick is Kim's now, so Sam's marks go
  const before = JSON.parse(JSON.stringify(doc));
  k.done = true; k.doneWho = 'kim'; k.doneBy = 'Kim';
  const again = houseRound(kim, before, T + 9500);
  houseRound(sam, again, T + 9600);
  assert.equal(sam.items[0].doneBy, 'Kim');
  assert.equal(sam.items[0].tasted, undefined, 'not Sam\'s tick any more');
  Object.assign(sam.items[0], { doneWho: 'sam', doneBy: 'Sam', tasted: 'apple' });   // (Sam ticks it again, for the rest of the test)
  doc = houseRound(sam, again, T + 9700);
  // Kim unticks it for real: Sam's copy is unticked and its marks go
  k.done = false; delete k.doneBy;
  houseRound(sam, houseRound(kim, doc, T + 10000), T + 11000);
  assert.equal(sam.items[0].done, false);
  assert.equal(sam.items[0].counted, undefined);
});

test('leaving a household takes the shared list off this device without removing it for the others, and keeps your own', () => {
  const { sam, kim } = housemates();
  kim.otherShop.push(L.createItem('Bread', {}, 'b-kimbbb', T));
  const doc = houseRound(kim, null, T + 1000);
  houseRound(sam, doc, T + 2000);
  Sync.showShop(sam, 'shared');
  sam.mode = 'todo'; { const t = sam.items; sam.items = sam.stash; sam.stash = t; }   // the to-dos show, the shared list waits
  assert.equal(Sync.leaveHouse(sam), 1);
  assert.equal(sam.shopList, 'shop');
  assert.deepEqual(texts(sam.stash), ['Own samaaa']);
  assert.deepEqual(texts(sam.items), ['Sam task']);
  assert.deepEqual(sam.otherShop, []);
  assert.ok(!Object.values(sam.sync.items).some((m) => m.list === 'shared'));
  assert.deepEqual(Object.keys(Sync.snapshot(sam, T + 3000, { house: true }).items), [], 'no removed markers to send');
  assert.ok(!Sync.snapshot(sam, T + 3000).items['b-kimbbb']);
});

test('the saved state keeps which shopping list shows and the other one', () => {
  const s = L.parseState(JSON.stringify({ items: [], shopList: 'shared', otherShop: [L.createItem('Tea', {}, 't1', T)] }), ids());
  assert.equal(s.shopList, 'shared');
  assert.deepEqual(texts(s.otherShop), ['Tea']);
  const old = L.parseState(JSON.stringify({ items: [] }), ids());
  assert.equal(old.shopList, 'shop');
  assert.deepEqual(old.otherShop, []);
});

test('removed markers are left out of a document older than 30 days', () => {
  const { a } = pair();
  a.items = a.items.filter((i) => i.text !== 'Quark');
  const doc = Sync.snapshot(a, T + 1000);
  assert.ok(Object.values(doc.items).some((r) => r.del));
  const trimmed = Sync.trim(doc, T + 1000 + 31 * 86400000);
  assert.ok(!Object.values(trimmed.items).some((r) => r.del));
  assert.equal(Object.keys(trimmed.items).length, Object.keys(doc.items).length - 1);
});

test('a long list stamps quickly', () => {
  const s = L.parseState(null, ids());
  for (let i = 0; i < 1000; i++) s.items.push(L.createItem('Thing ' + i, {}, 'n' + i, T));
  Sync.stamp(s, T);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) Sync.stamp(s, T + 1000 + i);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 20;
  assert.ok(ms < 50, 'one stamp took ' + ms.toFixed(1) + ' ms');
});

// ---------- keeping the list of synced things complete ----------

test('every piece of pet data is either synced or deliberately left on the device', () => {
  const synced = ['name', 'species', 'skin', 'outfit', 'personality', 'room', 'closet'].concat(Sync.COUNTERS);
  const local = ['dozing'];   // tonight's sleep belongs to this device
  const keys = Object.keys(L.petProfile({})).sort();
  assert.deepEqual(keys, synced.concat(local).sort(), 'new pet data needs a rule in sync.js (FIELDS or COUNTERS), or a place in this test\'s local list');
});

test('the sample list stays on its device when asked, and a joining device can drop it', () => {
  const a = L.parseState(null, ids());
  a.sync.device = 'devicea';
  const sampleCount = a.items.length;
  assert.ok(sampleCount > 0);
  assert.ok(Object.values(a.sync.items).every((m) => m.at === 0));
  a.items.push(L.createItem('Oat milk', {}, 'mine-devicea', T));
  const doc = Sync.snapshot(a, T + 1000, { skipSample: true });
  assert.deepEqual(Object.keys(doc.items), ['mine-devicea']);
  assert.equal(Object.keys(Sync.snapshot(a, T + 1000).items).length, sampleCount + 1);   // without the option, everything goes
  const b = L.parseState(null, ids());
  b.sync.device = 'deviceb';
  assert.equal(Sync.dropSample(b), sampleCount);
  assert.equal(b.items.length, 0);
  assert.deepEqual(Object.keys(b.sync.items), []);
  Sync.sync(b, doc, T + 2000, { skipSample: true });
  assert.deepEqual(texts(b.items), ['Oat milk']);
  assert.equal(Sync.dropSample(b), 0);   // an item that came from elsewhere is not sample
});

test('dropping the sample list leaves the to-do list alone', () => {
  const a = L.parseState(null, ids());
  a.stash = [L.createItem('Call mum', {}, 'task1', undefined, 'todo')];
  Sync.dropSample(a);
  assert.deepEqual(texts(a.stash), ['Call mum']);
});

test('a document with a broken player or emoji overrides is cleaned on apply, like a saved copy is on load', () => {
  const a = L.parseState(null, ids());
  Sync.stamp(a, T);
  const doc = { items: {}, fields: { player: { at: T + 5000, by: 'z', value: null }, overrides: { at: T + 5000, by: 'z', value: 'boom' } }, counters: {} };
  Sync.apply(a, doc, T + 6000);
  assert.equal(typeof a.player.name, 'string');
  assert.deepEqual(a.overrides, {});
  const doc2 = { items: {}, fields: { player: { at: T + 7000, by: 'z', value: { name: 7, birthday: [] } }, overrides: { at: T + 7000, by: 'z', value: { apples: 5, pears: '\u{1F350}', bad: 'x'.repeat(41) } } }, counters: {} };
  Sync.apply(a, doc2, T + 8000);
  assert.equal(typeof a.player.name, 'string');
  assert.deepEqual(a.overrides, { pears: '\u{1F350}' });
  assert.deepEqual(L.cleanOverrides(null), {});
  assert.deepEqual(L.cleanOverrides([1, 2]), {});
});

// ---------- taking counts back ----------

test('a stamp taken back stays taken back after the next sync', () => {
  const { a } = pair();
  L.addStamp(a.pet, 'chore', 1); Sync.stamp(a, T + 1000);   // tick a task (save)
  let shared = round(a, null, T + 2000);
  assert.deepEqual(a.pet.stamps, { chore: 1 });
  L.addStamp(a.pet, 'chore', -1); Sync.stamp(a, T + 3000);  // untick it
  shared = round(a, shared, T + 4000);
  assert.deepEqual(a.pet.stamps, {});
  shared = round(a, shared, T + 5000);
  assert.deepEqual(a.pet.stamps, {}, 'a second round does not bring it back');
});

test('unticking on one device and ticking again counts the purchase once, everywhere', () => {
  const { a, b } = pair();
  a.pet.tastes.fruit = 1; a.pet.stamps.chore = 3; Sync.stamp(a, T + 1000);
  let shared = round(a, null, T + 2000);
  shared = round(b, shared, T + 3000);
  assert.deepEqual([b.pet.tastes, b.pet.stamps], [{ fruit: 1 }, { chore: 3 }]);
  L.refundTaste(b.pet, { cat: 'fruit' }); L.addStamp(b.pet, 'chore', -1); Sync.stamp(b, T + 4000);
  shared = round(b, shared, T + 5000);
  shared = round(a, shared, T + 6000);
  assert.deepEqual([a.pet.tastes.fruit, a.pet.stamps.chore], [0, 2], 'the take-back reaches the other device');
  b.pet.tastes.fruit++; L.addStamp(b.pet, 'chore', 1); Sync.stamp(b, T + 7000);   // ticked again
  shared = round(b, shared, T + 8000);
  shared = round(a, shared, T + 9000);
  round(b, shared, T + 10000);
  for (const d of [a, b]) assert.deepEqual([d.pet.tastes.fruit, d.pet.stamps.chore], [1, 3]);
});

test('goals, favourites and the fair-play words taken back by unticking stay taken back', () => {
  const { a, b } = pair();
  const day = '2026-10-19';
  a.pet.achievements = { fruit: { count: 4, day, today: 2 } };
  a.pet.favourites = { milk: { label: 'Milk', emoji: '🥛', count: 3, day } };
  a.pet.guard = { day, words: ['milk', 'egg'], lastSeen: 5, trip: '' };
  Sync.stamp(a, T + 1000);
  let shared = round(a, null, T + 2000);
  shared = round(b, shared, T + 3000);
  // B puts the milk back: what refundEaten and refundFavourite do
  b.pet.achievements.fruit.count--; b.pet.achievements.fruit.today--;
  b.pet.guard.words = ['egg'];
  b.pet.favourites.milk.count--; b.pet.favourites.milk.day = '2026-10-12';
  Sync.stamp(b, T + 4000);
  shared = round(b, shared, T + 5000);
  shared = round(a, shared, T + 6000);
  for (const d of [a, b]) {
    assert.deepEqual(d.pet.achievements.fruit, { count: 3, day, today: 1 });
    assert.deepEqual(d.pet.guard.words, ['egg']);
    assert.deepEqual(d.pet.favourites.milk, { label: 'Milk', emoji: '🥛', count: 2, day: '2026-10-12' });
  }
  // A ticks it again: it counts once more, as one purchase
  a.pet.achievements.fruit.count++; a.pet.achievements.fruit.today++;
  a.pet.guard.words.push('milk');
  a.pet.favourites.milk.count++; a.pet.favourites.milk.day = day;
  Sync.stamp(a, T + 7000);
  shared = round(a, shared, T + 8000);
  round(b, shared, T + 9000);
  for (const d of [a, b]) {
    assert.deepEqual(d.pet.achievements.fruit, { count: 4, day, today: 2 });
    assert.deepEqual(d.pet.guard.words.slice().sort(), ['egg', 'milk']);
    assert.deepEqual(d.pet.favourites.milk, { label: 'Milk', emoji: '🥛', count: 3, day });
  }
});

test('a favourite taken back to nothing goes away everywhere', () => {
  const { a, b } = pair();
  a.pet.favourites = { kiwi: { label: 'Kiwi', emoji: '🥝', count: 1, day: '2026-10-19' } };
  Sync.stamp(a, T + 1000);
  let shared = round(b, round(a, null, T + 2000), T + 3000);
  delete b.pet.favourites.kiwi; Sync.stamp(b, T + 4000);
  shared = round(b, shared, T + 5000);
  round(a, shared, T + 6000);
  for (const d of [a, b]) assert.deepEqual(d.pet.favourites, {});
});

test('a new day clearing the fair-play words is not a take-back', () => {
  const { a, b } = pair();
  a.pet.guard = { day: '2026-10-18', words: ['milk'], lastSeen: 5, trip: '' };
  Sync.stamp(a, T + 1000);
  let shared = round(a, null, T + 2000);
  a.pet.guard.day = '2026-10-19'; a.pet.guard.words = ['egg']; Sync.stamp(a, T + 3000);
  shared = round(a, shared, T + 4000);
  assert.equal(JSON.stringify(shared.fields).includes('back.'), false, 'nothing was taken back');
  round(b, shared, T + 5000);
  assert.deepEqual(b.pet.guard.words, ['egg']);
});

test('take-backs survive a server and devices on the old code', () => {
  const { a, b } = pair();
  // the old merge kept unknown fields by "latest wins" and the counters by "larger wins": both are what it still does here
  const oldMerge = (x, y) => { const m = Sync.merge(x, y); for (const k of Object.keys(m.fields)) if (k.startsWith('back.')) { const rx = x && x.fields && x.fields[k], ry = y && y.fields && y.fields[k]; m.fields[k] = !rx ? ry : !ry ? rx : (rx.at >= ry.at ? rx : ry); } return m; };
  a.pet.stamps = { chore: 2 }; Sync.stamp(a, T + 1000);
  let server = oldMerge(null, Sync.snapshot(a, T + 2000));
  Sync.apply(a, server);
  L.addStamp(a.pet, 'chore', -1); Sync.stamp(a, T + 3000);
  server = oldMerge(server, Sync.snapshot(a, T + 4000));
  Sync.apply(a, server);
  assert.deepEqual(a.pet.stamps, { chore: 1 });
  // a device on the old code sees the larger count (as before) and its own tick still counts
  const old = clone(server.counters);
  assert.deepEqual(old.stamps, { chore: 2 });
  server = oldMerge(server, { v: 1, items: {}, fields: {}, counters: Object.assign(old, { stamps: { chore: 3 } }) });
  round(b, server, T + 5000);
  assert.deepEqual(b.pet.stamps, { chore: 2 });
});

test('a document from before take-backs loads as it always did', () => {
  const { a } = pair();
  const oldDoc = { v: 1, items: {}, fields: {}, counters: { tastes: { fruit: 4 }, stamps: { chore: 2 } } };
  round(a, oldDoc, T + 1000);
  assert.deepEqual([a.pet.tastes, a.pet.stamps], [{ fruit: 4 }, { chore: 2 }]);
  // a save from before this build (no take-back table) loads and takes back from then on
  const saved = clone(a); delete saved.sync.was; delete saved.sync.gross; delete saved.sync.backs;
  const s = L.parseState(JSON.stringify(saved), ids());
  L.addStamp(s.pet, 'chore', -1); Sync.stamp(s, T + 2000);
  round(s, oldDoc, T + 3000);
  assert.deepEqual(s.pet.stamps, { chore: 1 });
});
