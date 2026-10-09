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

test('flip mirrors lines (and fills) across a line and keeps the width', () => {
  const line = { pts: [[10, 2], [14, 6]], d: null, width: 2 };
  assert.deepEqual(L.sketchXform(line, { kind: 'flip', axis: 'x', c: 10 }).pts, [[10, 2], [6, 6]]);
  assert.deepEqual(L.sketchXform(line, { kind: 'flip', axis: 'y', c: 5 }).pts, [[10, 8], [14, 4]]);
  assert.equal(L.sketchXform(line, { kind: 'flip', axis: 'x', c: 0 }).width, 2);
  assert.equal(L.sketchXform({ pts: [[0, 0]], width: 1, d: 'M0 0L4 0L4 4Z' }, { kind: 'flip', axis: 'x', c: 5 }).d, 'M10 0L6 0L6 4Z');
});

test('the saved SVG says which layer each line is on', () => {
  const svg = L.sketchSvg([{ pts: [[0, 0], [5, 5]], color: '#000', width: 1, layer: 'Shading' }], { x: 0, y: 0, w: 26, h: 26 }, {});
  assert.match(svg, /data-layer="Shading"/);
});

test('every cute shape fills its box and has enough points to draw smoothly', () => {
  assert.ok(L.SKETCH_SHAPES.length >= 12);
  L.SKETCH_SHAPES.forEach(([id]) => {
    const pts = L.sketchShape(id);
    assert.ok(pts.length >= 24, id + ' has points');
    pts.forEach((p) => { assert.ok(p[0] > -1e-9 && p[0] < 1 + 1e-9 && p[1] > -1e-9 && p[1] < 1 + 1e-9, id + ' stays in the box'); });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 0.99 && Math.max(...ys) - Math.min(...ys) > 0.99, id + ' fills the box');
  });
});

test('special lines: dash patterns scale with the width, and waves stay on the line', () => {
  assert.equal(L.sketchDash('solid', 2).array, null);
  assert.equal(L.sketchDash('dashed', 2).array, '6 4.4');
  assert.equal(L.sketchDash('stitch', 1).cap, 'butt');
  const svg = L.sketchSvg([{ pts: [[0, 0], [9, 9]], color: '#000', width: 1, style: 'dotted' }], { x: 0, y: 0, w: 26, h: 26 }, {});
  assert.match(svg, /stroke-dasharray="0.01 2.2"/);
  const wave = L.sketchWave([[0, 0], [30, 0]], 2, 10);
  assert.ok(Math.max(...wave.map((p) => Math.abs(p[1]))) > 1.5 && Math.abs(wave[0][1]) < 0.01 && Math.abs(wave[wave.length - 1][1]) < 0.2);
});

test('gradient fills and soft lines come with their definitions in the saved SVG', () => {
  const g = { type: 'v', c1: '#ff0000', c2: '#0000ff' };
  const svg = L.sketchSvg([
    { pts: [[0, 0], [10, 0], [10, 10]], color: '#000', width: 1, fill: true, closed: true, grad: g },
    { pts: [[0, 20], [20, 20]], color: '#f00', width: 4, style: 'soft' }
  ], { x: 0, y: 0, w: 26, h: 26 }, {});
  assert.match(svg, /<linearGradient id="gvff00000000ff" x1="0" y1="0" x2="0" y2="1">/);
  assert.match(svg, /fill="url\(#gvff00000000ff\)"/);
  assert.match(svg, /<filter id="b1_8"[^>]*><feGaussianBlur stdDeviation="1.8"\/>/);
  assert.match(svg, /filter="url\(#b1_8\)" opacity="0.7"/);
  assert.ok(svg.indexOf('<defs>') < svg.indexOf('<path'), 'definitions come first');
  assert.match(L.sketchGradDef({ type: 'r', c1: '#fff', c2: '#000' }), /radialGradient/);
});

test('clean export fits a few curves to a wobbly line and keeps corners', () => {
  const circle = [];
  for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2; circle.push([100 + Math.cos(a) * 50, 100 + Math.sin(a) * 50 + Math.sin(i * 7) * 0.3]); }
  const curves = L.fitCurve(circle, 0.5);
  assert.ok(curves.length >= 2 && curves.length <= 8, 'a circle is a handful of curves, not 120 points');
  // every original point lies close to the fitted curves
  const sample = [];
  curves.forEach((b) => { for (let t = 0; t <= 1; t += 0.004) { const u = 1 - t; sample.push([u * u * u * b[0][0] + 3 * u * u * t * b[1][0] + 3 * u * t * t * b[2][0] + t * t * t * b[3][0], u * u * u * b[0][1] + 3 * u * u * t * b[1][1] + 3 * u * t * t * b[2][1] + t * t * t * b[3][1]]); } });
  circle.forEach((p) => { assert.ok(Math.min(...sample.map((q) => Math.hypot(q[0] - p[0], q[1] - p[1]))) < 0.8); });
  const square = [];
  for (let i = 0; i < 20; i++) square.push([i * 5, 0]);
  for (let i = 0; i < 20; i++) square.push([100, i * 5]);
  for (let i = 0; i < 20; i++) square.push([100 - i * 5, 100]);
  for (let i = 0; i <= 20; i++) square.push([0, 100 - i * 5]);
  assert.equal(L.fitCurve(square, 0.8).length, 4, 'a square keeps its four sides');
  const svg = L.sketchSvg([{ pts: circle, color: '#000', width: 2, closed: true }], { x: 0, y: 0, w: 220, h: 220 }, {}, { clean: true });
  assert.match(svg, /d="M[^"]*C[^"]*Z"/);
  assert.ok(svg.length < L.sketchSvg([{ pts: circle, color: '#000', width: 2, closed: true }], { x: 0, y: 0, w: 220, h: 220 }, {}).length, 'smaller than the raw file');
});

test('a curve made with the Curve tool is written from its own points, and layers become named groups', () => {
  const s = { pts: [[0, 0], [10, 10]], color: '#000', width: 1, layer: 'Shading', cv: { closed: false, a: [{ p: [0, 0], o: [5, 0] }, { p: [10, 10], o: [5, 0] }] } };
  assert.equal(L.sketchPathClean(s, 1, 0.1), 'M0 0C5 0 5 10 10 10');
  const svg = L.sketchSvg([s], { x: 0, y: 0, w: 26, h: 26 }, {}, { clean: true });
  assert.match(svg, /<g id="shading" data-layer="Shading">/);
});

test('a drawing becomes a dressing-room entry that can be pasted into wardrobe.js', () => {
  const code = L.sketchItemCode([{ pts: [[60, 30], [100, 30]], color: '#ff8fab', width: 3 }], { id: 'pinkbar', label: "Lauren's bar", slot: 'hat', lines: ['cute!', "it's me"], note: 'a test' }, { x: -30, y: -50, w: 220, h: 220 });
  assert.match(code, /id: 'pinkbar', slot: 'hat', label: 'Lauren\\'s bar'/);
  assert.match(code, /icon: '\d+ \d+ \d+ \d+'/);
  assert.match(code, /lines: \['cute!', 'it\\'s me'\]/);
  const item = new Function('return ' + code.trim().replace(/,\s*$/, ''))();   // it is real JavaScript
  assert.equal(item.id, 'pinkbar');
  assert.match(item.svg, /^<g class="item-pinkbar">.*stroke="#ff8fab".*<\/g>$/);
});

test('every special line style gives a dash pattern that repeats evenly', () => {
  Object.keys(L.SKETCH_STYLES).filter((k) => k !== 'solid').forEach((k) => {
    const d = L.sketchDash(k, 2);
    assert.ok(d.array && d.array.split(' ').length % 2 === 0, k);
  });
});

test('pattern fills are SVG patterns drawn in the two colours', () => {
  L.SKETCH_PATTERNS.forEach((type) => {
    const g = { type, c1: '#ff0000', c2: '#00ff00', s: 12 };
    const def = L.sketchGradDef(g);
    assert.match(def, new RegExp('<pattern id="' + L.sketchGradId(g) + '"'));
    assert.ok(def.includes('#ff0000') && def.includes('#00ff00'), type);
  });
  const svg = L.sketchSvg([{ pts: [[0, 0], [9, 0], [9, 9]], color: '#ff0000', width: 1, fill: true, closed: true, grad: { type: 'dots', c1: '#ff0000', c2: '#ffffff', s: 5 } }], { x: 0, y: 0, w: 26, h: 26 }, {});
  assert.match(svg, /<pattern/);
  assert.match(svg, /fill="url\(#gdots/);
});

test('a clipped line stays inside the body in the saved SVG', () => {
  const svg = L.sketchSvg([{ pts: [[0, 0], [90, 90]], color: '#000', width: 2, clip: true }], { x: -30, y: -50, w: 220, h: 220 }, {});
  assert.match(svg, /<mask id="bodyclip"/);
  assert.match(svg, /mask="url\(#bodyclip\)"/);
});

test('a pressure line becomes a closed outline as wide as the pressure', () => {
  const pts = [[0, 0], [10, 0], [20, 0], [30, 0]];
  const poly = L.sketchRibbon(pts, [2, 4, 8, 2]);
  const ys = poly.map((p) => p[1]);
  assert.ok(poly.length > 8);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 3, 'it swells where the pen pressed');
  assert.ok(Math.max(...ys) - Math.min(...ys) < 9);
  assert.equal(L.sketchRibbon([[5, 5]], [4]).length, 14, 'a single press is a dot');
});

test('tracing: dark ink on paper becomes a mask, specks are dropped, colours are sorted into flat patches', () => {
  const w = 20, h = 20, px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 240; px[i * 4 + 3] = 255; }
  const dark = (x, y) => { const i = (y * w + x) * 4; px[i] = px[i + 1] = px[i + 2] = 30; };
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) dark(x, y);   // a square
  dark(1, 1);   // a speck
  const mask = L.despeckle(L.traceInk(px, w, h, 0), w, h, 4);
  assert.equal(mask[10 * w + 10], 1);
  assert.equal(mask[1 * w + 1], 0);
  assert.equal(mask.reduce((a, b) => a + b, 0), 100);
  assert.equal(L.traceLoops(mask, w, h).length, 1);
  const col = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const left = (i % w) < 10; col[i * 4] = left ? 255 : 0; col[i * 4 + 1] = 40; col[i * 4 + 2] = left ? 0 : 255; col[i * 4 + 3] = 255; }
  const r = L.traceColours(col, w, h, 2);
  assert.equal(r.palette.length, 2);
  assert.notEqual(r.labels[0], r.labels[w - 1]);
  assert.equal(r.labels[0], r.labels[5]);
});
