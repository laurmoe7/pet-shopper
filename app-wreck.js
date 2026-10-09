// The wrecking ball: a second toy (a spiky black ball) you pick in the ring menu, in place of the old Pat button. Throw it in the small desktop
// window and it flies about the whole screen for 10 seconds, "breaking" the windows it hits (the shell draws cracks and falling pieces over them,
// see desktop/wreck.js: it only draws pictures, nothing real is touched) while Fumu runs after it and tries to stop it. Then it stops, he waves
// his magic wand (castWand in app-send.js) and every window is whole again.
// In the page itself (phone, full app) a throw knocks the page's own things loose instead (see the end of this file).
// Needs the desktop app with "Toy over the whole screen" on and awareness level 2 (it uses where the windows are); anywhere else it is just a
// black ball. Plain script, shares one scope, loaded after app-toy.js.
'use strict';

var TOY_KIND_KEY = 'nibble-toy-kind';
var WRECK_MS = 10000;

/** @returns {string} Which toy is out: 'ball' (the one for his species) or 'wrecker'. */
function toyKind() {
  try { return localStorage.getItem(TOY_KIND_KEY) === 'wrecker' ? 'wrecker' : 'ball'; } catch (e) { return 'ball'; }
}
/** Shows the toy that is picked (a class on the stage; styles.css). */
function applyToyKind() { stage.classList.toggle('toy-wreck', toyKind() === 'wrecker'); }
/** The ring menu's toy switch: ball <-> wrecking ball. */
function toggleToyKind() {
  if (playing) return;   // (not while a game is on)
  var next = toyKind() === 'wrecker' ? 'ball' : 'wrecker';
  try { localStorage.setItem(TOY_KIND_KEY, next); } catch (e) { /* storage blocked */ }
  applyToyKind();
  sound('pick');
  if (typeof window.deskToyWarm === 'function') setTimeout(window.deskToyWarm, 200);   // (its picture ready for the screen-wide window)
  say(next === 'wrecker' ? pick(['the wrecking ball… careful!', 'ooh, a big spiky one!']) : pick(['the nice ball again ♡', 'back to the ball~']), 1600);
}
applyToyKind();

/** @returns {boolean} Whether a throw now should be the wrecking ball's game: it is the toy, and the toy can fly over the whole screen. */
function wreckWanted() {
  var D = window.nibbleDesktop;
  return toyKind() === 'wrecker' && !!toyField && !!D && typeof D.wreckStart === 'function' && !reduceMotion;
}

/**
 * The wrecking ball flies for WRECK_MS: it bounces about the whole screen like a heavy ball (nothing steers it) and breaks the pieces it flies through,
 * while he runs after it. Then it vanishes, he casts the spell and the windows mend.
 * @param {number} vx @param {number} vy Px per second. @param {number} y0 Height it was let go at.
 */
function wreckFling(vx, vy, y0) {
  var D = window.nibbleDesktop, f = toyField;
  sound('toss');
  setFace({ eyes: 'open', mouth: 'o', arms: 'reach', x: ['sweat'] });
  eyesDo('wide');
  pet.classList.add('running');
  var lim = toyLimits(), x = toyX, y = y0, spin = 0, start = performance.now(), last = start;
  var wins = [], chaseAt = 0, followAt = 0, jumpAt = start + 500, talkAt = start + 900, glassAt = 0, shockAt = 0;
  var ended = false;
  D.wreckStart().then(function (r) {
    if (r && r.ok) r.rects.forEach(function (q, wi) {   // (each window is a grid of pieces, the same grid the overlay draws: it breaks one piece at a time)
      for (var row = 0; row < q.rows; row++) for (var col = 0; col < q.cols; col++) {
        wins.push({ w: wi, k: row * q.cols + col, x1: q.x + q.w * col / q.cols, y1: q.y + q.h * row / q.rows, x2: q.x + q.w * (col + 1) / q.cols, y2: q.y + q.h * (row + 1) / q.rows, hit: false });
      }
    });
    else if (r && r.reason === 'privacy') say(pick(['I can\'t see your windows… (privacy)', 'my eyes are closed to windows…']), 2200, true);
  }, function () { /* no overlay: the ball still flies */ });
  vx *= 1.4; vy = Math.max(vy, 400) * 1.4;
  function step(now) {
    if (ended) return;
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    // it only falls and bounces (gravity, walls, floor and ceiling); it is not steered, it breaks whatever it happens to fly through
    vy -= 520 * dt;
    var sp = Math.hypot(vx, vy);
    if (sp > 1700) { vx *= 1700 / sp; vy *= 1700 / sp; }
    x += vx * dt; y += vy * dt;
    if (x < lim.minX) { x = lim.minX; vx = Math.abs(vx) * 0.95; }
    if (x > lim.maxX) { x = lim.maxX; vx = -Math.abs(vx) * 0.95; }
    if (y > lim.maxY) { y = lim.maxY; vy = -Math.abs(vy) * 0.8; }
    if (y < (lim.minY || 0)) {   // (it never settles: every bounce off the floor sends it up again, at a different height and slant)
      y = lim.minY || 0; vy = Math.max(Math.abs(vy) * 0.85, 750 + Math.random() * 600);
      vx = (Math.abs(vx) < 350 ? (Math.random() < .5 ? -1 : 1) * (350 + Math.random() * 400) : vx) + (Math.random() - 0.5) * 400; sound('bounce');
    }
    spin += vx * dt * 2.2;
    placeToy(x, y, spin);
    // every piece of a window that it touches breaks off, with a crash of glass
    var broke = 0;
    for (var i = 0; i < wins.length; i++) {
      var w = wins[i];
      if (w.hit || f.ax < w.x1 - 4 || f.ax > w.x2 + 4 || f.ay < w.y1 - 4 || f.ay > w.y2 + 4) continue;
      w.hit = true; broke++;
      D.wreckHit(w.w, w.k, f.ax, f.ay);
    }
    if (broke) {
      if (now - glassAt > 70) { glassAt = now; sound('glass'); }
      vx *= 0.95; vy *= 0.95;   // (a piece takes a little of its speed)
      if (now - shockAt > 900) {
        shockAt = now;
        pulse('hopsmall', 450);
        setFace({ eyes: 'open', mouth: 'o', arms: 'reach', x: ['sweat', 'shock'] });
        say(pick(['NOT THE WINDOW!', 'oh no, it broke!', 'stop! stop!', 'my windows!!']), 1100, true);
        talkAt = now + 1700;
      }
    }
    // he runs after it all over the screen and jumps for it now and then
    if (now > chaseAt) { chaseAt = now + 110; walkTo(x + vx * 0.3, toyPace(5)); }
    if (now > followAt && typeof deskToyFollow === 'function') {
      var far = x - clampWalk(x);
      if (Math.abs(far) > 60) { followAt = now + 600; deskToyFollow(far * 0.8).then(function (moved) { x -= moved || 0; }); }
    }
    pet.style.setProperty('--look-x', (x > walkX ? 3.2 : -3.2) + 'px');
    if (now > jumpAt) {
      jumpAt = now + 800 + Math.random() * 700;
      var jsvg = pet.querySelector('.pet-svg');
      if (jsvg && jsvg.animate) jsvg.animate([{ translate: '0 0' }, { translate: '0 -26px', offset: .5 }, { translate: '0 0' }], { duration: 440, easing: 'ease-out' });
    }
    if (now > talkAt) { talkAt = now + 1800 + Math.random() * 800; say(pick(['stop it!', 'no no no!', 'come back!', 'bad ball!', 'wait wait wait!']), 1000, true); }
    if (now - start > WRECK_MS) { wreckEnd(x, y); return; }
    flight = requestAnimationFrame(step);
  }
  function wreckEnd(ex, ey) {
    ended = true;
    cancelAnimationFrame(flight);
    sound('tink');
    drift(['💨', '✦', '✨'], petTop(), 4);
    endField(0);   // (the ball is drawn in the page again: then it goes back to its place)
    toyX = toyHome();
    toyEl.style.translate = toyX + 'px 0';
    toyBall.style.transform = '';
    stopWalk();
    pet.classList.remove('running');
    pet.style.removeProperty('--look-x');
    setFace({ eyes: 'happy', mouth: 'open', arms: 'idle', x: ['cheeks'] });
    say(pick(['phew… ok, fixing it~', 'abracadabra!', 'time for magic~']), 1700, true);
    var back = walkTo(0, 7);   // (the wand needs room: from the middle it is not cut off by the window's edge)
    setTimeout(function () {
      if (typeof castWand === 'function') castWand();   // (about 4 seconds; the windows mend as the sparkles come out)
      setTimeout(function () { D.wreckFix().then(function () {}, function () {}); }, 900);
    }, back);
    wait(back + 4000).then(endPlay);
  }
  flight = requestAnimationFrame(step);
}

// ---------- in the page (the phone app and the full app on the computer) ----------
// Here the ball flies over the whole page, bounces like a heavy ball and really knocks the page's own things loose: list rows, aisle labels,
// the add bar, the dock's buttons, the gear and the lamp. Each one cracks, then shatters piece by piece (a row: the picture first, then the words,
// then the bar) and the pieces fall with whatever was on them (copies of the page's own elements, so nothing is captured or drawn over a program);
// then he waves the wand and they pop back. A see-through shield keeps taps from reaching the page meanwhile.
var WRECK_TARGETS = '.items .item, .items .aisle, .add-wrap, .dock > button, .scene .brand, #optionsBtn, #lamp';

/** @returns {boolean} Whether a throw now is the page's wrecking-ball game: it is the toy, and this is not the small desktop window (that one has its own, over the screen). */
function pageWreckWanted() {
  return toyKind() === 'wrecker' && !toyField && !reduceMotion && !document.documentElement.classList.contains('desktop-pet');
}

/**
 * @param {number} vx px per second to the right. @param {number} vy px per second upwards. @param {number} px @param {number} py Where it was let go (viewport px).
 */
function pageWreck(vx, vy, px, py) {
  var src = toyEl.querySelector('[data-toy="wrecker"]');
  var W = window.innerWidth, H = window.innerHeight, R = 22, G = 1500;
  var x = px, y = py, vyd = -vy, spin = 0, start = performance.now(), last = start, ended = false;
  var chaseAt = 0, jumpAt = start + 500, talkAt = start + 900, glassAt = 0, shockAt = 0;
  vx *= 1.3; vyd = Math.min(vyd * 1.3, -350);
  sound('toss');
  setFace({ eyes: 'open', mouth: 'o', arms: 'reach', x: ['sweat'] });
  eyesDo('wide');
  pet.classList.add('running');
  toyEl.style.visibility = 'hidden';
  var shield = document.createElement('div');
  shield.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:9990;touch-action:none;';
  var ball = document.createElement('div');
  ball.style.cssText = 'position:fixed;left:0;top:0;width:' + R * 2 + 'px;height:' + R * 2 + 'px;z-index:9991;pointer-events:none;will-change:transform;';
  ball.innerHTML = '<svg viewBox="0 0 26 26" width="' + R * 2 + '" height="' + R * 2 + '" aria-hidden="true"></svg>';
  if (src) { var g = src.cloneNode(true); g.style.display = 'inline'; ball.firstChild.appendChild(g); }
  document.body.append(shield, ball);
  var targets = [].slice.call(document.querySelectorAll(WRECK_TARGETS)).map(function (el) {
    var r = el.getBoundingClientRect();
    return { el: el, r: r, hit: false, timers: [], mended: false };
  }).filter(function (t) { return t.r.width > 8 && t.r.height > 8 && t.r.bottom > 0 && t.r.top < H; });

  /** A crack where the ball hit, for a moment. */
  function crackAt(cx, cy) {
    var d = '', i, a, len, mx, my;
    for (i = 0; i < 9; i++) {
      a = i / 9 * Math.PI * 2 + Math.random() * .5; len = 22 + Math.random() * 20; mx = Math.cos(a) * len * .5 + (Math.random() - .5) * 8; my = Math.sin(a) * len * .5 + (Math.random() - .5) * 8;
      d += 'M0 0 L' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' L' + (Math.cos(a) * len).toFixed(1) + ' ' + (Math.sin(a) * len).toFixed(1);
    }
    var c = document.createElement('div');
    c.style.cssText = 'position:fixed;left:' + (cx - 45) + 'px;top:' + (cy - 45) + 'px;width:90px;height:90px;z-index:9992;pointer-events:none;';
    c.innerHTML = '<svg viewBox="-45 -45 90 90" width="90" height="90" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '" stroke="rgba(10,10,16,.75)" stroke-width="2.4"/><path d="' + d + '" stroke="rgba(255,255,255,.7)" stroke-width=".9" transform="translate(.8 .8)"/></svg>';
    document.body.appendChild(c);
    c.animate([{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], { duration: 700 }).onfinish = function () { c.remove(); };
  }
  /** A copy of an element with every style written into it, so it looks the same wherever it is put (the page's own rules would not reach it). */
  function frozen(src, r) {
    var dst = src.cloneNode(true), a = [src].concat([].slice.call(src.querySelectorAll('*'))), b = [dst].concat([].slice.call(dst.querySelectorAll('*')));
    for (var i = 0; i < a.length; i++) {
      var cs = getComputedStyle(a[i]), st = b[i].style;
      for (var j = 0; j < cs.length; j++) st.setProperty(cs[j], cs.getPropertyValue(cs[j]));
      st.animation = 'none'; st.transition = 'none'; b[i].removeAttribute('id');
    }
    var d = dst.style;
    d.position = 'absolute'; d.left = '0'; d.top = '0'; d.right = 'auto'; d.bottom = 'auto'; d.margin = '0'; d.transform = 'none'; d.translate = 'none'; d.rotate = 'none';
    d.opacity = '1'; d.visibility = 'visible'; d.clipPath = 'none'; d.display = 'block'; d.boxSizing = 'border-box'; d.width = r.width + 'px'; d.height = r.height + 'px';
    return dst;
  }
  var shardBox = document.createElement('div');
  shardBox.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:9989;pointer-events:none;';
  document.body.appendChild(shardBox);
  function rectIn(el, r) { if (!el) return null; var q = el.getBoundingClientRect(); return { x1: q.left - r.left - 4, y1: q.top - r.top - 4, x2: q.right - r.left + 4, y2: q.bottom - r.top + 4 }; }
  function inside(q, x, y) { return !!q && x >= q.x1 && x <= q.x2 && y >= q.y1 && y <= q.y2; }

  /** Cuts a thing into jagged triangles (each one is a shard), in the order they break: a row's picture, then its words, then the bar. */
  function prepare(t, hx, hy) {
    var r = t.el.getBoundingClientRect(), cols = Math.max(3, Math.min(7, Math.round(r.width / 60))), rows = Math.max(2, Math.min(3, Math.round(r.height / 30)));
    var v = [], gx, gy, tris = [];
    for (gy = 0; gy <= rows; gy++) {
      v.push([]);
      for (gx = 0; gx <= cols; gx++) v[gy].push([r.width * gx / cols + (gx === 0 || gx === cols ? 0 : (Math.random() - .5) * .5 * r.width / cols), r.height * gy / rows + (gy === 0 || gy === rows ? 0 : (Math.random() - .5) * .5 * r.height / rows)]);
    }
    var emoji = rectIn(t.el.querySelector('.emoji-btn'), r), words = [rectIn(t.el.querySelector('.item-text'), r), rectIn(t.el.querySelector('.qty-tag'), r), rectIn(t.el.querySelector('.due-tag'), r)];
    var lx = hx - r.left, ly = hy - r.top;
    for (gy = 0; gy < rows; gy++) for (gx = 0; gx < cols; gx++) {
      var a = v[gy][gx], b = v[gy][gx + 1], c = v[gy + 1][gx + 1], e = v[gy + 1][gx];
      [[a, b, c], [a, c, e]].forEach(function (p) {
        var cx = (p[0][0] + p[1][0] + p[2][0]) / 3, cy = (p[0][1] + p[1][1] + p[2][1]) / 3;
        var cat = inside(emoji, cx, cy) ? 0 : words.some(function (q) { return inside(q, cx, cy); }) ? 1 : 2;
        tris.push({ p: p, cx: cx, cy: cy, cat: emoji || words[0] ? cat : 0, d: Math.hypot(cx - lx, cy - ly) });
      });
    }
    tris.sort(function (m, n) { return m.cat - n.cat || m.d - n.d; });
    t.r2 = r; t.tris = tris; t.tpl = frozen(t.el, r); t.gone = []; t.lx = lx; t.ly = ly;
  }
  /** The thing itself loses the pieces that have fallen (it stays whole under the rest). */
  function cutOut(t) {
    var r = t.r2, d = 'M-300 -300 H' + (r.width + 300) + ' V' + (r.height + 300) + ' H-300 Z';
    t.gone.forEach(function (g) { d += ' M' + g.p[0][0].toFixed(1) + ' ' + g.p[0][1].toFixed(1) + ' L' + g.p[1][0].toFixed(1) + ' ' + g.p[1][1].toFixed(1) + ' L' + g.p[2][0].toFixed(1) + ' ' + g.p[2][1].toFixed(1) + ' Z'; });
    t.el.style.clipPath = 'path(evenodd, "' + d + '")';
  }
  /** One shard comes away: a copy of the thing, cut to the triangle, flies out from the hit and falls. */
  function shard(t, g) {
    var r = t.r2, w = document.createElement('div');
    w.style.cssText = 'position:absolute;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;transform-origin:' + g.cx.toFixed(1) + 'px ' + g.cy.toFixed(1) + 'px;clip-path:polygon(' + g.p.map(function (q) { return q[0].toFixed(1) + 'px ' + q[1].toFixed(1) + 'px'; }).join(',') + ');';
    w.appendChild(t.tpl.cloneNode(true));
    shardBox.appendChild(w);
    var dx = (g.cx - t.lx) * 0.5 + (Math.random() - .5) * 90, rise = 14 + Math.random() * 60, rot = (Math.random() - .5) * 360, fall = H - r.top + 160;
    w.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'translate(' + (dx * .35).toFixed(0) + 'px,' + (-rise).toFixed(0) + 'px) rotate(' + (rot / 4).toFixed(0) + 'deg)', opacity: 1, offset: .22, easing: 'cubic-bezier(.5,0,1,.7)' },
      { transform: 'translate(' + dx.toFixed(0) + 'px,' + fall.toFixed(0) + 'px) rotate(' + rot.toFixed(0) + 'deg)', opacity: .9 }
    ], { duration: 800 + Math.random() * 300, fill: 'forwards' }).onfinish = function () { w.remove(); };
    t.gone.push(g);
    cutOut(t);
  }
  /** A thing the ball touched: it cracks, then shatters piece by piece. */
  var shatterSound = 0;
  function knock(t, hx, hy) {
    t.hit = true;
    crackAt(hx, hy);
    setTimeout(function () {
      if (ended || !t.el.animate) return;
      prepare(t, hx, hy);
      t.tris.forEach(function (g, i) {
        t.timers.push(setTimeout(function () {
          if (ended && t.mended) return;
          shard(t, g);
          if (i === t.tris.length - 1) t.el.style.visibility = 'hidden';
          if (i % 3 === 0 && performance.now() - shatterSound > 90) { shatterSound = performance.now(); sound('glass'); }
        }, i * 48 + Math.random() * 30));
      });
    }, 220);
  }

  function step(now) {
    if (ended) return;
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    vyd += G * dt;
    var sp = Math.hypot(vx, vyd);
    if (sp > 1700) { vx *= 1700 / sp; vyd *= 1700 / sp; }
    x += vx * dt; y += vyd * dt;
    if (x < R) { x = R; vx = Math.abs(vx) * 0.92; }
    if (x > W - R) { x = W - R; vx = -Math.abs(vx) * 0.92; }
    if (y < R) { y = R; vyd = Math.abs(vyd) * 0.7; }
    if (y > H - R - 6) {   // (the bottom of the screen: it never settles, it bounces up again to a different height and slant)
      y = H - R - 6; vyd = -Math.sqrt(2 * G * H * (0.45 + Math.random() * 0.5));
      vx = (Math.abs(vx) < 300 ? (Math.random() < .5 ? -1 : 1) * (300 + Math.random() * 400) : vx) + (Math.random() - 0.5) * 300;
      sound('bounce');
    }
    spin += vx * dt * 1.6;
    ball.style.transform = 'translate(' + (x - R).toFixed(1) + 'px,' + (y - R).toFixed(1) + 'px) rotate(' + Math.round(spin) + 'deg)';
    var broke = 0;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i], m = R * 0.6;
      if (t.hit || x < t.r.left - m || x > t.r.right + m || y < t.r.top - m || y > t.r.bottom + m) continue;
      knock(t, x, y); broke++;
    }
    if (broke) {
      if (now - glassAt > 70) { glassAt = now; sound('glass'); }
      vx *= 0.95; vyd *= 0.95;
      if (now - shockAt > 900) {
        shockAt = now;
        pulse('hopsmall', 450);
        setFace({ eyes: 'open', mouth: 'o', arms: 'reach', x: ['sweat', 'shock'] });
        say(pick(['NOT MY LIST!', 'oh no, it broke!', 'stop! stop!', 'my things!!']), 1100, true);
        talkAt = now + 1700;
      }
    }
    // he runs along under it and jumps for it now and then
    if (now > chaseAt) { chaseAt = now + 110; var sr = stage.getBoundingClientRect(); walkTo(x - (sr.left + sr.width / 2) + vx * 0.2, toyPace(5)); }
    pet.style.setProperty('--look-x', (x > pet.getBoundingClientRect().left ? 3.2 : -3.2) + 'px');
    if (now > jumpAt) {
      jumpAt = now + 800 + Math.random() * 700;
      var jsvg = pet.querySelector('.pet-svg');
      if (jsvg && jsvg.animate) jsvg.animate([{ translate: '0 0' }, { translate: '0 -26px', offset: .5 }, { translate: '0 0' }], { duration: 440, easing: 'ease-out' });
    }
    if (now > talkAt) { talkAt = now + 1800 + Math.random() * 800; say(pick(['stop it!', 'no no no!', 'come back!', 'bad ball!', 'wait wait wait!']), 1000, true); }
    if (now - start > WRECK_MS) { finish(); return; }
    flight = requestAnimationFrame(step);
  }
  function finish() {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(flight);
    sound('tink');
    drift(['💨', '✦', '✨'], { x: x, y: y }, 4);
    ball.remove();
    toyX = toyHome();
    toyEl.style.translate = toyX + 'px 0';
    toyBall.style.transform = '';
    toyEl.style.visibility = '';
    stopWalk();
    pet.classList.remove('running');
    pet.style.removeProperty('--look-x');
    setFace({ eyes: 'happy', mouth: 'open', arms: 'idle', x: ['cheeks'] });
    say(pick(['phew… ok, fixing it~', 'abracadabra!', 'time for magic~']), 1700, true);
    var back = walkTo(0, 7);   // (the wand needs room)
    setTimeout(function () {
      if (typeof castWand === 'function') castWand();
      setTimeout(function () {   // everything pops back, one after the other
        targets.forEach(function (t, n) {
          setTimeout(function () {
            t.mended = true; t.timers.forEach(clearTimeout);
            t.el.style.clipPath = ''; t.el.style.visibility = '';
            if (t.hit && t.el.animate) t.el.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, easing: 'ease-out' });
            if (t.hit && n % 2 === 0) drift(['✨', '✦', '⭐'], { x: t.r.left + t.r.width / 2, y: t.r.top + t.r.height / 2 }, 2);
          }, n * 35);
        });
      }, 900);
    }, back);
    wait(back + 4200).then(function () { shield.remove(); shardBox.remove(); endPlay(); });
  }
  setTimeout(finish, WRECK_MS + 1500);   // (if the page was in the background and no frames came: it is still mended)
  flight = requestAnimationFrame(step);
}

// the switch for it in App settings (Options): the ring menu only exists in the small desktop window
(function () {
  if (typeof optionsList === 'undefined' || !optionsList) return;
  var label = document.createElement('label'), title = document.createElement('span'), box = document.createElement('input');
  label.className = 'option'; title.className = 'option-title'; title.textContent = 'Wrecking ball';
  box.type = 'checkbox'; box.setAttribute('role', 'switch');
  label.append(title, box);
  optionsList.appendChild(label);
  box.addEventListener('change', function () {
    if (box.checked !== (toyKind() === 'wrecker')) toggleToyKind();
    box.checked = toyKind() === 'wrecker';
  });
  var btn = $('optionsBtn');
  if (btn) btn.addEventListener('click', function () { box.checked = toyKind() === 'wrecker'; });
})();
