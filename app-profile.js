// Profile: the player's name and birthday (state.player). Basic for now; the gift boxes (app-gift.js) use the birthday,
// and Nibble says hello by name (app-start.js).
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var profileNameAtOpen = '', profileBirthdayAtOpen = '';
var profileSheet = $('profileSheet'), profileName = $('profileName'), profileBirthday = $('profileBirthday');
/** Fills the sheet from what is saved. */
function renderProfile() {
  renderFavourites();
  profileNameAtOpen = state.player.name;
  profileBirthdayAtOpen = state.player.birthday;
  profileName.value = state.player.name;
  profileBirthday.value = state.player.birthday ? '2000-' + state.player.birthday : '';   // the year does not matter, only the day
}
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
$('profileForm').addEventListener('submit', function (e) { e.preventDefault(); });
profileName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); profileName.blur(); } });
$('profileBtn').addEventListener('click', function () { renderProfile(); openDialog(profileSheet); });
// Nibble only reacts once, when the sheet closes and something changed (not while you are still typing it in)
profileSheet.addEventListener('close', function () {
  if (busy || baseState() === 'sleepy') return;
  var p = state.player;
  if (p.birthday && p.birthday !== profileBirthdayAtOpen) { pulse('hop', 500); sound('excited'); say('I\'ll remember your birthday! ♡', 1700); }
  else if (p.name && p.name !== profileNameAtOpen) { pulse('hop', 500); say('hi, ' + p.name + '! ♡', 1500); }
});
