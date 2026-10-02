const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Foods, Personalities } = require('./load');

test('pharmacy and superstore items get their own emoji and kind', () => {
  const cases = [
    ['cough syrup', '💊', 'health'], ['2x toothpaste', '🪥', 'health'], ['lipstick', '💄', 'health'],
    ['thermometer', '🌡️', 'health'], ['mop', '🪣', 'home'], ['broom', '🧹', 'home'], ['pillow', '🛏️', 'home'],
    ['phone charger', '🔌', 'stuff'], ['socks', '🧦', 'stuff'], ['lego', '🧸', 'stuff'], ['pens', '✏️', 'stuff'],
    ['video game', '🎮', 'stuff'], ['screwdriver', '🔧', 'stuff'], ['wrapping paper', '🎀', 'stuff']
  ];
  for (const [text, emoji, kind] of cases) {
    const m = Foods.match(text);
    assert.equal(m.emoji, emoji, text);
    assert.equal(m.cat, 'nonfood', text);
    assert.equal(Foods.kindOf(m.emoji), kind, text);
  }
});

test('food words still win over shop words', () => {
  assert.equal(Foods.match('plant milk').cat, 'dairy');
  assert.equal(Foods.match('chia seeds').cat, 'protein');
  assert.equal(Foods.match('water').cat, 'drink');
  assert.equal(Foods.match('water bottle').cat, 'nonfood');
});

test('every emoji the app can show has its picture', () => {
  for (const e of Foods.all) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', Foods.emojiFile(e))), e + ' ' + Foods.emojiFile(e));
  }
});

test('every personality comments on pharmacy, household and other shop items', () => {
  for (const p of Personalities) {
    for (const k of Foods.KINDS) assert.ok(p.voice[k] && p.voice[k].length >= 2, p.id + ' ' + k);
  }
});
