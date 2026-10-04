// Bedtime: at night, once nothing is left to buy, a pendant lamp hangs above the pet (lighting up the room, and
// swinging now and then until it is off) and its cushion becomes a bed. The pet is awake and tired until you put it
// to bed: tug the lamp cord down to switch the light off and tap the pet to tuck it in, in either order. Then it falls
// asleep (pet.dozing) and snores until something is checked off or the morning. Kept on this device only.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var BED_KEY = 'nibble-bedtime', lampEl = $('lamp'), tucking = false;
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
var bedtimeKnown = false, wasAsleep = false;
/** @returns {boolean} True when it is bedtime: night, and nothing left to buy (or already asleep). */
function bedtimeNow() { return L.isNight(petNow()) && (baseState() === 'sleepy' || nothingLeft()); }
/**
 * Shows the lamp, bed, quilt and dark room for the time and the list, and the tired eyes when it's up at night.
 * Bedtime starts fresh (lamp on, not tucked in) each time it begins or the pet wakes while the app is open,
 * so after a late shop you switch the lamp off and tuck it in again. Opening the app keeps tonight's.
 */
function refreshBedtime() {
  var asleep = baseState() === 'sleepy', night = L.isNight(petNow()), bedNow = bedtimeNow();
  var wasBed = stage.classList.contains('bedtime');
  if (bedtimeKnown && (bedNow !== wasBed || (wasAsleep && !asleep))) {
    try { localStorage.removeItem(BED_KEY); } catch (e) { /* storage blocked */ }
    // bedtime is over (morning, or the dev switch to day): it is up, and must be put to bed again tonight
    if (!bedNow && state.pet.dozing) { state.pet.dozing = ''; save(); asleep = false; }
  }
  bedtimeKnown = true;
  wasAsleep = asleep;
  var bed = bedtime();
  var wasTucked = pet.classList.contains('tucked');
  if (bedNow && !wasBed) owlSoon(true);
  stage.classList.toggle('bedtime', bedNow);
  lampEl.hidden = !bedNow;
  pet.classList.toggle('tucked', bedNow && bed.tucked);
  stage.classList.toggle('lights-off', bedNow && bed.dark);
  lampEl.setAttribute('aria-pressed', bedNow && bed.dark ? 'false' : 'true');
  pet.classList.toggle('tired', night && !asleep);
  // the lamp is off and it is tucked in: off to sleep
  if (bedNow && !asleep && bed.tucked && bed.dark && !busy) fallAsleep();
  bedSoon();
  // morning: up it gets, with a stretch (at night only a snack wakes it: wakeForSnack)
  if (wasTucked && !bedNow && !night && !busy) {
    setFace(FACES.wake);
    pulse('stretch', 1000);
    talk('tuckMorning', ['good morning!', 'slept so well!', '*yaaawn* morning!'], 1500);
    setTimeout(function () { if (!busy) settle(); }, 1200);
  }
}
/** Lamp off and tucked in: its eyes close and it drifts off. */
function fallAsleep() {
  state.pet.dozing = L.nightOf(petNow());
  wasAsleep = true;
  save();
  busy++;
  setFace({ eyes: 'closed', mouth: 'smile', arms: 'rest', x: ['cheeks'] });
  pulse('sit', 2600);
  talk('fallAsleep', ['night night…', 'g\'night ♡', 'sleepy… zzz'], 1500);
  setTimeout(function () {
    busy--;
    if (!busy) settle();
    updateEmptyHint();
    bedSoon();
  }, 1700);
}
/**
 * Checking something off wakes a sleeping pet: a quick start, a stretch and a yawn before it eats.
 * @returns {number} How long the wake-up takes, in ms (the eating waits for it).
 */
function wakeForSnack() {
  setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: [] });
  eyesDo('wide');
  pulse('stretch', 700);
  sound('yawn');
  talk('snackWake', ['huh? a snack?!', '*yawn* food?', 'mm? I\'m up!'], 1100);
  return 750;
}
/** Switches the lamp. */
function setLamp(dark) {
  var bed = bedtime();
  bed.dark = dark;
  saveBedtime(bed);
  sound('click');
  refreshBedtime();
}
/** Tucks the pet in: the quilt comes up; it asks for the lamp if it is still on, or falls asleep if it is off. */
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
    // still bright: it asks for the lamp (which keeps swinging until it is off); dark: it falls asleep
    if (!bedtime().dark && !busy) talk('lampPlease', ['lamp off please…', 'too bright…'], 1500);
    refreshBedtime();
  }, 2000);
}
// at bedtime a tap tucks it in; tucked in, it asks for the lamp, and asleep it only mumbles
pet.addEventListener('click', function (e) {
  if (!stage.classList.contains('bedtime') || busy) return;
  e.stopImmediatePropagation();
  if (baseState() === 'sleepy') {
    pulse('rocksmall', 1300);
    talk('tuckedTap', ['five more minutes…', 'mmm… cozy…', 'zzz… snacks…'], 1400);
  } else if (!bedtime().tucked) tuckIn();
  else talk('lampPlease', ['lamp off please…', 'too bright…'], 1400);
}, true);
// the lamp is switched by tugging it down, like a pull cord: it follows the finger and springs back
var PULL_PX = 22, pullFrom = null, pulled = 0;
lampEl.addEventListener('pointerdown', function (e) {
  if (tucking) return;
  pullFrom = e.clientY;
  pulled = 0;
  lampEl.classList.add('pulling');
  try { lampEl.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
});
lampEl.addEventListener('pointermove', function (e) {
  if (pullFrom == null) return;
  pulled = Math.max(0, Math.min(36, e.clientY - pullFrom));
  lampEl.style.setProperty('--pull', Math.round(pulled * 0.8));
});
function letGo() {
  if (pullFrom == null) return;
  pullFrom = null;
  lampEl.classList.remove('pulling');
  lampEl.style.removeProperty('--pull'); // springs back up
  if (pulled >= PULL_PX) pullLamp();
  else {
    // only a tap: the cord gives a little dip, a hint to pull it
    lampEl.querySelector('.lamp-bead').animate([{ translate: '0 0' }, { translate: '0 7px' }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
  }
}
lampEl.addEventListener('pointerup', letGo);
lampEl.addEventListener('pointercancel', letGo);
// a keyboard press (Enter or Space) switches it too
lampEl.addEventListener('click', function (e) {
  e.stopPropagation();
  if (e.detail === 0 && !tucking) pullLamp();
});
/** Switches the lamp after a tug: asleep, the light makes it grumpy; awake in the dark, it asks to be tucked in. */
function pullLamp() {
  var dark = !bedtime().dark;
  setLamp(dark);
  if (busy) return;
  if (baseState() === 'sleepy') { if (!dark) grumpy(); }
  else if (dark && !bedtime().tucked) setTimeout(bedHint, 1100);
}
/** The light comes back on while it sleeps: a grumpy squint at you, then back to sleep. */
function grumpy() {
  busy++;
  setFace({ eyes: 'squint', mouth: 'wavy', arms: 'idle', x: [] });
  eyesDo('squint');
  pulse('rocksmall', 1300);
  talk('lampGrumpy', ['hey… too bright…', 'hmph!', '*grumble grumble*', 'I was sleeping…'], 1600);
  setTimeout(function () { busy--; if (!busy) settle(); }, 1800);
}

// ---------- in bed: snoring, and mumbling to be tucked in ----------
var bedTimer;
/** Plans the next snore (asleep) or sleepy hint (bedtime, not put to bed yet). */
function bedSoon() {
  clearTimeout(bedTimer);
  if (!stage.classList.contains('bedtime')) return;
  var asleep = baseState() === 'sleepy';
  bedTimer = setTimeout(function () {
    bedSoon();
    if (busy || dreaming || document.hidden || document.querySelector('dialog[open]')) return;
    if (baseState() === 'sleepy') snore(); else bedHint();
  }, asleep ? 2400 + Math.random() * 1000 : 11000 + Math.random() * 6000);
}
// night sounds while it sleeps: crickets now and then, and an owl hooting outside
var owlTimer, cricketTimer;
/** @returns {boolean} True when night sounds may play: asleep, on screen, no menu open. */
function nightSounds() { return stage.classList.contains('bedtime') && !document.hidden && !document.querySelector('dialog[open]'); }
function owlSoon(first) {
  clearTimeout(owlTimer);
  owlTimer = setTimeout(function () {
    owlSoon();
    if (nightSounds()) sound('owl');
  }, first ? 5000 + Math.random() * 5000 : 15000 + Math.random() * 15000);
}
function cricketsSoon() {
  clearTimeout(cricketTimer);
  cricketTimer = setTimeout(function () {
    cricketsSoon();
    if (nightSounds()) sound('crickets');
  }, 3500 + Math.random() * 4500);
}
owlSoon(true);
cricketsSoon();
/** Up at bedtime: a sleepy hint at what's still needed (the lamp off, the quilt). */
function bedHint() {
  if (busy || baseState() === 'sleepy' || !stage.classList.contains('bedtime')) return;
  var bed = bedtime();
  setFace({ eyes: 'closed', mouth: 'o', arms: 'idle', x: [] });
  pulse('rocksmall', 1300);
  if (!bed.dark && !bed.tucked) talk('bedHint', ['so sleepy… bedtime?', '*yawn* lights off?', 'sleepy…'], 1800);
  else if (!bed.tucked) talk('tuckMumble', ['tuck me in…?', 'blankie…?', 'cold toes…'], 1800);
  else talk('lampPlease', ['lamp off please…', 'too bright…'], 1800);
  setTimeout(function () { if (!busy) settle(); }, 1400);
}
/** One snore: a sound, a slow breath and a few z's. */
function snore() {
  sound(Math.random() < 0.3 ? 'snorebig' : 'snore');
  if (!reduceMotion && !squishing) svgSquish(SQUISH.breath);
  drift(['z', 'Z', 'z'], petTop(), 2);
}
refreshBedtime();
