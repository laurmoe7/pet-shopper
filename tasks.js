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
