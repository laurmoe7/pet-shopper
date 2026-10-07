/* Rules for keeping several devices in step (plain functions, no page code, so they can be tested in Node).
 * Loaded after logic.js; exposes the global `Sync`. Nothing here talks to a server yet.
 *
 * How it works: every device keeps a small table of "when did this change" next to the saved state
 * (state.sync). `stamp` fills it by comparing what is saved with what it saw last time, so the rest of
 * the app doesn't have to know about syncing. `snapshot` turns the state into a document, `merge` joins
 * two documents (the same result whichever way round, and joining twice changes nothing), and `apply`
 * writes a merged document back into the state.
 *
 * Merge rules, by kind of data:
 * - shopping list items: one record per item id; the latest change wins (whole item). A deleted item stays as a
 *   "removed" marker for TOMBSTONE_DAYS so the other devices learn of it.
 * - single things (name, look, personality, room, closet, player, emoji overrides): the latest change wins.
 * - counters (goals, tastes, stamps, favourites, prizes): the larger value wins, so progress is never lost.
 *   They never go down through syncing, and two devices counting different things at once keep the larger
 *   count, not the sum.
 * - gift boxes, treats and the fair-play memory: the later day wins; on the same day what both know is joined.
 * Left on each device: the to-do list (private to each person), the lamp and sleep, options, developer
 * switches, which list is showing.
 */
(function (root) {
  'use strict';

  var VERSION = 1;
  /** Removed markers older than this are dropped: a device that was off for longer may bring a deleted item back. */
  var TOMBSTONE_DAYS = 30;
  var DAY_MS = 24 * 3600 * 1000;
  /** Only the shopping list is shared; the to-do list stays private to each person and is never stamped, sent or changed by syncing. */
  var LISTS = ['shop'];
  /** The single things merged by "latest change wins", with how to read and write each one in the state. */
  var FIELDS = {
    'pet.name': { get: function (s) { return s.pet.name; }, set: function (s, v) { s.pet.name = v; } },
    // species, skin and outfit change together, so they are one thing (a frog skin must not land on a cat)
    'pet.look': {
      get: function (s) { return { species: s.pet.species, skin: s.pet.skin, outfit: s.pet.outfit }; },
      set: function (s, v) { s.pet.species = v.species; s.pet.skin = v.skin; s.pet.outfit = v.outfit; }
    },
    'pet.personality': { get: function (s) { return s.pet.personality; }, set: function (s, v) { s.pet.personality = v; } },
    'pet.room': { get: function (s) { return s.pet.room; }, set: function (s, v) { s.pet.room = v; } },
    'pet.closet': { get: function (s) { return s.pet.closet; }, set: function (s, v) { s.pet.closet = v; } },
    'player': { get: function (s) { return s.player; }, set: function (s, v) { s.player = v; } },
    'overrides': { get: function (s) { return s.overrides; }, set: function (s, v) { s.overrides = v; } }
  };
  var FIELD_NAMES = Object.keys(FIELDS);
  /** The pet's counters, each merged by its own rule (see `mergeCounter`). */
  var COUNTERS = ['achievements', 'tastes', 'stamps', 'favourites', 'gifts', 'prizes', 'treats', 'guard'];

  // ---------- small helpers ----------

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function copy(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /** JSON with the keys in order, so the same thing always gives the same text. */
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (isObj(v)) return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }

  /** A short fingerprint of a piece of text (cyrb53), to tell "changed" from "same" without keeping a second copy. */
  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function fingerprint(v) { return hash(stable(v)); }

  /** @returns {string} A short random name for this device. */
  function newDevice() {
    var s = '';
    while (s.length < 6) s += Math.random().toString(36).slice(2);
    return s.slice(0, 6);
  }

  /** @returns {Item[]} The items of one list ('shop' or 'todo'), whichever of items/stash holds it now. Only 'shop' is synced. */
  function listArray(state, name) {
    return (state.mode === 'todo') === (name === 'todo') ? state.items : state.stash;
  }

  // ---------- the table of changes kept in state.sync ----------

  /**
   * Cleans whatever was saved as state.sync (nothing, an older format or damaged data) into a usable table.
   * @param {Object} [saved]
   * @returns {{v: number, device: string, seen: number, items: Object, fields: Object}}
   */
  function parse(saved) {
    saved = isObj(saved) ? saved : {};
    var meta = {
      v: VERSION,
      device: typeof saved.device === 'string' && /^[a-z0-9]{4,12}$/.test(saved.device) ? saved.device : newDevice(),
      seen: typeof saved.seen === 'number' && isFinite(saved.seen) ? saved.seen : 0,   // the latest change time seen from anywhere
      items: {},
      fields: {}
    };
    function entry(e) {
      if (!isObj(e) || typeof e.at !== 'number' || !isFinite(e.at) || typeof e.by !== 'string') return null;
      var out = { at: e.at, by: e.by, h: typeof e.h === 'string' ? e.h : '' };
      return out;
    }
    if (isObj(saved.items)) Object.keys(saved.items).forEach(function (id) {
      var e = entry(saved.items[id]);
      if (!e || LISTS.indexOf(saved.items[id].list) < 0) return;
      e.list = saved.items[id].list;
      if (saved.items[id].del) e.del = 1;
      meta.items[id] = e;
    });
    if (isObj(saved.fields)) Object.keys(saved.fields).forEach(function (name) {
      var e = entry(saved.fields[name]);
      if (e && FIELDS[name]) meta.fields[name] = e;
    });
    return meta;
  }

  /** The time to put on a change made now: never earlier than anything already seen, so a slow clock can't undo newer changes. */
  function clock(meta, now) { return Math.max(now, meta.seen + 1); }

  /**
   * Notes what changed since last time: marks changed and new items and fields with the time, and
   * deleted items as removed. Call it before saving and before every sync.
   * @param {Object} state  Needs state.sync (see parse).
   * @param {number} now  ms since 1970.
   * @param {boolean} [exact]  Use `now` as the time as it is (0 marks a first launch as "never edited").
   * @returns {{items: number, deleted: number, fields: string[]}} What was found.
   */
  function stamp(state, now, exact) {
    var meta = state.sync, out = { items: 0, deleted: 0, fields: [] };
    var at = exact ? now : clock(meta, now), seen = {};
    LISTS.forEach(function (name) {
      listArray(state, name).forEach(function (item) {
        seen[item.id] = 1;
        var h = fingerprint(item), m = meta.items[item.id];
        if (m && !m.del && m.h === h && m.list === name) return;
        meta.items[item.id] = { at: at, by: meta.device, h: h, list: name };
        out.items++;
      });
    });
    Object.keys(meta.items).forEach(function (id) {
      var m = meta.items[id];
      if (seen[id] || m.del) return;
      meta.items[id] = { at: at, by: meta.device, h: '', list: m.list, del: 1 };
      out.deleted++;
    });
    FIELD_NAMES.forEach(function (name) {
      var h = fingerprint(FIELDS[name].get(state)), m = meta.fields[name];
      if (m && m.h === h) return;
      meta.fields[name] = { at: at, by: meta.device, h: h };
      out.fields.push(name);
    });
    if (!exact && (out.items || out.deleted || out.fields.length)) meta.seen = at;   // the next change is always later than this one
    prune(meta, now);
    return out;
  }

  /** Forgets removed markers older than TOMBSTONE_DAYS. @returns {number} How many were dropped. */
  function prune(meta, now) {
    var n = 0;
    Object.keys(meta.items).forEach(function (id) {
      var m = meta.items[id];
      if (m.del && now - m.at > TOMBSTONE_DAYS * DAY_MS) { delete meta.items[id]; n++; }
    });
    return n;
  }

  // ---------- documents ----------

  /**
   * The state as a document that can be sent away and merged: a record per item (with the item itself, or
   * a "removed" marker), a record per single thing, and the counters.
   * @param {Object} state
   * @param {number} now  Used to note what changed first.
   * @param {{skipSample: boolean}} [opts]  skipSample leaves out items nobody has touched since the first launch
   *   (the sample list, time 0), so they stay on this device and never reach an account.
   */
  function snapshot(state, now, opts) {
    stamp(state, now);
    var meta = state.sync, doc = { v: VERSION, items: {}, fields: {}, counters: {} };
    var byId = {};
    LISTS.forEach(function (name) { listArray(state, name).forEach(function (item) { byId[item.id] = item; }); });
    Object.keys(meta.items).forEach(function (id) {
      var m = meta.items[id], rec = { at: m.at, by: m.by, list: m.list };
      if (m.del) rec.del = 1; else if (byId[id]) rec.item = copy(byId[id]); else return;
      if (opts && opts.skipSample && !m.del && m.at === 0) return;
      doc.items[id] = rec;
    });
    FIELD_NAMES.forEach(function (name) {
      var m = meta.fields[name] || { at: 0, by: meta.device };
      doc.fields[name] = { at: m.at, by: m.by, value: copy(FIELDS[name].get(state)) };
    });
    COUNTERS.forEach(function (k) { doc.counters[k] = copy(state.pet[k]); });
    return doc;
  }

  /** Puts two records in a fixed order (latest first, then by device, then removed before kept, then by content): the same answer whichever is passed first. */
  function order(a, b) {
    if (a.at !== b.at) return a.at > b.at ? 1 : -1;
    if (a.by !== b.by) return a.by > b.by ? 1 : -1;
    if (!!a.del !== !!b.del) return a.del ? 1 : -1;
    var x = stable(a), y = stable(b);
    return x === y ? 0 : (x > y ? 1 : -1);
  }
  function validRecord(r) { return isObj(r) && typeof r.at === 'number' && isFinite(r.at) && typeof r.by === 'string'; }
  /** An item record has the item itself or is a removed marker, and sits in a known list; a field record has a value. */
  function validPart(part, r) {
    if (!validRecord(r)) return false;
    if (part === 'fields') return r.value !== undefined;
    return LISTS.indexOf(r.list) >= 0 && (!!r.del || isObj(r.item));
  }

  function unionSorted(a, b) {
    var seen = {}, out = [];
    (Array.isArray(a) ? a : []).concat(Array.isArray(b) ? b : []).forEach(function (x) { if (typeof x === 'string' && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out.sort();
  }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function maxMap(a, b) {
    var out = {};
    [a, b].forEach(function (m) { if (isObj(m)) Object.keys(m).forEach(function (k) { out[k] = Math.max(num(m[k]), k in out ? out[k] : 0); }); });
    return out;
  }
  /** The entry with more done: the higher count, then the later day, then the higher count for that day. */
  function higherProgress(a, b) {
    if (!isObj(a)) return b; if (!isObj(b)) return a;
    if (num(a.count) !== num(b.count)) return num(a.count) > num(b.count) ? a : b;
    if ((a.day || '') !== (b.day || '')) return (a.day || '') > (b.day || '') ? a : b;
    if (num(a.today) !== num(b.today)) return num(a.today) > num(b.today) ? a : b;
    return stable(a) >= stable(b) ? a : b;
  }
  function mergeProgress(a, b) {
    var out = {};
    [a, b].forEach(function (m) { if (isObj(m)) Object.keys(m).forEach(function (k) { out[k] = k in out ? higherProgress(out[k], m[k]) : m[k]; }); });
    return copy(out);
  }
  /** The merge rule for one counter. */
  function mergeCounter(name, a, b) {
    if (name === 'achievements' || name === 'favourites') return mergeProgress(a, b);
    if (name === 'tastes' || name === 'stamps' || name === 'prizes') return maxMap(a, b);
    if (name === 'gifts') {   // day -> boxes opened that day
      var out = {};
      [a, b].forEach(function (m) { if (isObj(m)) Object.keys(m).forEach(function (d) { out[d] = unionSorted(out[d], m[d]); }); });
      return out;
    }
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var list = name === 'treats' ? 'used' : 'words';   // treats and guard: a day and what was done that day
    if ((a.day || '') !== (b.day || '')) return copy((a.day || '') > (b.day || '') ? a : b);
    var joined = { day: a.day || '' };
    joined[list] = unionSorted(a[list], b[list]);
    if (name === 'guard') joined.lastSeen = Math.max(num(a.lastSeen), num(b.lastSeen));
    return joined;
  }

  /**
   * Joins two documents. The answer is the same whichever is first, joining a document with itself changes
   * nothing, and joining three in any grouping gives one result.
   * @returns {Object} A new document.
   */
  function merge(a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var out = { v: VERSION, items: {}, fields: {}, counters: {} };
    ['items', 'fields'].forEach(function (part) {
      var x = isObj(a[part]) ? a[part] : {}, y = isObj(b[part]) ? b[part] : {};
      Object.keys(x).concat(Object.keys(y)).forEach(function (id) {
        if (id in out[part]) return;
        var ra = validPart(part, x[id]) ? x[id] : null, rb = validPart(part, y[id]) ? y[id] : null;
        var win = ra && rb ? (order(ra, rb) >= 0 ? ra : rb) : (ra || rb);
        if (win) out[part][id] = copy(win);
      });
    });
    var ca = isObj(a.counters) ? a.counters : {}, cb = isObj(b.counters) ? b.counters : {};
    COUNTERS.forEach(function (k) { out.counters[k] = mergeCounter(k, ca[k], cb[k]); });
    return out;
  }

  /** A document without removed markers older than TOMBSTONE_DAYS. */
  function trim(doc, now) {
    var out = copy(doc);
    Object.keys(out.items || {}).forEach(function (id) {
      if (out.items[id].del && now - out.items[id].at > TOMBSTONE_DAYS * DAY_MS) delete out.items[id];
    });
    return out;
  }

  // ---------- writing a document back ----------

  function validItem(item) {
    return isObj(item) && typeof item.id === 'string' && item.id && typeof item.text === 'string' && typeof item.emoji === 'string' && typeof item.cat === 'string' && typeof item.done === 'boolean';
  }

  /**
   * Writes a merged document into the state: items added, changed or removed, the single things and the
   * counters. Items keep their place; new ones go at the end of the to-buy part (or the end, if eaten);
   * eaten items stay below the rest. Afterwards the table in state.sync matches, so a later `stamp`
   * sees no change of its own. The to-do list is never touched.
   * @param {Object} state
   * @param {Object} doc  From `merge`.
   * @returns {{added: number, changed: number, removed: number, fields: string[]}}
   */
  function apply(state, doc) {
    var meta = state.sync, L = root.PetLogic, out = { added: 0, changed: 0, removed: 0, fields: [] };
    doc = isObj(doc) ? doc : {};
    var recs = isObj(doc.items) ? doc.items : {};
    var lists = {};
    LISTS.forEach(function (name) { lists[name] = listArray(state, name).slice(); });
    var where = {};   // id -> [list name, index]
    LISTS.forEach(function (name) { lists[name].forEach(function (item, i) { where[item.id] = [name, i]; }); });

    Object.keys(recs).forEach(function (id) {
      var rec = recs[id];
      if (!validPart('items', rec)) return;
      meta.seen = Math.max(meta.seen, rec.at);
      var here = where[id];
      if (rec.del) {
        if (here) { lists[here[0]][here[1]] = null; out.removed++; delete where[id]; }
        meta.items[id] = { at: rec.at, by: rec.by, h: '', list: rec.list, del: 1 };
        return;
      }
      var item = copy(rec.item);
      if (!validItem(item) || item.id !== id) return;
      if (L && L.cleanTask) L.cleanTask(item);
      var h = fingerprint(item);
      if (here) {
        var old = lists[here[0]][here[1]];
        if (fingerprint(old) !== h || here[0] !== rec.list) {
          if (here[0] === rec.list) { lists[here[0]][here[1]] = item; }
          else { lists[here[0]][here[1]] = null; lists[rec.list].push(item); }
          out.changed++;
        }
      } else {
        lists[rec.list].push(item);   // placed below
        out.added++;
      }
      meta.items[id] = { at: rec.at, by: rec.by, h: h, list: rec.list };
    });
    // items deleted here and not mentioned by the document stay deleted (they have their markers)
    LISTS.forEach(function (name) {
      var kept = lists[name].filter(function (i) { return i; });
      // to-buy first, eaten after, each part keeping its order
      lists[name] = kept.filter(function (i) { return !i.done; }).concat(kept.filter(function (i) { return i.done; }));
    });
    if (state.mode === 'todo') state.stash = lists.shop; else state.items = lists.shop;   // the to-do list is not touched

    var fields = isObj(doc.fields) ? doc.fields : {}, touched = [];
    FIELD_NAMES.forEach(function (name) {
      var rec = fields[name];
      if (!validPart('fields', rec)) return;
      meta.seen = Math.max(meta.seen, rec.at);
      if (fingerprint(FIELDS[name].get(state)) !== fingerprint(rec.value)) { FIELDS[name].set(state, copy(rec.value)); out.fields.push(name); }
      meta.fields[name] = { at: rec.at, by: rec.by, h: '' };
      touched.push(name);
    });
    if (isObj(doc.counters)) COUNTERS.forEach(function (k) { if (doc.counters[k] !== undefined) state.pet[k] = copy(doc.counters[k]); });
    // clean everything the way loading does, so a damaged document can't break the pet
    if (L && L.petProfile) state.pet = L.petProfile(state.pet);
    touched.forEach(function (name) { meta.fields[name].h = fingerprint(FIELDS[name].get(state)); });   // the fingerprint of what is really saved now
    return out;
  }

  /**
   * One whole round with another document (what the server will hold): notes local changes, merges, writes
   * the result into the state.
   * @param {Object} state
   * @param {Object} remote  The other document, or null if there is none yet.
   * @param {number} now
   * @param {{skipSample: boolean}} [opts]  See `snapshot`.
   * @returns {{doc: Object, applied: Object}} The merged document (to send back) and what changed here.
   */
  function sync(state, remote, now, opts) {
    var merged = trim(merge(snapshot(state, now, opts), remote), now);
    var applied = apply(state, merged);
    return { doc: merged, applied: applied };
  }

  /**
   * Removes the shopping items nobody has touched since the first launch (the sample list), so a device
   * joining an account that already has a list adopts the account's list instead of adding to it.
   * @returns {number} How many were removed.
   */
  function dropSample(state) {
    var meta = state.sync, list = listArray(state, 'shop'), n = 0;
    var kept = list.filter(function (item) {
      var m = meta.items[item.id];
      if (m && !m.del && m.at === 0) { delete meta.items[item.id]; n++; return false; }
      return true;
    });
    list.length = 0;
    kept.forEach(function (i) { list.push(i); });
    return n;
  }

  root.Sync = {
    VERSION: VERSION, TOMBSTONE_DAYS: TOMBSTONE_DAYS, FIELD_NAMES: FIELD_NAMES, COUNTERS: COUNTERS,
    parse: parse, dropSample: dropSample, stamp: stamp, prune: prune, snapshot: snapshot, merge: merge, trim: trim, apply: apply, sync: sync,
    hash: hash, stable: stable, fingerprint: fingerprint, newDevice: newDevice, listArray: listArray
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
