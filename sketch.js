// The standalone sketchpad (sketch.html): draw over a big copy of the pet (or the scene, the toy or the room) and upload the
// drawing to Claude. The lines are kept as vectors in the same coordinates as the picture underneath, so a hat drawn on the
// pet lands where the SVG for it goes. It is its own page, apart from the game: it borrows the pet and the toy from the game's
// index.html when it opens, and uses logic.js, wardrobe.js, skins.js, decor.js and backdrops.js for the rest.
'use strict';

var SVGNS = 'http://www.w3.org/2000/svg';
var $ = function (id) { return document.getElementById(id); };
var skStage = $('skStage'), skView = $('skView'), skStatus = $('skStatus');
var L = PetLogic;

/** The drawing area of each mode, in the coordinates of what is underneath. The pet is 160 x 150 with room round it for hats. */
var SK_VIEW = { pet: { x: -30, y: -50, w: 220, h: 220 }, scene: { x: 0, y: 0, w: 400, h: 160 }, toy: { x: 0, y: 0, w: 26, h: 26 }, room: { x: 0, y: 0, w: 400, h: 160 } };
var SK_COLOURS = ['#5b4239', '#000000', '#ffffff', '#ff8fb1', '#ff6b6b', '#ffa94d', '#ffd166', '#7bd389', '#6ec6ff', '#b69cff'];
var SK_PEN = 0.001;   // each step of the thickness slider, as a share of the drawing area's width
var SPECIES = [['mochi', 'Nibble'], ['pig', 'Pig'], ['kitty', 'Cat'], ['puppy', 'Dog'], ['bunny', 'Bunny'], ['birdie', 'Birdie'], ['cow', 'Cow'], ['hamster', 'Hamster'], ['frog', 'Frog'], ['hedgehog', 'Hedgehog'], ['axolotl', 'Axolotl'], ['mouse', 'Mouse'], ['monkey', 'Monkey'], ['dragon', 'Dragon']];
var SLOTS = [['hat', 'Hat'], ['body', 'Clothes'], ['face', 'Glasses'], ['mouth', 'Mouth'], ['neck', 'Neck'], ['feet', 'Shoes']];
/** What the pet underneath looks like (kept on this computer). */
var P = { species: 'mochi', skin: '', outfit: { hat: 'none', body: 'none', face: 'none', mouth: 'none', neck: 'none', feet: 'none' }, backdrop: 'meadow', night: false, room: {} };
var SK = {
  mode: 'pet', tool: 'pen', color: SK_COLOURS[0], zoom: 1, pen: 9, clip: [], pasteN: 0, tidy: 6, space: false, sel: null, mirror: false, pick: [],
  strokes: { pet: [], scene: [], toy: [], room: [] }, hist: { pet: [], scene: [], toy: [], room: [] }, redo: { pet: [], scene: [], toy: [], room: [] },
  /** Pictures to trace, one layer each, in the same coordinates as the drawing: {id, name, src, cx, cy, bw, bh, scale, opacity, visible, behind} */
  images: { pet: [], scene: [], toy: [], room: [] },
  /** Layers for the lines, bottom first: {id, name, show}; each stroke has `lay` (a layer id), and `active` is where new lines go */
  layers: { pet: [], scene: [], toy: [], room: [] }, layerSet: { pet: [], scene: [], toy: [], room: [] }, active: { pet: 'l1', scene: 'l1', toy: 'l1', room: 'l1' }
};
var SK_PEN_DEFAULT = 9;
var SK_OWNER = false, skDraw = null, skDrawing = false, skPan = null, skPetSvg = null, skToys = null, skImgUnder = null, skImgOver = null, skSelBox = null, skXf = null;

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
    localStorage.setItem('nibble-sketchpad', JSON.stringify({ P: P, strokes: SK.strokes, kind: $('skKind').value, note: $('skNote').value, tidy: SK.tidy, pen: SK.pen, layers: SK.layers, active: SK.active, snap: $('skSnap').checked, mirror: SK.mirror }));
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
      P.backdrop = d.P.backdrop || 'meadow'; P.night = !!d.P.night; P.room = d.P.room || {}; P.template = !!d.P.template;
    }
    ['pet', 'scene', 'toy', 'room'].forEach(function (m) { if (d.strokes && Array.isArray(d.strokes[m])) SK.strokes[m] = d.strokes[m]; });
    if (d.kind) $('skKind').value = d.kind;
    $('skNote').value = d.note || '';
    if (typeof d.tidy === 'number') SK.tidy = d.tidy;
    if (d.pen >= 1 && d.pen <= 40) SK.pen = d.pen;
    ['pet', 'scene', 'toy', 'room'].forEach(function (m) {
      if (d.layers && Array.isArray(d.layers[m])) SK.layers[m] = d.layers[m].filter(function (l) { return l && l.id; }).map(function (l) { return { id: String(l.id), name: String(l.name || 'Layer').slice(0, 24), show: l.show !== false }; });
      if (d.active && d.active[m]) SK.active[m] = d.active[m];
    });
    $('skSnap').checked = d.snap !== false;
    SK.mirror = !!d.mirror;
  } catch (e) { /* nothing saved, or it could not be read */ }
}

// ---------- the picture underneath ----------
/** @returns {HTMLElement} A still copy of the pet, wearing what it wears, for the picture underneath. */
function skPet(blank) {
  var v = document.createElement('div');
  v.className = 'pet preview x-cheeks' + (L.isBird(P.species) ? ' beaked' : '') + (blank ? ' sk-blank' : '');
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
    (SK.mirror ? '<path d="M' + skAxis() + ' ' + v.y + 'v' + v.h + '" class="g4"/>' : '');
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
  } else {
    var t = skToy();
    skPlace(t, v, 0, 0, 26, 26);
    ref.appendChild(t);
  }
  skDraw = document.createElementNS(SVGNS, 'svg');
  skDraw.setAttribute('viewBox', [v.x, v.y, v.w, v.h].join(' '));
  skDraw.setAttribute('class', 'sk-draw');
  skStage.dataset.mode = SK.mode;
  skImgUnder = skLayerSvg('sk-imgs under'); skImgOver = skLayerSvg('sk-imgs over'); skSelBox = skLayerSvg('sk-sel'); skXf = skLayerSvg('sk-xf');
  skXf.addEventListener('pointerdown', skXfDown);
  skStage.replaceChildren(skImgUnder, ref, skImgOver, skGrid(v), skDraw, skSelBox, skXf);
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
/** @returns {SVGPathElement} One stroke, drawn. */
function skEl(s) {
  var el = document.createElementNS(SVGNS, 'path'), v = SK_VIEW[SK.mode];
  el.setAttribute('d', s.d || L.sketchPath(s.pts, (s.fill || s.closed) && s.pts.length > 2, v.w > 100 ? 1 : 2));
  if (s.d) el.setAttribute('fill-rule', 'evenodd');
  el.setAttribute('stroke', s.color);
  el.setAttribute('stroke-width', s.width);
  el.setAttribute('fill', s.fill ? s.color : 'none');
  el.setAttribute('stroke-linecap', 'round');
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
  $('skTemplate').checked = !!P.template;
  $('skRefLabel').textContent = SK.mode === 'toy' ? 'Toy' : 'Pet';
}

// ---------- drawing ----------
function skPoint(e) {
  var r = skDraw.getBoundingClientRect(), v = SK_VIEW[SK.mode];
  return [v.x + (e.clientX - r.left) / r.width * v.w, v.y + (e.clientY - r.top) / r.height * v.h];
}
function skPushHistory() {
  SK.redo[SK.mode] = [];
  var h = SK.hist[SK.mode];
  h.push(JSON.stringify(SK.strokes[SK.mode]));
  if (h.length > 60) h.shift();
  skHistoryUI();
}
/** Greys out Undo and Redo when there is nothing to undo or redo. */
function skHistoryUI() {
  $('skUndo').disabled = !SK.hist[SK.mode].length;
  $('skRedo').disabled = !SK.redo[SK.mode].length;
}
/** A quick pulse on a button, so you can see the press (also for the keyboard shortcuts). */
function skFlash(id) {
  var b = $(id);
  b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
  setTimeout(function () { b.classList.remove('flash'); }, 320);
}
function skRedraw() {
  skDraw.replaceChildren.apply(skDraw, skOrdered().filter(skLive).map(skEl));
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
      '<button type="button" class="sk-mini" data-act="del" title="Delete this layer (its lines drop to the next one)"' + (l.length < 2 ? ' disabled' : '') + '>✕</button>';
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
    var to = l[i ? i - 1 : 1];
    SK.strokes[SK.mode].forEach(function (s) { if (skLayerOf(s) === x) s.lay = to.id; });
    l.splice(i, 1);
    if (SK.active[SK.mode] === x.id) SK.active[SK.mode] = to.id;
    SK.layerSet[SK.mode] = skSetOf().filter(function (id) { return id !== x.id; });
    skStatus.textContent = 'Layer removed. Its lines moved to ' + to.name + '.';
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
function skEraseAt(pt) {
  var v = SK_VIEW[SK.mode], r = v.w * 0.012, list = SK.strokes[SK.mode];
  var spots = SK.mirror ? [pt, skMirrorPt(pt)] : [pt];
  var hitsLine = function (s) { return !s.bucket && skLive(s) && spots.some(function (q) { return L.sketchHit(s.pts, q, r + s.width / 2); }); };
  var lines = list.some(hitsLine);
  // lines come first: only when no line is under the eraser does it take the colour fill there
  var keep = list.filter(function (s) { return lines ? !hitsLine(s) : !(s.bucket && skLive(s) && spots.some(function (q) { return skInFill(s, q); })); });
  if (keep.length === list.length) return;
  if (!skDrawing.erased) { skPushHistory(); skDrawing.erased = true; }
  SK.strokes[SK.mode] = keep;
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
  if (SK.tool === 'drop') { skPickInPage(e.clientX, e.clientY); return; }
  var pt = skPoint(e), v = SK_VIEW[SK.mode];
  if (SK.tool === 'bucket') { skBucket(pt); return; }
  if (skIsSel()) { skSelDown(e, pt); return; }
  if (SK.tool === 'imgmove') {
    var img = skSelected();
    if (!img) { skStatus.textContent = 'Add an image first (Ctrl+V pastes one).'; return; }
    skDrawing = { image: img, last: pt, moved: false };
    return;
  }
  if (SK.tool === 'erase') { skDrawing = { erased: false }; skEraseAt(pt); return; }
  var act = skLays().filter(function (x) { return x.id === SK.active[SK.mode]; })[0];
  if (act && !act.show) { act.show = true; skLinesUI(); skRedraw(); }   // drawing on a hidden layer shows it, so the line is not invisible
  var s = { pts: [pt], color: SK.color, width: +(v.w * SK_PEN * SK.pen).toFixed(2), fill: SK.tool === 'blob', lay: SK.active[SK.mode] };
  skDrawing = { stroke: s, el: skEl(s) };
  skDraw.appendChild(skDrawing.el);
  if (SK.mirror) { skDrawing.el2 = skEl(skMirrored(s)); skDraw.appendChild(skDrawing.el2); }
}
/** @returns {Object} A copy of a stroke folded over the middle line. */
function skMirrored(s) {
  var m = JSON.parse(JSON.stringify(s));
  m.pts = s.pts.map(skMirrorPt);
  return m;
}
function skMove(e) {
  var pt = skPoint(e), v = SK_VIEW[SK.mode];
  skLastPt = pt;
  if (skPan) { skView.scrollLeft = skPan.left - (e.clientX - skPan.x); skView.scrollTop = skPan.top - (e.clientY - skPan.y); return; }
  if (!skDrawing || !e.isPrimary) return;
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
  if (SK.tool === 'erase') { skEraseAt(pt); return; }
  var s = skDrawing.stroke, last = s.pts[s.pts.length - 1];
  if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < v.w * 0.002) return;   // ignore tiny wobbles
  s.pts.push(pt);
  skDrawing.el.setAttribute('d', L.sketchPath(s.pts, s.fill && s.pts.length > 2, v.w > 100 ? 1 : 2));
  if (skDrawing.el2) skDrawing.el2.setAttribute('d', L.sketchPath(s.pts.map(skMirrorPt), s.fill && s.pts.length > 2, v.w > 100 ? 1 : 2));
}
function skUp() {
  if (skPan) skStage.classList.remove('panning');
  skPan = null;
  if (skDrawing && skDrawing.image) { skDrawing = false; skSaveImages(); return; }
  if (skDrawing && skDrawing.xf) { skDrawing = false; skSave(); skXfRender(); return; }
  if (skDrawing && skDrawing.lasso) { skLassoEnd(); skDrawing = false; skXfRender(); return; }
  if (skDrawing && skDrawing.band) { skBandEnd(skLastPt || [skDrawing.band.x, skDrawing.band.y]); skDrawing = false; skXfRender(); return; }
  if (!skDrawing) return;
  if (skDrawing.stroke) {
    var s = skDrawing.stroke, t = L.tidyStroke(s.pts, SK_VIEW[SK.mode].w, { passes: SK.tidy, snap: $('skSnap').checked });
    s.pts = t.pts;
    if (t.closed) s.closed = true;
    skPushHistory();
    SK.strokes[SK.mode].push(s);
    if (skDrawing.el2) SK.strokes[SK.mode].push(skMirrored(s));   // the other side is the same line folded over, so the two always match exactly
    skRedraw();   // redrawn tidy, and in the right layer
  }
  skDrawing = false;
  skSave();
}
function skCancel() {
  if (skDrawing && skDrawing.el) skDrawing.el.remove();
  if (skDrawing && skDrawing.el2) skDrawing.el2.remove();
  if (skDrawing && (skDrawing.lasso || skDrawing.band)) { (skDrawing.lasso || skDrawing.band).el.remove(); }
  skDrawing = false; skPan = null;
  skStage.classList.remove('panning');
}
function skUndo() {
  SK.pick = []; skXfRender();
  var h = SK.hist[SK.mode];
  if (!h.length) { skStatus.textContent = 'Nothing to undo.'; return; }
  skFlash('skUndo');
  SK.redo[SK.mode].push(JSON.stringify(SK.strokes[SK.mode]));
  SK.strokes[SK.mode] = JSON.parse(h.pop());
  skRedraw();
  skHistoryUI();
  skStatus.textContent = 'Undone.';
  skSave();
}
function skRedo() {
  SK.pick = []; skXfRender();
  var r = SK.redo[SK.mode];
  if (!r.length) { skStatus.textContent = 'Nothing to redo.'; return; }
  skFlash('skRedo');
  SK.hist[SK.mode].push(JSON.stringify(SK.strokes[SK.mode]));
  SK.strokes[SK.mode] = JSON.parse(r.pop());
  skRedraw();
  skHistoryUI();
  skStatus.textContent = 'Redone.';
  skSave();
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
  return SK.pick.map(function (s) { return { s: s, pts: s.pts.map(function (p) { return p.slice(); }), d: s.d, width: s.width }; });
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
  var none = !SK.pick.length;
  $('skSelTools').querySelectorAll('button').forEach(function (b) { b.disabled = none; });
}
/** Runs a transform on everything picked, as one undo step. */
function skApplyOp(op) {
  if (!SK.pick.length) return;
  skPushHistory();
  SK.pick.forEach(function (s) {
    var r = L.sketchXform({ pts: s.pts, d: s.d, width: s.width }, op);
    s.pts = r.pts; s.width = r.width;
    if (s.d) s.d = r.d;
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
    c.lay = SK.active[SK.mode];
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
$('skDel').addEventListener('click', skDeletePick);

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
  var spots = SK.mirror ? [pt, skMirrorPt(pt)] : [pt], added = [], recoloured = false, why = '';
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
    pet: SK.mode === 'pet' && P.template ? { species: P.species, skin: P.skin, template: 'blank outline of this skin: shapes kept, colour and outfit removed' } : { species: P.species, skin: P.skin, outfit: P.outfit },
    backdrop: scene ? P.backdrop + (P.night ? ' (night)' : '') : undefined,
    furniture: SK.mode === 'room' ? Object.keys(P.room).filter(function (k) { return P.room[k]; }) : undefined,
    placement: SK.mode === 'room' ? 'room 400 x 160 (about the stage): draw ONE new piece of furniture; the pet box is x125 y18 w150 h140, placed furniture is shown behind it; convert the piece to a decor.js entry (x, y = its centre / 400 and / 160, w, h in px, own view box)'
      : SK.mode === 'scene' ? 'pet box x125 y18 w150 h140, toy x295 y124 w26'
      : SK.mode === 'pet' ? 'pet drawing is 160 x 150 at 0,0' : 'toy drawing is 26 x 26'
  };
}
function skFiles() {
  var m = skMeta(), several = skLays().length > 1;
  if (several) m.layers = skLays().map(function (x) { return x.name; });   // bottom first
  var svg = L.sketchSvg(skOrdered().map(function (s) { return several ? Object.assign({}, s, { layer: skLayerOf(s).name }) : s; }), SK_VIEW[SK.mode], m);
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
function skUpload() {
  if (skEmpty()) return;
  var g = ghSettings(), f = skFiles();
  if (!g.token || !g.repo) { $('skSettings').open = true; skStatus.textContent = 'Connect to GitHub first.'; return; }
  ghSaveSettings();
  skStatus.textContent = 'Uploading…';
  var content = btoa(unescape(encodeURIComponent(f.svg)));
  ghEnsureBranch().then(function () {
    return ghReq('PUT', '/repos/' + g.repo + '/contents/drawings/' + f.name + '.svg', { message: 'Drawing: ' + f.meta.kind + (f.meta.note ? ' - ' + f.meta.note.slice(0, 60) : ''), content: content, branch: g.branch });
  }).then(function () {
    skStatus.textContent = 'Uploaded drawings/' + f.name + '.svg. Tell me in the chat.';
  }).catch(function (e) {
    skStatus.textContent = 'Could not upload: ' + e.message + (e.status === 401 || e.status === 403 || e.status === 404 ? ' (check the token and that it can write to this repository).' : '') + ' You can still use Save SVG.';
  });
}

// ---------- picture layers (to trace over) ----------
/** @returns {?Object} The selected image layer of the current area. */
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
/** Rebuilds the list of layers in the panel. */
function skLayersUI() {
  var box = $('skLayers'), list = SK.images[SK.mode];
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
    if (d) ['pet', 'scene', 'toy', 'room'].forEach(function (m) { if (Array.isArray(d[m])) SK.images[m] = d[m].filter(function (i) { return i && i.src && i.bw > 0; }); });
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
      skStatus.textContent = 'Image added. Move it with the Move image tool (M).';
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
  if (t === 'drop' && window.EyeDropper) { skEyedrop(); return; }   // the browser's own: picks once from anywhere on the screen
  if (t === 'drop') {   // no screen eyedropper (Firefox): click on the picture instead, then carry on with the tool you had
    if (SK.tool !== 'drop') SK.prevTool = SK.tool;
    skStatus.textContent = 'Click the picture to pick a colour. Esc cancels.';
  }
  if (t !== 'select' && t !== 'lasso') SK.pick = [];
  if (t === 'select') skStatus.textContent = 'Click a line or drag a box over some. Shift adds. Corners resize, the round handle turns, the middle moves.';
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
  skPress($('skTidy'), 'tidy', SK.tidy);
  $('skMirror').setAttribute('aria-pressed', String(SK.mirror));
}

skStage.addEventListener('pointerdown', function (e) { if (skDraw && e.target === skDraw) skDown(e); });
skStage.addEventListener('pointermove', function (e) { if (skDraw && (e.target === skDraw || skDrawing || skPan)) skMove(e); });
skStage.addEventListener('pointerup', skUp);
skStage.addEventListener('pointercancel', skCancel);
$('skModes').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || b.dataset.mode === SK.mode) return;
  SK.mode = b.dataset.mode;
  var kind = { room: 'furniture', toy: 'toy', scene: 'background' }[SK.mode];
  if (kind) $('skKind').value = kind;
  skPress($('skModes'), 'mode', SK.mode);
  SK.pick = [];
  var imgs = SK.images[SK.mode];
  SK.sel = imgs.length ? imgs[imgs.length - 1].id : null;
  skLayersUI();
  skLinesUI();
  skBuild();
});
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
['skGrid', 'skRef', 'skGhost'].forEach(function (id) { $(id).addEventListener('input', skApplyLook); });
$('skSpecies').addEventListener('change', function () { P.species = $('skSpecies').value; P.skin = ''; skSkins(); skSave(); skBuild(); });
$('skSkin').addEventListener('change', function () { P.skin = $('skSkin').value; skSave(); skBuild(); });
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
  if (k === 'x') { skSetMirror(!SK.mirror); return; }
  if ((k === 'delete' || k === 'backspace') && skIsSel() && SK.pick.length) { e.preventDefault(); skDeletePick(); return; }
  if (e.key === 'Escape' && skIsSel() && SK.pick.length) { SK.pick = []; skXfRender(); return; }
  var tool = { p: 'pen', f: 'blob', e: 'erase', h: 'hand', i: 'drop', m: 'imgmove', b: 'bucket', s: 'select', l: 'lasso' }[k];
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
skSetPen(SK.pen);
skStatus.textContent = 'Loading…';
skLoadSource().then(function () {
  skStatus.textContent = SK_OWNER ? 'Draw, then Upload to Claude.' : 'Draw, then Save SVG.';
  skBuild();
}).catch(function (e) {
  skStatus.textContent = 'Could not load the pet (' + e.message + '). Open this page from the website, not as a file.';
});
ghLoadSettings();
