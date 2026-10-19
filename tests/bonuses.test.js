const test = require('node:test');
const assert = require('node:assert/strict');
const { Bonuses: B, PetLogic: L } = require('./load');

const profile = () => L.petProfile({});
test('a plain day has no box: gifts only come on celebration days', () => {
  assert.deepEqual(B.boxesFor(new Date(2026, 5, 10), ''), []);
  assert.deepEqual(B.boxesFor(new Date(2026, 1, 14), '').map((b) => b.key), [], 'Valentine has no celebration, so no hat');
});
test('fixed dates, ranges, Easter and nth weekdays all match', () => {
  assert.ok(B.specialDays(new Date(2026, 1, 14), '').some((d) => d.id === 'valentine'));
  assert.ok(B.specialDays(new Date(2026, 11, 26), '').some((d) => d.id === 'xmas'), 'Christmas lasts three days');
  assert.equal(B.dayKey(B.easterOf(2026)), '2026-04-05');
  assert.ok(B.specialDays(new Date(2026, 3, 5), '').some((d) => d.id === 'easter'));
  assert.ok(B.specialDays(new Date(2026, 3, 3), '').some((d) => d.id === 'goodfriday'));
  const thanks = { id: 't', nth: [11, 4, 4] };
  B.DAYS.push(thanks);
  assert.ok(B.specialDays(new Date(2026, 10, 26), '').some((d) => d.id === 't'), '4th Thursday of November 2026 is the 26th');
  B.DAYS.pop();
});
test('every celebration day brings the hat Fumu wears in it, and every one is a gift hat in the wardrobe', () => {
  const { Wardrobe } = require('./load');
  const days = B.DAYS.filter((d) => d.party);
  assert.ok(days.length >= 6);
  days.forEach((d) => {
    assert.ok(d.hat && d.hatLabel && B.BOXES[d.box], d.id + ' has a hat, a label and a box look');
    const item = Wardrobe.filter((w) => w.id === d.hat)[0];
    assert.ok(item && item.slot === 'hat' && item.gift, d.hat + ' is a gift hat in wardrobe.js');
  });
  assert.deepEqual(B.boxesFor(new Date(2026, 0, 1), '').map((b) => b.hat), ['newyearhat']);
  assert.deepEqual(B.boxesFor(new Date(2026, 3, 5), '').map((b) => b.hat), ['bunnyears']);
  assert.deepEqual(B.boxesFor(new Date(2026, 9, 31), '').map((b) => b.hat), ['witchhat']);
  assert.deepEqual(B.boxesFor(new Date(2026, 11, 25), '').map((b) => b.hat), ['santahat']);
  assert.deepEqual(B.boxesFor(new Date(2026, 3, 27), '').map((b) => b.hat), ['kingscrown']);
});
test('the birthday brings the party hat only on that day', () => {
  assert.deepEqual(B.boxesFor(new Date(2026, 2, 9), '03-09').map((b) => b.hat), ['partyhat']);
  assert.deepEqual(B.boxesFor(new Date(2026, 2, 10), '03-09'), []);
});
test('a box unlocks its hat once and the hat is remembered', () => {
  const p = profile(), day = new Date(2026, 11, 25);
  assert.equal(B.owns(p, 'santahat'), false);
  assert.equal(B.unopened(p, day, '').length, 1);
  const got = B.open(p, 'xmasday', day, '');
  assert.ok(got && got.prize.id === 'santahat' && got.prize.hat);
  assert.equal(B.owns(p, 'santahat'), true);
  assert.equal(p.prizes.santahat, 1);
  assert.equal(B.open(p, 'xmasday', day, ''), null, 'not twice');
  assert.equal(B.unopened(p, day, '').length, 0);
  assert.equal(B.unopened(p, new Date(2027, 11, 25), '').length, 0, 'next year there is no new hat to give');
  assert.equal(B.dayOfHat('santahat').label, 'Christmas Day');
});
test('old days are forgotten and saved gifts survive parsing', () => {
  const p = profile();
  for (let i = 1; i <= 20; i++) { p.gifts = p.gifts || {}; p.gifts['2026-06-' + (i < 10 ? '0' : '') + i] = ['x']; }
  B.open(p, 'xmasday', new Date(2026, 11, 25), '');
  assert.ok(Object.keys(p.gifts).length <= 14);
  const again = L.petProfile(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(again.gifts, p.gifts);
  assert.equal(again.prizes.santahat, 1, 'the unlocked hat is saved');
  assert.deepEqual(L.parsePlayer({ name: ' Lauren ', birthday: 'nonsense' }), { name: 'Lauren', birthday: '' });
  assert.equal(L.parsePlayer(null, '03-09').birthday, '03-09', 'a birthday from build 196 moves to the player');
});
test('the next special day is found', () => {
  const next = B.nextSpecial(new Date(2026, 5, 10), '');
  assert.ok(next && next.inDays > 0);
});
test('a 29 February birthday is kept on the 28th outside leap years', () => {
  assert.ok(B.isBirthdayOn('02-29', new Date(2028, 1, 29)));
  assert.ok(!B.isBirthdayOn('02-29', new Date(2028, 1, 28)), 'a leap year has the real day');
  assert.ok(B.isBirthdayOn('02-29', new Date(2027, 1, 28)));
  assert.ok(B.isBirthdayOn('06-03', new Date(2027, 5, 3)));
  assert.ok(!B.isBirthdayOn('', new Date(2027, 5, 3)));
});
