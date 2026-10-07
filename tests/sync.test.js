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
  assert.equal(a.sync.items.task2.list, 'todo');
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
  const shared = round(b, round(a, null, T + 1000), T + 2000);
  round(a, shared, T + 3000);
  for (const d of [a, b]) {
    assert.deepEqual(d.pet.tastes, { fruit: 5, dairy: 1, meat: 2 });
    assert.deepEqual(d.pet.stamps, { chore: 7 });
    assert.equal(d.pet.achievements.fruit.count, 12);
    assert.equal(d.pet.achievements.veg.count, 1);
    assert.equal(d.pet.favourites.milk.day, '2026-10-05');
    assert.deepEqual(d.pet.prizes, { star: 2, bow: 1 });
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
    assert.deepEqual(d.pet.guard, { day: '2026-10-07', words: ['egg'], lastSeen: 40 });
  }
  const same = Sync.merge({ counters: { guard: { day: 'd', words: ['a'], lastSeen: 9 } } }, { counters: { guard: { day: 'd', words: ['b'], lastSeen: 3 } } });
  assert.deepEqual(same.counters.guard, { day: 'd', words: ['a', 'b'], lastSeen: 9 });
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

test('the right list gets the items whichever list is showing', () => {
  const { a, b } = pair();
  b.mode = 'todo'; { const s = b.items; b.items = b.stash; b.stash = s; }   // b shows its to-dos
  a.stash.push(L.createItem('Water plants', {}, 'task9', undefined, 'todo'));
  a.items.push(L.createItem('Eggs', {}, 'ea', T));
  const shared = round(a, null, T + 1000);
  round(b, shared, T + 2000);
  assert.deepEqual(texts(b.items), ['Call mum', 'Water plants']);   // the to-do list is showing
  assert.ok(texts(b.stash).includes('Eggs'));
  assert.equal(b.mode, 'todo');
});

test('items from other devices are checked like saved ones', () => {
  const { a, b } = pair();
  a.stash.push(Object.assign(L.createItem('Bad day', {}, 'task8', undefined, 'todo'), { due: 'tomorrow', repeat: 'weekly' }));
  const shared = round(a, null, T + 1000);
  round(b, shared, T + 2000);
  const got = find(b, 'Bad day');
  assert.ok(got);
  assert.equal(got.due, undefined);
  assert.equal(got.repeat, undefined);
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
