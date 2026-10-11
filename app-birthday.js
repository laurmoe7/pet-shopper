// The birthday celebration: once on the player's birthday (state.player.birthday), Fumu puts on a party hat and does the party dance, with fireworks, and ends by handing you a cake.
// The app (phone, full app) rains confetti over the page and shows a banner; Mini Fumu (the small window) sends up balloons instead, with no banner.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var devBirthday = false;
/** @returns {boolean} Whether today is the player's birthday (or the developer tool is pretending). */
function isBirthday() {
  if (devBirthday) return true;
  var b = state.player.birthday;
  return !!b && b === B.dayKey(giftDate()).slice(5);
}
/** @returns {string} "Happy Birthday Name!" (in Dutch "Gefeliciteerd Name!"), without the name when there is none. @param {string} name */
function bdayGreeting(name) {
  var nl = typeof Lang === 'object' && Lang.get() === 'nl';
  return (nl ? 'Gefeliciteerd' : 'Happy Birthday') + (name ? ' ' + name : '') + '!';
}
var FW_COLOURS = ['#ff3d7f', '#ff9f1a', '#1e9bff', '#8e5bff', '#12b886', '#ff6a3d'];   // (fireworks: stronger than the confetti, so they show up on the pale page)
var BDAY_COLOURS = ['#ff8fb1', '#ffd36b', '#8fd3ff', '#b69cff', '#9be3a8', '#ff9f7a'];
function bdayLayer(z) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:' + (z || 9000);
  document.body.appendChild(el);
  return el;
}
/** A paper party hat on his head, drawn in the pet's own picture on the hat layer, so it goes with him in every dance and squash; it comes off again after ms. */
function bdayHat(ms) {
  var slot = pet.querySelector('.outfit-hat'), layer = slot && slot.parentNode;   // (beside the worn hats, not inside: the dressing code empties that layer whenever his outfit is drawn again, which took the party hat off)
  if (!layer) return;
  var hat = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hat.setAttribute('class', 'bday-hat');
  hat.innerHTML = '<g transform="translate(83 37) rotate(-4)"><path d="M0 -30 L15 0 Q0 5 -15 0 Z" fill="#ff8fb1" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M-8 -12 L8 -12 M-12 -5 L12 -5" stroke="#fff6ec" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-31" r="4" fill="#ffd36b" stroke="#5b4239" stroke-width="2"/></g>';
  layer.appendChild(hat);
  setTimeout(function () { if (hat.parentNode) hat.remove(); }, ms);
}
/**
 * Fireworks for the whole party (build 611): a rocket climbs with a trail, then bursts into streaks of light with a soft glow, a few sparks hang and fall like glitter, and every
 * third one is a heart. One burst about every 1.7 s from the start until `ms`, the last of them a double one. They go off away from him (`bdaySpot`), over the page. Gentle on purpose: slow, soft glow, nothing flashes. @param {Element} layer @param {number} ms How long to keep going.
 */
function bdayFireworks(layer, ms) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight, reach = Math.max(46, Math.min(w, h) * 0.32), n = 0;
  /** One burst at (cx, cy) in colours a and b; kind: 0 streaks, 1 ring of dots, 2 heart. */
  function burst(cx, cy, a, b, kind) {
    var glow = document.createElement('i');   // a soft round glow that eases in and out (no flash)
    glow.style.cssText = 'position:absolute;left:' + (cx - reach * 0.6) + 'px;top:' + (cy - reach * 0.6) + 'px;width:' + reach * 1.2 + 'px;height:' + reach * 1.2 + 'px;border-radius:50%;background:radial-gradient(circle,' + a + '88 0%,' + a + '33 45%,transparent 70%)';
    layer.appendChild(glow);
    glow.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.15)' }], { duration: 1500, easing: 'ease-out', fill: 'both' }).onfinish = function () { glow.remove(); };
    var pts = [], k, t;
    if (kind === 2) for (k = 0; k < 30; k++) { t = (k / 30) * Math.PI * 2; pts.push([16 * Math.pow(Math.sin(t), 3) / 16, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]); }   // (a heart)
    else for (k = 0; k < (kind ? 22 : 26); k++) { t = (k / (kind ? 22 : 26)) * Math.PI * 2 + (kind ? 0 : (k % 2) * 0.1); pts.push([Math.cos(t), Math.sin(t)]); }
    pts.forEach(function (p, i) {
      var col = i % 2 ? b : a, dx = p[0] * reach * (kind === 0 && i % 2 ? 0.7 : 1), dy = p[1] * reach * (kind === 0 && i % 2 ? 0.7 : 1), el = document.createElement('i'), ang = Math.atan2(dy, dx) * 180 / Math.PI;
      layer.appendChild(el);
      if (kind === 0) {   // streaks: short bars that point away from the middle and shrink as they go
        el.style.cssText = 'position:absolute;left:' + (cx - 11) + 'px;top:' + (cy - 2) + 'px;width:22px;height:4px;border-radius:2px;background:linear-gradient(90deg,transparent,' + col + ' 60%,#fff);box-shadow:0 0 8px 1px ' + col;
        el.animate([
          { transform: 'translate(0,0) rotate(' + ang + 'deg) scaleX(.2)', opacity: 1 },
          { transform: 'translate(' + dx * 0.8 + 'px,' + dy * 0.8 + 'px) rotate(' + ang + 'deg) scaleX(1.1)', opacity: 1, offset: 0.55 },
          { transform: 'translate(' + dx * 1.05 + 'px,' + (dy * 1.05 + reach * 0.3) + 'px) rotate(' + (ang + 25) + 'deg) scaleX(.2)', opacity: 0 }
        ], { duration: 2000, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'both' }).onfinish = function () { el.remove(); };
      } else {   // rings and hearts: glowing dots that open out, hang, and sink
        el.style.cssText = 'position:absolute;left:' + (cx - 5) + 'px;top:' + (cy - 5) + 'px;width:10px;height:10px;border-radius:50%;background:' + col + ';box-shadow:0 0 0 2px #fff,0 0 10px 3px ' + col;
        el.animate([
          { transform: 'translate(0,0) scale(.4)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1, offset: 0.55 },
          { transform: 'translate(' + dx * 1.04 + 'px,' + (dy * 1.04 + reach * 0.45) + 'px) scale(.3)', opacity: 0 }
        ], { duration: 2400, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).onfinish = function () { el.remove(); };
      }
    });
    for (k = 0; k < 9; k++) {   // glitter: little sparks that hang in the air, twinkle and drift down
      var g = document.createElement('i'), ga = Math.random() * Math.PI * 2, gd = reach * (0.35 + Math.random() * 0.7), gc = k % 2 ? a : '#ffd84a', gx = cx + Math.cos(ga) * gd, gy = cy + Math.sin(ga) * gd;
      g.style.cssText = 'position:absolute;left:' + (gx - 3) + 'px;top:' + (gy - 3) + 'px;width:6px;height:6px;border-radius:50%;background:' + gc + ';box-shadow:0 0 0 1.5px #fff,0 0 8px 2px ' + gc;
      layer.appendChild(g);
      g.animate([{ transform: 'translate(0,0) scale(0)', opacity: 0 }, { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0.25 }, { transform: 'translate(0,' + reach * 0.15 + 'px) scale(.7)', opacity: 0.35, offset: 0.55 }, { transform: 'translate(0,' + (reach * 0.4 + Math.random() * 20) + 'px) scale(.2)', opacity: 0 }],
        { duration: 2100, delay: 450 + Math.random() * 450, easing: 'ease-out', fill: 'both' }).onfinish = function () { g.remove(); };
    }
  }
  /** @returns {number[]} A random place for a burst, as far from him as a dozen tries give: his own drawing stays clear, in the app and in the small window. */
  function bdaySpot(w, h, reach) {
    var r = pet.getBoundingClientRect(), best = null, bestD = -1;
    for (var i = 0; i < 14; i++) {
      var x = w * (0.12 + Math.random() * 0.76), y = h * (0.12 + Math.random() * 0.5);
      var dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom), d = Math.hypot(dx, dy);
      if (d >= reach * 0.9) return [x, y];
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    return best;
  }
  /** Sends a rocket up from the bottom and bursts it where it stops. */
  function launch(last) {
    if (!layer.parentNode) return;
    var kind = n % 3 === 2 ? 2 : n % 3, spot = bdaySpot(w, h, reach), cx = spot[0], cy = spot[1];
    var a = FW_COLOURS[(n * 2) % FW_COLOURS.length], b = FW_COLOURS[(n * 2 + 3) % FW_COLOURS.length];
    var rocket = document.createElement('i');
    rocket.style.cssText = 'position:absolute;left:' + (cx - 1.5) + 'px;top:0;width:3px;height:22px;border-radius:2px;background:linear-gradient(0deg,transparent,#fff6ec);box-shadow:0 0 6px #ffd36b';
    layer.appendChild(rocket);
    var rise = h - cy + 20;
    rocket.animate([{ transform: 'translateY(' + (h + 10) + 'px)', opacity: 0.9 }, { transform: 'translateY(' + cy + 'px)', opacity: 1, offset: 0.92 }, { transform: 'translateY(' + cy + 'px)', opacity: 0 }], { duration: 550 + rise * 0.35, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'both' }).onfinish = function () {
      rocket.remove();
      if (!layer.parentNode) return;
      sound('sparkle');
      burst(cx, cy, a, b, kind);
      if (last) burst(Math.min(w - reach * 0.4, Math.max(reach * 0.4, w - cx)), cy + reach * 0.3, FW_COLOURS[(n * 2 + 1) % FW_COLOURS.length], FW_COLOURS[(n * 2 + 4) % FW_COLOURS.length], 0);
    };
    n++;
  }
  for (var at = 500; at < ms - 900; at += 1700 + Math.random() * 300) (function (at, last) { setTimeout(function () { launch(last); }, at); })(at, at + 2000 >= ms - 900);
}
/** The app: confetti rains down over the whole page and a banner drops in from the top. */
function bdayApp(name) {
  var layer = bdayLayer(), w = window.innerWidth, h = window.innerHeight;
  if (!reduceMotion) for (var i = 0; i < 46; i++) {
    var c = document.createElement('i'), x = Math.random() * w, sz = 6 + Math.random() * 6;
    c.style.cssText = 'position:absolute;left:0;top:0;width:' + sz + 'px;height:' + sz * 1.6 + 'px;border-radius:2px;background:' + BDAY_COLOURS[i % BDAY_COLOURS.length];
    layer.appendChild(c);
    c.animate([
      { transform: 'translate(' + x + 'px,-20px) rotate(0)', opacity: 1 },
      { transform: 'translate(' + (x + (Math.random() - 0.5) * 120) + 'px,' + h + 'px) rotate(' + (360 + Math.random() * 360) + 'deg)', opacity: 1 }
    ], { duration: 3200 + Math.random() * 2600, delay: Math.random() * 2600, easing: 'ease-in', fill: 'both' });
  }
  var banner = document.createElement('div');
  banner.style.cssText = 'position:absolute;left:0;right:0;top:14px;margin:0 auto;width:90%;max-width:360px;box-sizing:border-box;padding:10px 14px;border-radius:18px;background:#fff6ec;color:#5b4239;' +
    'border:2.5px solid #ff8fb1;box-shadow:0 4px 0 #ffd0dd;text-align:center;font-weight:700;font-size:17px';
  banner.textContent = '🎂 ' + bdayGreeting(name) + ' 🎉';
  layer.appendChild(banner);
  if (!reduceMotion) banner.animate([{ transform: 'translateY(-90px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1, offset: 0.85 }, { transform: 'translateY(-90px)', opacity: 0 }], { duration: 7000, fill: 'both' });
  setTimeout(function () { layer.remove(); }, 8200);
}
/** Mini Fumu: balloons float up past him, and hearts and stars drift off him. */
function bdayDesk() {
  var layer = bdayLayer(), w = window.innerWidth, h = window.innerHeight;
  if (!reduceMotion) for (var i = 0; i < 9; i++) {
    var b = document.createElement('span'), x = 10 + (w - 50) * (i / 8) + (Math.random() - 0.5) * 16, col = BDAY_COLOURS[i % BDAY_COLOURS.length];
    b.style.cssText = 'position:absolute;left:0;top:0;width:24px;height:30px';
    b.innerHTML = '<svg viewBox="0 0 24 30" width="24" height="30"><ellipse cx="12" cy="11" rx="9.5" ry="10.5" fill="' + col + '" stroke="#5b4239" stroke-width="1.8"/>' +
      '<ellipse cx="8.5" cy="7" rx="2.4" ry="3.2" fill="#fff" opacity=".55"/><path d="M12 21.5 Q9 25 12 29" fill="none" stroke="#5b4239" stroke-width="1.4"/></svg>';
    layer.appendChild(b);
    b.animate([
      { transform: 'translate(' + x + 'px,' + (h + 10) + 'px)', opacity: 1 },
      { transform: 'translate(' + (x + 14) + 'px,' + h * 0.5 + 'px)', opacity: 1, offset: 0.5 },
      { transform: 'translate(' + (x - 6) + 'px,-50px)', opacity: 1 }
    ], { duration: 4200 + Math.random() * 1800, delay: i * 420, easing: 'ease-in-out', fill: 'both' });
  }
  setTimeout(function () { layer.remove(); }, 9500);
}
/** The end of the party: he holds out a birthday cake for you, says so, and after a few seconds it goes again (build 605). @returns {number} How long it takes, in ms. */
function bdayCake() {
  var cake = document.createElement('span'), clip = document.documentElement.matches('[data-scene$="clip"], [data-list="todo"]');
  cake.className = 'bday-cake';
  cake.setAttribute('aria-hidden', 'true');
  cake.innerHTML = '<svg viewBox="0 0 64 60" width="64" height="60"><ellipse cx="32" cy="55" rx="29" ry="5" fill="#fff6ec" stroke="#5b4239" stroke-width="2"/>' +
    '<path d="M9 31 H55 V50 Q32 57 9 50 Z" fill="#f3c98f" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M9 31 Q9 20 20 20 H44 Q55 20 55 31 Q50 36 46 31 Q42 38 37 31 Q32 38 27 31 Q22 36 18 31 Q13 36 9 31 Z" fill="#ff8fb1" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M16 40 H48" stroke="#fff6ec" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 5"/>' +
    '<circle cx="32" cy="16" r="5" fill="#ee5b6f" stroke="#5b4239" stroke-width="2"/>' +
    '<rect x="30" y="4" width="4" height="9" rx="1.5" fill="#8fd3ff" stroke="#5b4239" stroke-width="1.6"/>' +
    '<path class="flame" d="M32 -1 Q36 3 32 6 Q28 3 32 -1 Z" fill="#ffd36b" stroke="#e8885a" stroke-width="1.2"/></svg>';
  pet.appendChild(cake);
  setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
  sound('sparkle');
  say(pick(['this cake is for you! ♡', 'happy birthday! cake for you ♡']), 2600, true);
  if (!reduceMotion) {
    cake.animate([{ transform: 'translateY(26px) scale(.4)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'both' });
    pulse('hopsmall', 450);
  }
  setTimeout(function () { say(pick(['make a wish~', 'blow out the candle!']), 2000, true); }, 2800);
  setTimeout(function () {   // the last second: he blows the candle out (the flame snuffs, a curl of smoke rises, a puff of air leaves his mouth)
    if (!cake.parentNode) return;
    setFace({ eyes: 'closed', mouth: 'o', arms: clip ? 'rest' : 'carry', x: ['cheeks'] });
    sound('swoosh');
    drift(['💨'], mouthPoint(), 1);
    var flame = cake.querySelector('.flame'), svg = cake.querySelector('svg');
    if (flame) { flame.style.animation = 'none'; if (!reduceMotion) flame.animate([{ opacity: 1, transform: 'scale(1) translateX(0)' }, { opacity: 1, transform: 'scale(.9,.7) translateX(-3px)', offset: 0.3 }, { opacity: 0, transform: 'scale(.1) translateX(-5px)' }], { duration: 350, easing: 'ease-in', fill: 'both' }); else flame.style.display = 'none'; }
    if (svg && !reduceMotion) {
      var smoke = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      smoke.setAttribute('d', 'M32 4 Q28 -2 33 -6 Q37 -10 32 -15');
      smoke.setAttribute('fill', 'none'); smoke.setAttribute('stroke', '#b9aaa3'); smoke.setAttribute('stroke-width', '2.2'); smoke.setAttribute('stroke-linecap', 'round');
      svg.appendChild(smoke);
      smoke.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: .9, transform: 'translateY(-2px)', offset: 0.3 }, { opacity: 0, transform: 'translateY(-14px)' }], { duration: 900, easing: 'ease-out', fill: 'both' }).onfinish = function () { smoke.remove(); };
    }
  }, 4200);
  setTimeout(function () {
    if (!cake.parentNode) return;
    setFace({ eyes: 'happy', mouth: 'smile', arms: clip ? 'rest' : 'carry', x: ['cheeks', 'hearts'] });
    if (reduceMotion) { cake.remove(); return; }
    cake.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(12px) scale(.6)' }], { duration: 500, easing: 'ease-in', fill: 'both' }).onfinish = function () { cake.remove(); };
  }, 5200);
  return 5800;
}
/** Plays the celebration once (the app's or Mini Fumu's). @returns {boolean} Whether it started. */
/** The toy goes away for the party (hidden from the moment the app opens on the birthday) and, once it is over, pops back in: it spins and bounces up out of nothing with a little sparkle (build 612). */
function bdayToyAway(away) {
  stage.classList.toggle('bday-toyaway', away);
  if (away || typeof toyEl === 'undefined' || !toyEl || getComputedStyle(toyEl).display === 'none') return;
  if (!reduceMotion) toyEl.animate([
    { scale: '0', rotate: '-240deg', opacity: 0 },
    { scale: '1.4', rotate: '14deg', opacity: 1, offset: 0.55 },
    { scale: '.85', rotate: '-6deg', offset: 0.78 },
    { scale: '1', rotate: '0deg', opacity: 1 }
  ], { duration: 750, easing: 'ease-out' });
  sound('bounce');
  var r = toyEl.getBoundingClientRect();
  drift(['✦', '♪', '✦'], { x: r.left + r.width / 2, y: r.top }, 3);
}
var bdayHold = false, bdayHoldTimer = 0;   // on the birthday, from the moment the app opens until the party starts, he is held "busy" so nothing else (a wish, a steal, an idle move) begins first
/** @returns {boolean} Whether today's party has already played (or started). */
function bdayDoneToday() {
  var done = '';
  try { done = localStorage.getItem('nibble-bday-done') || ''; } catch (e) { /* storage not available */ }
  return done === B.dayKey(giftDate());
}
/** Ends the hold (the party is starting, or it could not start in time: he was asleep, say). */
function releaseBdayHold() {
  if (!bdayHold) return;
  bdayHold = false;
  clearTimeout(bdayHoldTimer);
  busy--;
}
/** @returns {boolean} Whether alerts and reminders should wait: the birthday party is about to play or is playing. */
function birthdayHolding() { return bdayHold || partyOn || (typeof xmasHolding === 'function' && xmasHolding()); }   // (the Christmas celebration holds things back the same way)
var partyOn = false;   // (one party at a time: the developer tool pretends it is the birthday, and the check that runs every so often would start a second one)
function birthdayParty() {
  if (partyOn || (!devBirthday && (busy - (bdayHold ? 1 : 0) > 0 || baseState() === 'sleepy'))) return false;
  partyOn = true;
  var small = document.documentElement.classList.contains('desktop-pet'), name = state.player.name;
  busy++;
  bdayToyAway(true);
  releaseBdayHold();   // (the party's count replaces the hold's, so he is never free in between)
  if (pet.dataset.state === 'sleepy') pet.dataset.state = 'happy';   // (the developer tool wakes him)
  sound('birthday');   // (the jingle: about 9 s, the length of the party dance)
  bdayHat(14500);   // (on until the cake has gone)
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });
  if (small) say(bdayGreeting(name) + ' ♡', 3200, true); else say('yay, party time! ♡', 3000);   // (the app's banner already says it)
  pulse('hop', 500);
  var ms;
  if (small) { bdayDesk(); ms = partyDance(); setTimeout(function () { drift(['🎈', '♥', '✦'], petTop(), 4); }, 1500); }
  else { bdayApp(name); ms = partyDance(); setTimeout(function () { drift(['🎂', '🎉', '♥'], petTop(), 4); }, 1500); }
  var fw = bdayLayer(8000), fwMs = ms + 5500;   // (fireworks away from him, one every couple of seconds right through to the end of the cake)
  bdayFireworks(fw, fwMs);
  setTimeout(function () { fw.remove(); }, fwMs + 3500);
  setTimeout(function () { var more = bdayCake(); setTimeout(function () { partyOn = false; busy--; bdayToyAway(false); if (!busy) settle(); }, more); }, ms + 300);   // (the dance, then the cake)
  return true;
}
/** Starts it once a day, on the birthday, when he is awake and not busy. */
function birthdayCheck() {
  if (!isBirthday()) return;
  var key = B.dayKey(giftDate());
  if (bdayDoneToday() && !devBirthday) return;
  if (document.hidden || document.querySelector('dialog[open]')) return;
  if (!birthdayParty()) return;
  try { localStorage.setItem('nibble-bday-done', key); } catch (e) { /* storage not available */ }
}
/** Developer tool: pretends it is the birthday and plays the celebration now. @returns {string} */
function devBirthdayNow() {
  devBirthday = true;
  if (!birthdayParty()) { devBirthday = false; return 'He is busy or asleep: try again in a moment.'; }
  setTimeout(function () { devBirthday = false; }, 9000);
  return document.documentElement.classList.contains('desktop-pet') ? 'Mini Fumu\'s birthday: balloons, fireworks, the party dance and a cake.' : 'The app\'s birthday: confetti, a banner, fireworks, the party dance and a cake.';
}
// the first time the app is opened on the birthday the party comes first: a moment after it opens (the hold keeps everything else back until then, for at most 45 s)
if (isBirthday() && !bdayDoneToday()) { bdayHold = true; busy++; bdayToyAway(true); bdayHoldTimer = setTimeout(function () { if (!bdayHold) return; releaseBdayHold(); if (!partyOn) bdayToyAway(false); if (!busy) settle(); }, 45000); }
var bdayTry = setInterval(function () { if (!bdayHold) { clearInterval(bdayTry); return; } birthdayCheck(); }, 1000);   // (he may still be busy with the opening: try again every second)
setInterval(birthdayCheck, 60000);   // (also when he was asleep or busy at first)
