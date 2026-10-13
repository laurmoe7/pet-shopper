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

  // Dutch words for the same emoji (build 591), so a list written in Dutch gets its pictures too. Each row is [emoji, "words"]; the kind of food (and of shop
  // item) is taken from the same emoji above. List the plural next to the singular where it is not just an -s (the plural rule here is English). Compounds are
  // whole words in Dutch ("volkorenbrood"), so the common ones are listed as they are.
  var NL = [
    ['🍌', 'banaan, bananen'], ['🍎', 'appel, appels, elstar, jonagold'], ['🍏', 'granny smith, groene appel'], ['🍐', 'peer, peren, conference'], ['🍊', 'sinaasappel, sinaasappels, mandarijn, mandarijnen, clementine, clementines'],
    ['🍋', 'citroen, citroenen, limoen, limoenen'], ['🍉', 'watermeloen, watermeloenen'], ['🍈', 'meloen, meloenen, honingmeloen'], ['🍇', 'druif, druiven, rozijn, rozijnen'], ['🍓', 'aardbei, aardbeien, framboos, frambozen, fruit, fruitsalade'],
    ['🫐', 'bosbes, bosbessen, blauwe bes, blauwe bessen, braam, bramen, rode bessen, bessen'], ['🍒', 'kers, kersen'], ['🍑', 'perzik, perziken, nectarine, abrikoos, abrikozen, pruim, pruimen'], ['🥭', 'mango, mango\'s'], ['🍍', 'ananas'], ['🥥', 'kokosnoot, kokos'], ['🥝', 'kiwi, kiwi\'s'],
    ['🍅', 'tomaat, tomaten, cherrytomaten, trostomaten, tomatenpuree, passata'], ['🍆', 'aubergine, aubergines'], ['🥑', 'avocado, avocado\'s, guacamole'], ['🫛', 'erwten, doperwten, sperziebonen, snijbonen, peultjes, tuinbonen, edamame'], ['🥦', 'broccoli, bloemkool, romanesco, spruitjes'],
    ['🥬', 'sla, ijsbergsla, rucola, spinazie, boerenkool, andijvie, witte kool, rode kool, spitskool, savooiekool, prei, paksoi, kruiden, peterselie, bieslook, basilicum, tijm, rozemarijn, koriander, munt, groene kool'],
    ['🥒', 'komkommer, komkommers, courgette, courgettes, augurk, augurken, zure bom'], ['🫑', 'paprika, paprika\'s'], ['🌽', 'maïs, mais, snoepmaïs, maiskolf'], ['🥕', 'wortel, wortels, winterpeen, peen, pastinaak'], ['🫒', 'olijf, olijven'],
    ['🧄', 'knoflook'], ['🧅', 'ui, uien, sjalot, sjalotten, bosui, lente-ui, rode ui'], ['🥔', 'aardappel, aardappels, aardappelen, krieltjes, kruimige aardappels, vastkokende aardappels'], ['🍠', 'zoete aardappel, zoete aardappelen, bataat'], ['🫚', 'gember'],
    ['🍄', 'champignon, champignons, paddenstoel, paddenstoelen, shiitake, oesterzwam'], ['🥗', 'groente, groenten, selderij, bleekselderij, radijs, radijsjes, biet, bieten, rode biet, asperge, asperges, venkel, pompoen, artisjok, taugé, groentemix, roerbakgroenten, soepgroenten'],
    ['🍞', 'brood, broodje, volkorenbrood, tarwebrood, witbrood, bruinbrood, desembrood, roggebrood, toast, beschuit, boterham, boterhammen, sandwich, tosti, tostibrood, meergranenbrood, krentenbrood, kaiser'], ['🥐', 'croissant, croissants, gebak, appelflap, bladerdeeg, pain au chocolat, kaiserbroodje'],
    ['🥖', 'stokbrood, baguette, ciabatta, afbakbroodjes'], ['🫓', 'wrap, wraps, pita, naan, tortilla, tortilla\'s, flatbread, pannenkoek'], ['🥨', 'pretzel, krakeling'], ['🥯', 'bagel, bagels, bolletje, bolletjes, pistolets, puntjes, harde broodjes, zachte broodjes'], ['🥞', 'pannenkoek, pannenkoeken, poffertjes, pannenkoekenmix, pannenkoekmix'], ['🧇', 'wafel, wafels, stroopwafel, stroopwafels'],
    ['🥛', 'melk, volle melk, halfvolle melk, magere melk, havermelk, sojamelk, amandelmelk, karnemelk, room, slagroom, kookroom, koffiemelk, koffiecreamer, kefir, chocolademelk, yoghurtdrank'],
    ['🧀', 'kaas, kazen, jonge kaas, oude kaas, belegen kaas, boerenkaas, geitenkaas, schapenkaas, gouda, edammer, leerdammer, brie, camembert, mozzarella, parmezaan, parmezaanse kaas, feta, emmentaler, halloumi, kwark, hüttenkäse, roomkaas, smeerkaas, ricotta, mascarpone, geraspte kaas, kaasschaaf, blokjes kaas, cheddar'],
    ['🧈', 'boter, roomboter, margarine, halvarine, bakboter, becel'], ['🥚', 'ei, eieren, eitjes, scharreleieren, kippeneieren, eiwit, eigeel'], ['🍦', 'yoghurt, yoghurt naturel, griekse yoghurt, skyr, zure room, crème fraîche, creme fraiche, vla, kwark, vruchtenyoghurt, optimel'],
    ['🍗', 'kip, kipfilet, kippendij, kippenvleugels, kipdrumsticks, kalkoen, kipstuckjes, kipreepjes, kippenpoot, hele kip, braadkip'], ['🥩', 'biefstuk, rundvlees, rund, varkensvlees, varken, lamsvlees, gehakt, rundergehakt, half om half, kalfsvlees, rosbief, stoofvlees, hamburger, hamburgers, spareribs, lamsrack, vlees, schnitzel, speklappen, karbonade, varkenshaas'],
    ['🥓', 'spek, spekjes, bacon, ham, achterham, boerenham, salami, chorizo, serranoham, prosciutto, pancetta, katenspek, rookvlees, ontbijtspek, cervelaat, filet americain, smeerleverworst, leverworst'], ['🌭', 'worst, worstjes, saucijs, saucijzen, rookworst, braadworst, frikandel, frikandellen, knakworst, knakworsten, bratwurst, kaassouffle, kroket, kroketten, bamischijf, bitterballen'],
    ['🍖', 'ribs, gehaktballen, gehaktbal, kogelbiefstuk'], ['🐟', 'vis, zalm, tonijn, kabeljauw, forel, makreel, haring, sardines, ansjovis, pangasius, tilapia, witvis, visstick, visstick, vissticks, gerookte zalm, zalmfilet, kibbeling, lekkerbek, heilbot, schol, tong, zeebaars, garnalen'],
    ['🍤', 'garnaal, garnalen, scampi, scampi\'s, gamba\'s'], ['🦀', 'krab, krabsalade, krabstick'], ['🦑', 'inktvis, calamares, pijlinktvis'], ['🦪', 'oester, oesters, mossel, mosselen, kokkels, schelpen'], ['🫘', 'bonen, kidneybonen, witte bonen, bruine bonen, kikkererwten, linzen, hummus, sojabonen, zwarte bonen, kapucijners, tuinbonen'],
    ['🧆', 'falafel, tofu, tempeh, seitan, vegaburger, vegetarische burger, vegetarisch gehakt, kipstuckjes vegetarisch, vegavlees'], ['🥜', 'pinda, pinda\'s, pindakaas, noot, noten, amandel, amandelen, cashewnoten, cashew, walnoot, walnoten, hazelnoot, hazelnoten, pistachenoten, pistache, borrelnoten, notenmix, studentenhaver'], ['🌰', 'kastanje, kastanjes, zaden, pitten, zonnebloempitten, pompoenpitten, chiazaad, lijnzaad, sesamzaad'],
    ['🍝', 'pasta, spaghetti, penne, fusilli, macaroni, lasagne, lasagnebladen, tagliatelle, gnocchi, ravioli, tortellini, noedels, vermicelli, mie, mihoen, farfalle, rigatoni, tortiglioni, bami, nasi'], ['🍚', 'rijst, basmatirijst, risotto, couscous, quinoa, bulgur, zilvervliesrijst, zilvervlies rijst, witte rijst, pandanrijst, sushirijst, risottorijst, rijstebrij'],
    ['🍜', 'ramen, noedelsoep, instant noedels, soep, bouillon, bouillonblokjes, bouillonblokje, tomatensoep, kippensoep, erwtensoep, snert, groentesoep, soepballetjes, soepstengels'], ['🍛', 'curry, currypasta, currysaus, kerrie, kerriepoeder, madras, tikka masala, rendang, babi pangang, nasi goreng'],
    ['🥣', 'ontbijtgranen, cornflakes, muesli, granola, havermout, haver, pap, brinta, cruesli, chocopasta, hagelslag'], ['🥫', 'blik, blikje, tomatensaus, pastasaus, ketchup, mayonaise, mayo, mosterd, saus, pesto, dressing, azijn, curry ketchup, satésaus, satesaus, tomatenblokjes, gepelde tomaten, maïs blik, appelmoes, sambal, sojasaus, atjar, piccalilly'],
    ['🫙', 'pot, potje, jam, marmelade, broodbeleg, pindakaas, hazelnootpasta, nutella, augurken, zuurkool, appelstroop, stroop, honing, speculoospasta, vruchtenhagel, vlokken, chocoladepasta'], ['🧂', 'zout, peper, kruiden, specerijen, kaneel, komijn, kerrie, paprikapoeder, kurkuma, nootmuskaat, gemalen peper, zeezout, kruidenmix, knoflookpoeder, laurier, kruidnagel'],
    ['🫗', 'olie, olijfolie, zonnebloemolie, rapsolie, kokosolie, bakolie, sesamolie, braadolie, friteuse olie, sojasaus'], ['🍕', 'pizza, pizza\'s, diepvriespizza, pizzabodem, pizzasaus'], ['🍔', 'hamburgers, burger, burgers, hamburgerbroodjes, burgerbroodjes'], ['🍟', 'friet, patat, frites, oven friet, chips, paprikachips, naturel chips, borrelnootjes, nacho\'s, tortillachips, zoutjes, popcorn zout, kroepoek'],
    ['🌮', 'taco, taco\'s, tacoschelpen, tacokruiden, fajita, fajita\'s'], ['🌯', 'burrito, burrito\'s, wraps'], ['🥪', 'broodje, belegd broodje, sandwich, tosti, lunchbroodje, belegde broodjes'], ['🥟', 'dumpling, dumplings, gyoza, loempia, loempia\'s, bao, nems'], ['🍣', 'sushi, nori, zeewier, wasabi, sushirijst'],
    ['🍱', 'lunch, maaltijd, kant-en-klaar, kant en klaar, kant-en-klaarmaaltijd, bento, maaltijdsalade, magnetronmaaltijd'], ['🍿', 'popcorn, magnetronpopcorn, popcornmais'], ['🍳', 'bloem, tarwebloem, zelfrijzend bakmeel, bakpoeder, gist, baking soda, paneermeel, maizena, zetmeel, custardpoeder, vanillesuiker, bakmix'],
    ['🍯', 'honing, siroop, ahornsiroop, agavesiroop, stroop, appelstroop'], ['🧊', 'ijsblokjes, ijsklontjes, diepvries, diepvriesgroenten, diepvriesfruit, bevroren'],
    ['🍫', 'chocolade, pure chocolade, melkchocolade, witte chocolade, cacao, cacaopoeder, chocoladereep, tony\'s, chocoladeletters, chocoladerepen, hagelslag, chocoladevlokken, bonbons, bonbon, pepernoten, kruidnoten, taaitaai, marsepein'],
    ['🍬', 'snoep, snoepjes, drop, dropjes, winegums, haribo, zuurstokken, pepermunt, pepermuntjes, keelsnoepjes, kauwgom, toverballen, gummies, schuimpjes, spekjes snoep, zoute drop, honingdrop, tictac, mentos, fruitpastilles, suiker, rietsuiker, basterdsuiker, poedersuiker, bruine suiker, kristalsuiker'],
    ['🍭', 'lolly, lolly\'s, lollies, zuurstok'], ['🍪', 'koekje, koekjes, biscuit, biscuits, crackers, cracker, speculaas, speculoos, rijstwafels, rijstwafel, hartige koekjes, boterkoekjes, maria, bastogne, stroopwafel, liga, wafeltjes, koek, ontbijtkoek, peperkoek'],
    ['🍩', 'donut, donuts, oliebol, oliebollen, appelbeignet, appelbeignets, beignet, berliner'], ['🍰', 'taart, taartje, cake, kwarktaart, kaastaart, appeltaart, gebak, vlaai, vlaaien, slagroomtaart, tompouce, tompoucen, moorkop, moorkoppen, soesjes, eclair'], ['🎂', 'verjaardagstaart, verjaardagscake, feesttaart, jarig'],
    ['🧁', 'cupcake, cupcakes, muffin, muffins, brownie, brownies, cakejes, cakeje, madeleines'], ['🥧', 'appeltaart, appelflap, strudel, pastei, quiche, hartige taart'], ['🍮', 'pudding, vla, custard, flan, dessert, toetje, toetjes, griesmeelpudding, chocolademousse, mousse, rijstebrij, panna cotta'], ['🍨', 'ijs, ijsje, roomijs, waterijs, sorbet, ijstaart, ijsco, magnum, cornetto, vanille ijs, ijsjes'],
    ['🍡', 'mochi, marshmallow, marshmallows, spekken, schuimpjes'], ['🌶️', 'chili, chilipeper, rode peper, madame jeanette, jalapeño, jalapeno, sriracha, tabasco, harissa, cayennepeper, sambal oelek, sambal badjak, wasabi, chilivlokken, kimchi, pepers, pittig'],
    ['☕', 'koffie, espresso, koffiebonen, oploskoffie, koffiepads, koffiecups, filterkoffie, senseo, nespresso, dolce gusto, cappuccino, koffiefilters'], ['🍵', 'thee, groene thee, matcha, kruidenthee, theezakjes, rooibos, kamillethee, muntthee, gemberthee, earl grey, pickwick'], ['🧃', 'sap, sinaasappelsap, appelsap, smoothie, fruitsap, jus d\'orange, multivruchtensap, tomatensap, limonadesiroop, siroop, ranja, roosvicee'],
    ['🥤', 'cola, cola zero, limonade, frisdrank, fris, sprite, fanta, energiedrank, ice tea, icetea, red bull, sinas, spa rood, sisi, 7up, dr pepper, ginger ale, tonic, bitter lemon'], ['💧', 'water, bruisend water, mineraalwater, spa, spa blauw, spa rood, bronwater, tafelwater, bruiswater, plat water, bidon'],
    ['🧋', 'bubble tea, boba'], ['🍺', 'bier, pils, biertjes, speciaalbier, radler, weizen, tripel, blond, ipa, alcoholvrij bier, heineken, grolsch, amstel, hertog jan, brand, bavaria, radler, cider, appelcider'], ['🍷', 'wijn, rode wijn, witte wijn, rosé, wijntje, zoete wijn, dessertwijn, glühwein'],
    ['🍾', 'champagne, prosecco, cava, mousseux, bubbels, sekt'], ['🥃', 'whisky, whiskey, rum, gin, wodka, jenever, advocaat, likeur, sterke drank, bacardi, cognac, port, sherry, bessenjenever, oude jenever'], ['🍼', 'babymelk, flesvoeding, opvolgmelk, babyvoeding, fruithapje, babyhapje'],
    ['🧴', 'shampoo, conditioner, bodylotion, douchegel, zonnebrand, zonnebrandcrème, deodorant, dagcrème, nachtcrème, handcrème, gezichtscrème, haargel, haarlak, haarspray, scheerschuim, aftershave, parfum, bodymilk, voetcrème'], ['🪥', 'tandenborstel, tandpasta, floss, mondwater, flosdraad, tandenstokers, ragers, opzetborstels, elektrische tandenborstel'],
    ['🪒', 'scheermesje, scheermesjes, scheerapparaat, scheerschuim, scheercrème, ontharingscrème, epileren'], ['🩹', 'pleister, pleisters, verband, eerste hulp, ehbo, ehbo-doos, wondzalf, jodium, desinfectie, hansaplast'], ['💊', 'medicijn, medicijnen, vitamines, vitamine d, paracetamol, ibuprofen, aspirine, pijnstillers, tabletten, pillen, hoestdrank, keelpastilles, antihistamine, hooikoorts, neusspray, neusdruppels, strepsils, voedingssupplementen, magnesium, ijzertabletten, zalf, oogdruppels'],
    ['🌡️', 'thermometer, koortsthermometer'], ['💄', 'make-up, make up, lippenstift, lippenbalsem, mascara, oogpotlood, foundation, concealer, nagellak, nagellakremover, rouge, oogschaduw, oogschaduwpalet, wimperkruller, bronzer, highlighter, make-upremover, micellair water, wattenschijfjes, wattenstaafjes'], ['🪮', 'haarborstel, borstel, kam, haarelastiekjes, haarspeldjes, haarbandjes, scrunchies, haarclips, krulspelden'],
    ['👓', 'leesbril, contactlenzen, lenzenvloeistof, brillenkoker, brillendoekje'], ['🧷', 'luiers, babydoekjes, billendoekjes, veiligheidsspelden, wattenpads, wattenschijfjes, tampons, maandverband, inlegkruisjes, inlegkruisje, zwangerschapstest, condooms'],
    ['🧻', 'wc-papier, toiletpapier, wc papier, keukenrol, keukenpapier, zakdoekjes, tissues, servetten, papieren zakdoekjes, zakdoeken, vochtige doekjes, toiletrollen'], ['🧼', 'zeep, handzeep, afwasmiddel, vaatwastabletten, vaatwasblokjes, schoonmaakmiddel, allesreiniger, bleek, ontsmettingsmiddel, schoonmaakspray, glasreiniger, toiletreiniger, wc-eend, ontkalker, vloerreiniger, schuurmiddel, badkamerreiniger, glansspoelmiddel, vaatwaszout, handgel, ontvetter'],
    ['🧽', 'spons, sponzen, schuurspons, doekjes, vaatdoek, vaatdoekje, schoonmaakdoekjes, microvezeldoek, afwasborstel, schuursponsjes'], ['🧺', 'wasmiddel, wasverzachter, waspoeder, wasknijpers, wasmand, wasbal, vlekkenverwijderaar, waskaarten, wasdoekjes, wasgoed'], ['🗑️', 'vuilniszakken, vuilniszak, afvalzakken, pedaalemmerzakken, kliko, afvalbak, prullenbak, pedaalemmer, composteerbare zakken'],
    ['🧹', 'bezem, stoffer en blik, stoffer, stofzuigerzakken, stofdoek, vloerwisser, zwabber, rubberen bezem'], ['🪣', 'emmer, dweil, mop, dweilen, schoonmaakemmer'], ['🔋', 'batterij, batterijen, accu, oplaadbare batterijen, knoopcelbatterij, aa batterijen, aaa batterijen, 9v'], ['💡', 'gloeilamp, lamp, ledlamp, led lamp, lampen, lichtbol, spaarlamp, halogeenlamp, buislamp, led-strip'],
    ['🕯️', 'kaars, kaarsen, waxinelichtjes, waxinelichtje, lucifers, aansteker, stompkaars, geurkaars, theelichtjes, geurkaarsen, stormaansteker'], ['🎞️', 'folie, aluminiumfolie, huishoudfolie, bakpapier, vrieszakken, boterhamzakjes, vershoudfolie, diepvrieszakken, ritszakjes, vershoudzakjes, bakfolie'], ['🛏️', 'kussen, beddengoed, lakens, dekbed, deken, handdoek, handdoeken, dekbedhoes, hoeslaken, kussensloop, plaid, theedoek, theedoeken, badlaken, washand, washandjes, slaapzak'],
    ['🪴', 'kamerplant, potgrond, compost, plantenvoeding, bloemzaden, tuinzaden, bloempot, plantenbak, orchidee, cactus, vetplant, tuinaarde, kamerplanten'], ['💐', 'bloemen, boeket, tulpen, rozen, bos bloemen, narcissen, tulp, roos, zonnebloemen, lelies, gerbera\'s, pioenrozen, freesia\'s, hortensia, chrysanten'],
    ['🦴', 'hondenvoer, hondenbrokken, hondensnacks, kattenvoer, kattenbrokken, kattensnacks, dierenvoer, kattenbakvulling, kattengrit, hondenspeelgoed, kattenspeelgoed, vogelzaad, visvoer, hondenkluif, dreentjes, knaagdier voer, konijnenvoer, hamstervoer, kattenbak, hondenriem, halsband, poepzakjes'],
    ['🧸', 'speelgoed, knuffel, knuffels, teddybeer, lego, puzzel, bordspel, spel, pop, poppen, kaartspel, playmobil, speelkaarten, bouwblokken, verkleedkleren, stickers'], ['🎮', 'videospel, game, games, spelcomputer, controller, console, cadeaubon, gamekaart, playstation, nintendo, xbox, steam kaart'], ['🎧', 'koptelefoon, oordopjes, oortjes, luidspreker, speaker, bluetooth speaker, oordoppen, headset, airpods'],
    ['🔌', 'oplader, telefoonoplader, kabel, usb-kabel, usb kabel, adapter, verlengsnoer, stekker, stekkerdoos, powerbank, laadkabel, hdmi kabel, stopcontact'], ['📱', 'telefoonhoesje, screenprotector, telefoon, simkaart, sim kaart, tablet, beltegoed'], ['📚', 'boek, boeken, tijdschrift, stripboek, notitieboek, agenda, kalender, dagboek, kookboek, leesboek, puzzelboek, tijdschriften, krant'],
    ['✏️', 'potlood, pen, pennen, kleurpotloden, stiften, briefpapier, lijm, schaar, post-its, enveloppen, printpapier, a4 papier, tekenpapier, gum, puntenslijper, plakband, nietjes, ringband, schrift, schriften, markeerstift, balpen, vulpen, stempelkussen'],
    ['🧦', 'sokken, panty, panty\'s, ondergoed, pyjama, onderbroeken, boxers, bh, kousen, sportsokken, sloffen'], ['👕', 't-shirt, tshirt, shirt, kleren, kleding, trui, vest, hoodie, jas, broek, jeans, jurk, rok, blouse, sjaal, muts, handschoenen, regenjas, winterjas, zwembroek, badpak, bikini, shorts, joggingbroek'], ['👟', 'schoenen, gympen, sneakers, pantoffels, slippers, veters, laarzen, regenlaarzen, sandalen, klompen, balletschoentjes, sportschoenen, wandelschoenen'],
    ['🔧', 'gereedschap, schroevendraaier, sleutel, moersleutel, hamer, spijkers, schroeven, ducttape, tape, boormachine, boor, tang, zaag, meetlint, waterpas, plamuur, verf, kwast, rolkwast, schuurpapier, kitspuit, lijmpistool, haakjes, ophangsysteem'], ['🎈', 'ballonnen, feestartikelen, verjaardagskaarsjes, versiering, slingers, confetti, feestmutsjes, toeters, kaarsjes, taartkaarsjes, vlaggetjes, slinger, ballon'],
    ['🎀', 'cadeaupapier, inpakpapier, lint, verjaardagskaart, kaart, kaartje, cadeautas, kerstkaarten, wenskaart, cadeaulint, kaarten, rouwkaart, felicitatiekaart'], ['⚽', 'bal, voetbal, basketbal, tennisballen, yogamat, drinkfles, waterfles, sportartikelen, badmintonset, springtouw, skateboard']
  ];
  NL.forEach(function (r) {
    var base = FOODS.filter(function (f) { return f[0] === r[0]; })[0];
    if (base) FOODS.push([r[0], base[1], r[1], base[3]]);
  });

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
