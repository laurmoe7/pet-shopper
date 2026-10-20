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
 *   Two devices counting different things at once keep the larger count, not the sum.
 * - taking counts back (unticking an item or a task lowers tastes, stamps, goals, favourites and the fair-play
 *   words on purpose): the document's counters hold the "gross" value, which only grows (what is shown plus
 *   everything taken back), and each device adds its own record of what it took back (a `back.<device>` entry
 *   in the fields part, which only grows too). What is shown is the gross minus all take-backs. A server or
 *   device on older code keeps those entries as they are (latest wins) and sees the gross, as before.
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
  /** Every list a document may carry ('shared' is a household's shopping list): merge keeps their records, whatever this device sends. */
  var KNOWN_LISTS = ['shop', 'todo', 'shared'];
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
  var COUNTERS = ['achievements', 'tastes', 'stamps', 'favourites', 'gifts', 'prizes', 'plant', 'treats', 'guard'];
  /** The fields part's entries holding one device's take-backs are named this plus the device. */
  var BACK = 'back.';
  /** Take-back paths that are a yes/no for one day (counted today, a fair-play word) rather than a number. */
  var FLAGS = { fd: 1, g: 1 };

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
   * @param {Object} [pet]  The loaded pet: a save from before take-backs notes its counters now, so the first one is seen.
   * @returns {{v: number, device: string, seen: number, items: Object, fields: Object, was: ?Object, gross: Object, backs: Object}}
   */
  function parse(saved, pet) {
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
    // take-backs (see takeBack): the counters as last noted, the gross from the last sync, and every device's take-backs
    if (isObj(saved.was)) {
      meta.was = {};
      Object.keys(saved.was).forEach(function (p) { var v = saved.was[p]; if (Array.isArray(v) && typeof v[0] === 'string' && num(v[1]) === v[1]) meta.was[p] = [v[0], v[1]]; });
    } else if (isObj(pet)) meta.was = flat(pet);
    meta.gross = isObj(saved.gross) ? saved.gross : {};
    meta.backs = {};
    if (isObj(saved.backs)) Object.keys(saved.backs).forEach(function (dev) {
      var b = saved.backs[dev];
      if (isObj(b) && typeof b.at === 'number' && isFinite(b.at)) meta.backs[dev] = { at: b.at, paths: cleanPaths(b.paths) };
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
    var tookBack = takeBack(state, exact ? 0 : at);
    if (!exact && (out.items || out.deleted || out.fields.length || tookBack)) meta.seen = at;   // the next change is always later than this one
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

  // ---------- taking counts back ----------

  /**
   * The counters that can be taken back, as numbers by path: [day, number], the day being '' for lifetime
   * counts. t: tastes, s: stamps, a: a goal's count, at: a goal's count today, f: a favourite's count,
   * fd: a favourite counted that day, g: a fair-play word that counted that day.
   */
  function flat(pet) {
    var out = {};
    function each(o, fn) { if (isObj(o)) Object.keys(o).forEach(function (k) { fn(k, o[k]); }); }
    each(pet.tastes, function (k, v) { out['t:' + k] = ['', num(v)]; });
    each(pet.stamps, function (k, v) { out['s:' + k] = ['', num(v)]; });
    each(pet.achievements, function (k, v) {
      if (!isObj(v)) return;
      out['a:' + k] = ['', num(v.count)];
      if (v.day) out['at:' + k] = [String(v.day), num(v.today)];
    });
    each(pet.favourites, function (k, v) {
      if (!isObj(v)) return;
      out['f:' + k] = ['', num(v.count)];
      if (v.day) out['fd:' + k] = [String(v.day), 1];
    });
    var guard = isObj(pet.guard) ? pet.guard : {};
    if (guard.day && Array.isArray(guard.words)) guard.words.forEach(function (w) { if (typeof w === 'string') out['g:' + w] = [String(guard.day), 1]; });
    return out;
  }

  /** A device's take-backs cleaned: path -> [day, taken back, counted again, the day before (favourites)]. */
  function cleanPaths(paths) {
    var out = {};
    if (isObj(paths)) Object.keys(paths).forEach(function (p) {
      var r = paths[p];
      if (Array.isArray(r) && r.length === 4 && typeof r[0] === 'string' && num(r[1]) === r[1] && num(r[2]) === r[2] && typeof r[3] === 'string') out[p] = r.slice();
    });
    return out;
  }
  /** Joins two records of one path from the same device: the later day's, or on the same day the larger numbers. */
  function joinPath(r, s) {
    if (!r || !s) return r || s;
    if (r[0] !== s[0]) return r[0] > s[0] ? r : s;
    return [r[0], Math.max(r[1], s[1]), Math.max(r[2], s[2]), r[3] > s[3] ? r[3] : s[3]];
  }
  /** Joins two devices' take-back tables ({device: {at, paths}}). */
  function joinBacks(x, y) {
    var out = {};
    [x, y].forEach(function (t) {
      Object.keys(t).forEach(function (dev) {
        var o = out[dev], b = t[dev];
        if (!o) { out[dev] = { at: b.at, paths: copy(b.paths) }; return; }
        o.at = Math.max(o.at, b.at);
        Object.keys(b.paths).forEach(function (p) { o.paths[p] = copy(joinPath(o.paths[p], b.paths[p])); });
      });
    });
    return out;
  }
  /** Fair-play words of earlier days no longer matter: forgets their take-backs (the guard's day only moves on, so every order agrees). */
  function pruneBacks(backs, guard) {
    var day = isObj(guard) && typeof guard.day === 'string' ? guard.day : '';
    Object.keys(backs).forEach(function (dev) {
      var paths = backs[dev].paths;
      Object.keys(paths).forEach(function (p) { if (p.slice(0, 2) === 'g:' && paths[p][0] < day) delete paths[p]; });
    });
    return backs;
  }
  /** What is taken back (taken back minus counted again) of one path on one day, over all devices. */
  function net(backs, p, day) {
    var n = 0;
    Object.keys(backs).forEach(function (dev) { var r = backs[dev].paths[p]; if (r && r[0] === day) n += r[1] - r[2]; });
    return n;
  }
  /** The latest "day before" noted for a favourite taken back on that day. */
  function prevDay(backs, p, day) {
    var d = '';
    Object.keys(backs).forEach(function (dev) { var r = backs[dev].paths[p]; if (r && r[0] === day && r[3] > d) d = r[3]; });
    return d;
  }

  /**
   * Notes what this device took back since last time (a count that went down, a favourite's day put back,
   * a fair-play word removed) and a flag counted again after being taken back. Called by `stamp`.
   * @param {Object} state
   * @param {number} at  The time for this device's record; 0 only notes where things stand.
   * @returns {boolean} Whether this device's take-backs changed.
   */
  function takeBack(state, at) {
    var meta = state.sync, cur = flat(state.pet), was = meta.was, changed = false;
    meta.was = cur;
    if (!was || !at) return false;
    var had = meta.backs[meta.device], mine = meta.backs[meta.device] = had || { at: 0, paths: {} }, guardDay = (state.pet.guard && state.pet.guard.day) || '';
    function note(p, day, back, again, prev) {
      var r = mine.paths[p];
      if (r && r[0] > day) return;   // that day is already over here
      if (!r || r[0] < day) r = mine.paths[p] = [day, 0, 0, ''];
      r[1] += back; r[2] += again;
      if (prev > r[3]) r[3] = prev;
      changed = true;
    }
    var seen = {};
    Object.keys(was).concat(Object.keys(cur)).forEach(function (p) {
      if (seen[p]) return;
      seen[p] = 1;
      var w = was[p], c = cur[p], kind = p.slice(0, p.indexOf(':'));
      if (w && c && c[0] === w[0]) {
        if (c[1] < w[1]) note(p, w[0], w[1] - c[1], 0, '');
        else if (c[1] > w[1] && FLAGS[kind]) again(p, c[0], c[1] - w[1]);
      } else if (w && (!c || c[0] < w[0])) {
        if (kind === 'g' && guardDay !== w[0]) return;   // a new day cleared the words: nothing taken back
        note(p, w[0], w[1], 0, c ? c[0] : '');
      } else if (c && FLAGS[kind]) again(p, c[0], c[1]);
    });
    function again(p, day, n) {   // a flag set again while still taken back cancels the take-back
      var open = net(meta.backs, p, day);
      if (open > 0) note(p, day, 0, Math.min(n, open), '');
    }
    if (changed) mine.at = at; else if (!had) delete meta.backs[meta.device];
    return changed;
  }

  /** The counters as the document holds them: what is shown plus everything taken back. */
  function gross(pet, backs) {
    var out = {};
    COUNTERS.forEach(function (k) { out[k] = copy(pet[k]); });
    function plus(o, pre) { if (isObj(o)) Object.keys(o).forEach(function (k) { o[k] = num(o[k]) + net(backs, pre + k, ''); }); }
    plus(out.tastes, 't:');
    plus(out.stamps, 's:');
    if (isObj(out.achievements)) Object.keys(out.achievements).forEach(function (k) {
      var v = out.achievements[k];
      if (!isObj(v)) return;
      v.count = num(v.count) + net(backs, 'a:' + k, '');
      if (v.day) v.today = num(v.today) + net(backs, 'at:' + k, v.day);
    });
    if (isObj(out.favourites)) Object.keys(out.favourites).forEach(function (k) {
      var v = out.favourites[k];
      if (isObj(v)) v.count = num(v.count) + net(backs, 'f:' + k, '');
    });
    var g = out.guard;
    if (isObj(g) && g.day && Array.isArray(g.words)) {
      Object.keys(backs).forEach(function (dev) {
        Object.keys(backs[dev].paths).forEach(function (p) {
          var w = p.slice(2);
          if (p.slice(0, 2) === 'g:' && g.words.indexOf(w) < 0 && net(backs, p, g.day) > 0) g.words.push(w);
        });
      });
    }
    return out;
  }

  /** The counters to show: the gross minus everything taken back. */
  function shown(counters, backs) {
    var out = {};
    COUNTERS.forEach(function (k) { out[k] = copy(counters[k]); });
    if (isObj(out.tastes)) Object.keys(out.tastes).forEach(function (k) { out.tastes[k] = Math.max(0, num(out.tastes[k]) - net(backs, 't:' + k, '')); });
    if (isObj(out.stamps)) Object.keys(out.stamps).forEach(function (k) {
      var n = num(out.stamps[k]) - net(backs, 's:' + k, '');
      if (n > 0) out.stamps[k] = n; else delete out.stamps[k];   // like addStamp: none left, no entry
    });
    if (isObj(out.achievements)) Object.keys(out.achievements).forEach(function (k) {
      var v = out.achievements[k];
      if (!isObj(v)) return;
      v.count = Math.max(0, num(v.count) - net(backs, 'a:' + k, ''));
      if (v.day) v.today = Math.max(0, num(v.today) - net(backs, 'at:' + k, v.day));
    });
    if (isObj(out.favourites)) Object.keys(out.favourites).forEach(function (k) {
      var v = out.favourites[k];
      if (!isObj(v)) return;
      v.count = num(v.count) - net(backs, 'f:' + k, '');
      if (v.count <= 0) { delete out.favourites[k]; return; }   // like refundFavourite
      if (v.day && net(backs, 'fd:' + k, v.day) > 0) v.day = prevDay(backs, 'fd:' + k, v.day);
    });
    var g = out.guard;
    if (isObj(g) && Array.isArray(g.words)) g.words = g.words.filter(function (w) { return net(backs, 'g:' + w, g.day) <= 0; });
    return out;
  }

  /** Joins two sets of counters, each by its own rule. */
  function mergeCounters(a, b) {
    var out = {};
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    COUNTERS.forEach(function (k) { out[k] = mergeCounter(k, a[k], b[k]); });
    return out;
  }
  /** The take-back entries of a document's fields part, cleaned: {device: {at, paths}}. */
  function backsOf(fields) {
    var out = {};
    if (isObj(fields)) Object.keys(fields).forEach(function (name) {
      var r = fields[name];
      if (name.indexOf(BACK) !== 0 || !validRecord(r) || !isObj(r.value)) return;
      var dev = name.slice(BACK.length);
      out[dev] = joinBacks(out[dev] ? { x: out[dev] } : {}, { x: { at: r.at, paths: cleanPaths(r.value) } }).x;
    });
    return out;
  }
  function backFields(backs) {
    var out = {};
    Object.keys(backs).sort().forEach(function (dev) { out[BACK + dev] = { at: backs[dev].at, by: dev, value: copy(backs[dev].paths) }; });
    return out;
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
    doc.counters = mergeCounters(meta.gross, gross(state.pet, meta.backs));
    var backs = backFields(meta.backs);
    Object.keys(backs).forEach(function (name) { doc.fields[name] = backs[name]; });
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
    return KNOWN_LISTS.indexOf(r.list) >= 0 && (!!r.del || isObj(r.item));
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
    if (name === 'tastes' || name === 'stamps' || name === 'prizes' || name === 'plant') return maxMap(a, b);
    if (name === 'gifts') {   // day -> boxes opened that day
      var out = {};
      [a, b].forEach(function (m) { if (isObj(m)) Object.keys(m).forEach(function (d) { out[d] = unionSorted(out[d], m[d]); }); });
      return out;
    }
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var list = name === 'treats' ? 'used' : 'words';   // treats and guard: a day and what was done that day
    var trip = name === 'guard' ? ((a.trip || '') > (b.trip || '') ? a.trip : b.trip) : '';   // the day of the last trip stamp: the later one
    if ((a.day || '') !== (b.day || '')) {
      var later = copy((a.day || '') > (b.day || '') ? a : b);
      if (trip) later.trip = trip;
      return later;
    }
    var joined = { day: a.day || '' };
    joined[list] = unionSorted(a[list], b[list]);
    if (name === 'guard') joined.lastSeen = Math.max(num(a.lastSeen), num(b.lastSeen));
    if (trip) joined.trip = trip;
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
        if (id in out[part] || (part === 'fields' && id.indexOf(BACK) === 0)) return;   // take-backs are joined below
        var ra = validPart(part, x[id]) ? x[id] : null, rb = validPart(part, y[id]) ? y[id] : null;
        var win = ra && rb ? (order(ra, rb) >= 0 ? ra : rb) : (ra || rb);
        if (win) out[part][id] = copy(win);
      });
    });
    out.counters = mergeCounters(a.counters, b.counters);
    var backs = backFields(pruneBacks(joinBacks(backsOf(a.fields), backsOf(b.fields)), out.counters.guard));
    Object.keys(backs).forEach(function (name) { out.fields[name] = backs[name]; });
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
      if (!validPart('items', rec) || LISTS.indexOf(rec.list) < 0) return;   // a list this document carries but this state does not keep here
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
    // counters: the gross from here, from the last sync and from the document joined, minus every device's take-backs
    var backs = joinBacks(meta.backs, backsOf(fields));
    Object.keys(backs).forEach(function (dev) { meta.seen = Math.max(meta.seen, backs[dev].at); });
    meta.gross = mergeCounters(mergeCounters(meta.gross, gross(state.pet, meta.backs)), doc.counters);
    meta.backs = pruneBacks(backs, meta.gross.guard);
    var show = shown(meta.gross, meta.backs);
    COUNTERS.forEach(function (k) { state.pet[k] = show[k]; });
    // clean everything the way loading does, so a damaged document (another device on a broken build) can't break the pet, the player or the list
    if (L && L.petProfile) state.pet = L.petProfile(state.pet);
    if (L && L.parsePlayer) state.player = L.parsePlayer(state.player);
    if (L && L.cleanOverrides) state.overrides = L.cleanOverrides(state.overrides);
    touched.forEach(function (name) { meta.fields[name].h = fingerprint(FIELDS[name].get(state)); });   // the fingerprint of what is really saved now
    meta.was = flat(state.pet);   // what came in is not a take-back of this device's
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
    VERSION: VERSION, TOMBSTONE_DAYS: TOMBSTONE_DAYS, KNOWN_LISTS: KNOWN_LISTS, FIELD_NAMES: FIELD_NAMES, COUNTERS: COUNTERS,
    parse: parse, dropSample: dropSample, stamp: stamp, prune: prune, snapshot: snapshot, merge: merge, trim: trim, apply: apply, sync: sync,
    hash: hash, stable: stable, fingerprint: fingerprint, newDevice: newDevice, listArray: listArray
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
