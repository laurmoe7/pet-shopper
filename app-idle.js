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
  dreamTimer = setTimeout(idle, 4000 + Math.random() * 4500);
}
/** One idle moment, when nothing else is going on. */
function idle() {
  scheduleDream();
  if (busy || dreaming || document.hidden || document.querySelector('dialog[open]:not(#roomSheet)')) return;
  if (state.settings.daydreams && Math.random() < 0.3) daydream();
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
  { moods: ['curious', 'happy'], run: function () { setFace(FACES.dreamy); lookAround(); pulse('stroll', 3600); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'open', mouth: 'smile', arms: 'idle', x: ['cheeks'] }); pulse('waddle', 1800); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] }); pulse('rock', 1900); } },
  // a big roly-poly roll from side to side, with a giggle
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); pulse('roly', 2800); drift(['♥', '✦'], petTop(), 2); } },
  { moods: ['happy'], run: function () { setFace({ eyes: 'happy', mouth: 'open', arms: 'idle', x: ['cheeks', 'sparkles'] }); pulse('roly', 2800); } },
  // sniffing about: nose down, little twitches
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'closed', mouth: 'o', arms: 'idle', x: ['question'] }); pulse('sniff', 1700); setTimeout(function () { drift(['✦', '·'], mouthPoint(), 2); }, 500); } },
  { moods: ['curious'], run: function () { setFace({ eyes: 'closed', mouth: 'o', arms: 'idle', x: [] }); pulse('sniff', 1700); } },
  { moods: ['curious', 'happy'], run: function () { lookAround(); pulse('scoot', 1400); } },
  { moods: ['happy'], run: function () { setFace(FACES.tada); pulse('hophop', 1500); drift(['♥', '✦'], petTop(), 3); } },
  { moods: ['sleepy', 'curious', 'stuffed'], run: function () { setFace({ eyes: 'closed', mouth: 'smile', arms: 'idle', x: ['cheeks'] }); pulse('sit', 2600); } },
  { moods: ['happy'], run: function () { setFace(FACES.love); pulse('hop', 460); drift(['♥', '✦', '♥'], petTop(), 4); } },
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

// ---------- a soft settle (Squish test, new way only) ----------
// Instead of a breathing squash that never stops (the phone would redraw the pet all the time), the body gives
// a small squash every 5-9 seconds, or a slow deep breath when sleepy.
var settleTimer;
function settleSoon() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settle, 5000 + Math.random() * 4000);
}
function settle() {
  settleSoon();
  if (document.documentElement.dataset.squish !== 'svg' || reduceMotion || busy || squishing || document.hidden) return;
  svgSquish(baseState() === 'sleepy' ? SQUISH.breath : SQUISH.settle);
}

// ---------- small lively things between the bigger idle moves ----------
// Every few seconds the pet does something tiny: glances aside, blinks twice, gives a little hop, or lets a heart drift up.
// Everything here only slides or fades the pet (no squashing or tilting, which left a seam on her phone),
// and every hop has a landing and a shadow, so it looks like it moves on the floor, not in the air.
var livelyTimer;
/** @returns {{x: number, y: number}} A point just above the pet's head. */
function petTop() {
  var r = pet.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.25 };
}
function scheduleLively() {
  clearTimeout(livelyTimer);
  livelyTimer = setTimeout(lively, 2200 + Math.random() * 2600);
}
function lively() {
  scheduleLively();
  if (reduceMotion || busy || dreaming || document.hidden || lookAt || document.querySelector('dialog[open]:not(#roomSheet)')) return;
  var mood = baseState();
  if (mood === 'sleepy') return;
  var r = Math.random();
  if (r < 0.2) {
    // a quick glance to one side
    var side = Math.random() < 0.5 ? -3.2 : 3.2;
    pet.style.setProperty('--look-x', side + 'px');
    setTimeout(function () { if (!lookAt) { pet.style.removeProperty('--look-x'); } }, 900);
  } else if (r < 0.38) {
    // two quick blinks
    if (pet.dataset.eyes !== 'open') return;
    pet.dataset.eyes = 'closed';
    setTimeout(function () { if (pet.dataset.eyes === 'closed' && !busy) pet.dataset.eyes = 'open'; }, 120);
    setTimeout(function () { if (pet.dataset.eyes === 'open' && !busy) pet.dataset.eyes = 'closed'; }, 330);
    setTimeout(function () { if (pet.dataset.eyes === 'closed' && !busy) pet.dataset.eyes = 'open'; }, 450);
  } else if (r < 0.52) {
    pulse('hopsmall', 500);
  } else if (r < 0.82) {
    // a small rock from side to side
    pulse('rocksmall', 1300);
  } else if (mood === 'happy') {
    drift(['♥', '✦'], petTop(), 2);
  }
}
scheduleLively();
settleSoon();

// ---------- eyes follow your finger or cursor ----------
var lookAt = null, lookFrame = 0, lookTimer;
/** Points each visible pet's pupils towards the last finger or cursor position. */
function updateLook() {
  lookFrame = 0;
  // just the pet and its dressing-room copy; the species buttons stay still
  [pet, dressPreview.querySelector('.pet')].forEach(function (el) {
    if (!el) return;
    var eyes = el.querySelector('.pupils');
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
