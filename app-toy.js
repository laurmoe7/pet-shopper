// The toy: a ball on the floor. Tap it and it bounces away, or grab it and throw it, and the pet runs after it: a dog or a bird
// fetches it back, a cat bats it about first, a frog snatches it with its tongue, everyone else pounces on it and hugs it.
// Only a game: nothing counts for goals. These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var toyEl = $('toy'), toyBall = toyEl.querySelector('.toy-ball'), toyX = toyHome(), playing = false;
/** @returns {number} The toy's spot beside the cushion: a bigger pet takes more room (its size is --pet-size on the stage). */
function toyHome() { return Math.round(58 * (parseFloat(getComputedStyle(stage).getPropertyValue('--pet-size')) || 1)); }
/** @returns {string} How the species plays: fetch, bat, tongue or hug. */
function playStyle() {
  var sp = state.pet.species;
  if (sp === 'puppy' || L.isBird(sp)) return 'fetch';
  if (sp === 'kitty') return 'bat';
  if (sp === 'frog') return 'tongue';
  return 'hug';
}

/**
 * Rolls and bounces the toy along the floor to x, starting from a height (in px above the floor).
 * @param {number} x Px from the middle of the stage.
 * @param {number} ms
 * @param {number} h How high the first bounce goes.
 * @param {number} [fromY=0] How high the toy starts, e.g. from the pet's mouth.
 * @returns {Promise<void>} Resolves when it has stopped.
 */
function toyBounce(x, ms, h, fromY) {
  var from = toyX;
  toyX = Math.round(x);
  toyEl.style.translate = toyX + 'px 0';
  if (reduceMotion) { toyBall.style.transform = ''; return wait(0); }
  toyEl.animate([{ translate: from + 'px 0' }, { translate: toyX + 'px 0' }], { duration: ms, easing: 'cubic-bezier(.25,.7,.45,1)' });
  // a big hop and two smaller ones; the first starts from fromY
  var hops = [[0, 0.5, h], [0.5, 0.8, h * 0.35], [0.8, 1, h * 0.12]], frames = [], dir = toyX >= from ? 1 : -1;
  var turns = Math.abs(toyX - from) / 80;
  for (var i = 0; i <= 30; i++) {
    var t = i / 30, y = 0;
    hops.forEach(function (hp) {
      if (t < hp[0] || t > hp[1]) return;
      var u = (t - hp[0]) / (hp[1] - hp[0]);
      y = hp[2] * 4 * u * (1 - u);
      if (hp[0] === 0 && fromY) y += fromY * (1 - u) * (1 - u); // falls from the start height
    });
    frames.push({ transform: 'translateY(' + (-y).toFixed(1) + 'px) rotate(' + Math.round(dir * turns * 360 * t) + 'deg)' });
  }
  toyBall.style.transform = '';
  setTimeout(function () { sound('bounce'); }, ms * 0.5);
  return toyBall.animate(frames, { duration: ms }).finished.catch(function () {});
}
/**
 * Lifts the toy up to a height (into the mouth or the arms) and moves it along with the pet.
 * @param {number} y Px above the floor.
 * @param {number} [x] Where to take it (px from the middle).
 * @param {number} [ms=200]
 */
function toyHold(y, x, ms) {
  ms = ms || 200;
  var from = toyX;
  if (x != null) toyX = Math.round(x);
  toyEl.style.translate = toyX + 'px 0';
  var to = 'translateY(' + (-y) + 'px)';
  if (!reduceMotion) {
    toyEl.animate([{ translate: from + 'px 0' }, { translate: toyX + 'px 0' }], { duration: ms, easing: 'ease-in-out' });
    toyBall.animate([{ transform: toyBall.style.transform || 'none' }, { transform: to }], { duration: Math.min(ms, 220), easing: 'ease-out' });
  }
  toyBall.style.transform = to;
}
var toyCarried = false;
/** @returns {boolean} Whether the toy is out and free to be picked up (not put away, hidden, in a game or already held). */
function toyFree() {
  return !playing && !held && !toyField && getComputedStyle(toyEl).display !== 'none' && !stage.classList.contains('bedtime');
}
/** Picks the toy up in his hands while he is carried (the desktop app), or drops it where he is put down. */
function toyCarry(on) {
  if (on) {
    if (!toyFree()) return;
    toyCarried = true;
    toyHold(26, 30 * (parseFloat(getComputedStyle(stage).getPropertyValue('--pet-size')) || 1) + 10, 220);
  } else if (toyCarried) {
    toyCarried = false;
    var from = toyX;
    toyX = from;   // it falls from his hands onto the floor beside him
    toyBall.style.transform = '';
    toyBounce(toyHome(), 600, 10, 26);
  }
}
/** @returns {number} How far up the pet's mouth is from the floor, in px. */
function mouthHeight() { return Math.round(pet.offsetHeight * 0.285 - 9); }

/**
 * Plays with the toy: it bounces away and the pet chases it.
 */
function playToy() {
  if (playing) return;
  if (busy || baseState() === 'sleepy') {
    // something else is going on: the toy just wobbles
    if (!reduceMotion) toyBall.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-20deg)' }, { transform: 'rotate(14deg)' }, { transform: 'rotate(0)' }], { duration: 450 });
    return;
  }
  playing = true;
  walkWide = true; // the whole floor to run about on
  busy++;
  stopWalk();
  clearTimeout(bubbleTimer); bubble.hidden = true;
  var b = walkBounds();
  // throw it to the side with more room, a good way from the pet
  var side = b.max - walkX >= walkX - b.min ? 1 : -1;
  var room = side > 0 ? b.max - walkX : walkX - b.min;
  var land = room >= 50 ? walkX + side * (room * (0.75 + Math.random() * 0.25)) : walkX + side * 46;
  // where the pet stops before it pounces (a frog stops further off and uses its tongue)
  var stop = room >= 50 ? land - side * Math.min(playStyle() === 'tongue' ? 80 : 44, Math.abs(land - walkX) / 2) : walkX;

  sound('toss');
  setFace({ eyes: 'sparkle', mouth: 'o', arms: 'reach', x: [] });
  pet.style.setProperty('--look-x', side * 3.2 + 'px');
  eyesDo('wide');
  talk('toyToss', ['ooh! ball!', 'gonna get it!', 'wait for me!', 'mine mine mine!'], 1200);
  var landed = toyBounce(land, 900, 46);
  wait(300).then(function () {
    setFace({ eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] });
    pet.classList.add('running');
    return Promise.all([wait(walkTo(stop, 7)), landed]);
  }).then(function () {
    pet.classList.remove('running');
    return getIt(side);
  }).then(endPlay);
}
/** Next to the toy on the floor: a cat bats it about first, then the pet pounces and fetches or hugs it; a frog licks it up. */
function getIt(side) {
  if (playStyle() === 'tongue') return tongueGrab(toyX, 0).then(fetchBack);
  return (playStyle() === 'bat' ? batAbout(side) : Promise.resolve()).then(function () {
    return pounce();
  }).then(function () {
    return playStyle() === 'fetch' ? fetchBack() : hugToy();
  });
}
/** The game is over: back to normal. */
function endPlay() {
  endField();
  if (typeof deskToyReturn === 'function') deskToyReturn();   // desktop: back to where he stood when it was thrown
  pet.style.removeProperty('--look-x');
  pet.classList.remove('running');
  playing = false;
  walkWide = false;
  busy--;
  if (!busy) settle();
  walkHome();
}
/** The pet hops onto the toy. */
function pounce() {
  pulse('hop', 500);
  sound('squish');
  walkTo(toyX, 5);
  return wait(380);
}
/** A cat's game: a wiggle, a pounce that knocks the toy away, then a chase after it. */
function batAbout(side) {
  setFace({ eyes: 'open', mouth: 'wavy', arms: 'idle', x: [] });
  eyesDo('squint');
  pulse('wiggle', 900);
  talk('toyHunt', ['hunting mode…', 'wiggle wiggle…', 'pounce time!'], 1100);
  return wait(950).then(function () {
    return pounce();
  }).then(function () {
    // a swipe: the yarn skitters back the other way
    var b = walkBounds();
    var to = Math.max(b.min, Math.min(b.max, toyX - side * 60));
    setFace({ eyes: 'happy', mouth: 'open', arms: 'reach', x: ['cheeks'] });
    pet.style.setProperty('--look-x', -side * 3.2 + 'px');
    say(pick(['bap!', 'swat!', 'hehe!']), 800, true);
    var rolled = toyBounce(to, 650, 18);
    return wait(300).then(function () {
      pet.classList.add('running');
      return Promise.all([wait(walkTo(to + side * 34, 7)), rolled]);
    }).then(function () { pet.classList.remove('running'); });
  });
}
/** Picks the toy up in its mouth, trots back to the middle and drops it there for another throw. */
function fetchBack() {
  sound('squeak');
  setFace({ eyes: 'happy', mouth: 'o', arms: 'idle', x: ['cheeks'] });
  toyHold(mouthHeight(), walkX);
  return wait(350).then(function () {
    var ms = walkTo(0, 12);
    toyHold(mouthHeight(), walkX, ms || 200);
    return wait(ms + 100);
  }).then(function () {
    setFace(FACES.tada);
    pulse('hophop', 1500);
    drift(['♥', '✦', '♥'], petTop(), 3);
    talk('toyAgain', ['again! again!', 'throw it again!', 'I got it!', 'fetched it!'], 1500);
    return toyBounce(toyHome(), 600, 10, mouthHeight());
  }).then(function () { return wait(900); });
}
/** Hugs the toy for a moment, then lets it roll off a little. */
function hugToy() {
  sound('squeak');
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rub', x: ['cheeks', 'hearts'] });
  toyHold(14, walkX);
  pulse('pat', 1300);
  drift(['♥', '♡'], petTop(), 3);
  talk('toyGot', ['got it!', 'mine! ♡', 'caught it!', 'hehe, gotcha!'], 1400);
  return wait(1400).then(function () {
    var b = walkBounds();
    var to = walkX + (walkX > (b.min + b.max) / 2 ? -1 : 1) * 36;
    setFace({ eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
    return toyBounce(to, 600, 8, 14);
  });
}

// ---------- grab and throw ----------
// Drag the toy about and let go: it flies off at the speed you threw it, bounces off the sides, top and floor of
// the room, and the pet runs underneath to catch it (in its mouth for a dog or bird, in its arms for the rest).
// If it lands out of reach, the pet runs over and pounces on it. A plain tap still tosses it (playToy).
var held = null, skipClick = false, flight = 0;
// the desktop app can let the toy fly over the whole screen (app-desktop.js sets this while a throw is on): {lim, show(x, y, spin), hide(), zoom}
var toyField = null;
/** Ends the screen-wide flight: the toy is drawn in the page again (at toyX on the floor). */
function endField(y) {
  if (!toyField) return;
  toyField.hide(); toyField = null;
  toyEl.style.visibility = '';
  toyEl.style.translate = Math.round(toyX) + 'px 0';
  toyBall.style.transform = y > 0 ? 'translateY(' + (-y).toFixed(1) + 'px)' : '';
}
/** @returns {{minX: number, maxX: number, maxY: number}} Where the toy can go: px from the middle, px above the floor. */
function toyLimits() {
  if (toyField) return toyField.lim;
  var w = stage.clientWidth;
  return { minX: -w / 2 + 18, maxX: w / 2 - 18, maxY: stage.clientHeight - 3 - 32 - 8 };
}
/** Puts the toy at x (px from the middle), y (px above the floor), turned by spin degrees. */
function placeToy(x, y, spin) {
  toyX = x;
  if (toyField) { toyField.show(x, y, spin || 0); return; }
  toyEl.style.translate = Math.round(x) + 'px 0';
  toyBall.style.transform = 'translateY(' + (-y).toFixed(1) + 'px) rotate(' + Math.round(spin || 0) + 'deg)';
}
toyEl.addEventListener('pointerdown', function (e) {
  if (playing || busy || stage.classList.contains('bedtime')) return;
  try { toyEl.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
  held = { x0: e.clientX, y0: e.clientY, moved: false, y: 0, pts: [] };
});
toyEl.addEventListener('pointermove', function (e) {
  if (!held) return;
  if (e.buttons === 0 && e.pointerType === 'mouse') { letGoToy(); return; }   // the button is already up: let go
  if (!held.moved) {
    if (Math.hypot(e.clientX - held.x0, e.clientY - held.y0) < (e.pointerType === 'mouse' ? 3 : 8)) return;   // a mouse is exact: pick up almost at once
    held.moved = true;
    // picked up: the pet can't wait
    playing = true;
    walkWide = true;
    busy++;
    stopWalk();
    setFace({ eyes: 'sparkle', mouth: 'open', arms: 'reach', x: ['cheeks'] });
    pulse('hopsmall', 450);
    if (typeof deskToyField === 'function') deskToyField();   // desktop app: the toy may fly over the whole screen
    talk('toyHeld', ['throw it! throw it!', 'ooh! ooh!', 'I\'m ready!', 'over here!'], 1300);
  }
  // the boxes are read again only a few times a second while dragging: reading them on every move forces the page to lay itself out each time
  if (!held.box || e.timeStamp - held.box.t > 120 || (toyField && !held.box.field)) held.box = { t: e.timeStamp, st: stage.getBoundingClientRect(), pr: pet.getBoundingClientRect(), lim: toyLimits(), field: !!toyField };
  var st = held.box.st, lim = held.box.lim;
  // dangling it over his head: he jumps for it, and after a few seconds of that he gets a little cross
  var pr = held.box.pr, over = e.clientY < pr.top + pr.height * 0.25 && Math.abs(e.clientX - (pr.left + pr.width / 2)) < pr.width * 0.5;
  if (over && !held.over) {
    held.over = true;
    held.hopTimer = setInterval(function () { if (held && held.over && !held.annoyed) pulse('hop', 500); }, 1100);
    held.crossTimer = setTimeout(function () {
      if (!held || !held.over) return;
      held.annoyed = true;
      setFace(FACES.annoyed);
      say(pick(['hey, that\'s too high!', 'hmph… give it?', 'no fair~', 'can I have it now?']), 1400);
    }, 3500);
  } else if (!over && held.over) {
    stopOverHead(held);
    setFace({ eyes: 'sparkle', mouth: 'open', arms: 'reach', x: ['cheeks'] });
  }
  held.y = Math.max(0, Math.min(lim.maxY, st.bottom - 19 - e.clientY));
  placeToy(Math.max(lim.minX, Math.min(lim.maxX, e.clientX - (st.left + st.width / 2))), held.y, 0);
  held.pts.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
  if (held.pts.length > 5) held.pts.shift();
});
/** Stops the jumping and the waiting to get cross. @param {Object} h The held-toy state. */
function stopOverHead(h) {
  clearInterval(h.hopTimer); clearTimeout(h.crossTimer);
  h.over = false; h.annoyed = false;
}
function letGoToy() {
  if (!held) return;
  var h = held;
  stopOverHead(h);
  held = null;
  if (!h.moved) return; // a tap: the click tosses it
  skipClick = true;
  var a = h.pts[0], z = h.pts[h.pts.length - 1], dt = Math.max(16, z.t - a.t) / 1000;
  var vx = (z.x - a.x) / dt, vy = -(z.y - a.y) / dt, speed = Math.hypot(vx, vy);
  // over the whole screen a throw goes twice as hard, so it really crosses it
  var boost = toyField ? 2.2 : 1, cap = 1500 * boost;
  vx *= boost; vy *= boost; speed *= boost;
  if (speed > cap) { vx *= cap / speed; vy *= cap / speed; }
  fling(vx, vy, h.y);
}
toyEl.addEventListener('pointerup', letGoToy);
toyEl.addEventListener('pointercancel', letGoToy);
toyEl.addEventListener('lostpointercapture', letGoToy);
window.addEventListener('blur', letGoToy);   // the release went elsewhere (another window): never leave it stuck in the air
// which toy shows (yarn, tennis ball or ball) is set in styles.css by the species
toyEl.addEventListener('click', function (e) {
  e.stopPropagation();
  if (skipClick) { skipClick = false; return; }
  playToy();
});

/**
 * The toy flies from where it was let go, bouncing about the room, while the pet runs under it to catch it.
 * @param {number} vx px per second, to the right.
 * @param {number} vy px per second, upwards.
 * @param {number} y Height it was let go at.
 */
function fling(vx, vy, y) {
  sound('toss');
  setFace({ eyes: 'sparkle', mouth: 'o', arms: 'reach', x: [] });
  eyesDo('wide');
  pet.classList.add('running');
  var lim = toyLimits(), x = toyX, spin = 0, start = performance.now(), last = start, chaseAt = 0;
  var catchAt = playStyle() === 'fetch' ? mouthHeight() : 14, frog = playStyle() === 'tongue';
  // over the whole screen it flies longer: lighter gravity, livelier bounces, and he waits a while before he may catch it
  var followAt = 0, wide = !!toyField, gravity = wide ? 950 : 1500, wallK = wide ? 0.92 : 0.75, floorK = wide ? 0.74 : 0.6, grace = wide ? 3000 : 250, maxMs = wide ? 12000 : 7000;
  cancelAnimationFrame(flight);
  if (reduceMotion) { placeToy(x, 0, 0); landed(); return; }
  // if the chase drags on he jumps at the toy and gets it
  var leapAfter = wide ? 6500 : 3200;
  function leap() {
    var px0 = parseFloat(getComputedStyle(pet).translate) || 0, fx = x, fy = y, t0 = performance.now();
    pulse('hop', 500);
    (function fly(n) {
      var u = Math.min(1, (n - t0) / 260);
      placeToy(fx + (px0 - fx) * u, fy + (catchAt - fy) * u, spin);
      if (u < 1) flight = requestAnimationFrame(fly); else if (frog) caught(px0, catchAt); else caught();
    })(t0);
  }
  function step(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    vy -= gravity * dt;
    x += vx * dt;
    y += vy * dt;
    // bounce off the sides, the top and the floor of the room
    if (x < lim.minX) { x = lim.minX; vx = -vx * wallK; sound('bounce'); }
    if (x > lim.maxX) { x = lim.maxX; vx = -vx * wallK; sound('bounce'); }
    if (y > lim.maxY) { y = lim.maxY; vy = -Math.abs(vy) * 0.6; }
    if (y < 0) {
      y = 0;
      if (vy < -140) sound('bounce');
      vy = -vy * floorK;
      if (vy < 70) vy = 0;
      vx *= 0.88;
    }
    if (y === 0 && vy === 0) vx *= Math.pow(0.3, dt); // rolling to a stop
    spin += vx * dt * 2.4;
    placeToy(x, y, spin);
    // the pet runs to where the toy is heading
    if (now > chaseAt) { chaseAt = now + 110; walkTo(x + vx * 0.3, 5); }
    // over the whole screen his window runs after it too, once it is well past where he can reach inside the window
    if (wide && now > followAt && typeof deskToyFollow === 'function') {
      var far = x - clampWalk(x);
      if (Math.abs(far) > 60) { followAt = now + 600; deskToyFollow(far * 0.8).then(function (moved) { x -= moved || 0; }); }
    }
    pet.style.setProperty('--look-x', (x > walkX ? 3.2 : -3.2) + 'px');
    if (now - start > leapAfter) { leap(); return; }
    // caught: coming down at the right height, right in front of the pet
    var px = parseFloat(getComputedStyle(pet).translate) || 0;
    // a frog snatches it out of the air with its tongue once it is within reach
    if (frog && now - start > grace && y > 6 && Math.hypot(x - px, y - mouthHeight()) < 115) { caught(x, y); return; }
    // a cat does not catch it out of the air: it waits for it to land, then hunts it on the floor (landed > getIt > batAbout)
    if (playStyle() !== 'bat' && now - start > grace && vy <= 0 && y < catchAt + 18 && y > catchAt - 24 && Math.abs(x - px) < 30) { caught(); return; }
    if ((y === 0 && vy === 0 && Math.abs(vx) < 14) || now - start > maxMs) { landed(); return; }
    flight = requestAnimationFrame(step);
  }
  flight = requestAnimationFrame(step);
}
/**
 * Caught it! A dog or bird has it in its mouth and brings it back, a frog licks it out of the air first; the rest hug it.
 * @param {number} x Where the toy was caught (px from the middle).
 * @param {number} y Px above the floor.
 */
function caught(x, y) {
  endField(y);
  pet.classList.remove('running');
  stopWalk();
  var style = playStyle();
  (style === 'tongue' ? tongueGrab(x, y) : wait(0)).then(function () {
    pulse('hop', 500);
    drift(['✦', '♥'], petTop(), 2);
    say(pick(style === 'tongue' ? ['thwip! got it!', 'gotcha! ribbit!', 'nice throw!', 'yoink!'] : ['caught it!', 'got it!', 'nice throw!', 'yay!']), 1100);
    if (style === 'hug' || style === 'bat') return hugToy();
    toyHold(mouthHeight(), walkX, 150);
    return wait(500).then(fetchBack);
  }).then(endPlay);
}
/** It came down out of reach: the pet runs over and gets it off the floor. */
function landed() {
  var side = toyX >= walkX ? 1 : -1;
  pet.classList.add('running');
  // it came down far from his window (the toy flies over the whole screen): the window runs along the floor to it first
  var far = toyField ? toyX - clampWalk(toyX) : 0;
  (far && typeof deskToyChase === 'function' ? deskToyChase(far) : Promise.resolve(0)).then(function (moved) {
    toyX -= moved || 0;   // the window moved under it
    endField();
    return wait(walkTo(toyX - side * (playStyle() === 'tongue' ? 80 : 40), 7));
  }).then(function () {
    pet.classList.remove('running');
    return getIt(side);
  }).then(endPlay);
}

// ---------- the frog's tongue ----------
var tongueEl = $('frogTongue');
/** @returns {{x: number, y: number}} Where the frog's mouth is, in the toy's terms: px from the middle, px above the floor. */
function mouthAt() {
  var svg = pet.querySelector('.pet-svg'), m = svg && svg.getScreenCTM(), st = stage.getBoundingClientRect();
  if (!m) return { x: walkX, y: mouthHeight() };
  var pt = svg.createSVGPoint();
  pt.x = 80; pt.y = 106;
  pt = pt.matrixTransform(m);
  return { x: pt.x - (st.left + st.width / 2), y: st.bottom - 19 - pt.y };
}
/** Stretches the tongue from the mouth m to the point x, y (toy terms). */
function drawTongue(m, x, y) {
  var dx = x - m.x, dy = m.y - y; // the page's y grows downwards
  tongueEl.style.width = Math.max(4, Math.hypot(dx, dy)).toFixed(1) + 'px';
  tongueEl.style.transform = 'translate(' + m.x.toFixed(1) + 'px, ' + (-m.y).toFixed(1) + 'px) rotate(' + Math.atan2(dy, dx).toFixed(3) + 'rad)';
}
/**
 * The frog shoots its tongue out to the toy at x, y and reels it back into its mouth.
 * @param {number} x Px from the middle.
 * @param {number} y Px above the floor.
 * @returns {Promise<void>} Resolves with the toy in its mouth.
 */
function tongueGrab(x, y) {
  sound('tongue');
  setFace({ eyes: 'open', mouth: 'open', arms: 'reach', x: [] });
  eyesDo('wide');
  pet.style.setProperty('--look-x', (x > walkX ? 3.2 : -3.2) + 'px');
  if (reduceMotion) { toyHold(mouthHeight(), walkX); return wait(300); }
  var OUT = 120, BACK = 260, t0 = performance.now();
  tongueEl.hidden = false;
  return new Promise(function (done) {
    function step(now) {
      var t = now - t0, m = mouthAt();
      if (t < OUT) {
        var u = t / OUT;
        drawTongue(m, m.x + (x - m.x) * u, m.y + (y - m.y) * u);
      } else if (t < OUT + BACK) {
        // stuck to the tongue, the toy comes flying back
        var v = (t - OUT) / BACK, tx, ty;
        v = v * v * (3 - 2 * v);
        tx = x + (m.x - x) * v; ty = y + (m.y - y) * v;
        drawTongue(m, tx, ty);
        placeToy(tx, ty, 0);
      } else {
        tongueEl.hidden = true;
        toyX = walkX;
        toyHold(mouthHeight(), walkX, 60);
        setFace({ eyes: 'happy', mouth: 'o', arms: 'idle', x: ['cheeks'] });
        done();
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/** Puts the toy back at its spot beside the cushion (for when the pet's size changes with its species). */
function toyBackHome() {
  if (playing) return;
  endField();
  toyEl.style.translate = '';
  toyX = toyHome();
}
