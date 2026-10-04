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
// the teddy bear: sits in the bed beside the pet at bedtime, and once asleep the pet holds it under its paw
var TEDDY = '<circle class="teddy-fur" cx="9" cy="8" r="5"/><circle class="teddy-in" cx="9" cy="8" r="2.4"/>' +
  '<circle class="teddy-fur" cx="31" cy="8" r="5"/><circle class="teddy-in" cx="31" cy="8" r="2.4"/>' +
  '<ellipse class="teddy-fur" cx="20" cy="32" rx="12" ry="10"/><ellipse class="teddy-in" cx="20" cy="34" rx="6.5" ry="5.5"/>' +
  '<ellipse class="teddy-fur" cx="12" cy="41" rx="4.6" ry="3"/><ellipse class="teddy-fur" cx="28" cy="41" rx="4.6" ry="3"/>' +
  '<circle class="teddy-fur" cx="20" cy="16" r="11"/><ellipse class="teddy-muzzle" cx="20" cy="20" rx="5" ry="3.8"/>' +
  '<ellipse class="teddy-nose" cx="20" cy="18.6" rx="1.8" ry="1.3"/><path class="teddy-line" d="M20 19.8 v1.4 M18.2 21.6 q1.8 1.3 3.6 0"/>' +
  '<circle class="teddy-eye" cx="14.8" cy="14.6" r="1.4"/><circle class="teddy-eye" cx="25.2" cy="14.6" r="1.4"/>' +
  '<circle class="teddy-blush" cx="12.6" cy="19" r="1.7"/><circle class="teddy-blush" cx="27.4" cy="19" r="1.7"/>' +
  '<path class="teddy-bow" d="M20 27 l-5.4 -3.2 v6.4 z M20 27 l5.4 -3.2 v6.4 z"/><circle class="teddy-bow" cx="20" cy="27" r="1.7"/>';
pet.querySelector('.teddy-hug').innerHTML = TEDDY;

var bedtimeKnown = false, wasAsleep = false;
/** @returns {boolean} True when it is bedtime by the clock and the list: night, unless you are in the middle of shopping (items waiting on the list or tasks don't keep it up). */
function bedtimeNow() { return L.isNight(petNow()) && (baseState() === 'sleepy' || !shoppingNow()); }
/**
 * Shows the lamp, bed, quilt and dark room for the time and the list, and the tired eyes when it's up at night.
 * Bedtime starts fresh (lamp on, not tucked in) each time it begins or the pet wakes while the app is open,
 * so after a late shop you switch the lamp off and tuck it in again. Opening the app keeps tonight's.
 */
function refreshBedtime() {
  // being asleep (pet.dozing) only carries on within a bedtime: one already showing, or tonight's on reopening the
  // app at night. Otherwise it is left over (from a dev-tool night, say) and must not put the pet to sleep.
  if (state.pet.dozing && !(bedtimeKnown ? stage.classList.contains('bedtime') : L.isNight(petNow()))) {
    state.pet.dozing = '';
    save();
    if (!busy) settle();
  }
  // The lamp hangs all night. The bed scene (bed, quilt, teddy) comes with bedtime, or when you switch the lamp off
  // while shopping: then it gets into bed so you can tuck it in.
  var asleep = baseState() === 'sleepy', night = L.isNight(petNow()), base = bedtimeNow();
  var bedNow = base || (night && bedtime().dark);
  var wasBed = stage.classList.contains('bedtime');
  if (bedtimeKnown && ((bedNow && !wasBed && base) || (!bedNow && wasBed) || (wasAsleep && !asleep))) {
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
  lampEl.hidden = !night;
  stage.classList.toggle('night-lamp', night && !bedNow);   // lit lamp, but still shopping: no bed yet
  pet.classList.toggle('tucked', bedNow && bed.tucked);
  stage.classList.toggle('lights-off', bedNow && bed.dark);
  lampEl.setAttribute('aria-pressed', bedNow && bed.dark ? 'false' : 'true');
  pet.classList.toggle('tired', night && !asleep);
  pet.classList.toggle('has-teddy', bedNow);
  if (!grabbing) pet.classList.toggle('hugging', bedNow && asleep && bed.tucked);
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
/** Lamp off and tucked in: it reaches out for its teddy, pulls it in under its paw, and drifts off. */
var grabbing = false;
function fallAsleep() {
  state.pet.dozing = L.nightOf(petNow());
  wasAsleep = true;
  save();
  busy++;
  grabbing = true;
  setFace({ eyes: 'open', mouth: 'smile', arms: 'grab', x: ['cheeks'] }); // the paw reaches out to the teddy
  talk('teddyGrab', ['teddy…', 'my teddy ♡', 'cuddle time…'], 1200);
  var reach = reduceMotion ? 0 : 700;
  setTimeout(function () {
    // paw and teddy come back together (same timing in styles.css)
    pet.dataset.arms = 'rest';
    pet.classList.add('hugging');
  }, reach);
  setTimeout(function () {
    grabbing = false;
    setFace({ eyes: 'closed', mouth: 'smile', arms: 'rest', x: ['cheeks'] });
    pulse('sit', 2600);
    talk('fallAsleep', ['night night…', 'g\'night ♡', 'sleepy… zzz'], 1500);
  }, reach + 700);
  setTimeout(function () {
    busy--;
    if (!busy) settle();
    updateEmptyHint();
    bedSoon();
  }, reach + 2400);
}
/**
 * Checking something off wakes a sleeping pet: a quick start, a stretch and a yawn before it eats.
 * @returns {number} How long the wake-up takes, in ms (the eating waits for it).
 */
function wakeForSnack() {
  pet.classList.add('tired'); // it eats happy but tired (settle puts it right afterwards)
  setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: [] });
  eyesDo('wide');
  pulse('stretch', 700);
  sound('yawn');
  talk('snackWake', isTodo() ? ['oh! something done? yay!', '*yawn* nice work!', 'mm? you did it! ♡'] : ['huh? a snack?!', '*yawn* food?', 'mm? I\'m up!'], 1100);
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
// at bedtime a tap tucks it in; tucked in, it asks for the lamp, and asleep it gets a goodnight kiss
pet.addEventListener('click', function (e) {
  if (!stage.classList.contains('bedtime') || busy) return;
  e.stopImmediatePropagation();
  if (baseState() === 'sleepy') kissGoodnight();
  else if (!bedtime().tucked) tuckIn();
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
// a kiss mark (a little pair of pink lips) for the goodnight kiss
var KISS_SVG = '<svg viewBox="0 0 24 18" aria-hidden="true"><path class="kiss-top" d="M2 8.6 Q5.4 2.2 9.2 4.4 Q12 6 14.8 4.4 Q18.6 2.2 22 8.6 Q12 7.4 2 8.6 Z"/>' +
  '<path class="kiss-bottom" d="M2 9.4 Q12 8.4 22 9.4 Q19 16.4 12 16.4 Q5 16.4 2 9.4 Z"/><path class="kiss-shine" d="M6 12 Q8 14 11 14.4"/></svg>';
/** Asleep, a tap or a stroke gets a goodnight kiss: a smooch, a kiss mark on its forehead, a sleepy smile and a blush. */
function kissGoodnight() {
  if (busy) return;
  busy++;
  sound('kiss');
  buzz(8);
  setFace({ eyes: 'closed', mouth: 'smile', arms: 'rest', x: ['cheeks'] });
  if (!reduceMotion && !squishing) svgSquish(SQUISH.breath);
  var svg = pet.querySelector('.pet-svg'), m = svg && svg.getScreenCTM();
  if (m && !reduceMotion) {
    var pt = svg.createSVGPoint();
    pt.x = 106; pt.y = 76; // on its forehead, above the quilt
    pt = pt.matrixTransform(m);
    var el = document.createElement('span');
    el.className = 'kiss-mark';
    el.innerHTML = KISS_SVG;
    el.style.left = pt.x + 'px';
    el.style.top = pt.y + 'px';
    document.body.appendChild(el);
    el.animate([
      { transform: 'translate(-50%, -50%) rotate(-14deg) scale(0)', opacity: 0 },
      { transform: 'translate(-50%, -50%) rotate(-14deg) scale(1.35)', opacity: 1, offset: 0.12 },
      { transform: 'translate(-50%, -50%) rotate(-14deg) scale(1)', opacity: 1, offset: 0.22 },
      { transform: 'translate(-50%, -50%) rotate(-14deg) scale(1)', opacity: 1, offset: 0.75 },
      { transform: 'translate(-50%, -90%) rotate(-14deg) scale(.9)', opacity: 0 }
    ], { duration: 1900, easing: 'ease-out', fill: 'both' }).finished.then(el.remove.bind(el), el.remove.bind(el));
  }
  setTimeout(function () { drift(['♥', '♡', '♥'], petTop(), 3); }, 250);
  talk('kissNight', ['mm… night night ♡', 'hehe… zzz ♡', 'g\'night… love you…', 'sweet dreams… zzz'], 1700);
  setTimeout(function () { busy--; if (!busy) settle(); }, 1900);
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
