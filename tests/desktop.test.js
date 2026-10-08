// Where the desktop window goes (desktop/place.js: plain functions, no Electron).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../desktop/place.js');

const SIZE = { width: 320, height: 300 };
const screen1 = { x: 0, y: 0, width: 1920, height: 1040 };      // the taskbar takes the rest
const screen2 = { x: 1920, y: 0, width: 1280, height: 1024 };

test('the first time the window sits at the bottom right of the main screen', () => {
  const b = P.startBounds(null, SIZE, [screen1], screen1);
  assert.deepEqual(b, { x: 1920 - 320 - P.MARGIN, y: 1040 - 300 - P.MARGIN / 2, width: 320, height: 300 });
  assert.deepEqual(P.startBounds({ x: 'left', y: NaN }, SIZE, [screen1], screen1), b);
});

test('a saved position is kept when it is on a screen', () => {
  assert.deepEqual(P.startBounds({ x: 2100, y: 400 }, SIZE, [screen1, screen2], screen1), { x: 2100, y: 400, width: 320, height: 300 });
});

test('a position on a screen that is gone comes back to the main screen', () => {
  const b = P.startBounds({ x: 2100, y: 400 }, SIZE, [screen1], screen1);
  assert.equal(b.x + b.width <= screen1.x + screen1.width, true);
  assert.equal(b.y + b.height <= screen1.y + screen1.height, true);
});

test('a window that is mostly off screen is brought back, one partly over the edge is kept', () => {
  assert.notEqual(P.startBounds({ x: 1900, y: 400 }, SIZE, [screen1], screen1).x, 1900);   // 20 of 320 pixels visible
  assert.notEqual(P.startBounds({ x: 1800, y: 400 }, SIZE, [screen1], screen1).x, 1800);   // 120 of 320: under half
  assert.equal(P.startBounds({ x: 1700, y: 400 }, SIZE, [screen1], screen1).x, 1700);      // 220 of 320 are visible
});

test('visibleFraction counts the part inside a screen', () => {
  assert.equal(P.visibleFraction({ x: 0, y: 0, width: 100, height: 100 }, screen1), 1);
  assert.equal(P.visibleFraction({ x: -50, y: 0, width: 100, height: 100 }, screen1), 0.5);
  assert.equal(P.visibleFraction({ x: 5000, y: 0, width: 100, height: 100 }, screen1), 0);
});

test('the list opens around the pet and stays on the screen', () => {
  const pet = { x: 1576, y: 716, width: 320, height: 300 };
  const l = P.listBounds(pet, screen1, { width: 440, height: 780 });
  assert.equal(l.width, 440);
  assert.equal(l.height, 780);
  assert.ok(l.x >= 0 && l.x + l.width <= 1920 && l.y >= 0 && l.y + l.height <= 1040);
  const small = P.listBounds(pet, { x: 0, y: 0, width: 400, height: 600 }, { width: 440, height: 780 });
  assert.deepEqual([small.width, small.height], [400, 600]);   // never bigger than the screen
});

test('carrying the window moves it by the pointer distance and never changes its size', () => {
  const b = P.dragBounds({ x: 100, y: 200, width: 320, height: 300 }, 15.4, -30.6);
  assert.deepEqual(b, { x: 115, y: 169, width: 320, height: 300 });
});

test('the desktop package lists the files it needs and the page script is wired into the app', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../desktop/package.json'), 'utf8'));
  for (const f of pkg.build.files) assert.ok(fs.existsSync(path.join(__dirname, '../desktop', f)), f);
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.includes('src="app-desktop.js"'));
  assert.ok(html.indexOf('app-desktop.js') < html.indexOf('app-start.js'));
});

test('size names turn into zoom factors and unknown names are normal size', () => {
  const place = require('../desktop/place.js');
  assert.equal(place.sizeFactor('small'), 0.8);
  assert.equal(place.sizeFactor('large'), 1.3);
  assert.equal(place.sizeFactor('huge'), 1);
  assert.equal(place.sizeFactor('toString'), 1);
});

test('a resized window keeps its bottom middle in place and stays on the screen', () => {
  const place = require('../desktop/place.js');
  const r = place.resizeKeepingBottom({ x: 1000, y: 700, width: 320, height: 250 }, { width: 416, height: 325 });
  assert.deepEqual(r, { x: 952, y: 625, width: 416, height: 325 });
  const area = { x: 0, y: 0, width: 1920, height: 1040 };
  assert.deepEqual(place.within({ x: 1800, y: 900, width: 416, height: 325 }, area), { x: 1504, y: 715, width: 416, height: 325 });
});

test('nudging and corners move the window inside the work area', () => {
  const place = require('../desktop/place.js');
  const area = { x: 0, y: 0, width: 1920, height: 1040 }, b = { x: 100, y: 100, width: 320, height: 250 };
  assert.deepEqual(place.nudge(b, 20, -20, area), { x: 120, y: 80, width: 320, height: 250 });
  assert.equal(place.nudge(b, -500, 0, area).x, 0);
  assert.equal(place.nudge({ x: 1600, y: 100, width: 320, height: 250 }, 200, 0, area).x, 1600);
  const br = place.corner(b, area, 'br'), tl = place.corner(b, area, 'tl');
  assert.equal(br.x + br.width + place.MARGIN, 1920);
  assert.ok(br.y + br.height <= 1040 && br.y > 700);
  assert.deepEqual([tl.x, tl.y > 0], [place.MARGIN, true]);
});

test('a walk stops at the edge of the screen and keeps its height', () => {
  const place = require('../desktop/place.js');
  const area = { x: 0, y: 0, width: 1920, height: 1040 }, b = { x: 1500, y: 780, width: 320, height: 250 };
  assert.deepEqual(place.walkEnd(b, area, 200), { x: 1600, y: 780, width: 320, height: 250 });
  assert.equal(place.walkEnd(b, area, 900).x, 1600);
  assert.equal(place.walkEnd(b, area, -2000).x, 0);
});

test('peeking goes to the nearest side that has no other screen beside it', () => {
  const place = require('../desktop/place.js');
  const one = [{ x: 0, y: 0, width: 1920, height: 1080 }];
  const b = { x: 1500, y: 780, width: 320, height: 250 };
  const right = place.peekSpot(b, one);
  assert.equal(right.edge, 'right');
  assert.equal(right.bounds.x + right.bounds.width / 2, 1920);   // half of him is past the edge
  assert.equal(right.bounds.y, 780);
  assert.equal(place.peekSpot({ x: 100, y: 780, width: 320, height: 250 }, one).edge, 'left');
  // a second screen to the right: he must not show up on it, so he goes left
  const two = [{ x: 0, y: 0, width: 1920, height: 1080 }, { x: 1920, y: 0, width: 1920, height: 1080 }];
  assert.equal(place.peekSpot(b, two).edge, 'left');
  // screens on both sides: nowhere to peek
  const three = [{ x: -1920, y: 0, width: 1920, height: 1080 }].concat(two);
  assert.equal(place.peekSpot(b, three), null);
  assert.equal(place.peekSpot({ x: 9000, y: 0, width: 320, height: 250 }, one), null);
});

test('a glide eases from start to end and lands exactly', () => {
  const place = require('../desktop/place.js');
  const a = { x: 0, y: 500, width: 320, height: 250 }, z = { x: 400, y: 500, width: 320, height: 250 };
  assert.equal(place.tweenAt(a, z, 0).x, 0);
  assert.equal(place.tweenAt(a, z, 1).x, 400);
  assert.equal(place.tweenAt(a, z, 0.5).x, 200);
  assert.ok(place.tweenAt(a, z, 0.1).x < 40 && place.tweenAt(a, z, 0.9).x > 360);   // slow at both ends
});

// ---------- screens that change, idle, and sitting on other windows ----------
const main1 = { x: 0, y: 0, width: 1920, height: 1040 };
const side = { x: 1920, y: 0, width: 1280, height: 1024 };

test('when his screen is unplugged he goes to the main screen, and back when it returns', () => {
  const size = { width: 320, height: 250 }, onSide = { x: 2400, y: 500, width: 320, height: 250 };
  const gone = P.afterScreensChange(onSide, { x: 2400, y: 500 }, size, [main1], main1, false);
  assert.equal(gone.displaced, true);
  assert.deepEqual(gone.bounds, P.defaultBounds(main1, size));
  const back = P.afterScreensChange(gone.bounds, { x: 2400, y: 500 }, size, [main1, side], main1, true);
  assert.deepEqual(back, { bounds: onSide, displaced: false });
  const still = P.afterScreensChange(gone.bounds, { x: 2400, y: 500 }, size, [main1], main1, true);
  assert.equal(still.displaced, true);
});

test('a window that still fits on a screen stays, and is pulled in when the screen shrank', () => {
  const size = { width: 320, height: 250 };
  assert.deepEqual(P.afterScreensChange({ x: 100, y: 100, width: 320, height: 250 }, { x: 100, y: 100 }, size, [main1], main1, false).bounds, { x: 100, y: 100, width: 320, height: 250 });
  const shrunk = P.afterScreensChange({ x: 1700, y: 900, width: 320, height: 250 }, { x: 1700, y: 900 }, size, [{ x: 0, y: 0, width: 1920, height: 1000 }], main1, false);
  assert.equal(shrunk.displaced, false);
  assert.equal(shrunk.bounds.y + shrunk.bounds.height <= 1000, true);
});

test('idle starts after the set time and ends at the first input', () => {
  assert.equal(P.idleStep(false, 100, 240), false);
  assert.equal(P.idleStep(false, 240, 240), true);
  assert.equal(P.idleStep(true, 400, 240), true);
  assert.equal(P.idleStep(true, 1, 240), false);
});

const win = (id, x, y, width, height) => ({ id, x, y, width, height });

test('perches are the top edges of windows, minus what lies under a window in front', () => {
  const front = win('a', 300, 300, 400, 400), back = win('b', 160, 400, 1000, 500);
  // back's top edge is at y 400, which lies behind the front window from x 300 to 700
  const p = P.perches([front, back], [main1], 150);
  const forBack = p.filter((s) => s.id === 'b').map((s) => [s.x1, s.x2]);
  assert.deepEqual(forBack, [[700, 1160]]);   // the piece 160..300 is too narrow to sit on
  assert.deepEqual(p.filter((s) => s.id === 'a'), [{ id: 'a', x1: 300, x2: 700, y: 300 }]);
});

test('a window with no room above it (maximized) is not a perch, and edges are cut to the screen', () => {
  assert.deepEqual(P.perches([win('m', 0, 0, 1920, 1040)], [main1], 150), []);
  const p = P.perches([win('w', 1700, 400, 600, 300)], [main1, side], 150);
  assert.deepEqual(p.map((s) => [s.x1, s.x2]).sort((a, b) => a[0] - b[0]), [[1700, 1920], [1920, 2300]]);
});

test('he stands on an edge like on the taskbar, with his middle kept over it', () => {
  const b = { x: 0, y: 0, width: 320, height: 250 }, seg = { id: 'a', x1: 500, x2: 900, y: 600 };
  const on = P.perchBounds(b, seg);
  assert.equal(on.y, 600 - 250 - P.MARGIN / 2);
  assert.equal(on.x + 160 >= 500 + 80 && on.x + 160 <= 900 - 80, true);
  assert.equal(P.perchBounds({ x: 3000, y: 0, width: 320, height: 250 }, seg).x + 160, 900 - 80);
});

test('a drop close to an edge snaps to it, a drop far above does not', () => {
  const segs = [{ id: 'a', x1: 500, x2: 900, y: 600 }];
  const close = { x: 540, y: 600 - 250 - P.MARGIN / 2 - 25, width: 320, height: 250 };
  assert.equal(P.perchUnder(close, segs, 40).id, 'a');
  assert.equal(P.perchUnder(Object.assign({}, close, { y: close.y - 200 }), segs, 40), null);
  assert.equal(P.perchUnder(Object.assign({}, close, { x: 2000 }), segs, 40), null);
});

test('only perches on his own screen and within reach are candidates', () => {
  const b = { x: 100, y: 700, width: 320, height: 250 };
  const segs = [{ id: 'a', x1: 300, x2: 700, y: 400 }, { id: 'far', x1: 1500, x2: 1800, y: 400 }, { id: 'other', x1: 2000, x2: 2400, y: 400 }, { id: 'me', x1: 100, x2: 500, y: 500 }];
  assert.deepEqual(P.perchesNear(b, segs, [main1, side], 600, 'me').map((s) => s.id), ['a']);
});

test('falling goes straight down to the floor; the hop arcs and ends where it should', () => {
  const area = main1;
  assert.deepEqual(P.floorBounds({ x: 700, y: 100, width: 320, height: 250 }, area), { x: 700, y: 1040 - 250 - P.MARGIN / 2, width: 320, height: 250 });
  const a = { x: 0, y: 500, width: 320, height: 250 }, b2 = { x: 400, y: 500, width: 320, height: 250 };
  assert.equal(P.arcAt(a, b2, 0.5, 60).y, 500 - 60);
  assert.deepEqual(P.arcAt(a, b2, 1, 60), { x: 400, y: 500, width: 320, height: 250 });
});

test('the desktop shell lists every file it needs for the installer', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'desktop', 'package.json'), 'utf8'));
  ['main.js', 'preload.js', 'place.js', 'windows.js', 'privacy.js', 'programs.js', 'keys.js', 'panel-main.js', 'panel-preload.js', 'panel.html', 'panel-ui.js'].forEach((f) => assert.ok(pkg.build.files.includes(f), f));
  assert.ok(pkg.dependencies.koffi);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'desktop', 'windows.js')));
});

test('the window lister never reads titles or classes, and only keeps the front program\'s file name, not its folder', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'windows.js'), 'utf8').replace(/\/\/.*$/gm, '');
  assert.equal(/GetWindowTextW|GetWindowTextA|GetClassName|InternalGetWindowText|SendMessage|GetModuleFileName/.test(src), false);
  assert.match(src, /win32\.basename\(/);   // the path is cut down to the file name straight away
});

// ---------- shortcuts (desktop/keys.js) ----------
const K = require('../desktop/keys.js');

test('a shortcut needs Ctrl or Alt and one known key; empty means off', () => {
  assert.equal(K.valid('CommandOrControl+Alt+F'), true);
  assert.equal(K.valid('Alt+F9'), true);
  assert.equal(K.valid(''), true);
  assert.equal(K.valid('F'), false);            // a bare letter would swallow typing
  assert.equal(K.valid('Shift+F'), false);
  assert.equal(K.valid('Ctrl+Alt+F'), false);   // written as CommandOrControl
  assert.equal(K.valid('Alt+Alt+F'), false);
  assert.equal(K.valid('Alt+Nope'), false);
  assert.equal(K.valid(null), false);
});

test('saved shortcuts are cleaned: bad ones and clashes fall back to the default', () => {
  const d = K.clean(null);
  assert.equal(d.options, 'CommandOrControl+Alt+O');
  assert.equal(K.clean({ swapSize: '' }).swapSize, '');                       // switched off stays off
  assert.equal(K.clean({ swapSize: 'x' }).swapSize, d.swapSize);              // unusable: default
  const clash = K.clean({ swapList: 'CommandOrControl+Alt+F' });              // the same as the first one
  assert.equal(clash.swapSize, 'CommandOrControl+Alt+F');
  assert.notEqual(clash.swapList, 'CommandOrControl+Alt+F');
  assert.equal(K.label('CommandOrControl+Alt+F'), 'Ctrl+Alt+F');
  assert.equal(K.label(''), 'off');
});

test('every file the settings window needs exists, and its page loads only its own script', () => {
  const dir = path.join(__dirname, '..', 'desktop');
  ['panel-main.js', 'panel-preload.js', 'panel.html', 'panel-ui.js', 'keys.js'].forEach((f) => assert.ok(fs.existsSync(path.join(dir, f)), f));
  const html = fs.readFileSync(path.join(dir, 'panel.html'), 'utf8');
  assert.deepEqual(html.match(/<script[^>]*src="[^"]+"/g), ['<script src="panel-ui.js"']);
  assert.match(html, /script-src 'self'/);
  new Function(fs.readFileSync(path.join(dir, 'panel-ui.js'), 'utf8'));   // parses
});

test('the shell decides from the page\'s rectangles whether the pointer is on something solid', () => {
  const rects = [[100, 100, 200, 200], [10, 10, 40, 40]];
  assert.equal(P.hitTest(rects, 150, 150, 6), true);
  assert.equal(P.hitTest(rects, 95, 150, 6), true);    // just outside, inside the slack
  assert.equal(P.hitTest(rects, 90, 150, 6), false);
  assert.equal(P.hitTest(rects, 25, 25, 0), true);
  assert.equal(P.hitTest([], 25, 25, 6), false);
});

test('the sitting soles are drawn once for each foot, in front of the body, and every species shows a pair', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.equal((html.match(/class="sole-part"/g) || []).length, 2);
  assert.ok(html.indexOf('class="soles"') > html.indexOf('class="foot-side foot-r"'));
  assert.ok(html.indexOf('class="soles"') < html.indexOf('class="arm arm-l"'));
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.pet\.seated:not\(\.walking, \.shod\) \.sole-part \{ display: inline; \}/);
  const shown = css.split('\n').filter((l) => /^\.pet\.seated:not\(\.walking, \.shod\)/.test(l) && /\.sole-(paw|hoof|bird|frog)/.test(l)).join(' ');
  const species = ['birdie', 'kitty', 'puppy', 'mochi', 'pig', 'bunny', 'cow', 'hamster', 'mouse', 'monkey', 'dragon', 'frog', 'hedgehog', 'axolotl'];
  species.forEach((sp) => assert.ok(shown.includes('data-species="' + sp + '"'), sp));
});

test('the installed program follows dev unless its package.json says stable', () => {
  const C = require('../desktop/channel.js');
  assert.deepEqual(C.pick({}), { name: 'dev', url: C.SITE });
  assert.deepEqual(C.pick(null), { name: 'dev', url: C.SITE });
  assert.deepEqual(C.pick({ fumuChannel: 'stable' }), { name: 'stable', url: C.SITE + 'stable/' });
  assert.deepEqual(C.pick({ fumuChannel: 'beta' }), { name: 'dev', url: C.SITE });
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'desktop', 'package.json'), 'utf8'));
  assert.equal(pkg.fumuChannel, undefined);               // the repo's copy is dev: only the stable workflow sets it
  assert.ok(pkg.build.files.includes('channel.js'));
});

test('the workflows keep stable apart: its own release, never marked as the latest one', () => {
  const dir = path.join(__dirname, '..', '.github', 'workflows');
  const stable = fs.readFileSync(path.join(dir, 'desktop-stable.yml'), 'utf8');
  assert.match(stable, /branches: \[stable\]/);
  assert.match(stable, /fumuChannel/);
  assert.match(stable, /--prerelease/);      // so GitHub's "latest release" (what dev installs follow) never points at it
  assert.match(stable, /provider: 'generic'|provider = 'generic'|provider:'generic'/);
  const dev = fs.readFileSync(path.join(dir, 'desktop.yml'), 'utf8');
  assert.match(dev, /branches: \[main\]/);
  const pages = fs.readFileSync(path.join(dir, 'pages.yml'), 'utf8');
  assert.match(pages, /branches: \[main, stable\]/);
  assert.match(pages, /_site\/stable/);
});

test('awareness levels: 1 is idle only, 2 adds the outline of the desktop; never titles at either', () => {
  const V = require('../desktop/privacy.js');
  assert.equal(V.clean(undefined), 2);
  assert.equal(V.clean(1), 1);
  assert.equal(V.clean('1'), 1);
  assert.equal(V.clean(3), 2);
  assert.equal(V.allows(1, 'idle'), true);
  assert.equal(V.allows(1, 'perch'), false);
  assert.equal(V.allows(1, 'program'), false);
  assert.equal(V.allows(2, 'perch'), true);
  assert.equal(V.allows(2, 'anything-new'), true);
  assert.equal(V.allows(1, 'anything-new'), false);   // a new kind of awareness needs the higher level until it is listed
  assert.match(V.ALWAYS, /never reads window titles/);
  assert.equal(/\btitles? (are|is) read|reads? (the )?titles/i.test(V.LEVELS[1].text + V.LEVELS[2].text), false);
  assert.ok(V.LEVELS[1].title && V.LEVELS[2].title);
});

test('programs: listed games and apps are named, everything else is just "something else" and its name is not passed on', () => {
  const G = require('../desktop/programs.js');
  assert.deepEqual(G.identify('Valorant-Win64-Shipping.EXE'), { kind: 'game', name: 'Valorant' });
  assert.deepEqual(G.identify('chrome.exe'), { kind: 'browser', name: 'Chrome' });
  assert.equal(G.identify('some-unknown-thing.exe'), null);
  assert.equal(G.identify(null), null);
  assert.equal(G.identify('constructor'), null);              // not fooled by object property names
  assert.equal(G.identify('__proto__'), null);
  assert.deepEqual(G.describe('mystery.exe', true), { kind: 'fullscreen', name: '', fullscreen: true });
  assert.deepEqual(G.describe('mystery.exe', false), { kind: 'other', name: '', fullscreen: false });
  assert.equal(JSON.stringify(G.describe('mystery.exe', true)).includes('mystery'), false);
  assert.deepEqual(G.describe(null, false), { kind: 'none', name: '', fullscreen: false });
  // a game she taught him, on top of the list (names cut to 40 characters)
  assert.deepEqual(G.describe('mygame.exe', false, { 'mygame.exe': 'My Game' }), { kind: 'game', name: 'My Game', fullscreen: false });
  Object.keys(G.GAMES).concat(Object.keys(G.APPS)).forEach((k) => assert.equal(k, k.toLowerCase()));
});

test('chatter levels: never, rarely, normal, often; anything else keeps what was there', () => {
  const V = require('../desktop/privacy.js');
  assert.deepEqual(V.CHAT_LEVELS.map((l) => l.id), ['off', 'rare', 'normal', 'often']);
  assert.equal(V.cleanChat('rare', 'normal'), 'rare');
  assert.equal(V.cleanChat('loud', 'normal'), 'normal');
  assert.equal(V.cleanChat(undefined, 'off'), 'off');
});

test('the Dark Souls games and the WoW classic programs are on the list', () => {
  const G = require('../desktop/programs.js');
  assert.deepEqual(G.identify('DarkSoulsRemastered.exe'), { kind: 'game', name: 'Dark Souls Remastered' });
  assert.deepEqual(G.identify('DarkSoulsII.exe'), { kind: 'game', name: 'Dark Souls II' });
  assert.deepEqual(G.identify('DATA.exe'), { kind: 'game', name: 'Dark Souls' });
  assert.deepEqual(G.identify('DarkSoulsIII.exe'), { kind: 'game', name: 'Dark Souls III' });
  assert.deepEqual(G.identify('Wow.exe'), { kind: 'game', name: 'World of Warcraft' });
});
