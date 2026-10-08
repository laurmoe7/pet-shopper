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
  /** Where the pointer is, in the window's own coordinates (-1, -1 when it is outside), about 60 times a second. */
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
  hide: () => ipcRenderer.send('desk:hide'),
  /** The tray menu's choices that matter to the page: {roam, remind, size, idle, perch, hideToy, hideCushion, awareness}. */
  getPrefs: () => ipcRenderer.invoke('desk:getPrefs'),
  onPrefs: (fn) => ipcRenderer.on('desk:prefs', (_e, p) => fn(p)),
  /** Walks the window dx px along (negative = left) over ms; resolves how far it really went. */
  walk: (dx, ms) => ipcRenderer.invoke('desk:walk', +dx || 0, +ms || 3000),
  /** Slides half out of the screen at the nearest free side; resolves 'left', 'right' or null. unpeek slides back. */
  peek: (ms) => ipcRenderer.invoke('desk:peek', +ms || 900),
  unpeek: (ms) => ipcRenderer.invoke('desk:unpeek', +ms || 700),
  /** The shortcut for swapping the shopping list and the to-do list was pressed. */
  onSwapList: (fn) => ipcRenderer.on('desk:swapList', () => fn()),
  /** Where the solid parts are, as [left, top, right, bottom] in page pixels: the shell checks the pointer against them itself. */
  setRects: (rects) => ipcRenderer.send('desk:rects', Array.isArray(rects) ? rects.slice(0, 40) : []),
  /** A mouse button is held that went down on Fumu or the toy: stay solid until it is let go. */
  hold: (yes) => ipcRenderer.send('desk:hold', !!yes),
  /** The program in front changed: {kind, name, fullscreen} (kind 'game', 'browser', 'code', 'chat', 'call', 'music', 'video', 'office', 'mail', 'art', 'video-edit', 'launcher', 'files', 'other', 'fullscreen' or 'none'), or null when awareness is on More privacy. Only listed programs have a name. */
  onProgram: (fn) => ipcRenderer.on('desk:program', (_e, p) => fn(p)),
  /** The shortcut for adding an item was pressed. typing(true) asks the shell to give the window the keyboard. */
  onQuickAdd: (fn) => ipcRenderer.on('desk:quickAdd', () => fn()),
  typing: (yes) => ipcRenderer.send('desk:typing', !!yes),
  /** The computer went quiet (true) or someone is back (false): no input for a few minutes, or the screen was locked. */
  onIdle: (fn) => ipcRenderer.on('desk:idle', (_e, idle) => fn(!!idle)),
  /** Hops onto another window ('up') or down to the floor ('down'); resolves true (now on a window), false (down) or null (nothing happened). */
  perch: (want) => ipcRenderer.invoke('desk:perch', want === 'down' ? 'down' : 'up'),
  /** Whether he sits on a window now (also when the shell moved him, e.g. the window closed). */
  onPerched: (fn) => ipcRenderer.on('desk:perched', (_e, yes) => fn(!!yes)),
  /** The settings window asked him to do something now: 'wander', 'peek', 'nap', 'perch' or 'remind'. */
  onDo: (fn) => ipcRenderer.on('desk:do', (_e, what) => fn(String(what))),
  /** Shows Fumu if he was hidden (a reminder). */
  reveal: () => ipcRenderer.send('desk:reveal')
});
