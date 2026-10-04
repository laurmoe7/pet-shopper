// Shared setup: saved state, small helpers, page elements and list rendering.
// The app is split into app*.js files: plain scripts that share one scope, loaded in the order listed in index.html. This one comes first.
'use strict';

// keep in step with CACHE in sw.js (a test checks); shown in Options so you can tell which build you are on
var BUILD = '125';


var STORE_KEY = 'nibble.v1';
var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- state ----------
// The rules (matching, moods, list order, sounds) live in logic.js as PetLogic.
var L = PetLogic;
var nextId = Date.now();
/** @returns {string} A new unique item id. */
function newId() { return String(nextId++); }
var state = load();

/** Reads saved state from the phone, or starts fresh with the sample list. */
function load() {
  var raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { /* storage blocked */ }
  return L.parseState(raw, newId);
}
/** Saves the whole state on the phone. Fails quietly if storage is blocked. */
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
}

/**
 * Makes an <img> for an emoji from the bundled OpenMoji set.
 * @param {string} emoji
 * @param {string} [alt] Alt text; defaults to the emoji itself.
 * @returns {HTMLImageElement}
 */
function emojiImg(emoji, alt) {
  var img = document.createElement('img');
  img.src = Foods.emojiFile(emoji);
  img.alt = alt || emoji;
  img.draggable = false;
  return img;
}
/**
 * @template T
 * @param {T[]} list Things with an `id`.
 * @param {string} id
 * @returns {?T} The entry with this id, or null.
 */
function byId(list, id) {
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
var SVGNS = 'http://www.w3.org/2000/svg';
/**
 * A small inline drawing for a button or the room.
 * @param {string} view The viewBox.
 * @param {string} inner SVG markup.
 * @returns {SVGSVGElement}
 */
function svgIcon(view, inner) {
  var svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', view);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = inner;
  return svg;
}
/**
 * Opens a sheet as a modal, or plainly where <dialog> isn't supported.
 * @param {HTMLDialogElement} d
 */
function openDialog(d) {
  if (d.id === 'picker') {          // the emoji picker covers everything, like before
    sound('open');
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    return;
  }
  // the other sheets are panels above the bottom bar, so the bar stays usable: tapping a bar
  // button again closes its sheet, and tapping another one swaps sheets
  if (d.open) { d.close(); return; }
  closeSheets();
  sound('open');
  if (d.show) d.show(); else d.setAttribute('open', '');
}
/** Closes every open sheet except the emoji picker. */
function closeSheets() {
  document.querySelectorAll('dialog[open]:not(#picker)').forEach(function (d) { d.close(); });
}
// Escape closes the sheet that is open
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var open = document.querySelectorAll('dialog[open]:not(#picker)');
  if (open.length) open[open.length - 1].close();
});
// sheets have no Done button: a grab bar closes a sheet with a tap or a swipe down, and so does a tap on the list.
// While you drag the bar the sheet follows your finger, so it is clear that pulling it down closes it.
document.querySelectorAll('dialog.pet-sheet').forEach(function (d) {
  var grab = document.createElement('button');
  grab.type = 'button'; grab.className = 'sheet-grab'; grab.setAttribute('aria-label', 'Close');
  var startY = null, lastY = 0, lastT = 0, speed = 0;
  function dy(e) { return e.clientY - startY; }
  grab.addEventListener('pointerdown', function (e) {
    startY = lastY = e.clientY; lastT = e.timeStamp; speed = 0;
    grab.setPointerCapture(e.pointerId);
    d.style.transition = 'none';
  });
  grab.addEventListener('pointermove', function (e) {
    if (startY === null) return;
    var y = dy(e);
    if (e.timeStamp > lastT) speed = (e.clientY - lastY) / (e.timeStamp - lastT);
    lastY = e.clientY; lastT = e.timeStamp;
    // down follows the finger; up only gives a little, like pulling against a spring
    d.style.transform = 'translateY(' + (y > 0 ? y : y / 6) + 'px)';
  });
  function release(e) {
    if (startY === null) return;
    var y = dy(e), tap = Math.abs(y) < 8;
    startY = null;
    if (tap || y > Math.min(120, d.offsetHeight * 0.3) || (y > 20 && speed > 0.5)) {
      // slide the rest of the way down, then close
      d.style.transition = 'transform .18s ease-in';
      d.style.transform = 'translateY(' + d.offsetHeight + 'px)';
      setTimeout(function () { d.close(); }, tap ? 0 : 170);
    } else {
      d.style.transition = 'transform .25s cubic-bezier(.3, 1.4, .5, 1)';
      d.style.transform = '';
    }
  }
  grab.addEventListener('pointerup', release);
  grab.addEventListener('pointercancel', function (e) { e = { clientY: startY + 10 }; release(e); });
  // a closed sheet starts in its normal place next time
  d.addEventListener('close', function () { d.style.transition = ''; d.style.transform = ''; });
  d.prepend(grab);
});
document.addEventListener('click', function (e) {
  if (!e.target.closest('.list-area, .scene-bar') || e.target.closest('button')) return;
  document.querySelectorAll('dialog[open]:not(#picker):not(#roomSheet)').forEach(function (d) { d.close(); });
});
// sticker buttons rock like a roly-poly when tapped (the look is in styles.css)
document.addEventListener('click', function (e) {
  var b = e.target.closest('.dock button, .gear-btn, .add-btn');
  if (!b) return;
  var el = b.querySelector('.dock-icon') || b;
  // a different rock each time: it may tip left or right first, by a random amount
  el.style.setProperty('--roly-dir', Math.random() < 0.5 ? -1 : 1);
  el.style.setProperty('--roly-amp', (0.7 + Math.random() * 0.6).toFixed(2));
  el.classList.remove('roly-tap');
  void el.offsetWidth;
  el.classList.add('roly-tap');
  setTimeout(function () { el.classList.remove('roly-tap'); }, 750);
});
// sheets sit just above the bottom bar, wherever the phone puts its home bar
(function () {
  var dock = document.querySelector('.dock');
  function measure() { if (!document.documentElement.classList.contains('typing')) document.documentElement.style.setProperty('--dock-h', dock.offsetHeight + 'px'); }
  measure();
  addEventListener('resize', measure);
})();

// ---------- elements ----------
var $ = function (id) { return document.getElementById(id); };
var pet = $('pet'), petSvg = pet.querySelector('.pet-svg'), bubble = $('bubble'), todoEl = $('todo'), doneEl = $('done');
var addForm = $('addForm'), addInput = $('addInput'), addPreview = $('addPreview');
var eatenSection = $('eatenSection'), eatenCount = $('eatenCount'), emptyHint = $('emptyHint');
// Developer tools can pretend it is day or night ('auto' uses the real clock). Not saved.
var devClock = 'auto';
/** @returns {Date} The time the pet goes by: the real time, or midday / 11 pm when Developer tools say so. */
function petNow() {
  var d = new Date();
  if (devClock === 'day') d.setHours(12, 0, 0, 0);
  if (devClock === 'night') d.setHours(23, 0, 0, 0);
  return d;
}
/** The line shown when the list is empty: awake in the day, asleep at night. */
function updateEmptyHint() {
  var name = document.createElement('span');
  name.className = 'pet-name';
  name.textContent = state.pet.name || 'Nibble';
  var night = L.isNight(petNow());
  emptyHint.replaceChildren(name, night
    ? ' is sleeping. Add something to the list for a wake-up snack.'
    : ' is ready when you are. Add something to the list to go shopping together!');
}
var clearBtn = $('clearBtn');
var picker = $('picker'), pickerGrid = $('pickerGrid'), pickerName = $('pickerName'), deleteBtn = $('deleteBtn');

// ---------- rendering ----------
var freshIds = {};
// rows that haven't changed are kept between renders, so ticking one thing off
// doesn't rebuild every row and reload every emoji
var rows = {};

/** Redraws both lists and the empty hint from state. */
function render() {
  var todo = state.items.filter(function (i) { return !i.done; });
  var done = state.items.filter(function (i) { return i.done; });
  var kept = {};
  function rowFor(item) {
    var key = (item.done ? 1 : 0) + item.emoji + '|' + item.text;
    var old = rows[item.id];
    var li = old && old.key === key && !freshIds[item.id] ? old.li : row(item);
    kept[item.id] = { key: key, li: li };
    return li;
  }
  todoEl.replaceChildren.apply(todoEl, todo.map(rowFor));
  doneEl.replaceChildren.apply(doneEl, done.map(rowFor));
  rows = kept;
  eatenSection.hidden = done.length === 0;
  eatenCount.textContent = '(' + done.length + ')';
  emptyHint.hidden = state.items.length > 0;
  updateEmptyHint();
  renderCart(todo, done);
  freshIds = {};
  if (!busy) settle();
  walkHome();
  refreshBedtime();
}

var cartEl = $('cart'), cartLoad = $('cartLoad'), cartBag = $('cartBag'), bagLoad = $('bagLoad'), cartCount = -1, bagCount = -1;
/**
 * Fills a box with emoji, only redrawing when they change.
 * @param {Element} box
 * @param {Item[]} items
 */
function fillWith(box, items) {
  var shown = items.map(function (i) { return i.emoji; }).join('');
  if (box.dataset.shown === shown) return;
  box.replaceChildren.apply(box, items.map(function (i) { return emojiImg(i.emoji, ''); }));
  box.dataset.shown = shown;
}
/**
 * The pet's shopping cart holds the next few things still to buy, so it empties as the list gets done.
 * Things that aren't food go into the paper bag beside the pet once ticked off (the pet doesn't eat those).
 * @param {Item[]} todo Still to buy.
 * @param {Item[]} done Ticked off.
 */
function renderCart(todo, done) {
  if (RECEIPT_TEST) { cartEl.hidden = true; renderReceipt(done); }
  else cartEl.hidden = todo.length === 0;
  var bagged = done.filter(isBagged);
  fillWith(cartLoad, todo.slice(0, 3));
  fillWith(bagLoad, bagged.slice(-2));
  cartBag.hidden = bagged.length === 0;
  if (cartCount >= 0 && todo.length !== cartCount) {
    cartEl.classList.remove('bump'); void cartEl.offsetWidth; cartEl.classList.add('bump');
  }
  if (bagged.length > bagCount && bagCount >= 0) {
    cartBag.classList.remove('bump'); void cartBag.offsetWidth; cartBag.classList.add('bump');
  }
  cartCount = todo.length;
  bagCount = bagged.length;
}
// Test (build 98): a receipt stands in for the cart. Set to false to bring the cart back; its code is kept.
var RECEIPT_TEST = true;
var receiptEl = $('receipt'), receiptLines = $('receiptLines'), receiptMore = $('receiptMore'), receiptTotal = $('receiptTotal'), receiptCount = -1;
var RECEIPT_MAX = 5;
/**
 * A little shop receipt beside the pet: one line per thing ticked off (the latest ones, newest at the bottom),
 * so it grows as you shop. Clearing the eaten items clears it.
 * @param {Item[]} done Ticked off, oldest first.
 */
function renderReceipt(done) {
  receiptEl.hidden = done.length === 0;
  var shown = done.slice(-RECEIPT_MAX);
  var key = shown.map(function (i) { return i.id; }).join(',');
  if (receiptLines.dataset.shown !== key) {
    receiptLines.replaceChildren.apply(receiptLines, shown.map(function (i) {
      var li = document.createElement('li');
      li.append(emojiImg(i.emoji, ''));
      return li;
    }));
    receiptLines.dataset.shown = key;
  }
  receiptMore.hidden = done.length <= RECEIPT_MAX;
  receiptTotal.textContent = done.length + (done.length === 1 ? ' item' : ' items');
  if (receiptCount >= 0 && done.length > receiptCount) {
    var last = receiptLines.lastElementChild;
    if (last) last.classList.add('new');
    receiptEl.classList.remove('bump'); void receiptEl.offsetWidth; receiptEl.classList.add('bump');
  }
  receiptCount = done.length;
}
/** @returns {{x: number, y: number}} Where things that aren't food fly to: the top of the paper bag beside the pet. */
function bagPoint() {
  var hid = cartBag.hidden;
  cartBag.hidden = false; // measure it even before the first thing goes in
  var r = cartBag.getBoundingClientRect();
  cartBag.hidden = hid;
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.3 };
}

/**
 * Builds one list row: check button, emoji button and text.
 * @param {Item} item
 * @returns {HTMLLIElement}
 */
function row(item) {
  var li = document.createElement('li');
  li.className = 'item' + (item.done ? ' done' : '') + (freshIds[item.id] ? ' new' : '');
  li.dataset.id = item.id;

  var check = document.createElement('button');
  check.type = 'button';
  check.className = 'check';
  check.setAttribute('aria-label', (item.done ? 'Put back ' : 'Check off ') + item.text);
  check.setAttribute('aria-pressed', item.done ? 'true' : 'false');

  var eb = document.createElement('button');
  eb.type = 'button';
  eb.className = 'emoji-btn';
  eb.setAttribute('aria-label', 'Change emoji for ' + item.text);
  eb.appendChild(emojiImg(item.emoji, ''));

  var text = document.createElement('span');
  text.className = 'item-text';
  text.textContent = item.text;

  li.append(check, eb, text);
  return li;
}

/**
 * @param {string} id
 * @returns {?Item} The list item with this id, or null.
 */
function find(id) {
  for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i];
  return null;
}
/**
 * Where an item's emoji is on screen, so a flying emoji can start or land there.
 * @param {string} id
 * @returns {?DOMRect}
 */
function rowEmojiRect(id) {
  var el = document.querySelector('.item[data-id="' + id + '"] .emoji-btn');
  return el ? el.getBoundingClientRect() : null;
}
