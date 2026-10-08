// The desktop shell (desktop/ folder, Electron): only active inside it, where the shell gives the page `window.nibbleDesktop`.
// In a browser or on the phone nothing here runs. The window has two modes: 'pet' (Fumu alone on a transparent
// window, clicks pass through everywhere except on him) and 'list' (the whole app in a bigger window with a small bar).
// The mode lives in the shell; this file shows it as a class on <html> and passes the pointer on to it.
'use strict';

(function () {
  var D = window.nibbleDesktop;
  if (!D) return;
  var root = document.documentElement, PICK_MS = 450, STILL_PX = 6;
  root.classList.add('desktop');

  // quiet by default on the desktop: the first time on this PC sounds are switched off (Options can bring them back)
  try {
    if (!localStorage.getItem('nibble.desktop')) {
      localStorage.setItem('nibble.desktop', '1');
      state.quiet = true;
      save();
    }
  } catch (e) { /* storage blocked */ }

  function isPet() { return root.classList.contains('desktop-pet'); }

  // the small bar over the list: drag to move the window, back to Fumu, hide
  var bar = document.createElement('div');
  bar.id = 'deskBar';
  bar.innerHTML = '<span class="desk-title">Fumufumu</span><button type="button" id="deskBack">Back to Fumu</button><button type="button" id="deskHide" aria-label="Hide Fumu">Hide</button>';
  document.body.appendChild(bar);
  $('deskBack').addEventListener('click', function () { D.setMode('pet'); });
  $('deskHide').addEventListener('click', function () { D.hide(); });

  function showMode(mode) {
    root.classList.toggle('desktop-pet', mode !== 'list');
    root.classList.toggle('desktop-list', mode === 'list');
    var sel = window.getSelection && window.getSelection(); if (sel) sel.removeAllRanges();   // nothing stays highlighted across a switch
    if (mode !== 'list') for (var i = 0, open = document.querySelectorAll('dialog[open]'); i < open.length; i++) open[i].close();
    if (typeof fadeSoon === 'function') fadeSoon();
    if (typeof refreshBedtime === 'function') refreshBedtime();   // the small window has no lamp: at night the light is off there
  }
  D.onMode(showMode);
  D.getMode().then(function (m) { showMode(m); D.ready(); });

  // anything that opens a sheet (a gift, the dressing room...) needs room: switch to the bigger window
  new MutationObserver(function (list) {
    if (!isPet()) return;
    for (var i = 0; i < list.length; i++) if (list[i].target.tagName === 'DIALOG' && list[i].target.open) { D.setMode('list'); return; }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

  // clicks go to Fumu only where something solid is under the pointer; elsewhere they pass to the desktop
  var lastSolid = null, lastSent = 0;
  var SOLID = '#pet, .bubble, .gift, .wish, .toy, .suggest, .dream, .inbox-card';   // (the reminder card is an .inbox-card too)
  /** Tells the shell whether clicks should be caught; sent when it changes and now and then anyway, so the two can't drift apart. */
  function setSolid(yes) {
    var now = Date.now();
    if (yes !== lastSolid || now - lastSent > 800) { lastSolid = yes; lastSent = now; D.solid(yes); }
  }
  function hoverAt(x, y) {
    if (!isPet()) return;
    if (x < 0) { setSolid(false); return; }
    var el = document.elementFromPoint(x, y);
    setSolid(!!(el && el.closest && el.closest(SOLID)));
  }
  document.addEventListener('mousemove', function (e) { hoverAt(e.clientX, e.clientY); }, true);
  // the shell also reports where the pointer is (Windows can stop forwarding it after a resize). An older shell has no such call, so ask first:
  // the page is loaded from the web and can be newer than the installed program
  if (D.onCursor) D.onCursor(hoverAt);
  if (D.onResync) D.onResync(function () { lastSolid = null; });   // the shell changed the window: say again whether clicks are caught
  document.addEventListener('mouseleave', function () { hoverAt(-1, -1); });
  new MutationObserver(function () { lastSolid = null; }).observe(root, { attributes: true, attributeFilter: ['class'] });

  // pick Fumu up: hold still on him for a moment, then drag the window; letting go puts him down
  var press = null, carried = false, noClickUntil = 0;
  function drop() {
    if (press && press.timer) clearTimeout(press.timer);
    if (carried) { D.dragEnd(); noClickUntil = Date.now() + 400; carried = false; }
    press = null;
  }
  pet.addEventListener('pointerdown', function (e) {
    if (!isPet() || e.button !== 0) return;
    press = { x: e.screenX, y: e.screenY, id: e.pointerId, timer: setTimeout(function () {
      if (!press) return;
      press.timer = 0; carried = true;
      try { pet.setPointerCapture(press.id); } catch (err) { /* ignore */ }
      D.dragStart();
      if (typeof pulse === 'function') pulse('hop', 460);
      if (typeof say === 'function') say(['wheee!', 'hehe, up we go', 'where to?'][Math.floor(Math.random() * 3)], 1200);
    }, PICK_MS) };
  }, true);
  pet.addEventListener('pointermove', function (e) {
    if (!press) return;
    if (carried) { e.stopImmediatePropagation(); D.dragMove(e.screenX - press.x, e.screenY - press.y); return; }
    if (Math.hypot(e.screenX - press.x, e.screenY - press.y) > STILL_PX) { clearTimeout(press.timer); press.timer = 0; press = null; }   // a stroke, not a pick-up
  }, true);
  pet.addEventListener('pointerup', drop, true);
  pet.addEventListener('pointercancel', drop, true);
  pet.addEventListener('click', function (e) { if (Date.now() < noClickUntil) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  // quick ways between the small Fumu and the whole app: a middle click on him, a double click on the bar, or the shell's shortcuts
  pet.addEventListener('auxclick', function (e) { if (e.button === 1 && isPet()) { e.preventDefault(); D.setMode('list'); } });
  pet.addEventListener('mousedown', function (e) { if (e.button === 1) e.preventDefault(); });   // no autoscroll circle
  bar.addEventListener('dblclick', function (e) { if (e.target === bar || e.target.className === 'desk-title') D.setMode('pet'); });
  if (D.onSwapList) D.onSwapList(function () { if (typeof switchList === 'function') switchList(); });   // the shortcut for shopping / to-do

  document.addEventListener('contextmenu', function (e) { e.preventDefault(); D.menu(); });

  // a note on the shortcuts, in Options, only here in the PC app (the phone has none of them)
  (function () {
    var row = document.createElement('div');
    row.className = 'option';
    row.innerHTML = '<span class="option-title">Shortcuts on this PC</span>';
    var t = document.createElement('span');
    t.className = 'option-text desk-keys';
    t.innerHTML = '<b>Ctrl+Alt+F</b> small Fumu ⇄ whole app<br><b>Ctrl+Alt+T</b> shopping ⇄ to-do list<br><b>Ctrl+Alt+A</b> add an item from any program<br>Middle-click Fumu: open the app. Double-click the bar: back to Fumu.<br>Right-click Fumu for size, position and more.';
    row.appendChild(t);
    optionsList.insertBefore(row, optionsList.children[2] || null);
  })();

  // ---------- what the tray menu chose (an older shell has none of this: then the defaults stay) ----------
  var deskPrefs = { roam: true, remind: true, idle: true, perch: false };
  if (D.getPrefs) D.getPrefs().then(function (p) { if (p) deskPrefs = p; });
  if (D.onPrefs) D.onPrefs(function (p) { if (p) deskPrefs = p; });

  // ---------- a reminder for a task's time ----------
  // timeCheck (app-todo.js) asks here first. In pet mode Fumu pops up if he was hidden and a card by him says what is
  // due, with Done (when the task is on the list in view), "In 10 min" and a cross. Only one card at a time; more wait.
  var remindQueue = [], SNOOZE_MS = 10 * 60 * 1000;
  function remindCard() { return document.querySelector('.remind-card'); }
  function showRemind() {
    if (remindCard() || !remindQueue.length) return;
    var item = remindQueue.shift();
    if (item.done) { showRemind(); return; }   // ticked off meanwhile
    if (inboxCard) { remindQueue.unshift(item); setTimeout(showRemind, 3000); return; }   // the card for a message is up: wait a moment
    var card = document.createElement('div');
    card.className = 'inbox-card remind-card';
    card.setAttribute('role', 'alert');
    var img = emojiImg(item.emoji, '');
    img.className = 'inbox-icon';
    var text = document.createElement('div'), t = document.createElement('b'), d = document.createElement('span');
    text.className = 'inbox-text';
    t.textContent = item.text;
    d.textContent = (item.time ? 'at ' + fmtTime(item.time) : 'now') + (remindQueue.length ? ' · +' + remindQueue.length + ' more' : '');
    text.append(t, d);
    var acts = document.createElement('div');
    acts.className = 'inbox-actions';
    function close() { card.remove(); setTimeout(showRemind, 300); }
    function button(label, fn, cls) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label; if (cls) b.className = cls;
      b.addEventListener('click', function (e) { e.stopPropagation(); sound('tap'); fn(); });
      acts.appendChild(b);
      return b;
    }
    if (state.items.indexOf(item) !== -1 && isTodo()) button('Done ✓', function () { close(); toggle(item.id); });
    button('In 10 min', function () {
      close();
      setTimeout(function () { if (!item.done && (state.items.indexOf(item) !== -1 || state.stash.indexOf(item) !== -1)) { remindQueue.push(item); showRemind(); } }, SNOOZE_MS);
      say(pick(['ok, I\'ll remind you!', 'back in 10 minutes!', 'I\'ll poke you later ♡']), 1500);
    });
    button('✕', close, 'inbox-done').setAttribute('aria-label', 'Dismiss');
    card.append(img, text, acts);
    document.querySelector('.stage').appendChild(card);
    setFace(FACES.tada);
    pulse('hop', 460);
    sound('ring');
  }
  /**
   * @param {Object[]} items  Tasks whose time just came.
   * @returns {boolean} Whether a card took over (then the bubble stays quiet).
   */
  window.deskRemind = function (items) {
    if (deskPrefs.remind === false) return false;
    if (D.reveal) D.reveal();   // he may be hidden: bring him back, without taking the keyboard
    if (!isPet()) return false; // the big window shows the usual bubble
    if (peeking) endPeek();
    if (typeof wakeFromNap === 'function') wakeFromNap(false);
    items.forEach(function (i) { remindQueue.push(i); });
    showRemind();
    return true;
  };

  // ---------- Fumu does things on his own: wander along the screen, peek round the edge, nap ----------
  var peeking = false, roaming = false, away = false, awayAt = 0, awayNap = false, perched = false;
  function roamOk() {
    return deskPrefs.roam !== false && isPet() && !document.hidden && !roaming && !peeking && !away && !carried && !press && !busy && !walking && !dreaming &&
      !(typeof napping !== 'undefined' && napping) && baseState() !== 'sleepy' && !stage.classList.contains('bedtime') &&
      !document.querySelector('dialog[open], .inbox-card') && bubble.hidden && suggestEl.hidden;
  }
  function lookToward(dir) { pet.style.setProperty('--look-x', (dir > 0 ? 3.2 : -3.2) + 'px'); }
  function stopLook() { pet.style.removeProperty('--look-x'); }
  /** A stroll along where he sits: the window glides, the feet go. */
  function wander() {
    if (!D.walk) return;
    var dir = Math.random() < 0.5 ? -1 : 1, dx = dir * (140 + Math.random() * 280), ms = Math.round(Math.abs(dx) * 12);
    roaming = true;
    setFace(FACES.dreamy);
    pet.classList.add('walking');
    lookToward(dir);
    D.walk(dx, ms).then(function (went) {
      if (went === 0) return D.walk(-dx, ms);   // no room that way: the other way (null = picked up: leave it)
      return went;
    }).then(function () {
      pet.classList.remove('walking'); stopLook(); roaming = false;
      if (!busy) { settle(); if (Math.random() < 0.5) say(pick(['nice walk~', 'hmm hm hm ♪', 'fumu fumu~']), 1400); }
    }, function () { pet.classList.remove('walking'); stopLook(); roaming = false; });
  }
  /** Slides half out of the screen at the nearest free side, looks about, and comes back. */
  function peek() {
    if (!D.peek) return;
    roaming = true;
    setFace(FACES.curious);
    D.peek(1100).then(function (edge) {
      roaming = false;
      if (!edge) { settle(); return; }
      peeking = true;
      lookToward(edge === 'right' ? -1 : 1);
      pulse('peek', 1400);
      var wait = 3200 + Math.random() * 2600;
      peekTimer = setTimeout(endPeek, wait);
    }, function () { roaming = false; });
  }
  var peekTimer = 0;
  function endPeek() {
    if (!peeking) return;
    peeking = false; clearTimeout(peekTimer);
    stopLook();
    setFace({ eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
    D.unpeek(800).then(function () {
      if (busy) return;
      pulse('hop', 460);
      say(pick(['hehe, boo!', 'peekaboo!', 'found you!']), 1400);
      setTimeout(function () { if (!busy) settle(); }, 1500);
    });
  }
  // touching him while he peeks brings him straight back; the page shows only a bit of him, so his click lands on the part you see
  pet.addEventListener('pointerdown', function () { if (peeking) endPeek(); }, true);


  // ---------- adding an item from any program (the shell's shortcut) ----------
  // In the small window a box opens by Fumu and takes the keyboard; Enter adds the item to the list in view and Esc closes it.
  // In the whole app the shell just focuses the window and the usual box takes the words.
  var quickAway = 0;
  function quickCard() { return document.querySelector('.quick-card'); }
  function closeQuick() {
    var c = quickCard();
    clearTimeout(quickAway);
    if (c) c.remove();
  }
  function openQuick() {
    if (!isPet()) { var box = $('addInput'); if (box) box.focus(); return; }
    var old = quickCard();
    if (old) { old.querySelector('input').focus(); return; }
    if (peeking) endPeek();
    if (typeof wakeFromNap === 'function') wakeFromNap(false);
    var card = document.createElement('form');
    card.className = 'inbox-card quick-card';
    card.autocomplete = 'off';
    var input = document.createElement('input');
    input.type = 'text'; input.maxLength = 80; input.enterKeyHint = 'done';
    input.placeholder = isTodo() ? 'Add a task…' : 'Add to the shopping list…';
    input.setAttribute('aria-label', input.placeholder);
    var go = document.createElement('button');
    go.type = 'submit'; go.textContent = 'Add';
    card.append(input, go);
    card.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value;
      closeQuick();
      if (text.trim()) addItem(text);
    });
    input.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') closeQuick(); });
    input.addEventListener('blur', function () { clearTimeout(quickAway); quickAway = setTimeout(closeQuick, 6000); });   // clicked elsewhere: it tidies itself away
    input.addEventListener('focus', function () { clearTimeout(quickAway); });
    document.querySelector('.stage').appendChild(card);
    setFace(FACES.curious);
    D.typing(true);
    setTimeout(function () { input.focus(); }, 60);
  }
  if (D.onQuickAdd) D.onQuickAdd(openQuick);

  // ---------- away from the computer ----------
  // The shell says when nothing was touched for a few minutes (or the screen was locked): he curls up for a nap, and says hello again when you are back.
  if (D.onIdle) D.onIdle(function (idle) {
    if (idle) {
      if (deskPrefs.idle === false || !isPet() || away) return;
      away = true; awayAt = Date.now();
      awayNap = !roaming && !peeking && typeof napNow === 'function' && napNow(8 * 3600 * 1000) > 0;
      return;
    }
    if (!away) return;
    away = false;
    var gone = Date.now() - awayAt, hello = gone > 3600000 ? ['you were gone so long!', 'I missed you ♡', 'welcome back, finally!'] : ['welcome back!', 'there you are~', 'hello again ♡'];
    if (awayNap && typeof napping !== 'undefined' && napping) {
      wakeFromNap(false);
      setTimeout(function () { if (!busy) { say(pick(hello), 1800); pulse('hop', 460); } }, 1800);
    } else if (gone > 120000 && !busy && isPet()) {
      say(pick(hello), 1800);
      pulse('hop', 460);
    }
    awayNap = false;
  });

  // ---------- sitting on other windows (a switch in the tray menu; Windows only) ----------
  // The shell finds the edges and moves the window; here he hops, looks pleased and gets down when it is bedtime.
  if (D.onPerched) D.onPerched(function (yes) { perched = yes; });
  function hopUp() {
    if (!D.perch || roaming) return;
    roaming = true;
    setFace(FACES.curious);
    pulse('hop', 700);
    D.perch('up').then(function (on) {
      roaming = false;
      if (!on) { settle(); return; }
      pulse('hop', 460);
      setFace({ eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
      say(pick(['up here!', 'nice view~', 'hehe, a perch', 'fumu fumu~']), 1500);
      setTimeout(function () { if (!busy) settle(); }, 1600);
    }, function () { roaming = false; });
  }
  function hopDown() {
    if (!D.perch || roaming) return;
    roaming = true;
    pulse('hop', 700);
    D.perch('down').then(function () { roaming = false; if (!busy) { settle(); say(pick(['back down~', 'whee!']), 1200); } }, function () { roaming = false; });
  }
  // bedtime or sleep: he comes down to his cushion first
  setInterval(function () {
    if (perched && isPet() && !roaming && (stage.classList.contains('bedtime') || baseState() === 'sleepy')) hopDown();
  }, 5000);
  /** For the animation player and tests: do one of them now (ignores the pause and the tray choice). */
  window.deskDo = function (what) {
    if (!isPet() || roaming || peeking) return 0;
    if (what === 'wander') { wander(); return 4500; }
    if (what === 'peek') { peek(); return 7000; }
    if (what === 'perch') { if (perched) hopDown(); else hopUp(); return 3000; }
    return 0;
  };
  var roamTimer = 0;
  function scheduleRoam(first) {
    clearTimeout(roamTimer);
    roamTimer = setTimeout(function () {
      if (roamOk()) {
        var r = Math.random();
        if (D.perch && deskPrefs.perch && r < 0.3) { if (perched) hopDown(); else hopUp(); }
        else if (perched && r > 0.7) wander();
        else if (r < 0.4) wander();
        else if (r < 0.7 && typeof napNow === 'function') napNow(18000 + Math.random() * 14000);
        else if (!perched) peek();
      }
      scheduleRoam(false);
    }, (first ? 90 : 240) * 1000 + Math.random() * (first ? 150 : 300) * 1000);
  }
  scheduleRoam(true);
})();
