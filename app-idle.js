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
  // while it's awake it asks for something now and then (offerSuggestion keeps that to once every three minutes at most)
  if (baseState() !== 'sleepy' && Math.random() < 0.2 && offerSuggestion()) return;
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
// ---------- walking about ----------
// The pet wanders back and forth on the floor and stays where it stops. Only #pet slides (the CSS translate
// property), never scaled or turned. --walk-x lives on the stage so the speech bubble and daydream follow.
var stage = pet.parentNode, walkX = 0, walkTimer, walking = false;
/** @returns {number} How far the pet may walk from the middle, in px. */
function walkRange() { return Math.max(0, Math.min(70, stage.clientWidth / 2 - 100)); }
/**
 * @returns {{min: number, max: number}} Where the pet may stand: it can tuck a little behind the receipt and
 * the bag but not hide behind them.
 */
function walkBounds() {
  var max = walkRange(), min = -max, s = stage.getBoundingClientRect(), mid = s.left + s.width / 2;
  var half = pet.offsetWidth * 0.42, overlap = 14;
  if (!receiptEl.hidden) min = Math.max(min, receiptEl.getBoundingClientRect().right - mid + half - overlap);
  var bag = $('cartBag');
  if (!bag.hidden) max = Math.min(max, bag.getBoundingClientRect().left - mid - half + overlap);
  return { min: Math.min(0, min), max: Math.max(0, max) };
}
/**
 * @param {number} x
 * @returns {number} x moved onto the floor the pet may walk on.
 */
function clampWalk(x) { var b = walkBounds(); return Math.round(Math.max(b.min, Math.min(b.max, x))); }
/**
 * Walks the pet to x px from the middle of the stage (clamped to the floor).
 * @param {number} x
 * @returns {number} How long the walk takes in ms (0 if it doesn't move).
 */
function walkTo(x) {
  if (reduceMotion) return 0;
  x = clampWalk(x);
  var dist = Math.abs(x - walkX);
  if (dist < 8) return 0;
  var ms = Math.round(500 + dist * 26);
  stage.style.setProperty('--walk-ms', ms + 'ms');
  stage.style.setProperty('--walk-x', x + 'px');
  stage.classList.toggle('walk-right', x > 15);
  if (!lookAt) pet.style.setProperty('--look-x', (x > walkX ? 3.2 : -3.2) + 'px');
  walkX = x;
  walking = true;
  pet.classList.add('walking');
  clearTimeout(walkTimer);
  walkTimer = setTimeout(function () {
    walking = false;
    pet.classList.remove('walking');
    if (!lookAt) pet.style.removeProperty('--look-x');
  }, ms);
  return ms;
}
/** Stops a walk where the pet is now, so food flies to the right spot. */
function stopWalk() {
  if (!walking) return;
  var now = parseFloat(getComputedStyle(pet).translate) || 0;
  stage.style.setProperty('--walk-ms', '0s');
  stage.style.setProperty('--walk-x', Math.round(now) + 'px');
  walkX = Math.round(now);
  clearTimeout(walkTimer);
  walking = false;
  pet.classList.remove('walking');
}
/**
 * Walks through a list of spots, pausing between them.
 * @param {number[]} spots
 * @param {number} [pause=500]
 * @returns {number} The total time in ms.
 */
function walkPath(spots, pause) {
  var t = 0, from = walkX;
  spots.forEach(function (x) {
    x = clampWalk(x);
    setTimeout(function () { walkTo(x); }, t);
    t += Math.round(500 + Math.abs(x - from) * 26) + (pause || 500);
    from = x;
  });
  return t;
}
/** @returns {boolean} True when the list has nothing left to buy, so the pet may wander off its cushion. */
function mayWander() { return !state.items.some(function (i) { return !i.done; }); }
/** With things on the list, the pet comes back to the middle, ready to shop. */
function walkHome() {
  if (walkX && !mayWander() && !busy) walkTo(0);
}
/** @returns {number} A new spot on the floor, a fair way from where the pet stands. */
function newSpot() {
  var b = walkBounds(), x = walkX;
  for (var i = 0; i < 6 && Math.abs(x - walkX) < (b.max - b.min) * 0.25; i++) x = b.min + Math.random() * (b.max - b.min);
  return x;
}

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
  { moods: ['stuffed'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'pat', x: ['cheeks'] }); } },
  // daytime things to do
  { moods: ['curious', 'happy', 'stuffed'], run: function () { setFace({ eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); pulse('hopsmall', 450); talk('wave', ['hi hi!', 'hello~', 'yoohoo!'], 1200); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'sparkle', mouth: 'o', arms: 'reach', x: [] }); drift(['🦋'], petTop(), 1); lookAround(); talk('butterfly', ['a butterfly!', 'so pretty…', 'come back!'], 1300); } },
  { moods: ['curious', 'happy', 'stuffed'], run: function () {
    setFace({ eyes: 'squint', mouth: 'o', arms: 'cover', x: [] });
    setTimeout(function () { setFace({ eyes: 'closed', mouth: 'open', arms: 'idle', x: ['shock'] }); pulse('spit', 350); say(pick(['achoo!', 'a-choo!', 'hatchoo!']), 1000, true); }, 550);
  } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'cheer', x: ['sweat', 'cheeks'] }); pulse('hophop', 1500); talk('exercise', ['one, two! one, two!', 'stretchy stretch!', 'workout time!'], 1300); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'sparkle', mouth: 'o', arms: 'reach', x: [] }); drift(['○', '◦', '○'], mouthPoint(), 3); pulse('hopsmall', 450); talk('bubbles', ['bubbles!', 'pop pop!'], 1100); } },
  { moods: ['curious', 'stuffed'], run: function () { setFace({ eyes: 'closed', mouth: 'smile', arms: 'rest', x: ['cheeks'] }); drift(['☀'], petTop(), 1); pulse('sit', 2600); talk('sun', ['warm and cozy…', 'sunny day ♡', 'ahh, sunshine'], 1400); } },
  { moods: ['stuffed'], run: function () { setFace({ eyes: 'happy', mouth: 'o', arms: 'pat', x: ['cheeks'] }); pulse('hopsmall', 450); say(pick(['*hic*', 'burp! oops', 'hehe, full']), 1100, true); } },
  // the belly jiggle, and eyes that go wide or squint
  { moods: ['happy', 'stuffed'], run: function () { bellyJiggle(); return 1300; } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: [] }); eyesDo('wide'); lookAround(); talk('notice', ['ooh?!', 'what was that?', 'huh!'], 1200); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'open', mouth: 'wavy', arms: 'scratch', x: [] }); eyesDo('squint'); talk('squint', ['hmmm…', 'suspicious…', 'squint squint'], 1300); } },
  // walking about: a wander to a new spot, pacing back and forth, a happy trot, a stroll back to the middle
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'open', mouth: 'smile', arms: 'idle', x: [] }); return walkTo(newSpot()); }, walk: true },
  { moods: ['curious', 'happy'], run: function () { setFace(FACES.dreamy); hum(); return walkTo(newSpot()); }, walk: true },
  { moods: ['curious'], run: function () {
    var b = walkBounds();
    setFace({ eyes: 'open', mouth: 'o', arms: 'scratch', x: ['question'] });
    talk('pace', ['hmm, what to buy…', 'thinking…', 'let me think…'], 1500);
    return walkPath([b.min * 0.8, b.max * 0.8, walkX], 600);
  }, walk: true },
  { moods: ['happy'], run: function () {
    var b = walkBounds();
    setFace({ eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] });
    return walkPath([b.max, b.min, 0], 250);
  }, walk: true },
  { moods: ['stuffed'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'pat', x: ['cheeks'] }); return walkTo(walkX ? 0 : newSpot() * 0.5); }, walk: true },
  { moods: ['happy', 'stuffed'], run: function () { if (!receiptEl.hidden) { setFace({ eyes: 'sparkle', mouth: 'open', arms: 'reach', x: ['sparkles'] }); pulse('peek', 1400); talk('receipt', ['look how much we got!', 'such a long receipt!', 'good shopping!'], 1400); } } }
];
/** Plays one idle move that fits the pet's mood, then settles back. */
function idleMove() {
  var mood = baseState();
  var moves = IDLE_MOVES.filter(function (m) { return m.moods.indexOf(mood) !== -1; });
  // walking moves (they return how long they take) only when nothing is left to buy
  moves = moves.filter(function (m) { return mayWander() || !m.walk; });
  if (!moves.length) return;
  busy++;
  var ms = pick(moves).run();
  setTimeout(function () { busy--; if (!busy) settle(); }, Math.max(1600, ms || 0));
}
scheduleDream();

// ---------- a soft settle ----------
// Instead of a breathing squash that never stops (the phone would redraw the pet all the time), the body gives
// a small squash every 5-9 seconds, or a slow deep breath when sleepy.
// (Named softSettle: settle() in app-pet.js puts the face back, and builds 83-88 accidentally replaced it,
// which left arms and faces stuck after moves.)
var softSettleTimer;
function softSettleSoon() {
  clearTimeout(softSettleTimer);
  softSettleTimer = setTimeout(softSettle, 5000 + Math.random() * 4000);
}
function softSettle() {
  softSettleSoon();
  if (reduceMotion || busy || squishing || document.hidden) return;
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
  if (reduceMotion || busy || walking || dreaming || document.hidden || lookAt || document.querySelector('dialog[open]:not(#roomSheet)')) return;
  var mood = baseState();
  if (mood === 'sleepy') return;
  var r = Math.random();
  if (r < 0.2) {
    // a quick glance to one side
    var side = Math.random() < 0.5 ? -3.2 : 3.2;
    pet.style.setProperty('--look-x', side + 'px');
    // now and then the eyes go wide or narrow as it looks
    if (Math.random() < 0.3) eyesDo(Math.random() < 0.5 ? 'wide' : 'squint');
    setTimeout(function () { if (!lookAt) { pet.style.removeProperty('--look-x'); } }, 900);
  } else if (r < 0.38) {
    // two quick blinks
    if (pet.dataset.eyes !== 'open') return;
    pet.dataset.eyes = 'closed';
    setTimeout(function () { if (pet.dataset.eyes === 'closed' && !busy) pet.dataset.eyes = 'open'; }, 120);
    setTimeout(function () { if (pet.dataset.eyes === 'open' && !busy) pet.dataset.eyes = 'closed'; }, 330);
    setTimeout(function () { if (pet.dataset.eyes === 'closed' && !busy) pet.dataset.eyes = 'open'; }, 450);
  } else if (r < 0.46) {
    pulse('hopsmall', 500);
  } else if (r < 0.62 && mayWander()) {
    // a few steps one way or the other
    var step = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30);
    var b = walkBounds();
    walkTo(walkX + step < b.min || walkX + step > b.max ? walkX - step : walkX + step);
  } else if (r < 0.82) {
    // a small rock from side to side
    pulse('rocksmall', 1300);
  } else if (mood === 'happy') {
    drift(['♥', '✦'], petTop(), 2);
  }
}
scheduleLively();
softSettleSoon();
// bedtime and morning: check the clock now and then, so the pet falls asleep at 10 pm and wakes at 7 am
setInterval(function () {
  updateEmptyHint();
  if (!busy && !dreaming && pet.dataset.state !== baseState()) settle();
  // bedtime: back to its cushion
  if (!busy && baseState() === 'sleepy' && walkX) walkTo(0);
  walkHome();
}, 60000);

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
