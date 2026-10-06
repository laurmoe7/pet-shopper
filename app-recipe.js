// Add from a recipe: paste a link (read through the recipe helper, worker/recipe-proxy.js) or the ingredients, tick what you
// need, and they join the shopping list. Reading the recipe is in recipe.js. Shopping list only.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var recipeSheet = $('recipeSheet'), recipeInput = $('recipeInput'), recipeStatus = $('recipeStatus'), recipeList = $('recipeList');
var RECIPE_HELPER_KEY = 'nibble-recipe-helper';
/** The address of the recipe helper Worker. Put yours here once it is online, or paste it into the sheet (kept on the device). */
var RECIPE_HELPER = '';
var recipeFound = [];

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

/** Shows the ingredients found, each ticked, to untick the ones you have. @param {string} title @param {string[]} names */
function showRecipe(title, names) {
  var onList = {};
  state.items.forEach(function (i) { if (!i.done) onList[i.text.toLowerCase()] = true; });
  recipeFound = names;
  recipeList.replaceChildren.apply(recipeList, names.map(function (n, i) {
    var label = document.createElement('label'), box = document.createElement('input');
    box.type = 'checkbox'; box.checked = !onList[n.toLowerCase()]; box.dataset.i = i;
    var text = document.createElement('span');
    text.textContent = n + (onList[n.toLowerCase()] ? ' (already on your list)' : '');
    label.append(box, emojiImg(L.createItem(n, state.overrides, 'x', 0, 'shop').emoji, ''), text);
    return label;
  }));
  $('recipeName').textContent = title || 'Ingredients';
  $('recipeResult').hidden = !names.length;
  updateRecipeAdd();
}
/** @returns {string[]} The ingredients that are ticked. */
function recipeChosen() {
  return Array.prototype.filter.call(recipeList.querySelectorAll('input'), function (b) { return b.checked; }).map(function (b) { return recipeFound[+b.dataset.i]; });
}
function updateRecipeAdd() {
  var n = recipeChosen().length;
  $('recipeAdd').textContent = n ? 'Add ' + n + (n === 1 ? ' thing' : ' things') + ' to the list' : 'Nothing ticked';
  $('recipeAdd').disabled = !n;
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
      recipeSay('Found ' + rec.ingredients.length + ' ingredients. Untick what you already have.');
      showRecipe(rec.title, rec.ingredients);
    }).catch(function (e) {
      if (e && e.message === 'helper') { $('recipeHelper').open = true; recipeSay('Links need the recipe helper: add its address below. Or paste the ingredients.', true); }
      else { recipeSay('I couldn\'t read that page. Try pasting the ingredients instead.', true); }
    }).then(function () { $('recipeGo').disabled = false; });
    return;
  }
  var names = Recipe.recipeFromText(text);
  if (!names.length) { recipeSay('I couldn\'t find ingredients in that.', true); return; }
  recipeSay('Found ' + names.length + ' ingredients. Untick what you already have.');
  showRecipe('', names);
}

/** Puts the ticked ingredients on the shopping list in one go, then Nibble reacts once. */
function recipeAddAll() {
  var names = recipeChosen();
  if (!names.length || isTodo()) return;
  names.forEach(function (n) {
    var item = L.createItem(n, state.overrides, newId(), Date.now(), 'shop');
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
