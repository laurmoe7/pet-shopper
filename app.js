(function () {
  'use strict';

  var STORE_KEY = 'nibble.v1';
  var SAMPLE = ['Bananas', 'Oat milk', '500g Quark', 'Broccoli', 'Chili flakes', 'Dark chocolate', 'Toilet paper', "Oma's cake"];
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- state ----------
  var nextId = Date.now();
  var state = load();

  function load() {
    var data = null;
    try { data = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* storage blocked */ }
    if (!data || !Array.isArray(data.items)) {
      data = { items: [], overrides: {}, quiet: false, lastOpen: 0 };
      SAMPLE.forEach(function (t) { data.items.push(makeItem(t, data.overrides)); });
    }
    data.overrides = data.overrides || {};
    data.pet = data.pet || { name: 'Nibble', species: 'mochi' };
    return data;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }

  function makeItem(text, overrides) {
    var found = emojiFor(text, overrides || state.overrides);
    return { id: String(nextId++), text: text, emoji: found.emoji, cat: found.cat, done: false };
  }
  function emojiFor(text, overrides) {
    var picked = overrides[Foods.normalize(text)];
    if (picked) return { emoji: picked, cat: Foods.categoryOf(picked) };
    return Foods.match(text);
  }
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

  function find(id) {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i];
    return null;
  }
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
    tada: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] }
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

  function baseState() {
    var total = state.items.length;
    var eaten = state.items.filter(function (i) { return i.done; }).length;
    if (!total) return 'sleepy';
    if (eaten === total) return 'stuffed';
    if (eaten > 0) return 'happy';
    return 'curious';
  }
  function setFace(face) {
    pet.dataset.eyes = face.eyes;
    pet.dataset.mouth = face.mouth;
    pet.dataset.arms = face.arms || 'idle';
    ['zzz', 'steam', 'hearts', 'sparkles', 'question', 'sweat', 'shock', 'redface', 'cheeks'].forEach(function (x) {
      pet.classList.toggle('x-' + x, face.x.indexOf(x) !== -1);
    });
  }
  function settle() {
    var s = baseState();
    pet.dataset.state = s;
    setFace(FACES[s]);
  }
  function pulse(cls, ms) {
    pet.classList.remove(cls);
    void pet.offsetWidth;
    pet.classList.add(cls);
    setTimeout(function () { pet.classList.remove(cls); }, ms);
  }

  var bubbleTimer;
  function say(text, ms) {
    if (state.quiet || !text) return;
    bubble.hidden = true;
    void bubble.offsetWidth;
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.hidden = true; }, ms || 1500);
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function mouthPoint() {
    var r = pet.querySelector('.pet-svg').getBoundingClientRect();
    return { x: r.left + r.width * (80 / 160), y: r.top + r.height * (107 / 150) };
  }
  function sidePoint() {
    var r = pet.querySelector('.pet-svg').getBoundingClientRect();
    return { x: r.left + r.width * 0.92, y: r.top + r.height * 0.7 };
  }
  function center(rect) { return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }

  // Fly an emoji along an arc. Resolves when it lands.
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
  // Which sound each food makes. Specific emojis first, then the food category.
  var EMOJI_SOUNDS = {
    slurp: '🍜🍲🍛🥣🍝🧋🫗🥫',
    sip: '☕🍵🍼',
    crunch: '🍎🍏🍐🥕🥒🥦🫑🌽🥬🥗🥨🍪🥜🌰🍟🍿🍘🫓🥖🧅🧄',
    squish: '🍌🥑🍑🥭🍓🫐🍇🍅🍦🧀🧈🥚🍰🎂🧁🍮🍡🍞🥯🥐🥞🧇🍠🥔🍄🫘'
  };
  var CAT_SOUNDS = { fruit: 'squish', veg: 'crunch', sweets: 'sweet', spicy: 'spicy', drink: 'glug', baked: 'squish', dairy: 'squish', protein: 'chomp', pantry: 'chomp', mystery: 'mystery', nonfood: 'huh' };
  function soundFor(item) {
    if (item.cat === 'sweets' || item.cat === 'spicy' || item.cat === 'nonfood' || item.cat === 'mystery') return CAT_SOUNDS[item.cat];
    for (var kind in EMOJI_SOUNDS) if (EMOJI_SOUNDS[kind].indexOf(item.emoji) !== -1) return kind;
    return CAT_SOUNDS[item.cat] || 'chomp';
  }
  function sound(kind) { if (!state.quiet) Sounds.play(kind); }
  // phones only allow audio that starts from a tap, so wake the audio engine on the first one
  document.addEventListener('pointerdown', function unlockAudio() {
    Sounds.unlock();
    document.removeEventListener('pointerdown', unlockAudio, true);
  }, true);
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  // ---------- the eating queue ----------
  // Taps update the list at once; Nibble works through what you checked in order.
  var queue = Promise.resolve();
  var pending = 0;
  function enqueue(job) {
    pending++;
    busy++;
    queue = queue.then(job).catch(function (e) { console.error(e); }).then(function () {
      pending--;
      busy--;
      if (!busy) settle();
    });
  }
  function speed() { return pending > 4 ? 0.4 : pending > 2 ? 0.6 : 1; }

  function eat(item, fromRect) {
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
        sound(soundFor(item));
        say(pick(r.lines), 1400);
        var hold = 750 * sp;
        if (r.then) return wait(hold / 2).then(function () { setFace(r.then); return wait(hold / 2); });
        return wait(hold);
      }).then(function () {
        if (pending === 1 && baseState() === 'stuffed') return celebrate();
      });
    });
  }

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
  function addItem(text) {
    text = text.trim();
    if (!text) return;
    var item = makeItem(text);
    state.items.splice(state.items.filter(function (i) { return !i.done; }).length, 0, item);
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

  function toggle(id) {
    var item = find(id);
    if (!item) return;
    var fromRect = rowEmojiRect(id);
    item.done = !item.done;
    // checked items go to the bottom of the eaten list, put-back items to the bottom of the to-buy list
    state.items = state.items.filter(function (i) { return i !== item; });
    if (item.done) state.items.push(item);
    else state.items.splice(state.items.filter(function (i) { return !i.done; }).length, 0, item);
    freshIds[item.id] = true;
    buzz(12);
    save();
    render();
    if (item.done) eat(item, fromRect);
    else spitBack(item);
  }

  function removeItem(id) {
    state.items = state.items.filter(function (i) { return i.id !== id; });
    save();
    render();
  }

  function setEmoji(id, emoji) {
    var item = find(id);
    if (!item) return;
    var key = Foods.normalize(item.text);
    state.overrides[key] = emoji;
    // remember for this word, and apply to matching items already on the list
    state.items.forEach(function (i) {
      if (Foods.normalize(i.text) === key) { i.emoji = emoji; i.cat = Foods.categoryOf(emoji); }
    });
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
    { id: 'bunny', label: 'Bunny' },
    { id: 'kitty', label: 'Kitty' },
    { id: 'chick', label: 'Chick' },
    { id: 'puppy', label: 'Puppy' }
  ];
  var petSheet = $('petSheet'), petNameInput = $('petNameInput'), speciesGrid = $('speciesGrid');

  function petName() { return (state.pet.name || '').trim() || 'Nibble'; }
  function applyPet() {
    var name = petName();
    pet.dataset.species = state.pet.species;
    pet.setAttribute('aria-label', name + ', your pet');
    document.querySelectorAll('.pet-name').forEach(function (el) { el.textContent = name; });
    document.title = name + "'s List";
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
    var e = emojiFor(t, state.overrides).emoji;
    if (e !== lastPreview) { addPreview.replaceChildren(emojiImg(e, '')); lastPreview = e; }
  });

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
