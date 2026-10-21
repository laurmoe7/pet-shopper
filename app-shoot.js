// Photoshoot: the pet on its own, big, on a nice background with a pose and a frame, for cute screenshots.
// The Photo button takes the picture (app-photo.js); nothing is sent anywhere.
// The Camera button puts the pet in front of the phone's camera, to take a picture of it "in real life": drag to move it, pinch to resize, twist to turn.
// The camera picture is only shown on screen: nothing is recorded or sent anywhere, and it stops when you leave.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var shootEl = $('shoot'), shootPet = $('shootPet'), shootBg = $('shootBg');
var SHOOT_POSES = [
  { label: 'Smile', eyes: 'open', mouth: 'smile', arms: 'idle', x: ['cheeks'] },
  { label: 'Happy', eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] },
  { label: 'Sparkle', eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['cheeks', 'sparkles'] },
  { label: 'Shy', eyes: 'closed', mouth: 'smile', arms: 'cover', x: ['cheeks'] },
  { label: 'Love', eyes: 'sparkle', mouth: 'smile', arms: 'pat', x: ['cheeks', 'hearts'] },
  { label: 'Hello', eyes: 'happy', mouth: 'open', arms: 'reach', x: ['cheeks'] }
];
// studio backgrounds (plain pastel colours) first, then the room backgrounds from backdrops.js
var SHOOT_STUDIOS = [
  { id: 's-pink', name: 'Pink studio', css: 'radial-gradient(circle at 50% 45%, #fff3f6 0%, #ffd6e2 70%, #ffc0d3 100%)' },
  { id: 's-mint', name: 'Mint studio', css: 'radial-gradient(circle at 50% 45%, #f4fff9 0%, #cdeedd 70%, #b5e2cb 100%)' },
  { id: 's-cream', name: 'Cream studio', css: 'radial-gradient(circle at 50% 45%, #fffdf5 0%, #fbe9c9 70%, #f5d9a8 100%)' },
  { id: 's-lilac', name: 'Lilac studio', css: 'radial-gradient(circle at 50% 45%, #fbf7ff 0%, #e2d6f7 70%, #cfbff0 100%)' }
];
var SHOOT_FRAMES = [['none', 'No frame'], ['polaroid', 'Polaroid'], ['hearts', 'Hearts'], ['ribbon', 'Ribbon']];
var shootState = { pose: 0, bg: 0, frame: 'none', tab: 'pose', timer: false, night: false, shown: false };
// the last pose, background, frame and self-timer are kept on this device, so the next photoshoot starts where you left it
var SHOOT_KEY = 'nibble-shoot', shootSaved = {};
try { shootSaved = JSON.parse(localStorage.getItem(SHOOT_KEY)) || {}; } catch (e) { shootSaved = {}; }
function shootRemember() {
  shootSaved.pose = shootState.pose; shootSaved.bg = shootBackgrounds()[shootState.bg].id; shootSaved.frame = shootState.frame; shootSaved.timer = shootState.timer; shootSaved.tab = shootState.tab;
  try { localStorage.setItem(SHOOT_KEY, JSON.stringify(shootSaved)); } catch (e) { /* storage blocked */ }
}
/** @returns {Object[]} Every background to choose from: the studios, then the room backgrounds. */
function shootBackgrounds() { return SHOOT_STUDIOS.concat(BACKDROPS.filter(function (b) { return b.draw; })); }
/** Draws the pet, the background, the frame and its caption as they are now. */
function renderShoot() {
  var p = SHOOT_POSES[shootState.pose], view = document.createElement('div');
  view.className = 'pet preview' + (L.isBird(state.pet.species) ? ' beaked' : '');
  view.dataset.species = state.pet.species;
  view.dataset.skin = state.pet.skin || '';
  view.dataset.state = 'curious';
  view.dataset.eyes = p.eyes; view.dataset.mouth = p.mouth; view.dataset.arms = p.arms;
  ['zzz', 'steam', 'hearts', 'sparkles', 'question', 'sweat', 'shock', 'redface', 'cheeks'].forEach(function (x) { view.classList.toggle('x-' + x, p.x.indexOf(x) !== -1); });
  view.appendChild(petCopy());
  dressUp(view, state.pet.outfit);
  shootPet.replaceChildren(view);
  var bg = shootBackgrounds()[shootState.bg];
  shootBg.style.background = bg.css || '';
  shootBg.innerHTML = bg.draw ? '<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' + bg.draw(shootState.night) + '</svg>' : '';
  shootEl.dataset.frame = shootState.frame;
  $('shootCaption').textContent = petName() + ' · ' + new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  $('shootTimer').setAttribute('aria-pressed', String(!!shootState.timer));
  renderChips();
  shootRemember();
}
// one row of choices at a time: the poses, the backgrounds or the frames, picked by the tabs under it (less at the bottom than three rows)
var SHOOT_TABS = {
  pose: function () { return SHOOT_POSES.map(function (p, i) { return { label: p.label, on: i === shootState.pose, pick: function () { shootState.pose = i; } }; }); },
  bg: function () { return shootBackgrounds().map(function (b, i) { return { label: b.name, on: i === shootState.bg, pick: function () { shootState.bg = i; } }; }); },
  frame: function () { return SHOOT_FRAMES.map(function (f) { return { label: f[1], on: f[0] === shootState.frame, pick: function () { shootState.frame = f[0]; } }; }); }
};
/** Fills the choices row for the tab that is open (built again only when the tab changes) and marks the picked one. @param {boolean} [center] Scroll the picked one into view. */
function renderChips(center) {
  if (!SHOOT_TABS[shootState.tab] || (shootState.tab === 'bg' && shootEl.classList.contains('cam'))) shootState.tab = 'pose';   // (no backgrounds behind the camera)
  var row = $('shootChips'), list = SHOOT_TABS[shootState.tab]();
  if (row.dataset.tab !== shootState.tab) {
    row.dataset.tab = shootState.tab;
    row.replaceChildren.apply(row, list.map(function (it) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'shoot-chip'; b.textContent = it.label;
      b.addEventListener('click', function () { it.pick(); sound('tap'); renderShoot(); });
      return b;
    }));
    center = true;
  }
  var picked = null;
  Array.prototype.forEach.call(row.children, function (b, i) { b.setAttribute('aria-pressed', String(list[i].on)); if (list[i].on) picked = b; });
  if (center && picked) row.scrollLeft = picked.offsetLeft - (row.clientWidth - picked.offsetWidth) / 2;
  $('shootTabs').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === shootState.tab)); });
  shootRowFade();
}
/** Fades the edges of the choices row where there are more to scroll to. */
function shootRowFade() {
  var r = $('shootChips');
  r.classList.toggle('more-r', r.scrollLeft + r.clientWidth < r.scrollWidth - 2);
  r.classList.toggle('more-l', r.scrollLeft > 2);
}
$('shootChips').addEventListener('scroll', shootRowFade, { passive: true });
window.addEventListener('resize', function () { if (!shootEl.hidden) shootRowFade(); });
$('shootTabs').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || b.dataset.tab === shootState.tab) return;
  shootState.tab = b.dataset.tab; sound('tap'); renderShoot();
});
// a few twinkles drifting about the picture
for (var si = 0; si < 9; si++) {
  var sp = document.createElement('span');
  sp.textContent = si % 3 === 0 ? '✦' : si % 3 === 1 ? '♡' : '✧';
  sp.style.cssText = 'left:' + (6 + (si * 37) % 88) + '%;top:' + (6 + (si * 53) % 60) + '%;animation-delay:' + (si * 0.37).toFixed(2) + 's;font-size:' + (14 + (si % 3) * 6) + 'px';
  $('shootSparkles').appendChild(sp);
}
/** Steps through the backgrounds. @param {number} n 1 for the next, -1 for the one before. */
function shootStep(n) {
  var all = shootBackgrounds();
  shootState.bg = (shootState.bg + n + all.length) % all.length;
  shootState.tab = 'bg';   // (so you see which one it is)
  sound('tap');
  renderShoot();
  renderChips(true);
}
/** Opens the photoshoot. */
function openShoot() {
  stopCamera();
  camPos = { x: 0, y: 0, s: 1, r: 0 };
  applyCamPos();
  shootState.night = false;
  var bgs = shootBackgrounds(), at = bgs.findIndex(function (b) { return b.id === shootSaved.bg; });
  shootState.bg = at >= 0 ? at : 0;
  shootState.pose = shootSaved.pose >= 0 && shootSaved.pose < SHOOT_POSES.length ? shootSaved.pose : 0;
  shootState.frame = SHOOT_FRAMES.some(function (f) { return f[0] === shootSaved.frame; }) ? shootSaved.frame : 'none';
  shootState.timer = !!shootSaved.timer;
  shootState.tab = SHOOT_TABS[shootSaved.tab] ? shootSaved.tab : 'pose';
  shootEl.hidden = false;
  shootEl.classList.remove('clean');
  renderShoot();
  renderChips(true);
  sound('open');
}
// ---------- the camera ----------
var camStream = null, camFacing = 'environment', camPos = { x: 0, y: 0, s: 1, r: 0 };   // r: turn in degrees
/** Moves and resizes the pet over the camera picture. */
function applyCamPos() {
  shootPet.style.setProperty('--shoot-dx', camPos.x + 'px');
  shootPet.style.setProperty('--shoot-dy', camPos.y + 'px');
  shootPet.style.setProperty('--shoot-s', String(camPos.s));
  shootPet.style.setProperty('--shoot-r', camPos.r + 'deg');
}
/** Says something under the picker, or nothing; with fix, an Open settings button after it. @param {string} text @param {Function} [fix] */
function camNote(text, fix) {
  $('shootCamNote').textContent = text; $('shootCamNote').hidden = !text;
  camFix = text && fix || null;
  $('shootCamFix').hidden = !camFix;
}
var camFix = null, camRetry = false;
/** Turns the camera off and shows the normal background again. */
function stopCamera() {
  if (camStream) camStream.getTracks().forEach(function (t) { t.stop(); });
  camStream = null;
  var v = $('shootCam');
  v.srcObject = null; v.hidden = true;
  shootEl.classList.remove('cam');
  $('shootCamBtn').setAttribute('aria-pressed', 'false');
  $('shootFlip').hidden = true;
  camNote('');
  if (!shootEl.hidden) renderChips();
}
/**
 * Says why the camera did not start, for where the app runs. In the phone app and the Windows app an Open settings button
 * goes straight to the right settings page (the APK's NativeSettings plugin, the shell's camSettings), and the camera is
 * tried again when you come back. An APK or installer from before the camera was allowed is told to update instead.
 * @param {Error} err
 */
function camRefused(err) {
  if (err && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) { camNote('This phone or browser has no camera for Fumu to use.'); return; }
  var C = window.Capacitor, D = window.nibbleDesktop;
  if (C && C.isNativePlatform && C.isNativePlatform()) {
    var ns = C.Plugins && C.Plugins.NativeSettings;
    if (!ns) { camNote('Update the app in Obtainium to use the camera.'); return; }
    camNote('The camera is off. Allow it for Fumufumu in the phone\u2019s settings.', function () { camRetry = true; ns.openAndroid({ option: 'application_details' }).catch(function () { camRetry = false; }); });
    return;
  }
  if (D) {
    if (!D.camSettings) { camNote('Update the Windows app to use the camera.'); return; }
    camNote('Windows is keeping the camera off. Allow it for desktop apps in Windows\u2019 settings.', function () { camRetry = true; D.camSettings(); });
    return;
  }
  camNote('The camera is off. Allow it in the browser\u2019s settings for this page to try again.');
}
/** Turns the camera on behind the pet (asks the phone for permission the first time). */
function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camNote('This phone or browser has no camera for Fumu to use.'); return; }
  camNote('Waking the camera\u2026');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: camFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })   // (without a size the phone gives 640 x 480: blurry photos)
    .then(function (stream) {
    if (shootEl.hidden) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
    if (camStream) camStream.getTracks().forEach(function (t) { t.stop(); });
    camStream = stream;
    var v = $('shootCam');
    v.srcObject = stream; v.hidden = false;
    v.classList.toggle('mirror', camFacing === 'user');
    var play = v.play(); if (play && play.catch) play.catch(function () { /* autoplay is already on */ });
    shootEl.classList.add('cam');
    $('shootCamBtn').setAttribute('aria-pressed', 'true');
    $('shootFlip').hidden = false;
    camNote('');
    renderChips();
    if (!shootSaved.hinted) {   // how to place him, said once
      shootSaved.hinted = true; shootRemember();
      camNote('Drag to move · pinch to resize');
      setTimeout(function () { if (!camFix) camNote(''); }, 5000);
    }
  }).catch(function (err) {
    stopCamera();
    camRefused(err);
  });
}
$('shootCamBtn').addEventListener('click', function () { sound('tap'); if (camStream) stopCamera(); else startCamera(); });
$('shootCamFix').addEventListener('click', function () { sound('tap'); if (camFix) camFix(); });
// back from the settings: try the camera again
document.addEventListener('visibilitychange', function () { if (!document.hidden && camRetry) { camRetry = false; if (!shootEl.hidden && !camStream) startCamera(); } });
window.addEventListener('focus', function () { if (camRetry && window.nibbleDesktop) { camRetry = false; if (!shootEl.hidden && !camStream) startCamera(); } });
$('shootFlip').addEventListener('click', function () { sound('tap'); camFacing = camFacing === 'environment' ? 'user' : 'environment'; startCamera(); });
// drag to move, two fingers to resize and turn, double-tap to put him back in the middle
var camPointers = {}, camPinch = 0, camAngle = 0, camMoved = false, camLastTap = 0;
/** @returns {number[]} The two fingers' distance and the angle between them (degrees). */
function camTwo() {
  var ids = Object.keys(camPointers), a = camPointers[ids[0]], b = camPointers[ids[1]];
  return [Math.hypot(a.x - b.x, a.y - b.y), Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI];
}
shootPet.addEventListener('pointerdown', function (e) {
  camPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
  shootPet.setPointerCapture(e.pointerId);
  camMoved = false;
  if (Object.keys(camPointers).length === 2) { var t = camTwo(); camPinch = t[0]; camAngle = t[1]; }
});
shootPet.addEventListener('pointermove', function (e) {
  var pt = camPointers[e.pointerId];
  if (!pt) return;
  if (Object.keys(camPointers).length >= 2) {
    camPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var t = camTwo(), turn = t[1] - camAngle;
    if (turn > 180) turn -= 360; else if (turn < -180) turn += 360;
    if (camPinch > 10 && t[0] > 10) camPos.s = Math.max(.35, Math.min(2.6, camPos.s * t[0] / camPinch));
    camPos.r = Math.round((camPos.r + turn) * 10) / 10;
    camPinch = t[0]; camAngle = t[1]; camMoved = true;
  } else {
    var dx = e.clientX - pt.x, dy = e.clientY - pt.y;
    if (Math.abs(dx) + Math.abs(dy) > 0) camMoved = true;
    camPos.x += dx; camPos.y += dy;
    camPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
  }
  applyCamPos();
});
function camPointerEnd(e) { delete camPointers[e.pointerId]; camPinch = 0; }
shootPet.addEventListener('pointerup', camPointerEnd);
shootPet.addEventListener('pointercancel', camPointerEnd);
shootPet.addEventListener('click', function (e) {
  if (camMoved) { e.stopPropagation(); camMoved = false; return; }
  var now = Date.now();
  if (now - camLastTap < 350) { camPos = { x: 0, y: 0, s: 1, r: 0 }; applyCamPos(); sound('tap'); }
  camLastTap = now;
});
// the camera never keeps running when you leave
document.addEventListener('visibilitychange', function () { if (document.hidden && camStream) stopCamera(); });

/** Closes it (the dressing room is still there underneath). */
function closeShoot() { stopCamera(); stopCountdown(); shootEl.hidden = true; }
// a sideways swipe over the background picks the next or the one before (the arrows still work)
var shootSwipe = null;
shootEl.addEventListener('pointerdown', function (e) {
  shootSwipe = shootEl.classList.contains('cam') || e.target.closest('.shoot-pet, .shoot-ui, .photo-result, button') ? null : { x: e.clientX, y: e.clientY };
});
shootEl.addEventListener('pointerup', function (e) {
  if (!shootSwipe) return;
  var dx = e.clientX - shootSwipe.x, dy = e.clientY - shootSwipe.y;
  shootSwipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) shootStep(dx < 0 ? 1 : -1);
});
shootEl.addEventListener('pointercancel', function () { shootSwipe = null; });
shootEl.addEventListener('click', function (e) {
  if (shootEl.classList.contains('clean')) { shootEl.classList.remove('clean'); }
});
$('shootClose').addEventListener('click', closeShoot);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !shootEl.hidden) { e.stopPropagation(); closeShoot(); } }, true);
$('shootBtn').addEventListener('click', openShoot);
