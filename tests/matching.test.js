const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Foods, PetLogic } = require('./load');

const emoji = (text) => Foods.match(text).emoji;

test('common items get their emoji, singular and plural', () => {
  assert.equal(emoji('banana'), '🍌');
  assert.equal(emoji('Bananas'), '🍌');
  assert.equal(emoji('cherries'), '🍒');
  assert.equal(emoji('tomatoes'), '🍅');
  assert.equal(emoji('eggs'), '🥚');
});

test('quantities and punctuation are ignored', () => {
  assert.equal(emoji('2x Bananas'), '🍌');
  assert.equal(emoji('500g Quark'), '🧀');
  assert.equal(emoji('Milk 1L'), '🥛');
  assert.equal(emoji('apples x3'), '🍎');
  assert.equal(Foods.normalize('2x Bananas (ripe)'), 'bananas ripe');
});

test('the longest keyword wins', () => {
  assert.equal(emoji('oat milk'), '🥛');
  assert.equal(emoji('peanut butter'), '🥜');
  assert.equal(emoji('sweet potatoes'), '🍠');
  assert.equal(emoji('ice cream'), '🍨');
  assert.equal(emoji('tomato sauce'), '🥫');
});

test('categories come along with the emoji', () => {
  assert.equal(Foods.match('beer').cat, 'drink');
  assert.equal(Foods.match('chili flakes').cat, 'spicy');
  assert.equal(Foods.match('toilet paper').cat, 'nonfood');
  assert.equal(Foods.match('broccoli').cat, 'veg');
});

test('unknown items become a mystery gift', () => {
  const m = Foods.match('something weird');
  assert.equal(m.emoji, '🎁');
  assert.equal(m.cat, 'mystery');
  assert.equal(m.keyword, null);
});

test('a picked emoji is remembered for that word', () => {
  const overrides = { "oma's cake": '🎂' };
  assert.deepEqual(PetLogic.emojiFor("Oma's cake", overrides), { emoji: '🎂', cat: 'sweets' });
  assert.deepEqual(PetLogic.emojiFor('bananas', overrides), { emoji: '🍌', cat: 'fruit' });
});

test('every emoji the app can show has a bundled image', () => {
  for (const e of Foods.all) {
    const file = path.join(__dirname, '..', Foods.emojiFile(e));
    assert.ok(fs.existsSync(file), `missing ${file} for ${e}`);
  }
  assert.equal(Foods.emojiFile('🌶️'), 'emoji/1F336.svg');
});
