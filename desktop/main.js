// Fumu on your desktop (Windows first): a small transparent window that is always on top and shows the
// real app in "pet only" mode, a tray icon, and the whole app in a bigger window when you open your list.
// The app itself is loaded from the web (so a big push updates it), see NIBBLE_URL below.
'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell, session, clipboard, globalShortcut, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const place = require('./place.js');
const windows = require('./windows.js');
const keys = require('./keys.js');
const privacy = require('./privacy.js');
const createPanel = require('./panel-main.js');

const CHANNEL = require('./channel.js').pick(require('./package.json'));   // dev (follows main) or stable (follows only what was promoted)
const APP_URL = process.env.NIBBLE_URL || CHANNEL.url;
const PET_SIZE = { width: 320, height: 250 };
const LIST_SIZE = { width: 440, height: 780 };
const LOG = !!process.env.NIBBLE_LOG;
// Clicks pass through the transparent parts only where Electron can forward the pointer to the page (Windows, macOS).
// NIBBLE_NO_THROUGH=1 turns click-through off, for testing on other systems.
const THROUGH = !process.env.NIBBLE_NO_THROUGH;
const log = (...a) => { if (LOG) console.log('[desk]', ...a); };

if (!app.requestSingleInstanceLock()) { app.quit(); } else { start(); }

function start() {
  let peekRest = null, displaced = false, perch = null, perchTimer = null, updateReady = false, win = null, tray = null, mode = 'pet', petBounds = null, dragFrom = null, shown = false;
  const prefsFile = () => path.join(app.getPath('userData'), 'window.json');
  let prefs = { x: null, y: null, onTop: true, aboveFull: false, size: 'normal', roam: true, remind: true, hotkeys: true, idle: true, perch: false, hideToy: false, hideCushion: false, awareness: 2, keys: null };
  const DEFAULTS = Object.assign({}, prefs);
  try { prefs = Object.assign(prefs, JSON.parse(fs.readFileSync(prefsFile(), 'utf8'))); } catch (e) { /* first run */ }
  prefs.keys = keys.clean(prefs.keys);
  prefs.awareness = privacy.clean(prefs.awareness);
  const savePrefs = () => { try { fs.writeFileSync(prefsFile(), JSON.stringify(prefs)); } catch (e) { /* ignore */ } };
  const areas = () => screen.getAllDisplays().map((d) => d.workArea);
  const here = () => screen.getDisplayMatching(win.getBounds()).workArea;
  // Fumu's size is a zoom of the page (the window grows with it), so the drawing is never scaled by hand
  const zoom = () => place.sizeFactor(prefs.size);
  const petSize = () => ({ width: Math.round(PET_SIZE.width * zoom()), height: Math.round(PET_SIZE.height * zoom()) });
  const applyZoom = () => { if (win) win.webContents.setZoomFactor(mode === 'pet' ? zoom() : 1); };
  // on top of other windows; with "above full-screen apps" it also floats over a full-screen window (not exclusive-mode games)
  const applyTop = () => {
    if (!win || mode !== 'pet') return;
    win.setAlwaysOnTop(prefs.onTop, prefs.onTop && prefs.aboveFull ? 'screen-saver' : 'floating');
    if (prefs.onTop && prefs.aboveFull) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
    else win.setVisibleOnAllWorkspaces(false);
  };
  const publicPrefs = () => ({ roam: prefs.roam, remind: prefs.remind, size: prefs.size, idle: prefs.idle, perch: prefs.perch && windows.available() && privacy.allows(prefs.awareness, 'perch'), awareness: prefs.awareness, hideToy: prefs.hideToy, hideCushion: prefs.hideCushion });
  const sendPrefs = () => { if (win) win.webContents.send('desk:prefs', publicPrefs()); panel.push(); };
  // moves the window smoothly (walking, peeking round the screen edge); anything that takes hold of it stops the move
  let tween = null;
  function stopTween() { if (tween) { clearInterval(tween.timer); const done = tween.done; tween = null; done(false); } }
  function glide(to, ms, lift) {
    stopTween();
    return new Promise((resolve) => {
      if (!win || mode !== 'pet') { resolve(false); return; }
      const from = win.getBounds(), t0 = Date.now();
      const timer = setInterval(() => {
        if (!win) { stopTween(); return; }
        const t = Math.min(1, (Date.now() - t0) / Math.max(1, ms));
        win.setBounds(lift ? place.arcAt(from, to, t, lift) : place.tweenAt(from, to, t));
        if (t >= 1) { clearInterval(timer); tween = null; resolve(true); }
      }, 16);
      tween = { timer, done: resolve };
    });
  }
  function restHere() { const b = win.getBounds(); prefs.x = b.x; prefs.y = b.y; displaced = false; savePrefs(); }

  // ---------- sitting on other windows (a switch in the menu, off by default; Windows only) ----------
  // `perch` is {id, dx}: the window he sits on and how far across it he is. While it is set he rides along when that window
  // moves and drops to the floor when it closes, is covered or minimized. His own resting place (prefs.x/y) is not changed.
  const PERCH_TICK = 250;
  const frames = () => windows.list().map((w) => Object.assign({ id: w.id }, screen.screenToDipRect(null, { x: w.x, y: w.y, width: w.width, height: w.height })));
  const perchesNow = () => place.perches(frames(), areas(), petSize().height * 0.6);
  function tellPerched() { if (win) win.webContents.send('desk:perched', !!perch); }
  function stopFollow() { if (perchTimer) { clearInterval(perchTimer); perchTimer = null; } }
  function leavePerch() { if (!perch) return; perch = null; stopFollow(); tellPerched(); }
  function startFollow() { stopFollow(); perchTimer = setInterval(followPerch, PERCH_TICK); }
  function sitOn(seg, rect) { perch = { id: seg.id, dx: win.getBounds().x - rect.x }; startFollow(); tellPerched(); }
  function followPerch() {
    if (!win || !perch || tween || dragFrom || mode !== 'pet') return;
    const all = frames(), r = all.find((f) => f.id === perch.id);
    const b = win.getBounds(), cx = b.x + b.width / 2;
    const seg = r && place.perches(all, areas(), petSize().height * 0.6).find((s) => s.id === perch.id && cx >= s.x1 - 30 && cx <= s.x2 + 30);
    if (!seg) { fall(); return; }
    const to = place.perchBounds({ x: r.x + perch.dx, y: b.y, width: b.width, height: b.height }, seg);
    if (to.x !== b.x || to.y !== b.y) win.setBounds(to);
  }
  async function fall() {
    leavePerch();
    if (!win || mode !== 'pet') return;
    if (await glide(place.floorBounds(win.getBounds(), here()), 450)) restHere();
  }

  function applyMode(next) {
    if (!win || next === mode) { if (win) win.webContents.send('desk:mode', mode); return; }
    if (next === 'list') {
      petBounds = win.getBounds();
      if (perch) { petBounds = place.floorBounds(petBounds, here()); leavePerch(); }
      mode = 'list';
      win.setIgnoreMouseEvents(false); solidState = null;
      win.setAlwaysOnTop(false);
      stopTween(); peekRest = null;
      win.setBounds(place.listBounds(petBounds, here(), LIST_SIZE));
      applyZoom();
      win.focus();
    } else {
      mode = 'pet';
      applyZoom();
      win.setBounds(place.startBounds(petBounds, petSize(), areas(), screen.getPrimaryDisplay().workArea));
      if (THROUGH) win.setIgnoreMouseEvents(true, { forward: true });
      solidState = null;
      applyTop();
      // Windows can drop the click-through setting when the window changes size: say it again a moment later and ask the page to answer again
      setTimeout(() => { if (win && mode === 'pet' && THROUGH) { win.setIgnoreMouseEvents(true, { forward: true }); solidState = null; win.webContents.send('desk:resync'); } }, 200);
    }
    win.webContents.send('desk:mode', mode);
    log('mode', mode);
    refreshMenus();
  }
  // Windows is meant to forward the pointer to the page while clicks pass through, but that can stop working after the window
  // changes size. So the shell also watches the pointer itself and tells the page where it is; the page decides if it is on Fumu.
  let cursorTimer = null, wasInside = false, rects = null, holdSolid = false, solidState = null;
  const HIT_PAD = 6;   // a few pixels of slack round the solid parts, so the window is already catching clicks when the pointer arrives
  function watchCursor() {
    if (!THROUGH || cursorTimer) return;
    // about 120 times a second. With the page's rectangles the check is a few comparisons here in the shell (no messages, so it costs next to
    // nothing); an older page that sends no rectangles is still asked, as before.
    cursorTimer = setInterval(() => {
      if (!win || mode !== 'pet' || !win.isVisible()) { wasInside = false; return; }
      const p = screen.getCursorScreenPoint(), b = win.getBounds();
      const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
      if (rects) {
        const z = zoom(), x = (p.x - b.x) / z, y = (p.y - b.y) / z;
        const want = holdSolid || (inside && place.hitTest(rects, x, y, HIT_PAD));
        if (want !== solidState) { solidState = want; solidNow = want; win.setIgnoreMouseEvents(!want, { forward: true }); }
        return;
      }
      if (dragFrom) { wasInside = false; return; }
      if (inside) { wasInside = true; win.webContents.send('desk:cursor', (p.x - b.x) / zoom(), (p.y - b.y) / zoom()); }
      else if (wasInside) { wasInside = false; win.webContents.send('desk:cursor', -1, -1); }
    }, 8);
  }
  function showFumu() { if (win) { win.show(); if (mode === 'list') win.focus(); } refreshMenus(); }
  function hideFumu() { if (win) win.hide(); refreshMenus(); }

  // one place that changes a setting, for the right-click menu and the settings window alike
  const BOOLS = ['onTop', 'aboveFull', 'hotkeys', 'roam', 'remind', 'idle', 'perch', 'hideToy', 'hideCushion', 'startWithWindows'];
  function setPref(key, value) {
    if (key === 'awareness') {   // 1 = more privacy, 2 = normal; at 1 he stops sitting on windows (he can no longer see them)
      prefs.awareness = privacy.clean(+value); savePrefs();
      if (!privacy.allows(prefs.awareness, 'perch')) fall();
      sendPrefs(); refreshMenus();
      return;
    }
    if (key === 'size') { if (['small', 'normal', 'large'].includes(value)) setSize(value); return; }
    if (!BOOLS.includes(key)) return;
    value = !!value;
    if (key === 'startWithWindows') { app.setLoginItemSettings({ openAtLogin: value }); }
    else {
      prefs[key] = value; savePrefs();
      if (key === 'onTop' || key === 'aboveFull') applyTop();
      if (key === 'hotkeys') setupKeys();
      if (key === 'perch' && !value) fall();
      if (key === 'perch' && value && win && mode === 'pet' && privacy.allows(prefs.awareness, 'perch')) setTimeout(() => { if (win && prefs.perch) win.webContents.send('desk:do', 'perch'); }, 700);   // try right away, so you can see it working
    }
    sendPrefs(); refreshMenus();
  }
  // the short menu (right-click and tray): the everyday things; the rest is in the settings window
  function menu() {
    const visible = win && win.isVisible();
    const accel = (id) => (prefs.hotkeys && registered[id] ? registered[id] : undefined);
    return Menu.buildFromTemplate([
      ...(updateReady ? [{ label: 'Restart to update Fumufumu', click: () => autoUpdater.quitAndInstall() }, { type: 'separator' }] : []),
      mode === 'list' ? { label: 'Back to Fumu', accelerator: accel('swapSize'), registerAccelerator: false, click: () => applyMode('pet') } : { label: 'Open my list', accelerator: accel('swapSize'), registerAccelerator: false, click: () => { showFumu(); applyMode('list'); } },
      { label: 'Add an item…', accelerator: accel('quickAdd'), registerAccelerator: false, click: () => quickAdd() },
      { label: 'Shopping list / to-do list', accelerator: accel('swapList'), registerAccelerator: false, click: () => swapList() },
      { label: visible ? 'Hide Fumu' : 'Show Fumu', click: () => (visible ? hideFumu() : showFumu()) },
      { type: 'separator' },
      { label: 'Always on top', type: 'checkbox', checked: prefs.onTop, click: (item) => setPref('onTop', item.checked) },
      { label: 'Size', submenu: [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']].map(([id, label]) => ({ label, type: 'radio', checked: prefs.size === id, click: () => setPref('size', id) })) },
      { label: 'Fumu wanders and naps on his own', type: 'checkbox', checked: prefs.roam, click: (item) => setPref('roam', item.checked) },
      { label: 'Remind me of tasks', type: 'checkbox', checked: prefs.remind, click: (item) => setPref('remind', item.checked) },
      { label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (item) => setPref('startWithWindows', item.checked) },
      { type: 'separator' },
      { label: 'More Fumu settings…', accelerator: prefs.keys.options || undefined, registerAccelerator: false, click: () => panel.open() },
      { label: 'Fumufumu ' + app.getVersion() + (CHANNEL.name === 'stable' ? ' (stable)' : ''), enabled: false },
      { label: 'Quit Fumufumu', click: () => app.quit() }
    ]);
  }
  function setSize(id) {
    prefs.size = id; savePrefs(); leavePerch();
    if (win && mode === 'pet') {
      stopTween(); peekRest = null;
      applyZoom();
      win.setBounds(place.within(place.resizeKeepingBottom(win.getBounds(), petSize()), here()));
      restHere();
      win.webContents.send('desk:resync');
    }
    sendPrefs(); refreshMenus();
  }
  function nudgeBy(dx, dy) { if (win && mode === 'pet') { leavePerch(); stopTween(); peekRest = null; win.setBounds(place.nudge(win.getBounds(), dx, dy, here())); restHere(); } }
  function toCorner(which) { if (win && mode === 'pet') { leavePerch(); stopTween(); peekRest = null; win.setBounds(place.corner(win.getBounds(), here(), which)); restHere(); } }
  // shortcuts that work from any program (which keys is chosen in the settings window); the settings one only while the pointer is over Fumu
  const registered = {};
  let hoverKeyOn = null, solidNow = false;
  function toggleFull() { if (!win) return; if (!win.isVisible()) showFumu(); applyMode(mode === 'list' ? 'pet' : 'list'); }
  function swapList() { if (!win) return; if (!win.isVisible()) showFumu(); win.webContents.send('desk:swapList'); }
  // a small box by Fumu to add an item without opening the app: the page shows it and asks for the keyboard while it is open
  function quickAdd() { if (!win) return; if (!win.isVisible()) showFumu(); win.webContents.send('desk:quickAdd'); if (mode === 'list') win.focus(); }
  ipcMain.on('desk:typing', (_e, yes) => { if (win && yes) win.focus(); });
  const HANDLERS = { swapSize: toggleFull, swapList, quickAdd };
  function setupKeys() {
    Object.keys(registered).forEach((k) => { if (registered[k]) globalShortcut.unregister(registered[k]); delete registered[k]; });
    if (hoverKeyOn) { globalShortcut.unregister(hoverKeyOn); hoverKeyOn = null; }
    if (!prefs.hotkeys) { refreshMenus(); panel.push(); return; }
    Object.keys(HANDLERS).forEach((id) => {
      const accel = prefs.keys[id];
      if (accel && globalShortcut.register(accel, HANDLERS[id])) registered[id] = accel;
    });
    log('shortcuts', registered);
    refreshMenus(); panel.push();
  }
  // the settings shortcut is only held while the pointer is over him, so it never steals the keys from other programs
  function hoverOver() {
    if (!win || !win.isVisible()) return false;
    const p = screen.getCursorScreenPoint(), b = win.getBounds();
    const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
    return inside && (mode === 'list' || solidNow);
  }
  function updateHoverKey() {
    const accel = prefs.keys.options, want = !!(accel && prefs.hotkeys && hoverOver());
    if (want && !hoverKeyOn) { if (globalShortcut.register(accel, () => panel.toggle())) hoverKeyOn = accel; }
    else if (!want && hoverKeyOn) { globalShortcut.unregister(hoverKeyOn); hoverKeyOn = null; }
  }
  // a new shortcut for one of them: checks it is usable and not taken, then keeps it
  function rebind(id, accel) {
    if (!keys.KEY_LIST.some((k) => k.id === id)) return { ok: false, reason: 'Unknown shortcut.' };
    if (!keys.valid(accel)) return { ok: false, reason: 'Use Ctrl or Alt together with a letter, number or F-key.' };
    if (accel && keys.KEY_LIST.some((k) => k.id !== id && prefs.keys[k.id].toLowerCase() === accel.toLowerCase())) return { ok: false, reason: 'Another Fumu shortcut already uses that.' };
    if (accel && accel !== prefs.keys[id]) {   // is it free? (try it, then let go)
      let free = false;
      try { free = globalShortcut.register(accel, () => {}); if (free) globalShortcut.unregister(accel); } catch (e) { free = false; }
      if (!free) return { ok: false, reason: 'Another program is using that.' };
    }
    prefs.keys[id] = accel; savePrefs(); setupKeys();
    return { ok: true };
  }
  // ---------- screens that come and go, and the computer going quiet ----------
  // A screen is unplugged or changes size: he goes to the main screen but remembers his own spot, and goes back when that screen returns.
  let screenTimer = null;
  function screensChanged() {
    clearTimeout(screenTimer);
    screenTimer = setTimeout(() => {
      if (!win) return;
      if (mode !== 'pet') { const b = win.getBounds(), fixed = place.startBounds(b, b, areas(), screen.getPrimaryDisplay().workArea); if (fixed.x !== b.x || fixed.y !== b.y) win.setBounds(fixed); return; }
      leavePerch(); stopTween(); peekRest = null;
      const r = place.afterScreensChange(win.getBounds(), prefs.x === null ? null : prefs, petSize(), areas(), screen.getPrimaryDisplay().workArea, displaced);
      displaced = r.displaced;
      win.setBounds(r.bounds);
      win.webContents.send('desk:resync');
      log('screens changed', r);
    }, 800);
  }
  // away from the keyboard: the page lets him nap and greets you when you are back
  const IDLE_AFTER = 240;
  let idle = false;
  function setIdle(next) { if (next === idle) return; idle = next; if (win) win.webContents.send('desk:idle', idle); log('idle', idle); }
  function watchIdle() {
    setInterval(() => setIdle(place.idleStep(idle, powerMonitor.getSystemIdleTime(), IDLE_AFTER)), 2000);
    powerMonitor.on('lock-screen', () => setIdle(true));
    powerMonitor.on('suspend', () => setIdle(true));
    powerMonitor.on('unlock-screen', () => setIdle(false));
    powerMonitor.on('resume', () => setIdle(false));
  }
  function refreshMenus() { if (tray) tray.setContextMenu(menu()); }

  function createWindow() {
    const bounds = place.startBounds(prefs.x === null ? null : prefs, petSize(), areas(), screen.getPrimaryDisplay().workArea);
    win = new BrowserWindow(Object.assign({}, bounds, {
      frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, resizable: false, maximizable: false, fullscreenable: false,
      skipTaskbar: true, show: false, title: 'Fumufumu',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
    }));
    applyTop();
    if (THROUGH) win.setIgnoreMouseEvents(true, { forward: true });
    win.removeMenu && win.removeMenu();
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('will-navigate', (e, url) => {
      if (new URL(url).origin !== new URL(APP_URL).origin) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); }
    });
    win.webContents.on('dom-ready', applyZoom);
    win.on('closed', () => { win = null; });
    win.loadURL(APP_URL);
    setTimeout(() => { if (win && !shown) { shown = true; win.showInactive(); } }, 6000);   // show it anyway if the page never says it is ready
  }

  ipcMain.handle('desk:getMode', () => mode);
  ipcMain.on('desk:setMode', (_e, next) => applyMode(next === 'list' ? 'list' : 'pet'));
  ipcMain.on('desk:ready', () => { if (win && !shown) { shown = true; win.showInactive(); log('shown'); } });
  ipcMain.on('desk:rects', (_e, list) => {
    if (!Array.isArray(list)) return;
    rects = list.slice(0, 40).filter((r) => Array.isArray(r) && r.length === 4 && r.every((n) => typeof n === 'number' && isFinite(n)));
  });
  ipcMain.on('desk:hold', (_e, yes) => { holdSolid = !!yes; });
  ipcMain.on('desk:solid', (_e, yes) => { solidNow = !!yes; log('solid', yes); if (win && mode === 'pet' && THROUGH) win.setIgnoreMouseEvents(!yes, { forward: true }); });
  // carrying follows the real pointer (the page's own numbers change with the zoom)
  let dragCursor = null;
  ipcMain.on('desk:dragStart', () => { if (win && mode === 'pet') { leavePerch(); stopTween(); peekRest = null; dragFrom = win.getBounds(); dragCursor = screen.getCursorScreenPoint(); } });
  ipcMain.on('desk:dragMove', (_e, dx, dy) => {
    if (!win || !dragFrom) return;
    const p = screen.getCursorScreenPoint();
    win.setBounds(place.dragBounds(dragFrom, dragCursor ? p.x - dragCursor.x : dx, dragCursor ? p.y - dragCursor.y : dy));
  });
  ipcMain.on('desk:dragEnd', async () => {
    if (!win || !dragFrom) return;
    dragFrom = null;
    const b = win.getBounds();
    // let go close above another window's edge and he sits on it
    if (prefs.perch && windows.available() && privacy.allows(prefs.awareness, 'perch')) {
      const all = frames(), seg = place.perchUnder(b, place.perches(all, areas(), petSize().height * 0.6), 40);
      if (seg) {
        const rect = all.find((f) => f.id === seg.id);
        if (await glide(place.perchBounds(b, seg), 200)) { sitOn(seg, rect); return; }
      }
    }
    restHere();
  });
  ipcMain.handle('desk:getPrefs', () => publicPrefs());
  // Fumu walks along where he sits: the page plays the walking, the window glides
  ipcMain.handle('desk:walk', async (_e, dx, ms) => {
    if (!win || mode !== 'pet' || dragFrom || peekRest) return 0;
    const from = win.getBounds(), want = Math.max(-900, Math.min(900, +dx || 0));
    let to = place.walkEnd(from, here(), want);
    if (perch) {   // along the edge he sits on, not past its ends
      const seg = perchesNow().find((s) => s.id === perch.id && from.x + from.width / 2 >= s.x1 - 30 && from.x + from.width / 2 <= s.x2 + 30);
      if (!seg) { fall(); return 0; }
      to = place.perchBounds({ x: from.x + want, y: from.y, width: from.width, height: from.height }, seg);
    }
    if (Math.abs(to.x - from.x) < 4) return 0;
    const done = await glide(to, Math.max(300, Math.min(12000, +ms || 3000)));
    if (!done) return null;   // picked up or changed meanwhile
    if (perch) { const r = frames().find((f) => f.id === perch.id); if (r) perch.dx = win.getBounds().x - r.x; } else restHere();
    return to.x - from.x;
  });
  // peeking round the side of the screen, then back to where he sat
  ipcMain.handle('desk:peek', async (_e, ms) => {
    if (!win || mode !== 'pet' || dragFrom || peekRest || perch) return null;
    const spot = place.peekSpot(win.getBounds(), screen.getAllDisplays().map((d) => d.bounds));
    if (!spot) return null;
    peekRest = win.getBounds();
    const done = await glide(spot.bounds, Math.max(300, +ms || 900));
    return done ? spot.edge : null;
  });
  ipcMain.handle('desk:unpeek', async (_e, ms) => {
    if (!win || !peekRest) return false;
    const to = peekRest;
    const done = await glide(to, Math.max(300, +ms || 700));
    if (done) peekRest = null;
    return done;
  });
  // hop onto another window ('up') or back down to the floor ('down'); resolves whether he is on a window now, or null if nothing happened
  ipcMain.handle('desk:perch', async (_e, want) => {
    if (!win || mode !== 'pet' || dragFrom || peekRest) return null;
    if (want === 'down') { if (!perch) return null; await fall(); return false; }
    if (!privacy.allows(prefs.awareness, 'perch')) return 'private';
    if (!prefs.perch || !windows.available()) return 'off';
    const all = frames(), b = win.getBounds();
    const near = place.perchesNear(b, place.perches(all, areas(), petSize().height * 0.6), areas(), 1100, perch && perch.id);
    if (!near.length) return 'none';
    const seg = near[Math.floor(Math.random() * near.length)], rect = all.find((f) => f.id === seg.id);
    const to = place.perchBounds(b, seg);
    leavePerch();
    const done = await glide(to, Math.max(500, Math.min(1400, Math.abs(to.x - b.x) + Math.abs(to.y - b.y))), 70);
    if (!done) return null;
    sitOn(seg, rect);
    return true;
  });
  // a reminder: bring Fumu back if he was hidden (without taking the keyboard from what you are doing)
  ipcMain.on('desk:reveal', () => { if (win && !win.isVisible()) { win.showInactive(); refreshMenus(); } });
  ipcMain.on('desk:menu', () => { log('menu'); if (win) menu().popup({ window: win }); });
  ipcMain.on('desk:hide', () => hideFumu());
  ipcMain.on('desk:open', (_e, url) => { if (typeof url === 'string' && /^https?:\/\/[^\s]+$/i.test(url)) shell.openExternal(url); });
  ipcMain.on('desk:copy', (_e, text) => { if (typeof text === 'string') clipboard.writeText(text.slice(0, 20000)); });

  // The page (the app itself) updates by itself because it is loaded from the web. This is for the shell: the
  // installed program. It checks GitHub's releases, downloads quietly and installs when Fumu is next closed.
  let autoUpdater = null;
  function checkUpdates() {
    if (!autoUpdater) return;
    autoUpdater.checkForUpdates().catch((e) => log('update check failed', e && e.message));
  }
  function setupUpdates() {
    if (!app.isPackaged) return;   // not when started from the source folder
    try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { return; }
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-downloaded', () => { updateReady = true; panel.push(); if (tray) tray.setToolTip('Fumufumu (update ready: right-click the tray icon)'); refreshMenus(); log('update ready'); });
    autoUpdater.on('error', (e) => log('updater', e && e.message));
    setTimeout(checkUpdates, 15000);
    setInterval(checkUpdates, 6 * 3600 * 1000);
  }

  // ---------- the settings window (panel-main.js, panel.html): the bigger menu, with the shortcuts and some developer tools ----------
  function resetPosition() {
    if (!win || mode !== 'pet') return;
    leavePerch(); stopTween(); peekRest = null;
    win.setBounds(place.defaultBounds(screen.getPrimaryDisplay().workArea, petSize()));
    restHere();
  }
  function diag() {
    const b = win ? win.getBounds() : null;
    return {
      version: app.getVersion(), channel: CHANNEL.name, electron: process.versions.electron, packaged: app.isPackaged, page: APP_URL,
      mode, bounds: b, zoom: zoom(), screens: screen.getAllDisplays().map((d) => d.workArea.width + 'x' + d.workArea.height + ' @' + d.scaleFactor),
      onPerch: perch ? perch.id : null, awareness: prefs.awareness, windowsSeen: prefs.perch && windows.available() && privacy.allows(prefs.awareness, 'perch') ? windows.list().length : null, perchesNow: prefs.perch && windows.available() && privacy.allows(prefs.awareness, 'perch') ? perchesNow().length : null,
      idleSeconds: powerMonitor.getSystemIdleTime(), idle, displaced, pointerOverFumu: solidNow,
      shortcutsHeld: Object.assign({}, registered, hoverKeyOn ? { options: hoverKeyOn } : {}), settingsFolder: app.getPath('userData')
    };
  }
  function action(name, arg) {
    if (!win) return false;
    switch (name) {
      case 'reload': win.webContents.reloadIgnoringCache(); return true;
      case 'devtools': win.webContents.openDevTools({ mode: 'detach' }); return true;
      case 'do': if (['wander', 'peek', 'nap', 'perch', 'sit', 'remind'].includes(arg)) { if (mode !== 'pet') applyMode('pet'); win.webContents.send('desk:do', arg); } return true;
      case 'corner': if (['br', 'bl', 'tr', 'tl'].includes(arg)) toCorner(arg); return true;
      case 'nudge': if (Array.isArray(arg)) nudgeBy(Math.max(-200, Math.min(200, +arg[0] || 0)), Math.max(-200, Math.min(200, +arg[1] || 0))); return true;
      case 'resetPosition': resetPosition(); return true;
      case 'copyDiag': clipboard.writeText(JSON.stringify(diag(), null, 2)); return true;
      case 'openData': shell.openPath(app.getPath('userData')); return true;
      case 'checkUpdates': checkUpdates(); return true;
      case 'installUpdate': if (updateReady && autoUpdater) autoUpdater.quitAndInstall(); return true;
      case 'resetSettings': {
        const keep = { x: prefs.x, y: prefs.y };
        prefs = Object.assign({}, DEFAULTS, keep, { keys: keys.clean(null) });
        savePrefs(); app.setLoginItemSettings({ openAtLogin: false });
        setupKeys(); applyTop(); setSize('normal'); sendPrefs(); refreshMenus();
        return true;
      }
      default: return false;
    }
  }
  const panel = createPanel({
    state: () => ({
      prefs: Object.assign({ onTop: prefs.onTop, aboveFull: prefs.aboveFull, hotkeys: prefs.hotkeys, startWithWindows: app.getLoginItemSettings().openAtLogin }, publicPrefs(), { perch: prefs.perch }),
      keys: prefs.keys, channel: CHANNEL.name, privacy: { levels: privacy.LEVELS, always: privacy.ALWAYS }, keyList: keys.KEY_LIST, held: Object.assign({}, registered), canPerch: windows.available(), packaged: app.isPackaged, mode, update: updateReady
    }),
    set: setPref, rebind, action, diag
  });
  setInterval(updateHoverKey, 120);

  app.on('second-instance', () => showFumu());
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => globalShortcut.unregisterAll());

  app.whenReady().then(() => {
    app.setAppUserModelId('com.laurmoe.nibble');
    // the page may only use the clipboard for writing; no camera, microphone, location, notifications
    session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'clipboard-sanitized-write'));
    createWindow();
    watchCursor();
    setupKeys();
    ['display-added', 'display-removed', 'display-metrics-changed'].forEach((e) => screen.on(e, screensChanged));
    watchIdle();
    const icon = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 32, height: 32 });
    tray = new Tray(icon);
    tray.setToolTip('Fumufumu');
    tray.on('click', () => { if (win && win.isVisible()) hideFumu(); else showFumu(); });
    refreshMenus();
    setupUpdates();
  });
}
