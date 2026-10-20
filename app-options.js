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
  setTimeout(themeColor, 0);
}
/** The phone's status bar (the theme-color meta) takes the page's own background, so it is not pink in Dark or Bonfire. */
function themeColor() {
  var meta = document.querySelector('meta[name="theme-color"]'), bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (meta && bg) meta.content = bg;
}
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeColor);   // Auto follows the phone
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
  { key: 'ambience', title: 'Background sounds', text: '' },   // (waves, rain and so on: app-ambience.js)
  { key: 'vibration', title: 'Vibration', text: '' },
  { key: 'aisles', title: 'Sort by aisle', text: '' },
  { key: 'time24', title: '24-hour time', text: '' },
  { key: 'goalToasts', title: 'Goal progress display', text: '' },
  { key: 'suggestions', title: 'Shopping suggestions', text: '' },
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
// the weather (weather.js, app-weather.js): a switch, and a place to look it up for (a typed city or this device's position); kept on this device
var wxRow = document.createElement('label'), wxPlaceBox = document.createElement('div');
wxRow.className = 'option';
wxRow.innerHTML = '<span class="option-title">Weather</span><input type="checkbox" role="switch" id="wxOn">';
wxPlaceBox.className = 'option-weather';
wxPlaceBox.innerHTML = '<div class="wx-place"><input type="text" id="wxPlace" maxlength="60" placeholder="City or postcode" aria-label="City or postcode for the weather" autocomplete="off"><button type="button" class="pill-btn" id="wxFind">Find</button><button type="button" class="pill-btn" id="wxHere">My location</button></div><ul class="wx-suggest" id="wxSuggest" role="listbox" aria-label="Places" hidden></ul><div class="wx-unit"><span class="option-title">Units</span><span class="theme-btns" id="wxUnit"><button type="button" class="pill-btn" data-unit="c">°C</button><button type="button" class="pill-btn" data-unit="f">°F</button></span></div><p class="option-text" id="wxStatus" aria-live="polite"></p>';
optionsList.append(wxRow, wxPlaceBox);
/** Says what the weather setting is doing now (the place and the weather last seen). */
function wxStatus(note) {
  var c = wxConf(), l = wxLast(), el = $('wxStatus');
  if (!el) return;
  el.textContent = note || (!c.want ? '' : !c.on ? T('Pick a place below.') : (c.place || T('Your location')) + (l ? ': ' + T(Weather.KINDS[l.kind].label) + ', ' + wxTemp(l.temp) : ''));
}
/** Marks the picked unit, °C or °F. */
function wxUnitButtons() { $('wxUnit').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.unit === wxUnit())); }); }
$('wxUnit').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  wxSetUnit(b.dataset.unit); wxUnitButtons(); wxStatus(); sound('pick');
});
/** Fills the weather row when Options opens. */
function wxFill() { wxUnitButtons(); var c = wxConf(); $('wxOn').checked = c.want; if (c.place && document.activeElement !== $('wxPlace')) $('wxPlace').value = c.place === 'My location' ? '' : c.place; wxStatus(); }
$('wxOn').addEventListener('change', function () {
  var c = wxConf(); c.want = $('wxOn').checked; wxSave(c);
  if (!state.quiet) sound(c.want ? 'on' : 'off');
  wxStatus(); wxFetch(true);
});
/** Starts using a place that was picked or found. */
function wxUsePlace(p) {
  wxSave({ want: true, lat: p.lat, lon: p.lon, place: p.place });
  $('wxOn').checked = true; $('wxPlace').value = p.place; wxHideSuggest();
  wxStatus(); wxFetch(true);
}
var wxSuggestTimer = 0, wxSuggestSeq = 0;
function wxHideSuggest() { var u = $('wxSuggest'); u.hidden = true; u.replaceChildren(); }
/** While typing: a pick list of matching places (a city can be in several states or countries). */
function wxSuggest() {
  var q = $('wxPlace').value.trim(), seq = ++wxSuggestSeq;
  clearTimeout(wxSuggestTimer);
  if (q.length < 2 || !navigator.onLine) { wxHideSuggest(); return; }
  wxSuggestTimer = setTimeout(function () {
    fetch(Weather.searchUrl(q, 8)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (seq !== wxSuggestSeq) return;   // (typed on since)
      var list = Weather.parsePlaces(j, q), u = $('wxSuggest');
      u.replaceChildren.apply(u, list.map(function (p) {
        var li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'option'); b.textContent = p.place;
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });   // (keeps the box focused until the pick lands)
        b.addEventListener('click', function () { if (!state.quiet) sound('tap'); wxUsePlace(p); });
        li.appendChild(b); return li;
      }));
      u.hidden = !list.length;
    }).catch(function () { /* the Find button says if it cannot look it up */ });
  }, 280);
}
$('wxPlace').addEventListener('input', wxSuggest);
$('wxPlace').addEventListener('keydown', function (e) {
  var u = $('wxSuggest'), items = [].slice.call(u.querySelectorAll('button')), at = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { wxHideSuggest(); return; }
  if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[0].focus(); }
});
$('wxSuggest').addEventListener('keydown', function (e) {
  var items = [].slice.call(this.querySelectorAll('button')), at = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' && at < items.length - 1) { e.preventDefault(); items[at + 1].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); (at > 0 ? items[at - 1] : $('wxPlace')).focus(); }
  else if (e.key === 'Escape') { wxHideSuggest(); $('wxPlace').focus(); }
});
/** Looks a typed place up and starts using it. */
function wxFindPlace() {
  var name = $('wxPlace').value.trim();
  if (!name) { wxStatus(T('Type a city or postcode first.')); return; }
  wxStatus(T('Looking…'));
  fetch(Weather.searchUrl(name)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    var p = Weather.parsePlaces(j, name)[0];   // (Find takes the best match; the pick list shows the others while typing)
    if (!p) { wxStatus(T('No place found.')); return; }
    wxUsePlace(p);
  }).catch(function () { wxStatus(T('Could not look it up (are you online?).')); });
}
$('wxFind').addEventListener('click', wxFindPlace);
$('wxPlace').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); wxFindPlace(); } });
$('wxHere').addEventListener('click', function () {
  if (!navigator.geolocation) { wxStatus(T('This device cannot tell where it is.')); return; }
  wxStatus(T('Looking…'));
  navigator.geolocation.getCurrentPosition(function (pos) {
    wxSave({ want: true, lat: Weather.round(pos.coords.latitude), lon: Weather.round(pos.coords.longitude), place: 'My location' });
    $('wxOn').checked = true; $('wxPlace').value = '';
    wxStatus(); wxFetch(true);
  }, function () { wxStatus(T('Could not get the location.')); }, { timeout: 10000, maximumAge: 600000 });
});
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
  wxFill();
  optionsList.querySelectorAll('input[data-key]').forEach(function (b) { b.checked = b.dataset.key === 'quiet' ? !state.quiet : state.settings[b.dataset.key]; });
  var n = Errors.fresh.length;   // errors since the app opened (Developer tools has them)
  $('buildLabel').textContent = 'Build ' + BUILD + (n ? ' \u00b7 ' + n + (n === 1 ? ' error' : ' errors') : '');
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
  { label: 'Weather: pretend each kind in turn (rain, storm, snow, cold, hot, real)', run: function () { devSheet.close(); return devWeatherNext(); } },
  { label: 'Weather report: for a random place (nothing saved)', run: function () {
    var spots = [['Reykjavik', 64.15, -21.94], ['Cairo', 30.04, 31.24], ['Singapore', 1.35, 103.82], ['Oslo', 59.91, 10.75], ['Dubai', 25.2, 55.27], ['Lima', -12.05, -77.04], ['Sydney', -33.87, 151.21], ['Tokyo', 35.68, 139.69], ['Nairobi', -1.29, 36.82], ['Vancouver', 49.28, -123.12], ['Mumbai', 19.08, 72.88], ['Ushuaia', -54.8, -68.3], ['Mexico City', 19.43, -99.13], ['Helsinki', 60.17, 24.94]];
    var s = spots[Math.floor(Math.random() * spots.length)];
    devSheet.close();
    window.ringWeatherTest({ lat: s[1], lon: s[2], place: s[0] });
    return 'Looking at the weather in ' + s[0] + '.';
  } },
  { label: 'Little plant: water it now (grows a stage)', run: function () { devSheet.close(); return devPlantGrow(); } },
  { label: 'Little plant: start over with a seed', run: function () { return devPlantReset(); } },
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
  { label: 'Test a goal notification', run: function () { devSheet.close(); return devToasts('goal'); } },
  { label: 'Test an unlocked notification', run: function () { devSheet.close(); return devToasts('unlock'); } },
  { label: 'Test a trip stamp notification', run: function () { devSheet.close(); return devToasts('trip'); } },
  { label: 'Make Fumu ask for a snack', run: function () { return devWish(); } },
  { label: 'Make Fumu steal an emoji', run: function () { return devSteal(); } },
  { label: 'Pretend it is the next special day (gifts)', run: function () { return devGiftCalendar(); } },
  { label: 'Shut today\'s gift boxes again', run: function () { return devGiftReset(); } },
  { label: 'Play the birthday celebration', run: function () { devSheet.close(); return devBirthdayNow(); } },
  { label: 'Play the Christmas celebration', run: function () { devSheet.close(); return devXmasNow(); } },
  { label: 'Play the Halloween celebration', run: function () { devSheet.close(); return devHalloweenNow(); } },
  { label: 'Play the New Year\'s Day celebration', run: function () { devSheet.close(); return devNewYearNow(); } },
  { label: 'Play the Easter celebration', run: function () { devSheet.close(); return devEasterNow(); } },
  { label: 'Play the King\'s Day celebration', run: function () { devSheet.close(); return devKingsDayNow(); } },
  { label: 'Make Fumu suggest an item', run: function () { return devSuggest(); } },
  { label: 'Fill with sample items', run: function () {
    if (isTodo()) { state.items = L.sortByDue(state.items.concat(sampleTodos()), todayKey()); return 'Sample to-dos added.'; }
    state.items = state.items.concat(L.parseState(null, newId).items); return 'Sample items added.';
  } },
  { label: 'Clear the list', run: function () { state.items = []; return 'List cleared.'; } },
  { label: 'Reset all saved data', danger: true, run: function () {
    if (!confirm('Reset everything? Your list, pet, progress and options will be gone.')) return 'Nothing changed.';
    resetting = true;   // (nothing may save the state again before the page has reloaded)
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* storage blocked */ }
    location.reload();
    return 'Resetting…';
  } }
];
/** The developer tools are grouped into folding sections (build 625) so the list is not one long wall of buttons; the celebrations get short names. */
var DEV_GROUPS = [
  ['Time and progress', ['Day / night: real clock → day → night', 'Unlock everything', 'Lock everything again', 'Skip to tomorrow']],
  ['Alerts and notifications', ['Test a Claude alert', 'Test a note alert', 'Test a link alert', 'Test a task reminder', 'Test a goal notification', 'Test an unlocked notification', 'Test a trip stamp notification']],
  ['Celebrations', ['Play the birthday celebration', 'Play the Christmas celebration', 'Play the Halloween celebration', 'Play the New Year\'s Day celebration', 'Play the Easter celebration', 'Play the King\'s Day celebration']],
  ['Fumu does something', ['Make Fumu ask for a snack', 'Make Fumu steal an emoji', 'Make Fumu suggest an item']],
  ['Gifts', ['Pretend it is the next special day (gifts)', 'Shut today\'s gift boxes again']],
  ['List and saved data', ['Fill with sample items', 'Clear the list', 'Reset names: yours, your birthday and Fumu\'s', 'Reset all saved data']]
];
var DEV_SHORT = { 'Play the birthday celebration': 'Birthday', 'Play the Christmas celebration': 'Christmas', 'Play the Halloween celebration': 'Halloween', 'Play the New Year\'s Day celebration': 'New Year\'s Day', 'Play the Easter celebration': 'Easter', 'Play the King\'s Day celebration': 'King\'s Day' };
var devButtons = [];
(function () {
  var shown = {}, host = $('devActions');
  function make(i) {
    var a = DEV_ACTIONS[i], b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.textContent = typeof a.label === 'function' ? a.label() : (DEV_SHORT[a.label] || a.label);
    if (a.danger) b.className = 'danger';
    devButtons[i] = b;
    shown[i] = 1;
    return b;
  }
  DEV_GROUPS.concat([['Other', []]]).forEach(function (g, gi) {
    var idx = [];
    DEV_ACTIONS.forEach(function (a, i) { var name = typeof a.label === 'function' ? null : a.label; if (gi < DEV_GROUPS.length ? g[1].indexOf(name) !== -1 : !shown[i]) idx.push(i); });
    if (!idx.length) return;
    var d = document.createElement('details'), s = document.createElement('summary'), grid = document.createElement('div');
    d.className = 'dev-group'; s.textContent = g[0]; grid.className = 'dev-grid';
    idx.forEach(function (i) { grid.appendChild(make(i)); });
    d.append(s, grid);
    host.appendChild(d);
  });
  DEV_ACTIONS.forEach(function (a, i) { if (typeof a.label === 'function' && !devButtons[i]) { /* a label that shows a state belongs to Other: made above when not matched */ } });
})();
$('devActions').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  sound('tap');
  devStatus.textContent = DEV_ACTIONS[b.dataset.i].run();
  DEV_ACTIONS.forEach(function (a, i) { if (typeof a.label === 'function' && devButtons[i]) devButtons[i].textContent = a.label(); });   // (labels that show a state)
  refreshAll();
});
devNoWait.addEventListener('change', function () {
  state.dev.noWait = devNoWait.checked;
  sound(devNoWait.checked ? 'on' : 'off');
  save();
});
/** Recent errors (caught by the script at the top of index.html, window.Errors): the last few, with their build and time, so one can be reported from the phone. */
function renderDevErrors() {
  var list = Errors.list();
  $('devErrorList').textContent = list.length ? list.map(Errors.line).join('\n') : 'None.';
  $('devErrCopy').hidden = $('devErrClear').hidden = !list.length;
}
$('devErrCopy').addEventListener('click', function () {
  sound('tap');
  var text = Errors.text();
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { devStatus.textContent = 'Copied.'; }, function () { devStatus.textContent = 'Could not copy.'; });
  else devStatus.textContent = 'Could not copy.';
});
$('devErrClear').addEventListener('click', function () { sound('tap'); Errors.clear(); renderDevErrors(); });
/** The privacy page (privacy.html), in a new tab; in the Windows app the shell opens it in the browser (its window must not navigate away from the app). */
function openPrivacy() { sound('tap'); window.open('privacy.html', '_blank', 'noopener'); }
$('privacyBtn').addEventListener('click', openPrivacy);
$('devBtn').addEventListener('click', function () {
  optionsSheet.close();
  devNoWait.checked = state.dev.noWait;
  devStatus.textContent = '';
  renderDevErrors();
  openDialog(devSheet);
});
devSheet.addEventListener('click', function (e) { if (e.target === devSheet) devSheet.close(); });
// the Pet page's gear (top right of its stage) opens the same Options
$('dressOptionsBtn').addEventListener('click', function () { $('optionsBtn').click(); });
