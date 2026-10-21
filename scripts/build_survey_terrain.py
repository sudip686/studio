"""Build the Tanga presentation's registered survey-terrain overlays.

The existing `height_hires.bin` remains the lower-resolution regional context.
This script resamples the August 2025 surveyed DTM onto that exact grid and
emits a separate height surface and validity mask. The browser only substitutes
surveyed elevations where the source DTM has data; it never fills NoData with
synthetic relief. Derived slope is computed from the metre-valued DTM itself,
not the supplied slope raster whose numeric units are not documented.

Requires rasterio, numpy and pyproj. The input path can be overridden with
TANGA_SURVEY_DTM. Output paths match the app's public asset URLs and R2 keys.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
META_PATH = PUBLIC / "terrain_hires_meta.json"
PROJECT = Path(
    r"C:\Users\SUDIPTA CHANDA\OneDrive - SAKARIYA MINES AND MINERALS PVT LTD"
    r"\PC Backup (03-Sep-2026)\Mining_Geology_Research"
    r"\02_Tanga_Graphite_Project"
)
NO_DATA = -32767.0


def source_path() -> Path:
    configured = os.environ.get("TANGA_SURVEY_DTM")
    if configured:
        path = Path(configured)
    else:
        path = PROJECT / "wetransfer_topofraphical-survey-report_2025-09-08_0738" / "DELIVERABLES_TANGA GRAPHITE PROJECT" / "SHAPEFILES AND RASTER FILES_WGS84 UTM ZONE 37S" / "DTM.tif"
    if os.name == "nt" and not str(path).startswith("\\\\?\\"):
        path = Path("\\\\?\\" + str(path.resolve()))
    return path


def write_grid(name: str, array: np.ndarray) -> None:
    target = PUBLIC / name
    np.asarray(array, dtype="<f4").tofile(target)
    print(f"{name}: {target.stat().st_size:,} bytes")


def main() -> None:
    source = source_path()
    if not source.is_file():
        raise FileNotFoundError(f"Survey DTM not found: {source}")

    # One shared regional grid extends beyond the whole survey footprint. This
    # lets the surveyed surface end at its true NoData outline, with the
    # documented Copernicus regional DEM underneath the rest of the scene.
    lon0, lat0 = 38.785, -4.813
    center_e, center_n = Transformer.from_crs(4326, 32737, always_xy=True).transform(lon0, lat0)
    width, height = 1024, 1402
    bounds = {"minX": center_e - 3800, "maxX": center_e + 3800, "minY": center_n - 5200, "maxY": center_n + 5200}
    transform = from_bounds(bounds["minX"], bounds["minY"], bounds["maxX"], bounds["maxY"], width, height)

    regional_path = PROJECT / "Tanga3D" / "dem_S05.tif"
    if os.name == "nt":
        regional_path = Path("\\\\?\\" + str(regional_path.resolve()))
    if not regional_path.is_file():
        raise FileNotFoundError(f"Regional DEM fallback not found: {regional_path}")
    regional = np.full((height, width), NO_DATA, dtype="float32")
    with rasterio.open(regional_path) as regional_ds:
        reproject(
            source=rasterio.band(regional_ds, 1),
            destination=regional,
            src_transform=regional_ds.transform,
            src_crs=regional_ds.crs,
            src_nodata=regional_ds.nodata,
            dst_transform=transform,
            dst_crs="EPSG:32737",
            dst_nodata=NO_DATA,
            resampling=Resampling.bilinear,
            init_dest_nodata=True,
        )
        regional_source = {
            "file": "Tanga3D/dem_S05.tif",
            "source_crs": regional_ds.crs.to_string(),
            "source_resolution_degrees": list(regional_ds.res),
            "source_description": "regional Copernicus DEM used only outside valid survey DTM cells",
        }
    regional_valid = np.isfinite(regional) & (regional != NO_DATA)
    if regional_valid.sum() != width * height:
        raise ValueError("Regional DEM does not cover the full terrain presentation window")
    write_grid("height_hires.bin", regional)
    # The regional source is ~30 m resolution. A 14.8 m context grid retains
    # that information and can travel with metadata on both hosting platforms.
    context = regional.reshape(height // 2, 2, width // 2, 2).mean(axis=(1, 3))
    write_grid("terrain_context_512.bin", context)
    regional_min, regional_max = float(regional.min()), float(regional.max())
    metadata = {
        "bounds_utm": bounds,
        "width": width,
        "height": height,
        "elevation_m": {"min": regional_min, "max": regional_max},
        "crs_epsg": 32737,
        "rgb_texture": "terrain_texture_hires.jpg",
        "source_height_grid": "height_hires.bin",
        "context_grid": {"width": width // 2, "height": height // 2, "file": "terrain_context_512.bin"},
        "regional_context": regional_source,
    }

    surveyed = np.full((height, width), NO_DATA, dtype="float32")
    validity = np.zeros((height, width), dtype="uint8")
    with rasterio.open(source) as dataset:
        if dataset.crs is None or dataset.crs.to_epsg() != 32737:
            raise ValueError(f"Expected WGS84 / UTM zone 37S (EPSG:32737), found {dataset.crs}")
        if dataset.units[0] != "metre":
            raise ValueError(f"Expected DTM elevations in metres, found {dataset.units[0]}")
        if dataset.dtypes[0] != "int16" or dataset.nodata is None:
            raise ValueError("Unexpected source DTM sample type or missing NoData value")

        source_band = dataset.read(1, masked=True).astype("float32").filled(NO_DATA)
        reproject(
            source=source_band,
            destination=surveyed,
            src_transform=dataset.transform,
            src_crs=dataset.crs,
            src_nodata=NO_DATA,
            dst_transform=transform,
            dst_crs="EPSG:32737",
            dst_nodata=NO_DATA,
            resampling=Resampling.bilinear,
            init_dest_nodata=True,
        )
        source_valid = (~np.ma.getmaskarray(dataset.read(1, masked=True))).astype("uint8")
        reproject(
            source=source_valid,
            destination=validity,
            src_transform=dataset.transform,
            src_crs=dataset.crs,
            dst_transform=transform,
            dst_crs="EPSG:32737",
            resampling=Resampling.nearest,
            init_dest_nodata=True,
        )
        # Derive slope in degrees from source elevations (metres) and source
        # pixel spacing. Cells adjacent to NoData remain invalid.
        source_valid_bool = source_valid.astype(bool)
        source_values = np.asarray(source_band, dtype="float32")
        padded = np.pad(source_values, 1, mode="edge")
        padded_valid = np.pad(source_valid_bool, 1, mode="constant", constant_values=False)
        dz_dx = (padded[1:-1, 2:] - padded[1:-1, :-2]) / (2 * dataset.res[0])
        dz_dy = (padded[2:, 1:-1] - padded[:-2, 1:-1]) / (2 * dataset.res[1])
        neighborhood = (
            padded_valid[1:-1, 2:] & padded_valid[1:-1, :-2]
            & padded_valid[2:, 1:-1] & padded_valid[:-2, 1:-1]
            & source_valid_bool
        )
        slope_source = np.full(source_values.shape, NO_DATA, dtype="float32")
        slope_source[neighborhood] = np.degrees(np.arctan(np.hypot(dz_dx[neighborhood], dz_dy[neighborhood])))
        slope = np.full((height, width), NO_DATA, dtype="float32")
        reproject(
            source=slope_source,
            destination=slope,
            src_transform=dataset.transform,
            src_crs=dataset.crs,
            src_nodata=NO_DATA,
            dst_transform=transform,
            dst_crs="EPSG:32737",
            dst_nodata=NO_DATA,
            resampling=Resampling.bilinear,
            init_dest_nodata=True,
        )
        source_bounds = dataset.bounds
        source_resolution = list(dataset.res)
        source_valid_count = int(source_valid.sum())

    valid = (validity > 0) & np.isfinite(surveyed) & (surveyed != NO_DATA)
    validity = valid.astype("uint8")
    slope[~valid] = NO_DATA
    if valid.sum() < width * height * 0.01:
        raise ValueError("The surveyed source did not overlap the regional terrain grid as expected")
    survey_values = surveyed[valid]
    slope_values = slope[(valid) & np.isfinite(slope) & (slope != NO_DATA)]
    if slope_values.size == 0:
        raise ValueError("Could not derive slope values from the surveyed DTM")

    write_grid("survey_height_hires.bin", surveyed)
    (PUBLIC / "survey_coverage_hires.bin").write_bytes(validity.tobytes())
    print(f"survey_coverage_hires.bin: {(PUBLIC / 'survey_coverage_hires.bin').stat().st_size:,} bytes")
    write_grid("survey_slope_hires.bin", slope)
    metadata["survey_surface"] = {
        "source_file": "DTM.tif",
        "source_report": "SURVEY REPORT_TANGA GRAPHITE PROJECT; topographical survey sheets 1_2 and 2_2",
        "survey_date": "August 2025",
        "acquisition": "Aerial survey",
        "crs": "EPSG:32737",
        "horizontal_units": "metres",
        "source_cell_size_m": source_resolution,
        "source_raster_interpretation": "PixelIsPoint",
        "source_elevation_units": "metres",
        "vertical_datum": "Not stated in the supplied DTM metadata; no vertical transformation applied",
        "source_bounds_utm": {
            "minX": source_bounds.left,
            "minY": source_bounds.bottom,
            "maxX": source_bounds.right,
            "maxY": source_bounds.top,
        },
        "source_valid_cell_count": source_valid_count,
        "output_grid": {"width": width, "height": height, "cell_size_m": [transform.a, abs(transform.e)]},
        "valid_output_fraction": float(valid.mean()),
        "elevation_range_m": [float(survey_values.min()), float(survey_values.max())],
        "derived_slope": {
            "units": "degrees",
            "method": "central differences of source DTM elevations using source pixel spacing; no cross-NoData gradients",
            "range_degrees": [float(slope_values.min()), float(slope_values.max())],
        },
        "supplied_slope_raster_used": False,
    }
    META_PATH.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata["survey_surface"], indent=2))


if __name__ == "__main__":
    main()
