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
  if (busy || dreaming || napping || document.hidden || document.querySelector('dialog[open]:not(#roomSheet)')) return;
  // while it's awake it asks for something now and then (offerSuggestion keeps that to once every three minutes at most)
  // chatterRate (1 = as usual) scales how often it talks on its own: 0 never, below 1 less, above 1 more
  var c = chatterRate;
  if (c > 0 && Math.random() < Math.min(0.9, 0.3 * c) && dueNag(true)) return;
  if (c > 0 && baseState() !== 'sleepy' && Math.random() < Math.min(0.9, 0.2 * c) && offerSuggestion()) return;
  if (c > 0 && state.settings.daydreams && Math.random() < Math.min(0.9, 0.3 * c)) daydream();
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
    if (isTodo()) return;
    // dreaming of something it would like to have
    var wish = L.suggestion(p, state.items);
    if (!wish) return;
    item = L.createItem(wish, state.overrides, 'dream');
  } else {
    var loved = todo.filter(function (i) { return L.likes(p, i); });
    var urgent = isTodo() ? dueTasks() : [];
    item = urgent.length && Math.random() < 0.6 ? pick(urgent) : pick(loved.length && Math.random() < 0.7 ? loved : todo);
  }
  var love = !isTodo() && mood !== 'sleepy' && isFavourite(item);
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
    if (isTodo()) talk('todoDream', item.due && item.due <= todayKey() ? ['{x} is due!', 'psst… {x}, today!', 'we should {x}!'] : ["should we {x}?", "don't forget: {x}", '{x}… soon!'], 1600, { x: item.text.toLowerCase() });
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
 */
function lookAround() {
  var steps = [[-3.2, -0.5], [3.2, -0.5], [0, 0]];
  steps.forEach(function (st, i) {
    setTimeout(function () {
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
var stage = pet.parentNode, walkX = 0, walkTimer, walking = false, walkWide = false;
/** @returns {number} How far the pet may walk from the middle, in px; further while playing with the toy (walkWide). */
/** @returns {number} How far his drawing reaches from the middle of his box (the dragon's wings stick out past it): he must not walk so far that the window's edge cuts it. */
function petReach() { return pet.offsetWidth / 2 + (pet.dataset.species === 'dragon' ? 8.5 * pet.offsetWidth / 160 : 0); }
function walkRange() { var r = petReach(); return Math.max(0, walkWide ? Math.min(130, stage.clientWidth / 2 - (r + 1)) : Math.min(70, stage.clientWidth / 2 - (r + 25))); }
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
 * @param {number} [pace=26] ms per px; lower is faster (the toy chase runs at about 7).
 * @returns {number} How long the walk takes in ms (0 if it doesn't move).
 */
function walkTo(x, pace) {
  if (reduceMotion) return 0;
  x = clampWalk(x);
  var dist = Math.abs(x - walkX);
  if (dist < 8) return 0;
  var ms = Math.round((pace ? 250 : 500) + dist * (pace || 26));
  stage.style.setProperty('--walk-ms', ms + 'ms');
  stage.style.setProperty('--walk-x', x + 'px');
  stage.classList.toggle('walk-right', x > 15);
  pet.style.setProperty('--look-x', (x > walkX ? 3.2 : -3.2) + 'px');
  walkX = x;
  walking = true;
  pet.classList.add('walking');
  clearTimeout(walkTimer);
  walkTimer = setTimeout(function () {
    walking = false;
    pet.classList.remove('walking');
    pet.style.removeProperty('--look-x');
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
// ---------- a daytime nap ----------
// Eyes closed, a few z's and a slow breath for a while (the desktop companion does this now and then). A touch, or
// something to eat, ends it; on its own it ends with a stretch and a yawn.
var napping = false, napTimer = 0, napSeated = false, napTest = false;   // (napTest: the animation player runs it, and it marks the pet busy while it plays)
/** He sits down for a nap (soles out in front, like sitting on a window) and gets up again after it, unless something else had him sitting. */
function napSit(on) {
  if (on && !pet.classList.contains('seated')) { pet.classList.add('seated'); napSeated = true; }
  else if (!on && napSeated) { pet.classList.remove('seated'); napSeated = false; }
}
/** @returns {boolean} Whether he is asleep or napping (the snore marks are showing): timers that blink his eyes must leave them shut. */
function asleepFace() { return napping || pet.classList.contains('x-zzz'); }
/**
 * @param {number} [ms=22000] How long it sleeps.
 * @param {boolean} [test] From the animation player: not stopped by its own busy mark.
 * @returns {number} How long the nap lasts in ms (0 when it can't nap now).
 */
function napNow(ms, test) {
  napTest = !!test;
  if (napping || (busy && !test) || dreaming || document.hidden || baseState() === 'sleepy') return 0;
  ms = ms || 22000;
  napping = true;
  napSit(true);
  setFace({ eyes: 'closed', mouth: 'o', arms: 'rest', x: ['zzz'] });
  pulse('sit', 2600);
  var t0 = Date.now();
  (function tick() {
    if (!napping) return;
    if (busy && !napTest) { napping = false; napSit(false); return; }   // something to eat: the eating takes over the face
    if (Date.now() - t0 > ms) { wakeFromNap(false); return; }
    snore();
    napTimer = setTimeout(tick, 2600);
  })();
  return ms;
}
/** Ends a nap: with a start when it was disturbed, or a stretch and a yawn when it was done. */
function wakeFromNap(startled) {
  if (!napping) return;
  napping = false; napSit(false);
  clearTimeout(napTimer);
  if (startled) {
    setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: ['shock'] });
    eyesDo('wide');
    pulse('hopsmall', 450);
    talk('napStart', ["huh! I'm awake!", "wasn't sleeping!", 'oh! hi!'], 1300);
  } else {
    setFace({ eyes: 'closed', mouth: 'open', arms: 'reach', x: [] });
    pulse('stretch', 1000);
    sound('yawn');
    say(pick(['*yaaawn*', 'hwaaa~ good nap', '*stretch*']), 1500, true);
  }
  setTimeout(function () { if (!busy) settle(); }, startled ? 1400 : 1800);
}
pet.addEventListener('pointerdown', function () { wakeFromNap(true); }, true);
var SHOPPING_WINDOW_MS = 30 * 60 * 1000;
/** @returns {boolean} Whether you are in the middle of shopping: something on the shopping list was ticked off in the last half hour and more is still to buy. Only that keeps Fumu up at night. */
function shoppingNow() {
  var list = isTodo() ? state.stash : state.items, now = Date.now();
  return list.some(function (i) { return !i.done; }) && list.some(function (i) { return i.done && i.doneAt && now - i.doneAt < SHOPPING_WINDOW_MS; });
}
/** @returns {boolean} Whether nothing is left to buy. Only the shopping list counts: tasks never keep Fumu up. */
function nothingLeft() { return !(isTodo() ? state.stash : state.items).some(function (i) { return !i.done; }); }
/** @returns {boolean} True when the pet may wander off its cushion: nothing left to buy, and not bedtime. */
function mayWander() { return nothingLeft() && !stage.classList.contains('bedtime'); }
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
  // newer moves: a curious head tilt, flopping over, a spinning hop, an excited shiver
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: ['question'] }); pulse('tilt', 1800); } },
  { moods: ['happy', 'stuffed'], run: function () { setFace({ eyes: 'closed', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); pulse('flop', 2400); say(pick(['plop~', 'flop!', 'nap time?']), 1200, true); } },
  { moods: ['happy'], run: function () { setFace(FACES.tada); pulse('spinhop', 900); drift(['✦', '♥'], petTop(), 3); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); pulse('shiver', 700); say(pick(['eee!', "so excited!", 'squee~']), 1000, true); } },
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
  { moods: ['curious'], run: function () { setFace({ eyes: 'open', mouth: 'o', arms: 'scratch', x: ['question'] }); talk('idle', isTodo() ? ['what\'s next?', 'to-do time?', 'tick tick?'] : ['what\'s next?', 'shopping time?'], 1300); } },
  // little dances
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); pulse('shuffle', 1500); hum(); } },
  { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'reach', x: ['sparkles', 'cheeks'] }); pulse('boogie', 1500); hum(); } },
  { moods: ['curious', 'happy'], run: function () { return handDance(); } },
  { moods: ['curious', 'happy'], run: function () { return chorusDance(); } },
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
  // up late shopping (night, but awake): yawns, rubbing its eyes, nodding off, heavy blinks
  { moods: ['curious', 'happy', 'stuffed'], night: true, run: function () {
    setFace({ eyes: 'closed', mouth: 'open', arms: 'reach', x: [] });
    pulse('stretch', 1000);
    sound('yawn');
    say(pick(['*yaaawn*', '*yawn*… sleepy', 'hwaaa~']), 1500, true);
    return 1800;
  } },
  { moods: ['curious', 'happy', 'stuffed'], night: true, run: function () {
    setFace({ eyes: 'closed', mouth: 'wavy', arms: 'eyerub', x: [] });
    talk('eyeRub', ['so sleepy…', '*rub rub*', 'eyes are heavy…'], 1500);
    return 1700;
  } },
  { moods: ['curious', 'happy', 'stuffed'], night: true, run: function () {
    setFace({ eyes: 'closed', mouth: 'o', arms: 'rest', x: ['zzz'] });
    pulse('sit', 2600);
    setTimeout(function () {
      setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: ['shock'] });
      eyesDo('wide');
      pulse('hopsmall', 450);
      talk('nodOff', ['huh! I\'m awake!', 'wasn\'t sleeping!', isTodo() ? 'w-what? tasks!' : 'w-what? shopping!'], 1300);
    }, 1900);
    return 3200;
  } },
  { moods: ['curious', 'happy', 'stuffed'], night: true, run: function () {
    setFace({ eyes: 'closed', mouth: 'smile', arms: 'idle', x: [] });
    setTimeout(function () { if (!asleepFace()) pet.dataset.eyes = 'open'; }, 700);
    setTimeout(function () { if (!asleepFace()) pet.dataset.eyes = 'closed'; }, 1100);
    setTimeout(function () { if (!asleepFace()) pet.dataset.eyes = 'open'; }, 2100);
    talk('heavyBlink', ['keep… eyes… open…', 'just a little longer…'], 1600);
    return 2400;
  } },
  { moods: ['happy', 'stuffed'], run: function () { if (!receiptEl.hidden) { setFace({ eyes: 'sparkle', mouth: 'open', arms: 'reach', x: ['sparkles'] }); pulse('peek', 1400); talk('receipt', ['look how much we got!', 'such a long receipt!', 'good shopping!'], 1400); } } }
];
/** Plays one idle move that fits the pet's mood, then settles back. */
function idleMove() {
  var mood = baseState();
  var moves = IDLE_MOVES.filter(function (m) { return m.moods.indexOf(mood) !== -1; });
  // walking moves (they return how long they take) only when nothing is left to buy
  moves = moves.filter(function (m) { return mayWander() || !m.walk; });
  // sleepy moves only when it is up at night, and then most of the time
  var late = L.isNight(petNow()) && mood !== 'sleepy' && Math.random() < 0.85;
  moves = moves.filter(function (m) { return !!m.night === late; });
  // on the to-do list it often does something with its clipboard
  if (isTodo() && !late && mood !== 'sleepy' && Math.random() < 0.45) moves = TODO_MOVES.map(function (run) { return { run: run }; });
  if (!moves.length) return;
  busy++;
  // told to talk less (or never): this move happens, but silently, until it is over or you touch him
  var mute = chatterRate < 1 && Math.random() >= chatterRate;
  if (mute) idleQuiet = true;
  var ms = pick(moves).run();
  setTimeout(function () { busy--; if (!busy) settle(); }, Math.max(1600, ms || 0));
  if (mute) setTimeout(function () { idleQuiet = false; }, Math.max(1600, ms || 0) + 2500);   // (a line that is said a moment after the move is muted too)
}
// anything you do ends a muted idle moment: what he says back to you is never held back
['pointerdown', 'keydown'].forEach(function (type) { document.addEventListener(type, function () { idleQuiet = false; }, true); });
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
/** Morning exercise: a 10 s routine in five steps. 1: right arm + left leg, then left arm + right leg; 2: two steps left, two steps right, with the arms circling;
 * 3: squished down, touching toes; 4: squished down, shaking his bottom; 5: arms high. The body, arms and feet are the `exercise` CSS
 * (styles.css) and SQUISH.exercise; this sets the face and the lines for each step. */
var exerciseTimers = [], exerciseDone = null, exerciseBusy = false;
function morningExercise(onDone) {
  stopExercise();
  exerciseDone = onDone || null;
  busy++; exerciseBusy = true;   // nothing else (idle moves, chatter, reminders) happens during the dance, nor for a second after it
  var lines = [[0, 'one, two, one, two!'], [2500, 'left, left~'], [3400, 'right, right~'], [4500, 'touch your toes!'], [6500, 'wiggle wiggle~'], [8500, 'yaaay!']];
  function later(fn, ms) { exerciseTimers.push(setTimeout(fn, ms)); }
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks'] });
  pulse('exercise', 10000);
  lines.forEach(function (l) { later(function () { say(l[1], 1700, true); }, l[0]); });
  later(function () { setFace({ eyes: 'sparkle', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] }); }, 8400);
  later(function () { exerciseTimers = []; settle(); finishExercise(1000); }, 10000);
  return 10000;
}
/** Stops the morning exercise where he is (any tap or key does this): the squish ends and he goes back to his resting face. */
function stopExercise() {
  if (!exerciseTimers.length) return;
  exerciseTimers.forEach(clearTimeout); exerciseTimers = [];
  pet.classList.remove('exercise');
  squishRun++; squishing = false; drawBody(1, 1, 0);
  settle();
  finishExercise(1000);
}
/** A second after the dance ends (or is stopped) he is free again: the hold on `busy` is let go and what was waiting for the dance (the usual start-up talk) runs, once. */
function finishExercise(delay) {
  var cb = exerciseDone, held = exerciseBusy;
  exerciseDone = null; exerciseBusy = false;
  setTimeout(function () {
    if (held) { busy--; if (!busy) settle(); }
    if (cb) cb();
  }, delay);
}
document.addEventListener('pointerdown', stopExercise, true);
document.addEventListener('keydown', stopExercise, true);
/** @returns {boolean} Whether he would do the morning exercise now: before noon, awake in the day, on the shopping list, not out of bed or walking. */
function morningOk() {
  var now = petNow();
  if (reduceMotion || isTodo() || L.isNight(now) || now.getHours() >= 12) return false;
  return baseState() !== 'sleepy' && !(typeof inBed === 'function' && inBed()) && !pet.classList.contains('walking');
}
/** Opening the app (or Mini Fumu) before noon: he does the morning exercise once, then `onDone` runs (a tap stops it early).
 * @returns {boolean} False when he does not do it (nothing runs). */
function morningStart(onDone) {
  if (busy || document.hidden || !morningOk()) return false;
  morningExercise(onDone);
  return true;
}

/** Hand dance: an idle dance, one 3.6 s round played three times (10.8 s). In each round he stands on one foot (the other tucked behind it) and pushes one hand
 * towards you in front of his cheek with his eyes closed, then sways side to side with a hand on his belly. The body, arms and feet are the `handdance`
 * CSS (styles.css); this sets the face and shows the palm (toe beans) while the hand is pushed out. */
function handDance() {
  setFace({ eyes: 'open', mouth: 'smile', arms: 'rest', x: ['cheeks'] });
  pulse('handdance', 10800);
  for (var k = 0; k < 3; k++) (function (t0) {
    function at(ms, fn) { setTimeout(function () { if (pet.classList.contains('handdance')) fn(); }, t0 + ms); }
    at(330, function () { setFace({ eyes: 'closed', mouth: 'smile', arms: 'rest', x: ['cheeks'] }); });   // eyes closed only while the hand is pushed out
    at(380, function () { pet.classList.add('bs-out-r'); });
    at(950, function () { pet.classList.remove('bs-out-r'); setFace({ eyes: 'open', mouth: 'smile', arms: 'rest', x: ['cheeks'] }); });
  })(k * 3600);
  setTimeout(function () { pet.classList.remove('bs-out-r'); }, 10800);
  hum();
  return 10800;
}

/** Chorus dance: an idle dance of 8 s (the `chorus` CSS, styles.css): the left paw up under his chin, squishing as if he turned right, then the right paw and left; then he stands on his
 * right leg and shakes his bottom with his paws up; then the left paw comes down and the right paw goes up to his eye. This sets the face and the glance of his eyes, with notes and sparkles. */
function chorusDance() {
  setFace({ eyes: 'open', mouth: 'smile', arms: 'rest', x: ['cheeks'] });
  pulse('chorus', 8000);
  function at(ms, fn) { setTimeout(function () { if (pet.classList.contains('chorus')) fn(); }, ms); }
  at(350, function () { pet.style.setProperty('--look-x', '3.2px'); });                 // turning right: his eyes go that way
  at(1200, function () { pet.style.setProperty('--look-x', '-3.2px'); });                // and left
  at(2350, function () {
    pet.style.removeProperty('--look-x');
    setFace({ eyes: 'happy', mouth: 'open', arms: 'rest', x: ['cheeks', 'sparkles'] });  // on one leg, shaking
    drift(['♪', '✦', '♫'], petTop(), 3);
  });
  at(3800, function () { drift(['♪', '♫'], petTop(), 2); });
  at(4800, function () { setFace({ eyes: 'open', mouth: 'smile', arms: 'rest', x: ['cheeks'] }); });   // paw to the eye
  at(5600, function () { setFace({ eyes: 'squint', mouth: 'smile', arms: 'rest', x: ['cheeks'] }); drift(['✦'], petTop(), 2); });
  at(7300, function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['cheeks'] }); drift(['♥', '✦'], petTop(), 2); });
  setTimeout(function () { pet.style.removeProperty('--look-x'); }, 8000);
  hum();
  return 8000;
}

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
  if (reduceMotion || busy || walking || dreaming || document.hidden || document.querySelector('dialog[open]:not(#roomSheet)')) return;
  var mood = baseState();
  if (mood === 'sleepy') return;
  var r = Math.random();
  if (r < 0.2) {
    // a quick glance to one side
    var side = Math.random() < 0.5 ? -3.2 : 3.2;
    pet.style.setProperty('--look-x', side + 'px');
    // now and then the eyes go wide or narrow as it looks
    if (Math.random() < 0.3) eyesDo(Math.random() < 0.5 ? 'wide' : 'squint');
    setTimeout(function () { pet.style.removeProperty('--look-x'); }, 900);
  } else if (r < 0.38) {
    // two quick blinks
    if (pet.dataset.eyes !== 'open') return;
    pet.dataset.eyes = 'closed';
    // (not once he has dropped off in the middle of it: his shut eyes would be opened by the timers)
    setTimeout(function () { if (pet.dataset.eyes === 'closed' && !busy && !asleepFace()) pet.dataset.eyes = 'open'; }, 120);
    setTimeout(function () { if (pet.dataset.eyes === 'open' && !busy && !asleepFace()) pet.dataset.eyes = 'closed'; }, 330);
    setTimeout(function () { if (pet.dataset.eyes === 'closed' && !busy && !asleepFace()) pet.dataset.eyes = 'open'; }, 450);
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
  refreshBedtime();
}, 60000);
