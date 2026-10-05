// The dressing room.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- dressing room ----------
/**
 * @param {string} id
 * @returns {?Object} The wardrobe item with this id, or null (e.g. for "none").
 */
function wardrobeItem(id) { return byId(Wardrobe, id); }
/**
 * Draws an outfit into a pet drawing: hats on the head, clothes (hoodies) over the whole pet,
 * and glasses, mouth things, neckwear and shoes in their own places.
 * @param {Element} el A .pet element.
 * @param {{hat: string, body: string, face: string, mouth: string, neck: string, feet: string}} outfit
 */
function dressUp(el, outfit) {
  var clothes = wardrobeItem(outfit.body);
  var hood = !!(clothes && clothes.hood);
  var item = wardrobeItem(outfit.hat); // a hat can go on top of a hood
  el.querySelector('.outfit-hat').innerHTML = item ? item.svg : '';
  el.querySelector('.outfit-body').innerHTML = clothes ? clothes.svg : '';
  if (hood) el.dataset.hood = clothes.id; else delete el.dataset.hood;
  if (clothes) el.dataset.clothes = clothes.id; else delete el.dataset.clothes;
  el.classList.toggle('sleeved', !!(clothes && clothes.sleeves)); // arms become sleeves with the hand peeking out
  // mouth things (toast, mustache) are drawn in front of the face, so they can be worn with neckwear
  ['face', 'mouth', 'neck', 'feet'].forEach(function (slot) {
    var w = wardrobeItem(outfit[slot]);
    el.querySelector('.outfit-' + slot).innerHTML = w ? w.svg : '';
  });
  // with clothes on, neckwear is drawn over them instead of under the face
  var neck = el.querySelector('.outfit-neck'), over = el.querySelector('.outfit-neck-over');
  if (clothes && over) { over.innerHTML = neck.innerHTML; neck.innerHTML = ''; } else if (over) over.innerHTML = '';
  el.classList.toggle('hooded', hood);
  el.classList.toggle('snug', !!(item && item.snug));
  el.classList.toggle('shod', !!wardrobeItem(outfit.feet)); // shoes replace the pet's own feet
}

var dressSheet = $('dressSheet'), dressPreview = $('dressPreview');
// one strip per slot: hats, clothes (hoodies), glasses, mouth things, neckwear and shoes
var WEAR_ROWS = [
  { slot: 'hat', strip: $('hatStrip'), none: 'Nothing' },
  { slot: 'body', strip: $('bodyStrip'), none: 'Nothing' },
  { slot: 'face', strip: $('faceStrip'), none: 'No glasses' },
  { slot: 'mouth', strip: $('mouthStrip'), none: 'Nothing' },
  { slot: 'neck', strip: $('neckStrip'), none: 'Bare neck' },
  { slot: 'feet', strip: $('feetStrip'), none: 'Bare feet' }
];
WEAR_ROWS.forEach(function (row) {
  [{ id: 'none', label: row.none }].concat(Wardrobe.filter(function (w) { return w.slot === row.slot; })).forEach(function (item) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.hat = item.id;
    b.dataset.slot = row.slot;
    var icon = item.id === 'none'
      ? svgIcon('0 0 40 40', '<circle class="hat-none" cx="20" cy="20" r="12"/><path class="hat-none" d="M11.5 28.5 L28.5 11.5"/>')
      : svgIcon(item.icon || '32 2 96 60', item.svg);
    var label = document.createElement('span');
    label.textContent = item.label;
    b.append(icon, label);
    row.strip.appendChild(b);
  });
});
/** Every wardrobe button, in every slot. */
function wearButtons() { return dressSheet.querySelectorAll('.hat-strip button'); }
/** Marks what is worn in each slot in the dressing room and updates its preview. */
function refreshDressRoom() {
  wearButtons().forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.hat === state.pet.outfit[b.dataset.slot] ? 'true' : 'false');
  });
  var view = dressPreview.querySelector('.pet');
  if (view) dressUp(view, state.pet.outfit);
}
$('dressBtn').addEventListener('click', function () {
  // a live copy of the pet to try things on
  var view = document.createElement('div');
  view.className = 'pet preview x-cheeks' + (L.isBird(state.pet.species) ? ' beaked' : '');
  view.dataset.species = state.pet.species;
  view.dataset.skin = state.pet.skin || '';
  view.dataset.state = 'curious';
  view.dataset.eyes = 'open';
  view.dataset.mouth = 'smile';
  view.dataset.arms = 'idle';
  view.appendChild(petCopy());
  dressPreview.replaceChildren(view);
  refreshLocks();
  refreshDressRoom();
  openDialog(dressSheet);
});
function onWearClick(e) {
  var b = e.target.closest('button');
  if (!b) return;
  lastDressTouch = Date.now();
  if (!unlocked('hat', b.dataset.hat)) { lockHint(hatHint, 'hat', b.dataset.hat); return; }
  hatHint.hidden = true;
  state.pet.outfit[b.dataset.slot] = b.dataset.hat;
  save();
  refreshDressRoom();
  dressUp(pet, state.pet.outfit);
  sound(b.dataset.hat !== 'none' ? 'excited' : 'tap');
  var pointed = hoveredHat === b.dataset.hat;
  if (pointed && b.dataset.hat !== 'none') dressSay(line('look', ['how do I look?', 'I love it!', 'kawaii?', 'ta-da!']), 1600, true);
  else dressSay(b.dataset.hat === 'none' ? 'fresh look!' : hatLine(b.dataset.hat), 1600);
  var view = dressPreview.querySelector('.pet');
  if (view) {
    view.dataset.mouth = 'smile';
    view.dataset.eyes = b.dataset.hat === 'none' ? 'open' : 'happy';
    // back to open eyes soon, so they can follow your finger again
    clearTimeout(sparkleTimer);
    sparkleTimer = setTimeout(function () { view.dataset.eyes = 'open'; }, 900);
    // the cheer has its own timer: tapping the next outfit starts a sparkle, which clears sparkleTimer,
    // and that used to leave the arms waving in the air for good
    view.dataset.arms = b.dataset.hat === 'none' ? 'idle' : 'cheer';
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(function () { view.dataset.arms = 'idle'; }, 900);
    view.classList.remove('hop'); void view.offsetWidth; view.classList.add('hop');
  }
}
WEAR_ROWS.forEach(function (row) { row.strip.addEventListener('click', onWearClick); });
// pointing at an unlocked outfit makes the pet react to it
var dressBubble = $('dressBubble'), dressBubbleTimer, hoveredHat = null, lastOoh = 0;
/**
 * Shows a line from the pet in the dressing room .
 * @param {string} text
 * @param {number} ms
 */
function dressSay(text, ms, own) {
  dressBubble.textContent = own ? text : L.styleLine(personality(), text);
  dressBubble.hidden = false;
  // restart the pop animation
  dressBubble.style.animation = 'none'; void dressBubble.offsetWidth; dressBubble.style.animation = '';
  clearTimeout(dressBubbleTimer);
  dressBubbleTimer = setTimeout(function () { dressBubble.hidden = true; }, ms || 1600);
}
/**
 * The pet's line for an outfit it is looking at.
 * @param {string} id Hat id, or "none".
 * @returns {string}
 */
function hatLine(id) {
  var item = wardrobeItem(id);
  if (!item) return pick(['the natural look?', 'just me!', 'all natural!']);
  return pick(item.lines || ['ooh!']);
}
/**
 * Reacts when a finger or cursor lands on an unlocked hat that isn't being worn.
 * @param {Event} e
 */
function onHatHover(e) {
  // a finger has no hover: on phones the tap itself gets the outfit's line
  if (e.pointerType === 'touch') return;
  var b = e.target.closest && e.target.closest('.hat-strip button');
  if (!b || b.dataset.hat === hoveredHat) return;
  hoveredHat = b.dataset.hat;
  if (!unlocked('hat', b.dataset.hat) || b.dataset.hat === state.pet.outfit[b.dataset.slot]) return;
  dressSay(hatLine(b.dataset.hat), 1600);
  var view = dressPreview.querySelector('.pet');
  if (view) sparkle(view);
  if (Date.now() - lastOoh > 500) { sound('ooh'); lastOoh = Date.now(); }
}
var sparkleTimer, cheerTimer, lastDressTouch = 0;
/**
 * A quick sparkle-eyed "ooh" from the dressing-room pet, then its eyes go
 * back to following your finger or cursor.
 * @param {Element} view The preview pet.
 */
function sparkle(view) {
  lastDressTouch = Date.now();
  view.dataset.eyes = 'sparkle';
  view.dataset.mouth = 'open';
  clearTimeout(sparkleTimer);
  sparkleTimer = setTimeout(function () { view.dataset.eyes = 'open'; view.dataset.mouth = 'smile'; }, 600);
}
WEAR_ROWS.forEach(function (row) {
  var strip = row.strip;
  strip.addEventListener('pointerover', onHatHover);
  strip.addEventListener('focusin', onHatHover);
  strip.addEventListener('pointerleave', onHatLeave);
});
function onHatLeave() {
  hoveredHat = null;
  var view = dressPreview.querySelector('.pet');
  if (view && view.dataset.eyes === 'sparkle') { view.dataset.eyes = 'open'; view.dataset.mouth = 'smile'; }
}

dressSheet.addEventListener('close', function () {
  dressBubble.hidden = true;
  hoveredHat = null;
  if (!busy) {
    var item = L.OUTFIT_SLOTS.some(function (slot) { return wardrobeItem(state.pet.outfit[slot]); });
    if (baseState() === 'sleepy') {
      // asleep: only a happy mumble
      pulse('rocksmall', 1300);
      talk('lookSleepy', ['mm… fancy…', 'pretty… zzz'], 1500);
      return;
    }
    if (isTired()) {
      // up at night: pleased with it, but sleepy
      setFace(tiredFace(FACES.tada)); pulse('hopsmall', 450);
      if (item) talk('lookTired', ['so fancy… *yawn*', 'cute pajamas?', 'pretty… and sleepy', 'ta-da… *yawn*'], 1600);
      else say('comfy… *yawn*', 1500);
      setTimeout(function () { if (!busy) settle(); }, 1200);
      return;
    }
    setFace(FACES.tada); pulse('hop', 500);
    if (item) talk('look', ['so fancy!', 'how do I look?', 'kawaii?', 'ta-da!'], 1500); else say('fresh look!', 1500);
    setTimeout(function () { if (!busy) settle(); }, 1000);
  }
});
dressSheet.addEventListener('click', function (e) { if (e.target === dressSheet) dressSheet.close(); });

// ---------- little dances and poses while you choose ----------
// Every few seconds the dressing-room pet does a small dance or strikes a pose (the same CSS moves the main pet uses,
// so it only slides and rocks), then settles back. It waits while you are trying things on.
var DRESS_MOVES = [
  { cls: 'wiggle', ms: 900, eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] },
  { cls: 'twirl', ms: 800, eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks', 'sparkles'] },
  { cls: 'shuffle', ms: 1500, eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] },
  { cls: 'boogie', ms: 1500, eyes: 'happy', mouth: 'smile', arms: 'reach', x: ['sparkles', 'cheeks'] },
  { cls: 'rock', ms: 1900, eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] },
  { cls: 'bob', ms: 1400, eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['cheeks'] },
  { cls: '', ms: 1700, eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] },    // ta-da pose
  { cls: '', ms: 1700, eyes: 'happy', mouth: 'smile', arms: 'pat', x: ['hearts', 'cheeks'] },         // blowing it a kiss
  { cls: '', ms: 1700, eyes: 'closed', mouth: 'smile', arms: 'cover', x: ['cheeks'] },               // shy pose
  { cls: '', ms: 1700, eyes: 'happy', mouth: 'open', arms: 'reach', x: ['sparkles'] }                // jazz hands
];
var DRESS_FX = ['zzz', 'steam', 'hearts', 'sparkles', 'question', 'sweat', 'shock', 'redface', 'cheeks'];
var dressDanceTimer, dressLastMove = -1;
/** Sets the preview pet's face, arms and little extras (hearts, sparkles, cheeks). */
function dressFace(view, f) {
  view.dataset.eyes = f.eyes; view.dataset.mouth = f.mouth; view.dataset.arms = f.arms;
  DRESS_FX.forEach(function (x) { view.classList.toggle('x-' + x, f.x.indexOf(x) !== -1); });
}
function dressDanceSoon() {
  clearTimeout(dressDanceTimer);
  if (!dressSheet.open || reduceMotion) return;
  dressDanceTimer = setTimeout(dressDance, 2200 + Math.random() * 1800);
}
function dressDance() {
  var view = dressPreview.querySelector('.pet');
  if (!dressSheet.open || !view) return;
  // wait while you are trying things on or hovering one
  if (Date.now() - lastDressTouch < 2000 || hoveredHat) { dressDanceSoon(); return; }
  var n;
  do { n = Math.floor(Math.random() * DRESS_MOVES.length); } while (n === dressLastMove);
  dressLastMove = n;
  var m = DRESS_MOVES[n];
  dressFace(view, m);
  if (m.cls) { view.classList.remove(m.cls); void view.offsetWidth; view.classList.add(m.cls); }
  setTimeout(function () {
    if (m.cls) view.classList.remove(m.cls);
    if (Date.now() - lastDressTouch >= m.ms) dressFace(view, { eyes: 'open', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
  }, m.ms);
  dressDanceSoon();
}
$('dressBtn').addEventListener('click', function () { setTimeout(dressDanceSoon, 0); });
dressSheet.addEventListener('close', function () { clearTimeout(dressDanceTimer); });
