#!/usr/bin/env python
"""
Generate a test terrain mesh with forge3d from the real DEM data.

Inputs:
  - public/height.bin
  - public/terrain_meta.json
  - public/terrain_runtime.json (clip radius)
  - public/drillholes_utm.json (AOI center)

Output:
  - public/generated/forge3d_test_terrain.obj
  - public/generated/forge3d_test_terrain_simplified.obj
  - public/generated/forge3d_test_terrain_meta.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from forge3d.geometry import center_mesh, displace_heightmap, mesh_bounds, primitive_mesh, simplify_mesh, subdivide_mesh, swap_mesh_axes
from forge3d.io import save_obj


ROOT = Path(__file__).resolve().parents[1]
HEIGHT_BIN = ROOT / "public" / "height.bin"
TERRAIN_META = ROOT / "public" / "terrain_meta.json"
TERRAIN_RUNTIME = ROOT / "public" / "terrain_runtime.json"
DRILLHOLES_UTM = ROOT / "public" / "drillholes_utm.json"
OUT_DIR = ROOT / "public" / "generated"
OUT_FULL = OUT_DIR / "forge3d_test_terrain.obj"
OUT_SIMPLIFIED = OUT_DIR / "forge3d_test_terrain_simplified.obj"
OUT_META = OUT_DIR / "forge3d_test_terrain_meta.json"


def downsample_nearest(height: np.ndarray, max_dim: int = 1024) -> np.ndarray:
    h, w = height.shape
    stride = max(1, int(np.ceil(max(h, w) / max_dim)))
    if stride == 1:
        return height
    return height[::stride, ::stride]


def load_inputs():
    if not HEIGHT_BIN.exists():
        raise FileNotFoundError(f"DEM not found: {HEIGHT_BIN}")
    if not TERRAIN_META.exists():
        raise FileNotFoundError(f"Metadata not found: {TERRAIN_META}")
    if not DRILLHOLES_UTM.exists():
        raise FileNotFoundError(f"Drillholes not found: {DRILLHOLES_UTM}")

    meta = json.loads(TERRAIN_META.read_text(encoding="utf-8"))
    runtime = json.loads(TERRAIN_RUNTIME.read_text(encoding="utf-8")) if TERRAIN_RUNTIME.exists() else {}
    drillholes = json.loads(DRILLHOLES_UTM.read_text(encoding="utf-8"))
    return meta, runtime, drillholes


def idx_from_utm(x: float, y: float, *, min_x: float, max_x: float, min_y: float, max_y: float, width: int, height: int):
    u = (x - min_x) / (max_x - min_x)
    v = (max_y - y) / (max_y - min_y)
    ix = int(np.clip(round(u * (width - 1)), 0, width - 1))
    iy = int(np.clip(round(v * (height - 1)), 0, height - 1))
    return ix, iy


def main() -> None:
    meta, runtime, drillholes = load_inputs()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    width = int(meta["width"])
    height_n = int(meta["height"])
    b = meta["bounds_utm"]
    min_x, max_x = float(b["minX"]), float(b["maxX"])
    min_y, max_y = float(b["minY"]), float(b["maxY"])

    dem = np.fromfile(HEIGHT_BIN, dtype=np.float32).reshape((height_n, width))

    # Compute center from drillholes (UTM coordinates in geometry coordinates).
    assay = drillholes.get("assay") or []
    utm_points = []
    for feat in assay:
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or []
        if not coords:
            continue
        first = coords[0]
        if not isinstance(first, (list, tuple)) or len(first) < 2:
            continue
        try:
            utm_points.append((float(first[0]), float(first[1])))
        except Exception:
            continue

    if not utm_points:
        raise RuntimeError("Could not derive drillhole UTM center from geometry coordinates in public/drillholes_utm.json")

    xs = np.array([p[0] for p in utm_points], dtype=np.float64)
    ys = np.array([p[1] for p in utm_points], dtype=np.float64)
    if xs.size == 0 or ys.size == 0:
        raise RuntimeError("Could not derive drillhole UTM center from public/drillholes_utm.json")

    center_x = float(np.mean(xs))
    center_y = float(np.mean(ys))
    clip_radius = float(runtime.get("clipRadiusM", 7000))
    pad = 1.35  # include shoulder terrain around AOI
    r = clip_radius * pad

    x0, y0 = idx_from_utm(center_x - r, center_y + r, min_x=min_x, max_x=max_x, min_y=min_y, max_y=max_y, width=width, height=height_n)
    x1, y1 = idx_from_utm(center_x + r, center_y - r, min_x=min_x, max_x=max_x, min_y=min_y, max_y=max_y, width=width, height=height_n)
    left, right = sorted((x0, x1))
    top, bottom = sorted((y0, y1))
    crop = dem[top : bottom + 1, left : right + 1]

    # Replace nodata-like zeros with low-percentile terrain to avoid flat holes.
    valid = crop[crop > 0]
    fill_val = float(np.percentile(valid, 2)) if valid.size else 0.0
    crop = np.where(crop <= 0, fill_val, crop)

    height = downsample_nearest(crop, max_dim=1024).astype(np.float32)

    lo = float(np.nanmin(height))
    hi = float(np.nanmax(height))
    span = max(hi - lo, 1e-6)
    norm = (height - lo) / span

    # Start from a plane and refine for displacement.
    mesh = primitive_mesh("plane")
    mesh = subdivide_mesh(mesh, levels=9)  # denser before simplification
    mesh = displace_heightmap(mesh, norm, scale=1.0)

    # Convert to Y-up for Three.js conventions, then center near origin.
    mesh, _ = swap_mesh_axes(mesh, 1, 2)
    mesh, center_offset = center_mesh(mesh)

    save_obj(mesh, str(OUT_FULL))

    # Keep more triangles for a smoother professional presentation surface.
    mesh_lite = simplify_mesh(mesh, target_ratio=0.4)
    save_obj(mesh_lite, str(OUT_SIMPLIFIED))

    bounds = mesh_bounds(mesh)
    lite_bounds = mesh_bounds(mesh_lite)
    # Real-world extents for viewer scaling.
    crop_w_m = (right - left) / max(1, width - 1) * (max_x - min_x)
    crop_h_m = (bottom - top) / max(1, height_n - 1) * (max_y - min_y)
    payload = {
        "source_dem": str(HEIGHT_BIN.relative_to(ROOT)).replace("\\", "/"),
        "dem_shape_original": [int(dem.shape[0]), int(dem.shape[1])],
        "crop_px": {"left": left, "right": right, "top": top, "bottom": bottom},
        "crop_center_utm": {"x": center_x, "y": center_y},
        "clip_radius_m": clip_radius,
        "crop_size_m": {"width": crop_w_m, "height": crop_h_m},
        "dem_shape_used": [int(norm.shape[0]), int(norm.shape[1])],
        "dem_min_max": [lo, hi],
        "center_offset": center_offset.tolist(),
        "mesh_bounds": {
            "min": bounds[0].tolist() if bounds else None,
            "max": bounds[1].tolist() if bounds else None,
        },
        "mesh_simplified_bounds": {
            "min": lite_bounds[0].tolist() if lite_bounds else None,
            "max": lite_bounds[1].tolist() if lite_bounds else None,
        },
        "outputs": [
            str(OUT_FULL.relative_to(ROOT)).replace("\\", "/"),
            str(OUT_SIMPLIFIED.relative_to(ROOT)).replace("\\", "/"),
        ],
        "viewer_scale_hint": {
            "x": crop_w_m,
            "y": span,
            "z": crop_h_m,
        },
    }

    OUT_META.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Generated: {OUT_FULL}")
    print(f"Generated: {OUT_SIMPLIFIED}")
    print(f"Metadata : {OUT_META}")


if __name__ == "__main__":
    main()
