// Backup & sync: the account (a recovery code), talking to the sync server, and the Backup & sync sheet.
// The rules for merging are in sync.js and the server is worker/sync/server.js; the local save stays the
// main copy, so everything works offline and the server only mirrors it. To-do lists never leave the device.
'use strict';

var ACCOUNT_KEY = 'nibble.account';
var SYNC_SERVER = 'https://pet-shopper-sync.laurmoe.workers.dev';   // the default; the sheet's "Server address" can change it
var SYNC_WAIT_MS = 4000, SYNC_EVERY_MS = 2 * 60 * 1000, SYNC_TIMEOUT_MS = 15000, SYNC_RETRY_MAX_MS = 15 * 60 * 1000;
var CODE_SYMBOLS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

var accountSheet = $('accountSheet');
/** The account on this device (kept apart from the pet's save, never synced): {code, server, joined, rev, last}. */
var account = (function () {
  var a = null;
  try { a = JSON.parse(localStorage.getItem(ACCOUNT_KEY)); } catch (e) { a = null; }
  if (!a || typeof a !== 'object') return { code: '', server: '', joined: false, rev: 0, last: 0 };
  return { code: typeof a.code === 'string' ? a.code : '', server: typeof a.server === 'string' ? a.server : '', joined: !!a.joined, rev: +a.rev || 0, last: +a.last || 0 };
})();
var syncState = { busy: false, again: false, timer: 0, failures: 0, error: '', stopped: false };

function accountSave() {
  try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); } catch (e) { /* storage blocked */ }
}
/** @returns {string} The server address in use, without a closing slash. */
function serverUrl() { return (account.server || SYNC_SERVER || '').replace(/\/+$/, ''); }
/** @returns {string|null} The code in plain form (capitals, no dashes), or null if it can't be one. */
function cleanCode(text) {
  var c = String(text || '').toUpperCase().replace(/[\s-]/g, '');
  if (c.length !== 25) return null;
  for (var i = 0; i < c.length; i++) if (CODE_SYMBOLS.indexOf(c[i]) < 0) return null;
  return c;
}
/** @returns {string} The code in groups, like ABCDE-FGHJK-…, for showing. */
function prettyCode(c) { return c.replace(/(.{5})(?=.)/g, '$1-'); }

/**
 * Talks to the server. Never throws.
 * @returns {Promise<{ok: boolean, status: number, json: Object|null}>} status 0 means it could not be reached.
 */
function accountApi(path, method, code, body) {
  var url = serverUrl();
  if (!url) return Promise.resolve({ ok: false, status: 0, json: null });
  var ctl = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = ctl ? setTimeout(function () { ctl.abort(); }, SYNC_TIMEOUT_MS) : 0;
  var headers = {};
  if (code) headers.Authorization = 'Bearer ' + code;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(url + path, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl ? ctl.signal : undefined, cache: 'no-store' })
    .then(function (res) { return res.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; } return { ok: res.ok, status: res.status, json: j }; }); })
    .catch(function () { return { ok: false, status: 0, json: null }; })
    .then(function (r) { clearTimeout(timer); return r; });
}

/** @returns {string} One line for the sync log and the sheet: the state of syncing. */
function accountSummary() {
  if (!account.code) return 'not set up';
  if (syncState.busy) return 'syncing…';
  if (syncState.stopped) return 'code not accepted';
  if (syncState.error) return syncState.error + (account.last ? ' (last synced ' + syncClock(account.last) + ')' : '');
  return account.last ? 'synced ' + syncClock(account.last) + ' (' + serverUrl().replace(/^https?:\/\//, '') + ')' : 'connected, not synced yet';
}

/**
 * Sends this device's list and pet to the server, joins what comes back with what is here, and shows
 * the result. Safe to call at any time: a second call while one runs waits for it and goes again.
 * @param {string} why  For the log: 'start', 'change', 'timer', 'button'...
 * @returns {Promise<void>}
 */
function syncNow(why) {
  if (!account.code || syncState.stopped) return Promise.resolve();
  if (syncState.busy) { syncState.again = true; return Promise.resolve(); }
  clearTimeout(syncState.timer);
  syncState.busy = true;
  syncState.error = '';
  renderAccount();
  var first = account.joined ? Promise.resolve(null) : accountApi('/v1/doc', 'GET', account.code), droppedAny = false;
  return first.then(function (got) {
    if (got) {   // the first round from this device: if the account already has a list, take it instead of the sample one
      if (!got.ok) return got;
      var recs = got.json && got.json.doc && got.json.doc.items;
      if (recs && Object.keys(recs).length) {
        var dropped = Sync.dropSample(state);
        if (dropped) droppedAny = true;
        if (dropped) syncLogAdd('Joined an account that already has a list: dropped the ' + dropped + ' sample items on this device', 'sync');
      }
    }
    var doc = Sync.snapshot(state, Date.now(), { skipSample: true });
    return accountApi('/v1/sync', 'POST', account.code, { doc: doc });
  }).then(function (res) {
    syncState.busy = false;
    if (droppedAny && !(res.ok && res.json && res.json.doc)) refreshAll();   // the sample list is gone either way
    if (res.ok && res.json && res.json.doc) {
      // join once more here: something may have changed while the server was answering
      var r = Sync.sync(state, res.json.doc, Date.now(), { skipSample: true }), a = r.applied;
      account.joined = true; account.rev = res.json.rev || 0; account.last = Date.now();
      accountSave();
      syncState.failures = 0; syncState.error = '';
      var changed = a.added || a.changed || a.removed || a.fields.length;
      if (changed || droppedAny) refreshAll();
      var parts = [];
      if (a.added) parts.push(a.added + ' added');
      if (a.changed) parts.push(a.changed + ' changed');
      if (a.removed) parts.push(a.removed + ' removed');
      if (a.fields.length) parts.push(a.fields.join(', '));
      syncLogAdd('Synced (' + why + '): ' + (parts.length ? 'got ' + parts.join(', ') : 'nothing new'), 'sync');
    } else if (res.status === 401) {
      syncState.stopped = true;
      syncState.error = 'code not accepted';
      syncLogAdd('The server does not know this code. Syncing is paused.', 'error');
    } else {
      syncState.failures++;
      syncState.error = res.status ? 'server problem (' + res.status + ')' : 'no connection';
      if (syncState.failures <= 1 || syncState.failures % 5 === 0) syncLogAdd('Sync failed (' + why + '): ' + syncState.error + ', trying again later', 'error');
      syncSoon(Math.min(SYNC_RETRY_MAX_MS, 30000 * Math.pow(2, syncState.failures - 1)));
    }
    renderAccount();
    if (syncSheet.open) renderSyncLog();
    if (syncState.again) { syncState.again = false; syncSoon(); }
  });
}
/** Syncs after a short wait (so a run of ticks is one round). Called after every change that is saved. */
function syncSoon(ms) {
  if (!account.code || syncState.stopped) return;
  clearTimeout(syncState.timer);
  syncState.timer = setTimeout(function () { syncNow(ms ? 'retry' : 'change'); }, ms || SYNC_WAIT_MS);
}

// ---------- the sheet ----------

var acctMsg = $('acctMsg'), acctShown = $('acctShown'), acctStatus = $('acctStatus');
var codeVisible = false, deleteArmed = 0;
function say2(text) { acctMsg.textContent = text || ''; }
/** Shows the right half of the sheet for this device. */
function renderAccount() {
  var on = !!account.code;
  $('accountOut').hidden = on;
  $('accountIn').hidden = !on;
  acctStatus.textContent = on ? 'Backup is on · ' + accountSummary() : '';
  acctShown.textContent = on ? (codeVisible ? prettyCode(account.code) : '•••••-•••••-•••••-•••••-•••••') : '';
  $('acctShow').textContent = codeVisible ? 'Hide my code' : 'Show my code';
  $('acctCopy').hidden = $('acctLink').hidden = !codeVisible;
  $('acctWarn').hidden = !codeVisible;
  $('acctServer').value = account.server || SYNC_SERVER;
  var row = $('optAccountStatus');
  if (row) row.textContent = on ? (syncState.stopped ? 'Needs attention' : syncState.error ? 'Offline' : account.last ? 'On' : 'Starting…') : 'Off';
}
/** Signs this device in with a code and syncs. */
function accountStart(code, fresh) {
  account.code = code; account.joined = !!fresh; account.rev = 0; account.last = 0;
  syncState.stopped = false; syncState.failures = 0; syncState.error = '';
  accountSave();
  codeVisible = !!fresh;
  renderAccount();
  return syncNow(fresh ? 'first' : 'joined');
}
function accountLeave() {
  clearTimeout(syncState.timer);
  account.code = ''; account.joined = false; account.rev = 0; account.last = 0;
  syncState.stopped = false; syncState.error = ''; codeVisible = false;
  accountSave();
  renderAccount();
}

$('acctMake').addEventListener('click', function () {
  sound('tap');
  say2('Making your code…');
  accountApi('/v1/account', 'POST', '').then(function (r) {
    if (r.status === 429) { say2('Too many new backups from this connection. Try again in an hour, or join with the code you already have.'); return; }
    if (!r.ok || !r.json || !cleanCode(r.json.code)) { say2(r.status ? 'The server said no (' + r.status + '). Try again later.' : 'Could not reach the server. Check your connection.'); return; }
    say2('');
    accountStart(cleanCode(r.json.code), true);
  });
});
$('acctJoin').addEventListener('click', function () {
  sound('tap');
  var code = cleanCode($('acctCode').value);
  if (!code) { say2('That does not look like a code: it has 25 letters and numbers.'); return; }
  say2('Checking the code…');
  accountApi('/v1/doc', 'GET', code).then(function (r) {
    if (r.status === 401) { say2('The server does not know that code. Check it and try again.'); return; }
    if (!r.ok) { say2(r.status ? 'The server said no (' + r.status + ').' : 'Could not reach the server. Check your connection.'); return; }
    say2('');
    $('acctCode').value = '';
    accountStart(code, false);
  });
});
$('acctNow').addEventListener('click', function () {
  sound('tap');
  syncState.stopped = false;
  say2('');
  syncNow('button');
});
$('acctShow').addEventListener('click', function () { sound('tap'); codeVisible = !codeVisible; renderAccount(); });
function copyText(text, done) {
  var fail = function () { say2('Could not copy. Select the code and copy it by hand.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say2(done); }, fail); else fail();
}
$('acctCopy').addEventListener('click', function () { sound('tap'); copyText(prettyCode(account.code), 'Code copied.'); });
$('acctLink').addEventListener('click', function () {
  sound('tap');
  var base = location.href.split('#')[0];
  copyText(base + '#join=' + account.code, 'Link copied. Open it on the other device. Anyone with the link can see your list and pet.');
});
$('acctLeave').addEventListener('click', function () {
  sound('tap');
  accountLeave();
  say2('Signed out on this device. Your list and Fumu stay here, and the backup stays on the server.');
});
$('acctDelete').addEventListener('click', function () {
  var btn = $('acctDelete');
  if (!deleteArmed) {
    sound('tap');
    deleteArmed = setTimeout(function () { deleteArmed = 0; btn.textContent = 'Delete my backup'; }, 5000);
    btn.textContent = 'Tap again to delete it';
    say2('This removes your backup from the server for good. Your list and Fumu stay on this device.');
    return;
  }
  clearTimeout(deleteArmed); deleteArmed = 0; btn.textContent = 'Delete my backup';
  accountApi('/v1/account', 'DELETE', account.code).then(function (r) {
    if (r.ok || r.status === 401) { accountLeave(); say2('Your backup is deleted.'); }
    else say2(r.status ? 'The server said no (' + r.status + ').' : 'Could not reach the server, so nothing was deleted.');
  });
});
$('acctServer').addEventListener('change', function () {
  var v = $('acctServer').value.trim().replace(/\/+$/, '');
  if (v && !/^https:\/\/[^\s/]+(\/\S*)?$/.test(v) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(v)) { say2('The address should start with https://'); $('acctServer').value = account.server || SYNC_SERVER; return; }
  account.server = v === SYNC_SERVER ? '' : v;
  accountSave();
  say2('Server address saved.');
});
accountSheet.addEventListener('click', function (e) { if (e.target === accountSheet) accountSheet.close(); });
function openAccount(code) {
  codeVisible = false;
  say2('');
  if (code) $('acctCode').value = prettyCode(code);
  renderAccount();
  optionsSheet.close();
  openDialog(accountSheet);
}

// the Options row
(function () {
  var row = document.createElement('div');
  row.className = 'option';
  row.innerHTML = '<span class="option-title">Backup &amp; sync</span>';
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'pill-btn'; b.id = 'optAccount';
  var st = document.createElement('span'); st.id = 'optAccountStatus'; st.textContent = 'Off';
  b.append(st, document.createTextNode(' · set up'));
  b.addEventListener('click', function () { sound('tap'); openAccount(); });
  row.appendChild(b);
  var t = document.createElement('span');
  t.className = 'option-text';
  t.textContent = 'Keeps your shopping list and Fumu safe and the same on all your devices. To-do lists stay here.';
  row.appendChild(t);
  optionsList.insertBefore(row, optionsList.firstChild);
})();

// ---------- when to sync ----------

// a link like …/#join=CODE (from "Copy link for another device") opens the sheet with the code filled in
(function () {
  var m = /[#&]join=([A-Za-z0-9-]+)/.exec(location.hash || '');
  if (!m) return;
  var code = cleanCode(m[1]);
  try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* ignore */ }   // keep the code out of the address bar
  if (code && !account.code) setTimeout(function () { openAccount(code); }, 600);
})();
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && account.code && Date.now() - account.last > 30 * 1000) syncNow('opened');
});
window.addEventListener('online', function () { syncNow('online'); });
setInterval(function () {
  if (document.visibilityState === 'visible' && account.code && Date.now() - account.last >= SYNC_EVERY_MS - 1000) syncNow('timer');
}, SYNC_EVERY_MS);
if (account.code) setTimeout(function () { syncNow('start'); }, 1500);
renderAccount();
