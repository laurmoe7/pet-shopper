// The toy: a ball on the floor. Tap it and it bounces away, and the pet runs after it: a dog or a bird
// fetches it back, a cat bats it about first, everyone else pounces on it and hugs it.
// Only a game: nothing counts for goals. These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var toyEl = $('toy'), toyBall = toyEl.querySelector('.toy-ball'), toyX = -58, playing = false;
var TOY_HOME = -58; // its spot beside the cushion
/** @returns {string} How the species plays: fetch, bat or hug. */
function playStyle() {
  var sp = state.pet.species;
  if (sp === 'puppy' || L.isBird(sp)) return 'fetch';
  if (sp === 'kitty') return 'bat';
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
  var b = walkBounds(), style = playStyle();
  // throw it to the side with more room, a good way from the pet
  var side = b.max - walkX >= walkX - b.min ? 1 : -1;
  var room = side > 0 ? b.max - walkX : walkX - b.min;
  var land = room >= 50 ? walkX + side * (room * (0.75 + Math.random() * 0.25)) : walkX + side * 46;
  var stop = room >= 50 ? land - side * Math.min(44, Math.abs(land - walkX) / 2) : walkX; // where the pet stops before it pounces

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
    if (style === 'bat') return batAbout(side);
  }).then(function () {
    return pounce();
  }).then(function () {
    return style === 'fetch' ? fetchBack() : hugToy();
  }).then(function () {
    pet.style.removeProperty('--look-x');
    playing = false;
    walkWide = false;
    busy--;
    if (!busy) settle();
    walkHome();
  });
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
    return toyBounce(TOY_HOME, 600, 10, mouthHeight());
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

// which toy shows (yarn, tennis ball or ball) is set in styles.css by the species
toyEl.addEventListener('click', function (e) { e.stopPropagation(); playToy(); });
