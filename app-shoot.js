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
var shootState = { pose: 0, bg: 0, frame: 'none', night: false, shown: false };
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
  $('shootBgName').textContent = bg.name;
  shootEl.dataset.frame = shootState.frame;
  $('shootCaption').textContent = petName() + ' · ' + new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  $('shootPoses').querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === shootState.pose)); });
  $('shootFrames').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.frame === shootState.frame)); });
}
SHOOT_POSES.forEach(function (p, i) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'shoot-chip'; b.textContent = p.label;
  b.addEventListener('click', function () { shootState.pose = i; sound('tap'); renderShoot(); });
  $('shootPoses').appendChild(b);
});
SHOOT_FRAMES.forEach(function (f) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'shoot-chip'; b.dataset.frame = f[0]; b.textContent = f[1];
  b.addEventListener('click', function () { shootState.frame = f[0]; sound('tap'); renderShoot(); });
  $('shootFrames').appendChild(b);
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
  sound('tap');
  renderShoot();
}
$('shootPrev').addEventListener('click', function () { shootStep(-1); });
$('shootNext').addEventListener('click', function () { shootStep(1); });
/** Opens the photoshoot. */
function openShoot() {
  stopCamera();
  camPos = { x: 0, y: 0, s: 1, r: 0 };
  applyCamPos();
  shootState.night = false;
  shootEl.hidden = false;
  shootEl.classList.remove('clean');
  renderShoot();
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
/** Says something under the picker, or nothing. @param {string} text */
function camNote(text) { $('shootCamNote').textContent = text; $('shootCamNote').hidden = !text; }
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
}
/** Turns the camera on behind the pet (asks the phone for permission the first time). */
function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camNote('This phone or browser has no camera for Fumu to use.'); return; }
  camNote('Waking the camera\u2026');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: camFacing } }, audio: false }).then(function (stream) {
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
  }).catch(function () {
    stopCamera();
    camNote('The camera is off. Allow it in the browser\u2019s settings for this page to try again.');
  });
}
$('shootCamBtn').addEventListener('click', function () { sound('tap'); if (camStream) stopCamera(); else startCamera(); });
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
function closeShoot() { stopCamera(); shootEl.hidden = true; }
shootEl.addEventListener('click', function (e) {
  if (shootEl.classList.contains('clean')) { shootEl.classList.remove('clean'); }
});
$('shootClose').addEventListener('click', closeShoot);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !shootEl.hidden) { e.stopPropagation(); closeShoot(); } }, true);
$('shootBtn').addEventListener('click', openShoot);
