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
// ---------- typing: keep the text box in view ----------
// With the keyboard up there is little room, and the bottom bar and the pet would cover the text box. While you type,
// the bar is hidden and the pet scrolls away with the page (html.typing), and the box is scrolled into view.
function isTextBox(el) { return el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search)$/.test(el.type))); }
function showTextBox() {
  var el = document.activeElement;
  if (isTextBox(el) && !el.closest('dialog')) el.scrollIntoView({ block: 'center' });
}
document.addEventListener('focusin', function (e) {
  if (!isTextBox(e.target)) return;
  document.documentElement.classList.add('typing');
  document.documentElement.style.setProperty('--dock-h', '0px');
  setTimeout(showTextBox, 350);
});
document.addEventListener('focusout', function (e) {
  if (!isTextBox(e.target)) return;
  setTimeout(function () {
    if (isTextBox(document.activeElement)) return; // moved to another text box
    document.documentElement.classList.remove('typing');
    dispatchEvent(new Event('resize')); // measures the bottom bar again
  }, 60);
});
// Closing the keyboard with the back button leaves the box focused, so treat a keyboard that goes away as done typing
if (window.visualViewport) {
  (function () {
    var tallest = visualViewport.height, last = visualViewport.height;
    visualViewport.addEventListener('resize', function () {
      var h = visualViewport.height;
      tallest = Math.max(tallest, h);
      if (h < last) showTextBox();
      else if (h > last && h > tallest * 0.85 && document.documentElement.classList.contains('typing')) document.activeElement.blur();
      last = h;
    });
  })();
}

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
