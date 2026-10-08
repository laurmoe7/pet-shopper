// Send to another device: a link or a note from one device (phone or PC) waits on the sync server (worker/sync/, the inbox), and
// Fumu on the other device eats it and shows it on a little card. The sender never gets its own message back.
// The rules for what is a link or a note are in send.js. These files are plain scripts that share one
// scope, loaded in the order listed in index.html.
'use strict';

var sendSheet = $('sendSheet'), sendText = $('sendText'), sendMsg = $('sendMsg'), sendGo = $('sendGo'), sendReceive = $('sendReceive');
var INBOX_POLL_MS = 10000, RECEIVE_KEY = 'nibble.receive';
var deskShell = window.nibbleDesktop || null;   // the desktop app (desktop/): it always receives

function sendSay(text) { sendMsg.textContent = text || ''; }
/** Opens the sheet, with something already in the box (a shared link) if there is one. */
function openSend(prefill) {
  optionsSheet.close();
  sendText.value = prefill || '';
  sendSay(account.code ? '' : 'Turn on Backup & sync first (Options), here and on your other device, so both have the same code.');
  sendReceive.checked = receivingHere();
  openDialog(sendSheet);
}
/** Sends what is in the box to the other device. */
function sendToOther() {
  var m = Send.classify(sendText.value);
  if (!m) { sendSay('Type or paste something to send.'); return; }
  if (!account.code) { sendSay('Turn on Backup & sync first, here and on your other device.'); return; }
  sendGo.disabled = true;
  sendSay('Sending…');
  accountApi('/v1/inbox', 'POST', account.code, { kind: m.kind, text: m.text, from: inboxDevice() }).then(function (r) {
    sendGo.disabled = false;
    if (r.ok) {
      sendText.value = '';
      syncLogAdd('Sent a ' + (m.kind === 'link' ? 'link' : 'note') + ' to the other device', 'sync');
      if (sendSheet.open) sendSheet.close();   // at once: nothing more to wait for
      say(pick(['off it goes!', 'on its way ♡', 'fumu fumu~ sent!']), 1400);
    } else if (r.status === 401) sendSay('The server does not know this code. Check Backup & sync.');
    else if (r.status === 503) sendSay('The server is not ready for this yet: it needs the new inbox table (see worker/sync/README.md).');
    else if (r.status === 413) sendSay('That is too long to send.');
    else sendSay(r.status ? 'The server said no (' + r.status + ').' : 'Could not reach the server. Check your connection.');
  });
}
sendGo.addEventListener('click', function () { sound('tap'); sendToOther(); });
sendSheet.addEventListener('click', function (e) { if (e.target === sendSheet) sendSheet.close(); });
sendReceive.addEventListener('change', function () {
  try { localStorage.setItem(RECEIVE_KEY, sendReceive.checked ? '1' : '0'); } catch (e) { /* storage blocked */ }
  if (sendReceive.checked) setTimeout(inboxPoll, 300);
});
/** @returns {boolean} Whether this device shows what is sent to it (the desktop app always does; elsewhere it is on unless switched off). */
function receivingHere() {
  if (deskShell) return true;
  try { return localStorage.getItem(RECEIVE_KEY) !== '0'; } catch (e) { return true; }
}

// the Options row, under Backup & sync
(function () {
  var row = document.createElement('div');
  row.className = 'option';
  row.innerHTML = '<span class="option-title">Send to another device</span>';
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'pill-btn'; b.textContent = 'Send a link or note';
  b.addEventListener('click', function () { sound('tap'); openSend(); });
  row.appendChild(b);
  var t = document.createElement('span');
  t.className = 'option-text';
  t.textContent = 'A link or a note for your other device (phone to PC or PC to phone): Fumu eats it there and brings it over. Needs the same Backup & sync code on both.';
  row.appendChild(t);
  optionsList.insertBefore(row, optionsList.children[1] || null);
})();

// shared from another app (the share menu, once Fumufumu is installed on the phone): the link is ready to send
(function () {
  var q = new URLSearchParams(location.search);
  if (!q.get('share')) return;
  var m = Send.fromShare({ title: q.get('title'), text: q.get('text'), url: q.get('url') });
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
  setTimeout(function () { openSend(m ? m.text : ''); }, 700);
})();

// ---------- on the PC: what arrives ----------

var inboxCard = null;
/** The little card: what it is, and Open / Copy / done. Only one at a time; the next waits on the server. */
function showInboxCard(msg, more) {
  var pv = Send.preview(msg), stageEl = document.querySelector('.stage');
  var card = document.createElement('div');
  card.className = 'inbox-card';
  card.setAttribute('role', 'status');
  var img = emojiImg(pv.icon, '');
  img.className = 'inbox-icon';
  var text = document.createElement('div'), t = document.createElement('b'), d = document.createElement('span');
  text.className = 'inbox-text';
  t.textContent = pv.title || (msg.kind === 'link' ? 'a link' : 'a note');
  d.textContent = (pv.detail || '') + (more ? (pv.detail ? ' · ' : '') + '+' + more + ' more' : '');
  text.append(t, d);
  var acts = document.createElement('div');
  acts.className = 'inbox-actions';
  function button(label, fn, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label; if (cls) b.className = cls;
    b.addEventListener('click', function (e) { e.stopPropagation(); sound('tap'); fn(b); });
    acts.appendChild(b);
    return b;
  }
  if (msg.kind === 'link' && Send.safeToOpen(msg.text)) button('Open', function () {
    if (deskShell && deskShell.open) deskShell.open(msg.text); else window.open(msg.text, '_blank', 'noopener');
    finishInboxCard(msg);
  });
  button('Copy', function (b) {
    if (deskShell && deskShell.copy) deskShell.copy(msg.text); else if (navigator.clipboard) navigator.clipboard.writeText(msg.text).catch(function () { /* blocked */ });
    b.textContent = 'Copied ✓';
  });
  button('✕', function () { finishInboxCard(msg); }, 'inbox-done').setAttribute('aria-label', 'Done');
  card.append(img, text, acts);
  stageEl.appendChild(card);
  inboxCard = card;
}
/** Takes the card away and tells the server it was read, so it is not shown again. */
function finishInboxCard(msg) {
  if (inboxCard) { inboxCard.remove(); inboxCard = null; }
  accountApi('/v1/inbox/ack', 'POST', account.code, { ids: [msg.id] });
  setTimeout(inboxPoll, 800);
}
/** Fumu eats the thing that arrived (it flies in from above), then the card shows. */
function receiveMessage(msg, more) {
  var link = msg.kind === 'link';
  if (busy || reduceMotion || !pet.getBoundingClientRect().width) { showInboxCard(msg, more); return; }
  var to = center(pet.getBoundingClientRect()), from = { x: to.x + 70, y: Math.max(8, to.y - 150) };
  busy++;
  inboxCard = document.createElement('div');   // holds the place while he eats, so a second message does not start
  fly(link ? '🔗' : '📝', from, to, { duration: 420, scaleTo: .5, lift: 30 }).then(function () {
    setFace(CHEW); pulse('chomp', 360); crumbs(to, '#e7c9a0', 6);
    busy--;
    inboxCard = null;
    showInboxCard(msg, more);   // the card is up as he swallows: no waiting for the chewing
    setTimeout(function () { if (!busy) settle(); }, 520);
  });
}
/**
 * Looks for something another device left (only while the window is showing and nothing is on the card). The server leaves
 * out what this device sent itself; the check on `from` is for a server that has not been updated yet.
 */
var polling = false;
/** @returns {string} This device's id as the server keeps it (letters and digits, at most 12). */
function inboxDevice() { return String(state.sync.device || '').replace(/[^a-z0-9]/gi, '').slice(0, 12); }
function inboxPoll() {
  if (polling || !receivingHere() || !account.code || syncState.stopped || inboxCard || document.querySelector('.remind-card') || document.visibilityState === 'hidden') return;
  polling = true;
  accountApi('/v1/inbox?device=' + encodeURIComponent(inboxDevice()), 'GET', account.code).then(function (r) {
    polling = false;
    var list = r.ok && r.json && r.json.messages;
    list = list && list.filter(function (m) { return m.from !== inboxDevice(); });
    if (!list || !list.length || inboxCard) return;
    syncLogAdd('Got a ' + (list[0].kind === 'link' ? 'link' : 'note') + ' from your other device', 'sync');
    receiveMessage(list[0], list.length - 1);
  });
}
setInterval(inboxPoll, INBOX_POLL_MS);
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') setTimeout(inboxPoll, 200); });
window.addEventListener('focus', function () { setTimeout(inboxPoll, 200); });
setTimeout(inboxPoll, 1000);
