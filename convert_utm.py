
import math

def utm_to_latlon(easting, northing, zone_number, zone_letter):
    k0 = 0.9996
    a = 6378137
    f = 1 / 298.257223563
    e = 0.081819191
    e1sq = 0.006739497
    
    x = easting - 500000
    y = northing
    
    is_south = True
    if is_south:
        y -= 10000000
        
    m = y / k0
    mu = m / (a * (1 - e**2 / 4 - 3 * e**4 / 64 - 5 * e**6 / 256))
    
    e1 = (1 - (1 - e**2)**0.5) / (1 + (1 - e**2)**0.5)
    
    j1 = (3 * e1 / 2 - 27 * e1**3 / 32)
    j2 = (21 * e1**2 / 16 - 55 * e1**4 / 32)
    j3 = (151 * e1**3 / 96)
    j4 = (1097 * e1**4 / 512)
    
    fp = mu + j1 * math.sin(2 * mu) + j2 * math.sin(4 * mu) + j3 * math.sin(6 * mu) + j4 * math.sin(8 * mu)
    
    e2 = (e * a / (1 - f))**2
    c1 = e1sq * math.cos(fp)**2
    t1 = math.tan(fp)**2
    r1 = a * (1 - e**2) / (1 - e**2 * math.sin(fp)**2)**1.5
    n1 = a / (1 - e**2 * math.sin(fp)**2)**0.5
    d = x / (n1 * k0)
    
    q1 = n1 * math.tan(fp) / r1
    q2 = d**2 / 2
    q3 = (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * e1sq) * d**4 / 24
    q4 = (61 + 90 * t1 + 298 * c1 + 45 * t1**2 - 252 * e1sq - 3 * c1**2) * d**6 / 720
    
    lat = fp - q1 * (q2 - q3 + q4)
    
    q5 = d
    q6 = (1 + 2 * t1 + c1) * d**3 / 6
    q7 = (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * e1sq + 24 * t1**2) * d**5 / 120
    
    lon = (q5 - q6 + q7) / math.cos(fp)
    lon = (lon * 180 / math.pi) + (zone_number - 1) * 6 - 180 + 3
    lat = lat * 180 / math.pi
    
    return lat, lon

lat, lon = utm_to_latlon(476071, 9468195, 37, 'S')
print(f"Lat: {lat}, Lon: {lon}")
