(function () {
  'use strict';

  var STORE_KEY = 'nibble.v1';
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- state ----------
  // The rules (matching, moods, list order, sounds) live in logic.js as PetLogic.
  var L = PetLogic;
  var nextId = Date.now();
  /** @returns {string} A new unique item id. */
  function newId() { return String(nextId++); }
  var state = load();

  /** Reads saved state from the phone, or starts fresh with the sample list. */
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { /* storage blocked */ }
    return L.parseState(raw, newId);
  }
  /** Saves the whole state on the phone. Fails quietly if storage is blocked. */
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }

  /**
   * Makes an <img> for an emoji from the bundled OpenMoji set.
   * @param {string} emoji
   * @param {string} [alt] Alt text; defaults to the emoji itself.
   * @returns {HTMLImageElement}
   */
  function emojiImg(emoji, alt) {
    var img = document.createElement('img');
    img.src = Foods.emojiFile(emoji);
    img.alt = alt || emoji;
    img.draggable = false;
    return img;
  }
  /**
   * @template T
   * @param {T[]} list Things with an `id`.
   * @param {string} id
   * @returns {?T} The entry with this id, or null.
   */
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  /**
   * A small inline drawing for a button or the room.
   * @param {string} view The viewBox.
   * @param {string} inner SVG markup.
   * @returns {SVGSVGElement}
   */
  function svgIcon(view, inner) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', view);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = inner;
    return svg;
  }
  /**
   * Opens a sheet as a modal, or plainly where <dialog> isn't supported.
   * @param {HTMLDialogElement} d
   */
  function openDialog(d) { sound('open'); if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }

  // ---------- pet menu ----------
  // Dress up, Edit pet and Goals sit in one drop-down; it closes when you pick one,
  // tap anywhere else or press Escape.
  (function () {
    var btn = document.getElementById('petMenuBtn'), menu = document.getElementById('petMenu');
    function setOpen(open, focusFirst) {
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && focusFirst) menu.querySelector('.menu-item').focus();
    }
    btn.addEventListener('click', function (e) { sound(menu.hidden ? 'tap' : 'close'); setOpen(menu.hidden, e.detail === 0); });
    menu.addEventListener('click', function (e) { if (e.target.closest('.menu-item')) setOpen(false); });
    document.addEventListener('pointerdown', function (e) {
      if (!menu.hidden && !e.target.closest('.stage-tools')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); }
    });
  })();

  // ---------- elements ----------
  var $ = function (id) { return document.getElementById(id); };
  var pet = $('pet'), petSvg = pet.querySelector('.pet-svg'), bubble = $('bubble'), todoEl = $('todo'), doneEl = $('done');
  var addForm = $('addForm'), addInput = $('addInput'), addPreview = $('addPreview');
  var eatenSection = $('eatenSection'), eatenCount = $('eatenCount'), emptyHint = $('emptyHint');
  var tally = $('tally'), quietBtn = $('quietBtn'), clearBtn = $('clearBtn');
  var picker = $('picker'), pickerGrid = $('pickerGrid'), pickerName = $('pickerName'), deleteBtn = $('deleteBtn');

  // ---------- rendering ----------
  var freshIds = {};
  // rows that haven't changed are kept between renders, so ticking one thing off
  // doesn't rebuild every row and reload every emoji
  var rows = {};

  /** Redraws both lists, the tally and the empty hint from state. */
  function render() {
    var todo = state.items.filter(function (i) { return !i.done; });
    var done = state.items.filter(function (i) { return i.done; });
    var kept = {};
    function rowFor(item) {
      var key = (item.done ? 1 : 0) + item.emoji + '|' + item.text;
      var old = rows[item.id];
      var li = old && old.key === key && !freshIds[item.id] ? old.li : row(item);
      kept[item.id] = { key: key, li: li };
      return li;
    }
    todoEl.replaceChildren.apply(todoEl, todo.map(rowFor));
    doneEl.replaceChildren.apply(doneEl, done.map(rowFor));
    rows = kept;
    eatenSection.hidden = done.length === 0;
    eatenCount.textContent = '(' + done.length + ')';
    emptyHint.hidden = state.items.length > 0;
    tally.textContent = state.items.length ? done.length + ' of ' + state.items.length + ' eaten' : '';
    quietBtn.setAttribute('aria-pressed', state.quiet ? 'true' : 'false');
    renderCart(done);
    freshIds = {};
    if (!busy) settle();
  }

  var cartEl = $('cart'), cartLoad = $('cartLoad'), cartCount = 0;
  /**
   * Shows the pet's shopping cart once something is ticked off, with the last
   * few things it picked up peeking out.
   * @param {Item[]} done The eaten items.
   */
  function renderCart(done) {
    cartEl.hidden = done.length === 0;
    var shown = done.slice(-3).map(function (i) { return i.emoji; }).join('');
    if (cartLoad.dataset.shown !== shown) {
      cartLoad.replaceChildren.apply(cartLoad, done.slice(-3).map(function (i) { return emojiImg(i.emoji, ''); }));
      cartLoad.dataset.shown = shown;
    }
    if (done.length > cartCount && cartCount > 0) {
      cartEl.classList.remove('bump'); void cartEl.offsetWidth; cartEl.classList.add('bump');
    }
    cartCount = done.length;
  }

  /**
   * Builds one list row: check button, emoji button and text.
   * @param {Item} item
   * @returns {HTMLLIElement}
   */
  function row(item) {
    var li = document.createElement('li');
    li.className = 'item' + (item.done ? ' done' : '') + (freshIds[item.id] ? ' new' : '');
    li.dataset.id = item.id;

    var check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.setAttribute('aria-label', (item.done ? 'Put back ' : 'Check off ') + item.text);
    check.setAttribute('aria-pressed', item.done ? 'true' : 'false');

    var eb = document.createElement('button');
    eb.type = 'button';
    eb.className = 'emoji-btn';
    eb.setAttribute('aria-label', 'Change emoji for ' + item.text);
    eb.appendChild(emojiImg(item.emoji, ''));

    var text = document.createElement('span');
    text.className = 'item-text';
    text.textContent = item.text;

    li.append(check, eb, text);
    return li;
  }

  /**
   * @param {string} id
   * @returns {?Item} The list item with this id, or null.
   */
  function find(id) {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i];
    return null;
  }
  /**
   * Where an item's emoji is on screen, so a flying emoji can start or land there.
   * @param {string} id
   * @returns {?DOMRect}
   */
  function rowEmojiRect(id) {
    var el = document.querySelector('.item[data-id="' + id + '"] .emoji-btn');
    return el ? el.getBoundingClientRect() : null;
  }

  // ---------- Nibble ----------
  // eyes, mouth, arm pose and extras for each mood
  var FACES = {
    sleepy: { eyes: 'closed', mouth: 'o', arms: 'rest', x: ['zzz'] },
    curious: { eyes: 'open', mouth: 'smile', arms: 'idle', x: [] },
    happy: { eyes: 'open', mouth: 'smile', arms: 'idle', x: ['cheeks'] },
    stuffed: { eyes: 'closed', mouth: 'smile', arms: 'rest', x: ['zzz', 'cheeks'] },
    catching: { eyes: 'open', mouth: 'open', arms: 'reach', x: [] },
    sheepish: { eyes: 'closed', mouth: 'wavy', arms: 'cover', x: ['sweat', 'cheeks'] },
    wake: { eyes: 'happy', mouth: 'open', arms: 'reach', x: ['sparkles'] },
    party: { eyes: 'happy', mouth: 'open', arms: 'pat', x: ['hearts', 'sparkles', 'cheeks'] },
    tada: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] },
    suspicious: { eyes: 'squint', mouth: 'wavy', arms: 'scratch', x: ['question'] },
    love: { eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['hearts', 'cheeks'] },
    dreamy: { eyes: 'happy', mouth: 'smile', arms: 'rest', x: ['cheeks'] }
  };
  var CHEW = { eyes: 'happy', mouth: 'chew', arms: 'nom', x: ['cheeks'] };
  var REACTIONS = {
    fruit: { face: { eyes: 'happy', mouth: 'chew', arms: 'cheer', x: ['hearts', 'cheeks'] }, lines: ['so juicy!', 'fruity ♡', 'yum yum!', 'amai~ (sweet!)'] },
    veg: { face: { eyes: 'teary', mouth: 'wavy', arms: 'clench', x: [] }, then: CHEW, lines: ['b-brave face…', 'crunchy. fine!', 'for my health…', 'okay… not bad'] },
    sweets: { face: { eyes: 'sparkle', mouth: 'chew', arms: 'cheer', x: ['sparkles', 'cheeks'] }, lines: ['kira kira!', 'treat time ♡', 'SUGAR!', 'one more?'] },
    spicy: { face: { eyes: 'squint', mouth: 'open', arms: 'fan', x: ['steam', 'redface', 'shock'] }, lines: ['HOT HOT HOT', 'hii~ spicy!', 'fire! fire!', 'water?!'] },
    drink: { face: { eyes: 'happy', mouth: 'o', arms: 'hold', x: ['cheeks'] }, lines: ['gokun gokun', 'sluuurp', 'refreshing!', 'puhaa~'] },
    baked: { face: { eyes: 'happy', mouth: 'chew', arms: 'nom', x: ['cheeks'] }, lines: ['fuwa fuwa ♡', 'warm & chewy', 'carbs!', 'mmm, bready'] },
    dairy: { face: CHEW, lines: ['creamy ♡', 'mogu mogu', 'MORE?', 'so smooth'] },
    protein: { face: CHEW, lines: ['mogu mogu', 'strong snack!', 'tasty!', 'MORE?'] },
    pantry: { face: CHEW, lines: ['mogu mogu', 'tiny snack!', 'ooh, yum', 'paku!'] },
    nonfood: { face: { eyes: 'confused', mouth: 'wavy', arms: 'scratch', x: ['question'] }, lines: ["that's not food", 'hmm… for later', 'tuck it away'] },
    mystery: { face: { eyes: 'sparkle', mouth: 'chew', arms: 'cheer', x: ['sparkles', 'cheeks'] }, lines: ['a surprise?!', 'mystery snack!', 'what was that?'] }
  };

  var busy = 0;

  /** @returns {string} The pet's resting mood for the current list. */
  function baseState() { return L.mood(state.items); }
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
    setFace(FACES[s]);
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
  }

  var bubbleTimer;
  /**
   * Shows a speech bubble, unless quiet mode is on.
   * @param {string} text
   * @param {number} [ms=1500] How long it stays.
   * @param {boolean} [own] Already in the personality's voice (from `line`), so not restyled.
   */
  function say(text, ms, own) {
    if (state.quiet || !state.settings.bubbles || !text) return;
    bubble.hidden = true;
    void bubble.offsetWidth;
    var line = own ? text : L.styleLine(personality(), text);
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

  /** @returns {{x: number, y: number}} The pet's mouth in viewport coordinates. */
  function mouthPoint() {
    var r = petSvg.getBoundingClientRect();
    return { x: r.left + r.width * (80 / 160), y: r.top + r.height * (107 / 150) };
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
   * @param {{duration?: number, lift?: number, scaleFrom?: number, scaleTo?: number, spin?: number}} [opts]
   * @returns {Promise<void>} Resolves when it lands.
   */
  function fly(emoji, from, to, opts) {
    opts = opts || {};
    var el = emojiImg(emoji, '');
    el.className = 'flyer';
    document.body.appendChild(el);
    var size = 34, half = size / 2;
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

  // ---------- sound + haptics ----------
  /**
   * Plays an eating sound unless quiet mode is on.
   * @param {string} kind A Sounds.play kind, e.g. "glug".
   */
  function sound(kind) { if (!state.quiet && state.settings.sounds) Sounds.play(kind); }
  // phones only allow audio that starts from a tap, so wake the audio engine on the first one
  document.addEventListener('pointerdown', function unlockAudio() {
    Sounds.unlock();
    document.removeEventListener('pointerdown', unlockAudio, true);
  }, true);
  /**
   * A short vibration on phones that support it.
   * @param {number|number[]} ms
   */
  function buzz(ms) { try { if (state.settings.vibration && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  // ---------- the eating queue ----------
  // Taps update the list at once; Nibble works through what you checked in order.
  var queue = Promise.resolve();
  var pending = 0;
  /**
   * Adds an animation job to the eating queue. Taps update the list at once; the pet works through the jobs in order.
   * @param {function(): Promise<*>} job
   */
  function enqueue(job) {
    pending++;
    busy++;
    queue = queue.then(job).catch(function (e) { console.error(e); }).then(function () {
      pending--;
      busy--;
      if (!busy) settle();
    });
  }
  /** @returns {number} An animation speed factor; faster when several items are waiting. */
  function speed() { return pending > 4 ? 0.4 : pending > 2 ? 0.6 : 1; }

  /**
   * Queues the eating animation for a checked item: hop, chomp, reaction and sound.
   * @param {Item} item
   * @param {?DOMRect} fromRect Where the item's emoji was before the list re-rendered.
   * @param {?Object} [goals] What recordEaten counted, for the progress toast and unlock cheer.
   */
  function eat(item, fromRect, goals) {
    enqueue(function () {
      var sp = speed();
      var nonfood = item.cat === 'nonfood';
      setFace(FACES.catching);
      var to = nonfood ? sidePoint() : mouthPoint();
      return fly(item.emoji, center(fromRect), to, { duration: 600 * sp, scaleTo: nonfood ? 0.15 : 0.5 }).then(function () {
        var r = REACTIONS[item.cat] || REACTIONS.pantry;
        setFace(r.face);
        if (!nonfood) {
          pulse('chomp', 300);
          crumbs(mouthPoint(), CRUMB_COLORS[item.cat] || '#e8b04a', 7);
        }
        sound(L.soundFor(item));
        // shop items that aren't food get a comment in the personality's voice
        if (nonfood) talk(Foods.kindOf(item.emoji), r.lines, 1400);
        else say(pick(r.lines), 1400);
        if (goals) goalToast(goals);
        var hold = 750 * sp;
        if (r.then) return wait(hold / 2).then(function () { setFace(r.then); return wait(hold / 2); });
        return wait(hold);
      }).then(function () {
        if (!nonfood && isFavourite(item)) {
          // its favourite kind of food: hearts and a happy wiggle
          setFace(FACES.love);
          pulse('hop', 460);
          say(L.styleLine(personality(), pick(personality().lines), null, true), 1300);
          return wait(800 * sp);
        }
      }).then(function () {
        if (goals && goals.blocked === 'too-fast' && state.settings.fairPlayTips) {
          // a playful nudge rather than a telling-off
          setFace(FACES.suspicious);
          talk('quick', ['did you really buy that?', 'hmm, that was quick…', 'straight from the list?'], 1600);
          return wait(1100 * sp);
        }
      }).then(function () {
        if (goals && goals.unlocked.length) return cheerUnlocks(goals.unlocked);
      }).then(function () {
        if (pending === 1 && baseState() === 'stuffed') return celebrate();
      });
    });
  }

  /**
   * Queues the spit-back animation for an item that was put back on the list.
   * @param {Item} item
   */
  function spitBack(item) {
    enqueue(function () {
      setFace(FACES.catching);
      pulse('spit', 360);
      sound('spit');
      var rect = rowEmojiRect(item.id);
      var btn = rect && document.querySelector('.item[data-id="' + item.id + '"] .emoji-btn');
      if (btn) btn.classList.add('gone');
      var to = rect ? center(rect) : { x: innerWidth / 2, y: innerHeight - 40 };
      var p = fly(item.emoji, mouthPoint(), to, { duration: 520, scaleFrom: 0.5, scaleTo: 1, spin: -160, lift: 40 });
      setTimeout(function () { setFace(FACES.sheepish); talk('spit', ['oops, sorry', 'spit! my bad', 'not yet? ok', 'ptoo!'], 1400); }, 200);
      return p.then(function () {
        if (btn) btn.classList.remove('gone');
        return wait(700);
      });
    });
  }

  /**
   * The all-done moment: belly pat, jingle, emoji confetti and petals.
   * @returns {Promise<void>}
   */
  function celebrate() {
    var eaten = state.items.filter(function (i) { return i.done; }).map(function (i) { return i.emoji; });
    setFace(FACES.party);
    pulse('pat', 1700);
    sound('party');
    talk('full', ['so full! thank you!', 'best trip ever!', '*happy belly pat*'], 2200);
    buzz([20, 60, 20]);
    if (!reduceMotion) {
      var from = mouthPoint();
      eaten.slice(0, 14).forEach(function (e, i) {
        var a = (Math.PI * 2 * i) / Math.min(eaten.length, 14) + Math.random() * 0.4;
        var d = 80 + Math.random() * 60;
        var el = emojiImg(e, ''); el.className = 'confetti';
        document.body.appendChild(el);
        el.animate([
          { transform: 'translate(' + (from.x - 11) + 'px,' + (from.y - 11) + 'px) scale(.3)', opacity: 1 },
          { transform: 'translate(' + (from.x - 11 + Math.cos(a) * d) + 'px,' + (from.y - 11 + Math.sin(a) * d * 0.6 + 20) + 'px) scale(1) rotate(' + (Math.random() * 360) + 'deg)', opacity: 1, offset: 0.6 },
          { transform: 'translate(' + (from.x - 11 + Math.cos(a) * d * 1.1) + 'px,' + (from.y + Math.sin(a) * d * 0.6 + 120) + 'px) scale(.8)', opacity: 0 }
        ], { duration: 1400, easing: 'ease-out' }).finished.then(el.remove.bind(el));
      });
      petals(from, 16);
    }
    return wait(2400);
  }

  // ---------- list actions ----------
  /**
   * Adds a typed item to the to-buy list and lets the pet react.
   * @param {string} text
   */
  function addItem(text) {
    text = text.trim();
    if (!text) return;
    var item = L.createItem(text, state.overrides, newId(), Date.now());
    L.addToList(state.items, item);
    freshIds[item.id] = true;
    save();
    render();
    if (!busy) {
      pulse('hop', 460);
      var face = item.cat === 'nonfood' ? null : FACES.catching;
      if (face) { setFace(face); setTimeout(function () { if (!busy) settle(); }, 500); }
    }
    say(item.cat === 'mystery' ? 'ooh, mystery!' : pick(['ooh!', 'for me?', 'yes please', 'noted!', 'yum?']), 1100);
  }

  /**
   * The item as the goal rules should see it. With the dev menu's "skip the
   * 15-minute wait" on, it looks like it has been on the list for ages.
   * @param {Item} item
   * @returns {Item}
   */
  function rulesItem(item) {
    if (!state.dev.noWait) return item;
    var copy = {};
    Object.keys(item).forEach(function (k) { if (k !== 'added') copy[k] = item[k]; });
    return copy;
  }

  /**
   * Checks an item off (the pet eats it) or puts it back (the pet spits it out).
   * @param {string} id
   */
  function toggle(id) {
    var fromRect = rowEmojiRect(id);
    var result = L.toggleDone(state.items, id);
    var item = result.item;
    if (!item) return;
    state.items = result.items;
    freshIds[item.id] = true;
    var now = new Date(), goals = null;
    if (item.done) {
      var openBefore = Personalities.filter(personalityOpen);
      goals = L.recordEaten(state.pet, rulesItem(item), now, Achievements);
      item.counted = goals.counted;
      item.countedDay = L.dayKey(now);
      item.tasted = L.recordTaste(state.pet, rulesItem(item), now);
      // personalities this bite just earned are cheered like other unlocks
      Personalities.filter(personalityOpen).forEach(function (p) {
        if (openBefore.indexOf(p) === -1) goals.unlocked.push({ icon: p.icon, unlocks: { kind: 'personality', id: p.id, label: p.label } });
      });
      if (L.mood(state.items) === 'stuffed') {
        var trip = L.recordTrip(state.pet, state.items.map(rulesItem), now, Achievements);
        goals.counted = goals.counted.concat(trip.counted);
        goals.capped = goals.capped.concat(trip.capped);
        goals.unlocked = goals.unlocked.concat(trip.unlocked);
      }
    } else {
      // putting it back takes today's count back, so ticking on and off can't farm goals
      L.refundEaten(state.pet, item, now, Achievements);
      if (item.tasted) L.refundTaste(state.pet, item);
      delete item.tasted;
      delete item.counted;
      delete item.countedDay;
    }
    buzz(12);
    save();
    render();
    if (item.done) eat(item, fromRect, goals);
    else spitBack(item);
  }

  /**
   * Deletes an item from the list.
   * @param {string} id
   */
  function removeItem(id) {
    state.items = state.items.filter(function (i) { return i.id !== id; });
    save();
    render();
  }

  /**
   * Applies an emoji picked in the picker and remembers it for that word.
   * @param {string} id
   * @param {string} emoji
   */
  function setEmoji(id, emoji) {
    if (!L.pickEmoji(state, id, emoji)) return;
    save();
    render();
    if (!busy) { pulse('hop', 460); say('ooh, new look!', 1100); }
  }

  // ---------- picker ----------
  var pickerFor = null;
  pickerGrid.append.apply(pickerGrid, Foods.all.map(function (e) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.emoji = e;
    b.setAttribute('aria-label', e);
    b.appendChild(emojiImg(e, ''));
    return b;
  }));
  /**
   * Opens the emoji picker for one item.
   * @param {string} id
   */
  function openPicker(id) {
    var item = find(id);
    if (!item) return;
    pickerFor = id;
    pickerName.textContent = '“' + item.text + '”';
    pickerGrid.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.emoji === item.emoji ? 'true' : 'false');
    });
    openDialog(picker);
  }
  /** Closes the emoji picker. */
  function closePicker() { if (picker.close) picker.close(); else picker.removeAttribute('open'); pickerFor = null; }
  pickerGrid.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !pickerFor) return;
    var id = pickerFor;
    closePicker();
    sound('pick');
    setEmoji(id, b.dataset.emoji);
  });
  deleteBtn.addEventListener('click', function () {
    var id = pickerFor;
    closePicker();
    if (id) { sound('remove'); removeItem(id); }
  });
  picker.addEventListener('click', function (e) { if (e.target === picker) closePicker(); });

  // ---------- your pet: name and species ----------
  var SPECIES = [
    { id: 'mochi', label: 'Mochi' },
    { id: 'pig', label: 'Pig' },
    { id: 'kitty', label: 'Cat' },
    { id: 'puppy', label: 'Dog' },
    { id: 'bunny', label: 'Bunny' },
    { id: 'chick', label: 'Chick' },
    { id: 'cow', label: 'Cow' },
    { id: 'hamster', label: 'Hamster' },
    { id: 'penguin', label: 'Penguin' }
  ];
  var petSheet = $('petSheet'), petNameInput = $('petNameInput'), speciesGrid = $('speciesGrid');

  /** @returns {string} The pet's name, or "Nibble" if it is blank. */
  function petName() { return (state.pet.name || '').trim() || 'Nibble'; }
  /** Shows the pet's name, species and outfit everywhere on the page. */
  function applyPet() {
    var name = petName();
    pet.dataset.species = state.pet.species;
    pet.classList.toggle('beaked', L.isBird(state.pet.species));
    pet.setAttribute('aria-label', name + ', your pet');
    document.querySelectorAll('.pet-name').forEach(function (el) { el.textContent = name; });
    document.title = name + "'s List";
    dressUp(pet, state.pet.outfit);
    speciesGrid.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.species === state.pet.species ? 'true' : 'false');
    });
  }

  /** @returns {SVGSVGElement} A copy of the pet drawing for a button or the dressing room. */
  function petCopy() {
    var copy = petSvg.cloneNode(true);
    copy.querySelectorAll('defs').forEach(function (d) { d.remove(); });
    return copy;
  }
  // species buttons show a small static copy of the pet
  SPECIES.forEach(function (sp) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.species = sp.id;
    var mini = document.createElement('div');
    mini.className = 'pet mini x-cheeks' + (L.isBird(sp.id) ? ' beaked' : '');
    mini.dataset.species = sp.id;
    mini.dataset.eyes = 'open';
    mini.dataset.mouth = 'smile';
    mini.dataset.arms = 'rest';
    mini.appendChild(petCopy());
    var label = document.createElement('span');
    label.textContent = sp.label;
    b.append(mini, label);
    speciesGrid.appendChild(b);
  });
  speciesGrid.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (!unlocked('species', b.dataset.species)) { lockHint(speciesHint, 'species', b.dataset.species); return; }
    speciesHint.hidden = true;
    sound('pick');
    state.pet.species = b.dataset.species;
    save();
    applyPet();
    if (!busy) { setFace(FACES.tada); pulse('hop', 500); setTimeout(function () { if (!busy) settle(); }, 900); }
  });
  // The name shows as text; a double-tap (or Enter) turns it into a box to type in,
  // so opening the sheet doesn't pop up the phone keyboard.
  var petNameShow = $('petNameShow'), lastNameTap = 0;
  function showName() {
    $('petNameText').textContent = petName();
    petNameInput.hidden = true;
    petNameShow.hidden = false;
  }
  function startRename() {
    petNameInput.value = state.pet.name || '';
    petNameShow.hidden = true;
    petNameInput.hidden = false;
    petNameInput.focus();
    petNameInput.select();
  }
  function finishRename(keep) {
    if (petNameInput.hidden) return;
    if (keep) {
      state.pet.name = L.cleanName(petNameInput.value, petName());
      save();
      applyPet();
    }
    showName();
    petNameShow.focus();
  }
  petNameShow.addEventListener('click', function (e) {
    var now = Date.now();
    // detail is 0 for keyboard clicks (Enter or Space): rename straight away
    if (e.detail === 0 || L.isDoubleTap(lastNameTap, now)) { lastNameTap = 0; startRename(); return; }
    lastNameTap = now;
    petNameShow.classList.remove('nudge'); void petNameShow.offsetWidth; petNameShow.classList.add('nudge');
  });
  petNameShow.addEventListener('dblclick', function (e) { e.preventDefault(); if (petNameInput.hidden) startRename(); });
  petNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); finishRename(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishRename(false); }
  });
  petNameInput.addEventListener('blur', function () { finishRename(true); });
  $('editPetBtn').addEventListener('click', function () {
    showName();
    lastNameTap = 0;
    refreshLocks();
    applyPet();
    openDialog(petSheet);
  });
  petSheet.addEventListener('close', function () {
    finishRename(true);
    state.pet.name = petName();
    save();
    applyPet();
    if (!busy) { pulse('hop', 500); talk('name', ["I'm {name}!"], 1500, { name: petName() }); }
  });
  petSheet.addEventListener('click', function (e) { if (e.target === petSheet) petSheet.close(); });

  // ---------- dressing room ----------
  /**
   * @param {string} id
   * @returns {?Object} The wardrobe item with this id, or null (e.g. for "none").
   */
  function wardrobeItem(id) { return byId(Wardrobe, id); }
  /**
   * Draws an outfit into a pet drawing: hats on the head, body items (hoodies) over the whole pet.
   * @param {Element} el A .pet element.
   * @param {{hat: string}} outfit
   */
  function dressUp(el, outfit) {
    var item = wardrobeItem(outfit.hat);
    var body = !!(item && item.layer === 'body');
    var face = wardrobeItem(outfit.face);
    el.querySelector('.outfit-hat').innerHTML = item && !body ? item.svg : '';
    el.querySelector('.outfit-body').innerHTML = item && body ? item.svg : '';
    el.querySelector('.outfit-face').innerHTML = face ? face.svg : '';
    el.classList.toggle('hooded', !!(item && item.hood));
    el.classList.toggle('snug', !!(item && item.snug));
  }

  var dressSheet = $('dressSheet'), dressPreview = $('dressPreview'), hatStrip = $('hatStrip'), faceStrip = $('faceStrip');
  // one strip per slot: hats (and hoodies) on the head, glasses on the face
  [{ slot: 'hat', strip: hatStrip, none: 'Nothing' }, { slot: 'face', strip: faceStrip, none: 'No glasses' }].forEach(function (row) {
    [{ id: 'none', label: row.none }].concat(Wardrobe.filter(function (w) { return w.slot === row.slot; })).forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.hat = item.id;
      b.dataset.slot = row.slot;
      var icon = item.id === 'none'
        ? svgIcon('0 0 40 40', '<circle class="hat-none" cx="20" cy="20" r="12"/><path class="hat-none" d="M11.5 28.5 L28.5 11.5"/>')
        : svgIcon(item.icon || '32 2 96 60', item.svg);
      var label = document.createElement('span');
      label.textContent = item.label;
      b.append(icon, label);
      row.strip.appendChild(b);
    });
  });
  /** Every wardrobe button, hats and glasses. */
  function wearButtons() { return dressSheet.querySelectorAll('#hatStrip button, #faceStrip button'); }
  /** Marks the chosen hat and glasses in the dressing room and updates its preview. */
  function refreshDressRoom() {
    wearButtons().forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.hat === state.pet.outfit[b.dataset.slot] ? 'true' : 'false');
    });
    var view = dressPreview.querySelector('.pet');
    if (view) dressUp(view, state.pet.outfit);
  }
  $('dressBtn').addEventListener('click', function () {
    // a live copy of the pet to try things on
    var view = document.createElement('div');
    view.className = 'pet preview x-cheeks' + (L.isBird(state.pet.species) ? ' beaked' : '');
    view.dataset.species = state.pet.species;
    view.dataset.state = 'curious';
    view.dataset.eyes = 'open';
    view.dataset.mouth = 'smile';
    view.dataset.arms = 'idle';
    view.appendChild(petCopy());
    dressPreview.replaceChildren(view);
    refreshLocks();
    refreshDressRoom();
    openDialog(dressSheet);
  });
  function onWearClick(e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (!unlocked('hat', b.dataset.hat)) { lockHint(hatHint, 'hat', b.dataset.hat); return; }
    hatHint.hidden = true;
    state.pet.outfit[b.dataset.slot] = b.dataset.hat;
    save();
    refreshDressRoom();
    dressUp(pet, state.pet.outfit);
    sound(b.dataset.hat !== 'none' ? 'excited' : 'tap');
    var pointed = hoveredHat === b.dataset.hat;
    if (pointed && b.dataset.hat !== 'none') dressSay(line('look', ['how do I look?', 'I love it!', 'kawaii?', 'ta-da!']), 1600, true);
    else dressSay(b.dataset.hat === 'none' ? 'fresh look!' : hatLine(b.dataset.hat), 1600);
    var view = dressPreview.querySelector('.pet');
    if (view) {
      view.dataset.mouth = 'smile';
      view.dataset.eyes = b.dataset.hat === 'none' ? 'open' : 'happy';
      // back to open eyes soon, so they can follow your finger again
      clearTimeout(sparkleTimer);
      sparkleTimer = setTimeout(function () { view.dataset.eyes = 'open'; view.dataset.arms = 'idle'; }, 900);
      view.dataset.arms = b.dataset.hat === 'none' ? 'idle' : 'cheer';
      view.classList.remove('hop'); void view.offsetWidth; view.classList.add('hop');
    }
  }
  hatStrip.addEventListener('click', onWearClick);
  faceStrip.addEventListener('click', onWearClick);
  // pointing at an unlocked outfit makes the pet react to it
  var dressBubble = $('dressBubble'), dressBubbleTimer, hoveredHat = null, lastOoh = 0;
  /**
   * Shows a line from the pet in the dressing room (skipped in quiet mode).
   * @param {string} text
   * @param {number} ms
   */
  function dressSay(text, ms, own) {
    if (state.quiet || !state.settings.bubbles) return;
    dressBubble.textContent = own ? text : L.styleLine(personality(), text);
    dressBubble.hidden = false;
    // restart the pop animation
    dressBubble.style.animation = 'none'; void dressBubble.offsetWidth; dressBubble.style.animation = '';
    clearTimeout(dressBubbleTimer);
    dressBubbleTimer = setTimeout(function () { dressBubble.hidden = true; }, ms || 1600);
  }
  /**
   * The pet's line for an outfit it is looking at.
   * @param {string} id Hat id, or "none".
   * @returns {string}
   */
  function hatLine(id) {
    var item = wardrobeItem(id);
    if (!item) return pick(['the natural look?', 'just me!', 'all natural!']);
    return pick(item.lines || ['ooh!']);
  }
  /**
   * Reacts when a finger or cursor lands on an unlocked hat that isn't being worn.
   * @param {Event} e
   */
  function onHatHover(e) {
    // a finger has no hover: on phones the tap itself gets the outfit's line
    if (e.pointerType === 'touch') return;
    var b = e.target.closest && e.target.closest('#hatStrip button, #faceStrip button');
    if (!b || b.dataset.hat === hoveredHat) return;
    hoveredHat = b.dataset.hat;
    if (!unlocked('hat', b.dataset.hat) || b.dataset.hat === state.pet.outfit[b.dataset.slot]) return;
    dressSay(hatLine(b.dataset.hat), 1600);
    var view = dressPreview.querySelector('.pet');
    if (view) sparkle(view);
    if (Date.now() - lastOoh > 500) { sound('ooh'); lastOoh = Date.now(); }
  }
  var sparkleTimer;
  /**
   * A quick sparkle-eyed "ooh" from the dressing-room pet, then its eyes go
   * back to following your finger or cursor.
   * @param {Element} view The preview pet.
   */
  function sparkle(view) {
    view.dataset.eyes = 'sparkle';
    view.dataset.mouth = 'open';
    clearTimeout(sparkleTimer);
    sparkleTimer = setTimeout(function () { view.dataset.eyes = 'open'; view.dataset.mouth = 'smile'; }, 600);
  }
  [hatStrip, faceStrip].forEach(function (strip) {
    strip.addEventListener('pointerover', onHatHover);
    strip.addEventListener('focusin', onHatHover);
    strip.addEventListener('pointerleave', onHatLeave);
  });
  function onHatLeave() {
    hoveredHat = null;
    var view = dressPreview.querySelector('.pet');
    if (view && view.dataset.eyes === 'sparkle') { view.dataset.eyes = 'open'; view.dataset.mouth = 'smile'; }
  }

  dressSheet.addEventListener('close', function () {
    dressBubble.hidden = true;
    hoveredHat = null;
    if (!busy) {
      setFace(FACES.tada); pulse('hop', 500);
      var item = wardrobeItem(state.pet.outfit.hat) || wardrobeItem(state.pet.outfit.face);
      if (item) talk('look', ['so fancy!', 'how do I look?', 'kawaii?', 'ta-da!'], 1500); else say('fresh look!', 1500);
      setTimeout(function () { if (!busy) settle(); }, 1000);
    }
  });
  dressSheet.addEventListener('click', function (e) { if (e.target === dressSheet) dressSheet.close(); });

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
    if (placed && !busy) { pulse('hop', 460); talk('room', ['so cosy!', 'home sweet home!', 'I love it here!'], 1500); }
  });
  // the room panel opens without covering the room: the stage stays visible (and draggable) above it
  var roomSheet = $('roomSheet');
  $('roomBtn').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    renderRoom();
    sound('open');
    if (roomSheet.show) roomSheet.show(); else roomSheet.setAttribute('open', '');
  });
  roomSheet.addEventListener('keydown', function (e) { if (e.key === 'Escape') roomSheet.close(); });

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

  // ---------- goals: achievements that unlock species and hats ----------
  var goalToastEl = $('goalToast'), goalsSheet = $('goalsSheet'), goalList = $('goalList');
  var speciesHint = $('speciesHint'), hatHint = $('hatHint');
  var toastTimer;
  // what the toast says when a fair-play rule stops something counting
  var FAIR_PLAY = {
    'too-fast': 'Too quick! Items count after 15 min',
    repeat: 'Already counted that today',
    clock: 'Clock went back, goals paused'
  };

  /**
   * @param {string} id
   * @returns {?Object} The achievement with this id.
   */
  function achievement(id) { return byId(Achievements, id); }
  /**
   * @param {'species'|'hat'} kind
   * @param {string} id
   * @returns {boolean} Whether that species or hat is unlocked.
   */
  function unlocked(kind, id) { return L.isUnlocked(state.pet, kind, id, Achievements, FreeUnlocks); }

  /**
   * Shows a short line under the pet: progress on a goal, or that today's share is used up.
   * Only the first matching goal is shown, so the toast stays short.
   * @param {{counted: string[], capped: string[], unlocked: Object[]}} goals
   */
  function goalToast(goals) {
    if (goals.blocked && FAIR_PLAY[goals.blocked] && !goals.counted.length) {
      // the rules still apply with tips off; they just aren't mentioned
      if (state.settings.fairPlayTips) showToast('🧺', FAIR_PLAY[goals.blocked], false, 3000);
      return;
    }
    if (!state.settings.goalToasts) return;
    var id = goals.counted[0] || goals.capped[0];
    var ach = id && achievement(id);
    if (!ach || goals.unlocked.length) return;
    var p = L.progress(state.pet, ach, new Date());
    var text = goals.counted.indexOf(id) !== -1
      ? ach.title + ' ' + p.count + '/' + p.goal + (p.today >= p.perDay ? ' · done for today' : '')
      : ach.title + ': ' + p.perDay + ' of ' + p.perDay + ' today, more tomorrow';
    showToast(ach.icon, text, false, 2200);
  }
  /**
   * @param {string} icon Emoji.
   * @param {string} text
   * @param {boolean} win Uses the golden "unlocked" look.
   * @param {number} ms How long it stays.
   */
  function showToast(icon, text, win, ms) {
    var span = document.createElement('span');
    span.textContent = text;
    goalToastEl.replaceChildren(emojiImg(icon, ''), span);
    goalToastEl.classList.toggle('win', win);
    goalToastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { goalToastEl.hidden = true; }, ms);
  }
  /**
   * The unlock moment: a cheer, a jingle and petals for each newly finished goal.
   * @param {Object[]} list Achievements that were just finished.
   * @returns {Promise<void>}
   */
  function cheerUnlocks(list) {
    return list.reduce(function (p, ach) {
      return p.then(function () {
        var u = ach.unlocks;
        setFace(FACES.tada);
        pulse('hop', 500);
        sound('party');
        buzz([20, 60, 20]);
        showToast(ach.icon, 'Unlocked: ' + u.label + '!', true, 3200);
        say(u.kind === 'species' ? 'new friend: ' + u.label + '!' : u.kind === 'personality' ? 'I feel… ' + u.label.toLowerCase() + '!' : 'new hat: ' + u.label + '!', 2200);
        if (!reduceMotion) petals(mouthPoint(), 14);
        refreshLocks();
        renderPersonalities();
        return wait(2200);
      });
    }, Promise.resolve());
  }

  /**
   * Adds or removes the lock look and progress badge on a species or hat button.
   * @param {HTMLButtonElement} b
   * @param {'species'|'hat'} kind
   * @param {string} id
   */
  function markLock(b, kind, id) {
    var open = unlocked(kind, id);
    var badge = b.querySelector('.lock-badge');
    b.classList.toggle('locked', !open);
    if (open) { if (badge) badge.remove(); b.removeAttribute('aria-description'); return; }
    var ach = L.gateFor(kind, id, Achievements);
    var p = L.progress(state.pet, ach, new Date());
    if (!badge) { badge = document.createElement('span'); badge.className = 'lock-badge'; b.appendChild(badge); }
    badge.textContent = '🔒 ' + p.count + '/' + p.goal;
    b.setAttribute('aria-description', 'Locked. ' + ach.text + '.');
  }
  /** Brings every lock in the species grid and hat strip up to date. */
  function refreshLocks() {
    speciesGrid.querySelectorAll('button').forEach(function (b) { markLock(b, 'species', b.dataset.species); });
    wearButtons().forEach(function (b) { markLock(b, 'hat', b.dataset.hat); });
  }
  /**
   * Explains how to unlock a locked species or hat.
   * @param {HTMLElement} el The hint paragraph in the open sheet.
   * @param {'species'|'hat'} kind
   * @param {string} id
   */
  function lockHint(el, kind, id) {
    sound('locked');
    var ach = L.gateFor(kind, id, Achievements);
    var p = L.progress(state.pet, ach, new Date());
    el.textContent = '🔒 ' + ach.unlocks.label + ': ' + ach.text + ' (' + p.count + '/' + p.goal + ', up to ' + p.perDay + ' a day).';
    el.hidden = false;
  }

  /** Fills the goals sheet with each achievement and where it stands. */
  function renderGoals() {
    var now = new Date();
    goalList.replaceChildren.apply(goalList, Achievements.map(function (ach) {
      var p = L.progress(state.pet, ach, now);
      var li = document.createElement('li');
      li.className = 'goal' + (p.done ? ' done' : '');
      var title = document.createElement('div');
      title.className = 'goal-title';
      var name = document.createElement('span');
      name.textContent = ach.title;
      var reward = document.createElement('span');
      reward.className = 'goal-reward';
      reward.textContent = (p.done ? '✓ ' : '🔒 ') + ach.unlocks.label;
      title.append(name, reward);
      var text = document.createElement('div');
      text.className = 'goal-text';
      text.textContent = ach.text + ', up to ' + ach.perDay + ' a day';
      var bar = document.createElement('div');
      bar.className = 'goal-bar';
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', String(p.goal));
      bar.setAttribute('aria-valuenow', String(p.count));
      bar.setAttribute('aria-label', ach.title);
      var fill = document.createElement('span');
      fill.style.width = Math.round((p.count / p.goal) * 100) + '%';
      bar.appendChild(fill);
      var meta = document.createElement('div');
      meta.className = 'goal-meta';
      var count = document.createElement('span');
      count.textContent = p.count + '/' + p.goal;
      var today = document.createElement('span');
      today.textContent = p.done ? 'Unlocked!' : p.today + ' of ' + p.perDay + ' today';
      meta.append(count, today);
      li.append(emojiImg(ach.icon, ''), title, text, bar, meta);
      return li;
    }));
  }
  $('goalsBtn').addEventListener('click', function () {
    renderGoals();
    $('goalsFairPlay').hidden = !state.settings.fairPlayTips;
    openDialog(goalsSheet);
  });
  goalsSheet.addEventListener('click', function (e) { if (e.target === goalsSheet) goalsSheet.close(); });
  petSheet.addEventListener('close', function () { speciesHint.hidden = true; });
  dressSheet.addEventListener('close', function () { hatHint.hidden = true; });

  refreshLocks();
  applyPet();

  // closing a sheet makes a soft sound; the emoji picker plays its pick or delete sound instead
  document.querySelectorAll('dialog:not(#picker)').forEach(function (d) {
    d.addEventListener('close', function () { sound('close'); });
  });

  // ---------- events ----------
  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addItem(addInput.value);
    addInput.value = '';
    addPreview.replaceChildren();
  });
  var lastPreview = '';
  addInput.addEventListener('input', function () {
    var t = addInput.value.trim();
    if (!t) { addPreview.replaceChildren(); lastPreview = ''; return; }
    var e = L.emojiFor(t, state.overrides).emoji;
    if (e !== lastPreview) { addPreview.replaceChildren(emojiImg(e, '')); lastPreview = e; }
  });

  /**
   * Handles taps on a list row: the circle checks it off, the emoji opens the picker.
   * @param {MouseEvent} e
   */
  function onListClick(e) {
    if (suppressClick) { suppressClick = false; return; }
    var li = e.target.closest('.item');
    if (!li) return;
    if (e.target.closest('.check')) toggle(li.dataset.id);
    else if (e.target.closest('.emoji-btn')) openPicker(li.dataset.id);
  }
  todoEl.addEventListener('click', onListClick);
  doneEl.addEventListener('click', onListClick);

  // long-press anywhere on a row opens the picker
  var pressTimer = null, pressStart = null, suppressClick = false, pressedRow = null;
  /** Stops a long-press that has not fired yet. */
  function cancelPress() {
    if (pressTimer) document.removeEventListener('pointermove', onPressMove);
    clearTimeout(pressTimer); pressTimer = null;
    if (pressedRow) pressedRow.classList.remove('pressing');
    pressedRow = null;
  }
  document.querySelector('.list-area').addEventListener('pointerdown', function (e) {
    var li = e.target.closest('.item');
    if (!li || e.button > 0) return;
    pressStart = { x: e.clientX, y: e.clientY };
    pressedRow = li;
    li.classList.add('pressing');
    document.addEventListener('pointermove', onPressMove, { passive: true });
    pressTimer = setTimeout(function () {
      buzz(18);
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 600);
      var id = li.dataset.id;
      cancelPress();
      openPicker(id);
    }, 500);
  });
  /** A finger that slides more than a little is scrolling, not long-pressing. */
  function onPressMove(e) {
    if (pressStart && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10) cancelPress();
  }
  ['pointerup', 'pointercancel', 'scroll'].forEach(function (ev) { document.addEventListener(ev, cancelPress, { capture: true, passive: true }); });
  document.querySelector('.list-area').addEventListener('contextmenu', function (e) { if (e.target.closest('.item')) e.preventDefault(); });

  quietBtn.addEventListener('click', function () {
    state.quiet = !state.quiet;
    sound('on');
    if (state.quiet) bubble.hidden = true;
    save();
    render();
  });
  clearBtn.addEventListener('click', function () {
    state.items = state.items.filter(function (i) { return !i.done; });
    sound('remove');
    save();
    render();
    if (!busy) { pulse('hop', 460); say(state.items.length ? 'fresh start!' : 'nap time…', 1300); }
  });

  // tap Nibble for a little reaction
  pet.addEventListener('click', function () {
    if (busy) return;
    pulse('hop', 460);
    var s = baseState();
    if (s !== 'stuffed' && Math.random() < 0.12 && offerSuggestion()) return;
    if (s === 'sleepy' || s === 'stuffed') talk('sleepy', ['zzz… snack?'], 1200);
    else talk('tap', ['hi!', 'hungry!', 'shopping?', 'hehe'], 1200);
  });

  // ---------- personalities ----------
  var personalityStrip = $('personalityStrip');
  /** @returns {Object} The pet's current personality from personalities.js. */
  function personality() { return byId(Personalities, state.pet.personality) || Personalities[0]; }
  /**
   * @param {Object} p A personality.
   * @returns {boolean} True if it has been earned.
   */
  function personalityOpen(p) { return L.personalityProgress(state.pet, p).done; }
  /**
   * @param {Item} item
   * @returns {boolean} True if the pet gets excited about it. Foodies like
   *   everything, so they only get excited now and then.
   */
  function isFavourite(item) {
    var p = personality();
    return L.likes(p, item) && (p.id !== 'foodie' || Math.random() < 0.3);
  }
  Personalities.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.personality = p.id;
    var label = document.createElement('span');
    label.textContent = p.label;
    b.append(emojiImg(p.icon, ''), label);
    personalityStrip.appendChild(b);
  });
  /**
   * Shows a personality's name and short description under the strip.
   * @param {Object} p
   */
  function describePersonality(p) {
    var info = $('personalityInfo');
    var name = document.createElement('b');
    name.textContent = p.label + ': ';
    info.replaceChildren(name, document.createTextNode(p.blurb));
  }
  personalityStrip.addEventListener('pointerover', function (e) {
    var b = e.target.closest('button');
    if (b && e.pointerType === 'mouse') describePersonality(byId(Personalities, b.dataset.personality));
  });
  personalityStrip.addEventListener('pointerleave', function () { describePersonality(personality()); });
  /** Marks the current personality and shows locks and progress on the rest. */
  function renderPersonalities() {
    describePersonality(personality());
    personalityStrip.querySelectorAll('button').forEach(function (b) {
      var p = byId(Personalities, b.dataset.personality);
      var prog = L.personalityProgress(state.pet, p);
      b.setAttribute('aria-pressed', p.id === personality().id ? 'true' : 'false');
      b.classList.toggle('locked', !prog.done);
      var badge = b.querySelector('.lock-badge');
      if (prog.done) { if (badge) badge.remove(); return; }
      if (!badge) { badge = document.createElement('span'); badge.className = 'lock-badge'; b.appendChild(badge); }
      badge.textContent = '🔒 ' + prog.count + '/' + prog.goal;
    });
  }
  personalityStrip.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var p = byId(Personalities, b.dataset.personality);
    var prog = L.personalityProgress(state.pet, p);
    describePersonality(p);
    if (!prog.done) {
      sound('locked');
      speciesHint.textContent = '🔒 ' + p.label + ': ' + p.text + ' (' + prog.count + '/' + prog.goal + ').';
      speciesHint.hidden = false;
      return;
    }
    speciesHint.hidden = true;
    state.pet.personality = p.id;
    save();
    renderPersonalities();
    sound('excited');
  });
  $('editPetBtn').addEventListener('click', renderPersonalities);
  renderPersonalities();

  // ---------- suggestions ----------
  var suggestEl = $('suggest'), suggestBtn = $('suggestBtn'), suggestTimer;
  var SUGGEST_GAP_MS = 3 * 60 * 1000, lastSuggestion = 0;
  /**
   * The pet asks for one of its favourites that isn't on the list yet.
   * @returns {boolean} False if there is nothing left to suggest.
   */
  function offerSuggestion() {
    // not too often: at most one ask every few minutes
    if (!state.settings.suggestions || Date.now() - lastSuggestion < SUGGEST_GAP_MS) return false;
    var text = L.suggestion(personality(), state.items);
    if (!text) return false;
    var e = L.emojiFor(text, state.overrides).emoji;
    var span = document.createElement('span');
    span.textContent = '+ ' + text;
    suggestBtn.replaceChildren(emojiImg(e, ''), span);
    suggestBtn.dataset.text = text;
    suggestEl.hidden = false;
    lastSuggestion = Date.now();
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(function () { suggestEl.hidden = true; }, 15000);
    talk('suggest', ['ooh, how about {x}?', 'can we get {x}?', '{x}, please?'], 1800, { x: text.toLowerCase() });
    return true;
  }
  suggestBtn.addEventListener('click', function () {
    suggestEl.hidden = true;
    addItem(suggestBtn.dataset.text);
  });
  $('suggestNo').addEventListener('click', function () {
    suggestEl.hidden = true;
    sound('off');
    if (!busy) { setFace(FACES.sheepish); talk('decline', ['ok, maybe next time', 'aww, fine'], 1200); setTimeout(function () { if (!busy) settle(); }, 1000); }
  });

  // ---------- options ----------
  var optionsSheet = $('optionsSheet'), optionsList = $('optionsList');
  var OPTIONS = [
    { key: 'sounds', title: 'Sounds', text: 'Chomps, slurps and squeaks.' },
    { key: 'bubbles', title: 'Speech bubbles', text: 'What your pet says.' },
    { key: 'vibration', title: 'Vibration', text: 'A little buzz when you tick things off (on phones that can).' },
    { key: 'goalToasts', title: 'Goal progress', text: 'A label under your pet after each bite, like "Fish fan 6/20".' },
    { key: 'fairPlayTips', title: 'Fair-play tips', text: 'Mentions the 15-minute rule and the once-a-day rule. The rules still apply when this is off.' },
    { key: 'daydreams', title: 'Daydreams', text: 'Thought clouds about things on your list.' },
    { key: 'suggestions', title: 'Suggestions', text: 'Your pet sometimes asks for something to add.' }
  ];
  OPTIONS.forEach(function (o) {
    var label = document.createElement('label');
    label.className = 'option';
    var title = document.createElement('span');
    title.className = 'option-title';
    title.textContent = o.title;
    var text = document.createElement('span');
    text.className = 'option-text';
    text.textContent = o.text;
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.setAttribute('role', 'switch');
    box.dataset.key = o.key;
    label.append(title, box, text);
    optionsList.appendChild(label);
  });
  optionsList.addEventListener('change', function (e) {
    var key = e.target.dataset.key;
    if (!key) return;
    state.settings[key] = e.target.checked;
    if (key === 'bubbles' && !e.target.checked) bubble.hidden = true;
    if (key === 'suggestions' && !e.target.checked) suggestEl.hidden = true;
    save();
    sound(e.target.checked ? 'on' : 'off');
  });
  $('optionsBtn').addEventListener('click', function () {
    optionsList.querySelectorAll('input').forEach(function (b) { b.checked = state.settings[b.dataset.key]; });
    openDialog(optionsSheet);
  });
  optionsSheet.addEventListener('click', function (e) { if (e.target === optionsSheet) optionsSheet.close(); });

  // ---------- developer tools ----------
  var devSheet = $('devSheet'), devStatus = $('devStatus'), devNoWait = $('devNoWait');
  /** Redraws everything that depends on progress after a dev action. */
  function refreshAll() {
    save();
    render();
    applyPet();
    refreshLocks();
    renderPersonalities();
    renderRoom();
  }
  var DEV_ACTIONS = [
    { label: 'Unlock everything', run: function () { L.unlockAll(state.pet, Achievements, Personalities); return 'All goals finished and personalities earned.'; } },
    { label: 'Lock everything again', run: function () { L.lockAll(state.pet, Achievements, FreeUnlocks); return 'Progress wiped. Locked items are locked again.'; } },
    { label: 'Skip to tomorrow', run: function () { L.skipDays(state, 1); return 'A day has passed: daily limits are fresh.'; } },
    { label: 'Daydream now', run: function () { devSheet.close(); setTimeout(daydream, 400); return ''; } },
    { label: 'Suggest something now', run: function () { devSheet.close(); lastSuggestion = 0; setTimeout(offerSuggestion, 400); return ''; } },
    { label: 'Fill with sample items', run: function () { state.items = state.items.concat(L.parseState(null, newId).items); return 'Sample items added.'; } },
    { label: 'Clear the list', run: function () { state.items = []; return 'List cleared.'; } },
    { label: 'Reset all saved data', danger: true, run: function () {
      if (!confirm('Reset everything? Your list, pet, progress and options will be gone.')) return 'Nothing changed.';
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* storage blocked */ }
      location.reload();
      return 'Resetting…';
    } }
  ];
  DEV_ACTIONS.forEach(function (a, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.textContent = a.label;
    if (a.danger) b.className = 'danger';
    $('devActions').appendChild(b);
  });
  $('devActions').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    sound('tap');
    devStatus.textContent = DEV_ACTIONS[b.dataset.i].run();
    refreshAll();
  });
  devNoWait.addEventListener('change', function () {
    state.dev.noWait = devNoWait.checked;
    save();
  });
  $('devBtn').addEventListener('click', function () {
    optionsSheet.close();
    devNoWait.checked = state.dev.noWait;
    devStatus.textContent = '';
    openDialog(devSheet);
  });
  devSheet.addEventListener('click', function (e) { if (e.target === devSheet) devSheet.close(); });

  // ---------- daydreams ----------
  // Now and then, while nothing else is going on, the pet daydreams about
  // something on the list and gets excited about its favourites.
  var dreamEl = $('dream'), dreamCloud = $('dreamCloud'), dreamTimer, dreaming = false;
  /** Waits a little while, then does something idle: a daydream or a little move. */
  function scheduleDream() {
    clearTimeout(dreamTimer);
    dreamTimer = setTimeout(idle, 7000 + Math.random() * 7000);
  }
  /** One idle moment, when nothing else is going on. */
  function idle() {
    scheduleDream();
    if (busy || dreaming || document.hidden || document.querySelector('dialog[open]:not(#roomSheet)')) return;
    if (state.settings.daydreams && Math.random() < 0.4) daydream();
    else idleMove();
  }
  /** Shows a thought cloud with an item and lets the pet react to it. */
  function daydream() {
    var mood = baseState();
    if (mood === 'stuffed') return;
    var todo = state.items.filter(function (i) { return !i.done && i.cat !== 'nonfood'; });
    var p = personality();
    var item;
    if (mood === 'sleepy' || !todo.length) {
      // dreaming of something it would like to have
      var wish = L.suggestion(p, state.items);
      if (!wish) return;
      item = L.createItem(wish, state.overrides, 'dream');
    } else {
      var loved = todo.filter(function (i) { return L.likes(p, i); });
      item = pick(loved.length && Math.random() < 0.7 ? loved : todo);
    }
    var love = mood !== 'sleepy' && isFavourite(item);
    dreaming = true;
    dreamCloud.replaceChildren(emojiImg(item.emoji, ''));
    dreamEl.classList.toggle('love', love);
    dreamEl.hidden = false;
    if (mood === 'sleepy') {
      setFace(FACES.sleepy);
    } else if (love) {
      setFace(FACES.love);
      pulse('hop', 460);
      sound('ooh');
      talk('dream', ['ooh, {x}!', 'can\'t wait!', 'my favourite!'], 1600, { x: item.text.toLowerCase() });
    } else {
      setFace(FACES.dreamy);
    }
    setTimeout(function () {
      dreamEl.hidden = true;
      dreaming = false;
      if (busy) return;
      settle();
      // a dream about something not on the list turns into a suggestion
      if (item.id === 'dream' && mood !== 'sleepy' && suggestEl.hidden) offerSuggestion();
    }, 2600);
  }
  /**
   * Floats a few music notes up from the pet's head while it hums.
   */
  function hum() {
    if (reduceMotion) return;
    var r = pet.getBoundingClientRect();
    ['♪', '♫', '♪'].forEach(function (n, i) {
      var el = document.createElement('span');
      el.className = 'note';
      el.textContent = n;
      document.body.appendChild(el);
      var x = r.left + r.width * (0.62 + i * 0.08), y = r.top + r.height * 0.2;
      el.animate([
        { transform: 'translate(' + x + 'px,' + y + 'px) scale(.6)', opacity: 0 },
        { transform: 'translate(' + (x + 8) + 'px,' + (y - 20) + 'px) scale(1) rotate(-10deg)', opacity: 1, offset: 0.3 },
        { transform: 'translate(' + (x + 18) + 'px,' + (y - 50) + 'px) rotate(10deg)', opacity: 0 }
      ], { duration: 1600, delay: i * 350, easing: 'ease-out', fill: 'both' }).finished.then(el.remove.bind(el), el.remove.bind(el));
    });
  }
  /**
   * Looks one way, then the other, as if checking the shop.
   * Skipped while the eyes are following a finger or cursor.
   */
  function lookAround() {
    if (lookAt) return;
    var steps = [[-3.2, -0.5], [3.2, -0.5], [0, 0]];
    steps.forEach(function (st, i) {
      setTimeout(function () {
        if (lookAt) return;
        pet.style.setProperty('--look-x', st[0] + 'px');
        pet.style.setProperty('--look-y', st[1] + 'px');
        if (i === steps.length - 1) { pet.style.removeProperty('--look-x'); pet.style.removeProperty('--look-y'); }
      }, i * 700);
    });
  }
  // little things the pet does while it waits; some only fit some moods
  var IDLE_MOVES = [
    { moods: ['curious', 'happy'], run: function () { pulse('wiggle', 900); } },
    { moods: ['curious', 'happy'], run: function () { setFace(FACES.dreamy); pulse('bob', 1400); hum(); say('♪ hm hm hmm ♪', 1400); } },
    { moods: ['curious', 'happy'], run: function () { lookAround(); } },
    { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'closed', mouth: 'o', arms: 'cover', x: [] }); pulse('stretch', 1000); } },
    { moods: ['happy'], run: function () { setFace(FACES.tada); pulse('twirl', 800); } },
    { moods: ['happy'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'pat', x: ['cheeks'] }); } },
    { moods: ['happy'], run: function () { if (!cartEl.hidden) { setFace({ eyes: 'open', mouth: 'open', arms: 'reach', x: [] }); pulse('peek', 1400); say(pick(['what\'s in the cart?', 'so much loot!', 'cart buddy!']), 1300); } } },
    { moods: ['curious'], run: function () { setFace({ eyes: 'open', mouth: 'o', arms: 'scratch', x: ['question'] }); talk('idle', ['what\'s next?', 'shopping time?'], 1300); } },
    // little dances
    { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }); pulse('shuffle', 1500); hum(); } },
    { moods: ['curious', 'happy'], run: function () { setFace({ eyes: 'happy', mouth: 'smile', arms: 'reach', x: ['sparkles', 'cheeks'] }); pulse('boogie', 1500); hum(); } },
    { moods: ['sleepy', 'stuffed'], run: function () { pulse('wiggle', 900); } },
    { moods: ['stuffed'], run: function () { setFace({ eyes: 'closed', mouth: 'smile', arms: 'pat', x: ['zzz', 'cheeks'] }); } }
  ];
  /** Plays one idle move that fits the pet's mood, then settles back. */
  function idleMove() {
    var mood = baseState();
    var moves = IDLE_MOVES.filter(function (m) { return m.moods.indexOf(mood) !== -1; });
    if (!moves.length) return;
    busy++;
    pick(moves).run();
    setTimeout(function () { busy--; if (!busy) settle(); }, 1600);
  }
  scheduleDream();

  // ---------- eyes follow your finger or cursor ----------
  var lookAt = null, lookFrame = 0, lookTimer;
  /** Points each visible pet's pupils towards the last finger or cursor position. */
  function updateLook() {
    lookFrame = 0;
    // just the pet and its dressing-room copy; the species buttons stay still
    [pet, dressPreview.querySelector('.pet')].forEach(function (el) {
      if (!el) return;
      var eyes = el.querySelector('.pupils');
      if (!eyes || !lookAt) {
        el.style.removeProperty('--look-x'); el.style.removeProperty('--look-y'); el.classList.remove('looking');
        return;
      }
      var r = eyes.getBoundingClientRect();
      if (!r.width) return;
      var dx = lookAt.x - (r.left + r.width / 2), dy = lookAt.y - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy) || 1;
      var reach = Math.min(d / 120, 1);
      el.style.setProperty('--look-x', (dx / d * 3.4 * reach).toFixed(2) + 'px');
      el.style.setProperty('--look-y', (dy / d * 2.8 * reach).toFixed(2) + 'px');
      el.classList.add('looking');
    });
  }
  /**
   * Remembers where the finger or cursor is and drifts the eyes back after a pause.
   * @param {PointerEvent} e
   */
  function watchPointer(e) {
    lookAt = { x: e.clientX, y: e.clientY };
    if (!lookFrame) lookFrame = requestAnimationFrame(updateLook);
    clearTimeout(lookTimer);
    lookTimer = setTimeout(function () { lookAt = null; updateLook(); }, e.pointerType === 'mouse' ? 4000 : 1500);
  }
  document.addEventListener('pointermove', watchPointer, { passive: true });
  document.addEventListener('pointerdown', watchPointer, { passive: true });

  // ---------- start: Nibble wakes up with a stretch ----------
  render();
  var wakeState = baseState();
  if (wakeState !== 'sleepy') {
    busy++;
    pet.dataset.state = 'sleepy';
    setFace(FACES.sleepy);
    setTimeout(function () {
      setFace(FACES.wake);
      pulse('stretch', 1000);
      var away = Date.now() - (state.lastOpen || 0);
      if (away > 6 * 3600 * 1000) say('*yaaawn* hi!', 1400); else talk('hi', ['oh, hi!'], 1400);
      setTimeout(function () { busy--; if (!busy) settle(); }, 1000);
    }, 700);
  }
  state.lastOpen = Date.now();
  save();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* not available here */ });
  }
})();
