// Photoshoot > Photo: takes the picture itself (no screenshot needed). The pet, the camera or background and the frame are
// drawn onto a canvas, then you can share it or save it. The picture is made on the phone and goes nowhere else.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

/** The style settings copied onto each drawing part so it looks the same when drawn alone, away from the page's stylesheet. */
var PHOTO_PROPS = ['display', 'visibility', 'opacity', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-dashoffset', 'transform', 'transform-origin', 'transform-box', 'translate', 'rotate', 'scale', 'filter', 'clip-path', 'mask', 'stop-color', 'stop-opacity',
  'font-family', 'font-size', 'font-weight', 'paint-order', 'mix-blend-mode'];
/** Copies how every part of one drawing looks right now (including the move it is in the middle of) onto its copy. @param {Element} from @param {Element} to */
function inlineLook(from, to) {
  var cs = getComputedStyle(from), css = '';
  PHOTO_PROPS.forEach(function (p) { var v = cs.getPropertyValue(p); if (v) css += p + ':' + v + ';'; });
  to.setAttribute('style', css);
  var a = from.children, b = to.children;
  for (var i = a.length - 1; i >= 0; i--) {
    if (getComputedStyle(a[i]).display === 'none') { b[i].remove(); continue; }
    inlineLook(a[i], b[i]);
  }
}
/**
 * The pet as a picture, drawn the way it looks on screen right now.
 * @param {number} pad  Room round it (in px) for hats and things that stick out.
 * @returns {Promise<HTMLImageElement>}
 */
function petImage(pad) {
  var src = shootPet.querySelector('svg'), r = src.getBoundingClientRect(), w = r.width, h = r.height;
  var clone = src.cloneNode(true);
  inlineLook(src, clone);
  var inner = clone.getAttribute('viewBox') || '0 0 160 150';
  var defs = '';
  petSvg.querySelectorAll('defs').forEach(function (d) { defs += new XMLSerializer().serializeToString(d); });
  clone.removeAttribute('style'); clone.removeAttribute('class');
  var body = new XMLSerializer().serializeToString(clone).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w + 2 * pad) + '" height="' + (h + 2 * pad) + '">' +
    '<svg x="' + pad + '" y="' + pad + '" width="' + w + '" height="' + h + '" viewBox="' + inner + '" overflow="visible">' + defs + body + '</svg></svg>';
  return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
}
/** @param {string} url @returns {Promise<HTMLImageElement>} */
function loadImage(url) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('picture')); };
    img.src = url;
  });
}
/** Draws the picture behind the pet: the camera, a studio colour or a room. @param {CanvasRenderingContext2D} ctx @param {number} W @param {number} H @returns {Promise} */
function paintBackground(ctx, W, H) {
  var v = $('shootCam');
  if (camStream && !v.hidden && v.videoWidth) {
    var s = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s;
    ctx.save();
    if (camFacing === 'user') { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.restore();
    return Promise.resolve();
  }
  var bg = shootBackgrounds()[shootState.bg];
  if (bg.draw) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" width="' + W + '" height="' + H + '">' + bg.draw(shootState.night) + '</svg>';
    return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)).then(function (img) { ctx.drawImage(img, 0, 0, W, H); });
  }
  var cols = (bg.css || '').match(/#[0-9a-f]{3,6}/gi) || ['#fff3f6', '#ffd6e2', '#ffc0d3'];
  var cx = W / 2, cy = H * 0.45, R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, cols[0]); g.addColorStop(0.7, cols[1] || cols[0]); g.addColorStop(1, cols[2] || cols[1] || cols[0]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  return Promise.resolve();
}
/** Draws the chosen frame and its caption on top. @param {CanvasRenderingContext2D} ctx @param {number} W @param {number} H @param {number} k Pixels per CSS pixel. */
function paintFrame(ctx, W, H, k) {
  var f = shootState.frame, cap = $('shootCaption').textContent;
  var font = getComputedStyle(document.body).getPropertyValue('--font-display') || 'sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (f === 'polaroid') {
    var e = 16 * k, bt = 70 * k;
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, W, e); ctx.fillRect(0, 0, e, H); ctx.fillRect(W - e, 0, e, H); ctx.fillRect(0, H - bt, W, bt);
    ctx.fillStyle = '#5b4239'; ctx.font = (20 * k) + 'px ' + font;
    ctx.fillText(cap, W / 2, H - bt / 2);
  } else if (f === 'ribbon') {
    ctx.lineWidth = 8 * k; ctx.strokeStyle = '#fff'; ctx.strokeRect(4 * k, 4 * k, W - 8 * k, H - 8 * k);
    ctx.lineWidth = 4 * k; ctx.strokeStyle = '#ffb3c7'; ctx.strokeRect(10 * k, 10 * k, W - 20 * k, H - 20 * k);
    ctx.font = (16 * k) + 'px ' + font;
    var tw = ctx.measureText(cap).width + 44 * k, th = 28 * k, x = W / 2 - tw / 2, y = 22 * k;
    ctx.fillStyle = '#ff9fb8'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, tw, th, th / 2) : ctx.rect(x, y, tw, th); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(cap, W / 2, y + th / 2 + k);
  } else if (f === 'hearts') {
    ctx.fillStyle = '#ff9fbd';
    var step = 28 * k;
    for (var t = step / 2; t < W; t += step) { heart(ctx, t, 8 * k, 5 * k); heart(ctx, t, H - 8 * k, 5 * k); }
    for (var u = step / 2; u < H; u += step) { heart(ctx, 8 * k, u, 5 * k); heart(ctx, W - 8 * k, u, 5 * k); }
  }
}
/** A small heart. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r */
function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.9, y - r * 0.4, x - r * 0.9, y - r * 1.5, x, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.5, x + r * 1.9, y - r * 0.4, x, y + r * 0.9);
  ctx.fill();
}
/** Makes the whole picture. @returns {Promise<Blob>} A PNG. */
function makePhoto() {
  var rect = shootEl.getBoundingClientRect(), k = Math.min(2, window.devicePixelRatio || 1);
  var W = Math.round(rect.width * k), H = Math.round(rect.height * k);
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var ctx = cv.getContext('2d');
  var pr = shootPet.querySelector('svg').getBoundingClientRect(), pad = Math.max(pr.width, pr.height) * 0.4;
  return Promise.all([paintBackground(ctx, W, H), petImage(pad)]).then(function (res) {
    var s = shootPet.getBoundingClientRect();
    // the soft shadow under the pet
    ctx.save();
    ctx.filter = 'blur(' + 4 * k + 'px)';
    ctx.fillStyle = 'rgba(90,60,50,.16)';
    ctx.beginPath();
    ctx.ellipse((s.left - rect.left + s.width / 2) * k, (s.bottom - rect.top - 2) * k, s.width * 0.38 * k, 8 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(res[1], (pr.left - rect.left - pad) * k, (pr.top - rect.top - pad) * k, (pr.width + 2 * pad) * k, (pr.height + 2 * pad) * k);
    paintFrame(ctx, W, H, k);
    return new Promise(function (resolve, reject) { cv.toBlob(function (b) { if (b) resolve(b); else reject(new Error('blob')); }, 'image/png'); });
  });
}

var photoBlob = null, photoUrl = '';
/** Shows the finished picture with Share / Save / Retake. @param {Blob} blob */
function showPhoto(blob) {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoBlob = blob; photoUrl = URL.createObjectURL(blob);
  $('photoImg').src = photoUrl;
  var file = typeof File === 'function' ? new File([blob], photoName(), { type: 'image/png' }) : null;
  $('photoShare').hidden = !(file && navigator.canShare && navigator.canShare({ files: [file] }));
  $('photoResult').hidden = false;
}
/** @returns {string} A file name like nibble-2026-10-10.png (the pet's own name, safe for a file). */
function photoName() { return (petName().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pet') + '-' + new Date().toISOString().slice(0, 10) + '.png'; }
function closePhoto() { $('photoResult').hidden = true; }

$('shootSnap').addEventListener('click', function (e) {
  e.stopPropagation();
  var btn = $('shootSnap');
  if (btn.disabled) return;
  btn.disabled = true;
  var f = $('shootFlash');
  f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop');
  sound('shutter');
  makePhoto().then(showPhoto).catch(function () {
    camNote('I couldn’t make the picture on this phone. A screenshot still works.');
    setTimeout(function () { camNote(''); }, 3500);
  }).then(function () { btn.disabled = false; });
});
$('photoRetake').addEventListener('click', function () { sound('tap'); closePhoto(); });
$('photoSave').addEventListener('click', function () {
  if (!photoBlob) return;
  var a = document.createElement('a');
  a.href = photoUrl; a.download = photoName();
  document.body.appendChild(a); a.click(); a.remove();
  sound('pick');
});
$('photoShare').addEventListener('click', function () {
  if (!photoBlob) return;
  var file = new File([photoBlob], photoName(), { type: 'image/png' });
  navigator.share({ files: [file], title: petName() }).catch(function () { /* closed without sharing */ });
});
// leaving the photoshoot clears the picture
var photoWatcher = new MutationObserver(function () { if (shootEl.hidden) { closePhoto(); if (photoUrl) { URL.revokeObjectURL(photoUrl); photoUrl = ''; photoBlob = null; } } });
photoWatcher.observe(shootEl, { attributes: true, attributeFilter: ['hidden'] });
