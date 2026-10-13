// The Halloween celebration (build 616): once on 31 October, the first time the app is opened that day, Fumu puts on a witch hat and does the party dance while bats flutter past, cute
// ghosts float up, a little spider hangs from a web in the corner, mist drifts along the bottom, the screen goes dark round Fumu's room, a string of flickering jack-o'-lantern and ghost lights glows along the top and spooky music plays; at the end he
// holds out a trick-or-treat pumpkin bucket and a ghost pops out of it. The hat he wears comes in a gift box in Profile (app-gift.js).
// It works like the Christmas celebration (app-xmas.js) and the birthday one (app-birthday.js): the hold that keeps alerts and other animations back, the toy put away and popping back in, the
// banner in the app and the bubble in Mini Fumu. The birthday goes first when it is also the birthday.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var devHalloween = false, halloweenHold = false, halloweenHoldTimer = 0, halloweenOn = false;
/** @returns {boolean} Whether today is 31 October (or the developer tool is pretending). */
function isHalloween() {
  if (devHalloween) return true;
  var d = giftDate();
  return d.getMonth() === 9 && d.getDate() === 31;
}
/** @returns {boolean} Whether today's celebration has already played (or started). */
function halloweenDoneToday() {
  var done = '';
  try { done = localStorage.getItem('nibble-halloween-done') || ''; } catch (e) { /* storage not available */ }
  return done === B.dayKey(giftDate());
}
/** @returns {boolean} Whether alerts and reminders should wait (birthdayHolding in app-birthday.js asks this too). */
function halloweenHolding() { return halloweenHold || halloweenOn; }
function releaseHalloweenHold() {
  if (!halloweenHold) return;
  halloweenHold = false;
  clearTimeout(halloweenHoldTimer);
  busy--;
}
/** @returns {string} "Happy Halloween Name!" (in Dutch "Fijne Halloween Name!"), without the name when there is none. @param {string} name */
function halloweenGreeting(name) {
  var nl = typeof Lang === 'object' && Lang.get() === 'nl';
  return (nl ? 'Fijne Halloween' : 'Happy Halloween') + (name ? ' ' + name : '') + '!';
}

/** A witch hat on his head, drawn in the pet's own picture beside the worn hats (like the birthday hat), so it goes with him in the dance; it comes off after ms. */
function halloweenHat(ms) {
  var slot = pet.querySelector('.outfit-hat'), layer = slot && slot.parentNode;
  if (!layer) return;
  var hat = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hat.setAttribute('class', 'halloween-hat');
  hat.innerHTML = '<g transform="translate(83 38) rotate(-3)"><path d="M-11 -2 Q-8 -18 0 -28 Q4 -34 12 -37 Q10 -30 12 -26 Q13 -12 14 -2 Z" fill="#7b4fc4" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M-7 -14 Q-3 -22 3 -27" fill="none" stroke="#a98be0" stroke-width="2" stroke-linecap="round"/>' +
    '<ellipse cx="1" cy="-1" rx="23" ry="5.5" fill="#5b3d8f" stroke="#5b4239" stroke-width="2"/>' +
    '<path d="M-10 -5 Q1 -2 13 -5 L13 -9 Q1 -6 -10 -9 Z" fill="#ff9a3c" stroke="#5b4239" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<rect x="-1.5" y="-9.5" width="6" height="5.5" rx="1" fill="#ffd36b" stroke="#5b4239" stroke-width="1.4"/></g>';
  layer.appendChild(hat);
  setTimeout(function () { if (hat.parentNode) hat.remove(); }, ms);
}

var HALLOWEEN_BAT = '<svg viewBox="0 0 40 22" width="38" height="21"><g class="wing" style="transform-box:fill-box;transform-origin:100% 60%"><path d="M20 10 Q13 0 1 3 Q5 8 4 13 Q10 9 13 15 Q16 11 20 14 Z" fill="#4d3c43" stroke="#2c2025" stroke-width="1.2" stroke-linejoin="round"/></g>' +
  '<g class="wing" style="transform-box:fill-box;transform-origin:0% 60%"><path d="M20 10 Q27 0 39 3 Q35 8 36 13 Q30 9 27 15 Q24 11 20 14 Z" fill="#4d3c43" stroke="#2c2025" stroke-width="1.2" stroke-linejoin="round"/></g>' +
  '<ellipse cx="20" cy="12" rx="4.6" ry="5.6" fill="#4d3c43" stroke="#2c2025" stroke-width="1.2"/><path d="M16.5 8 L17.5 3.5 L19.5 7.5 M23.5 8 L22.5 3.5 L20.5 7.5" fill="#4d3c43" stroke="#2c2025" stroke-width="1.1" stroke-linejoin="round"/>' +
  '<circle cx="18.2" cy="11" r="1.2" fill="#fff6ec"/><circle cx="21.8" cy="11" r="1.2" fill="#fff6ec"/></svg>';
var HALLOWEEN_GHOST = '<svg viewBox="0 0 32 38" width="30" height="36"><path d="M16 2 Q4 2 4 16 V35 Q7 31 10 35 Q13 31 16 35 Q19 31 22 35 Q25 31 28 35 V16 Q28 2 16 2 Z" fill="#fffaf0" stroke="#5b4239" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<circle cx="12" cy="16" r="1.9" fill="#5b4239"/><circle cx="20" cy="16" r="1.9" fill="#5b4239"/><ellipse cx="16" cy="22" rx="2" ry="2.4" fill="#5b4239"/><ellipse cx="8.8" cy="21" rx="2.6" ry="1.6" fill="#ffaab8" opacity=".8"/><ellipse cx="23.2" cy="21" rx="2.6" ry="1.6" fill="#ffaab8" opacity=".8"/></svg>';

/** Bats flutter across the screen at different heights, flapping and bobbing. @param {Element} layer @param {number} ms */
function halloweenBats(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight;
  for (var i = 0; i < 8; i++) {
    var el = document.createElement('span'), left = i % 2 === 0, y = h * (0.04 + Math.random() * 0.4), dur = 5200 + Math.random() * 3000;
    el.innerHTML = HALLOWEEN_BAT;
    el.style.cssText = 'position:absolute;left:0;top:0;line-height:0';
    layer.appendChild(el);
    var x0 = left ? -50 : w + 50, x1 = left ? w + 50 : -50, flip = left ? 1 : -1;
    el.animate([
      { transform: 'translate(' + x0 + 'px,' + y + 'px) scaleX(' + flip + ')' },
      { transform: 'translate(' + (x0 + (x1 - x0) * 0.3) + 'px,' + (y - 24) + 'px) scaleX(' + flip + ')', offset: 0.3 },
      { transform: 'translate(' + (x0 + (x1 - x0) * 0.65) + 'px,' + (y + 22) + 'px) scaleX(' + flip + ')', offset: 0.65 },
      { transform: 'translate(' + x1 + 'px,' + (y - 10) + 'px) scaleX(' + flip + ')' }
    ], { duration: dur, delay: 400 + i * ((ms - 7000) / 8) + Math.random() * 500, easing: 'ease-in-out', fill: 'both' }).onfinish = el.remove.bind(el);
    [].forEach.call(el.querySelectorAll('.wing'), function (wg) { wg.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.3)' }, { transform: 'scaleY(1)' }], { duration: 260, iterations: Infinity, easing: 'ease-in-out' }); });
  }
}
/** Little ghosts float up from below, swaying, and fade away at the top. @param {Element} layer @param {number} ms */
function halloweenGhosts(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight;
  for (var i = 0; i < 6; i++) {
    var el = document.createElement('span'), x = 20 + Math.random() * (w - 70), sway = 26 + Math.random() * 30, dur = 8000 + Math.random() * 3000;
    el.innerHTML = '<i style="position:absolute;left:-40px;top:-36px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,rgba(200,230,255,.6) 0%,rgba(170,205,255,.28) 40%,transparent 70%)"></i>' + HALLOWEEN_GHOST;   // (a soft halo: they give off light, which shows up against the dark)
    el.style.cssText = 'position:absolute;left:0;top:0;line-height:0;filter:drop-shadow(0 0 5px rgba(210,235,255,.95)) drop-shadow(0 0 12px rgba(160,200,255,.7))';
    layer.appendChild(el);
    el.animate([
      { transform: 'translate(' + x + 'px,' + (h + 30) + 'px) rotate(-6deg)', opacity: 0 },
      { transform: 'translate(' + (x + sway) + 'px,' + h * 0.75 + 'px) rotate(6deg)', opacity: 0.95, offset: 0.15 },
      { transform: 'translate(' + (x - sway) + 'px,' + h * 0.45 + 'px) rotate(-6deg)', opacity: 0.95, offset: 0.5 },
      { transform: 'translate(' + (x + sway) + 'px,' + h * 0.18 + 'px) rotate(6deg)', opacity: 0.95, offset: 0.85 },
      { transform: 'translate(' + x + 'px,' + h * 0.08 + 'px) rotate(-4deg)', opacity: 0 }
    ], { duration: dur, delay: 600 + i * ((ms - 9000) / 6) + Math.random() * 600, easing: 'ease-in-out', fill: 'both' }).onfinish = el.remove.bind(el);
  }
}
/** Soft mist drifting along the bottom (around the taskbar), and a web in each top corner with a little spider bobbing on its thread. @param {Element} layer @param {number} ms */
function halloweenDecor(layer, ms) {
  var w = window.innerWidth, h = window.innerHeight, mh = Math.max(90, h * 0.12);   // (the mist hangs low, its middle about where the taskbar is: he stands on it)
  [0, 1].forEach(function (k) {
    var mist = document.createElement('i');
    mist.style.cssText = 'position:absolute;left:' + (k ? w * 0.35 : -w * 0.2) + 'px;bottom:' + (26 - mh / 2).toFixed(0) + 'px;width:' + w * 0.9 + 'px;height:' + mh + 'px;border-radius:50%;background:radial-gradient(ellipse,rgba(190,170,225,.55) 0%,rgba(190,170,225,.2) 50%,transparent 72%);filter:blur(6px)';
    layer.appendChild(mist);
    if (!reduceMotion) mist.animate([{ transform: 'translateX(0)', opacity: 0 }, { transform: 'translateX(' + (k ? -w * 0.25 : w * 0.25) + 'px)', opacity: 1, offset: 0.2 }, { transform: 'translateX(' + (k ? -w * 0.5 : w * 0.5) + 'px)', opacity: 0 }], { duration: ms, easing: 'ease-in-out', fill: 'both' });
  });
  [0, 1].forEach(function (k) {
    var web = document.createElement('span'), s = 78;
    web.style.cssText = 'position:absolute;top:0;' + (k ? 'right' : 'left') + ':0;line-height:0;' + (k ? 'transform:scaleX(-1)' : '');
    web.innerHTML = '<svg viewBox="0 0 80 80" width="' + s + '" height="' + s + '" style="overflow:visible;filter:drop-shadow(0 0 1px #5b4239)"><g fill="none" stroke="#fffaf0" stroke-width="1.3" stroke-linecap="round" opacity=".95"><path d="M0 0 L78 6 M0 0 L66 38 M0 0 L38 66 M0 0 L6 78"/>' +
      '<path d="M22 1.6 Q18 18 1.6 22 M42 3.2 Q36 36 3.2 42 M62 4.8 Q52 52 4.8 62"/></g><g class="web-spider"><path d="M60 0 V' + (22 + k * 8) + '" stroke="#fffaf0" stroke-width="1" fill="none"/>' +
      '<g transform="translate(60 ' + (28 + k * 8) + ')"><path d="M-4 -1 L-9 -4 M-4 1 L-9 4 M4 -1 L9 -4 M4 1 L9 4" stroke="#4d3c43" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="0" cy="0" rx="5" ry="5.4" fill="#4d3c43" stroke="#2c2025" stroke-width="1"/><circle cx="-1.8" cy="-1" r="1.1" fill="#fff6ec"/><circle cx="1.8" cy="-1" r="1.1" fill="#fff6ec"/></g></g></svg>';
    layer.appendChild(web);
    var sp = web.querySelector('.web-spider');
    if (sp && !reduceMotion) sp.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(7px)' }, { transform: 'translateY(0)' }], { duration: 1900 + k * 500, iterations: Infinity, easing: 'ease-in-out' });
  });
}

/** The screen goes dark and purple for the party, except round Fumu's room (a soft-edged window on the room); it fades in and out. Not in the small window, where it would be a dark box on the desktop. @param {Element} layer @param {number} ms @param {string} [color] The colour of the dark (the New Year's Day celebration uses it too, in blue). */
function halloweenDark(layer, ms, color) {
  var r = stage.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, rx = r.width * 1.0, ry = r.height * 1.05 + 20;
  var dark = document.createElement('div'), mask = 'radial-gradient(ellipse ' + rx + 'px ' + ry + 'px at ' + cx + 'px ' + cy + 'px, transparent 70%, #000 100%)';
  dark.style.cssText = 'position:absolute;inset:0;background:' + (color || 'rgba(20,8,42,.66)') + ';-webkit-mask-image:' + mask + ';mask-image:' + mask;
  layer.appendChild(dark);
  if (!reduceMotion) dark.animate([{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.93 }, { opacity: 0 }], { duration: ms, fill: 'both' });
}
/** The string of lights along the top, made spooky: little glowing jack-o'-lanterns and ghosts on a dark wire, each flickering like a candle. @param {Element} layer @param {number} ms */
function halloweenLights(layer, ms) {
  var w = window.innerWidth, step = 36, n = Math.max(4, Math.round(w / step)), sx = w / n;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', 50); svg.setAttribute('viewBox', '0 0 ' + w + ' 50');
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  var d = 'M0 1', items = '';
  for (var i = 0; i < n; i++) {
    var x0 = i * sx, bx = x0 + sx / 2, by = 10;
    d += ' Q' + bx + ' 17 ' + (x0 + sx) + ' 1';
    if (i % 2 === 0) items += '<g class="hw-light" data-glow="#ffa43a"><path d="M' + bx + ' ' + (by - 1) + ' v3" stroke="#2c2025" stroke-width="1.4"/><ellipse cx="' + bx + '" cy="' + (by + 8) + '" rx="7" ry="6.2" fill="#ff9a3c" stroke="#2c2025" stroke-width="1.3"/>' +
      '<path d="M' + (bx - 3.6) + ' ' + (by + 7) + ' l1.8 -2.4 1.8 2.4 z M' + (bx + 0.2) + ' ' + (by + 7) + ' l1.8 -2.4 1.8 2.4 z" fill="#fff0a8"/><path d="M' + (bx - 3.4) + ' ' + (by + 10.4) + ' l1.7 1.4 1.7 -1.4 1.7 1.4 1.7 -1.4 1.7 1.4" fill="none" stroke="#fff0a8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></g>';
    else items += '<g class="hw-light" data-glow="#bfe0ff"><path d="M' + bx + ' ' + (by - 1) + ' v3" stroke="#2c2025" stroke-width="1.4"/><path d="M' + bx + ' ' + (by + 2) + ' Q' + (bx - 6) + ' ' + (by + 2) + ' ' + (bx - 6) + ' ' + (by + 9) + ' V' + (by + 17) + ' Q' + (bx - 4.5) + ' ' + (by + 15) + ' ' + (bx - 3) + ' ' + (by + 17) + ' Q' + (bx - 1.5) + ' ' + (by + 15) + ' ' + bx + ' ' + (by + 17) + ' Q' + (bx + 1.5) + ' ' + (by + 15) + ' ' + (bx + 3) + ' ' + (by + 17) + ' Q' + (bx + 4.5) + ' ' + (by + 15) + ' ' + (bx + 6) + ' ' + (by + 17) + ' V' + (by + 9) + ' Q' + (bx + 6) + ' ' + (by + 2) + ' ' + bx + ' ' + (by + 2) + ' Z" fill="#fffaf0" stroke="#2c2025" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<circle cx="' + (bx - 2.2) + '" cy="' + (by + 8) + '" r="1.1" fill="#2c2025"/><circle cx="' + (bx + 2.2) + '" cy="' + (by + 8) + '" r="1.1" fill="#2c2025"/><ellipse cx="' + bx + '" cy="' + (by + 11.4) + '" rx="1.2" ry="1.5" fill="#2c2025"/></g>';
  }
  svg.innerHTML = '<path d="' + d + '" fill="none" stroke="#2c2025" stroke-width="1.8"/>' + items;
  layer.appendChild(svg);
  if (reduceMotion) return;
  svg.animate([{ transform: 'translateY(-55px)' }, { transform: 'translateY(0)' }], { duration: 700, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'both' });
  [].forEach.call(svg.querySelectorAll('.hw-light'), function (g, k) {   // each flickers on its own, like a candle that is about to go out: uneven, never a flash
    var glow = g.getAttribute('data-glow');
    g.style.filter = 'drop-shadow(0 0 4px ' + glow + ') drop-shadow(0 0 9px ' + glow + ')';
    g.animate([{ opacity: 1 }, { opacity: .55, offset: 0.18 }, { opacity: .95, offset: 0.32 }, { opacity: .7, offset: 0.55 }, { opacity: 1, offset: 0.7 }, { opacity: .6, offset: 0.86 }, { opacity: 1 }], { duration: 1900 + (k * 313) % 900, delay: (k * 170) % 600, iterations: Infinity, easing: 'ease-in-out' });
  });
  setTimeout(function () { svg.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-60px)' }], { duration: 600, easing: 'ease-in', fill: 'both' }); }, ms - 700);
}

/** The app: a banner slides up from the bottom, above the bottom bar, so it never covers Fumu (an orange and purple one). @param {Element} layer @param {string} name */
function halloweenBanner(layer, name) {
  var banner = document.createElement('div');
  banner.style.cssText = 'position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom, 0px) + 92px);margin:0 auto;width:90%;max-width:360px;box-sizing:border-box;padding:10px 14px;border-radius:18px;background:#fff6ec;color:#4d3c43;' +
    'border:2.5px solid #ff8a1f;box-shadow:0 4px 0 #8e5bff;text-align:center;font-weight:700;font-size:17px';
  banner.textContent = '🎃 ' + halloweenGreeting(name) + ' 👻';
  layer.appendChild(banner);
  if (!reduceMotion) banner.animate([{ transform: 'translateY(110px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1, offset: 0.85 }, { transform: 'translateY(110px)', opacity: 0 }], { duration: 8000, fill: 'both' });
}

/** The end of the party: he holds out a trick-or-treat pumpkin bucket full of sweets; in the last second a little ghost pops out of it and says boo; the hat he wears is in a gift box in Profile. @returns {number} How long it takes, in ms. */
function halloweenTreat() {
  var bucket = document.createElement('span'), clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]');
  bucket.className = 'bday-cake halloween-bucket';   // (the same spot in front of his tummy as the birthday cake)
  bucket.setAttribute('aria-hidden', 'true');
  bucket.style.cssText = 'width:64px;height:60px';
  bucket.innerHTML = '<svg viewBox="0 0 64 60" width="64" height="60" style="overflow:visible"><g class="bucket-ghost" opacity="0"><path d="M32 6 Q23 6 23 17 V30 Q26 27 28.5 30 Q31 27 32 30 Q33 27 35.5 30 Q38 27 41 30 V17 Q41 6 32 6 Z" fill="#fffaf0" stroke="#5b4239" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<circle cx="28.5" cy="16" r="1.7" fill="#5b4239"/><circle cx="35.5" cy="16" r="1.7" fill="#5b4239"/><ellipse cx="32" cy="22" rx="2.2" ry="2.8" fill="#5b4239"/></g>' +
    '<path d="M14 24 Q32 -2 50 24" fill="none" stroke="#5b4239" stroke-width="2.6" stroke-linecap="round"/>' +
    '<rect x="21" y="19" width="8" height="5" rx="2" fill="#ff3d7f" stroke="#5b4239" stroke-width="1.4"/><rect x="31" y="18" width="8" height="5" rx="2" fill="#7bd35b" stroke="#5b4239" stroke-width="1.4" transform="rotate(8 35 20)"/><rect x="39" y="20" width="8" height="5" rx="2" fill="#8e5bff" stroke="#5b4239" stroke-width="1.4" transform="rotate(-12 43 22)"/>' +
    '<path d="M10 30 Q10 22 32 22 Q54 22 54 30 V45 Q54 56 32 56 Q10 56 10 45 Z" fill="#ff9a3c" stroke="#5b4239" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M22 28 Q20 40 22 54 M32 24 V56 M42 28 Q44 40 42 54" fill="none" stroke="#e8761a" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M21 36 L26 31 L29 37 Z M35 37 L38 31 L43 36 Z" fill="#4d3c43" stroke="#4d3c43" stroke-width="1" stroke-linejoin="round"/><path d="M23 45 L27 48 L30 45 L34 48 L37 45 L41 48" fill="none" stroke="#4d3c43" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  pet.appendChild(bucket);
  setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
  sound('sparkle');
  say('trick or treat! ♡', 2600);
  if (!reduceMotion) {
    bucket.animate([{ transform: 'translateY(26px) scale(.4)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'both' });
    pulse('hopsmall', 450);
  }
  setTimeout(function () { if (typeof giftSay === 'function') giftSay(); }, 2800);
  setTimeout(function () {   // the last second: a ghost pops out of the bucket, boo!
    if (!bucket.parentNode) return;
    setFace({ eyes: 'open', mouth: 'o', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'sparkles'] });
    sound('magic');
    say('boo!', 1600);
    var r = bucket.getBoundingClientRect();
    drift(['🦇', '✦', '👻', '✦'], { x: r.left + r.width / 2, y: r.top }, 4);
    var g = bucket.querySelector('.bucket-ghost');
    if (g) { if (!reduceMotion) g.animate([{ transform: 'translateY(20px) scale(.6)', opacity: 0 }, { transform: 'translateY(-14px) scale(1.12)', opacity: 1, offset: 0.55 }, { transform: 'translateY(-8px) scale(1)', opacity: 1 }], { duration: 550, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'both' }); else g.setAttribute('opacity', '1'); }
  }, 4200);
  setTimeout(function () {
    if (!bucket.parentNode) return;
    setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
    if (reduceMotion) { bucket.remove(); return; }
    bucket.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(12px) scale(.6)' }], { duration: 500, easing: 'ease-in', fill: 'both' }).onfinish = function () { bucket.remove(); };
  }, 5200);
  setTimeout(function () { if (typeof giftToast === 'function') giftToast('🎃'); }, 5200);   // (the hat of the day waits in a gift box in Profile: app-gift.js)
  return 5800;
}

/** Plays the celebration once (the app's or Mini Fumu's). @returns {boolean} Whether it started. */
function halloweenParty() {
  if (halloweenOn || bdayHold || partyOn || (typeof xmasHolding === 'function' && xmasHolding()) || (!devHalloween && (busy - celebrationHolds() > 0 || baseState() === 'sleepy'))) return false;
  halloweenOn = true;
  var small = document.documentElement.classList.contains('desktop-pet'), name = state.player.name;
  busy++;
  bdayToyAway(true);
  releaseHalloweenHold();
  if (pet.dataset.state === 'sleepy') pet.dataset.state = 'happy';   // (the developer tool wakes him)
  sound('halloween');   // (the spooky tune: about 15 s, the length of the whole celebration)
  halloweenHat(14500);
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });
  if (small) say(halloweenGreeting(name) + ' ♡', 3200, true); else say('boo! happy halloween! ♡', 3000);   // (the app's banner already says it)
  pulse('hop', 500);
  var ms = halloweenDance(), total = ms + 5800, layer = bdayLayer(9000);
  var fx = small && celebFx('halloween', ms, total, name);   // (Mini Fumu: the effects cover the whole screen, drawn by the overlay window)
  if (!small) halloweenDark(layer, total);   // (first, so everything else is drawn over it)
  if (!small) halloweenBanner(layer, name);   // (before the ghosts and bats, so they are drawn over the card)
  if (!fx) {
    halloweenDecor(layer, total);
    halloweenLights(layer, total);
    halloweenGhosts(layer, total);
    halloweenBats(layer, total);
  }
  setTimeout(function () { drift(['🎃', '🦇', '👻'], petTop(), 4); }, 1500);
  setTimeout(function () { say('spooky~', 1800); }, 3600);
  setTimeout(function () { say('look, a ghost!', 2000); }, 6200);
  setTimeout(function () { layer.remove(); }, total + 800);
  setTimeout(function () { var more = yearGift('halloween') ? halloweenTreat() : noGift('happy halloween! ♡'); setTimeout(function () { halloweenOn = false; busy--; bdayToyAway(false); if (!busy) settle(); }, more); }, ms + 300);   // (the dance, then the treat)
  return true;
}
/** Starts it once, on 31 October, when he is awake and not busy (the birthday celebration goes first when it is also the birthday). */
function halloweenCheck() {
  if (!isHalloween()) return;
  if (halloweenDoneToday() && !devHalloween) return;
  if (document.hidden || document.querySelector('dialog[open]')) return;
  if (bdayHold || partyOn || (typeof xmasHolding === 'function' && xmasHolding())) return;
  var markDone = function () { try { localStorage.setItem('nibble-halloween-done', B.dayKey(giftDate())); } catch (e) { /* storage not available */ } };
  if (celebAsk({ kind: 'halloween', icon: '🎃', title: halloweenGreeting(state.player.name), party: halloweenParty, release: releaseHalloweenHold, done: markDone })) return;
  if (!halloweenParty()) return;
  markDone();
}
/** Developer tool: pretends it is Halloween and plays the celebration now. @returns {string} */
function devHalloweenNow() {
  celebDevGift = Date.now() + 40000;
  if (deskPet()) return celebAsk({ kind: 'halloween', icon: '🎃', title: halloweenGreeting(state.player.name), dev: true, party: function () { devHalloween = true; var ok = halloweenParty(); setTimeout(function () { devHalloween = false; }, 9000); if (!ok) devHalloween = false; return ok; } }) ? 'Mini Fumu asks first: tap Celebrate on his card.' : 'Mini Fumu is already asking about a celebration.';
  devHalloween = true;
  if (!halloweenParty()) { devHalloween = false; return 'He is busy or asleep: try again in a moment.'; }
  setTimeout(function () { devHalloween = false; }, 9000);
  return document.documentElement.classList.contains('desktop-pet') ? 'Mini Fumu\'s Halloween: bats, ghosts, a spider, spooky music and a treat. The hat is in a gift box in Profile on 31 October.' : 'The app\'s Halloween: a banner, bats, ghosts, a spider, spooky music, the party dance and a treat. The hat is in a gift box in Profile on 31 October.';
}
// the first time the app is opened on Halloween the celebration comes first, like the birthday and Christmas ones (the hold keeps everything else back, for at most 60 s)
if (isHalloween() && !halloweenDoneToday()) { halloweenHold = true; busy++; bdayToyAway(true); halloweenHoldTimer = setTimeout(function () { if (!halloweenHold) return; releaseHalloweenHold(); if (!halloweenOn && !bdayHold && !partyOn) bdayToyAway(false); if (!busy) settle(); }, 60000); }
var halloweenTry = setInterval(function () { if (!halloweenHold) { clearInterval(halloweenTry); return; } halloweenCheck(); }, 1000);
setInterval(halloweenCheck, 60000);
