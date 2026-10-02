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
   */

  /**
   * @typedef {Object} PetProfile
   * @property {string} name
   * @property {string} species  One of the species ids, e.g. "mochi", "pig", "penguin".
   * @property {{hat: string}} outfit  Wardrobe item id per slot; "none" for no hat.
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
   * @returns {Item}
   */
  function createItem(text, overrides, id) {
    var found = emojiFor(text, overrides);
    return { id: id, text: text, emoji: found.emoji, cat: found.cat, done: false };
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
      outfit: { hat: (saved.outfit && saved.outfit.hat) || 'none' }
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

  root.PetLogic = {
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
