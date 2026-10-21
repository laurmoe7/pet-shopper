// The Android app (APK, android/): which one this is, and a card when a newer one is out. Lauren updates the APK with
// Obtainium (android/README.md) with its background checks off, so the app tells her instead, only while it is open (her
// choice, build 741). Each APK from android-6 on says which one it is: android.yml adds FumuAPK/N to the browser's name (N being
// the workflow's run number) and sets Android's version to android-N, which Obtainium matches to the release. The app asks GitHub
// which android-N tags exist, at most every 6 hours, and a card says a newer one is out; it has no install button (the update
// is done in Obtainium). Only in the Android app.
'use strict';

/** The newest APK from before they carried their number: one without it counts as this one, so nobody is told about one they have. */
var APK_UNMARKED = 5;
var APK = (function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform() || (C.getPlatform && C.getPlatform() !== 'android')) return null;
  var m = /FumuAPK\/(\d+)/.exec(navigator.userAgent || '');
  return { n: m ? +m[1] : APK_UNMARKED, marked: !!m };
})();
var APK_TAGS = 'https://api.github.com/repos/laurmoe7/pet-shopper/git/matching-refs/tags/android-';
var APK_EVERY_MS = 6 * 3600 * 1000, APK_KEY = 'nibble-apk';
/** What was found last time (on this device): {at, newest, skipped}. */
var apkSeen = (function () {
  var s = null;
  try { s = JSON.parse(localStorage.getItem(APK_KEY)); } catch (e) { s = null; }
  return s && typeof s === 'object' ? { at: +s.at || 0, newest: +s.newest || 0, skipped: +s.skipped || 0 } : { at: 0, newest: 0, skipped: 0 };
})();
function apkSave() { try { localStorage.setItem(APK_KEY, JSON.stringify(apkSeen)); } catch (e) { /* storage blocked */ } }
/** @returns {string} For the Options build line: which APK this is. */
function apkLabel() { return APK ? ' · app android-' + APK.n + (APK.marked ? '' : ' or older') : ''; }

/** @returns {Promise<number>} The newest android-N there is (0: could not ask; the last answer is kept for 6 hours). */
function apkNewest() {
  if (!APK) return Promise.resolve(0);
  if (Date.now() - apkSeen.at < APK_EVERY_MS) return Promise.resolve(apkSeen.newest);
  return fetch(APK_TAGS, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (refs) {
      if (!Array.isArray(refs)) return 0;
      var n = refs.reduce(function (top, r) { var m = /^refs\/tags\/android-(\d+)$/.exec(r && r.ref || ''); return m ? Math.max(top, +m[1]) : top; }, 0);
      apkSeen.at = Date.now(); apkSeen.newest = n; apkSave();
      return n;
    }, function () { return 0; });
}

function showApkReady(n) {
  if (document.querySelector('.apk-update-card') || n <= apkSeen.skipped) return;
  var card = document.createElement('div');
  card.className = 'inbox-card update-card apk-update-card';
  card.setAttribute('role', 'status');
  var icon = document.createElement('span'), text = document.createElement('div'), t = document.createElement('b'), d = document.createElement('span');
  icon.textContent = '📲';
  text.className = 'inbox-text';
  t.textContent = 'App update android-' + n;
  d.textContent = 'Update it in Obtainium.';
  text.append(t, d);
  var acts = document.createElement('div');
  acts.className = 'inbox-actions';
  var later = document.createElement('button'); later.type = 'button'; later.textContent = '✕'; later.className = 'inbox-done'; later.setAttribute('aria-label', 'OK');
  later.addEventListener('click', function (e) { e.stopPropagation(); apkSeen.skipped = n; apkSave(); card.remove(); });
  acts.append(later);
  card.append(icon, text, acts);
  document.querySelector('.stage').appendChild(card);
}
function apkAuto() {
  if (!APK || document.visibilityState !== 'visible') return;
  apkNewest().then(function (n) { if (n > APK.n) showApkReady(n); });
}
if (APK) {
  document.addEventListener('visibilitychange', apkAuto);
  setTimeout(apkAuto, 20000);
}
