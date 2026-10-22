"""Copy the unmodified MRE map figure and record reproducible provenance.

Usage: python scripts/derive-geology-story-assets.py "<MRE report auto folder>"
No crop, reprojection, recolouring or geological interpretation is performed.
"""
from pathlib import Path
import hashlib
import json
import os
import sys

source = os.path.abspath(sys.argv[1])
if os.name == 'nt' and not source.startswith('\\\\?\\'):
    source = '\\\\?\\' + source
figure = '5676ca897f6f7ba61c9612b12ca5e1e11c2e862d2b3b310b4fd29435b88f55c0.jpg'
data = (Path(source) / 'images' / figure).read_bytes()
root = Path(__file__).resolve().parents[1]
(root / 'public/presentation-assets/mre-regional-geology.jpg').write_bytes(data)
metadata = {
    'asset': '/presentation-assets/mre-regional-geology.jpg',
    'report': '0424046 Tanga Graphite Mineral Resource Estimate - 19 December 2025',
    'figure': '2.1', 'pdfPage': 18, 'reportPage': 8,
    'originalImage': figure, 'sha256': hashlib.sha256(data).hexdigest(),
    'processing': 'Unmodified byte copy of original extracted figure; includes legend',
    'registration': 'Not georeferenced; regional context only',
    'projectMap': {'asset': '/geology_map.jpg', 'basis': 'Existing project asset; image registration and date not independently verified'},
    'modelPlan': 'Orthographic projection of existing registered geological volumes; no remeshing or extrusion',
}
(root / 'public/generated/geology-map-source.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf8')
print(f'Copied Figure 2.1: {len(data):,} bytes; SHA-256 {metadata["sha256"]}')
