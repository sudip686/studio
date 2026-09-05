'use client';

/**
 * Sampler for the project elevation raster.
 *
 * Deliberately not `dem-sampler.ts`: that module points at `height.bin`, the
 * regional grid, which is 207 MB on disk — far too large to pull into a
 * browser deck.
 *
 * Exists because the topography scene had been drawing relief from
 * `reliefHeightAt`, a procedural noise function, rather than from the terrain
 * raster the rest of the project is built on.
 */

import proj4 from 'proj4';

// Large rasters live on Cloudflare R2 in production (NEXT_PUBLIC_ASSET_BASE_URL)
// and in /public locally. Both height rasters are gitignored, so a plain
// same-origin fetch 404s on a deploy or a fresh clone and the relief silently
// disappears. This mirrors the loader the 3D scene already uses.
const RAW_ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE_URL || '';
const ASSET_BASE_URL = RAW_ASSET_BASE.endsWith('/')
  ? RAW_ASSET_BASE.slice(0, -1)
  : RAW_ASSET_BASE;

async function fetchAsset(path: string, init?: RequestInit): Promise<Response> {
  if (ASSET_BASE_URL) {
    try {
      const remote = await fetch(`${ASSET_BASE_URL}${path}`, init);
      if (remote.ok) return remote;
    } catch {
      // fall through to the local copy
    }
  }
  return fetch(path, init);
}

/**
 * Preferred source is the hi-res project tile. The 1024 preview is the fallback
 * because it is the only elevation raster committed to the repo, so a clone
 * with no R2 configured still renders relief instead of nothing.
 */
const RASTER_SOURCES = [
  {meta: '/terrain_hires_meta.json', height: '/height_hires.bin'},
  {meta: '/terrain_preview_meta.json', height: '/height_preview_1024.bin'},
] as const;

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
 * Load the project DEM once. Resolves to `null` rather than throwing if no
 * raster is reachable, so callers degrade to no relief instead of no slide.
 */
export function loadHiresDem(): Promise<HiresDem | null> {
  if (demPromise) return demPromise;

  demPromise = (async () => {
    for (const source of RASTER_SOURCES) {
      const dem = await loadRaster(source.meta, source.height);
      if (dem) return dem;
    }
    return null;
  })().catch(() => null);

  return demPromise;
}

async function loadRaster(metaUrl: string, heightUrl: string): Promise<HiresDem | null> {
  try {
    const [metaResponse, binResponse] = await Promise.all([
      fetchAsset(metaUrl, {cache: 'force-cache'}),
      fetchAsset(heightUrl, {cache: 'force-cache'}),
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
  } catch {
    return null;
  }
}
