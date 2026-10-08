// Night play: things to do with him while he sleeps in his bed (none of them wakes him): a lullaby when you rest the pointer on him,
// swapping his teddy (take it, give it back), and a night light. Plain script, shares one scope, loaded after app-bedtime.js.
'use strict';

/** @returns {boolean} Whether he is asleep in his bed right now. */
function inBedAsleep() { return stage.classList.contains('bedtime') && baseState() === 'sleepy'; }

// ---------- 1. the lullaby: rest the pointer on him for a moment and he hums in his sleep ----------
var lullabyTimer = 0, lullabyAt = 0;
function lullaby() {
  if (!inBedAsleep() || busy || Date.now() - lullabyAt < 25000) return;
  lullabyAt = Date.now();
  sound('lullaby');
  var at = petTop();
  drift(['♪', '♫', '♡', '♪'], at, 4);
  setTimeout(function () { drift(['♫', '♪', '♡'], petTop(), 3); }, 1500);
  pet.classList.add('x-hearts');
  setTimeout(function () { pet.classList.remove('x-hearts'); }, 3200);
  if (!reduceMotion && !squishing) svgSquish(SQUISH.breath);
  say(pick(['mm… la la…', 'hmm… ♪', 'mmm… ♡']), 2000);
}
pet.addEventListener('pointerenter', function (e) {
  if (e.pointerType === 'touch') return;
  clearTimeout(lullabyTimer);
  lullabyTimer = setTimeout(lullaby, 2200);
});
pet.addEventListener('pointerleave', function () { clearTimeout(lullabyTimer); });
pet.addEventListener('pointerdown', function () { clearTimeout(lullabyTimer); });

// ---------- 4. swapping his teddy: pick it up, and he reaches for it; put it back near him and he hugs it tighter ----------
var teddyBtn = document.createElement('button');
teddyBtn.type = 'button'; teddyBtn.className = 'teddy-btn'; teddyBtn.hidden = true; teddyBtn.setAttribute('aria-label', 'Teddy');
stage.appendChild(teddyBtn);
var teddyDrag = null, teddyFloat = null;
/** Keeps the (invisible) button over the teddy while he sleeps. */
function placeTeddyBtn() {
  var t = pet.querySelector('.teddy-hug');
  if (teddyDrag || !t || !inBedAsleep() || !pet.classList.contains('hugging')) { if (!teddyDrag) teddyBtn.hidden = true; return; }
  var r = t.getBoundingClientRect(), s = stage.getBoundingClientRect();
  if (r.width < 4) { teddyBtn.hidden = true; return; }
  teddyBtn.style.left = (r.left - s.left - 4) + 'px'; teddyBtn.style.top = (r.top - s.top - 4) + 'px';
  teddyBtn.style.width = (r.width + 8) + 'px'; teddyBtn.style.height = (r.height + 8) + 'px';
  teddyBtn.hidden = false;
}
setInterval(placeTeddyBtn, 600);
function teddyBack(near) {
  if (!teddyDrag) return;
  var f = teddyFloat, to = petTop();
  teddyDrag = null; teddyFloat = null;
  function done() {
    if (f) f.remove();
    pet.classList.remove('teddy-taken');
    grabbing = false;
    pet.classList.add('hugging');
    sound('squeak');
    drift(['♡', '♥', '♡'], petTop(), 3);
    if (!reduceMotion && !squishing) svgSquish(SQUISH.nod);
    say(near ? pick(['mmm… teddy ♡', 'there you are…', '…teddy ♡']) : pick(['teddy… ♡', 'oh… you came back…']), 1800);
    setTimeout(placeTeddyBtn, 700);
  }
  if (!f || near || reduceMotion) { done(); return; }
  f.style.transition = 'left .5s ease-in, top .5s ease-in';
  f.style.left = (to.x - 22) + 'px'; f.style.top = (to.y + 20) + 'px';
  setTimeout(done, 520);
}
teddyBtn.addEventListener('pointerdown', function (e) {
  if (!inBedAsleep() || e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  try { teddyBtn.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
  teddyDrag = { id: e.pointerId, away: false };
  grabbing = true;   // (refreshBedtime leaves his paw alone)
  pet.classList.remove('hugging');
  pet.classList.add('teddy-taken');
  teddyFloat = document.createElement('img');
  teddyFloat.src = Foods.emojiFile('🧸'); teddyFloat.alt = ''; teddyFloat.className = 'teddy-float'; teddyFloat.draggable = false;
  teddyFloat.style.left = (e.clientX - 22) + 'px'; teddyFloat.style.top = (e.clientY - 22) + 'px';
  document.body.appendChild(teddyFloat);
  setFace({ eyes: 'closed', mouth: 'o', arms: 'reach', x: ['zzz'] });
  say(pick(['hey… teddy?', 'mm? …teddy…', 'where… teddy…']), 1800);
  sound('tap');
  // if he is left without it too long, it comes back by itself
  teddyDrag.timer = setTimeout(function () { if (teddyDrag) teddyBack(false); }, 9000);
});
teddyBtn.addEventListener('pointermove', function (e) {
  if (!teddyDrag || !teddyFloat) return;
  teddyFloat.style.left = (e.clientX - 22) + 'px'; teddyFloat.style.top = (e.clientY - 22) + 'px';
});
function teddyLetGo(e) {
  if (!teddyDrag) return;
  clearTimeout(teddyDrag.timer);
  var r = pet.getBoundingClientRect(), near = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < Math.max(70, r.width * 0.6);
  teddyBack(near);
}
teddyBtn.addEventListener('pointerup', teddyLetGo);
teddyBtn.addEventListener('pointercancel', teddyLetGo);

// ---------- 5. the night light: a little switch in the corner of his room; a warm glow, and he sleeps softer ----------
var NIGHT_LIGHT_KEY = 'nibble-nightlight';
var nightBtn = document.createElement('button');
nightBtn.type = 'button'; nightBtn.className = 'night-btn'; nightBtn.hidden = true;
nightBtn.appendChild(emojiImg('🌙', ''));
var nightGlow = document.createElement('div');
nightGlow.className = 'night-glow'; nightGlow.setAttribute('aria-hidden', 'true');
stage.append(nightGlow, nightBtn);
var nightLightOn = false;
try { nightLightOn = localStorage.getItem(NIGHT_LIGHT_KEY) === '1'; } catch (e) { /* storage blocked */ }
function showNightLight() {
  var bed = stage.classList.contains('bedtime');
  nightBtn.hidden = !bed;
  nightBtn.setAttribute('aria-pressed', nightLightOn ? 'true' : 'false');
  nightBtn.setAttribute('aria-label', 'Night light');
  stage.classList.toggle('night-light', bed && nightLightOn);
}
nightBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  nightLightOn = !nightLightOn;
  try { localStorage.setItem(NIGHT_LIGHT_KEY, nightLightOn ? '1' : '0'); } catch (err) { /* storage blocked */ }
  sound(nightLightOn ? 'on' : 'off');
  showNightLight();
  if (nightLightOn && inBedAsleep()) { say('mm… warm… ♡', 1800); drift(['✦', '♡', '✦'], petTop(), 3); }
});
new MutationObserver(showNightLight).observe(stage, { attributes: true, attributeFilter: ['class'] });
showNightLight();
