const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;
const UTM_K0 = 0.9996;
const UTM_CENTRAL_MERIDIAN = 39 * Math.PI / 180;
const UTM_ECCENTRICITY_SQUARED = WGS84_F * (2 - WGS84_F);
const UTM_SECOND_ECCENTRICITY_SQUARED = UTM_ECCENTRICITY_SQUARED / (1 - UTM_ECCENTRICITY_SQUARED);

function projectToUtm37South(longitude, latitude) {
  const latitudeRadians = latitude * Math.PI / 180;
  const longitudeRadians = longitude * Math.PI / 180;
  const sinLatitude = Math.sin(latitudeRadians);
  const cosLatitude = Math.cos(latitudeRadians);
  const tanLatitude = Math.tan(latitudeRadians);
  const n = WGS84_A / Math.sqrt(1 - UTM_ECCENTRICITY_SQUARED * sinLatitude * sinLatitude);
  const t = tanLatitude * tanLatitude;
  const c = UTM_SECOND_ECCENTRICITY_SQUARED * cosLatitude * cosLatitude;
  const a = cosLatitude * (longitudeRadians - UTM_CENTRAL_MERIDIAN);
  const a2 = a * a;
  const a3 = a2 * a;
  const a4 = a2 * a2;
  const a5 = a4 * a;
  const a6 = a3 * a3;
  const e2 = UTM_ECCENTRICITY_SQUARED;
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const meridionalArc = WGS84_A * (
    (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * latitudeRadians
      - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * latitudeRadians)
      + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * latitudeRadians)
      - (35 * e6 / 3072) * Math.sin(6 * latitudeRadians)
  );
  const easting = 500000 + UTM_K0 * n * (
    a + (1 - t + c) * a3 / 6 + (5 - 18 * t + t * t + 72 * c - 58 * UTM_SECOND_ECCENTRICITY_SQUARED) * a5 / 120
  );
  const northing = 10000000 + UTM_K0 * (
    meridionalArc + n * tanLatitude * (
      a2 / 2 + (5 - t + 9 * c + 4 * c * c) * a4 / 24 + (61 - 58 * t + t * t + 600 * c - 330 * UTM_SECOND_ECCENTRICITY_SQUARED) * a6 / 720
    )
  );
  return [easting, northing];
}

self.addEventListener('message', (event) => {
  try {
    const {buffer, centerEasting, centerNorthing, localVerticalDatum} = event.data;
    const parseStarted = performance.now();
    const payload = JSON.parse(new TextDecoder().decode(buffer));
    const parseMs = performance.now() - parseStarted;
    const features = Array.isArray(payload.features) ? payload.features : [];
    const blocks = [];
    const projectionStarted = performance.now();

    for (const feature of features) {
      const coordinates = feature.geometry && feature.geometry.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 3) continue;
      const longitude = Number(coordinates[0]);
      const latitude = Number(coordinates[1]);
      const elevation = Number(coordinates[2] ?? 0);
      const properties = feature.properties ?? {};
      const carbon = Number(properties['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'] ?? 0);
      const dx = Number(properties.dX ?? 25);
      const dy = Number(properties.dY ?? 25);
      const dz = Number(properties.dZ ?? 10);
      if (!(carbon > 0) || !Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(elevation) || !(dx > 0) || !(dy > 0) || !(dz > 0)) continue;

      const [easting, northing] = projectToUtm37South(longitude, latitude);
      const x = easting - centerEasting;
      const y = elevation - localVerticalDatum;
      const z = -(northing - centerNorthing);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      blocks.push({
        x, y, z, dx, dy, dz, carbon,
        classification: String(properties.RescCalc ?? properties.classification ?? 'Unknown'),
      });
    }

    self.postMessage({blocks, featureCount: features.length, parseMs, projectionMs: performance.now() - projectionStarted});
  } catch (error) {
    self.postMessage({error: error instanceof Error ? error.message : 'Unable to parse the resource block model.'});
  }
});
