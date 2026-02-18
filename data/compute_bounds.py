from osgeo import gdal, osr
import json

"""
Compute the AOI center from the source DEM and produce:
 - bbox_21037: a 4 km buffer box around center in EPSG:21037 (minx, miny, maxx, maxy)
 - bounds_wgs84: the same box transformed to EPSG:4326 (minLon, minLat, maxLon, maxLat)

Run:
  python data/compute_bounds.py > data/bounds.json

Edit the GDAL commands and the MapLibre HTML to paste these bounds where indicated.
"""

SRC = "data/dem_21037.tif"

ds = gdal.Open(SRC)
if ds is None:
    raise SystemExit(f"Could not open {SRC}. Ensure you've run gdal_translate on public/Topography.asc to create it.")

gt = ds.GetGeoTransform()
cols = ds.RasterXSize
rows = ds.RasterYSize

# Pixel size (affine transform)
px_w = gt[1]
px_h = gt[5]  # typically negative

minx = gt[0]
maxy = gt[3]

# AOI center in source CRS (EPSG:21037)
center_x = minx + cols * px_w / 2.0
center_y = maxy + rows * px_h / 2.0

# 4 km in all directions
half = 4000.0
xmin = center_x - half
ymin = center_y - half
xmax = center_x + half
ymax = center_y + half

# Transform box to WGS84 for MapLibre bounds
s21037 = osr.SpatialReference(); s21037.ImportFromEPSG(21037)
wgs84 = osr.SpatialReference(); wgs84.ImportFromEPSG(4326)
ct = osr.CoordinateTransformation(s21037, wgs84)

(lon_min, lat_min, _) = ct.TransformPoint(xmin, ymin)
(lon_max, lat_max, _) = ct.TransformPoint(xmax, ymax)

bounds_wgs84 = [min(lon_min, lon_max), min(lat_min, lat_max), max(lon_min, lon_max), max(lat_min, lat_max)]

out = {
    "center_21037": [center_x, center_y],
    "bbox_21037": [xmin, ymin, xmax, ymax],
    "bounds_wgs84": bounds_wgs84,
}

print(json.dumps(out, indent=2))
