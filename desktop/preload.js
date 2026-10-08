// The only things the page may ask the desktop shell to do. The page is the normal app (loaded from the web),
// so this is kept small: no files, no commands, nothing but the window itself.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nibbleDesktop', {
  version: 1,
  /** @returns {Promise<'pet'|'list'>} */
  getMode: () => ipcRenderer.invoke('desk:getMode'),
  /** Switch between Fumu alone ('pet') and the whole app ('list'). */
  setMode: (mode) => ipcRenderer.send('desk:setMode', mode === 'list' ? 'list' : 'pet'),
  onMode: (fn) => ipcRenderer.on('desk:mode', (_e, mode) => fn(mode)),
  /** Where the pointer is, in the window's own coordinates (-1, -1 when it is outside), about 25 times a second. */
  /** The window was just changed by the shell, so the page should say again whether clicks are caught. */
  onResync: (fn) => ipcRenderer.on('desk:resync', () => fn()),
  onCursor: (fn) => ipcRenderer.on('desk:cursor', (_e, x, y) => fn(x, y)),
  /** The page has applied its mode: the window can be shown. */
  ready: () => ipcRenderer.send('desk:ready'),
  /** Whether the pointer is over something solid (pet, bubble...) so clicks are caught; elsewhere they go through to the desktop. */
  solid: (yes) => ipcRenderer.send('desk:solid', !!yes),
  dragStart: () => ipcRenderer.send('desk:dragStart'),
  dragMove: (dx, dy) => ipcRenderer.send('desk:dragMove', +dx || 0, +dy || 0),
  dragEnd: () => ipcRenderer.send('desk:dragEnd'),
  menu: () => ipcRenderer.send('desk:menu'),
  /** Opens a web link in the browser (only http and https are passed on by the shell). */
  open: (url) => ipcRenderer.send('desk:open', String(url).slice(0, 4100)),
  /** Puts text on the clipboard. */
  copy: (text) => ipcRenderer.send('desk:copy', String(text).slice(0, 20000)),
  hide: () => ipcRenderer.send('desk:hide')
});
