/**
 * Measured relief for the project tile.
 *
 * The deck previously stated two different elevation ranges on the same slide:
 * a hardcoded "≈940 m / ≈640 m range" panel, and a "0-420 m relief window"
 * callout. The callout was not a measurement at all — it came from
 * `reliefHeightAt`, which synthesises relief from sine/Gaussian noise for the
 * 2D map, and was then clamped to 0..420. This module replaces both with the
 * real numbers from the terrain raster's own metadata, so the deck states one
 * elevation range and it is the one the 3D terrain is actually built from.
 */

/** Elevation extremes of a terrain tile, in metres. */
export interface ReliefStats {
  minM: number;
  maxM: number;
  rangeM: number;
  /** Ground extent of the tile, for the panel's provenance line. */
  extentKm: { width: number; height: number } | null;
}

/**
 * Hi-res tile covering the project. Used when the metadata fetch has not
 * resolved yet, so the panel never renders a placeholder zero — matching
 * `public/terrain_hires_meta.json` at the time of writing.
 */
export const FALLBACK_RELIEF: ReliefStats = {
  minM: 204,
  maxM: 1008,
  rangeM: 804,
  extentKm: { width: 7.6, height: 7.2 },
};

const HIRES_META_URL = '/terrain_hires_meta.json';

interface TerrainMeta {
  bounds_utm?: { minX?: number; maxX?: number; minY?: number; maxY?: number };
  elevation_m?: { min?: number; max?: number };
}

function toStats(meta: TerrainMeta | null): ReliefStats | null {
  const min = Number(meta?.elevation_m?.min);
  const max = Number(meta?.elevation_m?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

  const bounds = meta?.bounds_utm;
  const width = Number(bounds?.maxX) - Number(bounds?.minX);
  const height = Number(bounds?.maxY) - Number(bounds?.minY);
  const extentKm =
    Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
      ? { width: width / 1000, height: height / 1000 }
      : null;

  return {
    minM: Math.round(min),
    maxM: Math.round(max),
    rangeM: Math.round(max - min),
    extentKm,
  };
}

let cached: Promise<ReliefStats> | null = null;

/**
 * Read the project tile's measured relief. Falls back to the committed values
 * rather than throwing: a panel that shows slightly stale elevations is far
 * better than one that shows nothing, or zeros, in front of an investor.
 */
export function loadProjectRelief(): Promise<ReliefStats> {
  if (cached) return cached;

  cached = fetch(HIRES_META_URL, { cache: 'force-cache' })
    .then((response) => (response.ok ? response.json() : null))
    .then((meta) => toStats(meta) ?? FALLBACK_RELIEF)
    .catch(() => FALLBACK_RELIEF);

  return cached;
}

/** "204-1008 m" — the shared phrasing for both the panel and the callout. */
export function formatReliefWindow(relief: ReliefStats): string {
  return `${relief.minM}-${relief.maxM} m`;
}

/** Provenance line naming the tile the numbers were measured from. */
export function reliefSourceLabel(relief: ReliefStats): string {
  const extent = relief.extentKm;
  const size = extent
    ? `${extent.width.toFixed(1)} x ${extent.height.toFixed(1)} km tile`
    : 'project tile';
  return `Measured from the hi-res terrain raster · ${size}`;
}
