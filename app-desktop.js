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
  var SOLID = '#pet, .bubble, .gift, .wish, .toy, .suggest, .dream';
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
  D.onCursor(hoverAt);   // the shell also reports where the pointer is (Windows can stop forwarding it after a resize)
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

  document.addEventListener('contextmenu', function (e) { e.preventDefault(); D.menu(); });
})();
