// Start: Nibble wakes up, and the service worker registers.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- start: Nibble wakes up with a stretch ----------
applyListMode();
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
    var top = L.topFavourites(state.pet, 1)[0];
    if (top && top.count >= 3 && Math.random() < 0.3) talk('memoryHi', ['thinking about {item}…', 'psst, more {item}?', 'hi! {item} soon?'], 1900, { item: top.label.toLowerCase() });
    else if (away > 6 * 3600 * 1000) say('*yaaawn* hi!', 1400);
    else talk('hi', ['oh, hi!'], 1400);
    setTimeout(function () { busy--; if (!busy) settle(); }, 1000);
  }, 700);
}
state.lastOpen = Date.now();
save();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // a new build takes over as soon as it is installed; reload once so the page runs the new code too
  var hadWorker = !!navigator.serviceWorker.controller, reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadWorker || reloaded) { hadWorker = true; return; }
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () { /* not available here */ });
}
