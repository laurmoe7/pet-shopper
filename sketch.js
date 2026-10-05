// The standalone sketchpad (sketch.html): draw over a big copy of the pet (or the scene, the toy or the room) and upload the
// drawing to Claude. The lines are kept as vectors in the same coordinates as the picture underneath, so a hat drawn on the
// pet lands where the SVG for it goes. It is its own page, apart from the game: it borrows the pet and the toy from the game's
// index.html when it opens, and uses logic.js, wardrobe.js, skins.js, decor.js and backdrops.js for the rest.
'use strict';

var SVGNS = 'http://www.w3.org/2000/svg';
var $ = function (id) { return document.getElementById(id); };
var skStage = $('skStage'), skView = $('skView'), skStatus = $('skStatus'), skCoords = $('skCoords');
var L = PetLogic;

/** The drawing area of each mode, in the coordinates of what is underneath. The pet is 160 x 150 with room round it for hats. */
var SK_VIEW = { pet: { x: -30, y: -50, w: 220, h: 220 }, scene: { x: 0, y: 0, w: 400, h: 160 }, toy: { x: 0, y: 0, w: 26, h: 26 }, room: { x: 0, y: 0, w: 400, h: 160 } };
var SK_COLOURS = ['#5b4239', '#000000', '#ffffff', '#ff8fb1', '#ff6b6b', '#ffa94d', '#ffd166', '#7bd389', '#6ec6ff', '#b69cff'];
var SK_SIZES = [0.004, 0.009, 0.017];   // line widths as a share of the drawing area's width
var SPECIES = [['mochi', 'Nibble'], ['pig', 'Pig'], ['kitty', 'Cat'], ['puppy', 'Dog'], ['bunny', 'Bunny'], ['birdie', 'Birdie'], ['cow', 'Cow'], ['hamster', 'Hamster'], ['frog', 'Frog'], ['hedgehog', 'Hedgehog'], ['axolotl', 'Axolotl']];
var SLOTS = [['hat', 'Hat'], ['body', 'Clothes'], ['face', 'Glasses'], ['mouth', 'Mouth'], ['neck', 'Neck'], ['feet', 'Shoes']];
/** What the pet underneath looks like (kept on this computer). */
var P = { species: 'mochi', skin: '', outfit: { hat: 'none', body: 'none', face: 'none', mouth: 'none', neck: 'none', feet: 'none' }, backdrop: 'meadow', night: false, room: {} };
var SK = {
  mode: 'pet', tool: 'pen', color: SK_COLOURS[0], size: 1, zoom: 1, tidy: 6, space: false, sel: null,
  strokes: { pet: [], scene: [], toy: [], room: [] }, hist: { pet: [], scene: [], toy: [], room: [] }, redo: { pet: [], scene: [], toy: [], room: [] },
  /** Pictures to trace, one layer each, in the same coordinates as the drawing: {id, name, src, cx, cy, bw, bh, scale, opacity, visible, behind} */
  images: { pet: [], scene: [], toy: [], room: [] }
};
var skDraw = null, skDrawing = false, skPan = null, skPetSvg = null, skToys = null, skImgUnder = null, skImgOver = null, skSelBox = null;

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
    localStorage.setItem('nibble-sketchpad', JSON.stringify({ P: P, strokes: SK.strokes, kind: $('skKind').value, note: $('skNote').value, tidy: SK.tidy, snap: $('skSnap').checked }));
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
      P.backdrop = d.P.backdrop || 'meadow'; P.night = !!d.P.night; P.room = d.P.room || {};
    }
    ['pet', 'scene', 'toy', 'room'].forEach(function (m) { if (d.strokes && Array.isArray(d.strokes[m])) SK.strokes[m] = d.strokes[m]; });
    if (d.kind) $('skKind').value = d.kind;
    $('skNote').value = d.note || '';
    if (typeof d.tidy === 'number') SK.tidy = d.tidy;
    $('skSnap').checked = d.snap !== false;
  } catch (e) { /* nothing saved, or it could not be read */ }
}

// ---------- the picture underneath ----------
/** @returns {HTMLElement} A still copy of the pet, wearing what it wears, for the picture underneath. */
function skPet() {
  var v = document.createElement('div');
  v.className = 'pet preview x-cheeks' + (L.isBird(P.species) ? ' beaked' : '');
  v.dataset.species = P.species;
  v.dataset.skin = P.skin || '';
  v.dataset.state = 'curious';
  v.dataset.eyes = 'open';
  v.dataset.mouth = 'smile';
  v.dataset.arms = 'idle';
  v.appendChild(petCopy());
  dressUp(v, P.outfit);
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
/** @returns {SVGSVGElement} The grid: faint lines every 10 (or 2) units, stronger every 50 (or 10), and the pet's middle line. */
function skGrid(v) {
  var small = v.w > 100 ? 10 : 2, big = v.w > 100 ? 50 : 10, d = '', dBig = '';
  for (var x = Math.ceil(v.x / small) * small; x <= v.x + v.w; x += small) (x % big ? (d += 'M' + x + ' ' + v.y + 'v' + v.h) : (dBig += 'M' + x + ' ' + v.y + 'v' + v.h));
  for (var y = Math.ceil(v.y / small) * small; y <= v.y + v.h; y += small) (y % big ? (d += 'M' + v.x + ' ' + y + 'h' + v.w) : (dBig += 'M' + v.x + ' ' + y + 'h' + v.w));
  var svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', [v.x, v.y, v.w, v.h].join(' '));
  svg.setAttribute('class', 'sk-grid');
  svg.innerHTML = '<path d="' + d + '" class="g1"/><path d="' + dBig + '" class="g2"/>' +
    (SK.mode === 'pet' ? '<path d="M80 ' + v.y + 'v' + v.h + '" class="g3"/>' : '');
  return svg;
}
/** Builds the stage for the current mode: the picture underneath, the grid and the drawing layer. */
function skBuild() {
  var v = SK_VIEW[SK.mode], ref = document.createElement('div');
  ref.className = 'sk-ref';
  if (SK.mode === 'pet') {
    var p = skPet();
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
  skImgUnder = skLayerSvg('sk-imgs under'); skImgOver = skLayerSvg('sk-imgs over'); skSelBox = skLayerSvg('sk-sel');
  skStage.replaceChildren(skImgUnder, ref, skImgOver, skGrid(v), skDraw, skSelBox);
  skRenderImages();
  SK.strokes[SK.mode].forEach(function (s) { skDraw.appendChild(skEl(s)); });
  skHistoryUI();
  skApplyLook();
  skLayout();
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
  el.setAttribute('d', L.sketchPath(s.pts, (s.fill || s.closed) && s.pts.length > 2, v.w > 100 ? 1 : 2));
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
  $('skRefLabel').textContent = SK.mode === 'toy' ? 'Show toy' : 'Show pet';
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
  skDraw.replaceChildren.apply(skDraw, SK.strokes[SK.mode].map(skEl));
}
function skEraseAt(pt) {
  var v = SK_VIEW[SK.mode], r = v.w * 0.012, list = SK.strokes[SK.mode];
  var keep = list.filter(function (s) { return !L.sketchHit(s.pts, pt, r + s.width / 2); });
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
  if (SK.tool === 'imgmove') {
    var img = skSelected();
    if (!img) { skStatus.textContent = 'Add or pick an image layer first.'; return; }
    skDrawing = { image: img, last: pt, moved: false };
    return;
  }
  if (SK.tool === 'erase') { skDrawing = { erased: false }; skEraseAt(pt); return; }
  var s = { pts: [pt], color: SK.color, width: +(v.w * SK_SIZES[SK.size]).toFixed(2), fill: SK.tool === 'blob' };
  skDrawing = { stroke: s, el: skEl(s) };
  skDraw.appendChild(skDrawing.el);
}
function skMove(e) {
  var pt = skPoint(e), v = SK_VIEW[SK.mode];
  skCoords.textContent = 'x ' + pt[0].toFixed(v.w > 100 ? 0 : 1) + '   y ' + pt[1].toFixed(v.w > 100 ? 0 : 1);
  if (skPan) { skView.scrollLeft = skPan.left - (e.clientX - skPan.x); skView.scrollTop = skPan.top - (e.clientY - skPan.y); return; }
  if (!skDrawing || !e.isPrimary) return;
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
}
function skUp() {
  if (skPan) skStage.classList.remove('panning');
  skPan = null;
  if (skDrawing && skDrawing.image) { skDrawing = false; skSaveImages(); return; }
  if (!skDrawing) return;
  if (skDrawing.stroke) {
    var s = skDrawing.stroke, t = L.tidyStroke(s.pts, SK_VIEW[SK.mode].w, { passes: SK.tidy, snap: $('skSnap').checked });
    s.pts = t.pts;
    if (t.closed) s.closed = true;
    skPushHistory();
    SK.strokes[SK.mode].push(s);
    skDrawing.el.replaceWith(skEl(s));   // redrawn tidy
  }
  skDrawing = false;
  skSave();
}
function skCancel() {
  if (skDrawing && skDrawing.el) skDrawing.el.remove();
  skDrawing = false; skPan = null;
  skStage.classList.remove('panning');
}
function skUndo() {
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

// ---------- what Claude needs ----------
/** @returns {Object} What Claude needs to put the drawing back over the same picture. */
function skMeta() {
  var v = SK_VIEW[SK.mode], scene = SK.mode === 'scene' || SK.mode === 'room';
  return {
    page: 'sketchpad', mode: SK.mode, kind: $('skKind').value, note: $('skNote').value.trim(), view: v,
    tidy: SK.tidy ? 'smoothed' + ($('skSnap').checked ? ', lines and ovals snapped' : '') : 'as drawn',
    pet: { species: P.species, skin: P.skin, outfit: P.outfit },
    backdrop: scene ? P.backdrop + (P.night ? ' (night)' : '') : undefined,
    furniture: SK.mode === 'room' ? Object.keys(P.room).filter(function (k) { return P.room[k]; }) : undefined,
    placement: SK.mode === 'room' ? 'room 400 x 160 (about the stage): draw ONE new piece of furniture; the pet box is x125 y18 w150 h140, placed furniture is shown behind it; convert the piece to a decor.js entry (x, y = its centre / 400 and / 160, w, h in px, own view box)'
      : SK.mode === 'scene' ? 'pet box x125 y18 w150 h140, toy x295 y124 w26'
      : SK.mode === 'pet' ? 'pet drawing is 160 x 150 at 0,0' : 'toy drawing is 26 x 26'
  };
}
function skFiles() {
  var m = skMeta(), svg = L.sketchSvg(SK.strokes[SK.mode], SK_VIEW[SK.mode], m);
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
  skStatus.textContent = 'Saved ' + f.name + '.svg to your Downloads.';
}
function skCopy() {
  if (skEmpty()) return;
  var text = skFiles().svg;
  navigator.clipboard.writeText(text).then(function () { skStatus.textContent = 'Copied the SVG. Paste it in the chat.'; },
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
  if (!g.token || !g.repo) { $('skSettings').open = true; skStatus.textContent = 'Connect to GitHub first (see below).'; return; }
  ghSaveSettings();
  skStatus.textContent = 'Uploading…';
  var content = btoa(unescape(encodeURIComponent(f.svg)));
  ghEnsureBranch().then(function () {
    return ghReq('PUT', '/repos/' + g.repo + '/contents/drawings/' + f.name + '.svg', { message: 'Drawing: ' + f.meta.kind + (f.meta.note ? ' - ' + f.meta.note.slice(0, 60) : ''), content: content, branch: g.branch });
  }).then(function () {
    skStatus.textContent = 'Uploaded drawings/' + f.name + '.svg. Now tell me in the chat.';
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
  if (sel && sel.visible) {
    var r = document.createElementNS(SVGNS, 'rect');
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
    body.innerHTML = '<div class="sk-row"><span class="skp-name"></span><button type="button" class="skp-x" data-act="del" title="Remove this image">Remove</button></div>' +
      '<div class="sk-row"><label><input type="checkbox" data-act="show"' + (im.visible ? ' checked' : '') + '> Show</label>' +
      '<label><input type="checkbox" data-act="behind"' + (im.behind ? ' checked' : '') + '> Behind the pet</label></div>' +
      '<div class="skp-rng"><span>Opacity</span><input type="range" min="5" max="100" value="' + im.opacity + '" data-act="opacity" aria-label="Opacity">' +
      '<span>Size</span><input type="range" min="10" max="400" value="' + Math.round(im.scale * 100) + '" data-act="scale" aria-label="Size"></div>';
    body.querySelector('.skp-name').textContent = im.name;
    row.append(thumb, body);
    return row;
  }) : [Object.assign(document.createElement('p'), { className: 'skp-hint', textContent: 'No images here yet.' })]);
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
      var im = { id: 'i' + Date.now().toString(36), name: file.name.slice(0, 28), src: cv.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9),
        cx: v.x + v.w / 2, cy: v.y + v.h / 2, bw: iw * fit, bh: ih * fit, scale: 1, opacity: 60, visible: true, behind: false };
      SK.images[SK.mode].push(im);
      SK.sel = im.id;
      skRenderImages(); skLayersUI(); skSaveImages();
      skStatus.textContent = 'Image added. Drag it with the Move image tool (M); the sliders change its opacity and size.';
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
  if (e.type === 'click' && !act && SK.sel !== im.id) {   // tapping a layer selects it
    SK.sel = im.id;
    skLayersUI(); skRenderImages();
    return;
  }
  if (e.type === 'input' && (act === 'opacity' || act === 'scale')) {
    if (act === 'opacity') im.opacity = +e.target.value; else im.scale = +e.target.value / 100;
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
    if (!c) { skStatus.textContent = 'Nothing to pick there. Try the pet, a background or your drawing.'; return; }
    skUseColour(c);
    skSetTool(SK.prevTool && SK.prevTool !== 'drop' ? SK.prevTool : 'pen');
    skStatus.textContent = 'Picked ' + c + '. It is your pen colour now.';
  });
}

// ---------- the controls ----------
function skPress(group, attr, value) {
  group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))); });
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
  $('skCurText').textContent = 'Pen colour ' + c;
  $('skColours').querySelectorAll('.sk-swatch').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === c)); });
  var pick = $('skPick');
  if (pick && /^#[0-9a-f]{6}$/i.test(c)) pick.value = c;
  if (SK.tool === 'erase' || SK.tool === 'hand' || SK.tool === 'imgmove') skSetTool('pen');
}
/** The eyedropper tool: pick a colour from anywhere on the screen (Chrome and Edge on a computer). */
function skEyedrop() {
  if (!window.EyeDropper) { skStatus.textContent = 'The eyedropper needs Chrome or Edge on a computer.'; return; }
  skStatus.textContent = 'Click anywhere on the screen to pick a colour. Esc cancels.';
  var open;
  try { open = new window.EyeDropper().open(); } catch (e) { skStatus.textContent = 'The eyedropper could not start: ' + e.message; return; }
  open.then(function (r) {
    skUseColour(r.sRGBHex);
    if (SK.tool === 'erase' || SK.tool === 'hand' || SK.tool === 'imgmove') skSetTool('pen');
    skStatus.textContent = 'Picked ' + r.sRGBHex + '. It is your pen colour now.';
  }).catch(function (e) {
    skStatus.textContent = e && e.name === 'AbortError' ? 'Eyedropper cancelled.' : 'The eyedropper did not work: ' + (e && (e.message || e.name) || 'unknown error') + '. Use the colour box or a swatch instead.';
  });
}
function skSetTool(t) {
  if (t === 'drop' && window.EyeDropper) { skEyedrop(); return; }   // the browser's own: picks once from anywhere on the screen
  if (t === 'drop') {   // no screen eyedropper (Firefox): click on the picture instead, then carry on with the tool you had
    if (SK.tool !== 'drop') SK.prevTool = SK.tool;
    skStatus.textContent = 'Click the pet, the background or your drawing to pick its colour. Esc cancels.';
  }
  SK.tool = t;
  skPress($('skTools'), 'tool', t);
  skApplyLook();
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
  var imgs = SK.images[SK.mode];
  SK.sel = imgs.length ? imgs[imgs.length - 1].id : null;
  skLayersUI();
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
$('skSizes').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  SK.size = +b.dataset.size;
  skPress($('skSizes'), 'size', SK.size);
});
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
  if (e.key === 'Escape' && SK.tool === 'drop') { skSetTool(SK.prevTool && SK.prevTool !== 'drop' ? SK.prevTool : 'pen'); skStatus.textContent = 'Cancelled.'; return; }
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) skRedo(); else skUndo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); skRedo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  var tool = { p: 'pen', f: 'blob', e: 'erase', h: 'hand', i: 'drop', m: 'imgmove' }[k];
  if (tool) skSetTool(tool);
});
document.addEventListener('keyup', function (e) {
  if (e.code !== 'Space') return;
  if (!typing(e)) e.preventDefault();
  SK.space = false;
  skStage.classList.remove('space');
});
window.addEventListener('blur', function () { SK.space = false; skStage.classList.remove('space'); });
// a drop-down that keeps the keyboard focus would swallow shortcuts like Ctrl+Z
document.addEventListener('change', function (e) { if (e.target.tagName === 'SELECT') e.target.blur(); });
window.addEventListener('resize', skLayout);

// ---------- start ----------
skColourButtons();
skUseColour(SK.color);
skLoad();
skLoadImages();
{ var im0 = SK.images[SK.mode]; SK.sel = im0.length ? im0[im0.length - 1].id : null; }
skLayersUI();
skBuildPanels();
skStatus.textContent = 'Loading the pet…';
skLoadSource().then(function () {
  skStatus.textContent = 'Draw on the picture, then press Upload to Claude.';
  skBuild();
}).catch(function (e) {
  skStatus.textContent = 'Could not load the pet from index.html (' + e.message + '). This page has to be opened from the website, not as a file.';
});
ghLoadSettings();
