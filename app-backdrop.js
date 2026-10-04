// Backgrounds behind the pet: a picture drawn behind the stage, picked in Options.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// Each is an SVG drawn in a 400 x 160 box. It is anchored to the bottom and cut at the sides on narrow screens,
// so keep the important parts away from the left and right edges. Outlines use the app's brown (#5b4239).
var BD_LINE = 'stroke="#5b4239" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
/**
 * @param {number} x
 * @param {number} y
 * @param {number} s Size.
 * @returns {string} A puffy cloud.
 */
function bdCloud(x, y, s) {
  return '<path d="M' + (x - 22 * s) + ' ' + y + 'a' + 9 * s + ' ' + 9 * s + ' 0 0 1 ' + 10 * s + ' -' + 9 * s +
    'a' + 12 * s + ' ' + 12 * s + ' 0 0 1 ' + 22 * s + ' -' + 3 * s + 'a' + 9 * s + ' ' + 9 * s + ' 0 0 1 ' + 14 * s + ' ' + 12 * s +
    'z" fill="#fff" ' + BD_LINE + '/>';
}
/**
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} fill
 * @returns {string} A four-pointed sparkle star.
 */
function bdStar(x, y, r, fill) {
  var q = r * 0.3;
  return '<path d="M' + x + ' ' + (y - r) + 'Q' + (x + q) + ' ' + (y - q) + ' ' + (x + r) + ' ' + y + 'Q' + (x + q) + ' ' + (y + q) + ' ' +
    x + ' ' + (y + r) + 'Q' + (x - q) + ' ' + (y + q) + ' ' + (x - r) + ' ' + y + 'Q' + (x - q) + ' ' + (y - q) + ' ' + x + ' ' + (y - r) + 'z" fill="' + fill + '"/>';
}
/**
 * @param {number} x
 * @param {number} y
 * @param {string} petal
 * @returns {string} A tiny flower.
 */
function bdFlower(x, y, petal) {
  return '<g ' + BD_LINE.replace('1.6', '1') + '><circle cx="' + (x - 2.6) + '" cy="' + y + '" r="2.4" fill="' + petal + '"/><circle cx="' + (x + 2.6) + '" cy="' + y + '" r="2.4" fill="' + petal + '"/>' +
    '<circle cx="' + x + '" cy="' + (y - 2.6) + '" r="2.4" fill="' + petal + '"/><circle cx="' + x + '" cy="' + (y + 2.6) + '" r="2.4" fill="' + petal + '"/></g>' +
    '<circle cx="' + x + '" cy="' + y + '" r="1.6" fill="#ffd45e"/>';
}

var BACKDROPS = [
  { id: 'none', name: 'None', svg: '' },
  {
    id: 'meadow', name: 'Meadow',
    svg: '<defs><linearGradient id="bdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9dcf2"/><stop offset="1" stop-color="#e3f4ef"/></linearGradient></defs>' +
      '<rect width="400" height="160" fill="url(#bdSky)"/>' +
      '<circle cx="330" cy="36" r="15" fill="#ffe08a" ' + BD_LINE + '/>' +
      '<path d="M330 13v-5M330 64v-5M307 36h-5M358 36h-5M314 20l-3-3M349 55l-3-3M346 20l3-3M311 55l3-3" stroke="#f5c451" stroke-width="2.4" stroke-linecap="round"/>' +
      bdCloud(80, 46, 1.1) + bdCloud(262, 62, 0.7) +
      '<path d="M-10 118Q60 82 140 104T280 96T410 104V170H-10z" fill="#b5e0a5" ' + BD_LINE + '/>' +
      '<path d="M-10 136Q90 108 200 128T410 122V170H-10z" fill="#93cf85" ' + BD_LINE + '/>' +
      bdFlower(52, 140, '#ffb3c7') + bdFlower(98, 150, '#fff') + bdFlower(300, 146, '#ffb3c7') + bdFlower(352, 136, '#fff') + bdFlower(250, 112, '#fff')
  },
  {
    id: 'kitchen', name: 'Kitchen',
    svg: '<defs><pattern id="bdTile" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#fdf3e6"/>' +
      '<path d="M0 .5H20M.5 0V20" stroke="#efd9c2" stroke-width="1.4"/></pattern></defs>' +
      '<rect width="400" height="160" fill="url(#bdTile)"/>' +
      // a window with curtains
      '<rect x="62" y="20" width="70" height="56" rx="6" fill="#bfe5f5" ' + BD_LINE + '/>' + bdCloud(100, 46, 0.55) +
      '<path d="M97 20v56M62 48h70" ' + BD_LINE + ' fill="none"/>' +
      '<path d="M56 16h82" stroke="#5b4239" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M58 17Q60 50 52 82Q66 74 70 17z" fill="#ffc4d2" ' + BD_LINE + '/><path d="M136 17Q134 50 142 82Q128 74 124 17z" fill="#ffc4d2" ' + BD_LINE + '/>' +
      // a shelf with jars and a pot plant
      '<path d="M262 64h86" stroke="#c99566" stroke-width="5" stroke-linecap="round"/><path d="M262 64h86" stroke="#5b4239" stroke-width="1" opacity=".35"/>' +
      '<rect x="270" y="42" width="16" height="20" rx="4" fill="#fff6dd" ' + BD_LINE + '/><rect x="269" y="38" width="18" height="6" rx="2" fill="#ff9fb6" ' + BD_LINE + '/>' +
      '<rect x="292" y="46" width="14" height="16" rx="4" fill="#fff6dd" ' + BD_LINE + '/><rect x="291" y="42" width="16" height="6" rx="2" fill="#9bd4a8" ' + BD_LINE + '/>' +
      '<path d="M318 50h20l-3 12h-14z" fill="#e8916b" ' + BD_LINE + '/>' +
      '<path d="M328 50q-8-10-2-18q4 8 2 18q2-12 10-14q-2 10-10 14" fill="#8fcf87" ' + BD_LINE + '/>' +
      // the counter top along the floor
      '<rect x="-10" y="128" width="420" height="40" fill="#e9bf8f" ' + BD_LINE + '/>' +
      '<path d="M-10 136H410" stroke="#d6a574" stroke-width="2"/><path d="M60 140v28M170 140v28M280 140v28M380 140v28" stroke="#d6a574" stroke-width="1.6"/>'
  },
  {
    id: 'night', name: 'Starry night',
    svg: '<defs><linearGradient id="bdNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e2f63"/><stop offset="1" stop-color="#5b5294"/></linearGradient></defs>' +
      '<rect width="400" height="160" fill="url(#bdNight)"/>' +
      // a crescent moon
      '<path d="M88 18a22 22 0 1 0 22 32a18 18 0 1 1 -22 -32z" fill="#ffe9a8" ' + BD_LINE + '/>' +
      bdStar(150, 30, 6, '#fff3c4') + bdStar(240, 22, 4, '#fff') + bdStar(300, 48, 7, '#fff3c4') + bdStar(352, 22, 4, '#fff') +
      bdStar(48, 70, 4, '#fff') + bdStar(200, 62, 3, '#fff') + bdStar(372, 80, 3.5, '#fff3c4') +
      '<circle cx="128" cy="62" r="1.4" fill="#fff"/><circle cx="270" cy="80" r="1.2" fill="#fff"/><circle cx="330" cy="100" r="1.4" fill="#fff"/><circle cx="24" cy="36" r="1.2" fill="#fff"/>' +
      '<path d="M-10 124Q70 98 150 116T300 108T410 116V170H-10z" fill="#3f4579" ' + BD_LINE + '/>' +
      '<path d="M-10 140Q100 120 210 136T410 132V170H-10z" fill="#4c5a8a" ' + BD_LINE + '/>'
  }
];

var backdropEl = document.createElement('div');
backdropEl.className = 'backdrop';
backdropEl.setAttribute('aria-hidden', 'true');
$('room').before(backdropEl);
/**
 * Draws a background behind the pet.
 * @param {string} id One of BACKDROPS.
 */
function applyBackdrop(id) {
  var bd = BACKDROPS.filter(function (b) { return b.id === id; })[0] || BACKDROPS[0];
  backdropEl.hidden = !bd.svg;
  backdropEl.dataset.bd = bd.id;
  backdropEl.innerHTML = bd.svg ? '<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice">' + bd.svg + '</svg>' : '';
}
// Kept on this device only, like Appearance.
var savedBackdrop = 'none';
try { savedBackdrop = localStorage.getItem('nibble-backdrop') || 'none'; } catch (e) { /* storage not available */ }
applyBackdrop(savedBackdrop);

var backdropRow = document.createElement('div');
backdropRow.className = 'option option-theme option-backdrop';
backdropRow.innerHTML = '<span class="option-title">Background</span>';
var backdropBtns = document.createElement('span');
backdropBtns.className = 'theme-btns';
BACKDROPS.forEach(function (bd) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'pill-btn'; b.textContent = bd.name;
  b.setAttribute('aria-pressed', String(bd.id === backdropEl.dataset.bd));
  b.addEventListener('click', function () {
    applyBackdrop(bd.id);
    try { localStorage.setItem('nibble-backdrop', bd.id); } catch (e) { /* storage not available */ }
    backdropBtns.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    sound('pick');
  });
  backdropBtns.appendChild(b);
});
backdropRow.appendChild(backdropBtns);
themeRow.after(backdropRow);
