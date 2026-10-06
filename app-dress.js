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
  /** @returns {Object[]} The wardrobe items worn in a slot (it can be several). */
  function worn(slot) { return L.wornIds(outfit, slot).map(wardrobeItem).filter(Boolean); }
  var clothes = worn('body'), hats = worn('hat');
  var hood = clothes.filter(function (c) { return c.hood; })[0], last = clothes[clothes.length - 1];
  el.querySelector('.outfit-hat').innerHTML = hats.map(function (h) { return h.svg; }).join(''); // a hat can go on top of a hood
  el.querySelector('.outfit-body').innerHTML = clothes.map(function (c) { return c.svg; }).join('');
  if (hood) el.dataset.hood = hood.id; else delete el.dataset.hood;
  if (last) el.dataset.clothes = last.id; else delete el.dataset.clothes;
  el.classList.toggle('sleeved', clothes.some(function (c) { return c.sleeves; })); // arms become sleeves with the hand peeking out
  // mouth things (toast, mustache) are drawn in front of the face, so they can be worn with neckwear
  ['neck', 'feet'].forEach(function (slot) {
    el.querySelector('.outfit-' + slot).innerHTML = worn(slot).map(function (w) { return w.svg; }).join('');
  });
  // glasses and mouth things share one stack: the first put on is at the bottom, the next on top of it
  el.querySelector('.outfit-faces').innerHTML = L.faceStack(outfit).map(function (e) {
    var w = wardrobeItem(e.id);
    return w ? '<g class="outfit-' + e.slot + '">' + w.svg + '</g>' : '';
  }).join('');
  // with clothes on, neckwear is drawn over them instead of under the face
  var neck = el.querySelector('.outfit-neck'), over = el.querySelector('.outfit-neck-over');
  if (clothes.length && over) { over.innerHTML = neck.innerHTML; neck.innerHTML = ''; } else if (over) over.innerHTML = '';
  el.classList.toggle('hooded', !!hood);
  el.classList.toggle('snug', hats.some(function (h) { return h.snug; }));
  el.classList.toggle('shod', worn('feet').length > 0); // shoes replace the pet's own feet
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
/** @returns {HTMLButtonElement} A tile for a wardrobe item (or the "none" tile) in a slot. */
function wearTile(item, slot) {
  var b = document.createElement('button');
  b.type = 'button';
  b.dataset.hat = item.id;
  b.dataset.slot = slot;
  var icon = item.id === 'none'
    ? svgIcon('0 0 40 40', '<circle class="hat-none" cx="20" cy="20" r="12"/><path class="hat-none" d="M11.5 28.5 L28.5 11.5"/>')
    : svgIcon(item.icon || '32 2 96 60', item.svg);
  var label = document.createElement('span');
  label.textContent = item.label;
  b.append(icon, label);
  return b;
}
WEAR_ROWS.forEach(function (row) {
  [{ id: 'none', label: row.none }].concat(Wardrobe.filter(function (w) { return w.slot === row.slot; })).forEach(function (item) {
    row.strip.appendChild(wearTile(item, row.slot));
  });
});
/** Every wardrobe button, in every slot. */
function wearButtons() { return dressSheet.querySelectorAll('.hat-strip button'); }
/** Marks what is worn in each slot in the dressing room and updates its preview. */
function refreshDressRoom() {
  wearButtons().forEach(function (b) {
    var on = L.wornIds(state.pet.outfit, b.dataset.slot);
    b.setAttribute('aria-pressed', (b.dataset.hat === 'none' ? on.length === 0 : on.indexOf(b.dataset.hat) !== -1) ? 'true' : 'false');
  });
  var view = dressPreview.querySelector('.pet');
  if (view) dressUp(view, state.pet.outfit);
  if (typeof markCloset === 'function') markCloset();   // app-closet.js: shows which saved outfit is on
}
/** Builds the dressing room's live copy of the pet (to try things on) from the main pet. */
function buildDressView() {
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
  refreshDressRoom();
}
// the page's tabs: Pet (name, species, skin, personality), then one tab for each kind of outfit
var dressSearch = $('dressSearch'), dressTabs = $('dressTabs'), dressPanels = $('dressPanels'), nameAtOpen = '';
/** Shows one tab's panel, from the top. @param {string} tab 'pet', 'hat', 'body', 'face', 'mouth', 'neck' or 'feet'. */
function showDressTab(tab) {
  if (tab !== 'search') dressSearch.value = '';
  dressTabs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
  dressPanels.querySelectorAll('.dress-panel').forEach(function (p) { p.hidden = p.dataset.tab !== tab; });
  dressPanels.scrollTop = 0;
}
dressTabs.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  sound('tap');
  showDressTab(b.dataset.tab);
  var again = dressTabs.querySelector('[aria-selected="true"]');
  if (again && again.scrollIntoView) again.scrollIntoView({ inline: 'center', block: 'nearest' });
});
$('dressBtn').addEventListener('click', function () {
  if (dressSheet.open) { dressSheet.close(); return; }   // tapping it again closes it, like the other menus
  nameAtOpen = petName();
  showName();
  lastNameTap = 0;
  refreshLocks();
  applyPet();
  renderPersonalities();
  buildDressView();
  showDressTab('pet');   // it always opens on the pet's own page
  tabBeforeSearch = 'pet';
  openDialog(dressSheet);
});
function onWearClick(e) {
  var b = e.target.closest('button');
  if (!b) return;
  lastDressTouch = Date.now();
  if (!unlocked('hat', b.dataset.hat)) { lockHint(hatHint, 'hat', b.dataset.hat); return; }
  hatHint.hidden = true;
  var wearing = L.toggleWorn(state.pet.outfit, b.dataset.slot, b.dataset.hat);   // several things can be worn in one slot
  save();
  refreshDressRoom();
  dressUp(pet, state.pet.outfit);
  sound(wearing ? 'excited' : 'tap');
  if (wearing && Math.random() < 0.3) setTimeout(dressFlash, 650);   // sometimes it snaps a photo of the new look
  var pointed = hoveredHat === b.dataset.hat;
  if (pointed && wearing) dressSay(line('look', ['how do I look?', 'I love it!', 'kawaii?', 'ta-da!']), 1600, true);
  else dressSay(wearing ? hatLine(b.dataset.hat) : 'fresh look!', 1600);
  dressCheer(wearing);
}
/**
 * The dressing-room pet's little cheer after a change of outfit: a hop and happy eyes, then back to resting.
 * @param {boolean} happy Something was put on (it cheers); false when something came off.
 */
function dressCheer(happy) {
  var view = dressPreview.querySelector('.pet');
  if (view) {
    view.dataset.mouth = 'smile';
    view.dataset.eyes = happy ? 'happy' : 'open';
    // back to open eyes soon, so they can follow your finger again
    clearTimeout(sparkleTimer);
    sparkleTimer = setTimeout(function () { view.dataset.eyes = dressRest.eyes; }, 900);
    // the cheer has its own timer: tapping the next outfit starts a sparkle, which clears sparkleTimer,
    // and that used to leave the arms waving in the air for good
    view.dataset.arms = happy ? 'cheer' : 'idle';
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(function () { view.dataset.arms = dressRest.arms; }, 900);
    view.classList.remove('hop'); void view.offsetWidth; view.classList.add('hop');
  }
}
WEAR_ROWS.forEach(function (row) { row.strip.addEventListener('click', onWearClick); });
// search: typing shows every matching outfit from all tabs in one list; clearing it goes back to the last tab
var SLOT_WORDS = { hat: 'hat cap', body: 'clothes top hoodie', face: 'glasses face', mouth: 'mouth', neck: 'neck scarf', feet: 'shoes feet boots' };
var searchStrip = $('searchStrip'), tabBeforeSearch = 'pet';
dressSearch.addEventListener('input', function () {
  var q = dressSearch.value.trim().toLowerCase();
  if (!q) { showDressTab(tabBeforeSearch); return; }
  var current = dressTabs.querySelector('[aria-selected="true"]');
  if (current) tabBeforeSearch = current.dataset.tab;
  dressTabs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
  dressPanels.querySelectorAll('.dress-panel').forEach(function (p) { p.hidden = p.dataset.tab !== 'search'; });
  var found = Wardrobe.filter(function (w) { return w.label.toLowerCase().indexOf(q) !== -1 || (SLOT_WORDS[w.slot] || '').indexOf(q) !== -1; });
  searchStrip.replaceChildren.apply(searchStrip, found.map(function (w) { return wearTile(w, w.slot); }));
  $('searchNone').hidden = found.length > 0;
  dressPanels.scrollTop = 0;
  refreshDressRoom();
  refreshLocks();
});
dressSearch.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); dressSearch.blur(); } });
searchStrip.addEventListener('click', onWearClick);
searchStrip.addEventListener('click', function () { setTimeout(function () { refreshDressRoom(); refreshLocks(); }, 0); });
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
  if (!unlocked('hat', b.dataset.hat) || L.wornIds(state.pet.outfit, b.dataset.slot).indexOf(b.dataset.hat) !== -1) return;
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
  view.dataset.eyes = 'sparkle';
  view.dataset.mouth = 'open';
  clearTimeout(sparkleTimer);
  sparkleTimer = setTimeout(function () { view.dataset.eyes = dressRest.eyes; view.dataset.mouth = dressRest.mouth; }, 600);
}
WEAR_ROWS.forEach(function (row) {
  var strip = row.strip;
  strip.addEventListener('pointerover', onHatHover);
  strip.addEventListener('focusin', onHatHover);
  strip.addEventListener('pointerleave', onHatLeave);
});
[searchStrip].forEach(function (strip) {
  strip.addEventListener('pointerover', onHatHover);
  strip.addEventListener('focusin', onHatHover);
  strip.addEventListener('pointerleave', onHatLeave);
});
function onHatLeave() {
  hoveredHat = null;
  var view = dressPreview.querySelector('.pet');
  if (view && view.dataset.eyes === 'sparkle') { view.dataset.eyes = dressRest.eyes; view.dataset.mouth = dressRest.mouth; }
}

dressSheet.addEventListener('close', function () {
  finishRename(true);
  state.pet.name = petName();
  save();
  applyPet();
  speciesHint.hidden = true;
  dressBubble.hidden = true;
  hoveredHat = null;
  if (!busy && petName() !== nameAtOpen) { pulse('hop', 500); talk('name', ["I'm {name}!"], 1500, { name: petName() }); return; }   // renamed: it says its new name
  if (!busy) {
    var item = L.OUTFIT_SLOTS.some(function (slot) { return L.wornIds(state.pet.outfit, slot).some(wardrobeItem); });
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
  { cls: 'twirl', ms: 800, eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] },
  { cls: 'shuffle', ms: 1500, eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] },
  { cls: 'boogie', ms: 1500, eyes: 'happy', mouth: 'smile', arms: 'reach', x: ['cheeks'] },
  { cls: 'rock', ms: 1900, eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] },
  { cls: 'bob', ms: 1400, eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['cheeks'] },
  { cls: '', ms: 1700, eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['cheeks'] },    // ta-da pose
  { cls: '', ms: 1700, eyes: 'happy', mouth: 'smile', arms: 'pat', x: ['cheeks'] },         // pleased pat
  { cls: '', ms: 1700, eyes: 'closed', mouth: 'smile', arms: 'cover', x: ['cheeks'] },               // shy pose
  { cls: '', ms: 1700, eyes: 'happy', mouth: 'open', arms: 'reach', x: ['cheeks'] }                // jazz hands
];
// and every now and then it poses for a photo: a flash of light and the click of a camera shutter
var PHOTO_MOVE = { cls: '', ms: 1900, eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'], photo: true };
var DRESS_FX = ['zzz', 'steam', 'hearts', 'sparkles', 'question', 'sweat', 'shock', 'redface', 'cheeks'];
var dressDanceTimer, dressLastMove = -1, lastFlash = 0;
/** The preview pet's resting face right now (what a hover or a tap goes back to, so it keeps emoting around them). */
var dressRest = { eyes: 'open', mouth: 'smile', arms: 'idle' };
/** Sets the preview pet's face, arms and little extras (hearts, sparkles, cheeks). */
function dressFace(view, f) {
  view.dataset.eyes = f.eyes; view.dataset.mouth = f.mouth; view.dataset.arms = f.arms;
  dressRest = { eyes: f.eyes, mouth: f.mouth, arms: f.arms };
  DRESS_FX.forEach(function (x) { view.classList.toggle('x-' + x, f.x.indexOf(x) !== -1); });
}
/** The camera goes off: a white flash over the stage and a shutter click. */
function dressFlash() {
  if (!dressSheet.open || Date.now() - lastFlash < 3500) return;   // never in quick succession
  lastFlash = Date.now();
  var f = $('dressFlash');
  f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop');
  sound('shutter');
}
function dressDanceSoon() {
  clearTimeout(dressDanceTimer);
  if (!dressSheet.open || reduceMotion) return;
  dressDanceTimer = setTimeout(dressDance, 2200 + Math.random() * 1800);
}
function dressDance() {
  var view = dressPreview.querySelector('.pet');
  if (!dressSheet.open || !view) return;
  // wait only just after you pick an outfit; pointing at outfits doesn't stop it
  if (Date.now() - lastDressTouch < 1500) { dressDanceSoon(); return; }
  var m, n = -1;
  if (Math.random() < 0.2) m = PHOTO_MOVE;
  else {
    do { n = Math.floor(Math.random() * DRESS_MOVES.length); } while (n === dressLastMove);
    dressLastMove = n;
    m = DRESS_MOVES[n];
  }
  dressFace(view, m);
  if (m.photo) setTimeout(dressFlash, 750);
  if (m.cls) { view.classList.remove(m.cls); void view.offsetWidth; view.classList.add(m.cls); }
  setTimeout(function () {
    if (m.cls) view.classList.remove(m.cls);
    if (Date.now() - lastDressTouch >= m.ms) dressFace(view, { eyes: 'open', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
  }, m.ms);
  dressDanceSoon();
}
$('dressBtn').addEventListener('click', function () { dressRest = { eyes: 'open', mouth: 'smile', arms: 'idle' }; setTimeout(dressDanceSoon, 0); });
dressSheet.addEventListener('close', function () { clearTimeout(dressDanceTimer); });
