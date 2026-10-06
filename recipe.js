/* Recipes: turns a recipe web page (or pasted ingredient lines) into shopping list items.
 * Plain functions with no page code, like bonuses.js, so they can be tested:
 *   parseRecipeHtml(html)  finds the recipe the page describes for search engines (schema.org JSON-LD): { title, ingredients }
 *   parseIngredient(line)  "2 tbsp finely chopped fresh parsley, plus extra" becomes { name: 'Parsley', qty: '2 tbsp' }
 *   recipeFromText(text)   the same for pasted lines, one ingredient per line
 * English and Dutch units and words are understood. The amount is kept as a short note on the item (`qty`).
 */
(function (root) {
  'use strict';

  var UNITS = ['kg', 'g', 'gr', 'gram', 'grams', 'mg', 'l', 'liter', 'litre', 'liters', 'litres', 'dl', 'cl', 'ml', 'tsp', 'tsps', 'tbsp', 'tbsps', 'teaspoon', 'teaspoons',
    'tablespoon', 'tablespoons', 'cup', 'cups', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'pinch', 'pinches', 'dash', 'dashes', 'clove', 'cloves',
    'can', 'cans', 'tin', 'tins', 'jar', 'jars', 'slice', 'slices', 'bunch', 'bunches', 'handful', 'handfuls', 'sprig', 'sprigs', 'stick', 'sticks', 'package', 'packages',
    'packet', 'packets', 'pkg', 'bag', 'bags', 'knob', 'piece', 'pieces', 'head', 'heads', 'stalk', 'stalks', 'el', 'tl', 'eetlepel', 'eetlepels', 'theelepel', 'theelepels',
    'snufje', 'teen', 'tenen', 'blik', 'blikje', 'blikjes', 'bosje', 'bosjes', 'plak', 'plakken', 'plakje', 'plakjes', 'stuk', 'stuks', 'zakje', 'zakjes', 'takje', 'takjes',
    'handvol', 'mespunt', 'scheut', 'beetje', 'bakje', 'pak', 'pakje'];
  var FILLER = ['fresh', 'freshly', 'finely', 'roughly', 'coarsely', 'thinly', 'chopped', 'minced', 'diced', 'sliced', 'grated', 'crushed', 'peeled', 'cubed', 'shredded',
    'large', 'small', 'medium', 'big', 'ripe', 'whole', 'extra', 'good', 'quality', 'organic', 'optional', 'about', 'approx', 'approximately', 'of', 'a', 'an', 'the', 'some',
    'vers', 'verse', 'fijngehakt', 'gehakte', 'gesneden', 'geraspte', 'grote', 'kleine', 'middelgrote', 'ongeveer', 'een', 'van', 'wat', 'naar', 'smaak', 'to', 'taste'];
  var VULGAR_CLASS = '½¼¾⅐-⅞';

  var ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', eacute: 'é', egrave: 'è' };
  /** @param {string} s @returns {string} The text with HTML entities (&amp; &#39; &#x27;) turned into characters. */
  function decode(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, function (m, e) {
      if (e.charAt(0) === '#') {
        var n = e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
      }
      return Object.prototype.hasOwnProperty.call(ENTITIES, e.toLowerCase()) ? ENTITIES[e.toLowerCase()] : m;
    }).replace(/<[^>]*>/g, ' ');
  }

  /**
   * Turns one ingredient line into a list item: the name, and the amount to buy.
   * @param {string} line  Like "2 tbsp finely chopped fresh parsley, plus extra".
   * @returns {{name: string, qty: string}|null} Like { name: 'Parsley', qty: '2 tbsp' }; null for lines that are not an ingredient (headings, empty).
   */
  function parseIngredient(line) {
    var s = decode(line).replace(/^[\s\-•*▢☐☑✓·]+/, '').replace(/\s+/g, ' ').trim();
    if (!s || /:\s*$/.test(s)) return null;               // "For the sauce:"
    s = s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.split(/\s*[,;]\s*/)[0];                          // ", plus extra" / ", to taste"
    s = s.split(/\s+or\s+/i)[0];                          // "butter or margarine"
    // leading amounts: 2, 1.5, 1/2, 1 1/2, 2-3, 2 to 3, and vulgar fractions like ½
    var amount = new RegExp('^(?:[\\d.,]+|[' + VULGAR_CLASS + '])(?:\\s*[\\u2013\\-/]\\s*[\\d.,]+)?(?:\\s*(?:to|tot)\\s*[\\d.,]+)?(?:\\s*[' + VULGAR_CLASS + '])?(?:\\s*\\d+\\/\\d+)?\\s*', 'i');
    var qty = [], words, prev;
    function takeAmount() { var m = s.match(amount); if (m && m[0].trim()) { qty.push(m[0].trim()); s = s.slice(m[0].length); } }
    takeAmount();
    // units and filler words at the front, in any order ("2 large cloves fresh garlic")
    do {
      prev = s;
      words = s.split(' ');
      var w = words[0].toLowerCase().replace(/[.,]$/, '');
      if (words.length > 1 && (UNITS.indexOf(w) >= 0 || FILLER.indexOf(w) >= 0)) {
        if (UNITS.indexOf(w) >= 0) qty.push(words[0].replace(/[.,]$/, ''));
        s = words.slice(1).join(' ');
        takeAmount();
      }
    } while (s !== prev);
    // filler words at the back ("garlic, minced" was cut at the comma; "parsley chopped" is not)
    do {
      prev = s;
      words = s.split(' ');
      var last = words[words.length - 1].toLowerCase();
      if (words.length > 1 && FILLER.indexOf(last) >= 0 && last !== 'a') s = words.slice(0, -1).join(' ');
    } while (s !== prev);
    s = s.replace(/[.:;!]+$/, '').trim();
    if (!/[a-zÀ-ɏ]/i.test(s) || s.length < 2) return null;
    return { name: (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 80), qty: qty.join(' ').slice(0, 20) };
  }
  /** @param {string} line @returns {string} Just the name from parseIngredient, or "". */
  function cleanIngredient(line) { var p = parseIngredient(line); return p ? p.name : ''; }

  /**
   * Reads a list of ingredient lines into unique items. The same ingredient twice becomes one, with the amounts joined ("1 tbsp + 1 tsp").
   * @param {string[]} lines
   * @returns {{name: string, qty: string}[]}
   */
  function cleanAll(lines) {
    var seen = {}, out = [];
    lines.forEach(function (l) {
      var p = parseIngredient(l);
      if (!p) return;
      var k = p.name.toLowerCase(), old = seen[k];
      if (!old) { seen[k] = p; out.push(p); }
      else if (p.qty && old.qty !== p.qty) old.qty = (old.qty ? old.qty + ' + ' + p.qty : p.qty).slice(0, 20);
    });
    return out.slice(0, 60);
  }

  /** @param {*} node @returns {Object|null} The first schema.org Recipe inside parsed JSON-LD (arrays and @graph are searched). */
  function findRecipe(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) { var r = findRecipe(node[i]); if (r) return r; }
      return null;
    }
    var t = node['@type'];
    if (t === 'Recipe' || (Array.isArray(t) && t.indexOf('Recipe') >= 0)) return node;
    return findRecipe(node['@graph']) || findRecipe(node.mainEntity) || findRecipe(node.mainEntityOfPage);
  }

  /**
   * Reads the recipe a page describes for search engines.
   * @param {string} html  The page's HTML.
   * @returns {{title: string, ingredients: {name: string, qty: string}[]}|null} null when the page has no readable recipe.
   */
  function parseRecipeHtml(html) {
    var re = /<script[^>]+type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi, m;
    while ((m = re.exec(String(html || '')))) {
      var data;
      try { data = JSON.parse(m[1].trim()); } catch (e) { continue; }
      var rec = findRecipe(data);
      if (!rec) continue;
      var raw = rec.recipeIngredient || rec.ingredients || [];
      if (typeof raw === 'string') raw = raw.split('\n');
      var list = cleanAll(Array.isArray(raw) ? raw.filter(function (x) { return typeof x === 'string'; }) : []);
      if (list.length) return { title: decode(typeof rec.name === 'string' ? rec.name : '').trim().slice(0, 80), ingredients: list };
    }
    return null;
  }

  /**
   * Reads pasted ingredient lines, one per line.
   * @param {string} text
   * @returns {{name: string, qty: string}[]}
   */
  function recipeFromText(text) { return cleanAll(String(text || '').split(/\r?\n/)); }

  /** @param {string} s @returns {boolean} Whether it looks like a web address to fetch (http or https, or www.). */
  function looksLikeUrl(s) { return /^\s*(https?:\/\/\S+|www\.\S+\.\S+)\s*$/i.test(String(s || '')); }

  root.Recipe = { parseIngredient: parseIngredient, cleanIngredient: cleanIngredient, cleanAll: cleanAll, parseRecipeHtml: parseRecipeHtml, recipeFromText: recipeFromText, looksLikeUrl: looksLikeUrl };
})(typeof self !== 'undefined' ? self : globalThis);
