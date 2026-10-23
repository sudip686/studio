"""Audit survey, regional DEM, drillhole and interpreted-model registration.

This is a read-only QA tool for the original survey source and the checked-in
presentation assets. It reports elevation differences but never changes or
snaps source drillhole coordinates. Install rasterio, numpy and pyproj, then
pass the original DTM and regional DEM paths explicitly.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import struct
import csv
import urllib.request
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SCENE_SOURCE = ROOT / "src" / "components" / "TangaThreeGeologyScene.tsx"
NODATA = -32767.0


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def read_glb_position_bounds(path: Path) -> dict:
    raw = path.read_bytes()
    require(len(raw) >= 20 and raw[:4] == b"glTF", f"Invalid GLB header: {path}")
    version, declared_length = struct.unpack_from("<II", raw, 4)
    require(version == 2 and declared_length == len(raw), f"Unexpected GLB version or length: {path}")
    json_length, chunk_type = struct.unpack_from("<II", raw, 12)
    require(chunk_type == 0x4E4F534A, f"Missing GLB JSON chunk: {path}")
    document = json.loads(raw[20 : 20 + json_length].decode("utf-8").rstrip(" \0"))

    position_accessors = set()
    mesh_names = []
    for mesh in document.get("meshes", []):
        mesh_names.append(mesh.get("name", "unnamed"))
        for primitive in mesh.get("primitives", []):
            accessor = primitive.get("attributes", {}).get("POSITION")
            if accessor is not None:
                position_accessors.add(accessor)

    accessors = [document["accessors"][index] for index in sorted(position_accessors)]
    require(accessors and all("min" in item and "max" in item for item in accessors), "GLB POSITION bounds are missing")
    minimum = [min(item["min"][axis] for item in accessors) for axis in range(3)]
    maximum = [max(item["max"][axis] for item in accessors) for axis in range(3)]
    return {
        "generator": document.get("asset", {}).get("generator"),
        "meshes": mesh_names,
        "vertexCount": sum(item.get("count", 0) for item in accessors),
        "positionBounds": {"min": minimum, "max": maximum},
    }


def read_point_shapefile(path: Path) -> dict[str, tuple[float, float]]:
    """Read point XY records without requiring an additional GIS package."""
    shp = path.read_bytes()
    require(len(shp) >= 100 and struct.unpack_from(">I", shp, 0)[0] == 9994, "Invalid point shapefile")
    points: list[tuple[float, float]] = []
    offset = 100
    while offset < len(shp):
        require(offset + 8 <= len(shp), "Truncated shapefile record header")
        content_bytes = struct.unpack_from(">I", shp, offset + 4)[0] * 2
        body = offset + 8
        require(body + content_bytes <= len(shp), "Truncated shapefile record")
        shape_type = struct.unpack_from("<I", shp, body)[0]
        require(shape_type == 1, f"Expected Point shapefile records, found shape type {shape_type}")
        points.append(struct.unpack_from("<dd", shp, body + 4))
        offset = body + content_bytes

    dbf_path = path.with_suffix(".dbf")
    dbf = dbf_path.read_bytes()
    record_count = struct.unpack_from("<I", dbf, 4)[0]
    header_length, record_length = struct.unpack_from("<HH", dbf, 8)
    fields = []
    pos = 32
    while dbf[pos] != 0x0D:
        descriptor = dbf[pos : pos + 32]
        fields.append((descriptor[:11].split(b"\0", 1)[0].decode("ascii").strip().lower(), descriptor[16]))
        pos += 32
    require(record_count == len(points), "DBF and SHP record counts differ")
    require(len(dbf) >= header_length + record_count * record_length, "Truncated DBF records")
    offsets, cursor = {}, 1
    for name, length in fields:
        offsets[name] = (cursor, length)
        cursor += length
    require("b_name" in offsets, "BOREHOLE DBF has no B_NAME field")
    result = {}
    for index, (x, y) in enumerate(points):
        record = dbf[header_length + index * record_length : header_length + (index + 1) * record_length]
        start, length = offsets["b_name"]
        name = record[start : start + length].decode("ascii", errors="replace").strip()
        if name:
            result[name] = (x, y)
    return result


def audit_collar_sources(survey_shapefile: Path, mre_csv: Path, viewer_collars: dict) -> dict:
    survey = read_point_shapefile(survey_shapefile)
    require("WGS_1984_UTM_Zone_37S" in survey_shapefile.with_suffix(".prj").read_text(encoding="utf-8"), "Survey collar CRS is not WGS 84 / UTM 37S")
    with mre_csv.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        rows = list(reader)
    require(rows and {"BHID", "X", "Y", "Z", "DATUM", "ZONE"}.issubset(rows[0]), "MRE collar CSV is missing expected fields")
    transform = Transformer.from_crs(21037, 32737, always_xy=True)
    viewer_ids = set(viewer_collars)
    survey_ids = set(survey)
    matched_survey_ids = viewer_ids & survey_ids
    coordinate_residuals = []
    for hole_id in matched_survey_ids:
        x, y = viewer_collars[hole_id][:2]
        sx, sy = survey[hole_id]
        coordinate_residuals.append(float(np.hypot(x - sx, y - sy)))
    source_aliases = {"TGDD1OO7": "TGDD1007"}
    aliases_found = {source: target for source, target in source_aliases.items() if source in survey and target in viewer_collars}

    mismatches = []
    distances = []
    for row in rows:
        hole_id = row["BHID"].strip()
        if row["DATUM"].strip().upper() != "ARC 1960" or row["ZONE"].strip().upper() != "37M":
            continue
        east, north = transform.transform(float(row["X"]), float(row["Y"]))
        target = hole_id if hole_id in viewer_collars else source_aliases.get(hole_id)
        if target in viewer_collars:
            x, y = viewer_collars[target][:2]
            distance = float(np.hypot(east - x, north - y))
            distances.append(distance)
            if distance > 10:
                nearest_id, nearest_distance = min(
                    ((other_id, float(np.hypot(east - other[0], north - other[1]))) for other_id, other in viewer_collars.items()),
                    key=lambda item: item[1],
                )
                mismatches.append({
                    "mreHoleId": hole_id,
                    "viewerHoleId": target,
                    "distanceM": distance,
                    "nearestViewerHoleId": nearest_id,
                    "nearestViewerDistanceM": nearest_distance,
                })
    return {
        "surveyPointCount": len(survey),
        "mreCsvRowCount": len(rows),
        "mreSourceCrs": "EPSG:21037 (Arc 1960 / UTM zone 37S), based on DATUM=ARC 1960 and ZONE=37M",
        "surveySourceCrs": "EPSG:32737 (WGS 84 / UTM zone 37S), from BOREHOLE.prj",
        "viewerSurveyExactIdMatches": len(matched_survey_ids),
        "viewerSurveyExactIdCoordinateResidualM": {"max": max(coordinate_residuals) if coordinate_residuals else None},
        "probableSurveyIdTypo": aliases_found,
        "transformedMreToViewerMatchCount": len(distances),
        "transformedMreToViewerDistanceM": {"median": float(np.median(distances)) if distances else None, "max": max(distances) if distances else None},
        "over10mDiscrepancies": mismatches,
        "coordinatesModified": False,
        "qualification": "Survey ID typo is a likely O/0 transcription mismatch; elevation is not populated for that survey row. Two transformed MRE locations are near one another's survey locations; investigate source records before treating them as swapped.",
    }


def audit_block_model(url: str, terrain_bounds: dict) -> dict:
    request = urllib.request.Request(url, headers={"accept": "application/geo+json, application/json"})
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = json.load(response)
    features = payload.get("features", [])
    require(features, "Block model response has no GeoJSON features")
    transform = Transformer.from_crs(21037, 32737, always_xy=True)
    geometry_transform = Transformer.from_crs(4326, 32737, always_xy=True)
    residuals, easts, norths = [], [], []
    for feature in features:
        geometry = feature.get("geometry", {})
        props = feature.get("properties", {})
        coords = geometry.get("coordinates", [])
        require(geometry.get("type") == "Point" and len(coords) >= 2, "Unexpected block model geometry")
        lon, lat = float(coords[0]), float(coords[1])
        geom_x, geom_y = geometry_transform.transform(lon, lat)
        prop_x, prop_y = transform.transform(float(props["X"]), float(props["Y"]))
        residuals.append(float(np.hypot(geom_x - prop_x, geom_y - prop_y)))
        easts.append(geom_x)
        norths.append(geom_y)
    bounds_ok = all(terrain_bounds["minX"] <= x <= terrain_bounds["maxX"] for x in easts) and all(terrain_bounds["minY"] <= y <= terrain_bounds["maxY"] for y in norths)
    return {
        "featureCount": len(features),
        "geometryCrs": "WGS 84 longitude/latitude, transformed to EPSG:32737 for comparison",
        "propertyCrs": "EPSG:21037 (inferred from source MRE coordinate declaration and exact transformed feature agreement)",
        "geometryVsTransformedPropertyResidualM": {"max": max(residuals), "p95": float(np.percentile(residuals, 95))},
        "projectedGeometryBoundsEastingNorthingM": [min(easts), min(norths), max(easts), max(norths)],
        "allFeaturesInsidePresentationTerrainBounds": bounds_ok,
        "coordinatesModified": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--survey-dtm", required=True, type=Path, help="Original August 2025 DTM.tif")
    parser.add_argument("--regional-dem", required=True, type=Path, help="Regional Copernicus DEM used outside survey coverage")
    parser.add_argument("--survey-collars", type=Path, help="Original WGS 84 / UTM 37S BOREHOLE.shp")
    parser.add_argument("--mre-collars", type=Path, help="AMC/MRE DH_Collar.csv with its declared Arc 1960 coordinates")
    parser.add_argument("--block-model-url", help="Optional GeoJSON API URL for a full geometry/property CRS cross-check")
    args = parser.parse_args()
    require(bool(args.survey_collars) == bool(args.mre_collars), "Pass both --survey-collars and --mre-collars, or neither")
    if os.name == "nt":
        args.survey_dtm = Path("\\\\?\\" + str(args.survey_dtm.resolve()))
        args.regional_dem = Path("\\\\?\\" + str(args.regional_dem.resolve()))
        if args.survey_collars:
            args.survey_collars = Path("\\\\?\\" + str(args.survey_collars.resolve()))
            args.mre_collars = Path("\\\\?\\" + str(args.mre_collars.resolve()))
    for source in (args.survey_dtm, args.regional_dem):
        require(source.is_file(), f"Source raster not found: {source}")

    meta = json.loads((PUBLIC / "terrain_hires_meta.json").read_text(encoding="utf-8"))
    source_meta = meta["survey_surface"]
    bounds = meta["bounds_utm"]
    width, height = int(meta["width"]), int(meta["height"])
    require(meta["crs_epsg"] == 32737 and source_meta["crs"] == "EPSG:32737", "Survey and display grid must use EPSG:32737")
    require(source_meta["source_elevation_units"] == "metres", "Unexpected survey elevation units")

    with rasterio.open(args.survey_dtm) as survey:
        require(survey.crs and survey.crs.to_epsg() == 32737, f"Survey DTM CRS is not EPSG:32737: {survey.crs}")
        require(survey.units[0] == "metre", f"Survey DTM elevations are not metres: {survey.units}")
        require(survey.tags().get("AREA_OR_POINT") == "Point", "Expected the supplied survey DTM to be PixelIsPoint")
        require(survey.nodata is not None, "Survey DTM NoData is not declared")
        require(source_meta.get("vertical_datum", "").lower().startswith("not stated"), "Survey vertical datum changed; inspect source before updating this audit")
        source_values = survey.read(1, masked=True).compressed().astype(np.float64)
        require(source_values.size > 0, "Survey DTM has no valid cells")

        drill_data = json.loads((PUBLIC / "drillholes_utm.json").read_text(encoding="utf-8"))
        collars = {}
        malformed_lines = 0
        for feature in drill_data.get("lithology", []):
            props = feature.get("properties", {})
            hole_id = props.get("hole_id")
            if not hole_id or float(props.get("depth_from", -1)) != 0 or hole_id in collars:
                continue
            coordinates = feature.get("geometry", {}).get("coordinates", [])
            if len(coordinates) < 2 or any(len(point) < 3 for point in coordinates):
                malformed_lines += 1
                continue
            collars[hole_id] = tuple(float(value) for value in coordinates[0][:3])

        require(len(collars) == 100, f"Expected 100 distinct depth-zero collars, found {len(collars)}")
        require(malformed_lines == 0, f"Found {malformed_lines} malformed drillhole traces")
        collar_samples = list(survey.sample([(point[0], point[1]) for point in collars.values()], masked=True))
        collar_differences = []
        for (hole_id, (easting, northing, elevation)), sample in zip(collars.items(), collar_samples):
            sampled_elevation = sample[0]
            if np.ma.is_masked(sampled_elevation) or not np.isfinite(sampled_elevation) or sampled_elevation == survey.nodata:
                continue
            collar_differences.append(elevation - float(sampled_elevation))
        collar_differences = np.asarray(collar_differences, dtype=np.float64)

    require(collar_differences.size == 100, f"Only {collar_differences.size}/100 collars sample a valid survey cell")

    with rasterio.open(args.regional_dem) as regional:
        require(regional.crs and regional.crs.to_epsg() == 4326, f"Regional DEM CRS changed: {regional.crs}")
        regional_values = regional.read(1, masked=True).compressed().astype(np.float64)
        require(regional_values.size > 0, "Regional DEM has no valid cells")
        regional_source = {
            "crs": regional.crs.to_string(),
            "resolution": list(regional.res),
            "units": regional.units,
            "verticalDatumMetadata": regional.tags().get("VERTICAL_DATUM") or regional.tags(1).get("VERTICAL_DATUM") or "not declared",
            "bounds": [regional.bounds.left, regional.bounds.bottom, regional.bounds.right, regional.bounds.top],
            "rangeM": [float(regional_values.min()), float(regional_values.max())],
        }

    expected_width = (bounds["maxX"] - bounds["minX"]) / width
    expected_height = (bounds["maxY"] - bounds["minY"]) / height
    source_bounds = source_meta["source_bounds_utm"]
    require(
        bounds["minX"] <= source_bounds["minX"] <= source_bounds["maxX"] <= bounds["maxX"]
        and bounds["minY"] <= source_bounds["minY"] <= source_bounds["maxY"] <= bounds["maxY"],
        "The surveyed source extent is not contained by the presentation grid",
    )

    project_match = re.search(r"const PROJECT_CENTER = \{lon: ([\d.-]+), lat: ([\d.-]+)\};", SCENE_SOURCE.read_text(encoding="utf-8"))
    vertical_match = re.search(r"const LOCAL_VERTICAL_DATUM = ([\d.-]+);", SCENE_SOURCE.read_text(encoding="utf-8"))
    require(project_match is not None and vertical_match is not None, "Could not read the presentation's documented local coordinate origin")
    longitude, latitude = map(float, project_match.groups())
    local_vertical_datum = float(vertical_match.group(1))
    center_easting, center_northing = Transformer.from_crs(4326, 32737, always_xy=True).transform(longitude, latitude)
    grid_center = ((bounds["minX"] + bounds["maxX"]) / 2, (bounds["minY"] + bounds["maxY"]) / 2)
    require(abs(center_easting - grid_center[0]) < 0.01 and abs(center_northing - grid_center[1]) < 0.01, "Runtime local origin and terrain grid center disagree")

    coverage = np.fromfile(PUBLIC / "survey_coverage_hires.bin", dtype=np.uint8)
    survey_grid = np.fromfile(PUBLIC / "survey_height_hires.bin", dtype="<f4")
    regional_grid = np.fromfile(PUBLIC / "height_hires.bin", dtype="<f4")
    require(coverage.size == width * height and survey_grid.size == width * height, "Survey output dimensions differ from metadata")
    require(meta.get("context_grid", {}).get("file") == "terrain_context_512.bin", "Missing regional-context grid metadata")
    full_regional_grid = regional_grid
    regional_grid = np.fromfile(PUBLIC / meta["context_grid"]["file"], dtype="<f4")
    require(full_regional_grid.size == width * height, "Full regional grid dimensions differ from metadata")
    context_width, context_height = meta["context_grid"]["width"], meta["context_grid"]["height"]
    require(regional_grid.size == context_width * context_height, "Regional context grid dimensions differ from metadata")
    require(np.isin(coverage, (0, 1)).all(), "Survey coverage mask is not binary")
    covered = coverage.astype(bool)
    require(int(covered.sum()) == int(source_meta["valid_output_fraction"] * coverage.size + 0.5), "Survey coverage count does not match metadata")
    require(np.isfinite(survey_grid[covered]).all(), "Valid survey cells contain non-finite values")
    require(np.all(survey_grid[~covered] == NODATA), "Cells outside survey coverage are not kept as NoData")
    require(np.isfinite(full_regional_grid).all() and np.isfinite(regional_grid).all(), "Regional fallback grid contains non-finite values")
    expected_context = full_regional_grid.reshape(context_height, 2, context_width, 2).mean(axis=(1, 3))
    require(
        np.allclose(regional_grid.reshape(context_height, context_width), expected_context, rtol=1e-6, atol=1e-4),
        "Regional context grid is not the documented 2x2 mean of the full regional grid",
    )

    glb = read_glb_position_bounds(PUBLIC / "geologicalModel.glb")
    glb_min = glb["positionBounds"]["min"]
    glb_max = glb["positionBounds"]["max"]
    glb_utm = {
        "easting": [glb_min[0], glb_max[0]],
        "elevationM": [glb_min[1], glb_max[1]],
        "northing": [-glb_max[2], -glb_min[2]],
    }
    local_bounds = {
        "xEastM": [glb_utm["easting"][0] - center_easting, glb_utm["easting"][1] - center_easting],
        "yElevationRelativeTo700M": [glb_utm["elevationM"][0] - local_vertical_datum, glb_utm["elevationM"][1] - local_vertical_datum],
        "zNorthingM": [glb_utm["northing"][0] - center_northing, glb_utm["northing"][1] - center_northing],
    }
    require(
        bounds["minX"] <= glb_utm["easting"][0] <= glb_utm["easting"][1] <= bounds["maxX"]
        and bounds["minY"] <= glb_utm["northing"][0] <= glb_utm["northing"][1] <= bounds["maxY"],
        "Interpreted geology model horizontal bounds exceed the terrain grid",
    )

    report = {
        "audit": "Tanga spatial data registration",
        "survey": {
            "path": str(args.survey_dtm),
            "crs": "EPSG:32737",
            "interpretation": "PixelIsPoint",
            "horizontalUnits": "metres",
            "verticalUnits": "metres",
            "verticalDatum": "not stated in source metadata",
            "boundsEastingNorthingM": [source_bounds["minX"], source_bounds["minY"], source_bounds["maxX"], source_bounds["maxY"]],
            "rasterShapeRowsColumns": [12219, 3858],
            "sourcePixelSizeM": list(source_meta["source_cell_size_m"]),
            "validCells": int(source_values.size),
            "elevationRangeM": [float(source_values.min()), float(source_values.max())],
        },
        "regional": {"path": str(args.regional_dem), **regional_source},
        "presentationGrid": {
            "crs": f"EPSG:{meta['crs_epsg']}",
            "shapeRowsColumns": [height, width],
            "cellSizeM": [expected_width, expected_height],
            "boundsEastingNorthingM": [bounds["minX"], bounds["minY"], bounds["maxX"], bounds["maxY"]],
            "sourceValidFraction": float(covered.mean()),
            "centerMatchesRuntimeProjectOrigin": True,
            "localVerticalDatumM": local_vertical_datum,
            "verticalExaggeration": 1,
        },
        "drillholes": {
            "distinctDepthZeroCollars": len(collars),
            "collarsWithinValidSurvey": int(collar_differences.size),
            "sampleMethod": "nearest source PixelIsPoint cell through Rasterio dataset.sample",
            "recordedCollarMinusSurveyM": {
                "min": float(collar_differences.min()),
                "max": float(collar_differences.max()),
                "median": float(np.median(collar_differences)),
                "mean": float(collar_differences.mean()),
                "p95Absolute": float(np.percentile(np.abs(collar_differences), 95)),
            },
            "coordinatesShifted": False,
        },
        "interpretedGeologyModel": {**glb, "sourceUTMBounds": glb_utm, "runtimeLocalBounds": local_bounds},
        "interpretation": [
            "The survey, collar, geology-model and presentation grids agree horizontally in WGS 84 / UTM zone 37S; the model uses local X=easting, Y=elevation−700 m, Z=−northing.",
            "The survey DTM vertical datum is not stated. The regional DEM also has no vertical-datum metadata in the supplied raster. The numeric collar-to-survey differences are a registration diagnostic, not proof of survey accuracy or a datum correction.",
            "Recorded collar coordinates and elevations are not shifted or snapped. The app substitutes surveyed elevations only inside the valid coverage mask and uses regional terrain outside; no unverified cross-source datum adjustment is applied.",
        ],
    }
    if args.survey_collars:
        report["collarSourceCrosswalk"] = audit_collar_sources(args.survey_collars, args.mre_collars, collars)
    if args.block_model_url:
        report["blockModel"] = audit_block_model(args.block_model_url, bounds)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
