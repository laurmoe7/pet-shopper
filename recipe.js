/* Recipes: turns a recipe web page (or pasted ingredient lines) into shopping list items.
 * Plain functions with no page code, like bonuses.js, so they can be tested:
 *   parseRecipeHtml(html)  finds the recipe the page describes for search engines (schema.org JSON-LD): { title, ingredients }
 *   parseIngredient(line)  "2 tbsp finely chopped fresh parsley, plus extra" becomes { name: 'Parsley', qty: '2 tbsp' } (`optional: true` for "optional" and "for serving" lines; "salt and pepper" is two items, see parseLine)
 *   recipeFromText(text)   the same for pasted lines, one ingredient per line
 *   isStaple(name)         salt, pepper, water, ice, cooking spray: things the recipe sheet leaves unticked
 *   convertQty(qty, 'metric'|'us')  "1 cup" becomes "240 ml" and "200 g" becomes "7 oz"
 * English and Dutch units and words are understood. The amount is kept as a short note on the item (`qty`).
 */
(function (root) {
  'use strict';

  var UNITS = ['kg', 'g', 'gr', 'gram', 'grams', 'mg', 'l', 'liter', 'litre', 'liters', 'litres', 'dl', 'cl', 'ml', 'tsp', 'tsps', 'tbsp', 'tbsps', 'teaspoon', 'teaspoons',
    'tablespoon', 'tablespoons', 'cup', 'cups', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'pinch', 'pinches', 'dash', 'dashes', 'clove', 'cloves',
    'can', 'cans', 'tin', 'tins', 'jar', 'jars', 'pot', 'pots', 'bottle', 'bottles', 'carton', 'cartons', 'tub', 'tubs', 'tube', 'tubes', 'block', 'blocks', 'bar', 'bars', 'cube', 'cubes', 'sheet', 'sheets', 'pint', 'pints', 'quart', 'quarts', 'dozen',
    'slice', 'slices', 'bunch', 'bunches', 'handful', 'handfuls', 'sprig', 'sprigs', 'stick', 'sticks', 'package', 'packages',
    'packet', 'packets', 'pkg', 'bag', 'bags', 'knob', 'piece', 'pieces', 'head', 'heads', 'stalk', 'stalks', 'ear', 'ears', 'el', 'tl', 'eetlepel', 'eetlepels', 'theelepel', 'theelepels',
    'snufje', 'teen', 'tenen', 'blik', 'blikje', 'blikjes', 'bosje', 'bosjes', 'plak', 'plakken', 'plakje', 'plakjes', 'stuk', 'stuks', 'zakje', 'zakjes', 'takje', 'takjes',
    'handvol', 'mespunt', 'scheut', 'beetje', 'bakje', 'pak', 'pakje', 'potje', 'fles', 'flesje', 'zak', 'pakket', 'rol', 'blokje', 'blokjes', 'tablet', 'tabletten', 'blikken', 'potten', 'flessen', 'zakken', 'pakken', 'stukken', 'teentje', 'teentjes'];
  // words that describe how it is prepared or how big it is: dropped from the front and the back of a name ("chopped fresh parsley", "parsley chopped")
  var FILLER = ['fresh', 'freshly', 'finely', 'roughly', 'coarsely', 'thinly', 'chopped', 'minced', 'diced', 'sliced', 'grated', 'crushed', 'peeled', 'cubed', 'shredded',
    'low-sodium', 'reduced-sodium', 'torn', 'uncooked', 'toasted', 'sifted', 'melted', 'softened', 'cooled', 'beaten', 'drained', 'rinsed', 'trimmed', 'halved', 'quartered', 'mashed', 'pitted', 'seeded', 'deseeded', 'crumbled', 'packed', 'cooked', 'warm', 'lukewarm', 'boiling',
    'large', 'small', 'medium', 'big', 'ripe', 'extra', 'good', 'quality', 'organic', 'optional', 'about', 'approx', 'approximately', 'of', 'a', 'an', 'the', 'some',
    'vers', 'verse', 'fijngehakt', 'gehakte', 'gesneden', 'geraspte', 'gesmolten', 'geschild', 'gepeld', 'grote', 'kleine', 'middelgrote', 'ongeveer', 'een', 'van', 'wat', 'naar', 'smaak', 'to', 'taste'];
  // describing words that can be followed by a comma and still belong to the name ("boneless, skinless chicken thighs")
  var ADJECTIVES = ['boneless', 'skinless', 'unsalted', 'salted', 'lean', 'whole', 'dried', 'frozen', 'canned', 'sweet', 'plain', 'hot', 'cold', 'mild', 'smoked', 'raw', 'young', 'old'];
  // what comes after the name and is not part of it: "olive oil for frying", "chicken cut into pieces", "butter at room temperature", "boter om in te bakken"
  var TAIL = /\s+(?:(?:beaten|whisked|mixed|combined|stirred|blended) with|for|plus|om|voor|cut|torn|divided|drained|rinsed|cooked|at room|room temperature|such as|according to|about|approx\.?|or so|zodat|in (?:ringen|blokjes|stukjes|plakjes|reepjes|partjes)|to (?:serve|garnish|taste|decorate))\b.*$/i;
  // "green onions and sesame seeds", "oil and vinegar": two things when both sides end in one of these
  var SPLIT_HEADS = ['seeds', 'sauce', 'onions', 'nuts', 'sprouts', 'oil', 'vinegar', 'herbs', 'spices', 'cheese', 'flakes', 'peppers', 'tomatoes', 'mushrooms', 'beans', 'zaad', 'zaden', 'saus', 'uien', 'noten', 'olie', 'azijn'];
  // extras: only a line that says so is optional ("for serving" and "for garnish" are still things to buy)
  var EXTRA = /\b(?:optional|optioneel|naar wens)\b/i;
  // lines that are about the recipe, not an ingredient
  var NOT_FOOD = /^(?:serves?|serving|servings|makes|yields?|prep|cook|total|equipment|special equipment|notes?|tips?|directions|instructions|ingredients?|porties|bereiding|voor \d+ (?:personen|porties))\b/i;
  var SHORT = { tablespoon: 'tbsp', tablespoons: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp' };   // keeps merged amounts short
  var NOT_AN_OPTION = /\b(?:as|needed|need|more|extra|if|desired|taste|preferred|available|you|your|like|want)\b/i;
  var SEASONING = /\b(?:salt|pepper|zout|peper)\b/i;
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

  function lastWord(s) { return s.split(' ').pop().toLowerCase().replace(/[.,]$/, ''); }
  function cap(s) { return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 80); }

  /**
   * Turns one ingredient line into list items: the name, and the amount to buy. Usually one; "salt and pepper" is two.
   * @param {string} line  Like "2 tbsp finely chopped fresh parsley, plus extra".
   * @returns {{name: string, qty: string, optional?: boolean}[]} Like [{ name: 'Parsley', qty: '2 tbsp' }]; empty for lines that are not an ingredient (headings, "Serves 4", empty). `optional` is set for "optional" and "for serving" lines.
   */
  function parseLine(line) {
    var s = decode(line).replace(/^[\s\-•*▢☐☑✓·]+/, '').replace(/\s+/g, ' ').trim();
    if (!s || /:\s*$/.test(s) || NOT_FOOD.test(s)) return [];                          // "For the sauce:", "Serves 4"
    if (/^(?:for|voor)\s+(?:the|a|an|de|het|een)\s+[^\d]{1,40}$/i.test(s)) return []; // "For the crust" without a colon
    if (/[a-z]{3}[.!?]\s+[A-Z]/.test(s)) return [];                                    // a sentence, not an ingredient
    var optional = EXTRA.test(s);
    var label = s.match(/^([^:\d]{1,30}):\s*(\S.*)$/);                                  // "Optional: chopped nuts", "For serving: rice"
    if (label) s = label[2];
    var alt = '', am = s.match(/\(\s*(?:about\s+|approx\.?\s+|~)?(\d[\d.,]*)\s*(g|grams?|kg|ml|l)?\s*(?:(?:-|\u2013|to)\s*(\d[\d.,]*)\s*(g|grams?|kg|ml|l))?\s*\)/i);
    if (am && (am[4] || am[2]) && !/\beach\b/i.test(s)) alt = (am[1] + (am[3] ? '-' + am[3] : '') + ' ' + (am[4] || am[2]).toLowerCase().replace(/^grams?$/, 'g')).replace(/,/g, '.');   // the page's own metric amount: "(120g)", "(500g-688g)"
    if (!alt) {   // "(4 Tbsp; 56g)", "(1 stick, 113 g)": the metric amount after a ; or ,
      var am2 = s.match(/\([^)]*[;,]\s*(?:about\s+|approx\.?\s+|~)?(\d[\d.,]*)\s*(g|grams?|kg|ml|l)\s*\)/i);
      if (am2 && !/\beach\b/i.test(s)) alt = (am2[1] + ' ' + am2[2].toLowerCase().replace(/^grams?$/, 'g')).replace(/,/g, '.');
    }
    s = s.replace(/(?:[$\u20ac\u00a3]\s?\d[\d.,]*|\b\d[\d.,]*\s?(?:euro|eur|dollars?|usd)\b)\**/gi, ' ');   // prices: "($1.24)", "\u20ac 2,50", "$2.69**"
    s = s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/[()*]/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/\bextra[- ]virgin\s+/gi, '').replace(/\b(?:freshly|fresh|vers)\s+(?:ground|gemalen)\s+/gi, '');
    s = s.replace(/^(\d+)\s*[-\u2013]\s*(\d+\/\d+)/, '$1 $2');                                   // "1-3/4 cups" is one and three quarters
    s = s.replace(/^(\d+)\s+(?:and|&|en)\s+(\d+\/\d+)/i, '$1 $2');                    // "1 and 1/2 cups" -> "1 1/2 cups"
    s = s.replace(/^([\d\/\s\u00bd\u00bc\u00be.]*\d|[\u00bd\u00bc\u00be])\s*C\.?\s+(?=[a-z])/, '$1 cup ');       // "3/4 C. broth" (a capital C is a cup)
    s = s.replace(/^(?:half|een halve|halve)\s+(?:an?\s+|een\s+)?/i, '1/2 ');           // "half a lemon"
    var segs = s.split(/\s*[,;]\s*/);                                                   // ", plus extra" / ", to taste"
    s = segs.shift();
    // a comma after a describing word or a unit is not the end of the name: "boneless, skinless chicken", "1 cup, packed brown sugar"
    while (segs.length) {
      var lw = lastWord(s), bare = s.split(' ').filter(function (x) { x = x.toLowerCase(); return !/^[\d.,\/]+$/.test(x) && UNITS.indexOf(x) < 0 && FILLER.indexOf(x) < 0 && !new RegExp('^[' + VULGAR_CLASS + ']+$').test(x); });
      if (FILLER.indexOf(lw) >= 0 || ADJECTIVES.indexOf(lw) >= 0 || !bare.length) s += ' ' + segs.shift(); else break;   // (nothing but amounts and units before the comma)
    }
    var others = [];                                                                     // other things the recipe allows instead: "honey or maple syrup", "butter, ghee, or oil"
    if (segs.length && /^or\s+/i.test(segs[segs.length - 1]) && segs.every(function (g) { return !/\d/.test(g) && !NOT_AN_OPTION.test(g) && g.replace(/^or\s+/i, '').split(' ').length <= 3; })) {
      others = segs.map(function (g) { return g.replace(/^or\s+/i, ''); });
    }
    var alts = s.split(/\s+or\s+/i);                                                     // "butter or margarine" is butter, but "all-purpose or bread flour" keeps both
    var bareOf = function (t) { return t.split(' ').filter(function (x) { x = x.toLowerCase(); return !/^[\d.,\/\-\u2013]+$/.test(x) && UNITS.indexOf(x) < 0 && FILLER.indexOf(x) < 0 && !new RegExp('^[' + VULGAR_CLASS + ']+$').test(x); }); };
    if (alts.length === 2 && !bareOf(alts[0]).length) {                                  // "1 12 ounce can or jar red enchilada sauce": the or is between containers
      var rest = alts[1].split(' ');
      while (rest.length > 1 && UNITS.indexOf(rest[0].toLowerCase()) >= 0) rest.shift();
      alts = [alts[0] + ' ' + rest.join(' ')];
    }
    var shared = alts.length === 2 && bareOf(alts[0]).length === 1 && alts[1].replace(TAIL, '').split(' ').length >= 2;   // "all-purpose or bread flour" is one name
    if (!shared && !others.length && alts.length > 1 && !/^\d/.test(alts[1]) && !NOT_AN_OPTION.test(alts[1]) && bareOf(alts[0]).length) others = alts.slice(1);
    s = shared ? alts[0] + ' or ' + alts[1] : alts[0];
    var untailed = s.replace(TAIL, '');
    if (bareOf(untailed).length) s = untailed;                                          // "3 cups cooked chicken": 'cooked' is part of the name when nothing else is left
    var jz = s.match(/^(?:juice|zest|rind|peel|sap|rasp|schil)(?:\s+(?:and|&|en)\s+(?:juice|zest|rind|peel|sap|rasp|schil))?\s+(?:of|van)\s+(.+)$/i);
    if (jz) s = jz[1];                                                                  // "Juice of 1 lemon" is a lemon
    // leading amounts: 2, 1.5, 1/2, 1 1/2, 2-3, 2 to 3, and vulgar fractions like ½
    var amount = new RegExp('^(?:[\\d.,]+|[' + VULGAR_CLASS + '])(?:\\s*[\\u2013\\-/]\\s*[\\d.,]+)?(?:\\s*(?:to|tot)\\s*[\\d.,]+)?(?:\\s*[' + VULGAR_CLASS + '])?(?:\\s*\\d+\\/\\d+)?\\s*', 'i');
    var qty = [], words, prev;
    function takeAmount() { var m = s.match(amount); if (m && m[0].trim()) { qty.push(m[0].trim()); s = s.slice(m[0].length); } }
    s = s.replace(/^(\d+)\s+(?=\d+(?:\.\d+)?\s*(?:ounces?|oz|g|grams?|ml|lbs?|pounds?)\b)/i, '$1 x ');          // "1 12 ounce can" is one 12 ounce can
    var times = s.match(/^(\d+)\s*[x×]\s*(?=\d)/i);                                     // "2 x 400g tin"
    if (times) { s = s.slice(times[0].length); if (+times[1] > 1) qty.push(times[1] + ' x'); }
    var cm = s.match(/^((?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[\u00bd\u00bc\u00be])\s*([a-z]+)\.?)\s*\+\s*((?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[\u00bd\u00bc\u00be])\s*([a-z]+)\.?)\s+(?=\S)/i);
    if (cm && UNITS.indexOf(cm[2].toLowerCase()) >= 0 && UNITS.indexOf(cm[4].toLowerCase()) >= 0) {   // "1 cup + 1 Tablespoon flour": one amount made of two
      var one = function (t, u) { return t.replace(/\s*[a-z]+\.?$/i, '').trim() + ' ' + (SHORT[u.toLowerCase()] || u.toLowerCase()); };
      qty.push(one(cm[1], cm[2]) + ' & ' + one(cm[3], cm[4]));
      s = s.slice(cm[0].length);
    }
    takeAmount();
    // units and filler words at the front, in any order ("2 large cloves fresh garlic"); "and" between two of them goes too ("peeled and diced")
    var lastFiller = false;
    do {
      prev = s;
      words = s.split(' ');
      var w = words[0].toLowerCase().replace(/[.,]$/, '');
      var joiner = lastFiller && (w === 'and' || w === 'en' || w === '&');
      if (words.length > 1 && (UNITS.indexOf(w) >= 0 || FILLER.indexOf(w) >= 0 || joiner)) {
        if (UNITS.indexOf(w) >= 0) qty.push(SHORT[w] || words[0].replace(/[.,]$/, ''));
        lastFiller = FILLER.indexOf(w) >= 0;
        s = words.slice(1).join(' ');
        takeAmount();
      }
    } while (s !== prev);
    // filler words at the back ("garlic, minced" was cut at the comma; "parsley chopped" is not)
    do {
      prev = s;
      words = s.split(' ');
      var last = words[words.length - 1].toLowerCase();
      if (words.length > 1 && (FILLER.indexOf(last) >= 0 && last !== 'a' || last === 'and' || last === '&' || last === 'en')) s = words.slice(0, -1).join(' ');
    } while (s !== prev);
    s = s.replace(/[.:;!]+$/, '').trim();
    s = s.replace(/^((?:fresh |dried )?(?:thyme|basil|mint|sage|parsley|cilantro|oregano|rosemary|tarragon|dill|chives)) leaves$/i, '$1');   // "thyme leaves" is thyme
    var q = qty.join(' ').slice(0, 40);
    var pair = s.match(/^(.+?)\s+(?:and|&|en)\s+(.+)$/i);                               // "salt and pepper" is two things
    var two = pair && pair[1].split(' ').length < 4 && pair[2].split(' ').length < 4 && (SEASONING.test(pair[1]) && SEASONING.test(pair[2]) || SPLIT_HEADS.indexOf(lastWord(pair[1])) >= 0 && SPLIT_HEADS.indexOf(lastWord(pair[2])) >= 0);
    var names = two ? [pair[1], pair[2]] : [s];
    return names.filter(function (n) { return /[a-zÀ-ɏ]/i.test(n) && n.length >= 2 && n.split(' ').length <= 8; }).map(function (n, i) {
      var item = { name: cap(n), qty: i ? '' : q };
      if (!i && !two && others.length) {
        var more = others.map(function (o) { var p = parseLine(o)[0]; return p ? p.name : ''; }).filter(function (x) { return x && x.toLowerCase() !== n.toLowerCase(); });
        if (more.length) item.or = more.slice(0, 3);
      }
      if (alt && !i && q) item.alt = alt;
      if (optional) item.optional = true;
      return item;
    });
  }
  /**
   * The first thing on an ingredient line.
   * @param {string} line
   * @returns {{name: string, qty: string, optional?: boolean}|null} Like { name: 'Parsley', qty: '2 tbsp' }; null for lines that are not an ingredient.
   */
  function parseIngredient(line) { return parseLine(line)[0] || null; }
  /** @param {string} line @returns {string} Just the name from parseIngredient, or "". */
  function cleanIngredient(line) { var p = parseIngredient(line); return p ? p.name : ''; }

  var STAPLES = ['salt', 'pepper', 'water', 'zout', 'peper', 'ice', 'ice cubes', 'cooking spray', 'nonstick spray', 'non-stick spray', 'baking spray', 'oil spray', 'kookspray', 'bakspray', 'ijsblokjes', 'ijsklontjes'];
  var STAPLE_WORDS = ['sea', 'kosher', 'flaky', 'table', 'fine', 'coarse', 'black', 'white', 'ground', 'himalayan', 'cold', 'ice', 'boiling', 'tap', 'warm', 'lukewarm', 'hot', 'fijn', 'grof', 'zwarte', 'witte', 'gemalen', 'zee', 'koud', 'warm', 'kokend', 'kraan'];
  /**
   * Things nearly everyone has at home (salt, pepper, water, ice, cooking spray): the recipe sheet leaves them unticked.
   * @param {string} name A name from parseIngredient.
   * @returns {boolean}
   */
  function isStaple(name) {
    var n = String(name || '').toLowerCase().trim();
    if (STAPLES.indexOf(n) >= 0) return true;
    var rest = n.split(/\s+/).filter(function (w) { return STAPLE_WORDS.indexOf(w) < 0; }).join(' ');
    return !!rest && STAPLES.indexOf(rest) >= 0;
  }

  // ---------- adding the amounts of the same ingredient from different lines ----------
  var UNIT_KEY = { cups: 'cup', tablespoon: 'tbsp', tablespoons: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp', grams: 'g', gram: 'g', ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb' };
  var FRACTION_TEXT = [[0, ''], [1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [3 / 8, '3/8'], [1 / 2, '1/2'], [5 / 8, '5/8'], [2 / 3, '2/3'], [3 / 4, '3/4'], [7 / 8, '7/8'], [1, '']];
  /** @param {string} q One amount like "1/4 cup" or "2". @returns {{n: number, unit: string}|null} null for ranges and amounts with two parts ("1 cup & 1 tbsp"). */
  function readPart(q) {
    var m = String(q).match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[\u00bd\u00bc\u00be])\s*([a-z]*)\.?\s*$/i);
    if (!m) return null;
    var n = readNum(m[1]), u = m[2].toLowerCase();
    return n > 0 ? { n: n, unit: UNIT_KEY[u] || u } : null;
  }
  /** @param {number} v @returns {string} Like 1 1/4 or 2.5. */
  function fmtMixed(v) {
    var whole = Math.floor(v + 1e-9), f = v - whole;
    for (var i = 0; i < FRACTION_TEXT.length; i++) if (Math.abs(f - FRACTION_TEXT[i][0]) < .02) { if (i === FRACTION_TEXT.length - 1) whole++; return (whole ? whole : '') + (whole && FRACTION_TEXT[i][1] ? ' ' : '') + FRACTION_TEXT[i][1] || '0'; }
    return String(Math.round(v * 10) / 10);
  }
  /** The metric amount of a part ("85 g") added to another ("16 g"); "-" when either is missing or they differ. */
  function addMetric(a, b) {
    if (a === '=') return b || '-';
    if (b === '=') return a || '-';
    var x = /^(\d+(?:\.\d+)?)\s*(g|ml)$/.exec(a || ''), y = /^(\d+(?:\.\d+)?)\s*(g|ml)$/.exec(b || '');
    return x && y && x[2] === y[2] ? Math.round((+x[1] + +y[1]) * 10) / 10 + ' ' + x[2] : '-';
  }
  /** Adds the amount of `p` to `old` (the same ingredient on another line): the same unit is summed ("1/4 cup + 1 cup" is "1 1/4 cup"), different units are listed. */
  function mergeQty(old, p) {
    // "1 cup & 1 tbsp (133 g)" is split into its two amounts here: the first keeps the metric amount, the second is "=" (already counted in it)
    function expand(q, alt) {
      var qs = [], as = [], al = alt ? alt.split(/\s*\+\s*/) : [];
      (q ? q.split(/\s*\+\s*/) : []).forEach(function (part, i) { part.split(/\s*&\s*/).forEach(function (x, k) { qs.push(x); as.push(k ? '=' : al[i] || '-'); }); });
      return { q: qs, a: as };
    }
    var o = expand(old.qty, old.alt), n = expand(p.qty, p.alt), oq = o.q, oa = o.a, pq = n.q, pa = n.a;
    pq.forEach(function (q, i) {
      var np = readPart(q), at = -1;
      oq.forEach(function (x, k) { var op = readPart(x); if (at < 0 && np && op && op.unit === np.unit) at = k; });
      var a = pa[i] || '-';
      if (at < 0) { oq.push(q); oa[oq.length - 1] = a; return; }
      var op = readPart(oq[at]), sum = op.n + np.n, unit = op.unit === 'cup' && sum > 1 ? 'cups' : op.unit;
      oq[at] = fmtMixed(sum) + (unit ? ' ' + unit : '');
      oa[at] = addMetric(oa[at], a);
    });
    old.qty = oq.join(' + ').slice(0, 60);
    var alts = oq.map(function (x, k) { return oa[k] || '-'; });
    if (alts.some(function (x) { return x !== '-'; })) old.alt = alts.join(' + '); else delete old.alt;
  }

  /**
   * Reads a list of ingredient lines into unique items. The same ingredient twice becomes one, with the amounts joined ("1 tbsp + 1 tsp").
   * @param {string[]} lines
   * @returns {{name: string, qty: string, optional?: boolean}[]}
   */
  function cleanAll(lines) {
    var seen = {}, out = [];
    lines.forEach(function (l) {
      parseLine(l).forEach(function (p) {
        var k = p.name.toLowerCase() + '|' + (p.or || []).map(function (o) { return o.toLowerCase(); }).sort().join(','), old = seen[k];   // the same name with different "or" choices is a different use, so its own row
        if (!old) { seen[k] = p; out.push(p); return; }
        if (!p.optional) delete old.optional;                                          // needed once means needed
        if (p.qty) mergeQty(old, p);
      });
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
  /** Grams per millilitre for things that are bought by weight but written in cups and spoons. First match wins. */
  var DENSITY = [[/peanut butter|nut butter|almond butter|butter beans?|buttermilk|butternut/i, 0], [/baking soda|bicarbonate|zuiveringszout|natron/i, .95], [/baking powder|bakpoeder/i, .8], [/cream of tartar/i, .6], [/cornstarch|corn starch|cornflour|maizena|potato starch|aardappelzetmeel/i, .55], [/yeast|gist/i, .6],
    [/bread ?crumbs|panko|paneermeel/i, .45], [/chocolate chips|chocolate chunks|chocoladedruppels/i, .7], [/raisins|rozijnen|currants/i, .65], [/walnuts?|almonds?|pecans?|cashews?|hazelnuts?|peanuts?|pistachios?|walnoten|amandelen|noten/i, .55], [/shredded coconut|desiccated|coconut flakes|kokosrasp/i, .35], [/butter|margarine|boter/i, .95], [/cream cheese|roomkaas/i, .96], [/shortening|lard|coconut oil/i, .92], [/ricotta|cottage|mascarpone|sour cream|zure room/i, 1], [/parmesan|parmezaan|pecorino/i, .4], [/cheese|kaas/i, .45],
    [/powdered sugar|icing sugar|confectioners|poedersuiker/i, .5], [/brown sugar|bruine suiker/i, .9], [/sugar|suiker/i, .83], [/flour|bloem|meel/i, .52], [/(?:^|\s)rice$|rijst$/i, .8], [/rolled oats|oats|havermout/i, .37], [/cocoa|cacao/i, .4],
    [/grated|shredded|geraspte/i, .45], [/honey|honing|maple syrup|syrup|stroop/i, 1.4]];
  /** Things that really are measured as a volume. Other cups and spoons ("2 cups diced potatoes") stay as written in metric. */
  var LIQUID = /\bwater\b|\bmilk\b|melk|\bbroth\b|\bstock\b|bouillon|\bcream\b(?! of tartar)|\broom\b|slagroom|kookroom|\boil\b|olie|juice|sap\b|\bwine\b|wijn|vinegar|azijn|sauce|saus|marinade|syrup|stroop|yogh?urt|\bbeer\b|bier|\bcoffee\b|koffie|\btea\b|extract|\bvanilla\b|\bsoy\b|dressing|mayonnaise|ketchup|\bmustard\b|mosterd|\brum\b|brandy|whisky|vodka|liqueur|lemonade|club soda|soda water|\bcider\b|passata|puree/i;
  /** Dry things whose names contain a liquid word ("coffee beans", "tea leaves", "bouillon powder"): never measured in ml. */
  var DRY = /powder|powdered|granules|granulated|\bbeans?\b|\bseeds?\b|\bleaves\b|\bchips\b|\bflakes\b|\bzest\b|\bcubes?\b|crumbs|\bgrains?\b|\bnuts?\b|dry mustard/i;
  /** @param {string} name @returns {boolean} Whether it is really measured as a volume (milk, oil) and not a dry thing with a liquid word in its name. */
  function isLiquid(name) { return LIQUID.test(name) && !DRY.test(name); }
  /** @param {string} [name] @returns {number} Grams per ml for that ingredient, or 0 when it is kept in millilitres. */
  function density(name) {
    for (var i = 0; i < DENSITY.length; i++) if (DENSITY[i][0].test(name || '')) return DENSITY[i][1];
    return 0;
  }
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
   * @param {string} qty @param {'metric'|'us'|''} to  '' keeps it as written. @param {string} [name] The ingredient: in metric, cups and spoons of butter, flour and the like become grams. @param {string} [alt] The page's own metric amount for it ("120 g"), used for metric when given. @returns {string} */
  /** @param {string} qty @returns {boolean} Whether it is measured in cups, spoons, ounces or pounds. */
  function usesUs(qty) {
    return String(qty).split(/\s*[+&]\s*/).some(function (part) { var m = part.match(QTY_RE); return !!m && !!US_UNITS[m[3].toLowerCase()]; });
  }
  function convertQty(qty, to, name, alt) {
    if (!qty || (to !== 'metric' && to !== 'us')) return qty || '';
    var alts = String(alt || '').split(/\s*\+\s*/);
    var out = String(qty).split(/\s*\+\s*/).map(function (part, pi) {
      var a = alts.length === 1 && !pi || alts.length > 1 ? alts[pi] : '';
      if (a === '=') return '';                  // the page's own metric amount for this part, when it gives one
      if (to === 'metric' && a && a !== '-' && usesUs(part) && !(typeof name === 'string' && isLiquid(name) && !/ml$|l$/.test(a))) return a;
      if (part.indexOf('&') >= 0) return part.split(/\s*&\s*/).map(function (x) { return convertQty(x, to, name); }).join(' + ');   // "1 cup & 1 tbsp" with no metric amount on the page: each piece
      var m = part.match(QTY_RE);
      if (!m) return part;
      var unit = m[3].toLowerCase(), c = CONVERT[unit];
      if (!c || (to === 'us' ? US_UNITS[unit] : METRIC_UNITS[unit])) return part;
      var a = readNum(m[1]), b = m[2] ? readNum(m[2]) : 0;
      if (!(a > 0) || (m[2] && !(b > 0))) return part;
      var kind = c[0], dens = to === 'metric' && kind === 'ml' ? density(name) : 0, mul = dens || 1;
      if (to === 'metric' && kind === 'ml' && !dens && typeof name === 'string' && !isLiquid(name)) return part;   // "2 cups potatoes" is not a volume in ml
      if (dens) kind = 'g';
      var first = writeAmount(a * c[1] * mul, kind, to);
      if (!m[2]) return first;
      var second = writeAmount(b * c[1] * mul, kind, to), unitOf = function (t) { return t.replace(/^[\d.\u00bd\u00bc\u00be]+\s*/, ''); };
      return unitOf(first) === unitOf(second) ? first.replace(/\s*[a-z]+$/, '') + '-' + second : first + '-' + second;
    }).filter(Boolean);
    if (to === 'metric' && out.length > 1) {   // 31 g + 16 g + 133 g is 180 g
      var kind = '', total = 0;
      out.forEach(function (x) { var m = /^(\d+(?:\.\d+)?) (g|ml)$/.exec(x); if (m && (!kind || kind === m[2])) { kind = m[2]; total += +m[1]; } else kind = '#'; });
      if (kind && kind !== '#') return (total >= 1000 ? fmtDecimal(total / 1000) + (kind === 'g' ? ' kg' : ' l') : Math.round(total) + ' ' + kind).slice(0, 40);
    }
    return out.join(' + ').slice(0, 40);
  }

  /** @param {string} s @returns {boolean} Whether it looks like a web address to fetch (http or https, or www.). */
  function looksLikeUrl(s) { return /^\s*(https?:\/\/\S+|www\.\S+\.\S+)\s*$/i.test(String(s || '')); }

  root.Recipe = { convertQty: convertQty, parseIngredient: parseIngredient, cleanIngredient: cleanIngredient, cleanAll: cleanAll, isStaple: isStaple, parseRecipeHtml: parseRecipeHtml, recipeFromText: recipeFromText, looksLikeUrl: looksLikeUrl };
})(typeof self !== 'undefined' ? self : globalThis);
