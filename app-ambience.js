// Background sounds (build 677): quiet sounds that fit the background behind him (waves on the beach, bubbles in the aquarium, birds in the meadow, hens and a cow on the farm, a sizzle and a clock in the kitchen,
// crickets under the stars) and the weather (thunder in a storm, wind when it is cold or snowing, cicadas when it is hot). Each sound is synthesised in sounds.js, comes now and then (never a loop),
// and is quiet. They keep to the same rules as every other sound (Quiet mode and Mini Fumu's volume), stop while the app is hidden, a sheet is open or he is in bed (the night sounds there are
// app-bedtime.js's), and can be switched off: Options > Background sounds in the app, Mini Fumu settings > Background sounds in the small window.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

/** For each background: [sound, soonest, latest] in seconds between one and the next. */
var AMBIENT_BACKDROP = {
  beach: [['waves', 5.5, 8.5], ['gull', 25, 50]],
  aquarium: [['bubbles', 3.5, 7], ['blub', 10, 20]],
  meadow: [['birds', 9, 18], ['breeze', 14, 26]],
  farm: [['cluck', 11, 22], ['birds', 18, 34], ['moo', 45, 90]],
  kitchen: [['sizzle', 14, 28], ['ticktock', 8, 14]],
  night: [['crickets', 4, 8], ['owl', 22, 45]]
};
/** The same for the weather kinds (weather.js). */
var AMBIENT_WEATHER = {
  storm: [['thunder', 12, 26]],   // (no rain sound: taken out in build 726)
  snow: [['wind', 7, 12]],
  cold: [['wind', 8, 15]],
  hot: [['cicadas', 9, 18]]
};
var ambientDue = {};   // when each sound is next due (ms), by "source:sound"
/** @returns {boolean} Whether background sounds may play now: switched on, on screen, no sheet open, awake and not in bed. */
function ambientOk() {
  if (state.settings.ambience === false || document.hidden || document.querySelector('dialog[open]')) return false;
  if (typeof deskAmbient === 'function' && !deskAmbient()) return false;
  if (stage.classList.contains('bedtime') || baseState() === 'sleepy') return false;
  return true;
}
/** @returns {?string} The background on show (none while it is hidden: Mini Fumu's wander mode has no room). */
function ambientBackdrop() {
  if (!backdropEl || backdropEl.hidden || !backdropEl.dataset.bd) return null;
  if (document.documentElement.classList.contains('desktop-pet') && !document.documentElement.classList.contains('desk-backdrop')) return null;
  return backdropEl.dataset.bd;
}
/** One look at the clock: plays whatever is due for the background and the weather, and sets the next time for it. */
function ambientTick() {
  var ok = ambientOk(), now = Date.now(), lists = [['b', AMBIENT_BACKDROP[ambientBackdrop()]], ['w', AMBIENT_WEATHER[typeof wxShown === 'string' ? wxShown : '']]];
  lists.forEach(function (src) {
    (src[1] || []).forEach(function (s) {
      var key = src[0] + ':' + s[0];
      if (!ambientDue[key]) ambientDue[key] = now + 600 + Math.random() * s[2] * 400;   // (the first one comes a little early, not all together)
      if (now < ambientDue[key]) return;
      ambientDue[key] = now + (s[1] + Math.random() * (s[2] - s[1])) * 1000;
      if (ok) sound(s[0]);
    });
  });
}
setInterval(ambientTick, 1000);
