// The to-do list: tap the title to swap between the shopping list and the to-do list. Tasks aren't eaten:
// ticking one off makes a check-mark stamp and a cheer that fits the kind of task. No receipt, cart or bag, and
// nothing counts for goals, tastes or the Top 10.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// The list on show is always state.items; the other one waits in state.stash (state.mode says which is which).
/** @returns {boolean} Whether the to-do list is the one on show. */
function isTodo() { return state.mode === 'todo'; }

var brandEl = $('brand'), brandKind = $('brandKind');
/**
 * Sets the words and look of the page for the list on show.
 * @param {boolean} [animate] Flip the title's words instead of changing them at once.
 */
function applyListMode(animate) {
  var todo = isTodo();
  document.documentElement.dataset.list = todo ? 'todo' : 'shop';
  var kind = todo ? 'to-do list' : 'shopping list';
  if (animate && !reduceMotion) {
    brandKind.classList.remove('flip'); void brandKind.offsetWidth; brandKind.classList.add('flip');
    setTimeout(function () { brandKind.textContent = kind; }, 190);
  } else brandKind.textContent = kind;
  brandEl.classList.toggle('swapped', todo);
  addInput.placeholder = todo ? 'Add a to-do, like call mum' : 'Add an item, like bananas';
  $('addLabel').textContent = todo ? 'Add a to-do' : 'Add an item';
  addForm.querySelector('.add-btn').setAttribute('aria-label', todo ? 'Add to-do' : 'Add item');
  todoEl.setAttribute('aria-label', todo ? 'To do' : 'To buy');
  doneEl.setAttribute('aria-label', todo ? 'Done' : 'Bought');
  $('eatenTitle').textContent = todo ? 'Done' : 'Bought';
  $('listHint').textContent = todo ? "Tap “+ date/time” on a task to set when it's due, a time and a repeat. Tap its emoji, or long-press it, to pick a different one." : "Tap an item's emoji, or long-press the item, to pick a different one.";
  addPreview.replaceChildren(); lastPreview = '';
  if (!todo) { if ($('calSheet').open) $('calSheet').close(); if ($('stampSheet').open) $('stampSheet').close(); }   // those two belong to the to-do list
}

/** Swaps the shopping list and the to-do list; Nibble notices. */
function switchList() {
  if (pending > 0) { pulse('rocksmall', 500); return; }   // still eating or cheering: wait for it
  var shown = state.items;
  state.items = state.stash;
  state.stash = shown;
  state.mode = isTodo() ? 'shop' : 'todo';
  suggestEl.hidden = true;
  closePicker();
  save();
  applyListMode(true);
  var area = document.querySelector('.list-area');
  area.classList.remove('list-swap'); void area.offsetWidth; area.classList.add('list-swap');
  render();
  buzz(10);
  sound('pick');
  if (busy || baseState() === 'sleepy') return;
  var todo = isTodo(), at = mouthPoint();
  pulse('hop', 460);
  setFace(todo ? FACES.tada : FACES.happy);
  drift(todo ? ['✓', '✦', '✧'] : ['♥', '✦', '✧'], at, 3);
  talk(todo ? 'switchTodo' : 'switchShop', todo ? ['to-do time!', "let's get things done!", 'tick tick tick!', 'ooh, tasks!'] : ['shopping time!', 'snack run!', 'back to the shops!', 'ooh, snacks!'], 1500);
  setTimeout(function () { if (!busy) settle(); }, 900);
}
brandEl.addEventListener('click', switchList);
brandEl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchList(); }
});

// ---------- what Nibble says and does for each kind of task ----------
// face, a move, symbols that float up, the colour of the sparkle crumbs, the sound and the lines
var TASK_REACTIONS = {
  chore: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] }, move: ['wiggle', 800], bits: ['✧', '○', '✦', '◦'], color: '#a8dff2', sound: 'sparkle', lines: ['squeaky clean!', 'sparkly! ✧', 'tidy tidy~', 'shine shine!'] },
  call: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }, move: ['hop', 460], bits: ['♪', '♫', '…'], color: '#9fd8b4', sound: 'ring', lines: ['ring ring… done!', 'phew, the call!', 'hello? bye!', 'talked it out!'] },
  health: { face: { eyes: 'happy', mouth: 'smile', arms: 'cheer', x: ['hearts', 'cheeks'] }, bits: ['♥', '✚', '✧'], color: '#f6a3b8', sound: 'done', lines: ['health first ♡', 'taking good care!', 'so responsible!', 'healthy you!'] },
  money: { face: { eyes: 'sparkle', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] }, move: ['hop', 460], bits: ['€', '$', '✦'], color: '#f2d36b', sound: 'coin', lines: ['cha-ching!', 'paid! no more worry', 'adulting level up!', 'money sorted!'] },
  errand: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }, move: ['hop', 460], bits: ['✦', '➜', '✧'], color: '#f2c38f', sound: 'done', lines: ['errand done!', 'one less trip!', 'delivered!', 'off the list!'] },
  fitness: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['sweat', 'cheeks'] }, move: ['wiggle', 900], bits: ['✦', '✧', '♥'], color: '#9cc9ff', sound: 'done', lines: ['sweaty! so strong!', 'feel the burn!', 'so fit!', 'huff… puff… yay!'] },
  work: { face: { eyes: 'happy', mouth: 'smile', arms: 'cheer', x: ['sparkles', 'cheeks'] }, bits: ['✎', '✦', '✧'], color: '#b9c4f2', sound: 'done', lines: ['big brain!', 'so productive!', 'work done! ✧', 'you did it!'] },
  social: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['hearts', 'cheeks'] }, move: ['hop', 460], bits: ['♥', '★', '✦'], color: '#ffb3c8', sound: 'done', lines: ['so thoughtful ♡', 'friends are nice!', 'aww, lovely!', 'yay, people!'] },
  fun: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] }, move: ['wiggle', 800], bits: ['♪', '★', '✦'], color: '#d6b9f2', sound: 'done', lines: ['fun time!', 'nice break ♡', 'treat yourself!', 'whee!'] },
  travel: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] }, move: ['hop', 460], bits: ['✦', '➜', '★'], color: '#9fd3e8', sound: 'done', lines: ['adventure ahead!', 'ready to go!', 'bon voyage!', 'pack the snacks!'] },
  care: { face: { eyes: 'happy', mouth: 'smile', arms: 'cheer', x: ['hearts', 'cheeks'] }, bits: ['♥', '✧', '✦'], color: '#b8e3a8', sound: 'done', lines: ['good caretaker!', 'they say thanks ♡', 'so kind!', 'well looked after!'] },
  cook: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['cheeks'] }, move: ['wiggle', 800], bits: ['♨', '✦', '♥'], color: '#f6cf86', sound: 'done', lines: ['chef Nibble!', 'smells so good!', 'mmm, cooked!', 'ding! ready!'] },
  other: { face: { eyes: 'happy', mouth: 'open', arms: 'cheer', x: ['sparkles', 'cheeks'] }, move: ['hop', 460], bits: ['✦', '✧', '♥'], color: '#9bdcb4', sound: 'done', lines: ['done! ✓', 'nice one!', 'tick tick!', 'checked off!'] }
};
// a few tasks get their own words, and a sound or float-ups where it fits (matched on what you typed)
var TASK_RULES = [
  [/dentist|teeth|floss/, { lines: ['sparkly teeth! ✧', 'open wide… done!', 'no cavities!'] }],
  [/birthday|bday|gift|present/, { bits: ['★', '♥', '✦'], lines: ['they will love it!', 'party time!', 'so thoughtful ♡'] }],
  [/plants?\b|garden|flowers?|lawn|mow|weed/, { bits: ['✿', '❀', '✧'], color: '#b8e3a8', lines: ['grow, grow!', 'the plants say thanks!', 'so green ♡'] }],
  [/\bdog\b|walk the dog|puppy/, { lines: ['woof! good walk!', 'so many sniffs!', 'tail wags!'] }],
  [/laundry|washing|iron|fold/, { lines: ['fresh and fluffy!', 'clean socks!', 'folded neat!'] }],
  [/dishes|dishwasher|wash up/, { lines: ['squeaky plates!', 'all sparkly!', 'no more dishes!'] }],
  [/trash|garbage|rubbish|\bbins?\b|recycl/, { lines: ['bye bye trash!', 'all taken out!', 'fresh and tidy!'] }],
  [/e-?mail|inbox|\bmail\b/, { bits: ['✉', '✦', '✧'], lines: ['sent! whoosh!', 'inbox tamed!', 'email: done!'] }],
  [/\bbed\b|sheets|bedding/, { lines: ['so cosy!', 'fluffy bed!', 'ready for sleep!'] }],
  [/gym|workout|\brun\b|running|jog|yoga|swim/, { lines: ['sweaty! so strong!', 'feel the burn!', 'stretchy and strong!'] }]
];
// what it says when you add a task (by kind)
var TASK_ADDED = {
  chore: ['tidy tidy! I\'ll help', 'chores… we can do it!'],
  call: ['ring ring! I\'ll remind you', "don't forget to call!"],
  health: ['take care of you!', 'health first ♡'],
  money: ['adulting time!', 'brave face for bills!'],
  errand: ['errand noted!', 'off we go, soon!'],
  fitness: ["let's get moving!", 'sweaty time!'],
  work: ['you got this!', 'work work!'],
  social: ['aww, how nice ♡', 'people time!'],
  fun: ['fun! finally!', 'yes, relax!'],
  travel: ['adventure!', 'pack the snacks!'],
  care: ['good caretaker!', 'they need you!'],
  cook: ['smells good already!', 'chef time!'],
  other: ['noted!', 'on the list!', 'got it!', 'to-do, to-do!']
};
var TIRED_DONE = ['done… *yawn*', 'ticked… zzz', 'one less… *yawn*', 'good job… sleepy~'];

/**
 * @param {Item} item
 * @returns {Object} How Nibble reacts to this task being done: its kind's reaction, with any words of its own.
 */
function taskReactionOf(item) {
  var base = TASK_REACTIONS[item.cat] || TASK_REACTIONS.other, text = (item.text || '').toLowerCase(), out = {};
  Object.keys(base).forEach(function (k) { out[k] = base[k]; });
  for (var i = 0; i < TASK_RULES.length; i++) {
    if (TASK_RULES[i][0].test(text)) { Object.keys(TASK_RULES[i][1]).forEach(function (k) { out[k] = TASK_RULES[i][1][k]; }); break; }
  }
  return out;
}

/** @returns {{x: number, y: number}} Where a ticked task is held up: over the pet's head, clear of its face. */
function holdPoint() {
  var r = petSvg.getBoundingClientRect();
  return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.02 };
}
var STAMP_SVG = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19"/><circle class="stamp-ring" cx="22" cy="22" r="14.5"/><path d="M13.5 22.8 L19.6 28.8 L31 15.6"/></svg>';
/**
 * A check-mark stamp thumps down at a point, then floats up and fades.
 * @param {{x: number, y: number}} at
 * @returns {Promise<void>} Resolves when it has gone.
 */
function stampAt(at) {
  var el = document.createElement('div');
  el.className = 'task-stamp';
  el.innerHTML = STAMP_SVG;
  document.body.appendChild(el);
  var x = at.x - 22, y = at.y - 22;
  if (reduceMotion) { el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; return wait(600).then(el.remove.bind(el)); }
  return el.animate([
    { transform: 'translate(' + x + 'px,' + (y - 14) + 'px) scale(2.4) rotate(-16deg)', opacity: 0 },
    { transform: 'translate(' + x + 'px,' + y + 'px) scale(.85) rotate(4deg)', opacity: 1, offset: 0.2 },
    { transform: 'translate(' + x + 'px,' + y + 'px) scale(1.05) rotate(0deg)', opacity: 1, offset: 0.32 },
    { transform: 'translate(' + x + 'px,' + y + 'px) scale(1) rotate(0deg)', opacity: 1, offset: 0.72 },
    { transform: 'translate(' + x + 'px,' + (y - 34) + 'px) scale(.9)', opacity: 0 }
  ], { duration: 1150, easing: 'ease-out', fill: 'forwards' }).finished.then(el.remove.bind(el), el.remove.bind(el));
}

/**
 * Queues what Nibble does for a ticked task: it catches the emoji, stamps it done and cheers.
 * @param {Item} item
 * @param {?DOMRect} fromRect Where the task's emoji was before the list re-rendered.
 */
function doTask(item, fromRect) {
  enqueue(function () {
    stopWalk();
    var sp = speed(), r = taskReactionOf(item), tired = isTired(), at = holdPoint();
    setFace(FACES.catching);
    return fly(item.emoji, fromRect ? center(fromRect) : { x: innerWidth / 2, y: innerHeight - 60 }, at, { duration: 560 * sp, scaleTo: 1, spin: 40 }).then(function () {
      // held up over its head, then stamped as done
      var held = emojiImg(item.emoji, '');
      held.className = 'flyer';
      held.style.transform = 'translate(' + (at.x - 17) + 'px,' + (at.y - 17) + 'px) scale(1.15)';
      document.body.appendChild(held);
      if (!reduceMotion) held.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1150, fill: 'forwards' }).finished.then(held.remove.bind(held), held.remove.bind(held)); else setTimeout(held.remove.bind(held), 600);
      stampAt(at);
      sound('stamp');
      setTimeout(function () { sound(r.sound); }, 110);
      setFace(tiredFace(r.face));
      crumbs(at, r.color, 10);
      drift(r.bits, { x: at.x, y: at.y - 24 }, 4);
      if (r.move) { var m = tiredMove(r.move); pulse(m[0], m[1]); }
      var late = item.due ? L.daysUntil(item.due, todayKey()) : null;   // done late, on the day or early: it says so
      if (tired) say(pick(TIRED_DONE), 1400);
      else if (late !== null && late < 0) talk('taskLate', ['better late than never!', 'finally! phew~', 'late, but done!'], 1500);
      else if (late === 0) talk('taskOnTime', ['just in time!', 'done today! ✧', 'right on the day!'], 1500);
      else if (late !== null && late > 1) talk('taskEarly', ['early bird!', 'way ahead of time!', 'so organised!'], 1500);
      else talk('task' + item.cat, r.lines, 1500);
      buzz(14);
      return wait(1000 * sp);
    }).then(function () {
      var again = repeatNote[item.id];
      delete repeatNote[item.id];
      if (again) { say(pick(['see you ' + again + '!', 'back ' + again + '!', 'again ' + again + '!']), 1300); return wait(1100 * sp); }
    }).then(function () {
      if (pending === 1 && L.mood(state.items) === 'stuffed') return celebrate();
    }).then(function () {
      // woken up by a task (it stays 'dozing'): a happy word, then right back to sleep
      if (baseState() === 'sleepy') {
        setFace(FACES.sleepy);
        say(pick(['proud of you… zzz', 'back to sleep… ♡', 'nn… good job… zzz', 'sweet dreams… yay you…']), 1500);
        return wait(1400);
      }
    });
  });
}

/**
 * Queues the reaction to a task that was put back: its emoji floats back to the list.
 * @param {Item} item
 */
function undoTask(item) {
  enqueue(function () {
    setFace(FACES.curious);
    pulse('hopsmall', 400);
    sound('off');
    var rect = rowEmojiRect(item.id);
    var btn = rect && document.querySelector('.item[data-id="' + item.id + '"] .emoji-btn');
    if (btn) btn.classList.add('gone');
    var to = rect ? center(rect) : { x: innerWidth / 2, y: innerHeight - 40 };
    var p = fly(item.emoji, holdPoint(), to, { duration: 480, scaleFrom: 1, scaleTo: 1, spin: -120, lift: 40 });
    setTimeout(function () { talk('taskUndo', ['oh, not done yet?', 'back on the list!', 'ok, later then!', 'un-ticked!'], 1400); }, 150);
    return p.then(function () {
      if (btn) btn.classList.remove('gone');
      return wait(600);
    });
  });
}

// ---------- the desk: writing on the clipboard, inspecting it ----------
/**
 * Both paws bring the clipboard and a prop to the middle: Nibble leans over its list.
 * @param {'pencil'|'glass'|''} prop  What the free hand holds.
 */
function deskOn(prop) {
  if (prop) pet.dataset.prop = prop; else delete pet.dataset.prop;
  pet.classList.remove('flipback');
  pet.classList.add('desk', 'flipped');   // the clipboard turns round: the paper faces him, not us
}
/**
 * Puts the clipboard back at his side (turning it over again) and the prop away.
 * @returns {Promise<void>}
 */
function deskOff() {
  pet.classList.remove('desk', 'writing', 'inspecting', 'mg-aha', 'mg-squint', 'flipped');
  pet.classList.add('flipback');
  delete pet.dataset.prop;
  return wait(340).then(function () { pet.classList.remove('flipback'); });
}
/**
 * Writes on the clipboard with the chubby pencil.
 * @param {function(): void} [during]  Called as the pencil starts to move (for the speech bubble).
 * @returns {Promise<void>} Resolves when the clipboard is back at its side.
 */
function writeOnClipboard(during) {
  if (reduceMotion) { if (during) during(); return wait(900); }
  stopWalk();
  setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: [] });
  deskOn('pencil');
  return wait(520).then(function () {
    pet.classList.add('writing');
    sound('scribble');
    if (during) during();
    return wait(1050);
  }).then(function () {
    pet.classList.remove('writing');
    return wait(300);
  }).then(deskOff);
}
/**
 * Pulls out a magnifying glass and inspects the list, then finds something.
 * @returns {Promise<void>}
 */
function inspectList() {
  if (reduceMotion) { say('hmm, let me look…', 1200); return wait(1400); }
  stopWalk();
  setFace({ eyes: 'open', mouth: 'o', arms: 'idle', x: [] });
  deskOn('glass');
  return wait(120).then(function () {   // the paw brings the glass over in .2s (styles.css): magnify as it arrives
    pet.classList.add('inspecting');
    eyesDo('wide');
    talk('inspect', ['hmm… let me look…', 'inspecting the list…', 'detective Nibble!', 'what do we have here…'], 1500);
    return wait(1100);
  }).then(function () {
    // after a moment he squints through the glass: his eye and the enlarged one in the lens both narrow
    pet.classList.add('mg-squint');
    eyesDo('squint');
    return wait(1200);
  }).then(function () {
    // found it: he closes his eyes and smiles (the closed eye is enlarged in the glass too, mg-aha), until he puts the glass away
    pet.classList.remove('mg-squint');
    pet.classList.add('mg-aha');
    setFace({ eyes: 'closed', mouth: 'smile', arms: 'idle', x: ['cheeks'] });
    pulse('hopsmall', 400);
    sound('ooh');
    talk('inspectFound', ['aha! all in order!', 'found it!', 'looks good!', 'we can do this!'], 1300);
    return wait(1300);
  }).then(function () {
    pet.classList.remove('inspecting', 'mg-aha');
    return deskOff();
  });
}
/**
 * Leans over the clipboard with a thoughtful hum and looks it over.
 * @returns {Promise<void>}
 */
function lookOverList() {
  stopWalk();
  setFace({ eyes: 'open', mouth: 'smile', arms: 'idle', x: [] });
  deskOn('');
  pulse('bob', 1400);
  return wait(500).then(function () {
    talk('lookOver', ['so much to do!', 'busy, busy!', "we've got this!", 'hmm hmm hmm…'], 1400);
    return wait(1800);
  }).then(deskOff);
}
/** The to-do list's own idle moves; each returns how long it takes. */
var TODO_MOVES = [
  function () { inspectList(); return 4600; },
  function () { writeOnClipboard(function () { say(pick(['note to self…', 'writing it down!', 'scribble scribble']), 1300); }); return 2300; },
  function () { lookOverList(); return 2800; }
];

/**
 * Nibble's reaction to a task you just added: it writes it on its clipboard.
 * @param {Item} item
 */
function addedTask(item) {
  if (busy) return;
  busy++;
  writeOnClipboard(function () {
    pulse('hopsmall', 400);
    talk('taskAdd' + item.cat, TASK_ADDED[item.cat] || TASK_ADDED.other, 1500);
  }).then(function () {
    busy--;
    if (!busy) settle();
    // the first few times, a nudge that a date and time can be added
    state.todoTips = (state.todoTips || 0) + 1;
    if (state.todoTips <= 3 && !item.due && !busy) say('tap "+ date/time" to set a reminder!', 2200);
  });
}

/** @returns {Item[]} A few to-dos with dates and times, for the developer tools. */
function sampleTodos() {
  var today = todayKey();
  return [
    ['Call mum', today, '18:00', ''], ['Book dentist', L.addDays(today, 1), '', ''], ['Water the plants', today, '', 'every3'],
    ['Pay rent', L.addDays(today, -2), '', 'monthly'], ['Do laundry', L.addDays(today, 3), '', 'weekly'], ['Reply to emails', '', '', ''],
    ["Buy Oma a birthday gift", L.addDays(today, 8), '', ''], ['Go for a run', today, '07:30', 'daily']
  ].map(function (r) {
    var item = L.createItem(r[0], state.overrides, newId(), undefined, 'todo');
    if (r[1]) item.due = r[1];
    if (r[2]) item.time = r[2];
    if (r[3]) item.repeat = r[3];
    return item;
  });
}

// ---------- due dates and repeats ----------
/** @returns {string} Today as YYYY-MM-DD, by the pet's clock. */
function todayKey() { return L.dayKey(petNow()); }
/** @returns {string} The time now as HH:MM, by the pet's clock. */
function clockKey() { var d = petNow(); return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
/** @returns {string} A time of day (HH:MM) as the options say: 14:30, or 2:30 PM. */
function fmtTime(t) {
  if (state.settings.time24) return t;
  var h = +t.slice(0, 2);
  return (h % 12 || 12) + ':' + t.slice(3) + ' ' + (h < 12 ? 'AM' : 'PM');
}
/** @returns {{days: number, state: string, label: string}} How a task's due day and time look now. */
function infoOf(item) {
  var info = L.dueInfo(item.due, todayKey(), item.time, clockKey());
  info.label = info.label.replace(/ (\d\d:\d\d)$/, function (m, t) { return ' ' + fmtTime(t); });
  return info;
}
/** @returns {string} What a row's date tag shows and how urgent it is, so the row is redrawn when either changes. */
function dueTagKey(item) { return dueTagText(item) + (item.due && dueTagText(item) ? '|' + infoOf(item).state : '') + '|' + state.settings.time24; }
/** @returns {string} The words on a task's date tag ('' when it has none or is done), also used to tell when a row needs redrawing. */
function dueTagText(item) {
  if (state.mode !== 'todo' || item.done) return '';
  if (!item.due) return '+ date/time';   // tells you a date and time can be added
  return (item.repeat ? '↻ ' : '') + infoOf(item).label;
}
/** @returns {?HTMLElement} The little tag showing when a task is due, or null. */
function dueTagOf(item) {
  var text = dueTagText(item);
  if (!text) return null;
  var tag = document.createElement('span');
  tag.className = 'due-tag due-' + (item.due ? infoOf(item).state : 'add');
  tag.textContent = text;
  return tag;
}
var alerted = {};   // task id -> its time has been announced (while the app is open)
/** @returns {Item[]} The tasks that are due today or late, soonest first (from whichever list is hidden, too). */
function dueTasks() {
  var list = isTodo() ? state.items : state.stash, today = todayKey();
  return list.filter(function (i) { return !i.done && i.due && i.due <= today; }).sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
}
var brandDue = $('brandDue'), clipboardEl = $('clipboard');
/** Keeps the clipboard's ticks and the due badge on the title in step with the lists. */
function updateTodoExtras() {
  // the clipboard has a tick for each third of the list that is done
  var total = state.items.length, done = state.items.filter(function (i) { return i.done; }).length;
  clipboardEl.dataset.ticks = String(isTodo() && total ? (done === total ? 3 : Math.min(2, Math.floor(done * 3 / total))) : 0);
  // on the shopping list, a badge on the title says how many tasks are due
  var n = isTodo() ? 0 : dueTasks().length;
  brandDue.hidden = !n;
  brandDue.textContent = n;
  brandEl.setAttribute('aria-label', 'Switch between the shopping list and the to-do list' + (n ? ' (' + n + ' to-do' + (n > 1 ? 's' : '') + ' due)' : ''));
}
// a new day: tags like "tomorrow" need redrawing when the app comes back to the front
document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });

var taskSheet = $('taskSheet'), taskFor = null;
/** @returns {?Item} The task the sheet is for. */
function taskItem() { return taskFor ? taskFind(taskFor) : null; }
/** @returns {?Item} A task by id, from the list on show or (when the shopping list shows) the to-do list waiting in the stash. */
function taskFind(id) { return find(id) || state.stash.filter(function (i) { return i.id === id; })[0] || null; }
var taskBackup = '', repeatWarn = '', taskFromCal = false;   // taskFromCal: opened from the calendar, which comes back when it closes
/**
 * Opens the sheet for a task's due day and repeat.
 * @param {string} id
 */
function openTaskSheet(id) {
  if (!taskFind(id)) return;
  taskFor = id;
  taskBackup = JSON.stringify(taskFind(id));   // Cancel puts the task back the way it was
  repeatWarn = '';
  renderTaskSheet();
  openDialog(taskSheet);
}
function chip(text, pressed, onTap) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'pill-btn'; b.textContent = text;
  b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  b.addEventListener('click', onTap);
  return b;
}
/** Draws the sheet's choices for the task it is open on. */
function renderTaskSheet() {
  var item = taskItem();
  if (!item) return;
  var today = todayKey(), tomorrow = L.addDays(today, 1), week = L.addDays(today, 7);
  $('taskName').value = item.text;
  $('dueChips').replaceChildren(
    chip('No date', !item.due, function () { setTaskDue(''); }),
    chip('Today', item.due === today, function () { setTaskDue(today); }),
    chip('Tomorrow', item.due === tomorrow, function () { setTaskDue(tomorrow); }),
    chip('In a week', item.due === week, function () { setTaskDue(week); })
  );
  $('dueDate').value = item.due || '';
  renderTimeSelects(item.time || '');
  renderRepeat(item);
}
var DOW_ORDER = [1, 2, 3, 4, 5, 6, 0], DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Draws the repeat drop-downs (how it repeats, which weekdays, for how long) for a task. */
/** @returns {boolean} Whether a repeat that ends on this day happens at least twice (one repeat after the first day). */
function untilFits(item, until) {
  return !until || !item.repeat || L.nextDue(item.due, item.repeat, item.due, item.days) <= until;
}
/** Drops an end day that no longer fits the repeat (every year for 1 week), and says so. */
function fixUntil(item) {
  if (item.until && !untilFits(item, item.until)) {
    delete item.until;
    repeatWarn = 'That repeat is longer than the time you chose, so it would only happen once. "For how long" went back to Forever.';
  }
}
function renderRepeat(item) {
  var sel = $('repeatSel');
  sel.replaceChildren.apply(sel, L.REPEATS.map(function (r) { return new Option(r.label, r.id); }));
  sel.value = item.repeat || '';
  var days = L.repeatDays(item);
  $('dowChips').hidden = item.repeat !== 'days';
  $('dowChips').replaceChildren.apply($('dowChips'), DOW_ORDER.map(function (n) {
    return chip(DOW_NAMES[n], (item.days || []).indexOf(n) !== -1, function () { toggleTaskDay(n); });
  }));
  $('untilField').hidden = !item.repeat;
  var us = $('untilSel');
  us.replaceChildren.apply(us, L.REPEAT_SPANS.map(function (s) {
    var short = s.id && !untilFits(item, L.untilFor(item.due, s.id));   // too short for this repeat: it could not happen again
    var o = new Option(s.label + (short ? ' (too short)' : ''), s.id);
    o.disabled = short;
    return o;
  }).concat([new Option('Until a day I pick…', 'date')]));
  var span = L.REPEAT_SPANS.filter(function (s) { return s.id && L.untilFor(item.due, s.id) === item.until; })[0];
  us.value = !item.until ? '' : span ? span.id : 'date';
  $('untilDateWrap').hidden = us.value !== 'date';
  $('untilDate').value = item.until || '';
  var r = L.REPEATS.filter(function (x) { return x.id === item.repeat; })[0];
  var what = item.repeat === 'days' ? (days.length ? 'on ' + DOW_ORDER.filter(function (n) { return days.indexOf(n) !== -1; }).map(function (n) { return DOW_NAMES[n]; }).join(', ') : 'on the days you pick') : r && r.label ? r.label.toLowerCase().replace(/ \(.*/, '') : '';
  $('repeatNote').classList.toggle('warn', !!repeatWarn);
  var warn = repeatWarn; repeatWarn = '';
  $('repeatNote').textContent = warn ? warn : item.repeat ? 'Comes back ' + what + (item.until ? ' until ' + L.dueInfo(item.until, '0000-00-00').label : '') + ', when you tick it off.' : item.due ? 'A repeating task comes back on its next day when you tick it off.' : 'Picking a repeat sets the date to today.';
}
/**
 * Gives the open task a due day (or none), and puts the tasks in due order.
 * @param {string} due  YYYY-MM-DD, or '' for none.
 */
function setTaskDue(due) {
  var item = taskItem();
  if (!item) return;
  if (due && !L.isDayKey(due)) return;
  if (due) item.due = due; else { delete item.due; delete item.repeat; delete item.time; }
  delete alerted[item.id];
  fixUntil(item);
  state.items = L.sortByDue(state.items, todayKey());
  save();
  render();
  renderTaskSheet();
  if (due && !busy && baseState() !== 'sleepy') say(pick(['noted, ' + infoOf(taskItem()).label + '!', 'I will remind you!', 'on my calendar!']), 1200);
}
/**
 * Makes the open task repeat (or stop).
 * @param {string} repeat  A REPEATS id, or '' for never.
 */
function setTaskRepeat(repeat) {
  var item = taskItem();
  if (!item) return;
  if (repeat) {
    item.repeat = repeat;
    if (!item.due) item.due = todayKey();
    if (repeat === 'days' && !(item.days || []).length) item.days = [new Date(item.due + 'T12:00').getDay()];
    if (repeat !== 'days') delete item.days;
    var set = L.repeatDays(item);
    if (set && set.length) item.due = L.firstOnDays(item.due < todayKey() ? todayKey() : item.due, set);   // it starts on the first chosen weekday
    if (item.until && item.until < item.due) delete item.until;
    fixUntil(item);
  } else { delete item.repeat; delete item.until; delete item.days; }
  state.items = L.sortByDue(state.items, todayKey());
  save();
  render();
  renderTaskSheet();
}
/**
 * Sets how long the open task keeps repeating: a span from its first day, or an exact last day.
 * @param {string} span  A REPEAT_SPANS id ('' for forever), or a day (YYYY-MM-DD).
 */
function setTaskUntil(span) {
  var item = taskItem();
  if (!item || !item.repeat) return;
  var until = L.isDayKey(span) ? span : L.untilFor(item.due, span);
  if (until && until < item.due) { repeatWarn = 'It cannot end before it starts.'; renderTaskSheet(); return; }
  if (until && !untilFits(item, until)) { repeatWarn = 'That is too soon: it would only happen once. Pick a later day.'; renderTaskSheet(); return; }
  if (until) item.until = until; else delete item.until;
  save();
  renderTaskSheet();
}
$('untilDate').addEventListener('change', function () { setTaskUntil($('untilDate').value); });
$('repeatSel').addEventListener('change', function () { setTaskRepeat($('repeatSel').value); });
$('untilSel').addEventListener('change', function () {
  var v = $('untilSel').value;
  if (v === 'date') { $('untilDateWrap').hidden = false; $('untilDate').focus(); return; }
  setTaskUntil(v);
});
/** Turns one weekday on or off for a 'certain days' repeat. @param {number} n 0 (Sunday) to 6 */
function toggleTaskDay(n) {
  var item = taskItem();
  if (!item || item.repeat !== 'days') return;
  var days = item.days || [], at = days.indexOf(n);
  if (at !== -1) { if (days.length === 1) return; days.splice(at, 1); } else days.push(n);   // at least one day stays
  item.days = days;
  item.due = L.firstOnDays(item.due < todayKey() ? todayKey() : item.due, days);
  fixUntil(item);
  state.items = L.sortByDue(state.items, todayKey());
  save();
  render();
  renderTaskSheet();
}
$('dueDate').addEventListener('change', function () { setTaskDue($('dueDate').value); });
/**
 * Gives the open task a time of day (which also gives it today as its day if it had none), or takes it off.
 * @param {string} time  HH:MM, or '' for none.
 */
function setTaskTime(time) {
  var item = taskItem();
  if (!item || (time && !L.isTimeKey(time))) return;
  if (time) { item.time = time; if (!item.due) item.due = todayKey(); } else delete item.time;
  delete alerted[item.id];
  state.items = L.sortByDue(state.items, todayKey());
  save();
  render();
  renderTaskSheet();
  if (time && !busy && baseState() !== 'sleepy') say(pick(['I will tell you at ' + time + '!', 'ding at ' + time + '!', 'on my clock!']), 1300);
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function opt(value, text) { var o = document.createElement('option'); o.value = value; o.textContent = text; return o; }
/** Draws the hour, minute and AM/PM choices (12 or 24 hour, by the options) set to a time. */
function renderTimeSelects(time) {
  var h = $('timeH'), m = $('timeM'), ap = $('timeAP'), h24 = state.settings.time24, hh = time ? +time.slice(0, 2) : -1, mm = time ? +time.slice(3) : 0, i;
  h.replaceChildren(opt('', '--'));
  for (i = h24 ? 0 : 1; i <= (h24 ? 23 : 12); i++) h.appendChild(opt(String(i), h24 ? pad2(i) : String(i)));
  h.value = time ? String(h24 ? hh : hh % 12 || 12) : '';
  m.replaceChildren();
  for (i = 0; i < 60; i += 5) m.appendChild(opt(String(i), pad2(i)));
  if (mm % 5) { m.appendChild(opt(String(mm), pad2(mm))); }
  m.value = String(mm);
  ap.hidden = h24;
  ap.replaceChildren(opt('AM', 'AM'), opt('PM', 'PM'));
  ap.value = hh >= 12 ? 'PM' : 'AM';
}
/** Reads the three choices into a time of day (or none). */
function readTimeSelects() {
  var h = $('timeH').value;
  if (h === '') { setTaskTime(''); return; }
  var hour = state.settings.time24 ? +h : (+h % 12) + ($('timeAP').value === 'PM' ? 12 : 0);
  setTaskTime(pad2(hour) + ':' + pad2(+$('timeM').value));
}
['timeH', 'timeM', 'timeAP'].forEach(function (id) { $(id).addEventListener('change', readTimeSelects); });
$('clearTime').addEventListener('click', function () { setTaskTime(''); });
$('taskDelete').addEventListener('click', function () {
  var id = taskFor;
  taskSheet.close();
  if (id && !find(id)) { state.stash = state.stash.filter(function (i) { return i.id !== id; }); save(); render(); sound('remove'); }   // a plan opened from the calendar while the shopping list shows
  else if (id) { sound('remove'); removeItem(id); }
});
$('taskEmoji').addEventListener('click', function () {
  var id = taskFor;
  taskFromCal = false;
  taskSheet.close();
  if (id) openPicker(id);
});
$('taskSave').addEventListener('click', function () { taskSheet.close(); sound('pick'); });
$('taskCancel').addEventListener('click', function () {
  var item = taskItem();
  if (item && taskBackup) {
    var snap = JSON.parse(taskBackup);
    Object.keys(item).forEach(function (k) { if (!(k in snap)) delete item[k]; });
    Object.assign(item, snap);
    state.items = L.sortByDue(state.items, todayKey());
    save();
    render();
  }
  taskSheet.close();
  sound('tap');
});
$('taskName').addEventListener('input', function () {
  var item = taskItem(), v = $('taskName').value.trim();
  if (item && v) { item.text = v; save(); render(); }
});
$('taskName').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('taskName').blur(); } });
taskSheet.addEventListener('close', function () {
  taskFor = null; taskBackup = '';
  if (taskFromCal) { taskFromCal = false; renderCalendar(); openDialog(calSheet); }   // back to the calendar
});

// a task you tick off that repeats puts its next one back on the list (and un-ticking takes that one away again)
var repeatNote = {};   // task id -> when its next one is due, for Nibble to mention
/**
 * @param {Item} item  The task that was just ticked or un-ticked.
 */
function repeatTask(item) {
  if (item.done && item.repeat && !(item.until && L.nextDue(item.due, item.repeat, todayKey(), item.days) > item.until)) {   // a repeat with an end stops after its last day
    var due = L.nextDue(item.due, item.repeat, todayKey(), item.days);
    var copy = L.createItem(item.text, state.overrides, newId(), Date.now(), 'todo');
    copy.emoji = item.emoji; copy.cat = item.cat; copy.due = due; copy.repeat = item.repeat;
    if (item.until) copy.until = item.until;
    if (item.days) copy.days = item.days.slice();
    if (item.time) copy.time = item.time;
    item.spawned = copy.id;
    L.addToList(state.items, copy);
    state.items = L.sortByDue(state.items, todayKey());
    freshIds[copy.id] = true;
    repeatNote[item.id] = infoOf(copy).label;
  } else if (!item.done && item.spawned) {
    var next = find(item.spawned);
    if (next && !next.done) state.items = state.items.filter(function (i) { return i !== next; });
    delete item.spawned;
  }
}

// ---------- Nibble reminds you ----------
var lastNag = 0;
/**
 * Nibble mentions tasks that are due today or late.
 * @param {boolean} [idle]  Called from its idle moments: only on the to-do list, and not too often.
 * @returns {boolean} Whether it said something.
 */
function dueNag(idle) {
  if (busy || baseState() === 'sleepy' || document.hidden) return false;
  var due = dueTasks();
  if (!due.length) return false;
  if (idle && (!isTodo() || Date.now() - lastNag < 10 * 60 * 1000)) return false;
  lastNag = Date.now();
  var late = due.filter(function (i) { return i.due < todayKey(); }).length, first = due[0], hint = isTodo() ? '' : '\ncheck the to-do list ♡';
  setFace(late ? FACES.sheepish : FACES.curious);
  pulse('hop', 460);
  if (due.length === 1) {
    talk(late ? 'dueLate' : 'dueToday', late ? ['{x} is overdue…' + hint, 'psst… {x}?' + hint, '{x} is late!' + hint] : ['{x} is due today!' + hint, "don't forget {x}!" + hint, 'psst, {x} today!' + hint], 2000, { x: first.text.toLowerCase() });
  } else {
    talk('dueMany', ['{n} to-dos are due!' + hint, '{n} tasks need us!' + hint, 'busy day: {n} to-dos!' + hint], 2000, { n: due.length });
  }
  setTimeout(function () { if (!busy) settle(); }, 1800);
  return true;
}

/**
 * When a task's time comes while the app is open, Nibble tells you (once). Tasks already past their time when
 * the app opens are only marked, as the start-up reminder covers them.
 * @param {boolean} [quiet]  Only mark them.
 */
var tagSig = '';
function timeCheck(quiet) {
  // a tag turns pink when its time passes, or says "today" after midnight: redraw when any tag changes
  var sig = state.items.map(dueTagKey).join(';') + '|' + state.items.filter(function (i) { return L.isFarOff(i, todayKey()); }).length;   // a plan 10 days away joins the list
  if (sig !== tagSig) { var first = tagSig === ''; tagSig = sig; if (!first && !busy) render(); }
  var today = todayKey(), now = clockKey(), hit = [];
  state.items.concat(state.stash).forEach(function (i) {
    if (i.done || !i.time || i.due !== today || i.time > now || alerted[i.id]) return;
    alerted[i.id] = true;
    hit.push(i);
  });
  if (quiet || !hit.length || document.hidden) return;
  if (baseState() === 'sleepy') return;
  var hint = isTodo() ? '' : '\ncheck the to-do list ♡';
  var go = function () {
    if (busy) { setTimeout(go, 1500); return; }
    setFace(FACES.tada);
    pulse('hop', 460);
    sound('ring');
    buzz([40, 60, 40]);
    talk('timeUp', hit.length === 1 ? ["it's time: {x}!" + hint, '{x} — now!' + hint, 'ding ding! {x}!' + hint] : ['{n} things are due now!' + hint, 'ding ding! {n} to-dos!' + hint], 2400, { x: hit[0].text.toLowerCase(), n: hit.length });
    setTimeout(function () { if (!busy) settle(); }, 2200);
  };
  go();
}
timeCheck(true);
setInterval(timeCheck, 20000);

// ---------- ticking a task before its time ----------
var earlySheet = $('earlySheet'), earlyFor = null;
/**
 * A task with a time that is ticked off before that time gets a warning first.
 * @param {string} id
 * @returns {boolean} True if the warning is showing (the tick waits for an answer).
 */
function warnIfEarly(id) {
  var item = find(id);
  if (!isTodo() || !item || item.done || !item.time || !item.due) return false;
  var today = todayKey(), early = item.due > today || (item.due === today && item.time > clockKey());
  if (!early) return false;
  earlyFor = id;
  $('earlyText').textContent = '“' + item.text + '” is for ' + infoOf(item).label + '. Tick it off anyway?';
  openDialog(earlySheet);
  if (!busy && baseState() !== 'sleepy') { setFace(FACES.suspicious); say(pick(["hey, it's early!", 'psst… not yet!', 'too soon?']), 1400); }
  return true;
}
$('earlyYes').addEventListener('click', function () {
  var id = earlyFor;
  earlyFor = null;
  earlySheet.close();
  if (id) toggle(id);
});
$('earlyNo').addEventListener('click', function () { earlyFor = null; earlySheet.close(); if (!busy) settle(); });
earlySheet.addEventListener('close', function () { earlyFor = null; if (!busy) settle(); });
