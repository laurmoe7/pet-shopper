// Start: Fumu wakes up, and the service worker registers.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- start: Fumu wakes up with a stretch ----------
applyListMode();
render();
var wakeState = baseState();
// before noon he does the morning exercise first (app-idle.js), and the usual hello and reminders come after it
var morning = wakeState !== 'sleepy' && morningOk();
/** The hello he says on opening: what he was thinking about, a yawn after a long time away, or a plain hi. */
function startupTalk() {
  var away = Date.now() - (state.lastOpen || 0);
  var top = L.topFavourites(state.pet, 1)[0];
  if (top && top.count >= 3 && Math.random() < 0.3) talk('memoryHi', ['thinking about {item}…', 'psst, more {item}?', 'hi! {item} soon?'], 1900, { item: top.label.toLowerCase() });
  else if (away > 6 * 3600 * 1000) say('*yaaawn* hi!', 1400);
  else talk('hi', state.player.name ? ['oh, hi!', 'hi, ' + state.player.name + '!', 'welcome back, ' + state.player.name + '!'] : ['oh, hi!'], 1400);
}
if (wakeState !== 'sleepy') {
  busy++;
  pet.dataset.state = 'sleepy';
  setFace(FACES.sleepy);
  setTimeout(function () {
    setFace(FACES.wake);
    pulse('stretch', 1000);
    if (!morning) startupTalk();
    setTimeout(function () { busy--; if (!busy) settle(); }, 1000);
  }, 700);
}
function afterMorning() { startupTalk(); setTimeout(dueNag, 2600); }
if (morning) setTimeout(function () { if (!morningStart(afterMorning)) afterMorning(); }, 2000);   // a tap stops the dance, then the hello comes
else setTimeout(function () { dueNag(); }, 3800);   // then it mentions anything due
state.lastOpen = Date.now();
save();

// the app is built: the loading card fades out and the page shows (index.html). It waits until the service worker has settled: when a newer build
// is installing, the page reloads itself once it takes over, and the card stays up through that instead of showing the app and then loading again
var bootRevealed = false, bootTimer = 0;
function revealApp() {
  if (bootRevealed) return;
  bootRevealed = true; clearTimeout(bootTimer);
  var boot = document.getElementById('boot');
  if (boot) boot.classList.add('out');
  document.documentElement.classList.remove('booting');
  setTimeout(function () { if (boot && boot.parentNode) boot.parentNode.removeChild(boot); }, 500);
}
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // a new build takes over as soon as it is installed; reload once so the page runs the new code too
  var hadWorker = !!navigator.serviceWorker.controller, reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadWorker || reloaded) { hadWorker = true; revealApp(); return; }   // (the first install: nothing to reload)
    reloaded = true;
    location.reload();   // (the loading card stays up until the new page has started)
  });
  bootTimer = setTimeout(revealApp, 6000);   // never wait long for the network
  // register() does not look for a newer build when this one is already registered (the browser does that later, in the background, after the page
  // has shown: the page then reloaded a few seconds in, and the loading card came back). So the check is made here, while the card is still up.
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
    return reg.update().then(function () { return reg; }, function () { return reg; });
  }).then(function (reg) {
    function waitForTakeover() { clearTimeout(bootTimer); bootTimer = setTimeout(revealApp, 10000); }   // a newer build is on its way: wait for it
    if (reloaded) return;   // it has taken over already and the page is reloading: the card stays up
    if (reg.installing || reg.waiting) waitForTakeover(); else revealApp();
    reg.addEventListener('updatefound', function () { if (!bootRevealed) waitForTakeover(); });
  }).catch(function () { revealApp(); /* not available here */ });
} else {
  revealApp();
}
