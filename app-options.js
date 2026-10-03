// Options and Developer tools.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- options ----------
$('buildLabel').textContent = 'Build ' + BUILD;
/* The cardboard look is the only look for now (it follows the phone's dark mode). The classic look is still in
   styles.css: to offer both again, set data-look only when state.settings.cardboard is true and bring back the Options switch. */
document.documentElement.dataset.look = 'cardboard';
/* Light or dark: Auto follows the phone. Kept on this device only (not in the pet's saved data). */
var THEMES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
var savedTheme = 'auto';
try { savedTheme = localStorage.getItem('nibble-theme') || 'auto'; } catch (e) { /* storage not available */ }
applyTheme(savedTheme);
var optionsSheet = $('optionsSheet'), optionsList = $('optionsList');
var OPTIONS = [
  { key: 'quiet', title: 'Quiet mode', text: '' },
  { key: 'vibration', title: 'Vibration', text: 'A little buzz when you tick things off (on phones that can).' },
  { key: 'goalToasts', title: 'Goal progress', text: 'A label under your pet after each bite, like "Fish fan 6/20".' },
  { key: 'fairPlayTips', title: 'Fair-play tips', text: 'Mentions the 15-minute rule and the once-a-day rule. The rules still apply when this is off.' }
];
var themeRow = document.createElement('div');
themeRow.className = 'option option-theme';
themeRow.innerHTML = '<span class="option-title">Light or dark</span><span class="option-text">Auto follows your phone.</span>';
var themeBtns = document.createElement('span');
themeBtns.className = 'theme-btns';
THEMES.forEach(function (t) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'pill-btn'; b.dataset.theme = t[0]; b.textContent = t[1];
  b.setAttribute('aria-pressed', String(t[0] === savedTheme));
  b.addEventListener('click', function () {
    applyTheme(t[0]);
    try { localStorage.setItem('nibble-theme', t[0]); } catch (e) { /* storage not available */ }
    themeBtns.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    sound('pick');
  });
  themeBtns.appendChild(b);
});
themeRow.appendChild(themeBtns);
optionsList.appendChild(themeRow);
OPTIONS.forEach(function (o) {
  var label = document.createElement('label');
  label.className = 'option';
  var title = document.createElement('span');
  title.className = 'option-title';
  title.textContent = o.title;
  var text = document.createElement('span');
  text.className = 'option-text';
  text.textContent = o.text;
  var box = document.createElement('input');
  box.type = 'checkbox';
  box.setAttribute('role', 'switch');
  box.dataset.key = o.key;
  if (o.text) label.append(title, box, text); else label.append(title, box);
  optionsList.appendChild(label);
});
optionsList.addEventListener('change', function (e) {
  var key = e.target.dataset.key;
  if (!key) return;
  if (key === 'quiet') state.quiet = e.target.checked; else state.settings[key] = e.target.checked;
  save();
  if (!state.quiet) sound(e.target.checked ? 'on' : 'off');
});
$('optionsBtn').addEventListener('click', function () {
  optionsList.querySelectorAll('input').forEach(function (b) { b.checked = b.dataset.key === 'quiet' ? state.quiet : state.settings[b.dataset.key]; });
  openDialog(optionsSheet);
});
optionsSheet.addEventListener('click', function (e) { if (e.target === optionsSheet) optionsSheet.close(); });

// ---------- developer tools ----------
var devSheet = $('devSheet'), devStatus = $('devStatus'), devNoWait = $('devNoWait');
/** Redraws everything that depends on progress after a dev action. */
function refreshAll() {
  save();
  render();
  applyPet();
  refreshLocks();
  renderPersonalities();
  renderRoom();
}
/** A Developer tools switch that flips a class on the page (used to hunt a drawing seam). */
function seamSwitch(label, cls, what) {
  return { label: 'Seam hunt: ' + label, run: function () {
    var on = document.documentElement.classList.toggle(cls);
    return what + (on ? ' (switched)' : ' (back to normal)');
  } };
}
var DEV_ACTIONS = [
  seamSwitch('plain food emoji', 'bn-noemojifx', 'The white sticker edges around the list emoji are off'),
  { label: 'Seam hunt: classic look', run: function () {
    var on = document.documentElement.dataset.look === 'cardboard';
    if (on) delete document.documentElement.dataset.look; else document.documentElement.dataset.look = 'cardboard';
    return on ? 'Classic pink look (switched)' : 'Cardboard look (back to normal)';
  } },
  seamSwitch('no tilting and hopping', 'bn-notilt', 'The whole pet stops tilting, hopping and bouncing'),
  seamSwitch('no squashing', 'bn-nosquash', 'The pet stops squashing, wobbling and breathing'),
  seamSwitch('still arms', 'bn-noarms', 'Arms stop moving'),
  seamSwitch('no animation', 'bn-noanim', 'All pet animation stops'),
  { label: 'Unlock everything', run: function () { L.unlockAll(state.pet, Achievements, Personalities); return 'All goals finished and personalities earned.'; } },
  { label: 'Lock everything again', run: function () { L.lockAll(state.pet, Achievements, FreeUnlocks); return 'Progress wiped. Locked items are locked again.'; } },
  { label: 'Skip to tomorrow', run: function () { L.skipDays(state, 1); return 'A day has passed: daily limits are fresh.'; } },
  { label: 'Daydream now', run: function () { devSheet.close(); setTimeout(daydream, 400); return ''; } },
  { label: 'Suggest something now', run: function () { devSheet.close(); lastSuggestion = 0; setTimeout(offerSuggestion, 400); return ''; } },
  { label: 'Fill with sample items', run: function () { state.items = state.items.concat(L.parseState(null, newId).items); return 'Sample items added.'; } },
  { label: 'Clear the list', run: function () { state.items = []; return 'List cleared.'; } },
  { label: 'Reset all saved data', danger: true, run: function () {
    if (!confirm('Reset everything? Your list, pet, progress and options will be gone.')) return 'Nothing changed.';
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* storage blocked */ }
    location.reload();
    return 'Resetting…';
  } }
];
DEV_ACTIONS.forEach(function (a, i) {
  var b = document.createElement('button');
  b.type = 'button';
  b.dataset.i = i;
  b.textContent = a.label;
  if (a.danger) b.className = 'danger';
  $('devActions').appendChild(b);
});
$('devActions').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  sound('tap');
  devStatus.textContent = DEV_ACTIONS[b.dataset.i].run();
  refreshAll();
});
devNoWait.addEventListener('change', function () {
  state.dev.noWait = devNoWait.checked;
  sound(devNoWait.checked ? 'on' : 'off');
  save();
});
$('devBtn').addEventListener('click', function () {
  optionsSheet.close();
  devNoWait.checked = state.dev.noWait;
  devStatus.textContent = '';
  openDialog(devSheet);
});
devSheet.addEventListener('click', function (e) { if (e.target === devSheet) devSheet.close(); });
