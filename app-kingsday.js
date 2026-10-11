// The King's Day celebration (build 624): once on King's Day (Koningsdag, 27 April, or the 26th when the 27th is a Sunday), the first time the app is opened that day, everything goes orange: Fumu puts on a
// crown and does a marching, waving dance while orange and Dutch-flag bunting hangs along the top, orange confetti falls, orange balloons rise and a little windmill turns in the corner, to a brass-band polka;
// at the end he holds out an orange-iced tompouce and a tiny Dutch flag pops up out of it. A real King's Day box (the `kingsdaygift` day in bonuses.js) is then waiting in Profile.
// It works like the other celebrations (app-birthday.js, app-xmas.js, app-halloween.js, app-newyear.js, app-easter.js): the hold that keeps alerts and other animations back, the toy put away and popping
// back in, the card in the app and the bubble in Mini Fumu. The others go first when they are pending the same day.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var devKingsDay = false, kingsHold = false, kingsHoldTimer = 0, kingsOn = false;
/** @returns {boolean} Whether today is King's Day (or the developer tool is pretending). */
function isKingsDay() {
  if (devKingsDay) return true;
  var d = giftDate(), k = new Date(d.getFullYear(), 3, 27);
  if (k.getDay() === 0) k.setDate(26);
  return d.getMonth() === k.getMonth() && d.getDate() === k.getDate();
}
/** @returns {boolean} Whether today's celebration has already played (or started). */
function kingsDoneToday() {
  var done = '';
  try { done = localStorage.getItem('nibble-kingsday-done') || ''; } catch (e) { /* storage not available */ }
  return done === B.dayKey(giftDate());
}
/** @returns {boolean} Whether alerts and reminders should wait (birthdayHolding in app-birthday.js asks this too). */
function kingsHolding() { return kingsHold || kingsOn; }
function releaseKingsHold() {
  if (!kingsHold) return;
  kingsHold = false;
  clearTimeout(kingsHoldTimer);
  busy--;
}
/** @returns {string} "Happy King's Day Name!" (in Dutch "Fijne Koningsdag Name!"), without the name when there is none. @param {string} name */
function kingsGreeting(name) {
  var nl = typeof Lang === 'object' && Lang.get() === 'nl';
  return (nl ? 'Fijne Koningsdag' : "Happy King's Day") + (name ? ' ' + name : '') + '!';
}

/** A golden crown with orange jewels, drawn in the pet's own picture beside the worn hats (centred on his head) so it goes with him in the dance; it comes off after ms. */
function kingsCrown(ms) {
  var slot = pet.querySelector('.outfit-hat'), layer = slot && slot.parentNode;
  if (!layer) return;
  var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'kings-crown');
  g.innerHTML = '<g transform="translate(80 38)"><path d="M-17 0 L-19 -20 L-9 -11 L0 -25 L9 -11 L19 -20 L17 0 Z" fill="#ffd36b" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<rect x="-18" y="-4" width="36" height="7" rx="2.5" fill="#ffc83a" stroke="#5b4239" stroke-width="2"/>' +
    '<circle cx="0" cy="-0.5" r="2.6" fill="#ff8a1f" stroke="#5b4239" stroke-width="1.2"/><circle cx="-10" cy="-0.5" r="2" fill="#ff8a1f" stroke="#5b4239" stroke-width="1.1"/><circle cx="10" cy="-0.5" r="2" fill="#ff8a1f" stroke="#5b4239" stroke-width="1.1"/>' +
    '<circle cx="-19" cy="-21" r="2.6" fill="#fffaf0" stroke="#5b4239" stroke-width="1.3"/><circle cx="0" cy="-26.5" r="2.8" fill="#ff8a1f" stroke="#5b4239" stroke-width="1.3"/><circle cx="19" cy="-21" r="2.6" fill="#fffaf0" stroke="#5b4239" stroke-width="1.3"/></g>';
  layer.appendChild(g);
  setTimeout(function () { if (g.parentNode) g.remove(); }, ms);
}

/** The King's Day dance: the same kind of 12-beat table as the other celebrations' dances (danceCss in app-idle.js): a royal wave with little sways, a polonaise march from side to side, stomping and cheering, a spin, a deep bow and a jump
 * ("hup Holland hup!"). 9 s, with the royal wave arm pose (`royal`, styles.css) for the first part. */
var KINGS_BEATS = [
  { x: -6, ay: -5, r: -4, cy: 2, up: [.95, 1.06], ld: [1.08, .94] },       // 1-2: the royal wave, swaying
  { x: 6, ay: -5, r: 4, cy: 2, up: [.95, 1.06], ld: [1.08, .94] },
  { x: -14, ay: -12, r: -6, cy: 3, up: [.9, 1.13], ld: [1.14, .87] },      // 3-6: the polonaise, marching from side to side
  { x: 14, ay: -12, r: 6, cy: 3, up: [.9, 1.13], ld: [1.14, .87] },
  { x: -14, ay: -12, r: -6, cy: 3, up: [.9, 1.13], ld: [1.14, .87] },
  { x: 14, ay: -12, r: 6, cy: 3, up: [.9, 1.13], ld: [1.14, .87] },
  { x: 0, ay: -16, r: 0, cy: 4, up: [.88, 1.16], ld: [1.18, .84] },        // 7-8: stomping on the spot, arms up
  { x: 0, ay: -16, r: 0, cy: 4, up: [.88, 1.16], ld: [1.18, .84] },
  { x: 0, ay: -20, r: 0, cy: 3, flip: 1, up: [.9, 1.16], ld: [1.16, .86] },   // 9: a spin
  { x: 0, ay: -20, r: 0, cy: 3, flip: 1, up: [.9, 1.16], ld: [1.16, .86] },   // 10: and back
  { x: 0, ay: 5, r: 12, cy: 7, up: [1.12, .88], ld: [1.26, .74], still: 1 },   // 11: a deep bow
  { x: 0, ay: -40, r: 0, cy: 3, up: [.8, 1.32], ld: [1.28, .74] }          // 12: and a big jump
];
var KINGS_SQUISH = danceSquish(KINGS_BEATS);
(function () { var st = document.createElement('style'); st.id = 'kings-dance-css'; st.textContent = danceCss('kingsdance', KINGS_BEATS); document.head.appendChild(st); })();
/** King's Day dance (build 624): 9 s. */
function kingsDance() {
  var clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]'), arms = function (a) { return clip ? 'rest' : a; };   // (his left hand holds the clipboard on the to-do list)
  setFace({ eyes: 'happy', mouth: 'smile', arms: arms('royal'), x: ['cheeks'] });
  pulse('kingsdance', 9000);
  if (!reduceMotion) svgSquish(KINGS_SQUISH);
  function at(ms, fn) { setTimeout(function () { if (pet.classList.contains('kingsdance')) fn(); }, ms); }
  at(1500, function () { setFace({ eyes: 'happy', mouth: 'open', arms: arms('cheer'), x: ['cheeks', 'sparkles'] }); drift(['👑', '✦'], petTop(), 2); });   // the march
  at(3000, function () { drift(['♪', '🧡'], petTop(), 2); });
  at(4500, function () { setFace({ eyes: 'sparkle', mouth: 'open', arms: arms('cheer'), x: ['cheeks', 'sparkles'] }); drift(['🧡', '♫'], petTop(), 2); });
  at(6000, function () { setFace({ eyes: 'happy', mouth: 'open', arms: arms('cheer'), x: ['cheeks'] }); drift(['🎉', '🧡', '✦'], petTop(), 3); });
  at(7500, function () { setFace({ eyes: 'closed', mouth: 'smile', arms: arms('carry'), x: ['cheeks'] }); });   // the bow...
  at(8250, function () { setFace({ eyes: 'open', mouth: 'open', arms: arms('cheer'), x: ['cheeks', 'sparkles'] }); drift(['👑', '🧡', '✦', '🎉'], petTop(), 4); });   // ...and the jump!
  hum();
  return 9000;
}

/** A string of orange pennants and little red, white and blue flags along the top. @param {Element} layer @param {number} ms */
function kingsBunting(layer, ms) {
  var w = window.innerWidth, n = Math.max(6, Math.round(w / 38)), sx = w / n;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), d = 'M0 1', flags = '';
  svg.setAttribute('width', w); svg.setAttribute('height', 48); svg.setAttribute('viewBox', '0 0 ' + w + ' 48');
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  for (var i = 0; i < n; i++) {
    var x0 = i * sx, bx = x0 + sx / 2;
    d += ' Q' + bx + ' 11 ' + (x0 + sx) + ' 1';
    if (i % 2 === 0) flags += '<g class="kings-flag" style="transform-box:fill-box;transform-origin:50% 0"><path d="M' + (bx - 11) + ' 6 L' + (bx + 11) + ' 6 L' + bx + ' 29 Z" fill="#ff8a1f" stroke="#5b4239" stroke-width="1.5" stroke-linejoin="round"/></g>';
    else flags += '<g class="kings-flag" style="transform-box:fill-box;transform-origin:50% 0"><rect x="' + (bx - 11) + '" y="6" width="22" height="5.4" fill="#d6283a"/><rect x="' + (bx - 11) + '" y="11.4" width="22" height="5.4" fill="#fffaf0"/><rect x="' + (bx - 11) + '" y="16.8" width="22" height="5.4" fill="#2a56b8"/><rect x="' + (bx - 11) + '" y="6" width="22" height="16.2" fill="none" stroke="#5b4239" stroke-width="1.5"/></g>';
  }
  svg.innerHTML = '<path d="' + d + '" fill="none" stroke="#5b4239" stroke-width="1.6"/>' + flags;
  layer.appendChild(svg);
  if (reduceMotion) return;
  svg.animate([{ transform: 'translateY(-55px)' }, { transform: 'translateY(0)' }], { duration: 700, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'both' });
  [].forEach.call(svg.querySelectorAll('.kings-flag'), function (f, k) { f.animate([{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(-5deg)' }], { duration: 1900 + (k * 131) % 600, delay: (k * 110) % 700, iterations: Infinity, easing: 'ease-in-out' }); });
  setTimeout(function () { svg.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-60px)' }], { duration: 600, easing: 'ease-in', fill: 'both' }); }, ms - 700);
}

/** Orange (and some red, white and blue) confetti falls over the whole page all through the celebration. @param {Element} layer @param {number} ms */
function kingsConfetti(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight, count = w < 500 ? 70 : 110, cols = ['#ff8a1f', '#ff8a1f', '#ffa84d', '#ff8a1f', '#fffaf0', '#2a56b8', '#d6283a'];
  for (var i = 0; i < count; i++) {
    var el = document.createElement('i'), sz = 6 + Math.random() * 6, x = Math.random() * w, sway = (Math.random() - 0.5) * 110, dur = 4200 + Math.random() * 2800;
    el.style.cssText = 'position:absolute;left:0;top:0;width:' + sz + 'px;height:' + sz * 1.6 + 'px;border-radius:2px;background:' + cols[i % cols.length] + ';box-shadow:0 0 0 1px rgba(91,66,57,.25)';
    layer.appendChild(el);
    el.animate([
      { transform: 'translate(' + x + 'px,-20px) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + (x + sway) + 'px,' + h * 0.5 + 'px) rotate(' + (200 + Math.random() * 300) + 'deg)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + (x + sway * 0.4) + 'px,' + (h + 20) + 'px) rotate(' + (400 + Math.random() * 400) + 'deg)', opacity: 1 }
    ], { duration: dur, delay: Math.random() * Math.max(500, ms - 4500), easing: 'ease-in', fill: 'both' }).onfinish = el.remove.bind(el);
  }
}

/** Orange balloons (with a few red, white and blue ones) float up the page. @param {Element} layer @param {number} ms */
function kingsBalloons(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight, cols = ['#ff8a1f', '#ff8a1f', '#ffa84d', '#ff8a1f', '#fffaf0', '#2a56b8', '#d6283a'];
  for (var i = 0; i < 12; i++) {
    var el = document.createElement('span'), x = 10 + Math.random() * (w - 44), col = cols[i % cols.length], sway = (Math.random() - 0.5) * 50, dur = 6500 + Math.random() * 2500;
    el.style.cssText = 'position:absolute;left:0;top:0;width:26px;height:32px;line-height:0';
    el.innerHTML = '<svg viewBox="0 0 26 32" width="26" height="32"><ellipse cx="13" cy="12" rx="10.5" ry="11.5" fill="' + col + '" stroke="#5b4239" stroke-width="1.8"/><ellipse cx="9" cy="8" rx="2.6" ry="3.4" fill="#fff" opacity=".5"/><path d="M13 23.5 Q10 27.5 13 31" fill="none" stroke="#5b4239" stroke-width="1.3"/></svg>';
    layer.appendChild(el);
    el.animate([
      { transform: 'translate(' + x + 'px,' + (h + 40) + 'px)', opacity: 1 },
      { transform: 'translate(' + (x + sway) + 'px,' + h * 0.5 + 'px)', opacity: 1, offset: 0.5 },
      { transform: 'translate(' + (x - sway * 0.5) + 'px,-50px)', opacity: 1 }
    ], { duration: dur, delay: 400 + i * ((ms - 9500) / 12) + Math.random() * 300, easing: 'ease-in-out', fill: 'both' }).onfinish = el.remove.bind(el);
  }
}

/** A little windmill turning in the bottom corner, above the card. @param {Element} layer @param {number} ms */
function kingsWindmill(layer, ms) {
  var mill = document.createElement('span');
  mill.style.cssText = 'position:absolute;left:8px;bottom:calc(env(safe-area-inset-bottom, 0px) + 150px);width:70px;height:92px;line-height:0';
  mill.innerHTML = '<svg viewBox="0 0 70 92" width="70" height="92" style="overflow:visible"><path d="M22 90 L26 36 H44 L48 90 Z" fill="#fffaf0" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/><path d="M26 36 Q35 22 44 36 Z" fill="#d6283a" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<rect x="31" y="72" width="8" height="18" rx="3" fill="#b8794a" stroke="#5b4239" stroke-width="1.6"/><rect x="31" y="50" width="8" height="9" rx="2" fill="#a9d4ff" stroke="#5b4239" stroke-width="1.4"/>' +
    '<g class="mill-blades" style="transform-box:fill-box;transform-origin:50% 50%"><g stroke="#5b4239" stroke-width="2" stroke-linejoin="round" fill="#fffaf0"><rect x="33" y="-4" width="4" height="28" rx="1"/><rect x="33" y="24" width="4" height="28" rx="1" transform="rotate(180 35 24)"/><rect x="33" y="-4" width="4" height="28" rx="1" transform="rotate(90 35 24)"/><rect x="33" y="-4" width="4" height="28" rx="1" transform="rotate(270 35 24)"/></g></g><circle cx="35" cy="24" r="4" fill="#ff8a1f" stroke="#5b4239" stroke-width="1.6"/></svg>';
  layer.appendChild(mill);
  if (reduceMotion) return;
  mill.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 600, delay: 700, easing: 'ease-out', fill: 'both' });
  var blades = mill.querySelector('.mill-blades');
  if (blades) blades.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 3600, iterations: Infinity, easing: 'linear' });
  setTimeout(function () { mill.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], { duration: 450, easing: 'ease-in', fill: 'both' }); }, ms - 600);
}

/** The app: a card slides up from the bottom, above the bottom bar (an orange and blue one). @param {Element} layer @param {string} name */
function kingsBanner(layer, name) {
  var banner = document.createElement('div');
  banner.style.cssText = 'position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom, 0px) + 92px);margin:0 auto;width:90%;max-width:360px;box-sizing:border-box;padding:10px 14px;border-radius:18px;background:#fffaf0;color:#5b4239;' +
    'border:2.5px solid #ff8a1f;box-shadow:0 4px 0 #2a56b8;text-align:center;font-weight:700;font-size:17px';
  banner.textContent = '👑 ' + kingsGreeting(name) + ' 🧡';
  layer.appendChild(banner);
  if (!reduceMotion) banner.animate([{ transform: 'translateY(110px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1, offset: 0.85 }, { transform: 'translateY(110px)', opacity: 0 }], { duration: 8000, fill: 'both' });
}

/** The end of the party: he holds out an orange-iced tompouce (the Dutch cream slice); in the last second a tiny Dutch flag pops up out of it and he cheers "oranje boven!"; then a real King's Day box is waiting in Profile. @returns {number} How long it takes, in ms. */
function kingsTreat() {
  var treat = document.createElement('span'), clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]');
  treat.className = 'bday-cake kings-treat';   // (the same spot in front of his tummy as the birthday cake)
  treat.setAttribute('aria-hidden', 'true');
  treat.style.cssText = 'width:64px;height:60px';
  treat.innerHTML = '<svg viewBox="0 0 64 60" width="64" height="60" style="overflow:visible"><ellipse cx="32" cy="55" rx="29" ry="4.5" fill="#fff6ec" stroke="#5b4239" stroke-width="2"/>' +
    '<g class="treat-flag" opacity="0"><path d="M32 30 V4" stroke="#5b4239" stroke-width="2" stroke-linecap="round"/><rect x="32" y="4" width="17" height="4.4" fill="#d6283a"/><rect x="32" y="8.4" width="17" height="4.4" fill="#fffaf0"/><rect x="32" y="12.8" width="17" height="4.4" fill="#2a56b8"/><rect x="32" y="4" width="17" height="13.2" fill="none" stroke="#5b4239" stroke-width="1.5"/></g>' +
    '<path d="M8 40 H56 V50 Q56 53 53 53 H11 Q8 53 8 50 Z" fill="#e8b35f" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M8 33 H56 V40 H8 Z" fill="#ffeaa8" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M8 28 Q8 24 12 24 H52 Q56 24 56 28 V33 H8 Z" fill="#ff8a1f" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M13 28.5 Q20 25.5 27 28.5 T41 28.5 T51 28" fill="none" stroke="#fffaf0" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M12 44 H52" stroke="#c98a45" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2 4"/></svg>';
  pet.appendChild(treat);
  setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
  sound('sparkle');
  say('a tasty tompouce for you! ♡', 2600);
  if (!reduceMotion) {
    treat.animate([{ transform: 'translateY(26px) scale(.4)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'both' });
    pulse('hopsmall', 450);
  }
  setTimeout(function () { say('there is one in your Profile too~', 2000); }, 2800);
  setTimeout(function () {   // the last second: a Dutch flag pops up out of it
    if (!treat.parentNode) return;
    setFace({ eyes: 'sparkle', mouth: 'open', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'sparkles'] });
    sound('magic');
    say('oranje boven!', 1600);
    var r = treat.getBoundingClientRect();
    drift(['🧡', '✦', '👑', '✦'], { x: r.left + r.width / 2, y: r.top }, 4);
    var flag = treat.querySelector('.treat-flag');
    if (flag) { if (!reduceMotion) flag.animate([{ transform: 'translateY(26px)', opacity: 0 }, { transform: 'translateY(-8px)', opacity: 1, offset: 0.55 }, { transform: 'translateY(-4px)', opacity: 1 }], { duration: 550, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'both' }); else flag.setAttribute('opacity', '1'); }
  }, 4200);
  setTimeout(function () {
    if (!treat.parentNode) return;
    setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
    if (reduceMotion) { treat.remove(); return; }
    treat.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(12px) scale(.6)' }], { duration: 500, easing: 'ease-in', fill: 'both' }).onfinish = function () { treat.remove(); };
  }, 5200);
  setTimeout(function () { refreshGift(); showToast('👑', "A King's Day treat is waiting in Profile!", true, 4200); }, 5200);   // (the real one: bonuses.js, the kingsdaygift day)
  return 5800;
}

/** @returns {boolean} Whether another celebration is playing or about to (this one waits for it). */
function kingsOthersBusy() {
  return !!(bdayHold || partyOn || (typeof xmasHolding === 'function' && xmasHolding()) || (typeof halloweenHolding === 'function' && halloweenHolding()) || (typeof newyearHolding === 'function' && newyearHolding()) || (typeof easterHolding === 'function' && easterHolding()));
}
/** Plays the celebration once (the app's or Mini Fumu's). @returns {boolean} Whether it started. */
function kingsParty() {
  if (kingsOn || kingsOthersBusy() || (!devKingsDay && (busy - celebrationHolds() > 0 || baseState() === 'sleepy'))) return false;
  kingsOn = true;
  var small = document.documentElement.classList.contains('desktop-pet'), name = state.player.name;
  busy++;
  bdayToyAway(true);
  releaseKingsHold();
  if (pet.dataset.state === 'sleepy') pet.dataset.state = 'happy';   // (the developer tool wakes him)
  sound('kingsday');   // (the brass-band polka: about 14.5 s, the length of the whole celebration)
  kingsCrown(14500);
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });
  if (small) say(kingsGreeting(name) + ' ♡', 3200, true); else say("happy king's day! ♡", 3000);   // (the app's card already says it)
  pulse('hop', 500);
  var ms = kingsDance(), total = ms + 5800, layer = bdayLayer(9000);
  if (!small) kingsBanner(layer, name);   // (first, so everything else is drawn over the card)
  kingsBunting(layer, total);
  kingsWindmill(layer, total);
  kingsBalloons(layer, total);
  kingsConfetti(layer, total);
  setTimeout(function () { drift(['👑', '🧡', '🎉'], petTop(), 4); }, 1500);
  setTimeout(function () { say('hup Holland hup!', 1800); }, 3600);
  setTimeout(function () { say('oranje boven!', 2000); }, 6000);
  setTimeout(function () { layer.remove(); }, total + 800);
  setTimeout(function () { var more = kingsTreat(); setTimeout(function () { kingsOn = false; busy--; bdayToyAway(false); if (!busy) settle(); }, more); }, ms + 300);   // (the dance, then the tompouce)
  return true;
}
/** Starts it once, on King's Day, when he is awake and not busy (the other celebrations go first when they are pending). */
function kingsCheck() {
  if (!isKingsDay()) return;
  if (kingsDoneToday() && !devKingsDay) return;
  if (document.hidden || document.querySelector('dialog[open]')) return;
  if (kingsOthersBusy()) return;
  if (!kingsParty()) return;
  try { localStorage.setItem('nibble-kingsday-done', B.dayKey(giftDate())); } catch (e) { /* storage not available */ }
}
/** Developer tool: pretends it is King's Day and plays the celebration now. @returns {string} */
function devKingsDayNow() {
  devKingsDay = true;
  if (!kingsParty()) { devKingsDay = false; return 'He is busy or asleep: try again in a moment.'; }
  setTimeout(function () { devKingsDay = false; }, 9000);
  return document.documentElement.classList.contains('desktop-pet') ? 'Mini Fumu\'s King\'s Day: a crown, the royal dance, orange balloons and a tompouce. The King\'s Day box is in Profile on King\'s Day only.' : 'The app\'s King\'s Day: a card, a crown, the royal dance, bunting, balloons, confetti, a windmill and a tompouce. The King\'s Day box is in Profile on King\'s Day only.';
}
// the first time the app is opened on King's Day the celebration comes first, like the others (the hold keeps everything else back, for at most 60 s)
if (isKingsDay() && !kingsDoneToday()) { kingsHold = true; busy++; bdayToyAway(true); kingsHoldTimer = setTimeout(function () { if (!kingsHold) return; releaseKingsHold(); if (!kingsOn && !bdayHold && !partyOn) bdayToyAway(false); if (!busy) settle(); }, 60000); }
var kingsTry = setInterval(function () { if (!kingsHold) { clearInterval(kingsTry); return; } kingsCheck(); }, 1000);
setInterval(kingsCheck, 60000);
