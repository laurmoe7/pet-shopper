// The little plant (build 633): a plant in a pot with a face, in the room. The first thing ticked off each day (either list) waters it and it grows one stage; after seven
// watered days it flowers, Fumu shows it off, and the next watering picks the flower and plants a new seed (each flower a different colour). It never dies: it waits when a day
// is missed (and droops a little after two). The days are counted in `pet.plant` (logic.js: plantInfo, waterPlant; it syncs). The picture is PlantArt in decor.js; the plant is
// room furniture like the rest (drag it, or take it out of the room in the Room list and it stops growing).
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

/** @returns {{stage: number, flowers: number, thirsty: boolean, bloom: boolean}} How the plant is now. */
function plantNow() { return L.plantInfo(state.pet.plant, L.dayNumber(giftDate())); }
/** Draws the plant's picture again, for the stage it has reached (the room calls this after it draws). */
function plantRefresh() {
  var i = plantNow();
  [].forEach.call(document.querySelectorAll('.decor-plant'), function (el) {
    el.replaceChildren(svgIcon(PlantArt.VIEW, PlantArt.svg(i.stage, i.flowers, i.thirsty)));
    el.setAttribute('aria-label', 'Little plant: ' + (i.bloom ? 'in flower' : 'growing'));
    el.classList.toggle('plant-bloom', i.bloom);
  });
}
/** A few drops of water fall onto the plant. @param {function} [done] Called when they have landed. */
function plantDrops(done) {
  var el = document.querySelector('.decor-plant');
  if (!el || reduceMotion) { if (done) done(); return; }
  var r = el.getBoundingClientRect(), layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40';
  document.body.appendChild(layer);
  for (var k = 0; k < 4; k++) {
    var d = document.createElement('i');
    d.style.cssText = 'position:absolute;left:' + (r.left + r.width * (0.3 + k * 0.13)) + 'px;top:' + (r.top - 30) + 'px;width:7px;height:10px;border-radius:50% 50% 50% 50% / 62% 62% 38% 38%;background:#7ec8f5;box-shadow:inset -1px -1px 0 #4aa3df,0 0 0 1.4px #fff';
    layer.appendChild(d);
    d.animate([{ transform: 'translateY(-14px) scale(.6)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.25 }, { transform: 'translateY(' + (r.height * 0.45) + 'px) scale(.9)', opacity: 1, offset: 0.85 }, { transform: 'translateY(' + (r.height * 0.5) + 'px) scale(.3)', opacity: 0 }], { duration: 650, delay: k * 140, easing: 'ease-in', fill: 'both' });
    setTimeout(function () { sound('tink'); }, 600 + k * 140);
  }
  setTimeout(function () {
    layer.remove();
    var svg = el.firstChild;
    if (svg) svg.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,.92)', offset: 0.3 }, { transform: 'scale(.96,1.07)', offset: 0.65 }, { transform: 'scale(1,1)' }], { duration: 520, easing: 'ease-out' });
    if (done) done();
  }, 1250);
}
/** Waters the plant if today's drink is still due (called when something is ticked off). */
function plantWater() {
  if (!state.pet.room.plant) return;   // taken out of the room: it waits
  var r = L.waterPlant(state.pet, L.dayNumber(giftDate()));
  if (!r.watered) return;
  save();
  plantDrops(function () {
    plantRefresh();
    if (r.picked) showToast('🌷', T('You picked a flower! A new seed is in the pot.'), true, 4200);
    else if (r.bloomed) setTimeout(plantProud, 600);
  });
}
/** The flower is out: Fumu shows it off (waits a moment if he is busy with something else). */
function plantProud(tries) {
  if (busy || document.querySelector('dialog[open]')) { if ((tries | 0) < 10) setTimeout(function () { plantProud((tries | 0) + 1); }, 3500); return; }
  sound('sparkle');
  setFace({ eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['cheeks', 'sparkles'] });
  pulse('hop', 500);
  say(pick(['look, it bloomed!', 'my plant is in flower!', 'so pretty! ♡']), 3200, true);
  var el = document.querySelector('.decor-plant'), r = el && el.getBoundingClientRect();
  drift(['🌷', '✦', '♥'], r ? { x: r.left + r.width / 2, y: r.top } : petTop(), 4);
  showToast('🌷', T('Your plant is in flower!'), true, 4200);
  setTimeout(function () { if (!busy) settle(); }, 3400);
}
/** Tapping the plant: it wiggles and Fumu says how it is. */
function plantTap() {
  var i = plantNow(), el = document.querySelector('.decor-plant'), svg = el && el.firstChild;
  sound('squeak');
  if (svg && !reduceMotion) svg.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: 480, easing: 'ease-out' });
  var line = i.bloom ? pick(['it is in flower! ♡', 'look how pretty~']) : i.thirsty ? pick(['it looks thirsty… tick something off!', 'my plant wants a drink']) : i.stage === 0 ? 'just a seed… tick something off to water it' : pick(['it is growing~', 'a little bigger every day']);
  if (i.flowers) line += ' (' + i.flowers + (i.flowers === 1 ? ' flower' : ' flowers') + ' so far)';
  if (!busy) say(line, 3200, true);
}
// a tap (not a drag) on the plant; dragging moves it like the other furniture (app-room.js)
var plantDown = null;
roomEl.addEventListener('pointerdown', function (e) { plantDown = e.target.closest('.decor-plant') ? { x: e.clientX, y: e.clientY } : null; });
roomEl.addEventListener('pointerup', function (e) {
  if (plantDown && Math.hypot(e.clientX - plantDown.x, e.clientY - plantDown.y) < 6) plantTap();
  plantDown = null;
});
// the first time the feature is there, the plant goes into the room (take it out in the Room list if it is not wanted)
try {
  if (!localStorage.getItem('nibble-plant-placed')) {
    localStorage.setItem('nibble-plant-placed', '1');
    if (!state.pet.room.plant) { var plantItem = decorItem('plant'); state.pet.room.plant = { x: plantItem.x, y: plantItem.y }; save(); renderRoom(); }
  }
} catch (e) { /* storage not available */ }
plantRefresh();
/** Developer tool: waters the plant now, whatever the day (so every stage can be seen). @returns {string} */
function devPlantGrow() {
  if (!state.pet.room.plant) { state.pet.room.plant = { x: 0.13, y: 0.8 }; renderRoom(); }
  var p = state.pet.plant, today = L.dayNumber(giftDate());
  p.days += 1; p.last = today;
  save();
  var stage = p.days % L.PLANT_STAGES;
  plantDrops(function () { plantRefresh(); if (stage === L.PLANT_STAGES - 1) plantProud(); else if (stage === 0) showToast('🌷', T('You picked a flower! A new seed is in the pot.'), true, 4200); });
  return 'Stage ' + stage + ' of ' + (L.PLANT_STAGES - 1) + ' (' + Math.floor(p.days / L.PLANT_STAGES) + ' flowers).';
}
/** Developer tool: a new seed, with no flowers grown. @returns {string} */
function devPlantReset() { state.pet.plant = { days: 0, last: 0 }; save(); plantRefresh(); return 'A new seed.'; }
