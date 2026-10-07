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

// the paint bucket: a 20 x 20 grid with a square line (wall) round the middle and a dot-shaped hole inside the filled part
function grid(w, h, rows) { const wall = new Uint8Array(w * h); rows(wall, (x, y) => { wall[y * w + x] = 1; }); return wall; }

test('bucket: fills inside a closed line and stops at it', () => {
  const w = 20, h = 20;
  const wall = grid(w, h, (a, set) => { for (let i = 5; i <= 14; i++) { set(i, 5); set(i, 14); set(5, i); set(14, i); } });
  const inside = L.floodMask(wall, w, h, 10, 10);
  assert.equal(inside.count, 8 * 8);
  assert.equal(inside.edge, false);
  assert.equal(inside.mask[10 * w + 10], 1);
  assert.equal(inside.mask[2 * w + 2], 0);
  const outside = L.floodMask(wall, w, h, 2, 2);
  assert.equal(outside.edge, true, 'an open area is reported as not closed');
  assert.equal(L.floodMask(wall, w, h, 5, 5), null, 'clicking on a line fills nothing');
});

test('bucket: an outline of the filled area comes back as one loop, and a hole as a second', () => {
  const w = 20, h = 20;
  const wall = grid(w, h, (a, set) => {
    for (let i = 5; i <= 14; i++) { set(i, 5); set(i, 14); set(5, i); set(14, i); }
    set(9, 9); set(10, 9); set(9, 10); set(10, 10);   // an island inside
  });
  const area = L.floodMask(wall, w, h, 7, 7);
  const loops = L.traceLoops(area.mask, w, h);
  assert.equal(loops.length, 2, 'the outside and the hole');
  const outer = loops.find((l) => l.some((p) => p[0] === 6 && p[1] === 6));
  assert.equal(outer.length, 4, 'a square has four corners');
  assert.ok(outer.some((p) => p[0] === 14 && p[1] === 14));
  const solid = L.traceLoops(L.floodMask(grid(w, h, () => {}), w, h, 1, 1).mask, w, h);
  assert.equal(solid.length, 1);
});

test('a bucket fill is written to the file as its own outline, with holes cut out', () => {
  const svg = L.sketchSvg([{ d: 'M0 0L10 0L10 10Z', pts: [[0, 0]], color: '#ff8fb1', width: 1, fill: true, closed: true, bucket: true }], { x: 0, y: 0, w: 100, h: 100 }, {});
  assert.match(svg, /d="M0 0L10 0L10 10Z"/);
  assert.match(svg, /fill-rule="evenodd"/);
  assert.match(svg, /fill="#ff8fb1"/);
});

test('transform tool: moving, resizing and turning leave the original alone and carry fills along', () => {
  const line = { pts: [[10, 0], [20, 0]], d: null, width: 2 };
  const moved = L.sketchXform(line, { kind: 'move', dx: 5, dy: -3 });
  assert.deepEqual(moved.pts, [[15, -3], [25, -3]]);
  assert.deepEqual(line.pts, [[10, 0], [20, 0]], 'the original is untouched');
  const big = L.sketchXform(line, { kind: 'scale', ax: 10, ay: 0, sx: 2, sy: 2 });
  assert.deepEqual(big.pts, [[10, 0], [30, 0]]);
  assert.equal(big.width, 4, 'the line gets thicker with the drawing');
  const turned = L.sketchXform(line, { kind: 'rotate', cx: 10, cy: 0, a: Math.PI / 2 });
  assert.deepEqual(turned.pts.map((p) => p.map((n) => Math.round(n))), [[10, 0], [10, 10]]);
  assert.equal(turned.width, 2);
  const fill = { pts: [[0, 0]], width: 1, d: 'M0 0L10 0L10 10Z' };
  assert.equal(L.sketchXform(fill, { kind: 'scale', ax: 0, ay: 0, sx: 2, sy: 3 }).d, 'M0 0L20 0L20 30Z');
  assert.equal(L.sketchXform(fill, { kind: 'move', dx: 1, dy: 1 }).d, 'M1 1L11 1L11 11Z');
});

test('lasso: a point is inside a loop only when the loop encloses it', () => {
  const loop = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(L.inPolygon(loop, [5, 5]), true);
  assert.equal(L.inPolygon(loop, [15, 5]), false);
  const notch = [[0, 0], [10, 0], [10, 10], [6, 10], [6, 4], [4, 4], [4, 10], [0, 10]];
  assert.equal(L.inPolygon(notch, [5, 8]), false, 'the gap of a U shape is outside');
  assert.equal(L.inPolygon(notch, [5, 2]), true);
});
