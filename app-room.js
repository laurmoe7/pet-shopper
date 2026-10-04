// Room furniture behind the pet.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- room decor behind the pet ----------
var roomEl = $('room'), decorStrip = $('decorStrip'), stageEl = document.querySelector('.stage');

/**
 * @param {string} id
 * @returns {?Object} The decor item with this id.
 */
function decorItem(id) { return byId(Decor, id); }
/** Draws every placed decor item in the room, in the order decor.js lists them. */
function renderRoom() {
  roomEl.replaceChildren.apply(roomEl, Decor.filter(function (d) { return state.pet.room[d.id]; }).map(function (d) {
    var spot = state.pet.room[d.id];
    var el = document.createElement('div');
    el.className = 'decor decor-' + d.id;
    el.dataset.decor = d.id;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', d.label);
    el.style.width = d.w + 'px';
    el.style.height = d.h + 'px';
    el.style.left = (spot.x * 100) + '%';
    el.style.top = (spot.y * 100) + '%';
    el.appendChild(svgIcon(d.view, d.svg));
    return el;
  }));
  tickClocks();
  runClocks();
  decorStrip.querySelectorAll('button').forEach(function (b) {
    b.setAttribute('aria-pressed', state.pet.room[b.dataset.decor] ? 'true' : 'false');
  });
}
/** Sets every cuckoo clock's hands to the real time. */
function tickClocks() {
  var now = new Date(), h = now.getHours() % 12, m = now.getMinutes();
  document.querySelectorAll('.clock-hour').forEach(function (el) { el.setAttribute('transform', 'rotate(' + (h * 30 + m / 2) + ' 22 32)'); });
  document.querySelectorAll('.clock-minute').forEach(function (el) { el.setAttribute('transform', 'rotate(' + (m * 6) + ' 22 32)'); });
}
// the hands only need moving while a clock is in the room and the page is in view
var clockTimer = 0;
/** Starts or stops the clock tick to match the room and whether the page is showing. */
function runClocks() {
  var on = !!state.pet.room.clock && !document.hidden;
  if (on && !clockTimer) { tickClocks(); clockTimer = setInterval(tickClocks, 30000); }
  else if (!on && clockTimer) { clearInterval(clockTimer); clockTimer = 0; }
}
document.addEventListener('visibilitychange', runClocks);

Decor.forEach(function (d) {
  var b = document.createElement('button');
  b.type = 'button';
  b.dataset.decor = d.id;
  var icon = svgIcon(d.view, d.svg);
  var label = document.createElement('span');
  label.textContent = d.label;
  b.append(icon, label);
  decorStrip.appendChild(b);
});
decorStrip.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  var placed = L.toggleDecor(state.pet.room, decorItem(b.dataset.decor));
  save();
  renderRoom();
  sound(placed ? 'place' : 'remove');
  if (placed && !busy) { pulse('hop', 460); talk('room', ['so cozy!', 'home sweet home!', 'I love it here!'], 1500); }
});
// the room panel opens without covering the room: the stage stays visible (and draggable) above it
var roomSheet = $('roomSheet');
$('roomBtn').addEventListener('click', function () {
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  renderRoom();
  openDialog(roomSheet);
});

// drag placed decor around the room
var drag = null;
roomEl.addEventListener('pointerdown', function (e) {
  var el = e.target.closest('.decor');
  if (!el || e.button > 0) return;
  e.preventDefault();
  var r = el.getBoundingClientRect();
  drag = { el: el, id: el.dataset.decor, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) };
  el.classList.add('dragging');
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
roomEl.addEventListener('pointermove', function (e) {
  if (!drag) return;
  var s = stageEl.getBoundingClientRect();
  var x = (e.clientX - drag.dx - s.left) / s.width, y = (e.clientY - drag.dy - s.top) / s.height;
  L.moveDecor(state.pet.room, drag.id, x, y);
  var spot = state.pet.room[drag.id];
  drag.el.style.left = (spot.x * 100) + '%';
  drag.el.style.top = (spot.y * 100) + '%';
});
/** Ends a decor drag and saves where it landed. */
function endDrag() {
  if (!drag) return;
  drag.el.classList.remove('dragging');
  drag = null;
  save();
}
roomEl.addEventListener('pointerup', endDrag);
roomEl.addEventListener('pointercancel', endDrag);
renderRoom();
