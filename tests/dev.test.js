const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L, Achievements, FreeUnlocks, Personalities } = require('./load');

const noon = new Date(2026, 9, 2, 12, 0, 0);
const fish = (t, added) => ({ text: t, emoji: '🐟', cat: 'protein', added });
const fishFan = Achievements.find((a) => a.id === 'fish-fan');

test('unlock everything finishes every goal and earns every personality', () => {
  const pet = L.petProfile();
  L.unlockAll(pet, Achievements, Personalities);
  for (const a of Achievements) assert.ok(L.progress(pet, a, noon).done, a.id);
  for (const p of Personalities) assert.ok(L.personalityProgress(pet, p).done, p.id);
  assert.ok(L.isUnlocked(pet, 'species', 'penguin', Achievements, FreeUnlocks));
});

test('lock everything again resets progress and anything now locked', () => {
  const pet = L.petProfile();
  L.unlockAll(pet, Achievements, Personalities);
  pet.species = 'penguin';
  pet.outfit.hat = 'cap';
  pet.personality = Personalities[Personalities.length - 1].id;
  L.lockAll(pet, Achievements, FreeUnlocks);
  for (const a of Achievements) assert.equal(L.progress(pet, a, noon).done, false, a.id);
  assert.equal(pet.species, 'mochi', 'a locked pet goes back to Mochi');
  assert.equal(pet.outfit.hat, 'cap', 'a free hat stays on');
  assert.equal(pet.personality, 'foodie');
  assert.deepEqual(pet.tastes, {});
});

test('skipping a day clears the daily limit and lets fresh items count', () => {
  const state = { items: [], pet: L.petProfile() };
  const old = noon.getTime() - 3600 * 1000;
  assert.equal(L.recordEaten(state.pet, fish('cod', old), noon, Achievements).counted.length > 0, true);
  assert.equal(L.recordEaten(state.pet, fish('tuna', old), noon, Achievements).counted.length > 0, true);
  assert.equal(L.recordEaten(state.pet, fish('salmon', old), noon, Achievements).counted.length, 0, 'third fish today is capped');

  const justAdded = fish('trout', noon.getTime());
  state.items.push(justAdded);
  L.skipDays(state, 1);
  assert.ok(justAdded.added < noon.getTime() - L.FRESH_MS, 'item now looks like it was added yesterday');
  const r = L.recordEaten(state.pet, justAdded, noon, Achievements);
  assert.ok(r.counted.includes(fishFan.id), 'counts again after a skipped day');
});
