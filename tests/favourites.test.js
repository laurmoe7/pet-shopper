const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L } = require('./load');

const at = (iso) => new Date(iso);
const item = (text, added, emoji = '🍌') => ({ text, emoji, cat: 'fruit', added: at(added).getTime() });
const pet = () => L.petProfile({});

test('an item bought counts once, and the list ranks by how often', () => {
  const p = pet();
  L.recordFavourite(p, item('bananas', '2026-10-01T08:00'), at('2026-10-01T09:00'));
  L.recordFavourite(p, item('bananas', '2026-10-02T08:00'), at('2026-10-02T09:00'));
  L.recordFavourite(p, item('milk', '2026-10-02T08:00', '🥛'), at('2026-10-02T09:00'));
  const top = L.topFavourites(p);
  assert.deepEqual(top.map((f) => [f.label, f.count]), [['Bananas', 2], ['Milk', 1]]);
});

test('the same item counts once a day, and only after 15 minutes on the list', () => {
  const p = pet();
  const day = at('2026-10-01T09:00');
  assert.ok(L.recordFavourite(p, item('bananas', '2026-10-01T08:00'), day));
  assert.equal(L.recordFavourite(p, item('bananas', '2026-10-01T08:00'), day), null, 'same day');
  assert.equal(L.recordFavourite(p, item('apples', '2026-10-01T08:55'), day), null, 'too fresh');
  assert.equal(L.topFavourites(p).length, 1);
});

test('putting an item back the same day takes the count back', () => {
  const p = pet();
  const now = at('2026-10-01T09:00');
  const mark = L.recordFavourite(p, item('bananas', '2026-10-01T08:00'), now);
  L.refundFavourite(p, mark, now);
  assert.equal(L.topFavourites(p).length, 0);
  // and it can count again
  assert.ok(L.recordFavourite(p, item('bananas', '2026-10-01T08:00'), now));
});

test('putting an item back on a later day keeps the count', () => {
  const p = pet();
  const mark = L.recordFavourite(p, item('bananas', '2026-10-01T08:00'), at('2026-10-01T09:00'));
  L.refundFavourite(p, mark, at('2026-10-02T09:00'));
  assert.equal(L.topFavourites(p)[0].count, 1);
});

test('a refund after an earlier count restores the earlier day, so tomorrow still counts', () => {
  const p = pet();
  L.recordFavourite(p, item('milk', '2026-10-01T08:00'), at('2026-10-01T09:00'));
  const now = at('2026-10-02T09:00');
  const mark = L.recordFavourite(p, item('milk', '2026-10-02T08:00'), now);
  L.refundFavourite(p, mark, now);
  assert.equal(L.topFavourites(p)[0].count, 1);
  assert.ok(L.recordFavourite(p, item('milk', '2026-10-02T08:00'), now));
});

test('the list is capped at ten by default and ties go to the more recent', () => {
  const p = pet();
  for (let i = 0; i < 12; i++) L.recordFavourite(p, item('thing ' + String.fromCharCode(97 + i), '2026-10-01T08:00'), at('2026-10-01T09:00'));
  assert.equal(L.topFavourites(p).length, 10);
  assert.equal(L.topFavourites(p, 3).length, 3);
  L.recordFavourite(p, item('thing z', '2026-10-02T08:00'), at('2026-10-02T09:00'));
  assert.equal(L.topFavourites(p)[0].label, 'Thing z');
});

test('a phone clock that went back does not count', () => {
  const p = pet();
  L.recordFavourite(p, item('milk', '2026-10-05T08:00'), at('2026-10-05T09:00'));
  assert.equal(L.recordFavourite(p, item('eggs', '2026-10-01T08:00'), at('2026-10-01T09:00')), null);
});

test('quantities are left out of the name, so 500g quark and quark are one favourite', () => {
  const p = pet();
  L.recordFavourite(p, item('500g Quark', '2026-10-01T08:00'), at('2026-10-01T09:00'));
  L.recordFavourite(p, item('quark', '2026-10-02T08:00'), at('2026-10-02T09:00'));
  assert.deepEqual(L.topFavourites(p).map((f) => [f.label, f.count]), [['Quark', 2]]);
});

test('saved favourites survive loading, and old saves load with none', () => {
  const p = pet();
  L.recordFavourite(p, item('milk', '2026-10-01T08:00'), at('2026-10-01T09:00'));
  const back = L.petProfile(JSON.parse(JSON.stringify(p)));
  assert.equal(L.topFavourites(back)[0].label, 'Milk');
  assert.deepEqual(L.petProfile({}).favourites, {});
});

test('skipping days moves favourites back, so the next day counts', () => {
  const state = { items: [], pet: pet() };
  const now = new Date();
  const it = { text: 'milk', emoji: '🥛', cat: 'dairy', added: now.getTime() - 3600e3 };
  const mark = L.recordFavourite(state.pet, it, now);
  it.fav = mark;
  state.items.push(it);
  L.skipDays(state, 1);
  assert.ok(L.recordFavourite(state.pet, { text: 'milk', emoji: '🥛', cat: 'dairy', added: 0 }, now));
});

test('Fumu remembers what you buy often: only after three times, and the top one is special', () => {
  const p = pet();
  const buy = (text, day) => L.recordFavourite(p, item(text, `2026-10-0${day}T08:00`), at(`2026-10-0${day}T09:00`));
  buy('milk', 1); buy('eggs', 1); buy('milk', 2); buy('eggs', 2);
  assert.equal(L.memoryLine(p, 'milk'), null, 'only twice so far');
  buy('milk', 3); buy('eggs', 3); buy('eggs', 4);
  assert.equal(L.memoryLine(p, 'Milk').key, 'memoryFav');
  assert.equal(L.memoryLine(p, 'Milk').vars.rank, 2);
  assert.equal(L.memoryLine(p, '2x eggs').key, 'memoryTop');
  assert.equal(L.memoryLine(p, 'eggs').vars.n, 4);
  assert.equal(L.memoryLine(p, 'bread'), null);
});

test('treats: three different ones a day, each once, and a new day starts fresh', () => {
  const p = pet();
  const day = at('2026-10-01T09:00');
  assert.deepEqual(L.giveTreat(p, 'apple', day), { ok: true, left: 2 });
  assert.deepEqual(L.giveTreat(p, 'apple', day), { ok: false, why: 'used' });
  assert.equal(L.giveTreat(p, 'carrot', day).left, 1);
  assert.equal(L.giveTreat(p, 'fish', day).left, 0);
  assert.deepEqual(L.giveTreat(p, 'bread', day), { ok: false, why: 'full' });
  assert.deepEqual(L.giveTreat(p, 'pizza', day), { ok: false, why: 'unknown' });
  assert.equal(L.giveTreat(p, 'apple', at('2026-10-02T09:00')).left, 2, 'a new day');
});

test('wishes: Fumu asks for a treat not fed yet, and stops once the day is full', () => {
  const p = pet();
  const day = at('2026-10-01T09:00');
  assert.ok(L.TREAT_WORDS.includes(L.nextWish(p, day, () => 0)));
  L.giveTreat(p, L.nextWish(p, day, () => 0), day);
  assert.notEqual(L.nextWish(p, day, () => 0), L.treatsToday(p, day)[0], 'never what was fed already');
  assert.ok(L.TREAT_WORDS.includes(L.nextWish(p, day, () => 0.999)), 'the top of the random range still works');
  L.giveTreat(p, L.nextWish(p, day, () => 0), day);
  L.giveTreat(p, L.nextWish(p, day, () => 0), day);
  assert.equal(L.nextWish(p, day, () => 0), null, 'three a day');
  assert.ok(L.nextWish(p, at('2026-10-02T09:00'), () => 0), 'a new day');
});

test('every treat is a real food with an emoji, so it can count for goals', () => {
  for (const word of L.TREAT_WORDS) {
    const item = L.createItem(word, {}, 'x');
    assert.notEqual(item.cat, 'mystery', word);
  }
});

test('treats count for goals but never for the Top 10', () => {
  const p = pet();
  const { Achievements } = require('./load');
  const item = L.createItem('carrot', {}, 'x');   // no added time, so it counts straight away
  const out = L.recordEaten(p, item, at('2026-10-01T09:00'), Achievements);
  assert.deepEqual(out.counted, ['veggie-hero']);
  assert.deepEqual(L.topFavourites(p), []);
});
