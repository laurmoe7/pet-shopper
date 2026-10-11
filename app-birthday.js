// The birthday celebration: once on the player's birthday (state.player.birthday), Fumu puts on a party hat and does the chorus dance, with fireworks, and ends by handing you a cake.
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
var BDAY_COLOURS = ['#ff8fb1', '#ffd36b', '#8fd3ff', '#b69cff', '#9be3a8', '#ff9f7a'];
function bdayLayer() {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:9000';
  document.body.appendChild(el);
  return el;
}
/** A paper party hat on his head, drawn in the pet's own picture on the hat layer, so it goes with him in every dance and squash; it comes off again after ms. */
function bdayHat(ms) {
  var layer = pet.querySelector('.outfit-hat');
  if (!layer) return;
  var hat = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hat.setAttribute('class', 'bday-hat');
  hat.innerHTML = '<g transform="translate(83 37) rotate(-4)"><path d="M0 -30 L15 0 Q0 5 -15 0 Z" fill="#ff8fb1" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M-8 -12 L8 -12 M-12 -5 L12 -5" stroke="#fff6ec" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-31" r="4" fill="#ffd36b" stroke="#5b4239" stroke-width="2"/></g>';
  layer.appendChild(hat);
  setTimeout(function () { if (hat.parentNode) hat.remove(); }, ms);
}
/** Fireworks over the page: soft bursts of sparks, one after another (gentle: no flashing). @param {Element} layer @param {number} bursts */
function bdayFireworks(layer, bursts) {
  if (reduceMotion) return;
  var w = window.innerWidth, h = window.innerHeight, reach = Math.max(50, Math.min(w, h) * 0.3);
  for (var b = 0; b < bursts; b++) (function (b) {
    setTimeout(function () {
      if (!layer.parentNode) return;
      var cx = w * (0.15 + Math.random() * 0.7), cy = h * (0.12 + Math.random() * 0.38), col = BDAY_COLOURS[(b * 2 + 1) % BDAY_COLOURS.length], col2 = BDAY_COLOURS[(b * 2 + 3) % BDAY_COLOURS.length];
      sound('sparkle');
      for (var k = 0; k < 28; k++) {   // two rings of sparks (the inner one smaller), each with a soft glow
        var inner = k % 2, a = ((k >> 1) / 14) * Math.PI * 2 + inner * 0.22, d = reach * (inner ? 0.62 : 1), c = inner ? col2 : col, sp = document.createElement('i');
        sp.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + cy + 'px;width:9px;height:9px;margin:-4.5px;border-radius:50%;background:' + c + ';box-shadow:0 0 0 2px #fff,0 0 8px 2px ' + c;
        layer.appendChild(sp);
        sp.animate([
          { transform: 'translate(0,0) scale(1.3)', opacity: 1 },
          { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) scale(1)', opacity: 1, offset: 0.55 },
          { transform: 'translate(' + Math.cos(a) * d * 1.1 + 'px,' + (Math.sin(a) * d * 1.1 + reach * 0.4) + 'px) scale(.2)', opacity: 0 }
        ], { duration: 1500, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).onfinish = function () { sp.remove(); };
      }
    }, 600 + b * 900 + Math.random() * 300);
  })(b);
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
  banner.textContent = '🎂 Happy birthday' + (name ? ', ' + name : '') + '! 🎉';
  layer.appendChild(banner);
  if (!reduceMotion) banner.animate([{ transform: 'translateY(-90px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1, offset: 0.85 }, { transform: 'translateY(-90px)', opacity: 0 }], { duration: 7000, fill: 'both' });
  bdayFireworks(layer, 3);
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
  bdayFireworks(layer, 3);
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
  setTimeout(function () {
    if (!cake.parentNode) return;
    if (reduceMotion) { cake.remove(); return; }
    cake.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(12px) scale(.6)' }], { duration: 500, easing: 'ease-in', fill: 'both' }).onfinish = function () { cake.remove(); };
  }, 5200);
  return 5800;
}
/** Plays the celebration once (the app's or Mini Fumu's). @returns {boolean} Whether it started. */
var partyOn = false;   // (one party at a time: the developer tool pretends it is the birthday, and the check that runs every so often would start a second one)
function birthdayParty() {
  if (partyOn || (!devBirthday && (busy || baseState() === 'sleepy'))) return false;
  partyOn = true;
  var small = document.documentElement.classList.contains('desktop-pet'), name = state.player.name;
  busy++;
  if (pet.dataset.state === 'sleepy') pet.dataset.state = 'happy';   // (the developer tool wakes him)
  sound('party');
  bdayHat(14500);   // (on until the cake has gone)
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });
  say(small ? 'happy birthday' + (name ? ', ' + name : '') + '!! ♡' : 'yay, party time! ♡', 3000);   // (the app's banner already says it)
  pulse('hop', 500);
  var ms;
  if (small) { bdayDesk(); ms = chorusDance(); setTimeout(function () { drift(['🎈', '♥', '✦'], petTop(), 4); }, 1500); }
  else { bdayApp(name); ms = chorusDance(); setTimeout(function () { drift(['🎂', '🎉', '♥'], petTop(), 4); }, 1500); }
  setTimeout(function () { var more = bdayCake(); setTimeout(function () { partyOn = false; busy--; if (!busy) settle(); }, more); }, ms + 300);   // (the dance, then the cake)
  return true;
}
/** Starts it once a day, on the birthday, when he is awake and not busy. */
function birthdayCheck() {
  if (!isBirthday()) return;
  var key = B.dayKey(giftDate()), done = '';
  try { done = localStorage.getItem('nibble-bday-done') || ''; } catch (e) { /* storage not available */ }
  if (done === key && !devBirthday) return;
  if (document.hidden || document.querySelector('dialog[open]')) return;
  if (!birthdayParty()) return;
  try { localStorage.setItem('nibble-bday-done', key); } catch (e) { /* storage not available */ }
}
/** Developer tool: pretends it is the birthday and plays the celebration now. @returns {string} */
function devBirthdayNow() {
  devBirthday = true;
  if (!birthdayParty()) { devBirthday = false; return 'He is busy or asleep: try again in a moment.'; }
  setTimeout(function () { devBirthday = false; }, 9000);
  return document.documentElement.classList.contains('desktop-pet') ? 'Mini Fumu\'s birthday: balloons, fireworks, the chorus dance and a cake.' : 'The app\'s birthday: confetti, a banner, fireworks, the chorus dance and a cake.';
}
setTimeout(birthdayCheck, 7000);
setInterval(birthdayCheck, 60000);   // (also when he was asleep or busy at first)
