// Profile: the player's name and birthday (state.player). Basic for now; the gift boxes (app-gift.js) use the birthday,
// and Fumu says hello by name (app-start.js). Once a field is filled in it shows as text with an Edit button
// (like the pet's name), so a stray tap cannot change it. The Top 10 and the Stamp Book open from here too.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var profileNameAtOpen = '', profileBirthdayAtOpen = '';
var profileSheet = $('profileSheet'), profileName = $('profileName'), profileBirthday = $('profileBirthday');   // (profileBirthday is the month and day boxes together)
var profileNameShow = $('profileNameShow'), profileBirthdayShow = $('profileBirthdayShow');
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
  $('profileNameEdit').hidden = !p.name; $('profileBirthdayEdit').hidden = !p.birthday;
  $('profileAvatar').textContent = p.name ? p.name.charAt(0).toUpperCase() : '♡';
  $('profileHello').textContent = p.name ? 'Hi, ' + p.name + '!' : 'Hello, friend!';
}
// the birthday is a month and a day (no year)
var bdayMonth = $('bdayMonth'), bdayDay = $('bdayDay');
(function () {
  bdayMonth.appendChild(new Option('Month', ''));
  for (var m = 1; m <= 12; m++) bdayMonth.appendChild(new Option(new Date(2000, m - 1, 1).toLocaleDateString(undefined, { month: 'long' }), (m < 10 ? '0' : '') + m));
  bdayDay.appendChild(new Option('Day', ''));
  for (var d = 1; d <= 31; d++) bdayDay.appendChild(new Option(String(d), (d < 10 ? '0' : '') + d));
})();
/** Fills the sheet from what is saved. */
function renderProfile() {
  profileNameAtOpen = state.player.name;
  profileBirthdayAtOpen = state.player.birthday;
  profileName.value = state.player.name;
  bdayMonth.value = state.player.birthday ? state.player.birthday.slice(0, 2) : '';
  bdayDay.value = state.player.birthday ? state.player.birthday.slice(3) : '';
  showProfile();
}
/** Turns a field's text back into its box. @param {'name'|'birthday'} which */
function editProfile(which) {
  var show = which === 'name' ? profileNameShow : profileBirthdayShow, input = which === 'name' ? profileName : profileBirthday;
  show.hidden = true; input.hidden = false; (which === 'name' ? input : bdayMonth).focus();
  if (which === 'name') try { input.select(); } catch (e) { /* not selectable */ }
}
[['name', profileNameShow], ['birthday', profileBirthdayShow]].forEach(function (f) {
  $(f[0] === 'name' ? 'profileNameEdit' : 'profileBirthdayEdit').addEventListener('click', function () { editProfile(f[0]); });
});
profileName.addEventListener('input', function () {
  state.player.name = profileName.value.trim().slice(0, 20);
  save();
});
[bdayMonth, bdayDay].forEach(function (sel) {
  sel.addEventListener('change', function () {
    var mm = bdayMonth.value, dd = bdayDay.value;
    if (mm && dd) {   // a day the month does not have (30 February) becomes its last day
      var last = new Date(2000, +mm, 0).getDate();
      if (+dd > last) { dd = (last < 10 ? '0' : '') + last; bdayDay.value = dd; }
      state.player.birthday = mm + '-' + dd;
    } else state.player.birthday = '';
    save();
    if (typeof refreshGift === 'function') refreshGift();   // the birthday may bring boxes today
  });
});
// back to text when you leave a box (not while you are still typing or picking the date)
profileName.addEventListener('blur', showProfile);
profileBirthday.addEventListener('focusout', function () { setTimeout(function () { if (!profileBirthday.contains(document.activeElement) && !selectPop) showProfile(); }, 120); });   // (not while the round list is open)
$('profileForm').addEventListener('submit', function (e) { e.preventDefault(); });
profileName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); profileName.blur(); } });
$('profileBtn').addEventListener('click', function () { renderProfile(); sheetUnderMouth(profileSheet); openDialog(profileSheet); });
// Fumu only reacts once, when the sheet closes and something changed (not while you are still typing it in)
profileSheet.addEventListener('close', function () {
  if (busy || baseState() === 'sleepy') return;
  var p = state.player;
  if (p.birthday && p.birthday !== profileBirthdayAtOpen) { pulse('hop', 500); sound('excited'); say('I\'ll remember your birthday! ♡', 1700); }
  else if (p.name && p.name !== profileNameAtOpen) { pulse('hop', 500); say('hi, ' + p.name + '! ♡', 1500); }
});
