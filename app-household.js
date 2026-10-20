// Households: a shopping list shared with other people (the Shared tab). Each person keeps their own code, pet,
// shopping list and to-dos; the household is a second document on the server with only the shared list, opened with
// your own Backup & sync code (worker/sync/server.js). The owner (who made it) manages the members. The merge rules
// are in sync.js ({house: true}); this file has the Household sheet, the invite link and syncing after each backup sync.
// Plan and decisions: docs/design/households-plan.md.
'use strict';

var HOUSE_KEY = 'nibble.household';
/** What this device last heard (kept apart from the save, never synced): {in, me, owner, members, invite, server}. server: 'yes', 'no' or '' (not asked yet). */
var house = (function () {
  var h = null;
  try { h = JSON.parse(localStorage.getItem(HOUSE_KEY)); } catch (e) { h = null; }
  h = h && typeof h === 'object' ? h : {};
  return { in: !!h.in, me: typeof h.me === 'string' ? h.me : '', owner: !!h.owner, members: Array.isArray(h.members) ? h.members : [], invite: typeof h.invite === 'string' ? h.invite : '', server: h.server === 'yes' || h.server === 'no' ? h.server : '' };
})();
var houseBusy = false, houseArmed = {}, houseSheet = $('houseSheet');

function houseSave() {
  try { localStorage.setItem(HOUSE_KEY, JSON.stringify(house)); } catch (e) { /* storage blocked */ }
}
/** @returns {boolean} Whether this person is in a household (the Shared tab shows). */
function houseIn() { return !!(account.code && house.in); }
/** @returns {string} This person's member id in the household ('' if none). */
function houseMe() { return houseIn() ? house.me : ''; }
/** @returns {string} The name the others see: the one in Profile. */
function houseName() { return (state.player && state.player.name) || ''; }
function houseSay(text) { $('houseMsg').textContent = text || ''; }

/** Takes a household answer from the server: who is in it, and the shared list joined with what is here. */
function houseTake(json) {
  if (!json || json.household === null || !Array.isArray(json.members)) { houseGone(); return; }
  var was = house.in;
  house.in = true;
  house.owner = !!json.owner;
  house.invite = typeof json.invite === 'string' ? json.invite : '';
  house.members = json.members.map(function (m) { return { id: String(m.id), name: String(m.name || ''), owner: !!m.owner, me: !!m.me }; });
  house.me = (house.members.filter(function (m) { return m.me; })[0] || {}).id || '';
  houseSave();
  var a = json.doc ? Sync.sync(state, json.doc, Date.now(), { house: true }).applied : { added: 0, changed: 0, removed: 0 };
  if (!was || a.added || a.changed || a.removed) refreshAll();
  if (!was) applyListMode();
  houseRender();
}
/** Not in a household (left, removed, or the household is gone): the shared list leaves this device, your own stays. */
function houseGone() {
  var was = house.in || state.shopList === 'shared' || (state.otherShop && state.otherShop.length);
  house.in = false; house.me = ''; house.owner = false; house.members = []; house.invite = '';
  houseSave();
  if (was) { Sync.leaveHouse(state); refreshAll(); applyListMode(); }
  houseRender();
}

/** After each backup sync: sends and fetches the shared list, or (not in one) asks whether this person joined on another device. */
function houseSyncNow() {
  if (!account.code || houseBusy) return Promise.resolve();
  houseBusy = true;
  var code = account.code, ask = house.in
    ? accountApi('/v1/household/sync', 'POST', code, { doc: Sync.snapshot(state, Date.now(), { house: true }), name: houseName() })
    : accountApi('/v1/household', 'GET', code);
  return ask.then(function (r) {
    houseBusy = false;
    if (account.code !== code) return;
    if (r.ok && r.json) { house.server = 'yes'; houseTake(r.json); return; }
    if (r.status === 503 || (r.status === 404 && !house.in)) { house.server = 'no'; houseSave(); houseRender(); return; }   // a server from before households
    if (r.status === 404) { houseGone(); houseSay('You are no longer in the household.'); }
  }, function () { houseBusy = false; });
}

/** Asks the server to do something with the household, then shows the answer. */
function houseAsk(path, body, done) {
  if (!account.code) return;
  houseSay('…');
  accountApi('/v1/household' + path, 'POST', account.code, body || {}).then(function (r) {
    if (r.ok && r.json) {
      house.server = 'yes';
      houseSay(done || '');
      houseTake(r.json);
      if (house.in) houseSyncNow();
      return;
    }
    var e = r.json && r.json.error;
    if (r.status === 404 && path === '/join') houseSay('No household has that invite code.');
    else if (r.status === 403 && path === '/join') houseSay('That household is full.');
    else if (r.status === 409) houseSay('You are already in a household. Leave it first.');
    else if (r.status === 429) houseSay('Too many new households from this connection. Try again in an hour.');
    else houseSay(r.status ? (e || 'The server said no (' + r.status + ').') : 'Could not reach the server. Check your connection.');
  });
}

/** Tap once to arm, again within 5 s to do it (leave, remove). @returns {boolean} Whether to go ahead. */
function houseArm(key, btn, label, warn) {
  if (houseArmed[key]) { clearTimeout(houseArmed[key]); delete houseArmed[key]; btn.textContent = label; return true; }
  houseArmed[key] = setTimeout(function () { delete houseArmed[key]; btn.textContent = label; }, 5000);
  btn.textContent = 'Tap again';
  houseSay(warn);
  return false;
}

/** Draws the sheet for this device: backup needed, start or join, or the members. */
function houseRender() {
  var on = !!account.code, ready = house.server !== 'no';
  $('houseNeed').hidden = on;
  $('houseNotYet').hidden = !on || ready;
  $('houseOut').hidden = !on || !ready || house.in;
  $('houseIn').hidden = !on || !house.in;
  $('houseOwnerTools').hidden = !house.owner;
  $('houseNoName').hidden = !!houseName();
  $('tabShared').hidden = !houseIn();
  var st = $('optHouseStatus');
  if (st) st.textContent = !on ? 'Off' : house.in ? house.members.length + (house.members.length === 1 ? ' person' : ' people') : 'Off';
  var row = $('optHouseRow');
  if (row) row.hidden = on && house.server === 'no';
  var list = $('houseMembers');
  list.replaceChildren.apply(list, house.members.map(function (m) {
    var li = document.createElement('li'), name = document.createElement('span');
    li.className = 'house-member';
    name.className = 'house-name';
    if (m.name) { name.textContent = m.name; name.setAttribute('data-notr', ''); } else name.textContent = 'No name yet';
    li.appendChild(name);
    if (m.me || m.owner) {
      var tag = document.createElement('span');
      tag.className = 'house-tag';
      tag.textContent = m.me && m.owner ? 'you · owner' : m.me ? 'you' : 'owner';
      li.appendChild(tag);
    }
    if (house.owner && !m.me) {
      var boss = document.createElement('button'), out = document.createElement('button');
      boss.type = out.type = 'button';
      boss.className = 'pill-btn'; out.className = 'pill-btn danger';
      boss.textContent = 'Make owner'; out.textContent = 'Remove';
      boss.addEventListener('click', function () {
        sound('tap');
        if (houseArm('owner' + m.id, boss, 'Make owner', 'They will manage the household instead of you.')) houseAsk('/owner', { member: m.id }, 'Done.');
      });
      out.addEventListener('click', function () {
        sound('tap');
        if (houseArm('remove' + m.id, out, 'Remove', 'They lose the shared list. Their own lists and pet stay.')) houseAsk('/remove', { member: m.id }, 'Removed.');
      });
      li.append(boss, out);
    }
    return li;
  }));
}

function openHouse(invite) {
  houseSay('');
  if (invite) $('houseCode').value = prettyCode(invite);
  houseRender();
  openDialog(houseSheet);
  if (account.code) houseSyncNow();   // fresh members list
}

$('houseToAcct').addEventListener('click', function () { sound('tap'); openAccount(); });
$('houseMake').addEventListener('click', function () { sound('tap'); houseAsk('', { name: houseName() }, 'Your household is ready. Copy the invite link for the others.'); });
$('houseJoin').addEventListener('click', function () {
  sound('tap');
  var code = cleanCode($('houseCode').value);
  if (!code) { houseSay('That does not look like an invite: it has 25 letters and numbers.'); return; }
  houseAsk('/join', { invite: code, name: houseName() }, 'You joined. The Shared tab is on your list.');
  $('houseCode').value = '';
});
$('houseLink').addEventListener('click', function () {
  sound('tap');
  var code = cleanCode(house.invite);
  if (!code) return;
  var link = location.href.split('#')[0] + '#household=' + code, done = function () { houseSay('Invite link copied. Anyone with it can join until you make a new code.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { houseSay(link); }); else houseSay(link);
});
$('houseNewCode').addEventListener('click', function () {
  sound('tap');
  if (houseArm('code', $('houseNewCode'), 'New invite code', 'The old invite stops working.')) houseAsk('/invite', {}, 'New invite code made.');
});
$('houseLeave').addEventListener('click', function () {
  sound('tap');
  if (!houseArm('leave', $('houseLeave'), 'Leave household', 'The shared list leaves your devices. Your own list stays.')) return;
  accountApi('/v1/household/leave', 'POST', account.code, {}).then(function (r) {
    if (r.ok || r.status === 404) { houseGone(); houseSay('You left the household.'); }
    else houseSay(r.status ? 'The server said no (' + r.status + ').' : 'Could not reach the server. Check your connection.');
  });
});
houseSheet.addEventListener('click', function (e) { if (e.target === houseSheet) houseSheet.close(); });

// the Devices row
(function () {
  var row = document.createElement('div');
  row.className = 'option'; row.id = 'optHouseRow';
  row.innerHTML = '<span class="option-title">Household</span>';
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'pill-btn';
  var st = document.createElement('span'); st.id = 'optHouseStatus'; st.textContent = 'Off';
  b.append(st, document.createTextNode(' · set up'));
  b.addEventListener('click', function () { sound('tap'); openHouse(); });
  row.appendChild(b);
  addOption('devices', row);
})();

// a link like …/#household=CODE (from "Copy invite link") opens the sheet with the invite filled in (also when the app is already open)
function houseFromLink(wait) {
  var m = /[#&]household=([A-Za-z0-9-]+)/.exec(location.hash || '');
  if (!m) return;
  var code = cleanCode(m[1]);
  try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* ignore */ }
  if (code) setTimeout(function () { openHouse(code); }, wait);
}
houseFromLink(700);
window.addEventListener('hashchange', function () { houseFromLink(0); });

/**
 * Before each save: a new item this device put on the shared list says who added it (any way of adding: typing,
 * a recipe, a suggestion). Only items whose id ends in this device's name, so nothing from the others is claimed.
 */
function houseMark() {
  if (!houseIn() || !state.sync) return;
  var mine = '-' + state.sync.device, who = houseName();
  Sync.listArray(state, 'shared').forEach(function (i) {
    if (i.addedWho || String(i.id).slice(-mine.length) !== mine) return;
    i.addedWho = house.me;
    if (who) i.addedBy = who;
  });
}
houseRender();
