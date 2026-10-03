const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L, Foods, Wardrobe, Achievements, FreeUnlocks: Free } = require('./load');
// the rules are tested with unlocking switched on; the game currently ships with everything open (Free.all)
const FreeUnlocks = { ...Free, all: false };

let n = 0;
// a different fish each time, added long ago, so only the rule under test applies
const name = (k) => (k < 26 ? '' : name(Math.floor(k / 26) - 1)) + String.fromCharCode(97 + (k % 26));
const fish = () => ({ text: 'fish ' + name(n++), emoji: '🐟', cat: 'protein' });
const carrot = { text: 'carrots', emoji: '🥕', cat: 'veg' };
const day = (d, h = 12) => new Date(2026, 9, d, h, 0, 0);
const fishFan = Achievements.find((a) => a.id === 'fish-fan');
const fresh = () => L.petProfile();
const trip = (k) => Array.from({ length: k }, (_, i) => ({ text: 'thing ' + i, emoji: '🍎', cat: 'fruit', done: true }));

test('the achievement list is valid data', () => {
  const seen = new Set();
  for (const a of Achievements) {
    assert.ok(!seen.has(a.id), 'duplicate id ' + a.id);
    seen.add(a.id);
    assert.ok(a.title && a.text && a.icon, a.id);
    assert.ok(a.goal > a.perDay && a.perDay >= 1, a.id + ' must take more than one day');
    assert.ok(a.trips || (a.foods && (a.foods.cats || a.foods.emojis)), a.id + ' counts nothing');
    assert.ok(['species', 'skin', 'hat'].includes(a.unlocks.kind), a.id);
  }
});

test('every food goal can be reached with foods the app knows', () => {
  for (const a of Achievements.filter((x) => x.foods)) {
    const ok = Foods.all.some((e) => L.countsFor(a, { emoji: e, cat: Foods.categoryOf(e) }));
    assert.ok(ok, a.id);
  }
});

test('every hat a goal unlocks exists in the wardrobe', () => {
  for (const a of Achievements.filter((x) => x.unlocks.kind === 'hat')) {
    assert.ok(Wardrobe.some((w) => w.id === a.unlocks.id), a.unlocks.id);
  }
});

test('the penguin needs 20 fish, and only 2 a day count', () => {
  const pet = fresh();
  const r1 = L.recordEaten(pet, fish(), day(1), Achievements);
  const r2 = L.recordEaten(pet, fish(), day(1), Achievements);
  const r3 = L.recordEaten(pet, fish(), day(1), Achievements);
  assert.deepEqual(r1.counted, ['fish-fan']);
  assert.deepEqual(r2.counted, ['fish-fan']);
  assert.deepEqual(r3.counted, []);
  assert.deepEqual(r3.capped, ['fish-fan']);
  assert.deepEqual(L.progress(pet, fishFan, day(1)), { count: 2, goal: 20, today: 2, perDay: 2, done: false });
});

test('the daily limit resets at midnight on the phone, not after 24 hours', () => {
  const pet = fresh();
  L.recordEaten(pet, fish(), new Date(2026, 9, 1, 23, 50), Achievements);
  L.recordEaten(pet, fish(), new Date(2026, 9, 1, 23, 55), Achievements);
  const next = L.recordEaten(pet, fish(), new Date(2026, 9, 2, 0, 5), Achievements);
  assert.deepEqual(next.counted, ['fish-fan']);
  assert.equal(L.progress(pet, fishFan, day(2)).count, 3);
  assert.equal(L.progress(pet, fishFan, day(2)).today, 1);
});

test('today shows 0 again on a new day before anything is eaten', () => {
  const pet = fresh();
  L.recordEaten(pet, fish(), day(1), Achievements);
  assert.equal(L.progress(pet, fishFan, day(2)).today, 0);
  assert.equal(L.progress(pet, fishFan, day(2)).count, 1);
});

test('the penguin skin unlocks on the tenth day of feeding fish, not before', () => {
  const pet = fresh();
  assert.equal(L.isUnlocked(pet, 'skin', 'penguin', Achievements, FreeUnlocks), false);
  let unlockedOn = null;
  for (let d = 1; d <= 15 && !unlockedOn; d++) {
    for (let i = 0; i < 5; i++) {
      const r = L.recordEaten(pet, fish(), day(d), Achievements);
      if (r.unlocked.some((a) => a.unlocks.id === 'penguin')) unlockedOn = d;
    }
  }
  assert.equal(unlockedOn, 10);
  assert.equal(L.isUnlocked(pet, 'skin', 'penguin', Achievements, FreeUnlocks), true);
  assert.equal(L.isUnlocked(pet, 'species', 'birdie', Achievements, FreeUnlocks), true, 'earning a skin opens its species too');
  assert.equal(L.progress(pet, fishFan, day(10)).done, true);
});

test('a finished goal stops counting and only unlocks once', () => {
  const pet = fresh();
  pet.achievements['fish-fan'] = { count: 20, day: '2026-10-01', today: 2 };
  const r = L.recordEaten(pet, fish(), day(5), Achievements);
  assert.deepEqual(r.counted, []);
  assert.deepEqual(r.unlocked, []);
  assert.equal(pet.achievements['fish-fan'].count, 20);
});

test('an item only counts for goals it matches', () => {
  const pet = fresh();
  const r = L.recordEaten(pet, carrot, day(1), Achievements);
  assert.deepEqual(r.counted, ['veggie-hero']);
  assert.equal(pet.achievements['fish-fan'], undefined);
  assert.deepEqual(L.recordEaten(pet, { text: 'tissues', emoji: '🧻', cat: 'nonfood' }, day(1), Achievements).counted, []);
});

test('putting an item back the same day takes its count back', () => {
  const pet = fresh();
  const item = fish();
  const r = L.recordEaten(pet, item, day(1), Achievements);
  L.refundEaten(pet, { ...item, counted: r.counted, countedDay: L.dayKey(day(1)) }, day(1), Achievements);
  assert.deepEqual(L.progress(pet, fishFan, day(1)), { count: 0, goal: 20, today: 0, perDay: 2, done: false });
  // and ticking it on and off cannot get past the daily limit
  for (let i = 0; i < 6; i++) {
    const it = fish();
    const again = L.recordEaten(pet, it, day(1), Achievements);
    L.refundEaten(pet, { ...it, counted: again.counted, countedDay: L.dayKey(day(1)) }, day(1), Achievements);
  }
  L.recordEaten(pet, fish(), day(1), Achievements);
  L.recordEaten(pet, fish(), day(1), Achievements);
  L.recordEaten(pet, fish(), day(1), Achievements);
  assert.equal(L.progress(pet, fishFan, day(1)).count, 2);
});

test('putting back something eaten on an earlier day keeps the count', () => {
  const pet = fresh();
  const item = fish();
  const r = L.recordEaten(pet, item, day(1), Achievements);
  L.refundEaten(pet, { ...item, counted: r.counted, countedDay: L.dayKey(day(1)) }, day(2), Achievements);
  assert.equal(L.progress(pet, fishFan, day(2)).count, 1);
});

test('putting back the item that finished a goal keeps it unlocked', () => {
  const pet = fresh();
  pet.achievements['fish-fan'] = { count: 19, day: '2026-10-05', today: 0 };
  const item = fish();
  const r = L.recordEaten(pet, item, day(5), Achievements);
  assert.equal(r.unlocked.length, 1);
  L.refundEaten(pet, { ...item, counted: r.counted, countedDay: L.dayKey(day(5)) }, day(5), Achievements);
  assert.equal(L.isUnlocked(pet, 'skin', 'penguin', Achievements, FreeUnlocks), true);
});

test('a finished shopping trip counts once a day', () => {
  const pet = fresh();
  const tidy = Achievements.find((a) => a.id === 'tidy-shopper');
  assert.deepEqual(L.recordTrip(pet, trip(3), day(1), Achievements).counted, ['tidy-shopper']);
  assert.deepEqual(L.recordTrip(pet, trip(3), day(1), Achievements).capped, ['tidy-shopper']);
  L.recordTrip(pet, trip(3), day(2), Achievements);
  assert.equal(L.progress(pet, tidy, day(2)).count, 2);
});

test('Mochi, Cat, Dog, Pig, the top hat, boy cap and cow hoodie are free; the rest are locked at first', () => {
  const pet = fresh();
  const open = (k, id) => L.isUnlocked(pet, k, id, Achievements, FreeUnlocks);
  for (const id of ['mochi', 'pig', 'kitty', 'puppy']) assert.ok(open('species', id), id);
  for (const id of ['bunny', 'birdie', 'cow', 'hamster']) assert.ok(!open('species', id), id);
  assert.ok(!open('skin', 'penguin'), 'the penguin skin is earned');
  assert.ok(open('skin', 'parrot'), 'the parrot skin is free for now');
  assert.ok(open('hat', 'none'));
  assert.ok(open('hat', 'tophat'));
  assert.ok(open('hat', 'cap'));
  assert.ok(open('hat', 'hoodie'));
  assert.ok(!open('hat', 'maid'));
  assert.ok(!open('hat', 'sunhat'));
});

test('each locked item has exactly one goal that opens it', () => {
  for (const [kind, id] of [['skin', 'penguin'], ['species', 'bunny'], ['hat', 'maid'], ['hat', 'sunhat']]) {
    assert.equal(Achievements.filter((a) => a.unlocks.kind === kind && a.unlocks.id === id).length, 1);
    assert.equal(L.gateFor(kind, id, Achievements).unlocks.id, id);
  }
  assert.equal(L.gateFor('species', 'mochi', Achievements), null);
});

test('progress is saved with the pet and survives a reload', () => {
  const pet = fresh();
  L.recordEaten(pet, fish(), day(1), Achievements);
  const raw = JSON.stringify({ items: [], overrides: {}, pet });
  const back = L.parseState(raw, () => 'x').pet;
  assert.equal(L.progress(back, fishFan, day(1)).count, 1);
  assert.equal(L.progress(back, fishFan, day(1)).today, 1);
});

// ---------- fair play ----------

test('an item ticked off right after adding it does not count', () => {
  const pet = fresh();
  const added = day(1, 12).getTime();
  const quick = { text: 'salmon', emoji: '🐟', cat: 'protein', added };
  const r = L.recordEaten(pet, quick, new Date(added + 60 * 1000), Achievements);
  assert.deepEqual(r.counted, []);
  assert.equal(r.blocked, 'too-fast');
  const later = L.recordEaten(pet, quick, new Date(added + L.FRESH_MS), Achievements);
  assert.deepEqual(later.counted, ['fish-fan']);
});

test('the wait before an item counts is 15 minutes', () => {
  assert.equal(L.FRESH_MS, 15 * 60 * 1000);
  const added = day(1, 12).getTime();
  const item = { text: 'tuna', emoji: '🐟', cat: 'protein', added };
  assert.equal(L.recordEaten(fresh(), item, new Date(added + 14 * 60 * 1000), Achievements).blocked, 'too-fast');
  assert.deepEqual(L.recordEaten(fresh(), item, new Date(added + 15 * 60 * 1000), Achievements).counted, ['fish-fan']);
});

test('new items remember when they were added; old saved items still count', () => {
  const now = day(1).getTime();
  assert.equal(L.createItem('Salmon', {}, 'a', now).added, now);
  assert.equal(L.createItem('Salmon', {}, 'a').added, undefined);
  assert.deepEqual(L.recordEaten(fresh(), { text: 'salmon', emoji: '🐟', cat: 'protein' }, day(1), Achievements).counted, ['fish-fan']);
});

test('the same item only counts once a day', () => {
  const pet = fresh();
  const salmon = () => ({ text: 'Salmon', emoji: '🐟', cat: 'protein' });
  assert.deepEqual(L.recordEaten(pet, salmon(), day(1), Achievements).counted, ['fish-fan']);
  const again = L.recordEaten(pet, { text: '2x salmon', emoji: '🐟', cat: 'protein' }, day(1), Achievements);
  assert.equal(again.blocked, 'repeat');
  assert.deepEqual(again.counted, []);
  assert.deepEqual(L.recordEaten(pet, salmon(), day(2), Achievements).counted, ['fish-fan']);
});

test('putting an item back frees its word for later that day', () => {
  const pet = fresh();
  const item = { text: 'salmon', emoji: '🐟', cat: 'protein' };
  const r = L.recordEaten(pet, item, day(1), Achievements);
  L.refundEaten(pet, { ...item, counted: r.counted, countedDay: L.dayKey(day(1)) }, day(1), Achievements);
  assert.deepEqual(L.recordEaten(pet, item, day(1), Achievements).counted, ['fish-fan']);
  assert.equal(L.progress(pet, fishFan, day(1)).count, 1);
});

test('turning the clock back pauses counting until real time catches up', () => {
  const pet = fresh();
  L.recordEaten(pet, fish(), day(10), Achievements);
  const back = L.recordEaten(pet, fish(), day(3), Achievements);
  assert.equal(back.blocked, 'clock');
  assert.deepEqual(back.counted, []);
  assert.equal(L.recordTrip(pet, trip(3), day(3), Achievements).blocked, 'clock');
  // a small slip (like a network time fix) is fine
  const slip = new Date(day(10).getTime() - 5 * 60 * 1000);
  assert.deepEqual(L.recordEaten(pet, fish(), slip, Achievements).counted, ['fish-fan']);
  assert.deepEqual(L.recordEaten(pet, fish(), day(11), Achievements).counted, ['fish-fan']);
});

test('a finished list only counts as a trip with 3 or more items', () => {
  const pet = fresh();
  assert.equal(L.recordTrip(pet, trip(2), day(1), Achievements).blocked, 'small-trip');
  assert.deepEqual(L.recordTrip(pet, trip(3), day(1), Achievements).counted, ['tidy-shopper']);
});

test('items added just now do not make a list a real trip', () => {
  const pet = fresh();
  const now = day(1);
  const items = trip(3).map((i) => ({ ...i, added: now.getTime() - 60 * 1000 }));
  assert.equal(L.recordTrip(pet, items, now, Achievements).blocked, 'small-trip');
});

test('the fair-play memory is saved with the pet', () => {
  const pet = fresh();
  L.recordEaten(pet, { text: 'salmon', emoji: '🐟', cat: 'protein' }, day(1), Achievements);
  const back = L.parseState(JSON.stringify({ items: [], pet }), () => 'x').pet;
  assert.deepEqual(back.guard.words, ['salmon']);
  assert.equal(back.guard.lastSeen, day(1).getTime());
});

test('every skin belongs to a species that is drawn, and has its colours', () => {
  const { Skins } = require('./load');
  const fs = require('fs'), path = require('path');
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.equal(new Set(Skins.map((s) => s.id)).size, Skins.length);
  for (const s of Skins) {
    assert.match(html, new RegExp('data-sp="' + s.base + '"'), s.id + ' is on a species that exists');
    assert.match(css, new RegExp('data-skin="' + s.id + '"\\] \\{ --pet-skin'), s.id + ' has colours');
  }
});
