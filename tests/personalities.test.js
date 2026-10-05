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

const KEYS = ['hi', 'tap', 'sleepy', 'suggest', 'decline', 'dream', 'idle', 'look', 'room', 'full', 'quick', 'spit', 'name', 'health', 'home', 'stuff'];

test('every personality has its own voice for every moment', () => {
  const seen = new Map();
  for (const p of Personalities) {
    assert.ok(p.voice && p.voice.tone && p.voice.style, p.id);
    for (const k of KEYS) {
      assert.ok(Array.isArray(p.voice[k]) && p.voice[k].length, p.id + ' has ' + k + ' lines');
      for (const line of p.voice[k]) {
        for (const part of line.split('\n')) assert.ok(part.length <= 34, p.id + ' line is short: ' + part);
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
  for (const t of ['sassy', 'grumpy', 'caring', 'silly', 'sweet', 'sleepy', 'excited']) assert.ok(tones.includes(t), t);
  assert.equal(new Set(tones).size, tones.length, 'each personality sounds different');
});

test('a personality line fills in the item and keeps its own tone', () => {
  const chef = Personalities.find((p) => p.id === 'chef');
  const first = () => 0;
  assert.equal(L.voiceLine(chef, 'suggest', ['x'], { x: 'eggs' }, first), chef.voice.suggest[0].replace('{x}', 'eggs'));
  const plain = { id: 'plain', lines: [] };
  assert.equal(L.voiceLine(plain, 'tap', ['hi!'], {}, first), 'hi!', 'falls back without a voice');
});

test('other lines pick up the tone: sleepy is quiet and lower case, sweet adds hearts', () => {
  const sleepy = Personalities.find((p) => p.voice.tone === 'sleepy');
  const sweet = Personalities.find((p) => p.voice.tone === 'sweet');
  const sassy = Personalities.find((p) => p.id === 'feisty');
  const always = () => 0;
  const never = () => 0.99;
  assert.equal(L.styleLine(sleepy, 'HOT HOT HOT!', never), 'hot hot hot…');
  assert.equal(L.styleLine(sweet, 'yum yum!', always), 'aww, yum yum' + sweet.voice.style.endings[0]);
  assert.match(L.styleLine(sassy, 'tasty!', always), /^tasty, obviously$|^nope, tasty, obviously$|^excuse me\? tasty, obviously$|^um, no\. tasty, obviously$/);
  assert.equal(L.styleLine(sweet, 'is it ok?', never), 'is it ok?', 'questions keep their ending');
  assert.equal(L.styleLine(sleepy, 'Zzz… tea…', never, true), 'zzz… tea…');
});

test('talking in its sleep is quiet, slow and mumbly', () => {
  const at = (r) => () => r;
  assert.equal(L.sleepTalk('Hi hi hi!', at(0.1)), 'mm… hi… hi hi…');
  assert.equal(L.sleepTalk("oh, it's you. hi.", at(0.5)), "*mumble* oh, it's you. hi…");
  assert.equal(L.sleepTalk('Shopping?', at(0.7)), 'shopping… zzz');
  assert.equal(L.sleepTalk('zzz… snack?', at(0.1)), 'zzz… snack…', 'already sleepy lines stay as they are');
  for (const r of [0, 0.3, 0.6, 0.9]) {
    const line = L.sleepTalk('YAY!! More please!', at(r));
    assert.ok(!/[!A-Z]/.test(line), 'no shouting: ' + line);
    assert.ok(line.includes('…'), 'trails off: ' + line);
  }
});

test('each personality has a short description and a name that fits its quirk', () => {
  for (const p of Personalities) {
    assert.ok(p.blurb && p.blurb.length <= 44, p.id + ' blurb is short');
    assert.ok(p.label.length <= 12, p.id + ' name fits a tile');
  }
  const byId = Object.fromEntries(Personalities.map((p) => [p.id, p]));
  assert.equal(byId.diva.voice.tone, 'diva');
  assert.equal(byId.nerd.voice.tone, 'nerdy');
  assert.match(byId.chef.label, /Grumpy/);
  assert.equal(byId.caring.voice.tone, 'caring');
  assert.equal(byId.joker.voice.tone, 'silly');
  assert.equal(byId.feisty.voice.tone, 'sassy');
  assert.match(byId.sipper.label, /Sleepy/);
});

test('the nerd follows its pi joke with a pie joke, in a second bubble', () => {
  const nerd = Personalities.find((p) => p.id === 'nerd');
  const line = L.voiceLine(nerd, 'sleepy', ['x'], {}, () => 0);
  const [first, second] = line.split('\n');
  assert.match(first, /pi is 3\.14/);
  assert.match(second, /pie is for my belly/);
});

test('the diva is earned with drinks only', () => {
  const diva = Personalities.find((p) => p.id === 'diva');
  assert.deepEqual(diva.earn.cats, ['drink']);
});

test('every personality icon has its emoji picture', () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const p of Personalities) assert.ok(fs.existsSync(path.join(__dirname, '..', Foods.emojiFile(p.icon))), p.id + ' icon ' + p.icon);
});
