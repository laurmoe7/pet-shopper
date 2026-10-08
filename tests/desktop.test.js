// Where the desktop window goes (desktop/place.js: plain functions, no Electron).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../desktop/place.js');

const SIZE = { width: 320, height: 300 };
const screen1 = { x: 0, y: 0, width: 1920, height: 1040 };      // the taskbar takes the rest
const screen2 = { x: 1920, y: 0, width: 1280, height: 1024 };

test('the first time the window sits at the bottom right of the main screen', () => {
  const b = P.startBounds(null, SIZE, [screen1], screen1);
  assert.deepEqual(b, { x: 1920 - 320 - P.MARGIN, y: 1040 - 300 - P.MARGIN / 2, width: 320, height: 300 });
  assert.deepEqual(P.startBounds({ x: 'left', y: NaN }, SIZE, [screen1], screen1), b);
});

test('a saved position is kept when it is on a screen', () => {
  assert.deepEqual(P.startBounds({ x: 2100, y: 400 }, SIZE, [screen1, screen2], screen1), { x: 2100, y: 400, width: 320, height: 300 });
});

test('a position on a screen that is gone comes back to the main screen', () => {
  const b = P.startBounds({ x: 2100, y: 400 }, SIZE, [screen1], screen1);
  assert.equal(b.x + b.width <= screen1.x + screen1.width, true);
  assert.equal(b.y + b.height <= screen1.y + screen1.height, true);
});

test('a window that is mostly off screen is brought back, one partly over the edge is kept', () => {
  assert.notEqual(P.startBounds({ x: 1900, y: 400 }, SIZE, [screen1], screen1).x, 1900);   // 20 of 320 pixels visible
  assert.notEqual(P.startBounds({ x: 1800, y: 400 }, SIZE, [screen1], screen1).x, 1800);   // 120 of 320: under half
  assert.equal(P.startBounds({ x: 1700, y: 400 }, SIZE, [screen1], screen1).x, 1700);      // 220 of 320 are visible
});

test('visibleFraction counts the part inside a screen', () => {
  assert.equal(P.visibleFraction({ x: 0, y: 0, width: 100, height: 100 }, screen1), 1);
  assert.equal(P.visibleFraction({ x: -50, y: 0, width: 100, height: 100 }, screen1), 0.5);
  assert.equal(P.visibleFraction({ x: 5000, y: 0, width: 100, height: 100 }, screen1), 0);
});

test('the list opens around the pet and stays on the screen', () => {
  const pet = { x: 1576, y: 716, width: 320, height: 300 };
  const l = P.listBounds(pet, screen1, { width: 440, height: 780 });
  assert.equal(l.width, 440);
  assert.equal(l.height, 780);
  assert.ok(l.x >= 0 && l.x + l.width <= 1920 && l.y >= 0 && l.y + l.height <= 1040);
  const small = P.listBounds(pet, { x: 0, y: 0, width: 400, height: 600 }, { width: 440, height: 780 });
  assert.deepEqual([small.width, small.height], [400, 600]);   // never bigger than the screen
});

test('carrying the window moves it by the pointer distance and never changes its size', () => {
  const b = P.dragBounds({ x: 100, y: 200, width: 320, height: 300 }, 15.4, -30.6);
  assert.deepEqual(b, { x: 115, y: 169, width: 320, height: 300 });
});

test('the desktop package lists the files it needs and the page script is wired into the app', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../desktop/package.json'), 'utf8'));
  for (const f of pkg.build.files) assert.ok(fs.existsSync(path.join(__dirname, '../desktop', f)), f);
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.includes('src="app-desktop.js"'));
  assert.ok(html.indexOf('app-desktop.js') < html.indexOf('app-start.js'));
});

test('size names turn into zoom factors and unknown names are normal size', () => {
  const place = require('../desktop/place.js');
  assert.equal(place.sizeFactor('small'), 0.8);
  assert.equal(place.sizeFactor('large'), 1.3);
  assert.equal(place.sizeFactor('huge'), 1);
  assert.equal(place.sizeFactor('toString'), 1);
});

test('a resized window keeps its bottom middle in place and stays on the screen', () => {
  const place = require('../desktop/place.js');
  const r = place.resizeKeepingBottom({ x: 1000, y: 700, width: 320, height: 250 }, { width: 416, height: 325 });
  assert.deepEqual(r, { x: 952, y: 625, width: 416, height: 325 });
  const area = { x: 0, y: 0, width: 1920, height: 1040 };
  assert.deepEqual(place.within({ x: 1800, y: 900, width: 416, height: 325 }, area), { x: 1504, y: 715, width: 416, height: 325 });
});

test('nudging and corners move the window inside the work area', () => {
  const place = require('../desktop/place.js');
  const area = { x: 0, y: 0, width: 1920, height: 1040 }, b = { x: 100, y: 100, width: 320, height: 250 };
  assert.deepEqual(place.nudge(b, 20, -20, area), { x: 120, y: 80, width: 320, height: 250 });
  assert.equal(place.nudge(b, -500, 0, area).x, 0);
  assert.equal(place.nudge({ x: 1600, y: 100, width: 320, height: 250 }, 200, 0, area).x, 1600);
  const br = place.corner(b, area, 'br'), tl = place.corner(b, area, 'tl');
  assert.equal(br.x + br.width + place.MARGIN, 1920);
  assert.ok(br.y + br.height <= 1040 && br.y > 700);
  assert.deepEqual([tl.x, tl.y > 0], [place.MARGIN, true]);
});

test('a walk stops at the edge of the screen and keeps its height', () => {
  const place = require('../desktop/place.js');
  const area = { x: 0, y: 0, width: 1920, height: 1040 }, b = { x: 1500, y: 780, width: 320, height: 250 };
  assert.deepEqual(place.walkEnd(b, area, 200), { x: 1600, y: 780, width: 320, height: 250 });
  assert.equal(place.walkEnd(b, area, 900).x, 1600);
  assert.equal(place.walkEnd(b, area, -2000).x, 0);
});

test('peeking goes to the nearest side that has no other screen beside it', () => {
  const place = require('../desktop/place.js');
  const one = [{ x: 0, y: 0, width: 1920, height: 1080 }];
  const b = { x: 1500, y: 780, width: 320, height: 250 };
  const right = place.peekSpot(b, one);
  assert.equal(right.edge, 'right');
  assert.equal(right.bounds.x + right.bounds.width / 2, 1920);   // half of him is past the edge
  assert.equal(right.bounds.y, 780);
  assert.equal(place.peekSpot({ x: 100, y: 780, width: 320, height: 250 }, one).edge, 'left');
  // a second screen to the right: he must not show up on it, so he goes left
  const two = [{ x: 0, y: 0, width: 1920, height: 1080 }, { x: 1920, y: 0, width: 1920, height: 1080 }];
  assert.equal(place.peekSpot(b, two).edge, 'left');
  // screens on both sides: nowhere to peek
  const three = [{ x: -1920, y: 0, width: 1920, height: 1080 }].concat(two);
  assert.equal(place.peekSpot(b, three), null);
  assert.equal(place.peekSpot({ x: 9000, y: 0, width: 320, height: 250 }, one), null);
});

test('a glide eases from start to end and lands exactly', () => {
  const place = require('../desktop/place.js');
  const a = { x: 0, y: 500, width: 320, height: 250 }, z = { x: 400, y: 500, width: 320, height: 250 };
  assert.equal(place.tweenAt(a, z, 0).x, 0);
  assert.equal(place.tweenAt(a, z, 1).x, 400);
  assert.equal(place.tweenAt(a, z, 0.5).x, 200);
  assert.ok(place.tweenAt(a, z, 0.1).x < 40 && place.tweenAt(a, z, 0.9).x > 360);   // slow at both ends
});
