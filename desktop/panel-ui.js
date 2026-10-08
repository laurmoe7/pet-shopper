// The settings window's page: draws the choices from what main.js reports and sends changes back.
'use strict';
(function () {
  var P = window.fumuPanel, root = document.getElementById('root'), S = null, capture = null, note = '', diagTimer = 0, devOpen = false;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function section(title) { var s = el('section'); s.appendChild(el('h2', '', title)); root.appendChild(s); return s; }
  /** A row with a switch. `pref` is the setting's name; `invert` shows the opposite (for "hide" choices written as "show"). */
  function toggle(sec, label, pref, hint, opts) {
    opts = opts || {};
    var row = el('label', 'row' + (opts.disabled ? ' off' : '')), text = el('span', 'text', label);
    if (hint) text.appendChild(el('small', '', hint));
    var sw = el('span', 'sw'), input = el('input'); input.type = 'checkbox'; input.checked = !!S.prefs[pref]; input.disabled = !!opts.disabled;
    input.addEventListener('change', function () { P.set(pref, input.checked).then(take); });
    sw.append(input, el('i'));
    row.append(text, sw); sec.appendChild(row);
  }
  function button(parent, label, fn, cls) { var b = el('button', cls || '', label); b.type = 'button'; b.addEventListener('click', fn); parent.appendChild(b); return b; }
  function act(name, arg) { return function () { P.action(name, arg); }; }

  function render() {
    root.textContent = '';
    document.getElementById('ver').textContent = S.packaged ? '' : 'running from source';
    var upd = section('Updates');
    var updRow = el('div', 'row'), updText = el('span', 'text', S.update ? 'An update is ready.' : 'Fumu updates himself; the page is loaded from the web.');
    updText.appendChild(el('small', '', S.packaged ? 'Restart Fumu or reload to get the latest page. The program itself is checked every few hours.' : 'Running from source: updates are off.'));
    updRow.appendChild(updText); upd.appendChild(updRow);
    var updBtns = el('div', 'btns');
    if (S.update) button(updBtns, 'Restart to update', act('installUpdate'));
    button(updBtns, 'Check for app updates', act('checkUpdates')).disabled = !S.packaged;
    button(updBtns, 'Reload the app (get the latest page)', act('reload'));
    upd.appendChild(updBtns);

    var look = section('His look');
    var sizeRow = el('div', 'row'); sizeRow.appendChild(el('span', 'text', 'Size'));
    var seg = el('span', 'seg');
    [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']].forEach(function (o) { var b = button(seg, o[1], function () { P.set('size', o[0]).then(take); }); if (S.prefs.size === o[0]) b.className = 'on'; });
    sizeRow.appendChild(seg); look.appendChild(sizeRow);
    toggle(look, 'Hide his toy', 'hideToy', 'The ball (or yarn) beside him.');
    toggle(look, 'Hide the cushion under him', 'hideCushion', 'He sits on nothing. At bedtime his bed still shows.');

    var does = section('What he does on his own');
    toggle(does, 'Wanders, peeks and naps', 'roam', 'Every few minutes, only when nothing is open.');
    toggle(does, 'Naps when I am away', 'idle', 'After about 4 minutes without keyboard or mouse, or when the screen is locked. Says hello when you are back.');
    if (S.canPerch) toggle(does, 'Sits on my windows', 'perch', 'Hops onto the top edge of other windows and rides along with them. He only looks at where windows are, never at their titles.');
    toggle(does, 'Reminds me of tasks', 'remind', 'A card by him when a task\'s time comes.');

    var win = section('His window');
    toggle(win, 'Always on top', 'onTop');
    toggle(win, 'Stay above full-screen apps', 'aboveFull', 'Not games in exclusive full-screen.', { disabled: !S.prefs.onTop });
    toggle(win, 'Start with Windows', 'startWithWindows');
    var pos = el('div', 'row'); pos.appendChild(el('span', 'text', 'Move him'));
    var pad = el('span', 'pad');
    [['↖', 'tl'], ['▲', null, [0, -20]], ['↗', 'tr'], ['◀', null, [-20, 0]], ['•', 'reset'], ['▶', null, [20, 0]], ['↙', 'bl'], ['▼', null, [0, 20]], ['↘', 'br']].forEach(function (b) {
      var btn = button(pad, b[0], b[1] === 'reset' ? act('resetPosition') : b[1] ? act('corner', b[1]) : act('nudge', b[2]));
      btn.title = b[1] === 'reset' ? 'Back to the bottom right' : b[1] ? 'To this corner' : 'Nudge';
    });
    pos.appendChild(pad); win.appendChild(pos);

    var keys = section('Shortcuts');
    toggle(keys, 'Shortcuts on', 'hotkeys', 'Works from any program.');
    S.keyList.forEach(function (k) {
      var row = el('div', 'row' + (S.prefs.hotkeys ? '' : ' off')), text = el('span', 'text', k.label);
      var held = S.held[k.id], accel = S.keys[k.id];
      if (S.prefs.hotkeys && accel && !k.hover && !held) text.appendChild(el('small', '', 'Another program is using these keys. Pick others.'));
      if (k.hover && accel) text.appendChild(el('small', '', 'Hold the pointer over Fumu, then press the keys. Also in the right-click menu.'));
      var cap = capture === k.id, kbd = el('kbd', accel && !cap ? '' : 'off', cap ? 'press the keys…' : accel ? accel.replace('CommandOrControl', 'Ctrl') : 'off');
      row.append(text, kbd);
      var change = button(row, cap ? 'Cancel' : 'Change', function () { capture = cap ? null : k.id; note = ''; render(); });
      change.disabled = !S.prefs.hotkeys;
      if (accel && !cap) { var off = button(row, 'Off', function () { P.rebind(k.id, '').then(function (r) { note = r.ok ? '' : r.reason; P.get().then(take); }); }); off.disabled = !S.prefs.hotkeys; }
      keys.appendChild(row);
    });
    keys.appendChild(el('div', 'msg', note));
    var back = el('div', 'btns');
    button(back, 'Back to the usual keys', function () {
      Promise.all(S.keyList.map(function (k) { return P.rebind(k.id, ''); })).then(function () {
        return S.keyList.reduce(function (p, k) { return p.then(function () { return P.rebind(k.id, k.def); }); }, Promise.resolve());
      }).then(function () { note = ''; return P.get(); }).then(take);
    });
    keys.appendChild(back);

    var dev = section('Developer tools');
    var info = el('p', '', 'Make him do something now (in the small window):'); info.style.margin = '4px 0 0'; dev.appendChild(info);
    var doBtns = el('div', 'btns');
    [['wander', 'Wander'], ['peek', 'Peek round the edge'], ['nap', 'Nap'], ['perch', 'Hop on a window / down'], ['remind', 'Test reminder']].forEach(function (d) { button(doBtns, d[1], act('do', d[0])); });
    dev.appendChild(doBtns);
    var tools = el('div', 'btns');
    button(tools, 'Open DevTools', act('devtools'));
    button(tools, 'Open the settings folder', act('openData'));
    button(tools, 'Copy diagnostics', act('copyDiag'));
    button(tools, 'Reset all these settings', function () { if (window.confirm('Put every setting here back to how it was at the start? (Your list and Fumu stay as they are.)')) P.action('resetSettings').then(function () { return P.get(); }).then(take); }, 'warn');
    dev.appendChild(tools);
    var d = el('details'); d.open = devOpen;
    d.appendChild(el('summary', '', 'What the shell sees right now'));
    var pre = el('pre', '', '…'); pre.id = 'diag'; d.appendChild(pre);
    d.addEventListener('toggle', function () { devOpen = d.open; poll(); });
    dev.appendChild(d);
    poll();
  }
  function poll() {
    clearTimeout(diagTimer);
    var pre = document.getElementById('diag'), d = pre && pre.parentNode;
    if (!pre || !d.open) return;
    P.diag().then(function (x) { if (x && document.getElementById('diag')) { document.getElementById('diag').textContent = JSON.stringify(x, null, 2); diagTimer = setTimeout(poll, 1000); } });
  }
  function take(s) { if (s) { S = s; render(); } }

  // changing a shortcut: the next key combination pressed becomes the shortcut (Esc cancels)
  var CODES = { Space: 'Space', Enter: 'Enter', NumpadEnter: 'Enter', Tab: 'Tab', Delete: 'Delete', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };
  function keyName(e) {
    var c = e.code, m;
    if ((m = /^Key([A-Z])$/.exec(c))) return m[1];
    if ((m = /^Digit([0-9])$/.exec(c))) return m[1];
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(c)) return c;
    return CODES[c] || '';
  }
  window.addEventListener('keydown', function (e) {
    if (!capture) { if (e.key === 'Escape' && !e.ctrlKey && !e.altKey) window.close(); return; }
    e.preventDefault();
    if (e.key === 'Escape') { capture = null; note = ''; render(); return; }
    var key = keyName(e);
    if (!key) return;   // only modifiers so far
    var accel = [e.ctrlKey || e.metaKey ? 'CommandOrControl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : '', key].filter(Boolean).join('+'), id = capture;
    capture = null;
    P.rebind(id, accel).then(function (r) { note = r.ok ? '' : r.reason; return P.get(); }).then(take);
  }, true);

  P.onState(take);   // a change made from the right-click menu or by a shortcut shows here too
  P.get().then(take);
})();
