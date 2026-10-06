const test = require('node:test');
const assert = require('node:assert');
require('../recipe.js');
const R = globalThis.Recipe;

test('cleanIngredient drops amounts, units and prep words', () => {
  const c = {
    '2 tbsp finely chopped fresh parsley, plus extra': 'Parsley',
    '1 1/2 cups all-purpose flour': 'All-purpose flour',
    '½ tsp salt': 'Salt',
    '3 large cloves garlic, minced': 'Garlic',
    '400 g tomaten (uit blik)': 'Tomaten',
    '2 eetlepels olijfolie': 'Olijfolie',
    '1 can (400ml) coconut milk': 'Coconut milk',
    '2-3 ripe bananas': 'Bananas',
    '200g butter or margarine': 'Butter',
    'Eggs': 'Eggs',
    'For the sauce:': '',
    '': '',
    '&frac12; cup sugar': 'Sugar',
    '1 lb ground beef': 'Ground beef',
  };
  for (const k of Object.keys(c)) assert.strictEqual(R.cleanIngredient(k), c[k], k);
});

test('parseRecipeHtml reads JSON-LD, also inside @graph and arrays', () => {
  const rec = { '@type': 'Recipe', name: 'Pancakes &amp; syrup', recipeIngredient: ['200 g flour', '2 eggs', '1 cup milk', '200 g flour'] };
  const page = (data) => '<html><script type="application/ld+json">' + JSON.stringify(data) + '</script></html>';
  for (const data of [rec, [rec], { '@graph': [{ '@type': 'WebPage' }, rec] }, { '@type': ['Recipe', 'Thing'], name: 'x', recipeIngredient: rec.recipeIngredient }]) {
    const r = R.parseRecipeHtml(page(data));
    assert.deepStrictEqual(r.ingredients, [{ name: 'Flour', qty: '200 g' }, { name: 'Eggs', qty: '2' }, { name: 'Milk', qty: '1 cup' }]);
  }
  assert.strictEqual(R.parseRecipeHtml(page(rec)).title, 'Pancakes & syrup');
});

test('parseRecipeHtml gives null when there is no recipe', () => {
  assert.strictEqual(R.parseRecipeHtml('<html>nothing</html>'), null);
  assert.strictEqual(R.parseRecipeHtml('<script type="application/ld+json">{bad json</script>'), null);
  assert.strictEqual(R.parseRecipeHtml('<script type="application/ld+json">{"@type":"Article"}</script>'), null);
  assert.strictEqual(R.parseRecipeHtml(''), null);
});

test('recipeFromText and looksLikeUrl', () => {
  assert.deepStrictEqual(R.recipeFromText('- 2 eggs\n\u2022 1 cup milk\r\n\n3 tbsp sugar'), [{ name: 'Eggs', qty: '2' }, { name: 'Milk', qty: '1 cup' }, { name: 'Sugar', qty: '3 tbsp' }]);
  assert.ok(R.looksLikeUrl('https://example.com/recipe'));
  assert.ok(R.looksLikeUrl(' www.example.com/x '));
  assert.ok(!R.looksLikeUrl('2 eggs'));
  assert.ok(!R.looksLikeUrl('https://a.com b'));
});

test('parseIngredient keeps the amount', () => {
  const c = { '2 tbsp finely chopped fresh parsley, plus extra': ['Parsley', '2 tbsp'], '3 large cloves garlic, minced': ['Garlic', '3 cloves'], '\u00bd tsp salt': ['Salt', '\u00bd tsp'], 'Eggs': ['Eggs', ''], '1 1/2 cups flour': ['Flour', '1 1/2 cups'] };
  for (const k of Object.keys(c)) assert.deepStrictEqual([R.parseIngredient(k).name, R.parseIngredient(k).qty], c[k], k);
  assert.strictEqual(R.parseIngredient('For the sauce:'), null);
});

test('the same ingredient twice becomes one with both amounts', () => {
  assert.deepStrictEqual(R.cleanAll(['1 tbsp salt', '1 tsp salt', '2 eggs']), [{ name: 'Salt', qty: '1 tbsp + 1 tsp' }, { name: 'Eggs', qty: '2' }]);
});

test('convertQty goes between metric and US', () => {
  const c = [['200 g', 'us', '7 oz'], ['1 kg', 'us', '2\u00bc lb'], ['500 ml', 'us', '2 cups'], ['100 ml', 'us', '\u00bd cup'], ['10 ml', 'us', '2 tsp'],
    ['1 1/2 cups', 'metric', '360 ml'], ['2 tbsp', 'metric', '30 ml'], ['8 oz', 'metric', '225 g'], ['1 lb', 'metric', '450 g'], ['1 cup', 'metric', '240 ml'],
    ['2-3 cups', 'metric', '475-725 ml'], ['1 tbsp + 1 tsp', 'metric', '15 ml + 5 ml'],
    ['3 cloves', 'us', '3 cloves'], ['pinch', 'metric', 'pinch'], ['2 cups', 'us', '2 cups'], ['200 g', 'metric', '200 g'], ['200 g', '', '200 g'], ['', 'us', '']];
  for (const [q, to, want] of c) assert.strictEqual(R.convertQty(q, to), want, q + ' -> ' + to);
});

test('page-style lines: "1 and 1/2", "peeled and diced", whole wheat, extra virgin', () => {
  const c = {
    '2 and 1/4 cups (281g) all-purpose flour (spooned & leveled)': ['All-purpose flour', '2 1/4 cups'],
    '1 and 1/2 teaspoons ground cinnamon': ['Ground cinnamon', '1 1/2 teaspoons'],
    '2 cups peeled and diced apples (about 2 large apples)': ['Apples', '2 cups'],
    '1 cup whole wheat flour': ['Whole wheat flour', '1 cup'],
    '2 tbsp extra virgin olive oil': ['Olive oil', '2 tbsp'],
    '1/2 cup (120ml) whole milk, at room temperature': ['Whole milk', '1/2 cup'],
    'walnuts chopped and toasted': ['Walnuts', ''],
    '1 cup, packed brown sugar': ['Brown sugar', '1 cup'],
    '1 cup chopped, toasted walnuts': ['Walnuts', '1 cup'],
  };
  for (const k of Object.keys(c)) assert.deepStrictEqual([R.parseIngredient(k).name, R.parseIngredient(k).qty], c[k], k);
});

test('a comma after a describing word does not cut the name', () => {
  assert.strictEqual(R.cleanIngredient('4 boneless, skinless chicken thighs'), 'Boneless skinless chicken thighs');
  assert.strictEqual(R.cleanIngredient('2 large, ripe bananas'), 'Bananas');
  assert.strictEqual(R.cleanIngredient('3 eggs, separated'), 'Eggs');
});

test('what comes after the name is dropped', () => {
  const c = { '1 tablespoon olive oil, for frying': 'Olive oil', '2 chicken breasts, cut into bite-size pieces': 'Chicken breasts', '200 g spaghetti, cooked according to package directions': 'Spaghetti',
    'boter om in te bakken': 'Boter', '150 gram rode uien, in ringen': 'Rode uien', '1 lemon, zested and juiced': 'Lemon', '3 cloves garlic, minced': 'Garlic' };
  for (const k of Object.keys(c)) assert.strictEqual(R.cleanIngredient(k), c[k], k);
});

test('juice of a lemon is a lemon; half a lemon keeps the half', () => {
  assert.deepStrictEqual(R.parseIngredient('Juice of 1 lemon'), { name: 'Lemon', qty: '1' });
  assert.deepStrictEqual(R.parseIngredient('Juice and zest of 2 limes'), { name: 'Limes', qty: '2' });
  assert.deepStrictEqual(R.parseIngredient('half a lemon'), { name: 'Lemon', qty: '1/2' });
});

test('multipacks and pots', () => {
  assert.deepStrictEqual(R.parseIngredient('1 x 400g tin chickpeas, drained and rinsed'), { name: 'Chickpeas', qty: '400 g tin' });
  assert.deepStrictEqual(R.parseIngredient('2 x 400g blikken tomaten'), { name: 'Tomaten', qty: '2 x 400 g blikken' });
  assert.deepStrictEqual(R.parseIngredient('1 pot pesto'), { name: 'Pesto', qty: '1 pot' });
  assert.deepStrictEqual(R.parseIngredient('2 teentjes knoflook'), { name: 'Knoflook', qty: '2 teentjes' });
});

test('lines about the recipe are not ingredients', () => {
  for (const l of ['Serves 4', 'Makes 12 muffins', 'Yield: 1 loaf', 'Servings: 4', 'For the crust', 'For the sauce:', 'Special equipment: 9x5 loaf pan', 'Voor 4 personen', 'Mix everything well. Then bake it.']) assert.strictEqual(R.parseIngredient(l), null, l);
});

test('optional and for-serving lines are marked optional', () => {
  assert.deepStrictEqual(R.parseIngredient('Optional: chopped nuts for garnish'), { name: 'Nuts', qty: '', optional: true });
  assert.deepStrictEqual(R.parseIngredient('For serving: rice'), { name: 'Rice', qty: '', optional: true });
  assert.deepStrictEqual(R.parseIngredient('1 cup walnuts (optional)'), { name: 'Walnuts', qty: '1 cup', optional: true });
  assert.strictEqual(R.parseIngredient('2 eggs').optional, undefined);
  // listed twice, once as needed: needed
  assert.strictEqual(R.cleanAll(['1 cup walnuts (optional)', '1 cup walnuts'])[0].optional, undefined);
});

test('salt and pepper are two things, and staples are recognised', () => {
  assert.deepStrictEqual(R.cleanAll(['Salt and pepper, to taste']), [{ name: 'Salt', qty: '' }, { name: 'Pepper', qty: '' }]);
  assert.deepStrictEqual(R.cleanAll(['salt & freshly ground black pepper']).map((x) => x.name), ['Salt', 'Black pepper']);
  assert.deepStrictEqual(R.cleanAll(['zout en peper']).map((x) => x.name), ['Zout', 'Peper']);
  assert.deepStrictEqual(R.cleanAll(['peanut butter and jelly']).map((x) => x.name), ['Peanut butter and jelly']);
  for (const n of ['Salt', 'Sea salt', 'Black pepper', 'Water', 'Ice water', 'Ice cubes', 'Cooking spray', 'Zout']) assert.ok(R.isStaple(n), n);
  for (const n of ['Salted butter', 'Pepper jack cheese', 'Coconut water', 'Flour', 'Eggs', '']) assert.ok(!R.isStaple(n), n);
});
