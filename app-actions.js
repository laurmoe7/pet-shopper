// Sound and haptics, the eating queue, list actions and the emoji picker.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- sound + haptics ----------
/**
 * Plays an eating sound unless quiet mode is on.
 * @param {string} kind A Sounds.play kind, e.g. "glug".
 */
function sound(kind) { clickSounded = true; if (!state.quiet && state.settings.sounds) Sounds.play(kind); }
// every button and menu item makes a sound: handlers that play their own mark the click,
// and any click left silent gets a soft tap (switches play on/off from their change event)
var clickSounded = false;
document.addEventListener('click', function () { clickSounded = false; }, true);
document.addEventListener('click', function (e) {
  if (clickSounded) return;
  var b = e.target.closest('button, .menu-item');
  // a sheet's Done button closes it, and closing plays its own sound
  if (!b || b.disabled || e.target.closest('label') || (b.form && b.form.method === 'dialog')) return;
  sound('tap');
});
// phones only allow audio that starts from a tap, so wake the audio engine on the first one
document.addEventListener('pointerdown', function unlockAudio() {
  Sounds.unlock();
  document.removeEventListener('pointerdown', unlockAudio, true);
}, true);
/**
 * A short vibration on phones that support it.
 * @param {number|number[]} ms
 */
function buzz(ms) { try { if (state.settings.vibration && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

// ---------- the eating queue ----------
// Taps update the list at once; Nibble works through what you checked in order.
var queue = Promise.resolve();
var pending = 0;
/**
 * Adds an animation job to the eating queue. Taps update the list at once; the pet works through the jobs in order.
 * @param {function(): Promise<*>} job
 */
function enqueue(job) {
  pending++;
  busy++;
  queue = queue.then(job).catch(function (e) { console.error(e); }).then(function () {
    pending--;
    busy--;
    if (!busy) settle();
  });
}
/** @returns {number} An animation speed factor; faster when several items are waiting. */
function speed() { return pending > 4 ? 0.4 : pending > 2 ? 0.6 : 1; }

/**
 * Queues the eating animation for a checked item: hop, chomp, reaction and sound.
 * @param {Item} item
 * @param {?DOMRect} fromRect Where the item's emoji was before the list re-rendered.
 * @param {?Object} [goals] What recordEaten counted, for the progress toast and unlock cheer.
 */
function eat(item, fromRect, goals) {
  enqueue(function () {
    stopWalk();
    var sp = speed();
    var nonfood = isBagged(item);
    var key = reactionOf(item);
    setFace(FACES.catching);
    var to = nonfood ? bagPoint() : mouthPoint();
    return fly(item.emoji, center(fromRect), to, { duration: 600 * sp, scaleTo: nonfood ? 0.15 : 0.5 }).then(function () {
      var r = REACTIONS[key] || REACTIONS[item.cat] || REACTIONS.pantry;
      setFace(r.face);
      if (!nonfood) {
        pulse('chomp', 300);
        crumbs(mouthPoint(), CRUMB_COLORS[item.cat] || '#e8b04a', r.crumbs || 7);
        drift(['✦', '♥', '✧'], mouthPoint(), 3);
      }
      if (r.move) setTimeout(function () { pulse(r.move[0], r.move[1]); }, nonfood ? 0 : 320);
      sound(L.soundFor(item));
      // shop items that aren't food get a comment in the personality's voice
      if (nonfood && key === item.cat) talk(Foods.kindOf(item.emoji), r.lines, 1400);
      else say(pick(r.lines), 1400);
      if (goals) goalToast(goals);
      var hold = 750 * sp;
      if (r.then) return wait(hold / 2).then(function () { setFace(r.then); return wait(hold / 2); });
      return wait(hold);
    }).then(function () {
      if (!nonfood && isFavourite(item)) {
        // its favourite kind of food: hearts and a happy wiggle
        setFace(FACES.love);
        pulse('hop', 460);
        say(L.styleLine(personality(), pick(personality().lines), null, true), 1300);
        return wait(800 * sp);
      }
    }).then(function () {
      if (goals && goals.blocked === 'too-fast' && state.settings.fairPlayTips) {
        // a playful nudge rather than a telling-off
        setFace(FACES.suspicious);
        talk('quick', ['did you really buy that?', 'hmm, that was quick…', 'straight from the list?'], 1600);
        return wait(1100 * sp);
      }
    }).then(function () {
      if (goals && goals.unlocked.length) return cheerUnlocks(goals.unlocked);
    }).then(function () {
      if (!item.treat && pending === 1 && L.mood(state.items) === 'stuffed') return celebrate();
    });
  });
}

/**
 * Queues the spit-back animation for an item that was put back on the list.
 * @param {Item} item
 */
function spitBack(item) {
  enqueue(function () {
    setFace(FACES.catching);
    pulse('spit', 360);
    sound('spit');
    var rect = rowEmojiRect(item.id);
    var btn = rect && document.querySelector('.item[data-id="' + item.id + '"] .emoji-btn');
    if (btn) btn.classList.add('gone');
    var to = rect ? center(rect) : { x: innerWidth / 2, y: innerHeight - 40 };
    var p = fly(item.emoji, mouthPoint(), to, { duration: 520, scaleFrom: 0.5, scaleTo: 1, spin: -160, lift: 40 });
    setTimeout(function () { setFace(FACES.sheepish); talk('spit', ['oops, sorry', 'spit! my bad', 'not yet? ok', 'ptoo!'], 1400); }, 200);
    return p.then(function () {
      if (btn) btn.classList.remove('gone');
      return wait(700);
    });
  });
}

/**
 * The all-done moment: belly pat, jingle, emoji confetti and petals.
 * @returns {Promise<void>}
 */
function celebrate() {
  var eaten = state.items.filter(function (i) { return i.done; }).map(function (i) { return i.emoji; });
  setFace(FACES.party);
  pulse('pat', 1700);
  sound('party');
  talk('full', ['so full! thank you!', 'best trip ever!', '*happy belly pat*'], 2200);
  buzz([20, 60, 20]);
  if (!reduceMotion) {
    var from = mouthPoint();
    eaten.slice(0, 14).forEach(function (e, i) {
      var a = (Math.PI * 2 * i) / Math.min(eaten.length, 14) + Math.random() * 0.4;
      var d = 80 + Math.random() * 60;
      var el = emojiImg(e, ''); el.className = 'confetti';
      document.body.appendChild(el);
      el.animate([
        { transform: 'translate(' + (from.x - 11) + 'px,' + (from.y - 11) + 'px) scale(.3)', opacity: 1 },
        { transform: 'translate(' + (from.x - 11 + Math.cos(a) * d) + 'px,' + (from.y - 11 + Math.sin(a) * d * 0.6 + 20) + 'px) scale(1) rotate(' + (Math.random() * 360) + 'deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + (from.x - 11 + Math.cos(a) * d * 1.1) + 'px,' + (from.y + Math.sin(a) * d * 0.6 + 120) + 'px) scale(.8)', opacity: 0 }
      ], { duration: 1400, easing: 'ease-out' }).finished.then(el.remove.bind(el));
    });
    petals(from, 16);
  }
  return wait(2400);
}

// ---------- list actions ----------
/**
 * Adds a typed item to the to-buy list and lets the pet react.
 * @param {string} text
 */
function addItem(text) {
  text = text.trim();
  if (!text) return;
  var item = L.createItem(text, state.overrides, newId(), Date.now());
  L.addToList(state.items, item);
  freshIds[item.id] = true;
  save();
  render();
  if (!busy) {
    pulse('hop', 460);
    var face = isBagged(item) ? null : FACES.catching;
    if (face) { setFace(face); setTimeout(function () { if (!busy) settle(); }, 500); }
  }
  // something you buy a lot gets a remark from its history; the rest get a quick cheer
  var memory = L.memoryLine(state.pet, text);
  if (memory) talk(memory.key, MEMORY_LINES[memory.key], 1900, memory.vars);
  else say(item.cat === 'mystery' ? 'ooh, mystery!' : pick(['ooh!', 'for me?', 'yes please', 'noted!', 'yum?']), 1100);
}
// what Nibble says about things you buy often ({item}, {n} times, #{rank} in the Top 10)
var MEMORY_LINES = {
  memoryTop: ['{item} again? your #1!', 'ah, {item}, my favourite to see', '{item}! {n} times now'],
  memoryFav: ['{item} is #{rank} in the Top 10!', 'we do love {item}', '{item} again, {n} times now'],
  memoryRegular: ['{item}, a regular!', 'oh, {item} again']
};

/**
 * The item as the goal rules should see it. With the dev menu's "skip the
 * 15-minute wait" on, it looks like it has been on the list for ages.
 * @param {Item} item
 * @returns {Item}
 */
function rulesItem(item) {
  if (!state.dev.noWait) return item;
  var copy = {};
  Object.keys(item).forEach(function (k) { if (k !== 'added') copy[k] = item[k]; });
  return copy;
}

/**
 * Counts an eaten item towards goals and tastes (the Top 10 is counted separately).
 * Shared by ticking an item off and by feeding a treat.
 * @param {Item} item  Gets `counted`, `countedDay` and `tasted` so putting it back can undo them.
 * @param {Date} now
 * @returns {Object} What recordEaten counted, plus any personalities this bite earned.
 */
function creditEaten(item, now) {
  var openBefore = Personalities.filter(personalityOpen);
  var goals = L.recordEaten(state.pet, rulesItem(item), now, Achievements);
  item.counted = goals.counted;
  item.countedDay = L.dayKey(now);
  item.tasted = L.recordTaste(state.pet, rulesItem(item), now);
  // personalities this bite just earned are cheered like other unlocks
  Personalities.filter(personalityOpen).forEach(function (p) {
    if (openBefore.indexOf(p) === -1) goals.unlocked.push({ icon: p.icon, unlocks: { kind: 'personality', id: p.id, label: p.label } });
  });
  return goals;
}

/**
 * Checks an item off (the pet eats it) or puts it back (the pet spits it out).
 * @param {string} id
 */
function toggle(id) {
  var fromRect = rowEmojiRect(id);
  var result = L.toggleDone(state.items, id);
  var item = result.item;
  if (!item) return;
  state.items = result.items;
  freshIds[item.id] = true;
  var now = new Date(), goals = null;
  if (item.done) {
    goals = creditEaten(item, now);
    item.fav = L.recordFavourite(state.pet, rulesItem(item), now) || undefined;
    if (L.mood(state.items) === 'stuffed') {
      var trip = L.recordTrip(state.pet, state.items.map(rulesItem), now, Achievements);
      goals.counted = goals.counted.concat(trip.counted);
      goals.capped = goals.capped.concat(trip.capped);
      goals.unlocked = goals.unlocked.concat(trip.unlocked);
    }
  } else {
    // putting it back takes today's count back, so ticking on and off can't farm goals
    L.refundEaten(state.pet, item, now, Achievements);
    if (item.tasted) L.refundTaste(state.pet, item);
    delete item.tasted;
    if (item.fav) L.refundFavourite(state.pet, item.fav, now);
    delete item.fav;
    delete item.counted;
    delete item.countedDay;
  }
  buzz(12);
  save();
  render();
  if (item.done) eat(item, fromRect, goals);
  else spitBack(item);
}

/**
 * Deletes an item from the list.
 * @param {string} id
 */
function removeItem(id) {
  state.items = state.items.filter(function (i) { return i.id !== id; });
  save();
  render();
}

/**
 * Applies an emoji picked in the picker and remembers it for that word.
 * @param {string} id
 * @param {string} emoji
 */
function setEmoji(id, emoji) {
  if (!L.pickEmoji(state, id, emoji)) return;
  save();
  render();
  if (!busy) { pulse('hop', 460); say('ooh, new look!', 1100); }
}

// ---------- picker ----------
var pickerFor = null;
pickerGrid.append.apply(pickerGrid, Foods.all.map(function (e) {
  var b = document.createElement('button');
  b.type = 'button';
  b.dataset.emoji = e;
  b.setAttribute('aria-label', e);
  b.appendChild(emojiImg(e, ''));
  return b;
}));
/**
 * Opens the emoji picker for one item.
 * @param {string} id
 */
function openPicker(id) {
  var item = find(id);
  if (!item) return;
  pickerFor = id;
  pickerName.textContent = '“' + item.text + '”';
  pickerGrid.querySelectorAll('button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.emoji === item.emoji ? 'true' : 'false');
  });
  openDialog(picker);
}
/** Closes the emoji picker. */
function closePicker() { if (picker.close) picker.close(); else picker.removeAttribute('open'); pickerFor = null; }
pickerGrid.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || !pickerFor) return;
  var id = pickerFor;
  closePicker();
  sound('pick');
  setEmoji(id, b.dataset.emoji);
});
deleteBtn.addEventListener('click', function () {
  var id = pickerFor;
  closePicker();
  if (id) { sound('remove'); removeItem(id); }
});
picker.addEventListener('click', function (e) { if (e.target === picker) closePicker(); });
