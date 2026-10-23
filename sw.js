const CACHE = 'activity-log-v8';   // v8 (2026-10-22): the work pack's PMs listed with done / started flags; bump it whenever index.html changes
const STATIC = ['./index.html', './icon.svg', './manifest.json', './pm-data.js'];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c) {
    // pm-data.js is optional: a missing one must not stop the app from installing
    return c.addAll(STATIC.filter(function(u) { return u !== './pm-data.js'; })).then(function() { return c.add('./pm-data.js').catch(function() {}); });
  }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // The PM list (pm-data.js) changes without an app change: the newest copy when online, the saved one offline
  if (/\/pm-data\.js$/.test(new URL(e.request.url).pathname)) {
    e.respondWith(
      fetch(e.request).then(function(r) {
        if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function(c) { c.put('./pm-data.js', copy); }); }
        return r;
      }).catch(function() { return caches.match('./pm-data.js'); })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});
