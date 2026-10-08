// The Fumu settings window: the bigger menu, with the choices for the small Fumu, his shortcuts and a few developer tools.
// It is a page of its own (panel.html, shipped with the program, not loaded from the web) and talks to main.js only through
// the few calls below; only that page may use them.
'use strict';
const { BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');

/**
 * @param {{state: Function, set: Function, rebind: Function, action: Function, diag: Function}} ctx  What main.js lets the window do.
 * @returns {{open: Function, toggle: Function, push: Function}}
 */
module.exports = function createPanel(ctx) {
  let win = null;
  const from = (e) => win && !win.isDestroyed() && e.sender === win.webContents;

  function open() {
    if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); return; }
    win = new BrowserWindow({
      width: 520, height: 720, minWidth: 420, minHeight: 420, title: 'Fumu settings', autoHideMenuBar: true, show: false,
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#3a2c22' : '#dcb987',
      webPreferences: { preload: path.join(__dirname, 'panel-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    win.removeMenu();
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.once('ready-to-show', () => { win.show(); win.focus(); });
    win.on('closed', () => { win = null; });
    win.loadFile(path.join(__dirname, 'panel.html'));
  }
  function toggle() { if (win && !win.isDestroyed() && win.isVisible() && win.isFocused()) win.close(); else open(); }
  function push() { if (win && !win.isDestroyed()) win.webContents.send('panel:state', ctx.state()); }

  ipcMain.handle('panel:get', (e) => (from(e) ? ctx.state() : null));
  ipcMain.handle('panel:set', (e, key, value) => { if (from(e)) { ctx.set(String(key), value); } return from(e) ? ctx.state() : null; });
  ipcMain.handle('panel:rebind', (e, id, accel) => (from(e) ? ctx.rebind(String(id), String(accel)) : { ok: false, reason: 'Not allowed.' }));
  ipcMain.handle('panel:action', (e, name, arg) => (from(e) ? ctx.action(String(name), arg) : false));
  ipcMain.handle('panel:diag', (e) => (from(e) ? ctx.diag() : null));
  return { open, toggle, push };
};
