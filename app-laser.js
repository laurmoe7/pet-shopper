// The laser dot: a third toy (a little pink laser pen) picked in the ring menu's toy circle. Tap the pen (or the ring's Laser dot button in
// Mini Fumu) and a red dot sits on your pointer: he flies after it wherever it goes, up into the air too, not only along his floor.
// In Mini Fumu (wander mode) the shell flies his whole window after the mouse over the screen (desk:chaseStart in desktop/main.js, which
// also draws the dot in the toy window) and he drops to the floor and runs back when it ends; click him to stop sooner.
// In the page itself (phone, full app) a copy of him flies over the page after the finger or the mouse (like the sneaky snack's trip),
// while a see-through shield takes the taps; tap him to catch him. Only a game: nothing counts for goals.
// Plain script, shares one scope, loaded after app-wreck.js.
'use strict';

var LASER_MS = 15000, LASER_IDLE_MS = 5000;   // (how long a chase lasts; the page's one ends sooner when the pointer stops moving)
var laserOn = null;

/** Tapping the laser pen: the chase starts, in the shell (Mini Fumu) or in the page. */
function laserPlay() {
  if (laserOn || playing) return;
  if (busy || baseState() === 'sleepy' || stage.classList.contains('bedtime')) {
    if (!reduceMotion) toyBall.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-20deg)' }, { transform: 'rotate(14deg)' }, { transform: 'rotate(0)' }], { duration: 450 });
    return;
  }
  if (reduceMotion) { say(pick(['the red dot! …I\'ll just watch it~', 'ooh, shiny dot~']), 1600); return; }
  if (document.documentElement.classList.contains('desktop-pet')) laserDesk(); else laserPage();
}

/** The face and line he starts with. */
function laserStart() {
  playing = true;
  busy++;
  stopWalk();
  sound('pick');
  setFace({ eyes: 'sparkle', mouth: 'open', arms: 'reach', x: ['cheeks'] });
  eyesDo('wide');
}
/** The chase is over: back to normal. */
function laserDone() {
  laserOn = null;
  stage.classList.remove('laser-on');
  pet.classList.remove('falling', 'walking', 'running');
  pet.style.removeProperty('--look-x');
  playing = false;
  busy--;
  if (!busy) settle();
}

// ---------- Mini Fumu: the shell flies the window ----------
function laserDesk() {
  var D = window.nibbleDesktop;
  if (!D || !D.chaseStart) { say(pick(['I need the new Fumufumu for that~', 'update me first!']), 1800); return; }
  if (typeof deskRoomMode === 'function' && deskRoomMode()) { say(pick(['I can\'t leave my room… (wander mode)', 'let me out of my room first!']), 2000); return; }
  laserStart();
  laserOn = { desk: true, caughtAt: Date.now() };
  stage.classList.add('laser-on');
  pet.classList.add('falling');   // (arms flapping: he flies)
  say(pick(['the red dot!!', 'I\'ll get it!', 'come back here~', 'mine mine mine!']), 1300, true);
  D.chaseStart(LASER_MS).then(laserDone, laserDone);
}
if (window.nibbleDesktop && window.nibbleDesktop.onChase) window.nibbleDesktop.onChase(function (vx, vy, face, near, floor) {
  if (!laserOn || !laserOn.desk) return;
  pet.style.setProperty('--look-x', (face < 0 ? -3.2 : 3.2) + 'px');
  // on the floor he runs after it, in the air he flaps
  pet.classList.toggle('falling', !floor);
  pet.classList.toggle('walking', !!floor && Math.abs(vx) > 60);
  pet.classList.toggle('running', !!floor && Math.abs(vx) > 400);
  laserNear(near, null);
});
/** He is right on the dot: a happy pounce now and then. @param {boolean} near @param {Element} [ghost] The page's copy of him. */
function laserNear(near, ghost) {
  var now = Date.now();
  if (!near || now - laserOn.caughtAt < 2600) return;
  laserOn.caughtAt = now;
  sound('squeak');
  if (ghost) { ghost.dataset.eyes = 'happy'; setTimeout(function () { if (ghost.isConnected) ghost.dataset.eyes = 'sparkle'; }, 700); return; }
  pulse('hopsmall', 450);
  setFace({ eyes: 'happy', mouth: 'open', arms: 'reach', x: ['cheeks'] });
  say(pick(['got it!', 'gotcha~', 'hehe, almost!', 'where\'d it go?', 'so fast!']), 1000, true);
  setTimeout(function () { if (laserOn) setFace({ eyes: 'sparkle', mouth: 'open', arms: 'reach', x: ['cheeks'] }); }, 900);
}
// a click on him while he chases: caught, and the chase stops (he still drops and runs back)
window.addEventListener('pointerdown', function (e) {
  if (!laserOn || !laserOn.desk || !e.target.closest || !e.target.closest('#pet')) return;
  e.stopImmediatePropagation(); e.preventDefault();
  if (window.nibbleDesktop.chaseStop) window.nibbleDesktop.chaseStop();
  say(pick(['you caught me!', 'okay okay, I\'m done~', 'hehe, that was fun!']), 1500, true);
}, true);

// ---------- the page: a copy of him flies over it ----------
function laserPage() {
  var sr = stage.getBoundingClientRect();
  if (sr.width < 20) return;
  laserStart();
  say(pick(['the red dot!!', 'I\'ll get it!', 'move it around~']), 1100, true);
  var gs = document.createElement('div'), gp = pet.cloneNode(true), shield = document.createElement('div'), dot = document.createElement('div');
  gs.className = stage.className + ' laser-ghost';
  gs.style.cssText = stage.style.cssText + ';position:fixed;left:' + sr.left + 'px;top:' + sr.top + 'px;width:' + sr.width + 'px;height:' + sr.height + 'px;margin:0;overflow:visible;background:none;border:0;box-shadow:none;pointer-events:none;z-index:9500;transform:none;';
  gp.classList.add('falling'); gp.dataset.arms = 'reach'; gp.dataset.eyes = 'sparkle'; gp.dataset.mouth = 'open';
  gs.appendChild(gp);
  shield.className = 'laser-shield';
  dot.className = 'laser-dot';
  document.body.append(gs, shield, dot);
  var pr = gp.getBoundingClientRect(), c0 = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 }, bw = pr.width, bh = pr.height;
  pet.style.visibility = 'hidden';
  // the dot starts on the pen, then follows the pointer
  var tr = toyEl.getBoundingClientRect(), d = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
  var p = { x: 0, y: 0, vx: 0, vy: 0 }, face = d.x >= c0.x ? 1 : -1, t0 = performance.now(), last = t0, moveAt = t0, ended = false, raf = 0;
  laserOn = { desk: false, caughtAt: Date.now() };
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
  function step(now) {
    if (ended) return;
    var dt = Math.min(0.034, (now - last) / 1000);
    last = now;
    var cx = c0.x + p.x;
    if (d.x > cx + bw * 0.3) face = 1; else if (d.x < cx - bw * 0.3) face = -1;   // (a little slack, so he does not flip back and forth)
    // his body a little behind and below the dot, so it is in front of his face; never off the page
    var tx = d.x - face * bw * 0.5 - c0.x, ty = d.y + bh * 0.18 - c0.y;
    tx = Math.max(-pr.left, Math.min(window.innerWidth - pr.right, tx));
    ty = Math.max(-pr.top, Math.min(window.innerHeight - pr.bottom, ty));
    laserStep(p, tx, ty, dt, 1300);
    gs.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
    gp.style.setProperty('--look-x', (face * 3.2) + 'px');
    laserNear(Math.hypot(tx - p.x, ty - p.y) < 18 && Math.hypot(p.vx, p.vy) < 260, gp);
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
    dot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(function () { dot.remove(); }, function () { dot.remove(); });
    if (caught) { sound('squeak'); drift(['♥', '✦'], { x: c0.x + p.x, y: c0.y + p.y - bh * 0.4 }, 3); }
    // he flies back to his spot
    gp.dataset.eyes = 'happy';
    gp.style.setProperty('--look-x', (p.x > 0 ? -3.2 : 3.2) + 'px');
    var ms = Math.max(400, Math.min(1100, Math.hypot(p.x, p.y) * 1.4));
    var back = gs.animate([{ transform: gs.style.transform || 'none' }, { transform: 'translate(0px,0px)' }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    function home() {
      gs.remove();
      pet.style.visibility = '';
      laserDone();
      say(caught ? pick(['you caught me!', 'hehe, that was fun!']) : pick(['phew… it got away', 'I almost had it!', 'again later?']), 1600, true);
      pulse('hopsmall', 450);
    }
    back.finished.then(home, home);
  }
}

/**
 * One step of flying after the dot: a spring towards the target with a top speed (a little overshoot, like a pet that can't stop in time).
 * The same rule as place.chaseStep in desktop/place.js. @param {{x:number,y:number,vx:number,vy:number}} p Changed in place.
 */
function laserStep(p, tx, ty, dt, max) {
  var K = 40, DAMP = 11;
  p.vx += ((tx - p.x) * K - p.vx * DAMP) * dt;
  p.vy += ((ty - p.y) * K - p.vy * DAMP) * dt;
  var sp = Math.hypot(p.vx, p.vy);
  if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
  p.x += p.vx * dt; p.y += p.vy * dt;
  return p;
}
