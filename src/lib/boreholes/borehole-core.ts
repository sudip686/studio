// src/lib/boreholes/borehole-core.ts
export type BoreholeRowBase = {
  hole_id: string;
  lon: number;  // degrees
  lat: number;  // degrees
  depth_from: number; // meters
  depth_to: number;   // meters
  z?: number;         // optional collar elevation from source (can be wrong)
  // arbitrary fields allowed (lithology, assay, etc.)
  [k: string]: any;
};

import { clampCollarsToSurface } from '@/lib/utils/drillholes'; // Import the new utility

export type BoreholeSegment = {
  hole_id: string;
  lon: number;
  lat: number;
  top_z: number;       // snapped to terrain (surface)
  bottom_z: number;    // top_z - (depth_to - depth_from)
  length: number;      // > 0
  depth_from: number;
  depth_to: number;
  props: Record<string, any>; // carry-through for styling/tooltip
  path: any[]; // Add path for PolylineVolume
};

// Terrain sampling & normalization
export async function surfaceSnapAndSegment(
  viewer: any,
  rows: BoreholeRowBase[],
): Promise<BoreholeSegment[]> {
  const Cesium = (window as any).Cesium;
  if (!viewer || viewer.isDestroyed?.()) return [];
  // No need to await terrainProvider.readyPromise here, clampCollarsToSurface handles it

  // 1) unique collars (per hole_id)
  const collars = new Map<string, { lon: number; lat: number }>();
  for (const r of rows) if (!collars.has(r.hole_id)) {
    collars.set(r.hole_id, { lon: r.lon, lat: r.lat });
  }

  // 2) Clamp collars to surface using the new utility function
  const collarLonLatArr = Array.from(collars.values());
  const clampedCollarPositions = await clampCollarsToSurface(viewer, collarLonLatArr);

  const collarCartesianMap = new Map<string, any>();
  Array.from(collars.keys()).forEach((hid, i) => {
    collarCartesianMap.set(hid, clampedCollarPositions[i]);
  });

  // 3) build segments with absolute Cartesian3 paths
  const out: BoreholeSegment[] = [];
  for (const r of rows) {
    const collarCartesian = collarCartesianMap.get(r.hole_id);
    if (!collarCartesian) continue; // Should not happen if clampCollarsToSurface worked

    const collarCartographic = Cesium.Cartographic.fromCartesian(collarCartesian);
    const surfaceZ = collarCartographic.height;

    const len = Math.max(0, r.depth_to - r.depth_from);
    if (len <= 1e-6) continue;

    // Calculate absolute Z for the bottom of the segment
    const bottomZ = surfaceZ - len;

    // Create Cartesian3 positions for the segment path
    const path = [
      Cesium.Cartesian3.fromDegrees(r.lon, r.lat, surfaceZ),
      Cesium.Cartesian3.fromDegrees(r.lon, r.lat, bottomZ),
    ];

    const p0 = path[0];
    const p1 = path[1];

    const isFinite = (p: any) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

    if (path.length < 2 || !isFinite(p0) || !isFinite(p1) || Cesium.Cartesian3.distance(p0, p1) < 1e-6) {
      console.warn('[Drill QA] Skipping degenerate segment', { hole_id: r.hole_id, path });
      continue;
    }

    out.push({
      hole_id: r.hole_id,
      lon: r.lon,
      lat: r.lat,
      top_z: surfaceZ, // Keep for compatibility if needed elsewhere
      bottom_z: bottomZ, // Keep for compatibility if needed elsewhere
      length: len,
      depth_from: r.depth_from,
      depth_to: r.depth_to,
      props: { ...r }, // keep everything for coloring/tooltip
      path: path,
    });
  }
  return out;
}
