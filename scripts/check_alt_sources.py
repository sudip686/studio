import numpy as np
from PIL import Image

def check(path):
    print(f"Checking {path}...")
    try:
        # Increase limit for large images
        Image.MAX_IMAGE_PIXELS = None
        img = Image.open(path)
        arr = np.array(img)
        print(f"  Shape: {arr.shape}")
        print(f"  Min: {arr.min()}, Max: {arr.max()}, Mean: {arr.mean()}")
    except Exception as e:
        print(f"  Error: {e}")

check("public/rgb_input_georef.tif")
check("public/texture_rgb_8192.png")
