// Backgrounds behind the pet: a picture drawn behind the stage, picked in Options, with a night version.
// The pictures themselves (BACKDROPS and the bd* helpers) are in backdrops.js.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var backdropEl = document.createElement('div');
backdropEl.className = 'backdrop';
backdropEl.setAttribute('aria-hidden', 'true');
$('room').before(backdropEl);
var backdropNight = null;
/**
 * Draws a background behind the pet, in its night version from 10 pm to 7 am.
 * @param {string} id One of BACKDROPS.
 */
function applyBackdrop(id) {
  var bd = BACKDROPS.filter(function (b) { return b.id === id; })[0] || BACKDROPS[0];
  backdropNight = L.isNight(petNow());
  backdropEl.hidden = !bd.draw;
  backdropEl.dataset.bd = bd.id;
  backdropEl.classList.toggle('bd-dark', !!bd.draw && (backdropNight || bd.night === false));
  backdropEl.innerHTML = bd.draw ? '<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice">' + bd.draw(backdropNight) + '</svg>' : '';
}
/** Redraws the background if day turned to night or back (also used by the dev day/night switch). */
function refreshBackdrop() {
  if (L.isNight(petNow()) !== backdropNight) applyBackdrop(backdropEl.dataset.bd);
}
setInterval(refreshBackdrop, 60000);
// Kept on this device only, like Appearance.
var savedBackdrop = 'none';
try { savedBackdrop = localStorage.getItem('nibble-backdrop') || 'none'; } catch (e) { /* storage not available */ }
applyBackdrop(savedBackdrop);

// the picker lives in the Room sheet (under the furniture), not in Options
var backdropRow = document.createElement('div');
backdropRow.className = 'room-bg';
backdropRow.innerHTML = '<span class="option-title room-bg-title">Background</span>';
var backdropBtns = document.createElement('span');
backdropBtns.className = 'theme-btns';
BACKDROPS.forEach(function (bd) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'pill-btn'; b.textContent = bd.name;
  b.setAttribute('aria-pressed', String(bd.id === backdropEl.dataset.bd));
  b.addEventListener('click', function () {
    applyBackdrop(bd.id);
    try { localStorage.setItem('nibble-backdrop', bd.id); } catch (e) { /* storage not available */ }
    backdropBtns.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    sound('pick');
  });
  backdropBtns.appendChild(b);
});
backdropRow.appendChild(backdropBtns);
$('roomSheet').querySelector('form').appendChild(backdropRow);
