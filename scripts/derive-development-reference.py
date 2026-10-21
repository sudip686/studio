"""Trace the PaulSam June 2023 map grid. No survey coordinates are inferred."""
import json
import math
import hashlib
from pathlib import Path

# Figure 3.3 (PDF page 33), original extracted image: 1301 x 1289 pixels.
# Grid intersections read from that image, EPSG:32737. Round to 25 m to avoid
# presenting digitised image locations with misleading coordinate precision.
def utm(pixel):
    x, y = pixel
    return [round((475000 + (x - 261) * 5000 / (903 - 261)) / 25) * 25,
            round((9470000 - (y - 508) * 5000 / (993 - 508)) / 25) * 25]

sites = [
    dict(id=1, feedPixel=[626, 685], dischargePixel=[795, 752], reportedLengthM=1570, reportedInclinationDeg=30),
    dict(id=2, feedPixel=[438, 906], dischargePixel=[574, 1120], reportedLengthM=2150, reportedInclinationDeg=24),
    dict(id=3, feedPixel=[729, 253], dischargePixel=[909, 195], reportedLengthM=1490, reportedInclinationDeg=19),
]
for site in sites:
    site['feedUtm'] = utm(site['feedPixel'])
    site['dischargeUtm'] = utm(site['dischargePixel'])
    site['tracedStraightLineM'] = round(math.dist(site['feedUtm'], site['dischargeUtm']))
reference = dict(
    source='PaulSam Geo-Engineering, June 2023',
    sourceImageSha256=hashlib.sha256(Path('public/presentation-assets/paulsam-conveyor-sites.jpg').read_bytes()).hexdigest(),
    locator='Figure 3.3 / PDF p.33; Tables 3.2, 3.3 and 5.5',
    crs='EPSG:32737',
    registration='Approximate image-grid tracing; not surveyed facility coordinates',
    calibration=dict(imageSize=[1301,1289],eastingTicks=[[261,475000],[903,480000]],northingTicks=[[508,9470000],[993,9465000]],roundingM=25),
    selectedSite=2,
    selectionBasis='Section 5.3.4 uses site 2 for its planning cost assumption; not a final site decision',
    sites=sites,
    reportAllowances=dict(feedPointAreaM2=15000,feedPointBuiltAreaM2=1500,processingLandDimensionsM=[250,250],processingLevelledAreaM2=20000,processingStorageOfficesM2=7500,stuffingSiteAreaM2=50000),
    limits=['Facility footprints, equipment sizes and service locations are illustrative.',
            'Image line lengths do not reproduce reported alignment estimates; candidate 2 traces approximately 2.45 km versus 2.15 km in the table. Reconcile before engineering.',
            'No mine-to-feed road, tailings storage design, land rights or utility connections are established.',
            'The report flags forest-reserve overlap; original boundaries and permissions require verification.'],
)
target=Path('public/generated/paulsam-development-reference.json')
target.write_text(json.dumps(reference,indent=2)+'\n',encoding='utf8')
print(target)
