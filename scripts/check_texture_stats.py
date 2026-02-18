import numpy as np
from PIL import Image

try:
    img = Image.open("public/terrain_texture_8k.jpg")
    arr = np.array(img)
    print(f"Shape: {arr.shape}")
    print(f"Min: {arr.min()}, Max: {arr.max()}, Mean: {arr.mean()}")
    print(f"Mean R: {arr[:,:,0].mean()}")
    print(f"Mean G: {arr[:,:,1].mean()}")
    print(f"Mean B: {arr[:,:,2].mean()}")
except Exception as e:
    print(f"Error: {e}")
