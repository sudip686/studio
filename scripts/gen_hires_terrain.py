"""
Regenerate the Three.js scene terrain at high resolution for the Tanga project
window, replacing the coarse region-wide (~217 m/px) heightmap.

Source DEM: OneDrive/Tanga/Tanga3D/dem_S05.tif (Copernicus ~30 m, EPSG:4326).
Texture:    Esri World Imagery export API, output directly in EPSG:32737.

Outputs (into studio/public/):
  height_hires.bin          Float32 row-major (north-up), width*height values (raw metres)
  terrain_texture_hires.jpg draped satellite image for the same window
  terrain_hires_meta.json   bounds_utm/width/height/elevation for the loader

The app's sampleTerrainAtLocal maps local metres -> lon/lat -> UTM 32737 -> u,v
via bounds_utm, so the window just needs correct UTM bounds + a north-up grid.
"""
import os, json, io
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
import pyproj
import requests
from PIL import Image

DEM = r"C:\Users\SUDIPTA CHANDA\OneDrive\Tanga\Tanga3D\dem_S05.tif"
OUT = r"C:\Users\SUDIPTA CHANDA\PycharmProjects\presentationCreator\studio\public"

# Project centre + patch (matches TangaThreeGeologyScene constants), padded a
# little so the rendered patch sits safely inside the sampled window.
LON0, LAT0 = 38.785, -4.813
HALF_W, HALF_H = 3800.0, 3600.0   # metres (patch is 7200x6800; +200/+200 pad)

to_utm = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:32737", always_xy=True)
e0, n0 = to_utm.transform(LON0, LAT0)
minX, maxX = e0 - HALF_W, e0 + HALF_W
minY, maxY = n0 - HALF_H, n0 + HALF_H

# Grid — keep the window aspect ratio so nothing stretches.
GW = 2048
GH = int(round(GW * (2 * HALF_H) / (2 * HALF_W)))  # ~1940
print(f"window UTM E[{minX:.0f},{maxX:.0f}] N[{minY:.0f},{maxY:.0f}] grid {GW}x{GH}")

# ---- 1. Heightmap: reproject DEM -> UTM window grid (north-up) ----
dst = np.zeros((GH, GW), dtype="float32")
dst_transform = from_bounds(minX, minY, maxX, maxY, GW, GH)
with rasterio.open(DEM) as src:
    reproject(
        source=rasterio.band(src, 1),
        destination=dst,
        dst_transform=dst_transform,
        dst_crs="EPSG:32737",
        resampling=Resampling.cubic,  # smooth
    )
# fill any nodata / negatives by clamping to local min
finite = np.isfinite(dst) & (dst > -1000)
lo = float(dst[finite].min()) if finite.any() else 0.0
dst = np.where(finite, dst, lo).astype("float32")
emin, emax = float(dst.min()), float(dst.max())
print(f"elevation range {emin:.1f}..{emax:.1f} m")

dst.tofile(os.path.join(OUT, "height_hires.bin"))
print(f"wrote height_hires.bin ({dst.nbytes/1048576:.1f} MB, {GW*GH} floats)")

# ---- 2. Texture: Esri World Imagery export, output in EPSG:32737 ----
TEX = 4096
tex_h = int(round(TEX * (2 * HALF_H) / (2 * HALF_W)))
url = ("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/"
       "MapServer/export")
params = {
    "bbox": f"{minX},{minY},{maxX},{maxY}",
    "bboxSR": "32737", "imageSR": "32737",
    "size": f"{TEX},{tex_h}",
    "format": "jpg", "f": "image",
}
try:
    r = requests.get(url, params=params, timeout=90,
                     headers={"User-Agent": "Mozilla/5.0 Tanga3D"})
    if r.status_code == 200 and r.content[:2] == b"\xff\xd8":
        Image.open(io.BytesIO(r.content)).convert("RGB").save(
            os.path.join(OUT, "terrain_texture_hires.jpg"), quality=88)
        print(f"wrote terrain_texture_hires.jpg ({len(r.content)/1048576:.1f} MB, {TEX}x{tex_h})")
    else:
        print(f"texture export failed: HTTP {r.status_code}, first bytes {r.content[:20]!r}")
except Exception as ex:
    print("texture export error:", ex)

# ---- 3. Meta ----
meta = {
    "bounds_utm": {"minX": minX, "maxX": maxX, "minY": minY, "maxY": maxY},
    "width": GW, "height": GH,
    "elevation_m": {"min": emin, "max": emax},
    "crs_epsg": 32737,
    "rgb_texture": "terrain_texture_hires.jpg",
    "source_height_grid": "height_hires.bin",
}
with open(os.path.join(OUT, "terrain_hires_meta.json"), "w") as f:
    json.dump(meta, f, indent=2)
print("wrote terrain_hires_meta.json")
print("DONE")
