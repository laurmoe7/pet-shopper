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
var SK = { mode: 'pet', tool: 'pen', color: SK_COLOURS[0], size: 1, zoom: 1, tidy: 6, strokes: { pet: [], scene: [], toy: [], room: [] }, hist: { pet: [], scene: [], toy: [], room: [] } };
var skDraw = null, skDrawing = false, skPan = null, skPetSvg = null, skToys = null;

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
  skStage.replaceChildren(ref, skGrid(v), skDraw);
  SK.strokes[SK.mode].forEach(function (s) { skDraw.appendChild(skEl(s)); });
  skApplyLook();
  skLayout();
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
  var w = Math.max(240, Math.min(skView.clientWidth - 4, (skView.clientHeight - 4) * aspect)) * SK.zoom;
  skStage.style.width = w + 'px';
  skStage.style.height = (w / aspect) + 'px';
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
  var h = SK.hist[SK.mode];
  h.push(JSON.stringify(SK.strokes[SK.mode]));
  if (h.length > 60) h.shift();
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
  if (!e.isPrimary || skDrawing || skPan || e.button > 0) return;
  e.preventDefault();
  skDraw.setPointerCapture(e.pointerId);
  if (SK.tool === 'hand') { skPan = { x: e.clientX, y: e.clientY, left: skView.scrollLeft, top: skView.scrollTop }; return; }
  var pt = skPoint(e), v = SK_VIEW[SK.mode];
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
  if (SK.tool === 'erase') { skEraseAt(pt); return; }
  var s = skDrawing.stroke, last = s.pts[s.pts.length - 1];
  if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < v.w * 0.002) return;   // ignore tiny wobbles
  s.pts.push(pt);
  skDrawing.el.setAttribute('d', L.sketchPath(s.pts, s.fill && s.pts.length > 2, v.w > 100 ? 1 : 2));
}
function skUp() {
  skPan = null;
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
}
function skUndo() {
  var h = SK.hist[SK.mode];
  if (!h.length) { skStatus.textContent = 'Nothing to undo.'; return; }
  SK.strokes[SK.mode] = JSON.parse(h.pop());
  skRedraw();
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
  if (window.EyeDropper) {   // Chrome and Edge on a computer: picks a colour from anywhere on the screen, even outside the browser
    var eye = document.createElement('button');
    eye.type = 'button'; eye.id = 'skEye'; eye.className = 'sk-eye'; eye.textContent = 'Pick from screen';
    box.appendChild(eye);
  }
}
function skUseColour(c) {
  SK.color = c;
  $('skColours').querySelectorAll('.sk-swatch').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === c)); });
  var pick = $('skPick');
  if (pick && /^#[0-9a-f]{6}$/i.test(c)) pick.value = c;
  if (SK.tool === 'erase' || SK.tool === 'hand') skSetTool('pen');
}
function skEyedrop() {
  new window.EyeDropper().open().then(function (r) {
    skUseColour(r.sRGBHex);
    skStatus.textContent = 'Picked ' + r.sRGBHex + '.';
  }).catch(function () { /* cancelled with Esc */ });
}
function skSetTool(t) {
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
  if (b && b.dataset.tool) skSetTool(b.dataset.tool);
});
$('skUndo').addEventListener('click', skUndo);
$('skClear').addEventListener('click', function () {
  if (!SK.strokes[SK.mode].length) return;
  if (!window.confirm('Clear everything drawn on ' + SK.mode + '?')) return;
  skPushHistory();
  SK.strokes[SK.mode] = [];
  skRedraw();
  skSave();
});
$('skColours').addEventListener('click', function (e) {
  var b = e.target.closest('.sk-swatch');
  if (b) skUseColour(b.dataset.c);
  if (e.target.id === 'skEye') skEyedrop();
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
document.addEventListener('keydown', function (e) {
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'range') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); skUndo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  var tool = { p: 'pen', f: 'blob', e: 'erase', h: 'hand' }[e.key.toLowerCase()];
  if (tool) skSetTool(tool);
});
window.addEventListener('resize', skLayout);

// ---------- start ----------
skColourButtons();
skLoad();
skBuildPanels();
skStatus.textContent = 'Loading the pet…';
skLoadSource().then(function () {
  skStatus.textContent = 'Draw on the picture, then press Upload to Claude.';
  skBuild();
}).catch(function (e) {
  skStatus.textContent = 'Could not load the pet from index.html (' + e.message + '). This page has to be opened from the website, not as a file.';
});
ghLoadSettings();
