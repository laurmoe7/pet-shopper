// Where other programs' windows are, for "Fumu sits on windows". Windows only; it asks the system for the frames of the
// open windows (front to back) and nothing else: no titles, no contents, no program names. Only whether a window has any
// title at all is used, to leave out invisible helper windows.
'use strict';

let api = null;   // null: not tried yet; false: not available (not Windows, or the library did not load)

function load() {
  if (api !== null) return api;
  api = false;
  if (process.platform !== 'win32') return api;
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll'), dwm = koffi.load('dwmapi.dll');
    const RECT = koffi.struct('RECT', { left: 'long', top: 'long', right: 'long', bottom: 'long' });
    const EnumProc = koffi.proto('bool __stdcall FumuEnumProc(void *hwnd, intptr_t lparam)');
    api = {
      koffi,
      EnumProc,
      EnumWindows: user32.func('bool __stdcall EnumWindows(FumuEnumProc *cb, intptr_t lparam)'),
      IsWindowVisible: user32.func('bool __stdcall IsWindowVisible(void *hwnd)'),
      IsIconic: user32.func('bool __stdcall IsIconic(void *hwnd)'),
      TitleLength: user32.func('int __stdcall GetWindowTextLengthW(void *hwnd)'),
      ThreadProcess: user32.func('uint32 __stdcall GetWindowThreadProcessId(void *hwnd, _Out_ uint32 *pid)'),
      ExStyle: user32.func('long __stdcall GetWindowLongW(void *hwnd, int index)'),
      FrameBounds: dwm.func('long __stdcall DwmGetWindowAttribute(void *hwnd, uint32 attr, _Out_ RECT *out, uint32 size)'),
      Cloaked: dwm.func('long __stdcall DwmGetWindowAttribute(void *hwnd, uint32 attr, _Out_ int *out, uint32 size)')
    };
  } catch (e) {
    api = false;
  }
  return api;
}

/** @returns {boolean} Whether windows can be listed on this computer. */
function available() { return !!load(); }

const DWMWA_CLOAKED = 14, DWMWA_EXTENDED_FRAME_BOUNDS = 9, GWL_EXSTYLE = -20, WS_EX_TOOLWINDOW = 0x80;

/**
 * @returns {{id: string, x: number, y: number, width: number, height: number}[]} The frames of the visible windows of other
 * programs, front first, in screen pixels (not yet scaled for the screen's zoom). An empty list when it can't be done.
 */
function list() {
  const a = load();
  if (!a) return [];
  const out = [];
  let cb = null;
  try {
    cb = a.koffi.register((hwnd) => {
      try {
        if (!a.IsWindowVisible(hwnd) || a.IsIconic(hwnd)) return true;
        const cloaked = [0];
        if (a.Cloaked(hwnd, DWMWA_CLOAKED, cloaked, 4) === 0 && cloaked[0]) return true;   // on another virtual desktop, or a suspended app
        if (a.TitleLength(hwnd) <= 0) return true;                                          // helper windows have no title
        if (a.ExStyle(hwnd, GWL_EXSTYLE) & WS_EX_TOOLWINDOW) return true;
        const pid = [0];
        a.ThreadProcess(hwnd, pid);
        if (pid[0] === process.pid) return true;                                            // Fumu's own windows
        const r = {};
        if (a.FrameBounds(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, r, 16) !== 0) return true;    // the visible frame, without the invisible resize border
        const width = r.right - r.left, height = r.bottom - r.top;
        if (width < 200 || height < 80) return true;
        out.push({ id: String(hwnd), x: r.left, y: r.top, width, height });
      } catch (e) { /* skip this window */ }
      return true;
    }, a.koffi.pointer(a.EnumProc));
    a.EnumWindows(cb, 0);
  } catch (e) {
    api = false;   // something is wrong with the library: stop trying
    return [];
  } finally {
    if (cb !== null) { try { a.koffi.unregister(cb); } catch (e) { /* ignore */ } }
  }
  return out;
}

module.exports = { available, list };
