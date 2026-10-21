// Offline support: cache the app shell and every emoji on install. The app's own files are served from this build's cache
// (one request instead of fifty on every open; a new build is a new cache, found by the update check the page makes while
// its loading card is up, app-start.js, and the page reloads once it has taken over); emoji and fonts are cache-first too.
importScripts('foods.js', 'tasks.js');
var CACHE = 'nibble-v753';
var SHELL = ['./', 'index.html', 'fonts.css', 'styles.css', 'app.js', 'app-pet.js', 'app-actions.js', 'app-petsheet.js', 'app-dress.js', 'app-petsubs.js', 'app-closet.js', 'app-shoot.js', 'app-photo.js', 'app-room.js', 'app-goals.js', 'app-events.js', 'app-todo.js', 'app-calendar.js', 'app-stamps.js', 'app-personality.js', 'app-favourites.js', 'app-petting.js', 'app-treats.js', 'app-gift.js', 'app-plant.js', 'app-profile.js', 'app-options.js', 'app-shop.js', 'app-shopcal.js', 'app-sync.js', 'app-account.js', 'app-household.js', 'app-send.js', 'send.js', 'app-desktop.js', 'app-anims.js', 'app-voice.js', 'app-recipe.js', 'backdrops.js', 'app-backdrop.js', 'app-idle.js', 'app-toy.js', 'app-wreck.js', 'app-laser.js', 'app-steal.js', 'app-bedtime.js', 'app-night.js', 'app-ring.js', 'app-fade.js', 'app-select.js', 'app-birthday.js', 'app-xmas.js', 'app-halloween.js', 'app-newyear.js', 'app-easter.js', 'app-kingsday.js', 'app-weather.js', 'app-ambience.js', 'celebrate.html', 'celebrate-fx.js', 'app-dutch.js', 'app-nlvoices.js', 'app-lang.js', 'app-phone.js', 'app-update.js', 'app-apk.js', 'app-start.js', 'foods.js', 'tasks.js', 'logic.js', 'sync.js', 'achievements.js', 'sounds.js', 'wardrobe.js', 'decor.js', 'bonuses.js', 'weather.js', 'recipe.js', 'personalities.js', 'skins.js', 'manifest.webmanifest', 'icon-32.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

// Emoji and fonts live in their own cache that is kept between builds, so an update only downloads
// the app's own files, not all 160 emoji again. Only emoji that aren't cached yet are fetched.
var KEEP = 'nibble-emoji-v1';
// the stable channel (/stable/, desktop/README.md) is the same origin: it gets cache names of its own, and each channel only clears its own old caches
var STABLE = /\/stable\//.test(self.location.pathname);
if (STABLE) { CACHE = CACHE.replace('nibble-', 'nibble-stable-'); KEEP = KEEP.replace('nibble-', 'nibble-stable-'); }
function ownCache(k) { return STABLE ? k.indexOf('nibble-stable-') === 0 : k.indexOf('nibble-') === 0 && k.indexOf('nibble-stable-') !== 0; }
// the fonts of the everyday look (fonts/, served by the page itself since build 580; tools/fetch-fonts.js) are cached on install too, so the first
// offline open already has them; the theme fonts and the accented-letter files are cached when first used
var FONTS = ['fonts/kiwi-maru-500-latin.woff2', 'fonts/m-plus-rounded-1c-500-latin.woff2', 'fonts/m-plus-rounded-1c-700-latin.woff2', 'fonts/m-plus-rounded-1c-800-latin.woff2'];

self.addEventListener('install', function (e) {
  var emoji = self.Foods.all.concat(self.Tasks.all).map(self.Foods.emojiFile);
  e.waitUntil(Promise.all([
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); }),   // ('reload': the browser's own copy (the site allows 10 minutes) must not fill the new build's cache with the old files)
    caches.open(KEEP).then(function (c) {
      return Promise.all(emoji.concat(FONTS).map(function (f) {
        // one emoji that fails to load must not fail the whole install (that device would never update again): it is fetched when needed
        return c.match(f).then(function (hit) { return hit || c.add(f).catch(function () {}); });
      }));
    })
  ]).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return ownCache(k) && k !== CACHE && k !== KEEP; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Each answer looks in its own cache only, and ignores ?… only when there is one: caches.match over every cache with ignoreSearch
// scans all their entries for each of the hundred files a start asks for, and that made the scripts come in about three times slower.
var opened = {};
function cache(name) { return opened[name] || (opened[name] = caches.open(name)); }
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin === self.location.origin && /\/sw\.js$/.test(url.pathname)) return;   // the update check (app-update.js) must reach the site every time, never a kept copy
  var own = url.origin === self.location.origin && !/\/(emoji|fonts)\//.test(url.pathname);
  if (own) {
    e.respondWith(cache(CACHE).then(function (c) { return c.match(e.request, url.search ? { ignoreSearch: true } : undefined); }).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        // (the privacy page is not kept: it must always show the current text)
        if (res.ok && !/privacy\.html$/.test(url.pathname)) { var copy = res.clone(); cache(CACHE).then(function (c) { c.put(e.request, copy); }); }
        return res;
      });
    }));
    return;
  }
  e.respondWith((url.origin === self.location.origin ? cache(KEEP).then(function (c) { return c.match(e.request); }) : caches.match(e.request)).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      // keep emoji and fonts (offline too), in the cache that survives updates
      if (res.ok && /\/(emoji|fonts)\//.test(url.pathname)) {
        var copy = res.clone();
        cache(KEEP).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    });
  }));
});
