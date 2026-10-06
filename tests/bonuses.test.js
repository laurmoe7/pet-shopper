const test = require('node:test');
const assert = require('node:assert/strict');
const { Bonuses: B, PetLogic: L } = require('./load');

const profile = () => L.petProfile({});
test('every day has a daily box and nothing else on a plain day', () => {
  const boxes = B.boxesFor(new Date(2026, 5, 10), '');
  assert.deepEqual(boxes.map((b) => b.key), ['daily']);
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
test('the birthday gives extra boxes only on that day', () => {
  assert.equal(B.boxesFor(new Date(2026, 2, 9), '03-09').length, 1 + 3);
  assert.equal(B.boxesFor(new Date(2026, 2, 10), '03-09').length, 1);
});
test('a box opens once, counts its prize and is remembered', () => {
  const p = profile(), day = new Date(2026, 5, 10);
  const got = B.open(p, 'daily', day, '', () => 0);
  assert.ok(got && got.prize.id);
  assert.equal(p.prizes[got.prize.id], 1);
  assert.equal(B.open(p, 'daily', day, '', () => 0), null, 'not twice');
  assert.equal(B.unopened(p, day, '').length, 0);
  assert.equal(B.unopened(p, new Date(2026, 5, 11), '').length, 1, 'a new day brings a new box');
});
test('old days are forgotten and saved gifts survive parsing', () => {
  const p = profile();
  for (let i = 1; i <= 20; i++) B.open(p, 'daily', new Date(2026, 5, i), '', () => 0);
  assert.ok(Object.keys(p.gifts).length <= 14);
  const again = L.petProfile(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(again.gifts, p.gifts);
  assert.equal(L.petProfile({ birthday: 'nonsense' }).birthday, '');
});
test('prizes are picked by weight and the next special day is found', () => {
  assert.equal(B.rollPrize('daily', () => 0).id, B.PRIZES.daily[0].id);
  assert.equal(B.rollPrize('daily', () => 0.999999).id, B.PRIZES.daily[B.PRIZES.daily.length - 1].id);
  const next = B.nextSpecial(new Date(2026, 5, 10), '');
  assert.ok(next && next.inDays > 0);
});
