// The stamp book (to-do list only): every task ticked off earns a check-mark stamp, kept by kind of task.
// No streaks and nothing is lost by waiting: it only shows what you have done.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var stampSheet = $('stampSheet'), stampGrid = $('stampGrid');
// a book entry can join several task kinds with '+': calls and chats count as social, and stamps already earned for either show together
var STAMP_KINDS = [
  ['chore', 'Chores'], ['social+call', 'Social'], ['health', 'Health'], ['money', 'Money'], ['errand', 'Errands'], ['fitness', 'Fitness'],
  ['work', 'Work'], ['fun', 'Fun'], ['travel', 'Travel'], ['care', 'Care'], ['cook', 'Cooking'], ['other', 'Other']
];
/** @returns {string} The emoji that stands for a kind of task (the first one in tasks.js for it). */
function stampEmoji(kind) {
  return Tasks.all.filter(function (e) { return Tasks.categoryOf(e) === kind; })[0] || '📌';
}
/** @returns {number} How many stamps a book entry holds (all the task kinds joined in it). */
function stampCount(entry) {
  return entry.split('+').reduce(function (n, k) { return n + ((state.pet.stamps || {})[k] || 0); }, 0);
}
/** @returns {number} 0 to 3: how grand a kind's stamp looks (1, 10 and 50 stamps). */
function stampTier(n) { return n >= 50 ? 3 : n >= 10 ? 2 : n >= 1 ? 1 : 0; }
/** Draws the book: a round stamp for each kind, empty until the first task of that kind is ticked. */
function renderStamps() {
  stampGrid.replaceChildren.apply(stampGrid, STAMP_KINDS.map(function (k) {
    var n = stampCount(k[0]);
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'stamp t' + stampTier(n);
    card.dataset.kind = k[0];
    var ring = document.createElement('span');
    ring.className = 'stamp-ring';
    ring.append(emojiImg(stampEmoji(k[0].split('+')[0]), ''));
    if (n) { var tick = document.createElement('b'); tick.textContent = '✓'; ring.append(tick); }
    var label = document.createElement('span');
    label.className = 'stamp-label';
    label.textContent = k[1];
    var count = document.createElement('span');
    count.className = 'stamp-count';
    count.textContent = n ? '×' + n : '–';
    card.append(ring, label, count);
    return card;
  }));
}
stampGrid.addEventListener('click', function (e) {
  var card = e.target.closest('.stamp');
  if (!card) return;
  var n = stampCount(card.dataset.kind);
  sound(n ? 'stamp' : 'tap');
  if (!busy && baseState() !== 'sleepy') say(n ? pick(['look at all those!', 'so many stamps!', n + ' of those, wow!']) : pick(['not yet… soon?', 'an empty spot!']), 1500);
});
$('stampBtn').addEventListener('click', function () { renderStamps(); openDialog(stampSheet); });
