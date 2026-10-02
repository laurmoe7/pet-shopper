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

  // ---------- elements ----------
  var $ = function (id) { return document.getElementById(id); };
  var pet = $('pet'), bubble = $('bubble'), todoEl = $('todo'), doneEl = $('done');
  var addForm = $('addForm'), addInput = $('addInput'), addPreview = $('addPreview');
  var eatenSection = $('eatenSection'), eatenCount = $('eatenCount'), emptyHint = $('emptyHint');
  var tally = $('tally'), quietBtn = $('quietBtn'), clearBtn = $('clearBtn');
  var picker = $('picker'), pickerGrid = $('pickerGrid'), pickerName = $('pickerName'), deleteBtn = $('deleteBtn');

  // ---------- rendering ----------
  var freshIds = {};

  /** Redraws both lists, the tally and the empty hint from state. */
  function render() {
    var todo = state.items.filter(function (i) { return !i.done; });
    var done = state.items.filter(function (i) { return i.done; });
    todoEl.replaceChildren.apply(todoEl, todo.map(row));
    doneEl.replaceChildren.apply(doneEl, done.map(row));
    eatenSection.hidden = done.length === 0;
    eatenCount.textContent = '(' + done.length + ')';
    emptyHint.hidden = state.items.length > 0;
    tally.textContent = state.items.length ? done.length + ' of ' + state.items.length + ' eaten' : '';
    quietBtn.setAttribute('aria-pressed', state.quiet ? 'true' : 'false');
    freshIds = {};
    if (!busy) settle();
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
    suspicious: { eyes: 'squint', mouth: 'wavy', arms: 'scratch', x: ['question'] }
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
   */
  function say(text, ms) {
    if (state.quiet || !text) return;
    bubble.hidden = true;
    void bubble.offsetWidth;
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.hidden = true; }, ms || 1500);
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
    var r = pet.querySelector('.pet-svg').getBoundingClientRect();
    return { x: r.left + r.width * (80 / 160), y: r.top + r.height * (107 / 150) };
  }
  /** @returns {{x: number, y: number}} A spot at the pet's side, where non-food gets tucked away. */
  function sidePoint() {
    var r = pet.querySelector('.pet-svg').getBoundingClientRect();
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
  function sound(kind) { if (!state.quiet) Sounds.play(kind); }
  // phones only allow audio that starts from a tap, so wake the audio engine on the first one
  document.addEventListener('pointerdown', function unlockAudio() {
    Sounds.unlock();
    document.removeEventListener('pointerdown', unlockAudio, true);
  }, true);
  /**
   * A short vibration on phones that support it.
   * @param {number|number[]} ms
   */
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

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
        say(pick(r.lines), 1400);
        if (goals) goalToast(goals);
        var hold = 750 * sp;
        if (r.then) return wait(hold / 2).then(function () { setFace(r.then); return wait(hold / 2); });
        return wait(hold);
      }).then(function () {
        if (goals && goals.blocked === 'too-fast') {
          // a playful nudge rather than a telling-off
          setFace(FACES.suspicious);
          say(pick(['did you really buy that?', 'hmm, that was quick…', 'straight from the list?']), 1600);
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
      setTimeout(function () { setFace(FACES.sheepish); say(pick(['oops, sorry', 'spit! my bad', 'not yet? ok', 'ptoo!']), 1400); }, 200);
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
    say(pick(['so full! thank you!', 'best trip ever!', '*happy belly pat*']), 2200);
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
      goals = L.recordEaten(state.pet, item, now, Achievements);
      item.counted = goals.counted;
      item.countedDay = L.dayKey(now);
      if (L.mood(state.items) === 'stuffed') {
        var trip = L.recordTrip(state.pet, state.items, now, Achievements);
        goals.counted = goals.counted.concat(trip.counted);
        goals.capped = goals.capped.concat(trip.capped);
        goals.unlocked = goals.unlocked.concat(trip.unlocked);
      }
    } else {
      // putting it back takes today's count back, so ticking on and off can't farm goals
      L.refundEaten(state.pet, item, now, Achievements);
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
    if (!busy) { pulse('hop', 460); say('ooh, ' + 'new look!', 1100); }
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
    if (picker.showModal) picker.showModal(); else picker.setAttribute('open', '');
  }
  /** Closes the emoji picker. */
  function closePicker() { if (picker.close) picker.close(); else picker.removeAttribute('open'); pickerFor = null; }
  pickerGrid.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !pickerFor) return;
    var id = pickerFor;
    closePicker();
    setEmoji(id, b.dataset.emoji);
  });
  deleteBtn.addEventListener('click', function () {
    var id = pickerFor;
    closePicker();
    if (id) removeItem(id);
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
    pet.setAttribute('aria-label', name + ', your pet');
    document.querySelectorAll('.pet-name').forEach(function (el) { el.textContent = name; });
    document.title = name + "'s List";
    dressUp(pet, state.pet.outfit);
    speciesGrid.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.species === state.pet.species ? 'true' : 'false');
    });
  }

  // species buttons show a small static copy of the pet
  var petSvg = pet.querySelector('.pet-svg');
  SPECIES.forEach(function (sp) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.species = sp.id;
    var mini = document.createElement('div');
    mini.className = 'pet mini x-cheeks';
    mini.dataset.species = sp.id;
    mini.dataset.eyes = 'open';
    mini.dataset.mouth = 'smile';
    mini.dataset.arms = 'rest';
    var copy = petSvg.cloneNode(true);
    copy.querySelectorAll('defs').forEach(function (d) { d.remove(); });
    mini.appendChild(copy);
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
    state.pet.species = b.dataset.species;
    save();
    applyPet();
    if (!busy) { setFace(FACES.tada); pulse('hop', 500); setTimeout(function () { if (!busy) settle(); }, 900); }
  });
  petNameInput.addEventListener('input', function () {
    state.pet.name = petNameInput.value.slice(0, 16);
    save();
    applyPet();
  });
  $('editPetBtn').addEventListener('click', function () {
    petNameInput.value = state.pet.name;
    refreshLocks();
    applyPet();
    if (petSheet.showModal) petSheet.showModal(); else petSheet.setAttribute('open', '');
  });
  petSheet.addEventListener('close', function () {
    state.pet.name = petName();
    save();
    applyPet();
    if (!busy) { pulse('hop', 500); say("I'm " + petName() + '!', 1500); }
  });
  petSheet.addEventListener('click', function (e) { if (e.target === petSheet) petSheet.close(); });

  // ---------- dressing room ----------
  /**
   * @param {string} id
   * @returns {?Object} The wardrobe item with this id, or null (e.g. for "none").
   */
  function wardrobeItem(id) {
    for (var i = 0; i < Wardrobe.length; i++) if (Wardrobe[i].id === id) return Wardrobe[i];
    return null;
  }
  /**
   * Draws an outfit into a pet drawing: hats on the head, body items (hoodies) over the whole pet.
   * @param {Element} el A .pet element.
   * @param {{hat: string}} outfit
   */
  function dressUp(el, outfit) {
    var item = wardrobeItem(outfit.hat);
    var body = !!(item && item.layer === 'body');
    el.querySelector('.outfit-hat').innerHTML = item && !body ? item.svg : '';
    el.querySelector('.outfit-body').innerHTML = item && body ? item.svg : '';
    el.classList.toggle('hooded', !!(item && item.hood));
  }

  var dressSheet = $('dressSheet'), dressPreview = $('dressPreview'), hatStrip = $('hatStrip');
  var SVGNS = 'http://www.w3.org/2000/svg';
  [{ id: 'none', label: 'Nothing' }].concat(Wardrobe.filter(function (w) { return w.slot === 'hat'; })).forEach(function (item) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.hat = item.id;
    var icon = document.createElementNS(SVGNS, 'svg');
    icon.setAttribute('viewBox', item.id === 'none' ? '0 0 40 40' : item.icon || '32 2 96 60');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = item.svg || '<circle class="hat-none" cx="20" cy="20" r="12"/><path class="hat-none" d="M11.5 28.5 L28.5 11.5"/>';
    var label = document.createElement('span');
    label.textContent = item.label;
    b.append(icon, label);
    hatStrip.appendChild(b);
  });
  /** Marks the chosen hat in the dressing room and updates its preview. */
  function refreshDressRoom() {
    hatStrip.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.hat === state.pet.outfit.hat ? 'true' : 'false');
    });
    var view = dressPreview.querySelector('.pet');
    if (view) dressUp(view, state.pet.outfit);
  }
  $('dressBtn').addEventListener('click', function () {
    // a live copy of the pet to try things on
    var view = document.createElement('div');
    view.className = 'pet preview x-cheeks';
    view.dataset.species = state.pet.species;
    view.dataset.state = 'curious';
    view.dataset.eyes = 'open';
    view.dataset.mouth = 'smile';
    view.dataset.arms = 'idle';
    var copy = petSvg.cloneNode(true);
    copy.querySelectorAll('defs').forEach(function (d) { d.remove(); });
    view.appendChild(copy);
    dressPreview.replaceChildren(view);
    refreshLocks();
    refreshDressRoom();
    if (dressSheet.showModal) dressSheet.showModal(); else dressSheet.setAttribute('open', '');
  });
  hatStrip.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (!unlocked('hat', b.dataset.hat)) { lockHint(hatHint, 'hat', b.dataset.hat); return; }
    hatHint.hidden = true;
    state.pet.outfit.hat = b.dataset.hat;
    save();
    refreshDressRoom();
    dressUp(pet, state.pet.outfit);
    if (b.dataset.hat !== 'none') sound('excited');
    var pointed = hoveredHat === b.dataset.hat;
    dressSay(b.dataset.hat === 'none' ? 'fresh look!' : pointed ? pick(['how do I look?', 'I love it!', 'kawaii?', 'more outfits!', 'ta-da!']) : hatLine(b.dataset.hat), 1600);
    var view = dressPreview.querySelector('.pet');
    if (view) {
      view.dataset.mouth = 'smile';
      view.dataset.eyes = b.dataset.hat === 'none' ? 'open' : 'happy';
      view.dataset.arms = b.dataset.hat === 'none' ? 'idle' : 'cheer';
      view.classList.remove('hop'); void view.offsetWidth; view.classList.add('hop');
    }
  });
  // pointing at an unlocked outfit makes the pet react to it
  var dressBubble = $('dressBubble'), dressBubbleTimer, hoveredHat = null, lastOoh = 0;
  /**
   * Shows a line from the pet in the dressing room (skipped in quiet mode).
   * @param {string} text
   * @param {number} ms
   */
  function dressSay(text, ms) {
    if (state.quiet) return;
    dressBubble.textContent = text;
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
    if (!item) return pick(['the natural look?', 'just me!', 'hat off?']);
    return pick(item.lines || ['ooh!']);
  }
  /**
   * Reacts when a finger or cursor lands on an unlocked hat that isn't being worn.
   * @param {Event} e
   */
  function onHatHover(e) {
    // a finger has no hover: on phones the tap itself gets the outfit's line
    if (e.pointerType === 'touch') return;
    var b = e.target.closest && e.target.closest('#hatStrip button');
    if (!b || b.dataset.hat === hoveredHat) return;
    hoveredHat = b.dataset.hat;
    if (!unlocked('hat', b.dataset.hat) || b.dataset.hat === state.pet.outfit.hat) return;
    dressSay(hatLine(b.dataset.hat), 1600);
    var view = dressPreview.querySelector('.pet');
    if (view) { view.dataset.eyes = 'sparkle'; view.dataset.mouth = 'open'; }
    if (Date.now() - lastOoh > 500) { sound('ooh'); lastOoh = Date.now(); }
  }
  hatStrip.addEventListener('pointerover', onHatHover);
  hatStrip.addEventListener('focusin', onHatHover);
  hatStrip.addEventListener('pointerleave', function () {
    hoveredHat = null;
    var view = dressPreview.querySelector('.pet');
    if (view && view.dataset.eyes === 'sparkle') { view.dataset.eyes = 'open'; view.dataset.mouth = 'smile'; }
  });

  dressSheet.addEventListener('close', function () {
    dressBubble.hidden = true;
    hoveredHat = null;
    if (!busy) {
      setFace(FACES.tada); pulse('hop', 500);
      var item = wardrobeItem(state.pet.outfit.hat);
      say(item ? pick(['so fancy!', 'how do I look?', 'kawaii?', 'ta-da!']) : 'fresh look!', 1500);
      setTimeout(function () { if (!busy) settle(); }, 1000);
    }
  });
  dressSheet.addEventListener('click', function (e) { if (e.target === dressSheet) dressSheet.close(); });

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
  function achievement(id) {
    for (var i = 0; i < Achievements.length; i++) if (Achievements[i].id === id) return Achievements[i];
    return null;
  }
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
      showToast('🧺', FAIR_PLAY[goals.blocked], false, 3000);
      return;
    }
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
        say(u.kind === 'species' ? 'new friend: ' + u.label + '!' : 'new hat: ' + u.label + '!', 2200);
        if (!reduceMotion) petals(mouthPoint(), 14);
        refreshLocks();
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
    hatStrip.querySelectorAll('button').forEach(function (b) { markLock(b, 'hat', b.dataset.hat); });
  }
  /**
   * Explains how to unlock a locked species or hat.
   * @param {HTMLElement} el The hint paragraph in the open sheet.
   * @param {'species'|'hat'} kind
   * @param {string} id
   */
  function lockHint(el, kind, id) {
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
    if (goalsSheet.showModal) goalsSheet.showModal(); else goalsSheet.setAttribute('open', '');
  });
  goalsSheet.addEventListener('click', function (e) { if (e.target === goalsSheet) goalsSheet.close(); });
  petSheet.addEventListener('close', function () { speciesHint.hidden = true; });
  dressSheet.addEventListener('close', function () { hatHint.hidden = true; });

  refreshLocks();
  applyPet();

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
    pressTimer = setTimeout(function () {
      buzz(18);
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 600);
      var id = li.dataset.id;
      cancelPress();
      openPicker(id);
    }, 500);
  });
  document.addEventListener('pointermove', function (e) {
    if (pressTimer && pressStart && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10) cancelPress();
  });
  ['pointerup', 'pointercancel', 'scroll'].forEach(function (ev) { document.addEventListener(ev, cancelPress, true); });
  document.querySelector('.list-area').addEventListener('contextmenu', function (e) { if (e.target.closest('.item')) e.preventDefault(); });

  quietBtn.addEventListener('click', function () {
    state.quiet = !state.quiet;
    if (state.quiet) bubble.hidden = true;
    save();
    render();
  });
  clearBtn.addEventListener('click', function () {
    state.items = state.items.filter(function (i) { return !i.done; });
    save();
    render();
    if (!busy) { pulse('hop', 460); say(state.items.length ? 'fresh start!' : 'nap time…', 1300); }
  });

  // tap Nibble for a little reaction
  pet.addEventListener('click', function () {
    if (busy) return;
    pulse('hop', 460);
    var s = baseState();
    say(s === 'sleepy' || s === 'stuffed' ? 'zzz… snack?' : pick(['hi!', 'hungry!', 'shopping?', 'hehe']), 1200);
  });

  // ---------- eyes follow your finger or cursor ----------
  var lookAt = null, lookFrame = 0, lookTimer;
  /** Points each visible pet's pupils towards the last finger or cursor position. */
  function updateLook() {
    lookFrame = 0;
    document.querySelectorAll('.pet:not(.mini)').forEach(function (el) {
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
      say(away > 6 * 3600 * 1000 ? '*yaaawn* hi!' : 'oh, hi!', 1400);
      setTimeout(function () { busy--; if (!busy) settle(); }, 1000);
    }, 700);
  }
  state.lastOpen = Date.now();
  save();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* not available here */ });
  }
})();
