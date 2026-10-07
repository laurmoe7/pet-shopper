// Nibble on your desktop (Windows first): a small transparent window that is always on top and shows the
// real app in "pet only" mode, a tray icon, and the whole app in a bigger window when you open your list.
// The app itself is loaded from the web (so a big push updates it), see NIBBLE_URL below.
'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const place = require('./place.js');

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
  let win = null, tray = null, mode = 'pet', petBounds = null, dragFrom = null, shown = false;
  const prefsFile = () => path.join(app.getPath('userData'), 'window.json');
  let prefs = { x: null, y: null, onTop: true };
  try { prefs = Object.assign(prefs, JSON.parse(fs.readFileSync(prefsFile(), 'utf8'))); } catch (e) { /* first run */ }
  const savePrefs = () => { try { fs.writeFileSync(prefsFile(), JSON.stringify(prefs)); } catch (e) { /* ignore */ } };
  const areas = () => screen.getAllDisplays().map((d) => d.workArea);
  const here = () => screen.getDisplayMatching(win.getBounds()).workArea;

  function applyMode(next) {
    if (!win || next === mode) { if (win) win.webContents.send('desk:mode', mode); return; }
    if (next === 'list') {
      petBounds = win.getBounds();
      mode = 'list';
      win.setIgnoreMouseEvents(false);
      win.setAlwaysOnTop(false);
      win.setBounds(place.listBounds(petBounds, here(), LIST_SIZE));
      win.focus();
    } else {
      mode = 'pet';
      win.setBounds(place.startBounds(petBounds, PET_SIZE, areas(), screen.getPrimaryDisplay().workArea));
      if (THROUGH) win.setIgnoreMouseEvents(true, { forward: true });
      win.setAlwaysOnTop(prefs.onTop);
    }
    win.webContents.send('desk:mode', mode);
    log('mode', mode);
    refreshMenus();
  }
  function showNibble() { if (win) { win.show(); if (mode === 'list') win.focus(); } refreshMenus(); }
  function hideNibble() { if (win) win.hide(); refreshMenus(); }

  function menu() {
    const visible = win && win.isVisible();
    return Menu.buildFromTemplate([
      mode === 'list' ? { label: 'Back to Nibble', click: () => applyMode('pet') } : { label: 'Open my list', click: () => { showNibble(); applyMode('list'); } },
      { label: visible ? 'Hide Nibble' : 'Show Nibble', click: () => (visible ? hideNibble() : showNibble()) },
      { type: 'separator' },
      { label: 'Always on top', type: 'checkbox', checked: prefs.onTop, click: (item) => { prefs.onTop = item.checked; savePrefs(); if (win && mode === 'pet') win.setAlwaysOnTop(prefs.onTop); } },
      { label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }) },
      { label: 'Reload (get the latest)', click: () => win && win.webContents.reloadIgnoringCache() },
      { type: 'separator' },
      { label: 'Quit Nibble', click: () => app.quit() }
    ]);
  }
  function refreshMenus() { if (tray) tray.setContextMenu(menu()); }

  function createWindow() {
    const bounds = place.startBounds(prefs.x === null ? null : prefs, PET_SIZE, areas(), screen.getPrimaryDisplay().workArea);
    win = new BrowserWindow(Object.assign({}, bounds, {
      frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, resizable: false, maximizable: false, fullscreenable: false,
      skipTaskbar: true, alwaysOnTop: prefs.onTop, show: false, title: 'Nibble',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
    }));
    if (THROUGH) win.setIgnoreMouseEvents(true, { forward: true });
    win.removeMenu && win.removeMenu();
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('will-navigate', (e, url) => {
      if (new URL(url).origin !== new URL(APP_URL).origin) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); }
    });
    win.on('closed', () => { win = null; });
    win.loadURL(APP_URL);
    setTimeout(() => { if (win && !shown) { shown = true; win.showInactive(); } }, 6000);   // show it anyway if the page never says it is ready
  }

  ipcMain.handle('desk:getMode', () => mode);
  ipcMain.on('desk:setMode', (_e, next) => applyMode(next === 'list' ? 'list' : 'pet'));
  ipcMain.on('desk:ready', () => { if (win && !shown) { shown = true; win.showInactive(); log('shown'); } });
  ipcMain.on('desk:solid', (_e, yes) => { if (win && mode === 'pet' && THROUGH) win.setIgnoreMouseEvents(!yes, { forward: true }); });
  ipcMain.on('desk:dragStart', () => { if (win && mode === 'pet') dragFrom = win.getBounds(); });
  ipcMain.on('desk:dragMove', (_e, dx, dy) => { if (win && dragFrom) win.setBounds(place.dragBounds(dragFrom, dx, dy)); });
  ipcMain.on('desk:dragEnd', () => { if (win && dragFrom) { const b = win.getBounds(); prefs.x = b.x; prefs.y = b.y; savePrefs(); dragFrom = null; } });
  ipcMain.on('desk:menu', () => { log('menu'); if (win) menu().popup({ window: win }); });
  ipcMain.on('desk:hide', () => hideNibble());

  app.on('second-instance', () => showNibble());
  app.on('window-all-closed', () => app.quit());

  app.whenReady().then(() => {
    app.setAppUserModelId('com.laurmoe.nibble');
    // the page may only use the clipboard for writing; no camera, microphone, location, notifications
    session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'clipboard-sanitized-write'));
    createWindow();
    const icon = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 32, height: 32 });
    tray = new Tray(icon);
    tray.setToolTip('Nibble');
    tray.on('click', () => { if (win && win.isVisible()) hideNibble(); else showNibble(); });
    refreshMenus();
  });
}
