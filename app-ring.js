// The ring menu (in the app it is only the toy switches and a snack, opened with a double tap on him): in the small desktop window, rest the pointer on him and a ring of little buttons opens above him (play ball, the toy switch, a snack,
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
  /** @returns {string} What he says about the weather (a lookup result with a kind and a temperature). @param {{kind: string, temp: number}} w */
  function ringWeatherWords(w) {
    var nl = typeof Lang === 'object' && Lang.get() === 'nl', t = typeof wxTemp === 'function' ? wxTemp(w.temp) : w.temp + '\u00b0';
    var en = { clear: 'clear', rain: 'rainy', storm: 'stormy', snow: 'snowy', cold: 'chilly', hot: 'hot' }, du = { clear: 'helder', rain: 'regenachtig', storm: 'stormachtig', snow: 'sneeuwachtig', cold: 'koud', hot: 'heet' };
    return nl ? 'het is ' + t + ', ' + (du[w.kind] || 'helder') + '~' : 'it is ' + t + ' and ' + (en[w.kind] || 'clear') + '~';
  }
  /** The weather report: he looks outside and tells you (only offered while the weather option is on). With no place picked yet he says to pick one. */
  /** After the weather now, what is coming later today (if anything special), in a second bubble. @param {{later: ?{kind: string, hour: number}}} w */
  function ringLater(w, after) {
    if (!w || !w.later) return;
    setTimeout(function () { say(Weather.laterWords(w.later, typeof Lang === 'object' && Lang.get() === 'nl'), 3800, true); }, after);
  }
  var ringLooking = false;
  function ringWeather(test) {   // (test: a made-up place from the developer tools; it ignores the saved place and the last answer, and saves nothing)
    var nl = typeof Lang === 'object' && Lang.get() === 'nl', c = test || (typeof wxConf === 'function' ? wxConf() : null);
    if (!c || c.lat === null || c.lon === null) { say(nl ? 'zet eerst een plaats in de opties~' : 'I need a place first: pick one in Options > Weather~', 3200, true); return; }
    var last = !test && typeof wxLast === 'function' ? wxLast() : null;
    if (last && Date.now() - last.at < 10 * 60000) { say(ringWeatherWords(last), 3600, true); pulse('hopsmall', 450); ringLater(last, 3900); return; }
    if (!navigator.onLine) { say(nl ? 'ik kan nu niet kijken~' : 'I cannot look outside right now~', 2400, true); return; }
    if (ringLooking) return;   // (a second press while he is still looking does nothing)
    ringLooking = true;
    var done = false, ctl = typeof AbortController === 'function' ? new AbortController() : null;
    function fail() { if (done) return; done = true; ringLooking = false; say(nl ? 'ik kan nu niet kijken~' : 'I cannot look outside right now~', 2400, true); }
    var kill = setTimeout(function () { if (ctl) ctl.abort(); fail(); }, 8000);   // (a slow or stuck connection ends here instead of leaving him waiting for ever)
    say(nl ? 'even buiten kijken…' : 'let me look outside…', 1600, true);
    try {
      fetch(Weather.forecastUrl(c.lat, c.lon), ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        clearTimeout(kill);
        if (done) return;
        done = true; ringLooking = false;
        var w = Weather.parse(j);
        if (!w) { say(nl ? 'ik kan niets zien~' : 'I cannot see anything~', 2400, true); return; }
        w.at = Date.now();
        if (!test) { try { localStorage.setItem('nibble-weather-last', JSON.stringify(w)); } catch (e) { /* storage not available */ } }
        setTimeout(function () { say((test ? test.place + ': ' : '') + ringWeatherWords(w), 3600, true); pulse('hopsmall', 450); ringLater(w, 3900); }, 900);
      }).catch(function () { clearTimeout(kill); fail(); });
    } catch (e) { clearTimeout(kill); fail(); }
  }
  /** Sends a link or note to the other synced device: Mini Fumu sends what is copied (the shell reads the clipboard), the app opens the Send sheet. */
  function ringSend() {
    var D = window.nibbleDesktop;
    if (isDesk()) { if (D && D.sendCopiedNow) D.sendCopiedNow(); return; }
    if (typeof openSend === 'function') openSend();
  }
  function ringSleep() { bellToBed(['lights off… so sleepy…', '*yawn* bed time…', 'to bed we go…'], true); }   // (he only gets into bed: you still tuck him in)

  /** Everything the ring can offer. `on` is for switches. */
  var ITEMS = {
    toys: { icon: '🧸', label: 'Toy', keep: true, run: function () { openMenu('toys'); } },   // (opens a second ring with the toy choices)
    toyNone: { icon: '🚫', label: 'No toy', on: function () { return toyKind() === 'none'; }, run: function () { setToyKind('none'); } },
    toyBall: { icon: '⚽', label: 'Default toy', on: function () { return toyKind() === 'ball'; }, run: function () { setToyKind('ball'); } },
    toyWreck: { icon: '💥', label: 'Wrecking ball', on: function () { return toyKind() === 'wrecker'; }, run: function () { setToyKind('wrecker'); } },
    toyLaser: { icon: '🔴', label: 'Laser dot', on: function () { return toyKind() === 'laser'; }, run: function () { setToyKind('laser', true); if (typeof laserPlay === 'function') setTimeout(laserPlay, 250); } },   // (picking it starts a chase)
    back: { icon: '↩️', label: 'Back', keep: true, run: function () { openMenu('main'); } },
    snack: { icon: '🍪', label: 'Snack', run: ringSnack },
    weather: { icon: '⛅', label: 'Weather report', run: ringWeather },
    send: { icon: '📮', label: 'Send to my other device', run: ringSend },
    swap: { icon: '📝', label: 'Swap list', run: function () { if (typeof switchList === 'function') switchList(); } },
    lights: { icon: '💡', label: 'Lights off', run: ringSleep },
    night: { icon: '🌙', label: 'Night light', keep: true, on: function () { return nightLightOn; }, run: function () { toggleNightLight(); } }
  };
  /** The toy circle opens a second ring with the toy choices in place of the first: no toy, his own (default) toy, the wrecking ball and the laser dot (those two not in Mini Fumu's room mode, where they cannot leave his window), and a way back. */
  var menu = 'main';
  function toyNames() { return ['toyNone', 'toyBall'].concat(typeof deskRoomMode === 'function' && deskRoomMode() ? [] : ['toyWreck', 'toyLaser'], ['back']); }
  function openMenu(which) {
    menu = which;
    build();
    if (!isDesk()) { clearTimeout(appHide); appHide = setTimeout(function () { hide(true); }, 7000); }
    placeBubble();
  }
  /** @returns {string[]} The buttons for the scene he is in now. */
  function items() {
    var scene = petScene();
    var snd = typeof account !== 'undefined' && account && account.code && (!isDesk() || (window.nibbleDesktop && window.nibbleDesktop.sendCopiedNow)) ? ['send'] : [];   // (only with Backup & sync on; Mini Fumu needs an installer that has the button)
    var wx = typeof wxConf === 'function' && wxConf().want ? ['weather'] : [];   // (the report is offered while the weather option is on; with no place picked yet he says so when it is pressed)
    if (!isDesk()) return scene === 'night-bed' ? [] : ['toys', 'snack'].concat(wx, snd);   // in the app: the toy circle and a snack; in bed they are put away
    if (scene === 'night-bed') return ['night'];   // in bed: only the night light
    // (toys only in the toy circle: the ball is tapped or thrown, the laser dot starts when it is picked there or its pen is tapped)
    if (scene.indexOf('night-drowsy') === 0) return ['toys', 'snack'].concat(wx, snd, ['swap', 'lights']);
    return ['toys', 'snack'].concat(wx, snd, ['swap']);
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
    var names = menu === 'toys' ? toyNames() : items(), n = names.length;
    var pr = pet.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    center = { x: pr.left + pr.width / 2 - sr.left, y: pr.top + pr.height * 0.55 - sr.top, r: Math.max(86, pr.width * 0.62) };
    // the part of his window that is on a screen (the shell sends it; --vis-l / --vis-r): near the side of the screen the arc turns
    // towards the middle of the screen so every button stays visible
    var cs = getComputedStyle(document.documentElement), vl = parseFloat(cs.getPropertyValue('--vis-l')) || 0;
    var vr = /vw/.test(cs.getPropertyValue('--vis-r')) || !cs.getPropertyValue('--vis-r') ? window.innerWidth : parseFloat(cs.getPropertyValue('--vis-r'));
    var minX = vl - sr.left + 22, maxX = vr - sr.left - 22, minY = 22, maxY = sr.height - 22;
    // one even arc: the buttons are always the same distance apart along one curve (never pushed one by one against an edge, which left
    // them bunched and crooked). Without room above him the curve gets flatter instead of covering his head; near the side of the screen
    // the buttons move round it towards the middle, and if they still do not fit the whole curve slides over as one piece.
    var R = Math.max(92, Math.min(116, pr.width * 0.64)), PITCH = 54;   // (54 px from one button's middle to the next)
    var Ry = Math.min(R, center.y - minY);
    if (Ry < R * 0.6) { center.y += R * 0.6 - Ry; Ry = R * 0.6; }
    var pts = [], len = 0, mid = 0;   // the curve, from low on his left (-215 degrees) over his head to low on his right (35), with the length along it
    for (var t = -215; t <= 35; t += 0.5) {
      var px = center.x + Math.cos(t * Math.PI / 180) * R, py = center.y + Math.sin(t * Math.PI / 180) * Ry;
      if (pts.length) len += Math.hypot(px - pts[pts.length - 1].x, py - pts[pts.length - 1].y);
      if (t === -90) mid = len;
      pts.push({ x: px, y: py, s: len });
    }
    function at(sv) { var j = 0; while (j < pts.length - 1 && pts[j + 1].s < sv) j++; return pts[Math.max(0, Math.min(pts.length - 1, j))]; }
    function spots(shift) { var out = []; for (var i = 0; i < n; i++) out.push(at(mid + shift + PITCH * (i - (n - 1) / 2))); return out; }
    var half = PITCH * (n - 1) / 2, shift = 0, sp = spots(0);
    for (var turn = 0; turn < 400; turn++) {   // move round the curve away from an edge it crosses, as far as the curve goes
      var lo = Math.min.apply(null, sp.map(function (q) { return q.x; })), hi = Math.max.apply(null, sp.map(function (q) { return q.x; }));
      if (lo < minX && mid + shift + half + 2 <= len) shift += 2;
      else if (hi > maxX && mid + shift - half - 2 >= 0) shift -= 2;
      else break;
      sp = spots(shift);
    }
    var slide = 0, xs = sp.map(function (q) { return q.x; });
    if (Math.min.apply(null, xs) < minX) slide = minX - Math.min.apply(null, xs);
    else if (Math.max.apply(null, xs) > maxX) slide = maxX - Math.max.apply(null, xs);
    var drop = Math.max(0, Math.max.apply(null, sp.map(function (q) { return q.y; })) - maxY);
    center.r = R;
    var plan = sp.map(function (q) { return { x: q.x + slide, y: q.y - drop }; });
    names.forEach(function (name, i) {
      var it = ITEMS[name], b = document.createElement('button');
      b.type = 'button'; b.className = 'ring-btn'; b.setAttribute('role', 'menuitem'); b.title = it.label; b.setAttribute('aria-label', it.label);
      if (it.on) b.setAttribute('aria-pressed', it.on() ? 'true' : 'false');
      var x = plan[i].x, y = plan[i].y;
      b.style.left = Math.round(x - 18) + 'px'; b.style.top = Math.round(y - 18) + 'px'; b.style.setProperty('--i', i);
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
    menu = 'main';
    build();
    ring.hidden = false; shown = true;
    placeBubble();
    if (!isDesk()) { clearTimeout(appHide); appHide = setTimeout(function () { hide(true); }, 7000); }   // (in the app it goes by itself if you do nothing)
  }
  function hide(force) {
    if (previewing && force !== true) return;   // (the style preview stays up for its time whatever the pointer does)
    clearTimeout(leaveTimer);
    if (!shown) return;
    shown = false; menu = 'main'; ring.hidden = true; ring.replaceChildren();
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
  window.ringWeatherTest = ringWeather;   // for the developer tools
  window.deskRing = function () { show(); return shown; };   // for tests and the animation player
})();
