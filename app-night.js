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
    settle();   // (the sleeping face and paw come back: they were left in the reaching pose while the teddy was away)
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
// a little plug-in night light standing by his bed: a cream base with a glass moon on it (it lights up when it is on)
nightBtn.innerHTML = '<svg viewBox="0 0 30 38" width="30" height="38" aria-hidden="true"><rect class="nl-plug" x="11" y="31" width="8" height="7" rx="1.5"/>' +
  '<rect class="nl-base" x="3" y="22" width="24" height="12" rx="5"/><circle class="nl-glass" cx="15" cy="14" r="11"/>' +
  '<path class="nl-moon" d="M17.6 6.6 A8 8 0 1 0 22.4 17.2 A6.4 6.4 0 0 1 17.6 6.6 Z"/><path class="nl-shine" d="M8.6 10.4 Q9.6 7.6 12.2 6.6"/></svg>';
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
/** Switches the night light (the little lamp in the big app, the ring menu in the small desktop window). */
function toggleNightLight() {
  nightLightOn = !nightLightOn;
  try { localStorage.setItem(NIGHT_LIGHT_KEY, nightLightOn ? '1' : '0'); } catch (err) { /* storage blocked */ }
  sound(nightLightOn ? 'on' : 'off');
  showNightLight();
  if (nightLightOn && inBedAsleep()) { say('mm… warm… ♡', 1800); drift(['✦', '♡', '✦'], petTop(), 3); }
}
nightBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleNightLight(); });
new MutationObserver(showNightLight).observe(stage, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(showNightLight).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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
var BELL_AWAKE_MS = 30 * 60000;   // woken by the bell, he stays up (drowsy) for half an hour, then goes back to bed by himself
function bellAwake() { try { var v = (localStorage.getItem(BELL_KEY) || '').split('|'); return v[0] === L.nightOf(petNow()) && Date.now() - (+v[1] || 0) < BELL_AWAKE_MS; } catch (e) { return false; } }
function setBellAwake(on) { try { if (on) localStorage.setItem(BELL_KEY, L.nightOf(petNow()) + '|' + Date.now()); else localStorage.removeItem(BELL_KEY); } catch (e) { /* storage blocked */ } }
var bell = document.createElement('button');
bell.type = 'button'; bell.className = 'bell'; bell.hidden = true; bell.setAttribute('aria-label', 'Bell');
// a brass hand bell with a wooden handle (36 x 48): he is held by the handle, and swings from it
bell.innerHTML = '<span class="bell-img"><svg class="bell-svg" viewBox="0 0 36 48" width="36" height="48" aria-hidden="true">' +
  '<g class="bl-clap"><path class="bl-clap-arm" d="M18 28 V43"/><circle class="bl-clapper" cx="18" cy="46.2" r="3.9"/></g>' +   // (the clapper hangs inside, drawn first so the bell is in front of it, and swings)
  '<rect class="bl-handle" x="14.2" y="1" width="7.6" height="19" rx="3.8"/>' +
  '<path class="bl-body" d="M4 40 C4 28 10 21 18 21 C26 21 32 28 32 40 Z"/>' +
  '<path class="bl-body" d="M2 39.6 H34 L34.2 43.2 Q34.2 44.8 32.4 44.8 L3.6 44.8 Q1.8 44.8 1.8 43.2 Z"/>' +   // (a flat band round the open end)
  '<rect class="bl-collar" x="11.4" y="17.6" width="13.2" height="5.4" rx="2.4"/>' +
  '<path class="bl-shine" d="M9 36 C9 31 11 27.6 14 25.6"/></svg></span>';
var bellImg = bell.querySelector('.bell-img'), bellSvg = bell.querySelector('.bell-svg'), bellClap = bell.querySelector('.bl-clap');
stage.appendChild(bell);
var bellField = null, bellFieldTok = 0;   // while a thrown bell flies over the whole screen (app-desktop.js deskFlyField)
var BELL_W = 36, BELL_H = 48, BELL_GRIP = 9;   // the pointer holds the handle, about 9 px down from the top
var bellX = 100, bellY = 20, bellTilt = 18, bellHeld = null, bellFlight = 0, bellRings = 0, bellRingTimer = 0;
/** @returns {boolean} Whether the bell is out: at night, only while his bed is out (awake with no bed there is no bell: he has his toy). In the small desktop window and in the app. */
function bellOut() { return L.isNight(petNow()) && !bellBroken && stage.classList.contains('bedtime'); }
/** Where it rests: tucked into his bed beside him (when the bed is out), otherwise on the floor. */
function bellRest() { var side = roomOnRight(120) ? 1 : -1; return stage.classList.contains('bedtime') ? { x: 100 * side, y: 20, tilt: 18 * side } : { x: -128, y: 0, tilt: 0 }; }
function placeBell(turn, clap) {
  if (bellField && bellHeld) { bellField.show(bellX, bellY, turn || 0); bell.style.visibility = 'hidden'; return; }   // held out in the screen-wide field: the bell is drawn by the window of its own
  bell.style.translate = Math.round(bellX) + 'px 0'; bellImg.style.transform = 'translateY(' + (-bellY).toFixed(1) + 'px)'; bellSvg.style.rotate = (turn || 0).toFixed(1) + 'deg'; bellClap.style.rotate = (clap || 0).toFixed(1) + 'deg'; }
/** Puts it back where it rests (a short hop), tilted, behind the front of the bed. */
function bellNest(quick) {
  var to = bellRest(), from = { x: bellX, y: bellY, t: bellTilt }, t0 = performance.now(), ms = quick ? 1 : 320;
  cancelAnimationFrame(bellFlight);
  (function step(now) {
    var u = Math.min(1, (now - t0) / ms), e = u * u * (3 - 2 * u);
    bellX = from.x + (to.x - from.x) * e; bellY = from.y + (to.y - from.y) * e + Math.sin(u * Math.PI) * 14;
    bellTilt = from.t + (to.t - from.t) * e;
    placeBell(bellTilt, 0);
    if (u < 1) bellFlight = requestAnimationFrame(step); else bell.classList.add('nested');
  })(t0);
}
var wasBellAwake = false;
function showScene() {
  var awakeNow = bellAwake();
  if (wasBellAwake && !awakeNow && L.isNight(petNow()) && document.documentElement.classList.contains('desktop-pet')) bellToBed(['oh… so sleepy… night night', '*yawn* bed time again…', 'mm… back to bed…']);
  wasBellAwake = awakeNow;
  document.documentElement.dataset.scene = petScene();
  var out = bellOut();
  if (out && bell.hidden) { bell.hidden = false; var rest = bellRest(); bellX = rest.x; bellY = rest.y; bellTilt = rest.tilt; bell.classList.add('nested'); placeBell(bellTilt, 0); bell.classList.remove('pop'); void bell.offsetWidth; bell.classList.add('pop'); }
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
  // with no bed there is no bell: it is put away (he has his toy again)
  bellHeld = null; endBellField(); bell.classList.remove('held'); bell.classList.add('putaway'); cancelAnimationFrame(bellFlight);
  setTimeout(function () { bell.classList.remove('putaway'); showScene(); }, 450);
  showScene();
}
/** Back to bed (the small window has no lamp), saying one of the lines: tucked in and asleep, or (notTucked) only in bed, waiting to be tucked in. */
function bellToBed(lines, notTucked) {
  setBellAwake(false);
  refreshBedtime();
  var bed = bedtime(); bed.dark = true; bed.tucked = !notTucked; saveBedtime(bed);
  refreshBedtime();
  say(pick(lines), 2000);
  showScene();
}
var bellActive = null;   // the field the bell is flying in, until it lands or breaks
/** The bell's flight over the screen is over: it is drawn in the page again, in his window (as near to where it came down as the window reaches). */
function endBellField() {
  var f = bellActive || bellField;
  if (!f) return;
  bellActive = null; bellField = null;
  if (f.localX) { var lim = bellLimits(); bellX = Math.max(lim.minX, Math.min(lim.maxX, f.localX())); bellY = 0; }
  f.hide();
  bell.style.visibility = '';
}
// the bell's pieces (in the bell's 36 x 48 drawing): where each flies (px, over the whole burst) and how far it turns
var BELL_PIECES = [
  { d: 'M4 40 C4 28 10 21 18 21 L15 28 L19 33 L16 40 Z', fill: '#f2c14e', w: 1.8, v: [-30, -36], r: -140 },
  { d: 'M18 21 C26 21 32 28 32 40 L16 40 L19 33 L15 28 Z', fill: '#f2c14e', w: 1.8, v: [32, -44], r: 170 },
  { d: 'M2 39.6 H18 L18 44.8 L3.6 44.8 Q1.8 44.8 1.8 43.2 Z', fill: '#f2c14e', w: 1.8, v: [-40, -28], r: -230 },
  { d: 'M18 39.6 H34 L34.2 43.2 Q34.2 44.8 32.4 44.8 L18 44.8 Z', fill: '#f2c14e', w: 1.8, v: [42, -30], r: 210 },
  { d: 'M14.2 1 H21.8 V20 H14.2 Z', fill: '#d6a066', w: 1.7, v: [8, -62], r: 260 },
  { d: 'M11.4 17.6 H24.6 V23 H11.4 Z', fill: '#e0a93a', w: 1.6, v: [-14, -52], r: -200 },
  { d: 'M14.1 46.2 a3.9 3.9 0 1 0 7.8 0 a3.9 3.9 0 1 0 -7.8 0 Z', fill: '#c98f4f', w: 1.5, v: [20, -26], r: 300 },
  { d: 'M0 0 L7 2 L3 7 Z', fill: '#f2c14e', w: 1.2, v: [-52, -28], r: 320, at: [6, 30] },
  { d: 'M0 0 L6 1 L2 6 Z', fill: '#f2c14e', w: 1.2, v: [54, -30], r: -300, at: [28, 32] },
  { d: 'M0 0 L5 3 L1 6 Z', fill: '#e0a93a', w: 1.2, v: [4, -70], r: 280, at: [16, 24] }
];
/** Where a piece is a fraction t (0..1) through the burst: [x, y, turn] (it flies out, then falls). */
function bellPiecePos(pc, t) { return [pc.v[0] * t, pc.v[1] * t + 60 * t * t, pc.r * t]; }
/** @param {number} t  0..1 @returns {string} The bell's pieces part way through bursting, as a 144 x 144 drawing with the bell in the middle. */
function bellBurstSvg(t) {
  var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144" width="144" height="144"><g transform="translate(54 48)" stroke="#5b4239" stroke-linejoin="round" opacity="' + (t > .6 ? (1 - (t - .6) / .4).toFixed(2) : 1) + '">';
  BELL_PIECES.forEach(function (pc) {
    var p = bellPiecePos(pc, t), at = pc.at || [0, 0], c = pc.at ? [2.5, 3.5] : [18, 28];
    out += '<path d="' + pc.d + '" fill="' + pc.fill + '" stroke-width="' + pc.w + '" transform="translate(' + (at[0] + p[0]).toFixed(1) + ' ' + (at[1] + p[1]).toFixed(1) + ') rotate(' + p[2].toFixed(0) + ' ' + c[0] + ' ' + c[1] + ')"/>';
  });
  return out + '</g></svg>';
}
/** The bell breaks into pieces that fly out and fall, drawn on the page (at: the middle of the bell, in page px). */
function bellPiecesOnPage(at) {
  BELL_PIECES.forEach(function (pc) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 36 48'); el.setAttribute('width', '36'); el.setAttribute('height', '48');
    el.style.cssText = 'position:fixed;left:0;top:0;z-index:40;pointer-events:none;overflow:visible';
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pc.d); path.setAttribute('fill', pc.fill); path.setAttribute('stroke', '#5b4239'); path.setAttribute('stroke-width', pc.w); path.setAttribute('stroke-linejoin', 'round');
    if (pc.at) path.setAttribute('transform', 'translate(' + pc.at[0] + ' ' + pc.at[1] + ')');
    el.appendChild(path); document.body.appendChild(el);
    var frames = [], n = 10;
    for (var i = 0; i <= n; i++) { var t = i / n, p = bellPiecePos(pc, t); frames.push({ transform: 'translate(' + (at.x - 18 + p[0]).toFixed(1) + 'px,' + (at.y - 24 + p[1]).toFixed(1) + 'px) rotate(' + p[2].toFixed(0) + 'deg)', opacity: t > .7 ? 1 - (t - .7) / .3 : 1, offset: t }); }
    el.animate(frames, { duration: 950, easing: 'linear', fill: 'both' }).finished.then(el.remove.bind(el), el.remove.bind(el));
  });
}
function bellBreak() {
  cancelAnimationFrame(bellFlight);
  var r = bell.getBoundingClientRect(), at = { x: r.left + r.width / 2, y: r.top + r.height / 2 }, wide = !!bellActive, field = bellActive;
  endBellField();
  bell.hidden = true; bellBroken = true; bellY = 0;
  sound('smash');
  if (!reduceMotion) { if (!wide) bellPiecesOnPage(at); else if (field && field.burst) field.burst(bellBurstSvg, 7, 110); }
  if (!wide) drift(['✦', '✧', '·', '✦'], at, 6);
  bellToBed(petScene() !== 'night-bed' ? ['oh… so sleepy… night night', '…bed…', 'mm… back to bed…'] : ['mm…', '…zzz…']);
  setTimeout(function () { bellBroken = false; showScene(); }, 4000);   // a new one turns up a few seconds later
}
/** @returns {{minX: number, maxX: number, maxY: number}} Where the bell can go (as the toy's limits: px from the middle, px up). */
function bellLimits() { return { minX: -stage.clientWidth / 2 + 20, maxX: stage.clientWidth / 2 - 20, maxY: stage.clientHeight - 3 - BELL_H - 8 }; }
/**
 * Let go: it flies like the toy does (the same gravity and bounces, the same speed cap), but breaks on its second bounce.
 * @param {number} vx @param {number} vy Px/s (up is positive).
 * @param {number} spin Degrees it is turned by when let go.
 */
function bellFly(vx, vy, spin) {
  bell.classList.remove('nested');
  var field = bellField, lim = field ? field.lim : bellLimits(), last = performance.now(), bounces = 0, lastBounce = 0;
  var gravity = field ? 950 : 1500, wallK = field ? 0.92 : 0.75, floorK = field ? 0.74 : 0.6;   // (over the whole screen it flies longer, like the toy)
  cancelAnimationFrame(bellFlight);
  if (field) { bell.style.visibility = 'hidden'; bellActive = field; bellField = null; }
  function bounce(now, speed) { if (speed > 140 && now - lastBounce > 60) { lastBounce = now; sound('tink'); if (++bounces >= 4) { bellBreak(); return true; } } return false; }
  (function step(now) {
    var dt = Math.min(0.033, (now - last) / 1000); last = now;
    vy -= gravity * dt; bellX += vx * dt; bellY += vy * dt;
    spin += vx * dt * 1.6;
    if (bellX < lim.minX) { bellX = lim.minX; if (bounce(now, Math.abs(vx))) return; vx = Math.abs(vx) * wallK; }
    if (bellX > lim.maxX) { bellX = lim.maxX; if (bounce(now, Math.abs(vx))) return; vx = -Math.abs(vx) * wallK; }
    if (bellY > lim.maxY) { bellY = lim.maxY; if (bounce(now, Math.abs(vy))) return; vy = -Math.abs(vy) * floorK; }
    if (bellY < 0) { bellY = 0; if (bounce(now, Math.abs(vy))) return; vy = -vy * floorK; if (vy < 70) vy = 0; vx *= 0.88; }
    if (bellY === 0 && vy === 0) { vx *= Math.pow(0.3, dt); spin *= Math.pow(0.02, dt); }
    if (field) field.show(bellX, bellY, spin); else placeBell(spin);
    if (bellY === 0 && vy === 0 && Math.abs(vx) < 8) { bellTilt = spin % 360; endBellField(); bellNest(false); return; }
    bellFlight = requestAnimationFrame(step);
  })(last);
}
bell.addEventListener('pointerdown', function (e) {
  if (e.button !== 0 || !bellOut()) return;
  e.preventDefault(); e.stopPropagation();
  try { bell.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
  cancelAnimationFrame(bellFlight);
  bell.classList.remove('nested');
  bellField = null;
  if (typeof deskFlyField === 'function') { var tok = ++bellFieldTok; deskFlyField(bellSvg, BELL_W, BELL_H).then(function (f) { if (f && tok === bellFieldTok && bellHeld) bellField = f; else if (f) f.hide(); }); }   // (desktop app, "toy flies around the screen": it can fly over the whole screen)
  bellHeld = { pts: [], vx: 0, ax: 0, th: 0, w: 0, cp: 0, cw: 0, strikes: [], lastX: e.clientX, lastT: performance.now(), peak: 0 };
  bell.classList.add('held');
  swingLoop(bellHeld);
});
/** While it is held it hangs from the handle and swings like a pendulum, driven by how the pointer speeds up and slows down; each hard swing the clapper strikes. */
function swingLoop(h) {
  var last = performance.now(), len = 30, g = 1800;
  (function frame(now) {
    if (bellHeld !== h) return;
    var dt = Math.min(0.033, (now - last) / 1000); last = now;
    var th = h.th * Math.PI / 180, w = h.w * Math.PI / 180;
    var acc = -(g / len) * Math.sin(th) - 2.4 * w + (h.ax / len) * Math.cos(th);
    w += acc * dt; th += w * dt;
    var lim = 1.75;   // about 100 degrees
    if (th > lim) { th = lim; w = -w * 0.3; } if (th < -lim) { th = -lim; w = -w * 0.3; }
    var prev = h.w; h.th = th * 180 / Math.PI; h.w = w * 180 / Math.PI;
    // the clapper is a shorter pendulum inside the bell: it swings later and further, and knocks against the sides
    var cp = h.cp * Math.PI / 180, cw = h.cw * Math.PI / 180, cacc = -(g / 16) * Math.sin(cp) - 1.3 * cw + (h.ax / 16) * Math.cos(cp);
    cw += cacc * dt; cp += cw * dt; h.cp = cp * 180 / Math.PI; h.cw = cw * 180 / Math.PI;
    var rel = h.cp - h.th, relLim = 40;
    if (rel > relLim) { h.cp = h.th + relLim; h.cw = -Math.abs(h.cw) * 0.4; rel = relLim; } if (rel < -relLim) { h.cp = h.th - relLim; h.cw = Math.abs(h.cw) * 0.4; rel = -relLim; }
    h.ax *= 0.5;
    placeBell(h.th, rel);
    // the clapper strikes when the swing turns round, hard enough
    if (prev * h.w <= 0 && Math.abs(h.th) > 24) {
      sound('tink');
      h.strikes.push(now); h.strikes = h.strikes.filter(function (t) { return now - t < 1700; });
      if (h.strikes.length >= 4) { h.strikes = []; bellRing(); }
    }
    requestAnimationFrame(frame);
  })(last);
}
bell.addEventListener('pointermove', function (e) {
  var h = bellHeld; if (!h) return;
  if (e.buttons === 0 && e.pointerType === 'mouse') { bellLetGo(); return; }
  var s = stage.getBoundingClientRect(), lim = bellField ? bellField.lim : bellLimits(), now = e.timeStamp;
  bellX = Math.max(lim.minX, Math.min(lim.maxX, e.clientX - (s.left + s.width / 2)));
  bellY = Math.max(0, Math.min(lim.maxY, s.bottom - 3 - BELL_H + BELL_GRIP - e.clientY));   // the handle is under the pointer
  // how fast and how hard the pointer is pushing it sideways (px/s and px/s^2), for the swing
  var dt = Math.max(0.008, (now - h.lastT) / 1000), vx = (e.clientX - h.lastX) / dt;
  h.ax += Math.max(-9000, Math.min(9000, (vx - h.vx) / dt)) * 0.35; h.vx = vx; h.lastX = e.clientX; h.lastT = now;
  h.pts.push({ x: e.clientX, y: e.clientY, t: now });
  if (h.pts.length > 5) h.pts.shift();
  placeBell(h.th);
});
function bellLetGo() {
  var h = bellHeld;
  if (!h) return;
  bellHeld = null; bell.classList.remove('held');
  var a = h.pts[0], z = h.pts[h.pts.length - 1];
  var vx = 0, vy = 0;
  if (a && z && z.t > a.t) { var dt = Math.max(16, z.t - a.t) / 1000; vx = (z.x - a.x) / dt; vy = -(z.y - a.y) / dt; }
  var speed = Math.hypot(vx, vy), cap = bellField ? 3300 : 1500;   // the toy's own speed limit
  if (speed > cap) { vx *= cap / speed; vy *= cap / speed; }
  bellFly(vx, vy, h.th);
}
bell.addEventListener('pointerup', bellLetGo);
bell.addEventListener('pointercancel', bellLetGo);
bell.addEventListener('lostpointercapture', bellLetGo);
window.addEventListener('blur', bellLetGo);

// (in the small window:) the small window moved to the edge of the screen: a bell resting on the side that is off the screen comes over to the other side
setInterval(function () {
  if (bell.hidden || bellHeld || !bell.classList.contains('nested') || !stage.classList.contains('bedtime')) return;
  if (Math.abs(bellX - bellRest().x) > 2) bellNest();
}, 2000);
