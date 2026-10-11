// The New Year's Day celebration (build 619): once on 1 January, the first time the app is opened that day, Fumu puts on a gold party hat and does a disco dance under a spinning disco ball
// that throws coloured light spots round the page, to a disco groove; at the end he takes out a party blower and toots it three times, the last one a big one that shoots out confetti.
// It works like the birthday, Christmas and Halloween celebrations (app-birthday.js, app-xmas.js, app-halloween.js): the hold that keeps alerts and other animations back, the toy put away and popping
// back in, the banner in the app and the bubble in Mini Fumu. The others go first when they are pending the same day.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var devNewYear = false, newyearHold = false, newyearHoldTimer = 0, newyearOn = false;
/** @returns {boolean} Whether today is 1 January (or the developer tool is pretending). */
function isNewYear() {
  if (devNewYear) return true;
  var d = giftDate();
  return d.getMonth() === 0 && d.getDate() === 1;
}
/** @returns {boolean} Whether today's celebration has already played (or started). */
function newyearDoneToday() {
  var done = '';
  try { done = localStorage.getItem('nibble-newyear-done') || ''; } catch (e) { /* storage not available */ }
  return done === B.dayKey(giftDate());
}
/** @returns {boolean} Whether alerts and reminders should wait (birthdayHolding in app-birthday.js asks this too). */
function newyearHolding() { return newyearHold || newyearOn; }
function releaseNewyearHold() {
  if (!newyearHold) return;
  newyearHold = false;
  clearTimeout(newyearHoldTimer);
  busy--;
}
/** @returns {string} "Happy New Year Name!" (in Dutch "Gelukkig nieuwjaar Name!"), without the name when there is none. @param {string} name */
function newyearGreeting(name) {
  var nl = typeof Lang === 'object' && Lang.get() === 'nl';
  return (nl ? 'Gelukkig nieuwjaar' : 'Happy New Year') + (name ? ' ' + name : '') + '!';
}

/** A gold party hat with blue stripes and a star on top, drawn in the pet's own picture beside the worn hats so it goes with him in the dance; it comes off after ms. */
function newyearHat(ms) {
  var slot = pet.querySelector('.outfit-hat'), layer = slot && slot.parentNode;
  if (!layer) return;
  var hat = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hat.setAttribute('class', 'newyear-hat');
  hat.innerHTML = '<g transform="translate(83 37) rotate(-4)"><path d="M0 -30 L15 0 Q0 5 -15 0 Z" fill="#ffd36b" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M-8 -12 L8 -12 M-12 -5 L12 -5" stroke="#3fa7ff" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M0 -41 l2.2 4.6 5 .6 -3.7 3.4 1 5 -4.5 -2.5 -4.5 2.5 1 -5 -3.7 -3.4 5 -.6z" fill="#fff6ec" stroke="#5b4239" stroke-width="1.6" stroke-linejoin="round" transform="translate(0 6)"/></g>';
  layer.appendChild(hat);
  setTimeout(function () { if (hat.parentNode) hat.remove(); }, ms);
}

/** The disco dance: the same kind of 12-beat table as the Halloween one (see danceCss in app-idle.js): hip sways with the famous pointing arms, hustle steps, a spin, big bounces with his arms up, a crouch and one huge jump. 9 s. */
var DISCO_BEATS = [
  { x: -10, ay: -6, r: -8, cy: 3, up: [.94, 1.07], ld: [1.1, .92] },    // 1-4: hip sways, pointing up and down
  { x: 10, ay: -6, r: 8, cy: 3, up: [.94, 1.07], ld: [1.1, .92] },
  { x: -10, ay: -6, r: -8, cy: 3, up: [.94, 1.07], ld: [1.1, .92] },
  { x: 10, ay: -6, r: 8, cy: 3, up: [.94, 1.07], ld: [1.1, .92] },
  { x: -16, ay: -12, r: -6, cy: 3, up: [.9, 1.12], ld: [1.14, .88] },   // 5-6: the hustle, bigger steps
  { x: 16, ay: -12, r: 6, cy: 3, up: [.9, 1.12], ld: [1.14, .88] },
  { x: 0, ay: -18, r: 0, cy: 3, flip: 1, up: [.9, 1.16], ld: [1.16, .86] },   // 7-8: spinning
  { x: 0, ay: -18, r: 0, cy: 3, flip: 1, up: [.9, 1.16], ld: [1.16, .86] },
  { x: 0, ay: -22, r: 0, cy: 4, up: [.86, 1.2], ld: [1.2, .8] },        // 9-10: big bounces, arms up
  { x: 0, ay: -22, r: 0, cy: 4, up: [.86, 1.2], ld: [1.2, .8] },
  { x: 0, ay: 5, r: 0, cy: 7, up: [1.12, .88], ld: [1.26, .74], still: 1 },   // 11: down...
  { x: 0, ay: -40, r: 0, cy: 3, up: [.8, 1.32], ld: [1.28, .74] }       // 12: and one huge jump
];
var DISCO_SQUISH = danceSquish(DISCO_BEATS);
(function () { var st = document.createElement('style'); st.id = 'disco-dance-css'; st.textContent = danceCss('discodance', DISCO_BEATS); document.head.appendChild(st); })();
/** Disco dance (build 619): 9 s, with the disco-pointing arm pose (`disco`, styles.css) for the first half. */
function discoDance() {
  var clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]'), arms = function (a) { return clip ? 'rest' : a; };   // (his left hand holds the clipboard on the to-do list)
  setFace({ eyes: 'happy', mouth: 'open', arms: arms('disco'), x: ['cheeks', 'sparkles'] });
  pulse('discodance', 9000);
  if (!reduceMotion) svgSquish(DISCO_SQUISH);
  function at(ms, fn) { setTimeout(function () { if (pet.classList.contains('discodance')) fn(); }, ms); }
  at(1500, function () { drift(['✦', '♪'], petTop(), 2); });
  at(3000, function () { setFace({ eyes: 'sparkle', mouth: 'open', arms: arms('disco'), x: ['cheeks'] }); drift(['♫', '✦'], petTop(), 2); });
  at(4500, function () { setFace({ eyes: 'happy', mouth: 'open', arms: arms('disco'), x: ['cheeks', 'sparkles'] }); drift(['✨', '♪'], petTop(), 2); });
  at(6000, function () { setFace({ eyes: 'happy', mouth: 'open', arms: arms('cheer'), x: ['cheeks'] }); drift(['✦', '🎉', '♫'], petTop(), 3); });
  at(7500, function () { setFace({ eyes: 'squint', mouth: 'smile', arms: arms('cheer'), x: ['cheeks'] }); });   // down...
  at(8250, function () { setFace({ eyes: 'open', mouth: 'open', arms: arms('cheer'), x: ['cheeks', 'sparkles'] }); drift(['🎉', '✦', '✨', '✦'], petTop(), 4); });   // ...and up!
  hum();
  return 9000;
}

/** The disco ball: it drops in from the top on its string, sways, and spins; round it the light spots it throws sweep right across the page. @param {Element} layer @param {number} ms */
function newyearDiscoBall(layer, ms) {
  var w = window.innerWidth, cx = Math.max(62, Math.round(w * 0.2)), cy = 70, R = 30;   // (hanging off to the left, clear of him and of his speech bubble)
  var ball = document.createElement('div');
  ball.style.cssText = 'position:absolute;left:' + (cx - 40) + 'px;top:-10px;width:80px;height:100px;transform-origin:50% 0';
  var cells = '', k = 0, shades = ['#f4f7fd', '#cdd6ea', '#ffffff', '#aebbdc', '#e3e9f6', '#9fb0d8'];
  for (var yy = 0; yy < 60; yy += 6) for (var xx = 0; xx < 96; xx += 6) { cells += '<rect x="' + xx + '" y="' + yy + '" width="5.2" height="5.2" fill="' + shades[(k * 7 + (k >> 3) * 3) % shades.length] + '"/>'; k++; }
  ball.innerHTML = '<svg viewBox="0 0 80 100" width="80" height="100" style="overflow:visible"><defs><clipPath id="nyClip"><circle cx="40" cy="' + (cy - 10 + 18) + '" r="' + R + '"/></clipPath>' +
    '<radialGradient id="nyShade" cx="38%" cy="34%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#4d5a86" stop-opacity=".55"/></radialGradient></defs>' +
    '<path d="M40 -60 V' + (cy - 10 + 18 - R) + '" stroke="#5b4239" stroke-width="2"/><rect x="36" y="' + (cy - 10 + 18 - R - 6) + '" width="8" height="7" rx="2" fill="#ffd36b" stroke="#5b4239" stroke-width="1.6"/>' +
    '<g clip-path="url(#nyClip)"><g class="ny-facets" transform="translate(-6 ' + (cy - 10 + 18 - R) + ')">' + cells + '</g><circle cx="40" cy="' + (cy - 10 + 18) + '" r="' + R + '" fill="url(#nyShade)"/></g>' +
    '<circle cx="40" cy="' + (cy - 10 + 18) + '" r="' + R + '" fill="none" stroke="#5b4239" stroke-width="2"/>' +
    '<path class="ny-twinkle" d="M24 ' + (cy - 10 + 5) + ' l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6z" fill="#fff" stroke="#5b4239" stroke-width=".9"/><path class="ny-twinkle" d="M60 ' + (cy - 10 + 22) + ' l1.3 2.7 2.7 1.3 -2.7 1.3 -1.3 2.7 -1.3 -2.7 -2.7 -1.3 2.7 -1.3z" fill="#fff" stroke="#5b4239" stroke-width=".8"/></svg>';
  layer.appendChild(ball);
  // the light spots: they sit on circles round the ball and the whole set turns, so they sweep across the page like the real thing
  var spots = document.createElement('div'), pal = ['#ff8fb1', '#8fd3ff', '#ffe27a', '#b69cff', '#9be3a8', '#ffffff', '#ff9f7a'];
  spots.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + (cy + 8) + 'px;width:0;height:0';
  for (var i = 0; i < 22; i++) {
    var a = Math.random() * Math.PI * 2, r = 70 + Math.random() * Math.min(520, Math.max(w, 700) * 0.6), sz = 16 + Math.random() * 30, col = pal[i % pal.length], sp = document.createElement('i');
    sp.style.cssText = 'position:absolute;left:' + (Math.cos(a) * r - sz / 2) + 'px;top:' + (Math.sin(a) * r - sz / 2) + 'px;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:radial-gradient(circle,' + col + 'dd 0%,' + col + '66 45%,transparent 72%);opacity:.85';
    spots.appendChild(sp);
    if (!reduceMotion) sp.animate([{ opacity: .35, transform: 'scale(.8)' }, { opacity: .95, transform: 'scale(1.15)' }, { opacity: .35, transform: 'scale(.8)' }], { duration: 900 + (i * 211) % 700, delay: (i * 97) % 500, iterations: Infinity, easing: 'ease-in-out' });
  }
  layer.insertBefore(spots, ball);
  if (reduceMotion) return;
  spots.animate([{ transform: 'rotate(0deg)', opacity: 0 }, { transform: 'rotate(90deg)', opacity: 1, offset: 0.08 }, { transform: 'rotate(' + (ms / 1000 * 40) + 'deg)', opacity: 1, offset: 0.93 }, { transform: 'rotate(' + (ms / 1000 * 44) + 'deg)', opacity: 0 }], { duration: ms, easing: 'linear', fill: 'both' });
  ball.animate([{ transform: 'translateY(-130px) rotate(0deg)' }, { transform: 'translateY(8px) rotate(2deg)', offset: 0.08 }, { transform: 'translateY(0) rotate(-3deg)', offset: 0.14 }], { duration: 900, easing: 'ease-out', fill: 'both' }).onfinish = function () {
    ball.animate([{ transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(-3deg)' }], { duration: 3200, iterations: Infinity, easing: 'ease-in-out' });
  };
  var facets = ball.querySelector('.ny-facets');
  if (facets) facets.animate([{ transform: 'translate(-6px,' + (cy - 10 + 18 - R) + 'px)' }, { transform: 'translate(-30px,' + (cy - 10 + 18 - R) + 'px)' }], { duration: 1600, iterations: Infinity, easing: 'linear' });   // (the mirrors turn: the pattern repeats every 24 px)
  [].forEach.call(ball.querySelectorAll('.ny-twinkle'), function (t, q) { t.animate([{ opacity: 1 }, { opacity: .15 }, { opacity: 1 }], { duration: 900, delay: q * 350, iterations: Infinity, easing: 'ease-in-out' }); });
  setTimeout(function () { ball.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-150px)' }], { duration: 700, easing: 'ease-in', fill: 'both' }); }, ms - 800);
}

/** The app: a banner slides up from the bottom, above the bottom bar, so it never covers Fumu (a gold and blue one). @param {Element} layer @param {string} name */
function newyearBanner(layer, name) {
  var banner = document.createElement('div');
  banner.style.cssText = 'position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom, 0px) + 92px);margin:0 auto;width:90%;max-width:360px;box-sizing:border-box;padding:10px 14px;border-radius:18px;background:#fffaf0;color:#3a3560;' +
    'border:2.5px solid #ffc83a;box-shadow:0 4px 0 #3fa7ff;text-align:center;font-weight:700;font-size:17px';
  banner.textContent = '🎉 ' + newyearGreeting(name) + ' 🥳';
  layer.appendChild(banner);
  if (!reduceMotion) banner.animate([{ transform: 'translateY(110px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1, offset: 0.85 }, { transform: 'translateY(110px)', opacity: 0 }], { duration: 8000, fill: 'both' });
}

/** Confetti and a few streamers shot out of the blower's tip, which fall in a curve. @param {{x: number, y: number}} at @param {number} n How many pieces. */
function newyearPuff(at, n) {
  if (reduceMotion) return;
  var layer = bdayLayer(9000), cols = ['#ff8fb1', '#ffd36b', '#8fd3ff', '#b69cff', '#9be3a8', '#ff9f7a'];
  for (var i = 0; i < n; i++) {
    var el = document.createElement('i'), ang = -0.5 + Math.random() * 1.0 - 0.15, sp = 90 + Math.random() * 190, streamer = i % 5 === 0, dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp * 0.9;
    el.style.cssText = 'position:absolute;left:' + at.x + 'px;top:' + at.y + 'px;' + (streamer ? 'width:3px;height:' + (22 + Math.random() * 18) + 'px;border-radius:2px;' : 'width:' + (6 + Math.random() * 5) + 'px;height:' + (9 + Math.random() * 6) + 'px;border-radius:2px;') + 'background:' + cols[i % cols.length];
    layer.appendChild(el);
    el.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + dx * 0.7 + 'px,' + dy * 0.7 + 'px) rotate(' + (200 + Math.random() * 300) + 'deg)', opacity: 1, offset: 0.35 },
      { transform: 'translate(' + dx + 'px,' + (dy + 150 + Math.random() * 120) + 'px) rotate(' + (500 + Math.random() * 400) + 'deg)', opacity: 0.9 }
    ], { duration: 1500 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'both' });
  }
  setTimeout(function () { layer.remove(); }, 2900);
}

/** The end of the party: he takes out a party blower and toots it three times, the last time a big one that shoots out confetti. @returns {number} How long it takes, in ms. */
function newyearBlower() {
  var blower = document.createElement('span'), clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]');
  blower.className = 'ny-blower';
  blower.setAttribute('aria-hidden', 'true');
  blower.style.cssText = 'position:absolute;left:50%;top:47%;width:70px;height:26px;margin-left:2px;z-index:6;pointer-events:none;transform-origin:0 50%';
  blower.innerHTML = '<svg viewBox="0 0 70 26" width="70" height="26" style="overflow:visible"><rect x="0" y="9" width="9" height="8" rx="3" fill="#ffb8c6" stroke="#5b4239" stroke-width="1.6"/>' +
    '<g class="ny-tube" style="transform-box:fill-box;transform-origin:0% 50%"><path d="M8 13 H60 Q68 13 68 8 Q68 3 62 3 H59" fill="none" stroke="#5b4239" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 13 H60 Q68 13 68 8 Q68 3 62 3 H59" fill="none" stroke="#fff6ec" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M8 13 H60 Q68 13 68 8 Q68 3 62 3 H59" fill="none" stroke="#ff5a8a" stroke-width="6" stroke-linecap="butt" stroke-dasharray="5 5"/></g></svg>';
  pet.appendChild(blower);
  var tube = blower.querySelector('.ny-tube');
  if (tube && !reduceMotion) tube.style.transform = 'scaleX(.22)';
  setFace({ eyes: 'happy', mouth: 'o', arms: clip ? 'rest' : 'hold', x: ['cheeks'] });   // (mouth open round: the blower is held in it)
  toMouth();
  sound('sparkle');
  say('happy new year!', 2400);
  if (!reduceMotion) { blower.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 450, easing: 'ease-out', fill: 'both' }); pulse('hopsmall', 450); }
  /** Moves the blower so its mouthpiece is in his mouth, whatever he is: the beak on a bird, the little round mouth on the others (found from the drawing as it is drawn now, so every species and skin works). */
  function toMouth() {
    var pr = pet.getBoundingClientRect(), found = null, list = pet.classList.contains('beaked') ? pet.querySelectorAll('[class*="beak"]') : pet.querySelectorAll('[data-mouth="o"]');
    [].forEach.call(list, function (el) { var r = el.getBoundingClientRect(); if (!found && r.width > 0 && r.height > 0) found = r; });
    if (!found) return;   // (not drawn: keep where it is)
    blower.style.left = (found.left + found.width / 2 - pr.left - 4) + 'px';
    blower.style.top = (found.top + found.height / 2 - pr.top - 13) + 'px';
    blower.style.marginLeft = '0';
  }
  /** One toot: the paper tube unrolls with a squeak and rolls back up; `big` ones last longer and shoot out confetti. */
  function toot(big) {
    if (!blower.parentNode) return;
    setFace({ eyes: 'closed', mouth: 'o', arms: clip ? 'rest' : 'hold', x: ['cheeks', 'sparkles'] });
    toMouth();
    sound(big ? 'blowerbig' : 'blower');
    if (tube && !reduceMotion) {
      var d = big ? 900 : 480;
      tube.animate([{ transform: 'scaleX(.22)' }, { transform: 'scaleX(1)', offset: 0.28 }, { transform: 'scaleX(1)', offset: big ? 0.8 : 0.6 }, { transform: 'scaleX(.22)' }], { duration: d, easing: 'ease-out' });
      setTimeout(function () { var r = tube.getBoundingClientRect(); newyearPuff({ x: r.right - 2, y: r.top + r.height / 2 }, big ? 46 : 16); }, d * 0.26);
    }
    if (big) { var r0 = pet.getBoundingClientRect(); drift(['🎉', '✦', '🥳', '✦'], { x: r0.left + r0.width / 2, y: r0.top }, 4); }
    setTimeout(function () { if (blower.parentNode) { setFace({ eyes: 'happy', mouth: 'o', arms: clip ? 'rest' : 'hold', x: ['cheeks', 'hearts'] }); toMouth(); } }, big ? 1000 : 560);
  }
  setTimeout(function () { toot(false); }, 800);
  setTimeout(function () { toot(false); }, 1700);
  setTimeout(function () { toot(true); say('woo hoo~', 1800); }, 2800);
  setTimeout(function () {
    if (!blower.parentNode) return;
    if (reduceMotion) { blower.remove(); return; }
    blower.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.4)' }], { duration: 450, easing: 'ease-in', fill: 'both' }).onfinish = function () { blower.remove(); };
  }, 5100);
  return 5800;
}

/**
 * The New Year's fireworks for the end of the celebration (build 627), unlike the birthday ones (rockets, glowing streaks, rings and hearts in party colours): these are gold and silver. A golden "willow"
 * bursts with long trails that droop and fall, a "crossette" whose sparks split in two at the end of their flight, and a silver and ice-blue "palm" of glittering stars; every burst leaves a
 * crackle of tiny gold glitter twinkling in the air, and the last one is a volley of three at once. They go off away from him, over the cards. @param {number} ms How long to keep launching them.
 */
function newyearFireworks(ms) {
  if (reduceMotion) return;
  var layer = bdayLayer(9500), w = window.innerWidth, h = window.innerHeight, reach = Math.max(54, Math.min(w, h) * 0.3), n = 0;
  var GOLD = ['#ffc83a', '#ffe27a', '#fff3b8'], SILVER = ['#fffaf0', '#cfe6ff', '#8fd3ff'];
  function spot() {
    var r = pet.getBoundingClientRect(), best = null, bestD = -1;
    for (var i = 0; i < 14; i++) {
      var x = w * (0.12 + Math.random() * 0.76), y = h * (0.1 + Math.random() * 0.5), dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom), d = Math.hypot(dx, dy);
      if (d >= reach * 0.9) return [x, y];
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    return best;
  }
  function el(css) { var e = document.createElement('i'); e.style.cssText = 'position:absolute;' + css; layer.appendChild(e); return e; }
  function glow(cx, cy, col) {
    var g = el('left:' + (cx - reach * 0.55) + 'px;top:' + (cy - reach * 0.55) + 'px;width:' + reach * 1.1 + 'px;height:' + reach * 1.1 + 'px;border-radius:50%;background:radial-gradient(circle,' + col + '77 0%,' + col + '22 45%,transparent 70%)');
    g.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.15)' }], { duration: 1700, easing: 'ease-out', fill: 'both' }).onfinish = function () { g.remove(); };
  }
  function glitter(cx, cy, k) {   // a crackle of tiny gold glitter that twinkles on and off in the air and drifts down
    for (var i = 0; i < k; i++) {
      var a = Math.random() * Math.PI * 2, d = reach * (0.25 + Math.random() * 0.85), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      var g = el('left:' + (x - 2) + 'px;top:' + (y - 2) + 'px;width:4px;height:4px;border-radius:50%;background:#ffe27a;box-shadow:0 0 0 1px #fffaf0,0 0 6px 1px #ffc83a');
      var fall = reach * (0.3 + Math.random() * 0.5), tw = [];
      for (var q = 0; q < 6; q++) tw.push({ opacity: q % 2 ? 0.15 : 1, transform: 'translateY(' + (fall * q / 5) + 'px) scale(' + (q % 2 ? .6 : 1.1) + ')' });
      g.animate(tw, { duration: 1500 + Math.random() * 1200, delay: 500 + Math.random() * 500, easing: 'linear', fill: 'both' }).onfinish = function () { this.effect.target.remove(); };
    }
  }
  function willow(cx, cy) {   // gold trails that burst out and then droop and fall like a weeping willow
    glow(cx, cy, '#ffc83a');
    for (var i = 0; i < 30; i++) {
      var a = (i / 30) * Math.PI * 2 + (i % 2) * 0.05, d = reach * (0.75 + (i % 3) * 0.12), dx = Math.cos(a) * d, dy = Math.sin(a) * d, ang = a * 180 / Math.PI;
      var t = el('left:' + (cx - 14) + 'px;top:' + (cy - 1.2) + 'px;width:28px;height:2.4px;border-radius:2px;background:linear-gradient(90deg,transparent,' + GOLD[i % 3] + ');box-shadow:0 0 5px ' + GOLD[0]);
      t.animate([
        { transform: 'translate(0,0) rotate(' + ang + 'deg) scaleX(.2)', opacity: 1 },
        { transform: 'translate(' + dx * 0.8 + 'px,' + dy * 0.8 + 'px) rotate(' + ang + 'deg) scaleX(1.2)', opacity: 1, offset: 0.3 },
        { transform: 'translate(' + dx * 1.05 + 'px,' + (dy * 1.05 + reach * 0.5) + 'px) rotate(90deg) scaleX(1.5)', opacity: 0.85, offset: 0.65 },
        { transform: 'translate(' + dx * 1.1 + 'px,' + (dy * 1.1 + reach * 1.2) + 'px) rotate(90deg) scaleX(.6)', opacity: 0 }
      ], { duration: 2500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'both' }).onfinish = function () { this.effect.target.remove(); };
    }
    glitter(cx, cy, 22);
  }
  function crossette(cx, cy) {   // eight sparks fly out, and each splits into three small ones at the end of its flight
    glow(cx, cy, '#fff3b8');
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 + 0.2, d = reach * 0.85, dx = Math.cos(a) * d, dy = Math.sin(a) * d;
      var s = el('left:' + (cx - 4) + 'px;top:' + (cy - 4) + 'px;width:8px;height:8px;border-radius:50%;background:#fffaf0;box-shadow:0 0 0 2px #ffc83a,0 0 10px 3px #ffc83a');
      s.animate([{ transform: 'translate(0,0) scale(1.2)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1, offset: 0.9 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0)', opacity: 0 }], { duration: 750, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).onfinish = function () { this.effect.target.remove(); };
      (function (px, py, base) {
        setTimeout(function () {
          if (!layer.parentNode) return;
          for (var k = 0; k < 3; k++) {
            var b = base + (k - 1) * 0.7, bd = reach * 0.34, bx = Math.cos(b) * bd, by = Math.sin(b) * bd;
            var c = el('left:' + (px - 3) + 'px;top:' + (py - 3) + 'px;width:6px;height:6px;border-radius:50%;background:' + SILVER[k % 3] + ';box-shadow:0 0 8px 2px ' + GOLD[k % 3]);
            c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + bx + 'px,' + (by + reach * 0.2) + 'px)', opacity: 1, offset: 0.5 }, { transform: 'translate(' + bx * 1.1 + 'px,' + (by + reach * 0.55) + 'px)', opacity: 0 }], { duration: 1300, easing: 'ease-out', fill: 'both' }).onfinish = function () { this.effect.target.remove(); };
          }
        }, 700);
      })(cx + dx, cy + dy, a);
    }
    glitter(cx, cy, 14);
  }
  function palm(cx, cy) {   // seven long arms of silver and ice-blue stars that arch out and droop
    glow(cx, cy, '#8fd3ff');
    for (var i = 0; i < 7; i++) {
      var a = (i / 7) * Math.PI * 2 + 0.3;
      for (var j = 1; j <= 6; j++) {
        var d = reach * (0.14 * j + 0.1), dx = Math.cos(a) * d, dy = Math.sin(a) * d + j * j * 1.8, size = 7 - j * 0.6;
        var s = el('left:' + (cx - size / 2) + 'px;top:' + (cy - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + SILVER[j % 3] + ';box-shadow:0 0 0 1px #fff,0 0 8px 2px ' + SILVER[(j + 1) % 3]);
        s.animate([{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(' + dx + 'px,' + dy + 'px)', opacity: 1, offset: 0.35 }, { transform: 'translate(' + dx * 1.02 + 'px,' + (dy + reach * 0.5) + 'px)', opacity: 0 }], { duration: 1900, delay: j * 40, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).onfinish = function () { this.effect.target.remove(); };
      }
    }
    glitter(cx, cy, 14);
  }
  function launch(kind, at) {   // a gold spark climbs with a thin trail, then the burst
    var cx = at ? at[0] : 0, cy = at ? at[1] : 0;
    if (!at) { var sp = spot(); cx = sp[0]; cy = sp[1]; }
    var rocket = el('left:' + (cx - 1.5) + 'px;top:0;width:3px;height:30px;border-radius:2px;background:linear-gradient(0deg,transparent,#ffe27a);box-shadow:0 0 6px #ffc83a');
    rocket.animate([{ transform: 'translateY(' + (h + 10) + 'px)', opacity: 0.9 }, { transform: 'translateY(' + cy + 'px)', opacity: 1, offset: 0.93 }, { transform: 'translateY(' + cy + 'px)', opacity: 0 }], { duration: 500 + (h - cy) * 0.3, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'both' }).onfinish = function () {
      rocket.remove();
      if (!layer.parentNode) return;
      sound('sparkle');
      (kind === 0 ? willow : kind === 1 ? crossette : palm)(cx, cy);
    };
  }
  var times = [0, 1000, 2000, 2800], kinds = [0, 1, 2, 0];
  times.forEach(function (t, i) { if (t < ms - 600) setTimeout(function () { launch(kinds[i]); }, t); });
  setTimeout(function () {   // the finale: a volley of three at once, side by side
    [[0.2, 0], [0.5, 2], [0.8, 1]].forEach(function (v, i) { setTimeout(function () { launch(v[1], [w * v[0], h * (0.16 + (i === 1 ? 0 : 0.1))]); }, i * 120); });
  }, Math.min(3600, ms - 1900));
  setTimeout(function () { layer.remove(); }, ms + 3800);
}

/** Plays the celebration once (the app's or Mini Fumu's). @returns {boolean} Whether it started. */
function newyearParty() {
  if (newyearOn || bdayHold || partyOn || (typeof xmasHolding === 'function' && xmasHolding()) || (typeof halloweenHolding === 'function' && halloweenHolding()) || (!devNewYear && (busy - celebrationHolds() > 0 || baseState() === 'sleepy'))) return false;
  newyearOn = true;
  var small = document.documentElement.classList.contains('desktop-pet'), name = state.player.name;
  busy++;
  bdayToyAway(true);
  releaseNewyearHold();
  if (pet.dataset.state === 'sleepy') pet.dataset.state = 'happy';   // (the developer tool wakes him)
  sound('newyear');   // (the disco groove: about 15 s, the length of the whole celebration)
  newyearHat(14500);
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });
  if (small) say(newyearGreeting(name) + ' ♡', 3200, true); else say('party time! ♡', 3000);   // (the app's banner already says it)
  pulse('hop', 500);
  var ms = discoDance(), total = ms + 5800, layer = bdayLayer(9000);
  var fx = small && celebFx('newyear', ms, total, name);   // (Mini Fumu: the effects cover the whole screen, drawn by the overlay window)
  if (!small && typeof halloweenDark === 'function') halloweenDark(layer, total, 'rgba(22,18,84,.5)');   // (a blue dusk round his lit room, so the light spots show)
  if (!small) newyearBanner(layer, name);   // (before the disco ball, so the light spots are drawn over the card)
  if (!fx) {
    newyearDiscoBall(layer, total);
  }
  setTimeout(function () { drift(['✨', '🎉', '✦'], petTop(), 4); }, 1500);
  setTimeout(function () { layer.remove(); }, total + 800);
  setTimeout(function () { if (!fx) newyearFireworks(5500); var more = newyearBlower(); setTimeout(function () { newyearOn = false; busy--; bdayToyAway(false); if (!busy) settle(); }, more); }, ms + 300);   // (the dance, then the blower and the fireworks)
  return true;
}
/** Starts it once, on 1 January, when he is awake and not busy (the other celebrations go first when they are pending). */
function newyearCheck() {
  if (!isNewYear()) return;
  if (newyearDoneToday() && !devNewYear) return;
  if (document.hidden || document.querySelector('dialog[open]')) return;
  if (bdayHold || partyOn || (typeof xmasHolding === 'function' && xmasHolding()) || (typeof halloweenHolding === 'function' && halloweenHolding())) return;
  var markDone = function () { try { localStorage.setItem('nibble-newyear-done', B.dayKey(giftDate())); } catch (e) { /* storage not available */ } };
  if (celebAsk({ kind: 'newyear', icon: '🎉', title: newyearGreeting(state.player.name), party: newyearParty, release: releaseNewyearHold, done: markDone })) return;
  if (!newyearParty()) return;
  markDone();
}
/** Developer tool: pretends it is New Year's Day and plays the celebration now. @returns {string} */
function devNewYearNow() {
  celebDevGift = Date.now() + 40000;
  if (deskPet()) return celebAsk({ kind: 'newyear', icon: '🎉', title: newyearGreeting(state.player.name), party: function () { devNewYear = true; var ok = newyearParty(); setTimeout(function () { devNewYear = false; }, 9000); if (!ok) devNewYear = false; return ok; } }) ? 'Mini Fumu asks first: tap Celebrate on his card.' : 'Mini Fumu is already asking about a celebration.';
  devNewYear = true;
  if (!newyearParty()) { devNewYear = false; return 'He is busy or asleep: try again in a moment.'; }
  setTimeout(function () { devNewYear = false; }, 9000);
  return document.documentElement.classList.contains('desktop-pet') ? 'Mini Fumu\'s New Year\'s Day: a disco ball, the disco dance, and a party blower.' : 'The app\'s New Year\'s Day: a banner, a disco ball, the disco dance, and a party blower with confetti.';
}
// the first time the app is opened on New Year's Day the celebration comes first, like the others (the hold keeps everything else back, for at most 60 s)
if (isNewYear() && !newyearDoneToday()) { newyearHold = true; busy++; bdayToyAway(true); newyearHoldTimer = setTimeout(function () { if (!newyearHold) return; releaseNewyearHold(); if (!newyearOn && !bdayHold && !partyOn) bdayToyAway(false); if (!busy) settle(); }, 60000); }
var newyearTry = setInterval(function () { if (!newyearHold) { clearInterval(newyearTry); return; } newyearCheck(); }, 1000);
setInterval(newyearCheck, 60000);
