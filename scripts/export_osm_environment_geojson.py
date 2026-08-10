#!/usr/bin/env python
"""
Export offline OSM environment layers for the project area.

Outputs (GeoJSON):
  - public/generated/roads.geojson
  - public/generated/buildings.geojson
  - public/generated/trees.geojson
  - public/generated/labels.geojson
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path
from typing import Any, Dict, List, Tuple
from urllib import parse, request


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "generated"
ASSAY_PATH = ROOT / "public" / "assay_data.geojson"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]


def fc(features: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {"type": "FeatureCollection", "features": features}


def feature(geom_type: str, coords: Any, props: Dict[str, Any]) -> Dict[str, Any]:
    return {"type": "Feature", "geometry": {"type": geom_type, "coordinates": coords}, "properties": props}


def load_center_from_assay() -> Tuple[float, float]:
    obj = json.loads(ASSAY_PATH.read_text(encoding="utf-8"))
    pts: List[Tuple[float, float]] = []
    for f in obj.get("features", []):
        g = f.get("geometry") or {}
        if g.get("type") != "LineString":
            continue
        coords = g.get("coordinates") or []
        if not coords:
            continue
        p = coords[0]
        if isinstance(p, list) and len(p) >= 2:
            pts.append((float(p[0]), float(p[1])))

    if not pts:
        raise RuntimeError("Could not derive center from public/assay_data.geojson")

    lon = sum(p[0] for p in pts) / len(pts)
    lat = sum(p[1] for p in pts) / len(pts)
    return lon, lat


def overpass_query(lat: float, lon: float, radius_m: int) -> str:
    return f"""
[out:json][timeout:50];
(
  way(around:{radius_m},{lat},{lon})["highway"];
  way(around:{radius_m},{lat},{lon})["building"];
  node(around:{radius_m},{lat},{lon})["natural"="tree"];
  node(around:{radius_m},{lat},{lon})["place"];
  node(around:{radius_m},{lat},{lon})["amenity"]["name"];
  node(around:{radius_m},{lat},{lon})["tourism"]["name"];
  node(around:{radius_m},{lat},{lon})["shop"]["name"];
  way(around:{radius_m},{lat},{lon})["landuse"];
  way(around:{radius_m},{lat},{lon})["natural"];
  way(around:{radius_m},{lat},{lon})["amenity"]["name"];
  way(around:{radius_m},{lat},{lon})["tourism"]["name"];
  way(around:{radius_m},{lat},{lon})["shop"]["name"];
);
(._;>;);
out body;
"""


def fetch_overpass(query: str) -> Dict[str, Any]:
    # Overpass typically expects form-encoded `data=<query>`.
    payload = parse.urlencode({"data": query}).encode("utf-8")
    last_error: Exception | None = None
    for url in OVERPASS_URLS:
        try:
            req = request.Request(
                url,
                data=payload,
                method="POST",
                headers={
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Accept": "application/json",
                    "User-Agent": "presentationCreator-studio-osm-export/1.0",
                },
            )
            with request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
            return json.loads(raw.decode("utf-8"))
        except Exception as err:
            last_error = err
            continue
    if last_error:
        raise last_error
    raise RuntimeError("Overpass request failed with unknown error")


def polygon_centroid(coords: List[List[float]]) -> Tuple[float, float]:
    # coords in lon/lat ring (closed or open)
    if not coords:
        return 0.0, 0.0
    ring = coords[:-1] if len(coords) > 2 and coords[0] == coords[-1] else coords
    if len(ring) < 3:
        return ring[0][0], ring[0][1]

    area2 = 0.0
    cx = 0.0
    cy = 0.0
    for i in range(len(ring)):
        j = (i + 1) % len(ring)
        x0, y0 = ring[i]
        x1, y1 = ring[j]
        cross = x0 * y1 - x1 * y0
        area2 += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if abs(area2) < 1e-12:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return sum(xs) / len(xs), sum(ys) / len(ys)
    return cx / (3 * area2), cy / (3 * area2)


def polygon_bbox(coords: List[List[float]]) -> Tuple[float, float, float, float]:
    xs = [p[0] for p in coords]
    ys = [p[1] for p in coords]
    return min(xs), min(ys), max(xs), max(ys)


def point_in_polygon(x: float, y: float, poly: List[List[float]]) -> bool:
    inside = False
    ring = poly[:-1] if len(poly) > 2 and poly[0] == poly[-1] else poly
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside


def main() -> None:
    lon, lat = load_center_from_assay()
    radius_m = 3500
    print(f"Using center lon/lat: {lon:.6f}, {lat:.6f} (radius {radius_m}m)")

    data = fetch_overpass(overpass_query(lat, lon, radius_m))
    elements = data.get("elements", [])

    nodes: Dict[int, Dict[str, Any]] = {}
    ways: Dict[int, Dict[str, Any]] = {}
    for el in elements:
        t = el.get("type")
        if t == "node":
            nodes[int(el["id"])] = el
        elif t == "way":
            ways[int(el["id"])] = el

    roads: List[Dict[str, Any]] = []
    buildings: List[Dict[str, Any]] = []
    trees: List[Dict[str, Any]] = []
    labels: List[Dict[str, Any]] = []

    # Node-based labels and trees
    for n in nodes.values():
        lon_n = n.get("lon")
        lat_n = n.get("lat")
        if lon_n is None or lat_n is None:
            continue
        tags = n.get("tags") or {}

        if tags.get("natural") == "tree":
            trees.append(feature("Point", [lon_n, lat_n], {"osm_id": n["id"], "kind": "tree"}))

        name = tags.get("name")
        place = tags.get("place")
        amenity = tags.get("amenity")
        tourism = tags.get("tourism")
        shop = tags.get("shop")
        if name and (place or amenity or tourism or shop):
            if place in {"city", "town"}:
                pr = 12
            elif place in {"village", "suburb", "hamlet"}:
                pr = 10
            elif amenity or tourism:
                pr = 8
            else:
                pr = 6
            labels.append(
                feature(
                    "Point",
                    [lon_n, lat_n],
                    {
                        "osm_id": n["id"],
                        "name": name,
                        "kind": "poi" if (amenity or tourism or shop) else "place",
                        "class": place or amenity or tourism or shop,
                        "priority": pr,
                    },
                )
            )

    # Way-based roads/buildings/area labels
    for w in ways.values():
        tags = w.get("tags") or {}
        node_ids = w.get("nodes") or []
        pts: List[List[float]] = []
        for nid in node_ids:
            n = nodes.get(int(nid))
            if not n:
                continue
            lon_n = n.get("lon")
            lat_n = n.get("lat")
            if lon_n is None or lat_n is None:
                continue
            pts.append([float(lon_n), float(lat_n)])

        if len(pts) < 2:
            continue

        if "highway" in tags:
            roads.append(
                feature(
                    "LineString",
                    pts,
                    {
                        "osm_id": w["id"],
                        "highway": tags.get("highway"),
                        "name": tags.get("name"),
                    },
                )
            )

        if "building" in tags and len(pts) >= 4 and pts[0] == pts[-1]:
            buildings.append(
                feature(
                    "Polygon",
                    [pts],
                    {
                        "osm_id": w["id"],
                        "building": tags.get("building"),
                        "name": tags.get("name"),
                        "levels": tags.get("building:levels"),
                        "height": tags.get("height"),
                    },
                )
            )

        # Area label candidates for map-like labels
        area_kind = tags.get("landuse") or tags.get("natural")
        name = tags.get("name")
        if name and len(pts) >= 4 and pts[0] == pts[-1] and (area_kind or tags.get("amenity") or tags.get("tourism") or tags.get("shop")):
            centroid_lon, centroid_lat = polygon_centroid(pts)
            klass = area_kind or tags.get("amenity") or tags.get("tourism") or tags.get("shop")
            labels.append(
                feature(
                    "Point",
                    [centroid_lon, centroid_lat],
                    {
                        "osm_id": w["id"],
                        "name": name,
                        "kind": "poi" if (tags.get("amenity") or tags.get("tourism") or tags.get("shop")) else "area",
                        "class": klass,
                        "priority": 8 if (tags.get("amenity") or tags.get("tourism")) else 6 if tags.get("shop") else 5,
                    },
                )
            )

        # Derive vegetation points from vegetation polygons if explicit tree nodes are sparse
        veg_tag = tags.get("natural") in {"wood", "scrub"} or tags.get("landuse") in {"forest", "orchard"}
        if veg_tag and len(pts) >= 4 and pts[0] == pts[-1]:
            c_lon, c_lat = polygon_centroid(pts)
            trees.append(feature("Point", [c_lon, c_lat], {"osm_id": w["id"], "kind": "veg_centroid"}))

            min_lon, min_lat, max_lon, max_lat = polygon_bbox(pts)
            area_deg2 = max(1e-12, (max_lon - min_lon) * (max_lat - min_lat))
            n_extra = max(6, min(40, int(area_deg2 * 4_000_000)))
            rng = random.Random(int(w["id"]))
            created = 0
            tries = 0
            while created < n_extra and tries < n_extra * 12:
                tries += 1
                x = rng.uniform(min_lon, max_lon)
                y = rng.uniform(min_lat, max_lat)
                if point_in_polygon(x, y, pts):
                    trees.append(feature("Point", [x, y], {"osm_id": w["id"], "kind": "veg_sample"}))
                    created += 1

    # Deduplicate labels by name + rounded coords, keep highest priority
    dedup: Dict[str, Dict[str, Any]] = {}
    for f in labels:
        p = f["properties"]
        c = f["geometry"]["coordinates"]
        key = f'{p.get("name","")}::{round(c[0], 5)}::{round(c[1], 5)}'
        prev = dedup.get(key)
        if prev is None or int(p.get("priority", 0)) > int(prev["properties"].get("priority", 0)):
            dedup[key] = f
    labels = list(dedup.values())

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "roads.geojson").write_text(json.dumps(fc(roads), ensure_ascii=False), encoding="utf-8")
    (OUT_DIR / "buildings.geojson").write_text(json.dumps(fc(buildings), ensure_ascii=False), encoding="utf-8")
    (OUT_DIR / "trees.geojson").write_text(json.dumps(fc(trees), ensure_ascii=False), encoding="utf-8")
    (OUT_DIR / "labels.geojson").write_text(json.dumps(fc(labels), ensure_ascii=False), encoding="utf-8")

    summary = {
        "center": {"lon": lon, "lat": lat},
        "radius_m": radius_m,
        "counts": {
            "roads": len(roads),
            "buildings": len(buildings),
            "trees": len(trees),
            "labels": len(labels),
        },
    }
    (OUT_DIR / "osm_export_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
