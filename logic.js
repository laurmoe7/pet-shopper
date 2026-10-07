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
   * @property {{id: string, name: string, outfit: Object<string, string>}[]} closet  Outfits saved by name in the closet.
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
  var SAMPLE = ['Bananas', ['Oat milk', '1 l'], ['Quark', '500 g'], 'Broccoli', 'Chili flakes', 'Dark chocolate', 'Toilet paper', "Oma's cake"];

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
      // outfits saved in the closet (dressing room)
      closet: parseCloset(saved.closet),
      personality: saved.personality || 'foodie',
      tastes: saved.tastes && typeof saved.tastes === 'object' ? saved.tastes : {},
      // check-mark stamps from ticked tasks, by task kind (the stamp book)
      stamps: saved.stamps && typeof saved.stamps === 'object' ? saved.stamps : {},
      // daily gift boxes (bonuses.js): the boxes opened on each recent day and the prizes collected
      gifts: saved.gifts && typeof saved.gifts === 'object' ? saved.gifts : {},
      prizes: saved.prizes && typeof saved.prizes === 'object' ? saved.prizes : {},
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
   * The player (the person, apart from the pet): a name and a birthday.
   * @param {Object} [saved]
   * @param {string} [oldBirthday] A birthday saved on the pet by an earlier build.
   * @returns {{name: string, birthday: string}} birthday is "MM-DD" or empty.
   */
  function parsePlayer(saved, oldBirthday) {
    saved = saved && typeof saved === 'object' ? saved : {};
    var day = /^\d\d-\d\d$/;
    return {
      name: typeof saved.name === 'string' ? saved.name.trim().slice(0, 20) : '',
      birthday: typeof saved.birthday === 'string' && day.test(saved.birthday) ? saved.birthday : (typeof oldBirthday === 'string' && day.test(oldBirthday) ? oldBirthday : '')
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
      SAMPLE.forEach(function (t) {   // a sample can carry an amount: [name, amount]
        var item = createItem(Array.isArray(t) ? t[0] : t, data.overrides, nextId());
        if (Array.isArray(t)) item.qty = t[1];
        data.items.push(item);
      });
    }
    data.overrides = data.overrides || {};
    // the list on show (shopping or to-do) is state.items; the other one waits in state.stash
    data.mode = data.mode === 'todo' ? 'todo' : 'shop';
    if (!Array.isArray(data.stash)) data.stash = [];
    data.items.forEach(cleanTask);
    data.stash.forEach(cleanTask);
    data.player = parsePlayer(data.player, data.pet && data.pet.birthday);   // build 196 kept the birthday on the pet
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
    { id: 'weekdays', label: 'Weekdays (Mon to Fri)', dow: [1, 2, 3, 4, 5] },
    { id: 'weekends', label: 'Weekends', dow: [6, 0] },
    { id: 'days', label: 'Certain days of the week…', dow: null },   // the days are on the task (item.days)
    { id: 'monthly', label: 'Every month', months: 1 },
    { id: 'yearly', label: 'Every year', months: 12 }
  ];
  /** How long a repeating task goes on for (`weeks` or `months` counted from its first day). */
  var REPEAT_SPANS = [
    { id: '', label: 'Forever' },
    { id: '1w', label: '1 week', weeks: 1 },
    { id: '2w', label: '2 weeks', weeks: 2 },
    { id: '1m', label: '1 month', months: 1 },
    { id: '2m', label: '2 months', months: 2 },
    { id: '3m', label: '3 months', months: 3 },
    { id: '6m', label: '6 months', months: 6 }
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
  /** @returns {string} The first day from this one on that falls on one of the weekdays (0 is Sunday). */
  function firstOnDays(from, set) {
    var d = from;
    for (var n = 0; n < 7 && set.indexOf(dayDate(d).getDay()) === -1; n++) d = addDays(d, 1);
    return d;
  }
  /** @returns {?number[]} The weekdays (0 is Sunday) a repeating task comes back on, or null if it repeats by a count of days or months. */
  function repeatDays(item) {
    var r = REPEATS.filter(function (x) { return x.id === item.repeat; })[0];
    return r && r.dow ? r.dow : item.repeat === 'days' ? item.days || [] : null;
  }
  /**
   * The last day of a repeat that runs for a span: "a week" from Monday ends on Sunday, "2 months" from 5 Oct ends on 4 Dec.
   * @param {string} start  The day it starts (its due day).
   * @param {string} span  A REPEAT_SPANS id.
   * @returns {string} YYYY-MM-DD, or '' for forever.
   */
  function untilFor(start, span) {
    var s = REPEAT_SPANS.filter(function (x) { return x.id === span; })[0];
    if (!s || !s.id || !isDayKey(start)) return '';
    return s.weeks ? addDays(start, 7 * s.weeks - 1) : addDays(addMonths(start, s.months), -1);
  }
  /**
   * The next day a repeating task is due: one step after its due day, and always after today (a task that was
   * ticked weeks late comes back on its next regular day, not in the past).
   * @param {?string} due  Its due day, if it had one.
   * @param {string} repeat  A REPEATS id.
   * @param {string} today
   * @returns {string}
   */
  function nextDue(due, repeat, today, days) {
    var r = REPEATS.filter(function (x) { return x.id === repeat; })[0];
    var base = isDayKey(due) ? due : today;
    if (!r || !r.id) return base;
    if (r.id === 'days' || r.dow) {   // certain days of the week: the next one after both its day and today
      var set = r.dow || days || [];
      if (!set.length) return base;
      var d = addDays(base > today ? base : today, 1);
      for (var n = 0; n < 7 && set.indexOf(dayDate(d).getDay()) === -1; n++) d = addDays(d, 1);
      return d;
    }
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
    if (item && item.qty !== undefined) { var q = typeof item.qty === 'string' ? item.qty.trim().slice(0, 20) : ''; if (q) item.qty = q; else delete item.qty; }   // the amount to buy, like "2 tbsp"
    if (item && item.due !== undefined && !isDayKey(item.due)) delete item.due;
    if (item && item.time !== undefined && (!item.due || !isTimeKey(item.time))) delete item.time;
    if (item && item.until !== undefined && (!isDayKey(item.until) || !item.repeat || !item.due)) delete item.until;
    if (item && item.days !== undefined) {   // the chosen weekdays of a 'certain days' repeat
      var ds = Array.isArray(item.days) ? item.days.filter(function (n, i, a) { return n % 1 === 0 && n >= 0 && n <= 6 && a.indexOf(n) === i; }) : [];
      if (item.repeat === 'days' && ds.length) item.days = ds; else delete item.days;
    }
    if (item && item.repeat === 'days' && !item.days) delete item.repeat;
    if (item && item.repeat !== undefined && (!item.due || !REPEATS.some(function (r) { return r.id && r.id === item.repeat; }))) delete item.repeat;
    if (item && item.until !== undefined && !item.repeat) delete item.until;
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

  /** How many outfits the closet holds. */
  var CLOSET_MAX = 24;
  /** @returns {string} An outfit name tidied up: single spaces, at most 16 characters ('' if nothing was typed). */
  function cleanOutfitName(typed) { return String(typed || '').replace(/\s+/g, ' ').trim().slice(0, 16).trim(); }
  /** @returns {{id: string, name: string, outfit: Object}[]} The saved outfits from whatever was stored, with defaults filled in. */
  function parseCloset(saved) {
    if (!Array.isArray(saved)) return [];
    return saved.filter(function (o) { return o && typeof o === 'object'; }).slice(0, CLOSET_MAX).map(function (o, i) {
      return { id: typeof o.id === 'string' && o.id ? o.id : 'o' + i, name: cleanOutfitName(o.name) || 'Outfit ' + (i + 1), outfit: parseOutfit(o.outfit && typeof o.outfit === 'object' ? o.outfit : {}) };
    });
  }
  /** @returns {boolean} Whether anything is worn. */
  function isDressed(outfit) { return OUTFIT_SLOTS.some(function (slot) { return wornIds(outfit, slot).length > 0; }); }
  /** @returns {boolean} Whether two outfits have the same things on (the order they went on in does not matter). */
  function sameOutfit(a, b) {
    return OUTFIT_SLOTS.every(function (slot) { return wornIds(a, slot).slice().sort().join() === wornIds(b, slot).slice().sort().join(); });
  }
  /**
   * Puts an outfit in the closet.
   * @param {{id: string, name: string, outfit: Object}[]} closet Changed in place.
   * @param {string} name What it is called ('' gives "Outfit 3" and so on).
   * @param {Object} outfit What is worn (copied).
   * @param {string} id A new id.
   * @returns {{entry: ?Object, why: string}} The saved entry; or, if it could not be saved, `why`: 'empty' (nothing worn), 'same' (it is already there, `entry` is that one) or 'full'.
   */
  function saveOutfit(closet, name, outfit, id) {
    if (!isDressed(outfit)) return { entry: null, why: 'empty' };
    var dupe = closet.filter(function (o) { return sameOutfit(o.outfit, outfit); })[0];
    if (dupe) return { entry: dupe, why: 'same' };
    if (closet.length >= CLOSET_MAX) return { entry: null, why: 'full' };
    var n = closet.length + 1;
    while (closet.some(function (o) { return o.name === 'Outfit ' + n; }) && !cleanOutfitName(name)) n++;
    var entry = { id: id, name: cleanOutfitName(name) || 'Outfit ' + n, outfit: parseOutfit(JSON.parse(JSON.stringify(outfit))) };
    closet.push(entry);
    return { entry: entry, why: '' };
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
  // Free snacks Nibble asks for now and then (up to three a day, each once) and you can feed him. They count for goals and tastes
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

  /**
   * What Nibble could ask for next: a treat not yet fed today, or nothing once the day's treats are used up.
   * @param {PetProfile} profile  A new day starts a fresh list.
   * @param {Date} now
   * @param {function(): number} rand  Like Math.random.
   * @returns {?string} One of TREAT_WORDS.
   */
  function nextWish(profile, now, rand) {
    var used = treatsToday(profile, now);
    if (used.length >= TREATS_PER_DAY) return null;
    var left = TREAT_WORDS.filter(function (w) { return used.indexOf(w) === -1; });
    return left.length ? left[Math.min(left.length - 1, Math.floor(rand() * left.length))] : null;
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
  // ---------- turning pen lines into a few clean curves ----------
  // Curve fitting after Philip J. Schneider, "An Algorithm for Automatically Fitting Digitized Curves" (Graphics Gems, 1990):
  // a line of many points becomes a few cubic Béziers that stay within `err` of every point.
  function cvAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function cvSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function cvMul(a, k) { return [a[0] * k, a[1] * k]; }
  function cvDot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
  function cvNorm(a) { var d = Math.hypot(a[0], a[1]) || 1; return [a[0] / d, a[1] / d]; }
  function cvAt(b, t) {
    var u = 1 - t;
    return [u * u * u * b[0][0] + 3 * u * u * t * b[1][0] + 3 * u * t * t * b[2][0] + t * t * t * b[3][0], u * u * u * b[0][1] + 3 * u * u * t * b[1][1] + 3 * u * t * t * b[2][1] + t * t * t * b[3][1]];
  }
  function cvD1(b, t) {
    var u = 1 - t, q = [cvSub(b[1], b[0]), cvSub(b[2], b[1]), cvSub(b[3], b[2])];
    return [3 * (u * u * q[0][0] + 2 * u * t * q[1][0] + t * t * q[2][0]), 3 * (u * u * q[0][1] + 2 * u * t * q[1][1] + t * t * q[2][1])];
  }
  function cvD2(b, t) {
    var q = [cvSub(b[1], b[0]), cvSub(b[2], b[1]), cvSub(b[3], b[2])], r = [cvSub(q[1], q[0]), cvSub(q[2], q[1])];
    return [6 * ((1 - t) * r[0][0] + t * r[1][0]), 6 * ((1 - t) * r[0][1] + t * r[1][1])];
  }
  function cvChord(P, first, last) {
    var u = [0], i;
    for (i = first + 1; i <= last; i++) u.push(u[u.length - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    for (i = 1; i < u.length; i++) u[i] /= (u[u.length - 1] || 1);
    return u;
  }
  function cvGenerate(P, first, last, u, t1, t2) {
    var n = last - first + 1, C = [[0, 0], [0, 0]], X = [0, 0], i;
    var p0 = P[first], p3 = P[last];
    for (i = 0; i < n; i++) {
      var t = u[i], m = 1 - t, b0 = m * m * m, b1 = 3 * t * m * m, b2 = 3 * t * t * m, b3 = t * t * t;
      var a1 = cvMul(t1, b1), a2 = cvMul(t2, b2);
      var tmp = cvSub(P[first + i], cvAdd(cvMul(p0, b0 + b1), cvMul(p3, b2 + b3)));
      C[0][0] += cvDot(a1, a1); C[0][1] += cvDot(a1, a2); C[1][1] += cvDot(a2, a2);
      X[0] += cvDot(a1, tmp); X[1] += cvDot(a2, tmp);
    }
    C[1][0] = C[0][1];
    var det = C[0][0] * C[1][1] - C[1][0] * C[0][1];
    var al = det ? (X[0] * C[1][1] - X[1] * C[0][1]) / det : 0, ar = det ? (C[0][0] * X[1] - C[1][0] * X[0]) / det : 0;
    var seg = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]), eps = 1e-6 * seg;
    if (al < eps || ar < eps) { var d = seg / 3; return [p0, cvAdd(p0, cvMul(t1, d)), cvAdd(p3, cvMul(t2, d)), p3]; }
    return [p0, cvAdd(p0, cvMul(t1, al)), cvAdd(p3, cvMul(t2, ar)), p3];
  }
  function cvReparam(P, first, last, u, b) {
    var out = [], i;
    for (i = first; i <= last; i++) {
      var t = u[i - first], q = cvAt(b, t), d1 = cvD1(b, t), d2 = cvD2(b, t), diff = cvSub(q, P[i]);
      var num = cvDot(diff, d1), den = cvDot(d1, d1) + cvDot(diff, d2);
      out.push(den ? t - num / den : t);
    }
    return out;
  }
  function cvError(P, first, last, b, u) {
    var worst = 0, at = Math.floor((last - first + 1) / 2), i;
    for (i = first + 1; i < last; i++) {
      var q = cvAt(b, u[i - first]), d = cvSub(q, P[i]), e = cvDot(d, d);
      if (e >= worst) { worst = e; at = i; }
    }
    return { err: worst, at: at };
  }
  function cvFit(P, first, last, t1, t2, err) {
    if (last - first === 1) { var d = Math.hypot(P[last][0] - P[first][0], P[last][1] - P[first][1]) / 3; return [[P[first], cvAdd(P[first], cvMul(t1, d)), cvAdd(P[last], cvMul(t2, d)), P[last]]]; }
    var u = cvChord(P, first, last), b = cvGenerate(P, first, last, u, t1, t2), e = cvError(P, first, last, b, u), i;
    if (e.err < err * err) return [b];
    if (e.err < err * err * 16) {   // close: nudge the timing of each point a few times
      for (i = 0; i < 12; i++) {
        var u2 = cvReparam(P, first, last, u, b);
        b = cvGenerate(P, first, last, u2, t1, t2); e = cvError(P, first, last, b, u2); u = u2;
        if (e.err < err * err) return [b];
      }
    }
    var tc = cvNorm(cvSub(P[e.at - 1], P[e.at + 1]));
    return cvFit(P, first, e.at, t1, tc, err).concat(cvFit(P, e.at, last, cvMul(tc, -1), t2, err));
  }
  /**
   * Fits a few smooth cubic Béziers to a line (sharp corners stay sharp).
   * @param {number[][]} pts
   * @param {number} err  How far the curves may stray from the points.
   * @returns {number[][][]} Each curve is [start, control 1, control 2, end].
   */
  function fitCurve(pts, err) {
    var P = [], i;
    for (i = 0; i < pts.length; i++) if (!i || Math.hypot(pts[i][0] - P[P.length - 1][0], pts[i][1] - P[P.length - 1][1]) > 1e-6) P.push(pts[i]);
    if (P.length < 2) return [];
    if (P.length === 2) { var m = cvSub(P[1], P[0]); return [[P[0], cvAdd(P[0], cvMul(m, 1 / 3)), cvAdd(P[0], cvMul(m, 2 / 3)), P[1]]]; }
    // cut the line at its corners and fit each stretch on its own
    var cuts = [0], k = Math.max(2, Math.min(5, Math.floor(P.length / 8)));
    for (i = 1; i < P.length - 1; i++) {
      var a = cvSub(P[i], P[Math.max(0, i - k)]), c = cvSub(P[Math.min(P.length - 1, i + k)], P[i]);
      if (!Math.hypot(a[0], a[1]) || !Math.hypot(c[0], c[1])) continue;
      var ang = Math.acos(Math.max(-1, Math.min(1, cvDot(cvNorm(a), cvNorm(c)))));
      if (ang > 0.95 && i - cuts[cuts.length - 1] > k) {   // about 55 degrees: the sharpest point of the bend is the corner
        var best = i, bestAng = ang, j;
        for (j = i + 1; j < Math.min(P.length - 1, i + k); j++) {
          var a2 = cvSub(P[j], P[Math.max(0, j - k)]), c2 = cvSub(P[Math.min(P.length - 1, j + k)], P[j]), g = Math.acos(Math.max(-1, Math.min(1, cvDot(cvNorm(a2), cvNorm(c2)))));
          if (g > bestAng) { bestAng = g; best = j; }
        }
        cuts.push(best); i = best;
      }
    }
    cuts.push(P.length - 1);
    var out = [];
    for (i = 0; i < cuts.length - 1; i++) {
      var f = cuts[i], e2 = cuts[i + 1];
      if (e2 <= f) continue;
      if (e2 - f === 1) { var mm = cvSub(P[e2], P[f]); out.push([P[f], cvAdd(P[f], cvMul(mm, 1 / 3)), cvAdd(P[f], cvMul(mm, 2 / 3)), P[e2]]); continue; }
      var t1 = cvNorm(cvSub(P[Math.min(e2, f + 1)], P[f])), t2 = cvNorm(cvSub(P[Math.max(f, e2 - 1)], P[e2]));
      out = out.concat(cvFit(P, f, e2, t1, t2, err));
    }
    return out;
  }
  /** @returns {string} Path text for curves, as M then C commands (or L for a straight piece). */
  function curvesPath(curves, dp) {
    var n = function (v) { return skNum(v, dp); }, d = '';
    curves.forEach(function (b, i) {
      if (!i) d += 'M' + n(b[0][0]) + ' ' + n(b[0][1]);
      var straight = Math.abs((b[1][0] - b[0][0]) * (b[3][1] - b[0][1]) - (b[1][1] - b[0][1]) * (b[3][0] - b[0][0])) < 1e-6 && Math.abs((b[2][0] - b[0][0]) * (b[3][1] - b[0][1]) - (b[2][1] - b[0][1]) * (b[3][0] - b[0][0])) < 1e-6;
      d += straight ? 'L' + n(b[3][0]) + ' ' + n(b[3][1]) : 'C' + n(b[1][0]) + ' ' + n(b[1][1]) + ' ' + n(b[2][0]) + ' ' + n(b[2][1]) + ' ' + n(b[3][0]) + ' ' + n(b[3][1]);
    });
    return d;
  }
  /**
   * The path text for a stroke in "clean" form: a curve drawn with the Curve tool is written from its own points; any other
   * line (or filled outline) is fitted with a few Béziers.
   * @param {Object} s  A stroke.
   * @param {number} dp  Decimals to keep.
   * @param {number} err  How far a fitted curve may stray.
   */
  function sketchPathClean(s, dp, err) {
    if (s.cv && s.cv.a.length > 1) {
      var a = s.cv.a, n = a.length, segs = s.cv.closed ? n : n - 1, curves = [], i;
      for (i = 0; i < segs; i++) {
        var p = a[i], q = a[(i + 1) % n], qi = q.i || [-q.o[0], -q.o[1]];
        curves.push([p.p, [p.p[0] + p.o[0], p.p[1] + p.o[1]], [q.p[0] + qi[0], q.p[1] + qi[1]], q.p]);
      }
      return curvesPath(curves, dp) + (s.cv.closed ? 'Z' : '');
    }
    if (s.d) {   // outlines made by the bucket or by combining shapes: each loop is fitted on its own
      var loops = s.d.match(/M[^Z]*Z/g) || [];
      return loops.map(function (lp) {
        var nums = lp.match(/-?\d+(?:\.\d+)?/g).map(Number), pts = [], j;
        for (j = 0; j + 1 < nums.length; j += 2) pts.push([nums[j], nums[j + 1]]);
        pts.push(pts[0]);
        return curvesPath(fitCurve(pts, err), dp) + 'Z';
      }).join('');
    }
    if (s.pts.length < 3) return sketchPath(s.pts, false, dp);
    var closed = (s.fill || s.closed) && s.pts.length > 2, pts2 = s.pts.slice();
    if (closed) pts2.push(pts2[0]);
    var fitted = fitCurve(pts2, err);
    return fitted.length ? curvesPath(fitted, dp) + (closed ? 'Z' : '') : sketchPath(s.pts, closed, dp);
  }
  /**
   * The drawing's parts, ready to write out: each stroke as a path with its colours, and the gradients and blurs they need.
   * @param {Object[]} strokes
   * @param {{w: number}} view
   * @param {{clean: boolean}} opts  `clean` fits curves instead of keeping every pen point.
   * @returns {{defs: string, items: {layer: ?string, svg: string}[]}}
   */
  function sketchBody(strokes, view, opts) {
    opts = opts || {};
    var dp = view.w > 100 ? 1 : 2, err = view.w * 0.0022, defs = {};
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/--/g, '- -'); };
    var items = strokes.map(function (s) {
      // a paint-bucket fill carries its own outline (`d`, with holes)
      var d = opts.clean ? sketchPathClean(s, dp, err) : (s.d || sketchPath(s.pts, (s.fill || s.closed) && s.pts.length > 2, dp));
      var fillAttr = s.fill && s.grad ? 'url(#' + sketchGradId(s.grad) + ')' : null, soft = s.style === 'soft' ? sketchSoftBlur(s.width) : 0;
      if (fillAttr) defs[sketchGradId(s.grad)] = sketchGradDef(s.grad);
      if (soft) defs[sketchBlurId(soft)] = sketchBlurDef(soft);
      if (s.clip) defs.bodyclip = sketchClipDef();
      var dash = sketchDash(s.style, s.width);
      return { layer: s.layer || null, svg: '<path d="' + d + '" stroke="' + esc(s.color) + '" stroke-width="' + skNum(s.width, 2) + '"' + (s.fill ? ' fill="' + (fillAttr || esc(s.color)) + '"' : '') + (soft ? ' filter="url(#' + sketchBlurId(soft) + ')" opacity="0.7"' : '') + (dash.array ? ' stroke-dasharray="' + dash.array + '"' + (dash.cap === 'butt' ? ' stroke-linecap="butt"' : '') : '') + (s.d ? ' fill-rule="evenodd"' : '') + (s.clip ? ' clip-path="url(#bodyclip)"' : '') + '/>' };
    });
    return { defs: Object.keys(defs).map(function (k) { return defs[k]; }).join(''), items: items };
  }
  /** @returns {string} The parts joined, with each layer in its own named group (when the lines are on layers). */
  function sketchGroups(items) {
    var out = [], cur = null, esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    items.forEach(function (it) {
      if (it.layer !== cur) {
        if (cur) out.push('</g>');
        cur = it.layer;
        if (cur) out.push('<g id="' + esc(String(cur).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'layer') + '" data-layer="' + esc(cur) + '">');
      }
      out.push(it.svg);
    });
    if (cur) out.push('</g>');
    return out.join('\n');
  }
  /**
   * Builds the drawing as an SVG file: the same coordinates as the pet, backdrop or toy it was drawn over.
   * @param {{pts: number[][], color: string, width: number, fill: boolean}[]} strokes
   * @param {{x: number, y: number, w: number, h: number}} view The drawing area in the reference's coordinates.
   * @param {Object} meta Notes for whoever reads the file (what it is, which pet it was drawn on...).
   * @param {{clean: boolean}} [opts]
   */
  function sketchSvg(strokes, view, meta, opts) {
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/--/g, '- -'); };
    var body = sketchBody(strokes, view, opts);
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [view.x, view.y, view.w, view.h].join(' ') + '" width="' + Math.round(view.w * 4) + '" height="' + Math.round(view.h * 4) + '" fill="none" stroke-linecap="round" stroke-linejoin="round">'];
    out.push('<!-- ' + esc(JSON.stringify(meta || {})) + ' -->');
    if (body.defs) out.push('<defs>' + body.defs + '</defs>');
    out.push(sketchGroups(body.items));
    out.push('</svg>');
    return out.join('\n');
  }
  /**
   * A ready-to-paste entry for the dressing room's list (wardrobe.js), drawn from the strokes: the colours and widths are written
   * on each part, so it needs no styles of its own.
   * @param {Object[]} strokes
   * @param {{id: string, label: string, slot: string, lines: string[], note: ?string}} item
   * @param {{x: number, y: number, w: number, h: number}} view
   * @returns {string}
   */
  function sketchItemCode(strokes, item, view) {
    var body = sketchBody(strokes, view, { clean: true }), prefix = item.id + '-';
    var parts = [], x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    strokes.forEach(function (s) {
      var h = (s.width || 0) / 2;
      s.pts.forEach(function (p) { x0 = Math.min(x0, p[0] - h); y0 = Math.min(y0, p[1] - h); x1 = Math.max(x1, p[0] + h); y1 = Math.max(y1, p[1] + h); });
    });
    var inner = (body.defs ? '<defs>' + body.defs + '</defs>' : '') + sketchGroups(body.items).replace(/\n/g, '');
    inner = inner.replace(/id="([a-z][a-zA-Z0-9_-]*)"/g, function (m, id) { return /^(g|b)[A-Za-z0-9_]/.test(id) && body.defs.indexOf('id="' + id + '"') !== -1 ? 'id="' + prefix + id + '"' : m; })
      .replace(/url\(#([^)]+)\)/g, function (m, id) { return body.defs.indexOf('id="' + id + '"') !== -1 ? 'url(#' + prefix + id + ')' : m; });
    var svg = '<g class="item-' + item.id + '">' + inner + '</g>';
    var q = function (t) { return "'" + String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; };
    var pad = 2, icon = isFinite(x0) ? [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 - x0 + 2 * pad), Math.ceil(y1 - y0 + 2 * pad)].join(' ') : '0 0 160 150';
    parts.push('    {');
    parts.push('      id: ' + q(item.id) + ', slot: ' + q(item.slot) + ', label: ' + q(item.label) + (item.slot === 'body' ? ", layer: 'body'" : '') + ', icon: ' + q(icon) + ',');
    parts.push('      lines: [' + item.lines.map(q).join(', ') + '],');
    parts.push('      // drawn in the Sketchpad' + (item.note ? ': ' + String(item.note).replace(/[\r\n]+/g, ' ') : ''));
    parts.push('      svg: ' + svgConcat(svg, q));
    parts.push('    },');
    return parts.join('\n');
  }
  /** @returns {string} The markup as a JavaScript string, one tag per line (the way the other items are written). */
  function svgConcat(svg, q) {
    var tags = svg.replace(/></g, '>\n<').split('\n');
    return tags.map(function (t, i) { return (i ? '        ' : '') + q(t) + (i < tags.length - 1 ? ' +\n' : ''); }).join('');
  }

  /**
   * The paint bucket's first step: spreads from a pixel over every pixel that is not a wall.
   * @param {Uint8Array} wall  1 where a line is (w * h).
   * @param {number} w
   * @param {number} h
   * @param {number} sx  Where it was clicked.
   * @param {number} sy
   * @returns {?{mask: Uint8Array, count: number, edge: boolean}} The area reached, how big it is and whether it touches the edge (so it is not closed); null if the click was on a line.
   */
  function floodMask(wall, w, h, sx, sy) {
    if (sx < 0 || sy < 0 || sx >= w || sy >= h || wall[sy * w + sx]) return null;
    var mask = new Uint8Array(w * h), stack = [sx, sy], count = 0, edge = false;
    while (stack.length) {
      var y = stack.pop(), x = stack.pop();
      if (mask[y * w + x] || wall[y * w + x]) continue;
      var l = x, r = x;
      while (l > 0 && !wall[y * w + l - 1] && !mask[y * w + l - 1]) l--;
      while (r < w - 1 && !wall[y * w + r + 1] && !mask[y * w + r + 1]) r++;
      if (l === 0 || r === w - 1 || y === 0 || y === h - 1) edge = true;
      for (var i = l; i <= r; i++) {
        mask[y * w + i] = 1; count++;
        if (y > 0 && !mask[(y - 1) * w + i] && !wall[(y - 1) * w + i]) stack.push(i, y - 1);
        if (y < h - 1 && !mask[(y + 1) * w + i] && !wall[(y + 1) * w + i]) stack.push(i, y + 1);
      }
    }
    return { mask: mask, count: count, edge: edge };
  }
  /**
   * The outlines of a filled area as closed loops of pixel corners: the outside edge and the edge of every hole.
   * @param {Uint8Array} mask  1 inside the area (w * h).
   * @returns {number[][][]} Loops of [x, y] corners, without the points along straight runs.
   */
  function traceLoops(mask, w, h) {
    var W = w + 1, next = {}, i, j;
    function at(x, y) { return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1; }
    function add(ax, ay, bx, by) { var k = ay * W + ax; (next[k] = next[k] || []).push(by * W + bx); }
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      if (!mask[j * w + i]) continue;
      if (!at(i, j - 1)) add(i, j, i + 1, j);
      if (!at(i + 1, j)) add(i + 1, j, i + 1, j + 1);
      if (!at(i, j + 1)) add(i + 1, j + 1, i, j + 1);
      if (!at(i - 1, j)) add(i, j + 1, i, j);
    }
    var loops = [], keys = Object.keys(next);
    for (var n = 0; n < keys.length; n++) {
      while (next[keys[n]] && next[keys[n]].length) {
        var start = +keys[n], cur = start, pts = [];
        do {
          pts.push([cur % W, Math.floor(cur / W)]);
          var out = next[cur];
          var to = out.pop();
          if (!out.length) delete next[cur];
          cur = to;
        } while (cur !== start && next[cur]);
        // keep only the corners where the outline turns
        var keep = pts.filter(function (p, q) {
          var a = pts[(q + pts.length - 1) % pts.length], b = pts[(q + 1) % pts.length];
          return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
        });
        if (keep.length > 2) loops.push(keep);
      }
    }
    return loops;
  }

  /** @returns {string} A name for a gradient (the same gradient always gets the same name). */
  function sketchGradId(g) { return 'g' + (g.type + g.c1 + g.c2 + (g.s ? 's' + g.s : '')).replace(/[^a-zA-Z0-9]/g, ''); }
  /** The patterns a shape can be filled with (besides flat colour and fades): a tile of `s` units, drawn in the two colours. */
  var SKETCH_PATTERNS = ['stripes', 'dots', 'check', 'hearts', 'stars'];
  /** @returns {string} The SVG for a pattern fill: colour 2 is the ground, colour 1 the little pictures. */
  function sketchPatternDef(g) {
    var s = g.s || 10, h = s / 2, n = function (v) { return +v.toFixed(2); }, ground = '<rect width="' + n(s) + '" height="' + n(s) + '" fill="' + g.c2 + '"/>', motif, extra = '';
    if (g.type === 'stripes') { motif = '<rect width="' + n(s) + '" height="' + n(h) + '" fill="' + g.c1 + '"/>'; extra = ' patternTransform="rotate(45)"'; }
    else if (g.type === 'dots') motif = '<circle cx="' + n(h) + '" cy="' + n(h) + '" r="' + n(s * 0.22) + '" fill="' + g.c1 + '"/>';
    else if (g.type === 'check') motif = '<rect width="' + n(h) + '" height="' + n(h) + '" fill="' + g.c1 + '"/><rect x="' + n(h) + '" y="' + n(h) + '" width="' + n(h) + '" height="' + n(h) + '" fill="' + g.c1 + '"/>';
    else if (g.type === 'hearts') motif = '<path transform="translate(' + n(s * 0.2) + ' ' + n(s * 0.2) + ') scale(' + n(s * 0.6) + ')" d="M.5 .9C.1 .6 0 .4 .1 .25C.22 .08 .44 .12 .5 .3C.56 .12 .78 .08 .9 .25C1 .4 .9 .6 .5 .9Z" fill="' + g.c1 + '"/>';
    else {
      var pts = [], i;
      for (i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.46; pts.push(n(0.5 + Math.cos(a) * r) + ' ' + n(0.54 + Math.sin(a) * r)); }
      motif = '<path transform="translate(' + n(s * 0.2) + ' ' + n(s * 0.2) + ') scale(' + n(s * 0.6) + ')" d="M' + pts.join('L') + 'Z" fill="' + g.c1 + '"/>';
    }
    return '<pattern id="' + sketchGradId(g) + '" patternUnits="userSpaceOnUse" width="' + n(s) + '" height="' + n(s) + '"' + extra + '>' + ground + motif + '</pattern>';
  }
  /** @returns {string} The SVG for a gradient fill: type 'v' fades top to bottom, 'h' left to right, 'r' from the middle out. */
  function sketchGradDef(g) {
    if (SKETCH_PATTERNS.indexOf(g.type) !== -1) return sketchPatternDef(g);
    var id = sketchGradId(g), stops = '<stop offset="0" stop-color="' + g.c1 + '"/><stop offset="1" stop-color="' + g.c2 + '"/>';
    if (g.type === 'r') return '<radialGradient id="' + id + '" cx="0.5" cy="0.5" r="0.6">' + stops + '</radialGradient>';
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (g.type === 'h' ? 1 : 0) + '" y2="' + (g.type === 'h' ? 0 : 1) + '">' + stops + '</linearGradient>';
  }
  /** @returns {number} How much a soft (airbrush) line is blurred, for its thickness. */
  function sketchSoftBlur(width) { return +(width * 0.45).toFixed(2); }
  /** @returns {string} A name for the blur of a given amount. */
  function sketchBlurId(sd) { return 'b' + String(sd).replace('.', '_'); }
  /** @returns {string} The SVG for a blur filter (room round the line so the soft edge is not cut off). */
  function sketchBlurDef(sd) { return '<filter id="' + sketchBlurId(sd) + '" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="' + sd + '"/></filter>'; }

  /** The outline of the pet's body (the same as the game's #bodyClip), shrunk a hair so a clipped line meets the pet's brown outline with no gap. */
  var SKETCH_BODY_PATH = 'M80 139C41 139 13 129 13 102C13 70 36 38 80 38C124 38 147 70 147 102C147 129 119 139 80 139Z';
  /** @returns {string} The SVG clip path that keeps a drawing inside the pet's body. */
  function sketchClipDef() { return '<clipPath id="bodyclip"><path transform="translate(80 90) scale(.99) translate(-80 -90)" d="' + SKETCH_BODY_PATH + '"/></clipPath>'; }
  /**
   * Turns a line drawn with a pressure-sensitive pen into a filled outline: the line is as wide at each point as the pen was pressed.
   * @param {number[][]} pts
   * @param {number[]} widths  Full width at each point.
   * @returns {number[][]} The polygon (round at both ends).
   */
  function sketchRibbon(pts, widths) {
    var n = pts.length, i, k;
    if (!n) return [];
    // soften the width a little so it does not jump from point to point
    var w = widths.map(function (_, j) { var a = 0, c = 0; for (var q = -2; q <= 2; q++) if (widths[j + q] !== undefined) { a += widths[j + q]; c++; } return Math.max(0.05, a / c); });
    var arc = function (c, dir, r) {
      var out = [], base = Math.atan2(dir[1], dir[0]);
      for (var m = 1; m < 8; m++) { var a = base - Math.PI / 2 + Math.PI * m / 8; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
      return out;
    };
    if (n === 1) { var dot = []; for (k = 0; k < 14; k++) dot.push([pts[0][0] + Math.cos(k * Math.PI / 7) * w[0] / 2, pts[0][1] + Math.sin(k * Math.PI / 7) * w[0] / 2]); return dot.map(rnd2); }
    var L1 = [], R1 = [], dirs = [];
    for (i = 0; i < n; i++) {
      var a0 = pts[Math.max(0, i - 1)], b0 = pts[Math.min(n - 1, i + 1)], dx = b0[0] - a0[0], dy = b0[1] - a0[1], d = Math.hypot(dx, dy) || 1;
      dirs.push([dx / d, dy / d]);
      L1.push([pts[i][0] - dy / d * w[i] / 2, pts[i][1] + dx / d * w[i] / 2]);
      R1.push([pts[i][0] + dy / d * w[i] / 2, pts[i][1] - dx / d * w[i] / 2]);
    }
    var poly = L1.concat(arc(pts[n - 1], dirs[n - 1], w[n - 1] / 2), R1.slice().reverse(), arc(pts[0], [-dirs[0][0], -dirs[0][1]], w[0] / 2));
    return poly.map(rnd2);
  }
  function rnd2(p) { return [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]; }

  /** The special line styles of the sketchpad: dash and gap lengths in line widths (a dot is a very short dash with round ends). */
  var SKETCH_STYLES = {
    solid: null, dotted: [0.01, 2.2], dashed: [3, 2.2], long: [6, 3], dashdot: [4, 2, 0.01, 2], stitch: [1.6, 1.6],
    tiny: [0.01, 1.3], wide: [0.01, 4.5], short: [1.4, 1.8], dashdots: [4, 2, 0.01, 2, 0.01, 2], morse: [4, 1.6, 0.01, 1.6, 4, 1.6, 0.01, 4]
  };
  /** @returns {{array: ?string, cap: string}} The stroke-dasharray (null for a solid line) and the line end to draw a style with. */
  function sketchDash(style, width) {
    var d = SKETCH_STYLES[style];
    if (!d) return { array: null, cap: 'round' };
    return { array: d.map(function (n) { return Math.max(0.01, +(n * width).toFixed(3)); }).join(' '), cap: style === 'stitch' ? 'butt' : 'round' };
  }
  /**
   * Turns a line into a wavy one: the points are spread evenly along it and pushed sideways in a sine wave.
   * @param {number[][]} pts
   * @param {number} amp  How far the wave swings to each side.
   * @param {number} len  Wavelength.
   * @returns {number[][]}
   */
  function sketchWave(pts, amp, len) {
    if (pts.length < 2) return pts.slice();
    var rs = skResample(pts, len / 10), out = [], s = 0, i;
    for (i = 0; i < rs.length; i++) {
      var a = rs[Math.max(0, i - 1)], b = rs[Math.min(rs.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      if (i) s += Math.hypot(rs[i][0] - rs[i - 1][0], rs[i][1] - rs[i - 1][1]);
      var k = Math.sin(2 * Math.PI * s / len) * amp * Math.min(1, s / (len / 2), Math.max(0, (rs.length - 1 - i) * len / 10) / (len / 2));   // eases in and out so the ends stay on the line
      out.push([+(rs[i][0] - dy / d * k).toFixed(2), +(rs[i][1] + dx / d * k).toFixed(2)]);
    }
    return out;
  }
  /** @returns {number[][]} A polygon with its corners rounded (each corner is cut `r` back along both edges and joined with a curve). */
  function skRoundPoly(poly, r, steps) {
    var out = [], n = poly.length, i, k;
    for (i = 0; i < n; i++) {
      var p = poly[i], a = poly[(i + n - 1) % n], b = poly[(i + 1) % n];
      var la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), ra = Math.min(r, la / 2) / la, rb = Math.min(r, lb / 2) / lb;
      var s = [p[0] + (a[0] - p[0]) * ra, p[1] + (a[1] - p[1]) * ra], e = [p[0] + (b[0] - p[0]) * rb, p[1] + (b[1] - p[1]) * rb];
      for (k = 0; k <= steps; k++) {   // a curve from s to e that bends towards the corner
        var t = k / steps, u = 1 - t;
        out.push([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]]);
      }
    }
    return out;
  }
  /** @returns {number[][]} A line along the polygon with a point every `step`, so sharp corners stay sharp when the line is smoothed. */
  function skDense(poly, step) {
    var out = [], n = poly.length, i, k;
    for (i = 0; i < n; i++) {
      var a = poly[i], b = poly[(i + 1) % n], m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (k = 0; k < m; k++) out.push([a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m]);
    }
    return out;
  }
  /** @returns {number[][]} Points scaled to fill the box 0..1 in both directions. */
  function skFit(pts) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    return pts.map(function (p) { return [(p[0] - x0) / ((x1 - x0) || 1), (p[1] - y0) / ((y1 - y0) || 1)]; });
  }
  var SKETCH_SHAPES = [['circle', 'Circle'], ['square', 'Square'], ['triangle', 'Triangle'], ['diamond', 'Diamond'], ['hexagon', 'Hexagon'], ['heart', 'Heart'], ['star', 'Star'], ['sparkle', 'Sparkle'], ['cloud', 'Cloud'], ['flower', 'Flower'], ['moon', 'Moon'], ['drop', 'Drop']];
  /**
   * The outline of a common cute shape, as points filling the box 0..1 x 0..1 (to be stretched to wherever it is drawn).
   * @param {string} id  One of SKETCH_SHAPES.
   * @returns {number[][]}
   */
  function sketchShape(id) {
    var i, pts = [], T = Math.PI * 2;
    function polar(n, f) { var o = []; for (i = 0; i < n; i++) { var a = T * i / n - Math.PI / 2, r = f(a, i); o.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]); } return o; }
    if (id === 'circle') return polar(48, function () { return 0.5; });
    if (id === 'square') return skFit(skRoundPoly([[0, 0], [1, 0], [1, 1], [0, 1]], 0.22, 8));
    if (id === 'triangle') return skFit(skRoundPoly([[0.5, 0.02], [1, 0.95], [0, 0.95]], 0.14, 10));
    if (id === 'diamond') return skFit(skRoundPoly([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], 0.14, 8));
    if (id === 'hexagon') return skFit(skRoundPoly(polar(6, function () { return 0.5; }), 0.14, 6));
    if (id === 'heart') {
      for (i = 0; i < 64; i++) { var t = T * i / 64; pts.push([16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); }
      return skFit(pts);
    }
    if (id === 'star') return skFit(skRoundPoly(polar(10, function (a, k) { return k % 2 ? 0.24 : 0.5; }), 0.07, 5));
    if (id === 'sparkle') return skFit(skRoundPoly(polar(8, function (a, k) { return k % 2 ? 0.13 : 0.5; }), 0.09, 5));
    if (id === 'flower') return skFit(polar(80, function (a) { return 0.7 + 0.3 * Math.cos(5 * (a + Math.PI / 2)); }));
    if (id === 'cloud') {   // a few round bumps: for each direction, the farthest edge of any of them
      var cs = [[0.27, 0.62, 0.2], [0.5, 0.42, 0.28], [0.74, 0.56, 0.22], [0.5, 0.66, 0.22]], cx = 0.5, cy = 0.58, o = [];
      for (i = 0; i < 90; i++) {
        var a2 = T * i / 90, dx = Math.cos(a2), dy = Math.sin(a2), far = 0;
        cs.forEach(function (c) {
          var fx = cx - c[0], fy = cy - c[1], b = fx * dx + fy * dy, d = b * b - (fx * fx + fy * fy - c[2] * c[2]);
          if (d >= 0) far = Math.max(far, -b + Math.sqrt(d));
        });
        o.push([cx + dx * far, Math.min(0.84, cy + dy * far)]);   // the bottom is flat
      }
      return skFit(o);
    }
    if (id === 'moon') {
      var outer = [], inner = [], oc = [0.5, 0.5, 0.5], ic = [0.74, 0.42, 0.4];
      for (i = 0; i < 120; i++) {
        var a3 = T * i / 120, op = [oc[0] + Math.cos(a3) * oc[2], oc[1] + Math.sin(a3) * oc[2]], ip = [ic[0] + Math.cos(a3) * ic[2], ic[1] + Math.sin(a3) * ic[2]];
        if (Math.hypot(op[0] - ic[0], op[1] - ic[1]) > ic[2]) outer.push(op);
        if (Math.hypot(ip[0] - oc[0], ip[1] - oc[1]) < oc[2]) inner.push(ip);
      }
      var cut = outer.findIndex(function (p, k) { return Math.hypot(p[0] - outer[(k + 1) % outer.length][0], p[1] - outer[(k + 1) % outer.length][1]) > 0.1; });
      if (cut >= 0) outer = outer.slice(cut + 1).concat(outer.slice(0, cut + 1));
      var cut2 = inner.findIndex(function (p, k) { return Math.hypot(p[0] - inner[(k + 1) % inner.length][0], p[1] - inner[(k + 1) % inner.length][1]) > 0.1; });
      if (cut2 >= 0) inner = inner.slice(cut2 + 1).concat(inner.slice(0, cut2 + 1));
      var end = outer[outer.length - 1];
      if (Math.hypot(inner[0][0] - end[0], inner[0][1] - end[1]) > Math.hypot(inner[inner.length - 1][0] - end[0], inner[inner.length - 1][1] - end[1])) inner.reverse();
      return skFit(outer.concat(inner));
    }
    if (id === 'drop') {
      var r = 0.34, d = 0.66, al = Math.acos(r / d), arc = [];
      for (i = 0; i <= 50; i++) { var f = -Math.PI / 2 + al + (T - 2 * al) * i / 50; arc.push([0.5 + Math.cos(f) * r, 0.66 + Math.sin(f) * r]); }
      return skFit(skDense([[0.5, 0]].concat(arc), 0.03));
    }
    return polar(48, function () { return 0.5; });
  }
  /** @returns {boolean} Whether a point is inside a closed shape (the lasso), given as a list of [x, y] corners. */
  function inPolygon(poly, pt) {
    var inside = false, i, j;
    for (i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  /**
   * Moves, resizes or turns a drawn line (the transform tool). The original is not changed, so a drag can always be worked out from
   * how the line looked when it began.
   * @param {{pts: number[][], d: ?string, width: number}} stroke
   * @param {{kind: 'move', dx: number, dy: number}|{kind: 'scale', ax: number, ay: number, sx: number, sy: number}|{kind: 'rotate', cx: number, cy: number, a: number}|{kind: 'flip', axis: 'x'|'y', c: number}} op
   *   scale grows the line away from the anchor (ax, ay); rotate turns it round (cx, cy) by `a` radians; flip mirrors it across the vertical (axis 'x') or horizontal (axis 'y') line at `c`.
   * @returns {{pts: number[][], d: ?string, width: number}}
   */
  function sketchXform(stroke, op) {
    var cos = Math.cos(op.a || 0), sin = Math.sin(op.a || 0);
    function at(x, y) {
      if (op.kind === 'move') return [x + op.dx, y + op.dy];
      if (op.kind === 'flip') return op.axis === 'x' ? [2 * op.c - x, y] : [x, 2 * op.c - y];
      if (op.kind === 'scale') return [op.ax + (x - op.ax) * op.sx, op.ay + (y - op.ay) * op.sy];
      return [op.cx + (x - op.cx) * cos - (y - op.cy) * sin, op.cy + (x - op.cx) * sin + (y - op.cy) * cos];
    }
    function r2(n) { return Math.round(n * 100) / 100; }
    var out = { pts: stroke.pts.map(function (p) { var q = at(p[0], p[1]); return [r2(q[0]), r2(q[1])]; }), width: stroke.width, d: stroke.d };
    if (op.kind === 'scale') out.width = r2(stroke.width * Math.sqrt(Math.abs(op.sx * op.sy)));
    if (stroke.d) {   // a paint-bucket fill keeps its outline as path text made of "x y" pairs
      out.d = stroke.d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, function (m, x, y) { var q = at(+x, +y); return r2(q[0]) + ' ' + r2(q[1]); });
    }
    return out;
  }

  /** @returns {number} Distance between two points. */
  function skDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  /** @returns {number[][]} The line redrawn with a point every `step` along it (the last point is kept). */
  function skResample(pts, step) {
    var out = [pts[0].slice()], carry = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], d = skDist(a, b);
      if (!d) continue;
      var t = step - carry;
      while (t <= d) { out.push([a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d]); t += step; }
      carry = d - (t - step);
    }
    var last = pts[pts.length - 1];
    if (skDist(out[out.length - 1], last) > step * 0.3) out.push(last.slice()); else out[out.length - 1] = last.slice();
    return out;
  }
  /** @returns {number[][]} The line with fewer points (Ramer-Douglas-Peucker), off by at most `eps`. */
  function skSimplify(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var a = pts[0], b = pts[pts.length - 1], worst = -1, at = 0;
    for (var i = 1; i < pts.length - 1; i++) {
      var d = skLineDist(pts[i], a, b);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst <= eps) return [a, b];
    return skSimplify(pts.slice(0, at + 1), eps).slice(0, -1).concat(skSimplify(pts.slice(at), eps));
  }
  /** @returns {number} How far a point is from the segment a-b. */
  function skLineDist(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
    var t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
    return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
  }
  /**
   * Cleans up a hand-drawn line: evens out the wobble and, if asked, turns a near-straight line into a straight one and a
   * near-round loop into a true ellipse.
   * @param {number[][]} pts The points as drawn.
   * @param {number} w The width of the drawing area (sizes are relative to it, so it works at any scale).
   * @param {{passes: number, snap: boolean}} how `passes` is how much to smooth (0 leaves the line alone).
   * @returns {{pts: number[][], closed: boolean}}
   */
  function tidyStroke(pts, w, how) {
    var passes = how && how.passes || 0;
    if (!passes || pts.length < 4) return { pts: pts.map(function (p) { return p.slice(); }), closed: false };
    var rs = skResample(pts, w * 0.006), n = rs.length, len = 0, i;
    for (i = 1; i < n; i++) len += skDist(rs[i - 1], rs[i]);
    if (n < 4 || len < w * 0.02) return { pts: pts.map(function (p) { return p.slice(); }), closed: false };
    var closed = skDist(rs[0], rs[n - 1]) < len * 0.15 && len > w * 0.05;
    if (how.snap && !closed) {   // a straight line
      var chord = skDist(rs[0], rs[n - 1]), worst = 0;
      for (i = 1; i < n - 1; i++) worst = Math.max(worst, skLineDist(rs[i], rs[0], rs[n - 1]));
      if (chord > w * 0.02 && worst < chord * 0.04) return { pts: [rs[0], rs[n - 1]], closed: false };
    }
    if (how.snap && closed) {   // a round loop: fit an ellipse along the loop's own long and short axes
      var mx = 0, my = 0, sxx = 0, syy = 0, sxy = 0;
      rs.forEach(function (p) { mx += p[0] / n; my += p[1] / n; });
      rs.forEach(function (p) { var dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; });
      var th = 0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(th), s = Math.sin(th);
      var us = rs.map(function (p) { return [(p[0] - mx) * c + (p[1] - my) * s, -(p[0] - mx) * s + (p[1] - my) * c]; });
      var u0 = Math.min.apply(0, us.map(function (u) { return u[0]; })), u1 = Math.max.apply(0, us.map(function (u) { return u[0]; }));
      var v0 = Math.min.apply(0, us.map(function (u) { return u[1]; })), v1 = Math.max.apply(0, us.map(function (u) { return u[1]; }));
      var cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, rx = (u1 - u0) / 2, ry = (v1 - v0) / 2;
      if (rx > w * 0.01 && ry > w * 0.01) {
        var rr = us.map(function (u) { return Math.hypot((u[0] - cu) / rx, (u[1] - cv) / ry); });
        var mean = rr.reduce(function (a, b) { return a + b; }, 0) / n;
        var sd = Math.sqrt(rr.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / n);
        if (sd < 0.09 && mean > 0.85 && mean < 1.15) {
          var out = [];
          for (i = 0; i <= 40; i++) {
            var a = i / 40 * Math.PI * 2, u = cu + rx * Math.cos(a), v = cv + ry * Math.sin(a);
            out.push([mx + u * c - v * s, my + u * s + v * c]);
          }
          return { pts: out, closed: true };
        }
      }
    }
    for (var k = 0; k < passes; k++) {   // 1-2-1 smoothing; an open line keeps its ends, a loop wraps round
      var next = rs.map(function (p, j) {
        if (!closed && (j === 0 || j === n - 1)) return p;
        var a = rs[(j + n - 1) % n], b = rs[(j + 1) % n];
        if (closed && j === 0) a = rs[n - 2];
        if (closed && j === n - 1) b = rs[1];
        return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
      });
      rs = next;
    }
    if (closed) rs[n - 1] = rs[0].slice();
    return { pts: skSimplify(rs, w * 0.0012), closed: closed };
  }

  /**
   * What Nibble says about a recipe he has just read: by the dish in its title, else by what is in it, else by how big it is.
   * @param {string} title  The recipe's name ("" for pasted ingredients).
   * @param {{name: string}[]} found  The ingredients found.
   * @param {function(): number} [random]
   * @returns {string} A short line.
   */
  function recipeRemark(title, found, random) {
    var rnd = random || Math.random;
    var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
    var t = String(title || '').toLowerCase();
    var names = (found || []).map(function (f) { return String(f.name || '').toLowerCase(); }).join(' | ');
    var dishes = [
      [/mac(?:aroni)?\b.*cheese|\bcheesy\b/, ['cheesy!! yes please', 'so much cheese… I love it']],
      [/chicken/, ['ooh, chicken!', 'chicken night? yum!']],
      [/pasta|spaghetti|lasagn|noodle|ramen|pizza|pizzoc/, ['carbs!! my favourite', 'ooh, comfy food!']],
      [/cookie|cake|brownie|muffin|cupcake|pie\b|tart\b|dessert|pudding|ice cream|cheesecake/, ['a sweet one!! can I try?', 'ooh, treat time!']],
      [/bread|loaf|bun\b|rolls?\b|dough|bagel/, ['fresh bread… I can smell it', 'baking day! yay!']],
      [/soup|stew|chili|casserole|curry|potpie|pot pie|hotpot/, ['cosy and warm…', 'ooh, a big warm pot!']],
      [/salad|bowl|veggie|vegetable/, ['fresh and crunchy!', 'so healthy! good job']],
      [/taco|burrito|nacho|quesadilla|fajita/, ['taco time!', 'ooh, spicy and yummy']],
      [/pancake|waffle|crepe|french toast|breakfast|oat/, ['breakfast!! yay', 'ooh, a yummy morning']],
      [/fish|salmon|shrimp|tuna|sushi/, ['ooh, fishy!', 'splashy and yummy']]
    ];
    for (var i = 0; i < dishes.length; i++) if (dishes[i][0].test(t)) return pick(dishes[i][1]);
    var byFood = [[/chocolate|cocoa|cacao/, 'chocolate?? lucky you!'], [/cheese/, 'ooh, cheese!'], [/bacon/, 'bacon!! I smell it already'], [/butter/, 'mmm, buttery…'], [/chili|cayenne|sriracha|jalape/, 'ooh, a bit spicy!']];
    for (var j = 0; j < byFood.length; j++) if (byFood[j][0].test(names)) return byFood[j][1];
    var n = (found || []).length;
    if (n >= 15) return 'so many things! big cooking day';
    if (n && n <= 5) return pick(['easy one! just a few things', 'quick and simple, I like it']);
    return pick(['ooh, that looks yummy!', 'yum! what are we making?', 'sounds tasty!']);
  }

  root.PetLogic = {
    recipeRemark: recipeRemark,
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
    nextWish: nextWish,
    treatsToday: treatsToday,
    TREATS_PER_DAY: TREATS_PER_DAY,
    TREAT_WORDS: TREAT_WORDS,
    progress: progress,
    isUnlocked: isUnlocked,
    gateFor: gateFor,
    emojiFor: emojiFor,
    splitSpoken: splitSpoken, wornIds: wornIds, toggleWorn: toggleWorn, faceStack: faceStack, isFarOff: isFarOff, PLAN_AHEAD_DAYS: PLAN_AHEAD_DAYS, monthGrid: monthGrid, tasksOn: tasksOn, addStamp: addStamp, stampTotal: stampTotal, AISLES: AISLES, aisleOf: aisleOf, groupByAisle: groupByAisle, cleanTask: cleanTask, firstOnDays: firstOnDays, repeatDays: repeatDays, REPEATS: REPEATS, REPEAT_SPANS: REPEAT_SPANS, untilFor: untilFor, isDayKey: isDayKey, isTimeKey: isTimeKey, addDays: addDays, addMonths: addMonths, daysUntil: daysUntil, dueInfo: dueInfo, nextDue: nextDue, sortByDue: sortByDue,
    createItem: createItem,
    petProfile: petProfile,
    parsePlayer: parsePlayer,
    CLOSET_MAX: CLOSET_MAX,
    cleanOutfitName: cleanOutfitName,
    parseCloset: parseCloset,
    isDressed: isDressed,
    sameOutfit: sameOutfit,
    saveOutfit: saveOutfit,
    parseState: parseState,
    mood: mood,
    addToList: addToList,
    toggleDone: toggleDone,
    pickEmoji: pickEmoji,
    soundFor: soundFor,
    sketchPath: sketchPath, sketchHit: sketchHit, sketchSvg: sketchSvg, tidyStroke: tidyStroke, floodMask: floodMask, sketchXform: sketchXform, inPolygon: inPolygon, sketchDash: sketchDash, fitCurve: fitCurve, sketchPathClean: sketchPathClean, sketchItemCode: sketchItemCode, sketchGradId: sketchGradId, sketchGradDef: sketchGradDef, sketchSoftBlur: sketchSoftBlur, sketchBlurId: sketchBlurId, sketchBlurDef: sketchBlurDef, sketchShape: sketchShape, sketchRibbon: sketchRibbon, sketchClipDef: sketchClipDef, SKETCH_PATTERNS: SKETCH_PATTERNS, SKETCH_SHAPES: SKETCH_SHAPES, sketchWave: sketchWave, SKETCH_STYLES: SKETCH_STYLES, traceLoops: traceLoops, simplifyLine: skSimplify
  };
})(typeof self !== 'undefined' ? self : globalThis);
