// Developer tool: the animation player. Pick any of Fumu's animations by name and watch it on the pet:
// body moves, faces, arms, eyes, mouths, extras, the idle moves, the to-do moves, a few specials and the sounds.
// Opened from Options > Developer tools. These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var animSheet = $('animSheet'), animList = $('animList'), animFilter = $('animFilter'), animStatus = $('animStatus'), animRepeat = $('animRepeat');
var BODY_MOVES = [['wiggle', 900], ['twirl', 800], ['peek', 1400], ['bob', 1400], ['shuffle', 1500], ['boogie', 1500], ['rock', 1900], ['roly', 2800], ['rocksmall', 1300],
  ['sniff', 1700], ['stroll', 3600], ['waddle', 1800], ['scoot', 1400], ['sit', 2600], ['hop', 500], ['hopsmall', 450], ['hophop', 1500], ['chomp', 360], ['spit', 450],
  ['stretch', 1100], ['pat', 1300], ['nod', 900]];
var ANIM_ARMS = ['rest', 'idle', 'reach', 'nom', 'hold', 'cover', 'cheer', 'fan', 'clench', 'pat', 'eyerub', 'rub', 'scratch', 'grab'];
var ANIM_EYES = ['open', 'closed', 'happy', 'sparkle', 'squint'];
var ANIM_MOUTHS = ['smile', 'open', 'o', 'wavy', 'chew'];
var ANIM_EXTRAS = ['hearts', 'sparkles', 'zzz', 'steam', 'question', 'sweat', 'shock', 'redface', 'cheeks'];

/** @returns {string} A short name for an idle move, taken from what its code does (they are unnamed in the list). */
function idleName(run, i) {
  var src = String(run), m = src.match(/pulse\('(\w+)'/) || src.match(/FACES\.(\w+)/) || src.match(/(lookAround|bellyJiggle|eyesDo|drift)\(/);
  return (i + 1) + ' ' + (m ? m[1] : 'move');
}
/** @returns {{group: string, name: string, run: function(): (number|undefined)}[]} Everything the player can run. */
function animCatalogue() {
  var out = [];
  function add(group, name, run) { out.push({ group: group, name: name, run: run }); }
  BODY_MOVES.forEach(function (m) { add('Body moves', m[0], function () { pulse(m[0], m[1]); return m[1]; }); });
  Object.keys(SQUISH).forEach(function (k) {
    if (!BODY_MOVES.some(function (m) { return m[0] === k; })) add('Body moves', k + ' (squash only)', function () { svgSquish(SQUISH[k]); return SQUISH[k].ms; });
  });
  Object.keys(FACES).forEach(function (k) { add('Faces', k, function () { setFace(FACES[k]); return 2600; }); });
  ANIM_ARMS.forEach(function (a) { add('Arms', a, function () { setFace({ eyes: 'open', mouth: 'smile', arms: a, x: [] }); return 2600; }); });
  ANIM_EYES.forEach(function (e) { add('Eyes', e, function () { setFace({ eyes: e, mouth: 'smile', arms: 'idle', x: [] }); return 2600; }); });
  add('Eyes', 'wide', function () { eyesDo('wide'); return 1200; });
  add('Eyes', 'squint (scaled)', function () { eyesDo('squint'); return 1400; });
  ANIM_MOUTHS.forEach(function (m) { add('Mouths', m, function () { setFace({ eyes: 'open', mouth: m, arms: 'idle', x: [] }); return 2600; }); });
  ANIM_EXTRAS.forEach(function (x) { add('Extras', x, function () { setFace({ eyes: 'open', mouth: 'smile', arms: 'idle', x: [x] }); return 2800; }); });
  IDLE_MOVES.forEach(function (m, i) { add('Idle moves', idleName(m.run, i) + (m.night ? ' (night)' : ''), function () { return m.run() || 1800; }); });
  [['write on the clipboard', function () { writeOnClipboard(function () { say('scribble scribble', 1300); }); return 3600; }],
   ['inspect with the glass', function () { inspectList(); return 4600; }],
   ['look over the list', function () { lookOverList(); return 2800; }]].forEach(function (m) {
    add('To-do moves', m[0], function () {
      if (!isTodo()) { say('switch to the to-do list first', 1800); return 1200; }
      return m[1]();
    });
  });
  add('Specials', 'belly jiggle', function () { bellyJiggle(); return 1300; });
  add('Specials', 'look around', function () { lookAround(); return 2200; });
  add('Specials', 'hum', function () { hum(); setFace(FACES.dreamy); pulse('bob', 1400); return 1800; });
  add('Specials', 'goodnight kiss', function () { kissGoodnight(); return 2600; });
  add('Specials', 'snore', function () { snore(); return 2400; });
  add('Specials', 'wake with a start', function () { return wakeForSnack(); });
  add('Specials', 'hearts drifting', function () { drift(['♥', '✦', '♥'], petTop(), 4); return 2200; });
  Sounds.kinds.forEach(function (k) { add('Sounds', k, function () { sound(k); return 900; }); });
  return out;
}

var animItems = [], animTimer = null, animCurrent = null;
/** Draws the groups of buttons, leaving out any that don't match the typed filter. */
function renderAnims() {
  var q = animFilter.value.trim().toLowerCase(), groups = {}, order = [];
  animItems.forEach(function (it, i) {
    if (q && it.name.toLowerCase().indexOf(q) === -1 && it.group.toLowerCase().indexOf(q) === -1) return;
    if (!groups[it.group]) { groups[it.group] = []; order.push(it.group); }
    groups[it.group].push(i);
  });
  animList.replaceChildren.apply(animList, order.map(function (g) {
    var sec = document.createElement('section');
    var h = document.createElement('h3');
    h.textContent = g;
    var row = document.createElement('div');
    row.className = 'anim-chips';
    groups[g].forEach(function (i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'anim-chip'; b.dataset.i = i; b.textContent = animItems[i].name;
      b.setAttribute('aria-pressed', String(animCurrent === i));
      row.appendChild(b);
    });
    sec.append(h, row);
    return sec;
  }));
  if (!order.length) animList.textContent = 'Nothing matches.';
}
/** Stops the one that is playing (and any repeat), and puts the pet back in its resting face. */
function animStop() {
  clearTimeout(animTimer);
  animTimer = null;
  if (animCurrent !== null) { animCurrent = null; animStatus.textContent = 'Stopped.'; if (!busy) settle(); renderAnims(); }
}
/** Plays one animation on the pet; with Repeat on it plays again until you stop it or pick another. */
function animPlay(i) {
  clearTimeout(animTimer);
  animCurrent = i;
  var it = animItems[i], ms;
  busy++;
  stopWalk();
  try { ms = it.run(); } catch (e) { ms = 600; animStatus.textContent = 'Could not play ' + it.name + ': ' + e.message; }
  if (typeof ms !== 'number' || !isFinite(ms)) ms = 1800;
  animStatus.textContent = 'Playing: ' + it.group + ' › ' + it.name + (animRepeat.checked ? ' (repeating)' : '');
  renderAnims();
  animTimer = setTimeout(function () {
    busy--;
    if (animRepeat.checked && animSheet.open && animCurrent === i) { animPlay(i); return; }
    animCurrent = null;
    if (!busy) settle();
    animStatus.textContent = 'Done: ' + it.name;
    renderAnims();
  }, Math.max(500, ms) + 500);
}
animList.addEventListener('click', function (e) {
  var b = e.target.closest('.anim-chip');
  if (!b) return;
  if (animCurrent !== null) { clearTimeout(animTimer); busy = Math.max(0, busy - 1); }   // pick another while one is playing
  animPlay(+b.dataset.i);
});
animFilter.addEventListener('input', renderAnims);
$('animStop').addEventListener('click', function () { if (animCurrent !== null) busy = Math.max(0, busy - 1); animStop(); });
$('animBtn').addEventListener('click', function () {
  devSheet.close();
  animItems = animCatalogue();
  animStatus.textContent = animItems.length + ' animations. Tap a name to play it.';
  animFilter.value = '';
  renderAnims();
  openDialog(animSheet);
});
animSheet.addEventListener('close', function () { if (animCurrent !== null) busy = Math.max(0, busy - 1); animStop(); });
animSheet.addEventListener('click', function (e) { if (e.target === animSheet) animSheet.close(); });
