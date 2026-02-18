# GeoVision3D – Terrain Surface GLB pipeline and caching

This project now builds the Three.js terrain surface once (offline) and ships it as a GLB so the Three.js view loads instantly, similar to how borehole data is pre-warmed/cached.

## What changed
- Added an offline build step that converts the DEM height PNG into a mesh and exports `public/terrain_surface.glb`.
- The Three.js views now load `terrain_surface.glb` directly and apply the RGB texture at runtime.
- The Service Worker precaches the GLB and texture and purges old/unused assets automatically on activation.

## Files used
- `public/terrain_meta.json` – contains CRS, bounds (UTM), and elevation range used for decoding heights.
- `public/dem_height_4097_u16.png` – 16-bit height map (encoded in RG: height_u16 = (R<<8 | G)).
- `public/texture_rgb_8192.png` – RGB texture aligned to the same coverage as the DEM.
- Optional: `public/terrain_meta_coverage.json` – If present, declares the full UTM bounds covered by the rasters. The builder will expand the 3D model area by +3000m in every direction if (and only if) the rasters cover that expanded extent.

Example `terrain_meta_coverage.json`:
```
{
  "bounds_utm": {
    "minX": 385000.0,
    "minY": 9333000.0,
    "maxX": 615000.0,
    "maxY": 9561000.0
  }
}
```

## Build once, then load instantly
1) Install deps (adds pngjs for the builder):
   - npm install
2) Generate the terrain GLB (default grid 1025 x 1025; set SEGMENTS=2049 for max fidelity):
   - npm run build:terrain
   - or: SEGMENTS=2049 npm run build:terrain
3) Start the app:
   - npm run dev

The GLB will be written to `public/terrain_surface.glb`. The Three.js views will automatically load it and apply `texture_rgb_8192.png` with hillshade modulation.

## 3 km expansion policy
- The builder tries to expand the original `terrain_meta.json` bounds by +3000m on all sides.
- Expansion only happens if the rasters actually cover the larger area. Because the PNGs have no georeferencing, we rely on `terrain_meta_coverage.json` to declare the true raster coverage.
- If coverage is not sufficient (or the coverage file is missing), the builder falls back to the original bounds.

## Service Worker caching and cleanup
- `public/service-worker.js` precaches `terrain_surface.glb` and `texture_rgb_8192.png` for instant loads.
- On activate, it removes stale items like `terrain_min.glb`, `terrain.glb`, `texture_rgb_4096.png`, and other older GLBs if present.
- To force a hard refresh in the browser: open DevTools → Application → Clear storage → “Unregister” service worker + clear site data; then reload.

## Removing old/unused GLBs
- The code no longer references older terrain GLBs. Any legacy `terrain.glb`/`terrain_min.glb` will be ignored and are purged from caches automatically. If these files are still present locally in `public/`, you can safely delete them.
- We also removed unused GLBs from the precache list (e.g., earth.glb/geologicalModel.glb) and added an SW activation cleanup to evict them if they were cached previously.

## Where the terrain is used
- Views updated to load the prebuilt GLB: AssayView, LithologyView, BlockModelCarbonView, BlockModelRescView.
- Component: `src/components/viewers/TerrainSurfaceLayer.tsx` handles loading the GLB, applying the RGB texture + hillshade, and positioning the mesh correctly near the current model center.

## Troubleshooting
- If the surface appears offset or scaled incorrectly, confirm:
  - `terrain_meta.json` elevation_m.min/max match how the height PNG was encoded.
  - `terrain_meta_coverage.json` (if used) truly describes the PNG coverage in UTM EPSG:32737.
  - The model center provided by the data cache corresponds to the same geographic area.
- If loading seems slow after deploy, ensure the service worker was updated (look for the latest console logs) and consider a hard refresh.

# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
