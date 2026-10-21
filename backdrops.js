// The background pictures: plain SVG drawings with no page code, so the sketchpad (sketch.html) can use them too.
// Loaded before app-backdrop.js, which puts the chosen one behind the pet.
'use strict';

// Each is an SVG drawn in a 400 x 160 box. It is anchored to the bottom and cut at the sides on narrow
// phones (about 25 units each side) and a little at the top on wide screens, so keep the important parts
// between x 30 and 370 and below y 12. The pet stands in the middle and the receipt covers the bottom left.
// Outlines use the app's brown (#5b4239).
var BD_LINE = 'stroke="#5b4239" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
var BD_THIN = 'stroke="#5b4239" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
/**
 * @param {string} top
 * @param {string} bottom
 * @returns {string} A sky (or water) filling the box, fading from top to bottom.
 */
function bdSky(top, bottom) {
  return '<defs><linearGradient id="bdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '"/>' +
    '<stop offset="1" stop-color="' + bottom + '"/></linearGradient></defs><rect width="400" height="160" fill="url(#bdSky)"/>';
}
/**
 * @param {boolean} night
 * @returns {string} The usual sky: blue by day, deep blue by night.
 */
function bdDaySky(night) { return night ? bdSky('#2e2f63', '#5b5294') : bdSky('#a9dcf2', '#e3f4ef'); }
/**
 * @param {number} x
 * @param {number} y
 * @returns {string} A round sun with short rays.
 */
function bdSun(x, y) {
  var rays = '';
  for (var i = 0; i < 8; i++) {
    var a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    rays += 'M' + (x + c * 19).toFixed(1) + ' ' + (y + s * 19).toFixed(1) + 'L' + (x + c * 24).toFixed(1) + ' ' + (y + s * 24).toFixed(1);
  }
  return '<path d="' + rays + '" stroke="#f5c451" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#ffe08a" ' + BD_LINE + '/>';
}
/**
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @returns {string} A crescent moon.
 */
function bdMoon(x, y, r) {
  return '<path d="M' + x + ' ' + (y - r) + 'a' + r + ' ' + r + ' 0 1 0 ' + r + ' ' + (r * 1.45).toFixed(1) +
    'a' + (r * 0.82).toFixed(1) + ' ' + (r * 0.82).toFixed(1) + ' 0 1 1 -' + r + ' -' + (r * 1.45).toFixed(1) + 'z" fill="#ffe9a8" ' + BD_LINE + '/>';
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
    x + ' ' + (y + r) + 'Q' + (x - q) + ' ' + (y + q) + ' ' + (x - r) + ' ' + y + 'Q' + (x - q) + ' ' + (y - q) + ' ' + x + ' ' + (y - r) + 'z" fill="' + (fill || '#fff') + '"/>';
}
/**
 * @param {number[][]} list [x, y, size] for each star; bigger ones sparkle, small ones are dots.
 * @returns {string}
 */
function bdStars(list) {
  return list.map(function (s) {
    return s[2] > 2 ? bdStar(s[0], s[1], s[2], s[2] > 4 ? '#fff3c4' : '#fff') : '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '" fill="#fff"/>';
  }).join('');
}
/**
 * @param {number} x
 * @param {number} y
 * @param {number} s Size.
 * @param {string} [fill]
 * @returns {string} A puffy cloud.
 */
function bdCloud(x, y, s, fill) {
  return '<path d="M' + (x - 22 * s) + ' ' + y + 'a' + 9 * s + ' ' + 9 * s + ' 0 0 1 ' + 10 * s + ' -' + 9 * s +
    'a' + 12 * s + ' ' + 12 * s + ' 0 0 1 ' + 22 * s + ' -' + 3 * s + 'a' + 9 * s + ' ' + 9 * s + ' 0 0 1 ' + 14 * s + ' ' + 12 * s +
    'z" fill="' + (fill || '#fff') + '" ' + BD_LINE + '/>';
}
/**
 * @param {number} x
 * @param {number} y
 * @param {string} petal
 * @returns {string} A tiny flower.
 */
function bdFlower(x, y, petal) {
  return '<g ' + BD_THIN + '><circle cx="' + (x - 2.6) + '" cy="' + y + '" r="2.4" fill="' + petal + '"/><circle cx="' + (x + 2.6) + '" cy="' + y + '" r="2.4" fill="' + petal + '"/>' +
    '<circle cx="' + x + '" cy="' + (y - 2.6) + '" r="2.4" fill="' + petal + '"/><circle cx="' + x + '" cy="' + (y + 2.6) + '" r="2.4" fill="' + petal + '"/></g>' +
    '<circle cx="' + x + '" cy="' + y + '" r="1.6" fill="#ffd45e"/>';
}
/**
 * @param {number[][]} list [x, y] for each.
 * @returns {string} Little glowing fireflies.
 */
function bdGlows(list) {
  return list.map(function (p) {
    return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="#fff3a0" opacity=".3"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.8" fill="#fff6b8"/>';
  }).join('');
}
/**
 * @param {number} x
 * @param {number} y
 * @param {number} s Size (1 is about 22 wide).
 * @param {string} fill
 * @param {number} [dir=1] 1 swims right, -1 left.
 * @returns {string} A little round fish.
 */
function bdFish(x, y, s, fill, dir) {
  dir = dir || 1;
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s * dir) + ' ' + s + ')">' +
    '<path d="M-8 0L-15 -6V6z" fill="' + fill + '" ' + BD_LINE + '/><ellipse cx="0" cy="0" rx="9" ry="6.5" fill="' + fill + '" ' + BD_LINE + '/>' +
    '<circle cx="4" cy="-1.5" r="1.3" fill="#5b4239"/></g>';
}
/**
 * @param {boolean} night
 * @returns {string} Three to five fish in new spots, sizes, colours and directions each time the aquarium is drawn,
 *   kept apart from each other, the jellyfish and the seaweed.
 */
function bdSchool(night) {
  var cols = night ? ['#d98a6a', '#c9b46a', '#c98aa0', '#8fb0c9', '#a99ad0'] : ['#ffa27a', '#ffd86b', '#ffb3c7', '#a9dcff', '#c7b2ff'];
  var taken = [[186, 38, 22], [56, 100, 22], [352, 104, 26], [66, 40, 16], [333, 32, 12]], out = '', n = 3 + Math.floor(Math.random() * 3);
  for (var i = 0, tries = 0; i < n && tries < 200; tries++) {
    var x = 40 + Math.random() * 320, y = 18 + Math.random() * 92, sz = 0.6 + Math.random() * 0.45;
    if (taken.some(function (t) { return Math.hypot(t[0] - x, t[1] - y) < t[2] + 16 * sz + 6; })) continue;
    taken.push([x, y, 16 * sz]);
    out += bdFish(Math.round(x), Math.round(y), +sz.toFixed(2), cols[(i + Math.floor(Math.random() * cols.length)) % cols.length], Math.random() < 0.5 ? 1 : -1);
    i++;
  }
  return out;
}
/**
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @returns {string} A bubble.
 */
function bdBubble(x, y, r) {
  return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" fill-opacity=".25" stroke="#fff" stroke-width="1.2"/>' +
    '<circle cx="' + (x - r * 0.35).toFixed(1) + '" cy="' + (y - r * 0.35).toFixed(1) + '" r="' + (r * 0.25).toFixed(1) + '" fill="#fff"/>';
}

/**
 * @param {number} x Trunk foot.
 * @param {number} y
 * @param {number} s Size (1 is about 34 tall).
 * @param {boolean} night
 * @returns {string} A round, puffy tree with a shine on its crown.
 */
function bdTree(x, y, s, night) {
  var leaf = night ? '#3d6b55' : '#8fcf86', shade = night ? '#335c49' : '#78bd72';
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
    '<path d="M-3 0V-14H3V0z" fill="' + (night ? '#7d5f4a' : '#c4936b') + '" ' + BD_LINE + '/>' +
    '<path d="M-15 -16a9 9 0 0 1 4 -14a11 11 0 0 1 21 0a9 9 0 0 1 5 14q-3 4 -8 3h-14q-6 1 -8 -3z" fill="' + leaf + '" ' + BD_LINE + '/>' +
    '<path d="M-9 -15q8 3 17 0" stroke="' + shade + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    (night ? '' : '<path d="M-8 -29a8 8 0 0 1 7 -4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>') + '</g>';
}
/**
 * @param {number[][]} list [x, y] for each tuft.
 * @param {string} color
 * @returns {string} Little grass tufts, three blades each.
 */
function bdTufts(list, color) {
  return '<path d="' + list.map(function (p) { var x = p[0], y = p[1]; return 'M' + (x - 3) + ' ' + y + 'q0 -3 -1.4 -5M' + x + ' ' + y + 'q0 -4 .6 -6.4M' + (x + 3) + ' ' + y + 'q.4 -3 2 -4.6'; }).join('') +
    '" stroke="' + color + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
}
/**
 * @param {number} x
 * @param {number} y
 * @param {string} wing
 * @returns {string} A small butterfly.
 */
function bdButterfly(x, y, wing) {
  return '<g transform="translate(' + x + ' ' + y + ')" ' + BD_THIN + '><path d="M0 0c-3 -6 -9 -6 -8 -1c1 3 5 3 8 1zM0 0c3 -6 9 -6 8 -1c-1 3 -5 3 -8 1z" fill="' + wing + '"/>' +
    '<path d="M0 0c-2 3 -6 5 -5 1zM0 0c2 3 6 5 5 1z" fill="' + wing + '"/><path d="M0 -3v5" stroke-width="1.6"/></g>';
}

/**
 * @param {boolean} night
 * @returns {string}
 */
function bdMeadow(night) {
  return bdDaySky(night) +
    (night ? bdMoon(322, 34, 16) + bdStars([[60, 30, 5], [150, 22, 3], [260, 30, 4], [372, 62, 3], [110, 60, 1.3], [210, 50, 1.2], [36, 70, 1.2]])
      : bdSun(326, 46) + bdCloud(84, 48, 1.1) + bdCloud(254, 62, 0.7)) +
    '<path d="M-10 118Q60 82 140 104T280 96T410 104V170H-10z" fill="' + (night ? '#4f7a63' : '#b5e0a5') + '" ' + BD_LINE + '/>' +
    bdTree(64, 102, 0.9, night) + bdTree(356, 104, 0.7, night) + bdTree(374, 108, 0.5, night) +
    '<path d="M-10 136Q90 108 200 128T410 122V170H-10z" fill="' + (night ? '#3f6a55' : '#93cf85') + '" ' + BD_LINE + '/>' +
    bdTufts([[120, 112], [300, 104], [44, 140], [330, 140], [262, 134]], night ? '#2f5747' : '#6fb565') +
    bdFlower(318, 128, night ? '#c9c4d6' : '#c7b2ff') + bdFlower(96, 136, night ? '#c98aa0' : '#ffd45e') +
    bdFlower(298, 146, night ? '#c98aa0' : '#ffb3c7') + bdFlower(352, 136, night ? '#c9c4d6' : '#fff') + bdFlower(250, 112, night ? '#c9c4d6' : '#fff') +
    (night ? bdGlows([[280, 116], [340, 104], [110, 112], [366, 132]]) : '');
}
/**
 * @param {boolean} night
 * @returns {string}
 */
function bdKitchen(night) {
  var wall = night ? '#cdbfb4' : '#fdf3e6', grout = night ? '#b9a99c' : '#efd9c2', curtain = night ? '#d897a8' : '#ffc4d2', fold = night ? '#bf7d90' : '#f4a3b7';
  /**
   * @param {number} x Outer edge.
   * @param {number} d 1 for the left curtain, -1 for the right.
   * @returns {string} A full curtain with folds, hanging past the sill.
   */
  function curtain_(x, d) {
    var w = 26, i = x + d * w;
    return '<path d="M' + x + ' 17H' + i + 'Q' + (i - d * 3) + ' 50 ' + (i + d * 2) + ' 88Q' + (x + d * 22) + ' 92 ' + (x + d * 15) + ' 88Q' + (x + d * 8) + ' 92 ' + x + ' 88z" fill="' + curtain + '" ' + BD_LINE + '/>' +
      '<path d="M' + (x + d * 10) + ' 20Q' + (x + d * 9) + ' 54 ' + (x + d * 8) + ' 86M' + (x + d * 20) + ' 20Q' + (x + d * 19) + ' 54 ' + (x + d * 20) + ' 86" stroke="' + fold + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  }
  return '<defs><pattern id="bdTile" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="' + wall + '"/>' +
    '<path d="M0 .5H20M.5 0V20" stroke="' + grout + '" stroke-width="1.4"/></pattern>' +
    '<clipPath id="bdPane"><rect x="268" y="22" width="80" height="56" rx="5"/></clipPath></defs>' +
    '<rect width="400" height="160" fill="url(#bdTile)"/>' +
    // a window on the right with the sky outside
    '<rect x="268" y="22" width="80" height="56" rx="5" fill="' + (night ? '#34356b' : '#bfe5f5') + '" ' + BD_LINE + '/>' +
    '<g clip-path="url(#bdPane)">' + (night ? bdMoon(316, 34, 8) + bdStars([[296, 36, 3], [300, 64, 1.2], [326, 66, 2.6]]) : bdCloud(312, 46, 0.55)) + '</g>' +
    '<path d="M308 22v56M268 50h80" ' + BD_LINE + ' fill="none"/>' +
    '<path d="M262 79h92" stroke="#c99566" stroke-width="5" stroke-linecap="round"/>' +
    // full curtains either side and the rod
    curtain_(254, 1) + curtain_(362, -1) +
    '<path d="M248 16h120" stroke="#5b4239" stroke-width="2.6" stroke-linecap="round"/><circle cx="248" cy="16" r="3" fill="#c99566" ' + BD_THIN + '/><circle cx="368" cy="16" r="3" fill="#c99566" ' + BD_THIN + '/>' +
    // an empty shelf on the left
    '<path d="M42 64h88" stroke="#c99566" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M52 66l6 8M120 66l-6 8" stroke="#c99566" stroke-width="3" stroke-linecap="round"/>' +
    // a little herb pot on the sill
    '<path d="M293 77q-1 -9 -5 -12M295 77q1 -10 6 -12M294 77v-12" stroke="#6fb565" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M287 70h14l-2 8h-10z" fill="#e8a98a" ' + BD_THIN + '/>' +
    // the counter top along the floor
    '<rect x="-10" y="128" width="420" height="40" fill="' + (night ? '#c7a07a' : '#e9bf8f') + '" ' + BD_LINE + '/>' +
    '<path d="M-10 136H410" stroke="#d6a574" stroke-width="2"/><path d="M60 140v28M170 140v28M280 140v28M380 140v28" stroke="#d6a574" stroke-width="1.6"/>' +
    '<path d="M-10 130.4H410" stroke="#fff" stroke-width="1.4" opacity=".45"/>' +
    '<g fill="#fff4e4" ' + BD_THIN + '><circle cx="115" cy="146" r="2.4"/><circle cx="225" cy="146" r="2.4"/><circle cx="330" cy="146" r="2.4"/></g>';
}
/**
 * @returns {string}
 */
function bdStarry() {
  return bdSky('#2e2f63', '#5b5294') + bdMoon(86, 30, 17) +
    bdStars([[170, 30, 5], [300, 44, 6], [248, 20, 1.4], [352, 22, 3], [130, 64, 1.3], [372, 78, 1.3]]) +
    '<path d="M-10 124Q70 98 150 116T300 108T410 116V170H-10z" fill="#3f4579" ' + BD_LINE + '/>' +
    '<path d="M-10 140Q100 120 210 136T410 132V170H-10z" fill="#4c5a8a" ' + BD_LINE + '/>';
}
/**
 * @param {boolean} night
 * @returns {string}
 */
function bdFarm(night) {
  var red = night ? '#a8525a' : '#e0717a', trim = night ? '#d9cfc6' : '#fff8ef', wood = night ? '#a98466' : '#e3b98c';
  var fence = '';
  [36, 70, 104].forEach(function (x) { fence += '<rect x="' + x + '" y="104" width="7" height="30" rx="2" fill="' + wood + '" ' + BD_THIN + '/>'; });
  return bdDaySky(night) +
    (night ? bdMoon(196, 24, 13) + bdStars([[60, 26, 4.5], [130, 40, 3], [250, 20, 3], [32, 60, 1.2], [160, 64, 1.2], [370, 22, 3]]) : bdSun(70, 40) + bdCloud(184, 36, 0.8)) +
    '<path d="M-10 122Q120 104 250 118T410 112V170H-10z" fill="' + (night ? '#4f7a63' : '#b5e0a5') + '" ' + BD_LINE + '/>' +
    // a barn on the right
    '<path d="M270 128V78L304 52L338 78V128z" fill="' + red + '" ' + BD_LINE + '/>' +
    '<path d="M264 82L304 48L344 82" fill="none" stroke="' + trim + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M264 82L304 48L344 82" fill="none" stroke="#5b4239" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>' +
    '<rect x="288" y="98" width="32" height="30" fill="' + red + '" stroke="' + trim + '" stroke-width="3"/><path d="M289 99l30 28M319 99l-30 28" stroke="' + trim + '" stroke-width="2.4"/>' +
    '<rect x="296" y="66" width="16" height="14" rx="2" fill="' + (night ? '#ffe28a' : '#fff1c9') + '" ' + BD_LINE + '/>' +
    (night ? '<circle cx="304" cy="73" r="14" fill="#ffe28a" opacity=".25"/>' : '') +
    // a silo and a hay bale
    '<rect x="346" y="70" width="20" height="58" fill="' + (night ? '#9aa3b4' : '#cfd8e6') + '" ' + BD_LINE + '/><path d="M346 70a10 10 0 0 1 20 0" fill="' + red + '" ' + BD_LINE + '/>' +
    '<rect x="236" y="114" width="26" height="16" rx="4" fill="' + (night ? '#c9a95c' : '#f2d27a') + '" ' + BD_LINE + '/><path d="M242 117v10M249 117v10M256 117v10" stroke="#c9a14a" stroke-width="1.2"/>' +
    bdTree(150, 112, 0.75, night) + bdTree(214, 106, 0.55, night) +
    // a fence on the left, behind the receipt
    fence + '<rect x="27" y="109.6" width="92" height="5" rx="2.5" fill="' + wood + '" ' + BD_THIN + '/><rect x="27" y="121.6" width="92" height="5" rx="2.5" fill="' + wood + '" ' + BD_THIN + '/>' +
    '<path d="M-10 138Q100 128 200 136T410 134V170H-10z" fill="' + (night ? '#3f6a55' : '#93cf85') + '" ' + BD_LINE + '/>' +
    bdTufts([[160, 146], [252, 144], [338, 146]], night ? '#2f5747' : '#6fb565') +
    (night ? bdGlows([[118, 92], [236, 92], [370, 140]]) : bdFlower(214, 146, '#fff') + bdFlower(366, 148, '#ffb3c7') + bdButterfly(232, 78, '#ffc1d4'));
}
/**
 * @param {boolean} night
 * @returns {string}
 */
function bdAquarium(night) {
  var weed = night ? '#3f8a72' : '#6cc59a', weed2 = night ? '#357a6a' : '#58b48c';
  return bdSky(night ? '#1b2f5c' : '#7fd3ec', night ? '#25507a' : '#c7eef3') +
    // light rays from the top
    '<path d="M60 0L90 0L140 160H90zM210 0L232 0L262 160H226zM310 0L340 0L380 160H340z" fill="#fff" opacity="' + (night ? '.05' : '.18') + '"/>' +
    // seaweed
    '<path d="M44 140Q36 116 46 100Q56 84 46 62Q60 80 54 100Q48 120 58 140z" fill="' + weed + '" ' + BD_LINE + '/>' +
    '<path d="M342 140Q332 118 342 102Q352 86 344 70Q358 86 352 104Q346 122 356 140z" fill="' + weed2 + '" ' + BD_LINE + '/>' +
    '<path d="M362 140Q358 124 366 112Q372 102 368 92Q380 104 374 118Q370 130 376 140z" fill="' + weed + '" ' + BD_LINE + '/>' +
    // fish
    bdSchool(night) +
    // bubbles
    bdBubble(64, 54, 4) + bdBubble(70, 38, 3) + bdBubble(62, 26, 2.2) + bdBubble(330, 40, 3.5) + bdBubble(336, 24, 2.4) +
    // a jellyfish, glowing at night
    (night ? '<circle cx="186" cy="34" r="16" fill="#f5c4ff" opacity=".18"/>' : '') +
    '<path d="M178 38q-2 6 1 12M186 38q-2 7 1 14M194 38q2 6 -1 12" stroke="' + (night ? '#efc6ff' : '#e9a6d8') + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M174 36a12 11 0 0 1 24 0q-3 3 -6 0q-3 3 -6 0q-3 3 -6 0q-3 3 -6 0z" fill="' + (night ? '#efc6ff' : '#ffc9ec') + '" ' + BD_THIN + '/>' +
    // sand, pebbles and a shell
    '<path d="M-10 136Q100 126 200 134T410 130V170H-10z" fill="' + (night ? '#b8a27e' : '#f3dfae') + '" ' + BD_LINE + '/>' +
    '<ellipse cx="300" cy="146" rx="7" ry="4.5" fill="' + (night ? '#8f8aa6' : '#c9c3dc') + '" ' + BD_THIN + '/><ellipse cx="312" cy="150" rx="5" ry="3.5" fill="' + (night ? '#a37f86' : '#f2b8c2') + '" ' + BD_THIN + '/>' +
    '<g fill="' + (night ? '#a08a68' : '#e3c88a') + '"><circle cx="230" cy="150" r="1"/><circle cx="262" cy="154" r="1"/><circle cx="284" cy="148" r="1"/><circle cx="340" cy="154" r="1"/><circle cx="388" cy="146" r="1"/></g>' +
    '<path d="M358 150q0-10 9-10q9 0 9 10z" fill="' + (night ? '#c9a0a8' : '#ffd1da') + '" ' + BD_THIN + '/><path d="M367 141v9M362 143l2 7M372 143l-2 7" stroke="#5b4239" stroke-width=".9"/>';
}
/**
 * @param {boolean} night
 * @returns {string} A round, chubby palm tree: a ringed trunk, puffy leaves and three coconuts.
 */
function bdPalm(night) {
  var leaf = night ? '#3f8a62' : '#7bd29a', vein = night ? '#2f6e4e' : '#55b67a', bark = night ? '#a07a58' : '#d9a66f';
  var cx = 338, cy = 80, leaves = '';
  // leaves drawn from the crown: [shape, vein]; the side ones droop and curl at the tips
  [['M0 0C-2 -12 6 -24 14 -27C14 -16 8 -6 0 0z', 'M2 -3Q8 -14 12 -23'],
    ['M0 0C2 -12 -6 -24 -14 -27C-14 -16 -8 -6 0 0z', 'M-2 -3Q-8 -14 -12 -23'],
    ['M0 0C8 -16 32 -16 40 4C30 -2 14 2 0 0z', 'M4 -3Q20 -11 36 1'],
    ['M0 0C-8 -16 -32 -16 -40 4C-30 -2 -14 2 0 0z', 'M-4 -3Q-20 -11 -36 1'],
    ['M0 0C10 -6 28 0 30 16C22 8 10 4 0 0z', 'M4 -1Q18 0 27 12'],
    ['M0 0C-10 -6 -28 0 -30 16C-22 8 -10 4 0 0z', 'M-4 -1Q-18 0 -27 12']].forEach(function (l) {
    leaves += '<g transform="translate(' + cx + ' ' + cy + ')"><path d="' + l[0] + '" fill="' + leaf + '" ' + BD_LINE + '/>' +
      '<path d="' + l[1] + '" stroke="' + vein + '" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>';
  });
  return '<path d="M326 134Q328 106 334 82H343Q338 108 341 134z" fill="' + bark + '" ' + BD_LINE + '/>' +
    '<path d="M328 122q6 2 12 0M330 108q5 2 10 0M333 94q4 2 8 0" stroke="#5b4239" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".55"/>' +
    leaves +
    '<circle cx="333" cy="86" r="4.6" fill="#8a5a3a" ' + BD_THIN + '/><circle cx="343" cy="86" r="4.6" fill="#8a5a3a" ' + BD_THIN + '/><circle cx="338" cy="90" r="4.6" fill="#8a5a3a" ' + BD_THIN + '/>' +
    '<circle cx="331.6" cy="84.6" r="1.2" fill="#fff" opacity=".7"/><circle cx="341.6" cy="84.6" r="1.2" fill="#fff" opacity=".7"/><circle cx="336.6" cy="88.6" r="1.2" fill="#fff" opacity=".7"/>';
}
/**
 * @param {boolean} night
 * @returns {string}
 */
function bdBeach(night) {
  var sea = night ? '#2f4f86' : '#6cc6e0', sand = night ? '#b8a27e' : '#f6dfa8';
  return bdDaySky(night) +
    (night ? bdMoon(84, 30, 15) + bdStars([[150, 22, 4.5], [40, 60, 3], [212, 40, 1.3], [282, 26, 3], [120, 56, 1.2]]) : bdSun(84, 42) + bdCloud(276, 34, 0.9)) +
    // the sea, with a moon path at night
    '<path d="M-10 92H410V136H-10z" fill="' + sea + '" ' + BD_LINE + '/>' +
    (night ? '<path d="M74 96h24M68 104h34M76 112h20" stroke="#ffe9a8" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>'
      : '<path d="M40 104q8-4 16 0M150 100q8-4 16 0M250 112q8-4 16 0M330 104q8-4 16 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>') +
    // a little sailboat far out
    '<g ' + BD_THIN + '><path d="M222 90h22l-4 5h-14z" fill="' + (night ? '#a98466' : '#e3a073') + '"/><path d="M233 89V72l9 15z" fill="' + (night ? '#d9cfc6' : '#fff') + '"/><path d="M231 88V76l-6 11z" fill="' + (night ? '#c98aa0' : '#ffb3c7') + '"/></g>' +
    '<path d="M-10 92.6H410" stroke="#fff" stroke-width="1.4" opacity="' + (night ? '.15' : '.5') + '"/>' +
    // the waterline and sand
    '<path d="M-10 126Q20 120 50 126T110 126T170 126T230 126T290 126T350 126T410 126V170H-10z" fill="#fff" ' + BD_LINE + '/>' +
    '<path d="M-10 132Q60 126 140 132T290 130T410 131V170H-10z" fill="' + sand + '" ' + BD_LINE + '/>' +
    // a chubby palm tree on the right and a starfish
    bdPalm(night) +
    '<path d="M300 140l2.5 4.5 5 .5-3.8 3.2 1.2 5-4.9-2.6-4.9 2.6 1.2-5-3.8-3.2 5-.5z" fill="' + (night ? '#c98a6a' : '#ffa27a') + '" ' + BD_THIN + '/>' +
    '<path d="M362 152q0-9 8-9q8 0 8 9z" fill="' + (night ? '#c9a0a8' : '#ffd1da') + '" ' + BD_THIN + '/><path d="M370 144v8M365.5 146l2 6M374.5 146l-2 6" stroke="#5b4239" stroke-width=".8"/>' +
    '<g fill="' + (night ? '#a08a68' : '#e6c98a') + '"><circle cx="250" cy="146" r="1"/><circle cx="268" cy="152" r="1"/><circle cx="330" cy="150" r="1"/><circle cx="350" cy="142" r="1"/><circle cx="388" cy="148" r="1"/><circle cx="236" cy="154" r="1"/></g>';
}

/**
 * @param {number[][]} list [x, y, r] for each circle.
 * @param {string} fill
 * @returns {string} One puffy shape made of circles with a single outline round the whole of it (outlines first, fills on top).
 */
function bdPuff(list, fill) {
  var c = list.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '"/>'; }).join('');
  return '<g fill="#5b4239" stroke="#5b4239" stroke-width="3.2">' + c + '</g><g fill="' + fill + '">' + c + '</g>';
}
/**
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} fill
 * @returns {string} A five-petal blossom.
 */
function bdBlossom(x, y, r, fill) {
  var p = '';
  for (var i = 0; i < 5; i++) {
    var a = (i * 72 - 90) * Math.PI / 180;
    p += '<circle cx="' + (x + Math.cos(a) * r * 0.62).toFixed(1) + '" cy="' + (y + Math.sin(a) * r * 0.62).toFixed(1) + '" r="' + (r * 0.5).toFixed(1) + '"/>';
  }
  return '<g fill="' + fill + '" ' + BD_THIN + '>' + p + '</g><circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.28).toFixed(1) + '" fill="#ffd45e"/>';
}
/**
 * @param {number[][]} list [x, y, angle] for each petal.
 * @param {string} fill
 * @returns {string} Petals drifting down.
 */
function bdPetals(list, fill) {
  return list.map(function (p) {
    return '<path d="M0 -3.4C2.6 -2 2.6 2 0 3.4C-1 2 -.6 .6 0 0C-.6 -.6 -1 -2 0 -3.4z" transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + p[2] + ')" fill="' + fill + '" stroke="#5b4239" stroke-width=".7"/>';
  }).join('');
}

/**
 * @param {number} x Trunk foot.
 * @param {number} y
 * @param {number} s Size (1 is about 110 tall); lines keep their width at any size.
 * @param {boolean} night
 * @returns {string} A cherry tree in bloom: a curvy trunk forking into a puffy crown with deeper pink underneath, a light top,
 *   blossoms dotted over it and a ring of fallen petals round its foot.
 */
function bdCherry(x, y, s, night) {
  var bloom = night ? '#c98aa8' : '#ffc4d6', deep = night ? '#b77796' : '#ffb2c8', light = night ? '#d9a0b8' : '#ffdbe6', bark = night ? '#7d5f4a' : '#a9785a', flower = night ? '#e3b5c8' : '#fff4f7';
  function P(px, py) { return (x + px * s).toFixed(1) + ' ' + (y + py * s).toFixed(1); }
  function C(list) { return list.map(function (c) { return [+(x + c[0] * s).toFixed(1), +(y + c[1] * s).toFixed(1), +(c[2] * s).toFixed(1)]; }); }
  function dots(list, fill) { return C(list).map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + fill + '"/>'; }).join(''); }
  var ring = '<ellipse cx="' + x + '" cy="' + (y + 1) + '" rx="' + (22 * s).toFixed(1) + '" ry="' + (3.4 * s + 1).toFixed(1) + '" fill="' + bloom + '" opacity=".55"/>';
  var trunk = '<path d="M' + P(-9, 0) + 'Q' + P(-4, -2) + ' ' + P(-5, -12) + 'Q' + P(-4, -30) + ' ' + P(-11, -42) + 'L' + P(-20, -54) + 'L' + P(-14, -57) + 'L' + P(-4, -46) +
    'Q' + P(0, -42) + ' ' + P(3, -47) + 'L' + P(13, -60) + 'L' + P(18, -56) + 'L' + P(7, -42) + 'Q' + P(4, -28) + ' ' + P(6, -12) + 'Q' + P(6, -2) + ' ' + P(11, 0) + 'z" fill="' + bark + '" ' + BD_LINE + '/>' +
    '<path d="M' + P(-1, -8) + 'q' + (1.4 * s) + ' ' + (-6 * s) + ' 0 ' + (-12 * s) + 'M' + P(2, -26) + 'q' + (-1.2 * s) + ' ' + (-4 * s) + ' ' + (0.6 * s) + ' ' + (-8 * s) + '" stroke="#5b4239" stroke-width="1" fill="none" stroke-linecap="round" opacity=".45"/>';
  var crown = bdPuff(C([[-34, -70, 17], [-12, -88, 20], [14, -84, 19], [26, -64, 12], [0, -62, 16], [-24, -54, 11], [20, -50, 10], [-6, -72, 16], [10, -68, 14], [-18, -68, 13], [18, -60, 9], [-36, -56, 7], [6, -50, 9]]), bloom);
  var shade = dots([[-32, -59, 7], [-22, -55, 8], [-10, -54, 9], [2, -54, 9], [13, -54, 8], [22, -59, 6]], deep);
  var shine = night ? '' : dots([[-14, -94, 7], [-8, -96, 5]], light) +
    '<path d="M' + P(-22, -94) + 'a' + (12 * s).toFixed(1) + ' ' + (12 * s).toFixed(1) + ' 0 0 1 ' + (8 * s).toFixed(1) + ' ' + (-6 * s).toFixed(1) + '" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>';
  var flowers = '';
  if (s > 0.6) {
    C([[-22, -80, 5], [12, -96, 4.4], [24, -70, 4], [-6, -66, 3.8], [-38, -66, 3.6], [4, -80, 3.2], [-12, -98, 3], [16, -58, 3.2], [-26, -58, 3]]).forEach(function (f) { flowers += bdBlossom(f[0], f[1], f[2], flower); });
  } else {
    C([[-16, -84, 6], [10, -80, 5.4], [-2, -66, 5]]).forEach(function (f) { flowers += bdBlossom(f[0], f[1], f[2], flower); });
  }
  return ring + trunk + crown + shade + shine + flowers;
}

/**
 * @param {boolean} night
 * @returns {string} A cherry tree in full bloom on a soft spring hill, petals drifting; paper lanterns glow in its branches at night.
 */
function bdSakura(night) {
  var petal = night ? '#d9a0b8' : '#ffc4d6';
  var tree = bdCherry(334, 134, 1, night), small = bdCherry(62, 112, 0.42, night);
  var lanterns = '';
  if (night) {
    lanterns = '<path d="M300 84Q320 98 348 86" stroke="#5b4239" stroke-width="1.1" fill="none"/>';
    [[306, 90, '#ffb37a'], [322, 94, '#ff9fb5'], [340, 91, '#ffe28a']].forEach(function (l) {
      lanterns += '<circle cx="' + l[0] + '" cy="' + (l[1] + 6) + '" r="10" fill="' + l[2] + '" opacity=".28"/>' +
        '<path d="M' + l[0] + ' ' + l[1] + 'v2" stroke="#5b4239" stroke-width="1.1"/>' +
        '<rect x="' + (l[0] - 4.4) + '" y="' + (l[1] + 2) + '" width="8.8" height="9" rx="3.4" fill="' + l[2] + '" ' + BD_THIN + '/>' +
        '<path d="M' + (l[0] - 3) + ' ' + (l[1] + 2.4) + 'h6M' + (l[0] - 3) + ' ' + (l[1] + 10.6) + 'h6" stroke="#5b4239" stroke-width="1.4" stroke-linecap="round"/>';
    });
  }
  return (night ? bdDaySky(true) : bdSky('#bfe3f5', '#ffeef2')) +
    (night ? bdMoon(180, 30, 13) + bdStars([[110, 24, 4], [240, 40, 3], [60, 44, 1.2], [270, 20, 1.3]]) : bdCloud(150, 40, 0.9) + bdCloud(246, 30, 0.6)) +
    '<path d="M-10 116Q80 96 180 110T410 104V170H-10z" fill="' + (night ? '#4f7a63' : '#c4e6b0') + '" ' + BD_LINE + '/>' +
    small + tree + lanterns +
    '<path d="M-10 136Q100 120 210 132T410 128V170H-10z" fill="' + (night ? '#3f6a55' : '#a6d894') + '" ' + BD_LINE + '/>' +
    bdPetals([[110, 60, 20], [214, 52, -30], [262, 78, 50], [280, 112, -10], [372, 114, 70], [236, 138, 30], [300, 146, -40], [356, 150, 10], [96, 132, 60]], petal) +
    (night ? bdGlows([[150, 104], [262, 120]]) : bdFlower(270, 146, '#fff') + bdFlower(352, 140, '#ffb3c7'));
}
/**
 * @param {number} x Trunk foot.
 * @param {number} y
 * @param {number} s Size (1 is about 50 tall).
 * @param {boolean} night
 * @returns {string} A round-tipped pine with snow on each tier.
 */
function bdPine(x, y, s, night) {
  var g = night ? '#3d6b5c' : '#7cbf8e', snow = night ? '#dfe6f2' : '#fff';
  var tiers = [[-18, -6, -22], [-15, -20, -36], [-11, -33, -48]], out = '<path d="M-3 0V-8H3V0z" fill="' + (night ? '#7d5f4a' : '#b98563') + '" ' + BD_LINE + '/>';
  tiers.forEach(function (t) {
    var w = -t[0], b = t[1], top = t[2];
    out += '<path d="M' + (-w) + ' ' + b + 'Q0 ' + (b + 4) + ' ' + w + ' ' + b + 'L2 ' + (top + 1) + 'Q0 ' + (top - 1) + ' -2 ' + (top + 1) + 'z" fill="' + g + '" ' + BD_LINE + '/>' +
      '<path d="M' + (-w * 0.45) + ' ' + (top + (b - top) * 0.5) + 'q' + (w * 0.15) + ' 3 ' + (w * 0.3) + ' 0q' + (w * 0.15) + ' 3 ' + (w * 0.3) + ' 0q' + (w * 0.15) + ' 3 ' + (w * 0.3) + ' 0L2 ' + (top + 1) + 'Q0 ' + (top - 1) + ' -2 ' + (top + 1) + 'z" fill="' + snow + '" ' + BD_THIN + '/>';
  });
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + out + '</g>';
}
/**
 * @param {number[][]} list [x, y, size] for each flake: big ones are six-armed, small ones dots.
 * @param {boolean} night
 * @returns {string} Falling snow.
 */
function bdFlakes(list, night) {
  var c = night ? '#e8eefa' : '#fff';
  return list.map(function (f) {
    if (f[2] < 2) return '<circle cx="' + f[0] + '" cy="' + f[1] + '" r="' + (f[2] + 0.4) + '" fill="' + c + '" stroke="' + (night ? 'none' : '#b9d4e8') + '" stroke-width=".6"/>';
    var d = '';
    for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3, dx = Math.cos(a) * f[2], dy = Math.sin(a) * f[2]; d += 'M' + (f[0] - dx).toFixed(1) + ' ' + (f[1] - dy).toFixed(1) + 'L' + (f[0] + dx).toFixed(1) + ' ' + (f[1] + dy).toFixed(1); }
    return '<path d="' + d + '" stroke="' + (night ? '#e8eefa' : '#a9cbe6') + '" stroke-width="1.4" stroke-linecap="round"/>';
  }).join('');
}
/**
 * @param {boolean} night
 * @returns {string} Snowy hills with frosted pines, a snowman in a pink scarf and snow drifting down.
 */
function bdSnow(night) {
  var snow = night ? '#c9d3e6' : '#f6fafd', snow2 = night ? '#b3bfd8' : '#e6f0f8', shade = night ? '#a3b0cc' : '#d3e3f0';
  var hat = night ? '#8fa9c9' : '#a9cbe6', brim = night ? '#b3c6dd' : '#d3e5f3', scarf = night ? '#d98aa0' : '#ff9fb5', stick = night ? '#7d5f4a' : '#a9785a';
  // the snowman: a shaded snowball body and head (a blue crescent low on the right of each), a beanie with a pompom,
  // a scarf, twig arms, a carrot nose and a little :3 smile, standing in a drift
  var man = '<defs><clipPath id="bdSnowman"><circle cx="336" cy="120" r="15"/><circle cx="336" cy="96" r="11"/></clipPath></defs>' +
    '<path d="M323 113L309 104M349 113L363 104" stroke="#5b4239" stroke-width="3.8" stroke-linecap="round"/><path d="M323 113L309 104M349 113L363 104" stroke="' + stick + '" stroke-width="1.9" stroke-linecap="round"/>' +
    '<g clip-path="url(#bdSnowman)"><rect x="318" y="82" width="36" height="56" fill="' + shade + '"/>' +
    '<circle cx="333" cy="116.6" r="15" fill="' + snow + '"/><circle cx="334" cy="93.6" r="11" fill="' + snow + '"/></g>' +
    '<g fill="none" ' + BD_LINE + '><circle cx="336" cy="120" r="15"/><circle cx="336" cy="96" r="11"/></g>' +
    '<g fill="#5b4239"><circle cx="336" cy="115" r="1.7"/><circle cx="336" cy="122" r="1.7"/></g>' +
    '<path d="M312 137Q316 131 324 132Q330 129.6 336 130.6Q343 129.4 348 131.8Q356 131 360 137z" fill="' + snow + '" ' + BD_LINE + '/>' +
    '<path d="M323.8 101.4Q336 107.4 348.2 101.4L348.8 107.6Q336 114 323.2 107.6z" fill="' + scarf + '" ' + BD_THIN + '/>' +
    '<path d="M340.6 109.4L344.2 121.6L339.4 122.4L337.4 110.4z" fill="' + scarf + '" ' + BD_THIN + '/>' +
    '<g fill="#5b4239"><ellipse cx="331.6" cy="94" rx="1.5" ry="1.8"/><ellipse cx="340.4" cy="94" rx="1.5" ry="1.8"/></g><g fill="#fff"><circle cx="331.1" cy="93.3" r=".55"/><circle cx="339.9" cy="93.3" r=".55"/></g>' +
    '<ellipse cx="328.2" cy="98.4" rx="2.1" ry="1.3" fill="#ff9fb8" opacity=".75"/><ellipse cx="343.8" cy="98.4" rx="2.1" ry="1.3" fill="#ff9fb8" opacity=".75"/>' +
    '<path d="M336 96.8L343.4 98.8L336 100.2z" fill="#ffa24d" ' + BD_THIN + '/>' +
    '<path d="M333.4 101.8q1.3 1.1 2.6 0q1.3 1.1 2.6 0" stroke="#5b4239" stroke-width="1" fill="none" stroke-linecap="round"/>' +
    '<path d="M326 89Q325.6 76.6 336 76.6Q346.4 76.6 346 89z" fill="' + hat + '" ' + BD_LINE + '/>' +
    '<rect x="324.6" y="86" width="22.8" height="5" rx="2.5" fill="' + brim + '" ' + BD_THIN + '/>' +
    '<circle cx="336" cy="74.6" r="3.6" fill="#fff" ' + BD_THIN + '/>';
  return (night ? bdSky('#2b3563', '#56608f') : bdSky('#bfe0f2', '#eef6fa')) +
    (night ? bdMoon(80, 30, 14) + bdStars([[170, 24, 4], [250, 36, 3], [130, 50, 1.2], [300, 22, 1.3]]) : bdCloud(96, 40, 0.8, '#fbfdff') + bdCloud(222, 30, 0.6, '#fbfdff')) +
    '<path d="M-10 114Q70 92 160 106T300 98T410 104V170H-10z" fill="' + snow2 + '" ' + BD_LINE + '/>' +
    bdPine(52, 112, 0.9, night) + bdPine(78, 108, 0.6, night) + bdPine(278, 104, 0.55, night) + bdPine(362, 110, 0.75, night) +
    '<path d="M-10 132Q100 116 210 128T410 124V170H-10z" fill="' + snow + '" ' + BD_LINE + '/>' +
    '<path d="M40 142q30 -6 60 0M230 146q40 -6 80 0" stroke="' + shade + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<g transform="translate(-16 0)">' + man + '</g>' +
    bdFlakes([[36, 30, 3.4], [130, 70, 1.4], [190, 26, 1.2], [246, 62, 3], [290, 40, 1.4], [370, 52, 3.4], [108, 100, 1.2], [222, 90, 1.4], [384, 92, 1.2], [160, 128, 3], [266, 122, 1.2]], night);
}

// `night: false` for pictures that look the same at any time.
var BACKDROPS = [
  { id: 'none', name: 'None', draw: null },
  { id: 'meadow', name: 'Meadow', draw: bdMeadow },
  { id: 'kitchen', name: 'Kitchen', draw: bdKitchen },
  { id: 'farm', name: 'Farm', draw: bdFarm },
  { id: 'beach', name: 'Beach', draw: bdBeach },
  { id: 'aquarium', name: 'Aquarium', draw: bdAquarium },
  { id: 'night', name: 'Starry night', draw: bdStarry, night: false },
  { id: 'sakura', name: 'Cherry blossom', draw: bdSakura },
  { id: 'snow', name: 'Snowy hills', draw: bdSnow }
];
