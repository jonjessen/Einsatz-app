const CACHE_NAME = "ff360-app-v23";

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

const TIMMENDORFER_TILE_BOUNDS = {
  north: 54.02,
  south: 53.94,
  west: 10.69,
  east: 10.87
};
const TIMMENDORFER_TILE_ZOOMS = [12, 13, 14, 15];

function lonToTileX(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTileY(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n);
}

function buildTimmendorferTileUrls() {
  const urls = [];
  TIMMENDORFER_TILE_ZOOMS.forEach((zoom) => {
    const minX = lonToTileX(TIMMENDORFER_TILE_BOUNDS.west, zoom);
    const maxX = lonToTileX(TIMMENDORFER_TILE_BOUNDS.east, zoom);
    const minY = latToTileY(TIMMENDORFER_TILE_BOUNDS.north, zoom);
    const maxY = latToTileY(TIMMENDORFER_TILE_BOUNDS.south, zoom);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        urls.push(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
      }
    }
  });
  return urls;
}

async function precacheTimmendorferTiles(cache) {
  const tileUrls = buildTimmendorferTileUrls();
  await Promise.allSettled(tileUrls.map(async (url) => {
    try {
      const request = new Request(url, { mode: "no-cors" });
      const response = await fetch(request);
      if (response) {
        await cache.put(request, response.clone());
      }
    } catch {
      // Einzelne Tile-Fehler ignorieren; Rest soll trotzdem offline verfügbar sein.
    }
  }));
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(urlsToCache);
        await precacheTimmendorferTiles(cache);
      })
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
    fetch(request).catch(async () => {
      const direct = await caches.match(request);
      if (direct) return direct;
      return caches.match(url.href);
    })
  );
});
