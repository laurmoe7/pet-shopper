const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic, Wardrobe, Decor } = require('./load');

function ids() { let n = 0; return () => 'id' + (n++); }

test('a first launch opens with the sample list and the default pet', () => {
  const s = PetLogic.parseState(null, ids());
  assert.equal(s.items.length, 8);
  assert.equal(s.items[0].text, 'Bananas');
  assert.equal(s.items[0].emoji, '🍌');
  assert.ok(s.items.every((i) => !i.done));
  assert.deepEqual(s.pet, { name: 'Nibble', species: 'mochi', skin: '', outfit: { hat: 'none', body: 'none', face: 'none', mouth: 'none', neck: 'none', feet: 'none' }, achievements: {}, room: {}, closet: [], personality: 'foodie', tastes: {}, stamps: {}, gifts: {}, prizes: {}, favourites: {}, dozing: '', treats: { day: '', used: [] }, guard: { day: '', words: [], lastSeen: 0 } });
});

test('broken saved data falls back to a fresh start', () => {
  const s = PetLogic.parseState('{not json', ids());
  assert.equal(s.items.length, 8);
  assert.equal(s.pet.name, 'Nibble');
});

test('name, species and hat survive a save and load', () => {
  const s = PetLogic.parseState(null, ids());
  s.pet.name = 'Mugi';
  s.pet.species = 'birdie';
  s.pet.skin = 'parrot';
  s.pet.outfit.hat = 'sunhat';
  s.pet.outfit.face = 'shades';
  const back = PetLogic.parseState(JSON.stringify(s), ids());
  assert.deepEqual(back.pet, { name: 'Mugi', species: 'birdie', skin: 'parrot', outfit: { hat: 'sunhat', body: 'none', face: 'shades', mouth: 'none', neck: 'none', feet: 'none' }, achievements: {}, room: {}, closet: [], personality: 'foodie', tastes: {}, stamps: {}, gifts: {}, prizes: {}, favourites: {}, dozing: '', treats: { day: '', used: [] }, guard: { day: '', words: [], lastSeen: 0 } });
  assert.deepEqual(back.items, s.items);
});

test('older saves without pet details get the defaults', () => {
  const old = JSON.stringify({ items: [], overrides: {}, quiet: true });
  const s = PetLogic.parseState(old, ids());
  assert.deepEqual(s.pet, { name: 'Nibble', species: 'mochi', skin: '', outfit: { hat: 'none', body: 'none', face: 'none', mouth: 'none', neck: 'none', feet: 'none' }, achievements: {}, room: {}, closet: [], personality: 'foodie', tastes: {}, stamps: {}, gifts: {}, prizes: {}, favourites: {}, dozing: '', treats: { day: '', used: [] }, guard: { day: '', words: [], lastSeen: 0 } });
  assert.equal(s.quiet, true);
  const noHat = PetLogic.parseState(JSON.stringify({ items: [], pet: { name: 'Bo', species: 'cow' } }), ids());
  assert.deepEqual(noHat.pet, { name: 'Bo', species: 'cow', skin: '', outfit: { hat: 'none', body: 'none', face: 'none', mouth: 'none', neck: 'none', feet: 'none' }, achievements: {}, room: {}, closet: [], personality: 'foodie', tastes: {}, stamps: {}, gifts: {}, prizes: {}, favourites: {}, dozing: '', treats: { day: '', used: [] }, guard: { day: '', words: [], lastSeen: 0 } });
});

test('wardrobe hats have unique ids and a drawing', () => {
  const hatIds = Wardrobe.map((w) => w.id);
  assert.deepEqual(hatIds, ['tophat', 'butterflyclip', 'redribbon', 'goggles', 'maid', 'sunhat', 'cap', 'hoodie', 'pighoodie', 'berrydress', 'hardhat', 'bandana', 'headphones', 'chefhat', 'knight', 'beret', 'bananapeel', 'trashlid', 'clownwig', 'jestercap', 'cowboyhat', 'sidecap', 'scarf', 'boa', 'toast', 'leaf', 'hay', 'necktie', 'uglytie', 'mustache', 'boots', 'featherslides', 'bunnyslippers', 'cowboyboots', 'clogs', 'clownshoes', 'shades', 'redspecs', 'eyepatch', 'nerdspecs', 'roundshades', 'bandage', 'clownnose']);
  assert.equal(new Set(hatIds).size, hatIds.length);
  for (const w of Wardrobe) {
    assert.ok(PetLogic.OUTFIT_SLOTS.includes(w.slot), w.id);
    assert.match(w.svg, /^<g[\s\S]*<\/g>$/);
    assert.ok(Array.isArray(w.lines) && w.lines.length > 0, w.id + ' needs dressing-room lines');
    assert.ok(!w.layer || w.layer === 'body', w.id);
  }
});

test('the cow hoodie covers the whole pet and tucks its ears away', () => {
  const hoodie = Wardrobe.find((w) => w.id === 'hoodie');
  assert.equal(hoodie.layer, 'body');
  assert.equal(hoodie.hood, true);
  // horns, ears and spots, with a hole for the face
  assert.match(hoodie.svg, /hood-horn/);
  assert.match(hoodie.svg, /hood-ear/);
  assert.match(hoodie.svg, /hood-spot/);
  assert.match(hoodie.svg, /fill-rule="evenodd"/);
});

test('the room has a rug, window, beanbag, clock, gaming desk and burger phone', () => {
  assert.deepEqual(Decor.map((d) => d.id), ['rug', 'window', 'beanbag', 'clock', 'desk', 'burgerphone']);
  assert.equal(Decor[0].id, 'rug', 'the rug is drawn first, under everything else');
  for (const d of Decor) {
    assert.ok(d.label && d.svg && d.view, d.id);
    assert.ok(d.x >= 0 && d.x <= 1 && d.y >= 0 && d.y <= 1, d.id + ' default spot is in the room');
    assert.ok(d.w > 0 && d.h > 0, d.id);
  }
});

test('decor can be placed, moved within the room and taken away', () => {
  const room = {};
  const win = Decor.find((d) => d.id === 'window');
  assert.equal(PetLogic.toggleDecor(room, win), true);
  assert.deepEqual(room.window, { x: win.x, y: win.y });
  assert.equal(PetLogic.moveDecor(room, 'window', 0.25, 0.5), true);
  assert.deepEqual(room.window, { x: 0.25, y: 0.5 });
  PetLogic.moveDecor(room, 'window', 1.7, -3);
  assert.deepEqual(room.window, { x: 1, y: 0 });
  assert.equal(PetLogic.moveDecor(room, 'clock', 0.5, 0.5), false);
  assert.equal(PetLogic.toggleDecor(room, win), false);
  assert.deepEqual(room, {});
});

test('the room is saved with the pet', () => {
  const s = PetLogic.parseState(null, ids());
  PetLogic.toggleDecor(s.pet.room, Decor[1]);
  const back = PetLogic.parseState(JSON.stringify(s), ids());
  assert.deepEqual(back.pet.room, { [Decor[1].id]: { x: Decor[1].x, y: Decor[1].y } });
});

test('options start all on and keep what was saved', () => {
  const fresh = PetLogic.parseState(null, ids()).settings;
  assert.ok(Object.values(fresh).every((v) => v === true));
  assert.ok('fairPlayTips' in fresh && 'suggestions' in fresh && 'daydreams' in fresh);
  assert.ok(!('bubbles' in fresh), 'speech bubbles are always on');
  const saved = PetLogic.parseState(JSON.stringify({ items: [], settings: { fairPlayTips: false, sounds: 'yes' } }), ids()).settings;
  assert.equal(saved.fairPlayTips, false);
  assert.equal(saved.sounds, true, 'a broken value falls back to the default');
  assert.equal(saved.goalToasts, true, 'options added later start on');
});

test('older saves get the dev switch off', () => {
  const s = PetLogic.parseState(JSON.stringify({ items: [] }), () => 1);
  assert.deepEqual(s.dev, { noWait: false });
  const on = PetLogic.parseState(JSON.stringify({ items: [], dev: { noWait: true } }), () => 1);
  assert.equal(on.dev.noWait, true);
});

test('renaming needs a double-tap: two taps close together, not one', () => {
  assert.equal(PetLogic.isDoubleTap(0, 1000), false, 'the first tap only remembers the time');
  assert.equal(PetLogic.isDoubleTap(1000, 1250), true);
  assert.equal(PetLogic.isDoubleTap(1000, 1000 + PetLogic.DOUBLE_TAP_MS + 1), false, 'too slow');
  assert.equal(PetLogic.isDoubleTap(2000, 1000), false, 'clock went backwards');
});

test('a typed name is tidied, and an empty one keeps the old name', () => {
  assert.equal(PetLogic.cleanName('  Mochi  ', 'Nibble'), 'Mochi');
  assert.equal(PetLogic.cleanName('   ', 'Mochi'), 'Mochi');
  assert.equal(PetLogic.cleanName('a really long pet name', 'x').length, 16);
  assert.equal(PetLogic.cleanName('', ''), 'Nibble');
});

test('sunglasses are their own slot, worn alongside a hat', () => {
  const faces = Wardrobe.filter((w) => w.slot === 'face').map((w) => w.id);
  assert.deepEqual(faces, ['shades', 'redspecs', 'eyepatch', 'nerdspecs', 'roundshades', 'bandage', 'clownnose']);
  const s = PetLogic.parseState(null, ids());
  s.pet.outfit.hat = 'hardhat';
  s.pet.outfit.face = 'shades';
  const back = PetLogic.parseState(JSON.stringify(s), ids());
  assert.deepEqual(back.pet.outfit, { hat: 'hardhat', body: 'none', face: 'shades', mouth: 'none', neck: 'none', feet: 'none' });
});

test('the new hat, bandana, headphones and sunglasses are free', () => {
  const { FreeUnlocks } = require('./load');
  for (const id of ['hardhat', 'bandana', 'headphones', 'chefhat', 'knight', 'shades', 'redspecs', 'eyepatch', 'nerdspecs']) assert.ok(FreeUnlocks.hat.includes(id), id);
});

test('clothes, mouth, neck and feet are their own slots, worn alongside a hat and glasses', () => {
  assert.deepEqual(PetLogic.OUTFIT_SLOTS, ['hat', 'body', 'face', 'mouth', 'neck', 'feet']);
  assert.deepEqual(Wardrobe.filter((w) => w.slot === 'body').map((w) => w.id), ['hoodie', 'pighoodie', 'berrydress']);
  const bySlot = (slot) => Wardrobe.filter((w) => w.slot === slot).map((w) => w.id);
  assert.deepEqual(bySlot('mouth'), ['toast', 'leaf', 'hay', 'mustache']);
  assert.deepEqual(bySlot('neck'), ['scarf', 'boa', 'necktie', 'uglytie']);
  assert.deepEqual(bySlot('feet'), ['boots', 'featherslides', 'bunnyslippers', 'cowboyboots', 'clogs', 'clownshoes']);
  const s = PetLogic.parseState(null, ids());
  Object.assign(s.pet.outfit, { hat: 'chefhat', body: 'none', face: 'nerdspecs', mouth: 'mustache', neck: 'boa', feet: 'featherslides' });
  const back = PetLogic.parseState(JSON.stringify(s), ids());
  assert.deepEqual(back.pet.outfit, { hat: 'chefhat', body: 'none', face: 'nerdspecs', mouth: 'mustache', neck: 'boa', feet: 'featherslides' });
  const { FreeUnlocks } = require('./load');
  for (const id of ['scarf', 'boa', 'boots', 'featherslides', 'bunnyslippers', 'bananapeel', 'trashlid', 'beret', 'roundshades', 'toast', 'necktie', 'uglytie', 'mustache', 'clownwig', 'jestercap', 'cowboyhat', 'sidecap', 'cowboyboots', 'clogs', 'clownshoes', 'clownnose', 'leaf', 'hay', 'butterflyclip', 'redribbon', 'goggles', 'bandage']) assert.ok(FreeUnlocks.hat.includes(id), id);
});

test('saves from before skins: the chick becomes a birdie, the penguin a birdie in a penguin skin', () => {
  const load = (species) => PetLogic.parseState(JSON.stringify({ items: [], pet: { species } }), ids()).pet;
  assert.equal(load('chick').species, 'birdie');
  assert.equal(load('chick').skin, '');
  assert.equal(load('penguin').species, 'birdie');
  assert.equal(load('penguin').skin, 'penguin');
  assert.equal(load('pig').species, 'pig');
  assert.equal(load('pig').skin, '');
});

test('a saved Syrian hamster skin is now the long-haired skin', () => {
  const s = PetLogic.parseState(JSON.stringify({ items: [], pet: { species: 'hamster', skin: 'syrian' } }), ids());
  assert.equal(s.pet.skin, 'longhair');
});

test('old saves wearing high heels get the feather slides', () => {
  const back = PetLogic.parseState(JSON.stringify({ items: [], pet: { outfit: { feet: 'heels' } } }), () => 'x');
  assert.equal(back.pet.outfit.feet, 'featherslides');
});

test('old saves: toast and mustache move from neck to mouth, the silk scarf is gone', () => {
  const load = (outfit) => PetLogic.parseState(JSON.stringify({ items: [], pet: { outfit } }), () => 'x').pet.outfit;
  assert.deepEqual(load({ neck: 'toast' }), { hat: 'none', body: 'none', face: 'none', mouth: 'toast', neck: 'none', feet: 'none' });
  assert.equal(load({ neck: 'silkscarf' }).neck, 'none');
  assert.equal(load({ neck: 'choker' }).neck, 'none');
});

test('the cow hoodie moved from hats to clothes in old saves', () => {
  const out = PetLogic.parseState(JSON.stringify({ items: [], pet: { outfit: { hat: 'hoodie' } } }), () => 'x').pet.outfit;
  assert.equal(out.body, 'hoodie');
  assert.equal(out.hat, 'none');
});
