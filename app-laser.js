// The laser dot: a third toy (a little pink laser pen) picked in the ring menu's toy circle (picking it there starts a chase at once; tapping
// the pen on his floor does too). A red dot sits on your pointer and he flies after it wherever it goes, up into the air too, not only along
// his floor. He plays it like a cat: he chases while it moves, and when it stops he stalks it, wiggles and pounces on it; move it away and
// he is off again. When it goes out he looks round for it.
// In Mini Fumu (wander mode) the shell flies his whole window after the mouse over the screen (desk:chaseStart in desktop/main.js, which
// also draws the dot in the toy window and runs the same chase rules, place.laserPhase) and he drops to the floor and runs back when it ends;
// click him to stop sooner. In the page itself (phone, full app) a copy of him flies over the page after the finger or the mouse (like the
// sneaky snack's trip), while a see-through shield takes the taps; tap him to catch him. Only a game: nothing counts for goals.
// Plain script, shares one scope, loaded after app-wreck.js.
'use strict';

var LASER_MS = 20000, LASER_IDLE_MS = 6000;   // (how long a chase lasts; the page's one ends sooner when the pointer stops moving)
var laserOn = null;

/** Tapping the laser pen (or picking it in the ring): the chase starts, in the shell (Mini Fumu) or in the page. */
function laserPlay() {
  if (laserOn || playing) return;
  if (busy || baseState() === 'sleepy' || stage.classList.contains('bedtime')) {
    if (!reduceMotion) toyBall.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-20deg)' }, { transform: 'rotate(14deg)' }, { transform: 'rotate(0)' }], { duration: 450 });
    return;
  }
  if (reduceMotion) { say(pick(['the red dot! …I\'ll just watch it~', 'ooh, shiny dot~']), 1600); return; }
  if (document.documentElement.classList.contains('desktop-pet')) laserDesk(); else laserPage();
}

/** The faces for each part of the game. */
var LASER_FACES = {
  chase: { eyes: 'sparkle', mouth: 'open', arms: 'reach', x: ['cheeks'] },
  stalk: { eyes: 'squint', mouth: 'wavy', arms: 'idle', x: [] },
  pounce: { eyes: 'open', mouth: 'open', arms: 'reach', x: [] },
  caught: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] },
  lost: { eyes: 'open', mouth: 'o', arms: 'idle', x: ['question'] }
};
var LASER_CLASSES = ['laser-chase', 'laser-stalk', 'laser-pounce', 'laser-caught', 'laser-lost'];
/** Puts a face on him or on the page's copy of him (the same as setFace, for any pet element). */
function laserFace(el, f) {
  if (el === pet) { setFace(f); return; }
  el.dataset.eyes = f.eyes; el.dataset.mouth = f.mouth; el.dataset.arms = f.arms;
  ['zzz', 'steam', 'hearts', 'sparkles', 'question', 'sweat', 'shock', 'redface', 'cheeks'].forEach(function (x) { el.classList.toggle('x-' + x, f.x.indexOf(x) !== -1); });
}
/**
 * A new part of the game: its face, its move (styles.css, the laser-* classes) and now and then a line or a sound.
 * @param {Element} el The pet or its copy. @param {string} ph chase, stalk, pounce, caught or lost. @param {Object} st The chase's own state.
 * @param {function} [talkAt] Shows a few symbols over him (the bubble does not follow the page's copy).
 */
function laserPhaseShow(el, ph, st, talkAt) {
  var was = st.shown;
  st.shown = ph;
  LASER_CLASSES.forEach(function (c) { el.classList.toggle(c, c === 'laser-' + ph); });
  laserFace(el, LASER_FACES[ph]);
  var now = Date.now(), quiet = now - (st.saidAt || 0) < 1800;
  function line(list) { if (quiet) return; st.saidAt = now; if (el === pet) say(pick(list), 1100, true); }
  if (ph === 'stalk') { line(['…', 'shh…', '*wiggle wiggle*', 'hunting…']); }
  else if (ph === 'pounce') { sound('squish'); }
  else if (ph === 'caught') { sound('squeak'); line(['got it!', 'gotcha~', 'mine!', 'hehe, caught!']); if (talkAt) talkAt(['♥', '✦']); }
  else if (ph === 'chase' && (was === 'caught' || was === 'stalk')) { sound('pick'); line(['hey! come back!', 'it moved!', 'wait!!', 'no fair~']); if (talkAt) talkAt(['!']); }
}
/** Which way he looks: the eyes follow the dot. @param {Element} el @param {number} dx @param {number} dy Px from his face to the dot. */
function laserEyes(el, dx, dy) {
  el.style.setProperty('--look-x', (Math.max(-1, Math.min(1, dx / 60)) * 3.2).toFixed(2) + 'px');
  el.style.setProperty('--look-y', (Math.max(-1, Math.min(1, dy / 60)) * 2).toFixed(2) + 'px');
}
/** He leans into the way he flies. @param {Element} el @param {number} vx Px per second. */
function laserLean(el, vx) { el.style.setProperty('--lean', Math.max(-14, Math.min(14, vx / 90)).toFixed(1) + 'deg'); }

/** The face and line he starts with. */
function laserStart() {
  playing = true;
  busy++;
  stopWalk();
  sound('pick');
  setFace(LASER_FACES.chase);
  eyesDo('wide');
}
/** The chase is over: back to normal. */
function laserDone() {
  laserOn = null;
  stage.classList.remove('laser-on');
  pet.classList.remove('falling', 'walking', 'running');
  LASER_CLASSES.forEach(function (c) { pet.classList.remove(c); });
  ['--look-x', '--look-y', '--lean'].forEach(function (v) { pet.style.removeProperty(v); });
  playing = false;
  busy--;
  if (!busy) settle();
}
/** He looks round for the dot that went out: left, right, a puzzled tilt. @param {Element} el @returns {Promise} */
function laserLost(el, st, talkAt) {
  laserPhaseShow(el, 'lost', st);
  if (talkAt) talkAt(['?']);
  if (el === pet) say(pick(['where did it go?', 'huh? it vanished…', 'come back, dot~']), 1600, true);
  [[0, -3.2], [450, 3.2], [900, -2], [1250, 0]].forEach(function (g) { setTimeout(function () { el.style.setProperty('--look-x', g[1] + 'px'); el.style.setProperty('--look-y', '-1px'); }, g[0]); });
  return wait(1400);
}

// ---------- Mini Fumu: the shell flies the window ----------
function laserDesk() {
  var D = window.nibbleDesktop;
  if (!D || !D.chaseStart) { say(pick(['I need the new Fumufumu for that~', 'update me first!']), 1800); return; }
  if (typeof deskRoomMode === 'function' && deskRoomMode()) { say(pick(['I can\'t leave my room… (wander mode)', 'let me out of my room first!']), 2000); return; }
  laserStart();
  laserOn = { desk: true, shown: '', saidAt: 0 };
  stage.classList.add('laser-on');
  pet.classList.add('falling', 'laser-chase');   // (arms flapping: he flies)
  say(pick(['the red dot!!', 'I\'ll get it!', 'come back here~', 'mine mine mine!']), 1300, true);
  laserOn.saidAt = Date.now();
  D.chaseStart(LASER_MS).then(laserDone, laserDone);
}
if (window.nibbleDesktop && window.nibbleDesktop.onChase) window.nibbleDesktop.onChase(function (vx, vy, face, phase, floor, dx, dy) {
  if (!laserOn || !laserOn.desk) return;
  if (typeof phase !== 'string') phase = phase ? 'caught' : 'chase';   // (an installer from before build 699 only says whether he is on the dot)
  if (phase === 'lost') { if (laserOn.shown !== 'lost') { pet.classList.remove('walking', 'running'); laserLost(pet, laserOn); } return; }
  if (phase !== laserOn.shown) laserPhaseShow(pet, phase, laserOn);
  if (dx === undefined) pet.style.setProperty('--look-x', (face < 0 ? -3.2 : 3.2) + 'px'); else laserEyes(pet, dx, dy);
  laserLean(pet, phase === 'chase' && !floor ? vx : 0);
  // on the floor he runs after it, in the air he flaps
  pet.classList.toggle('falling', !floor && phase === 'chase');
  pet.classList.toggle('walking', !!floor && phase === 'chase' && Math.abs(vx) > 60);
  pet.classList.toggle('running', !!floor && phase === 'chase' && Math.abs(vx) > 400);
});
// a click on him while he chases: caught, and the chase stops (he still drops and runs back)
window.addEventListener('pointerdown', function (e) {
  if (!laserOn || !laserOn.desk || !e.target.closest || !e.target.closest('#pet')) return;
  e.stopImmediatePropagation(); e.preventDefault();
  if (window.nibbleDesktop.chaseStop) window.nibbleDesktop.chaseStop();
  say(pick(['you caught me!', 'okay okay, I\'m done~', 'hehe, that was fun!']), 1500, true);
}, true);

/**
 * The chase rules, one step: chase while the dot moves; once it has sat still near him he stalks it (backs off, wiggles), then pounces on it
 * and holds it until it moves away. The same rules as place.laserPhase in desktop/place.js: keep them in step.
 * @param {Object} st {phase, at, stillAt, holdX, holdY} changed in place. @param {Object} inp {now, x, y (the dot), speed (its px/s), gap (px from him to his chase spot)}
 * @returns {string} The phase.
 */
function laserRule(st, inp) {
  var t = inp.now;
  if (!st.phase) { st.phase = 'chase'; st.at = t; st.stillAt = t; }
  if (inp.speed > 60) st.stillAt = t;
  function to(ph) { st.phase = ph; st.at = t; if (ph === 'pounce') { st.holdX = inp.x; st.holdY = inp.y; } }
  if (st.phase === 'chase') { if (t - st.stillAt > 450 && inp.gap < 46) to('stalk'); }
  else if (st.phase === 'stalk') { if (inp.speed > 260) to('chase'); else if (t - st.at > 900) to('pounce'); }
  else if (st.phase === 'pounce') { if (t - st.at > 300) to('caught'); }
  else if (st.phase === 'caught') { if (Math.hypot(inp.x - st.holdX, inp.y - st.holdY) > 70) to('chase'); }
  return st.phase;
}

// ---------- the page: a copy of him flies over it ----------
function laserPage() {
  var sr = stage.getBoundingClientRect();
  if (sr.width < 20) return;
  laserStart();
  say(pick(['the red dot!!', 'I\'ll get it!', 'move it around~']), 1100, true);
  var gs = document.createElement('div'), gp = pet.cloneNode(true), shield = document.createElement('div'), dot = document.createElement('div');
  gs.className = stage.className + ' laser-ghost';
  gs.style.cssText = stage.style.cssText + ';position:fixed;left:' + sr.left + 'px;top:' + sr.top + 'px;width:' + sr.width + 'px;height:' + sr.height + 'px;margin:0;overflow:visible;background:none;border:0;box-shadow:none;pointer-events:none;z-index:9500;transform:none;';
  gp.classList.add('falling', 'laser-chase');
  laserFace(gp, LASER_FACES.chase);
  gs.appendChild(gp);
  shield.className = 'laser-shield';
  dot.className = 'laser-dot';
  dot.innerHTML = '<i></i>';
  document.body.append(gs, shield, dot);
  var pr = gp.getBoundingClientRect(), c0 = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 }, bw = pr.width, bh = pr.height;
  pet.style.visibility = 'hidden';
  // the dot starts on the pen, then follows the pointer
  var tr = toyEl.getBoundingClientRect(), d = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 }, dPrev = { x: d.x, y: d.y };
  var p = { x: 0, y: 0, vx: 0, vy: 0 }, face = d.x >= c0.x ? 1 : -1, t0 = performance.now(), last = t0, moveAt = t0, ended = false, raf = 0, dSpeed = 0, trailAt = 0;
  var st = { shown: 'chase', saidAt: Date.now() };
  laserOn = { desk: false };
  function talkAt(chars) { drift(chars, { x: c0.x + p.x, y: c0.y + p.y - bh * 0.45 }, chars.length > 1 ? 3 : 1); }
  function showDot() { dot.style.transform = 'translate(' + d.x.toFixed(1) + 'px,' + d.y.toFixed(1) + 'px)'; }
  showDot();
  function onMove(e) { d.x = e.clientX; d.y = e.clientY; moveAt = performance.now(); showDot(); }
  function onDown(e) {
    onMove(e);
    // a tap on him: caught
    var g = gp.getBoundingClientRect();
    if (e.clientX > g.left && e.clientX < g.right && e.clientY > g.top && e.clientY < g.bottom) end(true);
  }
  function onKey(e) { if (e.key === 'Escape') end(false); }
  function onHide() { if (document.hidden) end(false); }
  shield.addEventListener('pointermove', onMove);
  shield.addEventListener('pointerdown', onDown);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  /** A fading red streak behind a fast dot (a few at a time, each removes itself). */
  function trail(now) {
    if (dSpeed < 700 || now - trailAt < 30 || document.querySelectorAll('.laser-trail').length > 10) return;
    trailAt = now;
    var t = document.createElement('div');
    t.className = 'laser-trail';
    t.style.transform = 'translate(' + d.x.toFixed(1) + 'px,' + d.y.toFixed(1) + 'px)';
    document.body.appendChild(t);
    t.animate([{ opacity: .55, scale: 1 }, { opacity: 0, scale: .3 }], { duration: 260, easing: 'ease-out' }).finished.then(function () { t.remove(); }, function () { t.remove(); });
  }
  function step(now) {
    if (ended) return;
    var dt = Math.min(0.034, (now - last) / 1000);
    last = now;
    dSpeed = dSpeed * 0.7 + (Math.hypot(d.x - dPrev.x, d.y - dPrev.y) / Math.max(dt, 0.001)) * 0.3;
    dPrev.x = d.x; dPrev.y = d.y;
    trail(now);
    var cx = c0.x + p.x;
    // (the gap is to the chasing spot as far as the page lets him go: at the edge of the page he still stalks a dot he cannot get behind)
    function fit(tx, ty) { return { x: Math.max(-pr.left - bw * .2, Math.min(window.innerWidth - pr.right + bw * .2, tx)), y: Math.max(-pr.top, Math.min(window.innerHeight - pr.bottom, ty)) }; }
    var cs0 = fit(d.x - face * bw * 0.5 - c0.x, d.y + bh * 0.18 - c0.y);
    var ph = laserRule(st, { now: now, x: d.x, y: d.y, speed: dSpeed, gap: Math.hypot(cs0.x - p.x, cs0.y - p.y) });
    if (ph === 'chase') { if (d.x > cx + bw * 0.3) face = 1; else if (d.x < cx - bw * 0.3) face = -1; }   // (a little slack, so he does not flip back and forth)
    if (ph === 'pounce' && st.shown !== 'pounce') {   // he holds it in front of him: from the side that has room for him at the edge of the page
      var want = st.holdX - face * bw * 0.6 - c0.x;
      if (Math.abs(fit(want, 0).x - want) > 4) face = -face;
    }
    // where he wants to be: behind and below the dot while chasing (it is in front of his face), backed off and low while stalking, the dot held just in front of him once he pounces
    var sx = -0.5, sy = 0.18, max = 1300, K = 40, hx = d.x, hy = d.y;
    if (ph === 'stalk') { sx = -0.72; sy = 0.24; max = 70; }
    else if (ph === 'pounce' || ph === 'caught') { sx = -0.6; sy = 0.1; max = 2400; K = 110; hx = st.holdX; hy = st.holdY; }
    var tg = fit(hx + face * bw * sx - c0.x, hy + bh * sy - c0.y);
    laserStep(p, tg.x, tg.y, dt, max, K);
    gs.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
    if (ph !== st.shown) laserPhaseShow(gp, ph, st, talkAt);
    laserEyes(gp, d.x - (c0.x + p.x), d.y - (c0.y + p.y - bh * 0.15));
    laserLean(gp, ph === 'chase' ? p.vx : 0);
    gp.classList.toggle('falling', ph === 'chase');
    if (now - t0 > LASER_MS || now - moveAt > LASER_IDLE_MS) { end(false); return; }
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
  function end(caught) {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    shield.remove();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
    dot.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: .2 }], { duration: 350, fill: 'forwards' }).finished.then(function () { dot.remove(); }, function () { dot.remove(); });
    gp.style.setProperty('--lean', '0deg');
    gp.classList.remove('falling');
    var looked = caught ? Promise.resolve() : laserLost(gp, st, talkAt);
    if (caught) { sound('squeak'); talkAt(['♥', '✦']); }
    looked.then(function () {
      // he flies back to his spot
      LASER_CLASSES.forEach(function (c) { gp.classList.remove(c); });
      gp.classList.add('falling');
      laserFace(gp, LASER_FACES.caught);
      gp.style.setProperty('--look-x', (p.x > 0 ? -3.2 : 3.2) + 'px'); gp.style.removeProperty('--look-y');
      var ms = Math.max(400, Math.min(1100, Math.hypot(p.x, p.y) * 1.4));
      var back = gs.animate([{ transform: gs.style.transform || 'none' }, { transform: 'translate(0px,0px)' }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
      function home() {
        gs.remove();
        pet.style.visibility = '';
        laserDone();
        setFace({ eyes: 'happy', mouth: 'open', arms: 'idle', x: ['cheeks', 'sweat'] });   // (out of breath)
        say(caught ? pick(['you caught me!', 'hehe, that was fun!']) : pick(['phew… I almost had it!', '*pant pant* again later?', 'that dot is too fast…']), 1800, true);
        pulse('hopsmall', 450);
        setTimeout(function () { if (!busy) settle(); }, 1900);
      }
      back.finished.then(home, home);
    });
  }
}

/**
 * One step of flying after the dot: a spring towards the target with a top speed (a little overshoot, like a pet that can't stop in time).
 * The same rule as place.chaseStep in desktop/place.js. @param {{x:number,y:number,vx:number,vy:number}} p Changed in place.
 * @param {number} [K=40] How stiff the spring is (a pounce is much quicker).
 */
function laserStep(p, tx, ty, dt, max, K) {
  K = K || 40;
  var DAMP = 2 * Math.sqrt(K) * 0.87;
  p.vx += ((tx - p.x) * K - p.vx * DAMP) * dt;
  p.vy += ((ty - p.y) * K - p.vy * DAMP) * dt;
  var sp = Math.hypot(p.vx, p.vy);
  if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
  p.x += p.vx * dt; p.y += p.vy * dt;
  return p;
}

/** For the animation player: one part of the game on the real pet. @param {string} ph stalk, pounce, caught or lost. @returns {number} Ms it takes. */
function laserDemo(ph) {
  var st = { shown: '', saidAt: 0 };
  if (ph === 'lost') { laserLost(pet, st).then(function () { LASER_CLASSES.forEach(function (c) { pet.classList.remove(c); }); ['--look-x', '--look-y'].forEach(function (v) { pet.style.removeProperty(v); }); }); return 1500; }
  laserPhaseShow(pet, ph, st);
  var ms = ph === 'stalk' ? 1800 : ph === 'pounce' ? 500 : 1400;
  setTimeout(function () { pet.classList.remove('laser-' + ph); }, ms);
  return ms;
}
