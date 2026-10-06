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
