// Weather (build 633): Fumu reacts to the weather outside. It is off until the player turns it on in Options and gives a place (a typed city, or this device's position, rounded
// to about 10 km: that and nothing else is sent, to open-meteo.com). Then: rain and storms bring a giant leaf held over his head in his spare hand and falling drops (storms also thunderbolts), snow and cold bring a
// shiver now and then and a puff of breath (no scarf), hot weather a paper fan in his spare hand (he waves it) and slow heat waves. He says one line about it a day. What each kind
// is, and how the answer is read, is weather.js. The setting lives on this device only (`nibble-weather`); Mini Fumu and the whole app share it through the same storage.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var WX_KEY = 'nibble-weather', WX_LAST = 'nibble-weather-last', WX_EVERY = 30 * 60 * 1000;
var wxShown = '', wxDev = '', wxFx = null, wxTimers = [], wxTimer = 0;
/** @returns {{on: boolean, lat: ?number, lon: ?number, place: string}} What the player chose (nothing is sent while it is off). */
function wxConf() {
  try { var c = JSON.parse(localStorage.getItem(WX_KEY) || '{}'); return { on: !!c.on && isFinite(+c.lat) && isFinite(+c.lon), lat: isFinite(+c.lat) ? +c.lat : null, lon: isFinite(+c.lon) ? +c.lon : null, place: String(c.place || '').slice(0, 60), want: !!c.on }; } catch (e) { return { on: false, lat: null, lon: null, place: '', want: false }; }
}
function wxSave(c) {
  var v = { on: !!c.want, lat: c.lat, lon: c.lon, place: c.place };
  try { localStorage.setItem(WX_KEY, JSON.stringify(v)); } catch (e) { /* storage not available */ }
  if (window.nibbleDesktop && window.nibbleDesktop.setWeather) window.nibbleDesktop.setWeather(v);   // (the Windows app keeps it too, for Mini Fumu's settings)
}
/**
 * The Windows app's copy of the weather setting (Mini Fumu's settings change it there): the page takes it over, or hands over what Options already had when the shell has none yet.
 * @param {?{on: boolean, lat: ?number, lon: ?number, place: string}} w
 */
function wxFromShell(w) {
  var D = window.nibbleDesktop, c = wxConf();
  if (!w) { if (c.want && D && D.setWeather) D.setWeather({ on: true, lat: c.lat, lon: c.lon, place: c.place }); return; }
  if (w.on === c.want && w.lat === c.lat && w.lon === c.lon && w.place === c.place) return;
  try { localStorage.setItem(WX_KEY, JSON.stringify({ on: !!w.on, lat: w.lat, lon: w.lon, place: w.place })); } catch (e) { /* storage not available */ }
  wxShown = '';
  wxFetch(true);
  if (typeof wxStatus === 'function') wxStatus();
  if (typeof wxFill === 'function' && $('wxOn')) wxFill();
}
/** @returns {?{kind: string, temp: number, feels: number, at: number}} The last weather that was fetched. */
function wxLast() { try { return JSON.parse(localStorage.getItem(WX_LAST) || 'null'); } catch (e) { return null; } }

/** @returns {number} Half the width of the rain leaf at x along it (-54 the base, 54 the tip). */
function wxLeafW(x) { var u = x / 54; return u <= -1 || u >= 1 ? 0 : 20 * Math.pow(1 - u, 0.9) * Math.pow(1 + u, 0.5); }
/** @returns {string} The place on the leaf where a drop lands now (a random spot over the whole leaf, not near the edge), as a transform. */
function wxSplashSpot() {
  var x = -40 + Math.random() * 80, y = (Math.random() * 2 - 1) * wxLeafW(x) * 0.7;
  return 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(12) scale(.7)';
}
/**
 * The rain leaf, drawn flat along the x axis (base at the left, pointed tip at the right, about 108 x 48). The outline, the shaded lower half, the veins and the drops are all
 * worked out from one width function `w(x)`, so every vein ends inside the leaf and nothing clips through its edge.
 * @param {string} fill @param {string} light vein and shine colour @param {string} dark shade for the lower half
 * @returns {string} SVG markup
 */
function wxLeaf(fill, light, dark, storm) {
  var w = wxLeafW;
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
  var splash = '', n;   // raindrops hitting the leaf: a little crown of droplets pops up, standing up straight whatever the tilt of the leaf; wxSplashMove puts each one somewhere new every time
  for (n = 0; n < (storm ? 4 : 2); n++) {
    splash += '<g class="wx-spot" transform="' + wxSplashSpot() + '"><g class="wx-splash" style="animation-delay:-' + (Math.random() * 1.6).toFixed(2) + 's;animation-duration:' + ((storm ? 0.8 : 1.4) + Math.random() * 0.9).toFixed(2) + 's">' +
      '<path d="M-2 0 Q-5 -4 -8 -4 M2 0 Q5 -4 8 -4 M0 -1 V-7" fill="none" stroke="#e8f7ff" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="-8.5" cy="-5.4" r="1.4" fill="#e8f7ff"/><circle cx="8.5" cy="-5.4" r="1.4" fill="#e8f7ff"/><circle cx="0" cy="-8.6" r="1.5" fill="#e8f7ff"/></g></g>';
  }
  return '<path d="' + outline + '" fill="' + fill + '" stroke="#5b4239" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="' + shade + '" fill="' + dark + '" opacity=".38"/>' +
    '<path d="' + veins + '" fill="none" stroke="' + light + '" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M-48 0 L47 0" stroke="' + light + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M-16.4 -9 a2.4 1.8 0 1 0 4.8 0 a2.4 1.8 0 1 0 -4.8 0z" fill="#d9f1ff" stroke="#6fbff0" stroke-width=".8"/><circle cx="-14.8" cy="-9.6" r=".7" fill="#fff"/>' +
    '<path d="M19.8 6.5 a2.2 1.6 0 1 0 4.4 0 a2.2 1.6 0 1 0 -4.4 0z" fill="#d9f1ff" stroke="#6fbff0" stroke-width=".8"/><circle cx="21.3" cy="6" r=".6" fill="#fff"/>' +
    '<path d="M54 1.5 q-2.6 4.6 0 6.4 q2.6 -1.8 0 -6.4z" fill="#bfe6ff" stroke="#6fbff0" stroke-width=".9" stroke-linejoin="round"/>' + splash;   // (a drop hanging off the tip)
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
    var leafG = group(armR, null, 'wx-leaf', '<g transform="rotate(-10 133 110.2)"><g class="wx-bob"><path d="M133 128 C135 92 118 62 87 27" fill="none" stroke="#5b4239" stroke-width="4.4" stroke-linecap="round"/><path d="M133 128 C135 92 118 62 87 27" fill="none" stroke="#7fb36b" stroke-width="2.2" stroke-linecap="round"/>' +
      '<g transform="translate(104 8) rotate(-12) scale(1.5)">' + wxLeaf(lf[0], lf[1], lf[2], kind === 'storm') + '</g></g></g>');
    leafG.addEventListener('animationiteration', function (e) { var t = e.target; if (t && t.classList && t.classList.contains('wx-splash')) t.parentNode.setAttribute('transform', wxSplashSpot()); });   // each drop lands somewhere new
  }
  if (kind === 'hot' && armR) {   // a paper fan in the spare right hand: the handle is in his paw and the arm waves it (styles.css, wx-fanning)
    var ribs = '', r;
    for (r = 0; r < 7; r++) { var an = (-62 + r * 20.7) * Math.PI / 180; ribs += 'M133 143 L' + (133 + Math.sin(an) * 22).toFixed(1) + ' ' + (143 + Math.cos(an) * 22).toFixed(1); }
    group(armR, null, 'wx-fan', '<path d="M133 121 V144" fill="none" stroke="#5b4239" stroke-width="4.6" stroke-linecap="round"/><path d="M133 121 V144" fill="none" stroke="#c9a27a" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M133 143 L110.6 153.4 Q133 176 155.4 153.4 Z" fill="#ffb3c9" ' + ink + '/><path d="' + ribs + '" fill="none" stroke="#fff6ec" stroke-width="1.4" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M114 156 Q133 172 152 156" fill="none" stroke="#ff8fb0" stroke-width="2" stroke-linecap="round" opacity=".7"/>');
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
  } else if (kind === 'hot') {   // short, faint heat wisps rising from the floor, each at its own place and pace (and somewhere new every time it starts again)
    var spot = function (h) { h.style.left = (2 + Math.random() * 68).toFixed(0) + '%'; h.style.bottom = (4 + Math.random() * 30).toFixed(0) + '%'; };
    for (i = 0; i < 7; i++) {
      var hw = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      hw.setAttribute('viewBox', '0 0 30 14'); hw.setAttribute('preserveAspectRatio', 'none'); hw.setAttribute('class', 'wx-heat');
      hw.style.width = (16 + Math.random() * 14).toFixed(0) + '%';
      hw.style.animationDelay = '-' + (Math.random() * 5).toFixed(1) + 's';
      hw.style.animationDuration = (4.2 + Math.random() * 2.6).toFixed(1) + 's';
      spot(hw);
      hw.addEventListener('animationiteration', function (e) { spot(e.currentTarget); });
      hw.innerHTML = '<path d="M0 7 Q3.75 0 7.5 7 T15 7 T22.5 7 T30 7" fill="none" stroke="#ff9a5c" stroke-width="1.6" stroke-linecap="round"/>';
      el.appendChild(hw);
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
  if (quiet || kind === 'clear') return;
  var day = B.dayKey(giftDate()), said = '';
  try { said = localStorage.getItem('nibble-wx-said') || ''; } catch (e) { /* storage not available */ }
  if (said === day + kind) return;
  setTimeout(function () {
    if (wxShown !== kind || busy || Date.now() < remarkUntil || document.hidden || stage.classList.contains('bedtime')) return;
    try { localStorage.setItem('nibble-wx-said', day + kind); } catch (e) { /* storage not available */ }
    say(pick(Weather.KINDS[kind].lines), 3600, true, true);
  }, 6000);
}
/** @returns {string} What he says about special weather coming later today, with about when it starts ("rain around 3:00 PM, take an umbrella~"). @param {{kind: string, hour: number}} later */
function wxLaterLine(later) {
  var at = typeof fmtTime === 'function' ? fmtTime((later.hour < 10 ? '0' : '') + later.hour + ':00') : '';
  return Weather.laterWords(later, typeof Lang === 'object' && Lang.get() === 'nl', at);
}
/** If special weather is coming later today (rain, a storm, snow, heat or cold), he says so: once a day for each kind. @param {{kind: string, later: ?{kind: string, hour: number}}} w */
function wxLater(w) {
  if (!w || !w.later || wxDev) return;
  var day = B.dayKey(giftDate()), key = day + w.later.kind, said = '';
  try { said = localStorage.getItem('nibble-wx-later') || ''; } catch (e) { /* storage not available */ }
  if (said === key) return;
  setTimeout(function () {
    if (busy || Date.now() < remarkUntil || document.hidden || baseState() === 'sleepy' || stage.classList.contains('bedtime') || document.querySelector('dialog[open], .inbox-card')) return;
    try { localStorage.setItem('nibble-wx-later', key); } catch (e) { /* storage not available */ }
    say(wxLaterLine(w.later), 4200, true, true);
    pulse('hopsmall', 450);
  }, 12000);
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
    wxLater(w);
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
