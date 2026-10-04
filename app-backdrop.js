// Backgrounds behind the pet: a picture drawn behind the stage, picked in Options, with a night version.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
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
 * @param {boolean} night
 * @returns {string}
 */
function bdMeadow(night) {
  return bdDaySky(night) +
    (night ? bdMoon(322, 34, 16) + bdStars([[60, 30, 5], [150, 22, 3], [260, 30, 4], [372, 62, 3], [110, 60, 1.3], [210, 50, 1.2], [36, 70, 1.2]])
      : bdSun(326, 46) + bdCloud(84, 48, 1.1) + bdCloud(254, 62, 0.7)) +
    '<path d="M-10 118Q60 82 140 104T280 96T410 104V170H-10z" fill="' + (night ? '#4f7a63' : '#b5e0a5') + '" ' + BD_LINE + '/>' +
    '<path d="M-10 136Q90 108 200 128T410 122V170H-10z" fill="' + (night ? '#3f6a55' : '#93cf85') + '" ' + BD_LINE + '/>' +
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
    // the counter top along the floor
    '<rect x="-10" y="128" width="420" height="40" fill="' + (night ? '#c7a07a' : '#e9bf8f') + '" ' + BD_LINE + '/>' +
    '<path d="M-10 136H410" stroke="#d6a574" stroke-width="2"/><path d="M60 140v28M170 140v28M280 140v28M380 140v28" stroke="#d6a574" stroke-width="1.6"/>';
}
/**
 * @returns {string}
 */
function bdStarry() {
  return bdSky('#2e2f63', '#5b5294') + bdMoon(86, 30, 17) +
    bdStars([[150, 30, 6], [240, 22, 4], [300, 48, 7], [352, 22, 4], [48, 70, 4], [200, 62, 3], [372, 80, 3.5], [128, 62, 1.4], [270, 80, 1.2], [330, 100, 1.4], [34, 36, 1.2]]) +
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
    // a fence on the left, behind the receipt
    fence + '<path d="M28 112H118M28 124H118" stroke="' + wood + '" stroke-width="4.5" stroke-linecap="round"/>' +
    '<path d="M-10 138Q100 128 200 136T410 134V170H-10z" fill="' + (night ? '#3f6a55' : '#93cf85') + '" ' + BD_LINE + '/>' +
    (night ? bdGlows([[150, 110], [230, 98], [370, 140]]) : bdFlower(214, 146, '#fff') + bdFlower(366, 148, '#ffb3c7'));
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
    bdFish(110, 40, 1, night ? '#d98a6a' : '#ffa27a', 1) + bdFish(300, 56, 0.8, night ? '#c9b46a' : '#ffd86b', -1) + bdFish(268, 28, 0.6, night ? '#c98aa0' : '#ffb3c7', -1) +
    // bubbles
    bdBubble(64, 54, 4) + bdBubble(70, 38, 3) + bdBubble(62, 26, 2.2) + bdBubble(330, 40, 3.5) + bdBubble(336, 24, 2.4) +
    // a jellyfish, glowing at night
    (night ? '<circle cx="186" cy="34" r="16" fill="#f5c4ff" opacity=".18"/>' : '') +
    '<path d="M178 38q-2 6 1 12M186 38q-2 7 1 14M194 38q2 6 -1 12" stroke="' + (night ? '#efc6ff' : '#e9a6d8') + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M174 36a12 11 0 0 1 24 0q-3 3 -6 0q-3 3 -6 0q-3 3 -6 0q-3 3 -6 0z" fill="' + (night ? '#efc6ff' : '#ffc9ec') + '" ' + BD_THIN + '/>' +
    // sand, pebbles and a shell
    '<path d="M-10 136Q100 126 200 134T410 130V170H-10z" fill="' + (night ? '#b8a27e' : '#f3dfae') + '" ' + BD_LINE + '/>' +
    '<ellipse cx="300" cy="146" rx="7" ry="4.5" fill="' + (night ? '#8f8aa6' : '#c9c3dc') + '" ' + BD_THIN + '/><ellipse cx="312" cy="150" rx="5" ry="3.5" fill="' + (night ? '#a37f86' : '#f2b8c2') + '" ' + BD_THIN + '/>' +
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
    // the waterline and sand
    '<path d="M-10 126Q20 120 50 126T110 126T170 126T230 126T290 126T350 126T410 126V170H-10z" fill="#fff" ' + BD_LINE + '/>' +
    '<path d="M-10 132Q60 126 140 132T290 130T410 131V170H-10z" fill="' + sand + '" ' + BD_LINE + '/>' +
    // a chubby palm tree on the right and a starfish
    bdPalm(night) +
    '<path d="M300 140l2.5 4.5 5 .5-3.8 3.2 1.2 5-4.9-2.6-4.9 2.6 1.2-5-3.8-3.2 5-.5z" fill="' + (night ? '#c98a6a' : '#ffa27a') + '" ' + BD_THIN + '/>';
}

// `night: false` for pictures that look the same at any time.
var BACKDROPS = [
  { id: 'none', name: 'None', draw: null },
  { id: 'meadow', name: 'Meadow', draw: bdMeadow },
  { id: 'kitchen', name: 'Kitchen', draw: bdKitchen },
  { id: 'farm', name: 'Farm', draw: bdFarm },
  { id: 'beach', name: 'Beach', draw: bdBeach },
  { id: 'aquarium', name: 'Aquarium', draw: bdAquarium },
  { id: 'night', name: 'Starry night', draw: bdStarry, night: false }
];

var backdropEl = document.createElement('div');
backdropEl.className = 'backdrop';
backdropEl.setAttribute('aria-hidden', 'true');
$('room').before(backdropEl);
var backdropNight = null;
/**
 * Draws a background behind the pet, in its night version from 10 pm to 7 am.
 * @param {string} id One of BACKDROPS.
 */
function applyBackdrop(id) {
  var bd = BACKDROPS.filter(function (b) { return b.id === id; })[0] || BACKDROPS[0];
  backdropNight = L.isNight(petNow());
  backdropEl.hidden = !bd.draw;
  backdropEl.dataset.bd = bd.id;
  backdropEl.classList.toggle('bd-dark', !!bd.draw && (backdropNight || bd.night === false));
  backdropEl.innerHTML = bd.draw ? '<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice">' + bd.draw(backdropNight) + '</svg>' : '';
}
/** Redraws the background if day turned to night or back (also used by the dev day/night switch). */
function refreshBackdrop() {
  if (L.isNight(petNow()) !== backdropNight) applyBackdrop(backdropEl.dataset.bd);
}
setInterval(refreshBackdrop, 60000);
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
