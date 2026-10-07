// The desktop shell (desktop/ folder, Electron): only active inside it, where the shell gives the page `window.nibbleDesktop`.
// In a browser or on the phone nothing here runs. The window has two modes: 'pet' (Nibble alone on a transparent
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

  // the small bar over the list: drag to move the window, back to Nibble, hide
  var bar = document.createElement('div');
  bar.id = 'deskBar';
  bar.innerHTML = '<span class="desk-title">Nibble</span><button type="button" id="deskBack">Back to Nibble</button><button type="button" id="deskHide" aria-label="Hide Nibble">Hide</button>';
  document.body.appendChild(bar);
  $('deskBack').addEventListener('click', function () { D.setMode('pet'); });
  $('deskHide').addEventListener('click', function () { D.hide(); });

  function showMode(mode) {
    root.classList.toggle('desktop-pet', mode !== 'list');
    root.classList.toggle('desktop-list', mode === 'list');
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

  // clicks go to Nibble only where something solid is under the pointer; elsewhere they pass to the desktop
  var lastSolid = null;
  var SOLID = '#pet, .bubble, .gift, .wish, .toy, .suggest, .dream';
  function hover(e) {
    if (!isPet()) return;
    var el = document.elementFromPoint(e.clientX, e.clientY), yes = !!(el && el.closest && el.closest(SOLID));
    if (yes !== lastSolid) { lastSolid = yes; D.solid(yes); }
  }
  document.addEventListener('mousemove', hover, true);
  document.addEventListener('mouseleave', function () { if (isPet() && lastSolid) { lastSolid = false; D.solid(false); } });
  new MutationObserver(function () { lastSolid = null; }).observe(root, { attributes: true, attributeFilter: ['class'] });

  // pick Nibble up: hold still on him for a moment, then drag the window; letting go puts him down
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
