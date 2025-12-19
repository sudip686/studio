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
  precaching.precacheAndRoute([{"revision":"c4f7b0a2780d1b6d328c7a90d09f839a","url":"topography.png"},{"revision":"a0dfd68399deef910f885a05df9e39f0","url":"assay_data.geojson"},{"revision":"3917290d47940c59bcdcdd9837ce276a","url":"assay_data.json"},{"revision":"e3924df8c4b5d51befa4b0189488ba2c","url":"boundary.kmz"},{"revision":"f7570b55f5370211de7c3eee2bebf2aa","url":"lithology_data.geojson"},{"revision":"6f5d89c3e77b96551b51e08c054c7153","url":"lithology_data.json"},{"revision":"5cf5bd8fef0972d887c9e24b90a4a8a7","url":"mining_license_boundary.kml"},{"revision":"a8834c491497a2a8852aaf7e95459fc5","url":"tanga_boundary.kmz"},{"revision":"03723d7c829e5e2feeda8a65d4e9e2fd","url":"earth.glb"},{"revision":"30775fb299419e4f756d355c9f0f23b8","url":"geologicalModel.glb"},{"revision":"b158b51bcfa36b3bf47493eb7e7af3bc","url":"geology_map.jpg"},{"revision":"fe10e7c4d4c8d35112be88101f94ef02","url":"resource_model.bin"},{"revision":"419892950068d4c0111c6f433749cb65","url":"Tanga Road Map.tiff"}] || []);



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