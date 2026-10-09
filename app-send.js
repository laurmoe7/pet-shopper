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
  [700, 1500, 2300, 3100].forEach(function (ms, i) {
    setTimeout(function () {
      if (!pet.classList.contains('wanding')) return;
      // there is a wand in each hand: the one in use is the one that is drawn (the other has no size)
      var stars = pet.querySelectorAll('.wand .wd-star'), r = null;
      for (var k = 0; k < stars.length && !r; k++) { var b = stars[k].getBoundingClientRect(); if (b.width > 0) r = b; }
      if (!r) return;
      drift(i % 2 ? ['✨', '✦', '♥'] : ['✦', '⭐', '✨'], { x: r.left + r.width / 2, y: r.top + r.height / 2 }, 4);
    }, ms);
  });
  setTimeout(function () {
    pet.classList.remove('wanding');
    if (before) pet.dataset.prop = before; else delete pet.dataset.prop;
  }, 3800);
}

var inboxCard = null;
/** The little card: what it is, and Open / Copy / done. Only one at a time; the next waits on the server. */
function showInboxCard(msg, more) {
  var pv = Send.preview(msg), stageEl = document.querySelector('.stage');
  var card = document.createElement('div');
  card.className = 'inbox-card ' + (msg.from === 'claude' ? 'claude-card' : msg.kind === 'link' ? 'link-card' : 'note-card');   // (Claude's "replied" note: no Copy, and it nudges now and then)
  card.setAttribute('role', 'status');
  var img = emojiImg(msg.from === 'claude' ? '🔔' : pv.icon, '');   // Claude's note is a bell
  img.className = 'inbox-icon';
  if (msg.from === 'claude') {   // the bell swings by itself inside its round button (the button stays still)
    var bell = img; bell.className = 'inbox-bell';
    img = document.createElement('span'); img.className = 'inbox-icon'; img.appendChild(bell);
  }
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
/** Swiped left on a note or link alert: copies it (the Copy button) and the card gives a little nudge; it stays up until swiped right or closed.
 *  @param {Element} card @returns {boolean} Whether there was something to copy. */
function cardCopy(card) {
  var b = [].slice.call(card.querySelectorAll('button')).filter(function (x) { return /^Copy/.test(x.textContent); })[0];
  if (!b) return false;
  b.click();
  try { card.animate([{ translate: '0 0' }, { translate: '-12px 0' }, { translate: '0 0' }], { duration: 240, easing: 'ease-out' }); } catch (err) { /* old browser */ }
  return true;
}
/** An alert card slides on out of the window the way it was pushed, then `then` runs. @param {Element} card @param {number} dir -1 left, 1 right. */
function slideAway(card, dir, then, silent) {
  if (!silent) sound('swoosh');
  var away = dir * (window.innerWidth + card.offsetWidth);
  card.style.animation = 'none';
  card.style.transition = 'translate .26s cubic-bezier(.4, 0, 1, 1)';
  card.style.translate = away + 'px 0';
  setTimeout(function () { if (card.parentNode && then) then(); }, 270);
}
/** Swipe an alert card sideways to dismiss it (the same as its cross). Any .inbox-card with a cross button; not the quick-add box. */
(function () {
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    var card = e.target.closest && e.target.closest('.inbox-card');
    if (!card || card.classList.contains('quick-card') || e.target.closest('button, input, textarea') || e.button > 0) return;
    if (!card.querySelector('.inbox-done')) return;
    drag = { card: card, id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: Date.now() };
    card.style.touchAction = card.classList.contains('remind-card') ? 'none' : 'pan-y';
    card.style.animation = 'none';   // (the pop-in and the Claude card's nudge would otherwise hold its position)
    try { card.setPointerCapture(e.pointerId); } catch (err) { /* gone */ }
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
    // a task reminder can also be pushed up or down (snooze), so it follows the pointer both ways
    var up = drag.card.classList.contains('remind-card') && Math.abs(drag.dy) > Math.abs(drag.dx);
    drag.card.style.translate = (up ? 0 : drag.dx) + 'px ' + (up ? drag.dy : 0) + 'px';
  });
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag, fast = Math.abs(d.dx) / Math.max(1, Date.now() - d.t) > .5;
    drag = null;
    var remind = d.card.classList.contains('remind-card'), vertical = remind && Math.abs(d.dy) > Math.abs(d.dx) && Math.abs(d.dy) >= 30;
    if (!vertical && Math.abs(d.dx) < 40 && !(fast && Math.abs(d.dx) > 18)) {   // not far enough: it springs back
      d.card.style.transition = 'translate .18s';
      d.card.style.translate = '';
      setTimeout(function () { d.card.style.transition = ''; }, 200);
      return;
    }
    if (!remind && !vertical && d.dx < 0 && cardCopy(d.card)) {   // a note or link: left copies it and the card springs back
      d.card.style.transition = 'translate .18s'; d.card.style.translate = '';
      setTimeout(function () { d.card.style.transition = ''; }, 200);
      return;
    }
    // a task reminder: left is Done (when it can be ticked here), up or down snoozes it, right puts it away; other alerts: either way puts it away
    var btn = d.card.querySelector('.inbox-done');
    function named(re) { return [].slice.call(d.card.querySelectorAll('button')).filter(function (b) { return re.test(b.textContent); })[0]; }
    if (vertical) btn = named(/^In 10 min/) || btn;
    else if (remind && d.dx < 0) btn = named(/^Done/) || btn;
    if (vertical) {
      sound('swoosh');
      d.card.style.animation = 'none';
      d.card.style.transition = 'translate .26s ease-in, opacity .26s';
      d.card.style.translate = '0 ' + (d.dy < 0 ? -60 : 60) + 'px'; d.card.style.opacity = '0';
      setTimeout(function () { if (d.card.parentNode && btn) btn.click(); }, 270);
    } else slideAway(d.card, d.dx < 0 ? -1 : 1, function () { if (btn) btn.click(); });
  }
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
})();
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
  if (msg.id) shownIds[msg.id] = 1;
  if (msg.from === 'claude' && !msg.test) accountApi('/v1/inbox/ack', 'POST', account.code, { ids: [msg.id] });   // a tap on the shoulder: gone from the server at once, so it cannot come back
  rememberReceived(msg);
  inboxCard = document.createElement('div');   // holds the place from the start, so a second message does not begin
  // a short wait first (long enough to have watched it leave the other device), then he eats it as soon as he is free
  setTimeout(function () {
    // asleep in his bed he does not wake to eat it: a quiet chime and the card, no wand and no cheering
    if (typeof petScene === 'function' && petScene() === 'night-bed') { inboxCard = null; sound('notice'); showInboxCard(msg, more); return; }
    whenCanEat(function (ok) {
      if (!ok) { inboxCard = null; showInboxCard(msg, more); return; }
      var mouth = mouthPoint();
      busy++;
      eatMessage(link, { x: mouth.x + 70, y: Math.max(8, mouth.y - 170) }).then(function () {
        var fromClaude = msg.from === 'claude';
        say(fromClaude ? msg.text + '!' : link ? 'a link for you!' : 'a note for you!', fromClaude ? 6400 : 1900);
        if (fromClaude) { setFace(FACES.tada); castWand(); sound('claude'); }   // Claude's note gets a little celebration
        setTimeout(function () {
          busy--; if (!busy) settle();
          inboxCard = null;
          showInboxCard(msg, more);
        }, fromClaude ? 3200 : 520);
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
var polling = false, shownIds = {}, lastClaudeAt = 0;
/** @returns {string} This device's id as the server keeps it (letters and digits, at most 12). */
function inboxDevice() { return String(state.sync.device || '').replace(/[^a-z0-9]/gi, '').slice(0, 12); }
var lastPollAt = 0;
function inboxPoll() {
  // away from the computer (the desktop app says so after a few idle minutes): once a minute is plenty, which keeps the server's request count down
  if (typeof deskAway === 'function' && deskAway() && Date.now() - lastPollAt < 60000) return;
  if (polling || !receivingHere() || !account.code || syncState.stopped || inboxCard || document.querySelector('.remind-card') || document.visibilityState === 'hidden') return;
  polling = true; lastPollAt = Date.now();
  accountApi('/v1/inbox?device=' + encodeURIComponent(inboxDevice()), 'GET', account.code).then(function (r) {
    polling = false;
    var list = r.ok && r.json && r.json.messages;
    list = list && list.filter(function (m) { return m.from !== inboxDevice(); });
    // never show the same message twice (it can still be on the server a moment after it was acked), and only one Claude alert at a time
    if (list) list = list.filter(function (m) {
      var seen = shownIds[m.id], soon = m.from === 'claude' && Date.now() - lastClaudeAt < 20000;
      if (seen || soon) { shownIds[m.id] = 1; if (!m.test) accountApi('/v1/inbox/ack', 'POST', account.code, { ids: [m.id] }); return false; }
      if (m.from === 'claude') lastClaudeAt = Date.now();
      return true;
    });
    if (!list || !list.length || inboxCard) return;
    syncLogAdd('Got a ' + (list[0].kind === 'link' ? 'link' : 'note') + ' from your other device', 'sync');
    receiveMessage(list[0], list.length - 1);
  });
}
setInterval(inboxPoll, INBOX_POLL_MS);
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') setTimeout(inboxPoll, 200); });
window.addEventListener('focus', function () { setTimeout(inboxPoll, 200); });
setTimeout(inboxPoll, 1000);
