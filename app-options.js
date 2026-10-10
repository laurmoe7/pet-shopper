// Options and Developer tools.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- options ----------
$('buildLabel').textContent = 'Build ' + BUILD;
/* Appearance: one theme for the whole app and Mini Fumu (they always match). Auto follows the phone's light or dark. On the phone it is kept on the device only (not
   in the pet's saved data); in the Windows app the shell keeps it (its alertStyle pref, so the settings window and both windows agree). */
var THEMES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark'], ['sweet', 'Sweet'], ['quest2', 'Quest'], ['osrs', 'Old School'], ['bonfire', 'Bonfire']];
/** Older saved names: the paper, night, cool, scribble and classic looks are gone (quest was replaced by quest2, build 544). */
var OLD_THEMES = { quest: 'quest2', paper: 'light', night: 'dark', cool: 'light', scribble: 'light', classic: 'dark' };
var currentTheme = 'auto';
function applyTheme(t) {
  var de = document.documentElement, pet = de.classList.contains('desktop-pet');
  t = OLD_THEMES[t] || t;
  if (!THEMES.some(function (x) { return x[0] === t; })) t = 'auto';
  currentTheme = t;
  // Quest (id quest2) is the base Quest rules with a second layer on top (data-quest="slots"); Old School is Quest plus data-quest="osrs"; Bonfire is Quest plus data-quest="bonfire" and shares
  // Old School's rules. Sweet is a light skin of its own (data-skin="sweet"). Those skins restyle the whole app; the small window (Mini Fumu) only wears their al-* classes (cards, bubble, ring)
  var skinned = t === 'quest2' || t === 'osrs' || t === 'bonfire';
  if (pet || !(skinned || t === 'sweet')) { delete de.dataset.skin; delete de.dataset.quest; }
  if (!pet && skinned) { de.dataset.skin = 'quest'; de.dataset.quest = t === 'quest2' ? 'slots' : t; }
  if (!pet && t === 'sweet') de.dataset.skin = 'sweet';
  if (skinned && !pet) de.dataset.theme = 'dark';
  else if (t === 'sweet' && !pet) de.dataset.theme = 'light';
  else if (t === 'light' || t === 'dark') de.dataset.theme = t;
  else delete de.dataset.theme;
  var want = { sweet: ['al-sweet'], quest2: ['al-quest', 'al-quest2'], osrs: ['al-osrs'], bonfire: ['al-bonfire'] }[t] || [];
  ['al-sweet', 'al-quest', 'al-quest2', 'al-osrs', 'al-bonfire'].forEach(function (c) { de.classList.toggle(c, want.indexOf(c) !== -1); });
  setTimeout(function () { if (typeof refreshStickers === 'function') refreshStickers(); }, 50);   // the list's stickers are drawn in the new colours
}
/** The player picked a theme (the app's Appearance): the Windows shell keeps it for both windows and the settings window, the phone keeps it here. */
function chooseTheme(t) {
  applyTheme(t);
  try { localStorage.setItem('nibble-theme', currentTheme); } catch (e) { /* storage not available */ }
  if (window.nibbleDesktop && window.nibbleDesktop.setTheme) window.nibbleDesktop.setTheme(currentTheme);
}
var savedTheme = 'auto';
try { savedTheme = localStorage.getItem('nibble-theme') || 'auto'; } catch (e) { /* storage not available */ }
applyTheme(savedTheme);
var optionsSheet = $('optionsSheet'), optionsList = $('optionsList');
var OPTIONS = [
  { key: 'quiet', title: 'Sounds', text: '', invert: true },   // on = sounds on, stored as state.quiet
  { key: 'vibration', title: 'Vibration', text: '' },
  { key: 'aisles', title: 'Sort by aisle', text: '' },
  { key: 'time24', title: '24-hour time', text: '' },
  { key: 'goalToasts', title: 'Goal progress display', text: '' },
  { key: 'fairPlayTips', title: 'Fair-play tips', text: 'The rules still apply when off.' }
];
var themeRow = document.createElement('div');
themeRow.className = 'option option-theme';
themeRow.innerHTML = '<span class="option-title">Appearance</span>';
var themeBtns = document.createElement('span');
themeBtns.className = 'theme-btns';
THEMES.forEach(function (t) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'pill-btn'; b.dataset.theme = t[0]; b.textContent = t[1];
  
  b.addEventListener('click', function () {
    chooseTheme(t[0]);
    syncThemeButtons();
    sound('pick');
  });
  themeBtns.appendChild(b);
});
themeRow.appendChild(themeBtns);
/** Marks the picked theme (it can change from the shell, when it is picked in Mini Fumu's settings). */
function syncThemeButtons() { themeBtns.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.theme === currentTheme)); }); }
syncThemeButtons();
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
  if (o.invert) box.dataset.invert = '1';
  if (o.text) label.append(title, box, text); else label.append(title, box);
  optionsList.appendChild(label);
});
optionsList.addEventListener('change', function (e) {
  var key = e.target.dataset.key;
  if (!key) return;
  if (key === 'quiet') state.quiet = !e.target.checked; else state.settings[key] = e.target.checked;
  save();
  if (!state.quiet) sound(e.target.checked ? 'on' : 'off');   // (switching sounds on plays the click; switching them off is silent)
});
$('optionsBtn').addEventListener('click', function () {
  optionsList.querySelectorAll('input[data-key]').forEach(function (b) { b.checked = b.dataset.key === 'quiet' ? !state.quiet : state.settings[b.dataset.key]; });
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
  { label: 'Day / night: real clock → day → night', run: function () {
    devClock = { auto: 'day', day: 'night', night: 'auto' }[devClock];
    updateEmptyHint();
    refreshBackdrop();
    refreshBedtime();
    if (!busy) settle();
    return { auto: 'Using the real clock (asleep 10 pm to 7 am when nothing is left to buy).', day: 'Pretending it is daytime.', night: 'Pretending it is night: with nothing left to buy, the pet sleeps.' }[devClock];
  } },
  { label: 'Unlock everything', run: function () { L.unlockAll(state.pet, Achievements, Personalities); return 'All goals finished and personalities earned.'; } },
  { label: 'Lock everything again', run: function () { L.lockAll(state.pet, Achievements, FreeUnlocks); return 'Progress wiped. Locked items are locked again.'; } },
  { label: 'Skip to tomorrow', run: function () { L.skipDays(state, 1); return 'A day has passed: daily limits are fresh.'; } },
  { label: 'Reset names: yours, your birthday and Fumu\'s', run: function () {
    state.player = { name: '', birthday: '' };
    state.pet.name = 'Fumu';
    save();
    applyPet();
    showName();
    refreshGift();
    return 'Your name and birthday are empty again and he is back to Fumu. Open Pet to see the pencil wiggle.';
  } },
  { label: 'Test a Claude alert', run: function () { devSheet.close(); return devAlert('claude'); } },
  { label: 'Test a note alert', run: function () { devSheet.close(); return devAlert('note'); } },
  { label: 'Test a link alert', run: function () { devSheet.close(); return devAlert('link'); } },
  { label: 'Test a task reminder', run: function () {
    devSheet.close();
    var item = { id: 'test', text: 'A test reminder', emoji: '⏰', time: '', done: false };
    if (typeof window.deskRemind === 'function' && window.deskRemind([item])) return 'Reminder card shown.';
    say('A test reminder: time for your task!', 3000); return 'Said as a bubble (the card is for the desktop app).';
  } },
  { label: 'Make Fumu ask for a snack', run: function () { return devWish(); } },
  { label: 'Make Fumu steal an emoji', run: function () { return devSteal(); } },
  { label: 'Pretend it is the next special day (gifts)', run: function () { return devGiftCalendar(); } },
  { label: 'Shut today\'s gift boxes again', run: function () { return devGiftReset(); } },
  { label: 'Make Fumu suggest an item', run: function () { return devSuggest(); } },
  { label: 'Fill with sample items', run: function () {
    if (isTodo()) { state.items = L.sortByDue(state.items.concat(sampleTodos()), todayKey()); return 'Sample to-dos added.'; }
    state.items = state.items.concat(L.parseState(null, newId).items); return 'Sample items added.';
  } },
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
  b.textContent = typeof a.label === 'function' ? a.label() : a.label;
  if (a.danger) b.className = 'danger';
  $('devActions').appendChild(b);
});
$('devActions').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  sound('tap');
  devStatus.textContent = DEV_ACTIONS[b.dataset.i].run();
  DEV_ACTIONS.forEach(function (a, i) { if (typeof a.label === 'function') $('devActions').children[i].textContent = a.label(); });   // (labels that show a state)
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
// the Pet page's gear (top right of its stage) opens the same Options
$('dressOptionsBtn').addEventListener('click', function () { $('optionsBtn').click(); });
