// The birthday celebration: once on the player's birthday (state.player.birthday), Fumu puts on a party hat and dances.
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
/** A paper party hat on his head; it goes with him, and comes off again after ms. */
function bdayHat(ms) {
  var hat = document.createElement('span');
  hat.setAttribute('aria-hidden', 'true');
  hat.style.cssText = 'position:absolute;left:50%;top:-4%;width:34px;height:40px;margin-left:-17px;pointer-events:none;z-index:5;transform-origin:50% 100%';
  hat.innerHTML = '<svg viewBox="0 0 34 40" width="34" height="40"><path d="M17 3 L30 37 Q17 41 4 37 Z" fill="#ff8fb1" stroke="#5b4239" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M10 22 L24 22 M7 30 L27 30" stroke="#fff6ec" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="4" r="4" fill="#ffd36b" stroke="#5b4239" stroke-width="2"/></svg>';
  pet.appendChild(hat);
  setTimeout(function () { if (hat.parentNode) hat.remove(); }, ms);
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
/** Plays the celebration once (the app's or Mini Fumu's). @returns {boolean} Whether it started. */
function birthdayParty() {
  if (!devBirthday && (busy || baseState() === 'sleepy')) return false;
  var small = document.documentElement.classList.contains('desktop-pet'), name = state.player.name;
  busy++;
  if (pet.dataset.state === 'sleepy') pet.dataset.state = 'happy';   // (the developer tool wakes him)
  sound('party');
  bdayHat(9500);
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });
  say(small ? 'happy birthday' + (name ? ', ' + name : '') + '!! ♡' : 'yay, party time! ♡', 3000);   // (the app's banner already says it)
  pulse('hop', 500);
  var ms;
  if (small) { bdayDesk(); ms = chorusDance(); setTimeout(function () { drift(['🎈', '♥', '✦'], petTop(), 4); }, 1500); }
  else { bdayApp(name); ms = freeSpiritDance(); setTimeout(function () { drift(['🎂', '🎉', '♥'], petTop(), 4); }, 1500); }
  setTimeout(function () { busy--; if (!busy) settle(); }, ms + 300);
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
  return document.documentElement.classList.contains('desktop-pet') ? 'Mini Fumu\'s birthday: balloons and the chorus dance.' : 'The app\'s birthday: confetti, a banner and the free spirited dance.';
}
setTimeout(birthdayCheck, 7000);
setInterval(birthdayCheck, 60000);   // (also when he was asleep or busy at first)
