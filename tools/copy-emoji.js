// Copies the OpenMoji SVGs the app uses into ./emoji, recoloring their black
// outlines to Nibble's soft cocoa brown so they match the hand-drawn style.
// Usage: node tools/copy-emoji.js <path to openmoji package>/color/svg
const fs = require('fs');
const path = require('path');
require('../foods.js');
const src = process.argv[2];
if (!src) { console.error('usage: node tools/copy-emoji.js <openmoji>/color/svg'); process.exit(1); }
const out = path.join(__dirname, '..', 'emoji');
const OUTLINE = '#5B4239';
// small fixes to single emoji, kept here so they survive a re-copy
const FIXES = {
  // the pretzel: drop the white fill behind the knot so its holes are see-through
  '1F968.svg': (svg) => svg.replace(/\s*<path fill="#fff(?:fff)?" d="[^"]*"\/>/i, '')
};
fs.mkdirSync(out, { recursive: true });
let missing = [];
for (const e of global.Foods.all) {
  const file = path.basename(global.Foods.emojiFile(e));
  const from = path.join(src, file);
  if (!fs.existsSync(from)) { missing.push(e + ' ' + file); continue; }
  let svg = fs.readFileSync(from, 'utf8').replace(/#000000\b|#000(?=["';\s])/gi, OUTLINE);
  if (FIXES[file]) svg = FIXES[file](svg);
  fs.writeFileSync(path.join(out, file), svg);
}
console.log('copied', global.Foods.all.length - missing.length, 'emojis');
if (missing.length) { console.error('missing:', missing.join(', ')); process.exit(1); }
