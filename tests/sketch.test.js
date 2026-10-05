const test = require('node:test');
const assert = require('node:assert/strict');
const { PetLogic: L } = require('./load');

test('sketch paths are smooth, short and close when asked', () => {
  assert.equal(L.sketchPath([], false, 1), '');
  assert.equal(L.sketchPath([[1, 2]], false, 1), 'M1 2h0.01');
  assert.equal(L.sketchPath([[0, 0], [10, 0], [10, 10]], false, 1), 'M0 0Q10 0 10 5L10 10');
  assert.ok(L.sketchPath([[0, 0], [10, 0], [10, 10]], true, 1).endsWith('Z'));
  assert.equal(L.sketchPath([[0.123456, 1]], false, 2), 'M0.12 1h0.01');
});

test('erasing hits a line near a point and misses far away', () => {
  const line = [[0, 0], [100, 0]];
  assert.ok(L.sketchHit(line, [50, 3], 4));
  assert.ok(!L.sketchHit(line, [50, 9], 4));
  assert.ok(L.sketchHit([[5, 5]], [6, 5], 2));   // a dot
  assert.ok(!L.sketchHit(line, [120, 0], 4));
});

test('the sketch file keeps the pet coordinates and the notes', () => {
  const svg = L.sketchSvg([{ pts: [[10, 20], [30, 40], [50, 20]], color: '#ff8fb1', width: 2, fill: true }], { x: -30, y: -50, w: 220, h: 220 }, { kind: 'hat', note: 'a -- <cute> hat' });
  assert.match(svg, /viewBox="-30 -50 220 220"/);
  assert.match(svg, /fill="#ff8fb1"/);
  assert.match(svg, /stroke-width="2"/);
  const inner = svg.split('\n')[1].slice(5, -4);
  assert.ok(!inner.includes('--') && !inner.includes('<'), 'the note cannot break out of the comment');
});

// a wobbly hand: the same shape every run
function wobble(pts, amount) { let seed = 7; return pts.map(([x, y]) => { seed = (seed * 9301 + 49297) % 233280; const a = seed / 233280 - 0.5; seed = (seed * 9301 + 49297) % 233280; const b = seed / 233280 - 0.5; return [x + a * amount, y + b * amount]; }); }
const HOW = { passes: 6, snap: true };

test('tidy: a wobbly straight line becomes a straight line', () => {
  const raw = wobble(Array.from({ length: 60 }, (_, i) => [10 + i * 2, 20 + i * 0.5]), 1.2);
  const t = L.tidyStroke(raw, 220, HOW);
  assert.equal(t.pts.length, 2);
  assert.ok(Math.abs(t.pts[0][0] - 10) < 2 && Math.abs(t.pts[1][0] - 128) < 3);
  assert.equal(t.closed, false);
});

test('tidy: a wobbly circle becomes a true ellipse and closes', () => {
  const raw = wobble(Array.from({ length: 80 }, (_, i) => [60 + 20 * Math.cos(i / 79 * 6.4), 70 + 20 * Math.sin(i / 79 * 6.4)]), 1.5);
  const t = L.tidyStroke(raw, 220, HOW);
  assert.equal(t.closed, true);
  for (const [x, y] of t.pts) assert.ok(Math.abs(Math.hypot(x - 60, y - 70) - 20) < 1.5);
});

test('tidy: a curve is smoothed but stays a curve, and snapping can be off', () => {
  const arc = Array.from({ length: 80 }, (_, i) => [20 + i * 1.5, 80 - 30 * Math.sin(i / 79 * Math.PI)]);
  const raw = wobble(arc, 2);
  const off = (p) => p.reduce((sum, [x, y]) => sum + Math.abs(y - (80 - 30 * Math.sin((x - 20) / 1.5 / 79 * Math.PI))), 0) / p.length;
  const t = L.tidyStroke(raw, 220, { passes: 6, snap: false });
  assert.ok(t.pts.length > 3 && t.pts.length < raw.length);
  assert.ok(off(t.pts) < off(raw) * 0.85, 'closer to the true curve than the wobbly hand was');
  assert.ok(Math.abs(t.pts[0][0] - raw[0][0]) < 1 && Math.abs(t.pts[t.pts.length - 1][0] - raw[79][0]) < 1.5);   // ends stay where they were drawn
  assert.equal(L.tidyStroke(raw, 220, { passes: 0, snap: true }).pts.length, raw.length);
});

test('tidy: a dot or a tiny scribble is left alone', () => {
  assert.equal(L.tidyStroke([[5, 5]], 220, HOW).pts.length, 1);
  assert.equal(L.tidyStroke([[5, 5], [5.2, 5.1], [5.1, 5.2], [5.2, 5.2]], 220, HOW).pts.length, 4);
});
