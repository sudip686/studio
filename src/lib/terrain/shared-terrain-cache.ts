'use client';

import * as THREE from 'three';
import proj4 from 'proj4';
import { projectLonLat } from '@/lib/utils/three-helpers';
import { ASSET_BASE_URL } from '@/lib/constants';

export type TerrainModelCenter = { lon: number; lat: number };

type TerrainMeta = {
  bounds_utm: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  width: number;
  height: number;
  rgb_texture?: string;
};

type SharedTerrainResources = {
  meta: TerrainMeta;
  heightData: Float32Array;
  texture: THREE.Texture;
  normalMap: THREE.DataTexture;
  lowGeometry: THREE.BufferGeometry & { visible?: boolean };
  highGeometry: (THREE.BufferGeometry & { visible?: boolean }) | null;
};

const HIGH_RES_SEGMENTS = 1024;
const LOW_RES_SEGMENTS = 192;
const NORMAL_MAP_SIZE = 2048;

try {
  if (!(proj4 as any).defs['EPSG:32737']) {
    proj4.defs('EPSG:32737', '+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs');
  }
} catch {
  // No-op.
}

const terrainCache = {
  meta: null as TerrainMeta | null,
  heightData: null as Float32Array | null,
  heightPromise: null as Promise<[TerrainMeta, Float32Array]> | null,
  textures: new Map<string, THREE.Texture>(),
  texturePromises: new Map<string, Promise<THREE.Texture>>(),
  normalMaps: new Map<string, THREE.DataTexture>(),
  normalPromises: new Map<string, Promise<THREE.DataTexture>>(),
  geometries: new Map<string, THREE.BufferGeometry>(),
  geometryPromises: new Map<string, Promise<THREE.BufferGeometry>>(),
};

const textureTuning = new WeakMap<THREE.Texture, number>();

function utmToLatLon(easting: number, northing: number) {
  const [lon, lat] = proj4('EPSG:32737', 'WGS84', [easting, northing]);
  return { lat, lon };
}

function getCenterKey(modelCenter: TerrainModelCenter) {
  return `${modelCenter.lon.toFixed(6)}_${modelCenter.lat.toFixed(6)}`;
}

function getGeometryKey(modelCenter: TerrainModelCenter, verticalScale: number, segments: number) {
  return `${getCenterKey(modelCenter)}:${verticalScale}:${segments}`;
}

function getNormalKey(verticalScale: number) {
  return `${verticalScale}:${NORMAL_MAP_SIZE}`;
}

export function describeTerrainError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== '{}') {
      return serialized;
    }
  } catch {
    // Ignore serialization failures.
  }

  return 'Unknown error';
}

export function buildBlockModelCenter(
  blockModelData?: Array<{ lon?: number; lat?: number }> | null,
): TerrainModelCenter | null {
  if (!blockModelData?.length) return null;

  let lonTotal = 0;
  let latTotal = 0;
  let count = 0;

  for (const block of blockModelData) {
    const lon = Number(block.lon);
    const lat = Number(block.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    lonTotal += lon;
    latTotal += lat;
    count += 1;
  }

  if (count === 0) return null;
  return { lon: lonTotal / count, lat: latTotal / count };
}

async function loadTerrainMetaAndHeight() {
  if (terrainCache.meta && terrainCache.heightData) {
    return [terrainCache.meta, terrainCache.heightData] as [TerrainMeta, Float32Array];
  }

  if (!terrainCache.heightPromise) {
    terrainCache.heightPromise = Promise.all([
      fetch('/terrain_meta.json').then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load terrain meta: ${response.statusText}`);
        }
        return response.json() as Promise<TerrainMeta>;
      }),
      fetch('/height.bin', { cache: 'force-cache' }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load terrain heights: ${response.statusText}`);
        }
        return response.arrayBuffer();
      }),
    ])
      .then(([meta, heightBuffer]) => {
        const heightData = new Float32Array(heightBuffer);
        terrainCache.meta = meta;
        terrainCache.heightData = heightData;
        return [meta, heightData] as [TerrainMeta, Float32Array];
      })
      .catch((error) => {
        terrainCache.heightPromise = null;
        throw error;
      });
  }

  return terrainCache.heightPromise;
}

function resolveTerrainTexturePath(meta: TerrainMeta) {
  const textureName = meta.rgb_texture?.trim();

  if (textureName) {
    if (/^https?:\/\//i.test(textureName)) {
      return textureName;
    }

    return textureName.startsWith('/') ? textureName : `/${textureName}`;
  }

  if (ASSET_BASE_URL) {
    return `${ASSET_BASE_URL}/terrain_texture_8k.jpg`;
  }

  return '/terrain_texture_8k.jpg';
}

function applyTextureTuning(texture: THREE.Texture, renderer?: THREE.WebGLRenderer | null) {
  if (!renderer) return;
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 8;
  const anisotropy = Math.max(8, Math.min(maxAnisotropy, 16));
  const current = textureTuning.get(texture) ?? 0;

  if (current >= anisotropy) return;

  texture.anisotropy = anisotropy;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  textureTuning.set(texture, anisotropy);
}

async function loadTerrainTexture(texturePath: string, renderer?: THREE.WebGLRenderer | null) {
  const cacheKey = texturePath || '/terrain_texture_8k.jpg';

  const existing = terrainCache.textures.get(cacheKey);
  if (existing) {
    applyTextureTuning(existing, renderer);
    return existing;
  }

  const inFlight = terrainCache.texturePromises.get(cacheKey);
  if (inFlight) {
    const texture = await inFlight;
    applyTextureTuning(texture, renderer);
    return texture;
  }

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      cacheKey,
      (texture) => {
        applyTextureTuning(texture, renderer);
        terrainCache.textures.set(cacheKey, texture);
        resolve(texture);
      },
      undefined,
      (error) => {
        terrainCache.texturePromises.delete(cacheKey);
        reject(error);
      },
    );
  });

  terrainCache.texturePromises.set(cacheKey, promise);
  const texture = await promise;
  terrainCache.texturePromises.delete(cacheKey);
  return texture;
}

function sampleHeight(
  heightData: Float32Array,
  meta: TerrainMeta,
  easting: number,
  northing: number,
) {
  const { bounds_utm, width: dataW, height: dataH } = meta;
  const { minX, maxX, minY, maxY } = bounds_utm;
  const globalWidth = maxX - minX;
  const globalHeight = maxY - minY;

  const u = (easting - minX) / globalWidth;
  const v = (maxY - northing) / globalHeight;
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0;

  const x = u * (dataW - 1);
  const y = v * (dataH - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, dataW - 1);
  const y1 = Math.min(y0 + 1, dataH - 1);
  const dx = x - x0;
  const dy = y - y0;
  const h00 = heightData[y0 * dataW + x0];
  const h10 = heightData[y0 * dataW + x1];
  const h01 = heightData[y1 * dataW + x0];
  const h11 = heightData[y1 * dataW + x1];
  const top = h00 * (1 - dx) + h10 * dx;
  const bottom = h01 * (1 - dx) + h11 * dx;
  return top * (1 - dy) + bottom * dy;
}

function buildTerrainGeometry(
  heightData: Float32Array,
  meta: TerrainMeta,
  modelCenter: TerrainModelCenter,
  verticalScale: number,
  segmentsW: number,
  segmentsH: number,
) {
  const { bounds_utm } = meta;
  const { minX, maxX, minY, maxY } = bounds_utm;
  const globalWidth = maxX - minX;
  const globalHeight = maxY - minY;

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(segmentsW * segmentsH * 3);
  const uvs = new Float32Array(segmentsW * segmentsH * 2);
  const indices: number[] = [];

  for (let iy = 0; iy < segmentsH; iy += 1) {
    const rowV = iy / (segmentsH - 1);
    const northing = maxY - rowV * globalHeight;

    for (let ix = 0; ix < segmentsW; ix += 1) {
      const colU = ix / (segmentsW - 1);
      const easting = minX + colU * globalWidth;
      const height = sampleHeight(heightData, meta, easting, northing);
      const idx = iy * segmentsW + ix;
      const { lat, lon } = utmToLatLon(easting, northing);
      const { x, z } = projectLonLat(lon, lat, modelCenter);

      vertices[idx * 3] = x;
      vertices[idx * 3 + 1] = height * verticalScale;
      vertices[idx * 3 + 2] = -z;

      uvs[idx * 2] = colU;
      uvs[idx * 2 + 1] = 1 - rowV;
    }
  }

  for (let iy = 0; iy < segmentsH - 1; iy += 1) {
    for (let ix = 0; ix < segmentsW - 1; ix += 1) {
      const a = iy * segmentsW + ix;
      const b = iy * segmentsW + (ix + 1);
      const c = (iy + 1) * segmentsW + ix;
      const d = (iy + 1) * segmentsW + (ix + 1);
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.sharedTerrainGeometry = true;
  return geometry;
}

async function loadTerrainGeometry(
  modelCenter: TerrainModelCenter,
  verticalScale: number,
  segments: number,
) {
  const key = getGeometryKey(modelCenter, verticalScale, segments);
  const cached = terrainCache.geometries.get(key);
  if (cached) return cached;

  const inFlight = terrainCache.geometryPromises.get(key);
  if (inFlight) return inFlight;

  const promise = loadTerrainMetaAndHeight()
    .then(([meta, heightData]) => buildTerrainGeometry(heightData, meta, modelCenter, verticalScale, segments, segments))
    .then((geometry) => {
      terrainCache.geometries.set(key, geometry);
      terrainCache.geometryPromises.delete(key);
      return geometry;
    })
    .catch((error) => {
      terrainCache.geometryPromises.delete(key);
      throw error;
    });

  terrainCache.geometryPromises.set(key, promise);
  return promise;
}

function buildTerrainNormalMap(heightData: Float32Array, meta: TerrainMeta, verticalScale: number) {
  const { bounds_utm } = meta;
  const { minX, maxX, minY, maxY } = bounds_utm;
  const globalWidth = maxX - minX;
  const globalHeight = maxY - minY;
  const size = NORMAL_MAP_SIZE;
  const pixelData = new Uint8Array(size * size * 4);
  const normalStrength = 3.2;

  for (let y = 0; y < size; y += 1) {
    const v = y / (size - 1);
    const northing = maxY - v * globalHeight;
    const northingPrev = maxY - Math.max(0, y - 1) / (size - 1) * globalHeight;
    const northingNext = maxY - Math.min(size - 1, y + 1) / (size - 1) * globalHeight;

    for (let x = 0; x < size; x += 1) {
      const u = x / (size - 1);
      const easting = minX + u * globalWidth;
      const eastingPrev = minX + Math.max(0, x - 1) / (size - 1) * globalWidth;
      const eastingNext = minX + Math.min(size - 1, x + 1) / (size - 1) * globalWidth;

      const left = sampleHeight(heightData, meta, eastingPrev, northing) * verticalScale;
      const right = sampleHeight(heightData, meta, eastingNext, northing) * verticalScale;
      const top = sampleHeight(heightData, meta, easting, northingPrev) * verticalScale;
      const bottom = sampleHeight(heightData, meta, easting, northingNext) * verticalScale;

      const dx = (right - left) / Math.max(1, eastingNext - eastingPrev);
      const dy = (bottom - top) / Math.max(1, northingPrev - northingNext);
      const normal = new THREE.Vector3(-dx * normalStrength, 1, -dy * normalStrength).normalize();
      const offset = (y * size + x) * 4;

      pixelData[offset] = Math.round((normal.x * 0.5 + 0.5) * 255);
      pixelData[offset + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      pixelData[offset + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      pixelData[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixelData, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

async function loadTerrainNormalMap(verticalScale: number) {
  const key = getNormalKey(verticalScale);
  const cached = terrainCache.normalMaps.get(key);
  if (cached) return cached;

  const inFlight = terrainCache.normalPromises.get(key);
  if (inFlight) return inFlight;

  const promise = loadTerrainMetaAndHeight()
    .then(([meta, heightData]) => buildTerrainNormalMap(heightData, meta, verticalScale))
    .then((normalMap) => {
      terrainCache.normalMaps.set(key, normalMap);
      terrainCache.normalPromises.delete(key);
      return normalMap;
    })
    .catch((error) => {
      terrainCache.normalPromises.delete(key);
      throw error;
    });

  terrainCache.normalPromises.set(key, promise);
  return promise;
}

export async function prepareTerrainSurface(
  modelCenter: TerrainModelCenter,
  verticalScale = 1,
  renderer?: THREE.WebGLRenderer | null,
  options?: { includeHigh?: boolean; meshVisible?: boolean },
): Promise<SharedTerrainResources> {
  const includeHigh = options?.includeHigh ?? true;
  const meshVisible = options?.meshVisible ?? false;
  const [meta, heightData] = await loadTerrainMetaAndHeight();
  const texturePath = resolveTerrainTexturePath(meta);
  const [texture, normalMap, lowGeometry, highGeometry] = await Promise.all([
    loadTerrainTexture(texturePath, renderer),
    loadTerrainNormalMap(verticalScale),
    loadTerrainGeometry(modelCenter, verticalScale, LOW_RES_SEGMENTS),
    includeHigh ? loadTerrainGeometry(modelCenter, verticalScale, HIGH_RES_SEGMENTS) : Promise.resolve(null),
  ]);

  return {
    meta,
    heightData,
    texture,
    normalMap,
    lowGeometry,
    highGeometry,
  };
}

export async function prewarmTerrainSurface(
  modelCenter: TerrainModelCenter,
  verticalScale = 1,
): Promise<void> {
  await prepareTerrainSurface(modelCenter, verticalScale, undefined, { includeHigh: true });
}

export function createTerrainMaterial({
  texture,
  normalMap,
  clippingPlanes,
  highQuality,
  renderer,
  presentationMode = false,
}: {
  texture?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  clippingPlanes?: THREE.Plane[];
  highQuality: boolean;
  renderer?: THREE.WebGLRenderer | null;
  presentationMode?: boolean;
}) {
  if (texture) {
    applyTextureTuning(texture, renderer);
  }

  // Presentation mode enhancements for slides 9-12
  const isPresentation = presentationMode || highQuality;
  const visibilityBoost = 1.3;
  const normalScaleX = (isPresentation ? 2.2 : (highQuality ? 1.85 : 1.1)) * 1.08;
  const normalScaleY = (isPresentation ? 2.2 : (highQuality ? 1.85 : 1.1)) * 1.08;
  const roughness = isPresentation ? 0.84 : (highQuality ? 0.9 : 0.94);
  const metalness = isPresentation ? 0.05 : 0.02;

  return new THREE.MeshStandardMaterial({
    map: texture ?? undefined,
    normalMap: normalMap ?? undefined,
    normalScale: new THREE.Vector2(normalScaleX, normalScaleY),
    color: new THREE.Color('#f4f8fb'),
    side: THREE.FrontSide,
    roughness: roughness,
    metalness: metalness,
    emissive: new THREE.Color('#6b7f91'),
    emissiveIntensity: (isPresentation ? 0.08 : (highQuality ? 0.065 : 0.05)) * visibilityBoost,
    clippingPlanes: clippingPlanes ?? [],
    polygonOffset: true,
    polygonOffsetFactor: 1,
  });
}


