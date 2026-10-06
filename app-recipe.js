// Add from a recipe (and change an item's name or amount, at the end): paste a link (read through the recipe helper, worker/recipe-proxy.js) or the ingredients, tick what you
// need, and they join the shopping list. Reading the recipe is in recipe.js. Shopping list only.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var recipeSheet = $('recipeSheet'), recipeInput = $('recipeInput'), recipeStatus = $('recipeStatus'), recipeList = $('recipeList');
var RECIPE_HELPER_KEY = 'nibble-recipe-helper';
/** The address of the recipe helper Worker. Put yours here once it is online, or paste it into the sheet (kept on the device). */
var RECIPE_HELPER = 'https://pet-shopper-recipes.laurmoe.workers.dev';
var recipeFound = [], recipeUnits = '';
try { recipeUnits = localStorage.getItem('nibble-units') || ''; } catch (e) { /* storage not available */ }
if (recipeUnits !== 'metric' && recipeUnits !== 'us') recipeUnits = '';

/** @returns {string} The helper's address, or "". */
function recipeHelper() {
  try { return localStorage.getItem(RECIPE_HELPER_KEY) || RECIPE_HELPER; } catch (e) { return RECIPE_HELPER; }
}
/** Writes a line under the button. @param {string} text @param {boolean} [bad] */
function recipeSay(text, bad) { recipeStatus.textContent = text; recipeStatus.classList.toggle('bad', !!bad); }

/** Fetches a recipe page through the helper. @param {string} url @returns {Promise<string>} the page's recipe data */
function recipeFetch(url) {
  var helper = recipeHelper();
  if (!helper) return Promise.reject(new Error('helper'));
  var ctl = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return fetch(helper.replace(/\/+$/, '') + '/?url=' + encodeURIComponent(url), ctl ? { signal: ctl.signal } : {}).then(function (r) {
    clearTimeout(timer);
    if (!r.ok) throw new Error('page');
    return r.text();
  }, function (e) { clearTimeout(timer); throw e; });
}

/** Why an ingredient starts unticked: "usual" (salt, water...), "optional", or "" (needed). @param {{name: string, optional?: boolean}} f @returns {string} */
function recipeSkipReason(f) { return f.optional ? 'optional' : Recipe.isStaple(f.name) ? 'usual' : ''; }

/** Shows the ingredients found, each ticked, to untick the ones you have. Salt, water and optional things come last and start unticked. @param {string} title @param {{name: string, qty: string, optional?: boolean}[]} found */
function showRecipe(title, found) {
  var onList = {};
  state.items.forEach(function (i) { if (!i.done) onList[i.text.toLowerCase()] = true; });
  var needed = found.filter(function (f) { return !recipeSkipReason(f); }), skipped = found.filter(recipeSkipReason);
  recipeFound = needed.concat(skipped);
  recipeList.replaceChildren.apply(recipeList, recipeFound.map(function (f, i) {
    var n = f.name, why = recipeSkipReason(f);
    var label = document.createElement('label'), box = document.createElement('input');
    box.type = 'checkbox'; box.checked = !onList[n.toLowerCase()] && !why; box.dataset.i = i;
    var text = document.createElement('span');
    text.textContent = n + (onList[n.toLowerCase()] ? ' (already on your list)' : why === 'optional' ? ' (optional)' : why === 'usual' ? ' (you probably have it)' : '');
    label.append(box, emojiImg(L.createItem(n, state.overrides, 'x', 0, 'shop').emoji, ''), text);
    if (f.qty) { var q = document.createElement('b'); q.className = 'qty-tag'; q.textContent = Recipe.convertQty(f.qty, recipeUnits, f.name); label.append(q); }
    return label;
  }));
  $('recipeName').textContent = title || 'Ingredients';
  showUnits();
  $('recipeResult').hidden = !found.length;
  updateRecipeAdd();
}
/** @returns {{name: string, qty: string}[]} The ingredients that are ticked. */
function recipeChosen() {
  return Array.prototype.filter.call(recipeList.querySelectorAll('input'), function (b) { return b.checked; }).map(function (b) { return recipeFound[+b.dataset.i]; });
}
function updateRecipeAdd() {
  var n = recipeChosen().length;
  $('recipeAdd').textContent = n ? 'Add ' + n + (n === 1 ? ' thing' : ' things') + ' to the list' : 'Nothing ticked';
  $('recipeAdd').disabled = !n;
}

/** @param {{name: string, optional?: boolean}[]} found @returns {string} The line under the button after reading a recipe. */
function recipeFoundText(found) {
  var skipped = found.filter(recipeSkipReason).length;
  return 'Found ' + found.length + ' ingredients. Untick what you already have.' + (skipped ? ' Salt, water and optional things start unticked.' : '');
}

function recipeGo() {
  var text = recipeInput.value.trim();
  $('recipeResult').hidden = true;
  if (!text) { recipeSay('Paste a recipe link or the ingredients first.', true); return; }
  if (Recipe.looksLikeUrl(text)) {
    recipeSay('Reading the recipe…');
    $('recipeGo').disabled = true;
    recipeFetch(text).then(function (html) {
      var rec = Recipe.parseRecipeHtml(html);
      if (!rec) { recipeSay('I couldn\'t find a recipe on that page. Try pasting the ingredients instead.', true); return; }
      recipeSay(recipeFoundText(rec.ingredients));
      showRecipe(rec.title, rec.ingredients);
    }).catch(function (e) {
      if (e && e.message === 'helper') { $('recipeHelper').open = true; recipeSay('Links need the recipe helper: add its address below. Or paste the ingredients.', true); }
      else { recipeSay('I couldn\'t read that page. Try pasting the ingredients instead.', true); }
    }).then(function () { $('recipeGo').disabled = false; });
    return;
  }
  var names = Recipe.recipeFromText(text);
  if (!names.length) { recipeSay('I couldn\'t find ingredients in that.', true); return; }
  recipeSay(recipeFoundText(names));
  showRecipe('', names);
}

/** Puts the ticked ingredients on the shopping list in one go, then Nibble reacts once. */
function recipeAddAll() {
  var names = recipeChosen();
  if (!names.length || isTodo()) return;
  names.forEach(function (n) {
    var item = L.createItem(n.name, state.overrides, newId(), Date.now(), 'shop');
    var qty = Recipe.convertQty(n.qty, recipeUnits, n.name);
    if (qty) item.qty = qty;
    L.addToList(state.items, item);
    freshIds[item.id] = true;
  });
  save();
  render();
  recipeSheet.close();
  recipeInput.value = '';
  $('recipeResult').hidden = true;
  recipeSay('');
  sound('pick');
  if (baseState() === 'sleepy') { say('mm… yum…', 1300); return; }
  if (!busy) { pulse('hop', 460); setFace(FACES.tada || FACES.happy); setTimeout(function () { if (!busy) settle(); }, 900); }
  say(names.length > 1 ? 'so many yummy things!' : 'ooh!', 1800);
}

$('recipeBtn').addEventListener('click', function () {
  recipeSay('');
  $('recipeResult').hidden = true;
  $('recipeProxy').value = recipeHelper();
  $('recipeHelper').hidden = !!RECIPE_HELPER;   // everyone uses the built-in helper; the box is only for a build without one
  sheetUnderMouth(recipeSheet);
  openDialog(recipeSheet);
});
$('recipeGo').addEventListener('click', recipeGo);
$('recipeAdd').addEventListener('click', recipeAddAll);
recipeList.addEventListener('change', updateRecipeAdd);
$('recipeProxy').addEventListener('change', function () {
  var v = this.value.trim();
  try { if (v) localStorage.setItem(RECIPE_HELPER_KEY, v); else localStorage.removeItem(RECIPE_HELPER_KEY); } catch (e) { /* storage not available */ }
  recipeSay(v ? 'Saved the helper address.' : '');
});

// ---------- change an item's name or amount ----------
var itemSheet = $('itemSheet'), editingItem = '';
/** Opens the small sheet for a shopping item. @param {string} id */
function openItemSheet(id) {
  var item = state.items.filter(function (i) { return i.id === id; })[0];
  if (!item) return;
  editingItem = id;
  $('itemName').value = item.text;
  $('itemQty').value = item.qty || '';
  sheetUnderMouth(itemSheet);
  openDialog(itemSheet);
}
/** Saves the name and amount (the emoji and aisle follow a new name, unless you picked an emoji for it yourself). */
function saveItemSheet() {
  var item = state.items.filter(function (i) { return i.id === editingItem; })[0];
  var name = $('itemName').value.trim(), qty = $('itemQty').value.trim().slice(0, 20);
  if (item && name) {
    if (name !== item.text) {
      var found = L.emojiFor(name, state.overrides);
      item.text = name; item.emoji = found.emoji; item.cat = found.cat;
    }
    if (qty) item.qty = qty; else delete item.qty;
    save();
    render();
    sound('pick');
  }
  itemSheet.close();
}
$('itemSave').addEventListener('click', saveItemSheet);
$('itemCancel').addEventListener('click', function () { itemSheet.close(); });
[$('itemName'), $('itemQty')].forEach(function (el) { el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveItemSheet(); } }); });

/** Marks the chosen units button and rewrites the amounts shown (nothing else changes, so ticks stay). */
function showUnits() {
  $('recipeUnits').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.units === recipeUnits)); });
  recipeList.querySelectorAll('input').forEach(function (box) {
    var q = box.parentNode.querySelector('.qty-tag'), f = recipeFound[+box.dataset.i];
    if (q && f) q.textContent = Recipe.convertQty(f.qty, recipeUnits, f.name);
  });
}
$('recipeUnits').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  recipeUnits = b.dataset.units;
  try { localStorage.setItem('nibble-units', recipeUnits); } catch (err) { /* storage not available */ }
  sound('tap');
  showUnits();
});
