/* Item to emoji dictionary.
 * Each row: [emoji, category, "keyword, keyword, ..."].
 * Plurals (s, es, y -> ies) are generated automatically, so list singulars.
 * The longest keyword found in an item wins, so "oat milk" beats "milk".
 * Loaded as a classic script by the page and by the service worker.
 */
(function (root) {
  var FOODS = [
    // fruit
    ['🍌', 'fruit', 'banana'],
    ['🍎', 'fruit', 'apple, red apple'],
    ['🍏', 'fruit', 'green apple, granny smith'],
    ['🍐', 'fruit', 'pear'],
    ['🍊', 'fruit', 'orange, mandarin, clementine, tangerine, satsuma'],
    ['🍋', 'fruit', 'lemon, lime'],
    ['🍉', 'fruit', 'watermelon'],
    ['🍈', 'fruit', 'melon, honeydew, cantaloupe'],
    ['🍇', 'fruit', 'grape, raisin'],
    ['🍓', 'fruit', 'strawberry, raspberry'],
    ['🫐', 'fruit', 'blueberry, berry, blackberry, bilberry'],
    ['🍒', 'fruit', 'cherry'],
    ['🍑', 'fruit', 'peach, nectarine, apricot'],
    ['🥭', 'fruit', 'mango'],
    ['🍍', 'fruit', 'pineapple'],
    ['🥥', 'fruit', 'coconut'],
    ['🥝', 'fruit', 'kiwi'],
    ['🍑', 'fruit', 'plum'],
    ['🍓', 'fruit', 'fruit, fruit salad'],

    // vegetables
    ['🍅', 'veg', 'tomato, cherry tomato, passata'],
    ['🍆', 'veg', 'aubergine, eggplant'],
    ['🥑', 'veg', 'avocado, guacamole'],
    ['🫛', 'veg', 'peas, pea, green bean, sugar snap, edamame, mangetout'],
    ['🥦', 'veg', 'broccoli, cauliflower'],
    ['🥬', 'veg', 'lettuce, salad, spinach, kale, cabbage, rocket, arugula, chard, leek, bok choy, pak choi, herbs, thyme, oregano, rosemary, sage, tarragon, chives, parsley, basil, coriander, cilantro, dill, mint'],
    ['🥒', 'veg', 'cucumber, courgette, zucchini, pickle, gherkin'],
    ['🫑', 'veg', 'bell pepper, pepper, paprika'],
    ['🌽', 'veg', 'corn, sweetcorn, popcorn kernels'],
    ['🥕', 'veg', 'carrot, parsnip'],
    ['🫒', 'veg', 'olive'],
    ['🧄', 'veg', 'garlic'],
    ['🧅', 'veg', 'onion, shallot, spring onion, scallion'],
    ['🥔', 'veg', 'potato, spud, new potatoes'],
    ['🍠', 'veg', 'sweet potato, yam'],
    ['🫚', 'veg', 'ginger'],
    ['🍄', 'veg', 'mushroom, champignon'],
    ['🥗', 'veg', 'vegetable, veggie, veg, celery, radish, beetroot, beet, asparagus, fennel, pumpkin, squash, artichoke, sprouts'],

    // bread and baked
    ['🍞', 'baked', 'bread, toast, loaf, sandwich bread, rye bread, sourdough, wholemeal'],
    ['🥐', 'baked', 'croissant, pastry, danish'],
    ['🥖', 'baked', 'baguette, ciabatta'],
    ['🫓', 'baked', 'flatbread, pita, naan, tortilla, wrap'],
    ['🥨', 'baked', 'pretzel, brezel'],
    ['🥯', 'baked', 'bagel, roll, bread roll, bun, brötchen'],
    ['🥞', 'baked', 'pancake, crepe, pancake mix'],
    ['🧇', 'baked', 'waffle'],

    // dairy and eggs
    ['🥛', 'dairy', 'milk, oat milk, soy milk, almond milk, buttermilk, cream, whipping cream, kefir'],
    ['🧀', 'dairy', 'cheese, cheddar, gouda, brie, camembert, mozzarella, parmesan, feta, emmental, halloumi, quark, cottage cheese, cream cheese, ricotta, mascarpone, grana padano, pecorino, manchego, edam'],
    ['🧈', 'dairy', 'butter, margarine'],
    ['🥚', 'dairy', 'egg'],
    ['🍦', 'dairy', 'yogurt, yoghurt, skyr, sour cream, creme fraiche, crème fraîche'],

    // meat and fish
    ['🍗', 'protein', 'chicken, chicken breast, turkey, drumstick, wing'],
    ['🥩', 'protein', 'steak, beef, meat, pork, lamb, mince, minced meat, ground beef, veal'],
    ['🥓', 'protein', 'bacon, ham, prosciutto, pancetta, salami, chorizo'],
    ['🌭', 'protein', 'sausage, hot dog, bratwurst, frankfurter, wiener'],
    ['🍖', 'protein', 'ribs, meatball'],
    ['🐟', 'protein', 'fish, salmon, tuna, cod, trout, mackerel, herring, fish fingers, sardine, anchovy'],
    ['🍤', 'protein', 'prawn, shrimp, scampi'],
    ['🦀', 'protein', 'crab'],
    ['🦑', 'protein', 'squid, calamari'],
    ['🦪', 'protein', 'oyster, mussel, clam'],
    ['🫘', 'protein', 'bean, beans, kidney beans, chickpea, lentil, hummus, houmous'],
    ['🧆', 'protein', 'falafel, tofu, tempeh, seitan'],
    ['🥜', 'protein', 'peanut, peanut butter, nut, almond, cashew, walnut, hazelnut, pistachio'],
    ['🌰', 'protein', 'chestnut, seeds'],

    // pantry and meals
    ['🍝', 'pantry', 'pasta, spaghetti, penne, fusilli, macaroni, lasagne, lasagna, noodle, tagliatelle, gnocchi, ravioli, tortellini'],
    ['🍚', 'pantry', 'rice, risotto rice, basmati, couscous, quinoa, bulgur'],
    ['🍜', 'pantry', 'ramen, instant noodles, soup, broth, stock, stock cubes'],
    ['🍛', 'pantry', 'curry, curry paste'],
    ['🥣', 'pantry', 'cereal, muesli, granola, oats, porridge, cornflakes, oatmeal'],
    ['🥫', 'pantry', 'can, tin, canned, tinned, tomato sauce, pasta sauce, beans in tomato sauce, ketchup, mayo, mayonnaise, mustard, sauce, pesto, dressing, vinegar'],
    ['🫙', 'pantry', 'jar, jam, marmalade, spread, nutella, pickles, sauerkraut'],
    ['🧂', 'pantry', 'salt, pepper grinder, black pepper, spice, spices, cinnamon, oregano, cumin, seasoning'],
    ['🫗', 'pantry', 'oil, olive oil, sunflower oil, rapeseed oil, soy sauce'],
    ['🍕', 'pantry', 'pizza, frozen pizza'],
    ['🍔', 'pantry', 'burger, burger buns'],
    ['🍟', 'pantry', 'fries, chips, crisps, oven chips, potato chips, potato crisps, kettle chips, pringles, doritos, lays, nachos'],
    ['🌮', 'pantry', 'taco, taco shells'],
    ['🌯', 'pantry', 'burrito'],
    ['🥪', 'pantry', 'sandwich'],
    ['🥟', 'pantry', 'dumpling, pierogi, gyoza'],
    ['🍣', 'pantry', 'sushi, nori, seaweed'],
    ['🍱', 'pantry', 'lunch, ready meal, bento'],
    ['🍿', 'pantry', 'popcorn'],
    ['🍳', 'pantry', 'flour, baking powder, yeast, baking soda, breadcrumbs, cornstarch, starch'],
    ['🍯', 'pantry', 'honey, syrup, maple syrup, agave'],
    ['🧊', 'pantry', 'ice, ice cubes, frozen veg, frozen vegetables, frozen'],

    // sweets
    ['🍫', 'sweets', 'chocolate, dark chocolate, cocoa, cocoa powder'],
    ['🍬', 'sweets', 'candy, sweets, gummy, gummy bears, haribo, licorice, liquorice, mints'],
    ['🍭', 'sweets', 'lollipop'],
    ['🍪', 'sweets', 'cookie, biscuit, cracker, digestive, rice cakes'],
    ['🍩', 'sweets', 'donut, doughnut'],
    ['🍰', 'sweets', 'cake, cheesecake, tart'],
    ['🎂', 'sweets', 'birthday cake'],
    ['🧁', 'sweets', 'cupcake, muffin, brownie'],
    ['🥧', 'sweets', 'pie, apple pie, strudel'],
    ['🍮', 'sweets', 'pudding, custard, flan, dessert'],
    ['🍨', 'sweets', 'ice cream, gelato, sorbet'],
    ['🍡', 'sweets', 'mochi, marshmallow'],
    ['🍬', 'sweets', 'sugar, brown sugar, icing sugar'],

    // spicy
    ['🌶️', 'spicy', 'chili, chilli, chile, jalapeno, jalapeño, sriracha, hot sauce, tabasco, harissa, cayenne, sambal, wasabi, chili flakes, kimchi'],

    // drinks
    ['☕', 'drink', 'coffee, espresso, coffee beans, instant coffee, coffee pods'],
    ['🍵', 'drink', 'tea, green tea, matcha, herbal tea, tea bags'],
    ['🧃', 'drink', 'juice, orange juice, apple juice, smoothie'],
    ['🥤', 'drink', 'soda, cola, coke, lemonade, fanta, sprite, soft drink, energy drink, iced tea'],
    ['💧', 'drink', 'water, sparkling water, mineral water'],
    ['🧋', 'drink', 'bubble tea'],
    ['🍺', 'drink', 'beer, lager, ale, cider'],
    ['🍷', 'drink', 'wine, red wine, white wine, rosé'],
    ['🍾', 'drink', 'champagne, prosecco, cava, sekt'],
    ['🥃', 'drink', 'whisky, whiskey, rum, gin, vodka, liquor, spirits'],
    ['🍼', 'drink', 'baby milk, formula'],

    // not food: still on the list, but the pet tucks them away instead of eating them.
    // The 4th field is the kind of shop item, for the pet's comments:
    // 'health' (pharmacy), 'home' (cleaning and household) or 'stuff' (everything else a superstore sells).
    // pharmacy
    ['🧴', 'nonfood', 'shampoo, conditioner, lotion, shower gel, sunscreen, sun cream, deodorant, moisturiser, moisturizer, body wash, hand cream, face wash, hair gel, hairspray', 'health'],
    ['🪥', 'nonfood', 'toothbrush, toothpaste, floss, mouthwash, dental floss', 'health'],
    ['🪒', 'nonfood', 'razor, razor blades, shaving cream, shaving foam', 'health'],
    ['🩹', 'nonfood', 'plaster, plasters, band aid, bandage, first aid, first aid kit', 'health'],
    ['💊', 'nonfood', 'medicine, vitamins, paracetamol, ibuprofen, aspirin, painkillers, tablets, pills, cough syrup, cough drops, antihistamine, allergy tablets, cold medicine, prescription, multivitamin', 'health'],
    ['🌡️', 'nonfood', 'thermometer', 'health'],
    ['💄', 'nonfood', 'makeup, make up, lipstick, lip balm, mascara, eyeliner, foundation, concealer, nail polish, nail varnish, blush, eyeshadow', 'health'],
    ['🪮', 'nonfood', 'hairbrush, hair brush, comb, hair ties, hair clips, bobby pins', 'health'],
    ['👓', 'nonfood', 'reading glasses, contact lenses, contact lens solution, glasses case', 'health'],
    ['🧷', 'nonfood', 'nappies, diapers, wipes, baby wipes, safety pins, cotton pads, cotton buds, q tips, tampons, pads', 'health'],
    // household
    ['🧻', 'nonfood', 'toilet paper, toilet roll, kitchen roll, paper towel, tissue, tissues, napkin', 'home'],
    ['🧼', 'nonfood', 'soap, hand soap, washing up liquid, dish soap, dishwasher tablets, detergent, cleaner, bleach, disinfectant, spray cleaner', 'home'],
    ['🧽', 'nonfood', 'sponge, scrubber, cloths, dishcloth', 'home'],
    ['🧺', 'nonfood', 'laundry, laundry detergent, fabric softener, washing powder, laundry basket, pegs', 'home'],
    ['🗑️', 'nonfood', 'bin bags, trash bags, garbage bags, bin liners, bin', 'home'],
    ['🧹', 'nonfood', 'broom, dustpan, duster, vacuum bags', 'home'],
    ['🪣', 'nonfood', 'bucket, mop', 'home'],
    ['🔋', 'nonfood', 'battery, batteries', 'home'],
    ['💡', 'nonfood', 'light bulb, lightbulb, bulb', 'home'],
    ['🕯️', 'nonfood', 'candle, tealights, matches, lighter', 'home'],
    ['🎞️', 'nonfood', 'foil, aluminium foil, aluminum foil, cling film, plastic wrap, baking paper, freezer bags, sandwich bags, zip bags', 'home'],
    ['🛏️', 'nonfood', 'pillow, bedding, bed sheets, duvet, blanket, towel, towels', 'home'],
    ['🪴', 'nonfood', 'house plant, potted plant, pot plant, potting soil, compost, plant food, flower seeds, garden seeds, flower pot', 'home'],
    // everything else a superstore sells
    ['💐', 'nonfood', 'flowers, bouquet, tulips, roses', 'stuff'],
    ['🦴', 'nonfood', 'dog food, dog treats, cat food, cat treats, pet food, cat litter, dog toy, cat toy, bird seed, fish food', 'stuff'],
    ['🧸', 'nonfood', 'toy, toys, teddy, teddy bear, lego, puzzle, board game, doll, plushie', 'stuff'],
    ['🎮', 'nonfood', 'video game, game controller, controller, console, gift card', 'stuff'],
    ['🎧', 'nonfood', 'headphones, earbuds, earphones, speaker', 'stuff'],
    ['🔌', 'nonfood', 'charger, phone charger, cable, usb cable, adapter, extension cord, extension lead, plug', 'stuff'],
    ['📱', 'nonfood', 'phone case, screen protector, phone', 'stuff'],
    ['📚', 'nonfood', 'book, books, magazine, comic, notebook, diary, calendar', 'stuff'],
    ['✏️', 'nonfood', 'pencil, pen, pens, crayons, markers, stationery, glue, scissors, sticky notes, envelopes, printer paper', 'stuff'],
    ['🧦', 'nonfood', 'socks, tights, underwear, pyjamas, pajamas', 'stuff'],
    ['👕', 'nonfood', 't shirt, tshirt, shirt, clothes, jumper, sweater, hoodie, jacket, trousers, jeans', 'stuff'],
    ['👟', 'nonfood', 'shoes, trainers, sneakers, slippers, flip flops, shoe laces', 'stuff'],
    ['🔧', 'nonfood', 'tools, screwdriver, wrench, spanner, hammer, nails, screws, duct tape, tape, glue gun, drill', 'stuff'],
    ['🎈', 'nonfood', 'balloons, party supplies, birthday candles, decorations, streamers', 'stuff'],
    ['🎀', 'nonfood', 'gift wrap, wrapping paper, ribbon, birthday card, card, gift bag', 'stuff'],
    ['⚽', 'nonfood', 'ball, football, soccer ball, basketball, tennis balls, yoga mat, water bottle', 'stuff']
  ];

  var MYSTERY = { emoji: '🎁', cat: 'mystery' };

  // Extra emojis offered in the long-press picker that the dictionary does not use.
  var EXTRA_PICKS = ['🎁', '🍽️', '🥘', '🍲', '🥙', '🍙', '🍘', '🥠', '🦐', '🦞', '🍸', '🍹', '🥂'];
  var EXTRA_CATS = { '🎁': 'mystery', '🍽️': 'pantry', '🥘': 'pantry', '🍲': 'pantry', '🥙': 'pantry', '🍙': 'pantry', '🍘': 'pantry', '🥠': 'sweets', '🦐': 'protein', '🦞': 'protein', '🍸': 'drink', '🍹': 'drink', '🥂': 'drink' };

  /**
   * Spelling variants for a keyword: itself plus simple English plurals.
   * @param {string} word
   * @returns {string[]}
   */
  function plurals(word) {
    var out = [word];
    var last = word.slice(-1);
    if (last === 'y' && !/[aeiou]y$/.test(word)) out.push(word.slice(0, -1) + 'ies');
    else if (/(s|x|ch|sh|o)$/.test(word)) out.push(word + 'es');
    if (last !== 's') out.push(word + 's');
    return out;
  }

  // keyword -> {emoji, cat}, longest keywords first
  var index = [];
  var seen = {};
  var emojiCat = {};
  var emojiKind = {};
  FOODS.forEach(function (row) {
    if (!emojiCat[row[0]]) emojiCat[row[0]] = row[1];
    if (row[3] && !emojiKind[row[0]]) emojiKind[row[0]] = row[3];
    row[2].split(',').forEach(function (kw) {
      kw = kw.trim().toLowerCase();
      if (!kw) return;
      plurals(kw).forEach(function (form) {
        if (seen[form]) return;
        seen[form] = true;
        index.push({ kw: form, emoji: row[0], cat: row[1] });
      });
    });
  });
  index.sort(function (a, b) { return b.kw.length - a.kw.length; });
  Object.keys(EXTRA_CATS).forEach(function (e) { if (!emojiCat[e]) emojiCat[e] = EXTRA_CATS[e]; });

  /**
   * Lower-cases an item and strips quantities and punctuation, e.g. "2x Bananas (ripe)" -> "bananas ripe".
   * @param {string} text
   * @returns {string}
   */
  function normalize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[()\[\],.;:!?"]/g, ' ')
      .replace(/\b\d+([.,]\d+)?\s*(x|g|gr|kg|ml|cl|l|lb|lbs|oz|pcs|pc|pack|packs|stk|st)?\b/g, ' ')
      .replace(/\bx\s*\d+\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Finds the emoji for an item using the longest keyword in it; unknown items become a mystery gift.
   * @param {string} text
   * @returns {{emoji: string, cat: string, keyword: ?string}}
   */
  function match(text) {
    var norm = ' ' + normalize(text) + ' ';
    for (var i = 0; i < index.length; i++) {
      if (norm.indexOf(' ' + index[i].kw + ' ') !== -1) {
        return { emoji: index[i].emoji, cat: index[i].cat, keyword: index[i].kw };
      }
    }
    return { emoji: MYSTERY.emoji, cat: MYSTERY.cat, keyword: null };
  }

  // Every emoji the app can show, for the picker and for offline caching.
  var ALL = [];
  FOODS.forEach(function (row) { if (ALL.indexOf(row[0]) === -1) ALL.push(row[0]); });
  EXTRA_PICKS.forEach(function (e) { if (ALL.indexOf(e) === -1) ALL.push(e); });

  /**
   * Path of the bundled OpenMoji file for an emoji: code points joined by "-", variation selector dropped.
   * @param {string} emoji
   * @returns {string}
   */
  function emojiFile(emoji) {
    var parts = [];
    for (var ch of emoji) {
      var cp = ch.codePointAt(0);
      if (cp === 0xfe0f) continue;
      parts.push(cp.toString(16).toUpperCase().padStart(4, '0'));
    }
    return 'emoji/' + parts.join('-') + '.svg';
  }

  root.Foods = {
    match: match,
    normalize: normalize,
    categoryOf: function (emoji) { return emojiCat[emoji] || 'mystery'; },
    /** For non-food items: 'health', 'home' or 'stuff' (the default). */
    kindOf: function (emoji) { return emojiKind[emoji] || 'stuff'; },
    KINDS: ['health', 'home', 'stuff'],
    all: ALL,
    emojiFile: emojiFile,
    keywordCount: index.length
  };
})(typeof self !== 'undefined' ? self : globalThis);
