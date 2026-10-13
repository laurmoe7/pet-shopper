// Builds the single-file phone preview into preview/ (index.html + emoji/ + fonts/).
//   node tools/build-preview.js          build only
//   node tools/build-preview.js --bump   raise BUILD (app.js) and CACHE (sw.js) by one first
// Publish preview/index.html as the artifact. The emoji and fonts only need uploading
// the first time; republishing the page alone keeps them.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'preview');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
// the scripts, in the order index.html loads them (the one list; sw.js SHELL must hold the same files, a test checks)
const SCRIPTS = [...read('index.html').matchAll(/<script src="([^"]+)\.js"><\/script>/g)].map((m) => m[1]);

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

// the head's own pieces: the loading card's style and the small inline scripts (the error keeper `Errors` and the boot script) that must run before everything else
const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
const headStyle = (/<style id="bootCss">[\s\S]*?<\/style>/.exec(head) || [''])[0];
const headScripts = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => '<script>' + inline(m[1], 'script') + '</script>').join('\n');

const page = [
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  "<title>Fumufumu</title>",
  headStyle,
  headScripts,
  '<style>' + inline(read('fonts.css') + read('styles.css'), 'style') + '</style>',
  body,
  ...SCRIPTS.map((n) => '<script>' + inline(read(n + '.js'), 'script') + '</script>'),
  ''
].join('\n');

fs.writeFileSync(path.join(out, 'index.html'), page);
const copy = (dir, ext) => {
  fs.mkdirSync(path.join(out, dir), { recursive: true });
  let count = 0;
  for (const f of fs.readdirSync(path.join(root, dir))) {
    if (f.endsWith(ext)) { fs.copyFileSync(path.join(root, dir, f), path.join(out, dir, f)); count++; }
  }
  return count;
};
console.log('Built preview/index.html (' + Math.round(page.length / 1024) + ' KB), ' + copy('emoji', '.svg') + ' emoji and ' + copy('fonts', '.woff2') + ' fonts');
