"""Generate a local Tanga DEM mesh from public Terrarium terrain tiles.

The output is intentionally small enough to be loaded by Deck.gl as a local
SimpleMeshLayer, avoiding runtime tile fan-out during presentation.
"""

from __future__ import annotations

import json
import math
import statistics
import urllib.request
from pathlib import Path

from PIL import Image


PROJECT_CENTER = {"lon": 38.785, "lat": -4.813}
BOUNDS = [38.72, -5.12, 39.17, -4.72]
ZOOM = 12
SEGMENTS_X = 132
SEGMENTS_Y = 118
VERTICAL_EXAGGERATION = 2.15
TILE_SIZE = 256
TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"

ROOT = Path(__file__).resolve().parents[1]
TILE_DIR = ROOT / "data" / "dem_tiles" / "terrarium"
OUT_PATH = ROOT / "public" / "generated" / "tanga_dem_mesh.json"


def lonlat_to_tile_float(lon: float, lat: float, zoom: int) -> tuple[float, float]:
    lat_rad = math.radians(lat)
    tiles = 2**zoom
    x = (lon + 180.0) / 360.0 * tiles
    y = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * tiles
    return x, y


def meters_per_degree_lon(lat: float) -> float:
    return 111_320 * math.cos(math.radians(lat))


def tile_path(z: int, x: int, y: int) -> Path:
    return TILE_DIR / str(z) / str(x) / f"{y}.png"


def fetch_tile(z: int, x: int, y: int) -> Image.Image:
    path = tile_path(z, x, y)
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        url = TILE_URL.format(z=z, x=x, y=y)
        with urllib.request.urlopen(url, timeout=30) as response:
            path.write_bytes(response.read())
    return Image.open(path).convert("RGB")


tile_cache: dict[tuple[int, int, int], Image.Image] = {}


def elevation_at(lon: float, lat: float) -> float:
    x_float, y_float = lonlat_to_tile_float(lon, lat, ZOOM)
    tile_x = math.floor(x_float)
    tile_y = math.floor(y_float)
    pixel_x = min(TILE_SIZE - 1, max(0, int((x_float - tile_x) * TILE_SIZE)))
    pixel_y = min(TILE_SIZE - 1, max(0, int((y_float - tile_y) * TILE_SIZE)))
    key = (ZOOM, tile_x, tile_y)
    if key not in tile_cache:
        tile_cache[key] = fetch_tile(*key)
    red, green, blue = tile_cache[key].getpixel((pixel_x, pixel_y))
    return red * 256 + green + blue / 256 - 32768


def compute_normals(positions: list[float], indices: list[int]) -> list[float]:
    normals = [0.0] * len(positions)
    for offset in range(0, len(indices), 3):
        ia, ib, ic = indices[offset : offset + 3]
        ax, ay, az = positions[ia * 3 : ia * 3 + 3]
        bx, by, bz = positions[ib * 3 : ib * 3 + 3]
        cx, cy, cz = positions[ic * 3 : ic * 3 + 3]
        abx, aby, abz = bx - ax, by - ay, bz - az
        acx, acy, acz = cx - ax, cy - ay, cz - az
        nx = aby * acz - abz * acy
        ny = abz * acx - abx * acz
        nz = abx * acy - aby * acx
        for vertex in (ia, ib, ic):
            normals[vertex * 3] += nx
            normals[vertex * 3 + 1] += ny
            normals[vertex * 3 + 2] += nz

    for vertex in range(len(normals) // 3):
        nx, ny, nz = normals[vertex * 3 : vertex * 3 + 3]
        length = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
        normals[vertex * 3] = nx / length
        normals[vertex * 3 + 1] = ny / length
        normals[vertex * 3 + 2] = nz / length
    return normals


def main() -> None:
    min_lon, min_lat, max_lon, max_lat = BOUNDS
    heights: list[float] = []
    raw_heights: list[float] = []
    positions: list[float] = []
    tex_coords: list[float] = []
    indices: list[int] = []

    for y in range(SEGMENTS_Y + 1):
        v = y / SEGMENTS_Y
        lat = min_lat + (max_lat - min_lat) * v
        for x in range(SEGMENTS_X + 1):
            u = x / SEGMENTS_X
            lon = min_lon + (max_lon - min_lon) * u
            raw = elevation_at(lon, lat)
            height = raw * VERTICAL_EXAGGERATION
            raw_heights.append(raw)
            heights.append(height)
            positions.extend(
                [
                    (lon - PROJECT_CENTER["lon"]) * meters_per_degree_lon(PROJECT_CENTER["lat"]),
                    (lat - PROJECT_CENTER["lat"]) * 110_540,
                    height,
                ]
            )
            tex_coords.extend([u, v])

    row = SEGMENTS_X + 1
    for y in range(SEGMENTS_Y):
        for x in range(SEGMENTS_X):
            a = y * row + x
            b = a + 1
            c = a + row
            d = c + 1
            indices.extend([a, c, b, b, c, d])

    normals = compute_normals(positions, indices)
    payload = {
        "source": "Mapzen/AWS Terrarium terrain tiles",
        "tileUrl": TILE_URL,
        "zoom": ZOOM,
        "bounds": BOUNDS,
        "projectCenter": PROJECT_CENTER,
        "segments": [SEGMENTS_X, SEGMENTS_Y],
        "verticalExaggeration": VERTICAL_EXAGGERATION,
        "minElevation": min(raw_heights),
        "maxElevation": max(raw_heights),
        "meanElevation": statistics.fmean(raw_heights),
        "positions": [round(value, 3) for value in positions],
        "normals": [round(value, 6) for value in normals],
        "texCoords": [round(value, 6) for value in tex_coords],
        "indices": indices,
        "heights": [round(value, 3) for value in heights],
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(
        f"Wrote {OUT_PATH} with {(SEGMENTS_X + 1) * (SEGMENTS_Y + 1)} vertices, "
        f"{len(indices) // 3} triangles, elevation {min(raw_heights):.1f}-{max(raw_heights):.1f} m"
    )


if __name__ == "__main__":
    main()
