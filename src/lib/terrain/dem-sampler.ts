'use client';

// Lightweight DEM sampler used in Three.js viewers to clamp collars to terrain
// Reads public/terrain_meta.json and public/dem_height_4097_u16.png once, then
// provides sampleElevationAtLonLat(lon, lat) in meters AMSL.

import proj4 from 'proj4';
import { ASSET_BASE_URL } from '@/lib/constants';

type TerrainMeta = {
  crs_epsg: number;
  bounds_utm: { minX: number; minY: number; maxX: number; maxY: number };
  elevation_m: { min: number; max: number };
  width: number;
  height: number;
  rgb_texture?: string;
};

// Register UTM Zone 37S once (EPSG:32737) — matches terrain_meta.json
// If already defined elsewhere this is a no-op
try {
  // @ts-ignore
  if (!(proj4 as any).defs['EPSG:32737']) {
    proj4.defs('EPSG:32737', '+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs');
  }
} catch {}

let _meta: TerrainMeta | null = null;
let _heightData: Float32Array | null = null;
let _dataWidth: number | null = null;
let _dataHeight: number | null = null;
let _loadPromise: Promise<void> | null = null;

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

async function ensureLoaded(): Promise<void> {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    // Load meta
    const metaResp = await fetch('/terrain_meta.json');
    if (!metaResp.ok) throw new Error(`Failed to load terrain_meta.json: ${metaResp.statusText}`);
    _meta = await metaResp.json() as TerrainMeta;

    // Load height.bin
    const binResp = await fetch(`${ASSET_BASE_URL}/height.bin`);
    if (!binResp.ok) throw new Error(`Failed to load height.bin: ${binResp.statusText}`);
    const arrayBuffer = await binResp.arrayBuffer();
    _heightData = new Float32Array(arrayBuffer);

    // Get dimensions from meta
    if (!_meta) throw new Error("Meta loaded but is null");
    _dataWidth = _meta.width;
    _dataHeight = _meta.height;

    if (_heightData.length !== _dataWidth * _dataHeight) {
        throw new Error(`Dimension mismatch: height.bin size (${_heightData.length}) does not match meta (${_dataWidth}x${_dataHeight})`);
    }
  })();
  return _loadPromise;
}

export async function getTerrainMeta(): Promise<TerrainMeta> {
  await ensureLoaded();
  if (!_meta) throw new Error('terrain meta not loaded');
  return _meta;
}

// Returns elevation in meters AMSL, or null if query is out of bounds
export async function sampleElevationAtLonLat(lon: number, lat: number): Promise<number | null> {
  await ensureLoaded();
  if (!_meta || !_heightData || _dataWidth === null || _dataHeight === null) return null;

  // Project lon/lat WGS84 -> UTM 37S (EPSG:32737)
  const [easting, northing] = proj4('WGS84', 'EPSG:32737', [lon, lat]);

  const { minX, minY, maxX, maxY } = _meta.bounds_utm;
  if (easting < minX || easting > maxX || northing < minY || northing > maxY) {
    // Out of coverage
    return null;
  }

  const u = clamp01((easting - minX) / (maxX - minX));
  // v in data space is top-down; bounds are northing increasing upward, so v = (maxY - northing)/(maxY-minY)
  const v = clamp01((maxY - northing) / (maxY - minY));

  const x = Math.min(_dataWidth - 1, Math.max(0, Math.floor(u * (_dataWidth - 1))));
  const y = Math.min(_dataHeight - 1, Math.max(0, Math.floor(v * (_dataHeight - 1))));
  const off = (y * _dataWidth + x);
  const elev = _heightData[off];
  return elev;
}

// Convenience: returns zMin (meters AMSL) to align viewers with terrain mesh (which uses (elev - zMin) as Y)
export async function getZMin(): Promise<number> {
  const m = await getTerrainMeta();
  return m.elevation_m.min;
}
