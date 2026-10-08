// The ring menu: in the small desktop window, rest the pointer on him and a ring of little buttons opens above him (play ball, pat, a snack,
// a dance, swap the list, and at night the lights or the night light). It lives in his own window, so it never has to fit round the edge of the
// screen. What it offers follows his scene (petScene): in bed only the night light; drowsy at night he can be sent to bed (then you tuck him in).
// Plain script, shares one scope, loaded after app-night.js.
'use strict';

(function () {
  /** The small window's class can arrive after this script has run (the shell says which mode it is a moment later): look each time. */
  function isDesk() { return document.documentElement.classList.contains('desktop-pet'); }
  var ring = document.createElement('div');
  ring.className = 'ring'; ring.hidden = true; ring.setAttribute('role', 'menu'); ring.setAttribute('aria-label', 'Play');
  stage.appendChild(ring);
  var shown = false, hoverAt = 0, leaveTimer = 0, quietUntil = 0, center = { x: 0, y: 0, r: 100 };

  function ringSnack() {
    if (busy) return;
    var word = L.nextWish(state.pet, new Date(), Math.random);
    if (!word) { say(pick(['no more snacks today…', 'I\'m full for today ♡']), 1600); return; }
    askForTreat(true);
    setTimeout(function () { wishEl.click(); }, 80);   // (feeds it the way tapping his cloud does)
  }
  function ringDance() {
    if (busy) return;
    busy++;
    var m = tiredMove(pick([['boogie', 2400], ['twirl', 1300], ['hophop', 1500]]));
    setFace(tiredFace(FACES.party));
    pulse(m[0], m[1]);
    sound('excited');
    say(pick(['la la la~', 'hehe~', 'dance dance!']), 1500);
    setTimeout(function () { busy--; if (!busy) settle(); }, m[1] + 300);
  }
  function ringWave() {
    if (busy) return;
    busy++;
    setFace(tiredFace({ eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }));
    pulse('hopsmall', 450);
    say(pick(['hi hi!', 'hello~', 'hi! ♡']), 1400);
    setTimeout(function () { busy--; if (!busy) settle(); }, 1500);
  }
  function ringSleep() { bellToBed(['lights off… so sleepy…', '*yawn* bed time…', 'to bed we go…'], true); }   // (he only gets into bed: you still tuck him in)

  /** Everything the ring can offer. `on` is for switches. */
  var ITEMS = {
    ball: { icon: '⚽', label: 'Play ball', run: function () { if (!busy && typeof playToy === 'function') playToy(); } },
    pat: { icon: '❤', label: 'Pat', run: function () { if (window.petHim) window.petHim(); } },
    snack: { icon: '🍪', label: 'Snack', run: ringSnack },
    dance: { icon: '🎉', label: 'Dance', run: ringDance },
    wave: { icon: '👋', label: 'Wave', run: ringWave },
    swap: { icon: '📝', label: 'Swap list', run: function () { if (typeof switchList === 'function') switchList(); } },
    lights: { icon: '💡', label: 'Lights off', run: ringSleep },
    night: { icon: '🌙', label: 'Night light', keep: true, on: function () { return nightLightOn; }, run: function () { toggleNightLight(); } }
  };
  /** @returns {string[]} The buttons for the scene he is in now. */
  function items() {
    var scene = petScene();
    if (scene === 'night-bed') return ['night'];   // in bed: only the night light
    if (scene.indexOf('night-drowsy') === 0) return ['ball', 'pat', 'snack', 'dance', 'swap', 'lights'];
    return ['ball', 'pat', 'snack', 'dance', 'swap', 'wave'];
  }
  function canShow() {
    return isDesk() && !document.hidden && Date.now() > quietUntil &&
      !pet.classList.contains('carried') && !pet.classList.contains('thrown') && !pet.classList.contains('falling') &&
      !document.querySelector('.inbox-card, .quick-card, dialog[open]');
  }
  function build() {
    ring.replaceChildren();
    var names = items(), n = names.length;
    var pr = pet.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    center = { x: pr.left + pr.width / 2 - sr.left, y: pr.top + pr.height * 0.55 - sr.top, r: Math.max(86, pr.width * 0.62) };
    // the part of his window that is on a screen (the shell sends it; --vis-l / --vis-r): near the side of the screen the arc turns
    // towards the middle of the screen so every button stays visible
    var cs = getComputedStyle(document.documentElement), vl = parseFloat(cs.getPropertyValue('--vis-l')) || 0;
    var vr = /vw/.test(cs.getPropertyValue('--vis-r')) || !cs.getPropertyValue('--vis-r') ? window.innerWidth : parseFloat(cs.getPropertyValue('--vis-r'));
    var minX = vl - sr.left + 22, maxX = vr - sr.left - 22;
    function okAt(a, r) { var x = center.x + Math.cos(a * Math.PI / 180) * r; return x >= minX && x <= maxX; }
    // the angles (from low on his left, over his head, to low on his right: -218 to 38 degrees) where a button fits on screen: the longest unbroken run of them. If the run is too
    // short for a ring, every other button goes on a second, wider ring so they fan out in two rows instead of piling up.
    var R2 = center.r + 36, pref = n > 4 ? 30 : 34, plan = null;
    for (var stag = 0; stag < 2 && !plan; stag++) {
      var lo = 0, hi = -1, runLo = null;
      for (var a = -218; a <= 38; a++) {
        var ok = okAt(a, center.r) && (!stag || okAt(a, R2));
        if (ok && runLo === null) runLo = a;
        if (runLo !== null && (!ok || a === 38)) {
          var end = ok ? a : a - 1;
          if (end - runLo > hi - lo || hi < lo) { lo = runLo; hi = end; }
          runLo = null;
        }
      }
      if (hi < lo) continue;
      var room = hi - lo, g = n > 1 ? Math.min(pref, room / (n - 1)) : 0;
      if (n > 1 && !stag && g < 28) continue;   // too tight for one ring: try two
      plan = { gap: g, start: (lo + hi) / 2 - g * (n - 1) / 2, stag: stag };
    }
    if (!plan) plan = { gap: 24, start: -90 - 12 * (n - 1), stag: 0 };
    names.forEach(function (name, i) {
      var it = ITEMS[name], b = document.createElement('button');
      b.type = 'button'; b.className = 'ring-btn'; b.setAttribute('role', 'menuitem'); b.title = it.label; b.setAttribute('aria-label', it.label);
      if (it.on) b.setAttribute('aria-pressed', it.on() ? 'true' : 'false');
      var ang = (plan.start + plan.gap * i) * Math.PI / 180, rad = plan.stag && i % 2 ? R2 : center.r;
      var x = Math.max(minX, Math.min(maxX, center.x + Math.cos(ang) * rad)), y = Math.max(20, Math.min(sr.height - 20, center.y + Math.sin(ang) * rad));
      b.style.left = (x - 17) + 'px'; b.style.top = (y - 17) + 'px'; b.style.setProperty('--i', i);
      b.appendChild(emojiImg(it.icon, ''));
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        sound('tap');
        it.run();
        if (it.keep) { if (it.on) b.setAttribute('aria-pressed', it.on() ? 'true' : 'false'); } else hide();
      });
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      ring.appendChild(b);
    });
  }
  function show() {
    if (shown || !canShow() || !items().length) return;
    build();
    ring.hidden = false; shown = true;
  }
  function hide() {
    clearTimeout(leaveTimer);
    if (!shown) return;
    shown = false; ring.hidden = true; ring.replaceChildren();
  }
  // opens after the pointer has rested on him for a moment, and closes when it has gone well away from him
  document.addEventListener('mousemove', function (e) {
    if (!isDesk()) return;
    var pr = pet.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    var onHim = e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom;
    if (!shown) {
      if (!onHim) { hoverAt = 0; return; }
      if (!hoverAt) hoverAt = Date.now();
      else if (Date.now() - hoverAt > 450) show();
      return;
    }
    var cx = pr.left + pr.width / 2, cy = pr.top + pr.height * 0.55, d = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (d < center.r + 54) { clearTimeout(leaveTimer); leaveTimer = 0; }
    else if (!leaveTimer) leaveTimer = setTimeout(function () { leaveTimer = 0; hide(); }, 450);
  }, true);
  document.addEventListener('mouseleave', function () { hoverAt = 0; clearTimeout(leaveTimer); leaveTimer = setTimeout(hide, 300); });
  // picking him up, stroking him or anything else that starts on him puts it away for a moment
  pet.addEventListener('pointerdown', function () { hoverAt = 0; quietUntil = Date.now() + 1500; hide(); }, true);
  // his scene changed under the open ring (it got dark, the list was swapped): build it again
  new MutationObserver(function () { if (shown) { if (canShow()) build(); else hide(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-scene', 'data-list'] });
  window.deskRing = function () { show(); return shown; };   // for tests and the animation player
})();
