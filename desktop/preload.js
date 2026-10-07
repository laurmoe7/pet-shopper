// The only things the page may ask the desktop shell to do. The page is the normal app (loaded from the web),
// so this is kept small: no files, no commands, nothing but the window itself.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nibbleDesktop', {
  version: 1,
  /** @returns {Promise<'pet'|'list'>} */
  getMode: () => ipcRenderer.invoke('desk:getMode'),
  /** Switch between Nibble alone ('pet') and the whole app ('list'). */
  setMode: (mode) => ipcRenderer.send('desk:setMode', mode === 'list' ? 'list' : 'pet'),
  onMode: (fn) => ipcRenderer.on('desk:mode', (_e, mode) => fn(mode)),
  /** The page has applied its mode: the window can be shown. */
  ready: () => ipcRenderer.send('desk:ready'),
  /** Whether the pointer is over something solid (pet, bubble...) so clicks are caught; elsewhere they go through to the desktop. */
  solid: (yes) => ipcRenderer.send('desk:solid', !!yes),
  dragStart: () => ipcRenderer.send('desk:dragStart'),
  dragMove: (dx, dy) => ipcRenderer.send('desk:dragMove', +dx || 0, +dy || 0),
  dragEnd: () => ipcRenderer.send('desk:dragEnd'),
  menu: () => ipcRenderer.send('desk:menu'),
  hide: () => ipcRenderer.send('desk:hide')
});
