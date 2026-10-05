// Developer tool: the sketchpad. Draw over a big copy of the pet (or the scene, or the toy) and send the drawing to Claude.
// The lines are kept as vectors in the same coordinates as the picture underneath, so a hat drawn on the pet lands where
// the SVG for it goes. Opened from Options > Developer tools. Plain script: BACKDROPS (app-backdrop.js) is only used when it opens.
'use strict';

var skSheet = $('sketchSheet'), skStage = $('skStage'), skView = $('skView'), skStatus = $('skStatus'), skCoords = $('skCoords');
/** The drawing area of each mode, in the coordinates of what is underneath. The pet is 160 x 150 with room round it for hats. */
var SK_VIEW = { pet: { x: -30, y: -50, w: 220, h: 220 }, scene: { x: 0, y: 0, w: 400, h: 160 }, toy: { x: 0, y: 0, w: 26, h: 26 }, room: { x: 0, y: 0, w: 400, h: 160 } };
var SK_COLOURS = ['#5b4239', '#000000', '#ffffff', '#ff8fb1', '#ff6b6b', '#ffa94d', '#ffd166', '#7bd389', '#6ec6ff', '#b69cff'];
var SK_SIZES = [0.004, 0.009, 0.017];   // line widths as a share of the drawing area's width
var SK = { mode: 'pet', tool: 'pen', color: SK_COLOURS[0], size: 1, zoom: 1, strokes: { pet: [], scene: [], toy: [], room: [] }, hist: { pet: [], scene: [], toy: [], room: [] } };
var skDraw = null, skLive = null, skDrawing = false, skBackdrop = 'none';

/** Keeps the work on this device, so closing the sheet (or the app) loses nothing. */
function skSave() {
  try { localStorage.setItem('nibble-sketch', JSON.stringify({ strokes: SK.strokes, kind: $('skKind').value, note: $('skNote').value })); } catch (e) { /* storage not available */ }
}
function skLoad() {
  try {
    var d = JSON.parse(localStorage.getItem('nibble-sketch') || 'null');
    if (!d) return;
    ['pet', 'scene', 'toy', 'room'].forEach(function (m) { if (d.strokes && Array.isArray(d.strokes[m])) SK.strokes[m] = d.strokes[m]; });
    if (d.kind) $('skKind').value = d.kind;
    $('skNote').value = d.note || '';
  } catch (e) { /* nothing saved, or it could not be read */ }
}

/** @returns {HTMLElement} A still copy of the pet, wearing what it wears, for the picture underneath. */
function skPet() {
  var v = document.createElement('div');
  v.className = 'pet preview x-cheeks' + (L.isBird(state.pet.species) ? ' beaked' : '');
  v.dataset.species = state.pet.species;
  v.dataset.skin = state.pet.skin || '';
  v.dataset.state = 'curious';
  v.dataset.eyes = 'open';
  v.dataset.mouth = 'smile';
  v.dataset.arms = 'idle';
  v.appendChild(petCopy());
  dressUp(v, state.pet.outfit);
  return v;
}
/** @returns {HTMLElement} A copy of the toy this pet plays with (yarn, tennis ball or ball), 26 x 26. */
function skToy() {
  var kind = state.pet.species === 'kitty' ? 'yarn' : state.pet.species === 'puppy' ? 'tennis' : 'ball';
  var t = document.createElement('div'), g = document.querySelector('#toy [data-toy="' + kind + '"]').cloneNode(true);
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
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
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
    var bd = BACKDROPS.filter(function (b) { return b.id === skBackdrop; })[0];
    if (bd && bd.draw) {
      var bg = document.createElement('div');
      bg.className = 'sk-bd';
      bg.innerHTML = '<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice">' + bd.draw(L.isNight(petNow())) + '</svg>';
      ref.appendChild(bg);
    }
    if (SK.mode === 'room') {   // the furniture already in the room, behind the pet, as the room draws it (x, y = the centre as a share of the stage)
      Decor.filter(function (d) { return state.pet.room[d.id]; }).forEach(function (d) {
        var spot = state.pet.room[d.id], f = document.createElement('div');
        f.appendChild(svgIcon(d.view, d.svg));
        f.firstChild.style.cssText = 'width:100%;height:100%;display:block;overflow:visible';
        skPlace(f, v, spot.x * v.w - d.w / 2, spot.y * v.h - d.h / 2, d.w, d.h);
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
  skDraw = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  skDraw.setAttribute('viewBox', [v.x, v.y, v.w, v.h].join(' '));
  skDraw.setAttribute('class', 'sk-draw');
  skStage.style.aspectRatio = v.w + ' / ' + v.h;
  skStage.dataset.mode = SK.mode;
  skStage.replaceChildren(ref, skGrid(v), skDraw);
  SK.strokes[SK.mode].forEach(function (s) { skDraw.appendChild(skEl(s)); });
  skApplyLook();
  skLayout();
}
/** @returns {SVGPathElement} One stroke, drawn. */
function skEl(s) {
  var el = document.createElementNS('http://www.w3.org/2000/svg', 'path'), v = SK_VIEW[SK.mode];
  el.setAttribute('d', L.sketchPath(s.pts, s.fill && s.pts.length > 2, v.w > 100 ? 1 : 2));
  el.setAttribute('stroke', s.color);
  el.setAttribute('stroke-width', s.width);
  el.setAttribute('fill', s.fill ? s.color : 'none');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  return el;
}
/** Sizes the stage: as wide as the screen allows (at most 520 px), times the zoom. */
function skLayout() {
  var w = Math.min(skView.clientWidth || 340, 520) * SK.zoom;
  skStage.style.width = w + 'px';
}
function skApplyLook() {
  skStage.dataset.tool = SK.tool;
  skStage.classList.toggle('no-grid', !$('skGrid').checked);
  skStage.classList.toggle('no-ref', !$('skRef').checked);
  skStage.style.setProperty('--sk-ghost', $('skGhost').value / 100);
  $('skBdWrap').hidden = SK.mode !== 'scene' && SK.mode !== 'room';
  $('skRef').parentNode.lastChild.textContent = SK.mode === 'toy' ? ' Show toy' : ' Show pet';
}

// ---------- drawing ----------
function skPoint(e) {
  var r = skDraw.getBoundingClientRect(), v = SK_VIEW[SK.mode];
  return [v.x + (e.clientX - r.left) / r.width * v.w, v.y + (e.clientY - r.top) / r.height * v.h];
}
function skPushHistory() {
  var h = SK.hist[SK.mode];
  h.push(JSON.stringify(SK.strokes[SK.mode]));
  if (h.length > 40) h.shift();
}
function skRedraw() {
  skDraw.replaceChildren.apply(skDraw, SK.strokes[SK.mode].map(skEl));
}
function skEraseAt(pt) {
  var v = SK_VIEW[SK.mode], r = v.w * 0.02, list = SK.strokes[SK.mode];
  var keep = list.filter(function (s) { return !L.sketchHit(s.pts, pt, r + s.width / 2); });
  if (keep.length === list.length) return;
  if (!skDrawing.erased) { skPushHistory(); skDrawing.erased = true; }
  SK.strokes[SK.mode] = keep;
  skRedraw();
}
function skDown(e) {
  if (SK.tool === 'hand' || !e.isPrimary || skDrawing) return;
  e.preventDefault();
  skDraw.setPointerCapture(e.pointerId);
  var pt = skPoint(e), v = SK_VIEW[SK.mode];
  if (SK.tool === 'erase') { skDrawing = { erased: false }; skEraseAt(pt); return; }
  var s = { pts: [pt], color: SK.color, width: +(v.w * SK_SIZES[SK.size]).toFixed(2), fill: SK.tool === 'blob' };
  skDrawing = { stroke: s, el: skEl(s) };
  skDraw.appendChild(skDrawing.el);
}
function skMove(e) {
  var pt = skPoint(e), v = SK_VIEW[SK.mode];
  skCoords.textContent = 'x ' + pt[0].toFixed(v.w > 100 ? 0 : 1) + '   y ' + pt[1].toFixed(v.w > 100 ? 0 : 1);
  if (!skDrawing || !e.isPrimary) return;
  if (SK.tool === 'erase') { skEraseAt(pt); return; }
  var s = skDrawing.stroke, last = s.pts[s.pts.length - 1];
  if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < v.w * 0.003) return;   // ignore tiny wobbles
  s.pts.push(pt);
  skDrawing.el.setAttribute('d', L.sketchPath(s.pts, s.fill && s.pts.length > 2, v.w > 100 ? 1 : 2));
}
function skUp() {
  if (!skDrawing) return;
  if (skDrawing.stroke) {
    skPushHistory();
    SK.strokes[SK.mode].push(skDrawing.stroke);
    skDrawing.el.replaceWith(skEl(skDrawing.stroke));   // redrawn at its final smoothness
  }
  skDrawing = false;
  skSave();
}
function skCancel() {
  if (skDrawing && skDrawing.el) skDrawing.el.remove();
  skDrawing = false;
}

// ---------- sending ----------
/** @returns {Object} What Claude needs to put the drawing back over the same picture. */
function skMeta() {
  var v = SK_VIEW[SK.mode];
  return {
    build: BUILD, mode: SK.mode, kind: $('skKind').value, note: $('skNote').value.trim(), view: v,
    pet: { species: state.pet.species, skin: state.pet.skin || '', outfit: state.pet.outfit, personality: state.pet.personality || '' },
    backdrop: SK.mode === 'scene' || SK.mode === 'room' ? skBackdrop : undefined,
    placement: SK.mode === 'room' ? 'room 400 x 160 (about the stage): draw ONE new piece of furniture; the pet box is x125 y18 w150 h140, placed furniture is shown behind it; convert the piece to a decor.js entry (x, y = its centre / 400 and / 160, w, h in px, own view box)' : SK.mode === 'scene' ? 'pet box x125 y18 w150 h140, toy x295 y124 w26' : SK.mode === 'pet' ? 'pet drawing is 160 x 150 at 0,0' : 'toy drawing is 26 x 26'
  };
}
function skFiles() {
  var m = skMeta(), svg = L.sketchSvg(SK.strokes[SK.mode], SK_VIEW[SK.mode], m), name = 'nibble-' + m.kind + '-' + SK.mode + '-b' + BUILD;
  return { meta: m, svg: svg, name: name };
}
/** Draws the SVG onto a canvas (transparent, 4 x the units) and hands back a PNG file. */
function skPng(svg, name, done) {
  var img = new Image(), v = SK_VIEW[SK.mode];
  img.onload = function () {
    var c = document.createElement('canvas');
    c.width = Math.round(v.w * 4); c.height = Math.round(v.h * 4);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(function (b) { done(b ? new File([b], name + '.png', { type: 'image/png' }) : null); }, 'image/png');
  };
  img.onerror = function () { done(null); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function skEmpty() {
  if (SK.strokes[SK.mode].length) return false;
  skStatus.textContent = 'Nothing drawn on ' + SK.mode + ' yet.';
  return true;
}
function skDownload(file) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
}
function skSend(mode) {
  if (skEmpty()) return;
  var f = skFiles();
  var svgFile = new File([f.svg], f.name + '.svg', { type: 'image/svg+xml' });
  skPng(f.svg, f.name, function (png) {
    var files = png ? [png, svgFile] : [svgFile];
    if (mode === 'share' && navigator.canShare && navigator.share) {
      var ok = [files, png ? [png] : []].filter(function (set) { return set.length && navigator.canShare({ files: set }); })[0];
      if (ok) {
        navigator.share({ files: ok, title: 'Nibble sketch', text: JSON.stringify(f.meta) })
          .then(function () { skStatus.textContent = 'Shared.'; })
          .catch(function (e) { if (e && e.name !== 'AbortError') skStatus.textContent = 'Could not share: ' + e.message; });
        return;
      }
    }
    files.forEach(skDownload);
    skStatus.textContent = (mode === 'share' ? 'Sharing is not available here, so ' : '') + 'saved ' + files.map(function (x) { return x.name; }).join(' and ') + '.';
  });
}
/** Sends the drawing to the preview's shared database, where Claude reads it (only works inside the preview artifact). */
function skToClaude() {
  if (skEmpty()) return;
  var f = skFiles();
  var use = window.claude && window.claude.use;
  if (!use) { skStatus.textContent = 'Sending only works in the preview artifact. Try Copy SVG.'; return; }
  skStatus.textContent = 'Sending…';
  window.claude.use('db').then(function (db) {
    if (!db) throw new Error('not available');
    var id = f.name + '-' + Date.now().toString(36);
    return db.collection('sketches').doc(id).set({ id: id, at: Date.now(), kind: f.meta.kind, mode: f.meta.mode, note: f.meta.note, build: f.meta.build, meta: JSON.stringify(f.meta), svg: f.svg })
      .then(function () { skStatus.textContent = 'Sent to Claude (' + id + '). Now tell me in the chat.'; });
  }).catch(function (e) { skStatus.textContent = 'Could not send: ' + (e && e.message || e) + '. Try Copy SVG.'; });
}
function skCopy() {
  if (skEmpty()) return;
  var text = skFiles().svg;
  var fallback = function () {
    var t = document.createElement('textarea');
    t.value = text; document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { /* not allowed */ }
    t.remove();
    skStatus.textContent = ok ? 'Copied the SVG. Paste it in the chat.' : 'Could not copy. Try Save files.';
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { skStatus.textContent = 'Copied the SVG. Paste it in the chat.'; }, fallback);
  } else fallback();
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
  $('skColours').querySelectorAll('.sk-swatch').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === c)); });
  if (SK.tool === 'erase' || SK.tool === 'hand') { SK.tool = 'pen'; skPress($('skTools'), 'tool', 'pen'); skApplyLook(); }
}
function skOpen() {
  devSheet.close();
  if (!$('skBd').options.length) {
    BACKDROPS.forEach(function (b) { var o = document.createElement('option'); o.value = b.id; o.textContent = b.name; $('skBd').appendChild(o); });
    $('skBd').value = savedBackdrop !== 'none' ? savedBackdrop : 'meadow';
    skBackdrop = $('skBd').value;
    skColourButtons();
    skLoad();
  }
  skStatus.textContent = 'Draw on the picture, then tap Send to Claude.';
  openDialog(skSheet);
  skBuild();
}

$('sketchBtn').addEventListener('click', skOpen);
$('skDone').addEventListener('click', function () { skSave(); skSheet.close(); });
skStage.addEventListener('pointerdown', function (e) { if (skDraw && e.target === skDraw) skDown(e); });
skStage.addEventListener('pointermove', function (e) { if (skDraw && e.target === skDraw) skMove(e); });
skStage.addEventListener('pointerup', skUp);
skStage.addEventListener('pointercancel', skCancel);
$('skModes').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || b.dataset.mode === SK.mode) return;
  SK.mode = b.dataset.mode;
  var kind = { room: 'furniture', toy: 'toy', scene: 'background' }[SK.mode];
  if (kind) $('skKind').value = kind;
  skPress($('skModes'), 'mode', SK.mode);
  skBuild();
});
$('skZoom').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  SK.zoom = +b.dataset.zoom;
  skPress($('skZoom'), 'zoom', SK.zoom);
  skLayout();
});
$('skTools').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || !b.dataset.tool) return;
  SK.tool = b.dataset.tool;
  skPress($('skTools'), 'tool', SK.tool);
  skApplyLook();
});
$('skUndo').addEventListener('click', function () {
  var h = SK.hist[SK.mode];
  if (!h.length) { skStatus.textContent = 'Nothing to undo.'; return; }
  SK.strokes[SK.mode] = JSON.parse(h.pop());
  skRedraw();
  skSave();
});
$('skClear').addEventListener('click', function () {
  if (!SK.strokes[SK.mode].length) return;
  if (!window.confirm('Clear everything drawn on ' + SK.mode + '?')) return;
  skPushHistory();
  SK.strokes[SK.mode] = [];
  skRedraw();
  skSave();
});
$('skColours').addEventListener('click', function (e) { var b = e.target.closest('.sk-swatch'); if (b) skUseColour(b.dataset.c); });
$('skColours').addEventListener('input', function (e) { if (e.target.id === 'skPick') skUseColour(e.target.value); });
$('skSizes').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  SK.size = +b.dataset.size;
  skPress($('skSizes'), 'size', SK.size);
});
['skGrid', 'skRef', 'skGhost'].forEach(function (id) { $(id).addEventListener('input', skApplyLook); });
$('skBd').addEventListener('change', function () { skBackdrop = $('skBd').value; if (SK.mode === 'scene' || SK.mode === 'room') skBuild(); });
$('skKind').addEventListener('change', skSave);
$('skNote').addEventListener('input', skSave);
$('skShare').addEventListener('click', function () { skSend('share'); });
$('skSave').addEventListener('click', function () { skSend('save'); });
$('skCopy').addEventListener('click', skCopy);
$('skClaude').addEventListener('click', skToClaude);
window.addEventListener('resize', function () { if (skSheet.open) skLayout(); });
