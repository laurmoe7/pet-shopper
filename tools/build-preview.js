// Builds the single-file phone preview into preview/ (index.html + emoji/).
//   node tools/build-preview.js          build only
//   node tools/build-preview.js --bump   raise BUILD (app.js) and CACHE (sw.js) by one first
// Publish preview/index.html as the artifact. The emoji only need uploading
// the first time; republishing the page alone keeps them.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'preview');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const SCRIPTS = ['foods', 'tasks', 'logic', 'sync', 'achievements', 'wardrobe', 'decor', 'bonuses', 'recipe', 'personalities', 'skins', 'sounds',
  'app', 'app-pet', 'app-actions', 'app-petsheet', 'app-dress', 'app-closet', 'app-shoot', 'app-photo', 'app-room', 'app-goals', 'app-events', 'app-todo', 'app-calendar', 'app-stamps', 'app-personality', 'app-favourites', 'app-petting', 'app-treats', 'app-gift', 'app-profile', 'app-options', 'app-sync', 'app-account', 'app-desktop', 'app-anims', 'app-voice', 'app-recipe', 'backdrops', 'app-backdrop', 'app-idle', 'app-toy', 'app-bedtime', 'app-fade', 'app-select', 'app-start'];

if (process.argv.includes('--bump')) {
  const app = read('app.js');
  const n = Number(/var BUILD = '(\d+)'/.exec(app)[1]) + 1;
  fs.writeFileSync(path.join(root, 'app.js'), app.replace(/var BUILD = '\d+'/, "var BUILD = '" + n + "'"));
  fs.writeFileSync(path.join(root, 'sw.js'), read('sw.js').replace(/nibble-v\d+/, 'nibble-v' + n));
  console.log('Bumped to build ' + n);
}

const html = read('index.html');
const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/<script src="[^"]+"><\/script>\s*/g, '');
const inline = (s, tag) => s.replace(new RegExp('</' + tag, 'gi'), '<\\/' + tag);

const page = [
  "<title>Fumufumu</title>",
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kiwi+Maru:wght@500&family=M+PLUS+Rounded+1c:wght@500;700;800&display=swap">',
  '<style>' + inline(read('styles.css'), 'style') + '</style>',
  body,
  ...SCRIPTS.map((n) => '<script>' + inline(read(n + '.js'), 'script') + '</script>'),
  ''
].join('\n');

fs.mkdirSync(path.join(out, 'emoji'), { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), page);
let count = 0;
for (const f of fs.readdirSync(path.join(root, 'emoji'))) {
  if (f.endsWith('.svg')) { fs.copyFileSync(path.join(root, 'emoji', f), path.join(out, 'emoji', f)); count++; }
}
console.log('Built preview/index.html (' + Math.round(page.length / 1024) + ' KB) and ' + count + ' emoji');
