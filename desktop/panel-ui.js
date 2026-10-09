// The settings window's page: draws the choices from what main.js reports and sends changes back.
'use strict';
(function () {
  var P = window.fumuPanel, root = document.getElementById('root'), S = null, capture = null, note = '', diagTimer = 0, devOpen = false, devNote = '', devGroups = { 'Time of day and scenes': true };

  /** His name, the one the player gave him (the shell passes it on). */
  function nm() { return (S && S.petName) || 'Fumu'; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function section(title) { var s = el('section'); s.appendChild(el('h2', '', title)); root.appendChild(s); return s; }
  /** A row with a switch. `pref` is the setting's name; `invert` shows the opposite (for "hide" choices written as "show"). */
  function toggle(sec, label, pref, hint, opts) {
    opts = opts || {};
    var row = el('label', 'row' + (opts.disabled ? ' off' : '')), text = el('span', 'text', label);
    if (hint) text.appendChild(el('small', '', hint));
    var sw = el('span', 'sw'), input = el('input'); input.type = 'checkbox'; input.checked = opts.invert ? !S.prefs[pref] : !!S.prefs[pref]; input.disabled = !!opts.disabled;
    input.addEventListener('change', function () { P.set(pref, opts.invert ? !input.checked : input.checked).then(take); });
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
    var always = el('small', ''), ai = S.privacy.always.indexOf('never');
    if (ai < 0) always.textContent = S.privacy.always;
    else always.append(S.privacy.always.slice(0, ai), el('u', '', 'never'), S.privacy.always.slice(ai + 5));
    whatText.appendChild(always);
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
    var alertRow = el('div', 'row'); alertRow.appendChild(el('span', 'text', 'Alert style'));
    var alertSeg = el('span', 'seg');
    [['paper', 'Paper'], ['night', 'Night'], ['sweet', 'Sweet'], ['cool', 'Cool'], ['quest', 'Quest'], ['classic', 'Plain']].forEach(function (o) { var b = button(alertSeg, o[1], function () { P.set('alertStyle', o[0]).then(take); }); if ((S.prefs.alertStyle || 'paper') === o[0]) b.className = 'on'; });
    alertRow.appendChild(alertSeg); look.appendChild(alertRow);
    toggle(look, 'Speech bubbles', 'bubbles', 'In the small window. Alerts still show.');
    toggle(look, 'Thought bubbles', 'clouds', 'Daydreams and wishes.');
    toggle(look, 'Sparkles around him', 'sparkles');
    toggle(look, 'Room background', 'backdrop', 'The scene from the whole app.');
    toggle(look, 'Sounds', 'mute', 'In the small window.', { invert: true });
    toggle(look, 'Show his toy', 'hideToy', '', { invert: true });
    toggle(look, 'Toy flies around the screen', 'toyRoam', '', { disabled: !!S.prefs.hideToy });
    toggle(look, 'Show the cushion under him', 'hideCushion', 'His bed still shows at bedtime.', { invert: true });

    var does = section('What he does on his own');
    // how much he talks on his own: his idle chatter, daydreams, asking for things. Reminders, greetings and answers to you are never held back.
    function talkRow(label, hint, pref) {
      var row = el('div', 'row'), text = el('span', 'text', label); text.appendChild(el('small', '', hint));
      var seg3 = el('span', 'seg');
      S.privacy.chatLevels.forEach(function (l) { var b = button(seg3, l.label, function () { P.set(pref, l.id).then(take); }); if (S.prefs[pref] === l.id) b.className = 'on'; });
      row.append(text, seg3); does.appendChild(row);
    }
    talkRow('How much he chats on his own', 'Reminders and replies are never held back.', 'talkNormal');
    if (cur === 1) {
      var tfRow = el('div', 'row off'), tfText = el('span', 'text', '…in a game or full-screen'); tfText.appendChild(el('small', '', 'Needs Normal awareness.')); tfRow.appendChild(tfText); does.appendChild(tfRow);
    } else talkRow('…in a game or full-screen', 'Needs Normal awareness.', 'talkFull');
    // how much he moves about on his own: one choice for the usual case, one for games and full-screen (his room only when its background shows)
    function moveRow(label, hint, pref, off) {
      var row = el('div', 'row' + (off ? ' off' : '')), text = el('span', 'text', label); if (hint) text.appendChild(el('small', '', hint));
      row.appendChild(text);
      if (!off) {
        var seg4 = el('span', 'seg');
        S.privacy.moveLevels.filter(function (l) { return l.id !== 'room' || S.prefs.backdrop; }).forEach(function (l) {
          var cur4 = S.prefs[pref] === 'room' && !S.prefs.backdrop ? 'normal' : S.prefs[pref];
          var b = button(seg4, l.label, function () { P.set(pref, l.id).then(take); }); if (cur4 === l.id) b.className = 'on';
        });
        row.appendChild(seg4);
      }
      does.appendChild(row);
    }
    moveRow('How much he moves about', '', 'moveNormal');
    moveRow('…in a game or full-screen', cur === 1 ? 'Needs Normal awareness.' : '', 'moveFull', cur === 1);
    if (S.canPerch && cur === 1) {
      var offRow = el('div', 'row off'); var offText = el('span', 'text', 'Sits on my windows'); offText.appendChild(el('small', '', 'Needs Normal awareness.')); offRow.appendChild(offText); does.appendChild(offRow);
    } else if (S.canPerch) {
      toggle(does, 'Sits on my windows', 'perch');
      if (S.prefs.perch) { var hint = el('small', '', 'Looking…'); hint.id = 'perchHint'; does.lastChild.querySelector('.text').appendChild(hint); }
    }
    toggle(does, 'Reminds me of tasks', 'remind');

    var win = section('His window');
    toggle(win, 'Always on top', 'onTop');
    toggle(win, 'Stay above full-screen apps', 'aboveFull', 'Not exclusive full-screen games.', { disabled: !S.prefs.onTop });
    toggle(win, 'Mouse reaches him in games', 'catchGames', 'Off: games keep the mouse.');
    toggle(win, 'Start with Windows', 'startWithWindows');
    var pos = el('div', 'row'), ptext = el('span', 'text', 'His place');
    ptext.appendChild(el('small', '', 'If he gets stuck off the screen.'));
    pos.appendChild(ptext);
    button(pos, 'Put him back', act('resetPosition'));
    win.appendChild(pos);

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
    var status = el('p', 'devnote', devNote); dev.appendChild(status);
    function say(msg) { devNote = msg || ''; status.textContent = devNote; }
    /** A button that calls one of the page's developer functions (see window.deskDev in app-desktop.js) and shows what it says. */
    function devBtn(parent, label, cmd, arg, cls) { return button(parent, label, function () { P.dev(cmd, arg).then(function (r) { say(typeof r === 'string' ? r : ''); showState(); }); }, cls); }
    /** One fold-out group of the developer tools. */
    function group(title, hint) {
      var d = el('details'); d.open = !!devGroups[title];
      d.appendChild(el('summary', '', title));
      d.addEventListener('toggle', function () { devGroups[title] = d.open; });
      if (hint) { var h = el('p', 'hint', hint); d.appendChild(h); }
      var box = el('div', 'btns'); d.appendChild(box); dev.appendChild(d);
      return box;
    }

    // time of day and scenes: the five scenes he can be in on the desktop (CLAUDE.md), set up in one click
    var time = group('Time of day and scenes', 'The clock changes what he does: bed at night, the toy by day.');
    var seg = el('div', 'seg');
    [['auto', 'Real clock'], ['day', 'Day'], ['night', 'Night']].forEach(function (c) { devBtn(seg, c[1], 'clock', c[0]); });
    time.appendChild(seg);
    var scenesBox = el('div', 'btns'); time.parentNode.appendChild(scenesBox);
    [['day', 'Day'], ['day-clip', 'Day, clipboard'], ['night-bed', 'Night, in bed'], ['night-drowsy', 'Night, drowsy'], ['night-drowsy-clip', 'Night, drowsy, clipboard']].forEach(function (c) { devBtn(scenesBox, c[1], 'scene', c[0]); });
    var now = el('p', 'hint', 'Now: …'); time.parentNode.appendChild(now);
    function showState() { P.dev('state').then(function (x) { if (x && document.body.contains(now)) now.textContent = 'Now: ' + x.scene + ' · clock ' + x.clock + ' · ' + x.list + ' list'; }); }
    showState();

    var does = group('Make him do something');
    [['wander', 'Wander'], ['peek', 'Peek round the edge'], ['perch', 'Hop on a window / down'], ['sit', 'Sit / stand (soles)'], ['nap', 'Nap'], ['ring', 'Open the ring menu'], ['remark', 'Remark about a program'], ['gameremark', 'Remark about a game'], ['headfall', 'Land on his head'], ['bellring', 'Ring the bell'], ['bellbreak', 'Break the bell'], ['nightlight', 'Night light on / off']].forEach(function (d) { devBtn(does, d[1], 'run', d[0]); });

    var alerts = group('Alerts');
    [['remind', 'Task alert'], ['claude', 'Claude alert'], ['note', 'Note alert'], ['link', 'Link alert'], ['update', 'Update ready card']].forEach(function (d) { devBtn(alerts, d[1], 'run', d[0]); });

    var stuff = group('Pet and lists');
    [['snack', 'He asks for a snack'], ['suggest', 'He suggests an item'], ['giftday', 'Pretend the next special day (gifts)'], ['giftshut', 'Shut today\'s gifts again'], ['tomorrow', 'Skip to tomorrow'], ['sample', 'Fill with sample items'], ['clear', 'Clear the list']].forEach(function (d) { devBtn(stuff, d[1], 'run', d[0], d[0] === 'clear' ? 'warn' : ''); });

    // the animation player: every animation by name, played on the small Fumu
    var anim = el('details'); anim.open = !!devGroups['Animations'];
    anim.appendChild(el('summary', '', 'Animations'));
    var abox = el('div'); anim.appendChild(abox); dev.appendChild(anim);
    var loaded = false;
    function loadAnims() {
      if (loaded) return; loaded = true;
      abox.appendChild(el('p', 'hint', 'Loading…'));
      P.dev('animations').then(function (list) {
        abox.textContent = '';
        if (!list) { abox.appendChild(el('p', 'hint', 'Open the small Fumu first.')); loaded = false; return; }
        var top = el('div', 'btns'), filter = el('input'); filter.type = 'search'; filter.placeholder = 'Search ' + list.length + ' animations'; filter.className = 'filter';
        top.appendChild(filter); devBtn(top, 'Stop', 'stop'); abox.appendChild(top);
        var holder = el('div'); abox.appendChild(holder);
        function draw() {
          var q = filter.value.trim().toLowerCase(), order = [], groups = {};
          list.forEach(function (a, i) { if (q && a.n.toLowerCase().indexOf(q) === -1 && a.g.toLowerCase().indexOf(q) === -1) return; if (!groups[a.g]) { groups[a.g] = []; order.push(a.g); } groups[a.g].push(i); });
          holder.textContent = '';
          order.forEach(function (g) {
            holder.appendChild(el('h3', '', g));
            var row = el('div', 'btns chips');
            groups[g].forEach(function (i) { devBtn(row, list[i].n, 'play', i); });
            holder.appendChild(row);
          });
          if (!order.length) holder.appendChild(el('p', 'hint', 'Nothing matches.'));
        }
        filter.addEventListener('input', draw); draw();
      });
    }
    anim.addEventListener('toggle', function () { devGroups['Animations'] = anim.open; if (anim.open) loadAnims(); });
    if (anim.open) loadAnims();

    var appBox = group('The program');
    if (S.update) button(appBox, 'Restart to update', act('installUpdate'));
    button(appBox, 'Check for app updates', act('checkUpdates')).disabled = !S.packaged;
    button(appBox, 'Reload the app (get the latest page)', act('reload'));
    button(appBox, 'Open DevTools', act('devtools'));
    button(appBox, 'Open the settings folder', act('openData'));
    button(appBox, 'Copy diagnostics', act('copyDiag'));
    button(appBox, 'Reset all these settings', function () { if (window.confirm('Reset all these settings?')) P.action('resetSettings').then(function () { return P.get(); }).then(take); }, 'warn');
    var d = el('details'); d.open = devOpen;
    d.appendChild(el('summary', '', 'What the shell sees right now'));
    var pre = el('pre', '', '…'); pre.id = 'diag'; d.appendChild(pre);
    d.addEventListener('toggle', function () { devOpen = d.open; poll(); });
    appBox.parentNode.appendChild(d);
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
      var p = x.program, kinds = { game: 'a game', browser: 'a browser', code: 'a coding program', chat: 'a chat program', ai: 'Claude', call: 'a call', music: 'music', video: 'a video player', office: 'an office program', mail: 'mail', art: 'an art program', 'video-edit': 'a video editor', launcher: 'a game launcher', files: 'the file explorer', other: 'something else', fullscreen: 'something full-screen', none: 'nothing yet' };
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

  // the bottom edge fades while there is more to scroll to, like the menus in the app
  (function () {
    var f = document.getElementById('fade');
    function upd() { f.style.opacity = document.documentElement.scrollHeight - window.scrollY - window.innerHeight > 6 ? 1 : 0; }
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd);
    new MutationObserver(upd).observe(root, { childList: true, subtree: true });
    setInterval(upd, 600); upd();
  })();
})();
