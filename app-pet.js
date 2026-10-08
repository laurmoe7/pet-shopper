// Fumu: faces, speech bubbles, flying food and crumbs.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- Fumu ----------
// eyes, mouth, arm pose and extras for each mood
var FACES = {
  sleepy: { eyes: 'closed', mouth: 'o', arms: 'rest', x: ['zzz'] },
  curious: { eyes: 'open', mouth: 'smile', arms: 'idle', x: [] },
  happy: { eyes: 'open', mouth: 'smile', arms: 'idle', x: ['cheeks'] },
  stuffed: { eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['cheeks'] },
  catching: { eyes: 'open', mouth: 'open', arms: 'reach', x: [] },
  sheepish: { eyes: 'closed', mouth: 'wavy', arms: 'cover', x: ['sweat', 'cheeks'] },
  wake: { eyes: 'happy', mouth: 'open', arms: 'reach', x: ['sparkles'] },
  party: { eyes: 'happy', mouth: 'open', arms: 'pat', x: ['hearts', 'sparkles', 'cheeks'] },
  tada: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] },
  suspicious: { eyes: 'squint', mouth: 'wavy', arms: 'scratch', x: ['question'] },
  love: { eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['hearts', 'cheeks'] },
  annoyed: { eyes: 'squint', mouth: 'wavy', arms: 'idle', x: [] },
  dreamy: { eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['cheeks'] },
  nod: { eyes: 'happy', mouth: 'smile', arms: 'idle', x: ['cheeks'] }   // the "fumu fumu" nod: happy closed eyes
};
var CHEW = { eyes: 'happy', mouth: 'chew', arms: 'nom', x: ['cheeks'] };
var REACTIONS = {
  fruit: { face: { eyes: 'happy', mouth: 'chew', arms: 'cheer', x: ['hearts', 'cheeks'] }, lines: ['so juicy!', 'fruity ♡', 'yum yum!', 'amai~ (sweet!)'] },
  veg: { face: { eyes: 'open', mouth: 'chew', arms: 'nom', x: ['cheeks'] }, lines: ['crunchy!', 'fresh & healthy', 'veggies ♡', 'good for me!', 'mogu mogu'] },
  sweets: { face: { eyes: 'open', mouth: 'chew', arms: 'cheer', x: ['sparkles', 'cheeks'] }, look: 'wide', lines: ['kira kira!', 'treat time ♡', 'SUGAR!', 'one more?'] },
  spicy: { face: { eyes: 'squint', mouth: 'open', arms: 'fan', x: ['steam', 'redface', 'shock'] }, look: 'wide', lines: ['HOT HOT HOT', 'hii~ spicy!', 'fire! fire!', 'water?!'] },
  drink: { face: { eyes: 'happy', mouth: 'o', arms: 'hold', x: ['cheeks'] }, lines: ['gokun gokun', 'sluuurp', 'refreshing!', 'puhaa~'] },
  baked: { face: { eyes: 'happy', mouth: 'chew', arms: 'nom', x: ['cheeks'] }, lines: ['fuwa fuwa ♡', 'warm & chewy', 'carbs!', 'mmm, bready'] },
  dairy: { face: CHEW, lines: ['creamy ♡', 'mogu mogu', 'MORE?', 'so smooth'] },
  protein: { face: CHEW, lines: ['mogu mogu', 'strong snack!', 'tasty!', 'MORE?'] },
  pantry: { face: CHEW, lines: ['mogu mogu', 'tiny snack!', 'ooh, yum', 'paku!'] },
  nonfood: { face: { eyes: 'confused', mouth: 'wavy', arms: 'scratch', x: ['question'] }, look: 'squint', lines: ["that's not food", 'hmm… for later', 'tuck it away'] },
  mystery: { face: { eyes: 'open', mouth: 'chew', arms: 'cheer', x: ['sparkles', 'cheeks'] }, look: 'wide', lines: ['a surprise?!', 'mystery snack!', 'what was that?'] },
  // reactions to particular foods (picked by reactionOf, on top of the food's category)
  sour: { face: { eyes: 'squint', mouth: 'wavy', arms: 'clench', x: ['shock'] }, then: CHEW, move: ['wiggle', 900], look: 'squint', lines: ['so sour!!', 'sour sour sour!', 'my face!!'] },
  crunchy: { face: { eyes: 'happy', mouth: 'chew', arms: 'nom', x: ['cheeks'] }, crumbs: 14, lines: ['crunch crunch!', 'kari kari!', 'so crispy!'] },
  cold: { face: { eyes: 'squint', mouth: 'o', arms: 'clench', x: ['sweat'] }, then: { eyes: 'happy', mouth: 'chew', arms: 'cheer', x: ['cheeks'] }, move: ['wiggle', 900], look: 'squint', lines: ['brrr! brain freeze!', 'so cold!', 'hiyaa~ cold!'] },
  coffee: { face: { eyes: 'open', mouth: 'open', arms: 'cheer', x: ['sparkles', 'shock'] }, move: ['hophop', 1500], look: 'wide', lines: ['ZOOM!', 'I can see sounds!', 'wide awake!!'] },
  grownup: { face: { eyes: 'confused', mouth: 'wavy', arms: 'cover', x: ['sweat'] }, bag: true, look: 'squint', lines: ['for the grown-ups!', 'not for me!', 'into the bag~'] },
  nochoc: { face: { eyes: 'teary', mouth: 'wavy', arms: 'cover', x: ['sweat'] }, bag: true, lines: ['no chocolate for pets!', 'chocolate makes us sick… for you!', 'into the bag, sadly~', 'smells good, but no!'] },
  petfood: { face: { eyes: 'open', mouth: 'open', arms: 'cheer', x: ['hearts', 'sparkles'] }, bag: true, move: ['hop', 460], look: 'wide', lines: ['is this… for ME?!', 'treats?! for me?!', 'saving it for later!'] }
};
// which items get one of the reactions above: by emoji, or by words in the item
var REACTION_RULES = [
  // real animals shouldn't eat chocolate (only the mochi can): it goes in the bag with a comment
  ['nochoc', ['🍫'], /choc|cocoa|cacao|nutella|brownie|mocha|tiramisu|oreo/, function () { return state.pet.species !== 'mochi'; }],
  ['grownup', ['🍷', '🍺', '🍻', '🥂', '🍸', '🍹', '🍾', '🥃'], /\b(wine|beer|cider|prosecco|champagne|vodka|gin|rum|whisk(e)?y|liqueur)\b/],
  ['petfood', [], /\b(dog|cat|pet|bird|fish) (food|treats?|biscuits?)\b|\bkibble\b/],
  ['coffee', ['☕'], /\b(coffee|espresso|cappuccino|latte)\b/],
  ['cold', ['🍨', '🧊'], /\b(ice cream|ice lolly|popsicle|frozen|ice cubes?|gelato|sorbet)\b/],
  ['sour', ['🍋'], /\b(lemons?|limes?|pickles?|gherkins?|sauerkraut|vinegar|sour(?! cream))\b/],
  ['crunchy', ['🍿', '🥨'], /\b(chips|crisps|popcorn|pretzels?|nuts|peanuts|almonds|crackers|nachos|tortilla chips)\b/]
];
/**
 * @param {Item} item
 * @returns {string} The reaction for this item: a special one from REACTION_RULES, or its food category.
 */
function reactionOf(item) {
  var text = (item.text || '').toLowerCase();
  for (var i = 0; i < REACTION_RULES.length; i++) {
    var r = REACTION_RULES[i];
    if ((r[1].indexOf(item.emoji) !== -1 || r[2].test(text)) && (!r[3] || r[3]())) return r[0];
  }
  return item.cat;
}
/** @returns {boolean} Whether the pet puts this in the bag instead of eating it (not food, or not for pets). */
function isBagged(item) {
  var r = REACTIONS[reactionOf(item)];
  return item.cat === 'nonfood' || !!(r && r.bag);
}

var busy = 0;

/**
 * @returns {string} The pet's resting mood: from the list, or asleep once it has been put to bed tonight
 * (pet.dozing, set in app-bedtime.js when the lamp is off and it is tucked in; checking something off clears it).
 */
function baseState() { return L.restingMood(state.items, petNow(), state.pet.dozing); }
/**
 * Shows a face on the pet: eyes, mouth, arm pose and extras such as hearts or steam.
 * @param {{eyes: string, mouth: string, arms?: string, x: string[]}} face
 */
function setFace(face) {
  pet.dataset.eyes = face.eyes;
  pet.dataset.mouth = face.mouth;
  pet.dataset.arms = face.arms || 'idle';
  ['zzz', 'steam', 'hearts', 'sparkles', 'question', 'sweat', 'shock', 'redface', 'cheeks'].forEach(function (x) {
    pet.classList.toggle('x-' + x, face.x.indexOf(x) !== -1);
  });
}
/** Puts the pet back into its resting mood and face for the current list. */
function settle() {
  var s = baseState();
  pet.dataset.state = s;
  // up at night: tired, heavy-lidded eyes (they show on the open eyes, so its resting face keeps them open)
  var tired = s !== 'sleepy' && L.isNight(petNow()), face = FACES[s];
  setFace(tired ? { eyes: 'open', mouth: face.mouth, arms: face.arms, x: face.x } : face);
  pet.classList.toggle('tired', tired);
}
/** @returns {boolean} True when it's up at night: happy moments come out happy but tired. */
function isTired() { return pet.classList.contains('tired'); }
/**
 * A happy face, but tired when it's up at night: open eyes (so the heavy lids show) instead of happy or sparkly ones.
 * @param {{eyes: string, mouth: string, arms?: string, x: string[]}} face
 */
function tiredFace(face) {
  if (!isTired()) return face;
  var eyes = face.eyes === 'happy' || face.eyes === 'sparkle' ? 'open' : face.eyes;
  return { eyes: eyes, mouth: face.mouth, arms: face.arms, x: face.x.filter(function (x) { return x !== 'sparkles'; }) };
}
/** Big happy moves become small ones when it's tired. */
function tiredMove(move) {
  return isTired() && /^(hop|hophop|twirl|boogie|roly|shuffle)$/.test(move[0]) ? ['hopsmall', 450] : move;
}
var TIRED_YUM = ['yummy… *yawn*', 'midnight snack ♡', 'mm… so good…', 'sleepy yum~', 'nom… *yawn*'];
/**
 * The eyes go wide (surprised) or squint (sour, suspicious) for a moment, whatever eyes the face has.
 * @param {'wide'|'squint'} how
 */
function eyesDo(how) { pulse(how === 'wide' ? 'eyewide' : 'eyesquint', how === 'wide' ? 1000 : 1200); }
/** The belly jiggle: it rubs its tummy and the body wobbles side to side. */
function bellyJiggle() {
  setFace({ eyes: 'happy', mouth: 'open', arms: 'rub', x: ['cheeks'] });
  pulse('jiggle', 1200);
  sound('jiggle');
  say(pick(['jiggle jiggle!', 'wobble wobble~', 'squishy tummy!', 'boing boing']), 1300, true);
  setTimeout(function () { if (!busy) settle(); }, 1400);
}
/**
 * Plays a one-off CSS animation on the pet by adding a class for a while.
 * @param {string} cls
 * @param {number} ms How long to keep the class.
 */
function pulse(cls, ms) {
  pet.classList.remove(cls);
  void pet.offsetWidth;
  pet.classList.add(cls);
  setTimeout(function () { pet.classList.remove(cls); }, ms);
  if (SQUISH[cls] && !reduceMotion) svgSquish(SQUISH[cls]);
}

// ---------- squash and stretch, drawn inside the SVG ----------
// A CSS scale on the pet makes the phone stretch an already-drawn picture, which left a hairline across the face.
// Here the body gets a new SVG transform each frame instead, so the phone redraws the shapes at their real size.
// Each step is [time 0-1, width, height, lift in SVG units]; the squash is anchored at the feet.
// Keep them about this strong: the much bigger squashes of build 81 still showed a seam.
var SQUISH = {
  chomp: { ms: 360, steps: [[0, 1, 1, 0], [.3, 1.16, .84, 0], [.55, .93, 1.1, 0], [.78, 1.03, .975, 0], [1, 1, 1, 0]] },
  spit: { ms: 450, steps: [[0, 1, 1, 0], [.35, .87, 1.17, -3.6], [.7, 1.05, .95, 0], [1, 1, 1, 0]] },
  stretch: { ms: 1100, steps: [[0, 1, 1, 0], [.4, .85, 1.21, 0], [.68, 1.1, .92, 0], [.85, .98, 1.025, 0], [1, 1, 1, 0]] },
  pat: { ms: 1300, steps: [[0, 1, 1, 0], [.2, 1.09, .92, 0], [.4, .94, 1.07, 0], [.6, 1.06, .95, 0], [.8, .97, 1.03, 0], [1, 1, 1, 0]] },
  // hops: crouch, stretch on take-off, squash on landing. The times match the hop keyframes in styles.css.
  hop: { ms: 500, steps: [[0, 1, 1, 0], [.16, 1.12, .87, 0], [.26, .9, 1.12, 0], [.46, .98, 1.02, 0], [.8, .96, 1.05, 0], [.86, 1.14, .87, 0], [.94, .97, 1.03, 0], [1, 1, 1, 0]] },
  hopsmall: { ms: 450, steps: [[0, 1, 1, 0], [.1, .95, 1.06, 0], [.4, 1, 1, 0], [.72, .98, 1.02, 0], [.8, 1.08, .92, 0], [.9, .98, 1.02, 0], [1, 1, 1, 0]] },
  hophop: { ms: 1500, steps: [[0, 1, 1, 0], [.06, .93, 1.08, 0], [.17, 1, 1, 0], [.31, .98, 1.02, 0], [.355, 1.1, .9, 0], [.41, .97, 1.03, 0],
    [.45, .94, 1.07, 0], [.5, 1, 1, 0], [.6, .98, 1.02, 0], [.645, 1.09, .91, 0], [.7, .97, 1.03, 0], [.73, .95, 1.06, 0], [.78, 1, 1, 0],
    [.86, .98, 1.02, 0], [.905, 1.08, .92, 0], [.96, .98, 1.02, 0], [1, 1, 1, 0]] },
  // a soft settle now and then while it waits (see softSettle in app-idle.js), and a slow deep breath when sleepy
  settle: { ms: 1000, steps: [[0, 1, 1, 0], [.35, 1.04, .96, 0], [.7, .99, 1.01, 0], [1, 1, 1, 0]] },
  // a belly jiggle: quick wobbles side to side that die down (see bellyJiggle)
  jiggle: { ms: 1200, steps: [[0, 1, 1, 0], [.08, 1.08, .95, 0], [.18, .94, 1.04, 0], [.28, 1.07, .96, 0], [.38, .95, 1.035, 0],
    [.48, 1.05, .97, 0], [.58, .97, 1.02, 0], [.68, 1.03, .985, 0], [.8, .99, 1.008, 0], [.9, 1.01, .995, 0], [1, 1, 1, 0]] },
  breath: { ms: 2400, steps: [[0, 1, 1, 0], [.45, .98, 1.035, 0], [1, 1, 1, 0]] },
  // the "fumu fumu" nod: two quick bobs of the head, down and up, like a pigeon (or someone saying mhm)
  nod: { ms: 900, steps: [[0, 1, 1, 0], [.13, 1.035, .93, 3.4], [.3, .995, 1.012, -.7], [.47, 1.035, .93, 3.4], [.65, .995, 1.012, -.7], [.82, 1.008, .99, .4], [1, 1, 1, 0]] }
};
var squishBody = petSvg.querySelector('.pet-body'), squishRun = 0, squishing = false;
/**
 * Sets the body's SVG transform, anchored at the middle of the feet (80, 146 in the drawing).
 * @param {number} sx
 * @param {number} sy
 * @param {number} lift
 */
function drawBody(sx, sy, lift) {
  if (sx === 1 && sy === 1 && !lift) { squishBody.removeAttribute('transform'); return; }
  squishBody.setAttribute('transform', 'matrix(' + sx.toFixed(4) + ' 0 0 ' + sy.toFixed(4) + ' ' +
    (80 - 80 * sx).toFixed(3) + ' ' + (146 - 146 * sy + lift).toFixed(3) + ')');
}
/** @param {{ms: number, steps: number[][]}} sq Plays one squash on the body. */
function svgSquish(sq) {
  var run = ++squishRun, start = performance.now(), steps = sq.steps;
  squishing = true;
  function frame(now) {
    if (run !== squishRun) return;
    var t = Math.min(1, (now - start) / sq.ms), i = 1;
    while (i < steps.length - 1 && steps[i][0] < t) i++;
    var a = steps[i - 1], b = steps[i], k = (t - a[0]) / (b[0] - a[0] || 1);
    k = .5 - Math.cos(k * Math.PI) / 2; // ease in and out between steps
    var sx = a[1] + (b[1] - a[1]) * k, sy = a[2] + (b[2] - a[2]) * k, lift = a[3] + (b[3] - a[3]) * k;
    if (t >= 1) { squishing = false; drawBody(1, 1, 0); return; }
    drawBody(sx, sy, lift);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
var bubbleTimer, bubbleHome = bubble.parentNode, bubbleNext = bubble.nextSibling;
/** Puts the bubble back on the stage (it moves into an open menu so the pet can still talk there). */
function bubbleToStage() {
  bubble.classList.remove('in-sheet');
  if (bubble.parentNode !== bubbleHome) bubbleHome.insertBefore(bubble, bubbleNext);
}
/**
 * Shows a speech bubble (always on; Quiet mode only mutes sounds).
 * @param {string} text
 * @param {number} [ms=1500] How long it stays.
 * @param {boolean} [own] Already in the personality's voice (from `line`), so not restyled.
 */
var idleQuiet = false;   // set while an idle moment runs that he was told not to talk during (app-idle.js); a touch or key press ends it
var chatterRate = 1;     // how much he talks on his own: 0 never, .35 rarely, 1 normal, 2.5 often (the desktop app's settings change it)
function say(text, ms, own) {
  if (!text || idleQuiet) return;
  text = text.replace(/\bFumu\b/g, petName());   // lines are written with his first name; use the one you gave him
  bubble.hidden = true;
  void bubble.offsetWidth;
  var line = own ? text : L.styleLine(personality(), text);
  var menu = document.querySelector('dialog[open]:not(#roomSheet):not(#devSheet)');
  if (menu && menu.id === 'dressSheet') { dressSay(line, ms, true); return; }
  try {
    if (menu) { menu.appendChild(bubble); bubble.classList.add('in-sheet'); } else bubbleToStage();
  } catch (err) { /* if the bubble cannot move, it still shows where it is */ }
  // talking in its sleep: mumbly and slow
  bubble.textContent = pet.classList.contains('x-zzz') ? L.sleepTalk(line) : line;
  bubble.hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(function () { bubble.hidden = true; }, ms || 1500);
}
/**
 * The current personality's line for a moment (see `voice` in personalities.js).
 * @param {string} key
 * @param {string[]} fallback
 * @param {Object<string, string>} [vars]
 * @returns {string}
 */
function line(key, fallback, vars) { return L.voiceLine(personality(), key, fallback, vars); }
/** Says the personality's line for a moment; a two-part line comes in two bubbles. */
function talk(key, fallback, ms, vars) {
  var parts = line(key, fallback, vars).split('\n');
  say(parts[0], ms, true);
  if (parts[1]) setTimeout(function () { say(parts[1], ms, true); }, (ms || 1500) + 150);
}
/**
 * @template T
 * @param {T[]} list
 * @returns {T} A random entry.
 */
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
/**
 * @param {number} ms
 * @returns {Promise<void>} Resolves after ms milliseconds.
 */
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/** @returns {{x: number, y: number}} The pet's mouth in viewport coordinates (a bird's beak sits higher than a mouth). */
function mouthPoint() {
  var r = petSvg.getBoundingClientRect();
  return { x: r.left + r.width * (80 / 160), y: r.top + r.height * ((pet.classList.contains('beaked') ? 100 : 107) / 150) };
}
/** Makes a sheet as tall as it can be while still leaving the pet's face in view: it opens to just below the pet's mouth. */
function sheetUnderMouth(dlg) {
  var dock = document.querySelector('.dock'), room = innerHeight - (dock ? dock.offsetHeight : 64) - (mouthPoint().y + 16);
  dlg.style.setProperty('--sheet-h', Math.max(240, Math.round(room)) + 'px');
}
/** @returns {{x: number, y: number}} A spot at the pet's side, where non-food gets tucked away. */
function sidePoint() {
  var r = petSvg.getBoundingClientRect();
  return { x: r.left + r.width * 0.92, y: r.top + r.height * 0.7 };
}
/**
 * @param {DOMRect} rect
 * @returns {{x: number, y: number}} The middle of the rectangle.
 */
function center(rect) { return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }

/**
 * Flies an emoji along an arc from one point to another.
 * @param {string} emoji
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @param {{duration?: number, lift?: number, scaleFrom?: number, scaleTo?: number, spin?: number, size?: number}} [opts]  size: the emoji's width in px (34 by default).
 * @returns {Promise<void>} Resolves when it lands.
 */
function fly(emoji, from, to, opts) {
  opts = opts || {};
  var el = emojiImg(emoji, '');
  el.className = 'flyer';
  document.body.appendChild(el);
  var size = opts.size || 34, half = size / 2;
  el.style.width = el.style.height = size + 'px';
  var duration = reduceMotion ? 1 : (opts.duration || 600);
  var lift = opts.lift != null ? opts.lift : Math.max(60, Math.abs(to.y - from.y) * 0.35 + 50);
  var frames = [];
  for (var i = 0; i <= 12; i++) {
    var t = i / 12;
    var x = from.x + (to.x - from.x) * t - half;
    var y = from.y + (to.y - from.y) * t - lift * 4 * t * (1 - t) - half;
    var s = (opts.scaleFrom || 1) + ((opts.scaleTo != null ? opts.scaleTo : 0.55) - (opts.scaleFrom || 1)) * t;
    frames.push({ transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + (t * (opts.spin || 200)) + 'deg) scale(' + s + ')' });
  }
  var anim = el.animate(frames, { duration: duration, easing: 'cubic-bezier(.35,.1,.45,1)', fill: 'forwards' });
  return anim.finished.then(function () { el.remove(); }, function () { el.remove(); });
}

/**
 * Sprinkles a few crumbs around a point after a bite.
 * @param {{x: number, y: number}} at
 * @param {string} color
 * @param {number} n How many crumbs.
 */
function crumbs(at, color, n) {
  if (reduceMotion) return;
  for (var i = 0; i < n; i++) {
    var c = document.createElement('span');
    c.className = 'crumb';
    c.style.background = color;
    document.body.appendChild(c);
    var a = Math.PI * (1.1 + Math.random() * 0.8);
    var d = 18 + Math.random() * 26;
    var dx = Math.cos(a) * d * (Math.random() < .5 ? -1 : 1), dy = Math.sin(a) * d;
    c.animate([
      { transform: 'translate(' + at.x + 'px,' + at.y + 'px) scale(1)', opacity: 1 },
      { transform: 'translate(' + (at.x + dx) + 'px,' + (at.y + dy + 30) + 'px) scale(.4)', opacity: 0 }
    ], { duration: 520 + Math.random() * 200, easing: 'ease-out' }).finished.then(c.remove.bind(c));
  }
}
/**
 * Floats a few little symbols up from a point and fades them out. They only slide and fade.
 * @param {string[]} chars The symbols to pick from, e.g. hearts and sparkles.
 * @param {{x: number, y: number}} at
 * @param {number} n How many.
 */
function drift(chars, at, n) {
  if (reduceMotion) return;
  for (var i = 0; i < n; i++) {
    var el = document.createElement('span');
    el.className = 'note';
    el.textContent = pick(chars);
    document.body.appendChild(el);
    var x = at.x + (Math.random() - 0.5) * 70, y = at.y + (Math.random() - 0.5) * 20;
    var dx = (Math.random() - 0.5) * 24;
    el.animate([
      { transform: 'translate(' + x + 'px,' + y + 'px)', opacity: 0 },
      { transform: 'translate(' + (x + dx / 2) + 'px,' + (y - 14) + 'px)', opacity: 1, offset: 0.25 },
      { transform: 'translate(' + (x + dx) + 'px,' + (y - 48) + 'px)', opacity: 0 }
    ], { duration: 1300 + Math.random() * 500, delay: i * 160, easing: 'ease-out', fill: 'both' }).finished.then(el.remove.bind(el), el.remove.bind(el));
  }
}
var CRUMB_COLORS = { fruit: '#ffd77a', veg: '#9ed99a', sweets: '#c99a7c', spicy: '#ff8b7a', drink: '#a9dcff', baked: '#f1c48d', dairy: '#fff3d6', protein: '#e7a598', pantry: '#f6cf86', mystery: '#ffb3c6', nonfood: '#d6cde0' };

// sakura-style petals drifting down for the all-done celebration
var PETAL_COLORS = ['#ffc1d0', '#ffd9e2', '#ffe9a8', '#c7ead6'];
/**
 * Sends pastel petals up and drifting down, for the all-done celebration.
 * @param {{x: number, y: number}} at
 * @param {number} n How many petals.
 */
function petals(at, n) {
  for (var i = 0; i < n; i++) {
    var p = document.createElement('span');
    p.className = 'petal';
    p.style.background = PETAL_COLORS[i % PETAL_COLORS.length];
    document.body.appendChild(p);
    var dx = (Math.random() - 0.5) * 260, up = 40 + Math.random() * 70, fall = 140 + Math.random() * 120;
    var spin = (Math.random() - 0.5) * 720;
    p.animate([
      { transform: 'translate(' + at.x + 'px,' + at.y + 'px) rotate(0) scale(.4)', opacity: 1 },
      { transform: 'translate(' + (at.x + dx * 0.6) + 'px,' + (at.y - up) + 'px) rotate(' + spin / 2 + 'deg) scale(1)', opacity: 1, offset: 0.35 },
      { transform: 'translate(' + (at.x + dx) + 'px,' + (at.y - up + fall) + 'px) rotate(' + spin + 'deg) scale(.9)', opacity: 0 }
    ], { duration: 1800 + Math.random() * 600, easing: 'ease-out' }).finished.then(p.remove.bind(p));
  }
}
