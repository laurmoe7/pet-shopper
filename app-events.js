// Adding items, tapping and long-pressing rows.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- events ----------
addForm.addEventListener('submit', function (e) {
  e.preventDefault();
  addItem(addInput.value);
  addInput.value = '';
  addPreview.replaceChildren();
  // keep typing: if the keyboard was up, stay in the box (as the Enter key already does)
  if (document.documentElement.classList.contains('typing')) addInput.focus();
});
// tapping Add would move focus to the button and close the keyboard; keep it in the text box instead
addForm.querySelector('.add-btn').addEventListener('mousedown', function (e) {
  if (document.activeElement === addInput) e.preventDefault();
});
// ---------- typing: keep the text box and the pet in view ----------
// With the keyboard up there is little room. While you type, the bottom bar hides (html.typing). When the box is the
// Add box, it sits just above the keyboard (html.typing-add, fixed to the bottom of the visible area) with the page at
// the top, so the pet and its speech bubble stay in view above it while you add items.
function isTextBox(el) { return el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search)$/.test(el.type))); }
var rootEl = document.documentElement;
/** Puts the Add box right above the keyboard: the gap between the visible area and the bottom of the layout. */
function placeAddBox() {
  if (!rootEl.classList.contains('typing-add')) return;
  var vv = window.visualViewport;
  var gap = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0;
  rootEl.style.setProperty('--kb-gap', gap + 'px');
  rootEl.style.setProperty('--add-h', addForm.offsetHeight + 'px');
  if (scrollY) scrollTo(0, 0);
}
// only on touch screens, where a keyboard slides up: with a real keyboard the box stays where it is
var touchScreen = window.matchMedia && matchMedia('(pointer: coarse)').matches;
document.addEventListener('focusin', function (e) {
  if (!touchScreen || !isTextBox(e.target)) return;
  rootEl.classList.add('typing');
  rootEl.style.setProperty('--dock-h', '0px');
  if (e.target === addInput) {
    rootEl.classList.add('typing-add');
    placeAddBox();
    setTimeout(placeAddBox, 300); // again once the keyboard is up
  }
});
document.addEventListener('focusout', function (e) {
  if (!touchScreen || !isTextBox(e.target)) return;
  setTimeout(function () {
    if (isTextBox(document.activeElement)) { if (document.activeElement !== addInput) rootEl.classList.remove('typing-add'); return; }
    rootEl.classList.remove('typing', 'typing-add');
    dispatchEvent(new Event('resize')); // measures the bottom bar again
  }, 60);
});
// Closing the keyboard with the back button leaves the box focused, so treat a keyboard that goes away as done typing
if (window.visualViewport) {
  (function () {
    var tallest = visualViewport.height, last = visualViewport.height;
    function onViewport() {
      var h = visualViewport.height;
      tallest = Math.max(tallest, h);
      placeAddBox();
      if (h > last && h > tallest * 0.85 && rootEl.classList.contains('typing')) document.activeElement.blur();
      last = h;
    }
    visualViewport.addEventListener('resize', onViewport);
    visualViewport.addEventListener('scroll', placeAddBox);
  })();
}

var lastPreview = '';
addInput.addEventListener('input', function () {
  var t = addInput.value.trim();
  if (!t) { addPreview.replaceChildren(); lastPreview = ''; return; }
  var e = L.emojiFor(t, state.overrides, state.mode).emoji;
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
  if (e.target.closest('.check')) { if (!warnIfEarly(li.dataset.id)) toggle(li.dataset.id); }
  else if (e.target.closest('.emoji-btn')) openPicker(li.dataset.id);
  else if (li.classList.contains('done')) return;
  else if (isTodo()) openTaskSheet(li.dataset.id);   // the task's words or date tag
  else openItemSheet(li.dataset.id);                 // the item's words or amount
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

clearBtn.addEventListener('click', function () {
  state.items = state.items.filter(function (i) { return !i.done; });
  sound('remove');
  save();
  render();
  if (!busy) { pulse('hop', 460); say(state.items.length ? 'fresh start!' : (L.isNight(petNow()) ? 'bedtime…' : 'all tidy!'), 1300); }
});

// tap Nibble for a little reaction
pet.addEventListener('click', function () {
  if (busy) return;
  pulse('hop', 460);
  var s = baseState();
  if (s !== 'stuffed' && Math.random() < 0.12 && offerSuggestion()) return;
  if (s === 'sleepy') talk('sleepy', ['zzz… snack?'], 1200);
  else if (isTodo()) talk(s === 'stuffed' ? 'todoTapDone' : 'todoTap', s === 'stuffed' ? ['all done ♡', 'nothing left to do!', 'so proud of us!'] : ['hi!', "what's next?", "let's do it!", 'hehe'], 1200);
  else if (s === 'stuffed') talk('full', ['so full…', 'what a feast!', 'all done ♡'], 1200);
  else talk('tap', ['hi!', 'hungry!', 'shopping?', 'hehe'], 1200);
});
