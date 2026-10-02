/* The app's rules, kept free of the page so they can be tested in Node.
 * Loaded as a classic script after foods.js; exposes the global `PetLogic`.
 */
(function (root) {
  'use strict';

  var Foods = root.Foods;

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
   * @property {string} species  One of the species ids, e.g. "mochi", "pig", "penguin".
   * @property {{hat: string}} outfit  Wardrobe item id per slot; "none" for no hat.
   * @property {Object<string, Progress>} achievements  Progress per achievement id.
   * @property {Guard} guard  What the anti-cheat rules remember.
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

  var SAMPLE = ['Bananas', 'Oat milk', '500g Quark', 'Broccoli', 'Chili flakes', 'Dark chocolate', 'Toilet paper', "Oma's cake"];

  /**
   * Finds the emoji for an item, preferring one the person picked for that word before.
   * @param {string} text
   * @param {Object<string, string>} overrides  Normalised item text -> picked emoji.
   * @returns {{emoji: string, cat: string}}
   */
  function emojiFor(text, overrides) {
    var picked = overrides && overrides[Foods.normalize(text)];
    if (picked) return { emoji: picked, cat: Foods.categoryOf(picked) };
    var m = Foods.match(text);
    return { emoji: m.emoji, cat: m.cat };
  }

  /**
   * Makes a new, unchecked list item.
   * @param {string} text
   * @param {Object<string, string>} overrides
   * @param {string} id
   * @param {number} [added]  When it was put on the list (ms); counts towards goals only after a while.
   * @returns {Item}
   */
  function createItem(text, overrides, id, added) {
    var found = emojiFor(text, overrides);
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
    return {
      name: typeof saved.name === 'string' ? saved.name : 'Nibble',
      species: saved.species || 'mochi',
      outfit: { hat: (saved.outfit && saved.outfit.hat) || 'none' },
      achievements: saved.achievements && typeof saved.achievements === 'object' ? saved.achievements : {},
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
   * @returns {{items: Item[], overrides: Object<string,string>, quiet: boolean, lastOpen: number, pet: PetProfile}}
   */
  function parseState(raw, nextId) {
    var data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.items)) {
      data = { items: [], overrides: {}, quiet: false, lastOpen: 0 };
      SAMPLE.forEach(function (t) { data.items.push(createItem(t, data.overrides, nextId())); });
    }
    data.overrides = data.overrides || {};
    data.pet = petProfile(data.pet);
    return data;
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
    state.items.forEach(function (i) {
      if (Foods.normalize(i.text) === key) { i.emoji = emoji; i.cat = Foods.categoryOf(emoji); }
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
   * @param {'species'|'hat'} kind
   * @param {string} id
   * @param {Object[]} achievements
   * @param {{species: string[], hat: string[]}} free
   * @returns {boolean}
   */
  function isUnlocked(profile, kind, id, achievements, free) {
    if (free[kind] && free[kind].indexOf(id) !== -1) return true;
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

  root.PetLogic = {
    FRESH_MS: FRESH_MS,
    TRIP_MIN_ITEMS: TRIP_MIN_ITEMS,
    dayKey: dayKey,
    countsFor: countsFor,
    recordEaten: recordEaten,
    recordTrip: recordTrip,
    refundEaten: refundEaten,
    progress: progress,
    isUnlocked: isUnlocked,
    gateFor: gateFor,
    emojiFor: emojiFor,
    createItem: createItem,
    petProfile: petProfile,
    parseState: parseState,
    mood: mood,
    addToList: addToList,
    toggleDone: toggleDone,
    pickEmoji: pickEmoji,
    soundFor: soundFor
  };
})(typeof self !== 'undefined' ? self : globalThis);
