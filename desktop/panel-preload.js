// What the settings window may ask for: nothing but Fumu's own settings, shortcuts and a few developer actions.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fumuPanel', {
  get: () => ipcRenderer.invoke('panel:get'),
  set: (key, value) => ipcRenderer.invoke('panel:set', key, value),
  rebind: (id, accel) => ipcRenderer.invoke('panel:rebind', id, accel),
  action: (name, arg) => ipcRenderer.invoke('panel:action', name, arg),
  diag: () => ipcRenderer.invoke('panel:diag'),
  dev: (cmd, arg) => ipcRenderer.invoke('panel:dev', cmd, arg),
  onState: (fn) => ipcRenderer.on('panel:state', (_e, s) => fn(s))
});
