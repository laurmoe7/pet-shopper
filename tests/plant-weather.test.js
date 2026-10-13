const test = require('node:test');
const assert = require('node:assert/strict');
const { Weather: W, PetLogic: L } = require('./load');

test('weather codes and temperatures become the few kinds he reacts to', () => {
  assert.equal(W.classify(61, 10, 8), 'rain');
  assert.equal(W.classify(81, 18), 'rain');
  assert.equal(W.classify(96, 20), 'storm');
  assert.equal(W.classify(73, -1), 'snow');
  assert.equal(W.classify(0, 1, -4), 'cold', 'it is what it feels like that counts for cold');
  assert.equal(W.classify(1, 29), 'hot');
  assert.equal(W.classify(2, 15, 14), 'clear');
  assert.equal(W.classify(61, -5), 'rain', 'rain wins over the cold');
});
test('only a rounded position is sent, and a bad answer is not used', () => {
  assert.match(W.forecastUrl(52.3676, 4.9041), /latitude=52\.4&longitude=4\.9&/);
  assert.equal(W.parse({}), null);
  assert.equal(W.parse({ current: { temperature_2m: 'x', weather_code: 1 } }), null);
  assert.deepEqual(W.parse({ current: { temperature_2m: 12.4, apparent_temperature: 10.1, weather_code: 63 } }), { kind: 'rain', temp: 12, feels: 10 });
  assert.deepEqual(W.parsePlace({ results: [{ name: 'Utrecht', country: 'Netherlands', latitude: 52.0907, longitude: 5.1214 }] }), { lat: 52.1, lon: 5.1, place: 'Utrecht, Netherlands' });
  assert.equal(W.parsePlace({}), null);
});
test('every task ticked off waters the plant, up to three a day, and three drinks grow a stage', () => {
  const p = L.petProfile({});
  assert.deepEqual(p.plant, { water: 0, last: 0 });
  assert.equal(L.plantInfo(p.plant, 100).stage, 0);
  assert.equal(L.waterPlant(p, 100).watered, true);
  assert.equal(L.plantInfo(p.plant, 100).progress, 1, 'it is a little bigger after the first drink');
  assert.equal(L.waterPlant(p, 100).watered, true);
  const third = L.waterPlant(p, 100);
  assert.equal(third.grew, true); assert.equal(third.stage, 1);
  assert.equal(L.waterPlant(p, 100).watered, false, 'three a day');
  assert.equal(p.plant.water, 3);
  assert.equal(L.waterPlant(p, 101).watered, true, 'a new day, new drinks');
});
test('seven stages make a flower, which is picked at the next drink for a new seed', () => {
  const p = L.petProfile({});
  let day = 100, bloomed = 0, picked = 0;
  for (let n = 0; n < 21 + 1; n++) { if (n % 3 === 0) day++; const r = L.waterPlant(p, day); if (r.bloomed) bloomed++; if (r.picked) picked++; }
  assert.equal(bloomed, 1); assert.equal(picked, 1);
  assert.equal(L.plantInfo(p.plant, day).flowers, 1);
  assert.equal(L.plantInfo(p.plant, day).stage, 0);
});
test('the plant waits when days are missed and is thirsty after two', () => {
  const p = L.petProfile({});
  L.waterPlant(p, 200);
  assert.equal(L.plantInfo(p.plant, 201).thirsty, false);
  assert.equal(L.plantInfo(p.plant, 202).thirsty, true);
  for (let i = 0; i < 5; i++) L.waterPlant(p, 210);
  assert.equal(L.plantInfo(p.plant, 210).stage, 1, 'it did not die or go back');
});
test('a plant saved by the first builds (counted in days) keeps its stage', () => {
  const p = L.petProfile({ plant: { days: 4, last: 20737 } });
  assert.equal(L.plantInfo(p.plant, 20737).stage, 4);
  assert.equal(p.plant.water, 12);
});
test('ten flowers in turn, daisies, tulips, a sunflower and bluebells', () => {
  const { PlantArt } = globalThis;
  assert.ok(PlantArt.FLOWERS.length >= 8);
  const kinds = new Set(PlantArt.FLOWERS.map((f) => f.kind));
  for (const k of ['daisy', 'tulip', 'sunflower', 'bluebell']) assert.ok(kinds.has(k), k);
  for (let f = 0; f < PlantArt.FLOWERS.length; f++) for (let s = 0; s <= 6; s++) assert.ok(PlantArt.svg(s, f, false, 1).length > 100);
});
test('the day number is the same all day', () => {
  assert.equal(L.dayNumber(new Date(2026, 5, 1, 0, 5)), L.dayNumber(new Date(2026, 5, 1, 23, 55)));
  assert.equal(L.dayNumber(new Date(2026, 5, 2)) - L.dayNumber(new Date(2026, 5, 1)), 1);
});

test('a postcode can be typed instead of a city', () => {
  assert.equal(W.placeQuery('1011 AB'), '1011');
  assert.equal(W.placeQuery('1011ab'), '1011');
  assert.equal(W.placeQuery('SW1A 1AA'), 'SW1A');
  assert.equal(W.placeQuery('90210'), '90210');
  assert.equal(W.placeQuery('Utrecht'), 'Utrecht');
  assert.ok(/name=1011$/.test(W.searchUrl('1011 AB')));
  const found = W.parsePlace({ results: [
    { name: 'Lausanne', country: 'Switzerland', latitude: 46.5, longitude: 6.6, postcodes: ['1000', '1003'] },
    { name: 'Amsterdam', country: 'Netherlands', latitude: 52.37, longitude: 4.89, postcodes: ['1011', '1012'] }
  ] }, '1011 AB');
  assert.equal(found.place, 'Amsterdam, Netherlands');
});
