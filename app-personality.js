// Personalities and suggestions.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- personalities ----------
var personalityStrip = $('personalityStrip');
/** @returns {Object} The pet's current personality from personalities.js. */
function personality() { return byId(Personalities, state.pet.personality) || Personalities[0]; }
/**
 * @param {Object} p A personality.
 * @returns {boolean} True if it has been earned.
 */
function personalityOpen(p) { return !!FreeUnlocks.all || L.personalityProgress(state.pet, p).done; }
/**
 * @param {Item} item
 * @returns {boolean} True if the pet gets excited about it. Foodies like
 *   everything, so they only get excited now and then.
 */
function isFavourite(item) {
  var p = personality();
  return L.likes(p, item) && (p.id !== 'foodie' || Math.random() < 0.3);
}
Personalities.forEach(function (p) {
  var b = document.createElement('button');
  b.type = 'button';
  b.dataset.personality = p.id;
  var label = document.createElement('span');
  label.textContent = p.label;
  b.append(emojiImg(p.icon, ''), label);
  personalityStrip.appendChild(b);
});
/**
 * Shows a personality's name and short description under the strip.
 * @param {Object} p
 */
function describePersonality(p) {
  var info = $('personalityInfo');
  var name = document.createElement('b');
  name.textContent = p.label + ': ';
  info.replaceChildren(name, document.createTextNode(p.blurb));
}
personalityStrip.addEventListener('pointerover', function (e) {
  var b = e.target.closest('button');
  if (b && e.pointerType === 'mouse') describePersonality(byId(Personalities, b.dataset.personality));
});
personalityStrip.addEventListener('pointerleave', function () { describePersonality(personality()); });
/** Marks the current personality and shows locks and progress on the rest. */
function renderPersonalities() {
  describePersonality(personality());
  personalityStrip.querySelectorAll('button').forEach(function (b) {
    var p = byId(Personalities, b.dataset.personality);
    var prog = L.personalityProgress(state.pet, p);
    b.setAttribute('aria-pressed', p.id === personality().id ? 'true' : 'false');
    var open = personalityOpen(p);
    b.classList.toggle('locked', !open);
    var badge = b.querySelector('.lock-badge');
    if (open) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'lock-badge'; b.appendChild(badge); }
    badge.textContent = '🔒 ' + prog.count + '/' + prog.goal;
  });
}
personalityStrip.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  var p = byId(Personalities, b.dataset.personality);
  var prog = L.personalityProgress(state.pet, p);
  describePersonality(p);
  if (!personalityOpen(p)) {
    sound('locked');
    speciesHint.textContent = '🔒 ' + p.label + ': ' + p.text + ' (' + prog.count + '/' + prog.goal + ').';
    speciesHint.hidden = false;
    return;
  }
  speciesHint.hidden = true;
  state.pet.personality = p.id;
  save();
  renderPersonalities();
  sound('excited');
});
renderPersonalities();

// ---------- suggestions ----------
var suggestEl = $('suggest'), suggestBtn = $('suggestBtn'), suggestTimer;
var SUGGEST_GAP_MS = 3 * 60 * 1000, lastSuggestion = 0; // at most one ask every three minutes
/**
 * The pet asks for one of its favourites that isn't on the list yet.
 * @returns {boolean} False if there is nothing left to suggest.
 */
function offerSuggestion() {
  // not too often: at most one ask every three minutes
  if (isTodo() || !state.settings.suggestions || Date.now() - lastSuggestion < SUGGEST_GAP_MS) return false;
  var text = L.suggestion(personality(), state.items);
  if (!text) return false;
  var e = L.emojiFor(text, state.overrides).emoji;
  var span = document.createElement('span');
  span.textContent = '+ ' + text;
  suggestBtn.replaceChildren(emojiImg(e, ''), span);
  suggestBtn.dataset.text = text;
  suggestEl.hidden = false;
  lastSuggestion = Date.now();
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(function () { suggestEl.hidden = true; }, 15000);
  talk('suggest', ['ooh, how about {x}?', 'can we get {x}?', '{x}, please?'], 1800, { x: text.toLowerCase() });
  return true;
}
suggestBtn.addEventListener('click', function () {
  suggestEl.hidden = true;
  addItem(suggestBtn.dataset.text);
});
$('suggestNo').addEventListener('click', function () {
  suggestEl.hidden = true;
  sound('off');
  if (!busy) { setFace(FACES.sheepish); talk('decline', ['ok, maybe next time', 'aww, fine'], 1200); setTimeout(function () { if (!busy) settle(); }, 1000); }
});
