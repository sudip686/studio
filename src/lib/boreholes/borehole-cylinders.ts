// borehole-cylinders.ts
import * as Cesium from "cesium";

export type LatLonZ = [number, number, number];

export type Interval = {
  id: string;
  start: LatLonZ;
  end: LatLonZ;
  props?: Record<string, any>;
};

export type Style = {
  material: Cesium.Color;
  outline?: boolean;
  outlineColor?: Cesium.Color;
  opacity?: number;
  radiusMeters?: number;
  slices?: number;
};

const DEFAULT_RADIUS = 8;

export function toFixed(latz: LatLonZ) {
  const [lat, lon, z] = latz;
  return Cesium.Cartesian3.fromDegrees(lon, lat, z || 0);
}

export function orientationFrom(start: Cesium.Cartesian3, end: Cesium.Cartesian3) {
  const midpoint = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());
  const dirFixed = Cesium.Cartesian3.subtract(end, start, new Cesium.Cartesian3());
  const len = Cesium.Cartesian3.magnitude(dirFixed);

  if (!Number.isFinite(len) || len < 0.5) {
    return { midpoint, quaternion: Cesium.Quaternion.IDENTITY };
  }
  Cesium.Cartesian3.divideByScalar(dirFixed, len, dirFixed);

  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(midpoint);
  const fixedToEnu3 = Cesium.Matrix4.getMatrix3(
    Cesium.Matrix4.inverse(enu, new Cesium.Matrix4()),
    new Cesium.Matrix3()
  );

  const dirEnu = Cesium.Matrix3.multiplyByVector(fixedToEnu3, dirFixed, new Cesium.Cartesian3());
  if (!Number.isFinite(dirEnu.x) || !Number.isFinite(dirEnu.y) || !Number.isFinite(dirEnu.z)) {
    return { midpoint, quaternion: Cesium.Quaternion.IDENTITY };
  }
  Cesium.Cartesian3.normalize(dirEnu, dirEnu);

  const heading = Math.atan2(dirEnu.x, dirEnu.y);
  const horiz   = Math.hypot(dirEnu.x, dirEnu.y) || 1e-9;
  const pitch   = Math.atan2(dirEnu.z, horiz);
  const hpr     = new Cesium.HeadingPitchRoll(heading, pitch, 0.0);
  const quaternion = Cesium.Quaternion.fromHeadingPitchRoll(hpr);

  return { midpoint, quaternion };
}

async function seatBelowTerrain(
  viewer: Cesium.Viewer,
  startLLZ: LatLonZ,
  endLLZ: LatLonZ,
  nudge = -0.05,
  samples = 5
) {
  const globe = viewer.scene.globe;
  const [lat0, lon0, z0] = startLLZ;
  const [lat1, lon1, z1] = endLLZ;

  let dzNeeded = 0;
  for (let i = 0; i < samples; i++) {
    const t = samples === 1 ? 0 : i / (samples - 1);
    const lat = lat0 + (lat1 - lat0) * t;
    const lon = lon0 + (lon1 - lon0) * t;
    const z   =  z0 +  (z1  -  z0) * t;

    const h = globe.getHeight(Cesium.Cartographic.fromDegrees(lon, lat));
    if (h == null) continue;
    const above = (z - h);
    if (above > dzNeeded) dzNeeded = above;
  }
  const dz = Math.max(0, dzNeeded) - nudge;
  const s = [startLLZ[0], startLLZ[1], startLLZ[2] - dz] as LatLonZ;
  const e = [endLLZ[0],   endLLZ[1],   endLLZ[2]   - dz] as LatLonZ;
  return { s, e };
}

export class BoreholeCylinderCache {
  private map = new Map<string, Cesium.Entity>();

  constructor(private viewer: Cesium.Viewer) {
    const { globe } = viewer.scene;
    globe.depthTestAgainstTerrain = true;
  }

  async getOrCreate(interval: Interval, style?: Style) {
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
        slices: style?.slices ?? 16, // Reduced slices for entity performance
        material: (style?.material ?? Cesium.Color.GREY).withAlpha(style?.opacity ?? 0.15),
        outline: style?.outline ?? true,
      },
      properties: interval.props ?? {},
    });

    this.map.set(interval.id, e);

    try {
      const { s, e: seated } = await seatBelowTerrain(viewer, interval.start, interval.end);
      const ps = toFixed(s), pe = toFixed(seated);
      
      const L = Cesium.Cartesian3.distance(ps, pe);
      if (!Number.isFinite(L) || L < 0.5) {
        e.show = false;
        return e;
      }
      
      const { midpoint, quaternion } = orientationFrom(ps, pe);
      e.position = midpoint;
      e.orientation = quaternion;
      (e.cylinder as any).length = L;
    } catch {}

    if (style) this.applyStyle(e, style);
    return e;
  }

  applyStyle(entity: Cesium.Entity, style: Style) {
    const Cesium = (window as any).Cesium;
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
    for (const entity of this.map.values()) {
      this.viewer.entities.remove(entity);
    }
    this.map.clear();
  }
}
