'use strict';
// The wrecking ball's overlay (desktop/wreck.js): it needs awareness level 2, only draws, and never stays.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeWreck, MAX_WINDOWS } = require('../desktop/wreck.js');
const privacy = require('../desktop/privacy.js');

function fakeWindowClass(log) {
  return class FakeWindow {
    constructor(opts) { this.opts = opts; this.destroyed = false; log.windows.push(this); this.webContents = { once: (ev, fn) => setImmediate(fn), executeJavaScript: (code) => { log.code.push(code); return Promise.resolve(); } }; }
    setIgnoreMouseEvents(v) { this.ignore = v; }
    setAlwaysOnTop() {}
    loadFile() { return Promise.resolve(); }
    showInactive() { this.shown = true; }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; }
  };
}

test('the wrecking ball needs awareness level 2 (it uses where the windows are)', () => {
  assert.equal(privacy.allows(1, 'wreck'), false);
  assert.equal(privacy.allows(2, 'wreck'), true);
});

test('without permission nothing opens', async () => {
  const log = { windows: [], code: [] };
  const w = makeWreck({ BrowserWindow: fakeWindowClass(log), allowed: () => false, display: () => ({ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }), frames: () => [], raise() {} });
  const r = await w.start();
  assert.equal(r.ok, false);
  assert.equal(log.windows.length, 0);
});

test('the overlay covers his screen, takes no clicks, clips and limits the windows, and goes away', async () => {
  const log = { windows: [], code: [] };
  const frames = [{ x: -100, y: 50, width: 800, height: 600 }, { x: 100, y: 100, width: 50, height: 50 }];
  for (let i = 0; i < 12; i++) frames.push({ x: 200 + i, y: 200, width: 400, height: 300 });
  const w = makeWreck({ BrowserWindow: fakeWindowClass(log), allowed: () => true, display: () => ({ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }), frames: () => frames, raise() {} });
  const r = await w.start();
  assert.equal(r.ok, true);
  assert.equal(r.rects.length, MAX_WINDOWS);
  assert.deepEqual(r.rects[0], { x: 0, y: 50, w: 700, h: 600 });   // clipped to the screen; the 50 px window is left out
  const ov = log.windows[0];
  assert.equal(ov.ignore, true);
  assert.equal(ov.opts.focusable, false);
  assert.equal(ov.opts.transparent, true);
  w.hit(0, 300, 200);
  w.hit(99, 1, 1);   // (no such window: ignored)
  assert.ok(log.code.some((c) => c.startsWith('wreck.hit(0,300,200)')));
  assert.equal(log.code.filter((c) => c.startsWith('wreck.hit(')).length, 1);
  await w.fix();
  assert.equal(ov.destroyed, true);
});

test('the overlay files are packed into the installer', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'desktop', 'package.json'), 'utf8'));
  assert.ok(pkg.build.files.includes('wreck.js'));
  assert.ok(pkg.build.files.includes('wreck.html'));
});
