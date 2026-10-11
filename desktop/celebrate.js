// The celebration overlay (build 629): when Mini Fumu celebrates a special day the player said yes to, this opens one transparent, click-through window over the whole
// screen that shows the same effects as the app (fireworks, snow, bats, a disco ball...). The effects are drawn by celebrate.html, which is loaded from the web with the
// rest of the page, so they update with a push; this file only makes the window, tells it where Fumu is and takes it away again. It takes no clicks and holds no data.
'use strict';

const KINDS = ['birthday', 'christmas', 'halloween', 'newyear', 'easter', 'kingsday'];
const MAX_MS = 40000;

/**
 * @param {Object} deps { BrowserWindow, display(): Display (the one Fumu is on), pageUrl(): string (the page's address, ending in /), raise(): void (Fumu comes back to the front) }
 * @returns {{start: function(string, Object): boolean, stop: function(): void}}
 */
function makeCelebrate(deps) {
  let ov = null, timer = null;

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (ov && !ov.isDestroyed()) ov.destroy();
    ov = null;
  }
  const num = (n, lo, hi) => Math.max(lo, Math.min(hi, isFinite(n) ? Math.round(+n) : 0));

  /**
   * @param {string} kind One of KINDS.
   * @param {{name?: string, ms?: number, total?: number, rect?: {x:number,y:number,w:number,h:number}, lang?: string}} o The player's name, how long the dance and the whole celebration take (ms), and where Fumu is (screen DIPs).
   * @returns {boolean} Whether the overlay was started.
   */
  function start(kind, o) {
    stop();
    if (!KINDS.includes(kind)) return false;
    o = o || {};
    const d = deps.display(), b = d.bounds, r = o.rect || {}, total = num(o.total, 3000, MAX_MS - 4000);
    const q = new URLSearchParams({ kind, name: String(o.name || '').slice(0, 24), ms: String(num(o.ms, 1000, 30000)), total: String(total), lang: o.lang === 'nl' ? 'nl' : 'en',
      x: String(num(r.x, -5000, 20000)), y: String(num(r.y, -5000, 20000)), w: String(num(r.w, 10, 2000)), h: String(num(r.h, 10, 2000)) });
    ov = new deps.BrowserWindow({ x: b.x, y: b.y, width: b.width, height: b.height, frame: false, transparent: true, resizable: false, movable: false, skipTaskbar: true, focusable: false, hasShadow: false, show: false, alwaysOnTop: true, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    ov.setIgnoreMouseEvents(true);
    ov.setAlwaysOnTop(true, 'screen-saver');
    const w = ov;
    w.webContents.once('did-finish-load', () => { if (ov === w && !w.isDestroyed()) { w.showInactive(); deps.raise(); } });
    w.webContents.once('did-fail-load', () => { if (ov === w) stop(); });
    w.loadURL(deps.pageUrl() + 'celebrate.html?' + q.toString()).catch(() => { if (ov === w) stop(); });
    timer = setTimeout(stop, total + 4000);   // (whatever happens, it never stays)
    return true;
  }

  return { start, stop };
}

module.exports = { makeCelebrate, KINDS };
