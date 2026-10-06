// Treats: now and then Nibble asks for a snack (a little thought cloud with the food in it) and you feed it by tapping the cloud.
// Up to three a day, each one once; they count for goals and personalities like shopping does (same daily limits),
// but never for the Top 10. Nothing is lost by ignoring a wish: the cloud goes away by itself.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var wishHop = 0;
var wishEl = $('wish'), wishCloud = $('wishCloud'), wishWord = '', wishTimer = 0, wishGone = 0;
var WISH_FIRST_MS = [45000, 60000];      // the first ask after the app opens: between these
var WISH_GAP_MS = [180000, 240000];      // later asks: a few minutes apart
var WISH_STAYS_MS = 80000;               // how long the cloud waits to be noticed
var WISH_NAME = { apple: 'an apple', strawberry: 'a strawberry', carrot: 'a carrot', broccoli: 'some broccoli', bread: 'some bread', cheese: 'some cheese', peanuts: 'some peanuts', fish: 'some fish', cookie: 'a cookie' };

/** @returns {number} A random time in a [min, extra] range of milliseconds. */
function wishDelay(range) { return range[0] + Math.random() * range[1]; }
/** Waits, then asks for something (or tries again a little later if now is a bad moment). */
function scheduleWish(ms) {
  clearTimeout(wishTimer);
  wishTimer = setTimeout(askForTreat, ms);
}
/** @returns {boolean} Whether it is a good moment to ask: awake, not busy, nothing open, not bedtime. */
function mayWish() {
  return !busy && !document.hidden && !wishWord && suggestEl.hidden && baseState() !== 'sleepy' && !stage.classList.contains('bedtime') && !stage.classList.contains('night-lamp') &&
    !document.querySelector('dialog[open]:not(#roomSheet)');
}
/** Nibble asks for a snack he has not had today. @param {boolean} [force] Ask now whatever else is going on (the developer tool). */
function askForTreat(force) {
  var word = L.nextWish(state.pet, new Date(), Math.random);
  if (!word) { scheduleWish(wishDelay([30 * 60000, 10 * 60000])); return; }   // all treats used today: look again much later
  if (!force && !mayWish()) { scheduleWish(25000); return; }
  var found = L.createItem(word, {}, 'treat');
  wishWord = word;
  wishCloud.replaceChildren(emojiImg(found.emoji, ''));
  wishEl.setAttribute('aria-label', 'Nibble would like ' + word + '. Tap to feed it.');
  wishEl.hidden = false;
  wishPose();
  clearInterval(wishHop);
  wishHop = setInterval(wishPose, 5000);
  sound('ooh');
  // the first few asks say how it works
  var asks = 0;
  try { asks = +localStorage.getItem('nibble-wish-asks') || 0; localStorage.setItem('nibble-wish-asks', String(asks + 1)); } catch (e) { /* storage blocked */ }
  if (asks < 4) say(pick(['tap my thought cloud to feed me!', 'psst… tap the cloud, I want ' + (WISH_NAME[word] || word) + '!']), 2600);
  else say(pick(['could I have ' + (WISH_NAME[word] || word) + '?', 'ooh… ' + word + '?', 'I\'m peckish…', 'snack time?']), 1800);
  clearTimeout(wishGone);
  wishGone = setTimeout(function () { dropWish(false); }, WISH_STAYS_MS);
}
/** He looks up at the cloud with open eyes, reaches for it and hops a little towards it (again now and then while it waits). */
function wishPose() {
  if (!wishWord || busy || baseState() === 'sleepy') return;
  pet.classList.add('wishing');
  setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: [] });
  pulse('hop', 500);
}
/** Takes the cloud away and plans the next ask. @param {boolean} fed He got what he asked for. */
function dropWish(fed) {
  clearTimeout(wishGone);
  wishWord = '';
  wishEl.hidden = true;
  pet.classList.remove('wishing');
  clearInterval(wishHop);
  if (!fed && !busy) settle();
  scheduleWish(wishDelay(fed ? WISH_GAP_MS : WISH_GAP_MS.map(function (n) { return n / 2; })));
}

/** Feeds the wished-for snack. */
wishEl.addEventListener('click', function (e) {
  e.stopPropagation();
  if (!wishWord) return;
  var word = wishWord, now = new Date();
  var given = L.giveTreat(state.pet, word, now);
  var from = wishEl.getBoundingClientRect();
  dropWish(given.ok);
  if (!given.ok) return;
  var item = L.createItem(word, {}, 'treat');   // no added time: a free treat counts straight away
  item.treat = true;
  var goals = creditEaten(item, now);
  save();
  if (baseState() === 'sleepy' && !busy && !reduceMotion) {
    // asleep: it wakes with a start for the treat, eats it happy but tired, then goes back to sleep
    busy++;
    setTimeout(function () { busy--; eat(item, from, goals); }, wakeForSnack());
  } else eat(item, from, goals);
});

scheduleWish(wishDelay(WISH_FIRST_MS));

/** Developer tool: makes Nibble ask for a snack right now. @returns {string} What happened. */
function devWish() {
  if (wishWord) return 'He is already asking for ' + wishWord + '. Tap the cloud above his head.';
  if (!L.nextWish(state.pet, new Date(), Math.random)) return 'All ' + L.TREATS_PER_DAY + ' treats are used for today. "Skip to tomorrow" gives fresh ones.';
  askForTreat(true);
  return 'Nibble is asking for ' + wishWord + '. Close this sheet and tap the cloud.';
}
