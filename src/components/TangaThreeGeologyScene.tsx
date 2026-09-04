'use client';

import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import proj4 from 'proj4';
import {LITHOLOGY_COLOR_MAP} from '@/lib/boreholes/colors';
import {
  bestPerHole,
  computeIntercepts,
  formatIntercept,
  interceptTone,
  summariseIntercepts,
  type Intercept,
} from '@/lib/assay/intercepts';
import {placeLabels, type LabelCandidate, type Rect} from '@/lib/labels/declutter';

type GeologyMode = 'drillholes' | 'subsurface' | 'resource' | 'mine_planning' | 'metallurgy';
/**
 * Ground palette. The reference decks keep the earth desaturated and warm so
 * the orebody's saturated grade colours are the only vivid thing on screen.
 */
const TERRAIN_GROUND_COLOR = 0x9a8267;   // untextured fallback surface
const TERRAIN_TEXTURE_TINT = 0xcbb9a4;   // multiplier over the satellite map
/** Flat neutral sky, kept dark enough that the deck's HUD still reads over it. */
const SKY_COLOR = 0x2b2723;

export type LabelDensity = 'off' | 'key' | 'all';

/** Intercept labels drawn at each density tier. */
const INTERCEPT_LABEL_BUDGET: Record<LabelDensity, number> = {
  off: 0,
  key: 3,
  all: 18,
};

/**
 * Nominal label footprints for collision checks, measured from the rendered
 * boxes rather than guessed: a story callout lays out at 192x82 and a compact
 * intercept label at 178x56 once its grade quote wraps to two lines. These are
 * rounded up, because over-reserving only leaves extra air between labels
 * whereas under-reserving lets them overlap.
 */
const STORY_LABEL_SIZE = {width: 200, height: 88} as const;
const INTERCEPT_LABEL_SIZE = {width: 184, height: 62} as const;

/**
 * The part of the canvas host actually on screen, in host-local pixels.
 *
 * The host is sized by the deck stage and can extend past the window — a label
 * placed legitimately inside the host would then sit off the right edge, out
 * of the viewer's sight. Labels are laid out against this instead.
 */
function visibleStage(
  host: HTMLElement | null,
  width: number,
  height: number
): {width: number; height: number} {
  if (!host || typeof window === 'undefined') return {width, height};

  const box = host.getBoundingClientRect();
  // How much of the host lies within the window, measured from its own origin.
  const usableWidth = Math.min(width, window.innerWidth - box.left);
  const usableHeight = Math.min(height, window.innerHeight - box.top);

  return {
    // Never collapse to nothing: a degenerate stage would drop every label.
    width: Math.max(240, usableWidth),
    height: Math.max(200, usableHeight),
  };
}

/**
 * Panels and instruments that anchored labels must not cover. Selectors span
 * both this scene's own chrome and the deck chrome layered over it.
 */
const CHROME_SELECTORS = [
  '.tanga-three__scene-title',
  '.tanga-three__story-strip',
  '.tanga-three__nav-cluster',
  '.tanga-three__panel',
  '.tanga-three__legend',
  '.tanga-deck__intercepts',
  '.tanga-deck__depth-scale',
  '.tanga-deck__legend',
  '.tanga-deck__compass',
  '.tanga-deck__pager',
  '.tanga-deck__scale',
  // The right-hand stack was missing, so anchored labels were free to land
  // on the source-data panel and the grade legend — which is how the
  // resource scene ended up with a callout sitting 46% over its own panel.
  '.tanga-deck__data-panel',
  '.tanga-deck__insight-panel',
  '.tanga-deck__ranking',
  '.tanga-three__grade-legend',
  '.tanga-three__drill-legend',
  '.tanga-deck__caption',
  '.tanga-deck__act-rail',
  '.tanga-deck__voice',
] as const;

/**
 * Regions labels must avoid, measured from the live DOM rather than guessed as
 * fractions of the stage. Guessed rectangles drift the moment a panel is
 * restyled or reflows at a breakpoint — and drift silently, as labels sliding
 * under a panel. Measuring costs a handful of reads at 10Hz and is always
 * right.
 */
function chromeKeepOutRects(host: HTMLElement | null, width: number, height: number): Rect[] {
  // The stage edges are still worth reserving: nothing should be flush to them.
  const rects: Rect[] = [
    {x: 0, y: 0, width, height: 56},
    {x: 0, y: height - 56, width, height: 56},
  ];

  if (!host) return rects;

  const origin = host.getBoundingClientRect();

  for (const selector of CHROME_SELECTORS) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const box = element.getBoundingClientRect();
      // Skip anything collapsed or faded out — several of these panels are
      // hidden per scene, and reserving space for them would waste the stage.
      if (box.width <= 0 || box.height <= 0) continue;
      if (Number(getComputedStyle(element).opacity) < 0.05) continue;

      rects.push({
        x: box.left - origin.left,
        y: box.top - origin.top,
        width: box.width,
        height: box.height,
      });
    }
  }

  return rects;
}
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
  /**
   * How many data labels the scene may draw. `key` keeps the deck calm for a
   * presenter; `all` gives the dense drilling look for detailed questions.
   */
  labelDensity?: LabelDensity;
  /** Lifts the derived headline numbers out for the deck chrome to reuse. */
  onAssayFacts?: (facts: AssayFacts | null) => void;
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
  /**
   * `story` callouts are the hand-authored scene narration and always place
   * first; `intercept` callouts are derived from assay data and yield to them
   * when space is short.
   */
  kind?: 'story' | 'intercept';
  /** Higher wins when two callouts compete for the same pixels. */
  priority?: number;
};

type ThreeLegendItem = {
  label: string;
  detail: string;
  tone: string;
  // When set, hovering this legend row cross-highlights that grade population
  // in the 3D model (matches the `assay-<key>` / `resource-grade-<key>` meshes).
  binKey?: string;
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
  /** Composite id this sample represents, e.g. "TDM004". */
  label: string;
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

// High-resolution project-window terrain (Copernicus DEM cubic-resampled over
// the ~7.6 km patch + Esri imagery) — replaces the coarse ~217 m/px region grid
// so the Three.js scenes read smooth and crisp. Generated by
// scripts/gen_hires_terrain.py + gen_hires_texture.py.
const TERRAIN_META_PATH = '/terrain_hires_meta.json';
const TERRAIN_HEIGHT_PATH = '/height_hires.bin';
const TERRAIN_TEXTURE_PATHS: Record<AssetQuality, string> = {
  preview: '/terrain_texture_hires.jpg',
  standard: '/terrain_texture_hires.jpg',
  high: '/terrain_texture_hires.jpg',
};
const TERRAIN_PATCH_WIDTH = 7200;
const TERRAIN_PATCH_DEPTH = 6800;
/**
 * The flotation lab. Deliberately a single abstract node rather than three
 * scattered ones: the slide is one process — material leaves the ground, goes
 * to a lab, a result comes back — and three targets made it read as ambient
 * motion with no destination. Sited off the deposit's north-east shoulder and
 * above the terrain so the arcs stay legible against the sky rather than
 * crossing the model.
 */
const METALLURGY_LAB_POSITION = new THREE.Vector3(760, 330, -980);
/** Seconds one sample takes to travel from its hole to the lab. */
/** Haul trucks on the pit-to-ROM ramp. Enough to read as traffic, not a convoy. */
const HAUL_TRUCK_COUNT = 5;
/** Seconds for one truck to run the ramp end to end. */
const HAUL_LAP_SECONDS = 9;

const METALLURGY_TRAVEL_SECONDS = 2.6;
/** Gap between consecutive departures, so the eight read as a sequence. */
const METALLURGY_SAMPLE_STAGGER = 0.42;
const METALLURGY_REVEAL_COLORS = ['#d96b2b', '#b9954b', '#facc15'] as const;

/**
 * The eight flotation variability composites, with the results stated in the
 * AMC testwork summary (see `product_quality` in src/data/deck.ts).
 *
 * Sending these — named, each carrying its own outcome — rather than ninety
 * anonymous particles is the point: a viewer sees that real, identified
 * material was tested, and the scene reads as a process instead of weather.
 */
const METALLURGY_COMPOSITES: ReadonlyArray<{id: string; result: string}> = [
  {id: 'TDM001', result: '34.8% +150 µm'},
  {id: 'TDM002', result: '42.5% +150 µm'},
  {id: 'TDM003', result: '>61% +150 µm'},
  {id: 'TDM004', result: '75.8% recovery'},
  {id: 'TDM005', result: '>61% +150 µm'},
  {id: 'TDM006', result: '>97% TC concentrate'},
  {id: 'TDM007', result: '>97% TC concentrate'},
  {id: 'TDM008', result: '73% +150 µm · best flake'},
];
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

/**
 * How opaque the ground is for a given scene and camera position.
 *
 * The reference decks make their strongest slide by letting you see the
 * orebody *inside* the rock. Every branch of this function used to return 1,
 * so the "subsurface cutaway" never opened the surface and the only way below
 * ground was to fly the camera under it. These values restore the intent:
 * ground stays solid where it is the subject, and turns to glass where the
 * subject is what lies beneath it.
 *
 * Never returns 0 — a fully invisible surface loses the horizon, and with it
 * any sense of where "ground level" is, which is the reference decks' whole
 * trick for making depth legible.
 */
function terrainOpacityForView(mode: GeologyMode, view: SurfaceCameraView) {
  // Looking up from beneath: the surface becomes a ceiling. Keep it faint so
  // it reads as the roof of the deposit without hiding the model.
  if (view === 'bottom') {
    if (mode === 'subsurface') return 0.16;
    if (mode === 'resource') return 0.2;
    if (mode === 'mine_planning') return 0.24;
    return 0.3;
  }

  // Plan view: the ground is the subject again, so keep it solid.
  if (view === 'top') {
    if (mode === 'subsurface') return 0.55;
    return 1;
  }

  // The default three-quarter view, where most of the deck is presented.
  if (mode === 'subsurface') return 0.28;
  if (mode === 'resource') return 0.62;
  if (mode === 'mine_planning') return 0.7;
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

/**
 * Headline numbers derived once from the loaded assay intervals, so scene
 * labels can quote real drill results instead of describing the rendering.
 */
export type AssayFacts = {
  best: Intercept | null;
  /** Best intercept per hole, ranked by grade x thickness. */
  ranked: Intercept[];
  interceptCount: number;
  holeCount: number;
  cutoffLabel: string;
  bestGradePct: number;
  /** Deepest below-collar extent of any reportable intercept, in metres. */
  deepestOreM: number;
};

/** Adapt the scene's own segment shape to the shared intercept compositor. */
function assayFactsFromSegments(segments: DrillSegment[]): AssayFacts | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const intercepts = computeIntercepts(
    segments.map((segment) => ({
      hole_id: segment.holeId,
      depth_from: segment.depthFrom,
      depth_to: segment.depthTo,
      graphitic_carbon: segment.carbon,
      lon: Number(segment.from?.[0]),
      lat: Number(segment.from?.[1]),
      elevation: Number(segment.from?.[2] ?? 0),
      feature: null,
    }))
  );

  if (intercepts.length === 0) return null;

  const summary = summariseIntercepts(intercepts);
  return {
    best: intercepts[0] ?? null,
    ranked: bestPerHole(intercepts),
    interceptCount: summary.count,
    holeCount: summary.holeCount,
    cutoffLabel: summary.cutoffLabel,
    bestGradePct: summary.bestGradePct,
    deepestOreM: intercepts.reduce((max, i) => Math.max(max, i.toM), 0),
  };
}

/**
 * Turn the top-ranked intercepts into anchored scene labels — the device the
 * reference deck leans on hardest. One label per hole, so a single deep hole
 * cannot monopolise the view, and capped by tier so the scene stays readable.
 */
function interceptCallouts(
  facts: AssayFacts | null,
  maxLabels: number,
  /** Hole already quoted by a story callout — labelling it twice says nothing new. */
  excludeHoleId?: string | null
): Array<{callout: ThreeCallout; intercept: Intercept}> {
  if (!facts || maxLabels <= 0) return [];

  return facts.ranked
    .filter((intercept) => intercept.holeId !== excludeHoleId)
    .slice(0, maxLabels)
    .map((intercept, index) => {
      const {headline, sub} = formatIntercept(intercept, {includeSubRun: false});
      return {
        intercept,
        callout: {
          id: `intercept-${intercept.holeId}-${intercept.fromM}`,
          label: headline,
          detail: sub,
          // Percentages are unused once declutter places the box, but keep a
          // sane fallback in case placement is skipped.
          x: 50,
          y: 50,
          tone: interceptTone(intercept.gradePct),
          anchor: [0, 0, 0] as [number, number, number],
          kind: 'intercept' as const,
          // Rank order becomes priority, so the strongest survive crowding.
          priority: facts.ranked.length - index,
        },
      };
    });
}

/**
 * A miniature process plant: pad, shed, tanks, stack and a short conveyor.
 *
 * Both the metallurgy lab and the mine-plan plant used to be a glowing torus
 * with a sphere in the middle — a circle floating in the air, which read as a
 * marker rather than as a place material goes to. This builds something small
 * that is recognisably a plant, so the arcs and haul routes terminate at an
 * object with a purpose.
 *
 * Returned centred on the origin with its base at y=0, so the caller can drop
 * it straight onto the terrain surface.
 */
function buildMiniPlant(options: {
  scale?: number;
  tone?: THREE.ColorRepresentation;
  accent?: THREE.ColorRepresentation;
  tankCount?: number;
}): THREE.Group {
  const {scale = 1, tone = 0xb9b3a6, accent = 0xd96b2b, tankCount = 3} = options;
  const group = new THREE.Group();

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: tone,
    roughness: 0.62,
    metalness: 0.18,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.5,
    metalness: 0.12,
    emissive: new THREE.Color(accent),
    emissiveIntensity: 0.22,
  });
  const padMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4238,
    roughness: 0.95,
    metalness: 0,
  });

  // Pad the plant stands on, so it reads as sited rather than dropped.
  const pad = new THREE.Mesh(new THREE.BoxGeometry(150 * scale, 3 * scale, 104 * scale), padMaterial);
  pad.position.y = 1.5 * scale;
  pad.receiveShadow = true;
  group.add(pad);

  // Main shed.
  const shed = new THREE.Mesh(new THREE.BoxGeometry(74 * scale, 30 * scale, 44 * scale), shellMaterial);
  shed.position.set(-24 * scale, 18 * scale, 0);
  shed.castShadow = true;
  group.add(shed);

  // Pitched roof, so the silhouette is not a plain block.
  const roof = new THREE.Mesh(new THREE.ConeGeometry(30 * scale, 14 * scale, 4), accentMaterial);
  roof.position.set(-24 * scale, 40 * scale, 0);
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  // Process tanks in a row.
  for (let i = 0; i < tankCount; i += 1) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(11 * scale, 11 * scale, 34 * scale, 16),
      shellMaterial
    );
    tank.position.set((22 + i * 27) * scale, 20 * scale, -10 * scale);
    tank.castShadow = true;
    group.add(tank);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(12 * scale, 12 * scale, 3 * scale, 16),
      accentMaterial
    );
    cap.position.set((22 + i * 27) * scale, 38 * scale, -10 * scale);
    group.add(cap);
  }

  // Stack, the tallest thing on site — reads as "plant" from a distance.
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5 * scale, 6 * scale, 62 * scale, 12),
    shellMaterial
  );
  stack.position.set(4 * scale, 34 * scale, 18 * scale);
  stack.castShadow = true;
  group.add(stack);

  // Conveyor running into the shed.
  const conveyor = new THREE.Mesh(new THREE.BoxGeometry(58 * scale, 3 * scale, 8 * scale), accentMaterial);
  conveyor.position.set(-70 * scale, 26 * scale, 16 * scale);
  conveyor.rotation.z = -0.22;
  group.add(conveyor);

  return group;
}

/**
 * Scene narration. These labels state what the drilling found, not how the
 * renderer draws it — a viewer can read a grade off the screen without the
 * presenter having to say it. `detail` strings that quote assay numbers are
 * filled in from the derived intercepts, never typed in by hand, so they
 * cannot drift from `assay_data.geojson`.
 */
function threeCallouts(
  mode: GeologyMode,
  focus: ResourceFocus,
  assayFacts: AssayFacts | null
): ThreeCallout[] {
  const best = assayFacts?.best;
  const bestQuote = best ? `${best.holeId} · ${formatIntercept(best).sub}` : null;
  const coverage = assayFacts
    ? `${assayFacts.interceptCount} intercepts above ${assayFacts.cutoffLabel} across ${assayFacts.holeCount} holes`
    : null;

  if (mode === 'drillholes') {
    return [
      {
        id: 'collars',
        label: assayFacts ? `${assayFacts.holeCount} holes drilled` : 'Drillhole collars',
        detail: coverage ?? 'Surface control points feeding the 3D assay trace',
        x: 47, y: 28, tone: '#facc15', anchor: [-820, 30, 540], side: 'right', kind: 'story',
      },
      {
        id: 'assays',
        label: best ? 'Best intercept' : 'Carbon intervals',
        detail: bestQuote ?? 'Red-yellow traces mark the stronger TGC intervals',
        x: 61, y: 52, tone: '#ef4444', anchor: [280, -230, -120], side: 'left', kind: 'story',
      },
    ];
  }
  if (mode === 'subsurface') {
    return [
      {
        id: 'cutaway',
        label: assayFacts ? `${assayFacts.cutoffLabel} cut-off` : 'Transparent surface',
        detail: coverage ?? 'Glass terrain stays above the opened subsurface view',
        x: 40, y: 31, tone: '#7dd3fc', anchor: [-780, 36, -650], side: 'right', kind: 'story',
      },
      {
        id: 'volume',
        label: assayFacts ? `Deepest ore to ${Math.round(assayFacts.deepestOreM)}m` : 'Geology volume',
        detail: bestQuote ?? 'Drillholes remain spatially registered below surface',
        x: 64, y: 58, tone: '#2dd4bf', anchor: [360, -300, 190], side: 'left', kind: 'story',
      },
    ];
  }
  if (mode === 'resource') {
    return [
      {
        id: 'blocks',
        label: `${resourceFocusLabel(focus)} blocks`,
        detail: 'Only the requested resource population is emphasized',
        x: 57, y: 35, tone: '#ef4444', anchor: [420, -165, 420], side: 'left', kind: 'story',
      },
      {
        id: 'grade',
        label: assayFacts
          ? `${assayFacts.cutoffLabel} to ${assayFacts.bestGradePct.toFixed(1)}% TGC`
          : 'TGC color ramp',
        detail: coverage ?? 'Every block is shaded by graphite grade',
        x: 36, y: 62, tone: '#facc15', anchor: [-520, -140, 700], side: 'right', kind: 'story',
      },
    ];
  }
  if (mode === 'mine_planning') {
    // One callout only, anchored on the pit/west side so its box sits in the
    // upper-left over the terrain — clear of both the right-docked Pit &
    // Financial panel and the bottom-left drillhole legend.
    return [
      {id: 'pit', label: 'Optimised pit shell', detail: '95 Mt @ 5.70% TGC inside the shell · US$0.58 Bn pit NPV', x: 33, y: 34, tone: '#f59e0b', anchor: [-620, -60, 300], side: 'right', kind: 'story'},
    ];
  }
  // metallurgy (default)
  return [
    // Anchored at the two ends of the story the scene now tells: material
    // leaving identified holes, and the lab it arrives at.
    {id: 'samples', label: '8 variability composites', detail: 'Oxide, transition and fresh material leaving the drilled holes', x: 30, y: 40, tone: '#d96b2b', anchor: [-360, 120, 220], side: 'right', kind: 'story'},
    {id: 'recoveries', label: 'Flotation testwork', detail: '93.0% oxide and 94.4% fresh recovery, both above 97% TC concentrate', x: 62, y: 52, tone: '#b9954b', anchor: [METALLURGY_LAB_POSITION.x, METALLURGY_LAB_POSITION.y, METALLURGY_LAB_POSITION.z], side: 'left', kind: 'story'},
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
      {label: '>8% TGC', detail: 'Purple assay intervals', tone: '#9d00ff', binKey: 'very-high'},
      {label: 'GRSC lithology', detail: 'Host-unit sleeve around traces', tone: '#2dd4bf'},
      {label: 'Collars', detail: 'One collar per drillhole on surface', tone: '#eaffff'},
    ];
  }
  return [
    {label: '>8% TGC', detail: 'Very high assay interval', tone: '#9d00ff', binKey: 'very-high'},
    {label: '6-8% TGC', detail: 'High assay interval', tone: '#ff1616', binKey: 'high'},
    {label: '3-6% TGC', detail: 'Mineralised assay interval', tone: '#ff9f0a', binKey: 'medium'},
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

let licenceBoundaryPromise: Promise<Array<[number, number]> | null> | null = null;

/**
 * The licence outline, as a lon/lat ring.
 *
 * Same source the 2D scenes draw from, so the boundary a viewer sees on the
 * map and the one draped over the 3D terrain are the same polygon rather than
 * two drawings that could drift apart.
 */
function loadLicenceBoundary(): Promise<Array<[number, number]> | null> {
  if (licenceBoundaryPromise) return licenceBoundaryPromise;

  licenceBoundaryPromise = fetchAsset('/generated/boundaries.geojson', {cache: 'force-cache'})
    .then((response) => (response.ok ? response.json() : null))
    .then((payload) => {
      const features = Array.isArray(payload?.features) ? payload.features : [];
      const boundary = features.find((feature: any) => feature?.properties?.layer === 'Project boundary');
      const ring = boundary?.geometry?.coordinates?.[0];
      if (!Array.isArray(ring) || ring.length < 3) return null;

      return ring
        .map((point: any) => [Number(point?.[0]), Number(point?.[1])] as [number, number])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
    })
    .catch(() => null);

  return licenceBoundaryPromise;
}

/**
 * Drape the licence ring over the terrain.
 *
 * Each segment is subdivided before the terrain is sampled, so the line follows
 * the ground across a ridge instead of cutting a straight chord through it —
 * which is the difference between a boundary that looks surveyed onto the
 * surface and one that looks like a floating wireframe.
 */
function buildDrapedBoundary(
  ring: Array<[number, number]>,
  resources: TangaTerrainResources | null,
  lift: number
): THREE.Vector3[] {
  const SUBDIVISIONS = 24;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < ring.length; i += 1) {
    const [lon0, lat0] = ring[i];
    const [lon1, lat1] = ring[(i + 1) % ring.length];

    for (let step = 0; step < SUBDIVISIONS; step += 1) {
      const t = step / SUBDIVISIONS;
      const lon = lon0 + (lon1 - lon0) * t;
      const lat = lat0 + (lat1 - lat0) * t;
      const flat = localPoint(lon, lat, 0);
      points.push(new THREE.Vector3(
        flat.x,
        terrainSurfaceY(resources, flat.x, -flat.z, lift),
        flat.z
      ));
    }
  }

  // Close the loop.
  if (points.length > 0) points.push(points[0].clone());
  return points;
}

type SurfaceRoad = {coordinates: Array<[number, number]>; highway: string};

let surfaceRoadPromise: Promise<SurfaceRoad[]> | null = null;

/**
 * Real OSM roads and tracks across the project area.
 *
 * Draped on the terrain these do more work than their size suggests: a bare
 * landform reads as a rendering, whereas the same landform with the roads
 * people actually drive on reads as a place. They also give an unconscious
 * sense of scale that a scale bar alone does not.
 */
function loadSurfaceRoads(): Promise<SurfaceRoad[]> {
  if (surfaceRoadPromise) return surfaceRoadPromise;

  surfaceRoadPromise = fetchAsset('/generated/roads.geojson', {cache: 'force-cache'})
    .then((response) => (response.ok ? response.json() : null))
    .then((payload) => {
      const features = Array.isArray(payload?.features) ? payload.features : [];
      const roads: SurfaceRoad[] = [];

      for (const feature of features) {
        if (feature?.geometry?.type !== 'LineString') continue;
        const coordinates = (feature.geometry.coordinates ?? [])
          .map((point: any) => [Number(point?.[0]), Number(point?.[1])] as [number, number])
          .filter(([lon, lat]: [number, number]) => Number.isFinite(lon) && Number.isFinite(lat));
        if (coordinates.length < 2) continue;

        roads.push({coordinates, highway: String(feature?.properties?.highway ?? 'unclassified')});
      }

      return roads;
    })
    .catch(() => []);

  return surfaceRoadPromise;
}

/** Drape an open line of lon/lat onto the terrain. */
function drapeLine(
  coordinates: Array<[number, number]>,
  resources: TangaTerrainResources | null,
  lift: number
): THREE.Vector3[] {
  // OSM ways are already finely digitised, so vertices are dense enough to
  // follow the ground without subdividing further.
  return coordinates.map(([lon, lat]) => {
    const flat = localPoint(lon, lat, 0);
    return new THREE.Vector3(flat.x, terrainSurfaceY(resources, flat.x, -flat.z, lift), flat.z);
  });
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
  // Dense segmentation captures the fine relief now available in the 2048×1940
  // hi-res heightmap (~3.7 m spacing). 512×448 ≈ 230k verts — comfortable for
  // modern GPUs and keeps ridgelines crisp instead of faceted at close cameras.
  const segmentsX = 512;
  const segmentsY = 448;
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
    title: `${block.carbon.toFixed(2)}% TGC`,
    tone: bin.color,
    rows: [
      `${bin.label} grade`,
      `${block.classification} resource`,
      `${Math.round(block.dx)} × ${Math.round(block.dy)} × ${Math.round(block.dz)} m block`,
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
  labelDensity = 'key',
  onAssayFacts,
}: TangaThreeGeologySceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  // Terrain surface materials, shared with the legend cross-highlight so the
  // ground can fade back ("x-ray") and reveal the isolated subsurface grade.
  const terrainMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const rotationKeyRef = useRef(rotationKey);
  const cameraCommandRef = useRef<ThreeCameraCommand | null>(cameraCommand ?? null);
  const cameraCommandHandlerRef = useRef<((command: ThreeCameraCommand) => void) | null>(null);
  const consumedCameraCommandIdRef = useRef(0);
  // VRIFY-style legend cross-highlight: hovering a TGC grade isolates that
  // grade in the model; clicking LOCKS the isolation so you can orbit with one
  // population shown. Hover previews over an active lock.
  const [hoveredGrade, setHoveredGrade] = useState<string | null>(null);
  const [lockedGrade, setLockedGrade] = useState<string | null>(null);
  const activeGrade = hoveredGrade ?? lockedGrade;
  const [status, setStatus] = useState('Preparing geology scene');
  const [projectedFrame, setProjectedFrame] = useState<ProjectedCalloutFrame>({width: 0, height: 0, items: []});
  const [navInstrument, setNavInstrument] = useState<ThreeNavInstrument>(DEFAULT_NAV_INSTRUMENT);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);
  // Derived drill results, kept in state so the narration callouts and the
  // headline panel quote the same numbers the scene labels do.
  const [assayFacts, setAssayFacts] = useState<AssayFacts | null>(null);
  // Read inside the scene effect without making label density a dependency —
  // changing tiers must not tear down and rebuild the whole WebGL scene.
  const labelDensityRef = useRef<LabelDensity>(labelDensity);
  // Lets a density change re-place labels immediately rather than waiting for
  // the next animation frame, which matters when the render loop is idling on
  // a static camera (or throttled by the browser).
  const projectCalloutsRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    labelDensityRef.current = labelDensity;
    projectCalloutsRef.current?.();
  }, [labelDensity]);
  // Same reason: a new callback identity from the parent must not remount the scene.
  const onAssayFactsRef = useRef(onAssayFacts);
  useEffect(() => {
    onAssayFactsRef.current = onAssayFacts;
  }, [onAssayFacts]);

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
    // A horizon, not a void. The reference decks put a flat, slightly warm sky
    // behind the ground so there is a visible horizon line — that line is what
    // makes "above ground" and "below ground" legible, and it is the thing that
    // makes a subsurface view read as a deposit rather than as floating shapes.
    // Left transparent (background = null) would show the page's black through,
    // which is what flattened the scene before.
    scene.background = new THREE.Color(SKY_COLOR);
    // Fog tinted to the sky so distant ground fades into the horizon instead of
    // ending on a hard cut.
    scene.fog = new THREE.Fog(SKY_COLOR, 4600, 12000);

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
    // Depth grid intentionally not drawn. It boxed every 3D scene in measured
    // wireframe with elevation ticks, which read as a modelling viewport rather
    // than a presentation. The scale bar, compass and depth bracket carry the
    // same measurement information without wrapping the deposit in a cage.
    // ( is kept for now in case the measured view is wanted as an
    // explicit toggle later.)
    void addDepthGrid;

    const lowCamera = cameraDropKey > 0 || cameraCommandRef.current?.action === 'bottomView';
    const cameraShot = cameraShotForMode(mode, lowCamera);
    let calloutsForProjection = threeCallouts(mode, resourceFocus, null);
    const calloutAnchors = new Map<string, THREE.Vector3>();
    const terrainSurfaceMaterials: THREE.MeshStandardMaterial[] = [];
    // Depth-only twins of the terrain; hidden while the surface is glass.
    const terrainOccluders: THREE.Mesh[] = [];
    // The terrain surfaces themselves, so the mine plan can carve a pit into
    // their height field rather than float a shell over unbroken ground.
    const terrainMeshes: THREE.Mesh[] = [];
    terrainMaterialsRef.current = terrainSurfaceMaterials;
    let surfaceCameraView: SurfaceCameraView = lowCamera ? 'bottom' : 'default';
    const applyTerrainSurfaceView = () => {
      const opacity = terrainOpacityForView(mode, surfaceCameraView);
      const isGlass = opacity < 1;
      terrainSurfaceMaterials.forEach((material) => {
        material.visible = true;
        material.opacity = opacity;
        material.transparent = isGlass;
        // Depth writing has to go with transparency: a see-through surface that
        // still writes depth occludes everything behind it, which is what made
        // the cutaway impossible even at low opacity.
        material.depthWrite = !isGlass;
        material.needsUpdate = true;
      });
      // The terrain also carries depth-only twins (colorWrite off, depthWrite
      // on) whose entire job is to hide what is underground. They have to step
      // aside for the cutaway, or the surface turns to glass and still occludes.
      terrainOccluders.forEach((occluder) => {
        occluder.visible = !isGlass;
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
    // Render at up to 2× device pixels so the high-res draped satellite texture
    // stays crisp (the terrain is the hero) instead of softening at 1.5×.
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Lower exposure so the bright satellite terrain doesn't wash out; a CSS
    // contrast/saturation grade then adds punch. Tuned by measuring canvas
    // luminance (~220 was washed; target ~185 with more tonal range).
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
    // Decorative colour accents. Both kept subtle so the overhead sun always
    // wins on the terrain *top*. Previously an amber PointLight sat BELOW the
    // surface (y=-220) at high intensity, lighting the underside brighter than
    // the top — which read as "brighter from the bottom, dull on top". The warm
    // underglow now only exists where there's a subsurface block model to reveal.
    const showsBlockModel =
      mode === 'subsurface' || mode === 'resource' || mode === 'mine_planning';
    const teal = new THREE.PointLight(0x2dd4bf, showsBlockModel ? 900 : 420, 5200);
    teal.position.set(-1200, 620, -900);
    scene.add(teal);
    if (showsBlockModel) {
      // Gentle warm underglow to lift the voxel model off the dark backdrop —
      // dim enough that it never out-shines the key light on the surface above.
      const amber = new THREE.PointLight(0xfacc15, 300, 4200);
      amber.position.set(1400, -220, 1350);
      scene.add(amber);
    }

    const stage = new THREE.Group();
    groupRef.current = stage;
    scene.add(stage);

    // The ground reference grid that used to sit under the block model is gone.
    // Its job — "anchor the model in space so the subsurface reads as a real 3D
    // model rather than floating voxels" — is now done by the terrain itself:
    // there is a horizon, an opaque ground the pit is carved into, and a depth
    // bracket giving the vertical scale. A wireframe floor on top of all that
    // reads as CAD scaffolding and undercuts the realism it was compensating for.

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
          // Warm mineral brown rather than the old near-white cream. The
          // reference decks keep the ground low-chroma so the orebody's
          // saturated grades are the only vivid thing on screen; a pale
          // surface competes with the data and washes the whole frame out.
          color: TERRAIN_GROUND_COLOR,
          roughness: mode === 'drillholes' || mode === 'subsurface' ? 0.88 : 0.8,
          metalness: 0.0,
          transparent: terrainOpacityForView(mode, surfaceCameraView) < 1,
          opacity: terrainOpacityForView(mode, surfaceCameraView),
          alphaMap: undefined,
          alphaTest: 0,
          side: THREE.DoubleSide,
          vertexColors: true,
          // Barely-there warm bounce. The old dark-green emissive at 0.18 was
          // lifting the whole surface toward white under the environment map.
          emissive: new THREE.Color('#241a12'),
          emissiveIntensity: 0.06,
          depthWrite: terrainOpacityForView(mode, surfaceCameraView) >= 1,
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
      terrainMeshes.push(terrain);
      terrainOccluders.push(terrainOccluder);
      terrainLayer.add(terrainOccluder);
      applyTerrainSurfaceView();
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
            // Neutral-warm multiplier, not a near-white one. The old 0xfff4e2
            // combined with a bright IBL and 1.15 env intensity was blowing the
            // satellite imagery out to a pale glow — the ground lost its rock
            // colour and stopped separating from the white drill collars.
            color: TERRAIN_TEXTURE_TINT,
            // Matte ground. The specular sheen read as wet plastic at this
            // scale and added to the wash.
            roughness: 0.88,
            metalness: 0.0,
            envMapIntensity: 0.55,
            transparent: terrainOpacityForView(mode, surfaceCameraView) < 1,
            opacity: terrainOpacityForView(mode, surfaceCameraView),
            emissive: new THREE.Color('#120d09'),
            emissiveIntensity: 0.03,
            alphaMap: undefined,
            alphaTest: 0,
            side: THREE.DoubleSide,
            depthWrite: terrainOpacityForView(mode, surfaceCameraView) >= 1,
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
        terrainMeshes.push(texturedTerrain);
        terrainOccluders.push(texturedOccluder);
        terrainLayer.add(texturedOccluder);
        applyTerrainSurfaceView();
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
    let haulTrucks: THREE.InstancedMesh | null = null;
    let haulRoute: THREE.CatmullRomCurve3 | null = null;
    const haulDummy = new THREE.Object3D();
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

      // Licence boundary, surveyed onto the terrain. Every 3D scene shows data
      // sitting in the ground without ever saying whose ground it is; the
      // outline is the cheapest way to answer that, and it ties these scenes
      // back to the licence slide. Drawn as a soft halo under a bright core so
      // it reads over both dark rock and bright satellite drape.
      const [licenceRing, surfaceRoads] = await Promise.all([
        loadLicenceBoundary(),
        loadSurfaceRoads(),
      ]);
      if (cancelled) return;

      if (surfaceRoads.length > 0) {
        const roadGroup = new THREE.Group();
        roadGroup.name = 'surface-roads';

        for (const road of surfaceRoads) {
          // Tertiary roads are the through-routes and carry the eye; tracks and
          // service ways sit back so they add texture without competing with
          // the licence outline or the data.
          const isThrough = road.highway === 'tertiary';
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(drapeLine(road.coordinates, terrainResources, 16)),
            new THREE.LineBasicMaterial({
              color: isThrough ? 0xf5ead7 : 0xb9ab95,
              transparent: true,
              opacity: isThrough ? 0.5 : 0.28,
              depthWrite: false,
              fog: true,
            })
          );
          line.renderOrder = 22;
          roadGroup.add(line);
        }

        stage.add(roadGroup);
        registerReveal(roadGroup, 0.3, 1.2, 0.98);
      }

      if (licenceRing && licenceRing.length >= 3) {
        const boundaryGroup = new THREE.Group();
        boundaryGroup.name = 'licence-boundary';

        const halo = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(buildDrapedBoundary(licenceRing, terrainResources, 26)),
          new THREE.LineBasicMaterial({
            color: 0xffa860,
            transparent: true,
            opacity: 0.24,
            depthWrite: false,
            depthTest: false,
            fog: false,
            blending: THREE.AdditiveBlending,
          })
        );
        halo.renderOrder = 24;
        boundaryGroup.add(halo);

        const core = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(buildDrapedBoundary(licenceRing, terrainResources, 30)),
          new THREE.LineBasicMaterial({
            color: 0xf0b64a,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
            depthTest: false,
            fog: false,
          })
        );
        core.renderOrder = 25;
        boundaryGroup.add(core);

        stage.add(boundaryGroup);
        registerReveal(boundaryGroup, 0.42, 1.2, 0.97);
      }

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

      // Composite intercepts from the FULL assay table, never from
      // `shownDrillholes` — that set is subsampled for draw performance, and
      // compositing a sampled hole would report a grade over a length that
      // was never continuously assayed.
      const assayFacts = assayFactsFromSegments(drillholes);
      setAssayFacts(assayFacts);
      onAssayFactsRef.current?.(assayFacts);

      // Rebuild the narration now that real numbers are available, and anchor
      // one intercept label per hole to the middle of its own ore run.
      const visibleHoles = new Set(shownDrillholes.map((segment) => segment.holeId));
      const anchorableFacts: AssayFacts | null = assayFacts
        ? {...assayFacts, ranked: assayFacts.ranked.filter((i) => visibleHoles.has(i.holeId))}
        : null;

      const segmentsByHole = new Map<string, DrillSegment[]>();
      shownDrillholes.forEach((segment) => {
        segmentsByHole.set(segment.holeId, [...(segmentsByHole.get(segment.holeId) ?? []), segment]);
      });

      // Build the full label set once; the density tier is applied per frame
      // in `projectCallouts`, so switching tiers never rebuilds the scene.
      // The best hole is skipped here because the story callout already
      // quotes it — two identical labels would just cost space.
      const storyCallouts = threeCallouts(mode, resourceFocus, assayFacts);
      const anchoredInterceptLabels = interceptCallouts(
        anchorableFacts,
        INTERCEPT_LABEL_BUDGET.all,
        assayFacts?.best?.holeId ?? null
      )
        .filter(({callout, intercept}) => {
          // Anchor the label at the middle of the hole's own ore run, so the
          // leader line lands on the geometry the numbers describe.
          const midDepth = (intercept.fromM + intercept.toM) / 2;
          const holeSegments = segmentsByHole.get(intercept.holeId) ?? [];
          const host = holeSegments.find(
            (segment) => segment.depthFrom <= midDepth && segment.depthTo >= midDepth
          ) ?? holeSegments[0];
          if (!host) return false;

          const start = registeredDrillPoint(host, 'from', terrainResources, drillSurfaceOffsets);
          const end = registeredDrillPoint(host, 'to', terrainResources, drillSurfaceOffsets);
          calloutAnchors.set(callout.id, start.clone().lerp(end, 0.5));
          return true;
        })
        .map(({callout}) => callout);

      calloutsForProjection = [...storyCallouts, ...anchoredInterceptLabels];
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
      // Collars are reference points, not the subject. At r=7.8 with a bright
      // emissive they bloomed into blobs that covered the drill traces and the
      // ground — the traces are the evidence, so the collars give way to them.
      const collarGeometry = new THREE.SphereGeometry(mode === 'resource' ? 3.4 : 4.6, 12, 10);
      const collarMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8e2d6,
        emissive: 0x8899a6,
        emissiveIntensity: 0.12,
        roughness: 0.55,
        metalness: 0.04,
        transparent: true,
        opacity: mode === 'resource' ? 0.5 : 0.82,
      });
      const collars = new THREE.InstancedMesh(collarGeometry, collarMaterial, collarSegments.length);
      collars.castShadow = true;
      collars.receiveShadow = true;
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
        // These float a bare hole id on a tall leader above every collar. On the
        // scenes that now carry anchored intercept labels, they say strictly
        // less than those labels do — an id with no grade — while adding 28-42
        // competing marks that the DOM declutter pass cannot even see, because
        // they are drawn in WebGL. The data labels win; these stand down.
        // Zero everywhere: on the drilling and resource scenes the anchored
        // intercept labels say strictly more, and on the metallurgy and
        // mine-plan scenes a floating hole id is not what the slide is about.
        const collarLabelLimit = 0;
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
        // One departure per composite, from the strongest hole available, so
        // each arc leaves real drilled ground rather than an arbitrary point.
        // Eight travelling samples instead of ninety: the slide is making a
        // point about provenance, not throughput, and ninety particles read as
        // weather.
        // The lab itself: a small plant standing on the ground, not a ring in
        // mid-air. Built first so the sample arcs can terminate on its roof.
        // `labAnchor` is a local clone — the module constant stays untouched so
        // repeated scene rebuilds do not walk the lab up into the sky.
        const labGround = terrainSurfaceY(
          terrainResources,
          METALLURGY_LAB_POSITION.x,
          -METALLURGY_LAB_POSITION.z
        );
        const labPlant = buildMiniPlant({scale: 2.4, accent: METALLURGY_REVEAL_COLORS[0]});
        labPlant.position.set(METALLURGY_LAB_POSITION.x, labGround, METALLURGY_LAB_POSITION.z);
        stage.add(labPlant);
        registerReveal(labPlant, 0.2, 1.3, 0.9);

        const labAnchor = new THREE.Vector3(
          METALLURGY_LAB_POSITION.x,
          labGround + 118,
          METALLURGY_LAB_POSITION.z
        );

        const byGrade = [...shownDrillholes].sort((a, b) => b.carbon - a.carbon);
        const seenHoles = new Set<string>();
        const pulseSource = byGrade
          .filter((segment) => {
            if (seenHoles.has(segment.holeId)) return false;
            seenHoles.add(segment.holeId);
            return true;
          })
          .slice(0, METALLURGY_COMPOSITES.length);

        samplePulseCurves = pulseSource.map((segment, index) => {
          const composite = METALLURGY_COMPOSITES[index % METALLURGY_COMPOSITES.length];
          const start = registeredDrillPoint(segment, 'to', terrainResources, drillSurfaceOffsets);
          // Fan the arrivals slightly so eight arcs terminating on one node stay
          // separable, without losing the single-destination reading.
          const target = labAnchor.clone().add(new THREE.Vector3(
            Math.sin(index * 1.31) * 30,
            Math.cos(index * 1.7) * 22,
            Math.cos(index * 0.93) * 34
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
          samplePulseTrailMaterials.push(trailMaterial);
          const trail = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(56)),
            trailMaterial
          );
          trail.renderOrder = 9;
          stage.add(trail);

          return {
            curve,
            label: composite.id,
            // Beat two: the samples leave in a staggered line rather than all
            // at once, so the eye can follow individual departures.
            delay: index * METALLURGY_SAMPLE_STAGGER,
            phase: 0,
            speed: 1 / METALLURGY_TRAVEL_SECONDS,
          };
        });

        // A ground halo at the pad keeps the arrival readable at a distance.
        [labAnchor].forEach((target, index) => {
          const targetColor = new THREE.Color(METALLURGY_REVEAL_COLORS[0]);
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
        // Mine planning shows the minable resource the pit captures. The pit
        // optimizer selects the economic block population, so 'All' (the full
        // resource envelope the model contains) is what the pit shell wraps —
        // HighTGC was far too aggressive and left the scene empty.
        const activeFocus: ResourceFocus = mode === 'mine_planning' ? 'All' : resourceFocus;
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

          // ── Carve the pit into the ground ───────────────────────────────
          // A shell drawn over unbroken terrain never reads as a hole; the eye
          // needs the ground itself to fall away. Rather than a CSG boolean
          // (expensive, fragile on a 230k-vertex mesh), this displaces the
          // terrain height field: every vertex inside the crest is pushed down
          // along the batter angle until it reaches the floor.
          //
          // The pit is convex, so its radius can be looked up by bearing —
          // which makes the whole carve a per-vertex constant-time operation.
          const rimSamples = hull
            .map(([x, z]) => ({
              angle: Math.atan2(z - centroidZ, x - centroidX),
              radius: Math.hypot(x - centroidX, z - centroidZ),
            }))
            .sort((a, b) => a.angle - b.angle);

          const crestRadiusAt = (angle: number) => {
            if (rimSamples.length === 0) return 0;
            // Bracket the bearing between two hull vertices and interpolate,
            // wrapping at the seam so there is no discontinuity due north.
            let previous = rimSamples[rimSamples.length - 1];
            for (const sample of rimSamples) {
              if (angle <= sample.angle) {
                const span = sample.angle - previous.angle;
                const t = span <= 0 ? 0 : (angle - previous.angle) / span;
                return previous.radius + (sample.radius - previous.radius) * t;
              }
              previous = sample;
            }
            return rimSamples[rimSamples.length - 1].radius;
          };

          // Batter angles the panel already quotes: 50 degrees in fresh rock,
          // 44 in the weathered oxide near surface. Using the shallower angle
          // for the upper third is what gives the profile its slight flare.
          const tanFresh = Math.tan((50 * Math.PI) / 180);
          const tanOxide = Math.tan((44 * Math.PI) / 180);
          const oxideDepth = depth * 0.32;
          const floorY = surfaceY - depth;
          // Soften the last few metres to the crest so the rim is a lip rather
          // than a knife edge cut across the hillside.
          const CREST_FEATHER = 46;

          for (const mesh of terrainMeshes) {
            const position = mesh.geometry.getAttribute('position');
            if (!position) continue;

            for (let i = 0; i < position.count; i += 1) {
              const x = position.getX(i);
              const z = position.getZ(i);
              const dx = x - centroidX;
              const dz = z - centroidZ;
              const radius = Math.hypot(dx, dz);
              const crest = crestRadiusAt(Math.atan2(dz, dx));
              if (crest <= 0 || radius >= crest) continue;

              // Distance inward from the crest drives how deep this point sits.
              const inward = crest - radius;
              const oxideRun = oxideDepth / tanOxide;
              const cut =
                inward <= oxideRun
                  ? inward * tanOxide
                  : oxideDepth + (inward - oxideRun) * tanFresh;

              const feather = clamp(inward / CREST_FEATHER, 0, 1);
              const targetY = Math.max(floorY, surfaceY - cut);
              const current = position.getY(i);
              // Only ever cut down — never lift ground that was already lower
              // than the pit profile at that point.
              position.setY(i, Math.min(current, current + (targetY - current) * feather));
            }

            position.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
          }

          // The bench walls would now z-fight the carved ground they sit in, so
          // the shell keeps only its crest lines — the carve is the pit, the
          // amber rings just annotate the bench elevations.
          pitGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) child.visible = false;
          });

          // ── Surface infrastructure ──────────────────────────────────────
          // Sited off the pit rather than at fixed coordinates: the plant sits
          // clear of the crest on the shallow side, with the ROM pad between
          // the two so the haul route is short. That ordering — pit, ROM,
          // plant, product — is what makes the slide legible as a mine plan
          // rather than a shape floating on terrain.
          const hullRadius = hull.reduce(
            (max, [x, z]) => Math.max(max, Math.hypot(x - centroidX, z - centroidZ)),
            0
          );
          const siteBearing = -0.6; // radians, east-north-east of the pit
          const atBearing = (distance: number, bearing = siteBearing) => {
            const x = centroidX + Math.cos(bearing) * distance;
            const z = centroidZ + Math.sin(bearing) * distance;
            return new THREE.Vector3(x, terrainSurfaceY(terrainResources, x, -z), z);
          };

          // Distances are kept tight to the crest deliberately. The block-model
          // hull is well over a kilometre across, so offsets in the hundreds of
            // metres beyond it push the plant clean out of the camera frustum —
          // which is exactly what happened at +620.
          const romPad = atBearing(hullRadius + 120);
          const plantSite = atBearing(hullRadius + 300);
          const productPad = atBearing(hullRadius + 430, siteBearing + 0.4);

          const minePlant = buildMiniPlant({scale: 3.2, accent: 0xf59e0b});
          minePlant.position.copy(plantSite);
          stage.add(minePlant);
          registerReveal(minePlant, 1.1, 1.3, 0.9);

          // Stockpiles, as cones — the universal shorthand for bulk material.
          const stockpile = (at: THREE.Vector3, radius: number, height: number, color: number) => {
            const pile = new THREE.Mesh(
              new THREE.ConeGeometry(radius, height, 22),
              new THREE.MeshStandardMaterial({color, roughness: 0.98, metalness: 0})
            );
            pile.position.set(at.x, at.y + height / 2, at.z);
            pile.castShadow = true;
            pile.receiveShadow = true;
            return pile;
          };

          const romPile = stockpile(romPad, 78, 46, 0x6b5a45);
          stage.add(romPile);
          registerReveal(romPile, 0.9, 1.2, 0.86);

          const productPile = stockpile(productPad, 54, 34, 0x8b8175);
          stage.add(productPile);
          registerReveal(productPile, 1.3, 1.2, 0.86);

          // ── Haulage ─────────────────────────────────────────────────────
          // A ramp out of the pit to the ROM pad, with trucks running it on a
          // loop. Haulage is the one thing that makes a pit read as *operating*
          // rather than as a surveyed hole, and it is the cheapest possible
          // animation: a handful of boxes on a curve.
          const rampFoot = new THREE.Vector3(centroidX, surfaceY - depth + 12, centroidZ);
          const rampCrest = atBearing(hullRadius + 40);
          const haulCurve = new THREE.CatmullRomCurve3([
            rampFoot,
            new THREE.Vector3(
              (rampFoot.x + rampCrest.x) / 2,
              (rampFoot.y + rampCrest.y) / 2 + 8,
              (rampFoot.z + rampCrest.z) / 2
            ),
            rampCrest,
            new THREE.Vector3(romPad.x, romPad.y + 18, romPad.z),
          ]);

          // The route itself, drawn faintly so it reads even when no truck is
          // on that stretch.
          const haulLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(haulCurve.getPoints(72)),
            new THREE.LineBasicMaterial({color: 0xffb56b, transparent: true, opacity: 0.3})
          );
          haulLine.renderOrder = 8;
          stage.add(haulLine);

          const truckGeometry = new THREE.BoxGeometry(26, 14, 16);
          const truckMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5d9a8,
            roughness: 0.5,
            metalness: 0.2,
            emissive: new THREE.Color(0xf59e0b),
            emissiveIntensity: 0.16,
          });
          haulTrucks = new THREE.InstancedMesh(truckGeometry, truckMaterial, HAUL_TRUCK_COUNT);
          haulTrucks.renderOrder = 9;
          stage.add(haulTrucks);
          haulRoute = haulCurve;
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

    // ── Bloom (VRIFY-style emissive glow) ────────────────────────────────────
    // The high-grade assay drillholes, collars and block-model cells already
    // carry strong emissive materials; a high-threshold UnrealBloom pass makes
    // only those bright elements glow, leaving the terrain/imagery untouched.
    // Kept cheap: threshold 0.82 (few pixels qualify), modest strength/radius,
    // and OutputPass carries the ACES tonemapping + sRGB the direct render did.
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(host.clientWidth, host.clientHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(host.clientWidth, host.clientHeight),
      0.34, // strength — a soft halo, not a blob
      0.4,  // radius — tight so glow hugs the source
      0.92  // threshold — only the very brightest emissive cores bloom
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const resize = () => {
      if (!hostRef.current) return;
      const w = hostRef.current.clientWidth;
      const h = hostRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
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

      const density = labelDensityRef.current;
      if (density === 'off') {
        setProjectedFrame({width, height, items: []});
        return;
      }

      // Project every anchor first, then let the declutter pass decide which
      // labels actually fit. Anchoring alone is what makes the reference decks
      // read well; placing without collision checks is what makes their
      // busiest slides unreadable.
      // Trim to the tier's budget before placing, so the declutter pass is not
      // spending space on labels we would immediately discard.
      const interceptBudget = INTERCEPT_LABEL_BUDGET[density] ?? 0;
      let interceptsTaken = 0;
      const visible = calloutsForProjection.filter((callout) => {
        if (callout.kind !== 'intercept') return true;
        if (interceptsTaken >= interceptBudget) return false;
        interceptsTaken += 1;
        return true;
      });

      const candidates: LabelCandidate[] = [];
      const byId = new Map<string, {callout: ThreeCallout; anchorPixelX: number; anchorPixelY: number}>();

      visible.forEach((callout) => {
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
        const isIntercept = callout.kind === 'intercept';
        const size = isIntercept ? INTERCEPT_LABEL_SIZE : STORY_LABEL_SIZE;

        byId.set(callout.id, {callout, anchorPixelX, anchorPixelY});
        candidates.push({
          id: callout.id,
          anchorPx: {x: anchorPixelX, y: anchorPixelY},
          width: size.width,
          height: size.height,
          // Story narration outranks every derived label, so the authored
          // point of the slide is never crowded out by a drill result.
          priority: isIntercept ? (callout.priority ?? 0) : 10_000,
        });
      });

      // The canvas host can be wider than the window, so placing against its
      // own size alone would push labels past the right edge of the screen.
      // Confine them to the part of the host the viewer can actually see.
      const stageBounds = visibleStage(hostRef.current, width, height);

      const {placed} = placeLabels(candidates, stageBounds, {
        padding: 10,
        keepOutRects: chromeKeepOutRects(hostRef.current, width, height),
      });

      const items: ProjectedThreeCallout[] = [];

      for (const label of placed) {
        const entry = byId.get(label.id);
        if (!entry) continue;

        items.push({
          ...entry.callout,
          side: label.side,
          anchorPixelX: entry.anchorPixelX,
          anchorPixelY: entry.anchorPixelY,
          boxPixelX: label.boxPx.x,
          boxPixelY: label.boxPx.y,
        });
      }

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
    projectCalloutsRef.current = projectCallouts;
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
        // Each sample travels its curve once and stops at the lab. The old
        // version wrapped the position with `% 1`, so samples looped from the
        // lab back to their holes forever — which is what made this read as a
        // screensaver rather than as material being sent away and tested.
        samplePulseCurves.forEach((sample, index) => {
          const localTime = elapsed - revealStart - sample.delay;

          // Beat one: the sample lifts out of the hole before it sets off.
          const emerge = clamp(localTime / 0.55, 0, 1);
          // Beat two: travel, easing out so arrival settles rather than stops dead.
          const travelRaw = clamp(localTime * sample.speed, 0, 1);
          const travel = 1 - Math.pow(1 - travelRaw, 3);

          const position = sample.curve.getPoint(travel);
          // Beat three: a brief swell on arrival, then it rests at the lab.
          const arrival = clamp((travelRaw - 0.82) / 0.18, 0, 1);
          const scale = emerge * (0.9 + arrival * 0.85);

          samplePulseDummy.position.copy(position);
          samplePulseDummy.scale.setScalar(Math.max(0.01, scale));
          samplePulseDummy.updateMatrix();
          samplePulseMesh?.setMatrixAt(index, samplePulseDummy.matrix);
        });
        samplePulseMesh.instanceMatrix.needsUpdate = true;

        // Trails draw in behind their own sample and then hold, so the finished
        // state is a readable set of eight paths from ground to lab that a
        // presenter can talk over.
        samplePulseTrailMaterials.forEach((material, index) => {
          const localTime = elapsed - revealStart - index * METALLURGY_SAMPLE_STAGGER;
          const drawn = clamp(localTime * (1 / METALLURGY_TRAVEL_SECONDS), 0, 1);
          material.opacity = drawn * 0.09;
        });
      }
      // Haulage runs on a continuous loop, unlike the metallurgy samples which
      // tell a one-shot story. An operating pit should never look finished.
      if (haulTrucks && haulRoute) {
        for (let i = 0; i < HAUL_TRUCK_COUNT; i += 1) {
          const offset = i / HAUL_TRUCK_COUNT;
          const t = ((elapsed / HAUL_LAP_SECONDS) + offset) % 1;
          const position = haulRoute.getPoint(t);
          // Face along the route so the boxes read as vehicles, not cargo.
          const ahead = haulRoute.getPoint(Math.min(1, t + 0.02));
          haulDummy.position.copy(position);
          haulDummy.lookAt(ahead);
          // Fade in and out at the ends so trucks do not pop when they wrap.
          const edge = Math.min(t, 1 - t);
          haulDummy.scale.setScalar(clamp(edge / 0.06, 0, 1));
          haulDummy.updateMatrix();
          haulTrucks.setMatrixAt(i, haulDummy.matrix);
        }
        haulTrucks.instanceMatrix.needsUpdate = true;
      }

      const projectionTick = Math.floor(elapsed * 10);
      if (projectionTick !== lastProjectionTick) {
        lastProjectionTick = projectionTick;
        projectCallouts();
        updateNavInstruments();
      }
      composer.render();
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelled = true;
      // Drop the projection hook before teardown so a density change cannot
      // reach into a scene whose renderer is already disposed.
      projectCalloutsRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.dispose();
      composer.dispose();
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

  // Apply the legend cross-highlight: fade every grade block that isn't the
  // hovered TGC grade back, so the hovered population stands alone in the model.
  // The animate loop renders continuously, so opacity changes show immediately.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const DIM = 0.045;
    group.traverse((obj) => {
      const name = (obj as THREE.Object3D).name || '';
      // Grade blocks AND drillhole assay intervals share the grade keys, so both
      // isolate on hover — whichever the current camera can see reacts.
      if (!name.startsWith('resource-grade-') && !name.startsWith('assay-')) return;
      const mesh = obj as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const key = name.replace('resource-grade-', '').replace('assay-', '').replace('-wire', '');
      materials.forEach((raw) => {
        const material = raw as THREE.Material & {opacity: number};
        if (material.userData.baseOpacity === undefined) material.userData.baseOpacity = material.opacity;
        const base = material.userData.baseOpacity as number;
        material.transparent = true;
        material.opacity = !activeGrade || key === activeGrade ? base : Math.min(base, DIM);
      });
    });

    // "X-ray": fade the ground back while a grade is isolated so the subsurface
    // population actually reads, then restore the surface exactly as it was.
    terrainMaterialsRef.current.forEach((material) => {
      if (material.userData.baseTerrain === undefined) {
        material.userData.baseTerrain = {opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite};
      }
      const base = material.userData.baseTerrain as {opacity: number; transparent: boolean; depthWrite: boolean};
      if (activeGrade) {
        // Ghost, don't erase: keep enough surface for spatial context while the
        // subsurface population reads through it.
        material.transparent = true;
        material.opacity = 0.24;
        material.depthWrite = false;
      } else {
        material.transparent = base.transparent;
        material.opacity = base.opacity;
        material.depthWrite = base.depthWrite;
      }
      material.needsUpdate = true;
    });
  }, [activeGrade]);

  // Clear any isolation when the scene changes, so a lock never leaks between scenes.
  useEffect(() => {
    setHoveredGrade(null);
    setLockedGrade(null);
  }, [mode, resourceFocus]);

  const callouts = threeCallouts(mode, resourceFocus, assayFacts);
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
        : mode === 'mine_planning'
          ? 'Mine plan'
          : 'Drillhole volume';

  return (
    <section className={classNames('tanga-three', visible && 'is-visible', `is-${mode}`)} aria-hidden={!visible}>
      <div ref={hostRef} className="tanga-three__canvas" />
      {!minimalViewerChrome && (
        <>
          {/* Scene title removed. It rendered bottom-centre, directly under
              the pager (z-index 7 against the pager's 14), so it was 96%
              occluded — and it repeated what the pager already states: the
              pager reads "METALLURGY 08 / 10" beside a title reading
              "Metallurgy reveal". */}
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
            <span>Interactive 3D model</span>
            <strong>{sceneHeading}</strong>
            <small>{status}</small>
          </div>
        </>
      )}
      {/* The drillhole and resource scenes drop the decorative title and story
          strip, but they keep this layer: its labels now quote real intercepts
          rather than describing the rendering, which is the reason the layer
          was worth hiding on these scenes before. Density is governed by
          `labelDensity` — at the "off" tier the projection yields no items. */}
      {visible && (!minimalViewerChrome || hasProjectedCallouts) && (
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
              className={classNames(
                'tanga-three__callout',
                `is-${callout.side ?? 'right'}`,
                callout.kind === 'intercept' && 'tanga-three__callout--intercept'
              )}
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
          {/* The same compass and scale the map scenes use, rather than a second
              design. The old 3D pair diverged three ways: a different rose,
              degrees written "72 deg" instead of "72°", and — the real defect —
              the ring and the needle were both rotated by +bearing, so the needle
              never moved relative to the N/E/S/W letters and always pointed at N
              whatever the camera did. The map compass also rotates by -bearing, so
              north pointed opposite ways between 2D and 3D slides. Sharing the
              markup makes both correct by construction. */}
          <div className="tanga-deck__compass tanga-compass" aria-label={`Bearing ${Math.round(compassBearing)} degrees`}>
            <div className="tanga-compass__rose" style={{transform: `rotate(${-compassBearing}deg)`}}>
              <i className="tanga-compass__arrow" />
              <span className="tanga-compass__n">N</span>
            </div>
            <small className="tanga-compass__deg">{Math.round(compassBearing)}°</small>
          </div>
          <div className="tanga-deck__scale" aria-label="Local geology scale">
            <div>
              <span style={{width: `${navInstrument.scaleWidth}px`}} />
              <em>{navInstrument.scaleLabel}</em>
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
                <li
                  key={`${item.label}-${item.detail}`}
                  className={classNames(
                    item.binKey && 'tanga-three__grade-item',
                    item.binKey && activeGrade === item.binKey && 'is-hovered',
                    item.binKey && lockedGrade === item.binKey && 'is-locked',
                    item.binKey && activeGrade && activeGrade !== item.binKey && 'is-dim'
                  )}
                  title={item.binKey ? 'Click to lock this grade' : undefined}
                  onPointerEnter={item.binKey ? () => setHoveredGrade(item.binKey!) : undefined}
                  onPointerLeave={item.binKey ? () => setHoveredGrade((current) => (current === item.binKey ? null : current)) : undefined}
                  onClick={item.binKey ? () => setLockedGrade((current) => (current === item.binKey ? null : item.binKey!)) : undefined}
                >
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
          <ol className="tanga-three__grade-list">
            {TGC_GRADE_BINS.map((bin) => (
              <li
                key={bin.label}
                className={classNames(
                  'tanga-three__grade-item',
                  activeGrade === bin.key && 'is-hovered',
                  lockedGrade === bin.key && 'is-locked',
                  activeGrade && activeGrade !== bin.key && 'is-dim'
                )}
                title="Click to lock this grade"
                onPointerEnter={() => setHoveredGrade(bin.key)}
                onPointerLeave={() => setHoveredGrade((current) => (current === bin.key ? null : current))}
                onClick={() => setLockedGrade((current) => (current === bin.key ? null : bin.key))}
              >
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
