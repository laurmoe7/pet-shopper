// The colour style of the app's emoji. OpenMoji's colours are bright and glossy; Fumu's look is soft kraft board and
// cocoa-brown outlines, so every fill is made a little softer and creamier (less saturated, a touch lighter), while whites,
// the outline brown and very dark parts are left alone. Used by copy-emoji.js (the outlines are recoloured there).
const OUTLINE = '#5b4239';
const SAT = 0.92;     // keep this share of the colour's saturation
const LIFT = 0.13;    // move this share of the way to white
const WARM = 4;       // nudge the hue this many degrees toward orange (red-yellow), only for yellows to reds and blues/greens stay true

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, l];
}
function hslToHex([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
/** @returns {string} One hex colour in Fumu's softer style. */
function soften(hex) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (l > 0.96 || l < 0.2) return hex.toLowerCase();   // whites and the darkest browns/blacks stay as they are
  let nh = h;
  if (s > 0.25 && (h < 70 || h > 340)) nh = h < 70 ? h + WARM * (1 - h / 70) : h;   // reds and oranges lean a little toward yellow-orange
  return hslToHex([nh, s * SAT, l + (1 - l) * LIFT]);
}
/** @returns {string} An emoji SVG with every colour softened (the outline brown is kept exactly). */
function restyle(svg) {
  return svg.replace(/(fill|stroke)="(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})"/g, (m, attr, hex) =>
    hex.toLowerCase() === OUTLINE ? m : attr + '="' + soften(hex) + '"');
}
module.exports = { restyle, soften };
