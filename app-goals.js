// Goals and unlocks.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- goals: achievements that unlock species and hats ----------
var goalToastEl = $('goalToast'), goalsSheet = $('goalsSheet'), goalList = $('goalList');
var speciesHint = $('speciesHint'), hatHint = $('hatHint');
var toastTimer;
// what the toast says when a fair-play rule stops something counting
var FAIR_PLAY = {
  'too-fast': 'Too quick! Items count after 15 min',
  repeat: 'Already counted that today',
  clock: 'Clock went back, goals paused'
};

/**
 * @param {string} id
 * @returns {?Object} The achievement with this id.
 */
function achievement(id) { return byId(Achievements, id); }
/**
 * @param {'species'|'skin'|'hat'} kind
 * @param {string} id
 * @returns {boolean} Whether that species or hat is unlocked.
 */
function unlocked(kind, id) { return L.isUnlocked(state.pet, kind, id, Achievements, FreeUnlocks); }

/**
 * Shows a short line under the pet: progress on a goal, or that today's share is used up.
 * Only the first matching goal is shown, so the toast stays short.
 * @param {{counted: string[], capped: string[], unlocked: Object[]}} goals
 */
function goalToast(goals) {
  if (goals.blocked && FAIR_PLAY[goals.blocked] && !goals.counted.length) {
    // the rules still apply with tips off; they just aren't mentioned
    if (state.settings.fairPlayTips) showToast('🧺', FAIR_PLAY[goals.blocked], false, 3000);
    return;
  }
  if (!state.settings.goalToasts) return;
  var id = goals.counted[0] || goals.capped[0];
  var ach = id && achievement(id);
  if (!ach || goals.unlocked.length) return;
  var p = L.progress(state.pet, ach, new Date());
  var text = goals.counted.indexOf(id) !== -1
    ? ach.title + ' ' + p.count + '/' + p.goal + (p.today >= p.perDay ? ' · done for today' : '')
    : ach.title + ': ' + p.perDay + ' of ' + p.perDay + ' today, more tomorrow';
  showToast(ach.icon, text, false, 2200);
}
/**
 * @param {string} icon Emoji.
 * @param {string} text
 * @param {boolean} win Uses the golden "unlocked" look.
 * @param {number} ms How long it stays.
 */
function showToast(icon, text, win, ms) {
  var span = document.createElement('span');
  span.textContent = text;
  goalToastEl.replaceChildren(emojiImg(icon, ''), span);
  goalToastEl.classList.toggle('win', win);
  goalToastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { goalToastEl.hidden = true; }, ms);
}
/**
 * The unlock moment: a cheer, a jingle and petals for each newly finished goal.
 * @param {Object[]} list Achievements that were just finished.
 * @returns {Promise<void>}
 */
function cheerUnlocks(list) {
  return list.reduce(function (p, ach) {
    return p.then(function () {
      var u = ach.unlocks;
      setFace(FACES.tada);
      pulse('hop', 500);
      sound('party');
      buzz([20, 60, 20]);
      showToast(ach.icon, 'Unlocked: ' + u.label + '!', true, 3200);
      say(u.kind === 'species' ? 'new friend: ' + u.label + '!' : u.kind === 'skin' ? 'new skin: ' + u.label.replace(/ skin$/, '') + '!' : u.kind === 'personality' ? 'I feel… ' + u.label.toLowerCase() + '!' : 'new hat: ' + u.label + '!', 2200);
      if (!reduceMotion) petals(mouthPoint(), 14);
      refreshLocks();
      renderPersonalities();
      return wait(2200);
    });
  }, Promise.resolve());
}

/**
 * Adds or removes the lock look and progress badge on a species or hat button.
 * @param {HTMLButtonElement} b
 * @param {'species'|'skin'|'hat'} kind
 * @param {string} id
 */
function markLock(b, kind, id) {
  var open = unlocked(kind, id);
  var badge = b.querySelector('.lock-badge');
  b.classList.toggle('locked', !open);
  if (open) { if (badge) badge.remove(); b.removeAttribute('aria-description'); return; }
  var ach = L.gateFor(kind, id, Achievements);
  var p = L.progress(state.pet, ach, new Date());
  if (!badge) { badge = document.createElement('span'); badge.className = 'lock-badge'; b.appendChild(badge); }
  badge.textContent = '🔒 ' + p.count + '/' + p.goal;
  b.setAttribute('aria-description', 'Locked. ' + ach.text + '.');
}
/** Brings every lock in the species grid and hat strip up to date. */
function refreshLocks() {
  speciesGrid.querySelectorAll('button').forEach(function (b) { markLock(b, 'species', b.dataset.species); });
  skinGrid.querySelectorAll('button').forEach(function (b) { markLock(b, 'skin', b.dataset.skin); });
  wearButtons().forEach(function (b) { markLock(b, 'hat', b.dataset.hat); });
}
/**
 * Explains how to unlock a locked species or hat.
 * @param {HTMLElement} el The hint paragraph in the open sheet.
 * @param {'species'|'skin'|'hat'} kind
 * @param {string} id
 */
function lockHint(el, kind, id) {
  sound('locked');
  var ach = L.gateFor(kind, id, Achievements);
  var p = L.progress(state.pet, ach, new Date());
  el.textContent = '🔒 ' + ach.unlocks.label + ': ' + ach.text + ' (' + p.count + '/' + p.goal + ', up to ' + p.perDay + ' a day).';
  el.hidden = false;
}

/** Fills the goals sheet with each achievement and where it stands. */
function renderGoals() {
  var now = new Date();
  goalList.replaceChildren.apply(goalList, Achievements.map(function (ach) {
    var p = L.progress(state.pet, ach, now);
    var li = document.createElement('li');
    li.className = 'goal' + (p.done ? ' done' : '');
    var title = document.createElement('div');
    title.className = 'goal-title';
    var name = document.createElement('span');
    name.textContent = ach.title;
    var reward = document.createElement('span');
    reward.className = 'goal-reward';
    reward.textContent = (p.done ? '✓ ' : FreeUnlocks.all ? '★ ' : '🔒 ') + ach.unlocks.label;
    title.append(name, reward);
    var text = document.createElement('div');
    text.className = 'goal-text';
    text.textContent = ach.text + ', up to ' + ach.perDay + ' a day';
    var bar = document.createElement('div');
    bar.className = 'goal-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(p.goal));
    bar.setAttribute('aria-valuenow', String(p.count));
    bar.setAttribute('aria-label', ach.title);
    var fill = document.createElement('span');
    fill.style.width = Math.round((p.count / p.goal) * 100) + '%';
    bar.appendChild(fill);
    var meta = document.createElement('div');
    meta.className = 'goal-meta';
    var count = document.createElement('span');
    count.textContent = p.count + '/' + p.goal;
    var today = document.createElement('span');
    today.textContent = p.done ? 'Unlocked!' : p.today + ' of ' + p.perDay + ' today';
    meta.append(count, today);
    li.append(emojiImg(ach.icon, ''), title, text, bar, meta);
    return li;
  }));
}
$('goalsBtn').addEventListener('click', function () {
  renderGoals();
  $('goalsFairPlay').hidden = !state.settings.fairPlayTips || !!FreeUnlocks.all;
  $('goalsIntroText').textContent = FreeUnlocks.all ? 'Everything is unlocked for now. Your progress still counts, so rewards can come back later. Only a few count each day.' : ' to unlock new friends and hats. Only a few count each day, so come back tomorrow for more.';
  $('goalsFeed').hidden = !!FreeUnlocks.all;
  openDialog(goalsSheet);
});
goalsSheet.addEventListener('click', function (e) { if (e.target === goalsSheet) goalsSheet.close(); });
petSheet.addEventListener('close', function () { speciesHint.hidden = true; });
dressSheet.addEventListener('close', function () { hatHint.hidden = true; });

refreshLocks();
applyPet();

// closing a sheet makes a soft sound; the emoji picker plays its pick or delete sound instead
document.querySelectorAll('dialog:not(#picker)').forEach(function (d) {
  d.addEventListener('close', function () { sound('close'); });
});
document.querySelectorAll('dialog').forEach(function (d) {
  d.addEventListener('close', function () { if (bubble.parentNode === d) { bubble.hidden = true; bubbleToStage(); } });
});
