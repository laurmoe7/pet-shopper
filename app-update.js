// Updates on the phone: a new build was only looked for while the loading card was up (app-start.js), so an app left open in the
// background never noticed one. Now it asks which build is newest when it comes back to the front and every few minutes while open,
// and a card says "Build N is ready" with Update (nothing reloads by itself). Options has "Check for updates" too.
// The newest build is read from sw.js (its cache name, nibble-vNN) fetched with a fresh query and no caching, so neither the phone's
// own copy nor the site's servers can answer with an old one. Not in the Windows app (its shell loads the new page when it restarts).
'use strict';

var UPDATE_EVERY_MS = 5 * 60 * 1000, updLast = 0, updNewest = '', updSkipped = '', updBusy = false;

/** @returns {Promise<string>} The newest build on the site ('' when it could not be asked). */
function newestBuild() {
  return fetch('sw.js?check=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (t) { var m = /nibble-v(\d+)/.exec(t); return m ? m[1] : ''; }, function () { return ''; });
}
/** @returns {Promise<boolean|null>} Whether a newer build is out (null: could not tell, offline say). */
function updateCheck() {
  updLast = Date.now();
  return newestBuild().then(function (b) {
    if (!b) return null;
    updNewest = b;
    return +b > +BUILD;
  });
}

/** Fetches the new build and reloads (app-start.js reloads the page once the new service worker takes over). */
function updateNow(say) {
  if (updBusy) return;
  updBusy = true;
  say('Updating…');
  var sw = 'serviceWorker' in navigator && location.protocol === 'https:' && navigator.serviceWorker.controller;
  if (!sw) { location.reload(); return; }
  navigator.serviceWorker.getRegistration().then(function (reg) { return reg && reg.update(); }).catch(function () {});
  // the site's servers can take a few minutes to hand out a build that has just gone up
  setTimeout(function () { updBusy = false; say('Still on its way. Try again in a few minutes.'); }, 20000);
}

// ---------- the card ----------
function showUpdateReady() {
  if (document.querySelector('.phone-update-card') || updNewest === updSkipped) return;
  var card = document.createElement('div');
  card.className = 'inbox-card update-card phone-update-card';
  card.setAttribute('role', 'status');
  var text = document.createElement('div'), t = document.createElement('b'), d = document.createElement('span');
  text.className = 'inbox-text';
  t.textContent = 'Build ' + updNewest + ' is ready';
  d.textContent = 'You have ' + BUILD + '.';
  text.append(t, d);
  var acts = document.createElement('div');
  acts.className = 'inbox-actions';
  var go = document.createElement('button'); go.type = 'button'; go.textContent = 'Update';
  go.addEventListener('click', function (e) { e.stopPropagation(); sound('tap'); updateNow(function (s) { d.textContent = s; }); });
  var later = document.createElement('button'); later.type = 'button'; later.textContent = '✕'; later.className = 'inbox-done'; later.setAttribute('aria-label', 'Later');
  later.addEventListener('click', function (e) { e.stopPropagation(); updSkipped = updNewest; card.remove(); });
  acts.append(go, later);
  var icon = document.createElement('span');
  icon.textContent = '✨';
  card.append(icon, text, acts);
  document.querySelector('.stage').appendChild(card);
}
/** Looks for a new build now and then (not when asked a moment ago, and only while the app is in front). */
function updateAuto() {
  if (window.nibbleDesktop || document.visibilityState !== 'visible' || Date.now() - updLast < 60000) return;
  updateCheck().then(function (newer) { if (newer) showUpdateReady(); });
}
document.addEventListener('visibilitychange', updateAuto);
setInterval(updateAuto, UPDATE_EVERY_MS);
setTimeout(updateAuto, 30000);   // (the start checks once itself while the loading card is up)

// ---------- Options: Check for updates ----------
function APK_N() { return typeof APK !== 'undefined' && APK ? APK.n : Infinity; }
(function () {
  var btn = $('updBtn');
  function say(s) { btn.textContent = s; }
  btn.addEventListener('click', function () {
    sound('tap');
    if (btn.dataset.apk) { apkInstall(+btn.dataset.apk); return; }
    if (btn.dataset.ready) { updateNow(say); return; }
    say('Checking…');
    updateCheck().then(function (newer) {
      if (newer) { say('Update to ' + updNewest); btn.dataset.ready = '1'; return; }
      // the page is up to date: in the Android app, the app itself next (app-apk.js)
      var apk = typeof APK !== 'undefined' && APK ? apkNewest(true) : Promise.resolve(0);
      return apk.then(function (n) {
        if (n > APK_N()) { say('Install app android-' + n); btn.dataset.apk = String(n); }
        else say(newer === null ? 'Could not check' : 'Up to date');
      });
    });
  });
})();
