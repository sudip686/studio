
def get_min_elevation():
    filename = 'public/Topography.asc'
    min_elev = float('inf')
    nodata_value = None

    with open(filename, 'r') as f:
        # Read header
        for _ in range(6):
            line = f.readline().split()
            if not line: break
            key = line[0].lower()
            val = line[1]
            if key == 'nodata_value':
                nodata_value = float(val)

        # Process data
        for line in f:
            values = line.strip().split()
            for v_str in values:
                try:
                    v = float(v_str)
                    if nodata_value is not None and v == nodata_value:
                        continue
                    if v < min_elev:
                        min_elev = v
                except ValueError:
                    continue

    print(f"Minimum Elevation: {min_elev}")

if __name__ == "__main__":
    get_min_elevation()
