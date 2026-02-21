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
  precaching.precacheAndRoute([{"revision":"c4f7b0a2780d1b6d328c7a90d09f839a","url":"topography.png"},{"revision":"b8222230e8bcbadc3e7f5db11796cae4","url":"Screenshot 2026-02-18 111036.png"},{"revision":"a4d6a853c53e7ce9f5c194663c583749","url":"icon.png"},{"revision":"c97cf2641541d4d5d8bcf10ae302a0a1","url":"A_Logo.png"},{"revision":"1e0323cd27f31178da1b1773655b8fc6","url":"terrain_runtime.json"},{"revision":"62c50e5cc2aadc72f986de90a8feae06","url":"terrain_meta.json"},{"revision":"a8834c491497a2a8852aaf7e95459fc5","url":"tanga_boundary.kmz"},{"revision":"5a280c1bdb6562780a079442b02331c3","url":"mining_license_boundary.kml"},{"revision":"6f5d89c3e77b96551b51e08c054c7153","url":"lithology_data.json"},{"revision":"5c2b40a32d353866d37bf05cc00fcb2a","url":"lithology_data.geojson"},{"revision":"50f4c135c28eacc7ac4ff64cd9e07287","url":"drillholes_utm.json"},{"revision":"e3924df8c4b5d51befa4b0189488ba2c","url":"boundary.kmz"},{"revision":"3917290d47940c59bcdcdd9837ce276a","url":"assay_data.json"},{"revision":"0716939f0ccfc85d574c1d68eb0d6aaf","url":"assay_data.geojson"},{"revision":"3d490ead38543b61b9842966ae0aa34d","url":"terrain_texture_8k.jpg"},{"revision":"419892950068d4c0111c6f433749cb65","url":"Tanga Road Map.tiff"},{"revision":"fe10e7c4d4c8d35112be88101f94ef02","url":"resource_model.bin"},{"revision":"b158b51bcfa36b3bf47493eb7e7af3bc","url":"geology_map.jpg"},{"revision":"30775fb299419e4f756d355c9f0f23b8","url":"geologicalModel.glb"},{"revision":"03723d7c829e5e2feeda8a65d4e9e2fd","url":"earth.glb"}] || []);



  // --- Static JS/CSS ---
  routing.registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
    new strategies.StaleWhileRevalidate({
      cacheName: 'assets-swr-v2',
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
      cacheName: 'tiles-swr-v2',
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
      cacheName: 'img-swr-v2',
      plugins: [new expiration.ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 })]
    })
  );

  // --- Default handler ---
  routing.setDefaultHandler(
    new strategies.NetworkFirst({
      cacheName: 'default-nf-v2',
      networkTimeoutSeconds: 4,
      plugins: [new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] })]
    })
  );

} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

// --- INSTALL-TIME WARMUP (disabled to prevent runtime errors) ---
// Keep lightweight stubs so the SW remains valid JS.
const WARM_CACHE_NAME = 'tiles-swr-v2';
function buildWarmUrls() { return []; }
// self.addEventListener('install', (event) => {
//   const warmUrls = buildWarmUrls();
//   event.waitUntil(
//     (async () => {
//       const cache = await caches.open(WARM_CACHE_NAME);
//       try {
//         await cache.addAll(warmUrls);
//       } catch {
//         // Ignore failures
//       }
//     })()
//   );
// });

self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = new Set([
    'assets-swr-v2',
    'tiles-swr-v2',
    'img-swr-v2',
    'default-nf-v2',
  ]);
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (!CURRENT_CACHES.has(name) && !/workbox-precache/i.test(name)) {
            return caches.delete(name);
          }
          return Promise.resolve(false);
        })
      );
      if (self && self.clients && typeof self.clients.claim === 'function') {
        await self.clients.claim();
      }
    })()
  );
});

self.skipWaiting();