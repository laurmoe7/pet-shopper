// The Easter celebration (build 622): once on Easter Sunday, the first time the app is opened that day, Fumu gets bunny ears (a flower crown if he already is a bunny) and does a bouncy bunny dance
// while pastel flags hang along the top, flower petals fall, butterflies flutter by and little decorated eggs hop across the page, to a bouncy spring tune; at the end he holds out a big
// egg that wobbles, cracks open and lets a chick out. A real Easter egg (the `eastergift` day in bonuses.js) is then waiting in Profile.
// It works like the other celebrations (app-birthday.js, app-xmas.js, app-halloween.js, app-newyear.js): the hold that keeps alerts and other animations back, the toy put away and popping back
// in, the card in the app and the bubble in Mini Fumu. The others go first when they are pending the same day.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var devEaster = false, easterHold = false, easterHoldTimer = 0, easterOn = false;
/** @returns {boolean} Whether today is Easter Sunday (or the developer tool is pretending). */
function isEaster() {
  if (devEaster) return true;
  var d = giftDate(), e = Bonuses.easterOf(d.getFullYear());
  return d.getMonth() === e.getMonth() && d.getDate() === e.getDate();
}
/** @returns {boolean} Whether today's celebration has already played (or started). */
function easterDoneToday() {
  var done = '';
  try { done = localStorage.getItem('nibble-easter-done') || ''; } catch (e) { /* storage not available */ }
  return done === B.dayKey(giftDate());
}
/** @returns {boolean} Whether alerts and reminders should wait (birthdayHolding in app-birthday.js asks this too). */
function easterHolding() { return easterHold || easterOn; }
function releaseEasterHold() {
  if (!easterHold) return;
  easterHold = false;
  clearTimeout(easterHoldTimer);
  busy--;
}
/** @returns {string} "Happy Easter Name!" (in Dutch "Fijne Pasen Name!"), without the name when there is none. @param {string} name */
function easterGreeting(name) {
  var nl = typeof Lang === 'object' && Lang.get() === 'nl';
  return (nl ? 'Fijne Pasen' : 'Happy Easter') + (name ? ' ' + name : '') + '!';
}

/** Bunny ears on a pink headband, drawn in the pet's own picture beside the worn hats (so they go with him in the dance); the ears flop with every hop. A flower crown instead on a bunny, who has ears already. They come off after ms. */
function easterEars(ms) {
  var slot = pet.querySelector('.outfit-hat'), layer = slot && slot.parentNode;
  if (!layer) return;
  var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'easter-ears');
  if (pet.dataset.species === 'bunny') {
    var fl = '', cols = ['#ff9ec1', '#fffaf0', '#ffe27a', '#ffb8d9', '#fffaf0', '#ff9ec1'];
    for (var i = 0; i < 6; i++) { var fx = 63.5 + i * 6.6, fy = 38 - Math.sin((i / 5) * Math.PI) * 5; fl += '<g transform="translate(' + fx + ' ' + fy + ')"><circle r="4.4" fill="' + cols[i] + '" stroke="#5b4239" stroke-width="1.4"/><circle r="1.5" fill="#ffd36b"/></g>'; }
    g.innerHTML = '<path d="M61 40 Q80 28 99 40" fill="none" stroke="#5b9b6b" stroke-width="2.4" stroke-linecap="round"/>' + fl;
  } else {
    g.innerHTML = '<g class="easter-ear" style="transform-box:fill-box;transform-origin:50% 100%"><g transform="translate(67 38) rotate(-12)"><ellipse cx="0" cy="-17" rx="6.5" ry="18" fill="#fffaf0" stroke="#5b4239" stroke-width="2"/><ellipse cx="0" cy="-16" rx="3.2" ry="13" fill="#ffb8c6"/></g></g>' +
      '<g class="easter-ear" style="transform-box:fill-box;transform-origin:50% 100%"><g transform="translate(93 38) rotate(12)"><ellipse cx="0" cy="-17" rx="6.5" ry="18" fill="#fffaf0" stroke="#5b4239" stroke-width="2"/><ellipse cx="0" cy="-16" rx="3.2" ry="13" fill="#ffb8c6"/></g></g>' +
      '<path d="M60 41 Q80 31 100 41" fill="none" stroke="#ff9ec1" stroke-width="3.6" stroke-linecap="round"/><path d="M60 41 Q80 31 100 41" fill="none" stroke="#5b4239" stroke-width=".9" stroke-linecap="round" opacity=".5"/>' +
      '<g transform="translate(80 33)"><circle cx="-5" cy="0" r="3.2" fill="#ffe27a" stroke="#5b4239" stroke-width="1.2"/><circle cx="5" cy="0" r="3.2" fill="#ffe27a" stroke="#5b4239" stroke-width="1.2"/><circle r="2.4" fill="#ff9ec1" stroke="#5b4239" stroke-width="1.2"/></g>';
  }
  layer.appendChild(g);
  if (!reduceMotion) [].forEach.call(g.querySelectorAll('.easter-ear'), function (ear, k) {   // the ears flop with every beat of the dance (0.75 s)
    ear.animate([{ transform: 'rotate(-8deg)' }, { transform: 'rotate(11deg)' }, { transform: 'rotate(-8deg)' }], { duration: 750, delay: k * 90, iterations: Infinity, easing: 'ease-in-out' });
  });
  setTimeout(function () { if (g.parentNode) g.remove(); }, ms);
}

/** The bouncy bunny dance: the same kind of 12-beat table as the other celebrations' dances (danceCss in app-idle.js): quick little hops, bigger hops, hops forward and back, two "binkies" (a jump with a twist),
 * hops from side to side, a crouch and one huge leap. 9 s, with his arms out in front like paws. */
var EASTER_BEATS = [
  { x: -8, ay: -12, r: -5, cy: 4, up: [.88, 1.18], ld: [1.16, .84] },       // 1-2: two quick little hops
  { x: 8, ay: -12, r: 5, cy: 4, up: [.88, 1.18], ld: [1.16, .84] },
  { x: 0, ay: -22, r: 0, cy: 5, up: [.84, 1.24], ld: [1.22, .8] },          // 3-4: bigger hops
  { x: 0, ay: -22, r: 0, cy: 5, up: [.84, 1.24], ld: [1.22, .8] },
  { x: -12, ay: -18, r: -7, cy: 4, up: [.86, 1.2], ld: [1.18, .82] },       // 5-6: hop away and back
  { x: 0, ay: -18, r: 7, cy: 4, up: [.86, 1.2], ld: [1.18, .82] },
  { x: 12, ay: -28, r: 16, cy: 5, flip: 1, up: [.82, 1.26], ld: [1.22, .8] },    // 7-8: binkies, jumping with a twist
  { x: -12, ay: -28, r: -16, cy: 5, flip: 1, up: [.82, 1.26], ld: [1.22, .8] },
  { x: 10, ay: -14, r: 5, cy: 4, up: [.88, 1.18], ld: [1.16, .84] },        // 9-10: hop, hop, hop from side to side
  { x: -10, ay: -14, r: -5, cy: 4, up: [.88, 1.18], ld: [1.16, .84] },
  { x: 0, ay: 5, r: 0, cy: 7, up: [1.12, .88], ld: [1.26, .74], still: 1 },  // 11: a deep crouch...
  { x: 0, ay: -42, r: 0, cy: 3, up: [.78, 1.34], ld: [1.3, .72] }           // 12: ...and a huge leap
];
var EASTER_SQUISH = danceSquish(EASTER_BEATS);
(function () { var st = document.createElement('style'); st.id = 'easter-dance-css'; st.textContent = danceCss('bunnydance', EASTER_BEATS); document.head.appendChild(st); })();
/** Bunny dance (build 622): 9 s, hopping with his arms out in front like paws, and cheering for the binkies and the leap. */
function bunnyDance() {
  var clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]'), arms = function (a) { return clip ? 'rest' : a; };   // (his left hand holds the clipboard on the to-do list)
  setFace({ eyes: 'happy', mouth: 'smile', arms: arms('carry'), x: ['cheeks'] });
  pulse('bunnydance', 9000);
  if (!reduceMotion) svgSquish(EASTER_SQUISH);
  function at(ms, fn) { setTimeout(function () { if (pet.classList.contains('bunnydance')) fn(); }, ms); }
  at(1500, function () { setFace({ eyes: 'sparkle', mouth: 'open', arms: arms('carry'), x: ['cheeks', 'sparkles'] }); drift(['🌸', '✦'], petTop(), 2); });
  at(3000, function () { setFace({ eyes: 'happy', mouth: 'open', arms: arms('carry'), x: ['cheeks'] }); drift(['🌷', '🌸'], petTop(), 2); });
  at(5250, function () { setFace({ eyes: 'happy', mouth: 'open', arms: arms('cheer'), x: ['cheeks', 'sparkles'] }); drift(['🦋', '🌸', '✦'], petTop(), 3); });   // the binkies
  at(6750, function () { setFace({ eyes: 'happy', mouth: 'smile', arms: arms('carry'), x: ['cheeks'] }); drift(['🌷', '🦋'], petTop(), 2); });
  at(7500, function () { setFace({ eyes: 'squint', mouth: 'smile', arms: arms('carry'), x: ['cheeks'] }); });   // crouching...
  at(8250, function () { setFace({ eyes: 'open', mouth: 'open', arms: arms('cheer'), x: ['cheeks', 'sparkles'] }); drift(['🐰', '🌸', '✦', '🌷'], petTop(), 4); });   // ...and the leap!
  hum();
  return 9000;
}

/** A string of pastel flags along the top that sway a little. @param {Element} layer @param {number} ms */
function easterBunting(layer, ms) {
  var w = window.innerWidth, n = Math.max(6, Math.round(w / 40)), sx = w / n, cols = ['#ff9ec1', '#ffe27a', '#9be3c3', '#a9d4ff', '#d3b4ff'];
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), d = 'M0 1', flags = '';
  svg.setAttribute('width', w); svg.setAttribute('height', 48); svg.setAttribute('viewBox', '0 0 ' + w + ' 48');
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  for (var i = 0; i < n; i++) {
    var x0 = i * sx, bx = x0 + sx / 2;
    d += ' Q' + bx + ' 11 ' + (x0 + sx) + ' 1';
    flags += '<g class="easter-flag" style="transform-box:fill-box;transform-origin:50% 0"><path d="M' + (bx - 11) + ' 6 L' + (bx + 11) + ' 6 L' + bx + ' 28 Z" fill="' + cols[i % cols.length] + '" stroke="#5b4239" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="' + bx + '" cy="12" r="2" fill="#fffaf0" opacity=".85"/></g>';
  }
  svg.innerHTML = '<path d="' + d + '" fill="none" stroke="#5b4239" stroke-width="1.6"/>' + flags;
  layer.appendChild(svg);
  if (reduceMotion) return;
  svg.animate([{ transform: 'translateY(-55px)' }, { transform: 'translateY(0)' }], { duration: 700, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'both' });
  [].forEach.call(svg.querySelectorAll('.easter-flag'), function (f, k) { f.animate([{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(-5deg)' }], { duration: 2000 + (k * 137) % 600, delay: (k * 120) % 700, iterations: Infinity, easing: 'ease-in-out' }); });
  setTimeout(function () { svg.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-60px)' }], { duration: 600, easing: 'ease-in', fill: 'both' }); }, ms - 700);
}

/** Flower petals fall slowly over the whole page, turning as they go. @param {Element} layer @param {number} ms */
function easterPetals(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight, count = w < 500 ? 46 : 70, cols = ['#ffb8d9', '#fffaf0', '#ffd0e4', '#ffe9a8', '#e4d4ff'];
  for (var i = 0; i < count; i++) {
    var el = document.createElement('i'), sz = 7 + Math.random() * 7, x = Math.random() * w, sway = (Math.random() - 0.5) * 90, dur = 6500 + Math.random() * 3500;
    el.style.cssText = 'position:absolute;left:0;top:0;width:' + sz + 'px;height:' + sz * 0.7 + 'px;border-radius:70% 30% 70% 30%;background:' + cols[i % cols.length] + ';box-shadow:0 0 0 1px #e6a5c0';
    layer.appendChild(el);
    el.animate([
      { transform: 'translate(' + x + 'px,-20px) rotate(0deg)', opacity: 0 },
      { transform: 'translate(' + (x + sway * 0.4) + 'px,' + h * 0.1 + 'px) rotate(80deg)', opacity: 1, offset: 0.08 },
      { transform: 'translate(' + (x + sway) + 'px,' + h * 0.55 + 'px) rotate(260deg)', opacity: 1, offset: 0.6 },
      { transform: 'translate(' + (x + sway * 0.3) + 'px,' + (h + 20) + 'px) rotate(420deg)', opacity: 0.85 }
    ], { duration: dur, delay: Math.random() * Math.max(500, ms - 4000), easing: 'linear', fill: 'both' }).onfinish = el.remove.bind(el);
  }
}

/** Butterflies flutter across the page, flapping and wandering up and down. @param {Element} layer @param {number} ms */
function easterButterflies(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight, cols = [['#ffb8d9', '#ff8fb1'], ['#a9d4ff', '#6fb0f0'], ['#ffe27a', '#f0b83a'], ['#d3b4ff', '#a98be0'], ['#9be3c3', '#5fc79f']];
  for (var i = 0; i < 6; i++) {
    var c = cols[i % cols.length], el = document.createElement('span'), y = h * (0.1 + Math.random() * 0.45), left = i % 2 === 0, dur = 6500 + Math.random() * 2500;
    el.innerHTML = '<svg viewBox="0 0 30 24" width="28" height="22"><g class="bw" style="transform-box:fill-box;transform-origin:100% 50%"><path d="M15 12 Q4 0 2 8 Q1 15 15 13 Q6 17 8 21 Q13 22 15 14 Z" fill="' + c[0] + '" stroke="#5b4239" stroke-width="1.2" stroke-linejoin="round"/></g>' +
      '<g class="bw" style="transform-box:fill-box;transform-origin:0% 50%"><path d="M15 12 Q26 0 28 8 Q29 15 15 13 Q24 17 22 21 Q17 22 15 14 Z" fill="' + c[0] + '" stroke="#5b4239" stroke-width="1.2" stroke-linejoin="round"/></g>' +
      '<ellipse cx="15" cy="13" rx="1.5" ry="5" fill="#5b4239"/><circle cx="12" cy="13" r="1.4" fill="' + c[1] + '"/><circle cx="18" cy="13" r="1.4" fill="' + c[1] + '"/></svg>';
    el.style.cssText = 'position:absolute;left:0;top:0;line-height:0';
    layer.appendChild(el);
    var x0 = left ? -40 : w + 40, x1 = left ? w + 40 : -40;
    el.animate([
      { transform: 'translate(' + x0 + 'px,' + y + 'px)' },
      { transform: 'translate(' + (x0 + (x1 - x0) * 0.25) + 'px,' + (y - 40) + 'px)', offset: 0.25 },
      { transform: 'translate(' + (x0 + (x1 - x0) * 0.5) + 'px,' + (y + 30) + 'px)', offset: 0.5 },
      { transform: 'translate(' + (x0 + (x1 - x0) * 0.75) + 'px,' + (y - 30) + 'px)', offset: 0.75 },
      { transform: 'translate(' + x1 + 'px,' + (y + 10) + 'px)' }
    ], { duration: dur, delay: 500 + i * ((ms - 8500) / 6), easing: 'ease-in-out', fill: 'both' }).onfinish = el.remove.bind(el);
    [].forEach.call(el.querySelectorAll('.bw'), function (wg) { wg.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(.25)' }, { transform: 'scaleX(1)' }], { duration: 320, iterations: Infinity, easing: 'ease-in-out' }); });
  }
}

var EASTER_EGGS = [   // decorated eggs with little faces: [base colour, pattern colour, pattern]
  ['#ffb8d9', '#fffaf0', 'zig'], ['#a9d4ff', '#ffe27a', 'dots'], ['#9be3c3', '#fffaf0', 'bands'], ['#ffe27a', '#ff9ec1', 'zig'], ['#d3b4ff', '#fffaf0', 'dots'], ['#ffd0a8', '#9be3c3', 'bands']
];
/** @returns {string} A decorated egg with a cute face. @param {string[]} e One of EASTER_EGGS. */
function easterEggSvg(e) {
  var pat = e[2] === 'zig' ? '<path d="M6 24 L10 20 L14 24 L18 20 L22 24" fill="none" stroke="' + e[1] + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'
    : e[2] === 'dots' ? '<circle cx="9" cy="9" r="1.8" fill="' + e[1] + '"/><circle cx="19" cy="12" r="1.8" fill="' + e[1] + '"/><circle cx="11" cy="27" r="1.8" fill="' + e[1] + '"/><circle cx="20" cy="26" r="1.8" fill="' + e[1] + '"/>'
    : '<path d="M4 25 H24 M5 28.5 H23" stroke="' + e[1] + '" stroke-width="2.2" stroke-linecap="round"/>';
  return '<svg viewBox="0 0 28 34" width="26" height="32"><path d="M14 2 Q3 10 3 22 Q3 32 14 32 Q25 32 25 22 Q25 10 14 2 Z" fill="' + e[0] + '" stroke="#5b4239" stroke-width="1.8" stroke-linejoin="round"/>' + pat +
    '<circle cx="10.4" cy="17" r="1.3" fill="#5b4239"/><circle cx="17.6" cy="17" r="1.3" fill="#5b4239"/><path d="M11.6 20.6 Q14 22.6 16.4 20.6" fill="none" stroke="#5b4239" stroke-width="1.3" stroke-linecap="round"/></svg>';
}
/** Little decorated eggs hop across the page one after another, squashing as they land. @param {Element} layer @param {number} ms */
function easterEggs(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight, ground = h - 190;
  EASTER_EGGS.forEach(function (e, i) {
    var el = document.createElement('span'), left = i % 2 === 0, hops = 8, frames = [], x0 = left ? -40 : w + 40, x1 = left ? w + 40 : -40, dur = 5200 + Math.random() * 1400;
    el.innerHTML = easterEggSvg(e);
    el.style.cssText = 'position:absolute;left:0;top:0;line-height:0;transform-origin:50% 100%';
    layer.appendChild(el);
    var gy = ground - (i % 3) * 22;
    frames.push({ transform: 'translate(' + x0 + 'px,' + gy + 'px) scale(1,1)', offset: 0 });
    for (var k = 0; k < hops; k++) {
      var a = k / hops, b = (k + 1) / hops, xm = x0 + (x1 - x0) * (a + (b - a) * 0.5), xe = x0 + (x1 - x0) * b;
      frames.push({ transform: 'translate(' + (x0 + (x1 - x0) * (a + (b - a) * 0.15)) + 'px,' + (gy + 3) + 'px) scale(1.15,.82)', offset: a + (b - a) * 0.12 });
      frames.push({ transform: 'translate(' + xm + 'px,' + (gy - 34) + 'px) scale(.92,1.12)', offset: a + (b - a) * 0.5 });
      frames.push({ transform: 'translate(' + xe + 'px,' + gy + 'px) scale(1.18,.8)', offset: Math.min(0.999, a + (b - a) * 0.92) });
    }
    frames.push({ transform: 'translate(' + x1 + 'px,' + gy + 'px) scale(1,1)', offset: 1 });
    el.animate(frames, { duration: dur, delay: 500 + i * ((ms - 7500) / EASTER_EGGS.length), easing: 'ease-in-out', fill: 'both' }).onfinish = el.remove.bind(el);
  });
}

/** The app: a card slides up from the bottom, above the bottom bar (a pink and mint one). @param {Element} layer @param {string} name */
function easterBanner(layer, name) {
  var banner = document.createElement('div');
  banner.style.cssText = 'position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom, 0px) + 92px);margin:0 auto;width:90%;max-width:360px;box-sizing:border-box;padding:10px 14px;border-radius:18px;background:#fffaf0;color:#5b4239;' +
    'border:2.5px solid #ff9ec1;box-shadow:0 4px 0 #9be3c3;text-align:center;font-weight:700;font-size:17px';
  banner.textContent = '🐰 ' + easterGreeting(name) + ' 🐣';
  layer.appendChild(banner);
  if (!reduceMotion) banner.animate([{ transform: 'translateY(110px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1, offset: 0.85 }, { transform: 'translateY(110px)', opacity: 0 }], { duration: 8000, fill: 'both' });
}

/** The end of the party: he holds out a big pastel egg; it wobbles, cracks open in the last second and a little chick pops out and peeps; then a real Easter egg is waiting in Profile. @returns {number} How long it takes, in ms. */
function easterHatch() {
  var egg = document.createElement('span'), clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]');
  egg.className = 'bday-cake easter-egg';   // (the same spot in front of his tummy as the birthday cake)
  egg.setAttribute('aria-hidden', 'true');
  egg.style.cssText = 'width:64px;height:60px';
  egg.innerHTML = '<svg viewBox="0 0 64 60" width="64" height="60" style="overflow:visible"><g class="egg-chick" opacity="0"><ellipse cx="32" cy="34" rx="12" ry="11" fill="#ffe27a" stroke="#5b4239" stroke-width="1.8"/>' +
    '<circle cx="28" cy="31" r="1.5" fill="#5b4239"/><circle cx="36" cy="31" r="1.5" fill="#5b4239"/><path d="M30.4 34 L32 36.4 L33.6 34 Z" fill="#ff9a3c" stroke="#5b4239" stroke-width="1" stroke-linejoin="round"/><ellipse cx="25" cy="35" rx="2.4" ry="1.4" fill="#ffaab8" opacity=".8"/><ellipse cx="39" cy="35" rx="2.4" ry="1.4" fill="#ffaab8" opacity=".8"/>' +
    '<path d="M30 23 Q32 18 34 23" fill="none" stroke="#5b4239" stroke-width="1.6" stroke-linecap="round"/></g>' +
    '<path d="M10 36 L18 31 L24 36 L32 31 L40 36 L46 31 L54 36 Q56 55 32 57 Q8 55 10 36 Z" fill="#ffb8d9" stroke="#5b4239" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M12 46 Q32 52 52 46" fill="none" stroke="#fffaf0" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 6"/>' +
    '<g class="egg-lid"><path d="M10 36 L18 31 L24 36 L32 31 L40 36 L46 31 L54 36 Q56 14 32 4 Q8 14 10 36 Z" fill="#ffb8d9" stroke="#5b4239" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M16 22 L22 17 L28 22 L34 17 L40 22 L46 17" fill="none" stroke="#fffaf0" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="22" cy="28" r="2" fill="#fffaf0"/><circle cx="42" cy="28" r="2" fill="#fffaf0"/></g></svg>';
  pet.appendChild(egg);
  setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
  sound('sparkle');
  say('an egg for you! ♡', 2600);
  if (!reduceMotion) {
    egg.animate([{ transform: 'translateY(26px) scale(.4)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'both' });
    pulse('hopsmall', 450);
  }
  setTimeout(function () { say('there is one in your Profile too~', 2000); }, 2800);
  setTimeout(function () {   // it starts to wobble...
    if (!egg.parentNode || reduceMotion) return;
    egg.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-9deg)' }, { transform: 'rotate(9deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0deg)' }], { duration: 800, delay: 0, easing: 'ease-in-out' });
  }, 3300);
  setTimeout(function () {   // the last second: crack! the lid jumps off and a chick pops out
    if (!egg.parentNode) return;
    setFace({ eyes: 'open', mouth: 'o', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'sparkles'] });
    sound('peep');
    say('peep!', 1600);
    var r = egg.getBoundingClientRect();
    drift(['🐣', '✦', '🌸', '✦'], { x: r.left + r.width / 2, y: r.top }, 4);
    var lid = egg.querySelector('.egg-lid'), chick = egg.querySelector('.egg-chick');
    if (lid && !reduceMotion) lid.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(-8px,-26px) rotate(-30deg)', opacity: 1, offset: 0.5 }, { transform: 'translate(-20px,-8px) rotate(-60deg)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'both' }); else if (lid) lid.setAttribute('opacity', '0');
    if (chick) { if (!reduceMotion) chick.animate([{ transform: 'translateY(18px) scale(.6)', opacity: 0 }, { transform: 'translateY(-12px) scale(1.1)', opacity: 1, offset: 0.6 }, { transform: 'translateY(-6px) scale(1)', opacity: 1 }], { duration: 600, delay: 120, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'both' }); else chick.setAttribute('opacity', '1'); }
  }, 4200);
  setTimeout(function () {
    if (!egg.parentNode) return;
    setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
    if (reduceMotion) { egg.remove(); return; }
    egg.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(12px) scale(.6)' }], { duration: 500, easing: 'ease-in', fill: 'both' }).onfinish = function () { egg.remove(); };
  }, 5200);
  setTimeout(function () { refreshGift(); showToast('🐣', 'An Easter egg is waiting in Profile!', true, 4200); }, 5200);   // (the real one: bonuses.js, the eastergift day)
  return 5800;
}

/** Plays the celebration once (the app's or Mini Fumu's). @returns {boolean} Whether it started. */
function easterParty() {
  if (easterOn || bdayHold || partyOn || (typeof xmasHolding === 'function' && xmasHolding()) || (typeof halloweenHolding === 'function' && halloweenHolding()) || (typeof newyearHolding === 'function' && newyearHolding()) || (!devEaster && (busy - celebrationHolds() > 0 || baseState() === 'sleepy'))) return false;
  easterOn = true;
  var small = document.documentElement.classList.contains('desktop-pet'), name = state.player.name;
  busy++;
  bdayToyAway(true);
  releaseEasterHold();
  if (pet.dataset.state === 'sleepy') pet.dataset.state = 'happy';   // (the developer tool wakes him)
  sound('easter');   // (the bouncy tune: about 15 s, the length of the whole celebration)
  easterEars(14500);
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });
  if (small) say(easterGreeting(name) + ' ♡', 3200, true); else say('happy easter! ♡', 3000);   // (the app's card already says it)
  pulse('hop', 500);
  var ms = bunnyDance(), total = ms + 5800, layer = bdayLayer(9000);
  if (!small) easterBanner(layer, name);   // (first, so everything else is drawn over the card)
  easterBunting(layer, total);
  easterPetals(layer, total);
  easterButterflies(layer, total);
  easterEggs(layer, total);
  setTimeout(function () { drift(['🌸', '🌷', '🐰'], petTop(), 4); }, 1500);
  setTimeout(function () { say('hop hop hop~', 1800); }, 3600);
  setTimeout(function () { say('bunny hops!', 2000); }, 6000);
  setTimeout(function () { layer.remove(); }, total + 800);
  setTimeout(function () { var more = easterHatch(); setTimeout(function () { easterOn = false; busy--; bdayToyAway(false); if (!busy) settle(); }, more); }, ms + 300);   // (the dance, then the egg)
  return true;
}
/** Starts it once, on Easter Sunday, when he is awake and not busy (the other celebrations go first when they are pending). */
function easterCheck() {
  if (!isEaster()) return;
  if (easterDoneToday() && !devEaster) return;
  if (document.hidden || document.querySelector('dialog[open]')) return;
  if (bdayHold || partyOn || (typeof xmasHolding === 'function' && xmasHolding()) || (typeof halloweenHolding === 'function' && halloweenHolding()) || (typeof newyearHolding === 'function' && newyearHolding())) return;
  if (!easterParty()) return;
  try { localStorage.setItem('nibble-easter-done', B.dayKey(giftDate())); } catch (e) { /* storage not available */ }
}
/** Developer tool: pretends it is Easter and plays the celebration now. @returns {string} */
function devEasterNow() {
  devEaster = true;
  if (!easterParty()) { devEaster = false; return 'He is busy or asleep: try again in a moment.'; }
  setTimeout(function () { devEaster = false; }, 9000);
  return document.documentElement.classList.contains('desktop-pet') ? 'Mini Fumu\'s Easter: bunny ears, the bunny dance, butterflies, hopping eggs and a chick. The Easter egg is in Profile on Easter Sunday only.' : 'The app\'s Easter: a card, bunny ears, the bunny dance, flags, petals, butterflies, hopping eggs and a chick. The Easter egg is in Profile on Easter Sunday only.';
}
// the first time the app is opened on Easter Sunday the celebration comes first, like the others (the hold keeps everything else back, for at most 60 s)
if (isEaster() && !easterDoneToday()) { easterHold = true; busy++; bdayToyAway(true); easterHoldTimer = setTimeout(function () { if (!easterHold) return; releaseEasterHold(); if (!easterOn && !bdayHold && !partyOn) bdayToyAway(false); if (!busy) settle(); }, 60000); }
var easterTry = setInterval(function () { if (!easterHold) { clearInterval(easterTry); return; } easterCheck(); }, 1000);
setInterval(easterCheck, 60000);
