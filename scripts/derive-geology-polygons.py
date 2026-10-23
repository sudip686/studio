"""Digitize coloured rock areas from the existing gridded project map.

Requires Pillow, numpy and opencv-python-headless. This creates derived vectors,
not original survey shapefiles. Printed grid calibration is approximate.
Soil cover is traced as its own approximate base class. Text, drainage, roads
and map furniture remain outside the geological colour masks.
"""
from pathlib import Path
import hashlib
import json
import os
import sys
sys.path.insert(0, os.path.join(os.environ.get('TEMP', ''), 'tanga-geo-python'))
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'public/geology_map.jpg'
pixels = np.array(Image.open(source).convert('RGB'))
# Grid intersections read from the original 1240 x 1755 sheet:
# E474000 x174, E476000 x477, E478000 x779;
# N9472000 y328, N9470000 y631, N9468000 y934.
def ground(x, y):
    return [round(474000 + (float(x)-174)*2000/302.5, 2),
            round(9472000 - (float(y)-328)*2000/303, 2)]

coverage = np.zeros(pixels.shape[:2], np.uint8)
cv2.fillPoly(coverage, [np.array([(585,67),(934,77),(620,972),(594,974),(617,993),(426,1689),(336,1689),(333,1289),(179,1290),(398,354),(398,324),(509,324)])], 255)
units = [
    ('Graphitic schist', '#d8d8e1', (216,216,225), 31),
    ('Khondalite', '#a188da', (161,136,218), 39),
    ('Kyanite sillimanite schist', '#0755f5', (7,85,245), 58),
    ('Mafic granulite', '#b065ac', (176,101,172), 39),
    ('Quartzofeldspathic rock', '#f169e1', (241,105,225), 43),
    ('Quartzite', '#f5d333', (245,211,51), 42),
    ('Crystalline limestone', '#41a9ec', (65,169,236), 47),
]
features = []
def mapped_polygons(mask, min_area=80):
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    polygons = []
    if hierarchy is None:
        return polygons
    def geo_ring(contour):
        points = cv2.approxPolyDP(contour, 1.2, True).reshape(-1,2)
        coordinates = [ground(x,y) for x,y in points]
        return coordinates + coordinates[:1]
    for index, contour in enumerate(contours):
        if hierarchy[0,index,3] != -1 or cv2.contourArea(contour) < min_area:
            continue
        outer = geo_ring(contour)
        if len(outer) < 4:
            continue
        rings = [outer]
        child = hierarchy[0,index,2]
        while child != -1:
            if cv2.contourArea(contours[child]) >= min_area:
                hole = geo_ring(contours[child])
                if len(hole) >= 4:
                    rings.append(hole)
            child = hierarchy[0,child,0]
        polygons.append(rings)
    return polygons

# Trace the pale soil-cover colour printed on the source map. Unlike the rock
# masks, this is a base cover category; raster colour segmentation remains an
# approximate interpretation rather than a surveyed polygon shapefile.
soil_distance = np.linalg.norm(pixels.astype(float)-np.array((244,229,206)), axis=2)
soil_mask = ((soil_distance < 38) & (coverage > 0)).astype(np.uint8)*255
soil_mask = cv2.morphologyEx(soil_mask, cv2.MORPH_CLOSE, np.ones((5,5), np.uint8))
soil_count, soil_labels, soil_stats, _ = cv2.connectedComponentsWithStats(soil_mask, 8)
for label in range(1,soil_count):
    if soil_stats[label,cv2.CC_STAT_AREA] < 80:
        soil_mask[soil_labels == label] = 0
soil_polygons = mapped_polygons(soil_mask, 80)
if soil_polygons:
    features.append({'type':'Feature','properties':{'unit':'Soil cover','color':'#f4e5cc','opacity':0.68,
        'basis':'Colour-traced from the source-map soil-cover category; approximate raster digitization, not a surveyed contact'},
        'geometry':{'type':'MultiPolygon','coordinates':soil_polygons}})
for name, color, rgb, tolerance in units:
    distance = np.linalg.norm(pixels.astype(float)-np.array(rgb), axis=2)
    mask = ((distance < tolerance) & (coverage > 0)).astype(np.uint8)*255
    if name == 'Graphitic schist':
        mask[(pixels[:,:,2].astype(int)-pixels[:,:,1].astype(int)) < 3] = 0
    # Graphitic schist is the palest class and the source sheet's dark contacts,
    # labels and linework repeatedly cut its fill into raster slivers. Close
    # only narrow gaps (5 px, about 33 m at the printed-grid scale) in this
    # class; preserve larger mapped gaps and keep the original RGB threshold.
    # This is scan cleanup, not a geological reinterpretation or new contact.
    close_size = 5 if name == 'Graphitic schist' else 3
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((close_size,close_size), np.uint8))
    def ring(contour):
        points = cv2.approxPolyDP(contour, 1.2, True).reshape(-1,2)
        coordinates = [ground(x,y) for x,y in points]
        return coordinates + coordinates[:1]
    polygons = mapped_polygons(mask, 18)
    features.append({'type':'Feature','properties':{'unit':name,'color':color,
        'basis':'Digitized project-map colour; approximate printed-grid registration'},
        'geometry':{'type':'MultiPolygon','coordinates':polygons}})

result = {'type':'FeatureCollection','crs':{'type':'name','properties':{'name':'EPSG:32737'}},
    'provenance':{'source':'/geology_map.jpg','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
    'method':'RGB masks, 5px closing for graphitic schist and 3px for other units, 1.2px contour simplification; printed UTM grid calibration',
        'gridTiePoints':[[174,328,474000,9472000],[477,631,476000,9470000],[779,934,478000,9468000]],
        'limitation':'Derived vectors, not original shapefiles. Map date and original CRS datum not independently verified. Approximate registration; not survey contacts. Soil cover is colour-traced from the raster. No inferred grab-sample positions.'},
    'features':features}
target = root/'public/generated/geology-surface-polygons.json'
target.write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf8')
print([(f['properties']['unit'],len(f['geometry']['coordinates'])) for f in features])
print('Wrote',target.stat().st_size,'bytes')
