// The standalone sketchpad (sketch.html): draw over a big copy of the pet (or the scene, the toy or the room) and upload the
// drawing to Claude. The lines are kept as vectors in the same coordinates as the picture underneath, so a hat drawn on the
// pet lands where the SVG for it goes. It is its own page, apart from the game: it borrows the pet and the toy from the game's
// index.html when it opens, and uses logic.js, wardrobe.js, skins.js, decor.js and backdrops.js for the rest.
'use strict';
/** The drop-down menus (app-select.js) call this for the game's tap sound; the sketchpad has none. */
function sound() {}

var SVGNS = 'http://www.w3.org/2000/svg';
var $ = function (id) { return document.getElementById(id); };
var skStage = $('skStage'), skView = $('skView'), skStatus = $('skStatus');
var L = PetLogic;

/** The drawing area of each mode, in the coordinates of what is underneath. The pet is 160 x 150 with room round it for hats. */
var SK_VIEW = { pet: { x: -30, y: -50, w: 220, h: 220 }, scene: { x: 0, y: 0, w: 400, h: 160 }, toy: { x: 0, y: 0, w: 26, h: 26 }, room: { x: 0, y: 0, w: 400, h: 160 }, canvas: { x: 0, y: 0, w: 800, h: 600 } };
var SK_COLOURS = ['#5b4239', '#000000', '#ffffff', '#ff8fb1', '#ff6b6b', '#ffa94d', '#ffd166', '#7bd389', '#6ec6ff', '#b69cff'];
var SK_PEN = 0.001;   // each step of the thickness slider, as a share of the drawing area's width
var SPECIES = [['mochi', 'Mochi'], ['pig', 'Pig'], ['kitty', 'Cat'], ['puppy', 'Dog'], ['bunny', 'Bunny'], ['birdie', 'Birdie'], ['cow', 'Cow'], ['hamster', 'Hamster'], ['frog', 'Frog'], ['hedgehog', 'Hedgehog'], ['axolotl', 'Axolotl'], ['mouse', 'Mouse'], ['monkey', 'Monkey'], ['dragon', 'Dragon']];
var SLOTS = [['hat', 'Hat'], ['body', 'Clothes'], ['face', 'Glasses'], ['mouth', 'Mouth'], ['neck', 'Neck'], ['feet', 'Shoes']];
/** What the pet underneath looks like (kept on this computer). */
var P = { seated: false, species: 'mochi', skin: '', outfit: { hat: 'none', body: 'none', face: 'none', mouth: 'none', neck: 'none', feet: 'none' }, backdrop: 'meadow', night: false, room: {} };
var SK = {
  mode: 'pet', tool: 'pen', color: SK_COLOURS[0], zoom: 1, pen: 9, tab: 'draw', clean: true, style: 'solid', shape: 'heart', bodyClip: false, radial: 0, pressure: true, lazy: false, lazyN: 30, fillMode: 'none', colour2: '#ffc9d6', clip: [], pasteN: 0, tidy: 6, space: false, sel: null, mirror: false, pick: [],
  strokes: { pet: [], scene: [], toy: [], room: [], canvas: [] }, hist: { pet: [], scene: [], toy: [], room: [], canvas: [] }, redo: { pet: [], scene: [], toy: [], room: [], canvas: [] },
  /** Pictures to trace, one layer each, in the same coordinates as the drawing: {id, name, src, cx, cy, bw, bh, scale, opacity, visible, behind} */
  images: { pet: [], scene: [], toy: [], room: [], canvas: [] },
  /** Layers for the lines, bottom first: {id, name, show}; each stroke has `lay` (a layer id), and `active` is where new lines go */
  layers: { pet: [], scene: [], toy: [], room: [], canvas: [] }, layerSet: { pet: [], scene: [], toy: [], room: [], canvas: [] }, active: { pet: 'l1', scene: 'l1', toy: 'l1', room: 'l1', canvas: 'l1' }
};
var SK_PEN_DEFAULT = 9;
var SK_OWNER = false, skDraw = null, skDrawing = false, skPan = null, skPetSvg = null, skToys = null, skImgUnder = null, skImgOver = null, skSelBox = null, skXf = null, skCv = null, skCurve = null;

// ---------- borrowing the pet from the game ----------
/** Fetches the game's page and keeps its pet drawing (with its gradients and clip) and its toys, hidden, to copy from. */
function skLoadSource() {
  return fetch('index.html', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('index.html ' + r.status);
    return r.text();
  }).then(function (html) {
    var doc = new DOMParser().parseFromString(html, 'text/html'), pet = doc.getElementById('pet'), toy = doc.getElementById('toy');
    if (!pet) throw new Error('the pet was not found');
    var holder = $('skSource');
    holder.appendChild(document.importNode(pet, true));
    if (toy) holder.appendChild(document.importNode(toy, true));
    skPetSvg = holder.querySelector('.pet-svg');
    skToys = holder.querySelector('#toy');
  });
}
/** @returns {SVGSVGElement} A copy of the pet drawing (the shared gradients stay in the hidden original). */
function petCopy() {
  var copy = skPetSvg.cloneNode(true);
  copy.querySelectorAll('defs').forEach(function (d) { d.remove(); });
  var body = copy.querySelector('.pet-body');
  if (body) body.removeAttribute('transform');
  return copy;
}
function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0] || null; }
/** Draws an outfit into a pet drawing (the same as the game's dressUp, for one item in each slot). */
function dressUp(el, outfit) {
  function worn(slot) { return L.wornIds(outfit, slot).map(function (id) { return byId(Wardrobe, id); }).filter(Boolean); }
  var clothes = worn('body'), hats = worn('hat');
  var hood = clothes.filter(function (c) { return c.hood; })[0], last = clothes[clothes.length - 1];
  el.querySelector('.outfit-hat').innerHTML = hats.map(function (h) { return h.svg; }).join('');
  el.querySelector('.outfit-body').innerHTML = clothes.map(function (c) { return c.svg; }).join('');
  if (hood) el.dataset.hood = hood.id; else delete el.dataset.hood;
  if (last) el.dataset.clothes = last.id; else delete el.dataset.clothes;
  el.classList.toggle('sleeved', clothes.some(function (c) { return c.sleeves; }));
  ['neck', 'feet'].forEach(function (slot) {
    el.querySelector('.outfit-' + slot).innerHTML = worn(slot).map(function (w) { return w.svg; }).join('');
  });
  el.querySelector('.outfit-faces').innerHTML = L.faceStack(outfit).map(function (e) {
    var w = byId(Wardrobe, e.id);
    return w ? '<g class="outfit-' + e.slot + '">' + w.svg + '</g>' : '';
  }).join('');
  var neck = el.querySelector('.outfit-neck'), over = el.querySelector('.outfit-neck-over');
  if (clothes.length && over) { over.innerHTML = neck.innerHTML; neck.innerHTML = ''; } else if (over) over.innerHTML = '';
  el.classList.toggle('hooded', !!hood);
  el.classList.toggle('snug', hats.some(function (h) { return h.snug; }));
  el.classList.toggle('shod', worn('feet').length > 0);
}

// ---------- keeping the work on this computer ----------
function skSave() {
  try {
    localStorage.setItem('nibble-sketchpad', JSON.stringify({ P: P, strokes: SK.strokes, kind: $('skKind').value, note: $('skNote').value, tidy: SK.tidy, pen: SK.pen, style: SK.style, tab: SK.tab, clean: SK.clean, shape: SK.shape, fillMode: SK.fillMode, colour2: SK.colour2, layers: SK.layers, active: SK.active, snap: $('skSnap').checked, mirror: SK.mirror, bodyClip: SK.bodyClip, radial: SK.radial, pressure: SK.pressure, lazy: SK.lazy, lazyN: SK.lazyN, canvas: SK_VIEW.canvas }));
  } catch (e) { /* storage not available */ }
}
function skLoad() {
  try {
    var d = JSON.parse(localStorage.getItem('nibble-sketchpad') || 'null');
    if (!d) return;
    if (d.P) {
      P.species = SPECIES.some(function (s) { return s[0] === d.P.species; }) ? d.P.species : 'mochi';
      P.skin = d.P.skin || '';
      Object.keys(P.outfit).forEach(function (s) { if (d.P.outfit && d.P.outfit[s]) P.outfit[s] = d.P.outfit[s]; });
      P.backdrop = d.P.backdrop || 'meadow'; P.night = !!d.P.night; P.room = d.P.room || {}; P.template = !!d.P.template; P.seated = !!d.P.seated;
    }
    ['pet', 'scene', 'toy', 'room', 'canvas'].forEach(function (m) { if (d.strokes && Array.isArray(d.strokes[m])) SK.strokes[m] = d.strokes[m]; });
    if (d.canvas && d.canvas.w >= 16 && d.canvas.h >= 16) SK_VIEW.canvas = { x: 0, y: 0, w: Math.min(4000, Math.round(d.canvas.w)), h: Math.min(4000, Math.round(d.canvas.h)) };
    if (d.kind) $('skKind').value = d.kind;
    $('skNote').value = d.note || '';
    if (typeof d.tidy === 'number') SK.tidy = d.tidy;
    if (d.pen >= 1 && d.pen <= 40) SK.pen = d.pen;
    if (L.SKETCH_STYLES[d.style] !== undefined || d.style === 'wavy' || d.style === 'soft') SK.style = d.style;
    if (L.SKETCH_SHAPES.some(function (x) { return x[0] === d.shape; })) SK.shape = d.shape;
    SK.fillMode = ['none', 'flat', 'v', 'h', 'r'].concat(L.SKETCH_PATTERNS).indexOf(d.fillMode) !== -1 ? d.fillMode : (d.shapeFill ? 'flat' : 'none');
    if (/^#[0-9a-f]{6}$/i.test(d.colour2 || '')) SK.colour2 = d.colour2;
    if (d.clean === false) SK.clean = false;
    if (['draw', 'under'].indexOf(d.tab) !== -1) SK.tab = d.tab;
    ['pet', 'scene', 'toy', 'room', 'canvas'].forEach(function (m) {
      if (d.layers && Array.isArray(d.layers[m])) SK.layers[m] = d.layers[m].filter(function (l) { return l && l.id; }).map(function (l) { return { id: String(l.id), name: String(l.name || 'Layer').slice(0, 24), show: l.show !== false }; });
      if (d.active && d.active[m]) SK.active[m] = d.active[m];
    });
    $('skSnap').checked = d.snap !== false;
    SK.mirror = !!d.mirror;
    SK.bodyClip = !!d.bodyClip; SK.radial = [0, 3, 4, 5, 6, 8].indexOf(d.radial) !== -1 ? d.radial : 0; SK.pressure = d.pressure !== false;
    SK.lazy = !!d.lazy; if (d.lazyN >= 1 && d.lazyN <= 100) SK.lazyN = Math.round(d.lazyN);
  } catch (e) { /* nothing saved, or it could not be read */ }
}

// ---------- the picture underneath ----------
/** @returns {HTMLElement} A still copy of the pet, wearing what it wears, for the picture underneath. */
function skPet(blank) {
  var v = document.createElement('div');
  v.className = 'pet preview x-cheeks' + (L.isBird(P.species) ? ' beaked' : '') + (blank ? ' sk-blank' : '') + (P.seated ? ' seated' : '');
  v.dataset.species = P.species;
  v.dataset.skin = P.skin || '';   // a blank template keeps the skin's shapes (floppy ears and so on), just without colour
  v.dataset.state = 'curious';
  v.dataset.eyes = 'open';
  v.dataset.mouth = 'smile';
  v.dataset.arms = 'idle';
  v.appendChild(petCopy());
  dressUp(v, blank ? { hat: 'none', body: 'none', face: 'none', mouth: 'none', neck: 'none', feet: 'none' } : P.outfit);
  return v;
}
/** @returns {HTMLElement} A copy of the toy this pet plays with (yarn, tennis ball or ball), 26 x 26. */
function skToy() {
  var kind = P.species === 'kitty' ? 'yarn' : P.species === 'puppy' ? 'tennis' : 'ball';
  var t = document.createElement('div'), g = skToys.querySelector('[data-toy="' + kind + '"]').cloneNode(true);
  t.innerHTML = '<svg viewBox="0 0 26 26"></svg>';
  g.style.display = 'inline';
  t.firstChild.appendChild(g);
  return t;
}
/** Places an element inside the stage by its position in the drawing area's coordinates. */
function skPlace(el, v, x, y, w, h) {
  el.style.cssText += ';position:absolute;margin:0;left:' + ((x - v.x) / v.w * 100) + '%;top:' + ((y - v.y) / v.h * 100) + '%;width:' + (w / v.w * 100) + '%;height:' + (h / v.h * 100) + '%';
}
/** @returns {number} The x of the line down the middle of the drawing (the pet's middle, the stage's middle) that Mirror folds along. */
function skAxis() { return SK.mode === 'pet' ? 80 : SK_VIEW[SK.mode].x + SK_VIEW[SK.mode].w / 2; }
/** @returns {number[]} A point on the other side of the middle line. */
function skMirrorPt(p) { return [2 * skAxis() - p[0], p[1]]; }
/** @returns {number[]} The middle the Spin copies turn round (the middle of the pet's body, or of the picture). */
/** @returns {string} Path text for the lines out from the middle that Spin copies along (a guide). */
function skSpokes() {
  var c = skCentre(), v = SK_VIEW[SK.mode], r = Math.max(v.w, v.h), d = '', k;
  for (k = 0; k < SK.radial; k++) { var a = -Math.PI / 2 + 2 * Math.PI * k / SK.radial; d += 'M' + c[0] + ' ' + c[1] + 'L' + (c[0] + Math.cos(a) * r).toFixed(1) + ' ' + (c[1] + Math.sin(a) * r).toFixed(1); }
  return d;
}
function skCentre() { var v = SK_VIEW[SK.mode]; return SK.mode === 'pet' ? [80, 88] : [v.x + v.w / 2, v.y + v.h / 2]; }
/** @returns {number[][]} A point and all its copies (mirrored, and turned round the middle when Spin is on): for the eraser and the bucket. */
function skSpots(pt) {
  var base = SK.mirror ? [pt, skMirrorPt(pt)] : [pt], out = base.slice(), c = skCentre(), n = SK.radial || 1, k;
  for (k = 1; k < n; k++) base.forEach(function (p) {
    var a = 2 * Math.PI * k / n, dx = p[0] - c[0], dy = p[1] - c[1];
    out.push([c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]);
  });
  return out;
}
/** @returns {Object[]} Copies of lines turned round the middle (Spin on), not counting the lines themselves. */
function skSpin(list) {
  var n = SK.radial || 1, out = [], c = skCentre(), k;
  for (k = 1; k < n; k++) list.forEach(function (s) {
    var m = JSON.parse(JSON.stringify(s)), r = L.sketchXform({ pts: s.pts, d: s.d, width: s.width }, { kind: 'rotate', cx: c[0], cy: c[1], a: 2 * Math.PI * k / n });
    m.pts = r.pts; if (s.d) m.d = r.d;
    delete m.cv; delete m.pair;
    out.push(m);
  });
  return out;
}
/** @returns {Object[]} The other copies of a new line: the mirrored one, and all of them turned round the middle. */
function skSymExtra(s) {
  var m = SK.mirror ? [skMirrored(s)] : [];
  return m.concat(skSpin([s].concat(m)));
}
/** Marks a new line to stay inside the pet's body when Clip is on. @returns {Object} The line. */
function skNew(s) { if (SK.bodyClip && SK.mode === 'pet') s.clip = true; return s; }
/** @returns {Object} A pen-pressure line as the filled outline it is saved as (other lines come back as they are). */
function skLiveStroke(s) {
  if (!s.pr) return s;
  var v = SK_VIEW[SK.mode];
  return { pts: L.sketchRibbon(s.pts, s.pr.map(function (f) { return s.width * f; })), color: s.color, width: +(v.w * 0.0015).toFixed(2), fill: true, closed: true, lay: s.lay, style: 'solid', clip: s.clip };
}
/** Draws the line being drawn, and its copies. */
function skLiveUpdate() {
  var d = skDrawing, v = SK_VIEW[SK.mode], dp = v.w > 100 ? 1 : 2, ls = skLiveStroke(d.stroke), ex = skSymExtra(ls);
  function path(t) { return t.d || L.sketchPath(t.pts, (t.fill || t.closed) && t.pts.length > 2, dp); }
  d.el.setAttribute('d', path(ls));
  if (d.stroke.pr) { d.el.setAttribute('fill', ls.color); d.el.setAttribute('stroke-width', ls.width); }
  while (d.extra.length < ex.length) { var el = skEl(ex[d.extra.length]); skDraw.appendChild(el); d.extra.push(el); }
  d.extra.forEach(function (el, i) { el.setAttribute('d', path(ex[i])); });
}
/** @returns {number} How wide a pen line is at a pen pressure (1 is the thickness on the slider). */
function skPressure(e) { return Math.max(0.1, Math.min(1.6, 0.15 + 1.7 * (e.pressure || 0.5))); }
/** @returns {SVGSVGElement} The grid: faint lines every 10 (or 2) units, stronger every 50 (or 10), and the pet's middle line. */
function skGrid(v) {
  var small = v.w > 100 ? 10 : 2, big = v.w > 100 ? 50 : 10, d = '', dBig = '';
  for (var x = Math.ceil(v.x / small) * small; x <= v.x + v.w; x += small) (x % big ? (d += 'M' + x + ' ' + v.y + 'v' + v.h) : (dBig += 'M' + x + ' ' + v.y + 'v' + v.h));
  for (var y = Math.ceil(v.y / small) * small; y <= v.y + v.h; y += small) (y % big ? (d += 'M' + v.x + ' ' + y + 'h' + v.w) : (dBig += 'M' + v.x + ' ' + y + 'h' + v.w));
  var svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', [v.x, v.y, v.w, v.h].join(' '));
  svg.setAttribute('class', 'sk-grid');
  svg.innerHTML = '<path d="' + d + '" class="g1"/><path d="' + dBig + '" class="g2"/>' +
    (SK.mode === 'pet' ? '<path d="M80 ' + v.y + 'v' + v.h + '" class="g3"/>' : '') +
    (SK.mirror ? '<path d="M' + skAxis() + ' ' + v.y + 'v' + v.h + '" class="g4"/>' : '') + (SK.radial ? '<path d="' + skSpokes() + '" class="g4"/>' : '');
  return svg;
}
/** Builds the stage for the current mode: the picture underneath, the grid and the drawing layer. */
function skBuild() {
  var v = SK_VIEW[SK.mode], ref = document.createElement('div');
  ref.className = 'sk-ref';
  if (SK.mode === 'pet') {
    var p = skPet(P.template);
    skPlace(p, v, 0, 0, 160, 150);
    ref.appendChild(p);
  } else if (SK.mode === 'scene' || SK.mode === 'room') {
    var bd = byId(BACKDROPS, P.backdrop);
    if (bd && bd.draw) {
      var bg = document.createElement('div');
      bg.className = 'sk-bd';
      bg.innerHTML = '<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice">' + bd.draw(P.night) + '</svg>';
      ref.appendChild(bg);
    }
    if (SK.mode === 'room') {   // the furniture already in the room, behind the pet, as the room draws it (x, y = the centre as a share of the stage)
      Decor.filter(function (d) { return P.room[d.id]; }).forEach(function (d) {
        var f = document.createElement('div');
        f.appendChild(svgIcon(d.view, d.svg));
        f.firstChild.style.cssText = 'width:100%;height:100%;display:block;overflow:visible';
        skPlace(f, v, d.x * v.w - d.w / 2, d.y * v.h - d.h / 2, d.w, d.h);
        ref.appendChild(f);
      });
    }
    var sp = skPet();
    skPlace(sp, v, 125, 18, 150, 140);   // where the pet stands on the real stage (about)
    ref.appendChild(sp);
    if (SK.mode === 'scene') {
      var toy = skToy();
      skPlace(toy, v, 295, 124, 26, 26);   // the toy's usual place, on the right
      ref.appendChild(toy);
    }
  } else if (SK.mode === 'toy') {
    var t = skToy();
    skPlace(t, v, 0, 0, 26, 26);
    ref.appendChild(t);
  }   // a free canvas has nothing underneath
  skDraw = document.createElementNS(SVGNS, 'svg');
  skDraw.setAttribute('viewBox', [v.x, v.y, v.w, v.h].join(' '));
  skDraw.setAttribute('class', 'sk-draw');
  skStage.dataset.mode = SK.mode;
  skImgUnder = skLayerSvg('sk-imgs under'); skImgOver = skLayerSvg('sk-imgs over'); skSelBox = skLayerSvg('sk-sel'); skXf = skLayerSvg('sk-xf'); skCv = skLayerSvg('sk-cv'); skCurve = null; skCurveEdit = null;
  skXf.addEventListener('pointerdown', skXfDown);
  skStage.replaceChildren(skImgUnder, ref, skImgOver, skGrid(v), skDraw, skSelBox, skXf, skCv);
  skRenderImages();
  skRedraw();
  skHistoryUI();
  skXfRender();
  skApplyLook();
  skLayout();
  skPalette();
}
/** @returns {SVGSVGElement} An empty layer with the drawing area's coordinates. */
function skLayerSvg(cls) {
  var v = SK_VIEW[SK.mode], svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', [v.x, v.y, v.w, v.h].join(' '));
  svg.setAttribute('class', cls);
  svg.setAttribute('preserveAspectRatio', 'none');
  return svg;
}
function svgIcon(view, inner) {
  var svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', view);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = inner;
  return svg;
}
/** Makes sure a gradient or blur is defined for the drawing to use (kept in a hidden part of the page). @returns {string} Its id. */
function skDef(id, markup) {
  var defs = $('skDefs');
  if (!defs.querySelector('#' + id)) defs.insertAdjacentHTML('beforeend', markup);
  return id;
}
/** @returns {?Object} The fade or pattern a new filled shape gets (null for a flat colour), from the Fill list. */
function skGrad() {
  if (SK.fillMode === 'v' || SK.fillMode === 'h' || SK.fillMode === 'r') return { type: SK.fillMode, c1: SK.color, c2: SK.colour2 };
  if (L.SKETCH_PATTERNS.indexOf(SK.fillMode) !== -1) return { type: SK.fillMode, c1: SK.color, c2: SK.colour2, s: +(SK_VIEW[SK.mode].w / 16).toFixed(1) };   // a tile is a sixteenth of the picture
  return null;
}
/** @returns {SVGPathElement} One stroke, drawn. */
function skEl(s) {
  var el = document.createElementNS(SVGNS, 'path'), v = SK_VIEW[SK.mode];
  el.setAttribute('d', s.d || L.sketchPath(s.pts, (s.fill || s.closed) && s.pts.length > 2, v.w > 100 ? 1 : 2));
  if (s.d) el.setAttribute('fill-rule', 'evenodd');
  el.setAttribute('stroke', s.color);
  el.setAttribute('stroke-width', s.width);
  el.setAttribute('fill', s.fill ? s.color : 'none');
  if (s.fill && s.grad) el.setAttribute('fill', 'url(#' + skDef(L.sketchGradId(s.grad), L.sketchGradDef(s.grad)) + ')');
  if (s.style === 'soft') { var sd = L.sketchSoftBlur(s.width); el.setAttribute('filter', 'url(#' + skDef(L.sketchBlurId(sd), L.sketchBlurDef(sd)) + ')'); el.setAttribute('opacity', '.7'); }
  if (s.clip) el.setAttribute('mask', 'url(#' + skDef('bodyclip', L.sketchClipDef()) + ')');
  var dd = L.sketchDash(s.style, s.width);
  if (dd.array) el.setAttribute('stroke-dasharray', dd.array);
  el.setAttribute('stroke-linecap', dd.cap);
  el.setAttribute('stroke-linejoin', 'round');
  return el;
}
/** Sizes the stage to fit the window (at 1x), times the zoom. */
function skLayout() {
  var v = SK_VIEW[SK.mode], aspect = v.w / v.h;
  var w = Math.max(240, Math.min(skView.clientWidth - 36, (skView.clientHeight - 36) * aspect)) * SK.zoom;
  skStage.style.width = w + 'px';
  skStage.style.height = (w / aspect) + 'px';
  $('skZoomText').textContent = Math.round(SK.zoom * 100) + '%';
  if (skXf) skXfRender();
  skPress($('skZoom'), 'zoom', Math.abs(SK.zoom - Math.round(SK.zoom)) < 0.01 ? Math.round(SK.zoom) : '');
}
/** Zooms to z, keeping the point under (cx, cy) on the screen where it is (the middle of the view if not given). */
function skZoomAt(z, cx, cy) {
  z = Math.max(0.4, Math.min(16, z));
  var vr = skView.getBoundingClientRect();
  if (cx === undefined) { cx = vr.left + vr.width / 2; cy = vr.top + vr.height / 2; }
  var r = skStage.getBoundingClientRect(), fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
  SK.zoom = z;
  skLayout();
  var r2 = skStage.getBoundingClientRect();
  skView.scrollLeft += r2.left + fx * r2.width - cx;
  skView.scrollTop += r2.top + fy * r2.height - cy;
}
function skApplyLook() {
  skStage.dataset.tool = SK.tool;
  skStage.classList.toggle('no-grid', !$('skGrid').checked);
  skStage.classList.toggle('no-ref', !$('skRef').checked);
  skStage.style.setProperty('--sk-ghost', $('skGhost').value / 100);
  $('skSceneBox').hidden = SK.mode !== 'scene' && SK.mode !== 'room';
  $('skRoomWrap').hidden = SK.mode !== 'room';
  $('skTemplateWrap').hidden = SK.mode !== 'pet';
  $('skSeatedWrap').hidden = SK.mode !== 'pet';
  $('skTemplate').checked = !!P.template;
  $('skSeated').checked = !!P.seated;
  $('skRefLabel').textContent = SK.mode === 'toy' ? 'Show toy' : (SK.mode === 'pet' ? 'Show pet' : 'Show room');
  $('skTabUnder').hidden = SK.mode === 'toy' || SK.mode === 'canvas';
  $('skRef').closest('label').hidden = SK.mode === 'canvas'; $('skGhost').closest('label').hidden = SK.mode === 'canvas';
  skOpened[SK.mode] = true; skDocsUI();
  $('skTabUnder').textContent = SK.mode === 'pet' ? 'Pet' : 'Room';
  $('skItemRow').hidden = !(SK.mode === 'pet' && SK_ITEM_SLOTS[$('skKind').value]);
  skTab((SK.mode === 'toy' || SK.mode === 'canvas') && SK.tab === 'under' ? 'draw' : SK.tab);
}
var SK_ITEM_SLOTS = { hat: 'hat', clothes: 'body', face: 'face', mouth: 'mouth', neck: 'neck', feet: 'feet' };
/** Shows one of the panel's pages (Draw, or Pet or Room). */
function skTab(name) {
  if (name !== 'under') name = 'draw';
  SK.tab = name;
  document.querySelectorAll('#skTabs [data-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === name)); });
  document.querySelectorAll('.skp-pane').forEach(function (p) { p.hidden = p.dataset.pane !== name; });
}
$('skTabs').addEventListener('click', function (e) {
  var b = e.target.closest('[data-tab]');
  if (b) { skTab(b.dataset.tab); skSave(); }
});

// ---------- drawing ----------
function skPoint(e) {
  var r = skDraw.getBoundingClientRect(), v = SK_VIEW[SK.mode];
  return [v.x + (e.clientX - r.left) / r.width * v.w, v.y + (e.clientY - r.top) / r.height * v.h];
}
function skPushHistory() {
  skCutAct = null; skCutRedoSt = null;
  SK.redo[SK.mode] = [];
  var h = SK.hist[SK.mode];
  h.push(JSON.stringify(SK.strokes[SK.mode]));
  while (h.length > SK_PREFS.undo) h.shift();
  skHistoryUI();
}
/** Greys out Undo and Redo when there is nothing to undo or redo. */
function skHistoryUI() {
  $('skUndo').disabled = !SK.hist[SK.mode].length;
  $('skRedo').disabled = !SK.redo[SK.mode].length;
  skHistSoon();
}
var skHistTimer = 0;
/** Refreshes the history list a moment later (changes are made just after their step is saved, and some come in quick bursts). */
function skHistSoon() { if (!$('skHist').open) return; clearTimeout(skHistTimer); skHistTimer = setTimeout(skHistLog, 120); }
// ---------- the history list: every step, to go back to any of them ----------
var skHistNames = {};   // a step's description, by the two states it sits between
/** @returns {string} What changed between two states of the drawing (JSON of the lines), in a few words. */
function skStepName(a, b) {
  var key = a.length + ':' + b.length + ':' + a.slice(-40) + b.slice(-40);
  if (skHistNames[key]) return skHistNames[key];
  var A = JSON.parse(a), B = JSON.parse(b), seen = {}, added = [], removed = 0, name;
  A.forEach(function (s) { var k = JSON.stringify(s); seen[k] = (seen[k] || 0) + 1; });
  B.forEach(function (s) { var k = JSON.stringify(s); if (seen[k]) seen[k]--; else added.push(s); });
  Object.keys(seen).forEach(function (k) { removed += seen[k]; });
  var n = added.length, lines = function (c) { return c + (c === 1 ? ' line' : ' lines'); };
  if (!n && !removed) name = 'Layers changed';
  else if (!removed) name = added.some(function (s) { return s.bucket; }) ? 'Filled an area' : added.every(function (s) { return s.d && s.fill; }) ? (n === 1 ? 'Added a shape' : 'Added ' + n + ' shapes') : (n === 1 ? 'Drew a line' : 'Added ' + lines(n));
  else if (!n) name = 'Removed ' + lines(removed);
  else if (n === removed) name = 'Changed ' + lines(n);
  else name = n > removed ? 'Edited, ' + (n - removed) + ' more' : 'Edited, ' + (removed - n) + ' fewer';
  return (skHistNames[key] = name);
}
/** Redraws the list of steps (only while the History box is open). */
function skHistLog() {
  var box = $('skHist');
  if (!box || !box.open) return;
  var hist = SK.hist[SK.mode], redo = SK.redo[SK.mode], cur = JSON.stringify(SK.strokes[SK.mode]);
  var T = hist.concat([cur], redo.slice().reverse()), at = hist.length, rows = [];
  $('skHistCount').textContent = T.length > 1 ? (T.length - 1) + ' steps' : '';
  T.forEach(function (st, j) {
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.dataset.step = j;
    b.textContent = j === 0 ? 'Start' : skStepName(T[j - 1], st);
    li.className = j === at ? 'now' : (j > at ? 'later' : '');
    if (j === at) b.setAttribute('aria-current', 'step');
    li.appendChild(b);
    rows.push(li);
  });
  var ol = $('skHistList');
  ol.replaceChildren.apply(ol, rows.reverse());
}
/** Goes straight to a step of the history (the same as pressing Undo or Redo that many times). */
function skHistGo(j) {
  var hist = SK.hist[SK.mode], redo = SK.redo[SK.mode], cur = JSON.stringify(SK.strokes[SK.mode]);
  var T = hist.concat([cur], redo.slice().reverse());
  if (j < 0 || j >= T.length || j === hist.length) return;
  skCutAct = null; skCutRedoSt = null;
  SK.hist[SK.mode] = T.slice(0, j);
  SK.redo[SK.mode] = T.slice(j + 1).reverse();
  SK.strokes[SK.mode] = JSON.parse(T[j]);
  SK.pick = []; skXfRender();
  skFixAutoLayers(); skRedraw(); skHistoryUI(); skSave();
  skStatus.textContent = j === 0 ? 'Back to the start.' : 'Went back to “' + skStepName(T[j - 1], T[j]) + '”.';
}
/** A quick pulse on a button, so you can see the press (also for the keyboard shortcuts). */
function skFlash(id) {
  var b = $(id);
  b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
  setTimeout(function () { b.classList.remove('flash'); }, 320);
}
function skRedraw() {
  skHistSoon();
  skDraw.replaceChildren.apply(skDraw, skOrdered().filter(skLive).map(skEl));
  if (skCurveEdit && skCv) skCurveRender(null);
}

// ---------- layers for the lines ----------
/** @returns {Object[]} This area's layers, bottom first (there is always at least one). */
function skLays() {
  var l = SK.layers[SK.mode];
  if (!l.length) l.push({ id: 'l1', name: 'Lines', show: true });
  if (!l.some(function (x) { return x.id === SK.active[SK.mode]; })) SK.active[SK.mode] = l[l.length - 1].id;
  return l;
}
/** @returns {Object} The layer a stroke is on (the bottom one if it has none, or its layer is gone). */
function skLayerOf(s) {
  var l = skLays();
  return l.filter(function (x) { return x.id === s.lay; })[0] || l[0];
}
function skLive(s) { return skLayerOf(s).show; }
/** @returns {string[]} The layers ticked in the panel: the ones Select and Lasso can reach (the active one if none are). */
function skSetOf() {
  var l = skLays(), set = SK.layerSet[SK.mode].filter(function (id) { return l.some(function (x) { return x.id === id; }); });
  if (!set.length) set = [SK.active[SK.mode]];
  SK.layerSet[SK.mode] = set;
  return set;
}
/** @returns {boolean} Whether Select and Lasso may pick this line: it is shown and on a ticked layer. */
function skSelectable(s) { var x = skLayerOf(s); return x.show && skSetOf().indexOf(x.id) !== -1; }
/** @returns {Object[]} The strokes in drawing order: layer by layer, bottom first, each layer in the order it was drawn. */
function skOrdered() {
  var l = skLays(), rank = function (s) { return Math.max(0, l.indexOf(skLayerOf(s))); };
  return SK.strokes[SK.mode].map(function (s, i) { return [s, i]; }).sort(function (a, b) { return rank(a[0]) - rank(b[0]) || a[1] - b[1]; }).map(function (p) { return p[0]; });
}
var SK_EYE = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
var SK_EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12s3.600-7 9-7c1.500 0 2.800.4 4 1M21 12s-3.600 7-9 7c-1.500 0-2.800-.4-4-1"/><path d="M4 4l16 16"/></svg>';
/** Rebuilds the layer list in the panel. */
function skLinesUI() {
  var box = $('skLineLayers'), l = skLays(), act = SK.active[SK.mode];
  box.replaceChildren.apply(box, l.slice().reverse().map(function (x) {
    var row = document.createElement('div');
    row.className = 'skp-line' + (x.show ? '' : ' hidden'); row.dataset.id = x.id; row.setAttribute('aria-selected', String(skSetOf().indexOf(x.id) !== -1)); if (x.id === act) row.classList.add('active');
    row.innerHTML = '<input type="checkbox" class="sk-pickbox" data-act="pick" title="Tick to work on this layer with Select and Lasso (Shift-click a row also adds it)" aria-label="Select layer"' + (skSetOf().indexOf(x.id) !== -1 ? ' checked' : '') + '>' +
      '<button type="button" class="sk-mini" data-act="show" aria-pressed="' + x.show + '" title="Show or hide (it is still saved)">' + (x.show ? SK_EYE : SK_EYE_OFF) + '</button>' +
      '<input type="text" maxlength="24" data-act="name" aria-label="Layer name" title="Double-tap to rename" readonly>' +
      '<button type="button" class="sk-mini" data-act="up" title="Move up">▲</button><button type="button" class="sk-mini" data-act="down" title="Move down">▼</button>' +
      '<button type="button" class="sk-mini" data-act="del" title="Delete this layer and the lines on it"' + (l.length < 2 ? ' disabled' : '') + '>✕</button>';
    row.querySelector('input[data-act=name]').value = x.name;
    return row;
  }));
}
/** Updates the layer rows (ticked, active) without rebuilding them, and drops picked lines that are no longer reachable. */
function skMarkActive() {
  var set = skSetOf();
  document.querySelectorAll('#skLineLayers .skp-line').forEach(function (r) {
    var on = set.indexOf(r.dataset.id) !== -1;
    r.setAttribute('aria-selected', String(on));
    r.classList.toggle('active', r.dataset.id === SK.active[SK.mode]);
    r.querySelector('.sk-pickbox').checked = on;
  });
  if (SK.pick.some(function (s) { return !skSelectable(s); })) { SK.pick = SK.pick.filter(skSelectable); skXfRender(); }
}
function skFollowPick() {}
function skLinesEvent(e) {
  var row = e.target.closest('.skp-line');
  if (!row) return;
  var l = skLays(), i = l.map(function (x) { return x.id; }).indexOf(row.dataset.id), x = l[i], actEl = e.target.closest('[data-act]'), act = actEl && actEl.dataset.act;
  if (!x) return;
  if (e.type === 'change' && act === 'name') { x.name = e.target.value.trim().slice(0, 24) || 'Layer'; skSave(); return; }
  if (e.type !== 'click') return;
  if (act === 'show') { x.show = !x.show; SK.pick = SK.pick.filter(skSelectable); skRedraw(); skXfRender(); }
  else if (act === 'up' && i < l.length - 1) { l.splice(i + 1, 0, l.splice(i, 1)[0]); skRedraw(); }
  else if (act === 'down' && i > 0) { l.splice(i - 1, 0, l.splice(i, 1)[0]); skRedraw(); }
  else if (act === 'del' && l.length > 1) {
    var to = l[i ? i - 1 : 1], mine = SK.strokes[SK.mode].filter(function (s) { return skLayerOf(s) === x; });
    if (mine.length) {   // the layer's lines go with it; Undo brings both back
      skPushHistory(); skAutoLayers[x.id] = x;
      SK.strokes[SK.mode] = SK.strokes[SK.mode].filter(function (s) { return mine.indexOf(s) === -1; });
      SK.pick = SK.pick.filter(function (s) { return mine.indexOf(s) === -1; });
    }
    l.splice(i, 1);
    if (SK.active[SK.mode] === x.id) SK.active[SK.mode] = to.id;
    SK.layerSet[SK.mode] = skSetOf().filter(function (id) { return id !== x.id; });
    skStatus.textContent = mine.length ? 'Layer “' + x.name + '” deleted with its ' + mine.length + (mine.length === 1 ? ' line' : ' lines') + '. Undo brings it back.' : 'Empty layer removed.';
    skRedraw();
  } else {   // a click on a row: it becomes the one layer to work on; Shift or Ctrl (or its tick box) adds or removes it. The row is not rebuilt (that would drop the typing cursor)
    var set = skSetOf().slice(), at = set.indexOf(x.id);
    if (act === 'pick' || e.shiftKey || e.ctrlKey || e.metaKey) {
      if (at === -1) { set.push(x.id); SK.active[SK.mode] = x.id; }
      else if (set.length > 1) { set.splice(at, 1); if (SK.active[SK.mode] === x.id) SK.active[SK.mode] = set[set.length - 1]; }
    } else { set = [x.id]; SK.active[SK.mode] = x.id; }
    SK.layerSet[SK.mode] = set;
    skMarkActive();
    skSave();
    return;
  }
  skLinesUI(); skXfRender(); skSave();
}
$('skAddLine').addEventListener('click', function () {
  var l = skLays(), n = 1;
  while (l.some(function (x) { return x.name === 'Layer ' + (l.length + n); })) n++;
  var x = { id: 'l' + Date.now().toString(36), name: 'Layer ' + (l.length + n), show: true };
  l.push(x); SK.active[SK.mode] = x.id; SK.layerSet[SK.mode] = [x.id];
  skLinesUI(); skMarkActive(); skSave();
});
$('skAllLines').addEventListener('click', function () {
  SK.layerSet[SK.mode] = skLays().map(function (x) { return x.id; });
  skMarkActive(); skStatus.textContent = 'All layers can be picked.';
});
$('skLineLayers').addEventListener('click', skLinesEvent);
/** Layer names are only editable after a double-tap, so a single tap just picks the layer. */
function skRename(input) { input.readOnly = false; input.focus(); input.select(); }
$('skLineLayers').addEventListener('dblclick', function (e) { if (e.target.dataset && e.target.dataset.act === 'name') skRename(e.target); });
var skLastTap = { el: null, t: 0 };
$('skLineLayers').addEventListener('pointerdown', function (e) {   // touch and pen: two quick taps on the same name
  var el = e.target;
  if (!el.dataset || el.dataset.act !== 'name' || e.pointerType === 'mouse') return;
  var now = Date.now();
  if (skLastTap.el === el && now - skLastTap.t < 400) { e.preventDefault(); skRename(el); skLastTap.el = null; return; }
  skLastTap = { el: el, t: now };
});
$('skLineLayers').addEventListener('focusout', function (e) { if (e.target.dataset && e.target.dataset.act === 'name') { e.target.readOnly = true; e.target.setSelectionRange(0, 0); } });
$('skLineLayers').addEventListener('keydown', function (e) { if (e.target.dataset && e.target.dataset.act === 'name' && (e.key === 'Enter' || e.key === 'Escape')) e.target.blur(); });
$('skLineLayers').addEventListener('change', skLinesEvent);
var skFillPaths = new WeakMap();
/** @returns {boolean} Whether a point is inside a paint-bucket fill. */
function skInFill(s, pt) {
  var path = skFillPaths.get(s);
  if (!path) { path = new Path2D(s.d); skFillPaths.set(s, path); }
  return skCtx.isPointInPath(path, pt[0], pt[1], 'evenodd');
}
var skCtx = document.createElement('canvas').getContext('2d');
/** @returns {number[][]} A line's points with more between them (at most `step` apart), so a piece can be cut out of the middle of a straight stretch. */
function skDensify(pts, step, ring) {
  var out = [], n = pts.length, segs = ring ? n : n - 1, i, k;
  for (i = 0; i < segs; i++) {
    var a = pts[i], b = pts[(i + 1) % n], m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (k = 0; k < m; k++) out.push([a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m]);
  }
  if (!ring) out.push(pts[n - 1].slice());
  return out;
}
/**
 * Cuts the parts of a pen line that are under the eraser out of it.
 * @returns {?Object[]} The pieces left (as new lines, maybe none), or null if the eraser did not reach any of its points.
 */
function skEraseCut(s, spots, rad) {
  var v = SK_VIEW[SK.mode], ring = !!s.closed && s.pts.length > 2, pts = skDensify(s.pts, Math.max(rad * 0.25, 0.3), ring);
  var gone = pts.map(function (p) { return spots.some(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) < rad; }); });
  if (gone.indexOf(true) === -1) return null;
  if (ring) {   // a loop is opened where it was cut: start the walk at a cut point
    var k = gone.indexOf(true);
    pts = pts.slice(k).concat(pts.slice(0, k)); gone = gone.slice(k).concat(gone.slice(0, k));
  }
  var runs = [], cur = [];
  pts.forEach(function (p, i) {
    if (gone[i]) { if (cur.length) runs.push(cur); cur = []; } else cur.push(p);
  });
  if (cur.length) runs.push(cur);
  return runs.filter(function (r) { return r.length > 1; }).map(function (r) {
    var m = JSON.parse(JSON.stringify(s));
    delete m.cv; delete m.pair; delete m.d;
    m.closed = false; m.fill = false;
    m.pts = L.simplifyLine(r.map(function (p) { return [+p[0].toFixed(2), +p[1].toFixed(2)]; }), v.w * 0.0006);
    return m;
  });
}
/** The eraser: takes out the part of a line it touches (Shift: the whole line); fills and colour fills go whole. */
function skEraseAt(pt, from) {
  var v = SK_VIEW[SK.mode], r = Math.max(v.w * 0.012, v.w * SK_PEN * SK.pen / 2), list = SK.strokes[SK.mode];
  var spots = skSpots(pt);
  if (from) {   // a quick stroke skips over points: fill in the way between
    var dist = Math.hypot(pt[0] - from[0], pt[1] - from[1]), steps = Math.floor(dist / (r * 0.6)), i;
    for (i = 1; i <= steps; i++) spots = spots.concat(skSpots([from[0] + (pt[0] - from[0]) * i / (steps + 1), from[1] + (pt[1] - from[1]) * i / (steps + 1)]));
  }
  var hitsLine = function (s) { return !s.bucket && skSelectable(s) && spots.some(function (q) { return L.sketchHit(s.pts, q, r + s.width / 2); }); };
  var lines = list.some(hitsLine), keep = [], changed = false;
  if (lines) {
    list.forEach(function (s) {
      if (!hitsLine(s)) { keep.push(s); return; }
      if (skDrawing.whole || s.fill || s.d || s.pr) { changed = true; return; }   // a fill cannot be cut: it goes whole
      var pieces = skEraseCut(s, spots, r + s.width / 2);
      if (!pieces) { keep.push(s); return; }
      changed = true;
      pieces.forEach(function (m) { keep.push(m); });
    });
  } else {   // only when no line is under the eraser does it take the colour fill there
    keep = list.filter(function (s) { return !(s.bucket && skSelectable(s) && spots.some(function (q) { return skInFill(s, q); })); });
    changed = keep.length !== list.length;
  }
  if (!changed) return;
  if (!skDrawing.erased) { skPushHistory(); skDrawing.erased = true; }
  SK.strokes[SK.mode] = keep;
  SK.pick = SK.pick.filter(function (s) { return keep.indexOf(s) !== -1; });
  skRedraw();
}
function skDown(e) {
  if (!e.isPrimary || skDrawing || skPan || e.button > 1) return;
  e.preventDefault();
  skDraw.setPointerCapture(e.pointerId);
  // the canvas moves with the Pan tool, with Space held, or with the middle button
  if (SK.tool === 'hand' || SK.space || e.button === 1) {
    skPan = { x: e.clientX, y: e.clientY, left: skView.scrollLeft, top: skView.scrollTop };
    skStage.classList.add('panning');
    return;
  }
  if (skCutSess) { skCutPoint(skPoint(e), e.altKey); return; }
  if (SK.tool === 'drop') { skPickInPage(e.clientX, e.clientY); return; }
  var pt = skPoint(e), v = SK_VIEW[SK.mode];
  if (SK.tool === 'bucket') { skBucket(pt); return; }
  if (skIsSel()) { skSelDown(e, pt); return; }
  if (SK.tool === 'curve') { skCurveDown(e, pt); return; }
  if (SK.tool === 'shape') { skShapeDown(pt); return; }
  if (SK.tool === 'imgmove') {
    var hitIm = skImageAt(pt), img = skSelected();
    if (hitIm) {   // clicking a picture picks it (and drags it)
      if (SK.sel !== hitIm.id) { SK.sel = hitIm.id; skLayersUI(); skRenderImages(); }
      skDrawing = { image: hitIm, last: pt, moved: false };
      return;
    }
    if (img) {   // clicking empty space lets go of the picture
      SK.sel = null; skLayersUI(); skRenderImages();
      skStatus.textContent = 'Picture let go. Click a picture to pick it again; now a drag moves your lines.';
      return;
    }
    var all = SK.strokes[SK.mode].filter(skSelectable);   // no picture picked: the lines on the ticked layers move together
    if (!all.length) { skStatus.textContent = 'Nothing to move on the ticked layers.'; return; }
    SK.pick = all;
    skDrawing = { xf: { kind: 'move', start: pt, snap: skPickSnap(), pushed: false, all: true } };
    return;
  }
  if (SK.tool === 'erase') { skDrawing = { erased: false, whole: e.shiftKey, last: pt }; skEraseAt(pt); return; }
  var act = skLays().filter(function (x) { return x.id === SK.active[SK.mode]; })[0];
  if (act && !act.show) { act.show = true; skLinesUI(); skRedraw(); }   // drawing on a hidden layer shows it, so the line is not invisible
  var s = skNew({ pts: [pt], color: SK.color, width: +(v.w * SK_PEN * SK.pen).toFixed(2), fill: SK.tool === 'blob', lay: SK.active[SK.mode], style: SK.style });
  if (s.fill && skGrad()) s.grad = skGrad();
  if (SK.tool === 'pen' && SK.pressure && e.pointerType === 'pen' && SK.style === 'solid') s.pr = [skPressure(e)];   // a pen that feels pressure draws a line that swells and thins
  skDrawing = { stroke: s, el: skEl(s), extra: [], brush: SK.lazy && (SK.tool === 'pen' || SK.tool === 'blob') ? pt.slice() : null };
  skDraw.appendChild(skDrawing.el);
  skLiveUpdate();
}
/** @returns {Object} A copy of a stroke folded over the middle line. */
/** @returns {Object} A curve's points folded over the middle line. */
function skMirrorCv(cv) {
  return { closed: cv.closed, a: cv.a.map(function (a) { var o = { p: skMirrorPt(a.p), o: [-a.o[0], a.o[1]] }; if (a.i) o.i = [-a.i[0], a.i[1]]; return o; }) };
}
function skMirrored(s) {
  var m = JSON.parse(JSON.stringify(s));
  m.pts = s.pts.map(skMirrorPt);
  if (m.cv) m.cv = skMirrorCv(m.cv);
  if (m.grad && m.grad.type === 'h') m.grad = { type: 'h', c1: m.grad.c2, c2: m.grad.c1 };   // the fade runs the other way round on the other side
  return m;
}
function skMove(e) {
  var pt = skPoint(e), v = SK_VIEW[SK.mode];
  skLastPt = pt;
  if (skPan) { skView.scrollLeft = skPan.left - (e.clientX - skPan.x); skView.scrollTop = skPan.top - (e.clientY - skPan.y); return; }
  if (SK.tool === 'curve' && skCurve && !skDrawing) { skCurveRender(pt); return; }
  if (SK.tool === 'curve' && !skCurve && !skDrawing && skCurveEdit) { skCv.style.cursor = ''; }
  if (!skDrawing || !e.isPrimary) return;
  if (skDrawing.curve) { skCurveDrag(pt); return; }
  if (skDrawing.curveEdit) { skCurveEditDrag(pt); return; }
  if (skDrawing.shape) { skShapeDrag(pt, e.shiftKey); return; }
  if (skDrawing.xf) { skXfMove(pt, e); return; }
  if (skDrawing.lasso) {
    var lp = skDrawing.lasso.pts;
    if (Math.hypot(pt[0] - lp[lp.length - 1][0], pt[1] - lp[lp.length - 1][1]) < v.w * 0.003) return;
    lp.push(pt);
    skDrawing.lasso.el.setAttribute('d', 'M' + lp.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z');
    return;
  }
  if (skDrawing.band) {
    var bd = skDrawing.band;
    skDrawing.band.el.setAttribute('x', Math.min(bd.x, pt[0])); skDrawing.band.el.setAttribute('y', Math.min(bd.y, pt[1]));
    skDrawing.band.el.setAttribute('width', Math.abs(pt[0] - bd.x)); skDrawing.band.el.setAttribute('height', Math.abs(pt[1] - bd.y));
    return;
  }
  if (skDrawing.image) {
    skDrawing.image.cx += pt[0] - skDrawing.last[0]; skDrawing.image.cy += pt[1] - skDrawing.last[1];
    skDrawing.last = pt; skDrawing.moved = true;
    skRenderImages();
    return;
  }
  if (SK.tool === 'erase') { skEraseAt(pt, skDrawing.last); skDrawing.last = pt; return; }
  var s = skDrawing.stroke;
  if (skDrawing.brush) {   // lazy brush: the line is pulled along on a string, so it only moves once the pen is further away than the string is long
    var b = skDrawing.brush, reach = v.w * 0.0008 * SK.lazyN, away = Math.hypot(pt[0] - b[0], pt[1] - b[1]);
    if (away <= reach) return;
    b[0] += (pt[0] - b[0]) * (away - reach) / away; b[1] += (pt[1] - b[1]) * (away - reach) / away;
    pt = [+b[0].toFixed(2), +b[1].toFixed(2)];
  }
  var last = s.pts[s.pts.length - 1];
  if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < v.w * 0.002) return;   // ignore tiny wobbles
  s.pts.push(pt);
  if (s.pr) s.pr.push(skPressure(e));
  skLiveUpdate();
}
function skUp() {
  if (skPan) skStage.classList.remove('panning');
  skPan = null;
  if (skDrawing && skDrawing.image) { skDrawing = false; skSaveImages(); return; }
  if (skDrawing && skDrawing.shape) { skShapeEnd(); return; }
  if (skDrawing && skDrawing.curve) { skDrawing = false; skCurveRender(skLastPt); return; }
  if (skDrawing && skDrawing.curveEdit) { skDrawing = false; skSave(); skCurveRender(null); return; }
  if (skDrawing && skDrawing.xf) { if (skDrawing.xf.all) SK.pick = []; skDrawing = false; skSave(); skXfRender(); return; }
  if (skDrawing && skDrawing.lasso) { skLassoEnd(); skDrawing = false; skXfRender(); return; }
  if (skDrawing && skDrawing.band) { skBandEnd(skLastPt || [skDrawing.band.x, skDrawing.band.y]); skDrawing = false; skXfRender(); return; }
  if (!skDrawing) return;
  if (skDrawing.stroke) {
    var s = skDrawing.stroke;
    if (s.pr) s = skLiveStroke(s);   // a pressure line is saved as its filled outline, so it is not tidied
    else {
      var t = L.tidyStroke(s.pts, SK_VIEW[SK.mode].w, { passes: SK.tidy, snap: $('skSnap').checked });
      s.pts = t.pts;
      if (t.closed) s.closed = true;
      if (s.style === 'wavy' && !s.fill) s.pts = skWavy(s.pts, s.width);
    }
    skPushHistory();
    SK.strokes[SK.mode].push(s);
    skSymExtra(s).forEach(function (c) { SK.strokes[SK.mode].push(c); });   // the other sides are the same line folded over and turned, so they always match exactly
    skRedraw();   // redrawn tidy, and in the right layer
  }
  skDrawing = false;
  skSave();
}
function skCancel() {
  if (skDrawing && skDrawing.el) skDrawing.el.remove();
  if (skDrawing && skDrawing.extra) skDrawing.extra.forEach(function (x) { x.remove(); });
  if (skDrawing && (skDrawing.lasso || skDrawing.band)) { (skDrawing.lasso || skDrawing.band).el.remove(); }
  skDrawing = false; skPan = null;
  skStage.classList.remove('panning');
}
var skTraceLast = null;   // the latest trace: its layer and picture, so it can be undone with the picture shown again
var skAutoLayers = {};   // layers made by a tool (Trace), by id: Undo takes the empty ones away again and Redo brings them back
/** After Undo or Redo: drops tool-made layers nothing is on any more, and restores ones the lines are on again. */
/** Shows or hides the picture a trace was made from, when its layer comes or goes (Undo and Redo). */
function skTracePicture(layerId, show) {
  if (!skTraceLast || skTraceLast.layer !== layerId) return;
  var im = SK.images[SK.mode].filter(function (i) { return i.id === skTraceLast.im; })[0];
  if (im) { im.visible = show; skRenderImages(); skLayersUI(); skSaveImages(); }
}
function skFixAutoLayers() {
  var lays = SK.layers[SK.mode], used = {};
  SK.strokes[SK.mode].forEach(function (s) { used[s.lay] = true; });
  Object.keys(skAutoLayers).forEach(function (id) {
    var at = lays.findIndex(function (l) { return l.id === id; });
    if (used[id] && at === -1) { lays.push(skAutoLayers[id]); skTracePicture(id, false); }
    else if (!used[id] && at !== -1 && lays.length > 1) {
      lays.splice(at, 1);
      skTracePicture(id, true);
      if (SK.active[SK.mode] === id) SK.active[SK.mode] = lays[lays.length - 1].id;
      SK.layerSet[SK.mode] = SK.layerSet[SK.mode].filter(function (x) { return x !== id; });
      if (!SK.layerSet[SK.mode].length) SK.layerSet[SK.mode] = [SK.active[SK.mode]];
    }
  });
  skLinesUI(); skMarkActive();
}
function skUndo() {
  if (skCurve) { skCurve.pts.pop(); if (!skCurve.pts.length) skCurve = null; skCurveRender(skLastPt); skFlash('skUndo'); return; }
  SK.pick = []; skXfRender();
  if (skCutAct && skCutOrig[skCutAct] && SK.images[SK.mode].some(function (i) { return i.id === skCutAct; }) && skCutUndo()) { skFlash('skUndo'); return; }
  var h = SK.hist[SK.mode];
  if (!h.length) { skStatus.textContent = 'Nothing to undo.'; return; }
  skFlash('skUndo');
  SK.redo[SK.mode].push(JSON.stringify(SK.strokes[SK.mode]));
  SK.strokes[SK.mode] = JSON.parse(h.pop());
  skFixAutoLayers();
  skRedraw();
  skHistoryUI();
  skStatus.textContent = 'Undone.';
  skSave();
}
function skRedo() {
  SK.pick = []; skXfRender();
  if (skCutRedoSt && skCutRedo()) { skFlash('skRedo'); return; }
  var r = SK.redo[SK.mode];
  if (!r.length) { skStatus.textContent = 'Nothing to redo.'; return; }
  skFlash('skRedo');
  SK.hist[SK.mode].push(JSON.stringify(SK.strokes[SK.mode]));
  SK.strokes[SK.mode] = JSON.parse(r.pop());
  skFixAutoLayers();
  skRedraw();
  skHistoryUI();
  skStatus.textContent = 'Redone.';
  skSave();
}

// ---------- special lines and shapes ----------
/** @returns {number[][]} The points of a wavy version of a line (the wave grows with the line's thickness). */
function skWavy(pts, width) {
  var v = SK_VIEW[SK.mode];
  return L.sketchWave(pts, Math.max(width * 1.2, v.w * 0.005), Math.max(width * 6, v.w * 0.028));
}
/** Pressing with the shape tool: the shape grows from this corner as you drag. */
function skShapeDown(pt) {
  var el = document.createElementNS(SVGNS, 'path'), v = SK_VIEW[SK.mode];
  el.setAttribute('fill', SK.fillMode === 'none' ? 'none' : skGrad() ? 'url(#' + skDef(L.sketchGradId(skGrad()), L.sketchGradDef(skGrad())) + ')' : SK.color); el.setAttribute('stroke', SK.color); el.setAttribute('stroke-width', v.w * SK_PEN * SK.pen);
  el.setAttribute('stroke-linejoin', 'round'); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('opacity', '.8');
  skDraw.appendChild(el);
  skDrawing = { shape: { a: pt, el: el, pts: null } };
}
/** @returns {number[][]} The shape stretched to the box from the press to the pointer (Shift: an even box). */
function skShapeBox(a, pt, even) {
  var dx = pt[0] - a[0], dy = pt[1] - a[1];
  if (even) { var m = Math.max(Math.abs(dx), Math.abs(dy)); dx = (dx < 0 ? -m : m); dy = (dy < 0 ? -m : m); }
  var x0 = Math.min(a[0], a[0] + dx), y0 = Math.min(a[1], a[1] + dy), w = Math.abs(dx), h = Math.abs(dy);
  return L.sketchShape(SK.shape).map(function (p) { return [+(x0 + p[0] * w).toFixed(2), +(y0 + p[1] * h).toFixed(2)]; });
}
function skShapeDrag(pt, even) {
  var d = skDrawing.shape;
  d.pts = skShapeBox(d.a, pt, even);
  d.el.setAttribute('d', L.sketchPath(d.pts, true, 2));
}
function skShapeEnd() {
  var d = skDrawing.shape, v = SK_VIEW[SK.mode];
  skDrawing = false; d.el.remove();
  var xs = (d.pts || []).map(function (p) { return p[0]; }), ys = (d.pts || []).map(function (p) { return p[1]; });
  if (!d.pts || Math.max.apply(null, xs) - Math.min.apply(null, xs) < v.w * 0.01 || Math.max.apply(null, ys) - Math.min.apply(null, ys) < v.w * 0.01) { skRedraw(); return; }   // a plain click draws nothing
  var s = skNew({ pts: d.pts, color: SK.color, width: +(v.w * SK_PEN * SK.pen).toFixed(2), fill: SK.fillMode !== 'none', closed: true, lay: SK.active[SK.mode], style: SK.style === 'wavy' ? 'solid' : SK.style });
  if (s.fill && skGrad()) s.grad = skGrad();
  var act = skLays().filter(function (x) { return x.id === SK.active[SK.mode]; })[0];
  if (act && !act.show) { act.show = true; skLinesUI(); }
  skPushHistory();
  SK.strokes[SK.mode].push(s);
  skSymExtra(s).forEach(function (c) { SK.strokes[SK.mode].push(c); });
  skRedraw(); skSave();
}

// ---------- the curve tool: place points, drag to bend, and the line follows them smoothly ----------
// A curve is kept as its points (`cv`: anchors {p, o, i?} where `o` is the handle going on and `i` the one coming in, which is the
// mirror of `o` unless it is given) beside the ordinary line (`pts`) that is drawn from them. Click a curve with the Curve tool to
// tweak it: drag a point or a handle, double-click the line to add a point, double-click a point to remove it.
var skCurveEdit = null;   // {s: the curve being tweaked, t, last, kind, i}
function skIn(a) { return a.i || [-a.o[0], -a.o[1]]; }
/** @returns {number[][]} A smooth line through the anchors. */
function skCurvePts(anchors, closed, step) {
  var out = [], n = anchors.length, segs = closed ? n : n - 1, i, k;
  for (i = 0; i < segs; i++) {
    var a = anchors[i], b = anchors[(i + 1) % n], bi = skIn(b);
    var p0 = a.p, p1 = [a.p[0] + a.o[0], a.p[1] + a.o[1]], p2 = [b.p[0] + bi[0], b.p[1] + bi[1]], p3 = b.p;
    var len = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) + Math.hypot(a.o[0], a.o[1]) + Math.hypot(bi[0], bi[1]);
    var m = Math.max(4, Math.ceil(len / step));
    for (k = (i ? 1 : 0); k <= m; k++) {
      var t = k / m, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
  }
  return out.map(function (p) { return [+p[0].toFixed(2), +p[1].toFixed(2)]; });
}
/** Rebuilds a curve's line from its points. */
function skCurveRebuild(s, noTwin) {
  var v = SK_VIEW[SK.mode];
  s.pts = L.simplifyLine(skCurvePts(s.cv.a, s.cv.closed, v.w * 0.004), v.w * 0.0008);
  if (s.style === 'wavy') s.pts = skWavy(s.pts, s.width);
  skFillPaths.delete(s); skShapePaths.delete(s);
  if (SK.mirror && s.pair && !noTwin) {   // with Mirror on, the other half of a mirrored curve follows
    var twin = SK.strokes[SK.mode].filter(function (t) { return t !== s && t.pair === s.pair && t.cv; })[0];
    if (twin) { twin.cv = skMirrorCv(s.cv); skCurveRebuild(twin, true); }
  }
}
/** Gives every sharp corner handles pointing along its lines (the same shape as before), so it can be bent by dragging them. */
function skCurveNormalise(cv) {
  var n = cv.a.length;
  cv.a.forEach(function (a, k) {
    if (a.o[0] || a.o[1] || a.i) return;
    var nx = cv.a[(k + 1) % n], pv = cv.a[(k - 1 + n) % n];
    a.o = k < n - 1 || cv.closed ? [(nx.p[0] - a.p[0]) / 3, (nx.p[1] - a.p[1]) / 3] : [0, 0];
    a.i = k > 0 || cv.closed ? [(pv.p[0] - a.p[0]) / 3, (pv.p[1] - a.p[1]) / 3] : [0, 0];
  });
}
/** @returns {Object} A curve's points moved, resized, turned or flipped the same way as its line. */
function skXfCv(cv, op) {
  var flat = [];
  cv.a.forEach(function (a) { var i = skIn(a); flat.push(a.p, [a.p[0] + a.o[0], a.p[1] + a.o[1]], [a.p[0] + i[0], a.p[1] + i[1]]); });
  var r = L.sketchXform({ pts: flat, width: 1, d: null }, op).pts;
  return { closed: cv.closed, a: cv.a.map(function (a, k) {
    var p = r[3 * k], o = r[3 * k + 1], i = r[3 * k + 2], out = { p: p, o: [o[0] - p[0], o[1] - p[1]] };
    if (a.i) out.i = [i[0] - p[0], i[1] - p[1]];
    return out;
  }) };
}
/** Draws the line so far (while placing points) and the points with their handles. */
function skCurveRender(hover) {
  if (!skCv) return;
  skCv.replaceChildren();
  if (skCurveEdit && SK.strokes[SK.mode].indexOf(skCurveEdit.s) === -1) skCurveEdit = null;
  var building = !!skCurve, anchors = building ? skCurve.pts : skCurveEdit ? skCurveEdit.s.cv.a : [];
  if (!anchors.length) return;
  var v = SK_VIEW[SK.mode], upp = v.w / (skStage.getBoundingClientRect().width || v.w), step = v.w * 0.004, closed = !building && skCurveEdit.s.cv.closed;
  function add(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    skCv.appendChild(n); return n;
  }
  if (building) {
    var list = anchors.slice();
    if (hover && !skDrawing) list.push({ p: hover, o: [0, 0] });
    var pts = list.length > 1 ? skCurvePts(list, false, step) : [list[0].p];
    add('path', { d: L.sketchPath(pts, false, 2), fill: 'none', stroke: SK.color, 'stroke-width': v.w * SK_PEN * SK.pen, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .85 });
    if (SK.mirror) add('path', { d: L.sketchPath(pts.map(skMirrorPt), false, 2), fill: 'none', stroke: SK.color, 'stroke-width': v.w * SK_PEN * SK.pen, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .5 });
  }
  anchors.forEach(function (a, k) {
    var ends = [];
    if (a.o[0] || a.o[1]) { if (closed || k < anchors.length - 1 || building) ends.push([a.o[0], a.o[1]]); }
    var i = skIn(a);
    if ((i[0] || i[1]) && (closed || k > 0)) ends.push(i);
    ends.forEach(function (h) {
      add('line', { 'class': 'cvh', x1: a.p[0], y1: a.p[1], x2: a.p[0] + h[0], y2: a.p[1] + h[1] });
      add('circle', { 'class': 'cvk', cx: a.p[0] + h[0], cy: a.p[1] + h[1], r: 3.2 * upp });
    });
  });
  anchors.forEach(function (a, k) {
    add('rect', { 'class': building && k === 0 ? 'cva first' : 'cva', x: a.p[0] - 4 * upp, y: a.p[1] - 4 * upp, width: 8 * upp, height: 8 * upp });
  });
}
/** @returns {?Object} What is under the pointer in the curve being tweaked: a handle ({kind: 'h', i, side}), a point ({kind: 'a', i}) or its line ({kind: 'l'}). */
function skCurveTarget(pt) {
  var s = skCurveEdit.s, cv = s.cv, v = SK_VIEW[SK.mode], upp = v.w / (skStage.getBoundingClientRect().width || v.w), r = 9 * upp, n = cv.a.length, k;
  for (k = 0; k < n; k++) {
    var a = cv.a[k], i = skIn(a);
    if ((cv.closed || k < n - 1) && (a.o[0] || a.o[1]) && Math.hypot(pt[0] - a.p[0] - a.o[0], pt[1] - a.p[1] - a.o[1]) < r) return { kind: 'h', i: k, side: 'o' };
    if ((cv.closed || k > 0) && (i[0] || i[1]) && Math.hypot(pt[0] - a.p[0] - i[0], pt[1] - a.p[1] - i[1]) < r) return { kind: 'h', i: k, side: 'i' };
  }
  for (k = 0; k < n; k++) if (Math.hypot(pt[0] - cv.a[k].p[0], pt[1] - cv.a[k].p[1]) < r) return { kind: 'a', i: k };
  if (L.sketchHit(s.pts, pt, r + s.width / 2)) return { kind: 'l' };
  return null;
}
/** Adds a point on the line where it was double-clicked, without changing the shape. */
function skCurveSplit(pt) {
  var cv = skCurveEdit.s.cv, n = cv.a.length, segs = cv.closed ? n : n - 1, best = null, i, k;
  for (i = 0; i < segs; i++) {
    var a = cv.a[i], b = cv.a[(i + 1) % n], bi = skIn(b), p0 = a.p, p1 = [a.p[0] + a.o[0], a.p[1] + a.o[1]], p2 = [b.p[0] + bi[0], b.p[1] + bi[1]], p3 = b.p;
    for (k = 1; k < 60; k++) {
      var t = k / 60, u = 1 - t;
      var x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      var d = Math.hypot(x - pt[0], y - pt[1]);
      if (!best || d < best.d) best = { d: d, i: i, t: t };
    }
  }
  if (!best) return;
  var a2 = cv.a[best.i], b2 = cv.a[(best.i + 1) % n], bi2 = skIn(b2), t2 = best.t;
  var P0 = a2.p, P1 = [a2.p[0] + a2.o[0], a2.p[1] + a2.o[1]], P2 = [b2.p[0] + bi2[0], b2.p[1] + bi2[1]], P3 = b2.p;
  function lerp(p, q) { return [p[0] + (q[0] - p[0]) * t2, p[1] + (q[1] - p[1]) * t2]; }
  var Q0 = lerp(P0, P1), Q1 = lerp(P1, P2), Q2 = lerp(P2, P3), R0 = lerp(Q0, Q1), R1 = lerp(Q1, Q2), S = lerp(R0, R1);   // de Casteljau: the two halves are the same curve
  skPushHistory();
  a2.o = [Q0[0] - P0[0], Q0[1] - P0[1]];
  b2.i = [Q2[0] - P3[0], Q2[1] - P3[1]];
  cv.a.splice(best.i + 1, 0, { p: S, o: [R1[0] - S[0], R1[1] - S[1]], i: [R0[0] - S[0], R0[1] - S[1]] });
  skCurveRebuild(skCurveEdit.s); skRedraw(); skSave();
}
/** Pressing with the curve tool: tweak a curve, or place a point of a new one (drag to bend it; double-click finishes; the first point closes). */
function skCurveDown(e, pt) {
  var v = SK_VIEW[SK.mode], upp = v.w / (skStage.getBoundingClientRect().width || v.w), now = Date.now();
  if (!skCurve) {
    if (skCurveEdit) {
      var t = skCurveTarget(pt), s = skCurveEdit.s, dbl = now - skCurveEdit.t < 350 && Math.hypot(pt[0] - skCurveEdit.last[0], pt[1] - skCurveEdit.last[1]) < 10 * upp;
      skCurveEdit.t = now; skCurveEdit.last = pt;
      if (t) {
        if (t.kind === 'l') { if (dbl) skCurveSplit(pt); skCurveRender(null); return; }
        if (t.kind === 'a' && dbl && s.cv.a.length > (s.cv.closed ? 3 : 2)) {
          skPushHistory(); s.cv.a.splice(t.i, 1); skCurveRebuild(s); skRedraw(); skSave(); skCurveRender(null); return;
        }
        var a = s.cv.a[t.i];
        if (t.kind === 'h' && e.altKey && !a.i) a.i = skIn(a).slice();   // Alt: this handle moves on its own
        skDrawing = { curveEdit: { t: t, start: pt, p0: a.p.slice(), pushed: false } };
        return;
      }
    }
    var list = skOrdered().filter(skSelectable), r = v.w * 0.012, hit = null, k;
    for (k = list.length - 1; k >= 0; k--) if (list[k].cv && L.sketchHit(list[k].pts, pt, r + list[k].width / 2)) { hit = list[k]; break; }
    if (hit) { skCurveNormalise(hit.cv); skCurveEdit = { s: hit, t: now, last: pt }; skStatus.textContent = 'Drag a point or a handle. Double-click the line to add a point, a point to remove it.'; skCurveRender(null); return; }
    skCurveEdit = null;
    skCurve = { pts: [], t: 0 };
  } else {
    var last = skCurve.pts[skCurve.pts.length - 1], first = skCurve.pts[0];
    if (now - skCurve.t < 350 && Math.hypot(pt[0] - last.p[0], pt[1] - last.p[1]) < 10 * upp) { skCurveFinish(false); return; }
    if (skCurve.pts.length > 2 && Math.hypot(pt[0] - first.p[0], pt[1] - first.p[1]) < 10 * upp) { skCurveFinish(true); return; }
  }
  skCurve.t = now;
  skCurve.pts.push({ p: pt, o: [0, 0] });
  skDrawing = { curve: true };
  skCurveRender(null);
}
/** Dragging after pressing pulls the new point's handles out, which bends the line through it. */
function skCurveDrag(pt) {
  var a = skCurve.pts[skCurve.pts.length - 1];
  a.o = [pt[0] - a.p[0], pt[1] - a.p[1]];
  skCurveRender(null);
}
/** Dragging a point or a handle of the curve being tweaked. */
function skCurveEditDrag(pt) {
  var d = skDrawing.curveEdit, s = skCurveEdit.s, a = s.cv.a[d.t.i], v = SK_VIEW[SK.mode];
  if (!d.pushed) { if (Math.hypot(pt[0] - d.start[0], pt[1] - d.start[1]) < v.w * 0.002) return; d.pushed = true; skPushHistory(); }
  if (d.t.kind === 'a') a.p = [d.p0[0] + pt[0] - d.start[0], d.p0[1] + pt[1] - d.start[1]];
  else if (d.t.side === 'o') { a.o = [pt[0] - a.p[0], pt[1] - a.p[1]]; }
  else { var iv = [pt[0] - a.p[0], pt[1] - a.p[1]]; if (a.i) a.i = iv; else a.o = [-iv[0], -iv[1]]; }
  skCurveRebuild(s); skRedraw(); skCurveRender(null);
}
function skCurveCancel() {
  skCurve = null; skCurveEdit = null; skDrawing = false;
  skCurveRender(null);
}
/** Turns the points into a line in the drawing (closed into a loop if asked). */
function skCurveFinish(close) {
  var c = skCurve, v = SK_VIEW[SK.mode];
  skCurve = null; skDrawing = false;
  skCurveRender(null);
  if (!c || c.pts.length < 2) return;
  var s = skNew({ pts: [], color: SK.color, width: +(v.w * SK_PEN * SK.pen).toFixed(2), fill: false, lay: SK.active[SK.mode], style: SK.style, cv: { closed: !!close, a: c.pts.map(function (a) { return { p: a.p.slice(), o: a.o.slice() }; }) } });
  if (close) s.closed = true;
  skCurveRebuild(s);
  var act = skLays().filter(function (x) { return x.id === SK.active[SK.mode]; })[0];
  if (act && !act.show) { act.show = true; skLinesUI(); }
  skPushHistory();
  SK.strokes[SK.mode].push(s);
  if (SK.mirror) { s.pair = 'm' + Date.now().toString(36); SK.strokes[SK.mode].push(skMirrored(s)); }
  skSpin(SK.strokes[SK.mode].slice(-(SK.mirror ? 2 : 1))).forEach(function (c) { SK.strokes[SK.mode].push(c); });
  skRedraw(); skSave();
  skStatus.textContent = 'Curve added. Click it with the Curve tool to tweak it.';
}

// ---------- the transform tool: pick lines, then resize, turn or move them ----------
var skShapePaths = new WeakMap(), skLastPt = null;
/** @returns {boolean} Whether the Select or Lasso tool is on (they share the same box of handles). */
function skIsSel() { return SK.tool === 'select' || SK.tool === 'lasso'; }
/** @returns {{x0: number, y0: number, x1: number, y1: number}} The box round a stroke (its points and half its width). */
function skStrokeBox(s) {
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, w = (s.width || 0) / 2;
  s.pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  return { x0: x0 - w, y0: y0 - w, x1: x1 + w, y1: y1 + w };
}
/** @returns {?Object} The box round everything picked, or null if nothing is. */
function skPickBox() {
  if (!SK.pick.length) return null;
  var b = null;
  SK.pick.forEach(function (s) {
    var q = skStrokeBox(s);
    b = b ? { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) } : q;
  });
  return b;
}
/** @returns {boolean} Whether a point is inside a "Filled" shape. */
function skInShape(s, pt) {
  var path = skShapePaths.get(s);
  if (!path) { path = new Path2D(L.sketchPath(s.pts, true, 2)); skShapePaths.set(s, path); }
  return skCtx.isPointInPath(path, pt[0], pt[1]);
}
/** @returns {?Object} The topmost stroke under a point: lines first, then filled shapes and colour fills. */
function skStrokeAt(pt) {
  var r = SK_VIEW[SK.mode].w * 0.012, list = skOrdered().filter(skSelectable), i, s;
  for (i = list.length - 1; i >= 0; i--) { s = list[i]; if (!s.bucket && L.sketchHit(s.pts, pt, r + s.width / 2)) return s; }
  for (i = list.length - 1; i >= 0; i--) { s = list[i]; if (s.bucket ? skInFill(s, pt) : (s.fill && skInShape(s, pt))) return s; }
  return null;
}
/** Draws the box, the four corner handles and the round turning handle round whatever is picked. */
function skXfRender() {
  skSelButtons();
  skPickBarPlace();
  if (!skXf) return;
  skXf.replaceChildren();
  var box = skPickBox();
  if (!skIsSel() || !box) return;
  var v = SK_VIEW[SK.mode], upp = v.w / (skStage.getBoundingClientRect().width || v.w), hs = 5.5 * upp;
  function add(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    skXf.appendChild(n);
  }
  var cx = (box.x0 + box.x1) / 2, ry = box.y0 - 28 * upp;
  add('rect', { 'class': 'xb', x: box.x0, y: box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0 });
  add('line', { 'class': 'xstem', x1: cx, y1: box.y0, x2: cx, y2: ry });
  [['nw', box.x0, box.y0], ['ne', box.x1, box.y0], ['sw', box.x0, box.y1], ['se', box.x1, box.y1]].forEach(function (h) {
    add('rect', { 'class': 'xh', 'data-h': h[0], x: h[1] - hs, y: h[2] - hs, width: hs * 2, height: hs * 2 });
  });
  add('circle', { 'class': 'xh', 'data-h': 'rot', cx: cx, cy: ry, r: hs * 1.2 });
}
/** @returns {Object[]} How each picked line looks now, so a drag is always worked out from where it began. */
function skPickSnap() {
  return SK.pick.map(function (s) { return { s: s, pts: s.pts.map(function (p) { return p.slice(); }), d: s.d, width: s.width, cv: s.cv ? JSON.parse(JSON.stringify(s.cv)) : null }; });
}
/** Pressing on a corner (resize) or the round handle (turn). */
function skXfDown(e) {
  var h = e.target.dataset && e.target.dataset.h;
  if (!h || !e.isPrimary || e.button > 0 || !SK.pick.length) return;
  e.preventDefault(); e.stopPropagation();
  skXf.setPointerCapture(e.pointerId);
  var b = skPickBox();
  var corner = { nw: [b.x0, b.y0], ne: [b.x1, b.y0], sw: [b.x0, b.y1], se: [b.x1, b.y1] }[h];
  var anchor = { nw: [b.x1, b.y1], ne: [b.x0, b.y1], sw: [b.x1, b.y0], se: [b.x0, b.y0] }[h];
  skDrawing = { xf: { kind: h === 'rot' ? 'rotate' : 'scale', corner: corner, anchor: anchor, centre: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], start: skPoint(e), snap: skPickSnap(), pushed: false } };
}
/** Pressing on the drawing with the transform tool: pick a line, start a box round some, or move what is picked. */
function skSelDown(e, pt) {
  var hit = skStrokeAt(pt), box = skPickBox();
  if (SK.paint && hit) { skPaintOn(hit); return; }
  var inBox = box && pt[0] >= box.x0 && pt[0] <= box.x1 && pt[1] >= box.y0 && pt[1] <= box.y1;
  if (hit && e.shiftKey) {   // Shift adds a line to the pick, or takes it out
    var at = SK.pick.indexOf(hit);
    if (at === -1) SK.pick.push(hit); else SK.pick.splice(at, 1);
    skXfRender();
    return;
  }
  if (hit && SK.pick.indexOf(hit) === -1) { SK.pick = [hit]; skFollowPick(); }
  else if (!hit && !inBox) {
    if (!e.shiftKey) SK.pick = [];
    skXfRender();
    var lasso = SK.tool === 'lasso', el = document.createElementNS(SVGNS, lasso ? 'path' : 'rect');
    el.setAttribute('class', 'xr');
    skXf.appendChild(el);
    skDrawing = lasso ? { lasso: { pts: [pt], el: el } } : { band: { x: pt[0], y: pt[1], el: el, shift: e.shiftKey } };
    return;
  }
  skDrawing = { xf: { kind: 'move', start: pt, snap: skPickSnap(), pushed: false } };
  skXfRender();
}
/** The drag in progress: works out the move, resize or turn from where the pointer began. */
function skXfMove(pt, e) {
  var x = skDrawing.xf, op, v = SK_VIEW[SK.mode];
  if (x.kind === 'move') {
    op = { kind: 'move', dx: pt[0] - x.start[0], dy: pt[1] - x.start[1] };
    if (!x.pushed && Math.hypot(op.dx, op.dy) < v.w * 0.003) return;   // a plain click does not count as a change
  } else if (x.kind === 'scale') {
    var ax = x.anchor[0], ay = x.anchor[1], cw = x.corner[0] - ax, ch = x.corner[1] - ay, sx, sy;
    if (e.shiftKey) { sx = (pt[0] - ax) / (cw || 1e-6); sy = (pt[1] - ay) / (ch || 1e-6); }   // Shift: stretch each way on its own
    else { var d2 = (cw * cw + ch * ch) || 1e-6; sx = sy = ((pt[0] - ax) * cw + (pt[1] - ay) * ch) / d2; }   // along the corner's diagonal, keeping the shape
    op = { kind: 'scale', ax: ax, ay: ay, sx: Math.max(0.05, sx), sy: Math.max(0.05, sy) };
  } else {
    var c = x.centre, a = Math.atan2(pt[1] - c[1], pt[0] - c[0]) - Math.atan2(x.start[1] - c[1], x.start[0] - c[0]);
    if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);   // Shift: in steps of 15 degrees
    op = { kind: 'rotate', cx: c[0], cy: c[1], a: a };
  }
  if (!x.pushed) { x.pushed = true; skPushHistory(); }   // the undo step is how it looked before the first change
  x.snap.forEach(function (o) {
    var r = L.sketchXform({ pts: o.pts, d: o.d, width: o.width }, op);
    o.s.pts = r.pts; o.s.width = r.width;
    if (o.d) o.s.d = r.d;
    if (o.cv) o.s.cv = skXfCv(o.cv, op);
    skFillPaths.delete(o.s); skShapePaths.delete(o.s);
  });
  skRedraw();
  skXfRender();
}
/** Lets go of a box drawn round lines: picks the ones it touches. */
function skBandEnd(pt) {
  var b = skDrawing.band, x0 = Math.min(b.x, pt[0]), x1 = Math.max(b.x, pt[0]), y0 = Math.min(b.y, pt[1]), y1 = Math.max(b.y, pt[1]);
  SK.strokes[SK.mode].forEach(function (s) {
    var q = skStrokeBox(s);
    if (skSelectable(s) && q.x0 <= x1 && q.x1 >= x0 && q.y0 <= y1 && q.y1 >= y0 && SK.pick.indexOf(s) === -1) SK.pick.push(s);
  });
  skFollowPick();
}
/** Lets go of a lasso: picks every line with a point inside the loop (points are checked along the line too, not just its corners). */
function skLassoEnd() {
  var poly = skDrawing.lasso.pts, step = SK_VIEW[SK.mode].w * 0.01;
  if (poly.length < 3) return;
  function inside(s) {
    var b = skStrokeBox(s), c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    if (L.inPolygon(poly, c)) return true;
    for (var i = 0; i < s.pts.length; i++) {
      var p = s.pts[i], q = s.pts[i - 1] || p, n = Math.max(1, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / step));
      for (var k = 1; k <= n; k++) if (L.inPolygon(poly, [q[0] + (p[0] - q[0]) * k / n, q[1] + (p[1] - q[1]) * k / n])) return true;
    }
    return false;
  }
  SK.strokes[SK.mode].forEach(function (s) { if (skSelectable(s) && SK.pick.indexOf(s) === -1 && inside(s)) SK.pick.push(s); });
  skFollowPick();
}
/** Removes the picked lines (Delete). */
function skDeletePick() {
  if (!SK.pick.length) return;
  skPushHistory();
  SK.strokes[SK.mode] = SK.strokes[SK.mode].filter(function (s) { return SK.pick.indexOf(s) === -1; });
  SK.pick = [];
  skRedraw(); skXfRender(); skSave();
  skStatus.textContent = 'Removed. Undo brings it back.';
}

/** Lets the buttons for picked lines work only while some are picked. */
function skSelButtons() {
  var none = !SK.pick.length, shapes = SK.pick.filter(function (s) { return s.closed || s.fill || s.bucket || s.d; }).length;
  $('skSelTools').querySelectorAll('button').forEach(function (b) { b.disabled = none; });
  ['skUnion', 'skSubtract', 'skIntersect'].forEach(function (id) { $(id).disabled = shapes < 2; });   // combining needs two closed shapes
  $('skRepeat').disabled = SK.pick.length < 2;   // a path and a shape
  if (SK.paint) $('skPaint').disabled = false;   // so it can be switched off again
}
/** Runs a transform on everything picked, as one undo step. */
function skApplyOp(op) {
  if (!SK.pick.length) return;
  skPushHistory();
  SK.pick.forEach(function (s) {
    var r = L.sketchXform({ pts: s.pts, d: s.d, width: s.width }, op);
    s.pts = r.pts; s.width = r.width;
    if (s.d) s.d = r.d;
    if (s.cv) s.cv = skXfCv(s.cv, op);
    skFillPaths.delete(s); skShapePaths.delete(s);
  });
  skRedraw(); skXfRender(); skSave();
}
function skFlip(axis) {
  var b = skPickBox();
  if (!b) return;
  skApplyOp({ kind: 'flip', axis: axis, c: axis === 'x' ? (b.x0 + b.x1) / 2 : (b.y0 + b.y1) / 2 });
  skStatus.textContent = axis === 'x' ? 'Flipped left-right.' : 'Flipped up-down.';
}
/** Puts copies of lines into the drawing, a little to the side so they can be told apart, and picks the copies. */
function skAddCopies(list) {
  var v = SK_VIEW[SK.mode], off = v.w * 0.03 * (1 + (SK.pasteN++ % 4));
  var added = list.map(function (s) {
    var c = JSON.parse(JSON.stringify(s)), r = L.sketchXform({ pts: c.pts, d: c.d, width: c.width }, { kind: 'move', dx: off, dy: off });
    c.pts = r.pts; if (c.d) c.d = r.d;
    if (c.cv) c.cv = skXfCv(c.cv, { kind: 'move', dx: off, dy: off });
    c.lay = SK.active[SK.mode]; delete c.pair;
    return c;
  });
  skPushHistory();
  added.forEach(function (c) { SK.strokes[SK.mode].push(c); });
  SK.pick = added;
  skRedraw(); skXfRender(); skSave();
}
function skDuplicate() {
  if (!SK.pick.length) return;
  skAddCopies(skOrdered().filter(function (s) { return SK.pick.indexOf(s) !== -1; }));
  skStatus.textContent = 'Duplicated.';
}
function skCopyPick() {
  if (!SK.pick.length) return false;
  SK.clip = JSON.parse(JSON.stringify(skOrdered().filter(function (s) { return SK.pick.indexOf(s) !== -1; })));
  SK.pasteN = 0;
  skStatus.textContent = 'Copied. Ctrl+V pastes.';
  return true;
}
function skPasteLines() {
  if (!SK.clip.length) return false;
  if (!skIsSel()) skSetTool('select');
  skAddCopies(SK.clip);
  skStatus.textContent = 'Pasted.';
  return true;
}
/** Moves what is picked to the front or back of its layer. */
function skStack(front) {
  if (!SK.pick.length) return;
  skPushHistory();
  var all = SK.strokes[SK.mode], moved = all.filter(function (s) { return SK.pick.indexOf(s) !== -1; }), rest = all.filter(function (s) { return SK.pick.indexOf(s) === -1; });
  SK.strokes[SK.mode] = front ? rest.concat(moved) : moved.concat(rest);
  skRedraw(); skSave();
  skStatus.textContent = front ? 'Brought to front.' : 'Sent to back.';
}
function skToLayer() {
  if (!SK.pick.length) return;
  skPushHistory();
  SK.pick.forEach(function (s) { s.lay = SK.active[SK.mode]; });
  skRedraw(); skSave();
  skStatus.textContent = 'Moved to ' + skLays().filter(function (x) { return x.id === SK.active[SK.mode]; })[0].name + '.';
}
$('skFlipH').addEventListener('click', function () { skFlip('x'); });
$('skFlipV').addEventListener('click', function () { skFlip('y'); });
$('skDup').addEventListener('click', skDuplicate);
$('skFront').addEventListener('click', function () { skStack(true); });
$('skBack').addEventListener('click', function () { skStack(false); });
$('skToLayer').addEventListener('click', skToLayer);
/** The game's own dark brown, used for outlines. */
var SK_INK = '#5b4239';
/**
 * Outline: gives each picked shape a line round its edge, in the chosen colour and thickness. The Position slider moves the line
 * outwards (positive) or inwards (negative, an "inline"); the edge is moved evenly all round by growing or shrinking the shape.
 */
function skOutline() {
  var v = SK_VIEW[SK.mode], list = SK.strokes[SK.mode], shapes = skOrdered().filter(function (s) { return SK.pick.indexOf(s) !== -1 && (s.fill || s.closed || s.bucket || s.d) && s.pts.length > 2; });
  if (!shapes.length) { skStatus.textContent = 'Pick a closed or filled shape first.'; return; }
  var w = +(v.w * SK_PEN * +$('skOlW').value).toFixed(2), color = $('skOlColor').value, move = +$('skOlPos').value * v.w * 0.003, made = 0;
  var scale = 900 / Math.max(v.w, v.h), pad = Math.ceil(Math.abs(move) * scale) + 4, W = Math.round(v.w * scale) + 2 * pad, H = Math.round(v.h * scale) + 2 * pad;
  skPushHistory();
  shapes.forEach(function (s) {
    var o = { pts: s.pts.map(function (p) { return p.slice(); }), color: color, width: w, fill: false, closed: true, lay: s.lay, style: 'solid' };
    if (s.d) o.d = s.d;
    if (s.clip) o.clip = true;
    if (Math.abs(move) > 0.01) {   // the edge is moved: draw the shape, grow or shrink it, and trace its new edge
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var g = cv.getContext('2d', { willReadFrequently: true });
      g.setTransform(scale, 0, 0, scale, (pad / scale - v.x) * scale, (pad / scale - v.y) * scale);
      g.fillStyle = '#000';
      g.fill(s.d ? new Path2D(s.d) : new Path2D(L.sketchPath(s.pts, true, 2)), s.d ? 'evenodd' : 'nonzero');
      var px = g.getImageData(0, 0, W, H).data, mask = new Uint8Array(W * H), i;
      for (i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] > 127 ? 1 : 0;
      var moved = L.offsetMask(mask, W, H, move * scale), loops = L.traceLoops(moved, W, H).map(function (lp) {
        var real = L.simplifyLine(lp.concat([lp[0]]).map(function (p) { return [v.x + (p[0] - pad) / scale, v.y + (p[1] - pad) / scale]; }), 1 / scale), out = [];
        L.fitCurve(real, v.w * 0.002).forEach(function (b) {
          for (var k = 0; k < 10; k++) { var t = k / 10, u = 1 - t; out.push([+(u * u * u * b[0][0] + 3 * u * u * t * b[1][0] + 3 * u * t * t * b[2][0] + t * t * t * b[3][0]).toFixed(2), +(u * u * u * b[0][1] + 3 * u * u * t * b[1][1] + 3 * u * t * t * b[2][1] + t * t * t * b[3][1]).toFixed(2)]); }
        });
        return out;
      }).filter(function (lp) { return lp.length > 2; });
      if (!loops.length) return;   // shrunk away to nothing
      o.pts = loops.slice().sort(function (a, b) { return b.length - a.length; })[0];
      o.d = loops.map(function (lp) { return 'M' + lp.map(function (p) { return p[0] + ' ' + p[1]; }).join('L') + 'Z'; }).join('');
    }
    skNew(o);
    list.splice(list.indexOf(s) + 1, 0, o);
    made++;
  });
  if (!made) { SK.hist[SK.mode].pop(); skHistoryUI(); skStatus.textContent = 'The shape is too small to move the outline in that far.'; return; }
  skRedraw(); skSave();
  skStatus.textContent = (+$('skOlPos').value < 0 ? 'Inline added.' : 'Outline added.') + ' Change colour, thickness or position and press Outline again for another.';
}
/** Turns each picked pen line into a curve with points and handles, so the Curve tool can tweak it. */
function skToCurve() {
  var v = SK_VIEW[SK.mode], todo = SK.pick.filter(function (s) { return !s.cv && !s.bucket && !s.d && s.pts.length > 2 && s.style !== 'wavy'; });
  if (!todo.length) { skStatus.textContent = 'Pick pen lines (not curves or fills) to turn into curves.'; return; }
  skPushHistory();
  todo.forEach(function (s) {
    var loop = s.closed || s.fill, pts = loop ? s.pts.concat([s.pts[0]]) : s.pts, segs = L.fitCurve(pts, v.w * 0.003);
    if (!segs.length) return;
    var a = [{ p: segs[0][0].slice(), o: [segs[0][1][0] - segs[0][0][0], segs[0][1][1] - segs[0][0][1]] }];
    segs.forEach(function (b, k) {
      var next = { p: b[3].slice(), o: [0, 0], i: [b[2][0] - b[3][0], b[2][1] - b[3][1]] };
      if (k < segs.length - 1) next.o = [segs[k + 1][1][0] - b[3][0], segs[k + 1][1][1] - b[3][1]];
      a.push(next);
    });
    if (loop) { var last = a.pop(); a[0].i = last.i; }
    a.forEach(function (n) {   // a point whose two handles line up is smooth: it keeps one handle and the other follows
      if (n.i && Math.abs(n.i[0] + n.o[0]) < 0.01 && Math.abs(n.i[1] + n.o[1]) < 0.01) delete n.i;
    });
    s.cv = { closed: !!loop, a: a };
    if (loop) s.closed = true;
    skCurveRebuild(s, true);
  });
  skRedraw(); skSave();
  skStatus.textContent = 'Now a curve: click it with the Curve tool to move its points.';
}
/** Smooths each picked pen line: fits a few curves to it and keeps the result as plain points (each press smooths a bit more). */
function skSmooth() {
  var v = SK_VIEW[SK.mode], todo = SK.pick.filter(function (s) { return !s.cv && !s.bucket && !s.d && !s.pr && s.pts.length > 3 && s.style !== 'wavy'; });
  if (!todo.length) { skStatus.textContent = 'Pick pen lines (not curves or fills) to smooth.'; return; }
  skPushHistory();
  todo.forEach(function (s) {
    var loop = s.closed || s.fill, pts = loop ? s.pts.concat([s.pts[0]]) : s.pts, segs = L.fitCurve(pts, v.w * 0.008);
    if (!segs.length) return;
    var a = [{ p: segs[0][0].slice(), o: [segs[0][1][0] - segs[0][0][0], segs[0][1][1] - segs[0][0][1]] }];
    segs.forEach(function (b, k) {
      var next = { p: b[3].slice(), o: [0, 0], i: [b[2][0] - b[3][0], b[2][1] - b[3][1]] };
      if (k < segs.length - 1) next.o = [segs[k + 1][1][0] - b[3][0], segs[k + 1][1][1] - b[3][1]];
      a.push(next);
    });
    if (loop) { var last = a.pop(); a[0].i = last.i; }
    s.pts = L.simplifyLine(skCurvePts(a, !!loop, v.w * 0.008), v.w * 0.0015);
    skFillPaths.delete(s); skShapePaths.delete(s);
  });
  skRedraw(); skSave();
  skStatus.textContent = 'Smoothed. Press again for smoother.';
}
/** Joins the picked open lines: ends that almost touch meet in the middle, and a line whose ends almost meet is closed. */
function skJoin() {
  var v = SK_VIEW[SK.mode], lines = SK.pick.filter(function (s) { return !s.closed && !s.fill && !s.bucket && !s.d && !s.cv && s.pts.length > 1; });
  if (!lines.length) { skStatus.textContent = 'Pick open lines to join.'; return; }
  var ends = [];
  lines.forEach(function (s) { ends.push({ s: s, at: 0 }, { s: s, at: s.pts.length - 1 }); });
  var reach = Math.max(v.w * 0.05, 1), used = [], moved = 0, closed = 0;
  skPushHistory();
  ends.forEach(function (a, i) {
    if (used.indexOf(a) !== -1) return;
    var pa = a.s.pts[a.at], best = null, bd = reach;
    ends.forEach(function (b, j) {
      if (j === i || used.indexOf(b) !== -1 || (b.s === a.s && a.s.pts.length < 4)) return;
      var d = Math.hypot(a.s.pts[a.at][0] - b.s.pts[b.at][0], a.s.pts[a.at][1] - b.s.pts[b.at][1]);
      if (d < bd) { bd = d; best = b; }
    });
    if (!best) return;
    var pb = best.s.pts[best.at], m = [+((pa[0] + pb[0]) / 2).toFixed(2), +((pa[1] + pb[1]) / 2).toFixed(2)];
    a.s.pts[a.at] = m.slice(); best.s.pts[best.at] = m.slice();
    used.push(a, best); moved++;
    if (best.s === a.s) {   // both ends of one line: close it
      a.s.pts.pop(); a.s.closed = true; closed++;
    }
  });
  if (!moved) { SK.hist[SK.mode].pop(); skHistoryUI(); skStatus.textContent = 'No ends close enough to join.'; return; }
  skRedraw(); skSave();
  skStatus.textContent = 'Joined ' + moved + (moved === 1 ? ' gap' : ' gaps') + (closed ? ' (' + closed + ' closed)' : '') + '.';
}
/** Same style: copies the first picked line's colour, thickness and line style onto every line you click next. */
function skPaintToggle() {
  if (SK.paint) { SK.paint = null; skPaintLook(); skStatus.textContent = 'Same style off.'; return; }
  var s = SK.pick[0];
  if (!s) return;
  SK.paint = { color: s.color, width: s.width, style: s.style, fill: s.fill, grad: s.grad ? JSON.parse(JSON.stringify(s.grad)) : null };
  skPaintLook();
  skStatus.textContent = 'Same style: click lines to paint them like this one. Press the button again to stop.';
}
function skPaintLook() { $('skPaint').classList.toggle('on', !!SK.paint); skSelButtons(); }
/** Paints the copied style onto a line. */
function skPaintOn(s) {
  var p = SK.paint;
  if (!p || s.bucket) return;
  skPushHistory();
  s.color = p.color; s.width = p.width;
  if (p.style !== 'wavy' && s.style !== 'wavy') s.style = p.style;
  if ((s.closed || s.fill) && p.fill) { s.fill = true; if (p.grad) s.grad = JSON.parse(JSON.stringify(p.grad)); else delete s.grad; }
  skFillPaths.delete(s);
  skRedraw(); skSave();
}
/** Repeat along a line: the longest picked line is the path, and the other picked lines are copied along it (and used up). */
function skRepeat() {
  var v = SK_VIEW[SK.mode];
  function plen(s) {
    var t = 0, i;
    for (i = 1; i < s.pts.length; i++) t += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
    if (s.closed || s.fill) t += Math.hypot(s.pts[0][0] - s.pts[s.pts.length - 1][0], s.pts[0][1] - s.pts[s.pts.length - 1][1]);
    return t;
  }
  var cand = SK.pick.filter(function (s) { return !s.bucket && s.pts.length > 1; }), path = null;
  cand.forEach(function (s) { if (!path || plen(s) > plen(path)) path = s; });
  var stamps = SK.pick.filter(function (s) { return s !== path; });
  if (!path || !stamps.length) { skStatus.textContent = 'Pick a line to follow and the shape to repeat along it.'; return; }
  var loop = !!(path.closed || path.fill), pp = path.pts.slice(), total = plen(path);
  if (loop) pp.push(pp[0]);
  if (total < 1e-6) return;
  var n = Math.max(2, Math.min(80, parseInt($('skRepN').value, 10) || 8)), turn = $('skRepTurn').checked;
  var box = null;
  stamps.forEach(function (s) { var q = skStrokeBox(s); box = box ? { x0: Math.min(box.x0, q.x0), y0: Math.min(box.y0, q.y0), x1: Math.max(box.x1, q.x1), y1: Math.max(box.y1, q.y1) } : q; });
  var c = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2], copies = [], i;
  for (i = 0; i < n; i++) {
    var d = (loop ? i / n : i / (n - 1)) * total, acc = 0, j = 1, P, ang;
    while (j < pp.length - 1 && acc + Math.hypot(pp[j][0] - pp[j - 1][0], pp[j][1] - pp[j - 1][1]) < d) { acc += Math.hypot(pp[j][0] - pp[j - 1][0], pp[j][1] - pp[j - 1][1]); j++; }
    var a = pp[j - 1], b = pp[j], sl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.max(0, Math.min(1, (d - acc) / sl));
    P = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    stamps.forEach(function (s) {
      var m = JSON.parse(JSON.stringify(s)), r = { pts: s.pts, d: s.d, width: s.width };
      delete m.cv; delete m.pair;
      if (turn) r = L.sketchXform(r, { kind: 'rotate', cx: c[0], cy: c[1], a: ang });
      r = L.sketchXform(r, { kind: 'move', dx: P[0] - c[0], dy: P[1] - c[1] });
      m.pts = r.pts; m.width = r.width; if (s.d) m.d = r.d;
      copies.push(m);
    });
  }
  skPushHistory();
  SK.strokes[SK.mode] = SK.strokes[SK.mode].filter(function (s) { return stamps.indexOf(s) === -1; }).concat(copies);
  SK.pick = copies.concat([path]);
  skRedraw(); skXfRender(); skSave();
  skStatus.textContent = n + ' copies along the line. Undo brings the single shape back.';
}
$('skRepeat').addEventListener('click', function () { skPop('skRepPop'); });
$('skRepGo').addEventListener('click', function () { skRepeat(); skPop(null); });
$('skOutline').addEventListener('click', function () { skPop('skOlPop'); });
$('skOlGo').addEventListener('click', function () { skOutline(); skPop(null); });
$('skToCurve').addEventListener('click', skToCurve);
$('skSmooth').addEventListener('click', skSmooth);
$('skJoin').addEventListener('click', skJoin);
$('skPaint').addEventListener('click', skPaintToggle);
$('skDel').addEventListener('click', skDeletePick);

// ---------- combining shapes ----------
/**
 * Joins the picked closed shapes (union), cuts the ones above the lowest out of it (subtract) or keeps only where they all cross
 * (overlap). The shapes are drawn on a hidden canvas, combined, and the outline of what is left is kept as a new shape.
 */
function skCombine(op) {
  var shapes = skOrdered().filter(function (s) { return SK.pick.indexOf(s) !== -1 && (s.closed || s.fill || s.bucket || s.d); });
  if (shapes.length < 2) { skStatus.textContent = 'Pick two or more closed shapes first.'; return; }
  var v = SK_VIEW[SK.mode], scale = 900 / Math.max(v.w, v.h), W = Math.round(v.w * scale), H = Math.round(v.h * scale);
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(scale, 0, 0, scale, -v.x * scale, -v.y * scale);
  g.fillStyle = '#000';
  shapes.forEach(function (s, i) {
    g.globalCompositeOperation = i === 0 || op === 'union' ? 'source-over' : op === 'subtract' ? 'destination-out' : 'destination-in';
    g.fill(s.d ? new Path2D(s.d) : new Path2D(L.sketchPath(s.pts, true, 2)), s.d ? 'evenodd' : 'nonzero');
  });
  var px = g.getImageData(0, 0, W, H).data, mask = new Uint8Array(W * H), left = 0, i;
  for (i = 0; i < mask.length; i++) { mask[i] = px[i * 4 + 3] > 127 ? 1 : 0; left += mask[i]; }
  var loops = left ? L.traceLoops(mask, W, H).map(function (lp) {
    var real = lp.concat([lp[0]]).map(function (p) { return [v.x + p[0] / scale, v.y + p[1] / scale]; }), out = [];
    L.fitCurve(L.simplifyLine(real, 0.8 / scale), v.w * 0.0012).forEach(function (b) {   // the pixel staircase becomes a smooth outline
      for (var k = 0; k < 10; k++) { var t = k / 10, u = 1 - t; out.push([+(u * u * u * b[0][0] + 3 * u * u * t * b[1][0] + 3 * u * t * t * b[2][0] + t * t * t * b[3][0]).toFixed(2), +(u * u * u * b[0][1] + 3 * u * u * t * b[1][1] + 3 * u * t * t * b[2][1] + t * t * t * b[3][1]).toFixed(2)]); }
    });
    return out;
  }).filter(function (lp) { return lp.length > 2; }) : [];
  if (!loops.length) { skStatus.textContent = 'Nothing would be left, so nothing changed.'; return; }
  var base = shapes[0], outer = loops.slice().sort(function (a, b) { return b.length - a.length; })[0];
  var made = { d: loops.map(function (lp) { return 'M' + lp.map(function (p) { return p[0] + ' ' + p[1]; }).join('L') + 'Z'; }).join(''), pts: outer, color: base.color, width: base.width, fill: base.fill, closed: true, style: base.style, lay: base.lay };
  if (base.bucket) made.bucket = true;
  if (base.clip) made.clip = true;
  if (base.grad) made.grad = base.grad;
  skPushHistory();
  var list = SK.strokes[SK.mode], at = list.indexOf(base);
  SK.strokes[SK.mode] = list.filter(function (s) { return shapes.indexOf(s) === -1 || s === base; });
  SK.strokes[SK.mode][SK.strokes[SK.mode].indexOf(base)] = made;
  SK.pick = [made];
  skRedraw(); skXfRender(); skSave();
  skStatus.textContent = { union: 'Joined into one shape.', subtract: 'Cut out of the lowest shape.', intersect: 'Kept where they overlap.' }[op] + ' Undo brings them back.';
}
$('skUnion').addEventListener('click', function () { skCombine('union'); });
$('skSubtract').addEventListener('click', function () { skCombine('subtract'); });
$('skIntersect').addEventListener('click', function () { skCombine('intersect'); });

// ---------- the bar that floats by the picked lines, messages and the size ring ----------
/** Opens one of the settings pop-ups under the bar (or shuts them all when given null; the same one again closes it). */
function skPop(id) {
  ['skOlPop', 'skRepPop'].forEach(function (x) { $(x).hidden = x !== id || !$(x).hidden; });
}
/** Puts the bar of buttons for the picked lines just above them (below if there is no room), or hides it when nothing is picked. */
function skPickBarPlace() {
  var bar = $('skPickBar'), box = skPickBox(), main = bar.parentElement;
  if (!box || !skIsSel() || !skDraw || (skDrawing && skDrawing.xf)) { bar.hidden = true; skPop(null); return; }
  var v = SK_VIEW[SK.mode], dr = skDraw.getBoundingClientRect(), mr = main.getBoundingClientRect(), k = dr.width / v.w;
  bar.hidden = false;
  var bw = bar.offsetWidth, bh = bar.offsetHeight, left = dr.left - mr.left + (box.x0 - v.x) * k, right = dr.left - mr.left + (box.x1 - v.x) * k;
  var top = dr.top - mr.top + (box.y0 - v.y) * k, bottom = dr.top - mr.top + (box.y1 - v.y) * k;
  var x = Math.max(8, Math.min(mr.width - bw - 8, (left + right) / 2 - bw / 2)), y = top - bh - 46;   // clear of the round turning handle
  if (y < 8) y = bottom + 12;
  y = Math.max(8, Math.min(mr.height - bh - 8, y));
  bar.style.left = Math.round(x) + 'px'; bar.style.top = Math.round(y) + 'px';
}
new ResizeObserver(function () { skPickBarPlace(); }).observe($('skStage'));
skView.addEventListener('scroll', skPickBarPlace);
/** A ring the size of the pen or eraser follows the pointer over the drawing. */
function skRingMove(e) {
  var ring = $('skRing');
  if (!SK_PREFS.ring || !skDraw || (SK.tool !== 'pen' && SK.tool !== 'blob' && SK.tool !== 'erase') || SK.tool === 'hand' || SK.space) { ring.hidden = true; return; }
  var v = SK_VIEW[SK.mode], dr = skDraw.getBoundingClientRect(), mr = ring.parentElement.getBoundingClientRect(), k = dr.width / v.w, pen = v.w * SK_PEN * SK.pen;
  var d = (SK.tool === 'erase' ? 2 * Math.max(v.w * 0.012, pen / 2) : pen) * k;
  if (e.clientX < dr.left || e.clientX > dr.right || e.clientY < dr.top || e.clientY > dr.bottom) { ring.hidden = true; return; }
  d = Math.max(6, d);
  ring.hidden = false;
  ring.style.width = ring.style.height = d + 'px';
  ring.style.left = (e.clientX - mr.left - d / 2) + 'px'; ring.style.top = (e.clientY - mr.top - d / 2) + 'px';
}
skView.addEventListener('pointermove', skRingMove);
skView.addEventListener('pointerleave', function () { $('skRing').hidden = true; });
// the Pictures box opens by itself the first time a picture is added; its Add button should not also fold it
$('skPics').querySelector('summary').addEventListener('click', function (e) { if (e.target.closest('button')) e.preventDefault(); });

// ---------- tracing a picture ----------
/** @returns {number} How far a point is from the segment a-b. */
function skSegDist(p, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
/** Loads a picture layer's image. @returns {Promise<HTMLImageElement>} */
function skLoadImg(src) {
  return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = no; i.src = src; });
}
/**
 * Turns the selected picture into vector shapes on a new layer: Lines (dark ink on paper) or Colours (a few flat colours).
 * The picture is drawn at working size, sorted into ink or colour patches, and each patch's outline is smoothed into a curve.
 */
async function skTrace() {
  var im = skSelected();
  if (!im) { skStatus.textContent = 'Add a picture first (Images, below), then press To shapes.'; return; }
  var v = SK_VIEW[SK.mode], scale = 900 / Math.max(v.w, v.h), W = Math.round(v.w * scale), H = Math.round(v.h * scale), mode = $('skTraceMode').value;
  var btn = $('skTrace');
  btn.disabled = true; skStatus.textContent = 'Tracing…';
  try {
    var img = await skLoadImg(im.src);
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.setTransform(scale, 0, 0, scale, -v.x * scale, -v.y * scale);   // the canvas stays see-through round the picture: that is not traced
    g.translate(im.cx, im.cy); g.rotate((im.rot || 0) * Math.PI / 180);
    g.drawImage(img, -im.bw * im.scale / 2, -im.bh * im.scale / 2, im.bw * im.scale, im.bh * im.scale);
    var px = g.getImageData(0, 0, W, H).data, jobs = [], hex = function (c) { return '#' + c.map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join(''); };
    if (mode === 'lines') {
      jobs.push({ mask: L.despeckle(L.traceInk(px, W, H, +$('skTraceLevel').value), W, H, 6), color: SK.color, at: 0 });
    } else {
      var r = L.traceColours(px, W, H, +$('skTraceK').value), counts = r.palette.map(function () { return 0; }), i;
      r.labels = L.traceSmoothLabels(r.labels, W, H, r.palette.length);
      for (i = 0; i < r.labels.length; i++) if (r.labels[i] !== 255) counts[r.labels[i]]++;
      // the biggest colour goes at the bottom, and each colour's shape also covers every smaller colour above it,
      // so a dropped speck shows the colour beneath instead of a hole
      var order = r.palette.map(function (c, q) { return q; }).sort(function (a, b) { return counts[b] - counts[a]; }), rank = [];
      order.forEach(function (q, at) { rank[q] = at; });
      order.forEach(function (q, at) {
        var m = new Uint8Array(W * H);
        for (i = 0; i < m.length; i++) m[i] = r.labels[i] !== 255 && rank[r.labels[i]] >= at ? 1 : 0;
        jobs.push({ mask: L.despeckle(m, W, H, 8), color: hex(r.palette[q]), overlap: true, at: at });
      });
    }
    var made = [], LIMIT = 600, cands = [];
    jobs.forEach(function (job) { L.traceParts(job.mask, W, H, LIMIT).forEach(function (part) { cands.push({ job: job, part: part }); }); });
    cands.sort(function (a, b) { return b.part.size - a.part.size; });   // the biggest patches win when there are more than the limit
    var capped = cands.length > LIMIT;
    cands = cands.slice(0, LIMIT);
    cands.sort(function (a, b) { return a.job.at - b.job.at || b.part.size - a.part.size; });   // bottom colour first, so the others sit on top
    cands.forEach(function (cd) {
      var job = cd.job, part = cd.part;
      {
        var raw = L.traceLoops(part.mask, part.w, part.h);
        if (job.overlap) {   // a colour patch only a pixel or two thick is the blurred rim between two colours, not a shape
          var perim = 0;
          raw.forEach(function (lp) { lp.forEach(function (p, q) { var o = lp[(q + 1) % lp.length]; perim += Math.abs(o[0] - p[0]) + Math.abs(o[1] - p[1]); }); });
          if (perim && part.size * 2 / perim < 2.2) return;
        }
        var loops = raw.map(function (lp) {
          var real = L.simplifyLine(lp.concat([lp[0]]).map(function (p) { return [v.x + (p[0] + part.x) / scale, v.y + (p[1] + part.y) / scale]; }), 1.4 / scale), out = [];
          L.fitCurve(real, v.w * 0.0028).forEach(function (b) {
            for (var k = 0; k < 10; k++) { var t = k / 10, u = 1 - t; out.push([+(u * u * u * b[0][0] + 3 * u * u * t * b[1][0] + 3 * u * t * t * b[2][0] + t * t * t * b[3][0]).toFixed(2), +(u * u * u * b[0][1] + 3 * u * u * t * b[1][1] + 3 * u * t * t * b[2][1] + t * t * t * b[3][1]).toFixed(2)]); }
          });
          // a fitted curve that strays from the outline it was fitted to (it can overshoot) is dropped for the plain outline
          var stray = out.some(function (p) {
            var best = Infinity, j;
            for (j = 1; j < real.length && best > 3 / scale; j++) best = Math.min(best, skSegDist(p, real[j - 1], real[j]));
            return best > 3 / scale;
          });
          return stray ? real.slice(0, -1) : out;
        }).filter(function (lp) { return lp.length > 2; });
        if (!loops.length) return;
        var outer = loops.slice().sort(function (a, b) { return b.length - a.length; })[0];
        made.push({ d: loops.map(function (lp) { return 'M' + lp.map(function (p) { return p[0] + ' ' + p[1]; }).join('L') + 'Z'; }).join(''), pts: outer, color: job.color, width: job.overlap ? +(1.2 / scale).toFixed(2) : 0.2, fill: true, closed: true, style: 'solid' });
      }
    });
    if (!made.length) { skStatus.textContent = mode === 'lines' ? 'No ink found. Slide the ink level towards “more”, or try Colours.' : 'Nothing to turn into shapes in that picture.'; return; }
    var lays = skLays(), x = { id: 'l' + Date.now().toString(36), name: 'Shapes', show: true };
    skAutoLayers[x.id] = x;
    skTraceLast = { layer: x.id, im: im.id };
    lays.push(x); SK.active[SK.mode] = x.id; SK.layerSet[SK.mode] = [x.id];
    made.forEach(function (s) { s.lay = x.id; skNew(s); });
    skPushHistory();
    SK.strokes[SK.mode] = SK.strokes[SK.mode].concat(made);
    im.visible = false; skRenderImages(); skLayersUI(); skSaveImages();
    skLinesUI(); skMarkActive(); skRedraw(); skSave();
    skStatus.textContent = 'Made ' + made.length + (made.length === 1 ? ' shape' : ' shapes') + (capped ? ' (the biggest; small bits left out)' : '') + ' on a new layer, “Shapes”. The picture is hidden: tick Show to see it again.';
  } catch (err) {
    skStatus.textContent = 'Could not turn that picture into shapes.';
  } finally { btn.disabled = false; }
}
function skTraceUI() {
  var lines = $('skTraceMode').value === 'lines';
  $('skTraceLevelRow').hidden = !lines; $('skTraceKRow').hidden = lines;
}
$('skTrace').addEventListener('click', skTrace);
$('skTraceMode').addEventListener('change', skTraceUI);
skTraceUI();

// ---------- cutting out a picture's background ----------
var skCutAct = null;     // the picture that was cut most recently, while that is still the latest thing done (Ctrl+Z takes the cut back)
var skCutRedoSt = null;  // a cut that was just taken back (Ctrl+Y puts it back)
var skCutOrig = {};   // the picture as it was before the cut, by layer id (kept until the page is closed)
/** Puts the cut-out picture (a canvas with see-through parts) in place of the selected picture layer, keeping its size on the page. */
function skCutApply(im, cv, note) {
  if (!skCutOrig[im.id]) skCutOrig[im.id] = { src: im.src, bw: im.bw, bh: im.bh, scale: im.scale };
  var shown = im.bw * im.scale;
  im.src = cv.toDataURL('image/png'); im.bw = cv.width; im.bh = cv.height; im.scale = shown / cv.width;
  skCutAct = im.id; skCutRedoSt = null;
  skRenderImages(); skLayersUI(); skSaveImages();
  $('skCutUndo').disabled = false;
  skStatus.textContent = note;
}
/** @returns {Promise<{cv: HTMLCanvasElement, g: CanvasRenderingContext2D, w: number, h: number}>} The picture drawn on a canvas (at most 1600 pixels across). */
async function skCutCanvas(im) {
  var img = await skLoadImg(im.src), k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  var g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  return { cv: cv, g: g, w: w, h: h };
}
/** Makes the plain background of the selected picture see-through (it spreads in from the edges over colours like the corners). */
async function skCut() {
  var im = skSelected();
  if (!im) { skStatus.textContent = 'Add a picture first (Images, below).'; return; }
  try {
    var c = await skCutCanvas(im), data = c.g.getImageData(0, 0, c.w, c.h), n = L.cutBackground(data.data, c.w, c.h, +$('skCutTol').value);
    if (n < c.w * c.h * 0.002) { skStatus.textContent = 'No plain background found at the edges. Try a higher strength, or use Pick object.'; return; }
    c.g.putImageData(data, 0, 0);
    skCutApply(im, c.cv, 'Plain background cut out (' + Math.round(n / (c.w * c.h) * 100) + '% of the picture). Not right? Change the strength and press again, or Undo cut.');
  } catch (err) { skStatus.textContent = 'Could not cut out that picture.'; }
}
var skAi = null;   // the pick-an-object model, loaded the first time it is needed and kept while the page is open
var skCutSess = null;   // the picture being picked from: its original pixels, the model's reading of it and the clicks so far
/** Loads the click-to-pick model (SlimSAM, a small Segment Anything, through transformers.js from public CDNs; the browser keeps the download). */
function skAiLoad() {
  if (skAi) return skAi;
  skAi = (async function () {
    var T = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
    T.env.allowLocalModels = false;
    var shown = 0;
    function progress(p) {
      if (p.status === 'progress' && p.total > 2e6 && p.progress - shown >= 2) { shown = p.progress; skStatus.textContent = 'Downloading the model, first time only: ' + Math.round(p.progress) + '%'; }
    }
    var id = 'Xenova/slimsam-77-uniform';
    var model = await T.SamModel.from_pretrained(id, { progress_callback: progress });
    var processor = await T.AutoProcessor.from_pretrained(id);
    return { T: T, model: model, processor: processor };
  })();
  skAi.catch(function () { skAi = null; });   // a failed load can be tried again
  return skAi;
}
/** Starts or ends pick mode: click the object to keep in the selected picture. */
async function skCutAi() {
  if (skCutSess) { skCutPickOff('Pick mode off.'); return; }
  var im = skSelected();
  if (!im) { skStatus.textContent = 'Add a picture first (Images, below).'; return; }
  var btns = [$('skCutAi'), $('skCut')];
  btns.forEach(function (b) { b.disabled = true; });
  try {
    skStatus.textContent = skAi ? 'Reading the picture…' : 'Loading the model…';
    var ai = await skAiLoad(), c = await skCutCanvas(im);
    skStatus.textContent = 'Reading the picture…';
    var image = await ai.T.RawImage.fromCanvas(c.cv), inputs = await ai.processor(image);
    skCutSess = { id: im.id, c: c, ai: ai, inputs: inputs, emb: await ai.model.get_image_embeddings(inputs), pts: [], labels: [] };
    $('skCutAi').classList.add('on');
    skStatus.textContent = 'Click the object to keep. Click again to add more of it; Alt+click takes a part away. Press “Pick object” again when done.';
  } catch (err) {
    skCutSess = null;
    skStatus.textContent = 'The model could not run (' + String(err && err.message || err).slice(0, 80) + '). It needs an internet connection the first time. “Plain background” still works offline.';
  } finally { btns.forEach(function (b) { b.disabled = false; }); }
}
function skCutPickOff(note) {
  skCutSess = null;
  $('skCutAi').classList.remove('on');
  if (note) skStatus.textContent = note;
}
/** A click in pick mode: adds a point (or, with Alt, a point to leave out) and keeps only the object the model finds. */
async function skCutPoint(pt, minus) {
  var s = skCutSess, im = skSelected();
  if (!s || !im || im.id !== s.id) { skCutPickOff('Pick mode off (a different picture is selected).'); return; }
  var a = -(im.rot || 0) * Math.PI / 180, dx = pt[0] - im.cx, dy = pt[1] - im.cy;
  var x = dx * Math.cos(a) - dy * Math.sin(a), y = dx * Math.sin(a) + dy * Math.cos(a);
  var u = x / (im.bw * im.scale) + 0.5, w = y / (im.bh * im.scale) + 0.5;
  if (u < 0 || u > 1 || w < 0 || w > 1) return;
  if (s.busy) return;
  s.busy = true;
  try {
    skStatus.textContent = 'Finding the object…';
    s.pts.push([u, w]); s.labels.push(minus ? 0 : 1);
    var T = s.ai.T, rs = s.inputs.reshaped_input_sizes[0], n = s.pts.length;
    var pts = new T.Tensor('float32', s.pts.map(function (p) { return [p[0] * rs[1], p[1] * rs[0]]; }).flat(), [1, 1, n, 2]);
    var lab = new T.Tensor('int64', s.labels.map(BigInt), [1, 1, n]);
    var out = await s.ai.model(Object.assign({}, s.emb, { input_points: pts, input_labels: lab }));
    var masks = await s.ai.processor.post_process_masks(out.pred_masks, s.inputs.original_sizes, s.inputs.reshaped_input_sizes);
    var m = masks[0], sc = out.iou_scores.data, best = 0, i;
    for (i = 1; i < sc.length; i++) if (sc[i] > sc[best]) best = i;
    var c = s.c, size = c.w * c.h, off = best * size;
    var data = c.g.getImageData(0, 0, c.w, c.h), kept = 0;
    for (i = 0; i < size; i++) {
      if (m.data[off + i]) kept++; else data.data[i * 4 + 3] = 0;
    }
    var cv = document.createElement('canvas');
    cv.width = c.w; cv.height = c.h;
    cv.getContext('2d').putImageData(data, 0, 0);
    skCutApply(im, cv, 'Kept ' + Math.round(kept / size * 100) + '% of the picture. Click more of the object to add, Alt+click to take away, or Undo cut.');
  } catch (err) {
    skStatus.textContent = 'Could not pick that (' + String(err && err.message || err).slice(0, 80) + ').';
  } finally { if (skCutSess === s) s.busy = false; }
}
/** Gives the picture back its original (before it was cut). @returns {boolean} Whether there was a cut to take back. */
function skCutUndo() {
  var im = skSelected() || SK.images[SK.mode].filter(function (i) { return skCutOrig[i.id]; })[0], o = im && skCutOrig[im.id];
  if (!o) { skStatus.textContent = 'Nothing to undo for this picture.'; return false; }
  skCutRedoSt = { id: im.id, orig: o, cut: { src: im.src, bw: im.bw, bh: im.bh, scale: im.scale } };
  var shown = im.bw * im.scale;
  im.src = o.src; im.bw = o.bw; im.bh = o.bh; im.scale = shown / o.bw; delete skCutOrig[im.id];
  if (skCutSess) skCutPickOff();
  skCutAct = null;
  skRenderImages(); skLayersUI(); skSaveImages();
  $('skCutUndo').disabled = true;
  skStatus.textContent = 'Background back.';
  return true;
}
/** Ctrl+Y after a cut was taken back: cuts again. */
function skCutRedo() {
  var r = skCutRedoSt, im = r && SK.images[SK.mode].filter(function (i) { return i.id === r.id; })[0];
  if (!im) return false;
  var shown = im.bw * im.scale;
  skCutOrig[im.id] = r.orig;
  im.src = r.cut.src; im.bw = r.cut.bw; im.bh = r.cut.bh; im.scale = shown / r.cut.bw;
  skCutAct = im.id; skCutRedoSt = null;
  skRenderImages(); skLayersUI(); skSaveImages();
  $('skCutUndo').disabled = false;
  skStatus.textContent = 'Cut again.';
  return true;
}
$('skCut').addEventListener('click', skCut);
$('skCutAi').addEventListener('click', skCutAi);
$('skCutUndo').addEventListener('click', skCutUndo);

// ---------- the pet's own colours ----------
/** Shows the main colours of whatever is underneath (the pet and its skin, the background, the toy) as swatches, read from how it is drawn. */
function skPalette() {
  var root = skStage.querySelector('.sk-ref'), box = $('skGame');
  if (!root || !box) return;
  var tally = {};
  function add(css, weight) {
    var m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(css || '');
    if (!m || (m[4] !== undefined && +m[4] < 0.6)) return;
    var c = [+m[1], +m[2], +m[3]], key = c.join(',');
    tally[key] = tally[key] || { c: c, w: 0 };
    tally[key].w += weight;
  }
  root.querySelectorAll('path, ellipse, circle, rect, polygon').forEach(function (el) {
    var cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (cs.display === 'none' || !r.width || !r.height || +cs.opacity < 0.5) return;
    add(cs.fill, r.width * r.height);
    if (cs.stroke !== 'none') add(cs.stroke, (r.width + r.height) * Math.max(1, parseFloat(cs.strokeWidth) || 1));
  });
  var chosen = [];
  Object.keys(tally).map(function (k) { return tally[k]; }).sort(function (a, b) { return b.w - a.w; }).forEach(function (t) {
    if (chosen.length >= 10) return;
    if (chosen.every(function (o) { return Math.hypot(o[0] - t.c[0], o[1] - t.c[1], o[2] - t.c[2]) > 22; })) chosen.push(t.c);
  });
  box.replaceChildren.apply(box, chosen.map(function (c) {
    var hex = skHex(c[0], c[1], c[2]), b = document.createElement('button');
    b.type = 'button'; b.className = 'sk-swatch'; b.style.background = hex; b.dataset.c = hex; b.title = hex;
    b.setAttribute('aria-label', 'Game colour ' + hex);
    b.setAttribute('aria-pressed', String(hex === SK.color));
    return b;
  }));
}
$('skGame').addEventListener('click', function (e) {
  var b = e.target.closest('.sk-swatch');
  if (b) skUseColour(b.dataset.c);
});

// ---------- the paint bucket ----------
/**
 * Fills the area under the pointer that your lines close in, with the pen colour. The lines are drawn on a hidden canvas (a little
 * thicker, so tiny gaps do not leak), the area is spread over like a flood, and its outline is kept as a vector shape under your lines.
 */
function skBucket(pt) {
  var v = SK_VIEW[SK.mode], scale = 900 / Math.max(v.w, v.h), W = Math.round(v.w * scale), H = Math.round(v.h * scale), GAP = 2.5;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(scale, 0, 0, scale, -v.x * scale, -v.y * scale);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = g.fillStyle = '#000';
  var list = SK.strokes[SK.mode];
  list.forEach(function (s) {
    if (s.bucket || !skLive(s)) return;
    var path = new Path2D(L.sketchPath(s.pts, (s.fill || s.closed) && s.pts.length > 2, 2));
    g.lineWidth = Math.max(s.width, 2 / scale) + 2 * GAP / scale;
    g.stroke(path);
    if (s.fill) g.fill(path);
  });
  var px = g.getImageData(0, 0, W, H).data, wall = new Uint8Array(W * H);
  for (var i = 0; i < wall.length; i++) wall[i] = px[i * 4 + 3] > 40 ? 1 : 0;
  var spots = skSpots(pt), added = [], recoloured = false, why = '';
  spots.forEach(function (q) {
    var r = L.floodMask(wall, W, H, Math.floor((q[0] - v.x) * scale), Math.floor((q[1] - v.y) * scale));
    if (!r) { why = why || 'line'; return; }
    if (r.edge || r.count > 0.85 * W * H) { why = why || 'open'; return; }
    var loops = L.traceLoops(r.mask, W, H).map(function (lp) {
      var cut = L.simplifyLine(lp.concat([lp[0]]), 0.8).slice(0, -1);
      return cut.map(function (p) { return [+(v.x + p[0] / scale).toFixed(2), +(v.y + p[1] / scale).toFixed(2)]; });
    }).filter(function (lp) { return lp.length > 2; });
    if (!loops.length) { why = why || 'line'; return; }
    var d = loops.map(function (lp) { return 'M' + lp.map(function (p) { return p[0] + ' ' + p[1]; }).join('L') + 'Z'; }).join('');
    var outer = loops.slice().sort(function (a, b) { return b.length - a.length; })[0];
    var same = list.concat(added).filter(function (b) { return b.bucket && b.d === d; })[0];
    if (same) { same.color = SK.color; recoloured = true; return; }
    // wide enough to reach under the lines on every side, so no hairline shows between the fill and a line
    added.push({ d: d, pts: outer, color: SK.color, width: +(2 * (GAP + 1.5) / scale).toFixed(2), fill: true, closed: true, bucket: true, lay: SK.active[SK.mode] });
    skNew(added[added.length - 1]);
    if (skGrad()) added[added.length - 1].grad = skGrad();
  });
  if (!added.length && !recoloured) {
    skStatus.textContent = why === 'open' ? 'That area is not closed in. Finish the outline (or close the gap), then try again.' : 'Click inside an area between your lines, not on a line.';
    return;
  }
  skPushHistory();
  var at = list.findIndex(function (s) { return !s.bucket; });   // fills sit under all the lines
  if (at < 0) at = list.length;
  list.splice.apply(list, [at, 0].concat(added));
  skRedraw();
  skSave();
  skStatus.textContent = 'Filled with ' + SK.color + '.';
}

// ---------- what Claude needs ----------
/** @returns {Object} What Claude needs to put the drawing back over the same picture. */
function skMeta() {
  var v = SK_VIEW[SK.mode], scene = SK.mode === 'scene' || SK.mode === 'room';
  return {
    page: 'sketchpad', mode: SK.mode, kind: $('skKind').value, note: $('skNote').value.trim(), view: v,
    tidy: SK.tidy ? 'smoothed' + ($('skSnap').checked ? ', lines and ovals snapped' : '') : 'as drawn',
    pet: SK.mode === 'pet' && P.template ? { species: P.species, skin: P.skin, seated: P.seated, template: 'blank outline of this skin: shapes kept, colour and outfit removed' } : { species: P.species, skin: P.skin, seated: P.seated, outfit: P.outfit },
    backdrop: scene ? P.backdrop + (P.night ? ' (night)' : '') : undefined,
    furniture: SK.mode === 'room' ? Object.keys(P.room).filter(function (k) { return P.room[k]; }) : undefined,
    placement: SK.mode === 'room' ? 'room 400 x 160 (about the stage): draw ONE new piece of furniture; the pet box is x125 y18 w150 h140, placed furniture is shown behind it; convert the piece to a decor.js entry (x, y = its centre / 400 and / 160, w, h in px, own view box)'
      : SK.mode === 'scene' ? 'pet box x125 y18 w150 h140, toy x295 y124 w26'
      : SK.mode === 'pet' ? 'pet drawing is 160 x 150 at 0,0' : SK.mode === 'canvas' ? 'free canvas ' + v.w + ' x ' + v.h + ', nothing underneath' : 'toy drawing is 26 x 26'
  };
}
/** @returns {Object[]} The lines in drawing order, each with its layer's name when there are several layers. */
function skLayered(several) {
  return skOrdered().map(function (s) { return several ? Object.assign({}, s, { layer: skLayerOf(s).name }) : s; });
}
/** @returns {?{code: string, name: string}} A dressing-room entry for the drawing (pet drawings of a hat, clothes, glasses...), or null with a message. */
function skItemCode() {
  var slot = SK_ITEM_SLOTS[$('skKind').value], name = $('skItemName').value.trim();
  if (SK.mode !== 'pet' || !slot) { skStatus.textContent = 'Item code is for pet drawings of a hat, clothes, glasses, mouth thing, neckwear or shoes.'; return null; }
  if (skEmpty()) return null;
  if (!name) { skStatus.textContent = 'Give the game item a name first.'; $('skItemName').focus(); return null; }
  var id = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'item', base = id, n = 2;
  while (byId(Wardrobe, id)) id = base + n++;
  var code = L.sketchItemCode(skLayered(skLays().length > 1), { id: id, label: name, slot: slot, lines: ['so cute!', 'i love it!', 'looks good on me'], note: $('skNote').value.trim() }, SK_VIEW.pet);
  return { code: code, name: id };
}
function skFiles() {
  var m = skMeta(), several = skLays().length > 1;
  if (several) m.layers = skLays().map(function (x) { return x.name; });   // bottom first
  m.export = SK.clean ? 'clean: curves fitted to the lines' : 'raw: every pen point kept';
  var svg = L.sketchSvg(skLayered(several), SK_VIEW[SK.mode], m, { clean: SK.clean });
  var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  return { meta: m, svg: svg, name: m.kind + '-' + SK.mode + '-' + stamp };
}
function skEmpty() {
  if (SK.strokes[SK.mode].length) return false;
  skStatus.textContent = 'Nothing drawn on ' + SK.mode + ' yet.';
  return true;
}
function skSaveFile() {
  if (skEmpty()) return;
  var f = skFiles(), a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([f.svg], { type: 'image/svg+xml' }));
  a.download = f.name + '.svg';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  skStatus.textContent = 'Saved ' + f.name + '.svg.';
}
function skCopy() {
  if (skEmpty()) return;
  var text = skFiles().svg;
  navigator.clipboard.writeText(text).then(function () { skStatus.textContent = 'Copied. Paste it in the chat.'; },
    function () { skStatus.textContent = 'Could not copy. Try Save SVG.'; });
}

// ---------- PNG export ----------
/** Draws the finished drawing (the same SVG as Save SVG) on a canvas and gives back a PNG. @returns {Promise<Blob>} */
function skPngBlob(longest, bg) {
  var f = skFiles(), v = SK_VIEW[SK.mode], k = longest / Math.max(v.w, v.h), w = Math.max(1, Math.round(v.w * k)), h = Math.max(1, Math.round(v.h * k));
  var url = URL.createObjectURL(new Blob([f.svg], { type: 'image/svg+xml' }));
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'), g;
      cv.width = w; cv.height = h; g = cv.getContext('2d');
      if (bg !== 'none') { g.fillStyle = bg === 'white' ? '#ffffff' : '#ebddca'; g.fillRect(0, 0, w, h); }
      g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      cv.toBlob(function (b) { b ? resolve(Object.assign(b, { skName: f.name })) : reject(new Error('empty')); }, 'image/png');
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('could not draw it')); };
    img.src = url;
  });
}
/** Saves the PNG, or copies it to the clipboard. */
function skPng(longest, bg, save) {
  if (skEmpty()) return;
  skStatus.textContent = 'Making the PNG…';
  skPngBlob(longest, bg).then(function (b) {
    if (save) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = b.skName + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      skStatus.textContent = 'Saved ' + b.skName + '.png.';
    } else {
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { skStatus.textContent = 'PNG copied. Paste it where you want it.'; });
    }
  }).catch(function (err) { skStatus.textContent = 'Could not make the PNG (' + String(err && err.message || err).slice(0, 60) + '). Try Save PNG, or Save SVG.'; });
}
$('skPngSave').addEventListener('click', function () { skPng(+$('skPngSize').value, $('skPngBg').value, true); $('skPngDlg').close(); });
$('skPngCopy').addEventListener('click', function () { skPng(+$('skPngSize').value, $('skPngBg').value, false); $('skPngDlg').close(); });

$('skItemCode').addEventListener('click', function () {
  var it = skItemCode();
  if (!it) return;
  navigator.clipboard.writeText(it.code).then(function () { skStatus.textContent = 'Copied the item code for ' + it.name + '. It goes in the list in wardrobe.js.'; }, function () { skStatus.textContent = 'Could not copy. Use Upload, and I will add it.'; });
});
$('skClean').addEventListener('change', function () { SK.clean = $('skClean').checked; skSave(); });
$('skKind').addEventListener('change', skApplyLook);

// ---------- uploading to GitHub ----------
function ghSettings() {
  return { token: $('skToken').value.trim(), repo: $('skRepo').value.trim(), branch: $('skBranch').value.trim() || 'drawings' };
}
function ghSaveSettings() {
  try { localStorage.setItem('nibble-sketchpad-gh', JSON.stringify(ghSettings())); } catch (e) { /* storage not available */ }
}
function ghLoadSettings() {
  try {
    var g = JSON.parse(localStorage.getItem('nibble-sketchpad-gh') || 'null');
    if (!g) return;
    $('skToken').value = g.token || ''; $('skRepo').value = g.repo || 'laurmoe7/pet-shopper'; $('skBranch').value = g.branch || 'drawings';
  } catch (e) { /* nothing saved */ }
}
function ghReq(method, path, body) {
  var g = ghSettings();
  return fetch('https://api.github.com' + path, {
    method: method,
    headers: { Authorization: 'Bearer ' + g.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      if (!r.ok) { var err = new Error(j.message || ('GitHub said ' + r.status)); err.status = r.status; throw err; }
      return j;
    });
  });
}
/** Makes sure the drawings branch exists (made from the default branch the first time). */
function ghEnsureBranch() {
  var g = ghSettings(), base = '/repos/' + g.repo;
  return ghReq('GET', base + '/git/ref/heads/' + encodeURIComponent(g.branch)).catch(function (e) {
    if (e.status !== 404) throw e;
    return ghReq('GET', base).then(function (r) { return ghReq('GET', base + '/git/ref/heads/' + encodeURIComponent(r.default_branch)); })
      .then(function (ref) { return ghReq('POST', base + '/git/refs', { ref: 'refs/heads/' + g.branch, sha: ref.object.sha }); });
  });
}
/** @returns {Object} Everything needed to open the drawing again exactly as it was (the lines as drawn, layers, what was underneath). */
function skOriginal() {
  return { v: 1, mode: SK.mode, kind: $('skKind').value, note: $('skNote').value.trim(), tidy: SK.tidy, strokes: skOrdered(), layers: skLays(), active: SK.active[SK.mode],
    pet: { species: P.species, skin: P.skin, outfit: P.outfit, backdrop: P.backdrop, night: P.night, room: P.room, template: P.template, seated: P.seated } };
}
function skUpload() {
  if (skEmpty()) return;
  var g = ghSettings(), f = skFiles();
  if (!g.token || !g.repo) { $('skSettings').open = true; skStatus.textContent = 'Connect to GitHub first.'; return; }
  ghSaveSettings();
  skStatus.textContent = 'Uploading…';
  var put = function (path, text) { return ghReq('PUT', '/repos/' + g.repo + '/contents/drawings/' + path, { message: 'Drawing: ' + f.meta.kind + (f.meta.note ? ' - ' + f.meta.note.slice(0, 60) : ''), content: btoa(unescape(encodeURIComponent(text))), branch: g.branch }); };
  var item = $('skItemName').value.trim() && !$('skItemRow').hidden ? skItemCode() : null, keep = JSON.stringify(skOriginal());
  ghEnsureBranch().then(function () {
    return put(f.name + '.svg', f.svg);
  }).then(function () { return put(f.name + '.strokes.json', keep); }).then(function () { return item ? put(f.name + '.item.js', item.code + '\n') : null; }).then(function () {
    skStatus.textContent = 'Uploaded drawings/' + f.name + '.svg' + (item ? ' and its item code' : '') + '. Tell me in the chat.';
    if ($('skSentDlg').open) skSentLoad();
  }).catch(function (e) {
    skStatus.textContent = 'Could not upload: ' + e.message + (e.status === 401 || e.status === 403 || e.status === 404 ? ' (check the token and that it can write to this repository).' : '') + ' You can still use Save SVG.';
  });
}

// ---------- what has been sent ----------
var skSentAll = [], skSentShown = 0, SK_SENT_STEP = 8;
/** @returns {Promise<string>} The text of a file on the drawings branch. */
function ghFile(path) {
  var g = ghSettings();
  return fetch('https://api.github.com/repos/' + g.repo + '/contents/' + path + '?ref=' + encodeURIComponent(g.branch), { headers: { Authorization: 'Bearer ' + g.token, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' } })
    .then(function (r) { if (!r.ok) { var e = new Error('GitHub said ' + r.status); e.status = r.status; throw e; } return r.text(); });
}
/** @returns {Object} The notes saved in a drawing's first comment (what it is, its note, the pet it was drawn on). */
function skSvgMeta(svg) {
  var m = /<!-- (.*?) -->/.exec(svg);
  if (!m) return {};
  try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch (e) { return {}; }
}
function skSentLoad() {
  var g = ghSettings(), note = $('skSentNote');
  if (!g.token || !g.repo) { note.textContent = 'Connect to GitHub first (Send page, GitHub connection).'; return; }
  note.textContent = 'Looking…';
  ghReq('GET', '/repos/' + g.repo + '/contents/drawings?ref=' + encodeURIComponent(g.branch)).then(function (files) {
    var by = {};
    files.forEach(function (f) {
      var m = /^(.*?)\.(svg|strokes\.json|item\.js)$/.exec(f.name);
      if (!m) return;
      by[m[1]] = by[m[1]] || { base: m[1] };
      by[m[1]][m[2] === 'svg' ? 'svg' : m[2] === 'item.js' ? 'item' : 'strokes'] = f;
    });
    skSentAll = Object.keys(by).map(function (k) { return by[k]; }).filter(function (e) { return e.svg; }).sort(function (a, b) {
      var sa = (/(\d{8}-\d{6})$/.exec(a.base) || [0, a.base])[1], sb = (/(\d{8}-\d{6})$/.exec(b.base) || [0, b.base])[1];
      return sa < sb ? 1 : -1;
    });
    skSentShown = 0;
    $('skSentList').replaceChildren();
    note.textContent = skSentAll.length ? skSentAll.length + ' sent, newest first.' : 'Nothing sent yet.';
    skSentMore();
  }).catch(function (e) { note.textContent = e.status === 404 ? 'Nothing sent yet (no drawings folder).' : 'Could not look: ' + e.message; });
}
function skSentMore() {
  var list = $('skSentList');
  skSentAll.slice(skSentShown, skSentShown + SK_SENT_STEP).forEach(function (e) { list.appendChild(skSentCard(e)); });
  skSentShown = Math.min(skSentAll.length, skSentShown + SK_SENT_STEP);
  $('skSentMore').hidden = skSentShown >= skSentAll.length;
}
function skSentCard(e) {
  var card = document.createElement('div');
  card.className = 'skp-sent';
  card.innerHTML = '<img alt="" width="64" height="64"><div class="skp-sent-body"><b class="skp-sent-title"></b><span class="skp-sent-note"></span><div class="sk-row"><button type="button" class="skp-btn skp-small" data-act="show" title="Put it over the picture underneath, as an image layer">Show</button><button type="button" class="skp-btn skp-small" data-act="edit" title="Open the lines as you drew them, to keep working">Edit</button><button type="button" class="skp-btn skp-small skp-x" data-act="del" title="Delete this upload from GitHub">✕</button></div></div>';
  var stamp = /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(e.base);
  card.querySelector('.skp-sent-title').textContent = e.base.replace(/-\d{8}-\d{6}$/, '').replace(/-/g, ' · ');
  card.querySelector('.skp-sent-note').textContent = stamp ? stamp[3] + '/' + stamp[2] + '/' + stamp[1] + ' ' + stamp[4] + ':' + stamp[5] : '';
  card.querySelector('[data-act=edit]').disabled = !e.strokes;
  if (!e.strokes) card.querySelector('[data-act=edit]').title = 'Sent before the original lines were kept, so it can only be shown';
  ghFile('drawings/' + e.svg.name).then(function (svg) {
    e.text = svg;
    card.querySelector('img').src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    var meta = skSvgMeta(svg);
    if (meta.note) card.querySelector('.skp-sent-note').textContent += ' · ' + meta.note;
    e.meta = meta;
  }).catch(function () { card.querySelector('.skp-sent-note').textContent += ' (could not open it)'; });
  card.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || b.disabled) return;
    if (b.dataset.act === 'show') skSentShow(e);
    else if (b.dataset.act === 'edit') skSentEdit(e);
    else skSentDelete(e, card);
  });
  return card;
}
/** Switches to the area a drawing was made for. */
function skGoMode(mode) {
  if (mode && mode !== SK.mode && SK_VIEW[mode]) skSetMode(mode);
}
/** Shows a sent drawing over the picture underneath, as an image layer (it is never part of what you send). */
function skSentShow(e) {
  if (!e.text) { skStatus.textContent = 'It is still loading.'; return; }
  skGoMode((e.meta || {}).mode);
  var v = SK_VIEW[SK.mode], im = { id: 'i' + Date.now().toString(36), name: e.base.slice(0, 28), src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(e.text), cx: v.x + v.w / 2, cy: v.y + v.h / 2, bw: v.w, bh: v.h, scale: 1, opacity: 100, visible: true, behind: false };
  SK.images[SK.mode].push(im); SK.sel = im.id;
  skRenderImages(); skLayersUI(); skSaveImages(); skTab('draw'); skSave();
  skStatus.textContent = 'Shown over the picture as an image layer (Images page). Remove it there when you are done.';
}
/** Opens a sent drawing's own lines on the canvas to keep working on them (Undo brings back what was there). */
/** Puts a saved drawing (from the Sent page or a project file) in the canvas it was made on, after asking if that canvas holds a drawing. */
function skApplyDoc(d, done) {
  skGoMode(d.mode);
  if (SK.strokes[SK.mode].length && !window.confirm('Replace what is drawn on ' + SK.mode + ' with this drawing? Undo brings it back.')) { skStatus.textContent = 'Cancelled.'; return; }
  skPushHistory();
  SK.strokes[SK.mode] = d.strokes;
  SK.layers[SK.mode] = Array.isArray(d.layers) ? d.layers.map(function (l) { return { id: String(l.id), name: String(l.name || 'Layer'), show: l.show !== false }; }) : [];
  if (d.active) SK.active[SK.mode] = d.active;
  SK.layerSet[SK.mode] = []; SK.pick = [];
  if (d.mode === 'canvas' && d.view && d.view.w > 0 && d.view.h > 0) SK_VIEW.canvas = { x: 0, y: 0, w: Math.min(4000, +d.view.w), h: Math.min(4000, +d.view.h) };
  if (Array.isArray(d.images)) { SK.images[SK.mode] = d.images.filter(function (i) { return i && i.src && i.bw > 0; }); SK.sel = null; skSaveImages(); }
  if (d.pet) {
    P.species = d.pet.species || P.species; P.skin = d.pet.skin || ''; P.backdrop = d.pet.backdrop || P.backdrop; P.night = !!d.pet.night; P.room = d.pet.room || {}; P.template = !!d.pet.template; P.seated = !!d.pet.seated;
    Object.keys(P.outfit).forEach(function (s) { P.outfit[s] = (d.pet.outfit && d.pet.outfit[s]) || 'none'; });
  }
  if (d.kind) { $('skKind').value = d.kind; }
  $('skNote').value = d.note || '';
  skOpened[SK.mode] = true;
  skBuildPanels(); skBuild(); skLinesUI(); skLayersUI(); skTab('draw'); skSave();
  skStatus.textContent = done;
}
function skSentEdit(e) {
  if (!e.strokes) return;
  skStatus.textContent = 'Opening…';
  ghFile('drawings/' + e.strokes.name).then(function (text) {
    var d = JSON.parse(text);
    if (!d || !Array.isArray(d.strokes)) throw new Error('that file is not a drawing');
    skApplyDoc(d, 'Opened ' + e.base + '. Undo brings back what was there before.');
  }).catch(function (err) { skStatus.textContent = 'Could not open it: ' + err.message; });
}
function skSentDelete(e, card) {
  if (!window.confirm('Delete this upload from GitHub? Claude will not be able to see it any more.')) return;
  var g = ghSettings(), files = [e.svg, e.strokes, e.item].filter(Boolean);
  skStatus.textContent = 'Deleting…';
  files.reduce(function (p, f) {
    return p.then(function () { return ghReq('DELETE', '/repos/' + g.repo + '/contents/' + f.path, { message: 'Remove drawing ' + e.base, sha: f.sha, branch: g.branch }); });
  }, Promise.resolve()).then(function () {
    card.remove(); skSentAll = skSentAll.filter(function (x) { return x !== e; }); skSentShown = Math.max(0, skSentShown - 1);
    skStatus.textContent = 'Deleted.';
  }).catch(function (err) { skStatus.textContent = 'Could not delete: ' + err.message; });
}
$('skSentRefresh').addEventListener('click', skSentLoad);
$('skSentMore').addEventListener('click', skSentMore);

// ---------- picture layers (to trace over) ----------
/** @returns {?Object} The selected image layer of the current area. */
/** @returns {?Object} The topmost shown picture under a point (pictures over the pet first, then the ones behind it). */
function skImageAt(pt) {
  var list = SK.images[SK.mode].filter(function (i) { return i.visible; }), order = list.filter(function (i) { return !i.behind; }).reverse().concat(list.filter(function (i) { return i.behind; }).reverse()), k;
  for (k = 0; k < order.length; k++) {
    var im = order[k], a = -(im.rot || 0) * Math.PI / 180, dx = pt[0] - im.cx, dy = pt[1] - im.cy;
    var x = dx * Math.cos(a) - dy * Math.sin(a), y = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(x) <= im.bw * im.scale / 2 && Math.abs(y) <= im.bh * im.scale / 2) return im;
  }
  return null;
}
function skSelected() { return SK.images[SK.mode].filter(function (i) { return i.id === SK.sel; })[0] || null; }
function skImgAttrs(el, im) {
  el.setAttribute('x', (im.cx - im.bw * im.scale / 2).toFixed(2));
  el.setAttribute('y', (im.cy - im.bh * im.scale / 2).toFixed(2));
  el.setAttribute('width', (im.bw * im.scale).toFixed(2));
  el.setAttribute('height', (im.bh * im.scale).toFixed(2));
  el.setAttribute('opacity', im.opacity / 100);
  if (im.rot) el.setAttribute('transform', 'rotate(' + im.rot + ' ' + im.cx + ' ' + im.cy + ')'); else el.removeAttribute('transform');
}
/** Draws the picture layers (under the pet or over it, both under the drawing) and the dashed box round the selected one. */
function skRenderImages() {
  [[skImgUnder, true], [skImgOver, false]].forEach(function (pair) {
    pair[0].replaceChildren.apply(pair[0], SK.images[SK.mode].filter(function (im) { return im.visible && im.behind === pair[1]; }).map(function (im) {
      var el = document.createElementNS(SVGNS, 'image');
      el.setAttribute('href', im.src);
      el.setAttribute('preserveAspectRatio', 'none');
      skImgAttrs(el, im);
      return el;
    }));
  });
  var sel = skSelected(), v = SK_VIEW[SK.mode];
  skSelBox.replaceChildren();
  if (sel && sel.visible && SK.tool === 'imgmove') {   // the dashed box only shows while you are moving an image
    var r = document.createElementNS(SVGNS, 'rect');
    if (sel.rot) r.setAttribute('transform', 'rotate(' + sel.rot + ' ' + sel.cx + ' ' + sel.cy + ')');
    r.setAttribute('x', sel.cx - sel.bw * sel.scale / 2); r.setAttribute('y', sel.cy - sel.bh * sel.scale / 2);
    r.setAttribute('width', sel.bw * sel.scale); r.setAttribute('height', sel.bh * sel.scale);
    skSelBox.appendChild(r);
  }
}
var skPicsHad = false;
/** Rebuilds the list of layers in the panel. */
function skLayersUI() {
  var box = $('skLayers'), list = SK.images[SK.mode];
  if (list.length && !skPicsHad) $('skPics').open = true;
  skPicsHad = list.length > 0;
  box.replaceChildren.apply(box, list.length ? list.slice().reverse().map(function (im) {
    var row = document.createElement('div');
    row.className = 'skp-layer'; row.dataset.id = im.id; row.setAttribute('aria-selected', String(im.id === SK.sel));
    var thumb = document.createElement('img'); thumb.src = im.src; thumb.alt = '';
    var body = document.createElement('div'); body.className = 'skp-body';
    body.innerHTML = '<div class="sk-row"><span class="skp-name"></span><button type="button" class="skp-x" data-act="del" title="Remove this image">✕</button></div>' +
      '<div class="sk-row"><label><input type="checkbox" data-act="show"' + (im.visible ? ' checked' : '') + '> Show</label>' +
      '<label><input type="checkbox" data-act="behind"' + (im.behind ? ' checked' : '') + '> Behind</label></div>' +
      '<div class="skp-rng"><span>Turn</span><div class="skp-rot"><button type="button" data-act="rotl" title="Turn left 90°">↺</button><input type="range" min="-180" max="180" value="' + (im.rot || 0) + '" data-act="rot" aria-label="Rotate"><button type="button" data-act="rotr" title="Turn right 90°">↻</button></div>' +
      '<span>Opacity</span><input type="range" min="5" max="100" value="' + im.opacity + '" data-act="opacity" aria-label="Opacity">' +
      '<span>Size</span><input type="range" min="10" max="400" value="' + Math.round(im.scale * 100) + '" data-act="scale" aria-label="Size"></div>';
    body.querySelector('.skp-name').textContent = im.name;
    row.append(thumb, body);
    return row;
  }) : [Object.assign(document.createElement('p'), { className: 'skp-hint', textContent: 'Paste a picture with Ctrl+V, or drop one on the canvas.' })]);
}
function skSaveImages() {
  try {
    var json = JSON.stringify(SK.images);
    if (json.length > 4500000) { skStatus.textContent = 'The images are too big to keep after you close this page.'; return; }
    localStorage.setItem('nibble-sketchpad-img', json);
  } catch (e) { skStatus.textContent = 'The images are too big to keep after you close this page.'; }
}
function skLoadImages() {
  try {
    var d = JSON.parse(localStorage.getItem('nibble-sketchpad-img') || 'null');
    if (d) ['pet', 'scene', 'toy', 'room', 'canvas'].forEach(function (m) { if (Array.isArray(d[m])) SK.images[m] = d[m].filter(function (i) { return i && i.src && i.bw > 0; }); });
  } catch (e) { /* nothing kept */ }
}
/** Adds a picture as a new layer, shrunk to at most 1600 px so it stays light. */
function skAddImage(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var img = new Image();
    img.onload = function () {
      var iw = img.naturalWidth || 300, ih = img.naturalHeight || 300, k = Math.min(1, 1600 / Math.max(iw, ih));
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(iw * k)); cv.height = Math.max(1, Math.round(ih * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      var v = SK_VIEW[SK.mode], fit = Math.min(v.w * 0.6 / iw, v.h * 0.6 / ih);
      var im = { id: 'i' + Date.now().toString(36), name: file.name && !/^image\.(png|jpe?g|gif)$/i.test(file.name) ? file.name.slice(0, 28) : 'Pasted image', src: cv.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9),
        cx: v.x + v.w / 2, cy: v.y + v.h / 2, bw: iw * fit, bh: ih * fit, scale: 1, opacity: 60, visible: true, behind: false };
      SK.images[SK.mode].push(im);
      SK.sel = im.id;
      skRenderImages(); skLayersUI(); skSaveImages();
      skSetTool('imgmove');
      skStatus.textContent = 'Picture added and picked. Drag it to move it; click empty space to let go of it.';
    };
    img.onerror = function () { skStatus.textContent = 'That file could not be read as an image.'; };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function skLayerEvent(e) {
  var row = e.target.closest('.skp-layer');
  if (!row) return;
  var list = SK.images[SK.mode], im = list.filter(function (i) { return i.id === row.dataset.id; })[0];
  if (!im) return;
  var act = e.target.dataset && e.target.dataset.act;
  if (e.type === 'click' && act === 'del') {
    SK.images[SK.mode] = list.filter(function (i) { return i !== im; });
    if (SK.sel === im.id) SK.sel = SK.images[SK.mode].length ? SK.images[SK.mode][SK.images[SK.mode].length - 1].id : null;
    skRenderImages(); skLayersUI(); skSaveImages();
    return;
  }
  if (e.type === 'click' && (act === 'rotl' || act === 'rotr')) {
    im.rot = (((im.rot || 0) + (act === 'rotr' ? 90 : -90) + 540) % 360) - 180;   // kept between -180 and 180
    SK.sel = im.id;
    skRenderImages(); skLayersUI(); skSaveImages();
    return;
  }
  if (e.type === 'click' && !act && e.target.matches('img, .skp-name')) {   // tapping a layer selects it, tapping it again lets go of it
    SK.sel = SK.sel === im.id ? null : im.id;
    skLayersUI(); skRenderImages();
    return;
  }
  if (e.type === 'input' && (act === 'opacity' || act === 'scale' || act === 'rot')) {
    if (act === 'opacity') im.opacity = +e.target.value; else if (act === 'rot') im.rot = +e.target.value; else im.scale = +e.target.value / 100;
    SK.sel = im.id;
    skRenderImages();
    row.setAttribute('aria-selected', 'true');
  }
  if (e.type === 'change' && (act === 'show' || act === 'behind')) {
    if (act === 'show') im.visible = e.target.checked; else im.behind = e.target.checked;
    skRenderImages();
  }
  if (e.type === 'change' || (e.type === 'input')) skSaveImages();
}

// ---------- picking a colour from the picture itself (where the browser has no screen eyedropper) ----------
function skHex(r, g, b) { return '#' + [r, g, b].map(function (n) { return ('0' + Math.round(n).toString(16)).slice(-2); }).join(''); }
/** @returns {?string} A '#rrggbb' for a computed colour like "rgb(12, 34, 56)", or null if it is not a solid colour. */
function skCssColour(value, opacity) {
  var m = /^rgba?\(([^)]+)\)$/.exec(value || '');
  if (!m || parseFloat(opacity) < 0.3) return null;
  var n = m[1].split(/[ ,\/]+/).map(parseFloat);
  if (n.length > 3 && n[3] < 0.3) return null;
  return skHex(n[0], n[1], n[2]);
}
/** @returns {Promise<?string>} The colour of the pixel of a picture layer under the pointer. */
function skImagePixel(el, cx, cy) {
  return new Promise(function (done) {
    var r = el.getBoundingClientRect(), img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      var g = cv.getContext('2d');
      g.drawImage(img, 0, 0);
      var d = g.getImageData(Math.min(cv.width - 1, Math.max(0, Math.floor((cx - r.left) / r.width * cv.width))), Math.min(cv.height - 1, Math.max(0, Math.floor((cy - r.top) / r.height * cv.height))), 1, 1).data;
      done(d[3] < 80 ? null : skHex(d[0], d[1], d[2]));
    };
    img.onerror = function () { done(null); };
    img.src = el.getAttribute('href');
  });
}
/** @returns {?string} The colour of a gradient fill (url(#id)) at a screen point: the stops are blended along the gradient. */
function skGradientAt(fill, el, cx, cy) {
  var m = /url\(["']?#([^"')]+)["']?\)/.exec(fill || ''), g = m && document.getElementById(m[1]);
  if (!g || !/gradient/i.test(g.tagName)) return null;
  var stops = [].slice.call(g.querySelectorAll('stop')).map(function (st) {
    var o = parseFloat(st.getAttribute('offset')) || 0, cs = getComputedStyle(st), c = /^rgba?\(([^)]+)\)$/.exec(cs.stopColor);
    return c ? { o: /%/.test(st.getAttribute('offset') || '') ? o / 100 : o, c: c[1].split(/[ ,\/]+/).map(parseFloat) } : null;
  }).filter(Boolean);
  if (!stops.length) return null;
  var r = el.getBoundingClientRect(), fx = r.width ? (cx - r.left) / r.width : 0, fy = r.height ? (cy - r.top) / r.height : 0, t;
  if (/radial/i.test(g.tagName)) {
    t = Math.hypot(fx - 0.5, fy - 0.5) / 0.5;
  } else {
    var x1 = parseFloat(g.getAttribute('x1')) || 0, y1 = parseFloat(g.getAttribute('y1')) || 0, x2 = g.getAttribute('x2') === null ? 1 : parseFloat(g.getAttribute('x2')), y2 = parseFloat(g.getAttribute('y2')) || 0;
    var dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1;
    t = ((fx - x1) * dx + (fy - y1) * dy) / len2;
  }
  t = Math.max(0, Math.min(1, t));
  var lo = stops[0], hi = stops[stops.length - 1];
  for (var i = 0; i < stops.length - 1; i++) if (t >= stops[i].o && t <= stops[i + 1].o) { lo = stops[i]; hi = stops[i + 1]; break; }
  var k = hi.o === lo.o ? 0 : Math.max(0, Math.min(1, (t - lo.o) / (hi.o - lo.o)));
  return skHex(lo.c[0] + (hi.c[0] - lo.c[0]) * k, lo.c[1] + (hi.c[1] - lo.c[1]) * k, lo.c[2] + (hi.c[2] - lo.c[2]) * k);
}
/** Finds the colour of the topmost thing painted under a screen point: a stroke, a picture layer, then the pet, furniture and background. */
function skSampleAt(cx, cy) {
  skStage.classList.add('sampling');   // lets the pictures underneath answer too (they normally ignore the pointer)
  var els = document.elementsFromPoint(cx, cy);
  skStage.classList.remove('sampling');
  var shapes = /^(path|circle|ellipse|rect|polygon|polyline|line)$/;
  function next(i) {
    if (i >= els.length) return Promise.resolve(null);
    var el = els[i], tag = el.tagName.toLowerCase();
    if (!skStage.contains(el) || el.closest('.sk-grid, .sk-sel')) return next(i + 1);
    if (tag === 'image') return skImagePixel(el, cx, cy).then(function (c) { return c || next(i + 1); });
    if (!shapes.test(tag)) return next(i + 1);
    var cs = getComputedStyle(el), c = skCssColour(cs.fill, cs.fillOpacity) || skGradientAt(cs.fill, el, cx, cy) || skCssColour(cs.stroke, cs.strokeOpacity);
    return c ? Promise.resolve(c) : next(i + 1);
  }
  return next(0);
}
function skPickInPage(cx, cy) {
  skSampleAt(cx, cy).then(function (c) {
    if (!c) { skStatus.textContent = 'Nothing to pick there.'; return; }
    skUseColour(c);
    skSetTool(SK.prevTool && SK.prevTool !== 'drop' ? SK.prevTool : 'pen');
    skStatus.textContent = 'Picked ' + c + '.';
  });
}

// ---------- the controls ----------
function skPress(group, attr, value) {
  group.querySelectorAll('button[data-' + attr + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))); });
}
function skColourButtons() {
  var box = $('skColours');
  box.replaceChildren.apply(box, SK_COLOURS.map(function (c) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sk-swatch'; b.style.background = c; b.dataset.c = c;
    b.setAttribute('aria-label', 'Colour ' + c);
    b.setAttribute('aria-pressed', String(c === SK.color));
    return b;
  }));
  var pick = document.createElement('input');
  pick.type = 'color'; pick.value = SK.color; pick.id = 'skPick'; pick.setAttribute('aria-label', 'Any colour');
  box.appendChild(pick);
}
function skUseColour(c) {
  SK.color = c;
  $('skCur').style.background = c;
  $('skCur').title = 'Pen colour ' + c;
  document.querySelectorAll('#skColours .sk-swatch, #skGame .sk-swatch').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === c)); });
  var pick = $('skPick');
  if (pick && /^#[0-9a-f]{6}$/i.test(c)) pick.value = c;
  if (SK.tool === 'erase' || SK.tool === 'hand' || SK.tool === 'imgmove') skSetTool('pen');
}
/** The eyedropper tool: pick a colour from anywhere on the screen (Chrome and Edge on a computer). */
function skEyedrop() {
  if (!window.EyeDropper) { skStatus.textContent = 'The eyedropper needs Chrome or Edge on a computer.'; return; }
  skStatus.textContent = 'Click anywhere on screen. Esc cancels.';
  var open;
  try { open = new window.EyeDropper().open(); } catch (e) { skStatus.textContent = 'The eyedropper could not start: ' + e.message; return; }
  open.then(function (r) {
    skUseColour(r.sRGBHex);
    if (SK.tool === 'erase' || SK.tool === 'hand' || SK.tool === 'imgmove') skSetTool('pen');
    skStatus.textContent = 'Picked ' + r.sRGBHex + '.';
  }).catch(function (e) {
    skStatus.textContent = e && e.name === 'AbortError' ? 'Eyedropper cancelled.' : 'The eyedropper did not work: ' + (e && (e.message || e.name) || 'unknown error') + '. Use the colour box or a swatch instead.';
  });
}
function skSetTool(t) {
  if (skCurve && t !== 'curve') skCurveFinish(false);
  if (t !== 'curve' && skCurveEdit) { skCurveEdit = null; skCurveRender(null); }
  if (t === 'drop' && window.EyeDropper) { skEyedrop(); return; }   // the browser's own: picks once from anywhere on the screen
  if (t === 'drop') {   // no screen eyedropper (Firefox): click on the picture instead, then carry on with the tool you had
    if (SK.tool !== 'drop') SK.prevTool = SK.tool;
    skStatus.textContent = 'Click the picture to pick a colour. Esc cancels.';
  }
  if (t !== 'select' && t !== 'lasso') SK.pick = [];
  if (t === 'select') skStatus.textContent = 'Click a line or drag a box over some. Shift adds. Corners resize, the round handle turns, the middle moves.';
  if (t === 'curve') skStatus.textContent = 'Click to place points, drag to bend. Double-click or Enter finishes, the first point closes, Esc cancels.';
  if (t === 'shape') skStatus.textContent = 'Drag to draw the shape. Shift keeps it even. Pick the shape in the list; Fill colours it in.';
  if (t === 'lasso') skStatus.textContent = 'Draw a loop round what you want. Shift adds. Then resize, turn or move it.';
  if (t === 'bucket') skStatus.textContent = 'Click inside a closed area to fill it with the pen colour.';
  SK.tool = t;
  skPress($('skTools'), 'tool', t);
  skApplyLook();
  if (skSelBox) skRenderImages();
  skXfRender();
}
function skOptions(select, list, value) {
  select.replaceChildren.apply(select, list.map(function (o) {
    var el = document.createElement('option');
    el.value = o[0]; el.textContent = o[1];
    return el;
  }));
  select.value = value;
}
function skSkins() {
  var mine = Skins.filter(function (s) { return s.base === P.species; });
  skOptions($('skSkin'), [['', 'Original']].concat(mine.map(function (s) { return [s.id, s.label]; })), P.skin);
  if ($('skSkin').value !== P.skin) P.skin = '';
}
function skBuildPanels() {
  skOptions($('skSpecies'), SPECIES, P.species);
  skSkins();
  var box = $('skOutfit');
  box.replaceChildren.apply(box, SLOTS.map(function (sl) {
    var lab = document.createElement('label'), sel = document.createElement('select');
    sel.id = 'skW-' + sl[0];
    lab.append(sl[1], sel);
    skOptions(sel, [['none', 'Nothing']].concat(Wardrobe.filter(function (w) { return w.slot === sl[0]; }).map(function (w) { return [w.id, w.label]; })), P.outfit[sl[0]]);
    if (sel.value !== P.outfit[sl[0]]) P.outfit[sl[0]] = 'none';
    sel.addEventListener('change', function () { P.outfit[sl[0]] = sel.value; skSave(); skBuild(); });
    return lab;
  }));
  skOptions($('skBd'), BACKDROPS.map(function (b) { return [b.id, b.name]; }), P.backdrop);
  $('skNight').checked = P.night;
  var room = $('skRoom');
  room.replaceChildren.apply(room, Decor.map(function (d) {
    var lab = document.createElement('label'), cb = document.createElement('input');
    lab.className = 'sk-check'; cb.type = 'checkbox'; cb.checked = !!P.room[d.id];
    lab.append(cb, d.label);
    cb.addEventListener('change', function () { P.room[d.id] = cb.checked; skSave(); skBuild(); });
    return lab;
  }));
  var sh = $('skShape');
  sh.replaceChildren.apply(sh, L.SKETCH_SHAPES.map(function (x) { var o = document.createElement('option'); o.value = x[0]; o.textContent = x[1]; return o; }));
  sh.value = SK.shape; $('skStyle').value = SK.style; $('skFillMode').value = SK.fillMode; $('skColour2').value = SK.colour2;
  skPress($('skTidy'), 'tidy', SK.tidy);
  $('skMirror').setAttribute('aria-pressed', String(SK.mirror));
  $('skClip').setAttribute('aria-pressed', String(SK.bodyClip)); $('skClip').hidden = SK.mode !== 'pet';
  $('skSpin').setAttribute('aria-pressed', String(!!SK.radial)); $('skSpin').dataset.key = SK.radial ? String(SK.radial) : 'R';
  $('skPressure').checked = SK.pressure;
  $('skLazy').setAttribute('aria-pressed', String(SK.lazy)); $('skLazyRow').hidden = !SK.lazy; $('skLazyN').value = SK.lazyN; $('skLazyNum').textContent = SK.lazyN;
}

skStage.addEventListener('pointerdown', function (e) { if (skDraw && e.target === skDraw) skDown(e); });
skStage.addEventListener('pointermove', function (e) { if (skDraw && (e.target === skDraw || skDrawing || skPan)) skMove(e); });
skStage.addEventListener('pointerup', skUp);
skStage.addEventListener('pointercancel', skCancel);
/** Switches to another drawing area (Pet, Scene, Toy, Furniture or the free Canvas). */
function skSetMode(m) {
  SK.mode = m;
  var kind = { room: 'furniture', toy: 'toy', scene: 'background', canvas: 'other' }[SK.mode];
  if (kind) $('skKind').value = kind;
  SK.pick = [];
  skHistSoon();
  var imgs = SK.images[SK.mode];
  SK.sel = imgs.length ? imgs[imgs.length - 1].id : null;
  skLayersUI();
  skLinesUI();
  skBuild();
}
// ---------- the canvases that are open (tabs under the header) ----------
var SK_DOC_NAMES = { pet: 'Pet', scene: 'Scene', toy: 'Toy', room: 'Furniture', canvas: 'Canvas' };
var skOpened = { pet: true };   // canvases opened this time (the ones with a drawing are always open)
function skHasContent(m) { return !!(SK.strokes[m].length || SK.images[m].length); }
/** Rebuilds the row of open canvases: Pet, Scene, Toy, Furniture and the free Canvas appear once they are opened or drawn on. */
function skDocsUI() {
  var box = $('skDocs'), open = Object.keys(SK_DOC_NAMES).filter(function (m) { return m === SK.mode || skOpened[m] || skHasContent(m); });
  box.replaceChildren.apply(box, open.map(function (m) {
    var tab = document.createElement('div'), b = document.createElement('button'), x = document.createElement('button');
    tab.className = 'skp-doc'; tab.dataset.mode = m;
    b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(m === SK.mode)); b.dataset.act = 'go';
    b.textContent = SK_DOC_NAMES[m] + (m === 'canvas' ? ' ' + SK_VIEW.canvas.w + '×' + SK_VIEW.canvas.h : '');
    x.type = 'button'; x.className = 'skp-doc-x'; x.dataset.act = 'close'; x.textContent = '✕'; x.title = 'Close this canvas (clears its drawing)'; x.setAttribute('aria-label', 'Close ' + SK_DOC_NAMES[m]);
    tab.append(b, x);
    return tab;
  }));
  var add = document.createElement('button');
  add.type = 'button'; add.className = 'skp-doc-add'; add.dataset.act = 'new'; add.textContent = '＋'; add.title = 'New canvas'; add.setAttribute('aria-label', 'New canvas');
  box.appendChild(add);
}
/** Empties one canvas: its lines, pictures, layers and undo steps. */
function skClearDoc(m) {
  SK.strokes[m] = []; SK.hist[m] = []; SK.redo[m] = []; SK.images[m] = []; SK.layers[m] = []; SK.layerSet[m] = []; SK.active[m] = 'l1';
  skSave(); skSaveImages();
}
/** Opens a canvas; with fresh it starts blank (asking first if it holds a drawing). */
function skOpenDoc(m, fresh) {
  if (fresh && skHasContent(m) && !confirm('Start a new ' + SK_DOC_NAMES[m] + ' canvas? The drawing on it now will be cleared.')) return false;
  if (fresh) skClearDoc(m);
  skOpened[m] = true;
  if (m !== SK.mode || fresh) skSetMode(m);
  return true;
}
function skCloseDoc(m) {
  if (skHasContent(m) && !confirm('Close the ' + SK_DOC_NAMES[m] + ' canvas? Its drawing will be cleared.')) return;
  skClearDoc(m); delete skOpened[m];
  if (m === SK.mode) {
    var next = Object.keys(SK_DOC_NAMES).filter(function (k) { return k !== m && (skOpened[k] || skHasContent(k)); })[0];
    if (next) skSetMode(next); else { skOpened[m] = true; skSetMode(m); }
  } else skDocsUI();
}
$('skDocs').addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]');
  if (!el) return;
  var m = el.closest('.skp-doc') && el.closest('.skp-doc').dataset.mode;
  if (el.dataset.act === 'new') skCanvasPop('new');
  else if (el.dataset.act === 'close') skCloseDoc(m);
  else if (m !== SK.mode) skSetMode(m);
});
// ---------- a new canvas (a game one or a blank one of any size), and resizing ----------
var SK_CANVAS_PRESETS = [['Square', 600, 600], ['Wide', 960, 540], ['Tall', 540, 960], ['Icon', 256, 256], ['Banner', 1200, 300]];
var skCanvasKind = 'new';
/** Opens the canvas box: to make a new canvas (a game one or a blank one), or to resize the free canvas you are on. */
function skCanvasPop(kind) {
  var pop = $('skCanvasPop');
  skCanvasKind = kind;
  var v = SK_VIEW.canvas;
  $('skCanvasW').value = v.w; $('skCanvasH').value = v.h;
  $('skCanvasTitle').textContent = kind === 'new' ? 'New canvas' : 'Resize canvas';
  $('skCanvasGo').textContent = kind === 'new' ? 'Create blank canvas' : 'Resize';
  $('skNewGame').hidden = kind !== 'new';
  $('skBlankH').hidden = kind !== 'new';
  $('skCanvasPresets').hidden = kind !== 'new';
  $('skCanvasStretchWrap').hidden = kind === 'new';
  $('skCanvasNote').textContent = kind === 'new' ? 'A blank canvas replaces the free canvas you have now.' : 'Drawing outside the new size is kept but hidden. Resize cannot be undone.';
  if (!pop.open) pop.showModal();
}
function skCanvasApply() {
  var w = Math.max(16, Math.min(4000, Math.round(+$('skCanvasW').value) || 0)), h = Math.max(16, Math.min(4000, Math.round(+$('skCanvasH').value) || 0)), old = SK_VIEW.canvas;
  if (!w || !h) { skStatus.textContent = 'Give a width and a height.'; return; }
  if (skCanvasKind === 'new') {
    if (skHasContent('canvas') && !confirm('Start a new canvas? The drawing on the free canvas now will be cleared.')) return;
    skClearDoc('canvas');
    SK_VIEW.canvas = { x: 0, y: 0, w: w, h: h };
    skStatus.textContent = 'New canvas, ' + w + ' × ' + h + '.';
  } else {
    var sx = w / old.w, sy = h / old.h;
    if ($('skCanvasStretch').checked) {
      SK.strokes.canvas.forEach(function (st) {
        var r = L.sketchXform({ pts: st.pts, d: st.d, width: st.width }, { kind: 'scale', ax: 0, ay: 0, sx: sx, sy: sy });
        st.pts = r.pts; st.width = r.width; if (st.d) st.d = r.d; delete st.cv;
      });
      SK.images.canvas.forEach(function (im) { im.cx *= sx; im.cy *= sy; im.scale *= Math.sqrt(sx * sy); });
    }
    SK_VIEW.canvas = { x: 0, y: 0, w: w, h: h };
    SK.hist.canvas = []; SK.redo.canvas = [];
    skStatus.textContent = 'Canvas is now ' + w + ' × ' + h + '.';
  }
  $('skCanvasPop').close();
  SK.zoom = 1; skSave(); skSaveImages();
  skOpened.canvas = true;
  if (SK.mode !== 'canvas') skSetMode('canvas'); else { SK.pick = []; skLayersUI(); skLinesUI(); skBuild(); }
}
$('skCanvasGo').addEventListener('click', skCanvasApply);
$('skCanvasPop').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); skCanvasApply(); } });
$('skCanvasPresets').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (b) { $('skCanvasW').value = b.dataset.w; $('skCanvasH').value = b.dataset.h; }
});
$('skGameCards').addEventListener('click', function (e) {
  var b = e.target.closest('[data-mode]');
  if (b && skOpenDoc(b.dataset.mode, true)) { $('skCanvasPop').close(); skStatus.textContent = 'New ' + SK_DOC_NAMES[b.dataset.mode] + ' canvas.'; }
});
$('skCanvasPresets').replaceChildren.apply($('skCanvasPresets'), SK_CANVAS_PRESETS.map(function (p) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'skp-btn skp-small'; b.dataset.w = p[1]; b.dataset.h = p[2]; b.textContent = p[0]; b.title = p[1] + ' × ' + p[2];
  return b;
}));
// ---------- dialogs and the menu bar ----------
document.querySelectorAll('dialog.skp-dlg').forEach(function (d) {
  d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });   // the dim backdrop or the ✕
});
function skMenuClose() {
  document.querySelectorAll('.skp-menulist').forEach(function (l) { l.hidden = true; });
  document.querySelectorAll('.skp-menubtn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
}
function skMenuOpen(btn) {
  skMenuClose();
  var list = btn.nextElementSibling;
  var on = function (cmd, ok) { var i = list.querySelector('[data-cmd="' + cmd + '"]'); if (i) i.disabled = !ok; };
  on('resize', SK.mode === 'canvas'); on('item', !$('skItemRow').hidden); on('crop', SK.mode === 'canvas');
  ['cut', 'copyl', 'dup', 'delete', 'deselect'].forEach(function (c) { on(c, SK.pick.length > 0); }); on('paste', SK.clip.length > 0);
  on('undo', !$('skUndo').disabled); on('redo', !$('skRedo').disabled);
  var lays = skLays(), act = lays.map(function (x) { return x.id; }).indexOf(SK.active[SK.mode]), seen = lays.filter(function (x) { return x.show; }).length;
  on('ldel', lays.length > 1); on('lmerge', act > 0); on('lmergeall', seen > 1); on('lsolo', lays.length > 1);
  var check = function (cmd, v) { var i = list.querySelector('[data-cmd="' + cmd + '"]'); if (i) i.setAttribute('aria-checked', String(v)); };
  check('grid', $('skGrid').checked); check('ref', $('skRef').checked); check('panels', document.body.classList.contains('skp-nopanel'));
  var ri = list.querySelector('[data-cmd="ref"]'); if (ri) { ri.hidden = SK.mode === 'canvas'; ri.textContent = SK.mode === 'toy' ? 'Toy underneath' : (SK.mode === 'pet' ? 'Pet underneath' : 'Picture underneath'); }
  list.hidden = false; btn.setAttribute('aria-expanded', 'true');
}
$('skMenus').addEventListener('click', function (e) {
  var btn = e.target.closest('.skp-menubtn'), item = e.target.closest('[data-cmd]');
  if (btn) { if (btn.getAttribute('aria-expanded') === 'true') skMenuClose(); else skMenuOpen(btn); return; }
  if (item && !item.disabled) { skMenuClose(); skCommand(item.dataset.cmd); }
});
$('skMenus').addEventListener('pointerover', function (e) {   // with a menu open, moving to the other one switches to it
  var btn = e.target.closest('.skp-menubtn');
  if (btn && btn.getAttribute('aria-expanded') !== 'true' && document.querySelector('.skp-menubtn[aria-expanded="true"]')) skMenuOpen(btn);
});
document.addEventListener('pointerdown', function (e) { if (!e.target.closest('#skMenus')) skMenuClose(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') skMenuClose(); });
// ---------- layer menu ----------
var skLayerN = 0;
function skNewLayerId() { return 'l' + Date.now().toString(36) + (skLayerN++).toString(36); }
/** Redraws after a layer was added, merged or removed. */
function skLayersChanged() { SK.pick = SK.pick.filter(skSelectable); skRedraw(); skLinesUI(); skMarkActive(); skXfRender(); skSave(); }
/** Copies the active layer and its lines into a new layer just above it. */
function skLayerDup() {
  var l = skLays(), i = l.map(function (x) { return x.id; }).indexOf(SK.active[SK.mode]), x = l[i];
  if (!x) return;
  var mine = skOrdered().filter(function (s) { return skLayerOf(s) === x; }), n = { id: skNewLayerId(), name: (x.name + ' copy').slice(0, 24), show: true }, pairs = {};
  skPushHistory(); skAutoLayers[n.id] = n;
  mine.forEach(function (s) {
    var c = JSON.parse(JSON.stringify(s));
    c.lay = n.id;
    if (c.pair) c.pair = pairs[c.pair] || (pairs[c.pair] = 'p' + Date.now().toString(36) + (skLayerN++).toString(36));   // mirrored halves stay paired with their own copy
    SK.strokes[SK.mode].push(c);
  });
  l.splice(i + 1, 0, n);
  SK.active[SK.mode] = n.id; SK.layerSet[SK.mode] = [n.id];
  skStatus.textContent = 'Layer duplicated: “' + n.name + '” (' + mine.length + (mine.length === 1 ? ' line' : ' lines') + ').';
  skLayersChanged();
}
/** Joins layers into one: the active layer into the one below it, or every shown layer into the lowest shown one. */
function skLayerMerge(all) {
  var l = skLays(), ids = l.map(function (x) { return x.id; }), from, to;
  if (all) {
    from = l.filter(function (x) { return x.show; });
    if (from.length < 2) { skStatus.textContent = 'Only one layer is shown, nothing to merge.'; return; }
    to = from.shift();
  } else {
    var i = ids.indexOf(SK.active[SK.mode]);
    if (i < 1) { skStatus.textContent = 'The bottom layer has nothing below it to merge into.'; return; }
    from = [l[i]]; to = l[i - 1];
  }
  var moving = skOrdered().filter(function (s) { return from.indexOf(skLayerOf(s)) !== -1; });
  skPushHistory();
  from.forEach(function (x) { skAutoLayers[x.id] = x; });
  SK.strokes[SK.mode] = SK.strokes[SK.mode].filter(function (s) { return moving.indexOf(s) === -1; }).concat(moving);   // they keep their look: they land on top of the lines already on the lower layer
  moving.forEach(function (s) { s.lay = to.id; });
  from.forEach(function (x) { l.splice(l.indexOf(x), 1); });
  SK.active[SK.mode] = to.id; SK.layerSet[SK.mode] = [to.id];
  skStatus.textContent = 'Merged ' + (from.length + 1) + ' layers into “' + to.name + '”.';
  skLayersChanged();
}
/** Hides every layer except the active one, or shows them all again. */
function skLayerSolo(hide) {
  var act = SK.active[SK.mode];
  skLays().forEach(function (x) { x.show = hide ? x.id === act : true; });
  skStatus.textContent = hide ? 'Only the active layer is shown.' : 'All layers shown.';
  skLayersChanged();
}
// ---------- project files, edit and canvas menus ----------
/** Saves the lines, layers and pictures of the open canvas as a file on the computer (open it again with Open project). */
function skSaveProject() {
  var d = skOriginal(), t = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
  d.type = 'sketchpad-project'; d.images = SK.images[SK.mode]; d.view = SK_VIEW[SK.mode];
  var name = d.kind + '-' + SK.mode + '-' + t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate()) + '-' + pad(t.getHours()) + pad(t.getMinutes()) + '.sketchpad.json', a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  skStatus.textContent = 'Saved ' + name + ' (lines, layers and pictures).';
}
$('skProjFile').addEventListener('change', function () {
  var f = this.files && this.files[0];
  this.value = '';
  if (!f) return;
  f.text().then(function (text) {
    var d = JSON.parse(text);
    if (!d || !Array.isArray(d.strokes) || !SK_VIEW[d.mode]) throw new Error('that file is not a sketchpad project');
    skApplyDoc(d, 'Opened ' + f.name + '. Undo brings back what was there before.');
  }).catch(function (err) { skStatus.textContent = 'Could not open it: ' + err.message; });
});
/** Flips every line of the open canvas (pictures stay as they are). */
function skFlipAll(axis) {
  if (!SK.strokes[SK.mode].length) { skStatus.textContent = 'Nothing drawn to flip.'; return; }
  var v = SK_VIEW[SK.mode];
  SK.pick = SK.strokes[SK.mode].slice();
  skApplyOp({ kind: 'flip', axis: axis, c: axis === 'x' ? skAxis() : v.y + v.h / 2 });
  SK.pick = []; skXfRender();
  skStatus.textContent = 'Drawing flipped ' + (axis === 'x' ? 'left-right' : 'up-down') + '. Pictures stay as they are.';
}
/** Trims the free canvas to a box round everything drawn, with a little room. */
function skCrop() {
  if (SK.mode !== 'canvas') { skStatus.textContent = 'Crop works on a blank canvas. Make one with New canvas.'; return; }
  var all = SK.strokes.canvas;
  if (!all.length) { skStatus.textContent = 'Nothing drawn to crop to.'; return; }
  var b = null, pad = 12;
  all.forEach(function (s) { var q = skStrokeBox(s); b = b ? { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) } : q; });
  var x0 = Math.floor(b.x0 - pad), y0 = Math.floor(b.y0 - pad), w = Math.min(4000, Math.ceil(b.x1 + pad) - x0), h = Math.min(4000, Math.ceil(b.y1 + pad) - y0);
  all.forEach(function (st) {
    var r = L.sketchXform({ pts: st.pts, d: st.d, width: st.width }, { kind: 'move', dx: -x0, dy: -y0 });
    st.pts = r.pts; if (st.d) st.d = r.d;
    if (st.cv) st.cv = skXfCv(st.cv, { kind: 'move', dx: -x0, dy: -y0 });
    skFillPaths.delete(st); skShapePaths.delete(st);
  });
  SK.images.canvas.forEach(function (im) { im.cx -= x0; im.cy -= y0; });
  SK_VIEW.canvas = { x: 0, y: 0, w: w, h: h };
  SK.hist.canvas = []; SK.redo.canvas = []; SK.pick = []; SK.zoom = 1;
  skSave(); skSaveImages(); skLayersUI(); skLinesUI(); skBuild();
  skStatus.textContent = 'Canvas cropped to ' + w + ' × ' + h + '. This cannot be undone.';
}
// ---------- a number above a slider while it moves ----------
var skTipEl = document.createElement('div'), skTipTimer = 0, skTipDown = false, SK_TIP_UNIT = { opacity: '%', scale: '%', rot: '°', skGhost: '%' };
skTipEl.className = 'skp-sliptip'; skTipEl.hidden = true; skTipEl.setAttribute('aria-hidden', 'true');
document.body.appendChild(skTipEl);
function skTipShow(inp) {
  if (!SK_PREFS.tip) return;
  if (!inp || inp.type !== 'range' || (inp.parentElement && inp.parentElement.querySelector('output'))) return;   // sliders with a number beside them need no second one
  var r = inp.getBoundingClientRect(), min = +inp.min || 0, max = +inp.max || 100, f = max > min ? (+inp.value - min) / (max - min) : 0;
  skTipEl.textContent = inp.value + (SK_TIP_UNIT[inp.dataset.act] || SK_TIP_UNIT[inp.id] || '');
  skTipEl.hidden = false;
  skTipEl.style.left = Math.round(r.left + 9 + f * Math.max(0, r.width - 18)) + 'px';
  var below = r.top < 40;   // near the top of the window the number goes underneath
  skTipEl.style.top = Math.round(below ? r.bottom + 4 : r.top - 4) + 'px';
  skTipEl.style.transform = below ? 'translate(-50%, 0)' : '';
  clearTimeout(skTipTimer);
}
function skTipHide(wait) { clearTimeout(skTipTimer); skTipTimer = setTimeout(function () { skTipEl.hidden = true; }, wait); }
document.addEventListener('pointerdown', function (e) { if (e.target.matches && e.target.matches('input[type="range"]')) { skTipDown = true; skTipShow(e.target); } });
document.addEventListener('input', function (e) { if (e.target.matches && e.target.matches('input[type="range"]')) { skTipShow(e.target); if (!skTipDown) skTipHide(900); } });
document.addEventListener('pointerup', function () { skTipDown = false; if (!skTipEl.hidden) skTipHide(500); });
document.addEventListener('pointercancel', function () { skTipDown = false; skTipHide(0); });
document.addEventListener('keyup', function (e) { if (e.target.matches && e.target.matches('input[type="range"]')) skTipHide(700); });
$('skHist').addEventListener('toggle', skHistLog);
$('skHistList').addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (b) skHistGo(+b.dataset.step); });
// ---------- preferences ----------
var SK_PREFS = { sound: true, vol: 40, ring: true, tip: true, undo: 60, calm: false };
function skPrefsLoad() {
  try {
    var d = JSON.parse(localStorage.getItem('nibble-sketchpad-prefs') || 'null') || {};
    if (typeof d.sound === 'boolean') SK_PREFS.sound = d.sound;
    if (d.vol >= 0 && d.vol <= 100) SK_PREFS.vol = Math.round(d.vol);
    if (typeof d.ring === 'boolean') SK_PREFS.ring = d.ring;
    if (typeof d.tip === 'boolean') SK_PREFS.tip = d.tip;
    if ([30, 60, 100, 200].indexOf(d.undo) !== -1) SK_PREFS.undo = d.undo;
    if (typeof d.calm === 'boolean') SK_PREFS.calm = d.calm;
  } catch (e) { /* defaults */ }
}
function skPrefsApply() {
  document.body.classList.toggle('skp-calm', SK_PREFS.calm);
  $('skPrefSound').checked = SK_PREFS.sound; $('skPrefVol').value = SK_PREFS.vol; $('skPrefVolNum').textContent = SK_PREFS.vol;
  $('skPrefVol').disabled = $('skPrefTest').disabled = !SK_PREFS.sound;
  $('skPrefRing').checked = SK_PREFS.ring; $('skPrefTip').checked = SK_PREFS.tip; $('skPrefUndo').value = String(SK_PREFS.undo); $('skPrefCalm').checked = SK_PREFS.calm;
  if (!SK_PREFS.ring) $('skRing').hidden = true;
}
function skPrefsSave() { try { localStorage.setItem('nibble-sketchpad-prefs', JSON.stringify(SK_PREFS)); } catch (e) { /* storage not available */ } }
$('skPrefsDlg').addEventListener('input', function (e) {
  var id = e.target.id;
  if (id === 'skPrefSound') SK_PREFS.sound = e.target.checked;
  else if (id === 'skPrefVol') SK_PREFS.vol = +e.target.value;
  else if (id === 'skPrefRing') SK_PREFS.ring = e.target.checked;
  else if (id === 'skPrefTip') SK_PREFS.tip = e.target.checked;
  else if (id === 'skPrefUndo') { SK_PREFS.undo = +e.target.value; Object.keys(SK.hist).forEach(function (m) { while (SK.hist[m].length > SK_PREFS.undo) SK.hist[m].shift(); }); skHistoryUI(); }
  else if (id === 'skPrefCalm') SK_PREFS.calm = e.target.checked;
  else return;
  skPrefsApply(); skPrefsSave();
});
$('skPrefsDlg').addEventListener('change', function (e) { if (e.target.id === 'skPrefVol') skOink(); });   // a sample when you let go of the slider
$('skPrefTest').addEventListener('click', skOink);
$('skPrefReset').addEventListener('click', function () { SK_PREFS = { sound: true, vol: 40, ring: true, tip: true, undo: 60, calm: false }; skPrefsApply(); skPrefsSave(); });
skPrefsLoad(); skPrefsApply();
// ---------- the pig mascot: click him for an oink ----------
var skAudio = null;
/** A little synthesized oink: a grunt that rises and then drops, with a short snort at the end. */
function skOink() {
  if (!SK_PREFS.sound || SK_PREFS.vol <= 0) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    skAudio = skAudio || new AC();
    if (skAudio.state === 'suspended') skAudio.resume();
    var ctx = skAudio, t = ctx.currentTime, jit = 0.92 + Math.random() * 0.16;
    var out = ctx.createGain(); out.gain.value = 0.5 * Math.pow(SK_PREFS.vol / 100, 2); out.connect(ctx.destination);   // the volume slider, on a curve so the low end is gentle
    // the grunt: a buzzy tone that goes up ("oi") and then down and rough ("nk")
    var osc = ctx.createOscillator(), vib = ctx.createOscillator(), vibG = ctx.createGain(), lp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190 * jit, t);
    osc.frequency.exponentialRampToValueAtTime(330 * jit, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(150 * jit, t + 0.34);
    vib.frequency.value = 38; vibG.gain.value = 16;   // the roughness
    vib.connect(vibG); vibG.connect(osc.frequency);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(1500, t); lp.frequency.linearRampToValueAtTime(700, t + 0.34);
    bp.type = 'peaking'; bp.frequency.value = 1100; bp.gain.value = 9; bp.Q.value = 2.5;   // the nasal honk
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.03); g.gain.setValueAtTime(0.7, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(lp); lp.connect(bp); bp.connect(g); g.connect(out);
    osc.start(t); vib.start(t); osc.stop(t + 0.42); vib.stop(t + 0.42);
    // the snort: a short puff of filtered noise
    var len = Math.floor(ctx.sampleRate * 0.12), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), i;
    for (i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var nz = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    nz.buffer = buf; nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 1.2;
    ng.gain.setValueAtTime(0.0001, t + 0.3); ng.gain.exponentialRampToValueAtTime(0.35, t + 0.33); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    nz.connect(nf); nf.connect(ng); ng.connect(out);
    nz.start(t + 0.3);
  } catch (e) { /* no sound available */ }
}
function skMascotOink() {
  var m = $('skMascot');
  m.classList.remove('oink'); void m.getBoundingClientRect(); m.classList.add('oink');
  clearTimeout(skMascotOink.t); skMascotOink.t = setTimeout(function () { m.classList.remove('oink'); }, 900);
  skOink();
}
$('skMascot').addEventListener('click', skMascotOink);
$('skMascot').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skMascotOink(); } });
function skCommand(cmd) {
  if (cmd === 'new') skCanvasPop('new');
  else if (cmd === 'resize') skCanvasPop('resize');
  else if (cmd === 'addpic') $('skAddImage').click();
  else if (cmd === 'send') $('skSendDlg').showModal();
  else if (cmd === 'github') { $('skSettings').open = true; $('skSendDlg').showModal(); }
  else if (cmd === 'sent') { $('skSentDlg').showModal(); if (!skSentAll.length) skSentLoad(); }
  else if (cmd === 'svg') $('skSaveFile').click();
  else if (cmd === 'copy') $('skCopy').click();
  else if (cmd === 'item') $('skItemCode').click();
  else if (cmd === 'png') { if (!skEmpty()) $('skPngDlg').showModal(); }
  else if (cmd === 'copypng') skPng(1024, 'none', false);
  else if (cmd === 'zoomin') skZoomAt(SK.zoom * 1.25);
  else if (cmd === 'zoomout') skZoomAt(SK.zoom / 1.25);
  else if (cmd === 'fit') { skZoomAt(1); skView.scrollLeft = 0; skView.scrollTop = 0; }
  else if (cmd === 'grid') $('skGrid').click();
  else if (cmd === 'ref') $('skRef').click();
  else if (cmd === 'panels') document.body.classList.toggle('skp-nopanel');
  else if (cmd === 'lnew') $('skAddLine').click();
  else if (cmd === 'ldup') skLayerDup();
  else if (cmd === 'ldel') { var row = document.querySelector('#skLineLayers .skp-line.active [data-act="del"]'); if (row) row.click(); }
  else if (cmd === 'lmerge') skLayerMerge(false);
  else if (cmd === 'lmergeall') skLayerMerge(true);
  else if (cmd === 'lsolo') skLayerSolo(true);
  else if (cmd === 'lshow') skLayerSolo(false);
  else if (cmd === 'openproj') $('skProjFile').click();
  else if (cmd === 'saveproj') { if (!skEmpty()) skSaveProject(); }
  else if (cmd === 'cut') { if (skCopyPick()) skDeletePick(); }
  else if (cmd === 'copyl') skCopyPick();
  else if (cmd === 'paste') { if (!skPasteLines()) skStatus.textContent = 'Nothing copied yet.'; }
  else if (cmd === 'dup') skDuplicate();
  else if (cmd === 'delete') skDeletePick();
  else if (cmd === 'deselect') { SK.pick = []; skXfRender(); }
  else if (cmd === 'invert') { skSetTool('select'); SK.pick = SK.strokes[SK.mode].filter(function (s) { return skSelectable(s) && SK.pick.indexOf(s) === -1; }); skXfRender(); }
  else if (cmd === 'crop') skCrop();
  else if (cmd === 'fliph') skFlipAll('x');
  else if (cmd === 'flipv') skFlipAll('y');
  else if (cmd === 'keys') $('skKeysDlg').showModal();
  else if (cmd === 'prefs') $('skPrefsDlg').showModal();
  else if (cmd === 'undo') skUndo();
  else if (cmd === 'redo') skRedo();
  else if (cmd === 'selectall') { skSetTool('select'); SK.pick = SK.strokes[SK.mode].filter(skSelectable); skXfRender(); }
  else if (cmd === 'clear') $('skClear').click();
}
$('skZoom').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  skZoomAt(+b.dataset.zoom);
});
// the mouse wheel zooms towards the pointer
skView.addEventListener('wheel', function (e) {
  e.preventDefault();
  var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  skZoomAt(SK.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)), e.clientX, e.clientY);
}, { passive: false });
$('skTools').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (b && b.dataset.tool) skSetTool(b.dataset.tool);
});
$('skUndo').addEventListener('click', skUndo);
$('skRedo').addEventListener('click', skRedo);
$('skAddImage').addEventListener('click', function () { $('skFile').click(); });
$('skFile').addEventListener('change', function () {
  var f = $('skFile').files[0];
  $('skFile').value = '';
  if (f) skAddImage(f);
});
['click', 'input', 'change'].forEach(function (t) { $('skLayers').addEventListener(t, skLayerEvent); });
$('skClear').addEventListener('click', function () {
  if (!SK.strokes[SK.mode].length) return;
  if (!window.confirm('Clear everything drawn on ' + SK.mode + '?')) return;
  SK.pick = []; skXfRender();
  skPushHistory();
  SK.strokes[SK.mode] = [];
  skRedraw();
  skSave();
  skStatus.textContent = 'Cleared. Undo brings it back.';
});
$('skColours').addEventListener('click', function (e) {
  var b = e.target.closest('.sk-swatch');
  if (b) skUseColour(b.dataset.c);
});
$('skColours').addEventListener('input', function (e) { if (e.target.id === 'skPick') skUseColour(e.target.value); });
/** Sets the pen thickness; with lines picked, they get that thickness too (one undo step per slider drag). */
function skSetPen(n, fromSlider) {
  SK.pen = Math.max(1, Math.min(40, Math.round(n)));
  $('skPen').value = SK.pen; $('skPenNum').textContent = SK.pen; $('skPenReset').disabled = SK.pen === SK_PEN_DEFAULT;
  var v = SK_VIEW[SK.mode], px = Math.max(2, Math.min(22, SK.pen * SK_PEN * v.w * (skStage.getBoundingClientRect().width / v.w)));
  $('skDot').style.width = $('skDot').style.height = px + 'px';
  if (fromSlider && skIsSel() && SK.pick.length) {
    if (!skPenPushed) { skPushHistory(); skPenPushed = true; }
    SK.pick.forEach(function (s) { if (!s.bucket) s.width = +(v.w * SK_PEN * SK.pen).toFixed(2); });
    skRedraw(); skXfRender();
  }
  skSave();
}
var skPenPushed = false;
$('skPenReset').addEventListener('click', function () { skSetPen(SK_PEN_DEFAULT, true); skPenPushed = false; skStatus.textContent = 'Pen thickness back to normal.'; });
$('skPen').addEventListener('input', function () { skSetPen(+$('skPen').value, true); });
$('skPen').addEventListener('change', function () { skPenPushed = false; });
$('skTidy').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  SK.tidy = +b.dataset.tidy;
  skPress($('skTidy'), 'tidy', SK.tidy);
  skSave();
});
$('skSnap').addEventListener('change', skSave);
$('skShape').addEventListener('change', function () { SK.shape = $('skShape').value; skSave(); skSetTool('shape'); });
$('skFillMode').addEventListener('change', function () { SK.fillMode = $('skFillMode').value; skSave(); });
$('skColour2').addEventListener('input', function () { SK.colour2 = $('skColour2').value; skSave(); });
$('skStyle').addEventListener('change', function () {
  SK.style = $('skStyle').value; skSave();
  var picked = SK.pick.filter(function (s) { return !s.bucket; });
  if (skIsSel() && picked.length) {   // lines that are picked change too (a wave can only be given while drawing)
    if (SK.style === 'wavy') { skStatus.textContent = 'Wavy is added while you draw, so it cannot change lines you already drew.'; return; }
    skPushHistory();
    picked.forEach(function (s) { s.style = SK.style; });
    skRedraw(); skXfRender(); skSave();
  }
});
['skGrid', 'skRef', 'skGhost'].forEach(function (id) { $(id).addEventListener('input', skApplyLook); });
$('skSpecies').addEventListener('change', function () { P.species = $('skSpecies').value; P.skin = ''; skSkins(); skSave(); skBuild(); });
$('skSkin').addEventListener('change', function () { P.skin = $('skSkin').value; skSave(); skBuild(); });
$('skSeated').addEventListener('change', function () { P.seated = $('skSeated').checked; skSave(); skBuild(); });
$('skTemplate').addEventListener('change', function () { P.template = $('skTemplate').checked; skSave(); skBuild(); });
$('skBd').addEventListener('change', function () { P.backdrop = $('skBd').value; skSave(); skBuild(); });
$('skNight').addEventListener('change', function () { P.night = $('skNight').checked; skSave(); skBuild(); });
$('skKind').addEventListener('change', skSave);
$('skNote').addEventListener('input', skSave);
$('skUpload').addEventListener('click', skUpload);
$('skSaveFile').addEventListener('click', skSaveFile);
$('skCopy').addEventListener('click', skCopy);
['skToken', 'skRepo', 'skBranch'].forEach(function (id) { $(id).addEventListener('change', ghSaveSettings); });
$('skCheck').addEventListener('click', function () {
  var g = ghSettings();
  ghSaveSettings();
  skStatus.textContent = 'Checking…';
  ghReq('GET', '/repos/' + g.repo).then(function (r) {
    skStatus.textContent = r.permissions && r.permissions.push ? 'Connected to ' + r.full_name + ', and the token can write.' : 'Connected to ' + r.full_name + ', but the token cannot write. Give it Contents: Read and write.';
  }).catch(function (e) { skStatus.textContent = 'Could not connect: ' + e.message; });
});
$('skForget').addEventListener('click', function () {
  $('skToken').value = '';
  ghSaveSettings();
  skStatus.textContent = 'Token forgotten.';
});
/** @returns {boolean} Whether the keyboard is typing into a box (so shortcuts stay out of the way). */
function typing(e) {
  var t = e.target;
  return t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && /^(text|password|search|number|url)$/.test(t.type));
}
document.addEventListener('keydown', function (e) {
  if (typing(e)) return;
  if (e.code === 'Space') {   // hold Space and drag to move the canvas
    e.preventDefault();
    if (!SK.space) { SK.space = true; skStage.classList.add('space'); }
    return;
  }
  var k = e.key.toLowerCase();
  if (k === '[' || k === ']') { skSetPen(SK.pen + (k === ']' ? 1 : -1) * (SK.pen > 12 ? 2 : 1)); return; }
  if (e.key === 'Escape' && SK.tool === 'drop') { skSetTool(SK.prevTool && SK.prevTool !== 'drop' ? SK.prevTool : 'pen'); skStatus.textContent = 'Cancelled.'; return; }
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) skRedo(); else skUndo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'a' && skIsSel()) { e.preventDefault(); SK.pick = SK.strokes[SK.mode].filter(skSelectable); skXfRender(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); skDuplicate(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); skRedo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (skCurve && e.key === 'Enter') { e.preventDefault(); skCurveFinish(false); return; }
  if ((skCurve || skCurveEdit) && e.key === 'Escape') { skCurveCancel(); skStatus.textContent = 'Curve cancelled.'; return; }
  if (k === 'x') { skSetMirror(!SK.mirror); return; }
  if (k === 'r') { skNextSpin(); return; }
  if (k === 'k') { skSetClip(!SK.bodyClip); return; }
  if (k === 'z') { skSetLazy(!SK.lazy); return; }
  if ((k === 'delete' || k === 'backspace') && skIsSel() && SK.pick.length) { e.preventDefault(); skDeletePick(); return; }
  if (e.key === 'Escape' && SK.paint) { SK.paint = null; skPaintLook(); skStatus.textContent = 'Same style off.'; return; }
  if (e.key === 'Escape' && skIsSel() && SK.pick.length) { SK.pick = []; skXfRender(); return; }
  var tool = { p: 'pen', f: 'blob', e: 'erase', h: 'hand', i: 'drop', m: 'imgmove', b: 'bucket', s: 'select', l: 'lasso', c: 'curve', g: 'shape' }[k];
  if (tool) skSetTool(tool);
});
document.addEventListener('keyup', function (e) {
  if (e.code !== 'Space') return;
  if (!typing(e)) e.preventDefault();
  SK.space = false;
  skStage.classList.remove('space');
});
/** Mirror: everything drawn on one side is folded over the middle line onto the other. */
function skSetMirror(on) {
  SK.mirror = on;
  $('skMirror').setAttribute('aria-pressed', String(on));
  skStatus.textContent = on ? 'Mirror on: drawing is copied to the other side.' : 'Mirror off.';
  skSave();
  skBuild();
}
$('skMirror').addEventListener('click', function () { skSetMirror(!SK.mirror); });
/** Lazy brush: the pen and the filled-shape pen trail behind your hand on a string; the strength is how long the string is. */
function skSetLazy(on) {
  SK.lazy = on;
  $('skLazy').setAttribute('aria-pressed', String(on)); $('skLazyRow').hidden = !on;
  skStatus.textContent = on ? 'Lazy brush on: the line trails behind your pen. Set the strength under the thickness slider.' : 'Lazy brush off.';
  skSave();
}
$('skLazy').addEventListener('click', function () { skSetLazy(!SK.lazy); });
$('skLazyN').addEventListener('input', function () { SK.lazyN = +this.value; $('skLazyNum').textContent = this.value; skSave(); });
/** Clip: new lines stay inside the pet's body (for skin patterns). */
function skSetClip(on) {
  SK.bodyClip = on;
  $('skClip').setAttribute('aria-pressed', String(on));
  skStatus.textContent = on ? 'Clip on: new lines stay inside the pet’s body.' : 'Clip off.';
  skSave();
}
$('skClip').addEventListener('click', function () { skSetClip(!SK.bodyClip); });
/** Spin: each line is copied turned round the middle, 3 to 8 times; the button goes through the choices. */
function skSetSpin(n) {
  SK.radial = n;
  var b = $('skSpin');
  b.setAttribute('aria-pressed', String(!!n)); b.dataset.key = n ? String(n) : 'R';
  skStatus.textContent = n ? 'Spin on: drawing is copied ' + n + ' times round the middle.' : 'Spin off.';
  skSave(); skBuild();
}
function skNextSpin() { var o = [0, 3, 4, 5, 6, 8]; skSetSpin(o[(o.indexOf(SK.radial) + 1) % o.length]); }
$('skSpin').addEventListener('click', skNextSpin);
$('skPressure').addEventListener('change', function () { SK.pressure = $('skPressure').checked; skSave(); });

// Ctrl+C and Ctrl+X on picked lines keep them for pasting (the system clipboard gets a note, so an older picture there is not pasted by mistake)
document.addEventListener('copy', function (e) {
  if (typing(e) || !skIsSel() || !SK.pick.length) return;
  e.preventDefault(); skCopyPick();
  if (e.clipboardData) e.clipboardData.setData('text/plain', 'nibble-lines');
});
document.addEventListener('cut', function (e) {
  if (typing(e) || !skIsSel() || !SK.pick.length) return;
  e.preventDefault(); skCopyPick(); skDeletePick();
  if (e.clipboardData) e.clipboardData.setData('text/plain', 'nibble-lines');
});
// a picture copied from anywhere (a browser, a screenshot, a paint program) can be pasted in as a new image layer
document.addEventListener('paste', function (e) {
  if (typing(e)) return;
  var items = (e.clipboardData && e.clipboardData.items) || [];
  if (e.clipboardData && e.clipboardData.getData('text/plain') === 'nibble-lines' && skPasteLines()) { e.preventDefault(); return; }
  for (var i = 0; i < items.length; i++) {
    if (items[i].kind === 'file' && /^image\//.test(items[i].type)) {
      var f = items[i].getAsFile();
      if (f) { e.preventDefault(); skAddImage(f); return; }
    }
  }
  if (SK.clip.length && skIsSel() && skPasteLines()) e.preventDefault();
});
// so can a picture file dragged onto the canvas
skView.addEventListener('dragover', function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') !== -1) e.preventDefault(); });
skView.addEventListener('drop', function (e) {
  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f && /^image\//.test(f.type)) { e.preventDefault(); skAddImage(f); }
});
window.addEventListener('blur', function () { SK.space = false; skStage.classList.remove('space'); });
// a drop-down that keeps the keyboard focus would swallow shortcuts like Ctrl+Z
document.addEventListener('change', function (e) { if (e.target.tagName === 'SELECT') e.target.blur(); });
window.addEventListener('resize', skLayout);

// ---------- who sees the Claude upload ----------
// The upload needs a GitHub token that only Lauren has, so a shared copy of this page cannot send anything. To keep the button
// out of everyone else's way it is hidden unless this browser has been set up by her: open the page once with ?owner=1 (or
// paste a token), and it stays visible on that browser.
(function () {
  var owner = false;
  try {
    if (/[?&]owner(=|&|$)/.test(location.search)) localStorage.setItem('nibble-sketchpad-owner', '1');
    var g = JSON.parse(localStorage.getItem('nibble-sketchpad-gh') || 'null');
    owner = localStorage.getItem('nibble-sketchpad-owner') === '1' || !!(g && g.token);
  } catch (e) { /* storage blocked: treated as a visitor */ }
  document.body.classList.toggle('skp-guest', !owner);
  SK_OWNER = owner;
  $('skOwnerLink').addEventListener('click', function () {   // on a new browser: turn the upload tools on without the ?owner=1 address
    try { localStorage.setItem('nibble-sketchpad-owner', '1'); } catch (e) { /* storage blocked: it lasts until the page closes */ }
    SK_OWNER = true; document.body.classList.remove('skp-guest');
    $('skSettings').open = true;
    skStatus.textContent = 'Uploads are on. Paste your GitHub token in the box under Send.';
  });
})();

// ---------- fireflies in the header (only for looks) ----------
(function () {
  var box = $('skFlies'), n = 14;
  for (var i = 0; i < n; i++) {
    var f = document.createElement('span');
    f.className = 'sk-fly';
    f.style.left = (3 + (i * 97 / n) + Math.random() * 5) + '%';
    f.style.top = (12 + Math.random() * 70) + '%';
    f.style.setProperty('--x', (Math.random() * 60 - 30).toFixed(0) + 'px');
    f.style.setProperty('--y', (Math.random() * 24 - 12).toFixed(0) + 'px');
    f.style.setProperty('--t', (16 + Math.random() * 14).toFixed(1) + 's');
    f.style.setProperty('--b', (6 + Math.random() * 5).toFixed(1) + 's');
    f.style.setProperty('--d', '-' + (Math.random() * 20).toFixed(1) + 's');
    box.appendChild(f);
  }
})();

// ---------- start ----------
skColourButtons();
skUseColour(SK.color);
skLoad();
skLoadImages();
{ var im0 = SK.images[SK.mode]; SK.sel = im0.length ? im0[im0.length - 1].id : null; }
skLayersUI();
skLinesUI();
skBuildPanels();
$('skClean').checked = SK.clean;
skSetPen(SK.pen);
skStatus.textContent = 'Loading…';
skLoadSource().then(function () {
  skStatus.textContent = SK_OWNER ? 'Draw something. File > Send to Claude when it is ready.' : 'Draw something. File > Save SVG when it is ready.';
  skBuild();
}).catch(function (e) {
  skStatus.textContent = 'Could not load the pet (' + e.message + '). Open this page from the website, not as a file.';
});
ghLoadSettings();
