// The settings window's page: draws the choices from what main.js reports and sends changes back.
'use strict';
(function () {
  var P = window.fumuPanel, root = document.getElementById('root'), S = null, capture = null, note = '', diagTimer = 0, devOpen = false;

  /** His name, the one the player gave him (the shell passes it on). */
  function nm() { return (S && S.petName) || 'Fumu'; }
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
    document.getElementById('ver').textContent = (S.packaged ? '' : 'running from source · ') + (S.channel === 'stable' ? 'stable channel' : 'dev channel');
    // friends use the stable channel: updating is a normal part of settings for them (for the dev channel it stays in the developer tools)
    if (S.channel === 'stable') {
      var upd = section('Updates'), us = S.updateState || { state: 'idle' };
      var said = us.state === 'checking' ? 'Checking for updates…' : us.state === 'downloading' ? 'Downloading an update' + (us.percent ? ' (' + us.percent + '%)' : '…') : us.state === 'ready' ? 'An update is ready. Restart Fumufumu to get it.' : us.state === 'none' ? 'Fumufumu is up to date.' : us.state === 'error' ? 'Could not check for updates (are you online?).' : 'Fumufumu updates itself in the background.';
      var urow = el('div', 'row'), utext = el('span', 'text', said);
      utext.appendChild(el('small', '', 'Updates install when you quit.'));
      urow.appendChild(utext); upd.appendChild(urow);
      var ubtns = el('div', 'btns');
      if (S.update) button(ubtns, 'Restart to update', act('installUpdate'));
      var chk = button(ubtns, 'Check for updates', act('checkUpdates')); chk.disabled = !S.packaged || us.state === 'checking' || us.state === 'downloading' || us.state === 'ready';
      button(ubtns, 'Reload the app (get the latest page)', act('reload'));
      upd.appendChild(ubtns);
    }

    // how much he may notice (awareness level 1 or 2): the privacy choice comes first
    var priv = section('Privacy: what he can notice');
    var lv = S.privacy.levels, cur = S.prefs.awareness === 1 ? 1 : 2;
    var pickRow = el('div', 'row'); pickRow.appendChild(el('span', 'text', 'Awareness'));
    var pseg = el('span', 'seg');
    [1, 2].forEach(function (n) { var b = button(pseg, lv[n].title, function () { P.set('awareness', n).then(take); }); if (cur === n) b.className = 'on'; });
    pickRow.appendChild(pseg); priv.appendChild(pickRow);
    var what = el('div', 'row note'), whatText = el('span', 'text', lv[cur].text);
    whatText.appendChild(el('small', '', S.privacy.always));
    what.appendChild(whatText); priv.appendChild(what);

    if (cur === 2) {
      // how often he remarks on what you are doing (nothing else he says is affected): one choice for the usual case, one for games and full-screen
      function chatRow(label, hint, pref) {
        var row = el('div', 'row'), text = el('span', 'text', label); text.appendChild(el('small', '', hint));
        var seg2 = el('span', 'seg');
        S.privacy.chatLevels.forEach(function (l) { var b = button(seg2, l.label, function () { P.set(pref, l.id).then(take); }); if (S.prefs[pref] === l.id) b.className = 'on'; });
        row.append(text, seg2); priv.appendChild(row);
      }
      chatRow('Remarks about what I am doing', 'Like "are you drawing?"', 'chatNormal');
      chatRow('…in a game or full-screen', 'Cheers, lines while you play, "good game".', 'chatFull');
      var seeRow = el('div', 'row note'), seeText = el('span', 'text', 'Right now he sees: …'); seeText.id = 'progHint';
      seeRow.appendChild(seeText); priv.appendChild(seeRow);
      var teach = el('div', 'row note'), teachText = el('span', 'text', 'Teach him a game'), tsmall = el('small', '', 'Switch to the game, come back, type its name.');
      tsmall.id = 'teachHint'; teachText.appendChild(tsmall);
      var tin = el('input'); tin.type = 'text'; tin.maxLength = 40; tin.placeholder = 'Name of the game'; tin.id = 'teachName'; tin.style.cssText = 'font:inherit;font-size:.85rem;padding:3px 8px;border:1.8px solid var(--outline);border-radius:10px;background:var(--surface);color:var(--ink);width:150px';
      var tgo = button(teach, 'Teach him', function () { if (!tin.value.trim()) return; P.action('teachGame', tin.value.trim()).then(function (ok) { document.getElementById('teachHint').textContent = ok ? 'Learned. Next time he will cheer for it.' : 'He has not seen an unknown program yet.'; tin.value = ''; }); });
      teach.insertBefore(tin, tgo); teach.insertBefore(teachText, tin); priv.appendChild(teach);
    }

    var look = section('His look');
    var sizeRow = el('div', 'row'); sizeRow.appendChild(el('span', 'text', 'Size'));
    var seg = el('span', 'seg');
    [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']].forEach(function (o) { var b = button(seg, o[1], function () { P.set('size', o[0]).then(take); }); if (S.prefs.size === o[0]) b.className = 'on'; });
    sizeRow.appendChild(seg); look.appendChild(sizeRow);
    toggle(look, 'Hide his toy', 'hideToy');
    toggle(look, 'Hide the cushion under him', 'hideCushion', 'His bed still shows at bedtime.');

    var does = section('What he does on his own');
    // how much he talks on his own: his idle chatter, daydreams, asking for things. Reminders, greetings and answers to you are never held back.
    function talkRow(label, hint, pref) {
      var row = el('div', 'row'), text = el('span', 'text', label); text.appendChild(el('small', '', hint));
      var seg3 = el('span', 'seg');
      S.privacy.chatLevels.forEach(function (l) { var b = button(seg3, l.label, function () { P.set(pref, l.id).then(take); }); if (S.prefs[pref] === l.id) b.className = 'on'; });
      row.append(text, seg3); does.appendChild(row);
    }
    talkRow('How much he chats on his own', 'Reminders and replies are never held back.', 'talkNormal');
    talkRow('…in a game or full-screen', 'Needs Normal awareness.', 'talkFull');
    toggle(does, 'Wanders, peeks and naps', 'roam');
    toggle(does, 'Naps when I am away', 'idle', 'After 4 idle minutes or a locked screen.');
    if (S.canPerch && cur === 1) {
      var offRow = el('div', 'row off'); var offText = el('span', 'text', 'Sits on my windows'); offText.appendChild(el('small', '', 'Needs Normal awareness.')); offRow.appendChild(offText); does.appendChild(offRow);
    } else if (S.canPerch) {
      toggle(does, 'Sits on my windows', 'perch', 'Hops onto other windows. He never sees their titles.');
      if (S.prefs.perch) { var hint = el('small', '', 'Looking…'); hint.id = 'perchHint'; does.lastChild.querySelector('.text').appendChild(hint); }
    }
    toggle(does, 'Reminds me of tasks', 'remind');
    toggle(does, 'Stands in place', 'standStill', 'No wandering, peeking or hopping.');
    toggle(does, 'Stands in place in a game or full-screen', 'standStillFull', 'Needs Normal awareness.', { disabled: cur === 1 });

    var win = section('His window');
    toggle(win, 'Always on top', 'onTop');
    toggle(win, 'Stay above full-screen apps', 'aboveFull', 'Not exclusive full-screen games.', { disabled: !S.prefs.onTop });
    toggle(win, 'Start with Windows', 'startWithWindows');
    var pos = el('div', 'row'); pos.appendChild(el('span', 'text', 'Move him'));
    var pad = el('span', 'pad');
    [['↖', 'tl'], ['▲', null, [0, -20]], ['↗', 'tr'], ['◀', null, [-20, 0]], ['•', 'reset'], ['▶', null, [20, 0]], ['↙', 'bl'], ['▼', null, [0, 20]], ['↘', 'br']].forEach(function (b) {
      var btn = button(pad, b[0], b[1] === 'reset' ? act('resetPosition') : b[1] ? act('corner', b[1]) : act('nudge', b[2]));
      btn.title = b[1] === 'reset' ? 'Back to the bottom right' : b[1] ? 'To this corner' : 'Nudge';
    });
    pos.appendChild(pad); win.appendChild(pos);

    var keys = section('Shortcuts');
    toggle(keys, 'Shortcuts on', 'hotkeys');
    S.keyList.forEach(function (k) {
      var row = el('div', 'row' + (S.prefs.hotkeys ? '' : ' off')), text = el('span', 'text', k.label.replace('{name}', nm()));
      var held = S.held[k.id], accel = S.keys[k.id];
      if (S.prefs.hotkeys && accel && !k.hover && !held) text.appendChild(el('small', '', 'Another program uses these keys.'));
      if (k.hover && accel) text.appendChild(el('small', '', 'Point at ' + nm() + ' and press.'));
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
    [['wander', 'Wander'], ['peek', 'Peek round the edge'], ['nap', 'Nap'], ['perch', 'Hop on a window / down'], ['sit', 'Sit / stand (soles)'], ['remind', 'Test reminder']].forEach(function (d) { button(doBtns, d[1], act('do', d[0])); });
    dev.appendChild(doBtns);
    var tools = el('div', 'btns');
    if (S.update) button(tools, 'Restart to update', act('installUpdate'));
    button(tools, 'Check for app updates', act('checkUpdates')).disabled = !S.packaged;
    button(tools, 'Reload the app (get the latest page)', act('reload'));
    button(tools, 'Open DevTools', act('devtools'));
    button(tools, 'Open the settings folder', act('openData'));
    button(tools, 'Copy diagnostics', act('copyDiag'));
    button(tools, 'Reset all these settings', function () { if (window.confirm('Reset all these settings?')) P.action('resetSettings').then(function () { return P.get(); }).then(take); }, 'warn');
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
  // while "sits on my windows" is on, say how many windows he could sit on right now (so you can tell it is working)
  setInterval(function () {
    var seen = document.getElementById('progHint');
    if (seen) P.diag().then(function (x) {
      var el2 = document.getElementById('progHint'); if (!x || !el2) return;
      var p = x.program, kinds = { game: 'a game', browser: 'a browser', code: 'a coding program', chat: 'a chat program', call: 'a call', music: 'music', video: 'a video player', office: 'an office program', mail: 'mail', art: 'an art program', 'video-edit': 'a video editor', launcher: 'a game launcher', files: 'the file explorer', other: 'something else', fullscreen: 'something full-screen', none: 'nothing yet' };
      el2.textContent = 'Right now he sees: ' + (!p ? 'nothing yet' : (p.name ? p.name + ' (' + kinds[p.kind] + ')' : kinds[p.kind] || 'something else')) + (p && p.fullscreen ? ', full-screen' : '') + (x.lastUnknownProgram ? '. Last program he could not name: ' + x.lastUnknownProgram : '') + '.';
    });
    var h = document.getElementById('perchHint');
    if (!h) return;
    P.diag().then(function (x) {
      if (!x || !document.getElementById('perchHint')) return;
      var n = x.perchesNow;
      document.getElementById('perchHint').textContent = n === null ? '' : n ? 'Could sit on ' + n + ' window edge' + (n > 1 ? 's' : '') + ' now.' : 'No window has room above it.';
    });
  }, 2000);

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
