// workbox.config.js
module.exports = {
  // Use InjectManifest so we control routes & warmup in src/sw.js
  swSrc: 'src/sw.js',
  swDest: 'public/service-worker.js',
  globDirectory: 'public',
  globPatterns: [
    // App shell + static assets you want precached:
    '**/*.{js,css,html,ico,png,svg,webp,woff2}',
    // If you ship fixed base data in public/data/, precache a minimal set too:
    'data/**/*.{geojson,kml,kmz}'
  ],
  maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // allow large GeoJSON/KMZ if needed
};
