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
  precaching.precacheAndRoute([
    {"revision":"c97cf2641541d4d5d8bcf10ae302a0a1","url":"A_Logo.png"},
    {"revision":"v20260211b","url":"texture_rgb_8192.png"},
    {"revision":"a0dfd68399deef910f885a05df9e39f0","url":"assay_data.geojson"},
    {"revision":"b4b59d6b46198c33fcedd651aaae99af","url":"BlockModel.geojson"},
    {"revision":"e3924df8c4b5d51befa4b0189488ba2c","url":"boundary.kmz"},
    {"revision":"f7570b55f5370211de7c3eee2bebf2aa","url":"lithology_data.geojson"},
    {"revision":"5cf5bd8fef0972d887c9e24b90a4a8a7","url":"mining_license_boundary.kml"},
    {"revision":"a8834c491497a2a8852aaf7e95459fc5","url":"tanga_boundary.kmz"},
    {"revision":"b158b51bcfa36b3bf47493eb7e7af3bc","url":"geology_map.jpg"},
    {"revision":"v20260211b","url":"height.bin"},
    {"revision":"v20260211b","url":"terrain_meta.json"},
    {"revision":"v20260211b","url":"drillholes_utm.json"},
  ] || []);



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
    // precache managed by workbox uses a custom name; leave it
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
      // Purge specific stale URLs from all caches (old terrain files, unused textures)
      const STALE_URLS = [
        '/terrain_min.glb',
        '/terrain.glb',
        '/texture_rgb_4096.png',
        '/earth.glb',
        '/geologicalModel.glb',
        // Newly added stale URLs due to file cleanup
        '/height_2049.png',
        '/terrain/index.html',
        '/resource_model.bin',
        '/Tanga Road Map.tiff',
        '/assay_data.json',
        '/lithology_data.json',
        '/Topography.asc',
        '/app.R',
        '/terrain_surface.glb',
        '/dem_height_4097_u16.png',
        '/dem_height_4097_u8.png',
        '/dem_hillshade_4097.png',
        '/rgb_input_georef.tif',
        '/rgb_match_dem.tif',
        '/terrain/', // For the directory
      ];
      await Promise.all(
        names.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          await Promise.all(
            requests.map((req) => {
              try {
                const url = new URL(req.url);
                if (STALE_URLS.includes(url.pathname)) {
                  return cache.delete(req);
                }
              } catch {}
              return Promise.resolve(false);
            })
          );
        })
      );
      // Take control immediately after cleanup
      await (self as any).clients?.claim?.();
    })()
  );
});

self.skipWaiting();