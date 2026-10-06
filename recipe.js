/* Recipes: turns a recipe web page (or pasted ingredient lines) into shopping list items.
 * Plain functions with no page code, like bonuses.js, so they can be tested:
 *   parseRecipeHtml(html)  finds the recipe the page describes for search engines (schema.org JSON-LD): { title, ingredients }
 *   parseIngredient(line)  "2 tbsp finely chopped fresh parsley, plus extra" becomes { name: 'Parsley', qty: '2 tbsp' }
 *   recipeFromText(text)   the same for pasted lines, one ingredient per line
 *   convertQty(qty, 'metric'|'us')  "1 cup" becomes "240 ml" and "200 g" becomes "7 oz"
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


  // ---------- metric and US units ----------
  var NUM = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+\\s*[\u00bd\u00bc\u00be\u2153\u2154\u215b]|[\u00bd\u00bc\u00be\u2153\u2154\u215b]|\\d+(?:[.,]\\d+)?)';
  var FRACS = { '\u00bd': .5, '\u00bc': .25, '\u00be': .75, '\u2153': 1 / 3, '\u2154': 2 / 3, '\u215b': .125 };
  var QTY_RE = new RegExp('^\\s*(' + NUM + ')(?:\\s*[\u2013\\-]\\s*(' + NUM + '))?\\s*([a-z]+)\\.?\\s*$', 'i');
  // each unit we can convert: what kind it is and how many ml or g it is
  var CONVERT = { g: ['g', 1], gram: ['g', 1], grams: ['g', 1], kg: ['g', 1000], oz: ['g', 28.35], ounce: ['g', 28.35], ounces: ['g', 28.35], lb: ['g', 453.6], lbs: ['g', 453.6], pound: ['g', 453.6], pounds: ['g', 453.6],
    ml: ['ml', 1], cl: ['ml', 10], dl: ['ml', 100], l: ['ml', 1000], liter: ['ml', 1000], litre: ['ml', 1000], liters: ['ml', 1000], litres: ['ml', 1000],
    tsp: ['ml', 5], teaspoon: ['ml', 5], teaspoons: ['ml', 5], tbsp: ['ml', 15], tablespoon: ['ml', 15], tablespoons: ['ml', 15], cup: ['ml', 240], cups: ['ml', 240] };
  var US_UNITS = { oz: 1, ounce: 1, ounces: 1, lb: 1, lbs: 1, pound: 1, pounds: 1, tsp: 1, teaspoon: 1, teaspoons: 1, tbsp: 1, tablespoon: 1, tablespoons: 1, cup: 1, cups: 1 };
  var METRIC_UNITS = { g: 1, gram: 1, grams: 1, kg: 1, ml: 1, cl: 1, dl: 1, l: 1, liter: 1, litre: 1, liters: 1, litres: 1 };

  /** @param {string} s @returns {number} A number as written in a recipe: 2, 1.5, 1/2, 1 1/2, \u00bd, 1\u00bd. */
  function readNum(s) {
    s = s.trim();
    var m = s.match(/^(\d+)\s*([\u00bd\u00bc\u00be\u2153\u2154\u215b])$/);
    if (m) return +m[1] + FRACS[m[2]];
    if (FRACS[s]) return FRACS[s];
    m = s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
    if (m) return (m[1] ? +m[1] : 0) + (+m[2]) / (+m[3] || 1);
    return parseFloat(s.replace(',', '.'));
  }
  /** @param {number} v @param {number} step @returns {string} Rounded to the step and written like 2, \u00bd or 1\u00be. */
  function fmtFraction(v, step) {
    v = Math.max(step, Math.round(v / step) * step);
    var whole = Math.floor(v + 1e-9), f = v - whole, sym = f > .6 ? '\u00be' : f > .4 ? '\u00bd' : f > .1 ? '\u00bc' : '';
    return (whole ? String(whole) : '') + sym;
  }
  /** @param {number} v @returns {string} Rounded to a tidy number, no trailing zeros (1.2, 450). */
  function fmtDecimal(v) { return String(Math.round(v * 10) / 10); }
  /** One amount in grams or millilitres, written the way the other system would. @param {number} base @param {'g'|'ml'} kind @param {'metric'|'us'} to */
  function writeAmount(base, kind, to) {
    var r5 = function (x) { return x < 10 ? Math.max(1, Math.round(x)) : x >= 400 ? Math.round(x / 25) * 25 : Math.round(x / 5) * 5; };
    if (to === 'metric') {
      if (kind === 'g') return base >= 1000 ? fmtDecimal(base / 1000) + ' kg' : r5(base) + ' g';
      return base >= 1000 ? fmtDecimal(base / 1000) + ' l' : r5(base) + ' ml';
    }
    if (kind === 'g') return base >= 450 ? fmtFraction(base / 453.6, .25) + ' lb' : fmtFraction(base / 28.35, .5) + ' oz';
    if (base < 15) return fmtFraction(base / 5, .25) + ' tsp';
    if (base < 60) return fmtFraction(base / 15, .5) + ' tbsp';
    var cups = fmtFraction(base / 240, .25);
    return cups + (/^[1\u00bc\u00bd\u00be]$/.test(cups) ? ' cup' : ' cups');
  }
  /** Converts the amounts in a note like "200 g", "1\u00bd cups" or "1 tbsp + 1 tsp". Counts ("3 cloves") and amounts already in the wanted system stay as they are.
   * @param {string} qty @param {'metric'|'us'|''} to  '' keeps it as written. @returns {string} */
  function convertQty(qty, to) {
    if (!qty || (to !== 'metric' && to !== 'us')) return qty || '';
    var out = String(qty).split(/\s*\+\s*/).map(function (part) {
      var m = part.match(QTY_RE);
      if (!m) return part;
      var unit = m[3].toLowerCase(), c = CONVERT[unit];
      if (!c || (to === 'us' ? US_UNITS[unit] : METRIC_UNITS[unit])) return part;
      var a = readNum(m[1]), b = m[2] ? readNum(m[2]) : 0;
      if (!(a > 0) || (m[2] && !(b > 0))) return part;
      var first = writeAmount(a * c[1], c[0], to);
      if (!m[2]) return first;
      var second = writeAmount(b * c[1], c[0], to), unitOf = function (t) { return t.replace(/^[\d.\u00bd\u00bc\u00be]+\s*/, ''); };
      return unitOf(first) === unitOf(second) ? first.replace(/\s*[a-z]+$/, '') + '-' + second : first + '-' + second;
    }).join(' + ');
    return out.slice(0, 20);
  }

  /** @param {string} s @returns {boolean} Whether it looks like a web address to fetch (http or https, or www.). */
  function looksLikeUrl(s) { return /^\s*(https?:\/\/\S+|www\.\S+\.\S+)\s*$/i.test(String(s || '')); }

  root.Recipe = { convertQty: convertQty, parseIngredient: parseIngredient, cleanIngredient: cleanIngredient, cleanAll: cleanAll, parseRecipeHtml: parseRecipeHtml, recipeFromText: recipeFromText, looksLikeUrl: looksLikeUrl };
})(typeof self !== 'undefined' ? self : globalThis);
