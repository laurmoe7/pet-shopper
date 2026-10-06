// Copies the OpenMoji SVGs the app uses into ./emoji, recoloring their black
// outlines to Nibble's soft cocoa brown and softening their colours (emoji-style.js) so they match the hand-drawn style.
// Usage: node tools/copy-emoji.js <path to openmoji package>/color/svg
const fs = require('fs');
const { restyle } = require('./emoji-style');
const path = require('path');
require('../foods.js');
require('../tasks.js');
require('../personalities.js');
const src = process.argv[2];
if (!src) { console.error('usage: node tools/copy-emoji.js <openmoji>/color/svg'); process.exit(1); }
const out = path.join(__dirname, '..', 'emoji');
const OUTLINE = '#5B4239';
// small fixes to single emoji, kept here so they survive a re-copy
const FIXES = {
  // the pretzel: drop the white fill behind the knot so its holes are see-through
  '1F968.svg': (svg) => closeOutline(svg.replace(/\s*<path fill="#fff(?:fff)?" d="[^"]*"\/>/i, '')),
  // the bacon: drop the white squiggle between the two slices (it shows as a white gap)
  '1F953.svg': (svg) => svg.replace(/\s*<path fill="none" stroke="#fff(?:fff)?"[^>]*\/>/i, '')
};
/** Draws the fill's own edge as a line too, where the outline has gaps, so no colour shows outside the line (the pretzel). */
function closeOutline(svg) {
  const fill = svg.match(/<g id="color">\s*<path fill="#[0-9a-f]{3,6}" d="([^"]*)"/i);
  return fill ? svg.replace(/(<g id="line">)/, '$1\n    <path fill="none" stroke="' + OUTLINE + '" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' + fill[1] + '"/>') : svg;
}
fs.mkdirSync(out, { recursive: true });
let missing = [];
// the foods, the tasks, the personalities' icons
// and the little pictures on the Pet page's tabs
const TAB_ICONS = ['🐾', '🎩', '👕', '👓', '👄', '🧣', '👟'];
const used = global.Foods.all.concat(global.Tasks.all, global.Personalities.map((p) => p.icon), TAB_ICONS);
for (const e of used) {
  const file = path.basename(global.Foods.emojiFile(e));
  const from = path.join(src, file);
  if (!fs.existsSync(from)) { missing.push(e + ' ' + file); continue; }
  let svg = fs.readFileSync(from, 'utf8').replace(/#000000\b|#000(?=["';\s])/gi, OUTLINE);
  if (FIXES[file]) svg = FIXES[file](svg);
  svg = restyle(svg);
  fs.writeFileSync(path.join(out, file), svg);
}
console.log('copied', used.length - missing.length, 'emojis');
if (missing.length) { console.error('missing:', missing.join(', ')); process.exit(1); }
