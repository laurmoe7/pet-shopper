// The wrecking ball: a second toy (a spiky black ball) you pick in the ring menu, in place of the old Pat button. Throw it in the small desktop
// window and it flies about the whole screen for 10 seconds, "breaking" the windows it hits (the shell draws cracks and falling pieces over them,
// see desktop/wreck.js: it only draws pictures, nothing real is touched) while Fumu runs after it and tries to stop it. Then it stops, he waves
// his magic wand (castWand in app-send.js) and every window is whole again.
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
 * The wrecking ball flies for WRECK_MS: it bounces about the whole screen, drifting to the windows one after the other, breaks each one it touches,
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
  var wins = [], chaseAt = 0, followAt = 0, jumpAt = start + 500, talkAt = start + 900, steerFrom = start + 350, glassAt = 0, shockAt = 0;
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
  function nearest() {
    var best = -1, bd = Infinity;
    for (var i = 0; i < wins.length; i++) {
      if (wins[i].hit) continue;
      var d = Math.hypot((wins[i].x1 + wins[i].x2) / 2 - f.ax, (wins[i].y1 + wins[i].y2) / 2 - f.ay);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function step(now) {
    if (ended) return;
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    // it drifts towards the nearest window that is still whole (the shell's rectangles are in screen pixels: f.toPage turns them into the toy's terms)
    var t = nearest();
    if (t >= 0 && now > steerFrom) {
      var c = f.toPage((wins[t].x1 + wins[t].x2) / 2, (wins[t].y1 + wins[t].y2) / 2), dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) || 1;
      vx += dx / d * 1500 * dt; vy += dy / d * 1500 * dt;
    }
    vy -= 520 * dt;
    var sp = Math.hypot(vx, vy);
    if (sp > 1900) { vx *= 1900 / sp; vy *= 1900 / sp; }
    x += vx * dt; y += vy * dt;
    if (x < lim.minX) { x = lim.minX; vx = Math.abs(vx) * 0.95; }
    if (x > lim.maxX) { x = lim.maxX; vx = -Math.abs(vx) * 0.95; }
    if (y > lim.maxY) { y = lim.maxY; vy = -Math.abs(vy) * 0.8; }
    if (y < 0) { y = 0; vy = Math.max(Math.abs(vy) * 0.9, 650 + Math.random() * 450); vx += (Math.random() - 0.5) * 500; sound('bounce'); }   // (it never settles: it bounces back up at once)
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
      vx = vx * 0.9 + (Math.random() - 0.5) * 500; vy = vy * 0.9 + (Math.random() - 0.3) * 500;   // (a little knocked off course: it goes on to the next piece)
      steerFrom = now + 120;
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
