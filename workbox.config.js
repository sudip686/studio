// workbox.config.js
module.exports = {
  // Use InjectManifest so we control routes & warmup in src/sw.js
  swSrc: 'src/sw.js',
  swDest: 'public/service-worker.js',
  globDirectory: 'public',
  globPatterns: [
    // Keep the shell tiny; geology, drillhole, DEM, and imagery assets load on demand.
    'A_Logo.png',
    'icon.png'
  ],
  globIgnores: [
    '**/node_modules/**/*',
    'service-worker.js',
    'cesium/**/*',
    '**/*.geojson',
    '**/*.glb',
    '**/*.bin',
    '**/*.tif',
    '**/*.tiff',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.pdf',
    '**/*.obj',
    'texture_rgb_8192.png',
    'terrain_texture_8k.jpg',
    'height.bin',
    'generated/**/*'
  ],
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024
};
