const CACHE_NAME = "ff360-app-v14";

const urlsToCache = [
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "logoapp.png",
  "logoff.png",
  "asue_alarm.wav",
  "asu_confirm.wav",
  "gefahrgut_un_catalog.js",
  "gefahrgut_un_catalog.json",
  "gefahrgut_eri_map.js",
  "gefahrgut_eri_map.json",
  "hydranten_scharbeutz.js",
  "hydranten_scharbeutz.json",
  "hydranten_ratekau.js",
  "hydranten_ratekau.json",
  "hydranten_timmendorfer_strand.js",
  "hydranten_timmendorfer_strand.json",
  "leaflet.css",
  "leaflet.js",
  "marker-icon.png",
  "marker-icon-2x.png",
  "marker-shadow.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
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

self.addEventListener("message", event => {
  if (!event || !event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match("index.html");
    if (fallback) return fallback;
    throw new Error("offline");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const updatePromise = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  if (cached) {
    return cached;
  }
  const network = await updatePromise;
  if (network) return network;
  return new Response("Offline", { status: 503, statusText: "Offline" });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (!request || request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
