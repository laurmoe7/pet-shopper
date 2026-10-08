// Night play: things to do with him while he sleeps in his bed (none of them wakes him): a lullaby when you rest the pointer on him,
// swapping his teddy (take it, give it back), and a night light. Plain script, shares one scope, loaded after app-bedtime.js.
'use strict';

/** @returns {boolean} Whether he is lying in his bed right now (the bed is out and he is on it: not up and about at night, not away from it). */
function inBed() { return stage.classList.contains('bedtime') && Math.abs(typeof walkX === 'number' ? walkX : 0) < 24 && !pet.classList.contains('walking') && !pet.classList.contains('running'); }
/** @returns {boolean} Whether he is asleep in his bed right now. */
function inBedAsleep() { return inBed() && baseState() === 'sleepy'; }

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
  var bed = stage.classList.contains('bedtime');   // (the switch belongs to the room: it is there whenever the bed is out)
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

// ---------- the desktop pet's five scenes ----------
// day, day with the clipboard, night in bed, night drowsy (up from shopping, or woken by the bell), night drowsy with the clipboard.
// Everything he does on the desktop has to work in each of them; petScene() says which one he is in (html[data-scene] shows it too).
/** @returns {string} The scene: 'day', 'day-clip', 'night-bed', 'night-drowsy' or 'night-drowsy-clip' (see L.deskScene). */
function petScene() { return L.deskScene({ night: L.isNight(petNow()), bed: stage.classList.contains('bedtime'), todo: isTodo() }); }

// ---------- the night bell: in his bed the toy is put away and a little bell sits there instead ----------
// Pick it up and shake it: the first ring stirs him, the next wakes him (drowsy, up out of bed) for the rest of the night. Throw it and it
// breaks, and he goes back to bed. A new bell turns up a little later.
var BELL_KEY = 'nibble-bell-awake';
var bellBroken = false;
/** @returns {boolean} Whether the bell woke him tonight and he is still up (until the morning, or the bell breaks). */
function bellAwake() { try { return localStorage.getItem(BELL_KEY) === L.nightOf(petNow()); } catch (e) { return false; } }
function setBellAwake(on) { try { if (on) localStorage.setItem(BELL_KEY, L.nightOf(petNow())); else localStorage.removeItem(BELL_KEY); } catch (e) { /* storage blocked */ } }
var bell = document.createElement('button');
bell.type = 'button'; bell.className = 'bell'; bell.hidden = true; bell.setAttribute('aria-label', 'Bell');
var bellImg = emojiImg('🔔', ''); bellImg.className = 'bell-img';
bell.appendChild(bellImg);
stage.appendChild(bell);
var bellX = -138, bellY = 0, bellHeld = null, bellFlight = 0, bellRings = 0, bellRingTimer = 0;
/** @returns {boolean} Whether the bell is out: in the small desktop window, at night, while he is in bed or was woken by it. */
function bellOut() { return document.documentElement.classList.contains('desktop-pet') && L.isNight(petNow()) && !bellBroken && (stage.classList.contains('bedtime') || bellAwake()); }
function placeBell() { bell.style.translate = Math.round(bellX) + 'px 0'; bellImg.style.transform = 'translateY(' + (-bellY).toFixed(1) + 'px)'; }
function showScene() {
  document.documentElement.dataset.scene = petScene();
  var out = bellOut();
  if (out && bell.hidden) { bell.hidden = false; placeBell(); bell.classList.remove('pop'); void bell.offsetWidth; bell.classList.add('pop'); }
  else if (!out && !bellHeld) bell.hidden = true;
  stage.classList.toggle('bell-mode', out);   // (the bell takes the toy's place)
}
new MutationObserver(showScene).observe(stage, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(showScene).observe(document.documentElement, { attributes: true, attributeFilter: ['data-list', 'class'] });
setInterval(showScene, 30000);
showScene();

function bellRing() {
  sound('bell');
  bell.classList.remove('ringing'); void bell.offsetWidth; bell.classList.add('ringing');
  clearTimeout(bellRingTimer); bellRingTimer = setTimeout(function () { bellRings = 0; }, 7000);
  bellRings++;
  if (petScene() !== 'night-bed') { if (!busy) say(pick(['ding!', 'ding ding~', 'tinkle~']), 900); return; }
  if (bellRings < 2) {   // the first ring only stirs him
    if (!squishing && !reduceMotion) svgSquish(SQUISH.breath);
    say(pick(['mm…?', 'huh… mm…', '…ding…?']), 1400);
    return;
  }
  // the second one wakes him: up out of bed, drowsy, until morning (or until the bell breaks)
  bellRings = 0;
  setBellAwake(true);
  refreshBedtime();
  setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: ['sweat'] });
  eyesDo('wide');
  pulse('hop', 450);
  say(pick(['wha—? who rang?', 'mm?! I\'m up…', 'ding…? I\'m awake…']), 2200);
  setTimeout(function () { if (!busy) settle(); }, 1800);
  showScene();
}
function bellBreak() {
  cancelAnimationFrame(bellFlight);
  var r = bell.getBoundingClientRect(), at = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  bell.hidden = true; bellBroken = true; bellY = 0;
  sound('smash');
  drift(['✦', '✧', '·', '✦'], at, 6);
  var wasUp = petScene() !== 'night-bed';
  setBellAwake(false);
  refreshBedtime();   // back to bed (the small window has no lamp, so he is tucked in as well)
  var bed = bedtime(); bed.dark = true; bed.tucked = true; saveBedtime(bed);
  refreshBedtime();
  say(wasUp ? pick(['oh… so sleepy… night night', '…bed…', 'mm… back to bed…']) : pick(['mm…', '…zzz…']), 2000);
  showScene();
  setTimeout(function () { bellBroken = false; bellX = -138; bellY = 0; showScene(); }, 45000);   // a new one turns up
}
/** The bell flies on its own after a throw (or just drops when let go gently): gravity, a bounce off the sides; a throw breaks it on the first hit. */
function bellFly(vx, vy, thrown) {
  var lim = stage.clientWidth / 2 - 20, last = performance.now(), t0 = last;
  cancelAnimationFrame(bellFlight);
  (function step(now) {
    var dt = Math.min(0.033, (now - last) / 1000); last = now;
    vy -= 1800 * dt; bellX += vx * dt; bellY += vy * dt;
    var hit = false;
    if (bellX < -lim) { bellX = -lim; vx = Math.abs(vx) * 0.6; hit = true; }
    if (bellX > lim) { bellX = lim; vx = -Math.abs(vx) * 0.6; hit = true; }
    if (bellY < 0) { bellY = 0; vy = -vy * 0.35; vx *= 0.7; hit = true; if (Math.abs(vy) < 80) vy = 0; }
    placeBell();
    if (hit && thrown && now - t0 > 90) { bellBreak(); return; }
    if (bellY === 0 && vy === 0 && Math.abs(vx) < 8) return;
    bellFlight = requestAnimationFrame(step);
  })(last);
}
bell.addEventListener('pointerdown', function (e) {
  if (e.button !== 0 || !bellOut()) return;
  e.preventDefault(); e.stopPropagation();
  try { bell.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
  cancelAnimationFrame(bellFlight);
  bellHeld = { pts: [], dir: 0, ext: e.clientX, turns: [] };
  bell.classList.add('held');
});
bell.addEventListener('pointermove', function (e) {
  if (!bellHeld) return;
  var s = stage.getBoundingClientRect(), lim = s.width / 2 - 20, now = performance.now();
  bellX = Math.max(-lim, Math.min(lim, e.clientX - (s.left + s.width / 2)));
  bellY = Math.max(0, Math.min(s.height - 44, s.bottom - 19 - e.clientY));
  placeBell();
  var h = bellHeld;
  h.pts.push({ t: now, x: bellX, y: bellY });
  while (h.pts.length > 2 && now - h.pts[0].t > 120) h.pts.shift();
  // shaking: it counts when he moves it back and forth, a good way each time
  var x = e.clientX;
  function turn() { h.turns.push(now); h.turns = h.turns.filter(function (t) { return now - t < 1100; }); if (h.turns.length >= 4) { h.turns = []; bellRing(); } }
  if (h.dir === 0) { if (Math.abs(x - h.ext) > 14) { h.dir = x > h.ext ? 1 : -1; h.ext = x; } }
  else if (h.dir === 1) { if (x > h.ext) h.ext = x; else if (h.ext - x > 14) { h.dir = -1; h.ext = x; turn(); } }
  else { if (x < h.ext) h.ext = x; else if (x - h.ext > 14) { h.dir = 1; h.ext = x; turn(); } }
});
function bellLetGo() {
  if (!bellHeld) return;
  var h = bellHeld, a = h.pts[0], b = h.pts[h.pts.length - 1];
  bellHeld = null; bell.classList.remove('held');
  var sec = a && b && b.t > a.t ? (b.t - a.t) / 1000 : 0, vx = sec ? (b.x - a.x) / sec : 0, vy = sec ? (b.y - a.y) / sec : 0;
  var thrown = Math.hypot(vx, vy) > 700;
  bellFly(thrown ? vx : 0, thrown ? vy : 0, thrown);
}
bell.addEventListener('pointerup', bellLetGo);
bell.addEventListener('pointercancel', bellLetGo);
