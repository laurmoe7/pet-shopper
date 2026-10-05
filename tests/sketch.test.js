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
