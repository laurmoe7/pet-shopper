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
  $('listHint').textContent = todo ? "Tap a task's emoji, or long-press the task, to pick a different one." : "Tap an item's emoji, or long-press the item, to pick a different one.";
  addPreview.replaceChildren(); lastPreview = '';
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
      if (tired) say(pick(TIRED_DONE), 1400);
      else talk('task' + item.cat, r.lines, 1500);
      buzz(14);
      return wait(1000 * sp);
    }).then(function () {
      if (pending === 1 && L.mood(state.items) === 'stuffed') return celebrate();
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

/**
 * Nibble's reaction to a task you just added.
 * @param {Item} item
 */
function addedTask(item) {
  if (busy) return;
  pulse('hop', 460);
  setFace(FACES.happy);
  setTimeout(function () { if (!busy) settle(); }, 600);
  talk('taskAdd' + item.cat, TASK_ADDED[item.cat] || TASK_ADDED.other, 1500);
}
