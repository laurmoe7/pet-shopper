// Fades: a menu or list that has more below fades out at its bottom edge (there are no scroll bars).
// Scrolling areas get the class fade-b while there is more to see under them; the page itself gets a soft fade
// above the bottom bar (.page-fade). Plain scripts sharing one scope, loaded in the order listed in index.html.
'use strict';

var FADE_SELECTORS = '.dress-panels, .pet-sheet .picker-inner, .options, .goal-list, .fav-list, .cal-list, .picker-grid, .stamp-grid, .anim-list, .recipe-list';
var pageFade = document.createElement('div');
pageFade.className = 'page-fade';
pageFade.setAttribute('aria-hidden', 'true');
document.body.appendChild(pageFade);
/** Marks one scrolling area as having more below it (or not). */
function updateFade(el) {
  el.classList.toggle('fade-b', el.scrollHeight - el.scrollTop - el.clientHeight > 4 && el.clientHeight > 0);
}
/** Updates every fade: the menus, and the one over the page. */
function refreshFades() {
  document.querySelectorAll(FADE_SELECTORS).forEach(updateFade);
  var room = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
  pageFade.classList.toggle('on', room > 6);
}
var fadeQueued = false;
/** Updates the fades once the page has settled (several changes in a row only cost one update). */
function fadeSoon() {
  if (fadeQueued) return;
  fadeQueued = true;
  requestAnimationFrame(function () { fadeQueued = false; refreshFades(); });
}
document.addEventListener('scroll', fadeSoon, true);
window.addEventListener('resize', fadeSoon);
// menus change when they open, switch tabs or fill up
var fadeWatcher = new MutationObserver(fadeSoon);
document.querySelectorAll('dialog').forEach(function (d) { fadeWatcher.observe(d, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] }); });
// and the lists change when items come and go
fadeWatcher.observe(document.querySelector('.list-area'), { childList: true, subtree: true });
fadeSoon();
