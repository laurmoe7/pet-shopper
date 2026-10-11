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
test('the plant grows one stage on each day something is ticked off, and a new seed starts after the flower', () => {
  const p = L.petProfile({});
  assert.deepEqual(p.plant, { days: 0, last: 0 });
  assert.equal(L.plantInfo(p.plant, 100).stage, 0);
  const first = L.waterPlant(p, 100);
  assert.equal(first.watered, true); assert.equal(first.stage, 1);
  assert.equal(L.waterPlant(p, 100).watered, false, 'once a day');
  for (let d = 101; d <= 105; d++) L.waterPlant(p, d);
  const info = L.plantInfo(p.plant, 105);
  assert.equal(info.stage, 6); assert.equal(info.bloom, true); assert.equal(info.flowers, 0);
  const next = L.waterPlant(p, 106);
  assert.equal(next.picked, true); assert.equal(next.stage, 0);
  assert.equal(L.plantInfo(p.plant, 106).flowers, 1);
});
test('the plant waits when days are missed and is thirsty after two', () => {
  const p = L.petProfile({});
  L.waterPlant(p, 200);
  assert.equal(L.plantInfo(p.plant, 201).thirsty, false);
  assert.equal(L.plantInfo(p.plant, 202).thirsty, true);
  L.waterPlant(p, 210);
  assert.equal(L.plantInfo(p.plant, 210).stage, 2, 'it did not die or go back');
});
test('the day number is the same all day', () => {
  assert.equal(L.dayNumber(new Date(2026, 5, 1, 0, 5)), L.dayNumber(new Date(2026, 5, 1, 23, 55)));
  assert.equal(L.dayNumber(new Date(2026, 5, 2)) - L.dayNumber(new Date(2026, 5, 1)), 1);
});
