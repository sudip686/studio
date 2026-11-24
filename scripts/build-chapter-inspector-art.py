"""Build the small source-derived graphics used by the desktop chapter inspectors."""
from pathlib import Path
from array import array
import json
from collections import defaultdict

root = Path(__file__).resolve().parents[1]
public = root / "public"
out = public / "presentation-assets"
meta = json.loads((public / "terrain_hires_meta.json").read_text())
grid = array("f")
grid.frombytes((public / "survey_height_hires.bin").read_bytes())
width = meta["width"]
row = meta["height"] // 2
samples = grid[row * width : (row + 1) * width]
# Longest continuous surveyed part of the central east-west transect.
runs = []
for i, value in enumerate(samples):
    if value <= -32000:
        continue
    if not runs or runs[-1][-1] != i - 1:
        runs.append([])
    runs[-1].append(i)
indices = max(runs, key=len)
lo, hi = min(samples[i] for i in indices), max(samples[i] for i in indices)
spacing = meta["survey_surface"]["output_grid"]["cell_size_m"]
north = meta["bounds_utm"]["maxY"] - (row + .5) * spacing[1]
points = " ".join(f"{(i-indices[0])/(len(indices)-1)*240:.1f},{64-(samples[i]-lo)/(hi-lo)*58:.1f}" for i in indices)
profile = dict(points=points, minimum=round(lo), maximum=round(hi), northing=round(north), length=round((len(indices)-1)*spacing[0]))
(root / "src/data/tanga-survey-transect.json").write_text(json.dumps(profile) + "\n")

pits = json.loads((public / "generated/orewaste-reference.json").read_text())["pitSurfaces"]["components"]
maxw, maxh = max(p["width"] for p in pits), max(p["height"] for p in pits)
maxbench = max(max(max(col) for col in pit["benchIndex"]) for pit in pits)
for name, pit in zip(["north","south"], pits, strict=True):
    # North up; use a common pixel-per-metre scale and bench-index palette.
    paths = defaultdict(list)
    for x, col in enumerate(pit["benchIndex"]):
        for y, bench in enumerate(col):
            if bench < 0 or not pit["mask"][x][y]:
                continue
            px = x + (maxw - pit["width"]) // 2
            py = maxh - 1 - y - (maxh - pit["height"]) // 2
            paths[bench].append(f"M{px} {py}h1v1h-1z")
    elements=[]
    for bench, path in paths.items():
        fraction = bench / max(1, maxbench)
        color = "".join(f"{round(a+(b-a)*fraction):02x}" for a,b in zip((211,193,151),(53,88,89)))
        elements.append(f'<path fill="#{color}" d="{"".join(path)}"/>')
    (out / f"rf1-{name}-benches.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {maxw} {maxh}" shape-rendering="crispEdges">{"".join(elements)}</svg>')
