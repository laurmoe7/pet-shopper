// Drop-down menus: the closed menu is the page's own round pill (styles.css); when it opens, this shows a round, soft list in the
// app's style instead of the browser's plain box. The real <select> stays underneath: it keeps the value and fires its usual
// "change" event, so the code that uses it does not know the difference. Keyboard arrows still work on the closed menu.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var selectPop = null, selectFor = null;
/** Closes the open list, if any. */
function closeSelectPop() {
  if (selectPop) { selectPop.remove(); selectPop = null; }
  if (selectFor) { selectFor.setAttribute('aria-expanded', 'false'); selectFor = null; }
}
/**
 * Shows the list of choices for a menu, under it (or over it when there is no room below).
 * @param {HTMLSelectElement} sel
 */
function openSelectPop(sel) {
  closeSelectPop();
  selectFor = sel;
  sel.setAttribute('aria-expanded', 'true');
  var pop = document.createElement('div');
  pop.className = 'cs-pop';
  pop.setAttribute('role', 'listbox');
  Array.prototype.forEach.call(sel.options, function (o) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cs-opt';
    b.setAttribute('role', 'option');
    b.textContent = o.textContent;
    b.disabled = o.disabled;
    b.setAttribute('aria-selected', String(o.value === sel.value));
    b.addEventListener('click', function () {
      closeSelectPop();
      if (sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      sel.focus();
    });
    pop.appendChild(b);
  });
  document.body.appendChild(pop);
  selectPop = pop;
  var r = sel.getBoundingClientRect(), width = Math.max(r.width, 150), below = innerHeight - r.bottom - 12, above = r.top - 12;
  pop.style.minWidth = width + 'px';
  pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + 'px';
  var openUp = below < Math.min(pop.scrollHeight, 220) && above > below;
  pop.style.maxHeight = Math.min(300, openUp ? above : below) + 'px';
  if (openUp) pop.style.bottom = (innerHeight - r.top + 6) + 'px'; else pop.style.top = (r.bottom + 6) + 'px';
  var cur = pop.querySelector('[aria-selected="true"]');
  if (cur) pop.scrollTop = cur.offsetTop - pop.clientHeight / 2 + cur.offsetHeight / 2;
  sound('tap');
}
// take over the opening of every menu (also the ones the page makes later)
document.addEventListener('mousedown', function (e) {
  var sel = e.target.closest && e.target.closest('select');
  if (sel && !sel.disabled) { e.preventDefault(); sel.focus(); if (selectFor === sel) closeSelectPop(); else openSelectPop(sel); }
  else if (selectPop && !e.target.closest('.cs-pop')) closeSelectPop();
}, true);
document.addEventListener('keydown', function (e) {
  var sel = e.target.closest && e.target.closest('select');
  if (sel && (e.key === ' ' || e.key === 'Enter') && !selectPop) { e.preventDefault(); openSelectPop(sel); }
  else if (e.key === 'Escape' && selectPop) { e.stopPropagation(); closeSelectPop(); }
}, true);
window.addEventListener('resize', closeSelectPop);
document.addEventListener('scroll', function (e) { if (selectPop && !e.target.closest) closeSelectPop(); else if (selectPop && !(e.target.closest && e.target.closest('.cs-pop'))) closeSelectPop(); }, true);
