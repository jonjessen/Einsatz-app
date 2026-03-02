const CACHE_NAME = "ff360-app-v7";

const urlsToCache = [
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "logoapp.png",
  "logoff.png",
  "asue_alarm.wav",
  "asu_confirm.wav"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
