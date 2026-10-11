/* Item to emoji dictionary for the to-do list (the shopping list's is foods.js).
 * Each row: [emoji, kind, "keyword, keyword, ..."]. The longest keyword found in a task wins, so "dentist" beats
 * "appointment". A keyword also matches longer forms of the word ("clean" finds "cleaning"); short ones (three
 * letters or fewer) must match a whole word. Loaded as a classic script after foods.js, by the page and the tests.
 * Kinds: chore, call, health, money, errand, fitness, work, social, fun, travel, care, cook, other.
 */
(function (root) {
  var TASKS = [
    // chores
    ['🧹', 'chore', 'clean, sweep, vacuum, hoover, tidy, declutter, dust, housework, chores'],
    ['🧺', 'chore', 'laundry, washing, wash clothes, fold, iron, ironing, dry clothes'],
    ['🍽️', 'chore', 'dishes, dishwasher, wash up, washing up, load dishwasher, empty dishwasher'],
    ['🗑️', 'chore', 'trash, garbage, rubbish, bins, bin, recycling, take out the bin'],
    ['🛏️', 'chore', 'make bed, change sheets, bedding, bed sheets'],
    ['🧽', 'chore', 'scrub, mop, bathroom, clean toilet, clean kitchen, wash car'],
    ['🪟', 'chore', 'windows, clean windows'],
    // calls and messages
    ['📞', 'call', 'call, phone, ring, telephone, call back'],
    ['📧', 'call', 'email, e-mail, mail, inbox'],
    ['💬', 'call', 'text, message, reply, whatsapp, answer, respond, dm'],
    ['📮', 'call', 'post, send letter, letter, postcard, stamp, card'],
    // health
    ['🦷', 'health', 'dentist, teeth, dental, brush teeth, floss'],
    ['🩺', 'health', 'doctor, gp, checkup, check-up, appointment, physio, therapy, therapist'],
    ['💊', 'health', 'meds, medication, medicine, pills, pill, vitamins, prescription, pharmacy'],
    ['💉', 'health', 'vaccine, vaccination, jab, flu shot, injection, blood test'],
    ['💇', 'health', 'haircut, hair, hairdresser, barber, salon, nails, manicure'],
    ['👓', 'health', 'optician, glasses, eye test, contacts, eyes'],
    ['🧴', 'health', 'skincare, sunscreen, moisturiser, shower, bath'],
    // money and admin
    ['💸', 'money', 'pay, bill, bills, rent, invoice, tax, taxes, fine, pay back, refund'],
    ['🏦', 'money', 'bank, transfer, savings, mortgage, loan, account, budget'],
    ['🧾', 'money', 'receipt, receipts, expenses, claim, accounts'],
    ['📄', 'money', 'form, forms, paperwork, document, documents, sign, contract, application, apply, renew, passport, id, license, visa'],
    ['🛡️', 'money', 'insurance, policy'],
    // errands and fixing
    ['📦', 'errand', 'parcel, package, deliver, delivery, return, collect, pick up, post office, courier, order'],
    ['🚗', 'errand', 'car, mot, garage, parking, drive, drop off, lift'],
    ['⛽', 'errand', 'fuel, petrol, gas station, diesel, charge car'],
    ['🔧', 'errand', 'fix, repair, mend, plumber, handyman, assemble, install, screw, leak'],
    ['💡', 'errand', 'light bulb, lightbulb, bulb, battery, batteries, lamp, fuse, electrician'],
    ['🔑', 'errand', 'keys, key, lock, locksmith, landlord, move, moving'],
    // fitness
    ['🏃', 'fitness', 'run, running, jog, jogging, walk, hike, steps, exercise'],
    ['🏋️', 'fitness', 'gym, workout, weights, lift, train, training, crossfit'],
    ['🧘', 'fitness', 'yoga, stretch, meditate, meditation, pilates, breathe, relax'],
    ['🚴', 'fitness', 'cycle, cycling, bike, bicycle, ride'],
    ['🏊', 'fitness', 'swim, swimming, pool'],
    // work and study
    ['💻', 'work', 'work, report, laptop, code, coding, presentation, slides, deadline, project, boss, client, spreadsheet'],
    ['📚', 'work', 'study, homework, exam, revise, revision, essay, assignment, course, class, lecture, learn, read up'],
    ['📝', 'work', 'write, notes, note, plan, list, draft, journal, diary, review'],
    ['📅', 'work', 'meeting, schedule, book, booking, reserve, reservation, calendar, plan week, agenda, reschedule'],
    ['🖨️', 'work', 'print, scan, copy, photocopy'],
    // people
    ['🎂', 'social', 'birthday, bday, anniversary, cake for'],
    ['🎁', 'social', 'gift, present, wrap, wrap present, wedding gift'],
    ['🎉', 'social', 'party, celebrate, celebration, host, invite, invitations, wedding'],
    ['👋', 'social', 'visit, meet, friend, friends, catch up, family, mum, mom, dad, grandma, grandpa, oma, opa, brunch, dinner with, date'],
    // fun
    ['🎬', 'fun', 'movie, film, watch, series, show, netflix, cinema'],
    ['🎮', 'fun', 'game, games, play, gaming, level'],
    ['📖', 'fun', 'read, book, reading, chapter, novel, audiobook'],
    ['🎨', 'fun', 'draw, paint, art, craft, sketch, knit, crochet, sew, diy'],
    ['🎸', 'fun', 'guitar, piano, music, practise, practice, sing, song, instrument'],
    ['📷', 'fun', 'photo, photos, pictures, camera, album, backup photos'],
    // travel
    ['✈️', 'travel', 'flight, flights, fly, airport, airline, plane, check in, check-in'],
    ['🧳', 'travel', 'pack, packing, suitcase, luggage, bag, trip, holiday, vacation'],
    ['🏨', 'travel', 'hotel, hostel, airbnb, accommodation, stay'],
    ['🎫', 'travel', 'ticket, tickets, train, bus, concert, festival, event'],
    ['🗺️', 'travel', 'map, route, directions, itinerary, explore, sightseeing'],
    // looking after things
    ['🐕', 'care', 'dog, walk the dog, puppy, vet, groomer, groom, poop'],
    ['🐈', 'care', 'cat, litter, kitten, feed the cat'],
    ['🌱', 'care', 'plant, plants, water the plants, garden, gardening, mow, lawn, weed, flowers, repot, seeds'],
    ['🐠', 'care', 'fish, aquarium, feed fish, tank'],
    ['👶', 'care', 'baby, kid, kids, child, school, daycare, nursery, babysit'],
    // cooking
    ['🍳', 'cook', 'cook, cooking, meal prep, bake, baking, breakfast, lunch, dinner, supper, prepare, defrost, marinate'],
    ['🛒', 'cook', 'shopping, groceries, supermarket, buy food'],
    // when nothing matches
    ['📌', 'other', 'remember, remind, reminder, important, urgent, pin']
  ];
  // Dutch words for the same emoji (build 591). A word also finds longer forms ("opruim" finds "opruimen"), so stems work; very short ones must be a whole word.
  var NL = [
    ['🧹', 'schoonmaak, opruim, stofzuig, stofzuigen, afstoff, dweil, huishoud, klusjes, poets, aanvegen, rommel'], ['🧺', 'was doen, wassen, wasmachine, strijk, kleren opvouw, droger, wasgoed, ophangen'], ['🍽️', 'afwas, vaatwasser, afwassen, vaatwasser inruimen, vaatwasser uitruimen, tafel dekken, tafel afruimen'],
    ['🗑️', 'afval, vuilnis, vuilnisbak, kliko, container buiten, plastic buiten, glas wegbrengen, papier buiten, prullenbak'], ['🛏️', 'bed opmaken, bed verschonen, lakens, beddengoed, dekbed'], ['🧽', 'schrobben, dweilen, badkamer, toilet schoonmaken, keuken schoonmaken, auto wassen, wc schoonmaken'], ['🪟', 'ramen, ramen lappen, ramen zemen, zemen'],
    ['📞', 'bel, bellen, telefoon, terugbel, opbellen, skypen, facetimen'], ['📧', 'e-mail, email, mail, inbox, mailtje'], ['💬', 'app, appen, appje, whatsapp, bericht, sms, antwoord, reageren, stuur, sturen'], ['📮', 'post, brief, kaart sturen, ansichtkaart, postzegel, postbus, pakket versturen'],
    ['🦷', 'tandarts, tanden, poetsen, floss, mondhygiënist, gebit, tand'], ['🩺', 'dokter, huisarts, afspraak, controle, fysio, therapie, therapeut, specialist, ziekenhuis, check-up, uitslag'], ['💊', 'medicijn, pillen, pil, vitamines, recept, apotheek, tabletten, medicatie'], ['💉', 'vaccinatie, prik, griepprik, bloedprik, injectie, bloedonderzoek'],
    ['💇', 'kapper, haar, knippen, kapsalon, nagels, manicure, pedicure, wenkbrauwen, barbier'], ['👓', 'opticien, bril, brillen, oogtest, lenzen, oogarts'], ['🧴', 'huidverzorging, zonnebrand, crème, douchen, bad, scheren'],
    ['💸', 'betaal, betalen, rekening, huur, factuur, belasting, boete, terugbetal, tikkie, afbetal, abonnement opzeggen, hypotheek betalen'], ['🏦', 'bank, overmaken, sparen, spaargeld, hypotheek, lening, budget, pinpas, rekening openen'], ['🧾', 'bonnetje, bonnetjes, onkosten, declar, declaratie, kassabon, boekhouding'],
    ['📄', 'formulier, papierwerk, document, documenten, ondertekenen, contract, aanvraag, aanvragen, verleng, paspoort, identiteitskaart, rijbewijs, visum, belastingaangifte, aangifte, toeslagen, digid'], ['🛡️', 'verzekering, polis, zorgverzekering, autoverzekering, inboedel'],
    ['📦', 'pakket, pakketje, bezorg, retour, ophalen, postkantoor, postnl, dhl, bestelling, bestellen, afhaalpunt, afhalen'], ['🚗', 'auto, apk, garage, parkeren, rijden, wegbrengen, wegbrengen, autowas, banden, carwash'], ['⛽', 'tanken, benzine, diesel, laadpaal, opladen auto'],
    ['🔧', 'repareer, repareren, maak, maken, loodgieter, klusjesman, monteren, installeren, lekkage, ophangen, schilderen, klus'], ['💡', 'lamp, lampen, gloeilamp, batterij, batterijen, zekering, elektricien, lampje vervangen'], ['🔑', 'sleutels, sleutel, slot, slotenmaker, verhuurder, verhuizen, verhuizing'],
    ['🏃', 'hardlopen, rennen, joggen, wandelen, wandeling, hike, stappen, sporten, trainen, loop'], ['🏋️', 'sportschool, gym, workout, gewichten, fitness, krachttraining, crossfit, training'], ['🧘', 'yoga, rekken, mediteren, meditatie, pilates, ademhaling, ontspannen, ontspanning'], ['🚴', 'fietsen, fietstocht, fiets, wielrennen, spinning'], ['🏊', 'zwemmen, zwembad, baantjes, zwemles'],
    ['💻', 'werk, werken, rapport, laptop, code, coderen, presentatie, slides, deadline, project, baas, klant, spreadsheet, offerte, vergadering voorbereiden'], ['📚', 'studeren, leren, huiswerk, tentamen, examen, essay, opdracht, cursus, les, college, scriptie, leren voor, studie, oefenen'],
    ['📝', 'schrijf, schrijven, notities, notitie, plan, plannen, concept, dagboek, reflectie, nakijken, feedback'], ['📅', 'vergadering, overleg, afspraak maken, boeken, reserveren, reservering, agenda, verzetten, inplannen, plannen, meeting'], ['🖨️', 'printen, scannen, kopiëren, fotokopie, uitprinten'],
    ['🎂', 'verjaardag, jarig, jubileum, taart voor'], ['🎁', 'cadeau, cadeautje, kado, inpakken, bruiloftscadeau, sinterklaascadeau, kerstcadeau, surprise, cadeau kopen'], ['🎉', 'feest, feestje, vieren, borrel, uitnodigen, uitnodigingen, bruiloft, housewarming, receptie'],
    ['👋', 'bezoek, afspreken, vriend, vrienden, vriendin, bijpraten, familie, mama, papa, oma, opa, brunch, diner met, date, koffie met, lunchen met, borrelen, ouders, zus, broer'], ['🎬', 'film, films, kijken, serie, series, netflix, bioscoop, documentaire, aflevering, bingewatchen'], ['🎮', 'game, gamen, spelletje, spelen, spel, levelen'],
    ['📖', 'lezen, boek, hoofdstuk, roman, luisterboek, uitlezen, leesclub'], ['🎨', 'tekenen, schilderen, kunst, knutselen, schetsen, breien, haken, naaien, diy, kleuren'], ['🎸', 'gitaar, piano, muziek, oefenen, zingen, lied, instrument, drums, viool, blokfluit'], ['📷', 'foto, foto\'s, fotograferen, camera, album, fotoalbum, back-up foto\'s'],
    ['✈️', 'vlucht, vliegen, vliegveld, luchthaven, schiphol, vliegtuig, inchecken, vliegtickets'], ['🧳', 'inpakken, koffer, bagage, reis, reizen, vakantie, weekendje weg, rugzak, tas inpakken'], ['🏨', 'hotel, hostel, airbnb, accommodatie, overnachten, verblijf, camping, bungalow, b&b'], ['🎫', 'kaartje, kaartjes, tickets, ticket, trein, bus, concert, festival, evenement, ov-chipkaart, reisplanner, ns'],
    ['🗺️', 'kaart, route, routebeschrijving, reisplan, verkennen, bezienswaardigheden, stedentrip, plattegrond'], ['🐕', 'hond, hondje, uitlaten, puppy, dierenarts, trimmen, hondentrimmer, poep, hondenschool, de hond'], ['🐈', 'kat, katje, kattenbak, kitten, de kat voeren, katten'],
    ['🌱', 'plant, planten, planten water, water geven, tuin, tuinieren, maaien, gazon, onkruid, bloemen, verpotten, zaden, snoeien, plantjes, bloembak'], ['🐠', 'vis voeren, aquarium, vissen, visvoer, vijver'], ['👶', 'baby, kind, kinderen, kleuter, school, kinderopvang, crèche, oppassen, babysit, peuter, basisschool, verjaardagsfeestje kind, ouderavond'],
    ['🍳', 'koken, kook, bakken, ontbijt, lunch, avondeten, diner, voorbereiden, ontdooien, marineren, mealprep, meal prep, eten maken, stamppot'], ['🛒', 'boodschappen, supermarkt, albert heijn, jumbo, lidl, aldi, eten halen, markt, groenteboer, slager, bakker'],
    ['📌', 'onthouden, herinner, herinnering, belangrijk, dringend, niet vergeten, vergeet niet']
  ];
  NL.forEach(function (r) {
    var base = TASKS.filter(function (t) { return t[0] === r[0]; })[0];
    if (base) TASKS.push([r[0], base[1], r[1]]);
  });
  // emoji only the picker offers, with the kind they count as
  var EXTRA = [
    ['⭐', 'other'], ['✅', 'other'], ['❤️', 'social'], ['🔔', 'other'], ['🧠', 'work'], ['🏠', 'chore'], ['🔥', 'other'], ['🌙', 'other'],
    ['☎️', 'call'], ['📱', 'call'], ['🎓', 'work'], ['🏥', 'health'], ['🛍️', 'errand'], ['🧸', 'care'], ['🎒', 'travel'], ['🍰', 'cook'], ['⏰', 'other'], ['🧼', 'chore']
  ];
  var FALLBACK = { emoji: '📌', cat: 'other' };

  var index = [], seen = {}, kindOf = {}, ALL = [];
  TASKS.forEach(function (row) {
    if (!kindOf[row[0]]) { kindOf[row[0]] = row[1]; ALL.push(row[0]); }
    row[2].split(',').forEach(function (kw) {
      kw = root.Foods.normalize(kw);
      if (!kw || seen[kw]) return;
      seen[kw] = true;
      index.push({ kw: kw, emoji: row[0], cat: row[1], whole: kw.length <= 3 });
    });
  });
  EXTRA.forEach(function (e) { if (!kindOf[e[0]]) { kindOf[e[0]] = e[1]; ALL.push(e[0]); } });
  index.sort(function (a, b) { return b.kw.length - a.kw.length; });

  /**
   * Finds the emoji for a task using the longest keyword in it; anything else gets a pin.
   * @param {string} text
   * @returns {{emoji: string, cat: string, keyword: ?string}}
   */
  function match(text) {
    var norm = ' ' + root.Foods.normalize(text) + ' ';
    for (var i = 0; i < index.length; i++) {
      var k = index[i];
      if (norm.indexOf(' ' + k.kw + (k.whole ? ' ' : '')) !== -1) return { emoji: k.emoji, cat: k.cat, keyword: k.kw };
    }
    return { emoji: FALLBACK.emoji, cat: FALLBACK.cat, keyword: null };
  }

  root.Tasks = {
    match: match,
    categoryOf: function (emoji) { return kindOf[emoji] || 'other'; },
    all: ALL,
    kinds: ['chore', 'call', 'health', 'money', 'errand', 'fitness', 'work', 'social', 'fun', 'travel', 'care', 'cook', 'other']
  };
})(typeof self !== 'undefined' ? self : globalThis);
