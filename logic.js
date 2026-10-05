/* The app's rules, kept free of the page so they can be tested in Node.
 * Loaded as a classic script after foods.js; exposes the global `PetLogic`.
 */
(function (root) {
  'use strict';

  var Foods = root.Foods, Tasks = root.Tasks;

  /**
   * @typedef {Object} Item
   * @property {string} id
   * @property {string} text   What the person typed, e.g. "2x Bananas".
   * @property {string} emoji  The emoji shown for it.
   * @property {string} cat    Food category, e.g. "fruit", "drink", "nonfood", "mystery".
   * @property {boolean} done  True once checked off (eaten).
   * @property {number} [added]  When it was put on the list (ms since 1970). Older saves have none.
   */

  /**
   * @typedef {Object} PetProfile
   * @property {string} name
   * @property {string} species  One of the species ids, e.g. "mochi", "pig", "birdie".
   * @property {string} skin  The skin worn on the species (from skins.js), or "" for its original look.
   * @property {{hat: string, face: string, neck: string, feet: string}} outfit  Wardrobe item id per slot
   *   (hat, clothes, glasses, mouth, neck, feet; see OUTFIT_SLOTS); "none" for nothing.
   * @property {Object<string, Progress>} achievements  Progress per achievement id.
   * @property {Guard} guard  What the anti-cheat rules remember.
   * @property {string} personality  Id from personalities.js; "foodie" to start.
   * @property {Object<string, number>} tastes  How many of each food category it has eaten.
   * @property {Object<string, {x: number, y: number}>} room  Placed decor by id, with its
   *   spot in the room (0 to 1 across and down).
   * @property {Object<string, Favourite>} favourites  What has been bought most, by word.
   * @property {{day: string, used: string[]}} treats  Which free treats were fed today.
   */

  /**
   * @typedef {Object} Favourite
   * @property {string} label  The item's word, without quantities, ready to show.
   * @property {string} emoji
   * @property {number} count  Days it was bought on.
   * @property {string} day    The last day it counted (dayKey).
   */

  /**
   * @typedef {Object} Guard
   * @property {string} day       The calendar day the words list is for.
   * @property {string[]} words   Item words that already counted that day.
   * @property {number} lastSeen  The latest clock time seen when counting (ms).
   */

  /**
   * @typedef {Object} Progress
   * @property {number} count  Total counted towards the goal.
   * @property {string} day    The calendar day (YYYY-MM-DD) of the last count.
   * @property {number} today  How many were counted on that day.
   */

  /** Places on the pet where it can wear something, one item each: head, eyes, neck and feet. */
  var OUTFIT_SLOTS = ['hat', 'body', 'face', 'mouth', 'neck', 'feet'];

  /**
   * Reads a saved outfit, updating items that were renamed, moved or removed.
   * @param {Object} saved
   * @returns {{hat: string, body: string, face: string, mouth: string, neck: string, feet: string}}
   */
  function parseOutfit(saved) {
    var o = OUTFIT_SLOTS.reduce(function (out, slot) { out[slot] = saved[slot] || 'none'; return out; }, {});
    if (typeof saved.order === 'string' && saved.order) o.order = saved.order;   // the order things went on in (see faceStack)
    if (o.hat === 'hoodie') { o.body = 'hoodie'; o.hat = 'none'; }    // the hoodie moved from hats to clothes
    if (o.hat === 'mintphones') o.hat = 'headphones';               // the mint phones were removed
    if (o.feet === 'heels') o.feet = 'featherslides';                  // heels became feather slides
    if (o.neck === 'silkscarf' || o.neck === 'choker') o.neck = 'none'; // the silk scarf and the choker were removed
    if (o.neck === 'toast' || o.neck === 'mustache') {               // these moved from neck to mouth
      if (o.mouth === 'none') o.mouth = o.neck;
      o.neck = 'none';
    }
    return o;
  }
  /**
   * The wardrobe ids worn in one slot. A slot can hold several things at once: its value is their ids joined by commas
   * (or 'none'), so saves from before that still read fine.
   * @param {Object<string, string>} outfit
   * @param {string} slot
   * @returns {string[]}
   */
  function wornIds(outfit, slot) {
    return String((outfit && outfit[slot]) || '').split(',').filter(function (id) { return id && id !== 'none'; });
  }
  /**
   * Puts something on or takes it off in its slot (others in the same slot stay on, except shoes: one pair at a time);
   * 'none' takes the whole slot off.
   * @param {Object<string, string>} outfit  Changed in place.
   * @param {string} slot
   * @param {string} id
   * @returns {boolean} Whether it is worn now.
   */
  function toggleWorn(outfit, slot, id) {
    var order = (outfit.order || '').split(',').filter(Boolean);
    function drop(x) { var i = order.indexOf(x); if (i !== -1) order.splice(i, 1); }
    var worn;
    if (id === 'none') { wornIds(outfit, slot).forEach(drop); outfit[slot] = 'none'; worn = false; }
    else {
      var ids = wornIds(outfit, slot), at = ids.indexOf(id);
      if (at === -1) { if (slot === 'feet') { ids.forEach(drop); ids = []; } ids.push(id); order.push(id); }   // one pair of shoes at a time
      else { ids.splice(at, 1); drop(id); }
      outfit[slot] = ids.length ? ids.join(',') : 'none';
      worn = at === -1;
    }
    if (order.length) outfit.order = order.join(','); else delete outfit.order;
    return worn;
  }
  /**
   * The glasses and mouth things in the order they were put on, first at the bottom, so the next one goes on top of it
   * (whichever of the two it is). Things worn from before the order was kept go glasses first, then the mouth.
   * @param {Object<string, string>} outfit
   * @returns {{slot: string, id: string}[]}
   */
  function faceStack(outfit) {
    var order = (outfit.order || '').split(',').filter(Boolean);
    var all = wornIds(outfit, 'face').map(function (id) { return { slot: 'face', id: id }; })
      .concat(wornIds(outfit, 'mouth').map(function (id) { return { slot: 'mouth', id: id }; }));
    function rank(e) { var i = order.indexOf(e.id); return i === -1 ? order.length : i; }
    return all.map(function (e, n) { return { e: e, n: n }; })
      .sort(function (a, b) { return rank(a.e) - rank(b.e) || a.n - b.n; })
      .map(function (x) { return x.e; });
  }
  var SAMPLE = ['Bananas', 'Oat milk', '500g Quark', 'Broccoli', 'Chili flakes', 'Dark chocolate', 'Toilet paper', "Oma's cake"];

  /**
   * Finds the emoji for an item, preferring one the person picked for that word before.
   * @param {string} text
   * @param {Object<string, string>} overrides  Normalised item text -> picked emoji.
   * @param {string} [mode]  'todo' for the to-do list (tasks, not foods); anything else is the shopping list.
   * @returns {{emoji: string, cat: string}}
   */
  function emojiFor(text, overrides, mode) {
    var todo = mode === 'todo';
    var picked = overrides && overrides[Foods.normalize(text)];
    if (picked) return { emoji: picked, cat: todo ? Tasks.categoryOf(picked) : Foods.categoryOf(picked) };
    var m = todo ? Tasks.match(text) : Foods.match(text);
    return { emoji: m.emoji, cat: m.cat };
  }

  /**
   * Makes a new, unchecked list item.
   * @param {string} text
   * @param {Object<string, string>} overrides
   * @param {string} id
   * @param {number} [added]  When it was put on the list (ms); counts towards goals only after a while.
   * @param {string} [mode]  'todo' for a to-do item.
   * @returns {Item}
   */
  function createItem(text, overrides, id, added, mode) {
    var found = emojiFor(text, overrides, mode);
    var item = { id: id, text: text, emoji: found.emoji, cat: found.cat, done: false };
    if (typeof added === 'number') item.added = added;
    return item;
  }

  /**
   * Builds a complete pet profile from whatever was saved, filling in defaults.
   * Everything about the pet lives in this one object so it can later be stored
   * online and shared by a household. The pet's mood is not stored (see mood()).
   * @param {Object} [saved]
   * @returns {PetProfile}
   */
  function petProfile(saved) {
    saved = saved || {};
    // the chick and penguin became one species, the birdie, with the penguin as a skin
    var species = saved.species || 'mochi';
    var skin = typeof saved.skin === 'string' ? saved.skin : '';
    if (skin === 'syrian') skin = 'longhair';
    if (skin === 'yak' || skin === 'lionhead' || skin === 'tabby') skin = '';   // removed skins (the tabby became the plain cat in build 121)
    if (skin === 'flamepoint') skin = 'siamese';                                 // the flame point became the Siamese in build 135
    if (species === 'chick') species = 'birdie';
    else if (species === 'penguin') { species = 'birdie'; skin = 'penguin'; }
    return {
      name: typeof saved.name === 'string' ? saved.name : 'Nibble',
      species: species,
      skin: skin,
      outfit: parseOutfit(saved.outfit || {}),
      achievements: saved.achievements && typeof saved.achievements === 'object' ? saved.achievements : {},
      room: saved.room && typeof saved.room === 'object' ? saved.room : {},
      personality: saved.personality || 'foodie',
      tastes: saved.tastes && typeof saved.tastes === 'object' ? saved.tastes : {},
      // check-mark stamps from ticked tasks, by task kind (the stamp book)
      stamps: saved.stamps && typeof saved.stamps === 'object' ? saved.stamps : {},
      favourites: saved.favourites && typeof saved.favourites === 'object' ? saved.favourites : {},
      // the night it was put to bed (nightOf): asleep until something is checked off or the morning
      dozing: typeof saved.dozing === 'string' ? saved.dozing : '',
      treats: { day: (saved.treats && saved.treats.day) || '', used: (saved.treats && Array.isArray(saved.treats.used)) ? saved.treats.used : [] },
      guard: {
        day: (saved.guard && saved.guard.day) || '',
        words: (saved.guard && Array.isArray(saved.guard.words)) ? saved.guard.words : [],
        lastSeen: (saved.guard && saved.guard.lastSeen) || 0
      }
    };
  }

  /**
   * Turns saved JSON into app state. Missing or broken data gives a fresh state
   * with the sample shopping list, so the app always opens in a working state.
   * @param {?string} raw  The stored JSON string, or null.
   * @param {function(): string} nextId  Makes ids for sample items.
   * @returns {{items: Item[], mode: string, stash: Item[], overrides: Object<string,string>, quiet: boolean, lastOpen: number, pet: PetProfile}}
   */
  function parseState(raw, nextId) {
    var data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.items)) {
      data = { items: [], overrides: {}, quiet: false, lastOpen: 0 };
      SAMPLE.forEach(function (t) { data.items.push(createItem(t, data.overrides, nextId())); });
    }
    data.overrides = data.overrides || {};
    // the list on show (shopping or to-do) is state.items; the other one waits in state.stash
    data.mode = data.mode === 'todo' ? 'todo' : 'shop';
    if (!Array.isArray(data.stash)) data.stash = [];
    data.items.forEach(cleanTask);
    data.stash.forEach(cleanTask);
    data.pet = petProfile(data.pet);
    data.settings = settings(data.settings);
    // developer-only switches from the dev menu
    data.dev = { noWait: !!(data.dev && data.dev.noWait) };
    return data;
  }

  /**
   * @typedef {Object} Settings  Options from the gear menu. They belong to this
   *   phone, not to the pet.
   * @property {boolean} sounds       Eating sounds and squeaks.
   * @property {boolean} vibration    A little buzz on taps (phones that support it).
   * @property {boolean} daydreams    Thought clouds about the list.
   * @property {boolean} suggestions  The pet now and then asks for something to add.
   * @property {boolean} fairPlayTips Messages about the fair-play rules, like
   *   "items count after 15 min". The rules still apply when this is off.
   * @property {boolean} goalToasts   The progress label under the pet after a bite.
   * @property {boolean} cardboard    The cardboard-and-stickers look (off = the classic pink look).
   * @property {boolean} time24      Times on tasks as 14:30 (off: 2:30 PM).
   * @property {boolean} aisles      The shopping list is shown grouped by shop aisle.
   */

  /** The settings a new phone starts with: everything on. */
  var DEFAULT_SETTINGS = { sounds: true, vibration: true, daydreams: true, suggestions: true, fairPlayTips: true, goalToasts: true, cardboard: true, time24: true, aisles: true };

  /**
   * Fills in any settings missing from what was saved.
   * @param {Object} [saved]
   * @returns {Settings}
   */
  function settings(saved) {
    var out = {};
    Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
      out[k] = saved && typeof saved[k] === 'boolean' ? saved[k] : DEFAULT_SETTINGS[k];
    });
    // sounds, daydreams and suggestions are always on now (there is no switch for them; quiet mode mutes sound)
    out.sounds = out.daydreams = out.suggestions = true;
    return out;
  }

  /**
   * Works out the pet's resting mood from the list.
   * @param {Item[]} items
   * @returns {'sleepy'|'curious'|'happy'|'stuffed'}
   */
  function mood(items) {
    var total = items.length;
    var eaten = items.filter(function (i) { return i.done; }).length;
    if (!total) return 'sleepy';
    if (eaten === total) return 'stuffed';
    if (eaten > 0) return 'happy';
    return 'curious';
  }

  /**
   * @param {Date} now
   * @returns {boolean} Whether it is night (10 pm to 7 am), when the pet sleeps if there is nothing left to buy.
   */
  function isNight(now) {
    var h = now.getHours();
    return h >= 22 || h < 7;
  }

  /**
   * The pet's resting mood: from the list (curious with an empty list, full after a finished one), but asleep
   * once it has been put to bed tonight (the lamp switched off and tucked in, which sets dozing). Night alone
   * doesn't make it sleep. Adding to the list doesn't wake it; checking something off (which clears dozing) does,
   * and so does the morning.
   * @param {Item[]} items
   * @param {Date} now
   * @param {string} [dozing] The night it was put to bed (pet.dozing), if it was.
   * @returns {string}
   */
  function restingMood(items, now, dozing) {
    if (dozing && isNight(now) && dozing === nightOf(now)) return 'sleepy';
    var m = mood(items);
    return m === 'sleepy' ? 'curious' : m;
  }


  // ---------- to-do dates ----------
  // A task can have a due day ('YYYY-MM-DD', the same form as dayKey) and a repeat; ticking a repeating task puts
  // the next one back on the list.
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  /** The ways a task can repeat, with the days or months each step moves on. */
  var REPEATS = [
    { id: '', label: 'Never' },
    { id: 'daily', label: 'Every day', days: 1 },
    { id: 'every3', label: 'Every 3 days', days: 3 },
    { id: 'weekly', label: 'Every week', days: 7 },
    { id: 'monthly', label: 'Every month', months: 1 },
    { id: 'yearly', label: 'Every year', months: 12 }
  ];
  /** @returns {boolean} Whether this is a due day in the form YYYY-MM-DD. */
  function isDayKey(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  /** @returns {boolean} Whether this is a time of day in the form HH:MM (24 hours). */
  function isTimeKey(s) { return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }
  /** @returns {Date} The day as a local date (at noon, so clock changes never move it). */
  function dayDate(key) { return new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10), 12); }
  /** @returns {string} The day n days after this one (n can be negative). */
  function addDays(key, n) { var d = dayDate(key); d.setDate(d.getDate() + n); return dayKey(d); }
  /** @returns {string} The day n months after this one, kept inside the month (31 Jan + 1 month = 28/29 Feb). */
  function addMonths(key, n) {
    var d = dayDate(key), day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return dayKey(d);
  }
  /** @returns {number} How many days from today until the due day (negative once it is past). */
  function daysUntil(due, today) { return Math.round((dayDate(due) - dayDate(today)) / 86400000); }
  /**
   * How a due day looks on a task: a short label, and how pressing it is.
   * @param {string} due
   * @param {string} today
   * @param {string} [time]  The time it is due (HH:MM), if it has one.
   * @param {string} [clock]  The time now (HH:MM): a task due today turns overdue once its time has passed.
   * @returns {{days: number, state: 'overdue'|'today'|'soon'|'later', label: string}}
   */
  function dueInfo(due, today, time, clock) {
    var n = daysUntil(due, today), d = dayDate(due), at = isTimeKey(time) ? ' ' + time : '';
    if (n < 0) return { days: n, state: 'overdue', label: n === -1 ? 'yesterday' : -n + 'd late' };
    if (n === 0) return { days: n, state: at && clock && clock >= time ? 'overdue' : 'today', label: 'today' + at };
    if (n === 1) return { days: n, state: 'soon', label: 'tomorrow' + at };
    return { days: n, state: n <= 2 ? 'soon' : 'later', label: (n <= 6 ? WEEKDAYS[d.getDay()] : d.getDate() + ' ' + MONTHS[d.getMonth()]) + at };
  }
  /**
   * The next day a repeating task is due: one step after its due day, and always after today (a task that was
   * ticked weeks late comes back on its next regular day, not in the past).
   * @param {?string} due  Its due day, if it had one.
   * @param {string} repeat  A REPEATS id.
   * @param {string} today
   * @returns {string}
   */
  function nextDue(due, repeat, today) {
    var r = REPEATS.filter(function (x) { return x.id === repeat; })[0];
    var base = isDayKey(due) ? due : today;
    if (!r || !r.id) return base;
    var k = 1, next;
    do {
      next = r.months ? addMonths(base, r.months * k) : addDays(base, r.days * k);
      k++;
    } while (next <= today && k < 4000);
    return next;
  }
  /**
   * Puts the open tasks in due order: late ones, then today's, then the undated ones (they are not for any later day,
   * so they stay near the top), then later days in order; the same order as before within a tie. Done ones stay at the end.
   * Without `today` the undated ones go last.
   * @param {Item[]} items
   * @param {string} [today]
   * @returns {Item[]} A new list.
   */
  function sortByDue(items, today) {
    var none = today ? today + ' 99:99' : '9999-99-99';
    var open = items.filter(function (i) { return !i.done; }).map(function (i, n) { return { i: i, n: n }; });
    var done = items.filter(function (i) { return i.done; });
    open.sort(function (a, b) {
      var x = a.i.due ? a.i.due + ' ' + (a.i.time || '24:00') : none, y = b.i.due ? b.i.due + ' ' + (b.i.time || '24:00') : none;
      return x < y ? -1 : x > y ? 1 : a.n - b.n;
    });
    return open.map(function (o) { return o.i; }).concat(done);
  }
  /**
   * Turns what was said into list items: "milk, eggs and bread" becomes three. The shopping list also splits on
   * "and"/"en"/"plus"; the to-do list only on commas and "then"/"daarna", because a task like "call mum and dad" is one.
   * @param {string} text  The recognised speech.
   * @param {'shop'|'todo'} [mode]
   * @returns {string[]} Up to 20 items, first letter capitalised, nothing empty.
   */
  function splitSpoken(text, mode) {
    var parts = String(text || '').split(mode === 'todo' ? /[,;]|\b(?:and then|then|daarna|en dan)\b/i : /[,;]|\b(?:and then|and|en|plus|also|then|daarna)\b/i);
    var out = [];
    parts.forEach(function (p) {
      p = p.replace(/^[\s.!?\u2026]+|[\s.!?\u2026]+$/g, '').replace(/^(?:add|please add|toevoegen|voeg toe)\s+/i, '').trim();
      if (!p) return;
      p = p.charAt(0).toUpperCase() + p.slice(1);
      out.push(p.slice(0, 80));
    });
    return out.slice(0, 20);
  }

  /** The shop aisles the shopping list can be grouped into, in the order you walk round a shop. */
  var AISLES = [
    { id: 'produce', label: 'Fruit & veg', emoji: '🥬' },
    { id: 'bakery', label: 'Bakery', emoji: '🍞' },
    { id: 'meat', label: 'Meat & fish', emoji: '🥩' },
    { id: 'dairy', label: 'Dairy & eggs', emoji: '🧀' },
    { id: 'pantry', label: 'Pantry', emoji: '🥫' },
    { id: 'drinks', label: 'Drinks', emoji: '🥤' },
    { id: 'treats', label: 'Treats', emoji: '🍫' },
    { id: 'home', label: 'Household', emoji: '🧽' },
    { id: 'health', label: 'Health', emoji: '💊' },
    { id: 'other', label: 'Other', emoji: '🛍️' }
  ];
  var PANTRY_PROTEIN = ['🫘', '🧆', '🥜', '🌰'];   // beans, falafel, nuts and seeds live in the pantry aisle, not with the meat
  /**
   * Which aisle an item belongs in, from its emoji (so a picked emoji moves it too).
   * @param {Item} item
   * @returns {string} An AISLES id.
   */
  function aisleOf(item) {
    var cat = Foods.categoryOf(item.emoji);
    if (cat === 'fruit' || cat === 'veg') return 'produce';
    if (cat === 'baked') return 'bakery';
    if (cat === 'protein') return PANTRY_PROTEIN.indexOf(item.emoji) !== -1 ? 'pantry' : 'meat';
    if (cat === 'dairy') return 'dairy';
    if (cat === 'pantry' || cat === 'spicy') return 'pantry';
    if (cat === 'drink') return 'drinks';
    if (cat === 'sweets') return 'treats';
    if (cat === 'nonfood') { var k = Foods.kindOf(item.emoji); return k === 'home' || k === 'health' ? k : 'other'; }
    return 'other';
  }
  /**
   * Groups items by aisle, in shop order; items keep their list order inside an aisle. Aisles with nothing in them are left out.
   * @param {Item[]} items
   * @returns {{aisle: {id: string, label: string, emoji: string}, items: Item[]}[]}
   */
  function groupByAisle(items) {
    return AISLES.map(function (a) {
      return { aisle: a, items: items.filter(function (i) { return aisleOf(i) === a.id; }) };
    }).filter(function (g) { return g.items.length; });
  }
  /**
   * The days of a month for a calendar, Monday first: whole weeks, with the days of the neighbouring months filling the ends.
   * @param {number} year
   * @param {number} month  0 to 11.
   * @returns {{day: string, inMonth: boolean}[]} 35 or 42 days.
   */
  function monthGrid(year, month) {
    var first = new Date(year, month, 1, 12), pad = (first.getDay() + 6) % 7;
    var count = Math.ceil((pad + new Date(year, month + 1, 0).getDate()) / 7) * 7;
    var out = [], start = dayKey(first);
    for (var i = 0; i < count; i++) {
      var day = addDays(start, i - pad);
      out.push({ day: day, inMonth: +day.slice(5, 7) - 1 === month });
    }
    return out;
  }
  var PLAN_AHEAD_DAYS = 10;   // a plan further away than this stays in the calendar until it gets close
  /** @returns {boolean} Whether this open task is further away than PLAN_AHEAD_DAYS (so the to-do list hides it). */
  function isFarOff(item, today) { return !!item.due && !item.done && daysUntil(item.due, today) > PLAN_AHEAD_DAYS; }
  /** @returns {Item[]} The tasks due on this day, open ones first. */
  function tasksOn(items, day) {
    var on = items.filter(function (i) { return i.due === day; });
    return on.filter(function (i) { return !i.done; }).concat(on.filter(function (i) { return i.done; }));
  }
  /**
   * Adds (or with a negative n takes back) check-mark stamps for a kind of task. Never below zero.
   * @param {Object} profile
   * @param {string} kind
   * @param {number} n
   * @returns {number} How many stamps of that kind it has now.
   */
  function addStamp(profile, kind, n) {
    if (!profile.stamps) profile.stamps = {};
    var now = Math.max(0, (profile.stamps[kind] || 0) + n);
    if (now) profile.stamps[kind] = now; else delete profile.stamps[kind];
    return now;
  }
  /** @returns {number} All the stamps in the book. */
  function stampTotal(profile) {
    var s = profile.stamps || {};
    return Object.keys(s).reduce(function (n, k) { return n + (s[k] || 0); }, 0);
  }
  /** Drops a due day or repeat that isn't valid (from old or damaged saves). */
  function cleanTask(item) {
    if (item && item.due !== undefined && !isDayKey(item.due)) delete item.due;
    if (item && item.time !== undefined && (!item.due || !isTimeKey(item.time))) delete item.time;
    if (item && item.repeat !== undefined && (!item.due || !REPEATS.some(function (r) { return r.id && r.id === item.repeat; }))) delete item.repeat;
    return item;
  }

  /**
   * Adds an item at the end of the to-buy part of the list (above eaten items).
   * @param {Item[]} items  Changed in place.
   * @param {Item} item
   * @returns {Item[]} The same array.
   */
  function addToList(items, item) {
    var todoCount = items.filter(function (i) { return !i.done; }).length;
    items.splice(todoCount, 0, item);
    return items;
  }

  /**
   * Checks an item off or puts it back. A checked item moves to the bottom of the
   * eaten list; a put-back item moves to the bottom of the to-buy list.
   * @param {Item[]} items
   * @param {string} id
   * @returns {{items: Item[], item: ?Item}} The new list and the changed item (null if not found).
   */
  function toggleDone(items, id) {
    var item = null;
    items.forEach(function (i) { if (i.id === id) item = i; });
    if (!item) return { items: items, item: null };
    item.done = !item.done;
    var rest = items.filter(function (i) { return i !== item; });
    if (item.done) rest.push(item);
    else addToList(rest, item);
    return { items: rest, item: item };
  }

  /**
   * Remembers an emoji the person picked for an item's word and applies it to
   * every item on the list with the same word.
   * @param {{items: Item[], overrides: Object<string,string>}} state  Changed in place.
   * @param {string} id
   * @param {string} emoji
   * @returns {boolean} False if no item has that id.
   */
  function pickEmoji(state, id, emoji) {
    var target = null;
    state.items.forEach(function (i) { if (i.id === id) target = i; });
    if (!target) return false;
    var key = Foods.normalize(target.text);
    state.overrides[key] = emoji;
    var catOf = state.mode === 'todo' ? Tasks.categoryOf : Foods.categoryOf;
    state.items.forEach(function (i) {
      if (Foods.normalize(i.text) === key) { i.emoji = emoji; i.cat = catOf(emoji); }
    });
    return true;
  }

  // Which sound each food makes. Specific emojis first, then the food category.
  var EMOJI_SOUNDS = {
    slurp: '🍜🍲🍛🥣🍝🧋🫗🥫',
    sip: '☕🍵🍼',
    crunch: '🍎🍏🍐🥕🥒🥦🫑🌽🥬🥗🥨🍪🥜🌰🍟🍿🍘🫓🥖🧅🧄',
    squish: '🍌🥑🍑🥭🍓🫐🍇🍅🍦🧀🧈🥚🍰🎂🧁🍮🍡🍞🥯🥐🥞🧇🍠🥔🍄🫘'
  };
  var CAT_SOUNDS = { fruit: 'squish', veg: 'crunch', sweets: 'sweet', spicy: 'spicy', drink: 'glug', baked: 'squish', dairy: 'squish', protein: 'chomp', pantry: 'chomp', mystery: 'mystery', nonfood: 'huh' };

  /**
   * Chooses the eating sound for an item (a Sounds.play kind).
   * Sweets, spicy food, non-food and mystery items always use their category sound.
   * @param {{emoji: string, cat: string}} item
   * @returns {string}
   */
  function soundFor(item) {
    if (item.cat === 'sweets' || item.cat === 'spicy' || item.cat === 'nonfood' || item.cat === 'mystery') return CAT_SOUNDS[item.cat];
    for (var kind in EMOJI_SOUNDS) if (EMOJI_SOUNDS[kind].indexOf(item.emoji) !== -1) return kind;
    return CAT_SOUNDS[item.cat] || 'chomp';
  }

  // ---------- achievements ----------

  /**
   * The phone's local calendar day, used to reset the daily limits at midnight.
   * @param {Date} date
   * @returns {string} e.g. "2026-10-02"
   */
  /**
   * @param {Date} now
   * @returns {string} The night this moment belongs to, named by the evening it started (an hour after
   * midnight is still the night before), so a tuck-in lasts until morning.
   */
  function nightOf(now) { return dayKey(new Date(now.getTime() - 12 * 3600 * 1000)); }

  function dayKey(date) {
    var m = date.getMonth() + 1, d = date.getDate();
    return date.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }

  /**
   * @param {Object} ach  An entry from achievements.js.
   * @param {{emoji: string, cat: string}} item
   * @returns {boolean} True if eating this item counts towards the achievement.
   */
  function countsFor(ach, item) {
    if (!ach.foods) return false;
    if (ach.foods.emojis && ach.foods.emojis.indexOf(item.emoji) !== -1) return true;
    return !!(ach.foods.cats && ach.foods.cats.indexOf(item.cat) !== -1);
  }

  /**
   * Adds one to an achievement unless it is finished or today's limit is used up.
   * @param {PetProfile} profile  Changed in place.
   * @param {Object} ach
   * @param {string} today  dayKey of now.
   * @returns {'counted'|'capped'|'done'}
   */
  function bump(profile, ach, today) {
    var p = profile.achievements[ach.id] || { count: 0, day: today, today: 0 };
    if (p.count >= ach.goal) return 'done';
    if (p.day !== today) { p.day = today; p.today = 0; }
    if (p.today >= ach.perDay) return 'capped';
    p.count++;
    p.today++;
    profile.achievements[ach.id] = p;
    return 'counted';
  }

  // ---------- fair play ----------
  // Goals should reward real shopping, so a few rules stop the quick tricks.

  /** An item has to sit on the list this long before eating it counts (15 minutes). */
  var FRESH_MS = 15 * 60 * 1000;
  /** How far the clock may slip backwards (e.g. a network time fix) before counting pauses. */
  var CLOCK_SLACK_MS = 10 * 60 * 1000;
  /** A finished list counts as a shopping trip only with at least this many items. */
  var TRIP_MIN_ITEMS = 3;

  /**
   * @param {Item} item
   * @returns {string} The word that identifies the item for the once-a-day rule.
   */
  function wordOf(item) { return item.text ? Foods.normalize(item.text) : item.emoji; }

  /**
   * @param {Item} item
   * @param {Date} now
   * @returns {boolean} True if the item was on the list long enough to count.
   *   Items from older saves, with no time, count.
   */
  function isFresh(item, now) {
    return typeof item.added !== 'number' || now.getTime() - item.added >= FRESH_MS;
  }

  /**
   * Checks the phone's clock against the latest time seen. If it went back,
   * counting pauses until real time catches up, so changing the date doesn't help.
   * @param {PetProfile} profile  Changed in place: remembers the latest time.
   * @param {Date} now
   * @returns {boolean} True if the clock looks fine.
   */
  function clockOk(profile, now) {
    var t = now.getTime();
    if (t < profile.guard.lastSeen - CLOCK_SLACK_MS) return false;
    if (t > profile.guard.lastSeen) profile.guard.lastSeen = t;
    return true;
  }

  /**
   * @param {PetProfile} profile
   * @param {string} today  dayKey of now.
   * @returns {string[]} The words that already counted today (reset on a new day).
   */
  function wordsToday(profile, today) {
    if (profile.guard.day !== today) { profile.guard.day = today; profile.guard.words = []; }
    return profile.guard.words;
  }

  /**
   * @typedef {Object} RecordResult
   * @property {string[]} counted   Achievement ids that went up by one.
   * @property {string[]} capped    Achievement ids that matched but hit today's limit.
   * @property {Object[]} unlocked  Achievements finished by this, with their rewards.
   * @property {?string} blocked    Why nothing counted: 'too-fast' (just added),
   *   'repeat' (same word already counted today), 'clock' (clock went back),
   *   'small-trip' (list too short), or null.
   */

  /**
   * Counts an eaten item towards every matching achievement, within the daily
   * limits and the fair-play rules.
   * @param {PetProfile} profile  Changed in place.
   * @param {Item} item
   * @param {Date} now
   * @param {Object[]} achievements  The list from achievements.js.
   * @returns {RecordResult}
   */
  function recordEaten(profile, item, now, achievements) {
    var matching = achievements.filter(function (a) { return countsFor(a, item); });
    if (!matching.length) return result(null);
    if (!clockOk(profile, now)) return result('clock');
    if (!isFresh(item, now)) return result('too-fast');
    var today = dayKey(now);
    var words = wordsToday(profile, today);
    var word = wordOf(item);
    if (words.indexOf(word) !== -1) return result('repeat');
    var out = record(profile, today, matching);
    if (out.counted.length) words.push(word);
    return out;
  }

  /**
   * Counts a finished shopping trip (whole list eaten) towards trip achievements.
   * Only lists with enough items that were on the list for a while count.
   * @param {PetProfile} profile  Changed in place.
   * @param {Item[]} items  The finished list.
   * @param {Date} now
   * @param {Object[]} achievements
   * @returns {RecordResult}
   */
  function recordTrip(profile, items, now, achievements) {
    var matching = achievements.filter(function (a) { return a.trips; });
    if (!matching.length) return result(null);
    if (!clockOk(profile, now)) return result('clock');
    var real = items.filter(function (i) { return isFresh(i, now); }).length;
    if (real < TRIP_MIN_ITEMS) return result('small-trip');
    return record(profile, dayKey(now), matching);
  }

  /**
   * @param {?string} blocked
   * @returns {RecordResult} An empty result.
   */
  function result(blocked) { return { counted: [], capped: [], unlocked: [], blocked: blocked }; }

  /**
   * @param {PetProfile} profile
   * @param {string} today  dayKey of now.
   * @param {Object[]} matching  Achievements to bump.
   * @returns {RecordResult}
   */
  function record(profile, today, matching) {
    var out = result(null);
    matching.forEach(function (ach) {
      var r = bump(profile, ach, today);
      if (r === 'counted') {
        out.counted.push(ach.id);
        if (profile.achievements[ach.id].count >= ach.goal) out.unlocked.push(ach);
      } else if (r === 'capped') {
        out.capped.push(ach.id);
      }
    });
    return out;
  }

  /**
   * Takes back counts when an item is put back on the list the same day, so checking
   * and unchecking cannot be used to farm progress. Finished achievements stay finished.
   * @param {PetProfile} profile  Changed in place.
   * @param {Item} item  The item being put back, with the `counted` ids and
   *   `countedDay` the app stored when it was eaten.
   * @param {Date} now
   * @param {Object[]} achievements
   */
  function refundEaten(profile, item, now, achievements) {
    var today = dayKey(now);
    var ids = item.counted;
    if (!ids || !ids.length || item.countedDay !== today) return;
    ids.forEach(function (id) {
      var ach = achievements.filter(function (a) { return a.id === id; })[0];
      var p = profile.achievements[id];
      if (!ach || !p || p.count >= ach.goal || p.day !== today || p.today <= 0) return;
      p.count--;
      p.today--;
    });
    if (profile.guard.day === today) {
      var at = profile.guard.words.indexOf(wordOf(item));
      if (at !== -1) profile.guard.words.splice(at, 1);
    }
  }

  /**
   * Where an achievement stands right now.
   * @param {PetProfile} profile
   * @param {Object} ach
   * @param {Date} now
   * @returns {{count: number, goal: number, today: number, perDay: number, done: boolean}}
   */
  function progress(profile, ach, now) {
    var p = profile.achievements[ach.id] || { count: 0, day: '', today: 0 };
    var count = Math.min(p.count, ach.goal);
    return {
      count: count,
      goal: ach.goal,
      today: p.day === dayKey(now) ? p.today : 0,
      perDay: ach.perDay,
      done: count >= ach.goal
    };
  }

  /**
   * Whether a species or hat can be used. Free items always can; items that an
   * achievement unlocks need that achievement finished; anything else is open.
   * @param {PetProfile} profile
   * @param {'species'|'skin'|'hat'} kind
   * @param {string} id
   * @param {Object[]} achievements
   * @param {{all?: boolean, species: string[], skin: string[], hat: string[]}} free  With `all`, everything is open.
   * @returns {boolean}
   */
  function isUnlocked(profile, kind, id, achievements, free) {
    if (free && free.all) return true;
    if (free[kind] && free[kind].indexOf(id) !== -1) return true;
    // a species is also usable once one of its skins has been earned
    if (kind === 'species' && achievements.some(function (a) {
      var p = profile.achievements[a.id];
      return a.unlocks && a.unlocks.kind === 'skin' && a.unlocks.base === id && !!p && p.count >= a.goal;
    })) return true;
    var gate = achievements.filter(function (a) { return a.unlocks && a.unlocks.kind === kind && a.unlocks.id === id; })[0];
    if (!gate) return true;
    var p = profile.achievements[gate.id];
    return !!p && p.count >= gate.goal;
  }

  /**
   * The achievement that unlocks a species or hat, if any.
   * @param {'species'|'hat'} kind
   * @param {string} id
   * @param {Object[]} achievements
   * @returns {?Object}
   */
  function gateFor(kind, id, achievements) {
    return achievements.filter(function (a) { return a.unlocks && a.unlocks.kind === kind && a.unlocks.id === id; })[0] || null;
  }

  // ---------- personalities ----------

  /**
   * Counts an eaten food towards the personalities. Like goals, it only counts
   * once the item has been on the list for a while.
   * @param {PetProfile} profile  Changed in place.
   * @param {Item} item
   * @param {Date} now
   * @returns {boolean} True if it counted (the app keeps this to undo it).
   */
  function recordTaste(profile, item, now) {
    if (item.cat === 'nonfood' || item.cat === 'mystery' || !isFresh(item, now)) return false;
    profile.tastes[item.cat] = (profile.tastes[item.cat] || 0) + 1;
    return true;
  }

  /**
   * Takes a taste back when an eaten item is put back on the list.
   * @param {PetProfile} profile  Changed in place.
   * @param {Item} item
   */
  function refundTaste(profile, item) {
    if (profile.tastes[item.cat] > 0) profile.tastes[item.cat]--;
  }

  /**
   * How close a personality is to unlocking.
   * @param {PetProfile} profile
   * @param {Object} personality  An entry from personalities.js.
   * @returns {{count: number, goal: number, done: boolean}}
   */
  function personalityProgress(profile, personality) {
    if (!personality.earn) return { count: 0, goal: 0, done: true };
    var count = personality.earn.cats.reduce(function (n, c) { return n + (profile.tastes[c] || 0); }, 0);
    var goal = personality.earn.count;
    return { count: Math.min(count, goal), goal: goal, done: count >= goal };
  }

  /**
   * @param {Object} personality
   * @param {{cat: string}} item
   * @returns {boolean} True if this personality gets excited about the item.
   */
  function likes(personality, item) {
    return !!personality && personality.likes.indexOf(item.cat) !== -1;
  }

  /**
   * Picks something for the pet to ask for: one of its personality's favourites
   * that isn't already on the list.
   * @param {Object} personality
   * @param {Item[]} items  The current list.
   * @param {function(): number} [random]  Defaults to Math.random.
   * @returns {?string} The item text, or null if everything is already on the list.
   */
  function suggestion(personality, items, random) {
    var have = items.filter(function (i) { return !i.done; }).map(function (i) { return Foods.normalize(i.text); });
    var options = personality.suggests.filter(function (t) { return have.indexOf(Foods.normalize(t)) === -1; });
    if (!options.length) return null;
    return options[Math.floor((random || Math.random)() * options.length)];
  }

  // ---------- pet name ----------

  /** Taps closer together than this (ms) count as a double-tap. */
  var DOUBLE_TAP_MS = 400;

  /**
   * @param {number} last  Time of the previous tap (0 if none).
   * @param {number} now
   * @returns {boolean} True if this tap completes a double-tap.
   */
  function isDoubleTap(last, now) {
    return last > 0 && now - last >= 0 && now - last <= DOUBLE_TAP_MS;
  }

  /**
   * Tidies a typed name: trimmed, at most 16 characters, and the old name if left empty.
   * @param {string} typed
   * @param {string} old
   * @returns {string}
   */
  function cleanName(typed, old) {
    var name = String(typed || '').trim().slice(0, 16).trim();
    return name || old || 'Nibble';
  }

  /** Species that are birds: they talk and eat with a beak, so they have no mouth. Add new birds here. */
  var BIRDS = ['birdie'];

  /**
   * @param {string} species
   * @returns {boolean}
   */
  function isBird(species) { return BIRDS.indexOf(species) !== -1; }

  // ---------- how the pet talks ----------

  /**
   * Gives a line the personality's tone (see `voice.style` in personalities.js).
   * @param {Object} personality
   * @param {string} text
   * @param {function(): number} [random]
   * @param {boolean} [own] True for the personality's own lines, which already
   *   sound right: they only get the case and '!' changes, no extra endings.
   * @returns {string}
   */
  function styleLine(personality, text, random, own) {
    var st = personality && personality.voice && personality.voice.style;
    if (!st || !text) return text;
    var rnd = random || Math.random;
    var out = text;
    if (st.lower) out = out.toLowerCase();
    if (st.bang && st.bang !== '!') out = out.replace(/!+/g, st.bang);
    if (own) return out;
    var ended = /[?♡…]$|zzz$/.test(out) || st.endings.some(function (e) { return out.slice(-e.length) === e; });
    if (!ended && st.endings.length && rnd() < 0.4) {
      out = out.replace(/[.!~]+$/, '') + st.endings[Math.floor(rnd() * st.endings.length)];
    }
    if (st.prefixes.length && rnd() < 0.2) {
      var pre = st.prefixes[Math.floor(rnd() * st.prefixes.length)];
      if (out.indexOf(pre.trim()) !== 0) out = pre + out;
    }
    return out;
  }

  /**
   * Turns a line into sleep-talk: quiet, slow and mumbly, for when the pet talks with its eyes shut.
   * @param {string} text
   * @param {function(): number} [random]
   * @returns {string}
   */
  function sleepTalk(text, random) {
    var rnd = random || Math.random;
    var out = String(text || '').toLowerCase().trim();
    if (!out) return out;
    out = out.replace(/[!?.~♡…\s]+$/, '').replace(/!+/g, '…');
    var words = out.split(' ');
    // drift off in the middle of a longer line
    if (words.length > 2 && rnd() < 0.5) words[0] = words[0].replace(/[,.;:]+$/, '') + '…';
    out = words.join(' ') + '…';
    var r = rnd();
    if (/^(zzz|\*|mm)/.test(out)) return out;
    if (r < 0.35) return 'mm… ' + out;
    if (r < 0.6) return '*mumble* ' + out;
    if (r < 0.85) return out + ' zzz';
    return out;
  }

  /**
   * Picks the personality's own line for a moment, or one of the fallbacks.
   * @param {Object} personality
   * @param {string} key  e.g. 'tap', 'suggest', 'dream'.
   * @param {string[]} fallback  Used when the personality has no lines for it.
   * @param {Object<string, string>} [vars]  Filled in for {x}, {name}, …
   * @param {function(): number} [random]
   * @returns {string}
   */
  function voiceLine(personality, key, fallback, vars, random) {
    var rnd = random || Math.random;
    var own = personality && personality.voice && personality.voice[key];
    var list = own && own.length ? own : fallback;
    var text = list[Math.floor(rnd() * list.length)].replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] != null ? vars[k] : m;
    });
    return text.split('\n').map(function (part) {
      return styleLine(personality, part, rnd, !!(own && own.length));
    }).join('\n');
  }

  // ---------- developer tools ----------
  // Shortcuts for testing from the dev menu. Not used in normal play.

  /**
   * Finishes every goal and earns every personality.
   * @param {PetProfile} profile  Changed in place.
   * @param {Object[]} achievements
   * @param {Object[]} personalities
   */
  function unlockAll(profile, achievements, personalities) {
    achievements.forEach(function (a) {
      var p = profile.achievements[a.id] || { day: '', today: 0 };
      profile.achievements[a.id] = { count: a.goal, day: p.day, today: p.today };
    });
    personalities.forEach(function (pers) {
      if (!pers.earn) return;
      var have = pers.earn.cats.reduce(function (n, c) { return n + (profile.tastes[c] || 0); }, 0);
      if (have < pers.earn.count) {
        var c = pers.earn.cats[0];
        profile.tastes[c] = (profile.tastes[c] || 0) + pers.earn.count - have;
      }
    });
  }

  /**
   * Wipes all goal progress, tastes and fair-play memory, so everything locked is locked again.
   * The species, hat and personality in use are kept if free, otherwise go back to the defaults.
   * @param {PetProfile} profile  Changed in place.
   * @param {Object[]} achievements
   * @param {{species: string[], hat: string[]}} free
   */
  function lockAll(profile, achievements, free) {
    profile.achievements = {};
    profile.tastes = {};
    profile.guard = { day: '', words: [], lastSeen: 0 };
    profile.personality = 'foodie';
    if (!isUnlocked(profile, 'species', profile.species, achievements, free)) { profile.species = 'mochi'; profile.skin = ''; }
    else if (profile.skin && !isUnlocked(profile, 'skin', profile.skin, achievements, free)) profile.skin = '';
    OUTFIT_SLOTS.forEach(function (slot) {
      var kept = wornIds(profile.outfit, slot).filter(function (id) { return isUnlocked(profile, 'hat', id, achievements, free); });
      profile.outfit[slot] = kept.length ? kept.join(',') : 'none';
    });
  }

  /**
   * Moves saved dates back by some days, as if that much time had passed:
   * daily limits reset and items have been on the list long enough to count.
   * @param {{items: Item[], pet: PetProfile}} state  Changed in place.
   * @param {number} days
   */
  function skipDays(state, days) {
    var ms = days * 24 * 3600 * 1000;
    var back = function (key) {
      if (!key) return key;
      var d = new Date(key + 'T12:00:00');
      d.setDate(d.getDate() - days);
      return dayKey(d);
    };
    Object.keys(state.pet.achievements).forEach(function (id) {
      state.pet.achievements[id].day = back(state.pet.achievements[id].day);
    });
    state.pet.guard.day = back(state.pet.guard.day);
    state.pet.treats.day = back(state.pet.treats.day);
    Object.keys(state.pet.favourites).forEach(function (k) {
      state.pet.favourites[k].day = back(state.pet.favourites[k].day);
    });
    if (state.pet.guard.lastSeen) state.pet.guard.lastSeen -= ms;
    state.items.forEach(function (i) {
      if (typeof i.added === 'number') i.added -= ms;
      if (i.countedDay) i.countedDay = back(i.countedDay);
      if (i.fav) { i.fav.day = back(i.fav.day); i.fav.prev = back(i.fav.prev); }
    });
  }

  // ---------- favourites: what you buy most ----------
  // Uses the same fair-play rules as goals: an item counts after 15 minutes on the list,
  // once a day per word, and putting it back the same day takes the count back.

  /** The most favourites kept; the least bought are dropped past this. */
  var MAX_FAVOURITES = 300;

  /**
   * Counts an eaten item as bought today.
   * @param {PetProfile} profile  Changed in place.
   * @param {Item} item
   * @param {Date} now
   * @returns {?{key: string, day: string, prev: string}} What to remember on the item so
   *   putting it back can undo this, or null if it did not count.
   */
  function recordFavourite(profile, item, now) {
    if (!clockOk(profile, now) || !isFresh(item, now)) return null;
    var key = wordOf(item);
    if (!key) return null;
    var today = dayKey(now);
    var fav = profile.favourites[key];
    if (fav && fav.day === today) return null;
    var prev = fav ? fav.day : '';
    if (!fav) fav = profile.favourites[key] = { label: '', emoji: item.emoji, count: 0, day: '' };
    fav.count++;
    fav.day = today;
    fav.emoji = item.emoji;
    // shown without quantities, so "500g quark" and "quark" are one favourite
    fav.label = (key.charAt(0).toUpperCase() + key.slice(1)).slice(0, 40);
    pruneFavourites(profile);
    return { key: key, day: today, prev: prev };
  }

  /**
   * Takes back a favourite count when the item is put back the same day.
   * @param {PetProfile} profile  Changed in place.
   * @param {{key: string, day: string, prev: string}} mark  What recordFavourite returned.
   * @param {Date} now
   */
  function refundFavourite(profile, mark, now) {
    var fav = mark && profile.favourites[mark.key];
    if (!fav || mark.day !== dayKey(now) || fav.day !== mark.day) return;
    fav.count--;
    fav.day = mark.prev;
    if (fav.count <= 0) delete profile.favourites[mark.key];
  }

  /**
   * @param {PetProfile} profile  Changed in place.
   */
  function pruneFavourites(profile) {
    var keys = Object.keys(profile.favourites);
    if (keys.length <= MAX_FAVOURITES) return;
    keys.sort(function (a, b) { return rankFavourites(profile.favourites[b], profile.favourites[a]); })
      .slice(MAX_FAVOURITES).forEach(function (k) { delete profile.favourites[k]; });
  }

  /** Orders two favourites: more bought first, then the more recent. */
  function rankFavourites(a, b) {
    return (b.count - a.count) || (b.day < a.day ? -1 : b.day > a.day ? 1 : 0) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
  }

  /**
   * @param {PetProfile} profile
   * @param {number} [n]  How many to return; 10 by default.
   * @returns {Array<{key: string, label: string, emoji: string, count: number}>} The most bought first.
   */
  function topFavourites(profile, n) {
    var favs = profile.favourites;
    return Object.keys(favs)
      .filter(function (k) { return favs[k].count > 0 && favs[k].label; })
      .sort(function (a, b) { return rankFavourites(favs[a], favs[b]); })
      .slice(0, n || 10)
      .map(function (k) { return { key: k, label: favs[k].label, emoji: favs[k].emoji, count: favs[k].count }; });
  }

  /**
   * What Nibble says when you add something you often buy.
   * @param {PetProfile} profile
   * @param {string} text  The item as typed.
   * @returns {?{key: string, vars: {item: string, n: number, rank: number}}} A voice key
   *   ('memoryTop', 'memoryFav' or 'memoryRegular') and the values for its lines, or null
   *   if it is not a regular buy yet (under 3 times).
   */
  function memoryLine(profile, text) {
    var word = Foods.normalize(text || '');
    var fav = word && profile.favourites[word];
    if (!fav || fav.count < 3) return null;
    var rank = topFavourites(profile, 10).map(function (f) { return f.key; }).indexOf(word) + 1;
    var vars = { item: fav.label.toLowerCase(), n: fav.count, rank: rank };
    return { key: rank === 1 ? 'memoryTop' : rank ? 'memoryFav' : 'memoryRegular', vars: vars };
  }

  // ---------- treats ----------
  // Free snacks Nibble can be given without shopping. They count for goals and tastes
  // under the same daily limits as shopping, but never for the Top 10.

  /** How many treats Nibble takes a day. */
  var TREATS_PER_DAY = 3;
  /** The treats you can pick from, as item words (each maps to a food emoji and kind). */
  var TREAT_WORDS = ['apple', 'strawberry', 'carrot', 'broccoli', 'bread', 'cheese', 'peanuts', 'fish', 'cookie'];

  /**
   * @param {PetProfile} profile  Changed in place: a new day starts a fresh list.
   * @param {Date} now
   * @returns {string[]} The treats already fed today.
   */
  function treatsToday(profile, now) {
    var today = dayKey(now);
    if (profile.treats.day !== today) profile.treats = { day: today, used: [] };
    return profile.treats.used;
  }

  /**
   * Feeds Nibble a treat if there is room: three a day, each one once a day.
   * @param {PetProfile} profile  Changed in place.
   * @param {string} word  One of TREAT_WORDS.
   * @param {Date} now
   * @returns {{ok: boolean, why?: string, left?: number}} why is 'full', 'used' or 'unknown'.
   */
  function giveTreat(profile, word, now) {
    if (TREAT_WORDS.indexOf(word) === -1) return { ok: false, why: 'unknown' };
    var used = treatsToday(profile, now);
    if (used.length >= TREATS_PER_DAY) return { ok: false, why: 'full' };
    if (used.indexOf(word) !== -1) return { ok: false, why: 'used' };
    used.push(word);
    return { ok: true, left: TREATS_PER_DAY - used.length };
  }

  // ---------- room decor ----------

  /**
   * Keeps a spot inside the room.
   * @param {number} n
   * @returns {number} Between 0 and 1.
   */
  function clamp01(n) { return Math.max(0, Math.min(1, Number(n) || 0)); }

  /**
   * Puts a decor item in the room at its default spot, or takes it out if it is there.
   * @param {Object<string, {x: number, y: number}>} room  Changed in place.
   * @param {{id: string, x: number, y: number}} item  An entry from decor.js.
   * @returns {boolean} True if the item is now in the room.
   */
  function toggleDecor(room, item) {
    if (room[item.id]) { delete room[item.id]; return false; }
    room[item.id] = { x: clamp01(item.x), y: clamp01(item.y) };
    return true;
  }

  /**
   * Moves a placed decor item to a new spot, kept inside the room.
   * @param {Object<string, {x: number, y: number}>} room  Changed in place.
   * @param {string} id
   * @param {number} x  0 (left) to 1 (right).
   * @param {number} y  0 (top) to 1 (bottom).
   * @returns {boolean} False if the item is not in the room.
   */
  function moveDecor(room, id, x, y) {
    if (!room[id]) return false;
    room[id] = { x: clamp01(x), y: clamp01(y) };
    return true;
  }


  // ---------- sketchpad (Developer tools): drawings kept as vectors in the pet's own coordinates ----------
  /** @returns {string} A number for an SVG path, with up to `dp` decimals and no trailing zeros. */
  function skNum(n, dp) { return String(+n.toFixed(dp)); }
  /**
   * Turns a freehand line into a smooth SVG path (curves through the midpoints of the points).
   * @param {number[][]} pts [[x, y], ...]
   * @param {boolean} closed Close the shape (for filled blobs).
   * @param {number} dp Decimals to keep.
   */
  function sketchPath(pts, closed, dp) {
    if (!pts.length) return '';
    var P = function (p) { return skNum(p[0], dp) + ' ' + skNum(p[1], dp); };
    if (pts.length === 1) return 'M' + P(pts[0]) + 'h0.01';   // a dot (round caps make it visible)
    var d = 'M' + P(pts[0]);
    for (var i = 1; i < pts.length - 1; i++) {
      d += 'Q' + P(pts[i]) + ' ' + P([(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]);
    }
    return d + 'L' + P(pts[pts.length - 1]) + (closed ? 'Z' : '');
  }
  /** @returns {boolean} Whether a line (or dot) passes within `r` of the point `p`. */
  function sketchHit(pts, p, r) {
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[i + 1] || a, dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
      var t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
      var ex = a[0] + t * dx - p[0], ey = a[1] + t * dy - p[1];
      if (ex * ex + ey * ey <= r * r) return true;
    }
    return false;
  }
  /**
   * Builds the drawing as an SVG file: the same coordinates as the pet, backdrop or toy it was drawn over.
   * @param {{pts: number[][], color: string, width: number, fill: boolean}[]} strokes
   * @param {{x: number, y: number, w: number, h: number}} view The drawing area in the reference's coordinates.
   * @param {Object} meta Notes for whoever reads the file (what it is, which pet it was drawn on...).
   */
  function sketchSvg(strokes, view, meta) {
    var dp = view.w > 100 ? 1 : 2;
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/--/g, '- -'); };
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [view.x, view.y, view.w, view.h].join(' ') + '" width="' + Math.round(view.w * 4) + '" height="' + Math.round(view.h * 4) + '" fill="none" stroke-linecap="round" stroke-linejoin="round">'];
    out.push('<!-- ' + esc(JSON.stringify(meta || {})) + ' -->');
    strokes.forEach(function (s) {
      var d = sketchPath(s.pts, s.fill && s.pts.length > 2, dp);
      out.push('<path d="' + d + '" stroke="' + esc(s.color) + '" stroke-width="' + skNum(s.width, 2) + '"' + (s.fill ? ' fill="' + esc(s.color) + '"' : '') + '/>');
    });
    out.push('</svg>');
    return out.join('\n');
  }

  root.PetLogic = {
    unlockAll: unlockAll,
    lockAll: lockAll,
    skipDays: skipDays,
    settings: settings,
    recordTaste: recordTaste,
    refundTaste: refundTaste,
    personalityProgress: personalityProgress,
    likes: likes,
    suggestion: suggestion,
    styleLine: styleLine,
    DOUBLE_TAP_MS: DOUBLE_TAP_MS,
    isDoubleTap: isDoubleTap,
    cleanName: cleanName,
    voiceLine: voiceLine,
    sleepTalk: sleepTalk,
    BIRDS: BIRDS,
    OUTFIT_SLOTS: OUTFIT_SLOTS,
    isNight: isNight,
    restingMood: restingMood,
    isBird: isBird,
    toggleDecor: toggleDecor,
    moveDecor: moveDecor,
    FRESH_MS: FRESH_MS,
    TRIP_MIN_ITEMS: TRIP_MIN_ITEMS,
    dayKey: dayKey,
    nightOf: nightOf,
    countsFor: countsFor,
    recordEaten: recordEaten,
    recordTrip: recordTrip,
    refundEaten: refundEaten,
    recordFavourite: recordFavourite,
    refundFavourite: refundFavourite,
    topFavourites: topFavourites,
    memoryLine: memoryLine,
    giveTreat: giveTreat,
    treatsToday: treatsToday,
    TREATS_PER_DAY: TREATS_PER_DAY,
    TREAT_WORDS: TREAT_WORDS,
    progress: progress,
    isUnlocked: isUnlocked,
    gateFor: gateFor,
    emojiFor: emojiFor,
    splitSpoken: splitSpoken, wornIds: wornIds, toggleWorn: toggleWorn, faceStack: faceStack, isFarOff: isFarOff, PLAN_AHEAD_DAYS: PLAN_AHEAD_DAYS, monthGrid: monthGrid, tasksOn: tasksOn, addStamp: addStamp, stampTotal: stampTotal, AISLES: AISLES, aisleOf: aisleOf, groupByAisle: groupByAisle, REPEATS: REPEATS, isDayKey: isDayKey, isTimeKey: isTimeKey, addDays: addDays, addMonths: addMonths, daysUntil: daysUntil, dueInfo: dueInfo, nextDue: nextDue, sortByDue: sortByDue,
    createItem: createItem,
    petProfile: petProfile,
    parseState: parseState,
    mood: mood,
    addToList: addToList,
    toggleDone: toggleDone,
    pickEmoji: pickEmoji,
    soundFor: soundFor,
    sketchPath: sketchPath, sketchHit: sketchHit, sketchSvg: sketchSvg
  };
})(typeof self !== 'undefined' ? self : globalThis);
