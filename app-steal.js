// The sneaky snack: every now and then, in the app, Fumu tiptoes up, steals one of the emojis off the shopping list and cheekily eats it. The item stays on
// the list, only its picture is gone, until you poke him: then he is embarrassed and spits it back out. It lasts only while the app is open (a
// reload brings every picture back), takes nothing from the list, and does not happen in the small desktop window (it has no list).
// Plain script, shares one scope, loaded after app-wreck.js.
'use strict';

var STEAL_MIN_MS = 4 * 60000, STEAL_MAX_MS = 9 * 60000;
var stolen = null;   // the emoji he has: { id, src, phase: 'sneak' | 'eaten' | 'spit' }
var stealTimer = 0, guiltTimer = 0;

/** @returns {HTMLElement[]} The list rows (still to buy) whose emoji is on show right now. */
function stealable() {
  return [].slice.call(document.querySelectorAll('#todo .item:not(.done)')).filter(function (li) {
    var img = li.querySelector('.emoji-btn img');
    if (!img) return false;
    var r = img.getBoundingClientRect();
    return r.width > 4 && r.bottom > 0 && r.top < window.innerHeight && !li.classList.contains('stolen');
  });
}
/** @returns {boolean} Whether he may sneak a snack now by himself: the shopping list in the app, awake, nothing else going on. */
function stealOk() {
  return !document.hidden && !busy && !playing && !stolen && !isTodo() && !document.documentElement.classList.contains('desktop-pet') &&
    !stage.classList.contains('bedtime') && baseState() !== 'sleepy' && !document.querySelector('dialog[open]') && stealable().length > 0;
}
function stealMouth() { var r = pet.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 }; }

/** An emoji flies in an arc: a copy of its picture goes from one place to another. @returns {Promise<void>} Resolves when it has arrived (the copy is gone). */
function flyEmoji(src, from, to, ms, rise, shrink) {
  return new Promise(function (resolve) {
    if (reduceMotion) { resolve(); return; }
    var el = document.createElement('img'), s = from.size || 28;
    el.src = src; el.alt = '';
    el.style.cssText = 'position:fixed;left:0;top:0;width:' + s + 'px;height:' + s + 'px;z-index:9000;pointer-events:none;will-change:transform;';
    document.body.appendChild(el);
    var k = shrink ? 0.5 : 1, k0 = shrink ? 1 : 0.5;
    function at(p, sc) { return 'translate(' + (p.x - s / 2).toFixed(1) + 'px,' + (p.y - s / 2).toFixed(1) + 'px) scale(' + sc + ')'; }
    var mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - rise };
    el.animate([{ transform: at(from, k0 === 0.5 ? 1 : 1) }, { transform: at(mid, 1.15), offset: .5 }, { transform: at(to, k) }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' }).onfinish = function () { el.remove(); resolve(); };
  });
}
/** Hides or shows the stolen emoji's picture on its row (the list is drawn again now and then: it is put back on every time). */
function applyStolen() {
  document.querySelectorAll('#todo .item.stolen').forEach(function (li) { if (!stolen || li.dataset.id !== stolen.id) li.classList.remove('stolen'); });
  if (!stolen) return;
  var li = document.querySelector('#todo .item[data-id="' + stolen.id + '"]');
  if (li) li.classList.add('stolen');
  else if (!find(stolen.id) || find(stolen.id).done) stolen = null;   // (checked off or removed meanwhile: nothing to give back)
}
new MutationObserver(applyStolen).observe($('todo'), { childList: true });

/**
 * He steals the emoji of a row that is on show and eats it.
 * @returns {boolean} Whether he went for one.
 */
function stealNow() {
  var rows = stealable();
  if (!rows.length || stolen || busy) return false;
  var li = rows[Math.floor(Math.random() * rows.length)], img = li.querySelector('.emoji-btn img');
  var r = img.getBoundingClientRect(), from = { x: r.left + r.width / 2, y: r.top + r.height / 2, size: Math.max(20, r.width) };
  var src = img.src;
  stolen = { id: li.dataset.id, src: src, phase: 'sneak' };
  busy++;
  setFace({ eyes: 'squint', mouth: 'smile', arms: 'idle', x: [] });   // (a sly look)
  say(pick(['…', 'psst…', '*tiptoe*']), 1000, true);
  wait(1100).then(function () {
    if (!stolen) { busy--; settle(); return; }
    li.classList.add('stolen');
    sound('swoosh');
    drift(['💨'], { x: from.x, y: from.y }, 1);
    return flyEmoji(src, from, stealMouth(), 650, 70, true);
  }).then(function () {
    if (!stolen) return;
    sound('chomp');
    setFace(CHEW);
    if (!reduceMotion) pulse('bob', 900);
    return wait(1300);
  }).then(function () {
    if (!stolen) { busy--; settle(); return; }
    setFace({ eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
    say(pick(['…what?', '*gulp* nothing happened', 'hehe… yum', 'I didn\'t see anything~']), 2000, true);
    stolen.phase = 'eaten';
    return wait(1600);
  }).then(function () { busy--; if (!busy) settle(); });
  return true;
}
/** He is poked while he has one: embarrassed, he spits it back out onto its row. */
function spitBack() {
  var s = stolen;
  s.phase = 'spit';
  busy++;
  setFace(FACES.sheepish);
  say(pick(['eep!', 'a-ah! it wasn\'t me!', 's-sorry! ♡', 'I was only keeping it safe!']), 2000, true);
  pulse('hop', 450);
  sound('spit');
  var li = document.querySelector('#todo .item[data-id="' + s.id + '"]'), img = li && li.querySelector('.emoji-btn img'), to = null;
  if (img) { var r = img.getBoundingClientRect(); if (r.width > 4 && r.bottom > 0 && r.top < window.innerHeight) to = { x: r.left + r.width / 2, y: r.top + r.height / 2, size: Math.max(20, r.width) }; }
  var m = stealMouth(); m.size = to ? to.size : 28;
  (to ? flyEmoji(s.src, m, to, 750, 90, false) : Promise.resolve()).then(function () {
    stolen = null;
    applyStolen();
    if (li) li.classList.remove('stolen');
    if (to) { sound('tink'); drift(['✦'], { x: to.x, y: to.y }, 2); }
    return wait(1500);
  }).then(function () { busy--; if (!busy) settle(); });
}
// poking him while he has it
pet.addEventListener('click', function (e) {
  if (stolen && stolen.phase === 'eaten') { e.stopImmediatePropagation(); e.preventDefault(); spitBack(); }
}, true);

/** Now and then, while it is quiet. */
function scheduleSteal() {
  clearTimeout(stealTimer);
  stealTimer = setTimeout(function () {
    if (stealOk()) { stealNow(); scheduleSteal(); } else { stealTimer = setTimeout(scheduleSteal, 60000); }
  }, STEAL_MIN_MS + Math.random() * (STEAL_MAX_MS - STEAL_MIN_MS));
}
scheduleSteal();
// while he has it he looks a little guilty now and then
guiltTimer = setInterval(function () {
  if (stolen && stolen.phase === 'eaten' && !busy && !document.hidden && Math.random() < 0.5) say(pick(['*whistles*', '…', 'hm? nothing here~']), 1500);
}, 100000);

/** Developer tools: he goes for an emoji now. @returns {string} What to tell. */
function devSteal() {
  if (stolen) return 'He already has one. Poke him to get it back.';
  if (isTodo()) return 'He only steals from the shopping list. Switch to it first.';
  if (document.documentElement.classList.contains('desktop-pet')) return 'Only in the app, not the small window.';
  var tries = 0;
  setTimeout(function go() {   // (the list is drawn again right after this button, so he looks after that; and waits if he is busy)
    if (stealNow()) return;
    if (++tries < 14 && (busy || playing)) { setTimeout(go, 500); return; }
    say('nothing to steal…', 1500);
  }, 700);
  return 'Close this sheet and watch the list. Poke him afterwards.';
}
