// Bedtime: at night a moon lamp hangs above the pet and swings now and then until it is off. Tug it down to switch
// it off (or on); in the dark the pet mumbles to be tucked in, and a tap tucks it under a blanket, where it snores.
// It lasts until morning (or until the list needs shopping). Kept on this device only.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
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
  bedSoon();
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
    tucking = false;
    busy--;
    if (!busy) settle();
    // still bright: it asks for the lamp (which keeps swinging until it is off)
    if (!bedtime().dark && !busy) talk('lampPlease', ['lamp off please…', 'too bright…'], 1500);
    bedSoon();
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
// the lamp is switched by tugging it down, like a pull cord: it follows the finger and springs back
var PULL_PX = 22, pullFrom = null, pulled = 0;
moonLamp.addEventListener('pointerdown', function (e) {
  if (tucking) return;
  pullFrom = e.clientY;
  pulled = 0;
  moonLamp.classList.add('pulling');
  try { moonLamp.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
});
moonLamp.addEventListener('pointermove', function (e) {
  if (pullFrom == null) return;
  pulled = Math.max(0, Math.min(40, e.clientY - pullFrom));
  moonLamp.style.setProperty('--pull', Math.round(pulled * 0.8));
});
function letGo() {
  if (pullFrom == null) return;
  pullFrom = null;
  moonLamp.classList.remove('pulling');
  moonLamp.style.removeProperty('--pull'); // springs back up
  if (pulled >= PULL_PX) pullLamp();
  else {
    // only a tap: it bobs, a hint to pull it
    moonLamp.animate([{ translate: '0 0' }, { translate: '0 5px' }, { translate: '0 0' }], { duration: 350, easing: 'ease-out' });
    sound('tap');
  }
}
moonLamp.addEventListener('pointerup', letGo);
moonLamp.addEventListener('pointercancel', letGo);
// a keyboard press (Enter or Space) switches it too
moonLamp.addEventListener('click', function (e) {
  e.stopPropagation();
  if (e.detail === 0 && !tucking) pullLamp();
});
/** Switches the lamp after a tug; in the dark, an untucked pet asks to be tucked in. */
function pullLamp() {
  var dark = !bedtime().dark;
  setLamp(dark);
  if (busy) return;
  if (!dark) talk('lampOn', ['mm… bright…', '*squint*'], 1200);
  else if (!bedtime().tucked) setTimeout(tuckMumble, 1100);
}

// ---------- in bed: snoring, and mumbling to be tucked in ----------
var bedTimer;
/** Plans the next snore (tucked in) or mumble (dark but not tucked in yet). */
function bedSoon() {
  clearTimeout(bedTimer);
  if (!stage.classList.contains('bedtime')) return;
  var tucked = pet.classList.contains('tucked');
  if (!tucked && !stage.classList.contains('lights-off')) return;
  bedTimer = setTimeout(function () {
    bedSoon();
    if (busy || dreaming || document.hidden || document.querySelector('dialog[open]')) return;
    if (pet.classList.contains('tucked')) snore(); else tuckMumble();
  }, tucked ? 4200 + Math.random() * 1600 : 9000 + Math.random() * 5000);
}
/** A sleepy mumble to be tucked in (sleep-talk, since it is asleep). */
function tuckMumble() {
  if (busy || pet.classList.contains('tucked') || baseState() !== 'sleepy') return;
  pulse('rocksmall', 1300);
  talk('tuckMumble', ['tuck me in…?', 'blankie…', 'cold toes…', 'need my blanket…'], 1800);
}
/** One snore: a sound, a slow breath and a few z's. */
function snore() {
  sound('snore');
  if (!reduceMotion && !squishing) svgSquish(SQUISH.breath);
  drift(['z', 'Z', 'z'], petTop(), 2);
}
refreshBedtime();
