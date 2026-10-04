// Shared setup: saved state, small helpers, page elements and list rendering.
// The app is split into app*.js files: plain scripts that share one scope, loaded in the order listed in index.html. This one comes first.
'use strict';

// keep in step with CACHE in sw.js (a test checks); shown in Options so you can tell which build you are on
var BUILD = '82';


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
// sheets have no Done button: a grab bar closes a sheet with a tap or a swipe down, and so does a tap on the list
document.querySelectorAll('dialog.pet-sheet').forEach(function (d) {
  var grab = document.createElement('button');
  grab.type = 'button'; grab.className = 'sheet-grab'; grab.setAttribute('aria-label', 'Close');
  var startY = null;
  grab.addEventListener('pointerdown', function (e) { startY = e.clientY; grab.setPointerCapture(e.pointerId); });
  grab.addEventListener('pointerup', function (e) {
    if (startY !== null && (Math.abs(e.clientY - startY) < 8 || e.clientY - startY > 30)) d.close();
    startY = null;
  });
  d.prepend(grab);
});
document.addEventListener('click', function (e) {
  if (!e.target.closest('.list-area, .scene-bar') || e.target.closest('button')) return;
  document.querySelectorAll('dialog[open]:not(#picker):not(#roomSheet)').forEach(function (d) { d.close(); });
});
// sheets sit just above the bottom bar, wherever the phone puts its home bar
(function () {
  var dock = document.querySelector('.dock');
  function measure() { document.documentElement.style.setProperty('--dock-h', dock.offsetHeight + 'px'); }
  measure();
  addEventListener('resize', measure);
})();

// ---------- elements ----------
var $ = function (id) { return document.getElementById(id); };
var pet = $('pet'), petSvg = pet.querySelector('.pet-svg'), bubble = $('bubble'), todoEl = $('todo'), doneEl = $('done');
var addForm = $('addForm'), addInput = $('addInput'), addPreview = $('addPreview');
var eatenSection = $('eatenSection'), eatenCount = $('eatenCount'), emptyHint = $('emptyHint');
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
  renderCart(done);
  freshIds = {};
  if (!busy) settle();
}

var cartEl = $('cart'), cartLoad = $('cartLoad'), cartCount = 0;
/**
 * Shows the pet's shopping cart once something is ticked off, with the last
 * few things it picked up peeking out.
 * @param {Item[]} done The eaten items.
 */
function renderCart(done) {
  cartEl.hidden = done.length === 0;
  var shown = done.slice(-3).map(function (i) { return i.emoji; }).join('');
  if (cartLoad.dataset.shown !== shown) {
    cartLoad.replaceChildren.apply(cartLoad, done.slice(-3).map(function (i) { return emojiImg(i.emoji, ''); }));
    cartLoad.dataset.shown = shown;
  }
  if (done.length > cartCount && cartCount > 0) {
    cartEl.classList.remove('bump'); void cartEl.offsetWidth; cartEl.classList.add('bump');
  }
  cartCount = done.length;
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
