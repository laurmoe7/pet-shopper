// Weather (build 633): Fumu reacts to the weather outside. It is off until the player turns it on in Options and gives a place (a typed city, or this device's position, rounded
// to about 10 km: that and nothing else is sent, to open-meteo.com). Then: rain and storms bring a giant leaf held over his head in his spare hand and falling drops (storms also thunderbolts), snow and cold bring a
// shiver now and then and a puff of breath (no scarf), hot weather nothing for now. He says one line about it a day. What each kind
// is, and how the answer is read, is weather.js. The setting lives on this device only (`nibble-weather`); Mini Fumu and the whole app share it through the same storage.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var WX_KEY = 'nibble-weather', WX_LAST = 'nibble-weather-last', WX_EVERY = 30 * 60 * 1000;
var wxShown = '', wxDev = '', wxFx = null, wxTimers = [], wxTimer = 0;
/** @returns {{on: boolean, lat: ?number, lon: ?number, place: string}} What the player chose (nothing is sent while it is off). */
function wxConf() {
  try { var c = JSON.parse(localStorage.getItem(WX_KEY) || '{}'); return { on: !!c.on && isFinite(+c.lat) && isFinite(+c.lon), lat: isFinite(+c.lat) ? +c.lat : null, lon: isFinite(+c.lon) ? +c.lon : null, place: String(c.place || '').slice(0, 60), want: !!c.on }; } catch (e) { return { on: false, lat: null, lon: null, place: '', want: false }; }
}
function wxSave(c) { try { localStorage.setItem(WX_KEY, JSON.stringify({ on: !!c.want, lat: c.lat, lon: c.lon, place: c.place })); } catch (e) { /* storage not available */ } }
/** @returns {?{kind: string, temp: number, feels: number, at: number}} The last weather that was fetched. */
function wxLast() { try { return JSON.parse(localStorage.getItem(WX_LAST) || 'null'); } catch (e) { return null; } }

/**
 * The rain leaf, drawn flat along the x axis (base at the left, pointed tip at the right, about 108 x 48). The outline, the shaded lower half, the veins and the drops are all
 * worked out from one width function `w(x)`, so every vein ends inside the leaf and nothing clips through its edge.
 * @param {string} fill @param {string} light vein and shine colour @param {string} dark shade for the lower half
 * @returns {string} SVG markup
 */
function wxLeaf(fill, light, dark) {
  var K = 20;
  function w(x) { var u = x / 54; return u <= -1 || u >= 1 ? 0 : K * Math.pow(1 - u, 0.9) * Math.pow(1 + u, 0.5); }
  function f(n) { return (Math.round(n * 10) / 10); }
  var up = [], dn = [], x;
  for (var t = 0; t <= 24; t++) { x = -54 + 108 * (1 - Math.cos(t * Math.PI / 24)) / 2; up.push(f(x) + ' ' + f(-w(x))); dn.unshift(f(x) + ' ' + f(w(x))); }
  var outline = 'M' + up.join(' L') + ' L54 0 L' + dn.join(' L') + ' Z';
  var shade = 'M-54 0 L' + dn.slice().reverse().join(' L') + ' L54 0 Z';   // (the lower half, a little darker)
  var veins = '', xs = [-40, -27, -14, -1, 12, 25, 37];
  xs.forEach(function (x0) {   // a pair of veins from the midrib, sweeping forward and ending short of the edge
    [-1, 1].forEach(function (sd) {
      var ex = x0 + 15, cx = x0 + 9, ey = sd * w(ex) * 0.72, cy = sd * w(cx) * 0.28;
      if (ex > 46) return;
      veins += 'M' + f(x0) + ' 0 Q' + f(cx) + ' ' + f(cy) + ' ' + f(ex) + ' ' + f(ey);
    });
  });
  return '<path d="' + outline + '" fill="' + fill + '" stroke="#5b4239" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="' + shade + '" fill="' + dark + '" opacity=".38"/>' +
    '<path d="' + veins + '" fill="none" stroke="' + light + '" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M-48 0 L47 0" stroke="' + light + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M-16.4 -9 a2.4 1.8 0 1 0 4.8 0 a2.4 1.8 0 1 0 -4.8 0z" fill="#d9f1ff" stroke="#6fbff0" stroke-width=".8"/><circle cx="-14.8" cy="-9.6" r=".7" fill="#fff"/>' +
    '<path d="M19.8 6.5 a2.2 1.6 0 1 0 4.4 0 a2.2 1.6 0 1 0 -4.4 0z" fill="#d9f1ff" stroke="#6fbff0" stroke-width=".8"/><circle cx="21.3" cy="6" r=".6" fill="#fff"/>' +
    '<path d="M54 1.5 q-2.6 4.6 0 6.4 q2.6 -1.8 0 -6.4z" fill="#bfe6ff" stroke="#6fbff0" stroke-width=".9" stroke-linejoin="round"/>';   // (a drop hanging off the tip)
}
/** The accessories drawn in his picture (they sit beside the worn things, so dressing him does not wipe them). */
function wxDraw(kind) {
  var oldAcc = pet.querySelectorAll('.wx-acc'); [].forEach.call(oldAcc, function (g) { g.remove(); });
  if (!kind || kind === 'clear') return;
  var NS = 'http://www.w3.org/2000/svg', armR = pet.querySelector('.arm-r');
  function group(parent, after, cls, html) { var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'wx-acc ' + cls); g.innerHTML = html; if (after && after.nextSibling) parent.insertBefore(g, after.nextSibling); else parent.appendChild(g); return g; }
  var ink = 'stroke="#5b4239" stroke-width="2" stroke-linejoin="round"';
  if ((kind === 'rain' || kind === 'storm') && armR) {   // a giant leaf in the spare right hand, held upright in front like a leaf umbrella (the stem stays straight up while the paw is at his side; styles.css shows it only while that hand is free)
    var lf = kind === 'storm' ? ['#5fae78', '#8fd3a4', '#4b9564'] : ['#7ccf8a', '#b5eebf', '#62b574'];
    group(armR, null, 'wx-leaf', '<g transform="rotate(-10 133 110.2)"><g class="wx-bob"><path d="M133 128 C135 92 118 62 87 27" fill="none" stroke="#5b4239" stroke-width="4.4" stroke-linecap="round"/><path d="M133 128 C135 92 118 62 87 27" fill="none" stroke="#7fb36b" stroke-width="2.2" stroke-linecap="round"/>' +
      '<g transform="translate(104 8) rotate(-12) scale(1.5)">' + wxLeaf(lf[0], lf[1], lf[2]) + '</g></g></g>');
  }
}
/** Falling drops or flakes over the stage, drawn in plain CSS shapes. @param {string} kind */
function wxParticles(kind) {
  if (wxFx) { wxFx.remove(); wxFx = null; }
  if (!kind || kind === 'clear') return;
  var el = document.createElement('div'), n = reduceMotion ? 6 : kind === 'storm' ? 26 : 16, i;
  el.className = 'wx-fx wx-' + kind;
  el.setAttribute('aria-hidden', 'true');
  if (kind === 'rain' || kind === 'storm' || kind === 'snow') {
    for (i = 0; i < n; i++) {
      var p = document.createElement('i');
      p.style.cssText = 'left:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:-' + (Math.random() * 3).toFixed(2) + 's;animation-duration:' + ((kind === 'snow' ? 3.2 : kind === 'storm' ? 0.6 : 0.9) + Math.random() * (kind === 'snow' ? 2.2 : 0.4)).toFixed(2) + 's' + (kind === 'snow' ? ';--s:' + (3 + Math.random() * 4).toFixed(1) + 'px' : '');
      el.appendChild(p);
    }
    if (kind === 'storm') for (i = 0; i < 3; i++) {   // thunderbolts: a bolt fades in and out now and then (soft, never a full-screen flash)
      var b = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      b.setAttribute('viewBox', '0 0 24 48'); b.setAttribute('class', 'wx-bolt');
      b.style.cssText = 'left:' + (6 + i * 34 + Math.random() * 14).toFixed(0) + '%;animation-delay:' + (i * 1.7 + Math.random()).toFixed(2) + 's;animation-duration:' + (5 + i * 1.3).toFixed(1) + 's';
      b.innerHTML = '<path d="M15 2 L4 26 H12 L8 46 L21 18 H13 Z" fill="#ffe66b" stroke="#fff6c2" stroke-width="1.6" stroke-linejoin="round"/>';
      el.appendChild(b);
    }
  } else if (kind === 'cold') {
    for (i = 0; i < 7; i++) { var c = document.createElement('i'); c.style.cssText = 'left:' + (8 + i * 13) + '%;top:' + (12 + (i * 37) % 60) + '%;animation-delay:-' + (i * 0.5).toFixed(1) + 's'; el.appendChild(c); }
  }
  stage.appendChild(el);
  wxFx = el;
}
/**
 * Puts the weather on: the picture, the falling things and his habits (a shiver when cold, a line about it once a day).
 * @param {string} kind clear, rain, storm, snow, cold or hot
 * @param {boolean} [quiet] No line (the weather did not change, only the picture is drawn again).
 */
function wxSet(kind, quiet) {
  kind = Weather.KINDS[kind] ? kind : 'clear';
  if (kind === wxShown && !quiet) return;
  wxShown = kind;
  wxTimers.forEach(clearInterval); wxTimers = [];
  stage.dataset.wx = kind === 'clear' ? '' : kind;
  if (kind === 'clear') delete stage.dataset.wx;
  wxDraw(kind);
  wxParticles(kind);
  if (kind === 'cold' || kind === 'snow') wxTimers.push(setInterval(function () { if (!busy && !document.hidden && baseState() !== 'sleepy' && !stage.classList.contains('bedtime')) { pulse('shiver', 700); if (typeof drift === 'function' && Math.random() < 0.5) drift(['💨'], mouthPoint(), 1); } }, 22000));
  if (quiet || kind === 'clear' || kind === 'hot') return;
  var day = B.dayKey(giftDate()), said = '';
  try { said = localStorage.getItem('nibble-wx-said') || ''; } catch (e) { /* storage not available */ }
  if (said === day + kind) return;
  setTimeout(function () {
    if (wxShown !== kind || busy || document.hidden || stage.classList.contains('bedtime')) return;
    try { localStorage.setItem('nibble-wx-said', day + kind); } catch (e) { /* storage not available */ }
    say(pick(Weather.KINDS[kind].lines), 3600, true);
  }, 6000);
}
/** Asks for the weather now (when it is on and there is a place) and puts it on. @param {boolean} [force] */
function wxFetch(force) {
  clearTimeout(wxTimer);
  wxTimer = setTimeout(function () { wxFetch(false); }, WX_EVERY);
  if (wxDev) return;
  var c = wxConf();
  if (!c.on) { wxSet('clear'); return; }
  var last = wxLast();
  if (!force && last && Date.now() - last.at < WX_EVERY / 2) { wxSet(last.kind); return; }
  if (!navigator.onLine) { if (last) wxSet(last.kind); return; }
  var ctl = typeof AbortController === 'function' ? new AbortController() : null, kill = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
  fetch(Weather.forecastUrl(c.lat, c.lon), ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    clearTimeout(kill);
    var w = Weather.parse(j);
    if (!w) { if (last) wxSet(last.kind); return; }
    w.at = Date.now();
    try { localStorage.setItem(WX_LAST, JSON.stringify(w)); } catch (e) { /* storage not available */ }
    if (!wxDev) wxSet(w.kind);
    if (typeof wxStatus === 'function') wxStatus();
  }).catch(function () { clearTimeout(kill); if (last && !wxDev) wxSet(last.kind); });
}
/** Developer tool: pretends the weather is each kind in turn, then goes back to the real one. @returns {string} */
function devWeatherNext() {
  var order = [''].concat(Weather.ORDER.filter(function (k) { return k !== 'clear'; })), at = order.indexOf(wxDev);
  wxDev = order[(at + 1) % order.length];
  if (wxDev) { wxSet(wxDev); return 'Pretending: ' + Weather.KINDS[wxDev].label + '.'; }
  wxShown = ''; wxFetch(false);
  return 'The real weather again.';
}
/** Plays one kind for the animation player (clear puts the real weather back). @param {string} kind */
function wxPlay(kind) {
  if (kind === 'real') { wxDev = ''; wxShown = ''; wxFetch(false); return 4000; }
  wxDev = kind; wxSet(kind); return 6000;
}
// the setting may be changed in the other window (Mini Fumu and the whole app share the storage), and the weather is looked at again when the page comes back into view
window.addEventListener('storage', function (e) { if (e.key === WX_KEY) wxFetch(true); });
document.addEventListener('visibilitychange', function () { if (!document.hidden) { var l = wxLast(); if (!l || Date.now() - l.at > WX_EVERY) wxFetch(false); } });
setTimeout(function () { wxFetch(false); }, 2500);
