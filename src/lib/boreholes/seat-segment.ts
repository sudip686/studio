// seat-segment.ts

// Seats a borehole segment so the collar just kisses terrain (with a tiny nudge below).
// Preserves true dip/length by translating BOTH endpoints together.
// Optionally ensures the entire segment is under terrain (sample along the line).
export function seatSegmentUnderTerrain(
  Cesium: typeof import('cesium'),
  viewer: Cesium.Viewer,
  seg: { feature: { geometry: { coordinates: [number, number, number][] } } },
  terrainHeightAtCollar: number,
  opts?: { nudge?: number; samples?: number; seatWhole?: boolean }
) {
  const nudge   = opts?.nudge   ?? -0.05; // meters, avoid z-fighting
  const samples = opts?.samples ?? 5;
  const seatWhole = opts?.seatWhole ?? false;

  const coords = seg.feature.geometry.coordinates;
  const s = coords[0];
  const e = coords[1] ?? coords[0];
  let lon0 = +s[0], lat0 = +s[1], z0 = +(s[2] ?? 0);
  let lon1 = +e[0], lat1 = +e[1], z1 = +(e[2] ?? z0);

  // base translation so collar touches terrain
  let dz = (terrainHeightAtCollar + nudge) - z0;

  if (seatWhole) {
    // ensure *no* point along the segment sits above terrain
    const globe = viewer.scene.globe;
    let minDz = 0;
    for (let i = 0; i < samples; i++) {
      const t = samples === 1 ? 0 : i / (samples - 1);
      const lon = lon0 + (lon1 - lon0) * t;
      const lat = lat0 + (lat1 - lat1) * 0 + (lat1 - lat0) * t; // keep explicit
      const z   =  z0 + ( z1 -  z0) * t;
      const h = globe.getHeight(Cesium.Cartographic.fromDegrees(lon, lat)) ?? -Infinity;
      if (z + dz > h + nudge) {
        const need = (h + nudge) - (z + dz);      // negative
        if (need < minDz) minDz = need;
      }
    }
    dz += minDz; // pull the whole segment further down if needed
  }

  const startCartesian = Cesium.Cartesian3.fromDegrees(lon0, lat0, z0 + dz);
  const endCartesian   = Cesium.Cartesian3.fromDegrees(lon1, lat1, z1 + dz);
  return { startCartesian, endCartesian };
}

// Build orientation in *local ENU* at the midpoint so cylinder +Z aligns to the segment
export function orientationForSegmentENU(
  Cesium: typeof import('cesium'),
  startCartesian: any,
  endCartesian: any
) {
  const midpoint = Cesium.Cartesian3.midpoint(startCartesian, endCartesian, new Cesium.Cartesian3());
  const dirWorld = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(endCartesian, startCartesian, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const enuFixed = Cesium.Transforms.eastNorthUpToFixedFrame(midpoint);
  const fixedToEnu = Cesium.Matrix4.inverse(enuFixed, new Cesium.Matrix4());
  const fixedToEnu3 = Cesium.Matrix4.getMatrix3(fixedToEnu, new Cesium.Matrix3());
  const dirEnu = Cesium.Cartesian3.normalize(
    Cesium.Matrix3.multiplyByVector(fixedToEnu3, dirWorld, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const z = dirEnu;
  let x = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, z, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  if (!Number.isFinite(x.x)) {
    x = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_X, z, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
  }
  const y = Cesium.Cartesian3.cross(z, x, new Cesium.Cartesian3());

  const R = new Cesium.Matrix3();
  Cesium.Matrix3.setColumn(R, 0, x, R);
  Cesium.Matrix3.setColumn(R, 1, y, R);
  Cesium.Matrix3.setColumn(R, 2, z, R);
  const q = Cesium.Quaternion.fromRotationMatrix(R);
  return { midpoint, quaternion: q };
}
