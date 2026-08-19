"""Build terrain_texture_hires.jpg from the local Esri imagery tiles
(OneDrive/Tanga/Tanga3D/imagery, web-mercator XYZ) reprojected to the UTM
window in terrain_hires_meta.json. No network required."""
import os, json, math
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling
from PIL import Image
import mercantile
import pyproj

TILES = r"C:\Users\SUDIPTA CHANDA\OneDrive\Tanga\Tanga3D\imagery"
OUT = r"C:\Users\SUDIPTA CHANDA\PycharmProjects\presentationCreator\studio\public"
Z = 16  # ~2.4 m/px

meta = json.load(open(os.path.join(OUT, "terrain_hires_meta.json")))
b = meta["bounds_utm"]

# UTM window corners -> lon/lat to find covering tiles
utm2ll = pyproj.Transformer.from_crs("EPSG:32737", "EPSG:4326", always_xy=True)
corners = [utm2ll.transform(x, y) for x in (b["minX"], b["maxX"]) for y in (b["minY"], b["maxY"])]
lons = [c[0] for c in corners]; lats = [c[1] for c in corners]
lon0, lon1, lat0, lat1 = min(lons), max(lons), min(lats), max(lats)

tiles = list(mercantile.tiles(lon0, lat0, lon1, lat1, zooms=[Z]))
print(f"{len(tiles)} z{Z} tiles cover the window")

# Destination: UTM window
TEX = 4096
th = int(round(TEX * (b["maxY"] - b["minY"]) / (b["maxX"] - b["minX"])))
dst = np.zeros((3, th, TEX), dtype="uint8")
dst_transform = from_bounds(b["minX"], b["minY"], b["maxX"], b["maxY"], TEX, th)

merc = "EPSG:3857"
ll2merc = pyproj.Transformer.from_crs("EPSG:4326", merc, always_xy=True)
used = 0
for t in tiles:
    p = os.path.join(TILES, str(t.z), str(t.x), f"{t.y}.jpg")
    if not os.path.exists(p):
        continue
    try:
        img = np.asarray(Image.open(p).convert("RGB"))  # (256,256,3)
    except Exception:
        continue
    tb = mercantile.xy_bounds(t)  # web-mercator bounds
    src_transform = from_bounds(tb.left, tb.bottom, tb.right, tb.top, 256, 256)
    for band in range(3):
        reproject(
            source=img[:, :, band].copy(),
            destination=dst[band],
            src_transform=src_transform, src_crs=merc,
            dst_transform=dst_transform, dst_crs="EPSG:32737",
            resampling=Resampling.bilinear,
        )
    used += 1

print(f"composited {used} tiles")
out = np.transpose(dst, (1, 2, 0))
Image.fromarray(out, "RGB").save(os.path.join(OUT, "terrain_texture_hires.jpg"), quality=88)
print(f"wrote terrain_texture_hires.jpg {TEX}x{th}")
