/* eslint-disable no-undef */
/* global workbox, self */

// Load Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

// Check if workbox is loaded
if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);

  const { core, precaching, routing, strategies, expiration, cacheableResponse, navigationPreload } = workbox;

  core.clientsClaim();
  navigationPreload.enable();

  // __WB_MANIFEST is replaced at build time (InjectManifest)
  precaching.precacheAndRoute([{"revision":"c4f7b0a2780d1b6d328c7a90d09f839a","url":"topography.png"}] || []);



  // --- Static JS/CSS ---
  routing.registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
    new strategies.StaleWhileRevalidate({
      cacheName: 'assets-swr-v1',
      plugins: [
        new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new expiration.ExpirationPlugin({ maxEntries: 200, purgeOnQuotaError: true })
      ]
    })
  );

  // --- DATA: GeoJSON / KML / KMZ ---
  const dataExtRe = /\.(geojson|kml|kmz)(\?.*)?$/i;
  routing.registerRoute(
    ({ url }) => dataExtRe.test(url.pathname) || url.pathname.startsWith('/data/'),
    new strategies.CacheFirst({
      cacheName: 'geo-data-v1',
      plugins: [
        new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new expiration.ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true })
      ]
    })
  );

  // --- Cesium Ion imagery/terrain tiles ---
  const ionHosts = ['api.cesium.com', 'assets.ion.cesium.com', 'cesium.com', 'tile.openstreetmap.org'];
  routing.registerRoute(
    ({ url, request }) =>
      (request.destination === 'image' || request.destination === 'document' || request.destination === 'empty') &&
      ionHosts.some((h) => url.hostname.endsWith(h)),
    new strategies.StaleWhileRevalidate({
      cacheName: 'tiles-swr-v1',
      plugins: [
        new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new expiration.ExpirationPlugin({ maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 7, purgeOnQuotaError: true })
      ]
    })
  );

  // --- (Optional) Generic images ---
  routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new strategies.StaleWhileRevalidate({
      cacheName: 'img-swr-v1',
      plugins: [new expiration.ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 })]
    })
  );

  // --- Default handler ---
  routing.setDefaultHandler(
    new strategies.NetworkFirst({
      cacheName: 'default-nf-v1',
      networkTimeoutSeconds: 4,
      plugins: [new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] })]
    })
  );

} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

// --- INSTALL-TIME WARMUP ---
const WARM_CACHE_NAME = 'tiles-swr-v1';
const AREA = {
  bbox: [38.5, -5.3, 38.9, -4.9],
  zooms: [9, 10]
};

function lonLatToTileXY(lon, lat, z) {
    // ... (same as before)
}
function buildWarmUrls({ bbox, zooms }) {
    // ... (same as before)
}

self.addEventListener('install', (event) => {
  const warmUrls = buildWarmUrls(AREA);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(WARM_CACHE_NAME);
      try {
        await cache.addAll(warmUrls);
      } catch {
        // Ignore failures
      }
    })()
  );
});

self.skipWaiting();