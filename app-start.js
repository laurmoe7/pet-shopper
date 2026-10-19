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
var swBoot = window.SwBoot || {};
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // a new build takes over as soon as it is installed; reload once so the page runs the new code too. Before the app shows, that happens at once (the
  // loading card stays up through it); once it shows, the phone reloads when the app is next out of sight, so it never starts again under her finger.
  // The Windows app reloads at once as before (its window is never out of sight).
  var hadWorker = !!swBoot.had, reloaded = false;
  var reloadNow = function () { if (reloaded) return; reloaded = true; location.reload(); };
  var tookOver = function () {
    if (!hadWorker) { hadWorker = true; revealApp(); return; }   // (the first install: nothing to reload)
    if (!bootRevealed || window.nibbleDesktop) { reloadNow(); return; }
    if (document.visibilityState === 'hidden') reloadNow();
    else document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') reloadNow(); });
  };
  swBoot.onChange = tookOver;
  if (swBoot.changed) tookOver();   // (it took over while the scripts were loading)
  // never wait long for the network: the phone shows the app after 2.5 s at most (a newer build found later is used from the next open), the Windows app after 6 s
  bootTimer = setTimeout(revealApp, window.nibbleDesktop ? 6000 : 2500);
  // register() does not look for a newer build when this one is already registered (the browser does that later, in the background, after the page
  // has shown: the page then reloaded a few seconds in, and the loading card came back). So the check is made while the card is still up: it starts at
  // the top of index.html when a build is installed, and here on the first visit.
  (swBoot.check || navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
    return reg.update().then(function () { return reg; }, function () { return reg; });
  })).then(function (reg) {
    function waitForTakeover() { clearTimeout(bootTimer); bootTimer = setTimeout(revealApp, 10000); }   // a newer build is on its way: wait for it
    if (reloaded) return;   // it has taken over already and the page is reloading: the card stays up
    if (bootRevealed) return;   // the app is showing already: a newer build is used next time
    if (reg.installing || reg.waiting) waitForTakeover(); else revealApp();
    reg.addEventListener('updatefound', function () { if (!bootRevealed) waitForTakeover(); });
  }).catch(function () { revealApp(); /* not available here */ });
} else {
  revealApp();
}
