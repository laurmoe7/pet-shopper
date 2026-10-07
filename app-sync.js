// The sync log (Developer tools > Sync log): what the app has noted for syncing, and later what the server did.
// The rules for syncing are in sync.js; this is the page part. The log is kept on this device only (never synced).
'use strict';

var SYNC_LOG_KEY = 'nibble.synclog', SYNC_LOG_MAX = 60, SYNC_MERGE_MS = 60 * 1000;
var syncSheet = $('syncSheet'), syncList = $('syncList'), syncSummary = $('syncSummary');
var syncLog = (function () {
  var list = [];
  try { list = JSON.parse(localStorage.getItem(SYNC_LOG_KEY)) || []; } catch (e) { list = []; }
  return Array.isArray(list) ? list.filter(function (e) { return e && typeof e.t === 'number' && typeof e.text === 'string'; }) : [];
})();
/** Saves the log. Fails quietly if storage is blocked. */
function syncLogSave() {
  try { localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(syncLog.slice(-SYNC_LOG_MAX))); } catch (e) { /* storage blocked */ }
}
/**
 * Adds a line to the log (later: what the server said, how long a sync took).
 * @param {string} text
 * @param {string} [kind]  'local' (changes noted here), 'sync' (a round with the server), 'error' or 'info'.
 */
function syncLogAdd(text, kind) {
  syncLog.push({ t: Date.now(), kind: kind || 'info', text: text });
  if (syncLog.length > SYNC_LOG_MAX) syncLog.splice(0, syncLog.length - SYNC_LOG_MAX);
  syncLogSave();
  if (syncSheet.open) renderSyncLog();
}
/** Words for what changed, like "2 items changed, 1 removed, name". */
function syncChangeText(c) {
  var parts = [];
  if (c.items) parts.push(c.items + (c.items === 1 ? ' item' : ' items') + ' changed');
  if (c.deleted) parts.push(c.deleted + ' removed');
  var names = { 'pet.name': 'name', 'pet.look': 'look', 'pet.personality': 'personality', 'pet.room': 'room', 'pet.closet': 'closet', 'player': 'you', 'overrides': 'emoji picks' };
  (c.fields || []).forEach(function (f) { parts.push(names[f] || f); });
  return parts.join(', ');
}
// every save that finds changes lands here; saves within a minute join into one line so the log stays readable
function syncLocalNote(found) {
  var last = syncLog[syncLog.length - 1], now = Date.now();
  if (last && last.kind === 'local' && now - last.t < SYNC_MERGE_MS && last.c) {
    last.c.items += found.items;
    last.c.deleted += found.deleted;
    found.fields.forEach(function (f) { if (last.c.fields.indexOf(f) < 0) last.c.fields.push(f); });
    last.t = now;
    last.text = syncChangeText(last.c);
    syncLogSave();
    if (syncSheet.open) renderSyncLog();
    return;
  }
  var c = { items: found.items, deleted: found.deleted, fields: found.fields.slice() };
  syncLog.push({ t: now, kind: 'local', c: c, text: syncChangeText(c) });
  if (syncLog.length > SYNC_LOG_MAX) syncLog.splice(0, syncLog.length - SYNC_LOG_MAX);
  syncLogSave();
  if (syncSheet.open) renderSyncLog();
}
syncHook = function (found) {
  syncLocalNote(found);
  if (typeof syncSoon === 'function') syncSoon();   // app-account.js: send it to the server soon
};

/** @returns {string} A time like 14:32:05, or 2:32:05 PM when the options say so. */
function syncClock(t) {
  var d = new Date(t), h = d.getHours(), rest = ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  if (state.settings.time24) return pad2(h) + rest;
  return (h % 12 || 12) + rest + (h < 12 ? ' AM' : ' PM');
}
/** Redraws the numbers at the top and the log under them. */
function renderSyncLog() {
  var metas = Object.keys(state.sync.items).map(function (id) { return state.sync.items[id]; });
  var live = metas.filter(function (m) { return !m.del; }), gone = metas.length - live.length;
  var newest = metas.reduce(function (n, m) { return Math.max(n, m.at); }, 0);
  var days = Math.round(Sync.TOMBSTONE_DAYS);
  syncSummary.textContent = 'Device ' + state.sync.device + ' · ' + live.length + ' shopping items (to-dos stay private) · ' + gone +
    ' removed marker' + (gone === 1 ? '' : 's') + ' (kept ' + days + ' days) · latest change ' + (newest ? syncClock(newest) : 'none') + ' · server: not connected yet';
  syncList.replaceChildren.apply(syncList, syncLog.slice().reverse().map(function (e) {
    var row = document.createElement('div'), time = document.createElement('span'), text = document.createElement('span');
    row.className = 'sync-row' + (e.kind === 'error' ? ' error' : '');
    time.className = 'sync-time';
    time.textContent = syncClock(e.t);
    text.textContent = e.text;
    row.append(time, text);
    return row;
  }));
  if (!syncLog.length) { var none = document.createElement('p'); none.className = 'dev-status'; none.textContent = 'Nothing noted yet. Tick something off or add an item.'; syncList.appendChild(none); }
  if (typeof fadeSoon === 'function') fadeSoon();
}

/**
 * Tries the merge on a copy: joins this device's own document with itself and writes it into a copy of
 * the saved state. Nothing should change, and the copy should still match.
 * @returns {string} What happened.
 */
function syncSelfCheck() {
  var t0 = performance.now(), now = Date.now();
  var doc = Sync.snapshot(state, now);
  var twin = L.parseState(JSON.stringify(state), newId);
  var r = Sync.sync(twin, doc, now);
  var a = state.items.concat(state.stash).map(function (i) { return Sync.stable(i); }).sort().join('|');
  var b = twin.items.concat(twin.stash).map(function (i) { return Sync.stable(i); }).sort().join('|');
  var again = Sync.stamp(twin, now + 1);
  var ms = Math.round((performance.now() - t0) * 10) / 10;
  var ok = a === b && !r.applied.added && !r.applied.changed && !r.applied.removed && !r.applied.fields.length && !again.items && !again.deleted && !again.fields.length;
  var text = (ok ? 'Merge check passed: ' : 'Merge check FAILED: ') + Object.keys(doc.items).length + ' records in ' + ms + ' ms';
  syncLogAdd(text, ok ? 'info' : 'error');
  return text;
}

$('syncBtn').addEventListener('click', function () {
  devSheet.close();
  renderSyncLog();
  openDialog(syncSheet);
});
$('syncCheck').addEventListener('click', function () { sound('tap'); syncSelfCheck(); });
$('syncClear').addEventListener('click', function () { sound('tap'); syncLog.length = 0; syncLogSave(); renderSyncLog(); });
syncSheet.addEventListener('click', function (e) { if (e.target === syncSheet) syncSheet.close(); });
