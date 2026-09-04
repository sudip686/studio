'use client';

/**
 * Sampler for the hi-res project DEM (`height_hires.bin`, 2048 x 1940,
 * 204-1008 m over a 7.6 x 7.2 km tile).
 *
 * Deliberately not `dem-sampler.ts`: that module points at `height.bin`, the
 * regional grid, which is 207 MB on disk — far too large to pull into a
 * browser deck. This one loads the 15.9 MB project tile, which is the extent
 * every scene actually looks at.
 *
 * Exists because the topography scene had been drawing relief from
 * `reliefHeightAt`, a procedural noise function, rather than from the terrain
 * raster the rest of the project is built on.
 */

import proj4 from 'proj4';

const HIRES_META_URL = '/terrain_hires_meta.json';
const HIRES_HEIGHT_URL = '/height_hires.bin';
const UTM_37S = '+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs';

try {
  if (!(proj4 as any).defs['EPSG:32737']) {
    proj4.defs('EPSG:32737', UTM_37S);
  }
} catch {
  // Already registered by another module; nothing to do.
}

export interface HiresDem {
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  minElevation: number;
  maxElevation: number;
  /** Elevation in metres AMSL, or null outside the tile. */
  sample(lon: number, lat: number): number | null;
}

let demPromise: Promise<HiresDem | null> | null = null;

/**
 * Load the project DEM once. Resolves to `null` rather than throwing if the
 * raster is unavailable, so callers degrade to no relief instead of no slide.
 */
export function loadHiresDem(): Promise<HiresDem | null> {
  if (demPromise) return demPromise;

  demPromise = (async () => {
    const [metaResponse, binResponse] = await Promise.all([
      fetch(HIRES_META_URL, {cache: 'force-cache'}),
      fetch(HIRES_HEIGHT_URL, {cache: 'force-cache'}),
    ]);
    if (!metaResponse.ok || !binResponse.ok) return null;

    const meta = await metaResponse.json();
    const heights = new Float32Array(await binResponse.arrayBuffer());

    const width = Number(meta?.width);
    const height = Number(meta?.height);
    const bounds = meta?.bounds_utm ?? {};
    const minX = Number(bounds.minX);
    const minY = Number(bounds.minY);
    const maxX = Number(bounds.maxX);
    const maxY = Number(bounds.maxY);

    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (heights.length !== width * height) return null;

    const sample = (lon: number, lat: number): number | null => {
      let easting: number;
      let northing: number;
      try {
        [easting, northing] = proj4('WGS84', 'EPSG:32737', [lon, lat]) as [number, number];
      } catch {
        return null;
      }
      if (easting < minX || easting > maxX || northing < minY || northing > maxY) return null;

      const u = (easting - minX) / (maxX - minX);
      // Raster rows run north to south, so v is flipped.
      const v = 1 - (northing - minY) / (maxY - minY);
      const column = Math.min(width - 1, Math.max(0, Math.round(u * (width - 1))));
      const row = Math.min(height - 1, Math.max(0, Math.round(v * (height - 1))));

      const value = heights[row * width + column];
      return Number.isFinite(value) ? value : null;
    };

    return {
      width,
      height,
      minX,
      minY,
      maxX,
      maxY,
      minElevation: Number(meta?.elevation_m?.min ?? 0),
      maxElevation: Number(meta?.elevation_m?.max ?? 0),
      sample,
    };
  })().catch(() => null);

  return demPromise;
}
