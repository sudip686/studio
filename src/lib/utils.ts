import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Process an array in chunks to avoid blocking the main thread
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => Promise<R | null>,
  options: { chunkSize?: number } = {}
): Promise<R[]> {
  const { chunkSize = 10 } = options;
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(processor);

    // Wait for this chunk to complete before starting the next
    const chunkResults = await Promise.all(chunkPromises);
    for (const result of chunkResults) {
      if (result !== null) {
        results.push(result);
      }
    }
  }

  return results;
}

// Expects coords in [lon, lat, z] order
export function seatSegment(
  Cesium: typeof import('cesium'),
  viewer: Cesium.Viewer,
  startLLZ: [number, number, number],   // [lon, lat, z]
  endLLZ:   [number, number, number],   // [lon, lat, z]
  mode: "translate" | "stretch" = "translate",
  nudge: number = -0.05,
  ensureWholeUnder: boolean = true,
  samples: number = 5
) {
  const globe = viewer.scene.globe;

  const [lon0, lat0, z0_raw] = startLLZ;
  const [lon1, lat1, z1_raw = z0_raw] = endLLZ ?? startLLZ;

  const hTop =
    globe.getHeight(Cesium.Cartographic.fromDegrees(lon0, lat0)) ?? z0_raw;

  let dz = Math.max(0, z0_raw - hTop) + (-nudge);

  if (ensureWholeUnder) {
    let mostNeeded = 0;
    for (let i = 0; i < samples; i++) {
      const t = samples === 1 ? 0 : i / (samples - 1);
      const lat = lat0 + (lat1 - lat0) * t;
      const lon = lon0 + (lon1 - lon0) * t;
      const z   =  z0_raw + (z1_raw - z0_raw) * t;
      const h = globe.getHeight(Cesium.Cartographic.fromDegrees(lon, lat)) ?? -Infinity;
      const need = Math.max(0, (z - h) - nudge);
      if (need > mostNeeded) mostNeeded = need;
    }
    dz = Math.max(dz, mostNeeded);
  }

  if (mode === "translate") {
    const z0 = z0_raw - dz;
    const z1 = z1_raw - dz;
    return {
      start: Cesium.Cartesian3.fromDegrees(lon0, lat0, z0),
      end:   Cesium.Cartesian3.fromDegrees(lon1, lat1, z1),
    };
  } else {
    const collarZ = hTop + nudge;
    const start = Cesium.Cartesian3.fromDegrees(lon0, lat0, collarZ);
    const endRaw = Cesium.Cartesian3.fromDegrees(lon1, lat1, z1_raw);
    const startRaw = Cesium.Cartesian3.fromDegrees(lon0, lat0, z0_raw);
    const dir = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(endRaw, startRaw, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    const extend = Cesium.Cartesian3.multiplyByScalar(dir, dz, new Cesium.Cartesian3());
    const end = Cesium.Cartesian3.add(endRaw, extend, new Cesium.Cartesian3());
    return { start, end };
  }
}

export function orientationForSegmentENU(
  Cesium: typeof import('cesium'),
  startCartesian: any,
  endCartesian: any
) {
  const midpoint = Cesium.Cartesian3.midpoint(startCartesian, endCartesian, new Cesium.Cartesian3());
  const dirFixed = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(endCartesian, startCartesian, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(midpoint);
  const fixedToEnu3 = Cesium.Matrix4.getMatrix3(Cesium.Matrix4.inverse(enu, new Cesium.Matrix4()), new Cesium.Matrix3());
  const dirEnu = Cesium.Cartesian3.normalize(
    Cesium.Matrix3.multiplyByVector(fixedToEnu3, dirFixed, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const z = dirEnu;
  let x = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, z, new Cesium.Cartesian3());
  if (Cesium.Cartesian3.magnitude(x) < 1e-6) x = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_X, z, x);
  Cesium.Cartesian3.normalize(x, x);
  const y = Cesium.Cartesian3.cross(z, x, new Cesium.Cartesian3());

  const R = new Cesium.Matrix3();
  Cesium.Matrix3.setColumn(R, 0, x, R);
  Cesium.Matrix3.setColumn(R, 1, y, R);
  Cesium.Matrix3.setColumn(R, 2, z, R);
  return { midpoint, quaternion: Cesium.Quaternion.fromRotationMatrix(R) };
}