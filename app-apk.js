// Which Android app (APK, android/) this is, for the Options build line. Each APK from android-6 on says which one it is:
// android.yml adds FumuAPK/N to the browser's name (N being the workflow's run number) and sets Android's version to android-N,
// which Obtainium (how Lauren updates the APK, android/README.md) matches to the release. Only in the Android app.
'use strict';

/** The newest APK from before they carried their number: one without it is shown as this one. */
var APK_UNMARKED = 5;
var APK = (function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform() || (C.getPlatform && C.getPlatform() !== 'android')) return null;
  var m = /FumuAPK\/(\d+)/.exec(navigator.userAgent || '');
  return { n: m ? +m[1] : APK_UNMARKED, marked: !!m };
})();
/** @returns {string} For the Options build line: which APK this is. */
function apkLabel() { return APK ? ' · app android-' + APK.n + (APK.marked ? '' : ' or older') : ''; }
