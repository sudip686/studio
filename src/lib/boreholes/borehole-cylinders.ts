// borehole-cylinders.ts
// Lazy load Cesium to avoid HMR issues

export type LatLonZ = [number, number, number];

export type Interval = {
  id: string;
  start: LatLonZ;
  end: LatLonZ;
  props?: Record<string, any>;
};

export type Style = {
  material: any;
  outline?: boolean;
  outlineColor?: any;
  opacity?: number;
  radiusMeters?: number;
  slices?: number;
};

const DEFAULT_RADIUS = 2.5;

const getCesium = () => {
  if (typeof window !== 'undefined') {
    return (window as any).Cesium;
  }
  return null;
};

export function toFixed(latz: LatLonZ) {
  const Cesium = getCesium();
  if (!Cesium) throw new Error('Cesium not loaded');
  const [lat, lon, z] = latz;
  return Cesium.Cartesian3.fromDegrees(lon, lat, z || 0);
}

export function orientationFrom(start: any, end: any) {
  const Cesium = getCesium();
  if (!Cesium) throw new Error('Cesium not loaded');
  
  const midpoint = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());
  const direction = Cesium.Cartesian3.subtract(end, start, new Cesium.Cartesian3());
  const length = Cesium.Cartesian3.magnitude(direction);

  if (!Number.isFinite(length) || length < 0.001) {
    return { midpoint, quaternion: Cesium.Quaternion.IDENTITY };
  }
  Cesium.Cartesian3.normalize(direction, direction);

  // We want to align the cylinder's Z axis (0,0,1) with 'direction'.
  // We construct a rotation matrix from basis vectors.
  const up = new Cesium.Cartesian3(0, 0, 1);
  // Check for degenerate case (direction parallel to up)
  if (Math.abs(Cesium.Cartesian3.dot(direction, up)) > 0.99) {
      up.x = 1; up.y = 0; up.z = 0;
  }
  
  // Create basis vectors
  // Z axis = direction
  // X axis = cross(up, direction)
  // Y axis = cross(direction, X axis)
  const xAxis = new Cesium.Cartesian3();
  Cesium.Cartesian3.cross(up, direction, xAxis);
  Cesium.Cartesian3.normalize(xAxis, xAxis);
  
  const yAxis = new Cesium.Cartesian3();
  Cesium.Cartesian3.cross(direction, xAxis, yAxis);
  Cesium.Cartesian3.normalize(yAxis, yAxis);
  
  // Build Rotation Matrix (Columns: X, Y, Z)
  const rotMatrix = new Cesium.Matrix3();
  Cesium.Matrix3.setColumn(rotMatrix, 0, xAxis, rotMatrix);
  Cesium.Matrix3.setColumn(rotMatrix, 1, yAxis, rotMatrix);
  Cesium.Matrix3.setColumn(rotMatrix, 2, direction, rotMatrix);
  
  const quaternion = new Cesium.Quaternion();
  Cesium.Quaternion.fromRotationMatrix(rotMatrix, quaternion);

  return { midpoint, quaternion };
}

async function seatBelowTerrain(
  viewer: any,
  startLLZ: LatLonZ,
  endLLZ: LatLonZ,
  nudge = -0.05,
  samples = 5
) {
  const Cesium = getCesium();
  if (!Cesium) throw new Error('Cesium not loaded');
  
  const globe = viewer.scene.globe;
  const [lat0, lon0, z0] = startLLZ;
  const [lat1, lon1, z1] = endLLZ;

  let dzNeeded = 0;
  for (let i = 0; i < samples; i++) {
    const t = samples === 1 ? 0 : i / (samples - 1);
    const lat = lat0 + (lat1 - lat0) * t;
    const lon = lon0 + (lon1 - lon0) * t;
    const z = z0 + (z1 - z0) * t;

    const h = globe.getHeight(Cesium.Cartographic.fromDegrees(lon, lat));
    if (h == null) continue;
    const above = z - h;
    if (above > dzNeeded) dzNeeded = above;
  }
  const dz = Math.max(0, dzNeeded) - nudge;
  const s = [startLLZ[0], startLLZ[1], startLLZ[2] - dz] as LatLonZ;
  const e = [endLLZ[0], endLLZ[1], endLLZ[2] - dz] as LatLonZ;
  return { s, e };
}

export class BoreholeCylinderCache {
  private map = new Map<string, any>();

  constructor(private viewer: any) {
    const { globe } = viewer.scene;
    globe.depthTestAgainstTerrain = true;
  }

  async getOrCreate(interval: Interval, style?: Style) {
    const Cesium = getCesium();
    if (!Cesium) throw new Error('Cesium not loaded');
    const { viewer } = this;
    const cached = this.map.get(interval.id);
    if (cached) {
      if (style) this.applyStyle(cached, style);
      return cached;
    }

    const p0 = toFixed(interval.start);
    const p1 = toFixed(interval.end ?? interval.start);
    const length0 = Cesium.Cartesian3.distance(p0, p1) || 0.01;
    const { midpoint: mid0, quaternion: q0 } = orientationFrom(p0, p1);

    const e = viewer.entities.add({
      id: `bh-${interval.id}`,
      position: mid0,
      orientation: q0,
      cylinder: {
        length: length0,
        topRadius: style?.radiusMeters ?? DEFAULT_RADIUS,
        bottomRadius: style?.radiusMeters ?? DEFAULT_RADIUS,
        slices: style?.slices ?? 32,
        material: (style?.material ?? Cesium.Color.GREY).withAlpha(style?.opacity ?? 0.15),
        outline: style?.outline ?? true,
      },
      properties: interval.props ?? {},
    });

    this.map.set(interval.id, e);

    // try {
    //   const { s, e: seated } = await seatBelowTerrain(viewer, interval.start, interval.end);
    //   const ps = toFixed(s);
    //   const pe = toFixed(seated);

    //   const L = Cesium.Cartesian3.distance(ps, pe);
    //   if (!Number.isFinite(L) || L < 0.5) {
    //     e.show = false;
    //     return e;
    //   }

    //   const { midpoint, quaternion } = orientationFrom(ps, pe);
    //   e.position = midpoint;
    //   e.orientation = quaternion;
    //   (e.cylinder as any).length = L;
    // } catch {
    //   // Silent fail
    // }

    if (style) this.applyStyle(e, style);
    return e;
  }

  applyStyle(entity: any, style: Style) {
    const Cesium = getCesium();
    if (!Cesium) throw new Error('Cesium not loaded');
    const cyl = entity.cylinder!;
    const alpha = style.opacity ?? 1.0;
    cyl.material = new Cesium.ColorMaterialProperty(style.material.withAlpha(alpha));
    cyl.outline = style.outline ?? false;
    cyl.outlineColor = style.outlineColor ?? Cesium.Color.BLACK;
    cyl.topRadius = style.radiusMeters ?? DEFAULT_RADIUS;
    cyl.bottomRadius = style.radiusMeters ?? DEFAULT_RADIUS;
  }

  destroy() {
    if (!this.viewer || this.viewer.isDestroyed()) {
      this.map.clear();
      return;
    }
    for (const e of this.map.values()) {
      try {
        this.viewer.entities.removeById(e.id);
      } catch {
        // Silent fail
      }
    }
    this.map.clear();
  }
}
