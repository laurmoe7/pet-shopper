// The ring menu (in the app it is only the toy switch, opened with a double tap on him): in the small desktop window, rest the pointer on him and a ring of little buttons opens above him (play ball, the toy switch, a snack,
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
  var appHide = 0, shown = false, previewing = false, previewTimer = 0, hoverAt = 0, leaveTimer = 0, quietUntil = 0, center = { x: 0, y: 0, r: 100 };

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
    toy: { icon: '💥', label: 'Wrecking ball', on: function () { return toyKind() === 'wrecker'; }, run: function () { toggleToyKind(); } },
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
    if (!isDesk()) return scene === 'night-bed' ? [] : ['toy'];   // in the app it only has the toys (none picked: his own); in bed they are put away
    if (scene === 'night-bed') return ['night'];   // in bed: only the night light
    if (scene.indexOf('night-drowsy') === 0) return ['ball', 'toy', 'snack', 'dance', 'swap', 'lights'];
    return ['ball', 'toy', 'snack', 'dance', 'swap', 'wave'];
  }
  function canShow(now, force) {
    // a double click on him or a style preview is asked for on purpose: only the mode is checked, so a stuck state (hidden window, a leftover
    // 'thrown' class, pass-through) can never keep it from opening. The idle cases (nothing asked for it) keep all the checks.
    if (!isDesk()) return !!now && !document.querySelector('dialog[open]');   // (the app: only when asked for, with a double tap)
    if (now) return isDesk() && (force || !document.querySelector('.inbox-card, .quick-card, dialog[open]'));
    return isDesk() && !document.hidden && Date.now() > quietUntil && !(window.deskPassThrough && window.deskPassThrough()) &&
      !pet.classList.contains('carried') && !pet.classList.contains('thrown') && !pet.classList.contains('falling') &&
      (force || !document.querySelector('.inbox-card, .quick-card, dialog[open]'));
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

  // while the ring is open the speech bubble moves to where it overlaps none of the ring's buttons (a corner of his window or beside him), and
  // goes back by itself when the ring closes
  function placeBubble() {
    var root = document.documentElement;
    if (!shown || !isDesk() || bubble.hidden || !bubble.textContent) {
      if (root.classList.contains('ring-open')) { root.classList.remove('ring-open'); bubble.classList.remove('ring-moved'); bubble.style.removeProperty('--rl'); bubble.style.removeProperty('--rt'); }
      return;
    }
    root.classList.add('ring-open'); bubble.classList.add('ring-moved');
    var sr = stage.getBoundingClientRect(), pr = pet.getBoundingClientRect(), w = bubble.offsetWidth, h = bubble.offsetHeight, W = sr.width, H = sr.height, m = 4;
    var cs = getComputedStyle(root), vl = parseFloat(cs.getPropertyValue('--vis-l')) || 0;
    var vr = /vw/.test(cs.getPropertyValue('--vis-r')) || !cs.getPropertyValue('--vis-r') ? window.innerWidth : parseFloat(cs.getPropertyValue('--vis-r'));
    var x0 = Math.max(m, vl - sr.left + m), x1 = Math.min(W - w - m, vr - sr.left - w - m);
    var top = m - Math.max(0, sr.top);   // (the window reaches above the stage: the top corners of the window are the first choice)
    var spots = [[x0, top], [x1, top], [x0, m], [x1, m], [x0, H - h - m], [x1, H - h - m], [x0, Math.round(H * 0.35)], [x1, Math.round(H * 0.35)]];
    var btns = Array.prototype.map.call(ring.children, function (b) { var r = b.getBoundingClientRect(); return [r.left - sr.left - 6, r.top - sr.top - 6, r.right - sr.left + 6, r.bottom - sr.top + 6]; });
    var him = [pr.left - sr.left, pr.top - sr.top, pr.right - sr.left, pr.bottom - sr.top];
    function overlap(a, b) { var ow = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), oh = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return ow > 0 && oh > 0 ? ow * oh : 0; }
    var best = null, bestScore = Infinity;
    spots.forEach(function (p) {
      var box = [p[0], p[1], p[0] + w, p[1] + h], score = overlap(box, him) * 0.2;
      btns.forEach(function (b) { score += overlap(box, b) * 100; });
      if (score < bestScore) { bestScore = score; best = p; }
    });
    bubble.style.setProperty('--rl', Math.round(best[0]) + 'px'); bubble.style.setProperty('--rt', Math.round(best[1]) + 'px');
  }
  try { new MutationObserver(function () { placeBubble(); }).observe(bubble, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true }); } catch (e) { /* old browser */ }
  function show(now, force) {
    if (shown || !canShow(now, force) || !items().length) return;
    build();
    ring.hidden = false; shown = true;
    placeBubble();
    if (!isDesk()) { clearTimeout(appHide); appHide = setTimeout(function () { hide(true); }, 7000); }   // (in the app it goes by itself if you do nothing)
  }
  function hide(force) {
    if (previewing && force !== true) return;   // (the style preview stays up for its time whatever the pointer does)
    clearTimeout(leaveTimer);
    if (!shown) return;
    shown = false; ring.hidden = true; ring.replaceChildren();
    placeBubble();
  }
  // opens with a double click on him (resting the pointer on him was slow and unreliable), and closes when the pointer has gone well away from him, on a click elsewhere or on Esc
  document.addEventListener('mousemove', function (e) {
    if (e.buttons) { hoverAt = 0; return; }   // stroking or carrying him: no ring until the button is let go
    var pr = pet.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    var onHim = e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom;
    if (!shown) return;   // (it opens with a double click on him, see below)
    var cx = pr.left + pr.width / 2, cy = pr.top + pr.height * 0.55, d = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (d < center.r + 54) { clearTimeout(leaveTimer); leaveTimer = 0; }
    else if (!leaveTimer) leaveTimer = setTimeout(function () { leaveTimer = 0; hide(); }, 450);
  }, true);
  document.addEventListener('mouseleave', function () { hoverAt = 0; clearTimeout(leaveTimer); leaveTimer = setTimeout(hide, 300); });
  // picking him up, stroking him or anything else that starts on him puts it away for a moment
  pet.addEventListener('pointerdown', function () { hoverAt = 0; quietUntil = Date.now() + 1500; hide(); }, true);
  // it comes back a moment after the stroking ends, not during it
  document.addEventListener('pointerup', function () { hoverAt = 0; quietUntil = Math.max(quietUntil, Date.now() + 700); }, true);
  // his scene changed under the open ring (it got dark, the list was swapped): build it again
  // (only when the scene or list really changed: the page writes these attributes again with the same value, which must not close the ring; and the
  // short quiet time after a click is not a reason to close it either)
  var lastSceneKey = '';
  new MutationObserver(function () {
    var key = document.documentElement.dataset.scene + '|' + document.documentElement.dataset.list;
    if (key === lastSceneKey) return;
    lastSceneKey = key;
    if (shown) { if (canShow(true, true)) build(); else hide(true); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-scene', 'data-list'] });
  pet.addEventListener('dblclick', function () { show(true); });
  // the browser's own double click did not always arrive in the small window (a click on him makes him move and speak), so two quick taps on him
  // are counted here as well: same result, and it does not matter which of the two notices it first
  var tapDown = null, lastTap = null;
  pet.addEventListener('pointerdown', function (e) { tapDown = { t: Date.now(), x: e.screenX, y: e.screenY }; }, true);
  pet.addEventListener('pointerup', function (e) {
    var d = tapDown; tapDown = null;
    if (!d || e.button > 0) return;
    var now = Date.now();
    if (now - d.t > 400 || Math.hypot(e.screenX - d.x, e.screenY - d.y) > 12) { lastTap = null; return; }   // a hold or a stroke is not a tap
    if (lastTap && now - lastTap.t < 520 && Math.hypot(e.screenX - lastTap.x, e.screenY - lastTap.y) < 24) { lastTap = null; show(true); }
    else lastTap = { t: now, x: e.screenX, y: e.screenY };
  }, true);
  document.addEventListener('pointerdown', function (e) { if (shown && !e.target.closest('.ring, #pet')) hide(); }, true);
  document.addEventListener('keydown', function (e) { if (shown && e.key === 'Escape') hide(); });
  /** Choosing an alert style in the mini settings: the ring shows for `ms`, then goes by itself. */
  window.deskRingPreview = function (ms) {
    previewing = true;
    show(true, true);   // (even with the sample alert showing)
    clearTimeout(previewTimer);   // trying another style restarts the time, so it never goes while you are still choosing
    previewTimer = setTimeout(function () { previewing = false; if (shown) hide(true); }, ms || 2000);
    return shown;
  };
  window.deskRing = function () { show(); return shown; };   // for tests and the animation player
})();
