// Daydreams, idle moves and eyes that follow your finger.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- daydreams ----------
// Now and then, while nothing else is going on, the pet daydreams about
// something on the list and gets excited about its favourites.
var dreamEl = $('dream'), dreamCloud = $('dreamCloud'), dreamTimer, dreaming = false;
/** Waits a little while, then does something idle: a daydream or a little move. */
function scheduleDream() {
  clearTimeout(dreamTimer);
  dreamTimer = setTimeout(idle, 7000 + Math.random() * 7000);
}
/** One idle moment, when nothing else is going on. */
function idle() {
  scheduleDream();
  if (busy || dreaming || document.hidden || document.querySelector('dialog[open]:not(#roomSheet)')) return;
  if (state.settings.daydreams && Math.random() < 0.4) daydream();
  else idleMove();
}
/** Shows a thought cloud with an item and lets the pet react to it. */
function daydream() {
  var mood = baseState();
  if (mood === 'stuffed') return;
  var todo = state.items.filter(function (i) { return !i.done && i.cat !== 'nonfood'; });
  var p = personality();
  var item;
  if (mood === 'sleepy' || !todo.length) {
    // dreaming of something it would like to have
    var wish = L.suggestion(p, state.items);
    if (!wish) return;
    item = L.createItem(wish, state.overrides, 'dream');
  } else {
    var loved = todo.filter(function (i) { return L.likes(p, i); });
    item = pick(loved.length && Math.random() < 0.7 ? loved : todo);
  }
  var love = mood !== 'sleepy' && isFavourite(item);
  dreaming = true;
  dreamCloud.replaceChildren(emojiImg(item.emoji, ''));
  dreamEl.classList.toggle('love', love);
  dreamEl.hidden = false;
  if (mood === 'sleepy') {
    setFace(FACES.sleepy);
  } else if (love) {
    setFace(FACES.love);
    pulse('hop', 460);
    sound('ooh');
    talk('dream', ['ooh, {x}!', 'can\'t wait!', 'my favourite!'], 1600, { x: item.text.toLowerCase() });
  } else {
    setFace(FACES.dreamy);
  }
  setTimeout(function () {
    dreamEl.hidden = true;
    dreaming = false;
    if (busy) return;
    settle();
    // a dream about something not on the list turns into a suggestion
    if (item.id === 'dream' && mood !== 'sleepy' && suggestEl.hidden) offerSuggestion();
  }, 2600);
}
/**
 * Floats a few music notes up from the pet's head while it hums.
 */
function hum() {
  if (reduceMotion) return;
  var r = pet.getBoundingClientRect();
  ['♪', '♫', '♪'].forEach(function (n, i) {
    var el = document.createElement('span');
    el.className = 'note';
    el.textContent = n;
    document.body.appendChild(el);
    var x = r.left + r.width * (0.62 + i * 0.08), y = r.top + r.height * 0.2;
    el.animate([
      { transform: 'translate(' + x + 'px,' + y + 'px) scale(.6)', opacity: 0 },
      { transform: 'translate(' + (x + 8) + 'px,' + (y - 20) + 'px) scale(1) rotate(-10deg)', opacity: 1, offset: 0.3 },
      { transform: 'translate(' + (x + 18) + 'px,' + (y - 50) + 'px) rotate(10deg)', opacity: 0 }
    ], { duration: 1600, delay: i * 350, easing: 'ease-out', fill: 'both' }).finished.then(el.remove.bind(el), el.remove.bind(el));
  });
}
/**
 * Looks one way, then the other, as if checking the shop.
 * Skipped while the eyes are following a finger or cursor.
 */
function lookAround() {
  if (lookAt) return;
  var steps = [[-3.2, -0.5], [3.2, -0.5], [0, 0]];
  steps.forEach(function (st, i) {
    setTimeout(function () {
      if (lookAt) return;
      pet.style.setProperty('--look-x', st[0] + 'px');
      pet.style.setProperty('--look-y', st[1] + 'px');
      if (i === steps.length - 1) { pet.style.removeProperty('--look-x'); pet.style.removeProperty('--look-y'); }
    }, i * 700);
  });
}
// little things the pet does while it waits; some only fit some moods
var IDLE_MOVES = [
  { moods: ['curious', 'happy'], run: function () { pulse('wiggle', 900); } },
  { moods: ['curious', 'happy'], run: function () { setFace(FACES.dreamy); pulse('bob', 1400); hum(); say('♪ hm hm hmm ♪', 1400); } },
  { moods: ['curious', 'happy'], run: function () { lookAround(); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'closed', mouth: 'o', arms: 'cover', x: [] }); pulse('stretch', 1000); } },
  { moods: ['happy'], run: function () { setFace(FACES.tada); pulse('twirl', 800); } },
  { moods: ['happy'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'pat', x: ['cheeks'] }); } },
  { moods: ['happy'], run: function () { if (!cartEl.hidden) { setFace({ eyes: 'open', mouth: 'open', arms: 'reach', x: [] }); pulse('peek', 1400); say(pick(['what\'s in the cart?', 'so much loot!', 'cart buddy!']), 1300); } } },
  { moods: ['curious'], run: function () { setFace({ eyes: 'open', mouth: 'o', arms: 'scratch', x: ['question'] }); talk('idle', ['what\'s next?', 'shopping time?'], 1300); } },
  // little dances
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); pulse('shuffle', 1500); hum(); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'reach', x: ['sparkles', 'cheeks'] }); pulse('boogie', 1500); hum(); } },
  { moods: ['sleepy', 'stuffed'], run: function () { pulse('wiggle', 900); } },
  { moods: ['stuffed'], run: function () { setFace({ eyes: 'closed', mouth: 'smile', arms: 'pat', x: ['zzz', 'cheeks'] }); } }
];
/** Plays one idle move that fits the pet's mood, then settles back. */
function idleMove() {
  var mood = baseState();
  var moves = IDLE_MOVES.filter(function (m) { return m.moods.indexOf(mood) !== -1; });
  if (!moves.length) return;
  busy++;
  pick(moves).run();
  setTimeout(function () { busy--; if (!busy) settle(); }, 1600);
}
scheduleDream();

// ---------- eyes follow your finger or cursor ----------
var lookAt = null, lookFrame = 0, lookTimer;
/** Points each visible pet's pupils towards the last finger or cursor position. */
function updateLook() {
  lookFrame = 0;
  // just the pet and its dressing-room copy; the species buttons stay still
  [pet, dressPreview.querySelector('.pet')].forEach(function (el) {
    if (!el) return;
    // a species may draw its own eye set (the bunny), so use the one that is showing
    var eyes = [].slice.call(el.querySelectorAll('.pupils')).filter(function (p) { return p.getBoundingClientRect().width; })[0];
    if (!eyes || !lookAt) {
      el.style.removeProperty('--look-x'); el.style.removeProperty('--look-y'); el.classList.remove('looking');
      return;
    }
    var r = eyes.getBoundingClientRect();
    if (!r.width) return;
    var dx = lookAt.x - (r.left + r.width / 2), dy = lookAt.y - (r.top + r.height / 2);
    var d = Math.hypot(dx, dy) || 1;
    var reach = Math.min(d / 120, 1);
    el.style.setProperty('--look-x', (dx / d * 3.4 * reach).toFixed(2) + 'px');
    el.style.setProperty('--look-y', (dy / d * 2.8 * reach).toFixed(2) + 'px');
    el.classList.add('looking');
  });
}
/**
 * Remembers where the finger or cursor is and drifts the eyes back after a pause.
 * @param {PointerEvent} e
 */
function watchPointer(e) {
  lookAt = { x: e.clientX, y: e.clientY };
  if (!lookFrame) lookFrame = requestAnimationFrame(updateLook);
  clearTimeout(lookTimer);
  lookTimer = setTimeout(function () { lookAt = null; updateLook(); }, e.pointerType === 'mouse' ? 4000 : 1500);
}
document.addEventListener('pointermove', watchPointer, { passive: true });
document.addEventListener('pointerdown', watchPointer, { passive: true });
