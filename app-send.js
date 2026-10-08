// Send to another device: a link or a note from one device (phone or PC) waits on the sync server (worker/sync/, the inbox), and
// Fumu on the other device eats it and shows it on a little card. The sender never gets its own message back.
// The rules for what is a link or a note are in send.js. These files are plain scripts that share one
// scope, loaded in the order listed in index.html.
'use strict';

var sendSheet = $('sendSheet'), sendText = $('sendText'), sendMsg = $('sendMsg'), sendGo = $('sendGo'), sendReceive = null;   // (the Receive switch is a row in Options, made below)
var INBOX_POLL_MS = 10000, RECEIVE_KEY = 'nibble.receive';
var deskShell = window.nibbleDesktop || null;   // the desktop app (desktop/): it always receives

function sendSay(text) { sendMsg.textContent = text || ''; }
/** Opens the sheet, with something already in the box (a shared link) if there is one. */
function openSend(prefill) {
  optionsSheet.close();
  sendText.value = prefill || '';
  sendSay(account.code ? '' : 'Turn on Backup & sync first, on both devices.');
  renderRecent();
  openDialog(sendSheet);
}
/**
 * Sends what is in the box to the other device. With `quickText` (the desktop shortcut) it sends that text at once, without the sheet,
 * and says what went wrong in a speech bubble.
 */
function sendToOther(quickText) {
  var quick = typeof quickText === 'string';
  var m = Send.classify(quick ? quickText : sendText.value);
  function fail(t) { if (quick) say(t, 3200, true); else sendSay(t); }
  if (!m) { fail(quick ? 'Copy a link or some text first, then try again.' : 'Type or paste something to send.'); return; }
  if (!account.code) { fail('Turn on Backup & sync first, here and on your other device.'); return; }
  if (quick) { if (quickSending) return; quickSending = true; } else sendGo.disabled = true;
  if (!quick) sendSay('Sending…');
  var fromPt = quick ? { x: pet.getBoundingClientRect().left + pet.getBoundingClientRect().width / 2, y: pet.getBoundingClientRect().top - 30 } : center(sendGo.getBoundingClientRect());   // the emoji flies from the button (or from above him)
  accountApi('/v1/inbox', 'POST', account.code, { kind: m.kind, text: m.text, from: inboxDevice() }).then(function (r) {
    if (quick) quickSending = false; else sendGo.disabled = false;
    if (r.ok) {
      if (!quick) sendText.value = '';
      syncLogAdd('Sent a ' + (m.kind === 'link' ? 'link' : 'note') + ' to the other device', 'sync');
      if (!quick && sendSheet.open) sendSheet.close();   // at once: nothing more to wait for
      var sentLine = function () { say(pick(['off it goes!', 'on its way ♡', 'fumu fumu~ sent!']), 1400); };
      // a moment for the sheet to close, then he eats it (waiting for his own moves to end rather than skipping the animation)
      setTimeout(function () {
        whenCanEat(function (ok) {
          if (!ok) { sentLine(); return; }
          busy++;
          eatMessage(m.kind === 'link', fromPt).then(function () { sentLine(); setTimeout(function () { busy--; if (!busy) settle(); }, 700); });
        }, 4000);
      }, quick ? 100 : 450);
    } else if (r.status === 401) fail('The server does not know this code. Check Backup & sync.');
    else if (r.status === 503) fail('The server is not ready for this yet: it needs the new inbox table (see worker/sync/README.md).');
    else if (r.status === 413) fail('That is too long to send.');
    else fail(r.status ? 'The server said no (' + r.status + ').' : 'Could not reach the server. Check your connection.');
  });
}
var quickSending = false;
sendGo.addEventListener('click', function () { sound('tap'); sendToOther(); });
sendSheet.addEventListener('click', function (e) { if (e.target === sendSheet) sendSheet.close(); });
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
  optionsList.insertBefore(row, optionsList.children[1] || null);
  // whether this device shows what the others send (the desktop app always does, so it has no switch)
  if (deskShell) return;
  var rx = document.createElement('label');
  rx.className = 'option';
  rx.innerHTML = '<span class="option-title">Receive from my other devices</span>';
  sendReceive = document.createElement('input');
  sendReceive.type = 'checkbox'; sendReceive.setAttribute('role', 'switch');
  rx.appendChild(sendReceive);
  optionsList.insertBefore(rx, optionsList.children[2] || null);
  sendReceive.addEventListener('change', function () {
    try { localStorage.setItem(RECEIVE_KEY, sendReceive.checked ? '1' : '0'); } catch (e) { /* storage blocked */ }
    if (sendReceive.checked) setTimeout(inboxPoll, 300);
  });
  $('optionsBtn').addEventListener('click', function () { sendReceive.checked = receivingHere(); });
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

// ---------- the last few things that arrived (kept on this device only, never synced) ----------
var RECENT_KEY = 'nibble.received', RECENT_MAX = 5;
function recentList() {
  try {
    var a = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(a) ? a.filter(function (m) { return m && typeof m.text === 'string' && (m.kind === 'link' || m.kind === 'text'); }).slice(0, RECENT_MAX) : [];
  } catch (e) { return []; }
}
/** Keeps a received link or note at the top of the list (once: the same message id is not added twice). */
function rememberReceived(msg) {
  if (msg.from === 'claude' || msg.test) return;   // a "Claude replied" tap on the shoulder is not something to keep (see the hook in .claude/)
  var list = recentList();
  if (msg.id && list.some(function (m) { return m.id === msg.id; })) return;
  list.unshift({ id: msg.id || '', kind: msg.kind === 'link' ? 'link' : 'text', text: String(msg.text).slice(0, 4000), at: Date.now() });
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); } catch (e) { /* storage blocked */ }
}
/** Fills the "Received lately" list in the send sheet. */
function renderRecent() {
  var box = $('sendRecent'), list = recentList();
  box.replaceChildren();
  $('sendRecentHead').hidden = !list.length;
  list.forEach(function (m) {
    var row = document.createElement('div'), pv = Send.preview(m), txt = document.createElement('span'), img = emojiImg(pv.icon, '');
    row.className = 'send-recent-row';
    img.className = 'send-recent-icon';
    txt.className = 'send-recent-text';
    txt.textContent = m.kind === 'link' ? (pv.title || m.text) : m.text;
    txt.title = m.text;
    row.append(img, txt);
    if (m.kind === 'link' && Send.safeToOpen(m.text)) {
      var open = document.createElement('button');
      open.type = 'button'; open.className = 'pill-btn small'; open.textContent = 'Open';
      open.addEventListener('click', function () { sound('tap'); if (deskShell && deskShell.open) deskShell.open(m.text); else window.open(m.text, '_blank', 'noopener'); });
      row.appendChild(open);
    }
    var copy = document.createElement('button');
    copy.type = 'button'; copy.className = 'pill-btn small'; copy.textContent = 'Copy';
    copy.addEventListener('click', function () {
      sound('tap');
      if (deskShell && deskShell.copy) deskShell.copy(m.text); else if (navigator.clipboard) navigator.clipboard.writeText(m.text).catch(function () { /* blocked */ });
      copy.textContent = 'Copied ✓';
    });
    row.appendChild(copy);
    box.appendChild(row);
  });
}

/** Claude's alert: he holds a cartoon magic wand, flicks it a few times and sparkles and magic come out of its star. */
function castWand() {
  var before = pet.dataset.prop;
  pet.dataset.prop = 'wand';
  pet.classList.add('wanding');
  var tip = pet.querySelector('.wand .wd-star');
  [350, 750, 1150, 1550].forEach(function (ms, i) {
    setTimeout(function () {
      if (!pet.classList.contains('wanding') || !tip) return;
      var r = tip.getBoundingClientRect();
      drift(i % 2 ? ['✨', '✦', '♥'] : ['✦', '⭐', '✨'], { x: r.left + r.width / 2, y: r.top + r.height / 2 }, 4);
      if (i % 2 === 0) sound('notice');
    }, ms);
  });
  setTimeout(function () {
    pet.classList.remove('wanding');
    if (before) pet.dataset.prop = before; else delete pet.dataset.prop;
  }, 1900);
}

var inboxCard = null;
/** The little card: what it is, and Open / Copy / done. Only one at a time; the next waits on the server. */
function showInboxCard(msg, more) {
  var pv = Send.preview(msg), stageEl = document.querySelector('.stage');
  var card = document.createElement('div');
  card.className = 'inbox-card' + (msg.from === 'claude' ? ' claude-card' : '');   // (Claude's "replied" note: no Copy, and it nudges now and then)
  card.setAttribute('role', 'status');
  var img = emojiImg(msg.from === 'claude' ? '🔔' : pv.icon, '');   // Claude's note is a bell
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
  if (msg.from !== 'claude') button('Copy', function (b) {
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
  if (msg.test) return;   // a made-up one from Developer tools
  accountApi('/v1/inbox/ack', 'POST', account.code, { ids: [msg.id] });
  setTimeout(inboxPoll, 800);
}
/**
 * A link or a note flies into Fumu's mouth (big enough to see) and he chews it. Used when sending and when something arrives.
 * @param {boolean} link
 * @param {{x: number, y: number}} from
 * @returns {Promise<void>} Resolves once it has landed in his mouth.
 */
function eatMessage(link, from) {
  var to = mouthPoint();
  setFace(FACES.catching);
  return fly(link ? '🔗' : '📝', from, to, { duration: 700, scaleFrom: 1, scaleTo: .75, lift: 40, size: 56 }).then(function () {
    setFace(CHEW); pulse('chomp', 360); crumbs(to, '#e7c9a0', 6);
  });
}
/** Whether the eating can be shown now (not while he eats something else, and not with reduced motion). */
function canShowEating() { return !busy && !reduceMotion && !!pet.getBoundingClientRect().width; }
/**
 * Calls fn(true) as soon as the eating can be shown, waiting for what he is doing to end (his idle moves would otherwise make the
 * animation skip); fn(false) when it cannot be shown at all (reduced motion, no room) or he stays busy for `maxMs`.
 */
function whenCanEat(fn, maxMs) {
  var t0 = Date.now();
  (function check() {
    if (canShowEating()) { fn(true); return; }
    if (reduceMotion || !pet.getBoundingClientRect().width || Date.now() - t0 > maxMs) { fn(false); return; }
    setTimeout(check, 150);
  })();
}
/** Fumu eats the thing that arrived (it flies in from above), then the card shows. */
function receiveMessage(msg, more) {
  var link = msg.kind === 'link';
  rememberReceived(msg);
  inboxCard = document.createElement('div');   // holds the place from the start, so a second message does not begin
  // a short wait first (long enough to have watched it leave the other device), then he eats it as soon as he is free
  setTimeout(function () {
    whenCanEat(function (ok) {
      if (!ok) { inboxCard = null; showInboxCard(msg, more); return; }
      var mouth = mouthPoint();
      busy++;
      eatMessage(link, { x: mouth.x + 70, y: Math.max(8, mouth.y - 170) }).then(function () {
        var fromClaude = msg.from === 'claude';
        say(fromClaude ? msg.text + '!' : link ? 'a link for you!' : 'a note for you!', fromClaude ? 3200 : 1900);
        if (fromClaude) { setFace(FACES.tada); castWand(); sound('notice'); }   // Claude's note gets a little celebration
        setTimeout(function () {
          busy--; if (!busy) settle();
          inboxCard = null;
          showInboxCard(msg, more);
        }, fromClaude ? 1600 : 520);
      });
    }, 8000);
  }, 1800);
}
/**
 * Looks for something another device left (only while the window is showing and nothing is on the card). The server leaves
 * out what this device sent itself; the check on `from` is for a server that has not been updated yet.
 */
/** Developer tools: shows an alert as if it had arrived. @param {string} kind 'claude', 'note' or 'link'. */
function devAlert(kind) {
  if (inboxCard) return 'An alert is already showing: close it first.';
  var msg = kind === 'claude' ? { kind: 'text', text: 'Claude replied', from: 'claude' }
    : kind === 'link' ? { kind: 'link', text: 'https://example.com/test', from: 'test' } : { kind: 'text', text: 'A test note\nsent from Developer tools', from: 'test' };
  msg.test = true; msg.id = 'test-' + Date.now();
  receiveMessage(msg, 0);
  return 'It arrives in a few seconds.';
}
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
