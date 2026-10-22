"""Digitize coloured rock areas from the existing gridded project map.

Requires Pillow, numpy and opencv-python-headless. This creates derived vectors,
not original survey shapefiles. Printed grid calibration is approximate.
Soil cover, text, drainage, roads and the map furniture remain transparent.
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
for name, color, rgb, tolerance in units:
    distance = np.linalg.norm(pixels.astype(float)-np.array(rgb), axis=2)
    mask = ((distance < tolerance) & (coverage > 0)).astype(np.uint8)*255
    if name == 'Graphitic schist':
        mask[(pixels[:,:,2].astype(int)-pixels[:,:,1].astype(int)) < 3] = 0
    # Bridge fine printed contour lines without joining unrelated rock areas.
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3,3), np.uint8))
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    polygons = []
    if hierarchy is None:
        continue
    def ring(contour):
        points = cv2.approxPolyDP(contour, 1.2, True).reshape(-1,2)
        coordinates = [ground(x,y) for x,y in points]
        return coordinates + coordinates[:1]
    for index, contour in enumerate(contours):
        if hierarchy[0,index,3] != -1 or cv2.contourArea(contour) < 18:
            continue
        outer = ring(contour)
        if len(outer) < 4:
            continue
        rings = [outer]
        child = hierarchy[0,index,2]
        while child != -1:
            if cv2.contourArea(contours[child]) >= 18:
                hole = ring(contours[child])
                if len(hole) >= 4:
                    rings.append(hole)
            child = hierarchy[0,child,0]
        polygons.append(rings)
    features.append({'type':'Feature','properties':{'unit':name,'color':color,
        'basis':'Digitized project-map colour; approximate printed-grid registration'},
        'geometry':{'type':'MultiPolygon','coordinates':polygons}})

result = {'type':'FeatureCollection','crs':{'type':'name','properties':{'name':'EPSG:32737'}},
    'provenance':{'source':'/geology_map.jpg','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'method':'RGB masks, 3px closing, 1.2px contour simplification; printed UTM grid calibration',
        'gridTiePoints':[[174,328,474000,9472000],[477,631,476000,9470000],[779,934,478000,9468000]],
        'limitation':'Derived vectors, not original shapefiles. Map date and original CRS datum not independently verified. Approximate registration; not survey contacts. Soil cover omitted. No inferred grab-sample positions.'},
    'features':features}
target = root/'public/generated/geology-surface-polygons.json'
target.write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf8')
print([(f['properties']['unit'],len(f['geometry']['coordinates'])) for f in features])
print('Wrote',target.stat().st_size,'bytes')
