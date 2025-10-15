// src/lib/boreholes/cesium-borehole-layer.ts
import type { BoreholeSegment } from "./borehole-core";
import { addDrillholeCylinder } from '@/lib/utils/drillholes'; // Import the new utility

export type BoreholeColorFn = (seg: BoreholeSegment) => any; // returns Cesium.Color

const EPS = 1e-6;

function finiteNum(n: any): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function finite3(c: any) {
  return finiteNum(c.x) && finiteNum(c.y) && finiteNum(c.z);
}

function distinct(a: any, b: any) {
  return (window as any).Cesium.Cartesian3.distance(a, b) > EPS;
}

export async function addBoreholeLayer(
  viewer: any,
  segments: BoreholeSegment[],
  colorFn: BoreholeColorFn,
  options?: {
    name?: string;
    radius?: number; // radius is now handled by addDrillholeCylinder
  }
) {
  const Cesium = (window as any).Cesium;
  const ds = new Cesium.CustomDataSource(options?.name ?? "boreholes");
  viewer.dataSources.add(ds);

  for (const seg of segments) {
    const color = colorFn(seg);

    const p0 = seg.path[0];
    const p1 = seg.path[1];

    if (!p0 || !p1 || !finite3(p0) || !finite3(p1) || !distinct(p0, p1)) {
      console.warn('[Boreholes] Skip: invalid/zero-length cartesian', { seg });
      continue;
    }

    try {
      // Use the new addDrillholeCylinder function
      const entity = addDrillholeCylinder(ds, seg.path, color);
      // Attach properties to the entity for identification/tooltip if needed
      entity.properties = {
        hole_id: seg.hole_id,
        depth_from: seg.depth_from,
        depth_to: seg.depth_to,
        top_z: seg.top_z,
        bottom_z: seg.bottom_z,
        ...seg.props,
      };
    } catch (e) {
      console.warn('[Boreholes] Geometry creation failed; skipping segment', e, seg);
    }
  }

  return ds;
}

export async function fitToBoreholeLayer(
  viewer: any,
  ds: any,
  options?: { headingDeg?: number; pitchDeg?: number; rangeScale?: number; duration?: number }
) {
  const Cesium = (window as any).Cesium;

  const heading = Cesium.Math.toRadians(options?.headingDeg ?? 30);
  const pitch   = Cesium.Math.toRadians(options?.pitchDeg ?? -45);
  const duration = options?.duration ?? 1.6;
  const scale   = options?.rangeScale ?? 3.5;

  // Compose bounding sphere from entities that already have primitives
  await new Promise<void>((resolve) => {
    viewer.scene.requestRender();
    const remove = viewer.scene.preRender.addEventListener(() => { remove(); resolve(); });
  });

  const ents = ds.entities.values;
  if (!ents.length) return;

  const spheres: any[] = [];
  const tmp = new Cesium.BoundingSphere();
  for (const e of ents) {
    const state = viewer.dataSourceDisplay.getBoundingSphere(e, true, tmp);
    if (state === Cesium.BoundingSphereState.DONE) {
      spheres.push(new Cesium.BoundingSphere(tmp.center, tmp.radius));
    }
  }

  if (spheres.length) {
    const union = Cesium.BoundingSphere.fromBoundingSpheres(spheres);
    const offset = new Cesium.HeadingPitchRange(heading, pitch, Math.max(250, union.radius * scale));
    await viewer.camera.flyToBoundingSphere(union, { offset, duration });
  } else {
    await viewer.zoomTo(ds, new Cesium.HeadingPitchRange(heading, pitch, 0));
  }
  viewer.scene.requestRender();
}

export function removeDataSource(viewer: any, ds: any) {
  if (!viewer || !ds) return;
  viewer.dataSources.remove(ds, true);
  viewer.scene.requestRender();
}
