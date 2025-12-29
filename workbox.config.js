// workbox.config.js
module.exports = {
  // Use InjectManifest so we control routes & warmup in src/sw.js
  swSrc: 'src/sw.js',
  swDest: 'public/service-worker.js',
  globDirectory: 'public',
  globPatterns: [
    // App shell + static assets you want precached:
    '**/*.{js,css,html,ico,png,svg,webp,woff2}',
    // Geospatial data files (geojson, kml, kmz) - in public root
    '*.{geojson,json,kml,kmz}',
    // Model and other data files
    '*.{glb,bin,tiff,jpg}'
  ],
  globIgnores: [
    '**/node_modules/**/*',
    'service-worker.js'
  ],
  maximumFileSizeToCacheInBytes: 65 * 1024 * 1024 // increased to support BlockModel.geojson (60.3MB)
};
