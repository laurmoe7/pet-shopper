// Profile: the player's name and birthday (state.player). Basic for now; the gift boxes (app-gift.js) use the birthday,
// and Nibble says hello by name (app-start.js). Once a field is filled in it shows as text and takes a double-tap to edit
// (like the pet's name), so a stray tap cannot change it. The Top 10 and the Stamp Book open from here too.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var profileNameAtOpen = '', profileBirthdayAtOpen = '';
var profileSheet = $('profileSheet'), profileName = $('profileName'), profileBirthday = $('profileBirthday');
var profileNameShow = $('profileNameShow'), profileBirthdayShow = $('profileBirthdayShow'), profileTaps = { name: 0, birthday: 0 };
/** @returns {string} The birthday ("MM-DD") as a date to read: 9 March. */
function birthdayText(mmdd) {
  return new Date(2000, +mmdd.slice(0, 2) - 1, +mmdd.slice(3)).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}
/** Shows each field as text when it has something in it, or as a box to type in when it is empty. */
function showProfile() {
  var p = state.player;
  $('profileNameText').textContent = p.name;
  $('profileBirthdayText').textContent = p.birthday ? birthdayText(p.birthday) : '';
  profileNameShow.hidden = !p.name; profileName.hidden = !!p.name;
  profileBirthdayShow.hidden = !p.birthday; profileBirthday.hidden = !!p.birthday;
  $('profileHint').hidden = !p.name && !p.birthday;
}
/** Fills the sheet from what is saved. */
function renderProfile() {
  profileNameAtOpen = state.player.name;
  profileBirthdayAtOpen = state.player.birthday;
  profileName.value = state.player.name;
  profileBirthday.value = state.player.birthday ? '2000-' + state.player.birthday : '';   // the year does not matter, only the day
  showProfile();
}
/** Turns a field's text back into its box. @param {'name'|'birthday'} which */
function editProfile(which) {
  var show = which === 'name' ? profileNameShow : profileBirthdayShow, input = which === 'name' ? profileName : profileBirthday;
  show.hidden = true; input.hidden = false; input.focus();
  if (input.select) try { input.select(); } catch (e) { /* date boxes cannot select */ }
}
[['name', profileNameShow], ['birthday', profileBirthdayShow]].forEach(function (f) {
  f[1].addEventListener('click', function (e) {
    var now = Date.now();
    if (e.detail === 0 || L.isDoubleTap(profileTaps[f[0]], now)) { profileTaps[f[0]] = 0; editProfile(f[0]); return; }
    profileTaps[f[0]] = now;
    f[1].classList.remove('nudge'); void f[1].offsetWidth; f[1].classList.add('nudge');
  });
  f[1].addEventListener('dblclick', function (e) { e.preventDefault(); editProfile(f[0]); });
});
profileName.addEventListener('input', function () {
  state.player.name = profileName.value.trim().slice(0, 20);
  save();
});
profileBirthday.addEventListener('change', function () {
  var v = profileBirthday.value;
  state.player.birthday = /^\d{4}-\d\d-\d\d$/.test(v) ? v.slice(5) : '';
  save();
  if (typeof refreshGift === 'function') refreshGift();   // the birthday may bring boxes today
});
// back to text when you leave a box (not while you are still typing or picking the date)
profileName.addEventListener('blur', showProfile);
profileBirthday.addEventListener('blur', showProfile);
$('profileForm').addEventListener('submit', function (e) { e.preventDefault(); });
profileName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); profileName.blur(); } });
profileBirthday.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); profileBirthday.blur(); } });
$('profileBtn').addEventListener('click', function () { renderProfile(); openDialog(profileSheet); });
// Nibble only reacts once, when the sheet closes and something changed (not while you are still typing it in)
profileSheet.addEventListener('close', function () {
  if (busy || baseState() === 'sleepy') return;
  var p = state.player;
  if (p.birthday && p.birthday !== profileBirthdayAtOpen) { pulse('hop', 500); sound('excited'); say('I\'ll remember your birthday! ♡', 1700); }
  else if (p.name && p.name !== profileNameAtOpen) { pulse('hop', 500); say('hi, ' + p.name + '! ♡', 1500); }
});
