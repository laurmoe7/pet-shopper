// Petting: stroke Fumu with a finger or the mouse for a purr and hearts (in the small desktop window the pointer only has to pass over him).
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

(function () {
  var STROKE_PX = 90;      // how far a finger has to travel to count as a stroke
  var COOLDOWN_MS = 2200;  // so it can't be spammed
  var down = null, travel = 0, nextAt = 0, stroked = false;

  // different ways to enjoy being stroked: a happy wiggle, melting, a roly-poly, giggling, leaning into it
  var PETTED = [
    { face: { eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['hearts', 'cheeks'] }, move: ['pat', 1300], extra: ['wiggle', 900] },
    { face: { eyes: 'closed', mouth: 'smile', arms: 'rest', x: ['cheeks'] }, move: ['sit', 2600], lines: ['mmm~', 'so nice…', 'melting…'] },
    { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['hearts', 'cheeks'] }, move: ['roly', 2800], lines: ['wheee~', 'hehe!', 'again!'] },
    { face: { eyes: 'happy', mouth: 'open', arms: 'cover', x: ['cheeks'] }, move: ['shuffle', 1500], lines: ['hehe, tickles!', 'that tickles!', 'hihihi'] },
    { face: { eyes: 'closed', mouth: 'smile', arms: 'rest', x: ['hearts', 'cheeks'] }, move: ['rocksmall', 1300], lines: ['purrr~', 'right there ♡', 'more pets?'] }
  ];
  /** Fumu enjoys it: one of a few happy reactions, hearts, a purr and a line. Only a reaction; nothing counts for goals. */
  function petted() {
    if (busy) return;
    busy++;
    if (baseState() === 'sleepy') {
      // asleep: instead of a stroke it gets a goodnight kiss (app-bedtime.js)
      busy--;
      kissGoodnight();
      return;
    }
    var r = pick(PETTED);
    setFace(r.face);
    pulse(r.move[0], r.move[1]);
    if (r.extra) setTimeout(function () { pulse(r.extra[0], r.extra[1]); }, 350);
    drift(['♥', '♡', '♥'], petTop(), 3);
    sound('purr');
    buzz(10);
    talk('pet', r.lines || ['purrr~', 'mmm, nice', 'more pets?', 'hehe, tickles', '♡'], 1500);
    setTimeout(function () { busy--; if (!busy) settle(); }, Math.max(1700, r.move[1]));
  }

  window.petHim = petted;   // the ring menu's Pat (app-ring.js)
  pet.addEventListener('pointerdown', function (e) {
    stopWalk();
    down = { x: e.clientX, y: e.clientY };
    travel = 0;
    stroked = false;
  });
  pet.addEventListener('pointermove', function (e) {
    if (!down) return;   // (stroking needs the button held down, in the small window too)
    travel += Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = { x: e.clientX, y: e.clientY };
    if (travel >= STROKE_PX && Date.now() >= nextAt) {
      travel = 0;
      nextAt = Date.now() + COOLDOWN_MS;
      stroked = true;
      petted();
    }
  });
  function end() { down = null; }
  pet.addEventListener('pointerup', end);
  pet.addEventListener('pointercancel', end);
  pet.addEventListener('pointerleave', end);
  // a stroke is not also a tap
  pet.addEventListener('click', function (e) {
    if (stroked) { stroked = false; e.stopImmediatePropagation(); }
  }, true);
})();
