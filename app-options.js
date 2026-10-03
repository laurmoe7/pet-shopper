// Options and Developer tools.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- options ----------
$('buildLabel').textContent = 'Build ' + BUILD;
/* The cardboard look is the only look for now (it follows the phone's dark mode). The classic look is still in
   styles.css: to offer both again, set data-look only when state.settings.cardboard is true and bring back the Options switch. */
document.documentElement.dataset.look = 'cardboard';
var optionsSheet = $('optionsSheet'), optionsList = $('optionsList');
var OPTIONS = [
  { key: 'quiet', title: 'Quiet mode', text: 'Mutes all sounds. Your pet still talks.' },
  { key: 'sounds', title: 'Sounds', text: 'Chomps, slurps and squeaks.' },
  { key: 'vibration', title: 'Vibration', text: 'A little buzz when you tick things off (on phones that can).' },
  { key: 'goalToasts', title: 'Goal progress', text: 'A label under your pet after each bite, like "Fish fan 6/20".' },
  { key: 'fairPlayTips', title: 'Fair-play tips', text: 'Mentions the 15-minute rule and the once-a-day rule. The rules still apply when this is off.' },
  { key: 'daydreams', title: 'Daydreams', text: 'Thought clouds about things on your list.' },
  { key: 'suggestions', title: 'Suggestions', text: 'Your pet sometimes asks for something to add.' }
];
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
  label.append(title, box, text);
  optionsList.appendChild(label);
});
optionsList.addEventListener('change', function (e) {
  var key = e.target.dataset.key;
  if (!key) return;
  if (key === 'quiet') state.quiet = e.target.checked; else state.settings[key] = e.target.checked;
  if (key === 'suggestions' && !e.target.checked) suggestEl.hidden = true;
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
var DEV_ACTIONS = [
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
