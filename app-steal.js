// The sneaky snack: every now and then, in the app, Fumu tiptoes up, steals one of the emojis off the shopping list and cheekily eats it. The item stays on
// the list, only its picture is gone, until you poke him: then he is embarrassed and spits it back out. It lasts only while the app is open (a
// reload brings every picture back), takes nothing from the list, and does not happen in the small desktop window (it has no list).
// Plain script, shares one scope, loaded after app-wreck.js.
'use strict';

var STEAL_MIN_MS = 45000, STEAL_MAX_MS = 110000;   // (each day, until you catch him: the first comes sooner after the app opens, STEAL_FIRST_MS)
var STEAL_FIRST_MS = 20000;
var STEAL_RARE_MIN_MS = 8 * 60000, STEAL_RARE_MAX_MS = 16 * 60000;   // (once you have caught him today it is much rarer, until tomorrow)
var STEAL_KEY = 'nibble-steal-caught', stealNotBefore = 0;
/** @returns {boolean} Whether you have already poked him and made him spit one out today. */
function caughtToday() { try { return localStorage.getItem(STEAL_KEY) === todayKey(); } catch (e) { return false; } }
function stealRare() { return STEAL_RARE_MIN_MS + Math.random() * (STEAL_RARE_MAX_MS - STEAL_RARE_MIN_MS); }
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
  return !document.hidden && !busy && !playing && !stolen && Date.now() >= stealNotBefore && !isTodo() && !document.documentElement.classList.contains('desktop-pet') &&
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
 * The walk to the emoji: a copy of him (the real one is hidden meanwhile) walks over the page, one paw out, takes the emoji and runs back.
 * @param {HTMLElement} li The row. @param {string} src The emoji's picture. @param {{x: number, y: number, size: number}} from Where the emoji is.
 * @returns {Promise<?{x: number, y: number, size: number}>} Where his paw is back at home (the emoji is still in it), or null if it could not be done.
 */
function stealTrip(li, src, from) {
  return new Promise(function (resolve) {
    var sr = stage.getBoundingClientRect(), gs = document.createElement('div'), gp = pet.cloneNode(true);
    if (sr.width < 20 || !gp.querySelector) { resolve(null); return; }
    gs.className = stage.className + ' steal-ghost';
    gs.style.cssText = stage.style.cssText + ';position:fixed;left:' + sr.left + 'px;top:' + sr.top + 'px;width:' + sr.width + 'px;height:' + sr.height + 'px;margin:0;overflow:visible;background:none;border:0;box-shadow:none;pointer-events:none;z-index:9500;transform:none;';
    var side = from.x < window.innerWidth / 2 ? 'l' : 'r';   // (the paw on the side that leaves his body on the roomier side)
    gp.classList.add('walking', 'steal-' + side); gp.dataset.arms = 'steal'; gp.dataset.eyes = 'squint'; gp.dataset.mouth = 'smile';
    gs.appendChild(gp);
    document.body.appendChild(gs);
    var arm = [].slice.call(gp.querySelectorAll(side === 'r' ? '.arm-r' : '.arm-l')).filter(function (a) { return a.getBoundingClientRect().width > 0; })[0];
    if (!arm) { gs.remove(); resolve(null); return; }
    var ar = arm.getBoundingClientRect(), paw = { x: side === 'r' ? ar.right - ar.width * .2 : ar.left + ar.width * .2, y: ar.bottom - ar.height * .1, size: Math.max(24, from.size) };
    var tx = from.x - paw.x, ty = from.y - paw.y, dist = Math.hypot(tx, ty), ms = Math.max(800, Math.min(1700, dist * 3.6));
    pet.style.visibility = 'hidden';
    gp.style.setProperty('--look-x', (tx > 0 ? 3.2 : -3.2) + 'px');
    function at(x, y) { return 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; }
    var walk = gs.animate([{ transform: at(0, 0) }, { transform: at(tx, ty) }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    walk.onfinish = function () {
      gp.classList.remove('walking');
      // the paw closes on it: the emoji leaves the row and sits in his paw
      li.classList.add('stolen');
      sound('squeak');
      var e = document.createElement('img'), es = paw.size;
      e.src = src; e.alt = '';
      e.style.cssText = 'position:absolute;left:' + (paw.x - sr.left - es / 2) + 'px;top:' + (paw.y - sr.top - es / 2) + 'px;width:' + es + 'px;height:' + es + 'px;z-index:2;';
      gs.appendChild(e);
      e.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: .4 }, { transform: 'scale(.9)' }], { duration: 260 });
      setTimeout(function () {   // and he runs back, fast
        gp.classList.add('walking', 'running'); gp.dataset.eyes = 'happy';
        gp.style.setProperty('--look-x', (tx > 0 ? -3.2 : 3.2) + 'px');
        var back = gs.animate([{ transform: at(tx, ty) }, { transform: at(0, 0) }], { duration: Math.max(380, ms * .4), easing: 'ease-in-out', fill: 'forwards' });
        back.onfinish = function () { gs.remove(); pet.style.visibility = ''; resolve(paw); };
      }, 320);
    };
  });
}
/**
 * He steals the emoji of a row that is on show and eats it.
 * @param {boolean} [force] Go ahead even if he is marked busy (the animation player does that).
 * @returns {boolean} Whether he went for one.
 */
function stealNow(force) {
  var rows = stealable();
  if (!rows.length || stolen || (busy && !force)) return false;   // (force: the animation player has already marked him busy)
  var li = rows[Math.floor(Math.random() * rows.length)], img = li.querySelector('.emoji-btn img');
  var r = img.getBoundingClientRect(), from = { x: r.left + r.width / 2, y: r.top + r.height / 2, size: Math.max(20, r.width) };
  var src = img.src;
  stolen = { id: li.dataset.id, src: src, phase: 'sneak' };
  busy++;
  setFace({ eyes: 'squint', mouth: 'smile', arms: 'idle', x: [] });   // (a sly look)
  say(pick(['…', 'psst…', '*tiptoe*']), 1000, true);
  // he walks down over the page to the emoji, takes it with a paw and runs back (a copy of him does the walking: see stealTrip)
  var trip = reduceMotion ? Promise.resolve(null) : wait(500).then(function () { return stealTrip(li, src, from); }).catch(function () { pet.style.visibility = ''; return null; });
  trip.then(function (paw) {
    if (!stolen) { busy--; settle(); return; }
    if (paw) return flyEmoji(src, paw, stealMouth(), 330, 30, true);   // (it was in his paw: now it goes to his mouth)
    li.classList.add('stolen');   // (no trip: it simply flies to him)
    sound('swoosh');
    drift(['💨'], { x: from.x, y: from.y }, 1);
    return flyEmoji(src, from, stealMouth(), 520, 70, true);
  }).then(function () {
    if (!stolen) return;
    sound('chomp');
    setFace(CHEW);
    if (!reduceMotion) pulse('bob', 900);
    // crumbs fly out of his mouth while he chews
    [0, 280, 560].forEach(function (t) { setTimeout(function () { if (stolen) { crumbs(stealMouth(), '#e9c58c', 6); } }, t); });
    return wait(900);
  }).then(function () {
    if (!stolen) { busy--; settle(); return; }
    setFace({ eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
    say(pick(['…what?', '*gulp* nothing happened', 'hehe… yum', 'I didn\'t see anything~']), 2000, true);
    stolen.phase = 'eaten';
    return wait(1200);
  }).then(function () { busy--; if (!busy) settle(); });
  return true;
}
/** He is poked while he has one: embarrassed, he spits it back out onto its row. */
function stealSpit() {
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
    try { localStorage.setItem(STEAL_KEY, todayKey()); } catch (e) { /* storage blocked */ }
    stealNotBefore = Date.now() + stealRare();   // (caught him: it is rare from now on, today)
    if (li) li.classList.remove('stolen');
    if (to) { sound('tink'); drift(['✦'], { x: to.x, y: to.y }, 2); }
    return wait(1500);
  }).then(function () { busy--; if (!busy) settle(); });
}
// poking him while he has it
pet.addEventListener('click', function (e) {
  if (stolen && stolen.phase === 'eaten') { e.stopImmediatePropagation(); e.preventDefault(); stealSpit(); }
}, true);

/** Now and then, while it is quiet. */
function scheduleSteal(first) {
  clearTimeout(stealTimer);
  stealTimer = setTimeout(function () {
    if (stealOk()) { stealNow(); scheduleSteal(); } else { stealTimer = setTimeout(scheduleSteal, 12000); }
  }, caughtToday() ? stealRare() : first ? STEAL_FIRST_MS + Math.random() * 15000 : STEAL_MIN_MS + Math.random() * (STEAL_MAX_MS - STEAL_MIN_MS));
}
if (caughtToday()) stealNotBefore = Date.now() + stealRare();   // (opened again after catching him today: rare right away)
scheduleSteal(true);
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
