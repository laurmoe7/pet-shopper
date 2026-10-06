// Profile: the player's name and birthday (state.player). Basic for now; the gift boxes (app-gift.js) use the birthday,
// and Nibble says hello by name (app-start.js).
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var profileNameAtOpen = '';
var profileSheet = $('profileSheet'), profileName = $('profileName'), profileBirthday = $('profileBirthday');
/** Fills the sheet from what is saved. */
function renderProfile() {
  profileNameAtOpen = state.player.name;
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
  sound(state.player.birthday ? 'excited' : 'tap');
  if (state.player.birthday && !busy && baseState() !== 'sleepy') say('I\'ll remember your birthday! ♡', 1700);
});
$('profileForm').addEventListener('submit', function (e) { e.preventDefault(); });
profileName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); profileName.blur(); } });
$('profileBtn').addEventListener('click', function () { renderProfile(); openDialog(profileSheet); });
profileSheet.addEventListener('close', function () {
  if (state.player.name && state.player.name !== profileNameAtOpen && !busy && baseState() !== 'sleepy') { pulse('hop', 500); say('hi, ' + state.player.name + '! ♡', 1500); }
});
