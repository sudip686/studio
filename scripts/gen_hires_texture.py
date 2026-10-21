"""Reproject cached Esri XYZ imagery onto the Tanga high-resolution terrain grid.

Missing z16 tiles are filled from the matching z15 quadrant where available.
The mosaic is assembled in Web Mercator first and warped once into EPSG:32737;
per-tile full-grid warps would overwrite valid imagery with empty pixels.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import mercantile
import numpy as np
import pyproj
import rasterio
from PIL import Image
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
TILES = Path(os.environ.get(
    "TANGA_IMAGERY_TILES",
    r"C:\Users\SUDIPTA CHANDA\OneDrive - SAKARIYA MINES AND MINERALS PVT LTD\PC Backup (03-Sep-2026)\Mining_Geology_Research\02_Tanga_Graphite_Project\Tanga3D\imagery",
))
Z = 16
TEXTURE_WIDTH = 4096


def read_tile(z: int, x: int, y: int) -> np.ndarray | None:
    path = TILES / str(z) / str(x) / f"{y}.jpg"
    if not path.is_file():
        return None
    try:
        with Image.open(path) as image:
            return np.asarray(image.convert("RGB"))
    except OSError:
        return None


def main() -> None:
    metadata = json.loads((PUBLIC / "terrain_hires_meta.json").read_text(encoding="utf-8"))
    bounds = metadata["bounds_utm"]
    utm_to_ll = pyproj.Transformer.from_crs("EPSG:32737", "EPSG:4326", always_xy=True)
    corners = [utm_to_ll.transform(x, y) for x in (bounds["minX"], bounds["maxX"]) for y in (bounds["minY"], bounds["maxY"])]
    lon0, lon1 = min(point[0] for point in corners), max(point[0] for point in corners)
    lat0, lat1 = min(point[1] for point in corners), max(point[1] for point in corners)
    tiles = list(mercantile.tiles(lon0, lat0, lon1, lat1, zooms=[Z]))
    min_x, max_x = min(tile.x for tile in tiles), max(tile.x for tile in tiles)
    min_y, max_y = min(tile.y for tile in tiles), max(tile.y for tile in tiles)
    mosaic = np.zeros(((max_y - min_y + 1) * 256, (max_x - min_x + 1) * 256, 3), dtype=np.uint8)
    native_count = fallback_count = missing_count = 0

    for tile in tiles:
        image = read_tile(tile.z, tile.x, tile.y)
        if image is not None:
            native_count += 1
        else:
            parent = read_tile(tile.z - 1, tile.x // 2, tile.y // 2)
            if parent is not None:
                x0, y0 = (tile.x % 2) * 128, (tile.y % 2) * 128
                image = np.asarray(Image.fromarray(parent[y0:y0 + 128, x0:x0 + 128]).resize((256, 256), Image.Resampling.BILINEAR))
                fallback_count += 1
            else:
                missing_count += 1
                continue
        row = (tile.y - min_y) * 256
        column = (tile.x - min_x) * 256
        mosaic[row:row + 256, column:column + 256] = image

    west_north = mercantile.xy_bounds(mercantile.Tile(min_x, min_y, Z))
    east_south = mercantile.xy_bounds(mercantile.Tile(max_x, max_y, Z))
    source_transform = from_bounds(west_north.left, east_south.bottom, east_south.right, west_north.top, mosaic.shape[1], mosaic.shape[0])
    source = np.transpose(mosaic, (2, 0, 1))
    texture_height = round(TEXTURE_WIDTH * (bounds["maxY"] - bounds["minY"]) / (bounds["maxX"] - bounds["minX"]))
    destination = np.zeros((3, texture_height, TEXTURE_WIDTH), dtype=np.uint8)
    destination_transform = from_bounds(bounds["minX"], bounds["minY"], bounds["maxX"], bounds["maxY"], TEXTURE_WIDTH, texture_height)
    reproject(
        source=source,
        destination=destination,
        src_transform=source_transform,
        src_crs="EPSG:3857",
        dst_transform=destination_transform,
        dst_crs="EPSG:32737",
        resampling=Resampling.bilinear,
        init_dest_nodata=False,
    )
    result = Image.fromarray(np.transpose(destination, (1, 2, 0)), "RGB")
    output = PUBLIC / metadata["rgb_texture"]
    result.save(output, quality=91, optimize=True)
    print(f"z{Z} mosaic: {native_count} native tiles, {fallback_count} z{Z - 1} fallbacks, {missing_count} empty tiles")
    print(f"wrote {output.name}: {TEXTURE_WIDTH}×{texture_height}, {output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
