// Weather (build 633): Fumu reacts to the weather outside. It is off until the player turns it on in Options and gives a place (a typed city, or this device's position, rounded
// to about 10 km: that and nothing else is sent, to open-meteo.com). Then: rain and storms bring an umbrella over his head and falling drops, snow brings snowflakes and a
// scarf, cold weather a scarf, a shiver now and then and a puff of breath, hot weather a paper fan, a sweat drop and a sun. He says one line about it a day. What each kind
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

/** The accessories drawn in his picture (they sit beside the worn things, so dressing him does not wipe them). */
function wxDraw(kind) {
  var oldAcc = pet.querySelectorAll('.wx-acc'); [].forEach.call(oldAcc, function (g) { g.remove(); });
  if (!kind || kind === 'clear') return;
  var NS = 'http://www.w3.org/2000/svg', hatSlot = pet.querySelector('.outfit-hat'), hatLayer = hatSlot && hatSlot.parentNode, over = pet.querySelector('.outfit-neck-over');
  function group(parent, after, cls, html) { var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'wx-acc ' + cls); g.innerHTML = html; if (after && after.nextSibling) parent.insertBefore(g, after.nextSibling); else parent.appendChild(g); return g; }
  var ink = 'stroke="#5b4239" stroke-width="2" stroke-linejoin="round"';
  if ((kind === 'rain' || kind === 'storm') && hatLayer) {
    var dark = kind === 'storm';
    group(hatLayer, null, 'wx-umbrella', '<g class="wx-bob"><path d="M80 17 V36 q0 4 -4 4" fill="none" stroke="#5b4239" stroke-width="3" stroke-linecap="round"/><path d="M80 17 V36 q0 4 -4 4" fill="none" stroke="#c9a27a" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M48 18 Q50 -6 80 -7 Q110 -6 112 18 Q104 12 96 18 Q88 12 80 18 Q72 12 64 18 Q56 12 48 18 Z" fill="' + (dark ? '#8f9bc2' : '#8fd3ff') + '" ' + ink + '/>' +
      '<path d="M80 -7 Q68 2 64 18 M80 -7 Q92 2 96 18" fill="none" stroke="#fffaf4" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><path d="M60 3 Q66 -2 72 -4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/><circle cx="80" cy="-8" r="2.2" fill="#ffd36b" stroke="#5b4239" stroke-width="1.4"/></g>');
  }
  if ((kind === 'cold' || kind === 'snow') && over && !/scarf/.test((state.pet.outfit && state.pet.outfit.neck) || '')) {
    var item = Wardrobe.filter(function (w) { return w.id === 'scarf'; })[0];   // (the winter scarf from the dressing room)
    if (item) group(over.parentNode, over, 'wx-scarf', item.svg);
  }
  if (kind === 'hot' && over) {
    group(over.parentNode, over, 'wx-fan', '<g transform="translate(126 112) scale(1.4) translate(-126 -112)"><g class="wx-wave" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M126 112 L136 86" stroke="#5b4239" stroke-width="4" stroke-linecap="round"/><path d="M126 112 L136 86" stroke="#c9a27a" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M114 88 Q135 68 156 88 Q135 96 114 88 Z" fill="#ffb3c9" ' + ink + '/><path d="M135 70 V92 M124 74 L128 91 M146 74 L142 91" stroke="#fff6ec" stroke-width="1.6" stroke-linecap="round" opacity=".9"/></g></g>' +
      '<g class="wx-sweat"><path d="M114 46 q-4 7 0 9 q4 -2 0 -9z" fill="#8fd3ff" stroke="#5b4239" stroke-width="1.2" stroke-linejoin="round"/></g>');
  }
}
/** Falling drops or flakes over the stage, or a sun, drawn in plain CSS shapes. @param {string} kind */
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
  } else if (kind === 'hot') {
    el.innerHTML = '<svg viewBox="0 0 60 60" class="wx-sun"><g class="wx-rays" stroke="#ffb43a" stroke-width="3" stroke-linecap="round">' + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return '<path d="M30 6 V13" transform="rotate(' + a + ' 30 30)"/>'; }).join('') + '</g><circle cx="30" cy="30" r="12" fill="#ffe27a" stroke="#5b4239" stroke-width="2"/><path d="M25 28 q1.6 -1.6 3.2 0 M33 28 q1.6 -1.6 3.2 0 M27 34 q3 2.6 6 0" fill="none" stroke="#5b4239" stroke-width="1.4" stroke-linecap="round"/></svg>';
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
