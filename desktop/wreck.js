// The wrecking ball's overlay window (see wreck.html). The page throws the toy; this window only draws cracks and falling pieces over the
// rectangles of the open windows, one piece at a time, and makes them whole again. It takes no clicks and never touches a real window. It only knows where the windows are (the same frames
// "Fumu sits on windows" uses, so awareness level 2), never what is in them: no screen picture is taken (it stalled the PC).
'use strict';

const path = require('path');

const MAX_WINDOWS = 8, MAX_MS = 25000;

/** @returns {{cols: number, rows: number}} How a window of this size is cut into pieces (the page and the overlay both use this). */
function gridFor(w, h) {
  return { cols: Math.max(3, Math.min(8, Math.round(w / 140))), rows: Math.max(2, Math.min(5, Math.round(h / 140))) };
}

/**
 * @param {Object} deps { BrowserWindow, allowed(): boolean, display(): Display, frames(): {x,y,width,height}[] (front first, in screen DIPs), raise(): void }
 * @returns {{start: function(): Promise<Object>, hit: function(number, number, number): void, fix: function(): Promise<void>, stop: function(): void}}
 */
function makeWreck(deps) {
  let ov = null, rects = [], origin = { x: 0, y: 0 }, timer = null;

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (ov && !ov.isDestroyed()) ov.destroy();
    ov = null; rects = [];
  }
  const run = (code) => { if (ov && !ov.isDestroyed()) ov.webContents.executeJavaScript(code).catch(() => {}); };
  const num = (n) => (isFinite(n) ? Math.round(+n) : 0);

  /** @returns {Promise<{ok: boolean, reason?: string, rects?: {x:number,y:number,w:number,h:number}[]}>} The windows' rectangles on his screen (screen DIPs), once the overlay is up. */
  async function start() {
    stop();
    if (!deps.allowed()) return { ok: false, reason: 'privacy' };
    const b = deps.display().bounds;
    const list = deps.frames().map((f) => {
      const x1 = Math.max(f.x, b.x), y1 = Math.max(f.y, b.y), x2 = Math.min(f.x + f.width, b.x + b.width), y2 = Math.min(f.y + f.height, b.y + b.height);
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }).filter((r) => r.w >= 200 && r.h >= 80).slice(0, MAX_WINDOWS).map((r) => Object.assign(r, gridFor(r.w, r.h)));
    origin = { x: b.x, y: b.y }; rects = list;
    ov = new deps.BrowserWindow({ x: b.x, y: b.y, width: b.width, height: b.height, frame: false, transparent: true, resizable: false, movable: false, skipTaskbar: true, focusable: false, hasShadow: false, show: false, alwaysOnTop: true, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    ov.setIgnoreMouseEvents(true);
    ov.setAlwaysOnTop(true, 'screen-saver');
    await new Promise((res) => { ov.webContents.once('did-finish-load', res); ov.loadFile(path.join(__dirname, 'wreck.html')).catch(res); });
    if (!ov || ov.isDestroyed()) return { ok: false, reason: 'gone' };
    run('wreck.init(' + b.width + ',' + b.height + ',' + JSON.stringify(list.map((r) => ({ x: r.x - b.x, y: r.y - b.y, w: r.w, h: r.h, cols: r.cols, rows: r.rows }))) + ')');
    ov.showInactive();
    deps.raise();   // (he and the toy stay in front of it)
    timer = setTimeout(stop, MAX_MS);   // (whatever happens, it never stays)
    return { ok: true, rects: list };
  }

  /** A piece (number k of the grid) of window i broke off where the ball was (screen DIPs). */
  function hit(i, k, x, y) {
    if (!ov || !isFinite(i) || i < 0 || i >= rects.length || !isFinite(k) || k < 0 || k >= rects[i].cols * rects[i].rows) return;
    run('wreck.hit(' + (i | 0) + ',' + (k | 0) + ',' + num(x - origin.x) + ',' + num(y - origin.y) + ')');
  }

  /** The windows are whole again (a short sparkle); resolves when it is done and the overlay is gone. */
  function fix() {
    if (!ov) return Promise.resolve();
    run('wreck.fix()');
    return new Promise((res) => setTimeout(() => { stop(); res(); }, 1700));
  }

  return { start, hit, fix, stop };
}

module.exports = { makeWreck, gridFor, MAX_WINDOWS, MAX_MS };
