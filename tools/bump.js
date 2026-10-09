// Raises BUILD (app.js) and CACHE (sw.js) to the next number together and puts a heading with the given lines on top of CHANGELOG.md.
//   node tools/bump.js "One short line" "Another short line"
// (npm run bump -- "line"). Prints the new build number.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, t) => fs.writeFileSync(path.join(root, f), t);

const lines = process.argv.slice(2).filter(Boolean);
if (!lines.length) { console.error('Give at least one changelog line.'); process.exit(1); }
const app = read('app.js');
const n = Number(/var BUILD = '(\d+)'/.exec(app)[1]) + 1;
write('app.js', app.replace(/var BUILD = '\d+'/, "var BUILD = '" + n + "'"));
write('sw.js', read('sw.js').replace(/nibble-v\d+/, 'nibble-v' + n));
const log = read('CHANGELOG.md'), first = log.indexOf('## Build');
write('CHANGELOG.md', log.slice(0, first) + '## Build ' + n + '\n' + lines.map((l) => '- ' + l).join('\n') + '\n\n' + log.slice(first));
console.log('Build ' + n);
