'use client';

import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import proj4 from 'proj4';
import {LITHOLOGY_COLOR_MAP} from '@/lib/boreholes/colors';

type GeologyMode = 'drillholes' | 'subsurface' | 'resource' | 'mine_planning' | 'metallurgy';
type ResourceFocus = 'Indicated' | 'Inferred' | 'All' | 'HighTGC' | 'LowTGC' | 'LowUncertainty' | 'HighFlake';
type SceneLoadState = 'idle' | 'loading' | 'ready' | 'degraded' | 'error';
type AssetQuality = 'preview' | 'standard' | 'high';
type ThreeCameraCommand = {
  id: number;
  action: 'zoomIn' | 'zoomOut' | 'tiltUp' | 'projectAngle' | 'bottomView' | 'rotateDegrees' | 'orbit360' | 'orbitVertical360';
  degrees?: 90 | 180 | 360;
};

type TangaThreeGeologySceneProps = {
  visible: boolean;
  mode: GeologyMode;
  resourceFocus: ResourceFocus;
  rotationKey: number;
  cameraDropKey: number;
  cameraCommand?: ThreeCameraCommand | null;
  assetQuality?: AssetQuality;
  onLoadState?: (state: {
    scene: SceneLoadState;
    terrain: SceneLoadState;
    quality: AssetQuality;
    message: string;
    elapsedMs?: number;
  }) => void;
};

type ResourceBlock = {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  classification: string;
  carbon: number;
  color: [number, number, number];
};

type DrillSegment = {
  from: [number, number, number];
  to: [number, number, number];
  carbon: number;
  holeId: string;
  depthFrom: number;
  depthTo: number;
  lithology: string;
};

type ThreeCallout = {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
  tone: string;
  anchor: [number, number, number];
  side?: 'left' | 'right' | 'top' | 'bottom';
};

type ThreeLegendItem = {
  label: string;
  detail: string;
  tone: string;
};

type SurfaceCameraView = 'default' | 'top' | 'bottom';

type ProjectedThreeCallout = ThreeCallout & {
  anchorPixelX: number;
  anchorPixelY: number;
  boxPixelX: number;
  boxPixelY: number;
};

type ProjectedCalloutFrame = {
  width: number;
  height: number;
  items: ProjectedThreeCallout[];
};

type ThreeNavInstrument = {
  northAngleDeg: number;
  scaleLabel: string;
  scaleWidth: number;
  scaleDetail: string;
};

type CameraShot = {
  from: THREE.Vector3;
  mid: THREE.Vector3;
  to: THREE.Vector3;
  targetMid: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  drift: THREE.Vector3;
  yawDrift: number;
  flySeconds: number;
};

type HoverTooltip = {
  x: number;
  y: number;
  title: string;
  rows: string[];
  tone: string;
};

type DrillPickInfo = {
  title: string;
  rows: string[];
  tone: string;
};

type MetallurgyPulse = {
  curve: THREE.CatmullRomCurve3;
  delay: number;
  phase: number;
  speed: number;
};

type RevealMaterialState = {
  material: THREE.Material & {opacity?: number; transparent?: boolean};
  opacity: number;
};

type SceneRevealItem = {
  object: THREE.Object3D;
  materialStates: RevealMaterialState[];
  baseScale: THREE.Vector3;
  basePosition: THREE.Vector3;
  scaleFrom: number;
  yOffset: number;
  delay: number;
  duration: number;
};

type MetallurgyReceiver = {
  ring: THREE.Mesh;
  core: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
  coreMaterial: THREE.MeshBasicMaterial;
  baseRingOpacity: number;
  baseCoreOpacity: number;
  delay: number;
};

type TerrainMeta = {
  bounds_utm: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  width: number;
  height: number;
};

type TangaTerrainResources = {
  meta: TerrainMeta;
  heightData: Float32Array;
  texture: THREE.Texture;
  quality: AssetQuality;
};

const TGC_GRADE_BINS = [
  {key: 'very-high', label: 'Very high', range: '>=8% TGC', detail: 'highest grade blocks', min: 8, color: '#ef4444'},
  {key: 'high', label: 'High', range: '6-8% TGC', detail: 'priority graphite zone', min: 6, color: '#f97316'},
  {key: 'medium', label: 'Medium', range: '4-6% TGC', detail: 'continuous mineralisation', min: 4, color: '#facc15'},
  {key: 'low', label: 'Low', range: '1-4% TGC', detail: 'lower grade halo', min: 1, color: '#2dd4bf'},
  {key: 'trace', label: 'Trace', range: '<1% TGC', detail: 'background / dilution', min: 0, color: '#7dd3fc'},
] as const;

const ASSAY_INTERVAL_BINS = [
  {key: 'very-high', label: '>8% TGC', detail: 'very high graphite interval', min: 8, color: '#9d00ff'},
  {key: 'high', label: '6-8% TGC', detail: 'high-grade interval', min: 6, color: '#ff1616'},
  {key: 'medium', label: '3-6% TGC', detail: 'mineralised interval', min: 3, color: '#ff9f0a'},
  {key: 'low', label: '1-3% TGC', detail: 'lower-grade halo', min: 1, color: '#fff200'},
] as const;

const THREE_STORY_FLOW = [
  {mode: 'drillholes', label: 'Collars', detail: 'on surface'},
  {mode: 'subsurface', label: 'Cutaway', detail: 'surface opened'},
  {mode: 'resource', label: 'Blocks', detail: 'grade model'},
  {mode: 'metallurgy', label: 'Met', detail: 'sample reveal'},
] as const;

const LITHOLOGY_PRIORITY = ['GRSC', 'Quartz-Feldspathic', 'Khondalite', 'Granulite', 'Marble', 'Schist', 'SOIL'];

const PROJECT_CENTER = {lon: 38.785, lat: -4.813};
const METERS_PER_DEGREE_LAT = 110_540;
const METERS_PER_DEGREE_LON = 111_320 * Math.cos((PROJECT_CENTER.lat * Math.PI) / 180);
const VERTICAL_EXAGGERATION = 1.1;
const LOCAL_VERTICAL_DATUM = 700;
const RESOURCE_SCENE_Y_MIN = -122;
const RESOURCE_SCENE_Y_MAX = 118;
const RESOURCE_BLOCK_SURFACE_CLEARANCE = 32;
const DRILL_TRACE_SURFACE_CLEARANCE = 9;
const DRILL_COLLAR_SURFACE_LIFT = 13;
const SURFACE_Y = 0;
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, -60, 0);

// Large assets are served from Cloudflare R2 in production (set
// NEXT_PUBLIC_ASSET_BASE_URL on Vercel) and from /public locally. This keeps
// the 192 MB high-res texture and other heavy files out of the git repo and
// the Vercel deployment bundle.
const ASSET_BASE_URL = (process.env.NEXT_PUBLIC_ASSET_BASE_URL || '').replace(/\/$/, '');

// Resilient asset loading: prefer Cloudflare R2 (when NEXT_PUBLIC_ASSET_BASE_URL
// is set), but transparently fall back to the local /public copy if R2 is
// missing the object or unreachable. This means the app works whether or not
// every asset has been uploaded to R2 yet — no hard dependency on the bucket.
async function fetchAsset(path: string, init?: RequestInit): Promise<Response> {
  if (ASSET_BASE_URL) {
    try {
      const remote = await fetch(`${ASSET_BASE_URL}${path}`, init);
      if (remote.ok) return remote;
    } catch { /* fall through to local */ }
  }
  return fetch(path, init);
}
async function loadTextureWithFallback(path: string): Promise<THREE.Texture> {
  const loader = new THREE.TextureLoader();
  if (ASSET_BASE_URL) {
    try {
      return await loader.loadAsync(`${ASSET_BASE_URL}${path}`);
    } catch { /* fall through to local */ }
  }
  return loader.loadAsync(path);
}

const TERRAIN_META_PATH = '/terrain_preview_meta.json';
const TERRAIN_HEIGHT_PATH = '/height_preview_1024.bin';
const TERRAIN_TEXTURE_PATHS: Record<AssetQuality, string> = {
  preview: '/topography.png',
  standard: '/terrain_texture_8k.jpg',
  high: '/texture_rgb_8192.png',
};
const TERRAIN_PATCH_WIDTH = 7200;
const TERRAIN_PATCH_DEPTH = 6800;
const METALLURGY_REVEAL_TARGETS = [
  new THREE.Vector3(980, 430, -1040),
  new THREE.Vector3(1280, 500, -1185),
  new THREE.Vector3(1580, 450, -1070),
] as const;
const METALLURGY_REVEAL_COLORS = ['#d96b2b', '#b9954b', '#facc15'] as const;
const DEFAULT_NAV_INSTRUMENT: ThreeNavInstrument = {
  northAngleDeg: 0,
  scaleLabel: '500 m',
  scaleWidth: 112,
  scaleDetail: 'local geology scale',
};
const NICE_SCALE_METERS = [25, 50, 100, 200, 500, 1000, 2000, 5000];

let blockPromise: Promise<ResourceBlock[]> | null = null;
let drillPromise: Promise<DrillSegment[]> | null = null;
const terrainPromises = new Map<AssetQuality, Promise<TangaTerrainResources>>();

try {
  if (!(proj4 as any).defs['EPSG:32737']) {
    proj4.defs('EPSG:32737', '+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs');
  }
} catch {
  // No-op when proj4 already registered the projection.
}

function localPoint(lon: number, lat: number, elevation = 0) {
  return new THREE.Vector3(
    (lon - PROJECT_CENTER.lon) * METERS_PER_DEGREE_LON,
    (elevation - LOCAL_VERTICAL_DATUM) * VERTICAL_EXAGGERATION,
    -(lat - PROJECT_CENTER.lat) * METERS_PER_DEGREE_LAT
  );
}

function localLonLatFromPlane(x: number, planeY: number) {
  return {
    lon: PROJECT_CENTER.lon + x / METERS_PER_DEGREE_LON,
    lat: PROJECT_CENTER.lat + planeY / METERS_PER_DEGREE_LAT,
  };
}

function sampleTerrainAtLocal(resources: TangaTerrainResources, x: number, planeY: number, lift = 0) {
  const {lon, lat} = localLonLatFromPlane(x, planeY);
  const [easting, northing] = proj4('WGS84', 'EPSG:32737', [lon, lat]) as [number, number];
  const {bounds_utm, width, height} = resources.meta;
  const {minX, maxX, minY, maxY} = bounds_utm;
  const u = (easting - minX) / Math.max(1, maxX - minX);
  const v = (maxY - northing) / Math.max(1, maxY - minY);
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return {
      y: SURFACE_Y + surfaceRise(x, planeY) + lift,
      u: clamp(u, 0, 1),
      v: clamp((northing - minY) / Math.max(1, maxY - minY), 0, 1),
    };
  }

  const px = u * (width - 1);
  const py = v * (height - 1);
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const tx = px - x0;
  const ty = py - y0;
  const h00 = resources.heightData[y0 * width + x0];
  const h10 = resources.heightData[y0 * width + x1];
  const h01 = resources.heightData[y1 * width + x0];
  const h11 = resources.heightData[y1 * width + x1];
  const top = h00 * (1 - tx) + h10 * tx;
  const bottom = h01 * (1 - tx) + h11 * tx;
  const terrainHeight = top * (1 - ty) + bottom * ty;

  return {
    y: (terrainHeight - LOCAL_VERTICAL_DATUM) * VERTICAL_EXAGGERATION + lift,
    u: clamp(u, 0, 1),
    v: clamp((northing - minY) / Math.max(1, maxY - minY), 0, 1),
  };
}

function terrainSurfaceY(resources: TangaTerrainResources | null, x: number, planeY: number, lift = 0) {
  if (resources) {
    return sampleTerrainAtLocal(resources, x, planeY, lift).y;
  }

  return SURFACE_Y + surfaceRise(x, planeY) + lift;
}

function resourceBlockCenterY(block: ResourceBlock, voxelScale: number, resources: TangaTerrainResources | null) {
  const blockHeight = block.dz * 1.48 * voxelScale;
  const surfaceY = terrainSurfaceY(resources, block.x, -block.z);
  return Math.min(block.y, surfaceY - RESOURCE_BLOCK_SURFACE_CLEARANCE - blockHeight * 0.5);
}

function drillPointFromCoords(coords: [number, number, number]) {
  return localPoint(Number(coords[0]), Number(coords[1]), Number(coords[2] ?? 0));
}

function drillSurfaceOffsetByHole(segments: DrillSegment[], resources: TangaTerrainResources | null) {
  const collarByHole = new Map<string, DrillSegment>();
  segments.forEach((segment) => {
    const current = collarByHole.get(segment.holeId);
    if (!current || segment.depthFrom < current.depthFrom) collarByHole.set(segment.holeId, segment);
  });

  const offsets = new Map<string, number>();
  collarByHole.forEach((segment, holeId) => {
    const rawCollar = drillPointFromCoords(segment.from);
    const surfaceY = terrainSurfaceY(resources, rawCollar.x, -rawCollar.z);
    offsets.set(holeId, surfaceY - rawCollar.y - DRILL_TRACE_SURFACE_CLEARANCE);
  });
  return offsets;
}

function registeredDrillPoint(
  segment: DrillSegment,
  endpoint: 'from' | 'to',
  resources: TangaTerrainResources | null,
  surfaceOffsets: Map<string, number>
) {
  const point = drillPointFromCoords(segment[endpoint]);
  point.y += surfaceOffsets.get(segment.holeId) ?? 0;
  const surfaceY = terrainSurfaceY(resources, point.x, -point.z);
  point.y = Math.min(point.y, surfaceY - DRILL_TRACE_SURFACE_CLEARANCE);
  return point;
}

function collarSurfacePoint(segment: DrillSegment, resources: TangaTerrainResources | null, lift = DRILL_COLLAR_SURFACE_LIFT) {
  const point = drillPointFromCoords(segment.from);
  point.y = terrainSurfaceY(resources, point.x, -point.z, lift);
  return point;
}

function loadTangaTerrainResources(renderer: THREE.WebGLRenderer, quality: AssetQuality) {
  const existingPromise = terrainPromises.get(quality);
  if (existingPromise) return existingPromise;

  const terrainPromise = Promise.all([
      fetchAsset(TERRAIN_META_PATH, {cache: 'force-cache'}).then(async (response) => {
        if (!response.ok) throw new Error(`Terrain meta failed with ${response.status}`);
        return response.json() as Promise<TerrainMeta>;
      }),
      fetchAsset(TERRAIN_HEIGHT_PATH, {cache: 'force-cache'}).then(async (response) => {
        if (!response.ok) throw new Error(`Height grid failed with ${response.status}`);
        return response.arrayBuffer();
      }),
      loadTextureWithFallback(TERRAIN_TEXTURE_PATHS[quality]),
    ]).then(([meta, heightBuffer, texture]) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy?.() ?? 8, 16);
      texture.needsUpdate = true;
      return {meta, heightData: new Float32Array(heightBuffer), texture, quality};
    }).catch((error) => {
      terrainPromises.delete(quality);
      throw error;
    });

  terrainPromises.set(quality, terrainPromise);
  return terrainPromise;
}

function assayIntervalBin(value: number) {
  return ASSAY_INTERVAL_BINS.find((bin) => value >= bin.min) ?? null;
}

function tgcGradeBin(value: number) {
  return TGC_GRADE_BINS.find((bin) => value >= bin.min) ?? TGC_GRADE_BINS[TGC_GRADE_BINS.length - 1];
}

function lithologyColor(value: string) {
  return new THREE.Color(LITHOLOGY_COLOR_MAP[value] ?? LITHOLOGY_COLOR_MAP.UNKNOWN ?? '#cccccc');
}

function lithologyLabel(value: string) {
  return value && value !== 'nan' ? value : 'Unknown lithology';
}

function drillKey(props: Record<string, any>) {
  return [
    String(props.hole_id ?? ''),
    Number(props.depth_from ?? 0).toFixed(2),
    Number(props.depth_to ?? 0).toFixed(2),
  ].join('|');
}

function classificationColor(value: string) {
  if (value === 'Indicated') return new THREE.Color('#2dd4bf');
  if (value === 'Inferred') return new THREE.Color('#facc15');
  return new THREE.Color('#94a3b8');
}

function resourceFocusLabel(focus: ResourceFocus) {
  const labels: Record<ResourceFocus, string> = {
    Indicated: 'Indicated',
    Inferred: 'Inferred',
    All: 'All',
    HighTGC: 'High TGC',
    LowTGC: 'Low TGC',
    LowUncertainty: 'Low uncertainty',
    HighFlake: 'High flake proxy',
  };
  return labels[focus];
}

function blockMatchesFocus(block: ResourceBlock, focus: ResourceFocus) {
  if (focus === 'All') return true;
  if (focus === 'HighTGC') return block.carbon >= 7;
  if (focus === 'LowTGC') return block.carbon > 0 && block.carbon < 3;
  if (focus === 'LowUncertainty') return block.classification === 'Indicated';
  if (focus === 'HighFlake') return block.classification === 'Indicated' && block.carbon >= 6;
  return block.classification === focus;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatScaleMeters(meters: number) {
  if (meters >= 1000) return `${Number((meters / 1000).toFixed(meters >= 2000 ? 0 : 1))} km`;
  return `${Math.round(meters)} m`;
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function materialList(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

function materialsForObject(object: THREE.Object3D) {
  const materials = new Set<THREE.Material & {opacity?: number; transparent?: boolean}>();
  object.traverse((child) => {
    const material = (child as THREE.Mesh).material;
    materialList(material).forEach((entry) => {
      materials.add(entry as THREE.Material & {opacity?: number; transparent?: boolean});
    });
  });
  return Array.from(materials);
}

function terrainOpacityForView(mode: GeologyMode, view: SurfaceCameraView) {
  if (view === 'bottom') {
    if (mode === 'subsurface') return 1;
    if (mode === 'resource') return 1;
    if (mode === 'metallurgy') return 1;
    return 1;
  }

  if (view === 'top') {
    if (mode === 'subsurface') return 1;
    if (mode === 'resource') return 1;
    if (mode === 'metallurgy') return 1;
    return 1;
  }

  if (mode === 'subsurface') return 1;
  if (mode === 'resource') return 1;
  if (mode === 'metallurgy') return 1;
  return 1;
}

function makeCameraShot(
  from: THREE.Vector3,
  to: THREE.Vector3,
  target: THREE.Vector3,
  options: {
    fov: number;
    lift: number;
    drift: THREE.Vector3;
    yawDrift: number;
    flySeconds: number;
  }
): CameraShot {
  const mid = from.clone().lerp(to, 0.48);
  mid.y += options.lift;
  const targetMid = DEFAULT_CAMERA_TARGET.clone().lerp(target, 0.62);
  targetMid.y += options.lift * 0.12;

  return {
    from,
    mid,
    to,
    targetMid,
    target,
    fov: options.fov,
    drift: options.drift,
    yawDrift: options.yawDrift,
    flySeconds: options.flySeconds,
  };
}

function cameraShotForMode(mode: GeologyMode, lowCamera: boolean): CameraShot {
  if (mode === 'resource') {
    return lowCamera
      ? makeCameraShot(
        new THREE.Vector3(-1720, 520, 2440),
        new THREE.Vector3(860, 150, 1320),
        new THREE.Vector3(40, -170, 20),
        {fov: 35, lift: 78, drift: new THREE.Vector3(46, 12, 34), yawDrift: 0.016, flySeconds: 3.35}
      )
      : makeCameraShot(
        new THREE.Vector3(-2380, 820, 3420),
        new THREE.Vector3(1120, 245, 1880),
        new THREE.Vector3(20, -160, 10),
        {fov: 36, lift: 130, drift: new THREE.Vector3(58, 16, 44), yawDrift: 0.019, flySeconds: 3.55}
      );
  }

  if (mode === 'metallurgy') {
    return lowCamera
      ? makeCameraShot(
        new THREE.Vector3(-1780, 610, 2460),
        new THREE.Vector3(1640, 310, 1320),
        new THREE.Vector3(730, 40, -830),
        {fov: 36, lift: 110, drift: new THREE.Vector3(52, 16, 38), yawDrift: 0.014, flySeconds: 3.2}
      )
      : makeCameraShot(
        new THREE.Vector3(-2340, 1040, 3340),
        new THREE.Vector3(2020, 500, 1900),
        new THREE.Vector3(700, 62, -800),
        {fov: 37, lift: 150, drift: new THREE.Vector3(62, 18, 46), yawDrift: 0.018, flySeconds: 3.4}
      );
  }

  if (mode === 'subsurface') {
    return lowCamera
      ? makeCameraShot(
        new THREE.Vector3(1780, 520, 2300),
        new THREE.Vector3(890, 150, 1170),
        new THREE.Vector3(80, -330, 20),
        {fov: 35, lift: 70, drift: new THREE.Vector3(34, 10, 28), yawDrift: 0.01, flySeconds: 3.55}
      )
      : makeCameraShot(
        new THREE.Vector3(2460, 960, 3220),
        new THREE.Vector3(1330, 280, 1770),
        new THREE.Vector3(40, -285, 0),
        {fov: 36, lift: 125, drift: new THREE.Vector3(42, 12, 34), yawDrift: 0.012, flySeconds: 3.65}
      );
  }

  return lowCamera
    ? makeCameraShot(
      new THREE.Vector3(760, -1180, 1640),
      new THREE.Vector3(420, -1260, 1280),
      new THREE.Vector3(0, -250, -70),
      {fov: 47, lift: 28, drift: new THREE.Vector3(20, 6, 18), yawDrift: 0.006, flySeconds: 1.8}
    )
    : makeCameraShot(
      new THREE.Vector3(-2180, 820, 3180),
      new THREE.Vector3(1220, 285, 1840),
      new THREE.Vector3(100, -125, -90),
      {fov: 36, lift: 125, drift: new THREE.Vector3(52, 14, 40), yawDrift: 0.019, flySeconds: 3.45}
    );
}

function projectedCalloutPlacement(
  callout: ThreeCallout,
  anchorPixelX: number,
  anchorPixelY: number,
  width: number,
  height: number
) {
  const side = anchorPixelX > width * 0.58 ? 'left' : 'right';
  const xOffset = side === 'left' ? -178 : 178;
  let yOffset = -42;

  if (anchorPixelY < 190) yOffset = 112;
  if (anchorPixelY > height - 220) yOffset = -118;
  if (callout.id === 'blocks') yOffset = -132;
  if (callout.id === 'grade') yOffset = 78;
  if (callout.side === 'top') yOffset = -136;
  if (callout.side === 'bottom') yOffset = 118;

  return {
    side,
    boxPixelX: clamp(anchorPixelX + xOffset, 132, width - 132),
    boxPixelY: clamp(anchorPixelY + yOffset, 104, height - 112),
  } as const;
}

function threeCallouts(mode: GeologyMode, focus: ResourceFocus): ThreeCallout[] {
  if (mode === 'drillholes') {
    return [
      {id: 'collars', label: 'Drillhole collars', detail: 'Surface control points feeding the 3D assay trace', x: 47, y: 28, tone: '#facc15', anchor: [-820, 30, 540], side: 'right'},
      {id: 'assays', label: 'Carbon intervals', detail: 'Red-yellow traces mark the stronger TGC intervals', x: 61, y: 52, tone: '#ef4444', anchor: [280, -230, -120], side: 'left'},
    ];
  }
  if (mode === 'subsurface') {
    return [
      {id: 'cutaway', label: 'Transparent surface', detail: 'Glass terrain stays above the opened subsurface view', x: 40, y: 31, tone: '#7dd3fc', anchor: [-780, 36, -650], side: 'right'},
      {id: 'volume', label: 'Geology volume', detail: 'Drillholes remain spatially registered below surface', x: 64, y: 58, tone: '#2dd4bf', anchor: [360, -300, 190], side: 'left'},
    ];
  }
  if (mode === 'resource') {
    return [
      {id: 'blocks', label: `${resourceFocusLabel(focus)} blocks`, detail: 'Only the requested resource population is emphasized', x: 57, y: 35, tone: '#ef4444', anchor: [420, -165, 420], side: 'left'},
      {id: 'grade', label: 'TGC color ramp', detail: 'Every block is shaded by graphite grade', x: 36, y: 62, tone: '#facc15', anchor: [-520, -140, 700], side: 'right'},
    ];
  }
  return [
    {id: 'samples', label: 'Sample transfer', detail: 'Selected drill intervals pulse into the lab circuit', x: 44, y: 36, tone: '#d96b2b', anchor: [940, 520, -1130], side: 'right'},
    {id: 'recoveries', label: 'Data reveal', detail: '>97% TC concentrate with recovery metrics', x: 62, y: 58, tone: '#b9954b', anchor: [1540, 350, -1120], side: 'left'},
  ];
}

function drillholeLegend(mode: GeologyMode): ThreeLegendItem[] {
  if (mode === 'resource') {
    return [
      {label: 'Drill assays', detail: 'purple intervals kept as support', tone: '#c084fc'},
      {label: 'Collars', detail: 'hole starts tied to terrain', tone: '#eaffff'},
      {label: 'Traces', detail: 'black drill paths through block model', tone: '#111111'},
    ];
  }
  if (mode === 'metallurgy') {
    return [
      {label: 'Sample pulse', detail: 'Intervals moving to lab circuit', tone: '#facc15'},
      {label: 'Drill traces', detail: 'Assay support in 3D space', tone: '#a7f3d0'},
      {label: 'Recovery outlier', detail: 'TDM004 carbonate effect', tone: '#ef4444'},
    ];
  }
  if (mode === 'subsurface') {
    return [
      {label: '>8% TGC', detail: 'Purple assay intervals', tone: '#9d00ff'},
      {label: 'GRSC lithology', detail: 'Host-unit sleeve around traces', tone: '#2dd4bf'},
      {label: 'Collars', detail: 'One collar per drillhole on surface', tone: '#eaffff'},
    ];
  }
  return [
    {label: '>8% TGC', detail: 'Very high assay interval', tone: '#9d00ff'},
    {label: '6-8% TGC', detail: 'High assay interval', tone: '#ff1616'},
    {label: '3-6% TGC', detail: 'Mineralised assay interval', tone: '#ff9f0a'},
    {label: 'Collars', detail: 'Surface start points', tone: '#eaffff'},
  ];
}

function parseResourceBinary(buffer: ArrayBuffer) {
  const values = new Float32Array(buffer);
  const stride = 6;
  const records = Math.floor(values.length / stride);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let index = 0; index < records; index += 1) {
    const offset = index * stride;
    const x = values[offset];
    const y = values[offset + 1];
    const z = values[offset + 2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const centerX = Number.isFinite(minX + maxX) ? (minX + maxX) / 2 : 0;
  const centerZ = Number.isFinite(minZ + maxZ) ? (minZ + maxZ) / 2 : 0;
  const resourceHeight = Math.max(1, maxY - minY);
  const blocks: ResourceBlock[] = [];

  for (let index = 0; index < records; index += 1) {
    const offset = index * stride;
    const x = values[offset];
    const y = values[offset + 1];
    const z = values[offset + 2];
    const red = values[offset + 3];
    const green = values[offset + 4];
    const blue = values[offset + 5];
    if (![x, y, z, red, green, blue].every(Number.isFinite)) continue;

    blocks.push({
      x: x - centerX,
      y: RESOURCE_SCENE_Y_MIN + ((y - minY) / resourceHeight) * (RESOURCE_SCENE_Y_MAX - RESOURCE_SCENE_Y_MIN),
      z: -(z - centerZ),
      dx: 28,
      dy: 38,
      dz: 24,
      classification: green >= 0.55 ? 'Indicated' : 'Inferred',
      carbon: Math.max(0, Math.min(10, blue * 10)),
      color: [
        Math.max(0.08, Math.min(1, red)),
        Math.max(0.1, Math.min(1, green)),
        Math.max(0.12, Math.min(1, blue)),
      ],
    });
  }

  return blocks;
}

function parseBlockGeoJson(payload: any) {
  const features = Array.isArray(payload.features) ? payload.features : [];

  return features.map((feature: any) => {
    const coords = feature.geometry?.coordinates ?? [];
    const props = feature.properties ?? {};
    const position = localPoint(Number(coords[0]), Number(coords[1]), Number(coords[2] ?? 0));
    const classification = String(props.RescCalc ?? props.classification ?? 'Unknown');
    const carbon = Number(props['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'] ?? 0);
    const color = classificationColor(classification);

    return {
      x: position.x,
      y: position.y,
      z: position.z,
      dx: Math.max(18, Math.min(95, Number(props.dX ?? 32))),
      dy: Math.max(18, Math.min(95, Number(props.dY ?? 32))),
      dz: Math.max(8, Math.min(80, Number(props.dZ ?? 18))),
      classification,
      carbon,
      color: [color.r, color.g, color.b] as [number, number, number],
    };
  }).filter((block: ResourceBlock) => Number.isFinite(block.x) && Number.isFinite(block.z));
}

function loadBlocks() {
  if (!blockPromise) {
    blockPromise = fetchAsset('/resource_model.bin', {cache: 'force-cache'})
      .then((response) => {
        if (!response.ok) throw new Error(`Resource binary failed with ${response.status}`);
        return response.arrayBuffer();
      })
      .then(parseResourceBinary)
      .catch(() => fetch('/api/block-model', {cache: 'force-cache'})
        .then((response) => {
          if (!response.ok) throw new Error(`Block model failed with ${response.status}`);
          return response.json();
        })
        .then(parseBlockGeoJson));
  }
  return blockPromise;
}

function loadDrillholes() {
  if (!drillPromise) {
    drillPromise = Promise.all([
      fetchAsset('/assay_data.geojson', {cache: 'force-cache'})
        .then((response) => {
          if (!response.ok) throw new Error(`Drillholes failed with ${response.status}`);
          return response.json();
        }),
      fetchAsset('/lithology_data.geojson', {cache: 'force-cache'})
        .then((response) => response.ok ? response.json() : null)
        .catch(() => null),
    ]).then(([assayPayload, lithologyPayload]) => {
      const lithologyFeatures = Array.isArray(lithologyPayload?.features) ? lithologyPayload.features : [];
      const lithologyByInterval = new Map<string, string>();
      lithologyFeatures.forEach((feature: any) => {
        const props = feature.properties ?? {};
        lithologyByInterval.set(drillKey(props), String(props.lithology ?? 'UNKNOWN'));
      });

      const features = Array.isArray(assayPayload.features) ? assayPayload.features : [];
      return features.map((feature: any) => {
        const coords = feature.geometry?.coordinates ?? [];
        const props = feature.properties ?? {};
        return {
          from: coords[0],
          to: coords[1],
          carbon: Number(props.graphitic_carbon ?? 0),
          holeId: String(props.hole_id ?? 'Unknown hole'),
          depthFrom: Number(props.depth_from ?? 0),
          depthTo: Number(props.depth_to ?? 0),
          lithology: lithologyByInterval.get(drillKey(props)) ?? 'UNKNOWN',
        };
      }).filter((segment: DrillSegment) => Array.isArray(segment.from) && Array.isArray(segment.to));
    });
  }
  return drillPromise;
}

function drillholeCount(segments: DrillSegment[]) {
  return new Set(segments.map((segment) => segment.holeId)).size;
}

function sampleSegmentsAcrossHoles(segments: DrillSegment[], maxSegments: number) {
  const byHole = new Map<string, DrillSegment[]>();
  segments.forEach((segment) => {
    byHole.set(segment.holeId, [...(byHole.get(segment.holeId) ?? []), segment]);
  });

  const holeGroups = Array.from(byHole.values()).map((group) => group
    .slice()
    .sort((a, b) => a.depthFrom - b.depthFrom));
  const perHole = Math.max(1, Math.floor(maxSegments / Math.max(1, holeGroups.length)));
  const sampled: DrillSegment[] = [];

  holeGroups.forEach((group) => {
    const count = Math.min(group.length, perHole);
    if (count <= 1) {
      sampled.push(group[0]);
      return;
    }

    const seen = new Set<number>();
    for (let index = 0; index < count; index += 1) {
      const sourceIndex = Math.round(index * (group.length - 1) / (count - 1));
      if (seen.has(sourceIndex)) continue;
      seen.add(sourceIndex);
      sampled.push(group[sourceIndex]);
    }
  });

  return sampled;
}

function drillSegmentsForMode(segments: DrillSegment[], mode: GeologyMode) {
  if (mode === 'drillholes') {
    return segments.length <= 5600 ? segments : sampleSegmentsAcrossHoles(segments, 5600);
  }
  if (mode === 'metallurgy') {
    return sampleSegmentsAcrossHoles(segments, 3200);
  }
  if (mode === 'subsurface') {
    return sampleSegmentsAcrossHoles(segments, 2400);
  }
  return sampleSegmentsAcrossHoles(segments, 1800);
}

function addStratigraphy(stage: THREE.Group, mode: GeologyMode) {
  if (mode !== 'subsurface') return;

  const bands = [
    {y: -210, color: '#213047', opacity: mode === 'subsurface' ? 0.1 : 0.075},
    {y: -340, color: '#234037', opacity: mode === 'subsurface' ? 0.085 : 0.064},
    {y: -480, color: '#4a3b28', opacity: mode === 'subsurface' ? 0.075 : 0.058},
    {y: -620, color: '#172033', opacity: mode === 'subsurface' ? 0.082 : 0.06},
  ];

  bands.forEach((band, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(5200 - index * 260, 18, 5200 - index * 220),
      new THREE.MeshStandardMaterial({
        color: band.color,
        roughness: 0.88,
        metalness: 0.05,
        transparent: true,
        opacity: band.opacity,
      })
    );
    mesh.position.y = band.y;
    stage.add(mesh);
  });
}

function addResourceGhost(stage: THREE.Group, mode: GeologyMode) {
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: mode === 'resource' ? 0.22 : 0.34,
    depthWrite: false,
  });

  [0, 1, 2].forEach((index) => {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1110 + index * 120, 2.4, 8, 144), ringMaterial.clone());
    halo.rotation.x = Math.PI / 2;
    halo.scale.set(0.42 + index * 0.025, 1, 1.76 - index * 0.08);
    halo.position.set(0, SURFACE_Y + 20 + index * 7, 0);
    stage.add(halo);
  });
}

function surfaceRise(x: number, y: number) {
  return (
    Math.sin(x * 0.0038 + y * 0.0014) * 36 +
    Math.cos(y * 0.0032) * 22 +
    Math.sin((x + y) * 0.0022) * 16
  );
}

function surfaceColorAt(x: number, y: number, rise: number, mode: GeologyMode) {
  const heightT = clamp((rise + 78) / 156, 0, 1);
  const texture = (
    Math.sin(x * 0.007) +
    Math.cos(y * 0.006) +
    Math.sin((x - y) * 0.004) +
    Math.sin((x + y) * 0.013) * 0.34
  ) / 3.34;
  const low = new THREE.Color(mode === 'resource' || mode === 'metallurgy' ? '#3e382d' : '#4a4538');
  const mid = new THREE.Color(mode === 'resource' || mode === 'metallurgy' ? '#9d8a69' : '#af9c78');
  const high = new THREE.Color(mode === 'resource' || mode === 'metallurgy' ? '#efe0c1' : '#f3e3bd');
  const color = low.clone().lerp(mid, clamp(heightT + texture * 0.18, 0, 1));
  color.lerp(high, clamp((heightT - 0.32) * 1.8, 0, 0.72));
  return color;
}

function terrainFootprintScore(x: number, y: number) {
  const bend = Math.sin(x * 0.00072) * 320 + Math.sin(x * 0.00152 + 1.35) * 112;
  const width = TERRAIN_PATCH_DEPTH * 0.43 + Math.cos(x * 0.0009) * 180 + Math.sin((x + y) * 0.00048) * 110;
  const length = TERRAIN_PATCH_WIDTH * 0.46 + Math.sin(y * 0.00078) * 220;
  const nx = x / length;
  const ny = (y - bend) / width;
  return nx * nx + ny * ny;
}

function createTerrainEdgeAlphaTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(size, size);
  for (let row = 0; row < size; row += 1) {
    const planeY = (row / (size - 1) - 0.5) * TERRAIN_PATCH_DEPTH;
    for (let column = 0; column < size; column += 1) {
      const x = (column / (size - 1) - 0.5) * TERRAIN_PATCH_WIDTH;
      const score = terrainFootprintScore(x, planeY);
      const ragged = (
        Math.sin(x * 0.006 + planeY * 0.002) +
        Math.cos(planeY * 0.005 - x * 0.0015) +
        Math.sin((x + planeY) * 0.0032)
      ) * 0.018;
      const edge = clamp((score + ragged - 0.74) / 0.28, 0, 1);
      const alpha = Math.round((1 - edge * edge * (3 - 2 * edge)) * 255);
      const offset = (row * size + column) * 4;
      image.data[offset] = 255;
      image.data[offset + 1] = 255;
      image.data[offset + 2] = 255;
      image.data[offset + 3] = alpha;
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createTerrainPatchGeometry(mode: GeologyMode) {
  const segmentsX = 176;
  const segmentsY = 140;
  const width = TERRAIN_PATCH_WIDTH;
  const depth = TERRAIN_PATCH_DEPTH;
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= segmentsY; row += 1) {
    const planeY = (row / segmentsY - 0.5) * depth;
    for (let column = 0; column <= segmentsX; column += 1) {
      const x = (column / segmentsX - 0.5) * width;
      const rise = surfaceRise(x, planeY);
      const color = surfaceColorAt(x, planeY, rise, mode);
      positions.push(x, SURFACE_Y + rise, -planeY);
      colors.push(color.r, color.g, color.b);
      uvs.push(column / segmentsX, row / segmentsY);
    }
  }

  const vertexIndex = (column: number, row: number) => row * (segmentsX + 1) + column;
  for (let row = 0; row < segmentsY; row += 1) {
    const cy = ((row + 0.5) / segmentsY - 0.5) * depth;
    for (let column = 0; column < segmentsX; column += 1) {
      const cx = ((column + 0.5) / segmentsX - 0.5) * width;
            const a = vertexIndex(column, row);
      const b = vertexIndex(column + 1, row);
      const c = vertexIndex(column + 1, row + 1);
      const d = vertexIndex(column, row + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createTexturedTerrainPatchGeometry(resources: TangaTerrainResources, mode: GeologyMode) {
  // Higher segmentation captures fine relief so silhouettes no longer look
  // faceted at close cameras. 320×256 ≈ 82k verts — comfortable for modern
  // GPUs and matches the 1024² heightmap resolution more faithfully.
  const segmentsX = 320;
  const segmentsY = 256;
  const width = TERRAIN_PATCH_WIDTH;
  const depth = TERRAIN_PATCH_DEPTH;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= segmentsY; row += 1) {
    const planeY = (row / segmentsY - 0.5) * depth;
    for (let column = 0; column <= segmentsX; column += 1) {
      const x = (column / segmentsX - 0.5) * width;
      const sample = sampleTerrainAtLocal(resources, x, planeY, mode === 'subsurface' ? 18 : 4);
      positions.push(x, sample.y, -planeY);
      uvs.push(sample.u, sample.v);
    }
  }

  const vertexIndex = (column: number, row: number) => row * (segmentsX + 1) + column;
  for (let row = 0; row < segmentsY; row += 1) {
    const cy = ((row + 0.5) / segmentsY - 0.5) * depth;
    for (let column = 0; column < segmentsX; column += 1) {
      const cx = ((column + 0.5) / segmentsX - 0.5) * width;
            const a = vertexIndex(column, row);
      const b = vertexIndex(column + 1, row);
      const c = vertexIndex(column + 1, row + 1);
      const d = vertexIndex(column, row + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addSubsurfaceGlassWindow(stage: THREE.Group, mode: GeologyMode) {
  if (mode !== 'subsurface') return;

  const roofMaterial = new THREE.MeshBasicMaterial({
    color: 0xa7f3ff,
    transparent: true,
    opacity: 0.095,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(3160, 3860, 1, 1), roofMaterial);
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = SURFACE_Y + 34;
  roof.renderOrder = 3;
  stage.add(roof);

  const curtainMaterial = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.065,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const curtainSpecs = [
    {size: [3160, 590], position: [0, -250, -1930], rotation: [0, 0, 0]},
    {size: [3160, 590], position: [0, -250, 1930], rotation: [0, 0, 0]},
    {size: [3860, 590], position: [-1580, -250, 0], rotation: [0, Math.PI / 2, 0]},
    {size: [3860, 590], position: [1580, -250, 0], rotation: [0, Math.PI / 2, 0]},
  ] as const;

  curtainSpecs.forEach((spec) => {
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(spec.size[0], spec.size[1]), curtainMaterial.clone());
    curtain.position.set(spec.position[0], spec.position[1], spec.position[2]);
    curtain.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
    curtain.renderOrder = 2;
    stage.add(curtain);
  });

}

function makeDrillTubeMatrix(start: THREE.Vector3, end: THREE.Vector3, matrix: THREE.Matrix4, radius: number) {
  const direction = end.clone().sub(start);
  const length = Math.max(1, direction.length());
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  matrix.compose(midpoint, quaternion, new THREE.Vector3(radius, length, radius));
}

function formatDepth(segment: DrillSegment) {
  return `${segment.depthFrom.toFixed(1)}-${segment.depthTo.toFixed(1)} m`;
}

function drillTooltip(segment: DrillSegment, title: string, tone: string, extraRows: string[] = []): DrillPickInfo {
  return {
    title,
    tone,
    rows: [
      `Hole ${segment.holeId}`,
      `Depth ${formatDepth(segment)}`,
      `TGC ${segment.carbon.toFixed(2)}%`,
      `Lithology ${lithologyLabel(segment.lithology)}`,
      ...extraRows,
    ],
  };
}

function blockTooltip(block: ResourceBlock): DrillPickInfo {
  const bin = tgcGradeBin(block.carbon);
  return {
    title: `${bin.label} block`,
    tone: bin.color,
    rows: [
      `${block.carbon.toFixed(2)}% TGC proxy`,
      `${block.classification} resource class`,
      `${Math.round(block.dx)} x ${Math.round(block.dy)} x ${Math.round(block.dz)} m cell`,
    ],
  };
}

function makeCollarLabelSprite(text: string, opacity: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 82;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '700 28px Inter, Arial, sans-serif';
  context.textBaseline = 'middle';
  const metrics = context.measureText(text);
  const panelWidth = Math.min(238, Math.max(94, metrics.width + 34));
  const x = (canvas.width - panelWidth) / 2;

  context.fillStyle = `rgba(8, 10, 14, ${0.32 * opacity})`;
  context.strokeStyle = `rgba(255, 255, 255, ${0.28 * opacity})`;
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(x, 18, panelWidth, 38, 8);
  context.fill();
  context.stroke();

  context.fillStyle = `rgba(255, 255, 255, ${0.86 * opacity})`;
  context.textAlign = 'center';
  context.fillText(text, canvas.width / 2, 37);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(panelWidth * 1.15, 42, 1);
  sprite.renderOrder = 14;
  return sprite;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child: any) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((material: any) => {
        material?.map?.dispose?.();
        material?.alphaMap?.dispose?.();
        material?.dispose?.();
      });
    } else {
      child.material?.map?.dispose?.();
      child.material?.alphaMap?.dispose?.();
      child.material?.dispose?.();
    }
  });
}

export default function TangaThreeGeologyScene({
  visible,
  mode,
  resourceFocus,
  rotationKey,
  cameraDropKey,
  cameraCommand,
  assetQuality = 'preview',
  onLoadState,
}: TangaThreeGeologySceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const rotationKeyRef = useRef(rotationKey);
  const cameraCommandRef = useRef<ThreeCameraCommand | null>(cameraCommand ?? null);
  const cameraCommandHandlerRef = useRef<((command: ThreeCameraCommand) => void) | null>(null);
  const consumedCameraCommandIdRef = useRef(0);
  const [status, setStatus] = useState('Preparing geology scene');
  const [projectedFrame, setProjectedFrame] = useState<ProjectedCalloutFrame>({width: 0, height: 0, items: []});
  const [navInstrument, setNavInstrument] = useState<ThreeNavInstrument>(DEFAULT_NAV_INSTRUMENT);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);

  useEffect(() => {
    rotationKeyRef.current = rotationKey;
  }, [rotationKey]);

  useEffect(() => {
    cameraCommandRef.current = cameraCommand ?? null;
    if (!visible || !cameraCommand) return;
    cameraCommandHandlerRef.current?.(cameraCommand);
  }, [cameraCommand, visible]);

  useEffect(() => {
    if (!visible || !hostRef.current) return;

    let cancelled = false;
    const sceneStartedAt = performance.now();
    const reportLoadState = (
      sceneState: SceneLoadState,
      terrainState: SceneLoadState,
      quality: AssetQuality,
      message: string
    ) => {
      onLoadState?.({
        scene: sceneState,
        terrain: terrainState,
        quality,
        message,
        elapsedMs: Math.round(performance.now() - sceneStartedAt),
      });
    };

    reportLoadState('loading', 'loading', assetQuality, 'Drawing preview surface');
    setProjectedFrame({width: 0, height: 0, items: []});
    setNavInstrument(DEFAULT_NAV_INSTRUMENT);
    setHoverTooltip(null);
    const host = hostRef.current;
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(0x15202c, 4600, 12000);

    const depthGridGroup = new THREE.Group();
    depthGridGroup.name = 'depth-grid';
    depthGridGroup.renderOrder = -100;
    scene.add(depthGridGroup);

    const addDepthGrid = () => {
      const gridColor = new THREE.Color('#8ea3c0');
      const axisColor = new THREE.Color('#f8fcff');
      const majorColor = new THREE.Color('#dfe9f6');
      const gridMaterial = new THREE.LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.14, depthWrite: false });
      const axisMaterial = new THREE.LineBasicMaterial({ color: axisColor, transparent: true, opacity: 0.96, depthWrite: false });
      const majorMaterial = new THREE.LineBasicMaterial({ color: majorColor, transparent: true, opacity: 0.76, depthWrite: false });

      const width = TERRAIN_PATCH_WIDTH;
      const depth = TERRAIN_PATCH_DEPTH;
      const xMin = -width / 2;
      const xMax = width / 2;
      const zMin = -depth / 2;
      const zMax = depth / 2;
      const yTop = SURFACE_Y - 160;
      const yBottom = SURFACE_Y - 420;
      const xTicks = [405.9, 406.0, 406.2, 406.4, 406.7];
      const zTicks = [7.5149, 7.5151];
      const yTicks = [0, -35, -74, -113, -152, -191, -230].map((v) => SURFACE_Y + v);
      const crossSteps = [0, 0.25, 0.5, 0.75, 1];
      const lineSteps = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];

      const addLine = (points: THREE.Vector3[], material: THREE.LineBasicMaterial, renderOrder = -2) => {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material.clone());
        line.renderOrder = renderOrder;
        depthGridGroup.add(line);
      };

      lineSteps.forEach((t) => {
        const x = xMin + (xMax - xMin) * t;
        addLine([new THREE.Vector3(x, yBottom, zMin), new THREE.Vector3(x, yBottom, zMax)], t === 0 || t === 1 ? majorMaterial : gridMaterial);
      });

      lineSteps.forEach((t) => {
        const z = zMin + (zMax - zMin) * t;
        addLine([new THREE.Vector3(xMin, yBottom, z), new THREE.Vector3(xMax, yBottom, z)], t === 0 || t === 1 ? majorMaterial : gridMaterial);
      });

      addLine([new THREE.Vector3(xMin, yBottom, zMin), new THREE.Vector3(xMax, yBottom, zMin)], axisMaterial, -1);
      addLine([new THREE.Vector3(xMax, yBottom, zMin), new THREE.Vector3(xMax, yBottom, zMax)], axisMaterial, -1);
      addLine([new THREE.Vector3(xMax, yBottom, zMax), new THREE.Vector3(xMin, yBottom, zMax)], axisMaterial, -1);
      addLine([new THREE.Vector3(xMin, yBottom, zMax), new THREE.Vector3(xMin, yBottom, zMin)], axisMaterial, -1);
      yTicks.forEach((y, index) => {
        const tickLength = index === 0 || index === yTicks.length - 1 || index === 3 ? 42 : 28;
        addLine([
          new THREE.Vector3(xMax, y, zMax),
          new THREE.Vector3(xMax + tickLength, y, zMax),
        ], index === 0 || index === yTicks.length - 1 || index === 3 ? majorMaterial : gridMaterial, -1);
      });

      const makeLabelTexture = (textValue: string, widthPx = 280, heightPx = 82, align: CanvasTextAlign = 'left') => {
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pad = 7;
        const radius = 10;
        ctx.fillStyle = 'rgba(5, 8, 14, 0.36)';
        ctx.strokeStyle = 'rgba(233, 241, 252, 0.035)';
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(pad + radius, pad);
        ctx.arcTo(canvas.width - pad, pad, canvas.width - pad, canvas.height - pad, radius);
        ctx.arcTo(canvas.width - pad, canvas.height - pad, pad, canvas.height - pad, radius);
        ctx.arcTo(pad, canvas.height - pad, pad, pad, radius);
        ctx.arcTo(pad, pad, canvas.width - pad, pad, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.font = '600 19px Inter, Arial, sans-serif';
        ctx.fillStyle = '#f6fbff';
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
        ctx.shadowBlur = 1;
        ctx.fillText(textValue, align === 'center' ? widthPx / 2 : pad + 8, heightPx / 2 + 1);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.anisotropy = 4;
        return texture;
      };
      const makeSprite = (textValue: string, position: THREE.Vector3, scale = 132, widthPx = 240, heightPx = 72, align: CanvasTextAlign = 'left') => {
        const texture = makeLabelTexture(textValue, widthPx, heightPx, align);
        if (!texture) return;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, opacity: 1 });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(scale, scale * 0.30, 1);
        depthGridGroup.add(sprite);
      };
      makeSprite('EASTING', new THREE.Vector3(xMin + width * 0.018, yBottom - 20, zMin + depth * 0.03), 112, 196, 58, 'left');
      xTicks.forEach((tick, index) => {
        const pos = xMin + width * (0.08 + (0.72 * index) / (xTicks.length - 1));
        makeSprite(`${tick.toFixed(1)}k`, new THREE.Vector3(pos, yBottom - 10, zMin + depth * 0.01), 82, 108, 52, 'center');
      });
      makeSprite('NORTHING', new THREE.Vector3(xMax + 30, yBottom - 20, zMin + depth * 0.14), 112, 196, 58, 'left');
      zTicks.forEach((tick, index) => {
        const pos = zMin + depth * (0.23 + 0.24 * index);
        makeSprite(`${tick.toFixed(4)}M`, new THREE.Vector3(xMax + 30, yBottom - 10, pos), 82, 112, 52, 'center');
      });
      makeSprite('ELEVATION', new THREE.Vector3(xMax + 24, SURFACE_Y + 20, zMax), 112, 196, 58, 'left');
      makeSprite('0', new THREE.Vector3(xMax + 36, SURFACE_Y, zMax), 68, 68, 42, 'center');
      yTicks.forEach((y, index) => {
        const elevated = index === 0 || index === yTicks.length - 1 || index === 3;
        const label = `${Math.round(y - SURFACE_Y)}`;
        const posY = y - (index === 0 ? 2 : index === yTicks.length - 1 ? 1 : 0);
        makeSprite(label, new THREE.Vector3(xMax + 36, posY, zMax), elevated ? 74 : 66, 70, 42, 'center');
      });
    };
    addDepthGrid();

    const lowCamera = cameraDropKey > 0 || cameraCommandRef.current?.action === 'bottomView';
    const cameraShot = cameraShotForMode(mode, lowCamera);
    const calloutsForProjection = threeCallouts(mode, resourceFocus);
    const calloutAnchors = new Map<string, THREE.Vector3>();
    const terrainSurfaceMaterials: THREE.MeshStandardMaterial[] = [];
    let surfaceCameraView: SurfaceCameraView = lowCamera ? 'bottom' : 'default';
    const applyTerrainSurfaceView = () => {
      const opacity = terrainOpacityForView(mode, surfaceCameraView);
      terrainSurfaceMaterials.forEach((material) => {
        material.visible = true;
        material.opacity = opacity;
        material.transparent = false;
        material.depthWrite = true;
        material.needsUpdate = true;
      });
    };
    const registerTerrainSurfaceMaterial = (material: THREE.MeshStandardMaterial) => {
      terrainSurfaceMaterials.push(material);
      applyTerrainSurfaceView();
    };
    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 1, 12000);
    camera.fov = cameraShot.fov;
    camera.position.copy(cameraShot.from);
    camera.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Slightly lower exposure lets colors resolve richer instead of washed;
    // a CSS saturation/contrast filter on the host adds the "vivid" pop.
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    // Image-based environment lighting: gives PBR surfaces (terrain, collars,
    // blocks) real reflections/ambient so they read rich instead of matte-gray.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environmentTexture;
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.rotateSpeed = 0.86;
    controls.zoomSpeed = 1.02;
    controls.panSpeed = 0.58;
    controls.screenSpacePanning = true;
    controls.minPolarAngle = 0.04;
    controls.maxPolarAngle = Math.PI - 0.04;
    controls.target.copy(DEFAULT_CAMERA_TARGET);
    controls.maxDistance = 6200;
    controls.minDistance = 420;
    controls.update();
    controlsRef.current = controls;
    let userTookControl = false;
    const onControlStart = () => {
      userTookControl = true;
      renderer.domElement.classList.add('is-interacting');
    };
    const onControlEnd = () => renderer.domElement.classList.remove('is-interacting');
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    const clock = new THREE.Clock();
    type CameraTween = {
      start: number;
      duration: number;
      fromPosition: THREE.Vector3;
      toPosition: THREE.Vector3;
      fromTarget: THREE.Vector3;
      toTarget: THREE.Vector3;
      fromFov: number;
      toFov: number;
    };
    type RotationTween = {
      start: number;
      duration: number;
      from: number;
      to: number;
    };
    let cameraTween: CameraTween | null = null;
    let rotationTween: RotationTween | null = null;
    let verticalRotationTween: RotationTween | null = null;
    let stageBaseRotation = rotationKeyRef.current * Math.PI / 2;
    let stageVerticalBaseRotation = 0;

    const scheduleCameraTween = (toPosition: THREE.Vector3, toTarget: THREE.Vector3, duration = 1.35, toFov = camera.fov) => {
      userTookControl = true;
      cameraTween = {
        start: clock.getElapsedTime(),
        duration,
        fromPosition: camera.position.clone(),
        toPosition,
        fromTarget: controls.target.clone(),
        toTarget,
        fromFov: camera.fov,
        toFov,
      };
    };

    const consumeCameraCommand = (command: ThreeCameraCommand) => {
      if (command.id <= consumedCameraCommandIdRef.current) return;
      consumedCameraCommandIdRef.current = command.id;

      const target = controls.target.clone();
      const direction = camera.position.clone().sub(target);
      if (direction.lengthSq() < 1) direction.copy(cameraShot.to).sub(cameraShot.target);
      const currentDistance = clamp(direction.length(), controls.minDistance, controls.maxDistance);
      const normalizedDirection = direction.normalize();

      if (command.action === 'zoomIn' || command.action === 'zoomOut') {
        const nextDistance = command.action === 'zoomIn'
          ? clamp(currentDistance * 0.58, controls.minDistance, controls.maxDistance)
          : clamp(currentDistance * 1.45, controls.minDistance, controls.maxDistance);
        const nextTarget = target.clone();
        const nextPosition = nextTarget.clone().add(normalizedDirection.multiplyScalar(nextDistance));
        scheduleCameraTween(
          nextPosition,
          nextTarget,
          command.action === 'zoomIn' ? 1.05 : 1.18,
          clamp(camera.fov + (command.action === 'zoomIn' ? -3 : 4), 30, 54)
        );
        setStatus(command.action === 'zoomIn' ? 'Voice camera zoomed into the geology model' : 'Voice camera pulled back from the geology model');
        return;
      }

      if (command.action === 'bottomView') {
        surfaceCameraView = 'bottom';
        applyTerrainSurfaceView();
        const bottomTarget = new THREE.Vector3(0, mode === 'resource' ? -260 : -250, -70);
        const bottomPosition = new THREE.Vector3(
          mode === 'drillholes' ? 420 : 880,
          mode === 'resource' ? -1080 : mode === 'drillholes' ? -1260 : -980,
          mode === 'drillholes' ? 1280 : 1540
        );
        scheduleCameraTween(bottomPosition, bottomTarget, 1.65, 47);
        setStatus('Voice camera moved below the surface');
        return;
      }

      if (command.action === 'tiltUp') {
        surfaceCameraView = 'top';
        applyTerrainSurfaceView();
        const topTarget = new THREE.Vector3(0, mode === 'resource' ? -80 : 0, -40);
        const topPosition = new THREE.Vector3(120, mode === 'resource' ? 2100 : 1700, 520);
        scheduleCameraTween(topPosition, topTarget, 1.45, 42);
        setStatus('Voice camera moved above the geology model');
        return;
      }

      if (command.action === 'projectAngle') {
        const verticalTarget = new THREE.Vector3(0, mode === 'resource' ? -160 : -80, -20);
        const verticalPosition = new THREE.Vector3(1380, mode === 'resource' ? 560 : 420, 420);
        scheduleCameraTween(verticalPosition, verticalTarget, 1.45, 44);
        setStatus('Voice camera rotated to a steep vertical angle');
        return;
      }

      if (command.action === 'orbitVertical360') {
        verticalRotationTween = {
          start: clock.getElapsedTime(),
          duration: 5.2,
          from: stageVerticalBaseRotation,
          to: stageVerticalBaseRotation + Math.PI * 2,
        };
        userTookControl = true;
        setStatus('Running vertical 360 degree geology spin');
        return;
      }

      const degrees = command.action === 'orbit360' ? 360 : command.degrees ?? 90;
      const radians = THREE.MathUtils.degToRad(degrees);
      rotationTween = {
        start: clock.getElapsedTime(),
        duration: command.action === 'orbit360' ? 5.2 : degrees === 180 ? 2.15 : 1.45,
        from: stageBaseRotation,
        to: stageBaseRotation + radians,
      };
      userTookControl = true;
      setStatus(command.action === 'orbit360' ? 'Running cinematic 360 degree geology spin' : `Rotating geology model ${degrees} degrees`);
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pickables: THREE.Object3D[] = [];

    // Sky/ground hemisphere — cool sky, warm ground bounce for satellite terrain.
    scene.add(new THREE.HemisphereLight(0xf3f9ff, 0x5a4a35, 3.4));
    // Warm sun key light — main shape former, cast shadows.
    const key = new THREE.DirectionalLight(0xfff2d8, 4.6);
    key.position.set(900, 1800, 1200);
    key.castShadow = true;
    // Cool fill from opposite side — keeps shadowed slopes readable without
    // washing out the terrain. No shadow casting on the fill (perf + softness).
    const fill = new THREE.DirectionalLight(0xa8c5ff, 1.2);
    fill.position.set(-1200, 900, -800);
    scene.add(fill);
    // Rim light behind + above — separates ridges from the dark background.
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(0, 1600, -2000);
    scene.add(rimLight);
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 200;
    key.shadow.camera.far = 8000;
    key.shadow.camera.left = -4200;
    key.shadow.camera.right = 4200;
    key.shadow.camera.top = 4200;
    key.shadow.camera.bottom = -4200;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 1.5;
    key.shadow.camera.updateProjectionMatrix();
    scene.add(key);
    const rim = new THREE.PointLight(0x2dd4bf, 2200, 5200);
    rim.position.set(-1200, 500, -900);
    scene.add(rim);
    const amber = new THREE.PointLight(0xfacc15, 900, 4200);
    amber.position.set(1400, -220, 1350);
    scene.add(amber);

    const stage = new THREE.Group();
    groupRef.current = stage;
    scene.add(stage);
    cameraCommandHandlerRef.current = consumeCameraCommand;
    const pendingCameraCommand = cameraCommandRef.current;
    if (pendingCameraCommand) consumeCameraCommand(pendingCameraCommand);

    const terrainLayer = new THREE.Group();
    terrainLayer.name = 'terrain-surface-layer';
    stage.add(terrainLayer);

    const addProceduralTerrain = () => {
      const terrainGeometry = createTerrainPatchGeometry(mode);
      const edgeAlphaMap = createTerrainEdgeAlphaTexture();
      const terrain = new THREE.Mesh(
        terrainGeometry,
        new THREE.MeshStandardMaterial({
          color: 0xf5f2dd,
          roughness: mode === 'drillholes' || mode === 'subsurface' ? 0.76 : 0.66,
          metalness: 0.01,
          transparent: false,
          opacity: terrainOpacityForView(mode, surfaceCameraView),
          alphaMap: undefined,
          alphaTest: 0,
          side: THREE.DoubleSide,
          vertexColors: true,
          emissive: new THREE.Color('#1b2f20'),
          emissiveIntensity: 0.18,
          depthWrite: true,
          depthTest: true,
          polygonOffset: true,
          polygonOffsetFactor: 2,
        })
      );
      const terrainMaterial = terrain.material as THREE.MeshStandardMaterial;
      registerTerrainSurfaceMaterial(terrainMaterial);
      terrain.receiveShadow = true;
      terrain.renderOrder = 20;
      terrainLayer.add(terrain);
      const terrainOccluder = new THREE.Mesh(
        terrainGeometry.clone(),
        new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: true, depthTest: true, colorWrite: false, side: THREE.DoubleSide })
      );
      terrainOccluder.renderOrder = 21;
      terrainLayer.add(terrainOccluder);
    };
    addProceduralTerrain();
    let terrainResources: TangaTerrainResources | null = null;

    const applyTexturedTerrain = async (quality: AssetQuality) => {
      try {
        reportLoadState('loading', 'loading', quality, `Loading ${quality} terrain`);
        const resources = await loadTangaTerrainResources(renderer, quality);
        if (cancelled) return null;
        terrainResources = resources;
        disposeObject(terrainLayer);
        terrainLayer.clear();
        terrainSurfaceMaterials.length = 0;
        const terrainTexture = resources.texture.clone();
        terrainTexture.colorSpace = THREE.SRGBColorSpace;
        terrainTexture.wrapS = THREE.ClampToEdgeWrapping;
        terrainTexture.wrapT = THREE.ClampToEdgeWrapping;
        terrainTexture.generateMipmaps = true;
        terrainTexture.minFilter = THREE.LinearMipmapLinearFilter;
        terrainTexture.magFilter = THREE.LinearFilter;
        terrainTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy?.() ?? 8, 16);
        terrainTexture.needsUpdate = true;

        const terrainGeometry = createTexturedTerrainPatchGeometry(resources, mode);
        const texturedTerrain = new THREE.Mesh(
          terrainGeometry,
          new THREE.MeshStandardMaterial({
            map: terrainTexture,
            // Slight warm bias lifts the satellite imagery out of dull-gray.
            color: 0xfff4e2,
            // Lower roughness + IBL env map = the bright, faintly-glossy VRIFY
            // terrain look. Hair-thin metalness lets sunlit slopes catch a
            // touch of specular so ridges read three-dimensional.
            roughness: 0.62,
            metalness: 0.05,
            envMapIntensity: 1.15,
            transparent: false,
            opacity: terrainOpacityForView(mode, surfaceCameraView),
            emissive: new THREE.Color('#0d1420'),
            emissiveIntensity: mode === 'subsurface' ? 0.16 : 0.04,
            alphaMap: undefined,
            alphaTest: 0,
            side: THREE.DoubleSide,
            depthWrite: true,
            depthTest: true,
            polygonOffset: true,
            polygonOffsetFactor: 2,
          })
        );
        const texturedMaterial = texturedTerrain.material as THREE.MeshStandardMaterial;
        registerTerrainSurfaceMaterial(texturedMaterial);
        texturedTerrain.receiveShadow = true;
        texturedTerrain.renderOrder = 20;
        terrainLayer.add(texturedTerrain);
        const texturedOccluder = new THREE.Mesh(
          terrainGeometry.clone(),
          new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: true, depthTest: true, colorWrite: false, side: THREE.DoubleSide })
        );
        texturedOccluder.renderOrder = 21;
        terrainLayer.add(texturedOccluder);
        reportLoadState('loading', 'ready', quality, `${quality} terrain ready`);
        return resources;
      } catch {
        reportLoadState('degraded', 'degraded', quality, 'Procedural terrain fallback active');
        return null;
      }
    };

    if (mode === 'resource') {
      addResourceGhost(stage, mode);
    }

    let samplePulseMesh: THREE.InstancedMesh | null = null;
    let samplePulseCurves: MetallurgyPulse[] = [];
    let samplePulseTrailMaterials: THREE.LineBasicMaterial[] = [];
    const revealItems: SceneRevealItem[] = [];
    const metallurgyReceivers: MetallurgyReceiver[] = [];
    let metallurgyRevealQueued = false;
    const samplePulseDummy = new THREE.Object3D();
    const registerReveal = (
      object: THREE.Object3D,
      delay: number,
      duration = 1.1,
      scaleFrom = 0.94,
      yOffset = 0
    ) => {
      const materialStates = materialsForObject(object).map((material) => {
        const opacity = typeof material.opacity === 'number' ? material.opacity : 1;
        material.transparent = true;
        material.opacity = 0;
        material.needsUpdate = true;
        return {material, opacity};
      });

      if (!materialStates.length) return;

      const baseScale = object.scale.clone();
      const basePosition = object.position.clone();
      object.scale.copy(baseScale).multiplyScalar(scaleFrom);
      object.position.y = basePosition.y + yOffset;
      revealItems.push({
        object,
        materialStates,
        baseScale,
        basePosition,
        scaleFrom,
        yOffset,
        delay,
        duration,
      });
    };

    const build = async () => {
      setStatus('Drawing preview terrain surface');
      const resources = await applyTexturedTerrain(assetQuality);
      if (cancelled) return;

      setStatus(mode === 'resource' ? `Loading ${resourceFocusLabel(resourceFocus).toLowerCase()} resource blocks` : mode === 'mine_planning' ? 'Loading pit shell and resource blocks' : mode === 'metallurgy' ? 'Loading drillhole intervals for metallurgy reveal' : 'Loading drillhole traces');
      reportLoadState('loading', resources ? 'ready' : 'degraded', resources?.quality ?? assetQuality, 'Loading drillholes and resource data');
      const [drillholes, blocks] = await Promise.all([
        loadDrillholes(),
        (mode === 'resource' || mode === 'mine_planning') ? loadBlocks() : Promise.resolve([]),
      ]);
      if (cancelled) return;

      const shownDrillholes = drillSegmentsForMode(drillholes, mode);
      const shownHoleCount = drillholeCount(shownDrillholes);
      const drillSurfaceOffsets = drillSurfaceOffsetByHole(shownDrillholes, terrainResources);
      if (shownDrillholes.length) {
        const highCarbonSegment = shownDrillholes.reduce((best, segment) => (
          segment.carbon > best.carbon ? segment : best
        ), shownDrillholes[0]);
        const highStart = registeredDrillPoint(highCarbonSegment, 'from', terrainResources, drillSurfaceOffsets);
        const highEnd = registeredDrillPoint(highCarbonSegment, 'to', terrainResources, drillSurfaceOffsets);
        const assayAnchor = highStart.clone().add(highEnd).multiplyScalar(0.5);
        calloutAnchors.set('assays', assayAnchor);
        calloutAnchors.set('volume', assayAnchor.clone().lerp(new THREE.Vector3(0, -360, 0), 0.38));
      }
      calloutAnchors.set('cutaway', new THREE.Vector3(-820, terrainSurfaceY(terrainResources, -820, -620, 22), 620));
      const tubeGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
      const traceMesh = new THREE.InstancedMesh(
        tubeGeometry,
        new THREE.MeshBasicMaterial({
          color: 0x050505,
          transparent: true,
          opacity: mode === 'resource' ? 0.36 : 0.92,
          depthWrite: false,
        }),
        shownDrillholes.length
      );
      const tubeMatrix = new THREE.Matrix4();
      shownDrillholes.forEach((segment, index) => {
        const start = registeredDrillPoint(segment, 'from', terrainResources, drillSurfaceOffsets);
        const end = registeredDrillPoint(segment, 'to', terrainResources, drillSurfaceOffsets);
        makeDrillTubeMatrix(start, end, tubeMatrix, mode === 'resource' ? 1.85 : 2.15);
        traceMesh.setMatrixAt(index, tubeMatrix);
      });
      traceMesh.instanceMatrix.needsUpdate = true;
      traceMesh.renderOrder = 2;
      traceMesh.userData.tooltipItems = shownDrillholes.map((segment) => drillTooltip(segment, 'Drill trace', '#f8fafc'));
      stage.add(traceMesh);
      registerReveal(traceMesh, mode === 'metallurgy' ? 0.32 : 0.18, 1.05, 0.98);
      pickables.push(traceMesh);

      const lithologySource = shownDrillholes
        .filter((segment, index) => mode !== 'resource' && mode !== 'drillholes' && (segment.lithology === 'GRSC' || segment.carbon >= 2.5 || index % 4 === 0))
        .slice(0, mode === 'drillholes' ? 2300 : mode === 'metallurgy' ? 1200 : 1550);
      const lithologyGroups = new Map<string, DrillSegment[]>();
      lithologySource.forEach((segment) => {
        const key = LITHOLOGY_PRIORITY.includes(segment.lithology) ? segment.lithology : 'UNKNOWN';
        lithologyGroups.set(key, [...(lithologyGroups.get(key) ?? []), segment]);
      });
      Array.from(lithologyGroups.entries()).forEach(([lithology, segments]) => {
        const baseColor = lithology === 'GRSC'
          ? new THREE.Color('#1ce6d0')
          : lithologyColor(lithology).lerp(new THREE.Color('#e2e8f0'), 0.12);
        const material = new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: baseColor.clone().multiplyScalar(0.22),
          emissiveIntensity: lithology === 'GRSC' ? 0.34 : 0.16,
          roughness: 0.36,
          metalness: 0.08,
          transparent: true,
          opacity: lithology === 'GRSC' ? 0.3 : 0.2,
          depthWrite: false,
        });
        const mesh = new THREE.InstancedMesh(tubeGeometry, material, segments.length);
        mesh.name = `lithology-${lithology}`;
        mesh.renderOrder = 4;
        segments.forEach((segment, index) => {
          const start = registeredDrillPoint(segment, 'from', terrainResources, drillSurfaceOffsets);
          const end = registeredDrillPoint(segment, 'to', terrainResources, drillSurfaceOffsets);
          makeDrillTubeMatrix(start, end, tubeMatrix, lithology === 'GRSC' ? 5.6 : 4.6);
          mesh.setMatrixAt(index, tubeMatrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.userData.tooltipItems = segments.map((segment) => drillTooltip(segment, lithologyLabel(segment.lithology), baseColor.getStyle()));
        stage.add(mesh);
        registerReveal(mesh, mode === 'metallurgy' ? 0.78 : 0.48, 1.15, 0.96);
        pickables.push(mesh);
      });

      const assayCandidates = shownDrillholes.filter((segment) => segment.carbon >= 1);
      const assayLimit = mode === 'drillholes' ? 2400 : mode === 'metallurgy' ? 1500 : mode === 'resource' ? 1480 : 1320;
      const assaySource = assayCandidates.length <= assayLimit
        ? assayCandidates
        : sampleSegmentsAcrossHoles(assayCandidates, assayLimit);
      ASSAY_INTERVAL_BINS.forEach((bin) => {
        const segments = assaySource.filter((segment) => assayIntervalBin(segment.carbon)?.key === bin.key);
        if (!segments.length) return;
        const color = new THREE.Color(bin.color);
        const mesh = new THREE.InstancedMesh(
          tubeGeometry,
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: bin.key === 'very-high' ? 0.64 : 0.42,
            roughness: 0.24,
            metalness: 0.12,
            transparent: true,
            opacity: mode === 'resource' ? 0.62 : 0.9,
            depthWrite: false,
          }),
          segments.length
        );
        mesh.name = `assay-${bin.key}`;
        mesh.renderOrder = 6;
        segments.forEach((segment, index) => {
          const start = registeredDrillPoint(segment, 'from', terrainResources, drillSurfaceOffsets);
          const end = registeredDrillPoint(segment, 'to', terrainResources, drillSurfaceOffsets);
          const radius = bin.key === 'very-high' ? 8.8 : bin.key === 'high' ? 7.4 : bin.key === 'medium' ? 6.1 : 4.8;
          makeDrillTubeMatrix(start, end, tubeMatrix, radius);
          mesh.setMatrixAt(index, tubeMatrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.userData.tooltipItems = segments.map((segment) => drillTooltip(segment, bin.label, bin.color, [bin.detail]));
        stage.add(mesh);
        registerReveal(mesh, mode === 'metallurgy' ? 1.05 : 0.74, 1.22, 0.94);
        pickables.push(mesh);
      });

      const collarByHole = new Map<string, DrillSegment>();
      shownDrillholes.forEach((segment) => {
        const current = collarByHole.get(segment.holeId);
        if (!current || segment.depthFrom < current.depthFrom) collarByHole.set(segment.holeId, segment);
      });
      const collarSegments = Array.from(collarByHole.values()).slice(0, mode === 'resource' ? 120 : 220);
      const collarAnchorSegment = collarSegments[Math.floor(collarSegments.length * 0.46)] ?? collarSegments[0];
      if (collarAnchorSegment) {
        calloutAnchors.set('collars', collarSurfacePoint(collarAnchorSegment, terrainResources, 18));
      }
      const collarGeometry = new THREE.SphereGeometry(mode === 'resource' ? 5.2 : 7.8, 12, 10);
      const collarMaterial = new THREE.MeshStandardMaterial({
        color: 0xf8ffff,
        emissive: 0x7dd3fc,
        emissiveIntensity: 0.44,
        roughness: 0.22,
        metalness: 0.08,
        transparent: true,
        opacity: mode === 'resource' ? 0.62 : 0.96,
      });
      const collars = new THREE.InstancedMesh(collarGeometry, collarMaterial, collarSegments.length);
      const collarMatrix = new THREE.Matrix4();
      collarSegments.forEach((segment, index) => {
        const point = collarSurfacePoint(segment, terrainResources, mode === 'resource' ? 10 : DRILL_COLLAR_SURFACE_LIFT);
        collarMatrix.makeTranslation(point.x, point.y, point.z);
        collars.setMatrixAt(index, collarMatrix);
      });
      collars.instanceMatrix.needsUpdate = true;
      collars.renderOrder = 8;
      collars.userData.tooltipItems = collarSegments.map((segment) => ({
        title: segment.holeId,
        tone: '#eaffff',
        rows: [
          'Surface drill collar',
          `First logged interval ${formatDepth(segment)}`,
          `Lithology ${lithologyLabel(segment.lithology)}`,
        ],
      }));
      stage.add(collars);
      registerReveal(collars, 0.08, 0.9, 0.72, 18);
      pickables.push(collars);

      if (mode !== 'drillholes') {
        const collarRingGeometry = new THREE.TorusGeometry(mode === 'resource' ? 8.5 : 12.5, mode === 'resource' ? 1.1 : 1.35, 8, 28);
        const collarRingMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: mode === 'resource' ? 0.34 : 0.78,
          depthWrite: false,
        });
        const collarRings = new THREE.InstancedMesh(collarRingGeometry, collarRingMaterial, collarSegments.length);
        const ringDummy = new THREE.Object3D();
        collarSegments.forEach((segment, index) => {
          const point = collarSurfacePoint(segment, terrainResources, mode === 'resource' ? 8 : 11);
          ringDummy.position.copy(point);
          ringDummy.rotation.set(Math.PI / 2, 0, 0);
          ringDummy.updateMatrix();
          collarRings.setMatrixAt(index, ringDummy.matrix);
        });
        collarRings.instanceMatrix.needsUpdate = true;
        collarRings.renderOrder = 7;
        stage.add(collarRings);
        registerReveal(collarRings, 0.2, 0.95, 0.74, 15);

        const collarLeaderMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: mode === 'resource' ? 0.18 : 0.3,
          depthWrite: false,
        });
        const collarLabelLimit = mode === 'resource' ? 28 : 42;
        const collarLabelSegments = collarSegments.slice(0, collarLabelLimit);
        collarLabelSegments.forEach((segment, index) => {
          const point = collarSurfacePoint(segment, terrainResources, 15);
          const labelY = point.y + 118 + (index % 4) * 18;

          const leader = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(point.x, point.y + 4, point.z),
              new THREE.Vector3(point.x, labelY - 18, point.z),
            ]),
            collarLeaderMaterial.clone()
          );
          leader.renderOrder = 13;
          stage.add(leader);

          const sprite = makeCollarLabelSprite(segment.holeId, mode === 'resource' ? 0.42 : 0.62);
          if (sprite) {
            sprite.position.set(point.x, labelY, point.z);
            stage.add(sprite);
          }
        });
      }

      if (mode === 'metallurgy') {
        const pulseSource = shownDrillholes
          .filter((segment, index) => segment.carbon >= 4.2 || index % 18 === 0)
          .slice(0, 90);

        samplePulseCurves = pulseSource.map((segment, index) => {
          const start = registeredDrillPoint(segment, 'to', terrainResources, drillSurfaceOffsets);
          const targetBase = METALLURGY_REVEAL_TARGETS[index % METALLURGY_REVEAL_TARGETS.length];
          const target = targetBase.clone().add(new THREE.Vector3(
            Math.sin(index * 1.31) * 42,
            Math.cos(index * 1.7) * 46,
            Math.cos(index * 0.93) * 58
          ));
          const midpoint = start.clone().lerp(target, 0.5);
          midpoint.y += 340 + (index % 5) * 42;
          const curve = new THREE.CatmullRomCurve3([start, midpoint, target]);
          const trailMaterial = new THREE.LineBasicMaterial({
            color: METALLURGY_REVEAL_COLORS[index % METALLURGY_REVEAL_COLORS.length],
            transparent: true,
            opacity: 0,
            depthWrite: false,
            fog: false,
            blending: THREE.AdditiveBlending,
          });
          if (index < 64) {
            samplePulseTrailMaterials.push(trailMaterial);
            const trail = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(curve.getPoints(56)),
              trailMaterial
            );
            trail.renderOrder = 9;
            stage.add(trail);
          }
          return {
            curve,
            delay: (index % 30) * 0.05,
            phase: (index % 17) / 17,
            speed: 0.15 + (index % 5) * 0.014,
          };
        });

        METALLURGY_REVEAL_TARGETS.forEach((target, index) => {
          const targetColor = new THREE.Color(METALLURGY_REVEAL_COLORS[index % METALLURGY_REVEAL_COLORS.length]);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: targetColor,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            fog: false,
            blending: THREE.AdditiveBlending,
          });
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(58 + index * 8, 2.4, 8, 96),
            ringMaterial
          );
          ring.position.copy(target);
          ring.rotation.x = Math.PI / 2;
          ring.renderOrder = 9;
          ring.visible = false;
          stage.add(ring);

          const coreMaterial = new THREE.MeshBasicMaterial({
            color: targetColor,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            fog: false,
            blending: THREE.AdditiveBlending,
          });
          const core = new THREE.Mesh(
            new THREE.SphereGeometry(8, 14, 10),
            coreMaterial
          );
          core.position.copy(target);
          core.renderOrder = 10;
          core.visible = false;
          stage.add(core);
          metallurgyReceivers.push({
            ring,
            core,
            ringMaterial,
            coreMaterial,
            baseRingOpacity: 0.5,
            baseCoreOpacity: 0.86,
            delay: index * 0.42,
          });
        });

        const pulseGeometry = new THREE.SphereGeometry(10, 12, 10);
        const pulseMaterial = new THREE.MeshBasicMaterial({
          color: 0xd96b2b,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
          fog: false,
          blending: THREE.AdditiveBlending,
        });
        samplePulseMesh = new THREE.InstancedMesh(pulseGeometry, pulseMaterial, samplePulseCurves.length);
        samplePulseMesh.renderOrder = 10;
        stage.add(samplePulseMesh);
        setStatus('Metallurgy samples flowing from drillholes to concentrate metrics');
      }

      if (mode === 'resource' || mode === 'mine_planning') {
        // Mine planning shows ONLY the minable blocks — those the pit
        // optimizer captured at the US$1,050/t base case. Using the HighTGC
        // proxy (≥6% TGC) which closely matches the 95 Mt @ 5.70% pit ore.
        const activeFocus: ResourceFocus = mode === 'mine_planning' ? 'HighTGC' : resourceFocus;
        const selected = blocks.filter((block) => blockMatchesFocus(block, activeFocus));
        const maxBlocks = activeFocus === 'All' ? 2200 : activeFocus === 'HighTGC' || activeFocus === 'HighFlake' ? 2600 : 3200;
        const step = Math.max(1, Math.ceil(selected.length / maxBlocks));
        const sampled = selected.filter((_, index) => index % step === 0);
        const focusOpacity = activeFocus === 'LowTGC' ? 0.84 : activeFocus === 'LowUncertainty' ? 0.88 : 0.94;
        const voxelScale = activeFocus === 'All' ? 1.32 : activeFocus === 'HighTGC' || activeFocus === 'HighFlake' ? 1.82 : 1.55;
        if (sampled.length) {
          const blockAnchor = sampled
            .slice(0, Math.min(160, sampled.length))
            .reduce((total, block) => total.add(new THREE.Vector3(
              block.x,
              resourceBlockCenterY(block, voxelScale, terrainResources),
              block.z
            )), new THREE.Vector3())
            .multiplyScalar(1 / Math.min(160, sampled.length));
          const gradeAnchorBlock = sampled.reduce((best, block) => block.carbon > best.carbon ? block : best, sampled[0]);
          calloutAnchors.set('blocks', blockAnchor);
          calloutAnchors.set('grade', new THREE.Vector3(
            gradeAnchorBlock.x,
            resourceBlockCenterY(gradeAnchorBlock, voxelScale, terrainResources),
            gradeAnchorBlock.z
          ));
        }

        const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
        const solidByGrade = new Map<string, ResourceBlock[]>();
        sampled.forEach((block) => {
          const bin = tgcGradeBin(block.carbon);
          solidByGrade.set(bin.key, [...(solidByGrade.get(bin.key) ?? []), block]);
        });

        TGC_GRADE_BINS.forEach((bin, binIndex) => {
          const gradeBlocks = solidByGrade.get(bin.key) ?? [];
          if (!gradeBlocks.length) return;

          const blockColor = new THREE.Color(bin.color);
          const blockMaterial = new THREE.MeshStandardMaterial({
            color: blockColor,
            emissive: blockColor.clone().multiplyScalar(0.2),
            emissiveIntensity: bin.key === 'very-high' ? 0.36 : 0.18,
            roughness: 0.28,
            metalness: 0.18,
            transparent: true,
            opacity: bin.key === 'trace' ? 0.42 : focusOpacity,
            depthWrite: true,
            depthTest: true,
          });
          const mesh = new THREE.InstancedMesh(blockGeometry, blockMaterial, gradeBlocks.length);
          mesh.name = `resource-grade-${bin.key}`;
          mesh.renderOrder = 8 + binIndex * 0.02;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0x040608,
            transparent: true,
            opacity: bin.key === 'trace' ? 0.16 : 0.24,
            wireframe: true,
            fog: false,
            depthWrite: false,
            depthTest: true,
          });
          const wireMesh = new THREE.InstancedMesh(blockGeometry, wireMaterial, gradeBlocks.length);
          wireMesh.name = `resource-grade-${bin.key}-wire`;
          wireMesh.renderOrder = 12 + binIndex * 0.02;

          const dummy = new THREE.Object3D();
          gradeBlocks.forEach((block, index) => {
            dummy.position.set(block.x, resourceBlockCenterY(block, voxelScale, terrainResources), block.z);
            dummy.scale.set(block.dx * voxelScale, block.dz * 1.48 * voxelScale, block.dy * voxelScale);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
            wireMesh.setMatrixAt(index, dummy.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          wireMesh.instanceMatrix.needsUpdate = true;
          mesh.userData.tooltipItems = gradeBlocks.map(blockTooltip);
          stage.add(mesh);
          stage.add(wireMesh);
          registerReveal(mesh, 0.46 + binIndex * 0.16, 1.24, 0.68, -76 + binIndex * 6);
          registerReveal(wireMesh, 0.62 + binIndex * 0.16, 1.16, 0.68, -76 + binIndex * 6);
          pickables.push(mesh);
        });

        if (mode === 'resource' && activeFocus === 'HighFlake' && sampled.length) {
          const flakeGeometry = new THREE.CircleGeometry(44, 6);
          const flakeMaterial = new THREE.MeshBasicMaterial({
            color: 0xfef3c7,
            transparent: true,
            opacity: 0.62,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
          });
          const flakeCount = Math.min(180, sampled.length);
          const flakes = new THREE.InstancedMesh(flakeGeometry, flakeMaterial, flakeCount);
          flakes.renderOrder = 12;
          const flakeDummy = new THREE.Object3D();
          const flakeVoxelScale = 1.82;
          for (let index = 0; index < flakeCount; index += 1) {
            const block = sampled[Math.floor(index * sampled.length / flakeCount)];
            const surfaceY = terrainSurfaceY(terrainResources, block.x, -block.z);
            const blockY = resourceBlockCenterY(block, flakeVoxelScale, terrainResources);
            flakeDummy.position.set(block.x, Math.min(blockY + block.dz * 1.7 + 18, surfaceY - 12), block.z);
            flakeDummy.rotation.set(Math.PI / 2 + Math.sin(index) * 0.18, index * 0.47, Math.cos(index * 0.7) * 0.12);
            const scale = 0.65 + (index % 5) * 0.08;
            flakeDummy.scale.setScalar(scale);
            flakeDummy.updateMatrix();
            flakes.setMatrixAt(index, flakeDummy.matrix);
          }
          stage.add(flakes);
          registerReveal(flakes, 1.28, 1.1, 0.62, 26);
        }

        // ── Mine planning: benched open-pit that traces the real ore outline ──
        // The pit boundary follows the convex hull of the sampled ore blocks —
        // NOT a circle — with 50° walls stepping inward on each bench. This is
        // what makes it read as a real open-cast pit instead of a stylized
        // funnel. Uses the 1050-fine scenario: 95 Mt @ 5.7% TGC, 50° slope.
        if (mode === 'mine_planning' && sampled.length) {
          // 2D convex hull (Andrew's monotone chain) of block x/z centres.
          const pts = sampled.map((b) => [b.x, b.z] as [number, number]);
          pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
          const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
            (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
          const lower: [number, number][] = [];
          for (const p of pts) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
            lower.push(p);
          }
          const upper: [number, number][] = [];
          for (let i = pts.length - 1; i >= 0; i -= 1) {
            const p = pts[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
            upper.push(p);
          }
          const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
          // Guard: too few points for a real pit — skip pit but keep the rest.
          if (hull.length >= 4) {
          const centroidX = hull.reduce((s, p) => s + p[0], 0) / hull.length;
          const centroidZ = hull.reduce((s, p) => s + p[1], 0) / hull.length;

          // Pit vertical extents.
          const surfaceY = terrainSurfaceY(terrainResources, centroidX, -centroidZ);
          const toeY = sampled.reduce(
            (min, b) => Math.min(min, resourceBlockCenterY(b, voxelScale, terrainResources) - b.dz * 0.5),
            surfaceY,
          );
          const depth = Math.max(220, surfaceY - toeY + 50);
          const slopeCot = 1 / Math.tan((50 * Math.PI) / 180); // horizontal offset per unit depth at 50°

          // Offset the hull outward by `expand` metres from the centroid (>0
          // widens the pit at the surface; <0 narrows it toward the toe).
          const offsetHull = (expand: number) =>
            hull.map(([x, z]) => {
              const dx = x - centroidX;
              const dz = z - centroidZ;
              const len = Math.max(1e-3, Math.hypot(dx, dz));
              const scale = (len + expand) / len;
              return [centroidX + dx * scale, centroidZ + dz * scale] as [number, number];
            });

          const pitGroup = new THREE.Group();
          pitGroup.name = 'mine-planning-pit';

          // Bench walls — build a triangulated ribbon per bench between the
          // outer (upper) rim and inner (lower) rim of each level.
          const benches = 6;
          const surfaceOverhang = depth * slopeCot * 0.15; // gentle widening at surface
          for (let i = 0; i < benches; i += 1) {
            const t0 = i / benches;
            const t1 = (i + 1) / benches;
            const y0 = surfaceY - depth * t0;
            const y1 = surfaceY - depth * t1;
            // Expand: max at surface (t=0), min at floor (t=1).
            const expand0 = surfaceOverhang + (1 - t0) * depth * slopeCot;
            const expand1 = surfaceOverhang + (1 - t1) * depth * slopeCot;
            const outer = offsetHull(expand0);
            const inner = offsetHull(expand1);

            // Build a wall strip as a BufferGeometry (two triangles per hull edge).
            const positions: number[] = [];
            const normals: number[] = [];
            const indices: number[] = [];
            for (let k = 0; k < hull.length; k += 1) {
              positions.push(outer[k][0], y0, outer[k][1]);   // 4k
              positions.push(inner[k][0], y1, inner[k][1]);   // 4k+1
              // face normal computed by BufferGeometry.computeVertexNormals()
              normals.push(0, 1, 0, 0, 1, 0);
            }
            for (let k = 0; k < hull.length; k += 1) {
              const a = k * 2;
              const b = a + 1;
              const c = ((k + 1) % hull.length) * 2;
              const d = c + 1;
              indices.push(a, b, d);
              indices.push(a, d, c);
            }
            const wallGeom = new THREE.BufferGeometry();
            wallGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            wallGeom.setIndex(indices);
            wallGeom.computeVertexNormals();
            const wallMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color().setHSL(0.08, 0.42, 0.44 - i * 0.035),
              roughness: 0.88,
              metalness: 0.02,
              transparent: true,
              opacity: 0.78,
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            const wall = new THREE.Mesh(wallGeom, wallMat);
            wall.receiveShadow = true;
            wall.renderOrder = 7 + i * 0.001;
            pitGroup.add(wall);

            // Bench crest — glowing amber outline along the OUTER edge.
            const rimPts: THREE.Vector3[] = [];
            for (let k = 0; k <= hull.length; k += 1) {
              const idx = k % hull.length;
              rimPts.push(new THREE.Vector3(outer[idx][0], y0 + 0.3, outer[idx][1]));
            }
            const rimGeom = new THREE.BufferGeometry().setFromPoints(rimPts);
            const rimMat = new THREE.LineBasicMaterial({
              color: 0xffb56b,
              transparent: true,
              opacity: 0.65,
            });
            pitGroup.add(new THREE.Line(rimGeom, rimMat));
          }

          // Pit floor — Shape polygon built from the innermost hull ring.
          const floorHull = offsetHull(surfaceOverhang);
          const floorShape = new THREE.Shape();
          floorShape.moveTo(floorHull[0][0] - centroidX, floorHull[0][1] - centroidZ);
          for (let k = 1; k < floorHull.length; k += 1) {
            floorShape.lineTo(floorHull[k][0] - centroidX, floorHull[k][1] - centroidZ);
          }
          floorShape.closePath();
          const floorGeom = new THREE.ShapeGeometry(floorShape);
          const floorMat = new THREE.MeshStandardMaterial({
            color: 0x2f2317,
            roughness: 0.95,
            metalness: 0,
            transparent: true,
            opacity: 0.88,
          });
          const floor = new THREE.Mesh(floorGeom, floorMat);
          floor.rotation.x = -Math.PI / 2;
          floor.position.set(centroidX, surfaceY - depth + 0.5, centroidZ);
          floor.receiveShadow = true;
          pitGroup.add(floor);

          stage.add(pitGroup);
          } // end of "hull.length >= 4" guard
        }

        setStatus(mode === 'mine_planning'
          ? `Optimum pit shell wraps ${sampled.length} ore blocks · 95 Mt @ 5.7% TGC`
          : `${shownHoleCount} drillholes support ${sampled.length} ${resourceFocusLabel(activeFocus).toLowerCase()} blocks`);
        reportLoadState('ready', resources ? 'ready' : 'degraded', resources?.quality ?? assetQuality, `${shownHoleCount} drillholes / ${sampled.length} blocks ready`);
      } else {
        setStatus(mode === 'metallurgy'
          ? `${shownHoleCount} drillholes staged into metallurgy data reveal`
          : `${shownHoleCount} drillholes / ${shownDrillholes.length} intervals in Three.js`);
        reportLoadState('ready', resources ? 'ready' : 'degraded', resources?.quality ?? assetQuality, `${shownHoleCount} drillholes ready`);
      }

      const shouldUpgradeTerrain = !cancelled && (resources?.quality ?? assetQuality) === 'preview';
      if (shouldUpgradeTerrain) {
        const upgrade = async () => {
          const upgradedResources = await applyTexturedTerrain('standard');
          if (cancelled || !upgradedResources) return;
          reportLoadState('ready', 'ready', 'standard', 'Standard terrain upgraded');
        };

        const requestIdle = window.requestIdleCallback;
        if (typeof requestIdle === 'function') {
          requestIdle.call(window, () => void upgrade(), {timeout: 5000});
        } else {
          globalThis.setTimeout(() => void upgrade(), 1800);
        }
      }
    };

    void build().catch((error) => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : 'Could not load geology scene';
        setStatus(message);
        reportLoadState('error', 'error', assetQuality, message);
      }
    });

    const onPointerMove = (event: PointerEvent) => {
      if (!hostRef.current || !pickables.length) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const [hit] = raycaster.intersectObjects(pickables, false);
      const tooltipItems = hit?.object?.userData?.tooltipItems as DrillPickInfo[] | undefined;
      const tooltip = tooltipItems?.[hit.instanceId ?? 0];

      if (!hit || !tooltip) {
        renderer.domElement.classList.remove('is-picking');
        setHoverTooltip(null);
        return;
      }

      renderer.domElement.classList.add('is-picking');
      setHoverTooltip({
        x: clamp(event.clientX - rect.left + 16, 14, rect.width - 276),
        y: clamp(event.clientY - rect.top + 16, 76, rect.height - 156),
        title: tooltip.title,
        rows: tooltip.rows,
        tone: tooltip.tone,
      });
    };

    const onPointerLeave = () => {
      renderer.domElement.classList.remove('is-picking', 'is-interacting');
      setHoverTooltip(null);
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    const resize = () => {
      if (!hostRef.current) return;
      camera.aspect = hostRef.current.clientWidth / hostRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(hostRef.current.clientWidth, hostRef.current.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frame = 0;
    let lastProjectionTick = -1;
    const ease = (value: number) => value < 0.5 ? 4 * value * value * value : 1 - ((-2 * value + 2) ** 3) / 2;
    const cameraPath = new THREE.CatmullRomCurve3([cameraShot.from, cameraShot.mid, cameraShot.to], false, 'catmullrom', 0.32);
    const targetPath = new THREE.CatmullRomCurve3([DEFAULT_CAMERA_TARGET.clone(), cameraShot.targetMid, cameraShot.target], false, 'catmullrom', 0.32);
    const projectCallouts = () => {
      if (!hostRef.current || cancelled) return;
      const width = hostRef.current.clientWidth;
      const height = hostRef.current.clientHeight;
      if (!width || !height) return;

      stage.updateMatrixWorld(true);
      const items: ProjectedThreeCallout[] = [];
      calloutsForProjection.forEach((callout) => {
        const anchorWorld = (calloutAnchors.get(callout.id) ?? new THREE.Vector3(...callout.anchor)).clone();
        stage.localToWorld(anchorWorld);
        const projected = anchorWorld.project(camera);
        const rawAnchorX = (projected.x * 0.5 + 0.5) * width;
        const rawAnchorY = (-projected.y * 0.5 + 0.5) * height;
        if (
          !Number.isFinite(rawAnchorX) ||
          !Number.isFinite(rawAnchorY) ||
          projected.z < -1 ||
          projected.z > 1 ||
          rawAnchorX < -96 ||
          rawAnchorX > width + 96 ||
          rawAnchorY < -96 ||
          rawAnchorY > height + 96
        ) {
          return;
        }

        const anchorPixelX = clamp(rawAnchorX, 34, width - 34);
        const anchorPixelY = clamp(rawAnchorY, 86, height - 44);
        const placement = projectedCalloutPlacement(callout, anchorPixelX, anchorPixelY, width, height);

        items.push({
          ...callout,
          side: placement.side,
          anchorPixelX,
          anchorPixelY,
          boxPixelX: placement.boxPixelX,
          boxPixelY: placement.boxPixelY,
        });
      });
      setProjectedFrame({width, height, items});
    };
    const projectToScreen = (point: THREE.Vector3, width: number, height: number) => {
      const projected = point.clone().project(camera);
      if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || !Number.isFinite(projected.z)) return null;
      if (projected.z < -1 || projected.z > 1) return null;
      return {
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
      };
    };
    const updateNavInstruments = () => {
      if (!hostRef.current || cancelled) return;
      const width = hostRef.current.clientWidth;
      const height = hostRef.current.clientHeight;
      if (!width || !height) return;

      stage.updateMatrixWorld(true);
      const baseLocal = controls.target.clone();
      const baseWorld = baseLocal.clone();
      const northWorld = baseLocal.clone().add(new THREE.Vector3(0, 0, -900));
      const eastWorld = baseLocal.clone().add(new THREE.Vector3(1000, 0, 0));
      stage.localToWorld(baseWorld);
      stage.localToWorld(northWorld);
      stage.localToWorld(eastWorld);

      const baseScreen = projectToScreen(baseWorld, width, height);
      const northScreen = projectToScreen(northWorld, width, height);
      const eastScreen = projectToScreen(eastWorld, width, height);
      let northAngleDeg = 0;

      if (baseScreen && northScreen) {
        northAngleDeg = normalizeDegrees(
          THREE.MathUtils.radToDeg(Math.atan2(northScreen.x - baseScreen.x, baseScreen.y - northScreen.y))
        );
      } else {
        const viewDirection = controls.target.clone().sub(camera.position);
        northAngleDeg = normalizeDegrees(THREE.MathUtils.radToDeg(Math.atan2(viewDirection.x, -viewDirection.z)));
      }

      let scaleLabel = DEFAULT_NAV_INSTRUMENT.scaleLabel;
      let scaleWidth = DEFAULT_NAV_INSTRUMENT.scaleWidth;
      let scaleDetail = DEFAULT_NAV_INSTRUMENT.scaleDetail;

      if (baseScreen && eastScreen) {
        const pixelsPer1000m = Math.hypot(eastScreen.x - baseScreen.x, eastScreen.y - baseScreen.y);
        const pixelsPerMeter = pixelsPer1000m / 1000;
        if (Number.isFinite(pixelsPerMeter) && pixelsPerMeter > 0.0001) {
          const targetMeters = 118 / pixelsPerMeter;
          const niceMeters = NICE_SCALE_METERS.reduce((best, value) => (
            Math.abs(value - targetMeters) < Math.abs(best - targetMeters) ? value : best
          ), NICE_SCALE_METERS[0]);
          scaleLabel = formatScaleMeters(niceMeters);
          scaleWidth = clamp(niceMeters * pixelsPerMeter, 64, 158);
          scaleDetail = `camera ${Math.round(camera.position.distanceTo(controls.target) / 10) * 10} m`;
        }
      }

      setNavInstrument((current) => {
        const next = {
          northAngleDeg: Math.round(northAngleDeg),
          scaleLabel,
          scaleWidth: Math.round(scaleWidth),
          scaleDetail,
        };
        if (
          Math.abs(current.northAngleDeg - next.northAngleDeg) < 1 &&
          Math.abs(current.scaleWidth - next.scaleWidth) < 2 &&
          current.scaleLabel === next.scaleLabel &&
          current.scaleDetail === next.scaleDetail
        ) {
          return current;
        }
        return next;
      });
    };
    projectCallouts();
    updateNavInstruments();

    const animate = () => {
      if (cancelled) return;
      const elapsed = clock.getElapsedTime();
      const flyProgress = ease(Math.min(1, elapsed / cameraShot.flySeconds));
      if (cameraTween) {
        const tweenProgress = ease(Math.min(1, (elapsed - cameraTween.start) / cameraTween.duration));
        camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, tweenProgress);
        controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, tweenProgress);
        camera.fov = THREE.MathUtils.lerp(cameraTween.fromFov, cameraTween.toFov, tweenProgress);
        camera.updateProjectionMatrix();
        if (tweenProgress >= 1) cameraTween = null;
      } else if (!userTookControl) {
        camera.position.copy(cameraPath.getPoint(flyProgress));
        controls.target.copy(targetPath.getPoint(flyProgress));
        const settle = ease(Math.max(0, Math.min(1, (elapsed - cameraShot.flySeconds * 0.72) / 2.6)));
        if (settle > 0) {
          camera.position.x += Math.sin(elapsed * 0.16) * cameraShot.drift.x * settle;
          camera.position.y += Math.sin(elapsed * 0.11 + 0.8) * cameraShot.drift.y * settle;
          camera.position.z += Math.cos(elapsed * 0.14) * cameraShot.drift.z * settle;
          controls.target.x += Math.sin(elapsed * 0.12 + 1.4) * 18 * settle;
          controls.target.z += Math.cos(elapsed * 0.1) * 16 * settle;
        }
      }
      controls.update();
      const driftYaw = Math.sin(elapsed * 0.18) * cameraShot.yawDrift;
      let rotationTweenActive = false;
      if (rotationTween) {
        rotationTweenActive = true;
        const tweenProgress = ease(Math.min(1, (elapsed - rotationTween.start) / rotationTween.duration));
        stageBaseRotation = THREE.MathUtils.lerp(rotationTween.from, rotationTween.to, tweenProgress);
        if (tweenProgress >= 1) rotationTween = null;
      }
      let verticalRotationTweenActive = false;
      if (verticalRotationTween) {
        verticalRotationTweenActive = true;
        const tweenProgress = ease(Math.min(1, (elapsed - verticalRotationTween.start) / verticalRotationTween.duration));
        stageVerticalBaseRotation = THREE.MathUtils.lerp(verticalRotationTween.from, verticalRotationTween.to, tweenProgress);
        if (tweenProgress >= 1) {
          verticalRotationTween = null;
          verticalRotationTweenActive = false;
          stageVerticalBaseRotation = 0;
          stage.rotation.x = 0;
        }
      }
      const targetRotation = stageBaseRotation + driftYaw;
      if (rotationTweenActive) {
        stage.rotation.y = targetRotation;
      } else {
        stage.rotation.y += (targetRotation - stage.rotation.y) * 0.028;
      }
      if (verticalRotationTweenActive) {
        stage.rotation.x = stageVerticalBaseRotation;
      } else {
        stage.rotation.x += (0 - stage.rotation.x) * 0.04;
      }
      if (
        mode === 'metallurgy' &&
        !lowCamera &&
        !metallurgyRevealQueued &&
        !userTookControl &&
        elapsed > cameraShot.flySeconds * 0.72
      ) {
        metallurgyRevealQueued = true;
        scheduleCameraTween(
          new THREE.Vector3(1650, 410, 1420),
          new THREE.Vector3(800, 30, -760),
          2.35,
          34
        );
      }
      revealItems.forEach((item) => {
        const progress = clamp((elapsed - item.delay) / item.duration, 0, 1);
        const eased = ease(progress);
        item.object.visible = progress > 0.001;
        item.object.scale.copy(item.baseScale).multiplyScalar(THREE.MathUtils.lerp(item.scaleFrom, 1, eased));
        item.object.position.copy(item.basePosition);
        item.object.position.y += item.yOffset * (1 - eased);
        item.materialStates.forEach(({material, opacity}) => {
          material.opacity = opacity * eased;
        });
      });
      if (metallurgyReceivers.length) {
        const receiverStart = cameraShot.flySeconds * 0.36 + 0.82;
        metallurgyReceivers.forEach((receiver, index) => {
          const progress = clamp((elapsed - receiverStart - receiver.delay) / 1.12, 0, 1);
          const eased = ease(progress);
          const shimmer = progress > 0 ? (Math.sin(elapsed * 2.2 + index * 0.9) + 1) * 0.5 : 0;
          receiver.ring.visible = progress > 0.001;
          receiver.core.visible = progress > 0.001;
          receiver.ringMaterial.opacity = receiver.baseRingOpacity * eased * (0.78 + shimmer * 0.22);
          receiver.coreMaterial.opacity = receiver.baseCoreOpacity * eased * (0.82 + shimmer * 0.18);
          receiver.ring.scale.setScalar(THREE.MathUtils.lerp(0.52, 1.08, eased) + shimmer * 0.025);
          receiver.core.scale.setScalar(THREE.MathUtils.lerp(0.68, 1.14, eased) + shimmer * 0.035);
          receiver.ring.rotation.z += 0.006 + index * 0.0015;
        });
      }
      if (samplePulseMesh) {
        const revealStart = cameraShot.flySeconds * 0.36;
        samplePulseCurves.forEach((sample, index) => {
          const localTime = elapsed - revealStart - sample.delay;
          const reveal = clamp(localTime / 0.75, 0, 1);
          const pulse = localTime > 0 ? (localTime * sample.speed + sample.phase) % 1 : 0;
          const position = sample.curve.getPoint(pulse);
          const arrival = clamp((pulse - 0.74) / 0.2, 0, 1);
          const breathe = Math.max(0.25, Math.sin(pulse * Math.PI));
          const scale = reveal * (0.28 + breathe * 1.06 + arrival * 0.72);
          samplePulseDummy.position.copy(position);
          samplePulseDummy.scale.setScalar(Math.max(0.01, scale));
          samplePulseDummy.updateMatrix();
          samplePulseMesh?.setMatrixAt(index, samplePulseDummy.matrix);
        });
        samplePulseMesh.instanceMatrix.needsUpdate = true;
        samplePulseTrailMaterials.forEach((material, index) => {
          const reveal = clamp((elapsed - revealStart - index * 0.018) / 1.4, 0, 1);
          material.opacity = reveal * (0.032 + Math.sin(elapsed * 0.82 + index * 0.3) * 0.01);
        });
      }
      const projectionTick = Math.floor(elapsed * 10);
      if (projectionTick !== lastProjectionTick) {
        lastProjectionTick = projectionTick;
        projectCallouts();
        updateNavInstruments();
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      controlsRef.current = null;
      groupRef.current = null;
      if (cameraCommandHandlerRef.current === consumeCameraCommand) {
        cameraCommandHandlerRef.current = null;
      }
    };
  }, [assetQuality, cameraDropKey, mode, onLoadState, resourceFocus, visible]);

  const callouts = threeCallouts(mode, resourceFocus);
  const legendItems = drillholeLegend(mode);
  const compassBearing = navInstrument.northAngleDeg;
  const hasProjectedCallouts = projectedFrame.width > 0 && projectedFrame.items.length > 0;
  const projectedCallouts = hasProjectedCallouts ? projectedFrame.items : [];
  const minimalViewerChrome = mode === 'drillholes' || mode === 'resource';
  const sceneHeading = mode === 'resource'
    ? `${resourceFocusLabel(resourceFocus)} resource model`
    : mode === 'metallurgy'
      ? 'Metallurgy reveal'
      : mode === 'subsurface'
        ? 'Subsurface cutaway'
        : 'Drillhole volume';

  return (
    <section className={classNames('tanga-three', visible && 'is-visible', `is-${mode}`)} aria-hidden={!visible}>
      <div ref={hostRef} className="tanga-three__canvas" />
      {!minimalViewerChrome && (
        <>
          <div key={`scene-title-${mode}-${resourceFocus}`} className="tanga-three__scene-title">
            {sceneHeading}
          </div>
          <div className="tanga-three__story-strip" aria-label="3D geology scene sequence">
            {THREE_STORY_FLOW.map((step, index) => (
              <span
                key={step.mode}
                className={classNames(
                  step.mode === mode && 'is-active',
                  THREE_STORY_FLOW.findIndex((item) => item.mode === mode) > index && 'is-complete'
                )}
              >
                <i>{String(index + 1).padStart(2, '0')}</i>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </span>
            ))}
          </div>
          <div className="tanga-three__hud">
            <span>Three.js geology stage</span>
            <strong>{sceneHeading}</strong>
            <small>{status}</small>
          </div>
        </>
      )}
      {!minimalViewerChrome && (
        <section className="tanga-three__callout-layer" aria-label="Geology callouts">
          {hasProjectedCallouts && (
            <svg className="tanga-three__leader-svg" viewBox={`0 0 ${projectedFrame.width} ${projectedFrame.height}`} aria-hidden="true">
              {projectedCallouts.map((callout) => (
                <g key={`leader-${callout.id}`}>
                  <line
                    x1={callout.anchorPixelX}
                    y1={callout.anchorPixelY}
                    x2={callout.boxPixelX}
                    y2={callout.boxPixelY}
                    style={{color: callout.tone, stroke: callout.tone}}
                  />
                  <circle
                    cx={callout.anchorPixelX}
                    cy={callout.anchorPixelY}
                    r="3.5"
                    style={{color: callout.tone, fill: callout.tone, stroke: '#ffffff'}}
                  />
                </g>
              ))}
            </svg>
          )}
          {(hasProjectedCallouts ? projectedCallouts : callouts).map((callout) => (
            <div
              key={callout.id}
              className={classNames('tanga-three__callout', `is-${callout.side ?? 'right'}`)}
              style={{
                '--callout-x': hasProjectedCallouts ? `${(callout as ProjectedThreeCallout).boxPixelX}px` : `${callout.x}%`,
                '--callout-y': hasProjectedCallouts ? `${(callout as ProjectedThreeCallout).boxPixelY}px` : `${callout.y}%`,
                '--callout-tone': callout.tone,
              } as any}
            >
              <span>{callout.label}</span>
              <strong>{callout.detail}</strong>
            </div>
          ))}
        </section>
      )}
      {hoverTooltip && (
        <div
          className="tanga-three__tooltip"
          style={{
            '--tooltip-x': `${hoverTooltip.x}px`,
            '--tooltip-y': `${hoverTooltip.y}px`,
            '--tooltip-tone': hoverTooltip.tone,
          } as any}
          aria-label="3D data tooltip"
        >
          <strong>{hoverTooltip.title}</strong>
          {hoverTooltip.rows.map((row) => (
            <span key={row}>{row}</span>
          ))}
        </div>
      )}
      <section className={classNames('tanga-three__nav-cluster', legendItems.length === 0 && 'is-scale-only')} aria-label="Geology legend compass and scale">
        <div className="tanga-three__instrument-row">
          <div className="tanga-three__mini-compass" aria-label={`Model bearing ${compassBearing} degrees`}>
            <div className="tanga-three__mini-compass-ring" style={{transform: `rotate(${compassBearing}deg)`}}>
              <span>N</span>
              <span>E</span>
              <span>S</span>
              <span>W</span>
            </div>
            <div className="tanga-three__mini-compass-needle" style={{transform: `rotate(${compassBearing}deg)`}} />
            <small>{compassBearing} deg</small>
          </div>
          <div className="tanga-three__mini-scale" aria-label="Local geology scale">
            <div>
              <span style={{width: `${navInstrument.scaleWidth}px`}} />
              <strong>{navInstrument.scaleLabel}</strong>
            </div>
            <small>{navInstrument.scaleDetail}</small>
          </div>
        </div>
        {legendItems.length > 0 && (
          <div className="tanga-three__drill-legend" aria-label="Drillhole legend">
            <div className="tanga-three__drill-legend-head">
              <span>Drillhole Legend</span>
              <strong>{mode === 'metallurgy' ? 'Metallurgy support' : mode === 'subsurface' ? 'Subsurface traces' : 'Assay intervals'}</strong>
            </div>
            {mode === 'drillholes' && (
              <div className="tanga-three__assay-ramp" aria-hidden="true">
                <span>1%</span>
                <i />
                <span>8%+ TGC</span>
              </div>
            )}
            <ol>
              {legendItems.map((item) => (
                <li key={`${item.label}-${item.detail}`}>
                  <i style={{backgroundColor: item.tone, boxShadow: `0 0 18px ${item.tone}`}} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
      {mode === 'metallurgy' && (
        <div className="tanga-three__metallurgy" aria-label="Metallurgy data reveal">
          <div>
            <span>Concentrate</span>
            <strong>&gt;97% TC</strong>
            <small>Across tested composites</small>
          </div>
          <div>
            <span>Oxide recovery</span>
            <strong>93.0%</strong>
            <small>Optimization testwork</small>
          </div>
          <div>
            <span>Fresh recovery</span>
            <strong>94.4%</strong>
            <small>Optimization testwork</small>
          </div>
          <div className="is-outlier">
            <span>TDM004</span>
            <strong>75.8%</strong>
            <small>Carbonate-rich recovery outlier</small>
          </div>
        </div>
      )}
      {mode === 'resource' && (
        <div className="tanga-three__grade-legend" aria-label="TGC grade legend">
          <div className="tanga-three__grade-head">
            <span>TGC Grade</span>
            <strong>{resourceFocusLabel(resourceFocus)} view</strong>
          </div>
          <div className="tanga-three__grade-ramp" aria-hidden="true" />
          <ol>
            {TGC_GRADE_BINS.map((bin) => (
              <li key={bin.label}>
                <i style={{backgroundColor: bin.color, boxShadow: `0 0 20px ${bin.color}`}} />
                <span>
                  <strong>{bin.label}</strong>
                  <small>{bin.range} - {bin.detail}</small>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
