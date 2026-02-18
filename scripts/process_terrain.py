import os
import json
import subprocess
import numpy as np
from PIL import Image
import sys
import re

# Configuration
DEM_PATH = "public/dem_utm.tif"
RGB_PATH = "public/texture_rgb_8192.png" # Updated to use the valid texture
ASSAY_PATH = "public/assay_data.geojson"
LITHOLOGY_PATH = "public/lithology_data.geojson"

OUTPUT_DIR = "public"
HEIGHT_BIN = os.path.join(OUTPUT_DIR, "height.bin")
TEXTURE_OUT = os.path.join(OUTPUT_DIR, "terrain_texture_8k.jpg")
META_OUT = os.path.join(OUTPUT_DIR, "terrain_meta.json")
DRILLHOLES_OUT = os.path.join(OUTPUT_DIR, "drillholes_utm.json")

def run_command(cmd, desc):
    print(f"-> {desc}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error in {desc}: {e.stderr}")
        sys.exit(1)

def get_gdal_info(path):
    out = run_command(f"gdalinfo -json {path}", f"Getting info for {path}")
    return json.loads(out)

def main():
    print("Starting Terrain Processing...")
    
    # 1. Analyze DEM
    dem_info = get_gdal_info(DEM_PATH)
    size = dem_info['size']
    width, height = size[0], size[1]
    
    geo_transform = dem_info['geoTransform']
    origin_x = geo_transform[0]
    pixel_w = geo_transform[1]
    origin_y = geo_transform[3]
    pixel_h = geo_transform[5] # Usually negative
    
    min_x = origin_x
    max_x = origin_x + (width * pixel_w)
    max_y = origin_y
    min_y = origin_y + (height * pixel_h) # pixel_h is negative
    
    print(f"DEM Bounds: X[{min_x}, {max_x}], Y[{min_y}, {max_y}]")
    print(f"DEM Size: {width} x {height}")
    
    # 2. Export Height to Binary (Float32)
    # Using ENVI format creates a raw binary file + header. We just want the binary.
    temp_bin = "temp_height.bin"
    # ENVI format naming: if output is temp_height.bin, it creates temp_height.bin (data) and temp_height.bin.hdr
    run_command(f"gdal_translate -of ENVI -ot Float32 {DEM_PATH} {temp_bin}", "Exporting Height Binary")
    
    # Read binary to get min/max z
    data = np.fromfile(temp_bin, dtype=np.float32)
    
    # Handle NoData (-32767)
    # Find valid data (assuming valid > -10000, or explicitly check -32767)
    valid_mask = data > -10000
    if np.any(valid_mask):
        min_z = float(np.min(data[valid_mask]))
        max_z = float(np.max(data[valid_mask]))
    else:
        min_z = 0.0
        max_z = 100.0
        
    print(f"Elevation Range (Valid): {min_z} to {max_z}")
    
    # Replace NoData with min_z (or slightly lower to clamp edges)
    data[~valid_mask] = min_z
    
    # Save corrected binary
    data.tofile(HEIGHT_BIN)
    
    # Clean up temp ENVI files
    if os.path.exists(temp_bin):
        os.remove(temp_bin)
        
    # 3. Process Texture
    # Resample RGB to match DEM exactly. 
    # Since RGB_PATH (png) has no georef, gdalwarp might fail unless we force it.
    # However, if we treat it as "raw", we can just resize it using gdal_translate first or just assume it matches bounds?
    # Better: Use gdal_translate to assign the DEM bounds to the PNG, then warp?
    # Simplest: gdalwarp with -te (target extent) and -s_srs EPSG:32737 (assume same CRS) usually works if we ignore source errors, 
    # but for a raw PNG, gdalwarp might not know where to place it.
    # Let's use gdal_translate to assign the bounds (upl-left and lwr-right) first.
    
    # Assign geo-transform to the PNG temporarily to match DEM bounds
    temp_rgb_georef = "temp_rgb_georef.tif"
    # -a_ullr <ulx> <uly> <lrx> <lry>
    run_command(f"gdal_translate -of GTiff -a_srs EPSG:32737 -a_ullr {min_x} {max_y} {max_x} {min_y} {RGB_PATH} {temp_rgb_georef}", "Georeferencing RGB")

    temp_rgb = "temp_rgb_matched.tif"
    run_command(f"gdalwarp -te {min_x} {min_y} {max_x} {max_y} -ts {width} {height} -r cubic {temp_rgb_georef} {temp_rgb}", "Resampling RGB")
    
    # Generate Hillshade
    temp_hill = "temp_hillshade.tif"
    # -z 2.0 to exaggerate slightly? User suggested baking hillshade.
    run_command(f"gdaldem hillshade {DEM_PATH} {temp_hill} -z 1.5 -s 1.0 -az 315 -alt 45", "Generating Hillshade")
    
    # Blend in Python
    print("-> Blending Texture and Hillshade...")
    # Load RGB
    run_command(f"gdal_translate -of PNG {temp_rgb} temp_rgb.png", "Converting RGB to PNG")
    run_command(f"gdal_translate -of PNG {temp_hill} temp_hill.png", "Converting Hillshade to PNG")
    
    rgb_img = Image.open("temp_rgb.png").convert("RGB")
    hill_img = Image.open("temp_hill.png").convert("L") # Grayscale
    
    rgb_arr = np.array(rgb_img, dtype=np.float32) / 255.0
    hill_arr = np.array(hill_img, dtype=np.float32) / 255.0
    
    # Contrast stretch RGB (simple s-curve or gamma)
    gamma = 0.8 # Brighten
    rgb_arr = np.power(rgb_arr, gamma)
    
    # Blend
    # Multiply: RGB * Hillshade.
    strength = 0.4 # 40% hillshade influence (less dark)
    hill_factor = hill_arr * strength + (1.0 - strength)
    
    # Expand dims for broadcasting
    hill_factor = hill_factor[:, :, np.newaxis]
    
    final_arr = rgb_arr * hill_factor
    final_arr = np.clip(final_arr, 0, 1) * 255.0
    final_img = Image.fromarray(final_arr.astype(np.uint8))
    
    final_img.save(TEXTURE_OUT, quality=90)
    print(f"Saved {TEXTURE_OUT}")
    
    # Cleanup temp images
    for f in ["temp_rgb_georef.tif", "temp_rgb_matched.tif", "temp_rgb.png", "temp_hillshade.tif", "temp_hill.png"]:
        if os.path.exists(f):
            os.remove(f)

    # 4. Process Drillholes
    # Convert both GeoJSONs to EPSG:32737
    # We merge them into one JSON or keep separate? User code handles 'drillholeData' with lithology/assay keys.
    # Let's keep the structure but convert coords.
    
    drillhole_data = {"lithology": [], "assay": []}
    
    for key, path in [("lithology", LITHOLOGY_PATH), ("assay", ASSAY_PATH)]:
        if not os.path.exists(path):
            print(f"Warning: {path} not found.")
            continue
            
        temp_json = f"temp_{key}.json"
        # ogr2ogr to EPSG:32737
        run_command(f"ogr2ogr -f GeoJSON -t_srs EPSG:32737 {temp_json} {path}", f"Reprojecting {key}")
        
        with open(temp_json, 'r') as f:
            data = json.load(f)
            # data is a FeatureCollection
            if "features" in data:
                drillhole_data[key] = data["features"]
        
        os.remove(temp_json)

    with open(DRILLHOLES_OUT, 'w') as f:
        json.dump(drillhole_data, f)
    print(f"Saved {DRILLHOLES_OUT}")

    # 5. Save Metadata
    meta = {
        "bounds_utm": {
            "minX": min_x,
            "maxX": max_x,
            "minY": min_y,
            "maxY": max_y
        },
        "width": width,
        "height": height,
        "elevation_m": {
            "min": min_z,
            "max": max_z
        },
        "crs_epsg": 32737,
        "rgb_texture": os.path.basename(TEXTURE_OUT)
    }
    
    with open(META_OUT, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Saved {META_OUT}")
    
    print("Processing Complete.")

if __name__ == "__main__":
    main()
