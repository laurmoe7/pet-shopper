// Offline support: cache the app shell and every emoji on install. The app's own files go network-first
// (so a new build shows up on the next visit and the cache is only the offline fallback); emoji are cache-first.
importScripts('foods.js', 'tasks.js');
var CACHE = 'nibble-v301';
var SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'app-pet.js', 'app-actions.js', 'app-petsheet.js', 'app-dress.js', 'app-closet.js', 'app-shoot.js', 'app-photo.js', 'app-room.js', 'app-goals.js', 'app-events.js', 'app-todo.js', 'app-calendar.js', 'app-stamps.js', 'app-personality.js', 'app-favourites.js', 'app-petting.js', 'app-treats.js', 'app-gift.js', 'app-profile.js', 'app-options.js', 'app-sync.js', 'app-account.js', 'app-send.js', 'send.js', 'app-desktop.js', 'app-anims.js', 'app-voice.js', 'app-recipe.js', 'backdrops.js', 'app-backdrop.js', 'app-idle.js', 'app-toy.js', 'app-bedtime.js', 'app-fade.js', 'app-select.js', 'app-start.js', 'foods.js', 'tasks.js', 'logic.js', 'sync.js', 'achievements.js', 'sounds.js', 'wardrobe.js', 'decor.js', 'bonuses.js', 'recipe.js', 'personalities.js', 'skins.js', 'manifest.webmanifest', 'icon-32.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

// Emoji and web fonts live in their own cache that is kept between builds, so an update only downloads
// the app's own files, not all 160 emoji again. Only emoji that aren't cached yet are fetched.
var KEEP = 'nibble-emoji-v1';

self.addEventListener('install', function (e) {
  var emoji = self.Foods.all.concat(self.Tasks.all).map(self.Foods.emojiFile);
  e.waitUntil(Promise.all([
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }),
    caches.open(KEEP).then(function (c) {
      return Promise.all(emoji.map(function (f) {
        return c.match(f).then(function (hit) { return hit || c.add(f); });
      }));
    })
  ]).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== KEEP; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var own = url.origin === self.location.origin && !/\/emoji\//.test(url.pathname);
  if (own) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      // keep emoji and the web fonts (offline too), in the cache that survives updates
      if (res.ok && (/\/emoji\//.test(url.pathname) || /fonts\.(googleapis|gstatic)\.com/.test(e.request.url))) {
        var copy = res.clone();
        caches.open(KEEP).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    });
  }));
});
