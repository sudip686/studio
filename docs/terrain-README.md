# Bounded 3D Terrain Viewer (MapLibre + Terrarium) and Three.js GLB runtime

This guide converts public/Topography.asc (EPSG:21037) into local Terrarium PNG tiles (EPSG:3857) and serves them in a minimal, ultra-smooth MapLibre GL JS viewer with strict spatial bounds (a ~4 km buffer from the AOI center).

Contents
- A) GDAL + Python commands
- B) Tile directory structure
- C) Minimal MapLibre HTML app path
- D) Performance rationale
 - E) Three.js terrain_surface.glb build + runtime configuration

Prerequisites
- GDAL (with gdal_translate, gdalwarp, gdalbuildvrt, gdal2tiles.py, gdal_calc.py)
- Python 3 with NumPy (gdal_calc uses NumPy)
- On Windows, use OSGeo4W Shell for easiest setup

A) GDAL + Python pipeline
1) Prepare folders
```
mkdir data
mkdir public\tiles\terrarium
```

2) ASC → GeoTIFF (assign EPSG:21037 and nodata)
```
gdal_translate -of GTiff -a_srs EPSG:21037 -a_nodata -99999 "public\Topography.asc" "data\dem_21037.tif"
```

3) Compute 4 km bbox around AOI center and WGS84 bounds for MapLibre
The helper script exists at data/compute_bounds.py. Run it to produce data/bounds.json:
```
python "data\compute_bounds.py" > data\bounds.json
```
Open data/bounds.json and note:
- bbox_21037: [minx, miny, maxx, maxy] in meters (EPSG:21037)
- bounds_wgs84: [minLon, minLat, maxLon, maxLat] to paste into the HTML source.bounds and map maxBounds

If you skip this step, the HTML includes approximate bounds that already work for this dataset.

4) Reproject to EPSG:3857 and clip to the 4 km bbox (bbox_21037)
Replace the placeholders with values from data/bounds.json if you prefer precise bounds:
```
gdalwarp -s_srs EPSG:21037 -t_srs EPSG:3857 -r bilinear ^
  -te_srs EPSG:21037 -te <minx> <miny> <maxx> <maxy> ^
  -dstnodata -99999 -multi -wo NUM_THREADS=ALL_CPUS ^
  "data\dem_21037.tif" "data\dem_3857_clip.tif"
```
For this dataset, you can paste these approximations directly:
```
gdalwarp -s_srs EPSG:21037 -t_srs EPSG:3857 -r bilinear ^
  -te_srs EPSG:21037 -te 472071.3341 9464195.2998 480071.3341 9472195.2998 ^
  -dstnodata -99999 -multi -wo NUM_THREADS=ALL_CPUS ^
  "data\dem_21037.tif" "data\dem_3857_clip.tif"
```

5) Encode to Terrarium RGB (R,G,B) + alpha (NoData mask)
Terrarium formula: E = R*256 + G + B/256 - 32768 (meters).

R
```
gdal_calc.py -A "data\dem_3857_clip.tif" --outfile "data\terrarium_R.tif" ^
  --calc "uint8(where(A==-99999,0,clip(floor((A+32768)/256.0),0,255)))" ^
  --type=Byte --NoDataValue=0 --quiet
```
G
```
gdal_calc.py -A "data\dem_3857_clip.tif" --outfile "data\terrarium_G.tif" ^
  --calc "uint8(where(A==-99999,0,clip(floor(A+32768)-256*floor((A+32768)/256.0),0,255)))" ^
  --type=Byte --NoDataValue=0 --quiet
```
B
```
gdal_calc.py -A "data\dem_3857_clip.tif" --outfile "data\terrarium_B.tif" ^
  --calc "uint8(where(A==-99999,0,clip(floor(((A+32768)-floor(A+32768))*256.0),0,255)))" ^
  --type=Byte --NoDataValue=0 --quiet
```
Alpha
```
gdal_calc.py -A "data\dem_3857_clip.tif" --outfile "data\alpha.tif" ^
  --calc "uint8(where(A==-99999,0,255))" --type=Byte --NoDataValue=0 --quiet
```
Stack RGBA and compress
```
gdalbuildvrt -separate "data\terrarium.vrt" "data\terrarium_R.tif" "data\terrarium_G.tif" "data\terrarium_B.tif" "data\alpha.tif"
gdal_translate -of GTiff -co COMPRESS=DEFLATE -co TILED=YES -b 1 -b 2 -b 3 -b 4 "data\terrarium.vrt" "data\terrarium_rgba.tif"
```

6) Tile to XYZ PNG z=12–16
```
gdal2tiles.py --xyz -z 12-16 --resampling near --processes 4 -w none ^
  "data\terrarium_rgba.tif" "public\tiles\terrarium"
```

B) Directory structure (result)
```
public/tiles/terrarium/
  12/
    <x>/
      <y>.png
  13/
    ...
  14/
    ...
  15/
    ...
  16/
    ...
```
This is standard XYZ: {z}/{x}/{y}.png.

C) Minimal MapLibre app
Added at public/terrain/index.html. It uses:
- renderWorldCopies: false
- map.setMaxBounds(BOUNDS)
- source.bounds = BOUNDS
- minZoom:12, maxZoom:16
- raster-dem source with encoding: 'terrarium'
- terrain exaggeration: 1.6
- subtle hillshade

Open it after running a static server and generating tiles (see below).

D) Performance rationale (key points)
- Dual bounds (map + source): clamps camera and eliminates off-AOI tile requests ⇒ predictable memory/IO and no overdraw.
- renderWorldCopies:false: disables wrapped duplicates ⇒ finite scene, fewer draw calls.
- Zoom limits aligned to pyramid: avoids blurry undersampling or jittery oversampling ⇒ stable LOD transitions.
- fadeDuration:0: removes raster cross-fade overdraw ⇒ smoother fast zooms.
- antialias:false: disables MSAA on 3D terrain ⇒ higher FPS, stable frame time.
- Exaggeration ≈1.6: enhances relief without amplifying normals/hillshade artifacts ⇒ stable visuals during motion.
- Minimal style: no glyphs/labels ⇒ less CPU/GPU, smoother camera.

Preview locally
From the repo root, start a lightweight static server, then open:
- http://localhost:5173/public/terrain/

Command:
```
npx http-server -p 5173 .
```

Notes
- If you re-run tiling, you may delete public/tiles/terrarium first to avoid stale tiles.
- Paste the exact bounds from data/bounds.json into public/terrain/index.html for perfectly tight constraints.

E) Three.js terrain_surface.glb build + runtime configuration

The Three.js viewers use a prebuilt mesh `public/terrain_surface.glb` with a phototexture (`texture_rgb_8192.png`) and optional hillshade. The GLB is built from the same DEM (`dem_height_4097_u16.png`) and meta (`terrain_meta.json`).

Build the GLB (default coverage):
```
npm run build:terrain
```

Build the GLB with expanded area and set runtime clip radius from the build step (Windows/cmd syntax):
```
npm run build:terrain:cover7k
```
This is equivalent to:
```
set TERRAIN_EXPAND_M=7000
set TERRAIN_CLIP_RADIUS_M=7000
node scripts/build-terrain-glb.mjs
```

- `TERRAIN_EXPAND_M` controls how much the GLB bounds are expanded (meters per side) beyond the original `bounds_utm` if the height PNG coverage allows it.
- `TERRAIN_CLIP_RADIUS_M` controls the visible clipping box radius at runtime. The build writes `public/terrain_runtime.json` (e.g., `{ "clipRadiusM": 7000 }`), which is consumed by the Three.js `TerrainSurfaceLayer`.

Viewer alignment notes (Three.js):
- The terrain mesh Y is stored as `(elev_m - zMin)` so that the base is at 0. The viewers clamp drillhole collars to the DEM and subtract `zMin` as well, ensuring collars sit exactly on the mesh, independent of the absolute vertical datum.
- Cesium views are untouched by this pipeline.