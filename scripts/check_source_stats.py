import numpy as np
from PIL import Image
import sys

def check(path):
    print(f"Checking {path}...")
    try:
        img = Image.open(path)
        arr = np.array(img)
        print(f"  Shape: {arr.shape}")
        print(f"  Min: {arr.min()}, Max: {arr.max()}, Mean: {arr.mean()}")
    except Exception as e:
        print(f"  Error: {e}")

check("public/rgb_match_dem.tif")
check("public/dem_hillshade_4097.png")
