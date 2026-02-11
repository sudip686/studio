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
  precaching.precacheAndRoute([{"revision":"c4f7b0a2780d1b6d328c7a90d09f839a","url":"topography.png"},{"revision":"a4d6a853c53e7ce9f5c194663c583749","url":"icon.png"},{"revision":"c97cf2641541d4d5d8bcf10ae302a0a1","url":"A_Logo.png"},{"revision":"2501d8995f17014a540798535d39c96c","url":"terrain_runtime.json"},{"revision":"5d65658c3b1cb4988b7748e7019d4f55","url":"terrain_meta.json"},{"revision":"a8834c491497a2a8852aaf7e95459fc5","url":"tanga_boundary.kmz"},{"revision":"5a280c1bdb6562780a079442b02331c3","url":"mining_license_boundary.kml"},{"revision":"5c2b40a32d353866d37bf05cc00fcb2a","url":"lithology_data.geojson"},{"revision":"0d4f7d6ca41a7cfb5c6d280f79d196e0","url":"drillholes_utm.json"},{"revision":"e3924df8c4b5d51befa4b0189488ba2c","url":"boundary.kmz"},{"revision":"d607dac9837aece7b958ccc5f0257228","url":"BlockModel.geojson"},{"revision":"0716939f0ccfc85d574c1d68eb0d6aaf","url":"assay_data.geojson"},{"revision":"3d490ead38543b61b9842966ae0aa34d","url":"terrain_texture_8k.jpg"},{"revision":"b158b51bcfa36b3bf47493eb7e7af3bc","url":"geology_map.jpg"}] || []);



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

// --- INSTALL-TIME WARMUP ---
const WARM_CACHE_NAME = 'tiles-swr-v2';
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
      await (self as any).clients?.claim?.();
    })()
  );
});

self.skipWaiting();