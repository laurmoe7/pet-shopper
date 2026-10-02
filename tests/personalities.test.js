const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L, Foods, Personalities } = require('./load');

const day = (h = 12) => new Date(2026, 9, 1, h);
const food = (text) => ({ text, ...Foods.match(text) });

test('the personality list is valid data', () => {
  assert.equal(Personalities[0].id, 'foodie');
  assert.equal(Personalities[0].earn, null, 'the first personality is there from the start');
  assert.equal(new Set(Personalities.map((p) => p.id)).size, Personalities.length);
  for (const p of Personalities) {
    assert.ok(p.label && p.icon && p.text && p.likes.length && p.lines.length, p.id);
    if (p.earn) assert.ok(p.earn.count > 0 && p.earn.cats.length, p.id);
  }
});

test('every suggestion is a food that personality likes', () => {
  for (const p of Personalities) {
    for (const t of p.suggests) {
      const m = Foods.match(t);
      assert.ok(p.likes.includes(m.cat), `${p.id}: ${t} is ${m.cat}`);
    }
  }
});

test('a new pet is a foodie with no tastes yet', () => {
  const pet = L.petProfile();
  assert.equal(pet.personality, 'foodie');
  assert.deepEqual(pet.tastes, {});
});

test('feeding sweets earns the sweet tooth personality', () => {
  const pet = L.petProfile();
  const sweet = Personalities.find((p) => p.id === 'sweet');
  assert.equal(L.personalityProgress(pet, sweet).done, false);
  for (let i = 0; i < 9; i++) L.recordTaste(pet, food(i % 2 ? 'cookies' : 'bread'), day());
  assert.deepEqual(L.personalityProgress(pet, sweet), { count: 9, goal: 10, done: false });
  L.recordTaste(pet, food('donuts'), day());
  assert.equal(L.personalityProgress(pet, sweet).done, true);
});

test('only real food that sat on the list counts as a taste', () => {
  const pet = L.petProfile();
  assert.equal(L.recordTaste(pet, food('tissues'), day()), false);
  assert.equal(L.recordTaste(pet, food('zzzz'), day()), false);
  const quick = { ...food('cookies'), added: day().getTime() - 60 * 1000 };
  assert.equal(L.recordTaste(pet, quick, day()), false);
  assert.deepEqual(pet.tastes, {});
});

test('putting an item back takes its taste back', () => {
  const pet = L.petProfile();
  const tea = food('tea');
  L.recordTaste(pet, tea, day());
  L.refundTaste(pet, tea);
  assert.equal(pet.tastes.drink, 0);
  L.refundTaste(pet, tea);
  assert.equal(pet.tastes.drink, 0, 'never below zero');
});

test('personalities like their own kinds of food', () => {
  const green = Personalities.find((p) => p.id === 'green');
  assert.ok(L.likes(green, food('broccoli')));
  assert.ok(!L.likes(green, food('cookies')));
});

test('suggestions skip things already on the list', () => {
  const sipper = Personalities.find((p) => p.id === 'sipper');
  const items = sipper.suggests.slice(1).map((t, i) => L.createItem(t, {}, 'i' + i));
  assert.equal(L.suggestion(sipper, items, () => 0.99), sipper.suggests[0]);
  items.push(L.createItem(sipper.suggests[0], {}, 'x'));
  assert.equal(L.suggestion(sipper, items), null);
});

test('personality and tastes are saved with the pet', () => {
  const s = L.parseState(null, () => 'x');
  s.pet.personality = 'chef';
  L.recordTaste(s.pet, food('eggs'), day());
  const back = L.parseState(JSON.stringify(s), () => 'y').pet;
  assert.equal(back.personality, 'chef');
  assert.deepEqual(back.tastes, { dairy: 1 });
});

const KEYS = ['hi', 'tap', 'sleepy', 'suggest', 'decline', 'dream', 'idle', 'look', 'room', 'full', 'quick', 'spit', 'name'];

test('every personality has its own voice for every moment', () => {
  const seen = new Map();
  for (const p of Personalities) {
    assert.ok(p.voice && p.voice.tone && p.voice.style, p.id);
    for (const k of KEYS) {
      assert.ok(Array.isArray(p.voice[k]) && p.voice[k].length, p.id + ' has ' + k + ' lines');
      for (const line of p.voice[k]) {
        assert.ok(line.length <= 34, p.id + ' line is short: ' + line);
        assert.ok(!seen.has(line), line + ' is used by both ' + seen.get(line) + ' and ' + p.id);
        seen.set(line, p.id);
      }
    }
    assert.ok(p.voice.suggest.every((l) => l.includes('{x}')), p.id + ' suggestions name the item');
    assert.ok(p.voice.dream.every((l) => l.includes('{x}')), p.id + ' daydreams name the item');
    assert.ok(p.voice.name.every((l) => l.includes('{name}')), p.id + ' says its name');
  }
});

test('the tones Lauren asked for are all there', () => {
  const tones = Personalities.map((p) => p.voice.tone);
  for (const t of ['sassy', 'sweet', 'sleepy', 'excited']) assert.ok(tones.includes(t), t);
  assert.equal(new Set(tones).size, tones.length, 'each personality sounds different');
});

test('a personality line fills in the item and keeps its own tone', () => {
  const chef = Personalities.find((p) => p.voice.tone === 'sassy');
  const first = () => 0;
  assert.equal(L.voiceLine(chef, 'suggest', ['x'], { x: 'eggs' }, first), chef.voice.suggest[0].replace('{x}', 'eggs'));
  const plain = { id: 'plain', lines: [] };
  assert.equal(L.voiceLine(plain, 'tap', ['hi!'], {}, first), 'hi!', 'falls back without a voice');
});

test('other lines pick up the tone: sleepy is quiet and lower case, sweet adds hearts', () => {
  const sleepy = Personalities.find((p) => p.voice.tone === 'sleepy');
  const sweet = Personalities.find((p) => p.voice.tone === 'sweet');
  const sassy = Personalities.find((p) => p.voice.tone === 'sassy');
  const always = () => 0;
  const never = () => 0.99;
  assert.equal(L.styleLine(sleepy, 'HOT HOT HOT!', never), 'hot hot hot…');
  assert.equal(L.styleLine(sweet, 'yum yum!', always), 'aww, yum yum' + sweet.voice.style.endings[0]);
  assert.match(L.styleLine(sassy, 'tasty!', always), /^tasty, obviously$|^ugh, tasty, obviously$/);
  assert.equal(L.styleLine(sweet, 'is it ok?', never), 'is it ok?', 'questions keep their ending');
  assert.equal(L.styleLine(sleepy, 'Zzz… tea…', never, true), 'zzz… tea…');
});
