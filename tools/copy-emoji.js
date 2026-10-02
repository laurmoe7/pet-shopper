// Copies the OpenMoji SVGs the app uses into ./emoji.
// Usage: node tools/copy-emoji.js <path to openmoji package>/color/svg
const fs = require('fs');
const path = require('path');
require('../foods.js');
const src = process.argv[2];
if (!src) { console.error('usage: node tools/copy-emoji.js <openmoji>/color/svg'); process.exit(1); }
const out = path.join(__dirname, '..', 'emoji');
fs.mkdirSync(out, { recursive: true });
let missing = [];
for (const e of global.Foods.all) {
  const file = path.basename(global.Foods.emojiFile(e));
  const from = path.join(src, file);
  if (!fs.existsSync(from)) { missing.push(e + ' ' + file); continue; }
  fs.copyFileSync(from, path.join(out, file));
}
console.log('copied', global.Foods.all.length - missing.length, 'emojis');
if (missing.length) { console.error('missing:', missing.join(', ')); process.exit(1); }
