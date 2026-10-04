// Bedtime: at night a moon lamp hangs above the pet. Tap the sleeping pet to tuck it in under a blanket and
// the lamp goes off; tap the lamp to switch it on or off. It lasts until morning (or until the list needs shopping).
// Kept on this device only. These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var BED_KEY = 'nibble-bedtime', moonLamp = $('moonLamp'), tucking = false;
/** @returns {{night: string, tucked: boolean, dark: boolean}} Tonight's bedtime, or a fresh one. */
function bedtime() {
  var night = L.nightOf(petNow()), saved = null;
  try { saved = JSON.parse(localStorage.getItem(BED_KEY)); } catch (e) { /* storage blocked */ }
  return saved && saved.night === night ? saved : { night: night, tucked: false, dark: false };
}
/** @param {{night: string, tucked: boolean, dark: boolean}} bed */
function saveBedtime(bed) {
  try { localStorage.setItem(BED_KEY, JSON.stringify(bed)); } catch (e) { /* storage blocked */ }
}
/** Shows the lamp, blanket and dark room for the time and the list; wakes a tucked-in pet when it should be up. */
function refreshBedtime() {
  var asleep = baseState() === 'sleepy', bed = bedtime();
  var wasTucked = pet.classList.contains('tucked');
  stage.classList.toggle('bedtime', asleep);
  moonLamp.hidden = !asleep;
  pet.classList.toggle('tucked', asleep && bed.tucked);
  stage.classList.toggle('lights-off', asleep && bed.dark);
  moonLamp.setAttribute('aria-pressed', asleep && bed.dark ? 'false' : 'true');
  // morning, or something was added to the list: up it gets, with a stretch
  if (wasTucked && !asleep && !busy) {
    setFace(FACES.wake);
    pulse('stretch', 1000);
    if (L.isNight(petNow())) talk('tuckWakeList', ['*yawn* shopping?', 'huh? a snack?'], 1500);
    else talk('tuckMorning', ['good morning!', 'slept so well!', '*yaaawn* morning!'], 1500);
    setTimeout(function () { if (!busy) settle(); }, 1200);
  }
}
/** Switches the lamp. */
function setLamp(dark) {
  var bed = bedtime();
  bed.dark = dark;
  saveBedtime(bed);
  sound(dark ? 'off' : 'on');
  refreshBedtime();
}
/** Tucks the sleeping pet in: the blanket comes up, a sleepy "night night", then the lamp goes off. */
function tuckIn() {
  var bed = bedtime();
  bed.tucked = true;
  saveBedtime(bed);
  tucking = true;
  busy++;
  stopWalk();
  if (walkX) walkTo(0);
  setFace({ eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['cheeks'] });
  pet.classList.add('tucked');
  pulse('pat', 1300);
  sound('tuck');
  drift(['♡', '✦', '♡'], petTop(), 3);
  talk('tuckIn', ['night night ♡', 'so cozy…', 'sweet dreams~', 'snug as a bug'], 1700);
  setTimeout(function () {
    if (!bedtime().dark) setLamp(true);
    tucking = false;
    busy--;
    if (!busy) settle();
  }, 2000);
}
// a tap on the sleeping pet tucks it in; once it is tucked in, it only mumbles
pet.addEventListener('click', function (e) {
  if (baseState() !== 'sleepy' || busy) return;
  e.stopImmediatePropagation();
  if (!bedtime().tucked) { tuckIn(); return; }
  pulse('rocksmall', 1300);
  talk('tuckedTap', ['five more minutes…', 'mmm… cozy…', 'zzz… snacks…'], 1400);
}, true);
moonLamp.addEventListener('click', function (e) {
  e.stopPropagation();
  if (tucking) return;
  setLamp(!bedtime().dark);
  if (!busy) talk(bedtime().dark ? 'lampOff' : 'lampOn', bedtime().dark ? ['zzz…'] : ['mm… bright…', '*squint*'], 1200);
});
refreshBedtime();
