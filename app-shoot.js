// Photoshoot: the pet on its own, big, on a nice background with a pose, a frame and stickers, for cute screenshots.
// Nothing is saved or sent anywhere: take the picture with the phone's own screenshot. The camera button hides the buttons
// for a clean shot (and flashes); tap the picture to bring them back.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var shootEl = $('shoot'), shootPet = $('shootPet'), shootBg = $('shootBg'), shootStickers = $('shootStickers');
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
var SHOOT_STICKERS = ['⭐', '🎀', '🍓', '🧁', '🍪', '🎉', '🎈', '🍬'];
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
SHOOT_STICKERS.forEach(function (s) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'shoot-chip shoot-sticker-btn'; b.setAttribute('aria-label', 'Add a sticker');
  b.appendChild(emojiImg(s, ''));
  b.addEventListener('click', function () { addShootSticker(s); });
  $('shootStickerRow').appendChild(b);
});
/** Puts a sticker somewhere round the pet. It can be dragged about, and a double-tap takes it off. @param {string} emoji */
function addShootSticker(emoji) {
  var el = emojiImg(emoji, '');
  el.className = 'shoot-sticker';
  el.style.left = (14 + Math.random() * 72) + '%';
  el.style.top = (12 + Math.random() * 42) + '%';
  el.style.rotate = Math.round(Math.random() * 40 - 20) + 'deg';
  var drag = null;
  el.addEventListener('pointerdown', function (e) { el.setPointerCapture(e.pointerId); drag = { dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop }; });
  el.addEventListener('pointermove', function (e) { if (drag) { el.style.left = (e.clientX - drag.dx) + 'px'; el.style.top = (e.clientY - drag.dy) + 'px'; } });
  el.addEventListener('pointerup', function () { drag = null; });
  el.addEventListener('dblclick', function () { el.remove(); sound('remove'); });
  shootStickers.appendChild(el);
  sound('pick');
}
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
  shootState.night = false;
  shootStickers.replaceChildren();
  shootEl.hidden = false;
  shootEl.classList.remove('clean');
  $('shootHint').hidden = true;
  renderShoot();
  sound('open');
}
/** Closes it (the dressing room is still there underneath). */
function closeShoot() { shootEl.hidden = true; }
/** The camera button: the buttons go, the screen flashes and clicks, and a tap brings the buttons back. */
$('shootSnap').addEventListener('click', function (e) {
  e.stopPropagation();
  shootEl.classList.add('clean');
  var f = $('shootFlash');
  f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop');
  sound('shutter');
  $('shootHint').hidden = false;
  setTimeout(function () { $('shootHint').hidden = true; }, 3200);
});
shootEl.addEventListener('click', function (e) {
  if (shootEl.classList.contains('clean')) { shootEl.classList.remove('clean'); $('shootHint').hidden = true; }
});
$('shootClose').addEventListener('click', closeShoot);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !shootEl.hidden) { e.stopPropagation(); closeShoot(); } }, true);
$('shootBtn').addEventListener('click', openShoot);
