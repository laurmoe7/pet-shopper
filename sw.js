// Offline support: cache the app shell and every emoji on install. The app's own files go network-first
// (so a new build shows up on the next visit and the cache is only the offline fallback); emoji are cache-first.
importScripts('foods.js');
var CACHE = 'nibble-v37';
var SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'foods.js', 'logic.js', 'achievements.js', 'sounds.js', 'wardrobe.js', 'decor.js', 'personalities.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  var files = SHELL.concat(self.Foods.all.map(self.Foods.emojiFile));
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(files); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
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
      // keep the web fonts for offline use too
      if (res.ok && /fonts\.(googleapis|gstatic)\.com/.test(e.request.url)) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    });
  }));
});
