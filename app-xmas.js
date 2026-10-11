// The Christmas celebration (build 614): once on 25 December, the first time the app is opened that day, Fumu puts on a Santa hat and does the party dance while snow falls
// and a string of lights glows along the top, "Jingle Bells" plays, and at the end he hands you a gift box that pops open. A real Christmas box (the `xmasgift` day in bonuses.js)
// is then waiting in Profile. It follows the birthday celebration's way of working (app-birthday.js: the hold that keeps alerts and other animations back, the toy put away, the banner in
// the app and the bubble in Mini Fumu). If it is also the birthday, the birthday goes first.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var devXmas = false, xmasHold = false, xmasHoldTimer = 0, xmasOn = false;
/** @returns {boolean} Whether today is 25 December (or the developer tool is pretending). */
function isChristmas() {
  if (devXmas) return true;
  var d = giftDate();
  return d.getMonth() === 11 && d.getDate() === 25;
}
/** @returns {boolean} Whether today's celebration has already played (or started). */
function xmasDoneToday() {
  var done = '';
  try { done = localStorage.getItem('nibble-xmas-done') || ''; } catch (e) { /* storage not available */ }
  return done === B.dayKey(giftDate());
}
/** @returns {boolean} Whether alerts and reminders should wait (birthdayHolding in app-birthday.js asks this too). */
function xmasHolding() { return xmasHold || xmasOn; }
function releaseXmasHold() {
  if (!xmasHold) return;
  xmasHold = false;
  clearTimeout(xmasHoldTimer);
  busy--;
}
/** @returns {string} "Merry Christmas Name!" (in Dutch "Vrolijk kerstfeest Name!"), without the name when there is none. @param {string} name */
function xmasGreeting(name) {
  var nl = typeof Lang === 'object' && Lang.get() === 'nl';
  return (nl ? 'Vrolijk kerstfeest' : 'Merry Christmas') + (name ? ' ' + name : '') + '!';
}

/** A Santa hat on his head, drawn in the pet's own picture beside the worn hats (like the birthday hat), so it goes with him in the dance; it comes off after ms. */
function xmasHat(ms) {
  var slot = pet.querySelector('.outfit-hat'), layer = slot && slot.parentNode;
  if (!layer) return;
  var hat = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hat.setAttribute('class', 'xmas-hat');
  hat.innerHTML = '<g transform="translate(83 38) rotate(-3)"><path d="M-16 0 Q-14 -24 3 -30 Q16 -34 22 -22 Q23 -16 18 -12 Q16 -6 16 0 Z" fill="#e8445a" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M-8 -14 Q-2 -22 6 -24" fill="none" stroke="#ff909d" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="-19" y="-5" width="38" height="9" rx="4.5" fill="#fffaf0" stroke="#5b4239" stroke-width="2"/>' +
    '<circle cx="22" cy="-20" r="5" fill="#fffaf0" stroke="#5b4239" stroke-width="2"/></g>';
  layer.appendChild(hat);
  setTimeout(function () { if (hat.parentNode) hat.remove(); }, ms);
}

/** A string of coloured lights draped across the top that glow one after another; it drops in and, when the party is over, lifts away. @param {Element} layer @param {number} ms */
function xmasLights(layer, ms) {
  var w = window.innerWidth, step = 34, n = Math.max(4, Math.round(w / step)), sx = w / n, cols = ['#ff3d5a', '#ffd23f', '#2fbf71', '#3fa7ff'];
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', 46); svg.setAttribute('viewBox', '0 0 ' + w + ' 46');
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  var d = 'M0 1', bulbs = '';
  for (var i = 0; i < n; i++) {
    var x0 = i * sx, x1 = x0 + sx;
    d += ' Q' + (x0 + sx / 2) + ' 17 ' + x1 + ' 1';
    var bx = x0 + sx / 2, by = 8;   // (on the dip of the wire)
    bulbs += '<g class="xmas-bulb"><rect x="' + (bx - 2) + '" y="' + (by - 1) + '" width="4" height="3.5" fill="#4d3c43"/><ellipse cx="' + bx + '" cy="' + (by + 5.5) + '" rx="3.6" ry="5" fill="' + cols[i % 4] + '" stroke="#5b4239" stroke-width="1.4"/>' +
      '<ellipse cx="' + (bx - 1.2) + '" cy="' + (by + 4) + '" rx="1" ry="1.6" fill="#fff" opacity=".7"/></g>';
  }
  svg.innerHTML = '<path d="' + d + '" fill="none" stroke="#4d3c43" stroke-width="1.8"/>' + bulbs;
  layer.appendChild(svg);
  if (reduceMotion) return;
  svg.animate([{ transform: 'translateY(-50px)' }, { transform: 'translateY(0)' }], { duration: 700, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'both' });
  [].forEach.call(svg.querySelectorAll('.xmas-bulb ellipse:first-of-type'), function (b, k) {   // (a soft glow that travels along the string; slow and gentle, never a flash)
    b.animate([{ opacity: 1, filter: 'brightness(1)' }, { opacity: 1, filter: 'brightness(1.5) saturate(1.3)', offset: 0.5 }, { opacity: 1, filter: 'brightness(1)' }], { duration: 1600, delay: k * 140, iterations: Infinity, easing: 'ease-in-out' });
  });
  setTimeout(function () { svg.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-60px)' }], { duration: 600, easing: 'ease-in', fill: 'both' }); }, ms - 700);
}

/** Snow falling over the page all through the celebration: round flakes and snowflake stars, slow and drifting. @param {Element} layer @param {number} ms */
function xmasSnow(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight, count = w < 500 ? 70 : 110;
  for (var i = 0; i < count; i++) {
    var el = document.createElement('i'), big = i % 3 === 0, sz = big ? 10 + Math.random() * 8 : 4 + Math.random() * 5, x = Math.random() * w, sway = (Math.random() - 0.5) * 70, dur = 6000 + Math.random() * 3500;
    if (big) { el.textContent = '❄'; el.style.cssText = 'position:absolute;left:0;top:0;font-style:normal;line-height:1;font-size:' + sz + 'px;color:#fff;text-shadow:0 0 3px #5b8fd0,0 0 1px #5b8fd0'; }
    else el.style.cssText = 'position:absolute;left:0;top:0;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px #c5dcf5,0 0 6px 1px #9fc3ee';
    layer.appendChild(el);
    el.animate([
      { transform: 'translate(' + x + 'px,-20px) rotate(0deg)', opacity: 0 },
      { transform: 'translate(' + (x + sway * 0.4) + 'px,' + h * 0.1 + 'px) rotate(40deg)', opacity: 1, offset: 0.08 },
      { transform: 'translate(' + (x + sway) + 'px,' + h * 0.55 + 'px) rotate(' + (big ? 160 : 0) + 'deg)', opacity: 1, offset: 0.6 },
      { transform: 'translate(' + (x + sway * 0.3) + 'px,' + (h + 20) + 'px) rotate(' + (big ? 300 : 0) + 'deg)', opacity: 0.8 }
    ], { duration: dur, delay: Math.random() * Math.max(500, ms - 4000), easing: 'linear', fill: 'both' }).onfinish = el.remove.bind(el);
  }
}

var XMAS_TREATS = [   // little gingerbread men and candy canes that fall slowly with the snow
  '<svg viewBox="0 0 20 24" width="20" height="24"><path d="M10 1.5a4 4 0 1 1 0 8a4 4 0 1 1 0 -8zM6 10h8l4 1.5l-1.2 3.3l-2.8 -1v3.8l2.2 5.2l-3.4 1.2l-2.8 -4.2l-2.8 4.2l-3.4 -1.2l2.2 -5.2v-3.8l-2.8 1l-1.2 -3.3z" fill="#c98a45" stroke="#5b4239" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8.6" cy="5" r=".9" fill="#5b4239"/><circle cx="11.4" cy="5" r=".9" fill="#5b4239"/><path d="M8.6 7 Q10 8 11.4 7" fill="none" stroke="#fff6ec" stroke-width="1" stroke-linecap="round"/><circle cx="10" cy="13" r="1" fill="#e8445a"/><circle cx="10" cy="16.4" r="1" fill="#2fbf71"/></svg>',
  '<svg viewBox="0 0 20 24" width="18" height="22"><path d="M6 22V9a4.2 4.2 0 0 1 8.4 0" fill="none" stroke="#5b4239" stroke-width="5.4" stroke-linecap="round"/><path d="M6 22V9a4.2 4.2 0 0 1 8.4 0" fill="none" stroke="#fffaf0" stroke-width="3.2" stroke-linecap="round"/><path d="M6 22V9a4.2 4.2 0 0 1 8.4 0" fill="none" stroke="#e8445a" stroke-width="3.2" stroke-dasharray="2.2 3.4"/></svg>'
];
/** Gingerbread men and candy canes tumbling gently down with the snow. @param {Element} layer @param {number} ms */
function xmasTreats(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight;
  for (var i = 0; i < 9; i++) {
    var el = document.createElement('span'), x = 10 + Math.random() * (w - 40), sway = (Math.random() - 0.5) * 80, dur = 8500 + Math.random() * 3000;
    el.innerHTML = XMAS_TREATS[i % 2];
    el.style.cssText = 'position:absolute;left:0;top:0;line-height:0';
    layer.appendChild(el);
    el.animate([
      { transform: 'translate(' + x + 'px,-30px) rotate(-20deg)', opacity: 0 },
      { transform: 'translate(' + (x + sway * 0.4) + 'px,' + h * 0.08 + 'px) rotate(15deg)', opacity: 1, offset: 0.06 },
      { transform: 'translate(' + (x + sway) + 'px,' + h * 0.5 + 'px) rotate(-18deg)', opacity: 1, offset: 0.5 },
      { transform: 'translate(' + (x + sway * 0.2) + 'px,' + (h + 30) + 'px) rotate(22deg)', opacity: 1 }
    ], { duration: dur, delay: 800 + Math.random() * Math.max(500, ms - 8000), easing: 'ease-in-out', fill: 'both' }).onfinish = el.remove.bind(el);
  }
}

/** A little decorated Christmas tree that pops up beside him (on his left, away from the speech bubble), with a twinkling star and baubles; it goes with him if he walks. @param {number} ms How long it stays. */
function xmasTree(ms) {
  var tree = document.createElement('span');
  tree.className = 'xmas-tree';
  tree.setAttribute('aria-hidden', 'true');
  tree.innerHTML = '<svg viewBox="0 0 52 64" width="52" height="64"><rect x="22" y="52" width="8" height="9" rx="1.5" fill="#b8794a" stroke="#5b4239" stroke-width="2"/>' +
    '<path d="M26 22 L10 46 H42 Z" fill="#2fbf71" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/><path d="M26 10 L13 32 H39 Z" fill="#3fcf81" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/><path d="M26 38 L7 56 H45 Z" fill="#27a862" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M26 5 l2.4 5 5.4.6 -4 3.7 1.1 5.3 -4.9 -2.7 -4.9 2.7 1.1 -5.3 -4 -3.7 5.4 -.6z" class="xmas-star" fill="#ffd36b" stroke="#5b4239" stroke-width="1.6" stroke-linejoin="round" transform="translate(0 -3)"/>' +
    '<circle class="xmas-bauble" cx="22" cy="28" r="2.6" fill="#ff3d5a" stroke="#5b4239" stroke-width="1.2"/><circle class="xmas-bauble" cx="31" cy="35" r="2.6" fill="#ffd23f" stroke="#5b4239" stroke-width="1.2"/>' +
    '<circle class="xmas-bauble" cx="19" cy="46" r="2.6" fill="#3fa7ff" stroke="#5b4239" stroke-width="1.2"/><circle class="xmas-bauble" cx="30" cy="50" r="2.6" fill="#ff3d5a" stroke="#5b4239" stroke-width="1.2"/><circle class="xmas-bauble" cx="37" cy="52" r="2.2" fill="#ffd23f" stroke="#5b4239" stroke-width="1.2"/></svg>';
  pet.appendChild(tree);
  if (reduceMotion) { setTimeout(function () { tree.remove(); }, ms); return; }
  tree.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.18)', opacity: 1, offset: 0.55 }, { transform: 'scale(.93)', offset: 0.78 }, { transform: 'scale(1)', opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'both' });
  [].forEach.call(tree.querySelectorAll('.xmas-bauble, .xmas-star'), function (b, k) { b.animate([{ opacity: 1 }, { opacity: .45 }, { opacity: 1 }], { duration: 1400, delay: k * 230, iterations: Infinity, easing: 'ease-in-out' }); });
  sound('sparkle');
  setTimeout(function () {
    if (!tree.parentNode) return;
    tree.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], { duration: 450, easing: 'ease-in', fill: 'both' }).onfinish = function () { tree.remove(); };
  }, ms);
}

/** The app: a banner drops in from the top (a red and green one). @param {Element} layer @param {string} name */
function xmasBanner(layer, name) {
  var banner = document.createElement('div');
  banner.style.cssText = 'position:absolute;left:0;right:0;top:34px;margin:0 auto;width:90%;max-width:360px;box-sizing:border-box;padding:10px 14px;border-radius:18px;background:#fffaf0;color:#5b4239;' +
    'border:2.5px solid #e8445a;box-shadow:0 4px 0 #2fbf71;text-align:center;font-weight:700;font-size:17px';
  banner.textContent = '🎄 ' + xmasGreeting(name) + ' 🎅';
  layer.appendChild(banner);
  if (!reduceMotion) banner.animate([{ transform: 'translateY(-110px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1, offset: 0.85 }, { transform: 'translateY(-110px)', opacity: 0 }], { duration: 8000, fill: 'both' });
}

/** The end of the party: he holds out a gift box for you; in the last second the lid pops off with a puff of stars; then a real Christmas box is waiting in Profile. @returns {number} How long it takes, in ms. */
function xmasGift() {
  var gift = document.createElement('span'), clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]');
  gift.className = 'bday-cake xmas-gift';   // (the same spot in front of his tummy as the birthday cake)
  gift.setAttribute('aria-hidden', 'true');
  gift.innerHTML = '<svg viewBox="0 0 64 60" width="64" height="60"><ellipse cx="32" cy="56" rx="27" ry="4" fill="#00000018"/>' +
    '<rect x="9" y="26" width="46" height="29" rx="4" fill="#e8445a" stroke="#5b4239" stroke-width="2"/>' +
    '<rect x="27" y="26" width="10" height="29" fill="#ffd36b" stroke="#5b4239" stroke-width="2"/>' +
    '<path d="M13 31 V50" stroke="#ff909d" stroke-width="2" stroke-linecap="round"/>' +
    '<g class="xmas-lid"><rect x="5" y="16" width="54" height="12" rx="4" fill="#ff5a73" stroke="#5b4239" stroke-width="2"/><rect x="27" y="16" width="10" height="12" fill="#ffd36b" stroke="#5b4239" stroke-width="2"/>' +
    '<path d="M32 16 Q18 2 16 9 Q15 15 32 16 Z M32 16 Q46 2 48 9 Q49 15 32 16 Z" fill="#ffd36b" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/><circle cx="32" cy="15" r="3.2" fill="#ffb347" stroke="#5b4239" stroke-width="1.6"/></g></svg>';
  pet.appendChild(gift);
  setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
  sound('sparkle');
  say('merry christmas! a gift for you ♡', 2600);
  if (!reduceMotion) {
    gift.animate([{ transform: 'translateY(26px) scale(.4)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'both' });
    pulse('hopsmall', 450);
  }
  setTimeout(function () { say('there is one in your Profile too~', 2000); }, 2800);
  setTimeout(function () {   // the last second: the lid pops open with a puff of stars
    if (!gift.parentNode) return;
    setFace({ eyes: 'sparkle', mouth: 'open', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'sparkles'] });
    sound('magic');
    var r = gift.getBoundingClientRect();
    drift(['⭐', '✦', '🎄', '✦'], { x: r.left + r.width / 2, y: r.top }, 4);
    var lid = gift.querySelector('.xmas-lid');
    if (lid && !reduceMotion) lid.animate([{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(-22px) rotate(-16deg)', offset: 0.5 }, { transform: 'translateY(-16px) rotate(-12deg)' }], { duration: 600, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'both' });
  }, 4200);
  setTimeout(function () {
    if (!gift.parentNode) return;
    setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
    if (reduceMotion) { gift.remove(); return; }
    gift.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(12px) scale(.6)' }], { duration: 500, easing: 'ease-in', fill: 'both' }).onfinish = function () { gift.remove(); };
  }, 5200);
  setTimeout(function () { refreshGift(); showToast('🎁', 'A Christmas box is waiting in Profile!', true, 4200); }, 5200);   // (the real one: bonuses.js, the xmasgift day)
  return 5800;
}

/** Plays the celebration once (the app's or Mini Fumu's). @returns {boolean} Whether it started. */
function xmasParty() {
  if (xmasOn || bdayHold || partyOn || (!devXmas && (busy - (xmasHold ? 1 : 0) > 0 || baseState() === 'sleepy'))) return false;
  xmasOn = true;
  var small = document.documentElement.classList.contains('desktop-pet'), name = state.player.name;
  busy++;
  bdayToyAway(true);
  releaseXmasHold();
  if (pet.dataset.state === 'sleepy') pet.dataset.state = 'happy';   // (the developer tool wakes him)
  sound('christmas');   // (Jingle Bells: about 15 s, the length of the whole celebration)
  xmasHat(14500);
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });
  if (small) say(xmasGreeting(name) + ' ♡', 3200, true); else say('ho ho ho! ♡', 3000);   // (the app's banner already says it)
  pulse('hop', 500);
  var ms = partyDance(true), total = ms + 5800, layer = bdayLayer(9000);
  xmasLights(layer, total);   // (the lights hang along the very top edge, over the bar)
  xmasSnow(layer, total);
  xmasTreats(layer, total);
  if (!small) xmasBanner(layer, name);
  setTimeout(function () { drift(['🎄', '⭐', '❄'], petTop(), 4); }, 1500);
  setTimeout(function () { xmasTree(total - 2400); }, 1100);   // (a little tree pops up beside him and stays until the gift)
  setTimeout(function () { say('jingle jingle~', 1800); }, 3600);
  setTimeout(function () { say('look, it is snowing!', 2000); }, 6200);
  setTimeout(function () { layer.remove(); }, total + 800);
  setTimeout(function () { var more = xmasGift(); setTimeout(function () { xmasOn = false; busy--; bdayToyAway(false); if (!busy) settle(); }, more); }, ms + 300);   // (the dance, then the gift)
  return true;
}
/** Starts it once, on 25 December, when he is awake and not busy (the birthday celebration goes first when it is also the birthday). */
function xmasCheck() {
  if (!isChristmas()) return;
  if (xmasDoneToday() && !devXmas) return;
  if (document.hidden || document.querySelector('dialog[open]')) return;
  if (bdayHold || partyOn) return;
  if (!xmasParty()) return;
  try { localStorage.setItem('nibble-xmas-done', B.dayKey(giftDate())); } catch (e) { /* storage not available */ }
}
/** Developer tool: pretends it is Christmas and plays the celebration now. @returns {string} */
function devXmasNow() {
  devXmas = true;
  if (!xmasParty()) { devXmas = false; return 'He is busy or asleep: try again in a moment.'; }
  setTimeout(function () { devXmas = false; }, 9000);
  return document.documentElement.classList.contains('desktop-pet') ? 'Mini Fumu\'s Christmas: snow, lights, Jingle Bells and a gift. The Christmas box is in Profile on 25 December only.' : 'The app\'s Christmas: a banner, snow, lights, Jingle Bells, the party dance and a gift. The Christmas box is in Profile on 25 December only.';
}
// the first time the app is opened on Christmas Day the celebration comes first, like the birthday one (the hold keeps everything else back, for at most 60 s)
if (isChristmas() && !xmasDoneToday()) { xmasHold = true; busy++; bdayToyAway(true); xmasHoldTimer = setTimeout(function () { if (!xmasHold) return; releaseXmasHold(); if (!xmasOn && !bdayHold && !partyOn) bdayToyAway(false); if (!busy) settle(); }, 60000); }
var xmasTry = setInterval(function () { if (!xmasHold) { clearInterval(xmasTry); return; } xmasCheck(); }, 1000);
setInterval(xmasCheck, 60000);
