// Petting: stroke Nibble with a finger or the mouse for a purr and hearts.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

(function () {
  var STROKE_PX = 90;      // how far a finger has to travel to count as a stroke
  var COOLDOWN_MS = 2200;  // so it can't be spammed
  var down = null, travel = 0, nextAt = 0, stroked = false;

  /** Nibble enjoys it: hearts, a purr and a line. Only a reaction; nothing counts for goals. */
  function petted() {
    if (busy) return;
    busy++;
    setFace({ eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['hearts', 'cheeks'] });
    sound('purr');
    buzz(10);
    talk('pet', ['purrr~', 'mmm, nice', 'more pets?', 'hehe, tickles', '♡'], 1500);
    setTimeout(function () { busy--; if (!busy) settle(); }, 1700);
  }

  pet.addEventListener('pointerdown', function (e) {
    down = { x: e.clientX, y: e.clientY };
    travel = 0;
    stroked = false;
  });
  pet.addEventListener('pointermove', function (e) {
    if (!down) return;
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
