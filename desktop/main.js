// Fumu on your desktop (Windows first): a small transparent window that is always on top and shows the
// real app in "pet only" mode, a tray icon, and the whole app in a bigger window when you open your list.
// The app itself is loaded from the web (so a big push updates it), see NIBBLE_URL below.
'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell, session, clipboard, globalShortcut, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const place = require('./place.js');
const windows = require('./windows.js');

const APP_URL = process.env.NIBBLE_URL || 'https://laurmoe7.github.io/pet-shopper/';
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
  let prefs = { x: null, y: null, onTop: true, aboveFull: false, size: 'normal', roam: true, remind: true, hotkeys: true, idle: true, perch: false };
  try { prefs = Object.assign(prefs, JSON.parse(fs.readFileSync(prefsFile(), 'utf8'))); } catch (e) { /* first run */ }
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
  const publicPrefs = () => ({ roam: prefs.roam, remind: prefs.remind, size: prefs.size, idle: prefs.idle, perch: prefs.perch && windows.available() });
  const sendPrefs = () => { if (win) win.webContents.send('desk:prefs', publicPrefs()); };
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
      win.setIgnoreMouseEvents(false);
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
      applyTop();
      // Windows can drop the click-through setting when the window changes size: say it again a moment later and ask the page to answer again
      setTimeout(() => { if (win && mode === 'pet' && THROUGH) { win.setIgnoreMouseEvents(true, { forward: true }); win.webContents.send('desk:resync'); } }, 200);
    }
    win.webContents.send('desk:mode', mode);
    log('mode', mode);
    refreshMenus();
  }
  // Windows is meant to forward the pointer to the page while clicks pass through, but that can stop working after the window
  // changes size. So the shell also watches the pointer itself and tells the page where it is; the page decides if it is on Fumu.
  let cursorTimer = null, wasInside = false;
  function watchCursor() {
    if (!THROUGH || cursorTimer) return;
    cursorTimer = setInterval(() => {
      if (!win || mode !== 'pet' || !win.isVisible() || dragFrom) { wasInside = false; return; }
      const p = screen.getCursorScreenPoint(), b = win.getBounds();
      const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
      if (inside) { wasInside = true; win.webContents.send('desk:cursor', (p.x - b.x) / zoom(), (p.y - b.y) / zoom()); }
      else if (wasInside) { wasInside = false; win.webContents.send('desk:cursor', -1, -1); }
    }, 40);
  }
  function showFumu() { if (win) { win.show(); if (mode === 'list') win.focus(); } refreshMenus(); }
  function hideFumu() { if (win) win.hide(); refreshMenus(); }

  function menu() {
    const visible = win && win.isVisible();
    return Menu.buildFromTemplate([
      ...(updateReady ? [{ label: 'Restart to update Fumufumu', click: () => autoUpdater.quitAndInstall() }, { type: 'separator' }] : []),
      mode === 'list' ? { label: 'Back to Fumu', click: () => applyMode('pet') } : { label: 'Open my list', click: () => { showFumu(); applyMode('list'); } },
      { label: visible ? 'Hide Fumu' : 'Show Fumu', click: () => (visible ? hideFumu() : showFumu()) },
      { type: 'separator' },
      { label: 'Small Fumu / whole app', accelerator: prefs.hotkeys && registered.swapSize ? KEYS.swapSize : undefined, registerAccelerator: false, click: () => toggleFull() },
      { label: 'Add an item…', accelerator: prefs.hotkeys && registered.quickAdd ? KEYS.quickAdd : undefined, registerAccelerator: false, click: () => quickAdd() },
      { label: 'Shopping list / to-do list', accelerator: prefs.hotkeys && registered.swapList ? KEYS.swapList : undefined, registerAccelerator: false, click: () => swapList() },
      { label: 'Keyboard shortcuts' + (prefs.hotkeys && (!registered.swapSize || !registered.swapList) ? ' (a key is taken by another program)' : ''), type: 'checkbox', checked: prefs.hotkeys, click: (item) => { prefs.hotkeys = item.checked; savePrefs(); setupKeys(); refreshMenus(); } },
      { type: 'separator' },
      { label: 'Always on top', type: 'checkbox', checked: prefs.onTop, click: (item) => { prefs.onTop = item.checked; savePrefs(); applyTop(); } },
      { label: 'Stay above full-screen apps', type: 'checkbox', checked: prefs.aboveFull, enabled: prefs.onTop, click: (item) => { prefs.aboveFull = item.checked; savePrefs(); applyTop(); } },
      { label: 'Size', submenu: [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']].map(([id, label]) => ({ label, type: 'radio', checked: prefs.size === id, click: () => setSize(id) })) },
      { label: 'Move Fumu', enabled: mode === 'pet', submenu: [
        { label: 'Nudge left', click: () => nudgeBy(-20, 0) }, { label: 'Nudge right', click: () => nudgeBy(20, 0) },
        { label: 'Nudge up', click: () => nudgeBy(0, -20) }, { label: 'Nudge down', click: () => nudgeBy(0, 20) },
        { type: 'separator' },
        { label: 'To the bottom right', click: () => toCorner('br') }, { label: 'To the bottom left', click: () => toCorner('bl') },
        { label: 'To the top right', click: () => toCorner('tr') }, { label: 'To the top left', click: () => toCorner('tl') }
      ] },
      { label: 'Fumu wanders and naps on his own', type: 'checkbox', checked: prefs.roam, click: (item) => { prefs.roam = item.checked; savePrefs(); sendPrefs(); } },
      { label: 'Fumu naps when I am away', type: 'checkbox', checked: prefs.idle, click: (item) => { prefs.idle = item.checked; savePrefs(); sendPrefs(); } },
      ...(windows.available() ? [{ label: 'Fumu sits on my windows', type: 'checkbox', checked: prefs.perch, click: (item) => { prefs.perch = item.checked; savePrefs(); if (!prefs.perch) fall(); sendPrefs(); } }] : []),
      { label: 'Remind me of tasks', type: 'checkbox', checked: prefs.remind, click: (item) => { prefs.remind = item.checked; savePrefs(); sendPrefs(); } },
      { label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }) },
      { label: 'Reload (get the latest)', click: () => win && win.webContents.reloadIgnoringCache() },
      { label: 'Check for app updates', enabled: app.isPackaged, click: () => checkUpdates() },
      { type: 'separator' },
      { label: 'Fumufumu ' + app.getVersion(), enabled: false },
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
  // shortcuts that work from any program: small Fumu <-> the whole app, and shopping list <-> to-do list
  const KEYS = { swapSize: 'CommandOrControl+Alt+F', swapList: 'CommandOrControl+Alt+T', quickAdd: 'CommandOrControl+Alt+A' };
  const registered = {};
  function toggleFull() { if (!win) return; if (!win.isVisible()) showFumu(); applyMode(mode === 'list' ? 'pet' : 'list'); }
  function swapList() { if (!win) return; if (!win.isVisible()) showFumu(); win.webContents.send('desk:swapList'); }
  // a small box by Fumu to add an item without opening the app: the page shows it and asks for the keyboard while it is open
  function quickAdd() { if (!win) return; if (!win.isVisible()) showFumu(); win.webContents.send('desk:quickAdd'); if (mode === 'list') win.focus(); }
  ipcMain.on('desk:typing', (_e, yes) => { if (win && yes) win.focus(); });
  function setupKeys() {
    Object.keys(KEYS).forEach((k) => { if (registered[k]) { globalShortcut.unregister(KEYS[k]); registered[k] = false; } });
    if (!prefs.hotkeys) return;
    registered.swapSize = globalShortcut.register(KEYS.swapSize, toggleFull);
    registered.swapList = globalShortcut.register(KEYS.swapList, swapList);
    registered.quickAdd = globalShortcut.register(KEYS.quickAdd, quickAdd);
    log('shortcuts', registered);
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
  ipcMain.on('desk:solid', (_e, yes) => { log('solid', yes); if (win && mode === 'pet' && THROUGH) win.setIgnoreMouseEvents(!yes, { forward: true }); });
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
    if (prefs.perch && windows.available()) {
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
    if (!prefs.perch || !windows.available()) return null;
    const all = frames(), b = win.getBounds();
    const near = place.perchesNear(b, place.perches(all, areas(), petSize().height * 0.6), areas(), 1100, perch && perch.id);
    if (!near.length) return null;
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
    autoUpdater.on('update-downloaded', () => { updateReady = true; if (tray) tray.setToolTip('Fumufumu (update ready: right-click the tray icon)'); refreshMenus(); log('update ready'); });
    autoUpdater.on('error', (e) => log('updater', e && e.message));
    setTimeout(checkUpdates, 15000);
    setInterval(checkUpdates, 6 * 3600 * 1000);
  }

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
