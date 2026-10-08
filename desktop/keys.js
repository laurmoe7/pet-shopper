// The desktop shortcuts: plain functions with no Electron in them, so they can be tested in Node.
// A shortcut is an Electron accelerator such as 'CommandOrControl+Alt+F'; an empty string means the shortcut is off.
'use strict';

/** The shortcuts and what they are for (`{name}` is his name, filled in where they are shown); `hover` ones only work while the pointer is over him. */
var KEY_LIST = [
  { id: 'swapSize', label: 'Small {name} / whole app', def: 'CommandOrControl+Alt+F' },
  { id: 'swapList', label: 'Swap list', def: 'CommandOrControl+Alt+T' },
  { id: 'quickAdd', label: 'Add an item from anywhere', def: 'CommandOrControl+Alt+A' },
  { id: 'sendCopied', label: 'Send my copied text or link (while the pointer is over {name})', def: 'CommandOrControl+Alt+S', hover: true },
  { id: 'options', label: 'Open the settings (while the pointer is over {name})', def: 'CommandOrControl+Alt+O', hover: true }
];

var MODIFIERS = ['CommandOrControl', 'Alt', 'Shift'];
var KEY_NAME = /^([A-Z0-9]|F([1-9]|1[0-9]|2[0-4])|Space|Up|Down|Left|Right|Enter|Tab|Backspace|Delete|Home|End|PageUp|PageDown|Insert)$/;

/**
 * Whether a string can be used as a shortcut: Ctrl and/or Alt (Shift alone would swallow ordinary typing) plus one key. Empty is fine (off).
 * @param {string} accel
 * @returns {boolean}
 */
function valid(accel) {
  if (accel === '') return true;
  if (typeof accel !== 'string') return false;
  var parts = accel.split('+'), key = parts.pop(), seen = {};
  if (!KEY_NAME.test(key)) return false;
  for (var i = 0; i < parts.length; i++) {
    if (MODIFIERS.indexOf(parts[i]) === -1 || seen[parts[i]]) return false;
    seen[parts[i]] = true;
  }
  return !!(seen.CommandOrControl || seen.Alt);
}

/** The defaults, with whatever was saved on top when it is usable and not already taken by an earlier shortcut. */
function clean(saved) {
  var out = {}, used = {};
  KEY_LIST.forEach(function (k) {
    var v = saved && Object.prototype.hasOwnProperty.call(saved, k.id) ? saved[k.id] : k.def;
    if (!valid(v) || (v && used[v.toLowerCase()])) v = used[k.def.toLowerCase()] ? '' : k.def;
    out[k.id] = v;
    if (v) used[v.toLowerCase()] = true;
  });
  return out;
}

/** 'CommandOrControl+Alt+F' as it is written on the keyboard: 'Ctrl+Alt+F'. */
function label(accel) { return accel ? accel.replace('CommandOrControl', 'Ctrl') : 'off'; }

module.exports = { KEY_LIST: KEY_LIST, valid: valid, clean: clean, label: label };
