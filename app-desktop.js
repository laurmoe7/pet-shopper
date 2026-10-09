// The desktop shell (desktop/ folder, Electron): only active inside it, where the shell gives the page `window.nibbleDesktop`.
// In a browser or on the phone nothing here runs. The window has two modes: 'pet' (Fumu alone on a transparent
// window, clicks pass through everywhere except on him) and 'list' (the whole app in a bigger window with a small bar).
// The mode lives in the shell; this file shows it as a class on <html> and passes the pointer on to it.
'use strict';

(function () {
  var D = window.nibbleDesktop;
  if (!D) return;
  var root = document.documentElement, PICK_MS = 300, STILL_PX = 6;
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
  bar.innerHTML = '<span class="desk-title">Fumufumu</span><button type="button" id="deskBack">Back to <span class="pet-name">Fumu</span></button><button type="button" id="deskHide" aria-label="Hide Fumu">Hide</button>';
  document.body.appendChild(bar);
  $('deskBack').addEventListener('click', function () { D.setMode('pet'); });
  $('deskHide').addEventListener('click', function () { D.hide(); });

  function showMode(mode) {
    root.classList.toggle('desktop-pet', mode !== 'list');
    root.classList.toggle('desktop-list', mode === 'list');
    if (typeof applyLook === 'function') applyLook();   // (the alert style depends on which window this is)
    var sel = window.getSelection && window.getSelection(); if (sel) sel.removeAllRanges();   // nothing stays highlighted across a switch
    if (mode !== 'list') for (var i = 0, open = document.querySelectorAll('dialog[open]'); i < open.length; i++) open[i].close();
    if (typeof fadeSoon === 'function') fadeSoon();
    if (typeof refreshBedtime === 'function') refreshBedtime();   // the small window has no lamp: at night the light is off there
    dispatchEvent(new Event('resize'));   // the bottom bar shows or hides with the mode: measure it again, or the sheets lose their room above it
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
  var SOLID = '#pet, .bubble, .gift, .wish, .toy, .suggest, .dream, .inbox-card, .teddy-btn, .night-btn, .bell, .ring-btn';   // (the reminder card is an .inbox-card too)
  /** Tells the shell whether clicks should be caught; sent when it changes and now and then anyway, so the two can't drift apart. */
  function setSolid(yes) {
    if (D.setRects) return;   // a newer shell decides by itself from the rectangles below (no round trip to the page)
    var now = Date.now();
    if (yes !== lastSolid || now - lastSent > 800) { lastSolid = yes; lastSent = now; D.solid(yes); }
  }
  // While a button is held that went down on him (or the toy), the window stays solid whatever is under the pointer: the toy trails behind
  // a fast drag, and a window that turns click-through mid-drag sends the release to the program behind, leaving the toy stuck.
  var pressing = false, lastPt = null;
  function releasePress() {
    if (!pressing) return;
    pressing = false; lastSolid = null;
    if (D.hold) D.hold(false);
    if (lastPt) hoverAt(lastPt.x, lastPt.y);
  }
  function hoverAt(x, y) {
    if (!isPet()) return;
    if (x >= 0) lastPt = { x: x, y: y };
    if (pressing) { setSolid(true); return; }
    if (x < 0) { setSolid(false); return; }
    var el = document.elementFromPoint(x, y);
    setSolid(!!(el && el.closest && el.closest(SOLID)));
  }
  document.addEventListener('mousemove', function (e) {
    if (pressing && e.buttons === 0) releasePress();   // the release was missed: don't stay solid for ever
    hoverAt(e.clientX, e.clientY);
  }, true);
  document.addEventListener('pointerdown', function (e) { if (isPet() && e.button === 0) { pressing = true; setSolid(true); if (D.hold) D.hold(true); } }, true);
  document.addEventListener('pointerup', releasePress, true);
  document.addEventListener('pointercancel', releasePress, true);
  window.addEventListener('blur', releasePress);
  // the shell also reports where the pointer is (Windows can stop forwarding it after a resize). An older shell has no such call, so ask first:
  // the page is loaded from the web and can be newer than the installed program
  if (D.onCursor) D.onCursor(hoverAt);
  if (D.onResync) D.onResync(function () { lastSolid = null; });   // the shell changed the window: say again whether clicks are caught
  document.addEventListener('mouseleave', function () { hoverAt(-1, -1); });
  new MutationObserver(function () { lastSolid = null; }).observe(root, { attributes: true, attributeFilter: ['class'] });

  // pick Fumu up: hold still on him for a moment, then drag the window; letting go puts him down
  var press = null, carried = false, noClickUntil = 0;
  // while he hangs from the cursor he wiggles, and squashes and stretches with how fast it moves (the body is drawn by drawBody, never a CSS scale)
  var carryLastFrame = 0, carryDir = 0, spinA = 0, spinW = 0, dizzy = false, dizzyOff = 0, carryRun = 0, carryT0 = 0, carryLast = null, carryV = { x: 0, y: 0 };
  function carryMove(x, y) {
    if (carryLast) { carryV.x = carryV.x * .6 + (x - carryLast.x) * .4; carryV.y = carryV.y * .6 + (y - carryLast.y) * .4; }
    carryLast = { x: x, y: y };
  }
  function startCarry() {
    if (typeof drawBody !== 'function') return;
    var run = carryRun = (typeof squishRun !== 'undefined' ? ++squishRun : carryRun + 1);
    carryT0 = performance.now(); carryLast = null; carryV = { x: 0, y: 0 };
    pet.classList.add('carried');   // his feet dangle and kick (styles.css)
    if (typeof toyCarry === 'function') toyCarry(true);   // he takes his toy along
    carryDir = 0; spinA = 0; spinW = 0; dizzy = false; clearTimeout(dizzyOff); stopLook();
    if (typeof squishing !== 'undefined') squishing = true;
    var svg = pet.querySelector('.pet-svg');
    (function frame(now) {
      if (!carried || run !== carryRun) return;
      carryV.x *= .92; carryV.y *= .92;   // it fades when the cursor stops
      var t = (now - carryT0) / 1000, speed = Math.min(30, Math.hypot(carryV.x, carryV.y));
      var wob = Math.sin(t * 13) * (.07 + speed * .005), stretch = Math.min(.3, speed * .013);
      // he looks the way he is being taken
      var dir = Math.abs(carryV.x) > 1.5 ? (carryV.x > 0 ? 1 : -1) : 0;
      if (dir !== carryDir) { carryDir = dir; if (dir) lookToward(dir); else stopLook(); }
      drawBody(1 - stretch * .75 - wob, 1 + stretch + wob, Math.sin(t * 7) * 1.5);
      // move him fast enough and he spins right round (with a little friction), and gets dizzy; slow again and he turns back upright
      var fast = Math.hypot(carryV.x, carryV.y);
      if (fast > 13) spinW += ((fast - 13) * 55 * (carryV.x >= 0 ? 1 : -1) - spinW) * .12; else spinW *= .985;
      spinA += spinW * Math.min(.05, (now - (carryLastFrame || now)) / 1000);
      if (Math.abs(spinW) < 60 && spinA !== 0) { spinA += (Math.round(spinA / 360) * 360 - spinA) * .15; if (Math.abs(spinA - Math.round(spinA / 360) * 360) < 1) { spinA = 0; spinW = 0; } }
      carryLastFrame = now;
      if (Math.abs(spinW) > 160 && !dizzy) { dizzy = true; clearTimeout(dizzyOff); setFace({ eyes: 'dizzy', mouth: 'wavy', arms: 'idle', x: ['sweat'] }); }
      else if (dizzy && Math.abs(spinW) < 60 && !dizzyOff) dizzyOff = setTimeout(function () { dizzyOff = 0; if (!dizzy) return; dizzy = false; if (carried) { settle(); say('so dizzy…', 1400); } }, 1600);
      else if (dizzy && Math.abs(spinW) >= 60) { clearTimeout(dizzyOff); dizzyOff = 0; }
      if (svg) svg.style.rotate = (Math.max(-55, Math.min(55, carryV.x * 4.5)) * (spinA ? 0 : 1) + spinA).toFixed(1) + 'deg';   // leans the way he is taken
      // spinning, he swings round the cursor in a wide arc (the faster, the wider); slowing down, the arc closes up
      var orbit = Math.min(38, Math.abs(spinW) / 16), th = spinA * Math.PI / 180;
      var ox = orbit * Math.sin(th), oy = -orbit * (1 - Math.cos(th));
      if (typeof toyCarried !== 'undefined' && toyCarried) {   // the toy is in his arms: it sways and bobs with him
        toyEl.style.translate = (walkX + toyHoldX - carryV.x * .7 * .5 + Math.sin(t * 9) * 3 + ox).toFixed(1) + 'px 0';
        toyBall.style.transform = 'translateY(' + (-toyHoldY + oy + Math.sin(t * 13) * 2).toFixed(1) + 'px)';
      }
      if (svg) svg.style.translate = (Math.max(-14, Math.min(14, -carryV.x * .7 + Math.sin(t * 9) * 3)) + ox).toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
      requestAnimationFrame(frame);
    })(performance.now());
  }
  function stopCarry() {
    carryRun = 0; carryLastFrame = 0; spinA = 0; spinW = 0;
    clearTimeout(dizzyOff); dizzyOff = 0;
    if (dizzy) setTimeout(function () { dizzy = false; if (!carried) { settle(); say('so dizzy…', 1400); } }, 1300);   // still seeing stars for a moment after being put down
    pet.classList.remove('carried');
    stopLook();
    if (typeof toyCarry === 'function') toyCarry(false);   // he puts the toy down
    var svg = pet.querySelector('.pet-svg'); if (svg) { svg.style.translate = ''; svg.style.rotate = ''; }
    if (typeof squishRun !== 'undefined') squishRun++;
    if (typeof squishing !== 'undefined') squishing = false;
    if (typeof drawBody === 'function') drawBody(1, 1, 0);
    if (typeof pulse === 'function') pulse('hopsmall', 450);
  }
  function drop() {
    if (press && press.timer) clearTimeout(press.timer);
    if (carried) { stopCarry(); D.dragEnd(typeof inBed === 'function' && inBed()); noClickUntil = Date.now() + 400; carried = false; }
    press = null;
  }
  if (D.dragEnd) D.dragEnd();   // a page that has just loaded is not carrying anyone: if the shell still follows the cursor (the page reloaded mid-carry), let him go
  pet.addEventListener('pointerdown', function (e) {
    if (!isPet() || e.button !== 0) return;
    press = { x: e.screenX, y: e.screenY, id: e.pointerId, timer: setTimeout(function () {
      if (!press) return;
      press.timer = 0; carried = true;
      try { pet.setPointerCapture(press.id); } catch (err) { /* ignore */ }
      D.dragStart();
      startCarry();
      if (typeof say === 'function') say(['wheee!', 'hehe, up we go', 'where to?'][Math.floor(Math.random() * 3)], 1200);
    }, PICK_MS) };
  }, true);
  pet.addEventListener('pointermove', function (e) {
    if (!press) return;
    if (carried) { e.stopImmediatePropagation(); carryMove(e.screenX, e.screenY); D.dragMove(e.screenX - press.x, e.screenY - press.y); return; }
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

  // his name (the one you gave him) is used in the bar, the shortcut note, the right-click menu and the settings window: the page's own
  // `.pet-name` spans follow it by themselves (applyPet); the shell is told, and the button labels that are not text are set here
  (function () {
    var shown = $('brandName');   // the title of the list: applyPet puts his name there whenever it changes
    function nameChanged() {
      var name = typeof petName === 'function' ? petName() : 'Fumu';
      document.querySelectorAll('#deskBar .pet-name').forEach(function (el) { el.textContent = name; });
      $('deskHide').setAttribute('aria-label', 'Hide ' + name);
      if (D.setPetName) D.setPetName(name);
    }
    nameChanged();
    if (shown && window.MutationObserver) new MutationObserver(nameChanged).observe(shown, { childList: true, characterData: true, subtree: true });
  })();

  // ---------- what the tray menu chose (an older shell has none of this: then the defaults stay) ----------
  var deskPrefs = { moveNormal: 'normal', moveFull: 'still', alertStyle: 'paper', mute: false, remind: true, perch: false, hideToy: false, hideCushion: false, bubbles: true, clouds: true, sparkles: true, backdrop: false, toyRoam: false, awareness: 2, chatNormal: 'normal', chatFull: 'normal', talkNormal: 'normal', talkFull: 'rare' };
  /** Awareness: 1 = more privacy (idle and time only), 2 = normal. Anything he says about what you are doing, or knows about your windows and programs, checks this first. */
  window.deskAware = function (level) { return (deskPrefs.awareness === 1 ? 1 : 2) >= level; };
  /** The small window's look choices from the settings window: no toy, no cushion (classes on <html>, CSS at the end of styles.css). */
  deskMuted = function () { return !!deskPrefs.mute && isPet(); };   // sounds off in the small window only
  /** @returns {boolean} Whether the app is dark now (its Appearance setting, or the system's when it is on Auto). */
  function appIsDark() {
    var t = root.dataset.theme;
    return t === 'dark' || (t !== 'light' && !!window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function applyLook() {
    root.classList.toggle('desk-notoy', !!deskPrefs.hideToy);
    root.classList.toggle('desk-nocushion', !!deskPrefs.hideCushion);
    root.classList.toggle('desk-backdrop', deskPrefs.backdrop === true);
    root.classList.toggle('desk-nosparkles', deskPrefs.sparkles === false);
    root.classList.toggle('desk-noclouds', deskPrefs.clouds === false);
    // the look of alert cards and speech bubbles: the small pet uses the style chosen in the settings window; the whole app follows its own
    // appearance (Light = Paper, Dark = Night), so the pet's notes and bubbles there match the rest of the app
    root.classList.remove('al-paper', 'al-night', 'al-sweet', 'al-cool', 'al-quest');
    var style = root.classList.contains('desktop-pet') ? (deskPrefs.alertStyle || 'paper') : (appIsDark() ? 'night' : 'paper');
    if (style !== 'classic') root.classList.add({ night: 'al-night', sweet: 'al-sweet', cool: 'al-cool', quest: 'al-quest' }[style] || 'al-paper');
    root.classList.toggle('desk-nobubbles', deskPrefs.bubbles === false);   // speech bubbles in the small window only; cards (reminders, links) are separate
    lastSolidReset();
  }
  function lastSolidReset() { lastSolid = null; }
  // the whole app's light or dark changed: its alerts and bubbles follow
  try { new MutationObserver(function () { applyLook(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] }); if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook); } catch (e) { /* old browser */ }
  if (D.getPrefs) D.getPrefs().then(function (p) { if (p) { deskPrefs = p; applyLook(); applyChatter(); } });
  if (D.onPrefs) D.onPrefs(function (p) {
    if (!p) return;
    var was = deskPrefs.alertStyle;
    deskPrefs = p; applyLook(); applyChatter();
    if (was && p.alertStyle && was !== p.alertStyle && root.classList.contains('desktop-pet')) previewLook();
  });
  /** Choosing an alert style in the mini settings: a sample alert and a line show for a moment in the new look. */
  var previewTimer = 0, previewCard = null;
  function previewLook() {
    if (typeof showInboxCard !== 'function') return;
    if (!previewCard || !previewCard.parentNode) {
      if (inboxCard || document.querySelector('.inbox-card')) return;   // a real alert is up: leave it
      showInboxCard({ kind: 'note', text: 'Like this?', test: true });
      previewCard = inboxCard; inboxCard = null;
      if (previewCard) { previewCard.querySelector('.inbox-actions').hidden = true; previewCard.classList.add('look-preview'); }
    }
    if (!busy && petScene() !== 'night-bed') say(pick(['how do I look?', 'like this?', 'ooh, new look!']), 2600, true);
    clearTimeout(previewTimer);
    // it goes by itself: slides off after a moment (and is removed outright if the slide somehow does not)
    previewTimer = setTimeout(function () {
      var card = previewCard; previewCard = null;
      if (!card || !card.parentNode) return;
      slideAway(card, 1, function () { card.remove(); });
      setTimeout(function () { if (card.parentNode) card.remove(); }, 800);
    }, 3000);
  }

  // ---------- a long line must not run off the top of the small window: the text shrinks until it fits ----------
  var fitting = false;
  function fitBubble() {
      if (fitting || bubble.hidden || !isPet()) return;
      fitting = true;
      // (measured with offsetHeight: the pop-in animation scales what getBoundingClientRect says)
      var room = bubble.parentNode.getBoundingClientRect().top + 24 - 6;
      bubble.style.fontSize = ''; bubble.style.maxHeight = ''; bubble.style.overflow = '';
      var size = 15.2;   // .95rem
      while (size > 10.5 && bubble.offsetHeight > room) { size -= 0.8; bubble.style.fontSize = size + 'px'; }
      if (bubble.offsetHeight > room) { bubble.style.maxHeight = room + 'px'; bubble.style.overflow = 'hidden'; }
      fitting = false;
  }
  if (window.MutationObserver) new MutationObserver(fitBubble).observe(bubble, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  // half out of the screen (peeking): the bubble keeps to the part that shows
  // until the shell has said which part of the window is on a screen (an older shell, or the first moments), work it out here from the window's place on its screen
  var shellVisible = false;
  function ownVisible() {
    if (shellVisible || !isPet()) return;
    var zoom = window.outerWidth && window.innerWidth ? window.outerWidth / window.innerWidth : 1, sx = window.screenX, sc = window.screen || {};
    if (!isFinite(sx) || !sc.availWidth || !(zoom > 0.3 && zoom < 4)) return;
    var left = sc.availLeft || 0, l = Math.max(0, (left + 16 - sx) / zoom), r = Math.min(window.innerWidth, (left + sc.availWidth - 16 - sx) / zoom);
    if (r <= l + 120) return;   // nonsense: leave it
    var full = l <= 0 && r >= window.innerWidth - 1;
    root.style.setProperty('--vis-l', full ? '0px' : l + 'px');
    root.style.setProperty('--vis-r', full ? '100vw' : r + 'px');
  }
  setInterval(ownVisible, 700);
  if (D.onVisible) D.onVisible(function (l, r) {
    shellVisible = true;
    var full = l <= 0 && r >= window.innerWidth - 1;
    root.style.setProperty('--vis-l', full ? '0px' : l + 'px');
    root.style.setProperty('--vis-r', full ? '100vw' : r + 'px');
    fitBubble();
  });

  // ---------- the toy over the whole screen (the switch is in the settings window; see toyField in app-toy.js) ----------
  // While he is carried or thrown the toy is drawn by a window of its own (the shell moves it where this page says), so it can bounce
  // off the edges of the screen and not only off the sides of his little window. It stops being that when he catches it or it lands.
  var fieldToken = 0, fieldZoom = 1;
  /** @returns {Promise<string>} The toy as a small PNG data URL (its colours are read from the page's CSS, so a window with no styles can draw it). */
  function toyPicture() {
    return new Promise(function (resolve) {
      var g = null, list = toyBall.querySelectorAll('[data-toy]');
      for (var i = 0; i < list.length; i++) if (getComputedStyle(list[i]).display !== 'none') { g = list[i]; break; }
      if (!g) { resolve(''); return; }
      var copy = g.cloneNode(true), src = g.querySelectorAll('*'), dst = copy.querySelectorAll('*');
      for (var j = 0; j < src.length; j++) {
        var cs = getComputedStyle(src[j]);
        ['fill', 'stroke', 'stroke-width', 'opacity', 'stroke-linecap', 'stroke-linejoin'].forEach(function (p) { dst[j].style.setProperty(p, cs.getPropertyValue(p)); });
      }
      copy.removeAttribute('class');
      var xml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" width="104" height="104">' + new XMLSerializer().serializeToString(copy) + '</svg>';
      var img = new Image();
      img.onload = function () {
        try { var c = document.createElement('canvas'); c.width = c.height = 104; c.getContext('2d').drawImage(img, 0, 0, 104, 104); resolve(c.toDataURL('image/png')); } catch (e) { resolve(''); }
      };
      img.onerror = function () { resolve(''); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    });
  }
  /**
   * Like the toy, anything else that is thrown (the night bell) can fly over the whole screen when the switch is on.
   * @param {SVGElement} svg The thing's drawing. @param {number} w @param {number} h Its size (the drawing's own units, px).
   * @returns {Promise<Object|null>} {lim, show(x, y, spin), hide(), localX()} in the toy's terms (px from the middle, px up from the floor), or null.
   */
  window.deskFlyField = function (svg, w, h) {
    if (deskPrefs.toyRoam !== true || !isPet() || !D.toyField || !D.toyShow) return Promise.resolve(null);
    return Promise.all([D.toyField(), svgPicture(svg, w, h)]).then(function (r) {
      var f = r[0], png = r[1];
      if (!f || !png) return null;
      var z = f.zoom || 1, st = stage.getBoundingClientRect(), mid = st.left + st.width / 2, fl = st.bottom - 3 - h / 2;
      D.toyShow(png, Math.round(48 * z));
      return {
        zoom: z, ax: 0,
        lim: { minX: (f.area.x - f.wx) / z - mid + w / 2 + 2, maxX: (f.area.x + f.area.width - f.wx) / z - mid - w / 2 - 2, maxY: fl - (f.area.y - f.wy) / z - h / 2 - 8 },
        localX: function () { return (this.ax - f.wx) / z - mid; },
        show: function (x, y, spin) { var px = f.wx + (mid + x) * z, py = f.wy + (fl - y) * z; this.ax = px; this.ay = py; D.toyAt(px, py, spin); },
        hide: function () { D.toyHide(); },
        /** Draws a short burst where it last was (pieces flying apart): build(t) gives the 144 x 144 drawing at t 0..1, shown as n frames ms apart. */
        burst: function (build, n, ms) {
          var self = this, at = [self.ax, self.ay], shots = [];
          for (var i = 0; i < n; i++) shots.push(svgPicture(new DOMParser().parseFromString(build(i / (n - 1)), 'image/svg+xml').documentElement, 72, 72, 144));
          return Promise.all(shots).then(function (png) {
            var k = 0;
            (function next() {
              if (k >= png.length) { D.toyHide(); return; }
              if (png[k]) { D.toyShow(png[k], Math.round(144 * z)); D.toyAt(at[0], at[1], 0); }
              k++; setTimeout(next, ms);
            })();
          });
        }
      };
    });
  };
  /** @returns {Promise<string>} A drawing as a small square PNG (its colours read from the page's CSS), centred, for the window that draws a flying thing. */
  function svgPicture(svg, w, h, size) {
    size = size || 96;
    return new Promise(function (resolve) {
      var copy = svg.cloneNode(true), src = svg.querySelectorAll('*'), dst = copy.querySelectorAll('*');
      for (var j = 0; j < src.length; j++) {
        var cs = getComputedStyle(src[j]);
        ['fill', 'stroke', 'stroke-width', 'opacity', 'stroke-linecap', 'stroke-linejoin'].forEach(function (p) { dst[j].style.setProperty(p, cs.getPropertyValue(p)); });
        dst[j].removeAttribute('class'); dst[j].style.removeProperty('rotate');
      }
      copy.removeAttribute('class'); copy.removeAttribute('style');
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); copy.setAttribute('width', String(w * 2)); copy.setAttribute('height', String(h * 2));
      var img = new Image();
      img.onload = function () {
        try { var c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(img, (size - w * 2) / 2, (size - h * 2) / 2, w * 2, h * 2); resolve(c.toDataURL('image/png')); } catch (e) { resolve(''); }
      };
      img.onerror = function () { resolve(''); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copy));
    });
  }
  /** Called when the toy is picked up: if the switch is on, from now on it can go anywhere on the screen. */
  window.deskToyField = function () {
    if (deskPrefs.toyRoam !== true || deskPrefs.hideToy || !isPet() || !D.toyField || !D.toyShow || toyField) return;
    var token = ++fieldToken;
    if (homeX === null && D.where) D.where().then(function (x) { if (homeX === null && x !== null) homeX = x; });
    Promise.all([D.toyField(), toyPicture()]).then(function (r) {
      var f = r[0], png = r[1];
      if (!f || !png || token !== fieldToken || !playing || toyField) return;
      var z = f.zoom || 1, st = stage.getBoundingClientRect(), mid = st.left + st.width / 2, fl = st.bottom - 19;
      fieldZoom = z; knownWx = f.wx;
      var spot = function (x, y) { return [f.wx + (mid + x) * z, f.wy + (fl - y) * z]; };
      toyField = {
        zoom: z,
        lim: { minX: (f.area.x - f.wx) / z - mid + 18, maxX: (f.area.x + f.area.width - f.wx) / z - mid - 18, maxY: fl - (f.area.y - f.wy) / z - 20 },
        ax: 0,   // where the toy is on the screen (px), so that wherever his window has got to, its place in the window can be worked out again
        localX: function () { return (this.ax - f.wx) / z - mid; },
        show: function (x, y, spin) { toyEl.style.visibility = 'hidden'; var p = spot(x, y); this.ax = p[0]; D.toyAt(p[0], p[1], spin); },
        hide: function () { D.toyHide(); },
        shift: function (p) { f.wx += p * z; this.lim.minX -= p; this.lim.maxX -= p; }   // his window moved p page px to the right
      };
      D.toyShow(png, Math.round(32 * z));
      toyField.show(toyX, held ? held.y : 0, 0);
    });
  };
  /** The toy came down far from him: the window runs along the floor towards it. @param {number} dx Page px. @returns {Promise<number>} Page px really moved. */
  var homeX = null;     // where his window stood when the toy was picked up (screen px)
  var runBusy = null;   // the window run that is going on now (a new run would cut it short and lose the distance it had covered)
  var fieldMoved = 0;   // how far (screen px) his window ran after the toy, so he can run back
  /** Runs his window along the floor by dx page px over ms; keeps the toy's screen-wide field in step. @returns {Promise<number>} Page px really moved. */
  var knownWx = null;   // where the page thinks his window is (screen px): the toy's screen-wide field is measured from it
  function runWindow(dx, ms) {
    var z = fieldZoom || 1;
    pet.classList.add('walking'); lookToward(dx);
    return (runBusy = D.walk(dx * z, ms)).then(function (went) {
      pet.classList.remove('walking'); stopLook();
      went = went || 0;
      // a run that was cut short by the next one answers nothing, but the window did move: ask where it really is
      return (knownWx !== null && D.where ? D.where() : Promise.resolve(null)).then(function (x) {
        if (x !== null && knownWx !== null) { went = x - knownWx; knownWx = x; }
        fieldMoved += went;
        if (toyField && toyField.shift) toyField.shift(went / z);
        return went / z;
      });
    }, function () { pet.classList.remove('walking'); stopLook(); return 0; });
  }
  window.deskToyChase = function (dx) { var slow = typeof toyTired === 'function' && toyTired() ? 5 : 1; return runWindow(dx, Math.min(3500 * slow, (500 + Math.abs(dx) * 5) * slow)); };
  window.deskToyFollow = function (dx) { return runWindow(dx, typeof toyTired === 'function' && toyTired() ? 2200 : 450); };
  /** After the game: he runs back to where he stood when the toy was thrown. @returns {Promise<void>} Resolves when he is there. */
  window.deskToyReturn = function () {
    var home = homeX, moved0 = fieldMoved;
    homeX = null;
    if (!D.walk || (home === null && !moved0)) return Promise.resolve();
    var wasRoaming = roaming;
    // wait for a run that is still going, so it is not cut short; then count again
    return (runBusy ? runBusy.then(function () {}, function () {}) : Promise.resolve()).then(function () {
      var moved = fieldMoved; fieldMoved = 0;
      // the exact spot he started from (the shell's own count of his moves misses a run that was cut short)
      return home !== null && D.where ? D.where().then(function (x) { return x === null ? -moved : home - x; }) : -moved;
    }).then(function (back) {
      roaming = true;
      pet.classList.add('walking');
      function go(dx, tries) {
        if (Math.abs(dx) < 4) return Promise.resolve();
        lookToward(dx);
        return D.walk(dx, Math.min(3500, 600 + Math.abs(dx) * 2)).then(function () {}, function () {}).then(function () {
          // look again where he ended up, and go the rest of the way (once) if he fell short
          if (tries > 0 && home !== null && D.where) return D.where().then(function (x) { return x === null ? 0 : go(home - x, tries - 1); });
        });
      }
      return go(back, 1).then(function () { pet.classList.remove('walking'); stopLook(); roaming = wasRoaming; });
    }).catch(function () { pet.classList.remove('walking'); roaming = wasRoaming; });
  };

  // thrown (the shell flies his window about): he spins round and is dizzy, and every hit on an edge or the floor goes "boing"
  var headDown = false;
  function pageThrown(on, dir, bed, extra) {
    extra = extra || {};
    pet.classList.toggle('thrown', !!on && !bed);
    stage.classList.toggle('flying', !!on);
    pet.style.setProperty('--spin-dir', dir < 0 ? -1 : 1);
    headDown = !!on && !!extra.head;   // spinning round, he lands on his head at the first bounce (onBounce)
    if (on && !bed) setFace({ eyes: 'dizzy', mouth: 'o', arms: 'idle', x: ['sweat'] });
    if (!on) {
      pet.classList.remove('thrown');
      if (extra.ouch && !bed) {   // knocked off a window: "Ow! I'm okay"
        say(pick(['Ow! I\'m okay', 'Ow! …I\'m okay!', 'Ouch! I\'m okay~']), 2200, true);
        setFace({ eyes: 'dizzy', mouth: 'o', arms: 'idle', x: ['sweat'] });
        if (extra.head) setTimeout(function () { pet.classList.remove('head-down'); pet.classList.add('righting'); setTimeout(function () { pet.classList.remove('righting'); }, 450); }, 1100);
        setTimeout(function () { if (!pet.classList.contains('thrown') && !carried && !busy) settle(); }, extra.head ? 1700 : 1000);
      } else if (!bed) setTimeout(function () { if (!pet.classList.contains('thrown') && !carried && !busy) settle(); }, 900);
    }
    if (!on) stage.style.removeProperty('--bed-turn');
    if (!on && stage.classList.contains('bed-thrown')) {   // the bed settles back into place softly instead of snapping
      stage.classList.add('bed-settle');
      setTimeout(function () { stage.classList.remove('bed-settle'); }, 800);
    }
    stage.classList.toggle('bed-thrown', !!on && !!bed);
  }
  if (D.onThrown) D.onThrown(pageThrown);
  // in bed the bed always leads: it turns to face the way he is flying, so it is the bed that hits the wall, the ceiling or the floor
  if (D.onFlight) D.onFlight(function (vx, vy) {
    if (Math.hypot(vx, vy) < 120) { stage.style.setProperty('--bed-turn', '0deg'); return; }   // on the ground: flat
    stage.style.setProperty('--bed-turn', (Math.atan2(-vx, vy) * 180 / Math.PI).toFixed(0) + 'deg');
  });
  function pageBounce(hard) {
    if (headDown) { headDown = false; pet.classList.remove('thrown'); pet.classList.add('head-down'); }   // he stops spinning on his head
    if (stage.classList.contains('bed-thrown')) { if (typeof sound === 'function') { sound('bounce'); sound('bedbell'); } return; }   // in his bed: the bounce and the faint bell in the bed
    if (typeof sound === 'function') sound('bounce');
    if (typeof pulse === 'function' && !carried) pulse(hard > .5 ? 'hop' : 'hopsmall', 400);
  }
  if (D.onBounce) D.onBounce(pageBounce);

  /** A card (so it shows even with speech bubbles off) saying an update is ready, with Restart and a cross for later. */
  function showUpdateCard() {
    if (!D.installUpdate || document.querySelector('.update-card')) return;
    var card = document.createElement('div');
    card.className = 'inbox-card update-card';
    card.setAttribute('role', 'status');
    var text = document.createElement('div'), t = document.createElement('b'), d = document.createElement('span');
    text.className = 'inbox-text'; t.textContent = 'Update ready'; d.textContent = 'A new version is downloaded.';
    text.append(t, d);
    var acts = document.createElement('div');
    acts.className = 'inbox-actions';
    var go = document.createElement('button'); go.type = 'button'; go.textContent = 'Restart now';
    go.addEventListener('click', function (e) { e.stopPropagation(); D.installUpdate(); });
    var later = document.createElement('button'); later.type = 'button'; later.textContent = '✕'; later.className = 'inbox-done'; later.setAttribute('aria-label', 'Later');
    later.addEventListener('click', function (e) { e.stopPropagation(); card.remove(); });
    acts.append(go, later);
    card.append(document.createElement('span'), text, acts);
    stage.appendChild(card);
    setTimeout(function () { if (card.parentNode) card.remove(); }, 60000);
  }
  // ---------- an update finished downloading: he says so (once he is free to speak) ----------
  if (D.onUpdateReady) D.onUpdateReady(function () {
    var tries = 0;
    (function go() {
      if (!busy && bubble.hidden && !document.querySelector('.inbox-card')) {
        say(pick(['a new version is ready! restart me when you like', 'I have an update! ♡', 'new me incoming~']), 6500, true);
        speechLockUntil = Date.now() + 6500;   // his chatter waits until the notice is read
        pulse('hopsmall', 450);
        showUpdateCard();
      } else if (++tries < 30) setTimeout(go, 2000);
    })();
  });

  // ---------- an alert card keeps its normal size: if he is at the side of the screen, his window slides onto it while the card shows ----------
  var cardShift = 0, cardBusy = false, cardBackTimer = 0, cardShiftAt = 0;
  function cardZoom() { return window.outerWidth && window.innerWidth ? window.outerWidth / window.innerWidth : 1; }
  function cardCheck() {
    if (!isPet() || !D.walk) return;
    var card = document.querySelector('.stage .inbox-card');
    if (!card) {
      if (cardShift && !cardBackTimer && !cardBusy) cardBackTimer = setTimeout(function () {   // a moment after the last card is gone he slides back
        cardBackTimer = 0;
        if (document.querySelector('.stage .inbox-card') || !cardShift) return;
        var back = -cardShift; cardShift = 0;
        root.classList.remove('card-narrow');
        D.walk(back, 400).then(function () {}, function () {});
      }, 700);
      return;
    }
    clearTimeout(cardBackTimer); cardBackTimer = 0;
    if (cardBusy || Date.now() - cardShiftAt < 1800) return;   // (the shell tells the page where the window is a moment after it moved)
    var cs = getComputedStyle(root), vl = parseFloat(cs.getPropertyValue('--vis-l')) || 0, vrRaw = cs.getPropertyValue('--vis-r');
    var vr = !vrRaw || /vw/.test(vrRaw) ? window.innerWidth : parseFloat(vrRaw);
    var need = vl > 3 ? vl : vr < window.innerWidth - 3 ? -(window.innerWidth - vr) : 0;   // page px: right (+) or left (-)
    if (!need) return;
    cardBusy = true;
    D.walk(need * cardZoom(), 350).then(function (went) {
      cardBusy = false; cardShiftAt = Date.now();
      went = went || 0;
      cardShift += went;
      root.classList.toggle('card-narrow', Math.abs(went) < 2);   // could not slide (he sits on a window, say): the card shrinks to fit instead
    }, function () { cardBusy = false; });
  }
  new MutationObserver(cardCheck).observe(document.querySelector('.stage'), { childList: true });
  setInterval(cardCheck, 700);

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
    if (state.items.indexOf(item) !== -1 && isTodo()) button('Done ✓', function () { close(); toggle(item.id); }, 'ia-done');
    else if (item.id === 'test') button('Done ✓', function () { close(); say(pick(['good job!', 'yay, done!', 'well done ♡']), 1500); }, 'ia-done');   // (the made-up one from Developer tools)
    button('In 10 min', function () {
      close();
      setTimeout(function () { if (!item.done && (state.items.indexOf(item) !== -1 || state.stash.indexOf(item) !== -1)) { remindQueue.push(item); showRemind(); } }, SNOOZE_MS);
      say(pick(['ok, I\'ll remind you!', 'back in 10 minutes!', 'I\'ll poke you later ♡']), 1500);
    });
    button('✕', close, 'inbox-done').setAttribute('aria-label', 'Dismiss');
    card.append(img, text, acts);
    document.querySelector('.stage').appendChild(card);
    if (!(typeof petScene === 'function' && petScene() === 'night-bed')) { setFace(FACES.tada); pulse('hop', 460); }   // (asleep in bed he does not jump about)
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
    return isPet() && !document.hidden && !roaming && !peeking && !away && !carried && !press && !busy && !walking && !dreaming &&
      !(typeof napping !== 'undefined' && napping) && baseState() !== 'sleepy' && !stage.classList.contains('bedtime') &&
      !document.querySelector('dialog[open], .inbox-card') && bubble.hidden && suggestEl.hidden;
  }
  // thought clouds (daydream, wish) stay hidden while he is carried, strolling or gliding: they would trail behind
  setInterval(function () {
    document.documentElement.classList.toggle('desk-moving', !!(carried || roaming || pet.classList.contains('walking')));
  }, 120);
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
      if (!busy) { settle(); if (Math.random() < 0.5) chat(pick(['nice walk~', 'hmm hm hm ♪', 'fumu fumu~']), 1400); }
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
      chat(pick(['hehe, boo!', 'peekaboo!', 'found you!']), 1400);
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
  function qEl(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  /**
   * Puts the day, time and repeat chosen in the quick box on a task that was just added (the same steps as the task sheet in the full app).
   * @param {Object} item  The new task.
   * @param {{due: string, time: string, repeat: string, days: number[], span: string}} o
   */
  function applyQuickOptions(item, o) {
    taskFor = item.id;
    try {
      if (o.due) setTaskDue(o.due);
      if (o.time) setTaskTime(o.time);
      if (o.repeat) {
        setTaskRepeat(o.repeat);
        if (o.repeat === 'days' && o.days.length) {
          item.days = o.days.slice();
          item.due = L.firstOnDays(item.due < todayKey() ? todayKey() : item.due, item.days);
          fixUntil(item); state.items = L.sortByDue(state.items, todayKey()); save(); render();
        }
        if (o.span) setTaskUntil(o.span);
      }
    } finally { taskFor = null; }
  }
  function openQuick() {
    if (!isPet()) { var box = $('addInput'); if (box) box.focus(); return; }
    var old = quickCard();
    if (old) { old.querySelector('input').focus(); return; }
    if (peeking) endPeek();
    if (typeof wakeFromNap === 'function') wakeFromNap(false);
    var todo = isTodo(), opts = { due: '', time: '', repeat: '', days: [], span: '' }, open = false;
    var card = qEl('form', 'inbox-card quick-card');
    card.autocomplete = 'off';
    var input = qEl('input'), go = qEl('button', '', 'Add'), more = qEl('button', 'quick-more', '📅');
    input.type = 'text'; input.maxLength = 80; input.enterKeyHint = 'done';
    input.placeholder = todo ? 'Add a task…' : 'Add to the shopping list…';
    input.setAttribute('aria-label', input.placeholder);
    go.type = 'submit'; more.type = 'button'; more.title = 'Day, time and repeat'; more.setAttribute('aria-label', 'Day, time and repeat'); more.setAttribute('aria-expanded', 'false');
    var panel = qEl('div', 'quick-opts'); panel.hidden = true;
    card.append(input, go);
    if (todo) { card.insertBefore(more, go); card.appendChild(panel); }

    // the choices (only for tasks): a day, a time, how it repeats and for how long
    function chipRow(items, pressed, onTap) {
      var row = qEl('div', 'quick-chips');
      items.forEach(function (it) {
        var b = qEl('button', 'quick-chip', it[0]); b.type = 'button'; b.setAttribute('aria-pressed', pressed(it[1]) ? 'true' : 'false');
        b.addEventListener('click', function () { onTap(it[1]); drawOpts(); });
        row.appendChild(b);
      });
      return row;
    }
    function drawOpts() {
      var today = todayKey(), nodes = [];
      var dayRow = chipRow([['No date', ''], ['Today', today], ['Tomorrow', L.addDays(today, 1)], ['In a week', L.addDays(today, 7)]], function (v) { return opts.due === v; }, function (v) { opts.due = v; if (!v) { opts.time = ''; opts.repeat = ''; } });
      var date = qEl('input', 'quick-in'); date.type = 'date'; date.value = opts.due; date.setAttribute('aria-label', 'Day'); date.min = today;
      date.addEventListener('change', function () { if (date.value) { opts.due = date.value; drawOpts(); } });
      var time = qEl('input', 'quick-in'); time.type = 'time'; time.value = opts.time; time.setAttribute('aria-label', 'Time');
      time.addEventListener('change', function () { opts.time = time.value; if (time.value && !opts.due) opts.due = today; drawOpts(); });
      var rep = qEl('select', 'quick-in'); rep.setAttribute('aria-label', 'Repeat');
      L.REPEATS.forEach(function (r) { rep.appendChild(new Option(r.id ? r.label : 'No repeat', r.id)); });
      rep.value = opts.repeat;
      rep.addEventListener('change', function () { opts.repeat = rep.value; if (opts.repeat && !opts.due) opts.due = today; if (opts.repeat === 'days' && !opts.days.length) opts.days = [new Date((opts.due || today) + 'T12:00').getDay()]; if (!opts.repeat) opts.span = ''; drawOpts(); });
      var line = qEl('div', 'quick-line'); line.append(date, time);
      nodes.push(dayRow, line, rep);
      if (opts.repeat === 'days') {
        var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        nodes.push(chipRow([1, 2, 3, 4, 5, 6, 0].map(function (n) { return [names[n], n]; }), function (n) { return opts.days.indexOf(n) !== -1; }, function (n) {
          var at = opts.days.indexOf(n);
          if (at !== -1) { if (opts.days.length > 1) opts.days.splice(at, 1); } else opts.days.push(n);
        }));
      }
      if (opts.repeat) {
        var span = qEl('select', 'quick-in'); span.setAttribute('aria-label', 'For how long');
        L.REPEAT_SPANS.forEach(function (sp) { span.appendChild(new Option(sp.id ? 'For ' + sp.label : 'Forever', sp.id)); });
        span.value = opts.span;
        span.addEventListener('change', function () { opts.span = span.value; });
        nodes.push(span);
      }
      panel.replaceChildren.apply(panel, nodes);
      var bits = []; if (opts.due) bits.push(L.dueInfo(opts.due, today).label); if (opts.time) bits.push(opts.time); if (opts.repeat) bits.push('↻');
      more.classList.toggle('set', bits.length > 0);   // the choices themselves show in the panel; the button only says there are some
      more.title = bits.length ? bits.join(' ') : 'Day, time and repeat';
    }
    more.addEventListener('click', function () {
      open = !open; panel.hidden = !open; card.classList.toggle('opts-open', open);
      card.style.setProperty('--quick-up', Math.max(0, document.querySelector('.stage').getBoundingClientRect().top - 4) + 'px');
      more.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) drawOpts();
    });

    // the box stays open for the next one: Enter adds and clears it; Enter on an empty box, Esc, the cross or a click anywhere else closes it
    var close = qEl('button', 'quick-close', '✕');
    close.type = 'button'; close.setAttribute('aria-label', 'Close'); close.title = 'Close';
    close.addEventListener('click', closeQuick);
    card.insertBefore(close, null);
    var placeholder = input.placeholder, flashTimer = 0;
    card.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value;
      if (!text.trim()) { closeQuick(); return; }
      input.value = '';
      var item = addItem(text);
      if (item && todo && (opts.due || opts.time || opts.repeat)) applyQuickOptions(item, opts);
      if (todo) {   // each task starts clean
        opts.due = ''; opts.time = ''; opts.repeat = ''; opts.days = []; opts.span = '';
        open = false; panel.hidden = true; card.classList.remove('opts-open'); more.setAttribute('aria-expanded', 'false'); drawOpts();
      }
      input.placeholder = 'Added ✓ next one…';
      clearTimeout(flashTimer); flashTimer = setTimeout(function () { input.placeholder = placeholder; }, 1500);
      input.focus();
    });
    card.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') closeQuick(); });
    // clicked somewhere else (or into another program): it closes, but not while a choice inside it is being made
    card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) { clearTimeout(quickAway); quickAway = setTimeout(closeQuick, 250); } });
    card.addEventListener('focusin', function () { clearTimeout(quickAway); });
    document.querySelector('.stage').appendChild(card);
    setFace(FACES.curious);
    D.typing(true);
    setTimeout(function () { input.focus(); }, 60);
  }
  if (D.onQuickAdd) D.onQuickAdd(openQuick);
  // the copied text goes to the other device at once (small Fumu or the whole app; the shell only lets the key through while the pointer is over him)
  if (D.onSendCopied) D.onSendCopied(function (text) { if (typeof sendToOther === 'function') sendToOther(text); });

  // ---------- which program is in front (awareness level 2) ----------
  // The shell says what kind of program it is (a game, a browser, an art program...) and, for programs on its short list, its name.
  // He cheers when a game starts and says good game afterwards, makes a remark now and then about the rest (rarely: once per kind per
  // hour, once per 20 minutes in all), and stays quiet while you play or are on a call: no wandering, peeking or napping. At More privacy
  // the shell sends nothing and none of this happens.
  var program = { kind: 'none', name: '', fullscreen: false }, gameSince = 0, lastRemark = 0, kindRemark = {}, programTimer = 0;
  var QUIET_KINDS = { game: 1, call: 1, fullscreen: 1 };
  var grabbed = false;   // the grab-the-mouse key (Ctrl+Alt+G) was pressed for this program: he is solid again
  /** Whether the shell lets the mouse pass through him now (a game or full-screen program, unless he catches the mouse there or the key swapped it). */
  window.deskPassThrough = function () { return deskAware(2) && !deskPrefs.catchGames && !grabbed && (!!program.fullscreen || program.kind === 'game'); };
  /** Whether a game, a call or something full-screen is in front: no napping then (he is quiet). */
  function quietNow() { return deskAware(2) && !!QUIET_KINDS[program.kind]; }
  /** Whether a game or something full-screen is in front: the "full-screen" choices in the settings apply instead of the usual ones. */
  function inFull() { return deskAware(2) && (!!program.fullscreen || program.kind === 'game'); }
  /** @returns {boolean} Whether he may move about (wander, peek, hop onto windows): not when "stand still" is on for the situation he is in. */
  function moveLevel() {
    var l = inFull() ? deskPrefs.moveFull : deskPrefs.moveNormal;
    if (l === 'room' && !deskPrefs.backdrop) l = 'normal';   // his room only exists while its background shows
    return l === 'lots' || l === 'low' || l === 'room' || l === 'still' ? l : 'normal';
  }
  function moveOk() { var l = moveLevel(); return l === 'lots' || l === 'normal'; }
  window.deskMoveOk = moveOk;
  // how often he remarks on what you are doing (settings: Never / Rarely / Normal / Often, one for the usual case and one for games and full-screen)
  var FREQ = { off: 0, rare: 0.6, normal: 1.6, often: 4.5 };
  /** @param {boolean} full  Whether a game or something full-screen is involved. @returns {number} 0 (never), .35, 1 or 2.5: bigger means more often. */
  function chatRate(full) { var v = FREQ[full ? deskPrefs.chatFull : deskPrefs.chatNormal]; return v === undefined ? 1 : v; }
  window.deskChatRate = chatRate;
  /** How much he talks on his own right now (the global chatterRate that app-idle.js reads): the full-screen choice while a game or something full-screen is in front. */
  function applyChatter() {
    var v = FREQ[inFull() ? deskPrefs.talkFull : deskPrefs.talkNormal];
    chatterRate = v === undefined ? 1 : v;
    if (chatterRate === 0 && !bubble.hidden && !busy) { /* a line already up just finishes */ }
  }
  /** A small remark of his own (not an answer to you): said only as often as the chatter choice allows. */
  function chat(text, ms) { if (chatterRate > 0 && Math.random() < Math.min(1, chatterRate)) say(text, ms); }
  window.deskChatter = function () { return chatterRate; };
  window.deskQuiet = quietNow;   // for tests and the developer tools
  window.deskMayRemark = function () { return mayRemark(); };
  var PROGRAM_LINES = {
    browser: ['browsing, hm?', 'so much internet~', 'looking something up?'],
    code: ['hard at work!', 'so many tiny words…', 'tap tap tap~'],
    chat: ['chatting with friends?', 'say hi from me!'],
    ai: ['ooh, Claude! say hi from me~', 'asking Claude again?', 'Claude knows lots of things~', "tell Claude I'm the cute one", 'thinking together? hmm hm', 'fumu fumu~ (that means hi, Claude)'],
    music: ['nice music~ ♪', "what's playing?"],
    video: ['movie time?', 'can I watch too?'],
    office: ['working hard!', 'documents… zzz'],
    mail: ['so many emails…', 'emails, ugh'],
    art: ['ooh, are you drawing?', 'draw me next!', 'pretty colours~'],
    'video-edit': ['editing! fancy~', 'make it cute!'],
    launcher: ['going gaming?', 'what are we playing?']
  };
  var GAME_START = ['ooh, {name}! have fun~', '{name} time! good luck!', "go get 'em in {name}!", "{name}! I'll be quiet ♡"];
  var GAME_END = ['good game~', 'how was {name}?', 'welcome back from {name}!'];
  var GAME_DURING = ['you can do it!', "don't die!", 'I believe in you ♡', 'focus focus~', 'snack break soon?', 'wow, you are so good at {name}!', 'careful careful…', 'drink some water~', 'sit up straight!', 'I am watching quietly ♡', 'ooh, what was that?', 'one more round?', 'you are doing great ♡', 'stretch your hands a bit~', 'good teamwork!', 'ooh, nice move!', 'I will guard your snacks~'];
  // Lines for particular games, to be filled in (any list can stay empty: he then uses the ones above). The key is the game's name as the list
  // in desktop/programs.js (or a game you taught him) spells it, in any case and ignoring spaces and punctuation. start: when it begins;
  // during: now and then while you play; end: when you stop after a while. {name} is replaced by the name.
  var WOW_LINES = {
    start: ['Azeroth awaits! have fun~', "off to Azeroth! I'll keep watch ♡"],
    during: ['for the Horde! …or the Alliance~', "don't stand in the fire!", 'loot loot loot ✦', 'be nice to the tank ♡', 'may all your rolls be high~', 'one more quest… promise?', 'can I be a battle pet?', 'is that a rare spawn?!', 'the mounts are so cute~', 'bring snacks to the dungeon!'],
    end: ['how was Azeroth?', 'welcome back, hero~']
  };
  var GAME_LINES = {
    'World of Warcraft': WOW_LINES,
    'World of Warcraft Classic': WOW_LINES,
    'Dark Souls': { start: [], during: [], end: [] },
    'Dark Souls Remastered': { start: [], during: [], end: [] },
    'Dark Souls II': { start: [], during: [], end: [] },
    'WoW Forever beta': WOW_LINES   // teach him this one under that name (Settings > Privacy), the program is not on the list yet
  };
  function gameKey(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var GAME_LINES_BY_KEY = {};
  Object.keys(GAME_LINES).forEach(function (n) { GAME_LINES_BY_KEY[gameKey(n)] = GAME_LINES[n]; });
  /** @param {string} name  A game. @param {string} part  'start', 'during' or 'end'. @returns {string[]} The lines for that game, or the usual ones. */
  function linesFor(name, part) {
    var own = GAME_LINES_BY_KEY[gameKey(name)];
    return own && own[part] && own[part].length ? own[part] : part === 'start' ? GAME_START : part === 'end' ? GAME_END : GAME_DURING;
  }
  /** @returns {boolean} Whether he may say something about the program now (not at More privacy, not when switched off, not mid-something). */
  function mayRemark() {
    return deskAware(2) && isPet() && !document.hidden && !busy && !dreaming && !walking && !carried && !press &&
      !(typeof napping !== 'undefined' && napping) && baseState() !== 'sleepy' && !stage.classList.contains('bedtime') &&
      !document.querySelector('dialog[open], .inbox-card') && bubble.hidden;
  }
  /** Runs fn once he is free to speak (a bubble that is up goes away by itself), trying for up to 12 seconds; `still` says whether it is still wanted. */
  function whenFree(still, fn, first) {
    var tries = 0;
    (function go() {
      clearTimeout(programTimer);
      if (!still()) return;
      if (mayRemark()) { fn(); return; }
      if (++tries < 12) programTimer = setTimeout(go, 1000);
    })();
    return first;
  }
  function remark(text, name) { say(text.replace(/\{name\}/g, name || 'it'), 4200, true); var m = pick(['hopsmall', 'hopsmall', 'tilt', 'shiver']); pulse(m, m === 'tilt' ? 1800 : m === 'shiver' ? 700 : 450); }
  /** Whether a 0..1 chance (already scaled by how often he is allowed to talk) comes up. */
  function chance(p) { return Math.random() < Math.min(1, p); }
  var duringTimer = 0;
  // while a game is in front he says something about it now and then (every 2.5 to 5 minutes at Normal), only if comments there are not on Never
  function scheduleDuring() {
    clearTimeout(duringTimer);
    var rate = chatRate(true);
    duringTimer = setTimeout(function () {
      if (program.kind === 'game' && chatRate(true) > 0) {
        var name = program.name;
        whenFree(function () { return program.kind === 'game' && program.name === name; }, function () { remark(pick(linesFor(name, 'during')), name); });
      }
      if (program.kind === 'game') scheduleDuring();
    }, (rate > 0 ? (4 + Math.random() * 4) * 60000 / rate : 120000));
  }
  var whileTimer = 0;
  // staying in the same kind of program he says something about it now and then too (every 5 to 9 minutes at Normal)
  function scheduleWhile() {
    clearTimeout(whileTimer);
    var rate = chatRate(!!program.fullscreen), kind = program.kind;
    if (rate <= 0) return;
    whileTimer = setTimeout(function () {
      if (program.kind !== kind) return;
      whenFree(function () { return program.kind === kind; }, function () { lastRemark = Date.now(); remark(pick(PROGRAM_LINES[kind]), program.name); });
      scheduleWhile();
    }, (8 + Math.random() * 7) * 60000 / rate);
  }
  if (D.onProgram) D.onProgram(function (p) {
    var was = program;
    grabbed = false;   // (the shell does the same when the program changes)
    program = p || { kind: 'none', name: '', fullscreen: false };
    applyChatter();   // a game or full-screen program switches him to the other chatter choice
    clearTimeout(programTimer);
    var now = Date.now();
    var full = chatRate(true), usual = chatRate(!!program.fullscreen);
    if (program.kind === 'game' && was.kind !== 'game') {
      if (!gameSince) gameSince = now;
      scheduleDuring();
      var seen = kindRemark['game:' + program.name];
      if (full > 0 && !(seen && now - seen < 30 * 60000 / full) && chance(full)) {   // (whenFree waits for a quiet moment)
        kindRemark['game:' + program.name] = now;
        var game = program.name;
        programTimer = setTimeout(function () { whenFree(function () { return program.kind === 'game'; }, function () { setFace({ eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); remark(pick(linesFor(game, 'start')), game); setTimeout(function () { if (!busy) settle(); }, 2200); }); }, 1500);
      }
    } else if (was.kind === 'game' && program.kind !== 'game') {
      clearTimeout(duringTimer);
      var played = gameSince ? now - gameSince : 0; gameSince = 0;
      if (played > 15 * 60000 && full > 0 && chance(full)) programTimer = setTimeout(function () { whenFree(function () { return program.kind !== 'game'; }, function () { remark(pick(linesFor(was.name, 'end')), was.name); }); }, 2500);
    } else if (PROGRAM_LINES[program.kind] && program.kind !== was.kind && usual > 0 && now - lastRemark > 12 * 60000 / usual && now - (kindRemark[program.kind] || 0) > 30 * 60000 / usual && chance(0.9 * usual)) {
      // stay in the program for a little while first, so a quick alt-tab says nothing
      var kind = program.kind;
      programTimer = setTimeout(function () {
        whenFree(function () { return program.kind === kind; }, function () {
          lastRemark = Date.now(); kindRemark[kind] = lastRemark;
          remark(pick(PROGRAM_LINES[kind]), program.name);
        });
      }, 8000);
    }
    if (PROGRAM_LINES[program.kind] && program.kind !== 'game') scheduleWhile(); else clearTimeout(whileTimer);
  });

  // ---------- swiping alerts with no clicking (while the mouse passes through him in a game) ----------
  // The shell lets the mouse go through him then, so an alert's buttons cannot be clicked, but the page still sees the pointer move over it:
  // moving across the card is the swipe. A task reminder: left is Done (when the task can be ticked here, else it is put away),
  // up or down snoozes it for 10 minutes, right puts it away (the cross). A note or link: left copies it, right puts it away. Any other alert: right or left puts it away.
  var trail = [];
  /** The pointer is at x, y: a sweep across an alert card. Fed by the page's own mouse events and by the shell, which watches the pointer itself.
   *  Forgiving on purpose: it looks at the last 0.4 s of the path, and the sweep only has to cross the card (it may start or end outside it). */
  function sweepAt(x, y) {
    var now = Date.now(), last = trail[trail.length - 1];
    if (last && last.x === x && last.y === y) return;
    trail.push({ x: x, y: y, t: now });
    while (trail.length > 1 && now - trail[0].t > 400) trail.shift();
    if (!isPet() || !window.deskPassThrough() || trail.length < 2) return;
    var prev = trail[trail.length - 2], cards = [].slice.call(document.querySelectorAll('.inbox-card:not(.quick-card)')), card = null;
    cards.forEach(function (c) {
      if (card || c.dataset.leaving) return;
      var r = c.getBoundingClientRect();
      for (var i = 0; i <= 4; i++) { var px = prev.x + (x - prev.x) * i / 4, py = prev.y + (y - prev.y) * i / 4; if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) { card = c; break; } }
    });
    if (!card) return;
    var from = trail[0], dx = x - from.x, dy = y - from.y;
    var sideways = Math.abs(dx) >= Math.min(60, card.offsetWidth * 0.3) && Math.abs(dx) >= Math.abs(dy) * .7;
    var vertical = Math.abs(dy) >= Math.min(30, card.offsetHeight * 0.45) && Math.abs(dy) > Math.abs(dx) * 1.2;
    if (!sideways && !vertical) return;
    trail = [];
    var remind = card.classList.contains('remind-card'), buttons = [].slice.call(card.querySelectorAll('button'));
    function named(re) { return buttons.filter(function (b) { return re.test(b.textContent); })[0]; }
    if (!remind && !vertical && dx < 0 && cardCopy(card)) return;   // a note or link: left copies it, right puts it away
    var btn = card.querySelector('.inbox-done'), dir = dx < 0 ? -1 : 1;
    if (vertical) { if (remind) btn = named(/^In 10 min/) || btn; dir = 0; }
    else if (remind && dx < 0) btn = named(/^Done/) || btn;
    if (!btn) return;
    card.dataset.leaving = '1';
    if (dir) slideAway(card, dir, function () { btn.click(); });
    else { card.style.animation = 'none'; card.style.transition = 'translate .26s ease-in, opacity .26s'; card.style.translate = '0 ' + (dy < 0 ? -1 : 1) * 60 + 'px'; card.style.opacity = '0'; setTimeout(function () { if (card.parentNode) btn.click(); }, 270); }
  }
  document.addEventListener('mousemove', function (e) { sweepAt(e.clientX, e.clientY); }, true);
  // the shell also reports the pointer while a card is up (Windows does not always forward it to a window that lets clicks through)
  if (D.onSweep) D.onSweep(function (x, y) { sweepAt(x, y); });
  var sweepSent = false;
  function sweepWatch() {
    var on = isPet() && window.deskPassThrough() && !!document.querySelector('.inbox-card:not(.quick-card)');
    if (on !== sweepSent && D.sweep) { sweepSent = on; D.sweep(on); }
  }
  setInterval(sweepWatch, 400);

  // ---------- where the solid parts are (for the shell's own, instant hit test) ----------
  // The shell used to ask the page "is the pointer over him?" and wait for the answer, which could take long enough for a quick press on the
  // toy to fall through to the window behind. Now the page tells it where the solid things are (about 30 times a second, only when they move)
  // and the shell checks the pointer against them itself, many times a second, without any waiting.
  var lastRects = '';
  var PERCH_CLICK_THROUGH = 15;
  function solidRects() {
    var out = [], list = document.querySelectorAll(SOLID);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.hidden || el.closest('[hidden]')) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || getComputedStyle(el).display === 'none') continue;
      // sitting on a window his bottom edge overlaps that window (its buttons, its title bar): the lowest 15 px of him let clicks through
      var cut = el === pet && perched ? PERCH_CLICK_THROUGH : 0;
      out.push([Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom - Math.min(cut, r.height - 8))]);
      if (el === pet) {   // the cushion (or bed) under him is part of him too (see #pet::after in styles.css)
        var bed = stage.classList.contains('bedtime'), w = bed ? 250 : 164, h = bed ? 52 : 44, cx = (r.left + r.right) / 2;
        out.push([Math.round(cx - w / 2), Math.round(r.bottom + 12 - h), Math.round(cx + w / 2), Math.round(r.bottom + 12 - cut)]);
      }
    }
    return out;
  }
  if (D.setRects) setInterval(function () {
    if (!isPet() || document.hidden) return;
    var r = solidRects(), key = JSON.stringify(r);
    if (key !== lastRects) { lastRects = key; D.setRects(r); }
  }, 33);
  // (the shell forgets nothing between page loads, so say it once more after a reload)
  window.addEventListener('pageshow', function () { lastRects = ''; });

  // ---------- away from the computer ----------
  // The shell says when nothing was touched for a few minutes (or the screen was locked): he curls up for a nap, and says hello again when you are back.
  window.deskAway = function () { return away; };   // (app-send.js polls the inbox slowly while he is away)
  if (D.onIdle) D.onIdle(function (idle) {
    if (!idle && typeof inboxPoll === 'function') setTimeout(inboxPoll, 400);   // back at the computer: look for anything that came meanwhile
    if (idle) {
      if (!isPet() || away) return;
      away = true; awayAt = Date.now();
      awayNap = !roaming && !peeking && typeof napNow === 'function' && napNow(8 * 3600 * 1000) > 0;
      return;
    }
    if (!away) return;
    away = false;
    var gone = Date.now() - awayAt;
    if (!deskAware(2) && gone < 600000) { awayNap && napping && wakeFromNap(false); awayNap = false; return; }   // more privacy: he only says hello after a long time away
    var hello = gone > 3600000 ? ['you were gone so long!', 'I missed you ♡', 'welcome back, finally!'] : ['welcome back!', 'there you are~', 'hello again ♡'];
    if (awayNap && typeof napping !== 'undefined' && napping) {
      wakeFromNap(false);
      // after unlocking, Windows takes a moment to show the desktop again: say hello a little later, and for long enough to read
      setTimeout(function () { if (!busy) { say(pick(hello), 5000, true); pulse('hop', 460); setFace({ eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks', 'hearts'] }); } }, 2200);
    } else if (gone > 120000 && !busy && isPet()) {
      setTimeout(function () { if (!busy) { say(pick(hello), 5000, true); pulse('hop', 460); } }, 1200);
    }
    awayNap = false;
  });

  // ---------- sitting on other windows (a switch in the tray menu; Windows only) ----------
  // The shell finds the edges and moves the window; here he hops, looks pleased and gets down when it is bedtime.
  // on a window he sits: soles out in front (the .seated look in styles.css; walking along the edge stands him up for a moment)
  if (D.onPerched) D.onPerched(function (yes) {
    perched = yes;
    pet.classList.toggle('seated', yes);
    if (yes && !busy) { pulse('hopsmall', 450); drift(['♪'], petTop(), 1); }
    // he held his toy for the hop up: sitting, it lies next to him
    if (yes && typeof toyCarry === 'function') toyCarry(false);
  });
  /** @param {boolean} [manual] Asked for from the settings or animation player: say why when nothing happens. */
  function hopUp(manual) {
    if (!D.perch || roaming) return;
    roaming = true;
    setFace(FACES.curious);
    pulse('hop', 700);
    if (typeof toyCarry === 'function') toyCarry(true);   // the toy goes up in his arms
    D.perch('up').then(function (on) {
      roaming = false;
      if (on !== true) {
        if (typeof toyCarry === 'function') toyCarry(false);
        settle();
        if (manual) say(on === 'private' ? 'awareness is on More privacy, so I cannot see your windows' : on === 'off' ? 'switch on "Sits on my windows" in the settings' : 'no window with room above it to sit on', 3500);
        return;
      }
      pulse('hop', 460);
      setFace({ eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
      chat(pick(['up here!', 'nice view~', 'hehe, a perch', 'fumu fumu~']), 1500);
      setTimeout(function () { if (!busy) settle(); }, 1600);
    }, function () { roaming = false; });
  }
  // after getting off a window he runs back to where he was: the shell glides the window, here the feet go
  // the toy falls along with him (it is in his window); then he picks it up and carries it as he walks back, and puts it down where he ends up
  var tripHold = false;
  function tripStart() { tripHold = true; if (typeof toyCarry === 'function' && !carried) toyCarry(true); }
  function tripEnd() { tripHold = false; if (!perched && !carried && typeof toyCarry === 'function') toyCarry(false); }
  if (D.onFall) D.onFall(function (on) { pet.classList.toggle('falling', on); if (on) setFace({ eyes: 'sparkle', mouth: 'o', arms: 'idle', x: [] }); else if (!busy) settle(); });
  var runOwn = false;
  // the shortcut that makes him catch the mouse in a full-screen game (or lets go again)
  if (D.onGrab) D.onGrab(function (on) {
    grabbed = !!on;
    // he always answers the key: even with speech bubbles off, in the middle of something quiet, or while another line holds the bubble
    var line = on ? pick(['you can click me now!', 'here I am~', 'grab me!']) : pick(['back to the game!', 'I\'ll stay out of the way', 'shh, play on~']);
    var quiet = idleQuiet; idleQuiet = false; speechLockUntil = 0;
    document.documentElement.classList.add('grab-say');
    say(line, 2400, true);
    idleQuiet = quiet;
    if (!carried && !stage.classList.contains('bedtime')) {
      // two clearly different moves: solid again = a cheerful spinning hop with sparkles; the mouse passes through = he ducks down and pops up with a finger to his lips
      if (on) { setFace({ eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); pulse('spinhop', 900); drift(['✦', '♥', '✦'], petTop(), 4); }
      else { setFace({ eyes: 'closed', mouth: 'smile', arms: 'cover', x: [] }); pulse('popup', 1500); drift(['🤫'], petTop(), 1); }
      setTimeout(function () { if (!busy && !carried) settle(); }, on ? 1500 : 1900);
    } else if (typeof pulse === 'function' && !carried) pulse('hopsmall', 450);
    setTimeout(function () { document.documentElement.classList.remove('grab-say'); }, 2500);
  });
  // up at night and tired: the shell takes his walk back slowly, and his feet go slowly too
  if (D.setDrowsy) new MutationObserver(function () {
    var sc = document.documentElement.dataset.scene || '';
    D.setDrowsy(sc.indexOf('night-drowsy') === 0);
    pet.classList.toggle('plod', sc.indexOf('night-drowsy') === 0);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-scene'] });
  if (D.onRun) D.onRun(function (dir) {
    if (dir) tripStart(); else if (tripHold) tripEnd();
    if (dir) { pet.classList.add('walking'); lookToward(dir); if (!roaming) { roaming = true; runOwn = true; } }
    else { pet.classList.remove('walking'); stopLook(); if (runOwn) { roaming = false; runOwn = false; } }
  });
  function hopDown() {
    if (!D.perch || roaming) return;
    roaming = true;
    pulse('hop', 700);
    D.perch('down').then(function () { roaming = false; pulse('hopsmall', 450); if (!busy) { settle(); chat(pick(['back down~', 'whee!']), 1200); } }, function () { roaming = false; });
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
    if (what === 'perch') { if (perched) hopDown(); else hopUp(true); return 3000; }
    if (what === 'sit') { var sit = !pet.classList.contains('seated'); pet.classList.toggle('seated', sit); if (sit) pulse('hopsmall', 450); return 0; }
    if (what === 'nap') return typeof napNow === 'function' ? napNow(15000) : 0;
    if (what === 'remind') { window.deskRemind([{ id: 'test', text: 'A test reminder', emoji: '⏰', time: '', done: false }]); return 4000; }
    if (what === 'claude' || what === 'note') { devAlert(what); return 9000; }
    return 0;
  };
  // ---------- developer tools for the settings window (the shell calls these; see desktop/panel-ui.js) ----------
  // Only the shell may call them (it runs a fixed list of names), and none of them reads or sends anything about the player.
  var devAnims = [], devAnimTimer = 0, devAnimBusy = false, devRemarkAt = 0, devGameAt = 0;
  function devRefresh() { updateEmptyHint(); refreshBackdrop(); refreshBedtime(); if (!busy) settle(); }
  /** Marks one item on the list as just ticked (so "shopping now" is true) and the rest as still to do. @param {Object[]} list */
  function devShopping(list) {
    if (!list.length) list.push.apply(list, L.parseState(null, newId).items.slice(0, 3));
    var now = Date.now();
    list.forEach(function (it, i) { it.done = i === 0; it.doneAt = i === 0 ? now : 0; });
  }
  function devQuietList(list) { list.forEach(function (it) { if (it.done) it.doneAt = 0; }); }
  function devList(todo) { if (isTodo() !== todo) switchList(); }
  var DEV_RUN = {
    wander: function () { return window.deskDo('wander') ? 'He wanders.' : 'Not now.'; },
    peek: function () { return window.deskDo('peek') ? 'He peeks.' : 'Not now.'; },
    perch: function () { return window.deskDo('perch') ? 'He hops on or off a window.' : 'Not now.'; },
    sit: function () { window.deskDo('sit'); return 'Sit / stand.'; },
    nap: function () { window.deskDo('nap'); return 'He naps.'; },
    remind: function () { window.deskDo('remind'); return 'Task alert.'; },
    claude: function () { return devAlert('claude'); },
    note: function () { return devAlert('note'); },
    link: function () { return devAlert('link'); },
    update: function () { showUpdateCard(); return 'Update card.'; },
    ring: function () { return window.deskRing && window.deskRing() ? 'Ring menu open.' : 'Not now.'; },
    remark: function () {   // a remark about the kind of program in front, one kind after another (ignores the awareness level and the rate)
      if (!isPet() || stage.classList.contains('bedtime')) return 'Not while he is in bed.';
      var kinds = Object.keys(PROGRAM_LINES), k = kinds[devRemarkAt++ % kinds.length];
      remark(pick(PROGRAM_LINES[k]), k === 'launcher' ? 'a launcher' : k);
      return 'Remark: ' + k + ' (' + devRemarkAt + '/' + kinds.length + ' kinds, press again for the next).';
    },
    gameremark: function () {   // what he says about a game: first a cheer, then a line during play, then good game, game after game
      if (!isPet() || stage.classList.contains('bedtime')) return 'Not while he is in bed.';
      var games = ['World of Warcraft', 'Dark Souls', 'Some other game'], g = games[Math.floor(devGameAt / 3) % games.length], part = ['start', 'during', 'end'][devGameAt % 3];
      devGameAt++;
      if (part === 'start') setFace({ eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['cheeks'] });
      remark(pick(linesFor(g, part)), g);
      return g + ': ' + part + ' line.';
    },
    headfall: function () {   // the page side of being knocked off a window and landing on his head (the window itself does not move)
      if (!isPet() || stage.classList.contains('bedtime')) return 'Not while he is in bed.';
      pageThrown(true, 1, false, { head: true });
      setTimeout(function () { pageBounce(0.8); }, 600);
      setTimeout(function () { pageThrown(false, 0, false, { ouch: true, head: true }); }, 900);
      return 'He lands on his head.';
    },
    bellring: function () { if (!bellOut()) return 'The bell is only out while he is in bed.'; bellRing(); return 'Ding.'; },
    bellbreak: function () { if (!bellOut()) return 'The bell is only out while he is in bed.'; bellBreak(); return 'Smash.'; },
    nightlight: function () { toggleNightLight(); return 'Night light ' + (nightLightOn ? 'on' : 'off') + '.'; },
    snack: function () { return devWish(); },
    suggest: function () { return devSuggest(); },
    giftday: function () { return devGiftCalendar(); },
    giftshut: function () { return devGiftReset(); },
    tomorrow: function () { L.skipDays(state, 1); refreshAll(); return 'A day has passed.'; },
    sample: function () { state.items = state.items.concat(isTodo() ? sampleTodos() : L.parseState(null, newId).items); refreshAll(); return 'Sample items added.'; },
    clear: function () { state.items = []; refreshAll(); return 'List cleared.'; }
  };
  var DEV_SCENES = {
    'day': function () { devClock = 'day'; devList(false); },
    'day-clip': function () { devClock = 'day'; devList(true); },
    'night-bed': function () { devClock = 'night'; devList(false); devQuietList(state.items); devQuietList(state.stash); },
    'night-drowsy': function () { devClock = 'night'; devList(false); devShopping(state.items); },
    'night-drowsy-clip': function () { devClock = 'night'; devList(true); devShopping(state.stash); devQuietList(state.items); }
  };
  window.deskDev = {
    state: function () { return { scene: petScene(), clock: devClock, list: isTodo() ? 'to-do' : 'shopping' }; },
    clock: function (v) { if (v !== 'auto' && v !== 'day' && v !== 'night') return 'No.'; devClock = v; devRefresh(); return { auto: 'Real clock.', day: 'Daytime.', night: 'Night.' }[v]; },
    scene: function (id) { if (!DEV_SCENES[id]) return 'No.'; DEV_SCENES[id](); try { setBellAwake(false); } catch (e) { /* storage */ } save(); render(); devRefresh(); return 'Now: ' + id; },
    run: function (id) { return DEV_RUN[id] ? String(DEV_RUN[id]() || 'Done.') : 'No.'; },
    /** @returns {{g: string, n: string}[]} Every animation by group and name (the animation player's list). */
    animations: function () { devAnims = animCatalogue(); return devAnims.map(function (a) { return { g: a.group, n: a.name }; }); },
    play: function (i) {
      var it = devAnims[i | 0]; if (!it) return 'No.';
      clearTimeout(devAnimTimer);
      if (devAnimBusy) busy = Math.max(0, busy - 1);
      devAnimBusy = true; busy++; stopWalk();
      var ms; try { ms = it.run(); } catch (e) { ms = 600; }
      if (typeof ms !== 'number' || !isFinite(ms)) ms = 1800;
      devAnimTimer = setTimeout(function () { devAnimBusy = false; busy = Math.max(0, busy - 1); if (!busy) settle(); }, Math.max(500, ms) + 500);
      return it.group + ' › ' + it.name;
    },
    stop: function () { clearTimeout(devAnimTimer); if (devAnimBusy) { devAnimBusy = false; busy = Math.max(0, busy - 1); } if (!busy) settle(); return 'Stopped.'; }
  };

  /** A short stroll inside the window, where his room is: the window itself stays put. */
  function strollInRoom(little) {
    if (typeof walkTo !== 'function' || typeof walkRange !== 'function') return;
    var r = walkRange() * (little ? 0.35 : 1), x = (Math.random() * 2 - 1) * r;
    if (Math.abs(x - walkX) < 30) x = walkX > 0 ? -r * 0.7 : r * 0.7;
    walkTo(x);
  }
  var roamTimer = 0;
  function scheduleRoam(first) {
    clearTimeout(roamTimer);
    roamTimer = setTimeout(function () {
      if (roamOk()) {
        // what he may do now: moving about (wander, peek, hop onto a window) only when "stand still" is not on for the situation, napping when nothing quiet is in front
        var lvl = moveLevel(), move = moveOk(), nap = !quietNow() && typeof napNow === 'function', hop = move && D.perch && deskPrefs.perch;
        var r = Math.random();
        if (hop && r < 0.3) { if (perched) hopDown(); else hopUp(); }
        else if (move && perched && r > 0.7) wander();
        else if (move && r < 0.4) wander();
        else if (nap && r < 0.7) napNow(18000 + Math.random() * 14000);
        else if (move && !perched) peek();
        else if ((lvl === 'room' || lvl === 'low') && r < 0.6) strollInRoom(lvl === 'low');
      }
      scheduleRoam(false);
    }, ((first ? 90 : 240) * 1000 + Math.random() * (first ? 150 : 300) * 1000) / (moveLevel() === 'lots' ? 3 : 1));
  }
  scheduleRoam(true);
  // with "sits on my windows" on he tries every minute or two, so it is easy to see: he hops up, stays a while, comes down again
  (function scheduleSeat() {
    setTimeout(function () {
      if (deskPrefs.perch && D.perch && roamOk() && moveOk()) {
        if (!perched) { if (Math.random() < 0.8) hopUp(); }
        else if (Math.random() < 0.35) hopDown();
      }
      scheduleSeat();
    }, 45000 + Math.random() * 45000);
  })();
  // the settings window's "make him do it now" buttons
  if (D.onDo) D.onDo(function (what) {
    if (what === 'remind') { var old = deskPrefs.remind; deskPrefs.remind = true; window.deskDo('remind'); deskPrefs.remind = old; }
    else window.deskDo(what);
  });
})();
