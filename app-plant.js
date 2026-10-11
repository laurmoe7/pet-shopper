// The little plant (build 633): a plant in a pot with a face, in the room, on the to-do list only (build 635). Each task ticked off (up to three a day) gives it a drink and it grows a little
// (it gets a bit bigger with each; three drinks make a new stage); after seven stages it flowers, Fumu shows it off, and the next drink picks the flower and plants a new seed (each flower a
// different one: daisies, tulips, a sunflower, bluebells; PlantArt.FLOWERS). It never dies: it waits when days are missed (and droops a little after two). The waterings are counted in
// `pet.plant` (logic.js: plantInfo, waterPlant; it syncs). The plant is room furniture (drag it); it is put away with the ring menu's Plant button or the Room list, which is kept on this device.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

/** @returns {boolean} Whether this is the app (phone or the whole app on the desktop): the plant is not drawn in Mini Fumu, the small window (a reminder ticked off there still waters it). */
function plantApp() { return !document.documentElement.classList.contains('desktop-pet'); }
/** @returns {{stage: number, flowers: number, thirsty: boolean, bloom: boolean}} How the plant is now. */
function plantNow() { return L.plantInfo(state.pet.plant, L.dayNumber(giftDate())); }
/** Whether the plant was put away on this device (the ring menu's Plant button or the Room list); kept here, not in the synced room, so another device's older room cannot bring it back or take it away. @returns {boolean} */
function plantHidden() { try { return localStorage.getItem('nibble-plant-hidden') === '1'; } catch (e) { return false; } }
function plantSetHidden(on) { try { localStorage.setItem('nibble-plant-hidden', on ? '1' : ''); } catch (e) { /* storage not available */ } }
/** Puts the plant into the room when it is not hidden (a synced room that came from a device without a plant would otherwise lose it). Called by the room before it draws. */
function plantEnsure() {
  if (!plantApp() || state.pet.room.plant || plantHidden()) return;
  var d = decorItem('plant'); state.pet.room.plant = { x: d.x, y: d.y };
}
/** Draws the plant's picture again, for the stage it has reached (the room calls this after it draws). */
function plantRefresh() {
  var i = plantNow();
  [].forEach.call(document.querySelectorAll('.decor-plant'), function (el) {
    el.replaceChildren(svgIcon(PlantArt.VIEW, PlantArt.svg(i.stage, i.flowers, i.thirsty, i.progress)));
    el.setAttribute('aria-label', 'Little plant: ' + (i.bloom ? 'in flower' : 'growing'));
    el.classList.toggle('plant-bloom', i.bloom);
  });
}
/** A few drops of water fall onto the plant. @param {function} [done] Called when they have landed. */
function plantDrops(done) {
  var el = document.querySelector('.decor-plant'), r = el && el.getBoundingClientRect();
  if (!el || !r.width || reduceMotion) { if (done) done(); return; }   // (not drawn: in Mini Fumu, or on the shopping list)
  var layer = document.createElement('div');
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
/** Waters the plant: each task ticked off gives it a drink, up to three a day (called from `toggle`, in the app and from a reminder card in Mini Fumu; the plant counts even while it is hidden). */
function plantWater() {
  if (!isTodo()) return;
  var r = L.waterPlant(state.pet, L.dayNumber(giftDate()));
  if (!r.watered) { plantFull(); return; }
  save();
  plantDrops(function () {
    plantRefresh();
    if (!plantApp()) return;   // (Mini Fumu: it grew, and that is all)
    if (r.picked) showToast('🌷', T('You picked a flower! A new seed is in the pot.'), true, 4200);
    else if (r.bloomed) setTimeout(plantProud, 600);
  });
}
/** The plant has had its three drinks for today: Fumu says so once, so it does not look as if ticking did nothing (the app only, and only while the plant shows). */
function plantFull() {
  var el = document.querySelector('.decor-plant');
  if (!plantApp() || !el || !el.getBoundingClientRect().width || busy) return;
  var day = String(L.dayNumber(giftDate()));
  try { if (localStorage.getItem('nibble-plant-full') === day) return; localStorage.setItem('nibble-plant-full', day); } catch (e) { return; }
  say('my plant has had enough water for today ♡', 2800, true);
}
/** The flower is out: Fumu shows it off (waits a moment if he is busy with something else). */
function plantProud(tries) {
  if (!plantApp()) return;
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
// the plant is in the room unless it was put away (the room asks plantEnsure before it draws; this draws the room that is already up)
renderRoom();
/** The ring menu's Plant button: puts the plant away or brings it back (the same as taking it out of the room in the Room list; it keeps growing while it is away). */
function togglePlant() {
  var placed = L.toggleDecor(state.pet.room, decorItem('plant'));
  plantSetHidden(!placed);
  save(); renderRoom();
  sound(placed ? 'place' : 'remove');
  say(placed ? 'my plant is back!' : 'plant put away for now', 1500, true);
}
/** Developer tool: waters the plant three times now, whatever the day (so every stage can be seen). @returns {string} */
function devPlantGrow() {
  plantSetHidden(false); plantEnsure(); renderRoom();
  var p = state.pet.plant, was = plantNow().stage;
  p.water += L.PLANT_WATERINGS; p.last = Math.max(p.last, L.dayNumber(giftDate()) * 10 + 1);
  save();
  var i = plantNow();
  plantDrops(function () { plantRefresh(); if (i.stage === L.PLANT_STAGES - 1) plantProud(); else if (i.stage === 0 && was !== 0) showToast('🌷', T('You picked a flower! A new seed is in the pot.'), true, 4200); });
  return 'Stage ' + i.stage + ' of ' + (L.PLANT_STAGES - 1) + ' (' + i.flowers + ' flowers).';
}
/** Developer tool: a new seed, with no flowers grown. @returns {string} */
function devPlantReset() { state.pet.plant = { water: 0, last: 0 }; save(); plantRefresh(); return 'A new seed.'; }
