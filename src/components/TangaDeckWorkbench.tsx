'use client';

import {FormEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import {DeckGL} from '@deck.gl/react';
import {ColumnLayer, GeoJsonLayer, PathLayer, PolygonLayer, ScatterplotLayer, TextLayer} from '@deck.gl/layers';
import {FlyToInterpolator, LightingEffect, AmbientLight, DirectionalLight} from '@deck.gl/core';
import {WebMercatorViewport} from '@math.gl/web-mercator';
import {ArrowDown, ArrowUp, Box, ChevronLeft, ChevronRight, FlaskConical, HelpCircle, Info, ListOrdered, Maximize2, MessageSquare, Mic, Minimize2, Mountain, NotebookText, Pause, Play, RotateCw, Route, Ship, Square, TrainFront, X, Zap, ZoomIn, ZoomOut} from 'lucide-react';
import {Map} from 'react-map-gl/maplibre';
import {TANGA_INSERT_PROJECT, graphitePeerRows, type GraphitePeerProject} from '@/data/graphitePeerProjects';
import TangaStoryVideoHero from './TangaStoryVideoHero';
import TangaInfoSlide, {type InfoSlideId} from './TangaInfoSlide';
import {
  type CameraAction,
  type CommandIntent,
  type ResourceFocus,
  type RouteTarget,
  type WorkbenchMode,
  commandWantsTangaRanking,
  repairVoiceCommand,
  ruleIntent,
  stripWakePhrase,
} from '@/lib/tanga-voice-command';

// Named loader so we can prefetch the (525 KB) Three.js chunk in the background
// while the user is still on the early map scenes — the first 3D scene then
// renders instantly instead of downloading on arrival.
const loadThreeSceneModule = () => import('./TangaThreeGeologyScene');
const TangaThreeGeologyScene = dynamic(loadThreeSceneModule, {
  ssr: false,
  loading: () => (
    <section className="tanga-three tanga-three--loading is-visible" aria-label="Loading 3D scene">
      <div className="tanga-three__loader tanga-three__loader--branded">
        <div className="tanga-three__loader-spinner" aria-hidden="true"><i /><i /><i /></div>
        <strong>Rendering the deposit in 3D</strong>
        <small>Building terrain, drillholes and the resource model&hellip;</small>
      </div>
    </section>
  ),
});

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type VoiceState = 'idle' | 'permission-needed' | 'listening' | 'executing' | 'blocked';
type StoryHeroState = 'playing' | 'complete' | 'dismissed' | 'error';
type SceneLoadState = 'idle' | 'loading' | 'ready' | 'degraded' | 'error';
type AssetQuality = 'preview' | 'standard' | 'high';
type GraphitePeerProjectRow = ReturnType<typeof graphitePeerRows>[number];

type ThreeCameraCommand = {
  id: number;
  action: 'zoomIn' | 'zoomOut' | 'tiltUp' | 'projectAngle' | 'bottomView' | 'rotateDegrees' | 'orbit360' | 'orbitVertical360';
  degrees?: 90 | 180 | 360;
};

type ThreeLoadReport = {
  scene: SceneLoadState;
  terrain: SceneLoadState;
  quality: AssetQuality;
  message: string;
  elapsedMs?: number;
};

type LoadStage = {
  id: string;
  label: string;
  state: SceneLoadState;
  detail: string;
};

type DeckViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
  transitionInterpolator?: unknown;
  transitionEasing?: (t: number) => number;
};

// Cinematic ease-in-out cubic — camera flights glide in and settle out (a calm,
// geolibre-style move) instead of a linear snap.
const cinematicEase = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const CINEMATIC_FLY = () => new FlyToInterpolator({curve: 1.55});

type GeoJsonFeature = {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties?: Record<string, any>;
};

type RoadPath = {
  path: Array<[number, number, number]>;
  highway: string;
  name: string;
};

type LegendItem = {
  label: string;
  detail: string;
  tone: string;
};

type SlideFact = {
  label: string;
  value: string;
};

type PromptChip = {
  label: string;
  command: string;
  tone: string;
};

type RouteInfo = {
  target: RouteTarget;
  targetLabel: string;
  path: Array<[number, number, number]>;
  distanceMeters: number;
  durationSeconds: number;
  source: 'osrm' | 'fallback';
};

type TerrainCell = {
  polygon: Array<[number, number, number]>;
  elevation: number;
  color: [number, number, number, number];
  label: string;
};

type StoryStep = {
  mode: WorkbenchMode;
  act: string;
  label: string;
  command: string;
  tone: string;
};

type SceneTransitionState = {
  active: boolean;
  key: number;
  target: 'map' | 'model';
  fromMode: WorkbenchMode;
  toMode: WorkbenchMode;
  direction: 'forward' | 'back' | 'jump';
  label: string;
  detail: string;
};

type SceneCallout = {
  id: string;
  label: string;
  detail: string;
  boxX: number;
  boxY: number;
  tone: string;
  anchor?: {
    lon: number;
    lat: number;
    elevationOffset?: number;
  };
  side?: 'left' | 'right' | 'top' | 'bottom';
  offset?: {x: number; y: number};
};

type ProjectedSceneCallout = SceneCallout & {
  boxPixelX: number;
  boxPixelY: number;
  anchorPixelX: number | null;
  anchorPixelY: number | null;
};

type RouteProfile = {
  points: string;
  minElevation: number;
  maxElevation: number;
  distanceLabel: string;
  durationLabel: string;
  targetLabel: string;
  source: 'osrm' | 'fallback';
};

const PROJECT_CENTER = {lon: 38.785, lat: -4.813};
const TOPO_BOUNDS: [number, number, number, number] = [38.72, -5.12, 39.17, -4.72];
const TOPO_VERTICAL_EXAGGERATION = 4.65;
const DEFAULT_MODE: WorkbenchMode = 'ranking';
const METERS_PER_DEGREE_LAT = 110_540;
const METERS_PER_DEGREE_LON = 111_320 * Math.cos((PROJECT_CENTER.lat * Math.PI) / 180);

const ROUTE_TARGETS: Record<RouteTarget, {label: string; lon: number; lat: number; kind: string}> = {
  port: {label: 'Tanga Port', lon: 39.105, lat: -5.064, kind: 'port'},
  power: {label: 'Hale Hydroelectric Power Station', lon: 38.6145868, lat: -5.2980925, kind: 'power'},
  rail: {label: 'Tanga rail terminal', lon: 39.101, lat: -5.073, kind: 'rail'},
};

const POWER_GRID_NODES = [
  {
    id: 'hale-hydro',
    name: 'Hale Hydroelectric Power Station',
    shortName: 'Hale',
    lon: 38.6145868,
    lat: -5.2980925,
    distanceKm: 57.1,
    type: 'Hydro / grid node',
    detail: 'Real OSM location',
  },
  {
    id: 'new-pangani-falls',
    name: 'New Pangani Falls Hydroelectric Power Station',
    shortName: 'New Pangani Falls',
    lon: 38.6592532,
    lat: -5.349903,
    distanceKm: 61.3,
    type: 'Hydro / grid node',
    detail: 'Real OSM location',
  },
];

// Semantic 3-category site palette (was 5+ arbitrary hues — teal/yellow/slate/
// sky/red — which read as random coloured boxes on the imagery). Now:
//   INFRA    cool cyan-slate — built infrastructure (plant, crusher, admin…)
//   WATER    muted blue      — water management
//   MATERIAL muted amber     — ore / product stockpiles (the "value")
const MINE_INFRA_COLOR: [number, number, number, number] = [128, 196, 214, 168];
const MINE_WATER_COLOR: [number, number, number, number] = [70, 158, 210, 132];
const MINE_MATERIAL_COLOR: [number, number, number, number] = [226, 168, 82, 170];

const HYPOTHETICAL_MINE_FACILITIES = [
  {id: 'process-plant', name: 'Hypothetical processing plant', east: 0, north: 0, width: 260, depth: 126, height: 36, bearing: -18, color: MINE_INFRA_COLOR, detail: 'Low-relief DEM plant pad'},
  {id: 'crusher', name: 'Primary crusher', east: -310, north: 115, width: 145, depth: 82, height: 26, bearing: -18, color: MINE_INFRA_COLOR, detail: 'Concept ROM front end'},
  {id: 'workshop', name: 'Workshop and stores', east: 210, north: -240, width: 190, depth: 92, height: 18, bearing: 12, color: MINE_INFRA_COLOR, detail: 'Concept maintenance area'},
  {id: 'admin', name: 'Admin / gatehouse', east: 330, north: 130, width: 86, depth: 54, height: 12, bearing: 10, color: MINE_INFRA_COLOR, detail: 'Concept site office'},
  {id: 'substation', name: 'Mine substation', east: -190, north: -260, width: 104, depth: 72, height: 16, bearing: 4, color: MINE_INFRA_COLOR, detail: 'Concept grid tie-in'},
  {id: 'water-pond', name: 'Water pond', east: -470, north: -285, width: 260, depth: 156, height: 3, bearing: 18, color: MINE_WATER_COLOR, detail: 'Concept water management'},
];

const HYPOTHETICAL_MINE_POINTS = [
  {id: 'rom-pad', name: 'ROM stockpile', east: -540, north: 210, radius: 92, height: 30, color: MINE_MATERIAL_COLOR, detail: 'Concept ore stockpile'},
  {id: 'product-stockpile', name: 'Product stockpile', east: 270, north: -60, radius: 76, height: 22, color: MINE_MATERIAL_COLOR, detail: 'Concept concentrate loadout'},
  {id: 'process-tanks', name: 'Process tanks', east: 50, north: 140, radius: 34, height: 42, color: MINE_INFRA_COLOR, detail: 'Concept reagent/water tanks'},
];

const MODE_LABELS: Record<WorkbenchMode, string> = {
  ranking: 'Graphite peers',
  tanzania: 'Tanzania context',
  project: 'Project focus',
  topography: 'Topography',
  accessibility: 'Accessibility',
  drillholes: 'Drillholes',
  subsurface: 'Subsurface',
  resource: 'Resource model',
  mine_planning: 'Mine plan',
  metallurgy: 'Metallurgy',
  comparison: 'Peer comparison',
};

const SLIDE_FACTS: Record<WorkbenchMode, SlideFact[]> = {
  ranking: [
    {label: 'Basis', value: 'M&I contained graphite'},
    {label: 'Peer set', value: 'Top 10 public projects'},
    {label: 'Tanga slot', value: '#5 after model'},
  ],
  tanzania: [
    {label: 'Region', value: 'Tanga, NE Tanzania'},
    {label: 'District', value: 'Mkinga'},
    {label: 'Coast link', value: '~80 km to port'},
  ],
  project: [
    {label: 'MRE', value: '183 Mt @ 4.86% TGC'},
    {label: 'Classification', value: '148 Mt Indicated'},
    {label: 'Cut-off', value: '3% TGC'},
  ],
  topography: [
    {label: 'Terrain', value: 'Exaggerated local DEM'},
    {label: 'Setting', value: 'Maramba village area'},
    {label: 'Surface', value: 'Raised terrain mesh'},
  ],
  accessibility: [
    {label: 'Hale hydro', value: '57.1 km direct'},
    {label: 'New Pangani', value: '61.3 km direct'},
    {label: 'Plant pad', value: 'Low DEM relief'},
  ],
  drillholes: [
    {label: 'Campaign', value: '2022-2025 drilling'},
    {label: 'Composite', value: '2 m intervals'},
    {label: 'QAQC', value: 'MRE-ready dataset'},
  ],
  subsurface: [
    {label: 'Host rock', value: 'Graphitic schist'},
    {label: 'Estimate', value: 'Ordinary kriging'},
    {label: 'Domains', value: 'Oxide/transition/fresh'},
  ],
  resource: [
    {label: 'Total', value: '183 Mt @ 4.86% TGC'},
    {label: 'Indicated', value: '148 Mt @ 4.94% TGC'},
    {label: 'Inferred', value: '35 Mt @ 4.52% TGC'},
  ],
  mine_planning: [
    {label: 'Ore in pit', value: '95.0 Mt @ 5.70% TGC'},
    {label: 'Contained', value: '≈5.4 Mt graphite'},
    {label: 'Pit value', value: 'US$0.58 Bn (NPV)'},
  ],
  metallurgy: [
    {label: 'Purity', value: '>97% TC concentrate'},
    {label: 'Oxide', value: '93.0% recovery'},
    {label: 'Fresh', value: '94.4% recovery'},
  ],
  comparison: [
    {label: 'Peer slot', value: '#5 by M&I contained graphite'},
    {label: 'Metallurgy', value: '>97% TC concentrate'},
    {label: 'Logistics', value: 'Port / power / rail context'},
  ],
};

type DataTableRow = {group?: string; cells?: string[]; emphasis?: boolean};

type ModeDataTable = {
  title: string;
  source: string;
  columns: string[];
  rows: DataTableRow[];
};

// Sourced from the AMC "Tanga Graphite Mineral Resource Estimate" (19 Dec 2025):
// Table I (Mineral Resource >3% TGC) and Table II (flake size / TC grade).
const MODE_DATA_TABLES: Partial<Record<WorkbenchMode, ModeDataTable>> = {
  topography: {
    title: 'Terrain & Setting',
    source: 'AMC MRE §2.1.1 · local DEM · Mkinga District, Tanga Region',
    columns: ['Metric', 'Value', ''],
    rows: [
      {cells: ['Max elevation', '≈940 m', '']},
      {cells: ['Min elevation', '≈300 m', '']},
      {cells: ['Relief range', '≈640 m', ''], emphasis: true},
      {cells: ['Setting', 'Maramba village', '']},
      {cells: ['Terrain', 'Low-relief foothills', '']},
    ],
  },
  accessibility: {
    title: 'Infrastructure Access',
    source: 'Coastal NE Tanzania · real OSM locations',
    columns: ['Destination', 'Distance', ''],
    rows: [
      {cells: ['Tanga Port', '≈80 km', ''], emphasis: true},
      {cells: ['Hale hydro station', '57 km', '']},
      {cells: ['New Pangani Falls', '61 km', '']},
      {cells: ['Tanga rail terminal', 'coastal link', '']},
      {cells: ['Grid power', 'hydro nodes < 62 km', '']},
    ],
  },
  resource: {
    title: 'Mineral Resource Estimate',
    source: 'JORC 2012 · >3% TGC cut-off · AMC · Nov 2025',
    columns: ['Class', 'Mt', 'TGC %'],
    rows: [
      {cells: ['Indicated', '148', '4.94']},
      {cells: ['Inferred', '35', '4.52']},
      {cells: ['Total', '183', '4.86'], emphasis: true},
    ],
  },
  drillholes: {
    title: 'Diamond Drilling',
    source: 'AMC MRE §3.2 · 2024-25 campaign · Geofields Tanzania',
    columns: ['Metric', 'Value', ''],
    rows: [
      {cells: ['Holes', '100', '']},
      {cells: ['Metres drilled', '≈10 km', '']},
      {cells: ['TGC assays', '3,728', '']},
      {cells: ['Core diameter', 'HQ / NQ', ''], emphasis: true},
    ],
  },
  mine_planning: {
    title: 'Pit & Financial Snapshot',
    source: 'Tanga OreWaste engine · scenario 1050-fine · 9 Aug 2026',
    columns: ['Metric', 'Value', ''],
    rows: [
      {group: 'Pit'},
      {cells: ['Ore', '95 Mt @ 5.70% TGC', '']},
      {cells: ['Contained graphite', '≈5.4 Mt', ''], emphasis: true},
      {cells: ['Strip ratio', '≈0', '']},
      {group: 'Financial'},
      {cells: ['Base price', 'US$1,050 / t', '']},
      {cells: ['Pit value (NPV, 10%)', 'US$0.58 Bn', ''], emphasis: true},
      {group: 'Geometry'},
      {cells: ['Pit slope', '50° fresh · 44° oxide', '']},
      {cells: ['Recovery', '90% fresh · 85% oxide', '']},
    ],
  },
  metallurgy: {
    title: 'Flotation Concentrate',
    source: 'AMC Table II · 8 variability composites · flotation testwork',
    columns: ['Metric', 'Result', ''],
    rows: [
      {cells: ['Concentrate purity', '>97% TC', '']},
      {cells: ['Best flake grade (TDM008)', '73% +150 µm', ''], emphasis: true},
      {cells: ['Typical fresh composites', '60-72% +150 µm', '']},
      {cells: ['Weakest sample', '35% +150 µm', '']},
    ],
  },
};

// Wire the rich narrative from src/data/deck.ts (15 slides) into the live
// 9-mode workbench. `deckSlides` was imported nowhere before this — every
// scene now has a chapter title, story beat, one-line script, and speaker
// notes without any new copy being written.
import {deckSlides} from '@/data/deck';
import type {DeckSlide} from '@/lib/deck';
const slideById: Record<string, DeckSlide> = Object.fromEntries(
  deckSlides.map((slide) => [slide.id, slide] as const)
);
const MODE_NARRATIVE_SOURCE: Record<WorkbenchMode, string> = {
  ranking: 'overview',              // "Where We Are" — macro opportunity
  tanzania: 'licenses',             // "What We Control" — tenement + jurisdiction
  project: 'topography',            // Local relief & AOI
  topography: 'topography',
  accessibility: 'accessibility',
  drillholes: 'drillholes',         // lead slide; also covers _lithology and _assay
  subsurface: 'lithology',          // 3D lithology model
  resource: 'classification',       // Resource classification / JORC (lead over carbon_model)
  mine_planning: 'carbon_model',    // Carbon block model + iso-surface fits the pit shell story
  metallurgy: 'metallurgy',
  comparison: 'investment_thesis',  // Peer comparison closes into the investment case
};

const VIEW_STATES: Record<WorkbenchMode, DeckViewState> = {
  ranking: {longitude: 38, latitude: -6.4, zoom: 1.75, pitch: 0, bearing: 0},
  tanzania: {longitude: 36.4, latitude: -6.5, zoom: 4.35, pitch: 32, bearing: -12},
  project: {longitude: PROJECT_CENTER.lon, latitude: PROJECT_CENTER.lat, zoom: 12.6, pitch: 46, bearing: 20},
  topography: {longitude: PROJECT_CENTER.lon, latitude: PROJECT_CENTER.lat, zoom: 13.4, pitch: 54, bearing: 26},
  accessibility: {longitude: 38.78, latitude: -4.98, zoom: 8.3, pitch: 38, bearing: -14},
  drillholes: {longitude: PROJECT_CENTER.lon, latitude: PROJECT_CENTER.lat, zoom: 13.35, pitch: 62, bearing: 24},
  subsurface: {longitude: PROJECT_CENTER.lon, latitude: PROJECT_CENTER.lat, zoom: 13.55, pitch: 74, bearing: 38},
  resource: {longitude: PROJECT_CENTER.lon, latitude: PROJECT_CENTER.lat, zoom: 13.45, pitch: 68, bearing: 38},
  mine_planning: {longitude: PROJECT_CENTER.lon, latitude: PROJECT_CENTER.lat, zoom: 13.5, pitch: 70, bearing: 40},
  metallurgy: {longitude: PROJECT_CENTER.lon, latitude: PROJECT_CENTER.lat, zoom: 13.4, pitch: 66, bearing: 42},
  comparison: {longitude: 38.5, latitude: -8.1, zoom: 3.4, pitch: 26, bearing: -8},
};

const COMMON_PROMPTS: PromptChip[] = [
  {label: 'Next slide', command: 'next slide', tone: '#a89c94'},
  {label: 'Previous slide', command: 'previous slide', tone: '#a89c94'},
  {label: 'Slide 2', command: 'slide no 2', tone: '#a89c94'},
  {label: 'Slide 7', command: 'slide no 7', tone: '#c7551b'},
  {label: 'Slide 9', command: 'slide no 9', tone: '#b9954b'},
  {label: 'Top 10 projects', command: 'show top 10 graphite projects', tone: '#a89c94'},
  {label: 'Peer compare', command: 'compare Tanga with peers', tone: '#b9954b'},
  {label: 'Project area', command: 'show project area', tone: '#c7551b'},
  {label: 'Resource', command: 'show resource model', tone: '#c7551b'},
  {label: 'High TGC', command: 'zoom to high grade graphite based on TGC', tone: '#c7551b'},
  {label: 'Low TGC', command: 'show me low TGC zones', tone: '#a89c94'},
  {label: 'Low uncertainty', command: 'show low uncertainty indicated blocks', tone: '#41200e'},
  {label: 'High flake', command: 'show higher flake region based on metallurgy', tone: '#41200e'},
  {label: 'Port route', command: 'show road route to Tanga port', tone: '#c7551b'},
  {label: 'Power grid', command: 'show power grid and route to Hale power station', tone: '#41200e'},
  {label: 'Rail route', command: 'show route to train station', tone: '#41200e'},
  {label: 'Topography', command: 'show topography of the area', tone: '#a89c94'},
  {label: 'Drillholes', command: 'show me the drillholes', tone: '#c7551b'},
  {label: 'Lithology', command: 'show lithology and assay drillholes', tone: '#41200e'},
  {label: 'Metallurgy', command: 'show metallurgy', tone: '#c7551b'},
  {label: 'Camera down', command: 'move camera down', tone: '#666666'},
  {label: 'Camera top', command: 'camera at top', tone: '#666666'},
  {label: 'Rotate 90', command: 'rotate 90 degree', tone: '#c7551b'},
  {label: 'Rotate 180', command: 'rotate 180 degree', tone: '#c7551b'},
  {label: 'Rotate 360', command: 'rotate 360 degree', tone: '#c7551b'},
];

const DEFAULT_THREE_LOAD_REPORT: ThreeLoadReport = {
  scene: 'idle',
  terrain: 'idle',
  quality: 'preview',
  message: '3D loads on demand',
};

const DEFAULT_RECENT_COMMANDS: PromptChip[] = [
  {label: 'Topography', command: 'show topography of the area', tone: '#a89c94'},
  {label: 'Project area', command: 'show project area', tone: '#c7551b'},
  {label: 'Port route', command: 'show road route to Tanga port', tone: '#c7551b'},
  {label: 'High TGC', command: 'zoom to high grade graphite based on TGC', tone: '#c7551b'},
  {label: 'Rotate 360', command: 'rotate 360 degree', tone: '#c7551b'},
];

// Animated count-up for headline figures. Parses a leading prefix (e.g. "US$"),
// a number, and a suffix (e.g. " Bn"); animates the number 0 → target on mount.
// Respects prefers-reduced-motion.
function CountUp({value, duration = 1100}: {value: string; duration?: number}) {
  const match = value.match(/^([^\d.-]*)(-?[\d,]*\.?\d+)(.*)$/);
  const [display, setDisplay] = useState(match ? `${match[1]}0${match[3]}` : value);
  useEffect(() => {
    if (!match) { setDisplay(value); return; }
    const prefix = match[1];
    const target = parseFloat(match[2].replace(/,/g, ''));
    const suffix = match[3];
    const decimals = (match[2].split('.')[1] ?? '').length;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !Number.isFinite(target)) { setDisplay(value); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = target * eased;
      const formatted = decimals > 0
        ? current.toFixed(decimals)
        : Math.round(current).toLocaleString();
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, match]);
  return <>{display}</>;
}

function commandHistoryChip(command: string, intent?: CommandIntent | null): PromptChip {
  const normalized = command.trim().toLowerCase();
  const known = COMMON_PROMPTS.find((prompt) => (
    prompt.command.toLowerCase() === normalized ||
    prompt.label.toLowerCase() === normalized ||
    normalized.includes(prompt.label.toLowerCase())
  ));
  if (known) return {...known, command};

  if (intent?.resourceFocus) {
    return {label: resourceFocusLabel(intent.resourceFocus), command, tone: '#c7551b'};
  }
  if (intent?.mode === 'accessibility' && intent.routeTarget) {
    const tones: Record<RouteTarget, string> = {port: '#c7551b', power: '#41200e', rail: '#41200e'};
    return {label: `${ROUTE_TARGETS[intent.routeTarget].label}`, command, tone: tones[intent.routeTarget]};
  }
  if (intent?.mode) {
    return {label: MODE_LABELS[intent.mode], command, tone: intent.mode === 'resource' ? '#c7551b' : '#a89c94'};
  }
  if (intent?.navigation) {
    const label = intent.navigation === 'next'
      ? 'Next slide'
      : intent.navigation === 'previous'
        ? 'Previous slide'
        : `Slide ${intent.slideNumber ?? ''}`.trim();
    return {label, command, tone: '#a89c94'};
  }
  if (intent?.cameraAction) {
    return {label: intentRunLabel(intent), command, tone: '#c7551b'};
  }

  const label = command.split(/\s+/).slice(0, 3).join(' ') || 'Command';
  return {label, command, tone: '#a89c94'};
}

function sceneStateText(state: SceneLoadState) {
  const labels: Record<SceneLoadState, string> = {
    idle: 'Standby',
    loading: 'Loading',
    ready: 'Ready',
    degraded: 'Fallback',
    error: 'Issue',
  };
  return labels[state];
}

const MODE_PROMPT_HINTS: Record<WorkbenchMode, string[]> = {
  ranking: ['top', 'projects', 'resource', 'project'],
  tanzania: ['project', 'topography', 'route'],
  project: ['topography', 'route', 'power', 'rail', 'drillholes'],
  topography: ['topography', 'route', 'power', 'project', 'drillholes'],
  accessibility: ['route', 'port', 'power', 'rail'],
  drillholes: ['drillholes', 'lithology', 'assay', 'resource', 'camera', 'down', 'below'],
  subsurface: ['camera', 'down', 'top', 'below', 'above', 'rotate', 'resource', 'drillholes'],
  resource: ['camera', 'down', 'top', 'resource', 'tgc', 'uncertainty', 'flake', 'below', 'rotate', 'zoom'],
  mine_planning: ['mine', 'plan', 'pit', 'price', 'economic', 'shell', 'ore', 'waste'],
  metallurgy: ['metallurgy', 'flake', 'resource', 'drillholes'],
  comparison: ['compare', 'peer', 'metallurgy', 'resource', 'position'],
};

// Info interstitials shown just BEFORE entering a scene — placed where they add
// narrative value from the viewer's side: the resource numbers before the 3D
// resource model, the metallurgy testwork before the metallurgy reveal, and the
// battery-anode value story before the closing peer comparison.
const INFO_BEFORE: Partial<Record<WorkbenchMode, InfoSlideId>> = {
  drillholes: 'cross-section',
  resource: 'resource-breakdown',
  metallurgy: 'flake-purity',
  comparison: 'battery-value',
};

const STORY_STEPS: StoryStep[] = [
  {mode: 'ranking', act: '01', label: 'Peer field', command: 'show top 10 graphite projects', tone: '#a89c94'},
  {mode: 'tanzania', act: '02', label: 'Country context', command: 'show Tanzania overview', tone: '#a89c94'},
  {mode: 'project', act: '03', label: 'Project area', command: 'show project area', tone: '#c7551b'},
  {mode: 'topography', act: '04', label: 'Topography', command: 'show topography of the area', tone: '#a89c94'},
  {mode: 'accessibility', act: '05', label: 'Access routes', command: 'show road route to Tanga port', tone: '#c7551b'},
  {mode: 'drillholes', act: '06', label: 'Drillholes', command: 'show me the drillholes', tone: '#c7551b'},
  {mode: 'resource', act: '07', label: 'Resource model', command: 'show resource model', tone: '#c7551b'},
  {mode: 'metallurgy', act: '08', label: 'Metallurgy', command: 'show metallurgy', tone: '#41200e'},
  {mode: 'mine_planning', act: '09', label: 'Mine plan', command: 'show mine plan', tone: '#c7551b'},
  {mode: 'comparison', act: '10', label: 'Peer compare', command: 'compare Tanga with peers', tone: '#b9954b'},
];

// ── Three-act story structure — gives the deck a narrative arc so every
// scene visibly advances toward the investment case. ─────────────────────
type StoryAct = {id: string; label: string; theme: string; numeral: string; thesis: string};
const STORY_ACTS: StoryAct[] = [
  {id: 'opportunity', label: 'The Opportunity', theme: '#8fb4d6', numeral: 'I', thesis: 'A large flake-graphite asset in a proven province.'},
  {id: 'asset', label: 'The Asset', theme: '#d96a2a', numeral: 'II', thesis: 'Drill-defined, JORC-compliant, and fully owned.'},
  {id: 'value', label: 'The Value', theme: '#e0a94f', numeral: 'III', thesis: 'Coarse flake, low strip, and a route to market.'},
];
const MODE_ACT: Record<WorkbenchMode, string> = {
  ranking: 'opportunity',
  tanzania: 'opportunity',
  project: 'asset',
  topography: 'asset',
  accessibility: 'asset',
  drillholes: 'asset',
  subsurface: 'asset',
  resource: 'asset',
  metallurgy: 'value',
  mine_planning: 'value',
  comparison: 'value',
};
function actIndexForMode(mode: WorkbenchMode) {
  return Math.max(0, STORY_ACTS.findIndex((a) => a.id === MODE_ACT[mode]));
}

// Investor "why this matters" — plain-English context surfaced by the Ctrl+I
// inspector so a non-technical viewer instantly grasps the value of each scene.
const MODE_INVESTOR_ANGLE: Record<WorkbenchMode, {headline: string; points: string[]}> = {
  ranking: {
    headline: 'Where Tanga sits in the global graphite field',
    points: ['Bars show contained graphite vs the top public peers', 'Tanga slots in at #5 once the resource is revealed', 'A large-scale asset in a proven graphite province'],
  },
  tanzania: {
    headline: 'A mining-friendly, coastal jurisdiction',
    points: ['Tanzania: established mining code, low royalties', 'Coastal Tanga Region — short haul to an Indian Ocean port', 'Neighbouring peers de-risk the geology'],
  },
  project: {
    headline: '100%-owned, contiguous license package',
    points: ['6.4 sq km tenement, fully controlled', 'Roads, villages and power already nearby', 'Low-relief terrain suits open-pit mining'],
  },
  topography: {
    headline: 'Workable terrain lowers build cost',
    points: ['Moderate relief — straightforward pit and infrastructure', 'Real satellite terrain, not a stylised model', 'Drainage and access already understood'],
  },
  accessibility: {
    headline: 'Infrastructure is a de-risking factor',
    points: ['~80 km to Tanga port for export', 'Hydro grid nodes within ~60 km', 'Road, power and rail context cut future CAPEX'],
  },
  drillholes: {
    headline: '100 holes = a drill-defined asset',
    points: ['Colour = grade: red is high, blue is low', '≈10 km of diamond core, 3,728 TGC assays', 'JORC-ready QAQC underpins the resource'],
  },
  subsurface: {
    headline: 'Grade continues at depth',
    points: ['Cutaway shows drillholes below surface', 'Mineralisation is coherent, not scattered', 'Supports a confident 3D geological model'],
  },
  resource: {
    headline: 'The block model — the core of the value',
    points: ['Each block coloured by TGC grade', 'Ordinary kriging, lithology-domained', '183 Mt @ 4.86% TGC, JORC 2012 compliant'],
  },
  metallurgy: {
    headline: 'It converts to a premium product',
    points: ['>97% total carbon concentrate purity', 'Large-flake distribution commands premium pricing', 'Straightforward flotation — no exotic processing'],
  },
  mine_planning: {
    headline: 'A pit that already pays',
    points: ['Only the minable blocks inside the optimised pit are shown', '95 Mt @ 5.70% TGC at a US$1,050/t base case', '≈US$0.58 Bn pit NPV with near-zero strip'],
  },
  comparison: {
    headline: 'Scale, purity and location combined',
    points: ['#5 by M&I contained graphite among public peers', '>97% TC purity beats typical saleable product', 'Logistics already staged — a rare full package'],
  },
};

function storyStepDefaults(mode: WorkbenchMode): {routeTarget?: RouteTarget; resourceFocus?: ResourceFocus} {
  if (mode === 'accessibility') return {routeTarget: 'port'};
  if (mode === 'resource') return {resourceFocus: 'All'};
  return {};
}

function storyIndexForMode(mode: WorkbenchMode) {
  const index = STORY_STEPS.findIndex((step) => step.mode === mode);
  return index >= 0 ? index : 0;
}

function storyStepForMode(mode: WorkbenchMode) {
  return STORY_STEPS[storyIndexForMode(mode)] ?? STORY_STEPS[0];
}

function storyTransitionDirection(fromMode: WorkbenchMode, toMode: WorkbenchMode): SceneTransitionState['direction'] {
  const fromIndex = storyIndexForMode(fromMode);
  const toIndex = storyIndexForMode(toMode);
  if (Math.abs(toIndex - fromIndex) > 1) return 'jump';
  if (toIndex > fromIndex) return 'forward';
  if (toIndex < fromIndex) return 'back';
  return 'jump';
}

const PEER_COMPARISON_PROJECTS = new Set(['Tanga Graphite', 'Mahenge', 'Siviour', 'Epanko', 'Bunyu']);

const PEER_COMPARISON_METRICS = [
  {
    label: 'Peer position',
    value: '#5',
    detail: `${TANGA_INSERT_PROJECT.containedGraphiteMt.toFixed(1)} Mt M&I contained graphite`,
  },
  {
    label: 'Resource scale',
    value: '183 Mt',
    detail: 'Total MRE at 4.86% TGC with 148 Mt Indicated',
  },
  {
    label: 'Metallurgy',
    value: '>97% TC',
    detail: 'Concentrate purity with 93.0% oxide and 94.4% fresh recovery',
  },
  {
    label: 'Location edge',
    value: 'NE Tanzania',
    detail: 'Road, port, rail and hydro-grid context already staged',
  },
];

function peerComparisonNote(project: string) {
  if (project === 'Tanga Graphite') return 'Indicated-heavy MRE plus strong purity/recovery story';
  if (project === 'Mahenge') return 'Large Tanzanian development benchmark';
  if (project === 'Siviour') return 'Battery-anode development comparator';
  if (project === 'Epanko') return 'Permitted Tanzanian graphite peer';
  if (project === 'Bunyu') return 'Coastal Tanzania development reference';
  return 'Public graphite peer';
}

// Shared atmospheric horizon haze (geolibre look). MapLibre's sky spec blends a
// deep upper sky → a lit horizon band → a hazy fog layer near the ground, so
// distant terrain recedes into atmosphere instead of ending on a hard edge.
// Tuned cool-blue with a touch of warmth to sit under the golden-hour sun rig.
// (Older maplibre versions simply ignore the keys they don't know — harmless.)
const SKY_HAZE = {
  'sky-color': '#0a1a2e',
  'sky-horizon-blend': 0.55,
  'horizon-color': '#2a4256',
  'horizon-fog-blend': 0.6,
  'fog-color': '#5d7182',
  'fog-ground-blend': 0.78,
};

// Warm, low golden-hour map light shared by every style, matched to the deck.gl
// sun rig so maplibre's own 3D shading and the deck overlay agree.
const MAP_LIGHT = {anchor: 'map' as const, color: '#ffe8c8', intensity: 0.4, position: [1.35, 135, 60] as [number, number, number]};

const BASE_MAP_STYLE = {
  version: 8,
  projection: {type: 'globe'},
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Esri World Imagery',
    },
  },
  layers: [
    {
      id: 'earth-background',
      type: 'background',
      paint: {
        'background-color': '#06111d',
      },
    },
    {
      id: 'earth-satellite',
      type: 'raster',
      source: 'satellite',
      paint: {
        'raster-brightness-min': 0,
        'raster-brightness-max': 0.92,
        'raster-contrast': 0.12,
        'raster-saturation': 0.08,
      },
    },
  ],
  sky: {
    ...SKY_HAZE,
    'atmosphere-blend': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      1,
      5,
      1,
      8,
      0,
    ],
  },
  light: MAP_LIGHT,
};

// Sentinel-2 cloudless (EOX) — free, uniform, cloud-free 10 m mosaic (CC-BY-4.0,
// attribution required). Used only on the WIDE scenes (country / closing) where a
// clean uniform planet reads better than patchy sub-metre tiles; the zoomed-in
// project scenes keep Esri (sub-metre) for detail.
const SENTINEL_MAP_STYLE = {
  version: 8,
  projection: {type: 'globe'},
  sources: {
    s2cloudless: {
      type: 'raster',
      tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg'],
      tileSize: 256,
      maxzoom: 15,
      attribution: 'Sentinel-2 cloudless (s2maps.eu) by EOX IT Services GmbH',
    },
  },
  layers: [
    {id: 's2-background', type: 'background', paint: {'background-color': '#050a14'}},
    {
      id: 's2-imagery',
      type: 'raster',
      source: 's2cloudless',
      paint: {
        'raster-brightness-min': 0,
        'raster-brightness-max': 0.98,
        'raster-contrast': 0.1,
        'raster-saturation': 0.1,
      },
    },
  ],
  sky: {
    ...SKY_HAZE,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 8, 0],
  },
  light: MAP_LIGHT,
};

const PEER_MAP_STYLE = {
  version: 8,
  projection: {type: 'globe'},
  sources: {
    countryBase: {
      // Sentinel-2 cloudless satellite mosaic — turns the intro globe into a
      // real lit planet (geolibre / Google-Earth look) instead of a muddy
      // desaturated street basemap. Crisp continents make the peer dots pop.
      type: 'raster',
      tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg'],
      tileSize: 256,
      maxzoom: 15,
      attribution: 'Sentinel-2 cloudless (s2maps.eu) by EOX IT Services GmbH',
    },
  },
  layers: [
    {
      id: 'peer-map-background',
      type: 'background',
      paint: {
        // Deep space navy (geolibre-style) so the globe's atmosphere rim reads
        // as a lit planet in space, not a disc on black. The starfield overlay
        // adds stars on top of this.
        'background-color': '#050a14',
      },
    },
    {
      id: 'peer-country-map',
      type: 'raster',
      source: 'countryBase',
      paint: {
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.96,
        'raster-contrast': 0.12,
        'raster-saturation': 0.08,
      },
    },
  ],
  sky: {
    ...SKY_HAZE,
    // Full atmosphere halo on the globe overview (geolibre-style planet glow).
    'atmosphere-blend': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      1,
      4,
      0.9,
      7,
      0,
    ],
  },
  light: {
    anchor: 'map',
    color: '#f5f1eb',
    intensity: 0.34,
    position: [1.25, 90, 68],
  },
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function peerProjectKey(project: Pick<GraphitePeerProject, 'project' | 'country'>) {
  return `${project.project}::${project.country}`;
}

function peerMarkerRadius(project: GraphitePeerProject, selected: boolean) {
  const scaled = clamp(58_000 + project.containedGraphiteMt * 2_150, 74_000, 160_000);
  const tangaBoost = project.isTanga ? 1.18 : 1;
  return scaled * tangaBoost * (selected ? 1.28 : 1);
}

function peerPopupRows(project: GraphitePeerProjectRow) {
  return [
    ['Owner', project.owner ?? project.company],
    ['Listed', project.listing ?? 'Not in peer summary'],
    ['TGC', project.tgcGrade ?? 'Not in peer summary'],
    ['Flake distribution', project.flakeDistribution ?? 'Not cleanly disclosed in peer summary'],
    ['Total resource', project.totalResource ?? project.resource],
    ['M&I resource', project.measuredIndicated ?? project.resource],
    ['Metallurgy', project.metallurgy ?? 'Not in peer summary'],
    ['Source basis', project.sourceLabel],
  ];
}

function reliefHeightAt(lon: number, lat: number) {
  const [minLon, minLat, maxLon, maxLat] = TOPO_BOUNDS;
  const u = clamp((lon - minLon) / (maxLon - minLon), 0, 1);
  const v = clamp((lat - minLat) / (maxLat - minLat), 0, 1);
  const ridge =
    Math.sin(u * Math.PI * 5.2 + 0.8) * 42 +
    Math.cos(v * Math.PI * 4.4) * 34 +
    Math.sin((u + v) * Math.PI * 7.5) * 18;
  const shoulder = Math.exp(-((u - 0.54) ** 2 / 0.08 + (v - 0.43) ** 2 / 0.12)) * 160;
  const valley = Math.exp(-((u - 0.23) ** 2 / 0.018 + (v - 0.72) ** 2 / 0.05)) * -72;

  return (ridge + shoulder + valley) * TOPO_VERTICAL_EXAGGERATION;
}

function deckHeightAt(lon: number, lat: number) {
  const [minLon, minLat, maxLon, maxLat] = TOPO_BOUNDS;
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return 0;
  return reliefHeightAt(lon, lat);
}

const TERRAIN_HYPSO_STOPS: Array<[number, [number, number, number]]> = [
  [32, [38, 86, 116]],    // valleys — cool slate
  [200, [44, 128, 118]],  // teal lowland
  [340, [92, 150, 92]],   // green foothills
  [500, [168, 148, 92]],  // tan slopes
  [680, [204, 168, 112]], // warm ridges
  [900, [234, 216, 188]], // high peaks — pale
];

// ── Golden-hour sun rig (geolibre / VRIFY look) ──────────────────────────────
// A single warm, low-angle key light. Azimuth is measured clockwise from north
// (315° = light from the NW, the classic cartographic hillshade convention so
// relief reads correctly to the eye); altitude is the sun's height above the
// horizon (low = long, dramatic shading). These drive BOTH the analytical
// hillshade baked into the terrain colours below AND the deck.gl LightingEffect
// that lights the extruded props, so the whole scene shares one light source.
const SUN_AZIMUTH_DEG = 315;
const SUN_ALTITUDE_DEG = 34;
// Vertical exaggeration applied to the DEM gradient *for shading only* — the
// real relief here is gentle, so without this the hillshade would be a flat
// wash. It sculpts the slopes without touching the actual cell geometry.
const RELIEF_SHADE_EXAG = 4.2;
// Warm key / cool sky-fill tints (0–1 multipliers per channel). Lit slopes pick
// up golden-hour amber; shadowed slopes fall into a cool blue ambient — the
// single biggest "cinematic" lever.
const SUN_WARM_TINT = [1.06, 1.0, 0.9];
const SKY_COOL_TINT = [0.9, 0.96, 1.08];

const SUN_DIR = (() => {
  const az = (SUN_AZIMUTH_DEG * Math.PI) / 180;
  const alt = (SUN_ALTITUDE_DEG * Math.PI) / 180;
  const horiz = Math.cos(alt);
  // x = east, y = north, z = up
  return [horiz * Math.sin(az), horiz * Math.cos(az), Math.sin(alt)] as const;
})();

// deck.gl lighting rig matching the sun above: a warm golden-hour key light
// (direction = the ray FROM the sun toward the ground = -SUN_DIR) over a cool
// sky-blue ambient fill. This lights the extruded props (buildings, mine
// facilities, columns) so they share the terrain's single light source. No
// shadow pass — the terrain is a flat depth-test-off surface that could not
// receive shadows anyway, and the analytical hillshade already carries relief.
const TANGA_LIGHTING = new LightingEffect({
  ambient: new AmbientLight({color: [176, 202, 230], intensity: 0.95}),
  sun: new DirectionalLight({
    color: [255, 236, 205],
    intensity: 1.15,
    direction: [-SUN_DIR[0], -SUN_DIR[1], -SUN_DIR[2]],
  }),
  fill: new DirectionalLight({
    color: [150, 190, 230],
    intensity: 0.4,
    direction: [SUN_DIR[0], SUN_DIR[1], -0.5],
  }),
});

// Analytical hillshade for one DEM cell from its four corner elevations.
// Returns a shade factor in ~[ambient, 1]: 1 = fully lit slope facing the sun,
// ambient = slope in shadow. dxMeters/dyMeters are the cell's ground size.
function cellHillshade(
  sw: number, se: number, ne: number, nw: number,
  dxMeters: number, dyMeters: number
): number {
  const dzdx = (((se - sw) + (ne - nw)) / (2 * dxMeters)) * RELIEF_SHADE_EXAG;
  const dzdy = (((nw - sw) + (ne - se)) / (2 * dyMeters)) * RELIEF_SHADE_EXAG;
  // Surface normal = normalize(-dzdx, -dzdy, 1)
  const len = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1) || 1;
  const nx = -dzdx / len;
  const ny = -dzdy / len;
  const nz = 1 / len;
  const dot = nx * SUN_DIR[0] + ny * SUN_DIR[1] + nz * SUN_DIR[2];
  // Ambient floor so shadowed faces stay readable, then a soft-ish knee.
  return clamp(0.55 + 0.62 * dot, 0.42, 1.18);
}

// Apply a hillshade factor to an RGB colour, blending in a warm (lit) or cool
// (shadowed) tint so the terrain reads as lit by a golden-hour sun.
function shadeTerrainColor(
  rgb: [number, number, number],
  shade: number
): [number, number, number] {
  const warm = shade >= 1 ? (shade - 1) : 0;          // extra light → warm
  const cool = shade < 0.85 ? (0.85 - shade) : 0;     // in shadow → cool
  return [
    clamp(rgb[0] * shade * (1 + warm * (SUN_WARM_TINT[0] - 1) + cool * (SKY_COOL_TINT[0] - 1)), 0, 255),
    clamp(rgb[1] * shade * (1 + warm * (SUN_WARM_TINT[1] - 1) + cool * (SKY_COOL_TINT[1] - 1)), 0, 255),
    clamp(rgb[2] * shade * (1 + warm * (SUN_WARM_TINT[2] - 1) + cool * (SKY_COOL_TINT[2] - 1)), 0, 255),
  ].map(Math.round) as [number, number, number];
}

function terrainColor(elevation: number): [number, number, number, number] {
  // Smooth continuous hypsometric tint (interpolated, not banded) so the DEM
  // reads as a real elevation surface rather than 5 flat colour steps.
  const first = TERRAIN_HYPSO_STOPS[0];
  const last = TERRAIN_HYPSO_STOPS[TERRAIN_HYPSO_STOPS.length - 1];
  const e = clamp(elevation, first[0], last[0]);
  for (let i = 0; i < TERRAIN_HYPSO_STOPS.length - 1; i += 1) {
    const [e0, c0] = TERRAIN_HYPSO_STOPS[i];
    const [e1, c1] = TERRAIN_HYPSO_STOPS[i + 1];
    if (e <= e1) {
      const t = (e - e0) / (e1 - e0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
        150,
      ];
    }
  }
  return [last[1][0], last[1][1], last[1][2], 150];
}

function terrainPresentationElevation(
  heightAt: (lon: number, lat: number) => number,
  lon: number,
  lat: number,
  mode: WorkbenchMode
) {
  return clamp(heightAt(lon, lat) + 260, 32, mode === 'topography' ? 980 : 560);
}

function localTerrainCells(heightAt: (lon: number, lat: number) => number, mode: WorkbenchMode): TerrainCell[] {
  const [minLon, minLat, maxLon, maxLat] = TOPO_BOUNDS;
  // Higher cell density on the topography scene → smoother, less-blocky relief.
  const columns = mode === 'topography' ? 44 : 22;
  const rows = mode === 'topography' ? 34 : 16;
  const dx = (maxLon - minLon) / columns;
  const dy = (maxLat - minLat) / rows;
  const cells: TerrainCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const west = minLon + column * dx;
      const east = west + dx;
      const south = minLat + row * dy;
      const north = south + dy;
      const lon = west + dx * 0.5;
      const lat = south + dy * 0.5;
      const eastMeters = (lon - PROJECT_CENTER.lon) * METERS_PER_DEGREE_LON;
      const northMeters = (lat - PROJECT_CENTER.lat) * METERS_PER_DEGREE_LAT;
      const radial = Math.sqrt((eastMeters / 12_000) ** 2 + (northMeters / 9_000) ** 2);
      if (radial > 1.05) continue;
      const sw = terrainPresentationElevation(heightAt, west, south, mode);
      const se = terrainPresentationElevation(heightAt, east, south, mode);
      const ne = terrainPresentationElevation(heightAt, east, north, mode);
      const nw = terrainPresentationElevation(heightAt, west, north, mode);
      const elevation = (sw + se + ne + nw) / 4;
      const edgeFade = clamp((1.05 - radial) * 1.55, 0.1, 1);
      const base = terrainColor(elevation);
      // Bake analytical golden-hour hillshade into the cell colour so the flat
      // (non-extruded) DEM surface reads as a lit, sculpted relief.
      const shade = cellHillshade(sw, se, ne, nw, dx * METERS_PER_DEGREE_LON, dy * METERS_PER_DEGREE_LAT);
      const [r, g, b] = shadeTerrainColor([base[0], base[1], base[2]], shade);
      cells.push({
        polygon: [[west, south, sw], [east, south, se], [east, north, ne], [west, north, nw]],
        elevation,
        color: [r, g, b, Math.round(base[3] * edgeFade)] as [number, number, number, number],
        label: `DEM cell ${row + 1}-${column + 1}`,
      });
    }
  }

  return cells;
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

function shortResourceFocusLabel(focus: ResourceFocus) {
  const labels: Record<ResourceFocus, string> = {
    Indicated: 'Indicated',
    Inferred: 'Inferred',
    All: 'All',
    HighTGC: 'High TGC',
    LowTGC: 'Low TGC',
    LowUncertainty: 'Low risk',
    HighFlake: 'Flake',
  };
  return labels[focus];
}

function intentRunLabel(intent: CommandIntent) {
  if (intent.navigation === 'next') return 'next slide';
  if (intent.navigation === 'previous') return 'previous slide';
  if (intent.navigation === 'slide' && intent.slideNumber) return `slide ${intent.slideNumber}`;
  if (intent.resourceFocus) return `${resourceFocusLabel(intent.resourceFocus)} resource`;
  if (intent.cameraAction === 'orbit360') return '360 degree geology spin';
  if (intent.cameraAction === 'orbitVertical360') return 'vertical 360 degree geology spin';
  if (intent.cameraAction === 'rotateDegrees') return `rotate ${intent.degrees ?? 90} degrees`;
  if (intent.cameraAction === 'bottomView') return 'bottom geology view';
  if (intent.cameraAction === 'zoomIn') return 'zoom in';
  if (intent.cameraAction === 'zoomOut') return 'zoom out';
  if (intent.mode) return MODE_LABELS[intent.mode];
  return 'camera command';
}

function modeSummary(mode: WorkbenchMode, routeTarget: RouteTarget, focus: ResourceFocus, tangaInserted: boolean) {
  if (mode === 'ranking') {
    return tangaInserted
      ? 'Tanga is inserted into the peer field after the resource reveal, using M&I contained graphite.'
      : 'A globe-based peer ranking sets the graphite context before the Tanga resource is revealed.';
  }
  if (mode === 'tanzania') return 'Tanga is highlighted inside Tanzania with a project marker.';
  if (mode === 'project') return 'Raised terrain, roads, villages, vegetation, and licence limits are active around the project.';
  if (mode === 'topography') return 'Hillshade, relief mesh, and surface context are pushed into an oblique 3D view.';
  if (mode === 'accessibility') return `Elevated road context, Hale and New Pangani Falls grid nodes, concept mine infrastructure, and route to ${ROUTE_TARGETS[routeTarget].label}.`;
  if (mode === 'drillholes') return 'Assay traces are drawn over the project surface.';
  if (mode === 'subsurface') return 'The surface is opened as a cutaway view with drillholes below.';
  if (mode === 'mine_planning') return 'At a US$1,050/t base case the optimum pit holds 95 Mt of ore at 5.70% TGC — ~5.4 Mt of contained graphite with a US$0.58 Bn NPV, essentially zero strip and 50° fresh-rock slopes.';
  if (mode === 'metallurgy') return 'High-carbon drill intervals animate into concentrate purity, oxide recovery, and fresh recovery metrics.';
  if (mode === 'comparison') return 'Tanga is benchmarked against public graphite peers using contained graphite, MRE confidence, metallurgy, and logistics context.';
  if (focus === 'HighTGC') return 'High-grade graphite blocks are isolated using the TGC proxy in the resource model.';
  if (focus === 'LowTGC') return 'Lower-TGC blocks are isolated to show dilution and weaker graphite zones.';
  if (focus === 'LowUncertainty') return 'Lower-uncertainty blocks are shown using Indicated classification as the confidence proxy.';
  if (focus === 'HighFlake') return 'High-flake target zones use metallurgy context and high-TGC Indicated blocks as a spatial proxy.';
  return `${resourceFocusLabel(focus)} resource blocks are isolated from the block model.`;
}

function modeHeadline(mode: WorkbenchMode, focus: ResourceFocus, tangaInserted: boolean) {
  if (mode === 'ranking') return tangaInserted ? 'Tanga Joins The Field' : 'Graphite Peer Field';
  if (mode === 'resource') return `${resourceFocusLabel(focus)} Blocks`;
  if (mode === 'subsurface') return 'Inside Earth';
  if (mode === 'mine_planning') return 'Economic Pit Optimum';
  if (mode === 'metallurgy') return 'Metallurgy Reveal';
  if (mode === 'comparison') return 'Peer Comparison';
  return 'Tanga, Tanzania';
}

function factsForMode(mode: WorkbenchMode, focus: ResourceFocus) {
  if (mode !== 'resource') return SLIDE_FACTS[mode];

  if (focus === 'HighTGC') {
    return [
      {label: 'Filter', value: '>7% TGC proxy'},
      {label: 'Use', value: 'High-grade spotlight'},
      {label: 'View', value: 'Resource blocks'},
    ];
  }
  if (focus === 'LowTGC') {
    return [
      {label: 'Filter', value: '<3% TGC proxy'},
      {label: 'Use', value: 'Dilution review'},
      {label: 'View', value: 'Low-carbon blocks'},
    ];
  }
  if (focus === 'LowUncertainty') {
    return [
      {label: 'Proxy', value: 'Indicated blocks'},
      {label: 'Use', value: 'Low uncertainty'},
      {label: 'Risk', value: 'Higher confidence'},
    ];
  }
  if (focus === 'HighFlake') {
    return [
      {label: 'Proxy', value: 'High TGC + Indicated'},
      {label: 'Metallurgy', value: '>97% TC conc.'},
      {label: 'Use', value: 'Flake target review'},
    ];
  }

  return SLIDE_FACTS.resource;
}

function legendForMode(mode: WorkbenchMode, routeTarget: RouteTarget, focus: ResourceFocus): LegendItem[] {
  if (mode === 'ranking') {
    return [
      {label: 'Peer projects', detail: 'M&I graphite ranking', tone: '#a89c94'},
      {label: 'Tanzania peers', detail: 'Mahenge, Epanko, Bunyu', tone: '#c7551b'},
      {label: 'Tanga insert', detail: 'After resource reveal', tone: '#41200e'},
    ];
  }
  if (mode === 'comparison') {
    return [
      {label: 'Tanga', detail: '#5 inserted peer slot', tone: '#c7551b'},
      {label: 'Tanzania peers', detail: 'Mahenge, Epanko, Bunyu', tone: '#b9954b'},
      {label: 'Metallurgy', detail: '>97% TC and 93-94% recovery', tone: '#f5f1eb'},
    ];
  }
  if (mode === 'project') {
    return [
      {label: 'Raised DEM', detail: 'Exaggerated project relief', tone: '#a89c94'},
      {label: 'Roads', detail: 'Local access network', tone: '#f8fafc'},
      {label: 'Vegetation', detail: 'Woodland samples', tone: '#4ade80'},
      {label: 'Villages', detail: 'Settlement beacons', tone: '#c7551b'},
    ];
  }
  if (mode === 'topography') {
    return [
      {label: 'DEM relief', detail: 'Raised local mesh context', tone: '#a89c94'},
      {label: 'Hillshade', detail: 'Terrain light/shadow', tone: '#c7551b'},
      {label: 'Vegetation', detail: 'Raised canopy markers', tone: '#4ade80'},
      {label: 'Project AOI', detail: 'Extruded boundary', tone: '#c7551b'},
    ];
  }
  if (mode === 'accessibility') {
    return [
      {label: 'Access route', detail: ROUTE_TARGETS[routeTarget].label, tone: routeTarget === 'rail' ? '#41200e' : '#c7551b'},
      {label: 'Power grid', detail: 'Hale + New Pangani Falls', tone: '#41200e'},
      {label: 'Concept plant', detail: 'Hypothetical 3D mine layout', tone: '#c7551b'},
      {label: 'Major roads', detail: 'Elevated network', tone: '#f8fafc'},
    ];
  }
  if (mode === 'drillholes') {
    return [
      {label: 'High grade', detail: '≥8% TGC intercept', tone: '#ef4444'},
      {label: 'Medium grade', detail: '4-8% TGC', tone: '#facc15'},
      {label: 'Low grade', detail: '<4% TGC', tone: '#2dd4bf'},
      {label: 'Collar', detail: 'Hole start on surface', tone: '#ffffff'},
    ];
  }
  if (mode === 'subsurface') {
    return [
      {label: 'Cutaway', detail: 'Terrain opened for view', tone: '#e2e8f0'},
      {label: 'Drillholes below', detail: 'Assay traces through geology', tone: '#2dd4bf'},
    ];
  }
  if (mode === 'resource') {
    if (focus === 'HighTGC') {
      return [
        {label: 'Very high grade', detail: '>=8% TGC blocks', tone: '#ef4444'},
        {label: 'High grade', detail: '6-8% TGC blocks', tone: '#f97316'},
        {label: 'Model shell', detail: 'Resource envelope', tone: '#facc15'},
      ];
    }
    if (focus === 'LowTGC') {
      return [
        {label: 'Low grade', detail: '1-4% TGC blocks', tone: '#2dd4bf'},
        {label: 'Trace grade', detail: '<1% TGC / dilution', tone: '#7dd3fc'},
        {label: 'Drillhole context', detail: 'Assay traces', tone: '#facc15'},
      ];
    }
    if (focus === 'LowUncertainty') {
      return [
        {label: 'Indicated blocks', detail: 'Lower uncertainty proxy', tone: '#2dd4bf'},
        {label: 'Grade color', detail: 'Every block still by TGC', tone: '#facc15'},
        {label: 'Drillhole density', detail: 'Support context', tone: '#7dd3fc'},
      ];
    }
    if (focus === 'HighFlake') {
      return [
        {label: 'Flake proxy', detail: 'High-TGC Indicated blocks', tone: '#fef3c7'},
        {label: 'Very high grade', detail: '>=8% TGC blocks', tone: '#ef4444'},
        {label: 'High grade', detail: '6-8% TGC blocks', tone: '#f97316'},
      ];
    }
    return [
      {label: 'Very high grade', detail: '>=8% TGC blocks', tone: '#ef4444'},
      {label: 'Medium grade', detail: '4-6% TGC blocks', tone: '#facc15'},
      {label: 'Low grade', detail: '1-4% TGC blocks', tone: '#2dd4bf'},
    ];
  }
  if (mode === 'mine_planning') {
    return [
      {label: 'Ore in pit', detail: '95.0 Mt @ 5.70% TGC', tone: '#ef4444'},
      {label: 'Contained graphite', detail: '≈5.4 Mt', tone: '#facc15'},
      {label: 'Pit value (NPV)', detail: 'US$0.58 Bn @ US$1,050/t', tone: '#2dd4bf'},
    ];
  }
  if (mode === 'metallurgy') {
    return [
      {label: 'Purity', detail: '>97% TC concentrate', tone: '#2dd4bf'},
      {label: 'Best flake', detail: '73% coarser than 150 µm', tone: '#facc15'},
      {label: 'Recovery', detail: '90% fresh · 85% oxide', tone: '#ef4444'},
    ];
  }
  return [
    {label: 'Tanga area', detail: 'Regional boundary', tone: '#a89c94'},
    {label: 'Project AOI', detail: 'License boundary', tone: '#c7551b'},
    {label: 'Project marker', detail: 'Sakariya focus', tone: '#41200e'},
  ];
}

function niceScale(viewState: DeckViewState, threeVisible: boolean) {
  if (threeVisible) {
    return {label: '500 m', width: 118, detail: 'local geology scale'};
  }

  const latitude = viewState.latitude * Math.PI / 180;
  const metersPerPixel = 156543.03392 * Math.cos(latitude) / 2 ** viewState.zoom;
  const targetMeters = Math.max(1, metersPerPixel * 132);
  const magnitude = 10 ** Math.floor(Math.log10(targetMeters));
  const niceMeters = [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .reduce((best, value) => (value <= targetMeters ? value : best), magnitude);
  const width = Math.max(74, Math.min(176, niceMeters / metersPerPixel));
  const label = niceMeters >= 1000 ? `${Number((niceMeters / 1000).toFixed(1))} km` : `${Math.round(niceMeters)} m`;
  return {label, width, detail: 'screen scale'};
}

function formatDistance(meters: number) {
  if (!Number.isFinite(meters) || meters <= 0) return 'route pending';
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters > 50_000 ? 0 : 1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'time pending';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function haversineMeters(a: [number, number], b: [number, number]) {
  const radius = 6_371_000;
  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;
  const deltaLat = (b[1] - a[1]) * Math.PI / 180;
  const deltaLon = (b[0] - a[0]) * Math.PI / 180;
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pathDistanceMeters(path: Array<[number, number, number]>) {
  return path.reduce((total, point, index) => {
    if (index === 0) return total;
    return total + haversineMeters([path[index - 1][0], path[index - 1][1]], [point[0], point[1]]);
  }, 0);
}

function powerGridDistanceSummary() {
  return POWER_GRID_NODES.map((node) => `${node.shortName} ${node.distanceKm.toFixed(1)} km direct`).join(' / ');
}

function routeSummary(routeInfo: RouteInfo | null, routeLoading: boolean, target: RouteTarget) {
  if (routeLoading) return `Finding road route to ${ROUTE_TARGETS[target].label}`;
  if (!routeInfo || routeInfo.target !== target) return `Route to ${ROUTE_TARGETS[target].label} pending`;
  if (target === 'power') {
    return `${ROUTE_TARGETS[target].label}: ${formatDistance(routeInfo.distanceMeters)} / ${formatDuration(routeInfo.durationSeconds)}; ${powerGridDistanceSummary()}`;
  }
  return `${ROUTE_TARGETS[target].label}: ${formatDistance(routeInfo.distanceMeters)} / ${formatDuration(routeInfo.durationSeconds)}`;
}

function routeElevationProfile(path: Array<[number, number, number]>, routeInfo: RouteInfo | null, target: RouteTarget): RouteProfile {
  let cumulativeDistance = 0;
  const distances = path.map((point, index) => {
    if (index > 0) {
      const previous = path[index - 1];
      cumulativeDistance += haversineMeters([previous[0], previous[1]], [point[0], point[1]]);
    }
    return cumulativeDistance;
  });
  const fallbackDistance = pathDistanceMeters(path);
  const totalDistance = routeInfo?.target === target ? routeInfo.distanceMeters : fallbackDistance;
  const durationSeconds = routeInfo?.target === target ? routeInfo.durationSeconds : fallbackDistance / 10.5;
  const elevations = path.map((point) => clamp(point[2] - 56, 0, 420));
  const minElevation = Math.floor(Math.min(...elevations, 0));
  const maxElevation = Math.ceil(Math.max(...elevations, 1));
  const elevationSpan = Math.max(1, maxElevation - minElevation);
  const safeDistance = Math.max(1, distances[distances.length - 1] ?? totalDistance);
  const width = 222;
  const height = 58;
  const points = path.map((_point, index) => {
    const x = 4 + (distances[index] / safeDistance) * width;
    const y = 4 + (1 - (elevations[index] - minElevation) / elevationSpan) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return {
    points,
    minElevation,
    maxElevation,
    distanceLabel: formatDistance(totalDistance),
    durationLabel: formatDuration(durationSeconds),
    targetLabel: ROUTE_TARGETS[target].label,
    source: routeInfo?.target === target ? routeInfo.source : 'fallback',
  };
}

function sceneCalloutsForMode(
  mode: WorkbenchMode,
  routeTarget: RouteTarget,
  focus: ResourceFocus,
  routeProfile: RouteProfile
): SceneCallout[] {
  if (mode === 'tanzania') {
    return [
      {id: 'country', label: 'Tanzania highlighted', detail: 'Regional position before the project dive', boxX: 42, boxY: 40, tone: '#a89c94', anchor: {lon: 35.2, lat: -6.2, elevationOffset: 160000}, offset: {x: -260, y: -120}},
      {id: 'project', label: 'Tanga graphite', detail: 'Northeast Tanzania, coastal access corridor', boxX: 55, boxY: 56, tone: '#c7551b', anchor: {...PROJECT_CENTER, elevationOffset: 90000}, offset: {x: 88, y: -96}},
    ];
  }
  if (mode === 'project') {
    // One bold callout only — the licence. (Was 2; the village-context box added
    // noise and repeated what the map already shows.)
    return [
      {id: 'aoi', label: 'Sakariya project area', detail: 'Contiguous licence over the flake-graphite resource', boxX: 46, boxY: 37, tone: '#c7551b', anchor: {...PROJECT_CENTER, elevationOffset: 180}, offset: {x: 92, y: -116}},
    ];
  }
  if (mode === 'topography') {
    // One callout — the relief story. (The AOI outline is already drawn + labelled.)
    return [
      {id: 'relief', label: 'Local DEM surface', detail: `${routeProfile.minElevation}-${routeProfile.maxElevation} m relief window under the project`, boxX: 50, boxY: 33, tone: '#a89c94', anchor: {...PROJECT_CENTER, elevationOffset: 130}},
    ];
  }
  if (mode === 'accessibility') {
    const targetTone = routeTarget === 'power' ? '#41200e' : routeTarget === 'rail' ? '#41200e' : '#c7551b';
    // Two callouts — the route and the grid. (Dropped the redundant "Tanga
    // project" origin box; the project is obvious as the route's start.)
    return [
      {id: 'route', label: `${routeProfile.distanceLabel} / ${routeProfile.durationLabel}`, detail: `${routeProfile.source === 'osrm' ? 'Road geometry' : 'Indicative route'} to ${routeProfile.targetLabel}`, boxX: 52, boxY: 61, tone: targetTone, anchor: {...ROUTE_TARGETS[routeTarget], elevationOffset: 420}},
      {id: 'power', label: 'Hale + New Pangani', detail: powerGridDistanceSummary(), boxX: 66, boxY: 49, tone: '#41200e', anchor: {lon: 38.636, lat: -5.326, elevationOffset: 440}, offset: {x: 118, y: -84}},
    ];
  }
  if (mode === 'ranking') {
    return [
      {id: 'peer', label: 'Global peer field', detail: 'Top 10 public graphite projects before Tanga reveal', boxX: 45, boxY: 35, tone: '#a89c94'},
    ];
  }
  if (mode === 'comparison') {
    return [
      {id: 'comparison', label: 'Tanga peer slot', detail: '#5 by contained graphite with metallurgy support', boxX: 45, boxY: 38, tone: '#c7551b', anchor: {...PROJECT_CENTER, elevationOffset: 90000}, offset: {x: 104, y: -88}},
    ];
  }
  if (mode === 'resource') {
    return [
      {id: 'focus', label: `${resourceFocusLabel(focus)} filter`, detail: 'Voice command isolates only the requested block population', boxX: 60, boxY: 36, tone: '#ef4444'},
    ];
  }
  return [];
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function colorForCarbon(value: unknown): [number, number, number, number] {
  const carbon = Number(value);
  if (!Number.isFinite(carbon)) return [148, 163, 184, 210];
  if (carbon >= 8) return [239, 68, 68, 230];
  if (carbon >= 4) return [250, 204, 21, 230];
  if (carbon >= 1) return [45, 212, 191, 220];
  return [125, 211, 252, 190];
}

function routePath(target: RouteTarget, heightAt: (lon: number, lat: number) => number) {
  const destination = ROUTE_TARGETS[target];
  const mid: [number, number] = target === 'port' ? [38.93, -4.94] : target === 'rail' ? [38.94, -4.96] : [38.71, -5.05];
  return [[PROJECT_CENTER.lon, PROJECT_CENTER.lat], mid, [destination.lon, destination.lat]]
    .map(([lon, lat]) => [lon, lat, heightAt(lon, lat) + 52] as [number, number, number]);
}

function offsetCoordinate(eastMeters: number, northMeters: number): [number, number] {
  return [
    PROJECT_CENTER.lon + eastMeters / METERS_PER_DEGREE_LON,
    PROJECT_CENTER.lat + northMeters / METERS_PER_DEGREE_LAT,
  ];
}

let lowReliefPlantPadCache: {
  east: number;
  north: number;
  lon: number;
  lat: number;
  elevation: number;
  slope: number;
} | null = null;

function lowReliefPlantPad() {
  if (lowReliefPlantPadCache) return lowReliefPlantPadCache;

  let best = {
    east: 2200,
    north: -500,
    elevation: Infinity,
    slope: Infinity,
    score: Infinity,
  };

  for (let east = -2200; east <= 2200; east += 100) {
    for (let north = -1800; north <= 1000; north += 100) {
      const distance = Math.hypot(east, north);
      if (distance < 650 || distance > 2400) continue;

      const [lon, lat] = offsetCoordinate(east, north);
      const elevation = deckHeightAt(lon, lat);
      const sample = 160;
      const slope = [
        offsetCoordinate(east + sample, north),
        offsetCoordinate(east - sample, north),
        offsetCoordinate(east, north + sample),
        offsetCoordinate(east, north - sample),
      ].map(([sampleLon, sampleLat]) => Math.abs(deckHeightAt(sampleLon, sampleLat) - elevation))
        .reduce((total, value) => total + value, 0) / 4;
      const nearPenalty = Math.max(0, 1200 - distance) * 0.025;
      const score = elevation + slope * 7 + nearPenalty;

      if (score < best.score) {
        best = {east, north, elevation, slope, score};
      }
    }
  }

  const [lon, lat] = offsetCoordinate(best.east, best.north);
  lowReliefPlantPadCache = {
    east: best.east,
    north: best.north,
    lon,
    lat,
    elevation: best.elevation,
    slope: best.slope,
  };
  return lowReliefPlantPadCache;
}

function minePadDetail() {
  const pad = lowReliefPlantPad();
  return `DEM low-relief pad, relative elevation ${pad.elevation.toFixed(0)}, slope ${pad.slope.toFixed(1)}`;
}

function locateMineItem<T extends {east: number; north: number; detail: string; id: string}>(item: T) {
  const pad = lowReliefPlantPad();
  const east = pad.east + item.east;
  const north = pad.north + item.north;
  const [lon, lat] = offsetCoordinate(east, north);
  return {
    ...item,
    east,
    north,
    lon,
    lat,
    padElevation: pad.elevation,
    padSlope: pad.slope,
    detail: item.id === 'process-plant' ? minePadDetail() : item.detail,
  };
}

function locatedMineFacilities() {
  return HYPOTHETICAL_MINE_FACILITIES.map(locateMineItem);
}

function locatedMinePoints() {
  return HYPOTHETICAL_MINE_POINTS.map(locateMineItem);
}

function rotatedFootprint(eastMeters: number, northMeters: number, widthMeters: number, depthMeters: number, bearingDegrees: number) {
  const angle = bearingDegrees * Math.PI / 180;
  const corners = [
    [-widthMeters / 2, -depthMeters / 2],
    [widthMeters / 2, -depthMeters / 2],
    [widthMeters / 2, depthMeters / 2],
    [-widthMeters / 2, depthMeters / 2],
  ];
  const coordinates = corners.map(([east, north]) => {
    const rotatedEast = eastMeters + east * Math.cos(angle) - north * Math.sin(angle);
    const rotatedNorth = northMeters + east * Math.sin(angle) + north * Math.cos(angle);
    return offsetCoordinate(rotatedEast, rotatedNorth);
  });
  coordinates.push(coordinates[0]);
  return [coordinates];
}

function mineFacilityCollection(facilities = locatedMineFacilities()) {
  return {
    type: 'FeatureCollection',
    features: facilities.map((facility) => ({
      type: 'Feature',
      properties: facility,
      geometry: {
        type: 'Polygon',
        coordinates: rotatedFootprint(facility.east, facility.north, facility.width, facility.depth, facility.bearing),
      },
    })),
  };
}

function minePointPosition(point: ReturnType<typeof locatedMinePoints>[number], heightAt: (lon: number, lat: number) => number): [number, number, number] {
  return [point.lon, point.lat, heightAt(point.lon, point.lat) + 28];
}

function mineConveyorPaths(heightAt: (lon: number, lat: number) => number) {
  const pad = lowReliefPlantPad();
  const makePoint = (east: number, north: number, lift = 44) => {
    const [lon, lat] = offsetCoordinate(pad.east + east, pad.north + north);
    return [lon, lat, heightAt(lon, lat) + lift] as [number, number, number];
  };

  return [
    {
      name: 'ROM to crusher conveyor',
      detail: 'Concept material flow',
      path: [makePoint(-990, -190), makePoint(-900, -232, 54), makePoint(-835, -275)],
    },
    {
      name: 'Crusher to process plant conveyor',
      detail: 'Concept material flow',
      path: [makePoint(-835, -275), makePoint(-680, -318, 60), makePoint(-520, -380)],
    },
    {
      name: 'Process plant to product stockpile',
      detail: 'Concept concentrate flow',
      path: [makePoint(-520, -380), makePoint(-385, -404, 54), makePoint(-260, -430)],
    },
  ];
}

function powerGridCorridors(heightAt: (lon: number, lat: number) => number) {
  const point = (lon: number, lat: number, lift = 125) => [lon, lat, heightAt(lon, lat) + lift] as [number, number, number];
  const hale = POWER_GRID_NODES[0];
  const pangani = POWER_GRID_NODES[1];

  return [
    {
      name: 'Indicative project grid spur',
      detail: 'Concept line from project toward Hale grid node',
      path: [
        point(PROJECT_CENTER.lon, PROJECT_CENTER.lat, 145),
        point(38.735, -4.96, 156),
        point(38.675, -5.13, 150),
        point(hale.lon, hale.lat, 142),
      ],
    },
    {
      name: 'Hale - New Pangani Falls link',
      detail: 'Regional hydro grid context',
      path: [
        point(hale.lon, hale.lat, 150),
        point(38.636, -5.326, 154),
        point(pangani.lon, pangani.lat, 150),
      ],
    },
  ];
}

function isProjectLayer(feature: any) {
  return feature.properties?.layer === 'Project boundary';
}

function featurePoint(
  feature: GeoJsonFeature,
  elevationOffset = 0,
  heightAt: (lon: number, lat: number) => number = deckHeightAt
): [number, number, number] {
  const coordinates = feature.geometry?.coordinates ?? [PROJECT_CENTER.lon, PROJECT_CENTER.lat];
  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  const safeLon = Number.isFinite(lon) ? lon : PROJECT_CENTER.lon;
  const safeLat = Number.isFinite(lat) ? lat : PROJECT_CENTER.lat;
  return [
    safeLon,
    safeLat,
    heightAt(safeLon, safeLat) + elevationOffset,
  ];
}

// ── Presentation utilities ───────────────────────────────────────────
// Consistent number formatting so "183 Mt" / "4.86% TGC" never appear as
// "183.0 Mt" or "4.86000%" anywhere in the deck.
function fmtMt(mt: number) {
  return (mt >= 100 ? mt.toFixed(0) : mt.toFixed(1)) + ' Mt';
}
function fmtPct(pct: number, digits = 2) {
  return pct.toFixed(digits) + '%';
}
function fmtElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// URL hash <-> scene id (deep-linkable slides, refresh-safe)
const SCENE_HASH_KEY = 'tanga:lastScene';
function readHashScene(): string | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash.replace(/^#/, '');
  return h || null;
}
function writeHashScene(mode: string) {
  if (typeof window === 'undefined') return;
  if (window.location.hash === `#${mode}`) return;
  history.replaceState(null, '', `#${mode}`);
  try { window.localStorage?.setItem(SCENE_HASH_KEY, mode); } catch {}
}
function readStoredScene(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage?.getItem(SCENE_HASH_KEY); } catch { return null; }
}

function roadImportance(highway: string) {
  if (highway === 'primary' || highway === 'secondary' || highway === 'tertiary') return 3;
  if (highway === 'unclassified' || highway === 'residential') return 2;
  return 1;
}

function featureToRoadPaths(feature: GeoJsonFeature, heightAt: (lon: number, lat: number) => number): RoadPath[] {
  const highway = String(feature.properties?.highway ?? 'track');
  const name = String(feature.properties?.name ?? highway);
  const makePath = (line: any[]) => line
    .map((coord) => {
      const lon = Number(coord?.[0]);
      const lat = Number(coord?.[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      return [lon, lat, heightAt(lon, lat) + 18 + roadImportance(highway) * 7] as [number, number, number];
    })
    .filter(Boolean) as Array<[number, number, number]>;

  if (feature.geometry?.type === 'LineString') {
    const path = makePath(feature.geometry.coordinates ?? []);
    return path.length > 1 ? [{path, highway, name}] : [];
  }

  if (feature.geometry?.type === 'MultiLineString') {
    return (feature.geometry.coordinates ?? [])
      .map((line: any[]) => makePath(line))
      .filter((path: Array<[number, number, number]>) => path.length > 1)
      .map((path: Array<[number, number, number]>) => ({path, highway, name}));
  }

  return [];
}

function treeHeight(feature: GeoJsonFeature) {
  const id = Number(feature.properties?.osm_id ?? 1);
  return 28 + (Math.abs(id) % 6) * 7;
}

function buildingHeight(feature: any) {
  const explicit = Number(feature.properties?.height);
  if (Number.isFinite(explicit) && explicit > 0) return clamp(explicit, 4, 48);
  const levels = Number(feature.properties?.levels);
  if (Number.isFinite(levels) && levels > 0) return clamp(levels * 3.4, 4, 42);
  return feature.properties?.building === 'school' ? 11 : 7;
}

export default function TangaDeckWorkbench() {
  const [activeMode, setActiveMode] = useState<WorkbenchMode>(DEFAULT_MODE);
  const [routeTarget, setRouteTarget] = useState<RouteTarget>('port');
  const [resourceFocus, setResourceFocus] = useState<ResourceFocus>('Indicated');
  const [viewState, setViewState] = useState<DeckViewState>(VIEW_STATES[DEFAULT_MODE]);
  // Timestamp of the last user camera gesture (or scene change) — the idle
  // slow-orbit only kicks in once the camera has been still for a beat.
  const lastCameraInteractRef = useRef<number>(0);
  const [commandText, setCommandText] = useState('');
  const [statusText, setStatusText] = useState('Peer ranking ready');
  const [pipeline, setPipeline] = useState('Text/voice -> intent -> map action');
  const [labels, setLabels] = useState<GeoJsonFeature[]>([]);
  const [villages, setVillages] = useState<GeoJsonFeature[]>([]);
  const [vegetation, setVegetation] = useState<GeoJsonFeature[]>([]);
  const [roadFeatures, setRoadFeatures] = useState<GeoJsonFeature[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mapLoadState, setMapLoadState] = useState<SceneLoadState>('loading');
  const [contextLoadState, setContextLoadState] = useState<SceneLoadState>('idle');
  const [routeLoadState, setRouteLoadState] = useState<SceneLoadState>('idle');
  const [threeLoadReport, setThreeLoadReport] = useState<ThreeLoadReport>(DEFAULT_THREE_LOAD_REPORT);
  const [recentCommands, setRecentCommands] = useState<PromptChip[]>(DEFAULT_RECENT_COMMANDS);
  const [commandTimingText, setCommandTimingText] = useState('No command run yet');
  const [llmStatus, setLlmStatus] = useState<'checking' | 'online' | 'fallback'>('fallback');
  const [isListening, setIsListening] = useState(false);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceEngine, setVoiceEngine] = useState<'none' | 'browser' | 'recorder'>('none');
  const [voiceDebug, setVoiceDebug] = useState('Voice diagnostics idle');
  const [storyHeroState, setStoryHeroState] = useState<StoryHeroState>('playing');
  const [contextReady, setContextReady] = useState(false);
  const [resourceHasBeenShown, setResourceHasBeenShown] = useState(false);
  const [threeSceneRequested, setThreeSceneRequested] = useState(false);
  const [threeCameraCommand, setThreeCameraCommand] = useState<ThreeCameraCommand | null>(null);
  const [selectedPeerProject, setSelectedPeerProject] = useState<GraphitePeerProjectRow | null>(null);
  const [stageSize, setStageSize] = useState({width: 1600, height: 950});
  const [sceneTransition, setSceneTransition] = useState<SceneTransitionState>({
    active: false,
    key: 0,
    target: 'map',
    fromMode: DEFAULT_MODE,
    toMode: DEFAULT_MODE,
    direction: 'jump',
    label: MODE_LABELS[DEFAULT_MODE],
    detail: 'Presentation scene ready',
  });
  const stageRef = useRef<HTMLElement | null>(null);
  const previousModeRef = useRef<WorkbenchMode>(DEFAULT_MODE);
  const sceneTransitionKeyRef = useRef(0);
  const contextLoadRef = useRef<Promise<void> | null>(null);
  const appStartedAtRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  const firstCommandLoggedRef = useRef(false);
  const uiInteractionUntilRef = useRef(0);
  const recognitionRef = useRef<any | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const autoListenRef = useRef(false);
  const voiceSessionRef = useRef(0);
  const voiceRestartTimerRef = useRef<number | null>(null);
  const browserSpeechWatchdogRef = useRef<number | null>(null);
  const browserSpeechErrorCountRef = useRef(0);
  const lastVoiceTranscriptAtRef = useRef(0);
  const runVoiceTranscriptRef = useRef<(raw: string) => void>(() => undefined);

  const dismissStoryHero = useCallback(() => {
    setStoryHeroState((current) => current === 'playing' || current === 'error' ? 'dismissed' : current);
  }, []);

  const completeStoryHero = useCallback(() => {
    setStoryHeroState((current) => current === 'playing' || current === 'error' ? 'complete' : current);
  }, []);

  const loadContextData = useCallback(() => {
    if (contextLoadRef.current) return contextLoadRef.current;

    contextLoadRef.current = (async () => {
      const startedAt = performance.now();
      setContextLoadState('loading');
      const [labelResult, treeResult, roadResult] = await Promise.allSettled([
        fetch('/generated/labels.geojson').then((response) => response.json()),
        fetch('/generated/trees.geojson').then((response) => response.json()),
        fetch('/generated/roads.geojson').then((response) => response.json()),
      ]);

      if (labelResult.status === 'fulfilled') {
        const features = (labelResult.value.features ?? []) as GeoJsonFeature[];
        setLabels(features.filter((feature) => Number(feature.properties?.priority ?? 0) >= 8));
        setVillages(features.filter((feature) => {
          const featureClass = String(feature.properties?.class ?? '');
          const kind = String(feature.properties?.kind ?? '');
          return featureClass === 'village' || kind === 'place';
        }));
      }

      if (treeResult.status === 'fulfilled') {
        setVegetation(((treeResult.value.features ?? []) as GeoJsonFeature[])
          .filter((feature) => feature.geometry?.type === 'Point'));
      }

      if (roadResult.status === 'fulfilled') {
        setRoadFeatures((roadResult.value.features ?? []) as GeoJsonFeature[]);
      }

      const fulfilledCount = [labelResult, treeResult, roadResult].filter((result) => result.status === 'fulfilled').length;
      setContextReady(fulfilledCount > 0);
      setContextLoadState(fulfilledCount === 3 ? 'ready' : fulfilledCount > 0 ? 'degraded' : 'error');
      console.info(`[Tanga telemetry] local context ${fulfilledCount === 3 ? 'ready' : 'fallback'} in ${Math.round(performance.now() - startedAt)}ms`);
    })().catch(() => {
      setLabels([]);
      setVillages([]);
      setVegetation([]);
      setRoadFeatures([]);
      setContextReady(false);
      setContextLoadState('degraded');
      contextLoadRef.current = null;
    });

    return contextLoadRef.current;
  }, []);

  const heightAt = useCallback((lon: number, lat: number) => deckHeightAt(lon, lat), []);
  const roadPaths = useMemo(() => roadFeatures.flatMap((feature) => featureToRoadPaths(feature, heightAt)), [heightAt, roadFeatures]);
  const activeRoutePath = useMemo(
    () => routeInfo?.target === routeTarget ? routeInfo.path : routePath(routeTarget, heightAt),
    [heightAt, routeInfo, routeTarget]
  );
  const routeProfile = useMemo(
    () => routeElevationProfile(activeRoutePath, routeInfo, routeTarget),
    [activeRoutePath, routeInfo, routeTarget]
  );
  const tangaRankingInserted = resourceHasBeenShown;
  const graphiteRows = useMemo(() => graphitePeerRows(tangaRankingInserted), [tangaRankingInserted]);
  const maxContainedGraphite = useMemo(
    () => graphiteRows.reduce((max, p) => Math.max(max, p.containedGraphiteMt || 0), 0) || 1,
    [graphiteRows],
  );
  const selectedPeerKey = selectedPeerProject ? peerProjectKey(selectedPeerProject) : '';
  const comparisonRows = useMemo(() => (
    graphitePeerRows(true)
      .filter((project) => PEER_COMPARISON_PROJECTS.has(project.project))
      .sort((left, right) => left.displayRank - right.displayRank)
  ), []);

  useEffect(() => {
    if (activeMode !== 'ranking') {
      setStoryHeroState((current) => current === 'playing' || current === 'error' ? 'dismissed' : current);
      setSelectedPeerProject(null);
      return;
    }

    setSelectedPeerProject((current) => {
      if (!current) return null;
      return graphiteRows.find((project) => peerProjectKey(project) === peerProjectKey(current)) ?? null;
    });
  }, [activeMode, graphiteRows]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize((current) => {
          const nextWidth = Math.round(rect.width);
          const nextHeight = Math.round(rect.height);
          return current.width === nextWidth && current.height === nextHeight
            ? current
            : {width: nextWidth, height: nextHeight};
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const loadRoadRoute = useCallback(async (target: RouteTarget) => {
    const startedAt = performance.now();
    setRouteLoading(true);
    setRouteLoadState('loading');
    setStatusText(`Finding road route to ${ROUTE_TARGETS[target].label}`);
    setPipeline('Route request -> road geometry -> elevated route');

    try {
      const response = await fetch(`/api/road-route?target=${target}`, {cache: 'no-store'});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? 'Route request failed');

      const coordinates = Array.isArray(payload?.geometry?.coordinates) ? payload.geometry.coordinates : [];
      const path = coordinates
        .map((coord: any) => {
          const lon = Number(coord?.[0]);
          const lat = Number(coord?.[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          return [lon, lat, heightAt(lon, lat) + 62] as [number, number, number];
        })
        .filter(Boolean) as Array<[number, number, number]>;

      if (path.length < 2) throw new Error('Route geometry was empty');

      const nextRoute: RouteInfo = {
        target,
        targetLabel: String(payload.targetLabel ?? ROUTE_TARGETS[target].label),
        path,
        distanceMeters: Number(payload.distanceMeters ?? pathDistanceMeters(path)),
        durationSeconds: Number(payload.durationSeconds ?? pathDistanceMeters(path) / 10.5),
        source: payload.source === 'fallback' ? 'fallback' : 'osrm',
      };
      setRouteInfo(nextRoute);
      setRouteLoadState(nextRoute.source === 'fallback' ? 'degraded' : 'ready');
      setPipeline(nextRoute.source === 'fallback' ? 'Route fallback -> local estimated path' : 'OSRM route -> elevated project path');
      setStatusText(`${nextRoute.source === 'fallback' ? 'Fallback route shown' : nextRoute.targetLabel}: ${formatDistance(nextRoute.distanceMeters)} / ${formatDuration(nextRoute.durationSeconds)}`);
      console.info(`[Tanga telemetry] ${nextRoute.source} route to ${target} ready in ${Math.round(performance.now() - startedAt)}ms`);
    } catch (error) {
      const fallbackPath = routePath(target, heightAt);
      const distanceMeters = pathDistanceMeters(fallbackPath);
      const fallbackRoute: RouteInfo = {
        target,
        targetLabel: ROUTE_TARGETS[target].label,
        path: fallbackPath,
        distanceMeters,
        durationSeconds: distanceMeters / 10.5,
        source: 'fallback',
      };
      setRouteInfo(fallbackRoute);
      setRouteLoadState('degraded');
      setPipeline('Route service fallback -> local estimated path');
      setStatusText(`Fallback route shown: ${formatDistance(distanceMeters)} / ${formatDuration(fallbackRoute.durationSeconds)}`);
      console.info(`[Tanga telemetry] fallback route to ${target} ready in ${Math.round(performance.now() - startedAt)}ms`, error);
    } finally {
      setRouteLoading(false);
    }
  }, [heightAt]);

  const flyTo = useCallback((mode: WorkbenchMode, bearingOverride?: number) => {
    const target = VIEW_STATES[mode];
    setViewState({
      ...target,
      bearing: bearingOverride ?? target.bearing,
      transitionDuration: 2400,
      transitionInterpolator: CINEMATIC_FLY(),
      transitionEasing: cinematicEase,
    });
  }, []);

  const activateMode = useCallback(async (
    mode: WorkbenchMode,
    overrides: {routeTarget?: RouteTarget; resourceFocus?: ResourceFocus; bearing?: number} = {}
  ) => {
    const nextResourceFocus = overrides.resourceFocus ?? resourceFocus;

    if (mode !== 'ranking') {
      setStoryHeroState((current) => current === 'playing' || current === 'error' ? 'dismissed' : current);
    }
    if (overrides.routeTarget) setRouteTarget(overrides.routeTarget);
    if (overrides.resourceFocus) setResourceFocus(overrides.resourceFocus);
    setActiveMode(mode);
    setStatusText(`Mode: ${MODE_LABELS[mode]}`);
    flyTo(mode, overrides.bearing);

    if (mode === 'resource') {
      setResourceHasBeenShown(true);
      setThreeLoadReport({...DEFAULT_THREE_LOAD_REPORT, scene: 'loading', terrain: 'loading', message: `Loading ${resourceFocusLabel(nextResourceFocus).toLowerCase()} resource blocks`});
      setStatusText(`Three.js loading ${resourceFocusLabel(nextResourceFocus).toLowerCase()} resource blocks`);
    }
    if (mode === 'drillholes' || mode === 'subsurface') {
      setThreeLoadReport({...DEFAULT_THREE_LOAD_REPORT, scene: 'loading', terrain: 'loading', message: 'Loading drillhole volume'});
      setStatusText('Three.js loading drillhole volume');
    }
    if (mode === 'metallurgy') {
      setResourceHasBeenShown(true);
      setThreeLoadReport({...DEFAULT_THREE_LOAD_REPORT, scene: 'loading', terrain: 'loading', message: 'Loading metallurgy reveal'});
      setStatusText('Animating metallurgy from drillholes to concentrate results');
    }
    if (mode === 'comparison') {
      setResourceHasBeenShown(true);
      setStatusText('Peer comparison ready');
    }
  }, [flyTo, resourceFocus]);

  useEffect(() => {
    if (activeMode !== 'accessibility') return;
    void loadRoadRoute(routeTarget);
  }, [activeMode, loadRoadRoute, routeTarget]);

  const isThreeMode = useCallback((mode: WorkbenchMode | null = activeMode) => (
    mode === 'drillholes' || mode === 'subsurface' || mode === 'resource' || mode === 'mine_planning' || mode === 'metallurgy'
  ), [activeMode]);

  const issueThreeCameraCommand = useCallback((action: ThreeCameraCommand['action'], degrees?: 90 | 180 | 360) => {
    setThreeSceneRequested(true);
    setThreeCameraCommand((current) => ({
      id: (current?.id ?? 0) + 1,
      action,
      degrees,
    }));
  }, []);

  const rotateNinety = useCallback(() => {
    if (isThreeMode()) {
      issueThreeCameraCommand('rotateDegrees', 90);
      setStatusText('Rotated geology scene 90 degrees');
      return;
    }

    const nextBearing = (viewState.bearing + 90) % 360;
    setViewState({
      ...viewState,
      bearing: nextBearing,
      transitionDuration: 1500,
      transitionInterpolator: CINEMATIC_FLY(),
      transitionEasing: cinematicEase,
    });
    setStatusText(`Rotated view to ${Math.round(nextBearing)} degrees`);
  }, [isThreeMode, issueThreeCameraCommand, viewState]);

  const applyCameraAction = useCallback((action?: CameraAction | null, degrees?: 90 | 180 | 360) => {
    if (!action) return;

    if (action === 'resetGlobe') {
      setActiveMode('tanzania');
      flyTo('tanzania');
      setStatusText('Globe view restored');
      return;
    }

    if (isThreeMode() && (
      action === 'zoomIn' ||
      action === 'zoomOut' ||
      action === 'tiltUp' ||
      action === 'projectAngle' ||
      action === 'bottomView' ||
      action === 'rotateDegrees' ||
      action === 'orbit360'
    )) {
      issueThreeCameraCommand(action, degrees);
      const threeLabels: Partial<Record<CameraAction, string>> = {
        zoomIn: 'Zoomed into geology scene',
        zoomOut: 'Pulled back from geology scene',
        tiltUp: 'Showing geology scene from above',
        projectAngle: 'Rotating geology scene to vertical angle',
        bottomView: 'Showing geology scene from below',
        rotateDegrees: `Rotating geology scene ${degrees ?? 90} degrees`,
        orbit360: 'Running 360 degree geology spin',
      };
      setStatusText(threeLabels[action] ?? 'Updated geology camera');
      return;
    }

    setViewState((current) => {
      const next: DeckViewState = {
        ...current,
        transitionDuration: 1500,
        transitionInterpolator: CINEMATIC_FLY(),
        transitionEasing: cinematicEase,
      };

      if (action === 'zoomIn') next.zoom = clamp(current.zoom + 1.15, 2.2, 15.2);
      if (action === 'zoomOut') next.zoom = clamp(current.zoom - 1.15, 2.2, 15.2);
      if (action === 'tiltUp') next.pitch = clamp(current.pitch - 16, 0, 78);
      if (action === 'tiltDown' || action === 'projectAngle') next.pitch = clamp(current.pitch + 16, 0, 78);
      if (action === 'rotateLeft') next.bearing = (current.bearing - 45 + 360) % 360;
      if (action === 'rotateRight') next.bearing = (current.bearing + 45) % 360;
      if (action === 'bottomView') {
        next.pitch = 78;
        next.zoom = clamp(current.zoom + 0.35, 2.2, 15.2);
      }
      if (action === 'rotateDegrees') next.bearing = current.bearing + (degrees ?? 90);
      if (action === 'orbit360') next.bearing = current.bearing + 359;
      if (action === 'orbitVertical360') {
        next.pitch = current.pitch > 52 ? 10 : 78;
        next.bearing = current.bearing + 359;
      }

      return next;
    });

    const actionLabels: Record<CameraAction, string> = {
      zoomIn: 'Zoomed in',
      zoomOut: 'Pulled back',
      tiltUp: 'Raised camera angle',
      tiltDown: 'Lowered camera angle',
      rotateLeft: 'Rotated camera left',
      rotateRight: 'Rotated camera right',
      resetGlobe: 'Globe view restored',
      projectAngle: 'Changed to project angle',
      bottomView: 'Showing view from below',
      rotateDegrees: `Rotated ${degrees ?? 90} degrees`,
      orbit360: 'Running 360 degree spin',
      orbitVertical360: 'Running vertical 360 degree spin',
    };
    setStatusText(actionLabels[action]);
  }, [flyTo, isThreeMode, issueThreeCameraCommand]);

  const executeIntent = useCallback((intent: CommandIntent | null) => {
    if (!intent) {
      setStatusText('Command not mapped yet');
      return;
    }
    if (intent.navigation) {
      const currentIndex = Math.max(0, STORY_STEPS.findIndex((step) => step.mode === activeMode));
      const targetIndex = intent.navigation === 'slide' && intent.slideNumber
        ? clamp(intent.slideNumber - 1, 0, STORY_STEPS.length - 1)
        : intent.navigation === 'next'
          ? clamp(currentIndex + 1, 0, STORY_STEPS.length - 1)
          : clamp(currentIndex - 1, 0, STORY_STEPS.length - 1);
      const targetStep = STORY_STEPS[targetIndex];
      const defaults = storyStepDefaults(targetStep.mode);
      setPipeline(`${intent.navigation === 'slide' ? `Slide ${targetIndex + 1}` : intent.navigation} -> ${MODE_LABELS[targetStep.mode]}`);
      setStatusText(`${targetStep.act}: ${targetStep.label}`);
      void activateMode(targetStep.mode, {
        routeTarget: intent.routeTarget ?? defaults.routeTarget,
        resourceFocus: intent.resourceFocus ?? defaults.resourceFocus,
      });
      return;
    }
    const targetIsThree = isThreeMode(intent.mode ?? activeMode);
    setPipeline(`${intent.source ?? 'rules'} intent -> ${targetIsThree ? '3D geology' : 'map/globe'} scene`);
    const degrees = intent.degrees;
    const cameraAction = intent.cameraAction === 'tiltDown' && targetIsThree ? 'bottomView' : intent.cameraAction;
    if (intent.rotate90 && !intent.cameraAction) {
      rotateNinety();
      return;
    }
    if (intent.mode) {
      void activateMode(intent.mode, {
        routeTarget: intent.routeTarget,
        resourceFocus: intent.resourceFocus,
      });
    }
    if (
      (cameraAction === 'bottomView' || cameraAction === 'tiltUp') &&
      !targetIsThree &&
      !intent.mode
    ) {
      setStatusText('Camera top/below commands work in Three.js views. Show resource or drillholes first.');
      return;
    }
    if (targetIsThree && (
      cameraAction === 'rotateDegrees' ||
      cameraAction === 'orbit360' ||
      cameraAction === 'orbitVertical360' ||
      cameraAction === 'tiltUp' ||
      cameraAction === 'projectAngle' ||
      cameraAction === 'bottomView' ||
      cameraAction === 'zoomIn' ||
      cameraAction === 'zoomOut'
    )) {
      issueThreeCameraCommand(cameraAction, degrees);
      return;
    }
    if (cameraAction) {
      applyCameraAction(cameraAction, degrees);
    }
    if (!intent.mode && !cameraAction) {
      setStatusText('Command not mapped yet');
    }
  }, [activateMode, activeMode, applyCameraAction, isThreeMode, issueThreeCameraCommand, rotateNinety]);

  const recordCommand = useCallback((command: string, intent?: CommandIntent | null) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    const chip = commandHistoryChip(trimmed, intent);
    setRecentCommands((current) => [
      chip,
      ...current.filter((prompt) => prompt.command.toLowerCase() !== chip.command.toLowerCase()),
    ].slice(0, 5));
  }, []);

  const runCommand = useCallback(async (raw: string) => {
    const startedAt = performance.now();
    const rawCommand = raw.trim();
    const repair = repairVoiceCommand(rawCommand);
    const command = repair.command || rawCommand;
    if (!command) return;
    dismissStoryHero();
    const commandTextLower = command.toLowerCase();
    const displayCommand = repair.changed ? `${rawCommand} -> ${command}` : command;
    const deterministicIntent = ruleIntent(command);
    const localLlmCommandsEnabled = process.env.NEXT_PUBLIC_TANGA_LOCAL_LLM_COMMANDS === 'true';
    setVoiceState('executing');
    setCommandText(command);
    setPipeline('Transcript -> command rules -> scene action');
    setStatusText(repair.changed ? `Interpreting: ${displayCommand}` : `Heard: ${command}`);
    if (commandWantsTangaRanking(commandTextLower)) {
      setResourceHasBeenShown(true);
    }

    if (!localLlmCommandsEnabled || (deterministicIntent.confidence ?? 0) >= 0.65) {
      setLlmStatus('fallback');
      setPipeline('Command rules -> scene action');
      setStatusText(`Running: ${intentRunLabel(deterministicIntent)}`);
      recordCommand(command, deterministicIntent);
      executeIntent(deterministicIntent);
      const elapsed = Math.round(performance.now() - startedAt);
      setCommandTimingText(`Last command ${elapsed} ms`);
      if (!firstCommandLoggedRef.current) {
        firstCommandLoggedRef.current = true;
        console.info(`[Tanga telemetry] first command response in ${elapsed}ms`, {command, intent: deterministicIntent});
      } else {
        console.info(`[Tanga telemetry] command response in ${elapsed}ms`, {command, intent: deterministicIntent});
      }
      setVoiceState(autoListenRef.current ? 'listening' : 'idle');
      return;
    }

    try {
      const response = await fetch('/api/command-intent', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({command}),
      });
      if (response.ok) {
        const payload = await response.json();
        setLlmStatus(payload.llmAvailable ? 'online' : 'fallback');
        setPipeline(`${payload.llmAvailable ? 'Local LLM' : 'Context rules'} -> scene action`);
        const intent = payload.intent as CommandIntent;
        setStatusText(`Running: ${intentRunLabel(intent)}`);
        recordCommand(command, intent);
        executeIntent(intent);
        const elapsed = Math.round(performance.now() - startedAt);
        setCommandTimingText(`Last command ${elapsed} ms`);
        if (!firstCommandLoggedRef.current) {
          firstCommandLoggedRef.current = true;
          console.info(`[Tanga telemetry] first command response in ${elapsed}ms`, {command, intent});
        } else {
          console.info(`[Tanga telemetry] command response in ${elapsed}ms`, {command, intent});
        }
        setVoiceState(autoListenRef.current ? 'listening' : 'idle');
        return;
      }
    } catch {
      // Fall through to deterministic command parsing when the optional local LLM is offline.
    }

    setLlmStatus('fallback');
    const fallbackIntent = deterministicIntent;
    setStatusText(`Running: ${intentRunLabel(fallbackIntent)}`);
    recordCommand(command, fallbackIntent);
    executeIntent(fallbackIntent);
    const elapsed = Math.round(performance.now() - startedAt);
    setCommandTimingText(`Last command ${elapsed} ms`);
    if (!firstCommandLoggedRef.current) {
      firstCommandLoggedRef.current = true;
      console.info(`[Tanga telemetry] first command response in ${elapsed}ms`, {command, intent: fallbackIntent});
    } else {
      console.info(`[Tanga telemetry] command response in ${elapsed}ms`, {command, intent: fallbackIntent});
    }
    setVoiceState(autoListenRef.current ? 'listening' : 'idle');
  }, [dismissStoryHero, executeIntent, recordCommand]);

  const updateVoiceDebug = useCallback((message: string) => {
    setVoiceDebug(message);
    console.info(`[Tanga voice] ${message}`);
  }, []);

  const handleVoiceTranscript = useCallback((raw: string) => {
    const transcript = raw.trim();
    if (!transcript) return;
    updateVoiceDebug(`final transcript: ${transcript}`);

    const wakeCommand = stripWakePhrase(transcript);
    const heardCommand = wakeCommand.matched ? wakeCommand.command : transcript;
    if (!heardCommand) {
      setVoiceState('listening');
      setCommandText(transcript);
      setPipeline('Voice command -> waiting for command');
      setStatusText('Say a command like show resource');
      return;
    }

    setVoiceState('executing');
    setStatusText(`Heard: ${heardCommand}`);
    setPipeline('Voice command -> context repair -> scene action');
    void runCommand(heardCommand);
  }, [runCommand, updateVoiceDebug]);

  useEffect(() => {
    runVoiceTranscriptRef.current = handleVoiceTranscript;
  }, [handleVoiceTranscript]);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.querySelector<HTMLInputElement>('input')?.blur();
    const wakeCommand = stripWakePhrase(commandText);
    void runCommand(wakeCommand.matched && wakeCommand.command ? wakeCommand.command : commandText);
  }, [commandText, runCommand]);

  const runPrompt = useCallback((command: string) => {
    dismissStoryHero();
    setCommandText(command);
    void runCommand(command);
  }, [dismissStoryHero, runCommand]);

  const prepareVoiceSession = useCallback(() => {
    voiceSessionRef.current += 1;

    if (voiceRestartTimerRef.current) {
      window.clearTimeout(voiceRestartTimerRef.current);
      voiceRestartTimerRef.current = null;
    }
    if (browserSpeechWatchdogRef.current) {
      window.clearTimeout(browserSpeechWatchdogRef.current);
      browserSpeechWatchdogRef.current = null;
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      try {
        recognition.stop?.();
      } catch {
        // Browser speech can throw if stop is called while it is already inactive.
      }
    }


    browserSpeechErrorCountRef.current = 0;
    lastVoiceTranscriptAtRef.current = 0;

    return voiceSessionRef.current;
  }, []);

  const releaseMicStream = useCallback(() => {
    const stream = micStreamRef.current;
    micStreamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopVoiceSession = useCallback((nextStatus?: string) => {
    autoListenRef.current = false;
    prepareVoiceSession();
    releaseMicStream();
    setIsListening(false);
    setWakeEnabled(false);
    setVoiceEngine('none');
    setVoiceState('idle');
    if (nextStatus) {
      setPipeline('Voice paused -> typed command available');
      setStatusText(nextStatus);
    }
  }, [prepareVoiceSession, releaseMicStream]);

  const requestMicrophoneAccess = useCallback(async () => {
    if (micStreamRef.current?.active) {
      updateVoiceDebug('microphone stream already active');
      return true;
    }
    if (!window.isSecureContext) {
      setVoiceState('blocked');
      setPipeline('Voice control blocked -> secure context required');
      setStatusText('Microphone needs localhost or HTTPS');
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceState('blocked');
      setPipeline('Voice control blocked -> microphone API unavailable');
      setStatusText('Browser microphone API is not available');
      return false;
    }

    setVoiceState('permission-needed');
    setPipeline('Microphone permission -> voice transcription -> scene action');
    setStatusText('Allow microphone access to start voice control');
    updateVoiceDebug('requesting microphone permission');

    try {
      micStreamRef.current = await new Promise<MediaStream>((resolve, reject) => {
        let settled = false;
        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error('Microphone permission prompt did not complete. Click Allow, then try Enable mic again.'));
        }, 20000);

        navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }).then((stream) => {
          if (settled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          settled = true;
          window.clearTimeout(timeout);
          updateVoiceDebug(`microphone permission granted: ${stream.getAudioTracks().length} audio track(s)`);
          resolve(stream);
        }).catch((error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          reject(error);
        });
      });
      return true;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setVoiceState('blocked');
      setWakeEnabled(false);
      autoListenRef.current = false;
      setPipeline('Voice control blocked -> microphone permission needed');
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setStatusText('No microphone was found');
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStatusText('Microphone permission blocked. Allow mic access, then click Enable mic.');
      } else {
        setStatusText(error instanceof Error ? error.message : 'Microphone could not start');
      }
      updateVoiceDebug(`microphone request failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return false;
    }
  }, [updateVoiceDebug]);


  const startBrowserWakeListener = useCallback(async () => {
    const sessionId = prepareVoiceSession();
    autoListenRef.current = true;
    setWakeEnabled(true);
    setVoiceState('permission-needed');
    setPipeline('Voice command -> browser speech -> scene action');
    setStatusText('Click to enable microphone');

    const hasMicrophone = await requestMicrophoneAccess();
    if (voiceSessionRef.current !== sessionId || !autoListenRef.current || !hasMicrophone) return;

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPipeline('Browser speech unavailable');
      setStatusText('Browser speech recognition is unavailable in this browser. Use Chrome and allow microphone access.');
      setVoiceState('blocked');
      autoListenRef.current = false;
      setWakeEnabled(false);
      releaseMicStream();
      return;
    }

    const startRecognition = () => {
      if (voiceSessionRef.current !== sessionId) return;
      if (!autoListenRef.current) return;

      const recognition = new SpeechRecognition();
      setVoiceEngine('browser');
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 3;
      setIsListening(true);
      setVoiceState('listening');
      setStatusText('Listening for commands');
      updateVoiceDebug('browser speech recognition starting');
      recognition.onaudiostart = () => {
        setIsListening(true);
        setVoiceState('listening');
        setStatusText('Listening for commands');
        updateVoiceDebug('browser audio capture started');
      };
      recognition.onstart = () => {
        setIsListening(true);
        setVoiceState('listening');
        setPipeline('Voice command -> browser speech -> scene action');
        setStatusText('Listening for commands');
        updateVoiceDebug('browser speech recognizer started');
      };
      recognition.onspeechstart = () => {
        setIsListening(true);
        setStatusText('Speech detected');
        updateVoiceDebug('speech detected: waiting for transcript');
      };
      recognition.onspeechend = () => {
        if (autoListenRef.current) setStatusText('Listening for commands');
      };
      recognition.onnomatch = () => {
        if (autoListenRef.current) {
          setVoiceState('listening');
          setStatusText('Listening for commands');
        }
      };
      recognition.onresult = (event: any) => {
        const finalTranscripts: string[] = [];
        const interimTranscripts: string[] = [];
        for (let index = event.resultIndex ?? 0; index < event.results.length; index += 1) {
          const result = event.results?.[index];
          const transcript = String(result?.[0]?.transcript ?? '').trim();
          if (!transcript) continue;
          if (result?.isFinal) finalTranscripts.push(transcript);
          else interimTranscripts.push(transcript);
        }
        const finalTranscript = finalTranscripts.join(' ').trim();
        const interimTranscript = interimTranscripts.join(' ').trim();
        if (interimTranscript) {
          setCommandText(interimTranscript);
          setStatusText(`Hearing: ${interimTranscript}`);
          updateVoiceDebug(`interim transcript: ${interimTranscript}`);
        }
        if (finalTranscript) {
          browserSpeechErrorCountRef.current = 0;
          lastVoiceTranscriptAtRef.current = Date.now();
          setCommandText(finalTranscript);
          setStatusText(`Heard: ${finalTranscript}`);
          updateVoiceDebug(`browser final transcript: ${finalTranscript}`);
          runVoiceTranscriptRef.current(finalTranscript);
        }
      };
      recognition.onerror = (event: any) => {
        const error = String(event?.error ?? '');
        updateVoiceDebug(`browser speech error: ${error || 'unknown'}`);
        setIsListening(false);
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          autoListenRef.current = false;
          setWakeEnabled(false);
          setVoiceState('blocked');
          setPipeline('Voice control blocked -> microphone permission needed');
          setStatusText('Microphone permission blocked. Allow mic access, then click Enable mic.');
          releaseMicStream();
          return;
        }
        if (error === 'audio-capture') {
          autoListenRef.current = false;
          setWakeEnabled(false);
          setVoiceState('blocked');
          setPipeline('Voice control blocked -> microphone unavailable');
          setStatusText('No microphone audio was captured');
          releaseMicStream();
          return;
        }
        if (autoListenRef.current) {
          if (error && error !== 'no-speech' && error !== 'aborted') {
            browserSpeechErrorCountRef.current += 1;
          }
          if (browserSpeechErrorCountRef.current >= 2 || error === 'network') {
            setPipeline('Browser speech recognition retrying');
            setStatusText('Browser speech had trouble; still listening without local Whisper');
            browserSpeechErrorCountRef.current = 0;
          }
          setVoiceState('listening');
          setStatusText('Listening for commands');
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        if (autoListenRef.current && voiceSessionRef.current === sessionId) {
          setVoiceState('listening');
          setStatusText('Listening for commands');
          voiceRestartTimerRef.current = window.setTimeout(startRecognition, 350);
        }
      };
      recognitionRef.current = recognition;
      try {
        recognition.start();
        if (browserSpeechWatchdogRef.current) window.clearTimeout(browserSpeechWatchdogRef.current);
        browserSpeechWatchdogRef.current = window.setTimeout(() => {
          if (voiceSessionRef.current !== sessionId || !autoListenRef.current) return;
          if (lastVoiceTranscriptAtRef.current > 0) return;
          setPipeline('Browser speech listening');
          setStatusText('Listening for commands. Speak a command near the microphone.');
          updateVoiceDebug('browser speech still listening; no transcript yet');
        }, 12000);
      } catch (error) {
        setPipeline('Browser speech could not start');
        setStatusText(error instanceof Error ? `Browser speech failed: ${error.message}` : 'Browser speech failed. Use Chrome and allow microphone access.');
        setVoiceState('blocked');
        autoListenRef.current = false;
        setWakeEnabled(false);
        releaseMicStream();
      }
    };

    startRecognition();
  }, [prepareVoiceSession, releaseMicStream, requestMicrophoneAccess, updateVoiceDebug]);

  const startAlwaysListening = useCallback(() => {
    void startBrowserWakeListener();
  }, [startBrowserWakeListener]);

  const toggleVoice = useCallback(async () => {
    if (wakeEnabled) {
      stopVoiceSession('Voice control paused');
      return;
    }

    startAlwaysListening();
  }, [startAlwaysListening, stopVoiceSession, wakeEnabled]);

  useEffect(() => {
    let cancelled = false;
    setVoiceState('permission-needed');
    setStatusText('Click to enable microphone');

    const startIfPermissionAlreadyGranted = async () => {
      try {
        const permission = await navigator.permissions?.query?.({name: 'microphone' as PermissionName});
        if (!permission || cancelled) return;
        if (permission.state === 'granted' && !autoListenRef.current) {
          startAlwaysListening();
        } else if (permission.state === 'denied') {
          setVoiceState('blocked');
          setStatusText('Microphone permission blocked. Allow mic access, then click Enable mic.');
        }
        permission.onchange = () => {
          if (cancelled) return;
          if (permission.state === 'granted' && !autoListenRef.current) startAlwaysListening();
          if (permission.state === 'denied') {
            stopVoiceSession('Microphone permission blocked. Allow mic access, then click Enable mic.');
            setVoiceState('blocked');
          }
        };
      } catch {
        // Some browsers do not expose microphone permission state until the user clicks.
      }
    };

    void startIfPermissionAlreadyGranted();

    return () => {
      cancelled = true;
      autoListenRef.current = false;
      prepareVoiceSession();
      releaseMicStream();
    };
  }, [prepareVoiceSession, releaseMicStream, startAlwaysListening, stopVoiceSession]);

  useEffect(() => {
    return () => {
      autoListenRef.current = false;
      prepareVoiceSession();
      releaseMicStream();
    };
  }, [prepareVoiceSession, releaseMicStream]);

  const threeVisible = activeMode === 'drillholes' || activeMode === 'subsurface' || activeMode === 'resource' || activeMode === 'mine_planning' || activeMode === 'metallurgy';
  const localContextMode = activeMode === 'project' || activeMode === 'topography' || activeMode === 'accessibility';
  // Native MapLibre terrain and external DEM hillshade tiles make this globe path
  // slower and have triggered terrain-depth shader errors, so relief is carried by
  // the DeckGL elevated project mesh over a lightweight globe basemap.
  const mapStyle = useMemo(() => {
    if (activeMode === 'ranking') return PEER_MAP_STYLE;
    // Wide regional / closing views get the clean uniform Sentinel-2 mosaic;
    // the zoomed-in project scenes keep Esri sub-metre imagery.
    if (activeMode === 'tanzania' || activeMode === 'comparison') return SENTINEL_MAP_STYLE;
    return BASE_MAP_STYLE;
  }, [activeMode]);
  const disableNativeTerrain = useCallback((event: any) => {
    const map = event?.target;
    if (!map?.setTerrain) return;

    try {
      if (!map.getTerrain || map.getTerrain()) map.setTerrain(null);
    } catch {
      // Cached MapLibre instances can retain native terrain between dev reloads.
    }
  }, []);
  const handleMapLoad = useCallback((event: any) => {
    disableNativeTerrain(event);
    setMapLoadState('ready');
    console.info(`[Tanga telemetry] map ready in ${Math.round(performance.now() - appStartedAtRef.current)}ms`);
  }, [disableNativeTerrain]);
  const handleMapError = useCallback(() => {
    setMapLoadState('degraded');
    console.info('[Tanga telemetry] map entered degraded state; DeckGL overlays remain available');
  }, []);
  const markUiInteraction = useCallback(() => {
    uiInteractionUntilRef.current = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 450;
  }, []);
  const selectPeerProject = useCallback((project: GraphitePeerProjectRow) => {
    setSelectedPeerProject(project);
    setStatusText(`#${project.displayRank} ${project.project} selected`);
    setPipeline('Peer marker -> investor detail popup');
  }, []);
  const handleDeckClick = useCallback((info: any) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now < uiInteractionUntilRef.current) return false;

    const layerId = String(info?.layer?.id ?? '');
    if (activeMode === 'ranking' && info?.object && layerId.includes('graphite-peer')) {
      selectPeerProject(info.object as GraphitePeerProjectRow);
      return true;
    }

    if (activeMode === 'ranking' && selectedPeerProject) {
      setSelectedPeerProject(null);
    }
    return false;
  }, [activeMode, selectPeerProject, selectedPeerProject]);
  const handleThreeLoadState = useCallback((report: ThreeLoadReport) => {
    setThreeLoadReport(report);
    if (report.scene === 'ready' || report.scene === 'degraded' || report.scene === 'error') {
      console.info(`[Tanga telemetry] Three.js ${report.scene} in ${report.elapsedMs ?? 0}ms`, report);
    }
  }, []);

  useEffect(() => {
    if (localContextMode) void loadContextData();
  }, [loadContextData, localContextMode]);

  useEffect(() => {
    if (threeVisible) setThreeSceneRequested(true);
  }, [threeVisible]);

  const llmLabel = llmStatus === 'online' ? 'Local LLM online' : llmStatus === 'fallback' ? 'Command rules active' : 'LLM checking';

  const voiceStatusCopy = useMemo(() => {
    if (voiceState === 'permission-needed') {
      return {
        kicker: 'Microphone',
        message: statusText || 'Click to enable microphone',
        detail: statusText === 'Allow microphone access to start voice control'
          ? 'Use the browser permission prompt'
          : 'Then speak any presentation command',
      };
    }
    if (voiceState === 'listening') {
      const engineDetail = voiceEngine === 'recorder'
        ? 'Fast command recognition active'
        : voiceEngine === 'browser'
          ? 'Browser speech active'
          : 'Say: show resource, zoom in, rotate 360';
      return {
        kicker: isListening ? 'Voice live' : 'Voice ready',
        message: statusText || 'Listening for commands',
        detail: engineDetail,
      };
    }
    if (voiceState === 'executing') {
      return {
        kicker: 'Command running',
        message: statusText,
        detail: pipeline,
      };
    }
    if (voiceState === 'blocked') {
      return {
        kicker: 'Microphone blocked',
        message: statusText || 'Click to enable microphone',
        detail: 'Typed commands still work',
      };
    }
    return {
      kicker: llmLabel,
      message: wakeEnabled ? 'Listening for commands' : 'Click to enable microphone',
      detail: wakeEnabled ? 'Say any command directly' : pipeline,
    };
  }, [isListening, llmLabel, pipeline, statusText, voiceEngine, voiceState, wakeEnabled]);

  const voiceButtonLabel = wakeEnabled ? 'Pause mic' : 'Enable mic';

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (previousMode === activeMode) return;

    const nextKey = sceneTransitionKeyRef.current + 1;
    sceneTransitionKeyRef.current = nextKey;
    const targetStep = storyStepForMode(activeMode);
    setSceneTransition({
      active: true,
      key: nextKey,
      target: threeVisible ? 'model' : 'map',
      fromMode: previousMode,
      toMode: activeMode,
      direction: storyTransitionDirection(previousMode, activeMode),
      label: `${targetStep.act} / ${targetStep.label}`,
      detail: modeSummary(activeMode, routeTarget, resourceFocus, resourceHasBeenShown),
    });
    previousModeRef.current = activeMode;

    const timeout = window.setTimeout(() => {
      setSceneTransition((current) => current.key === nextKey ? {...current, active: false} : current);
    }, 1850);

    return () => window.clearTimeout(timeout);
  }, [activeMode, resourceFocus, resourceHasBeenShown, routeTarget, threeVisible]);

  const layers = useMemo(() => {
    const showGraphitePeers = activeMode === 'ranking' || activeMode === 'comparison';
    const showLocalContext = localContextMode;
    const showRoads = showLocalContext && contextReady && roadFeatures.length > 0;
    const showFastLocalSurface = localContextMode;
    const showRoute = activeMode === 'accessibility';
    const showDrillholes = false;
    const showCutaway = false;
    const showMineInfrastructure = activeMode === 'project' || activeMode === 'accessibility';
    const showDetailedLocalContext = activeMode === 'topography';
    // Power grid belongs to the access/infrastructure story only. It used to
    // also render on the project-focus scene, where the bright yellow corridor
    // beam dominated a slide that's about the licence area, not power.
    const showPowerGrid = activeMode === 'accessibility';
    const showVillageLabels = activeMode === 'project';
    const terrainCells = showFastLocalSurface ? localTerrainCells(heightAt, activeMode) : [];
    const mineFacilities = showMineInfrastructure ? locatedMineFacilities() : [];
    const minePoints = showMineInfrastructure ? locatedMinePoints() : [];
    const mineLabels = activeMode === 'project'
      ? []
      : [
        ...mineFacilities.filter((item) => item.id === 'process-plant' || item.id === 'substation' || item.id === 'water-pond'),
        ...minePoints.filter((item) => item.id === 'rom-pad' || item.id === 'product-stockpile'),
      ];
    const mineConveyors = showMineInfrastructure ? mineConveyorPaths(heightAt) : [];
    const gridCorridors = showPowerGrid ? powerGridCorridors(heightAt) : [];
    const visibleVegetation = showDetailedLocalContext
      ? vegetation.slice(0, 160)
      : [];
    const visibleRoadPaths = showRoads
      ? roadPaths
        .slice()
        .sort((left, right) => roadImportance(right.highway) - roadImportance(left.highway))
        .slice(0, activeMode === 'accessibility' ? 180 : activeMode === 'topography' ? 120 : 80)
      : [];
    const visibleRoadFeatures = showRoads
      ? roadFeatures
        .slice()
        .sort((left, right) => roadImportance(String(right.properties?.highway ?? '')) - roadImportance(String(left.properties?.highway ?? '')))
        .slice(0, activeMode === 'accessibility' ? 180 : activeMode === 'topography' ? 120 : 80)
      : [];

    return [
      showFastLocalSurface && new PolygonLayer<TerrainCell>({
        id: 'local-dem-relief-surface',
        data: terrainCells,
        pickable: true,
        stroked: false,
        filled: true,
        extruded: false,
        wireframe: false,
        getPolygon: (cell) => cell.polygon,
        getFillColor: (cell) => cell.color,
        material: {
          ambient: 0.34,
          diffuse: 0.62,
          shininess: 18,
          specularColor: [160, 218, 210],
        },
        parameters: {depthTest: false} as any,
      }),
      // VRIFY-style license boundary: three-layer glow that reads bright and
      // premium at any zoom. Uses the brand copper (matches the deck palette)
      // instead of the older teal chrome noise.
      //
      // Layer 1: wide diffused halo (soft brand glow bleeds around the polygon)
      showLocalContext && new GeoJsonLayer<any>({
        id: 'project-boundary-halo-wide',
        data: '/generated/boundaries.geojson',
        pickable: false,
        filled: false,
        stroked: true,
        getLineColor: (feature) => isProjectLayer(feature) ? [255, 168, 96, activeMode === 'project' ? 45 : 28] : [0, 0, 0, 0],
        getLineWidth: (feature) => isProjectLayer(feature) ? 14 : 0,
        lineWidthUnits: 'pixels' as any,
        lineWidthMinPixels: 0,
        lineWidthMaxPixels: 22,
        parameters: {depthTest: false} as any,
      }),
      // Layer 2: mid halo
      showLocalContext && new GeoJsonLayer<any>({
        id: 'project-boundary-halo',
        data: '/generated/boundaries.geojson',
        pickable: false,
        filled: false,
        stroked: true,
        getLineColor: (feature) => isProjectLayer(feature) ? [255, 195, 138, activeMode === 'project' ? 100 : 72] : [0, 0, 0, 0],
        getLineWidth: (feature) => isProjectLayer(feature) ? 6 : 0,
        lineWidthUnits: 'pixels' as any,
        lineWidthMinPixels: 0,
        lineWidthMaxPixels: 10,
        parameters: {depthTest: false} as any,
      }),
      // Layer 3: crisp bright core + subtle brand-tinted fill so the shape
      // reads as a real license polygon, not just an outline. Higher fill
      // opacity on the active mode so the deck knows this is THE tenement.
      showLocalContext && new GeoJsonLayer<any>({
        id: 'boundaries',
        data: '/generated/boundaries.geojson',
        pickable: true,
        filled: true,
        stroked: true,
        extruded: false,
        // The licence is THE asset — give it a clearly-highlighted warm fill and
        // a crisp bright core outline so it reads as the hero of the slide, not
        // a faint thin line lost on the terrain.
        getFillColor: (feature) => isProjectLayer(feature)
          ? [240, 152, 72, activeMode === 'project' ? 64 : 44]
          : [250, 204, 21, 8],
        getLineColor: (feature) => isProjectLayer(feature) ? [255, 236, 205, 255] : [255, 236, 179, 220],
        getLineWidth: (feature) => isProjectLayer(feature) ? 3.4 : 2,
        lineWidthUnits: 'pixels' as any,
        lineWidthMinPixels: 2,
        lineWidthMaxPixels: 5,
        parameters: {depthTest: false} as any,
      }),
      // Layer 4: the area label — "6.4 sq km · 100% owned" at the polygon
      // centroid. Only shown when we're actively looking at the license.
      // Replaced by the pinned map-label overlay (fixed screen slot + pointer).
      false && new TextLayer({
        id: 'project-boundary-label',
        data: [{position: [PROJECT_CENTER.lon, PROJECT_CENTER.lat + 0.006, heightAt(PROJECT_CENTER.lon, PROJECT_CENTER.lat) + 260], text: 'TANGA LICENSE · 6.4 sq km · 100% OWNED'}],
        getPosition: (d: any) => d.position,
        getText: (d: any) => d.text,
        getSize: 12,
        sizeUnits: 'pixels' as any,
        getColor: [255, 232, 200, 235],
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 700,
        characterSet: 'auto' as any,
        getTextAnchor: 'middle' as any,
        getAlignmentBaseline: 'center' as any,
        background: true,
        backgroundPadding: [10, 5],
        getBackgroundColor: [8, 16, 24, 210],
        getBorderColor: [217, 106, 42, 200],
        getBorderWidth: 1,
        parameters: {depthTest: false} as any,
      }),
      // Removed the teal/gold "project-focus-halo" circle — the glowing license
      // boundary already marks the project area; the circle read as clutter.
      // Removed the synthetic "fast-relief-ridges" — 3 hardcoded floating
      // lines (blue/yellow/blue) that represented no real feature and read as
      // random cross-lines over the terrain.
      showDetailedLocalContext && new GeoJsonLayer<any>({
        id: 'local-buildings',
        data: '/generated/buildings.geojson',
        pickable: true,
        filled: true,
        stroked: false,
        extruded: true,
        wireframe: false,
        getElevation: buildingHeight,
        getFillColor: [188, 206, 222, activeMode === 'topography' ? 132 : 106],
        getLineColor: [255, 255, 255, 100],
        material: {
          ambient: 0.24,
          diffuse: 0.6,
          shininess: 18,
          specularColor: [180, 210, 220],
        },
      }),
      showMineInfrastructure && new GeoJsonLayer<any>({
        id: 'hypothetical-mine-facilities',
        data: mineFacilityCollection(mineFacilities) as any,
        pickable: true,
        filled: true,
        stroked: true,
        extruded: true,
        wireframe: false,
        getElevation: (feature: any) => Number(feature.properties?.height ?? 12),
        getFillColor: (feature: any) => feature.properties?.color ?? MINE_INFRA_COLOR,
        getLineColor: [226, 240, 250, 90],
        getLineWidth: 1.5,
        lineWidthMinPixels: 1,
        material: {
          ambient: 0.32,
          diffuse: 0.56,
          shininess: 38,
          specularColor: [230, 245, 255],
        },
        parameters: {depthTest: false} as any,
      }),
      showMineInfrastructure && new ColumnLayer<any>({
        id: 'hypothetical-mine-assets',
        data: minePoints,
        diskResolution: 18,
        radiusUnits: 'meters',
        radius: 72,
        extruded: true,
        elevationScale: 1,
        getPosition: (item) => minePointPosition(item, heightAt),
        getElevation: (item) => item.height,
        getFillColor: (item) => item.color,
        pickable: true,
        material: {
          ambient: 0.34,
          diffuse: 0.58,
          shininess: 34,
          specularColor: [255, 255, 220],
        },
        parameters: {depthTest: false} as any,
      }),
      showMineInfrastructure && new PathLayer({
        id: 'hypothetical-mine-conveyors',
        data: mineConveyors,
        getPath: (item: any) => item.path,
        getColor: [250, 204, 21, 220],
        getWidth: 34,
        widthUnits: 'meters',
        widthMinPixels: 2,
        jointRounded: true,
        capRounded: true,
        pickable: true,
        parameters: {depthTest: false} as any,
      }),
      false && new TextLayer<any>({
        id: 'hypothetical-mine-labels',
        data: mineLabels,
        getPosition: (item) => [item.lon, item.lat, heightAt(item.lon, item.lat) + 95],
        getText: (item) => item.name,
        getSize: activeMode === 'project' ? 11 : 12,
        getColor: [255, 255, 255, 232],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        billboard: true,
        background: true,
        getBackgroundColor: [3, 8, 16, 186],
        backgroundPadding: activeMode === 'project' ? [6, 3] : [7, 4],
        parameters: {depthTest: false} as any,
      }),
      showDetailedLocalContext && new ColumnLayer<GeoJsonFeature>({
        id: 'vegetation-columns',
        data: visibleVegetation,
        diskResolution: 9,
        radius: activeMode === 'topography' ? 34 : 28,
        radiusUnits: 'meters',
        extruded: true,
        elevationScale: activeMode === 'topography' ? 1.28 : 1,
        getPosition: (feature) => featurePoint(feature, 8, heightAt),
        getElevation: treeHeight,
        getFillColor: (feature) => String(feature.properties?.kind ?? '').includes('centroid')
          ? [64, 190, 118, 92]
          : [40, 150, 92, 64],
        pickable: true,
        material: {
          ambient: 0.36,
          diffuse: 0.64,
          shininess: 10,
          specularColor: [65, 110, 82],
        },
      }),
      showPowerGrid && new PathLayer({
        id: 'power-grid-corridors',
        data: gridCorridors,
        getPath: (item: any) => item.path,
        // Softer, thinner amber corridor — reads as a power line, not a beam.
        getColor: [245, 197, 66, 176],
        getWidth: 52,
        widthUnits: 'meters',
        widthMinPixels: 2,
        jointRounded: true,
        capRounded: true,
        pickable: true,
        parameters: {depthTest: false} as any,
      }),
      showPowerGrid && new ColumnLayer<any>({
        id: 'power-grid-nodes',
        data: POWER_GRID_NODES,
        diskResolution: 24,
        radius: activeMode === 'accessibility' ? 980 : 620,
        radiusUnits: 'meters',
        extruded: true,
        elevationScale: 1,
        getPosition: (node) => [node.lon, node.lat, heightAt(node.lon, node.lat) + 80],
        getElevation: activeMode === 'accessibility' ? 980 : 620,
        getFillColor: [250, 204, 21, 186],
        pickable: true,
        material: {
          ambient: 0.42,
          diffuse: 0.5,
          shininess: 44,
          specularColor: [255, 250, 210],
        },
        parameters: {depthTest: false} as any,
      }),
      showPowerGrid && new ScatterplotLayer<any>({
        id: 'power-grid-rings',
        data: POWER_GRID_NODES,
        getPosition: (node) => [node.lon, node.lat, heightAt(node.lon, node.lat) + 100],
        getRadius: activeMode === 'accessibility' ? 3200 : 2100,
        radiusUnits: 'meters',
        getFillColor: [250, 204, 21, 34],
        getLineColor: [250, 204, 21, 232],
        lineWidthMinPixels: 2,
        stroked: true,
        filled: true,
        pickable: true,
        parameters: {depthTest: false} as any,
      }),
      false && new TextLayer<any>({
        id: 'power-grid-labels',
        data: POWER_GRID_NODES,
        getPosition: (node) => [node.lon, node.lat, heightAt(node.lon, node.lat) + (activeMode === 'accessibility' ? 1220 : 820)],
        getText: (node) => `${node.shortName}\n${node.distanceKm.toFixed(1)} km from project`,
        getSize: activeMode === 'accessibility' ? 14 : 12,
        getColor: [255, 255, 255, 238],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset: (node) => node.id === 'hale-hydro' ? [-84, -20] : [88, 34],
        billboard: true,
        background: true,
        getBackgroundColor: [5, 10, 15, 184],
        backgroundPadding: [8, 5],
        parameters: {depthTest: false} as any,
      }),
      // Location markers only on the country/regional views where a point is
      // needed to find Tanga. On the local project scenes the glowing licence
      // boundary + text label mark it — no circle (per design request).
      (activeMode === 'tanzania' || activeMode === 'accessibility') && new ScatterplotLayer({
        id: 'project-marker-halo',
        data: [{position: [PROJECT_CENTER.lon, PROJECT_CENTER.lat, heightAt(PROJECT_CENTER.lon, PROJECT_CENTER.lat) + 86], label: 'Tanga project'}],
        getPosition: (item: any) => item.position,
        getRadius: activeMode === 'tanzania' ? 34000 : 2200,
        radiusUnits: 'meters',
        getFillColor: [217, 106, 42, 42],
        getLineColor: [255, 206, 138, 210],
        lineWidthMinPixels: 1.5,
        stroked: true,
        filled: true,
        pickable: true,
        parameters: {depthTest: false} as any,
      }),
      (activeMode === 'tanzania' || activeMode === 'accessibility') && new ScatterplotLayer({
        id: 'project-marker-core',
        data: [{position: [PROJECT_CENTER.lon, PROJECT_CENTER.lat, heightAt(PROJECT_CENTER.lon, PROJECT_CENTER.lat) + 96], label: 'Tanga project'}],
        getPosition: (item: any) => item.position,
        getRadius: activeMode === 'tanzania' ? 9000 : 420,
        radiusUnits: 'meters',
        getFillColor: [255, 255, 255, 245],
        getLineColor: [217, 106, 42, 250],
        lineWidthMinPixels: 2.5,
        stroked: true,
        filled: true,
        pickable: true,
        parameters: {depthTest: false} as any,
      }),
      // Only where a point label is genuinely needed to locate Tanga (country /
      // regional views). On the local project & topography scenes the licence
      // badge + glowing boundary already mark it, so the extra label just
      // overlapped the badge — dropped there.
      false && new TextLayer<any>({
        id: 'project-marker-label',
        data: [{lon: PROJECT_CENTER.lon, lat: PROJECT_CENTER.lat, z: heightAt(PROJECT_CENTER.lon, PROJECT_CENTER.lat) + (activeMode === 'tanzania' ? 112000 : 620), label: 'Tanga project'}],
        getPosition: (item) => [item.lon, item.lat, item.z],
        getText: (item) => item.label,
        getSize: activeMode === 'tanzania' ? 15 : 12,
        getColor: [255, 255, 255, 245],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset: [0, -20],
        billboard: true,
        background: true,
        getBackgroundColor: [5, 8, 12, 192],
        backgroundPadding: [8, 5],
        parameters: {depthTest: false} as any,
      }),
      showGraphitePeers && new ScatterplotLayer<any>({
        id: 'graphite-peer-markers',
        data: graphiteRows,
        getPosition: (project) => [project.lon, project.lat, project.isTanga ? 90000 : 54000],
        getRadius: (project) => peerMarkerRadius(project, peerProjectKey(project) === selectedPeerKey),
        radiusUnits: 'meters',
        getFillColor: (project) => {
          const selected = peerProjectKey(project) === selectedPeerKey;
          if (selected) return [217, 107, 43, 245];
          if (project.isTanga) return [217, 107, 43, 236];
          if (project.country === 'Tanzania') return [185, 149, 75, 222];
          return [245, 241, 235, 185];
        },
        getLineColor: (project) => peerProjectKey(project) === selectedPeerKey
          ? [255, 255, 255, 255]
          : project.isTanga
            ? [255, 236, 204, 245]
            : [11, 11, 11, 220],
        getLineWidth: (project) => peerProjectKey(project) === selectedPeerKey ? 5 : 2,
        lineWidthMinPixels: 1.5,
        stroked: true,
        filled: true,
        pickable: true,
        parameters: {depthTest: false} as any,
      }),
      showGraphitePeers && activeMode === 'ranking' && new TextLayer<any>({
        id: 'graphite-peer-rank-badges',
        data: graphiteRows,
        getPosition: (project) => [project.lon, project.lat, project.isTanga ? 210000 : 146000],
        getText: (project) => `#${project.displayRank}`,
        getSize: (project) => project.isTanga ? 14 : 12,
        getColor: (project) => peerProjectKey(project) === selectedPeerKey ? [11, 11, 11, 255] : [245, 241, 235, 245],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        getPixelOffset: [0, -14],
        billboard: true,
        background: true,
        getBackgroundColor: (project) => peerProjectKey(project) === selectedPeerKey
          ? [245, 241, 235, 232]
          : project.isTanga
            ? [217, 107, 43, 218]
            : [2, 1, 0, 186],
        backgroundPadding: [6, 4],
        parameters: {depthTest: false} as any,
      }),
      showGraphitePeers && tangaRankingInserted && new TextLayer<any>({
        id: 'graphite-peer-labels',
        data: graphiteRows.filter((project) => project.isTanga),
        getPosition: (project) => [project.lon, project.lat, project.isTanga ? 180000 : 125000],
        getText: (project) => project.isTanga ? 'Tanga insert' : project.project,
        getSize: (project) => project.isTanga ? 15 : 12,
        getColor: [255, 255, 255, 232],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        billboard: true,
        background: true,
        getBackgroundColor: [3, 8, 16, 190],
        backgroundPadding: [8, 5],
        parameters: {depthTest: false} as any,
      }),
      showRoads && new GeoJsonLayer<any>({
        id: 'road-underlay',
        data: visibleRoadFeatures as any,
        stroked: true,
        filled: false,
        getLineColor: (feature: any) => {
          const highway = String(feature.properties?.highway ?? '');
          return roadImportance(highway) >= 3 ? [6, 12, 18, 190] : [6, 12, 18, 135];
        },
        getLineWidth: (feature: any) => {
          const highway = String(feature.properties?.highway ?? '');
          return roadImportance(highway) >= 3 ? 9 : 5;
        },
        lineWidthMinPixels: 1.5,
      }),
      showRoads && new PathLayer<RoadPath>({
        id: 'road-ribbons',
        data: visibleRoadPaths,
        getPath: (item) => item.path,
        getColor: (item) => roadImportance(item.highway) >= 3 ? [255, 255, 255, 230] : [148, 163, 184, 178],
        getWidth: (item) => roadImportance(item.highway) >= 3 ? 38 : 24,
        widthUnits: 'meters',
        widthMinPixels: 2,
        jointRounded: true,
        capRounded: true,
        pickable: true,
        parameters: {depthTest: false} as any,
      }),
      showDetailedLocalContext && new ColumnLayer<GeoJsonFeature>({
        id: 'village-beacons',
        data: villages,
        diskResolution: 18,
        radius: 118,
        radiusUnits: 'meters',
        extruded: true,
        elevationScale: 1,
        getPosition: (feature) => featurePoint(feature, 24, heightAt),
        getElevation: 120,
        getFillColor: [224, 198, 150, 96],
        pickable: true,
        material: {
          ambient: 0.42,
          diffuse: 0.5,
          shininess: 26,
          specularColor: [255, 240, 180],
        },
      }),
      showDetailedLocalContext && new ScatterplotLayer<GeoJsonFeature>({
        id: 'village-rings',
        data: villages,
        getPosition: (feature) => featurePoint(feature, 32, heightAt),
        getRadius: 260,
        radiusUnits: 'meters',
        getFillColor: [228, 204, 150, 20],
        getLineColor: [232, 208, 150, 120],
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        pickable: true,
        parameters: {depthTest: false} as any,
      }),
      false && new TextLayer<GeoJsonFeature>({
        id: 'village-labels',
        data: villages.length ? villages : labels,
        getPosition: (feature) => featurePoint(feature, 70, heightAt),
        getText: (feature) => String(feature.properties?.name ?? ''),
        // Subtle supporting labels — smaller, lighter box — so they give
        // geographic context without competing with the licence hero.
        getSize: (feature) => String(feature.properties?.class ?? '') === 'village' ? 12 : 11,
        getColor: [231, 240, 250, 224],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        billboard: true,
        background: true,
        getBackgroundColor: [6, 11, 17, 120],
        backgroundPadding: [5, 3],
        parameters: {depthTest: false} as any,
      }),
      showRoute && new PathLayer({
        id: 'access-route-shadow',
        data: [{
          path: activeRoutePath,
          target: routeTarget,
          distanceMeters: routeInfo?.target === routeTarget ? routeInfo.distanceMeters : pathDistanceMeters(activeRoutePath),
          durationSeconds: routeInfo?.target === routeTarget ? routeInfo.durationSeconds : pathDistanceMeters(activeRoutePath) / 10.5,
          source: routeInfo?.target === routeTarget ? routeInfo.source : 'fallback',
          name: ROUTE_TARGETS[routeTarget].label,
        }],
        getPath: (item: any) => item.path,
        getColor: [0, 0, 0, 158],
        getWidth: 430,
        widthUnits: 'meters',
        widthMinPixels: 7,
        jointRounded: true,
        capRounded: true,
        parameters: {depthTest: false} as any,
      }),
      showRoute && new PathLayer({
        id: 'access-route',
        data: [{
          path: activeRoutePath,
          target: routeTarget,
          distanceMeters: routeInfo?.target === routeTarget ? routeInfo.distanceMeters : pathDistanceMeters(activeRoutePath),
          durationSeconds: routeInfo?.target === routeTarget ? routeInfo.durationSeconds : pathDistanceMeters(activeRoutePath) / 10.5,
          source: routeInfo?.target === routeTarget ? routeInfo.source : 'fallback',
          name: ROUTE_TARGETS[routeTarget].label,
        }],
        getPath: (item: any) => item.path,
        getColor: routeTarget === 'power' ? [250, 204, 21, 245] : routeTarget === 'rail' ? [168, 85, 247, 245] : [0, 212, 255, 245],
        getWidth: 210,
        widthUnits: 'meters',
        widthMinPixels: 4,
        jointRounded: true,
        capRounded: true,
        parameters: {depthTest: false} as any,
      }),
      false && new TextLayer<any>({
        id: 'access-route-labels',
        data: [
          {
            lon: PROJECT_CENTER.lon,
            lat: PROJECT_CENTER.lat,
            z: heightAt(PROJECT_CENTER.lon, PROJECT_CENTER.lat) + 420,
            label: 'Tanga project',
          },
          {
            lon: ROUTE_TARGETS[routeTarget].lon,
            lat: ROUTE_TARGETS[routeTarget].lat,
            z: heightAt(ROUTE_TARGETS[routeTarget].lon, ROUTE_TARGETS[routeTarget].lat) + 500,
            label: `${ROUTE_TARGETS[routeTarget].label}\n${routeProfile.distanceLabel} / ${routeProfile.durationLabel}`,
          },
        ],
        getPosition: (item) => [item.lon, item.lat, item.z],
        getText: (item) => item.label,
        getSize: 15,
        getColor: [255, 255, 255, 238],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        billboard: true,
        background: true,
        getBackgroundColor: [3, 8, 16, 192],
        backgroundPadding: [9, 5],
        parameters: {depthTest: false} as any,
      }),
      showRoute && new ScatterplotLayer({
        id: 'route-endpoint',
        data: [{position: [ROUTE_TARGETS[routeTarget].lon, ROUTE_TARGETS[routeTarget].lat, heightAt(ROUTE_TARGETS[routeTarget].lon, ROUTE_TARGETS[routeTarget].lat) + 70]}],
        getPosition: (item: any) => item.position,
        getRadius: 2600,
        radiusUnits: 'meters',
        getFillColor: routeTarget === 'power' ? [250, 204, 21, 230] : routeTarget === 'rail' ? [168, 85, 247, 230] : [0, 212, 255, 230],
        getLineColor: [255, 255, 255, 230],
        lineWidthMinPixels: 2,
        stroked: true,
        parameters: {depthTest: false} as any,
      }),
      showCutaway && new GeoJsonLayer<any>({
        id: 'cutaway-window',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [PROJECT_CENTER.lon - 0.022, PROJECT_CENTER.lat - 0.028],
                [PROJECT_CENTER.lon + 0.022, PROJECT_CENTER.lat - 0.028],
                [PROJECT_CENTER.lon + 0.022, PROJECT_CENTER.lat + 0.028],
                [PROJECT_CENTER.lon - 0.022, PROJECT_CENTER.lat + 0.028],
                [PROJECT_CENTER.lon - 0.022, PROJECT_CENTER.lat - 0.028],
              ]],
            },
          }],
        },
        filled: true,
        stroked: true,
        getFillColor: [2, 6, 23, 148],
        getLineColor: [255, 255, 255, 185],
        getLineWidth: 3,
        lineWidthMinPixels: 2,
      }),
      showDrillholes && new GeoJsonLayer<any>({
        id: 'drillholes',
        data: '/assay_data.geojson',
        stroked: true,
        filled: false,
        getLineColor: (feature: any) => colorForCarbon(feature.properties?.graphitic_carbon),
        getLineWidth: 4,
        lineWidthMinPixels: 2,
      }),
    ].filter(Boolean) as any[];
  }, [activeMode, activeRoutePath, contextReady, graphiteRows, heightAt, labels, localContextMode, roadFeatures, roadPaths, routeInfo, routeProfile.distanceLabel, routeProfile.durationLabel, routeTarget, selectedPeerKey, tangaRankingInserted, vegetation, villages]);

  const currentSummary = modeSummary(activeMode, routeTarget, resourceFocus, tangaRankingInserted);
  const currentFacts = factsForMode(activeMode, resourceFocus);
  const shortlistedPrompts = useMemo(() => {
    const query = commandText.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    const hints = MODE_PROMPT_HINTS[activeMode] ?? [];

    const scored = COMMON_PROMPTS.map((prompt, index) => {
      const haystack = `${prompt.label} ${prompt.command}`.toLowerCase();
      let score = 0;

      if (tokens.length > 0) {
        const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
        if (tokenHits === 0) return null;
        score += tokenHits * 10;
        if (haystack.includes(query)) score += 8;
      } else {
        score += hints.filter((hint) => haystack.includes(hint)).length * 4;
        if (activeMode === 'resource' && haystack.includes(resourceFocus.toLowerCase())) score += 6;
        if (activeMode === 'accessibility' && haystack.includes(routeTarget)) score += 6;
      }

      return {prompt, score: score - index * 0.02};
    }).filter((item): item is {prompt: PromptChip; score: number} => Boolean(item));

    const sorted = scored.sort((a, b) => b.score - a.score).map((item) => item.prompt);
    return (sorted.length > 0 ? sorted : COMMON_PROMPTS).slice(0, 6);
  }, [activeMode, commandText, resourceFocus, routeTarget]);
  const threeMode = (threeVisible ? activeMode : 'drillholes') as 'drillholes' | 'subsurface' | 'resource' | 'mine_planning' | 'metallurgy';
  const storyHeroVisible = false;
  const legendItems = legendForMode(activeMode, routeTarget, resourceFocus);
  const scale = niceScale(viewState, threeVisible);
  const compassBearing = viewState.bearing;
  const terrainStatus = threeVisible
    ? 'Three.js geology'
    : activeMode === 'ranking'
      ? 'Peer globe active'
      : activeMode === 'comparison'
        ? 'Peer comparison active'
      : activeMode === 'topography'
        ? 'Raised DEM active'
        : activeMode === 'project'
          ? 'Fast project view'
        : 'Globe imagery active';
  const routeReadout = routeSummary(routeInfo, routeLoading, routeTarget);
  const assetQuality: AssetQuality = 'preview';
  const voiceStageState: SceneLoadState = voiceState === 'blocked'
    ? 'degraded'
    : voiceState === 'executing'
      ? 'loading'
      : wakeEnabled || isListening
        ? 'ready'
        : voiceState === 'permission-needed'
          ? 'idle'
          : 'idle';
  const terrainStageState: SceneLoadState = threeVisible
    ? threeLoadReport.terrain
    : localContextMode
      ? contextLoadState
      : mapLoadState === 'ready'
        ? 'ready'
        : mapLoadState;
  const terrainStageDetail = threeVisible
    ? `${threeLoadReport.quality} terrain`
    : localContextMode
      ? (contextLoadState === 'idle' ? 'Loads with local scene' : 'DeckGL relief and context')
      : 'Globe imagery and overlays';
  const loadStages = useMemo<LoadStage[]>(() => {
    const routeDetail = activeMode === 'accessibility'
      ? routeLoadState === 'loading'
        ? 'Route lookup running'
        : routeInfo?.source === 'fallback'
          ? 'Local route fallback'
          : routeInfo?.source === 'osrm'
            ? 'Road route ready'
            : 'Route on demand'
      : mapLoadState === 'ready'
        ? terrainStatus
        : 'Starting globe';

    return [
      {
        id: 'map',
        label: 'Map',
        state: mapLoadState,
        detail: routeDetail,
      },
      {
        id: 'three',
        label: '3D',
        state: threeSceneRequested ? threeLoadReport.scene : 'idle',
        detail: threeSceneRequested
          ? `${threeLoadReport.message}${typeof threeLoadReport.elapsedMs === 'number' ? ` / ${threeLoadReport.elapsedMs} ms` : ''}`
          : 'Loads only when requested',
      },
      {
        id: 'terrain',
        label: 'Terrain',
        state: terrainStageState,
        detail: terrainStageDetail,
      },
      {
        id: 'voice',
        label: 'Voice',
        state: voiceStageState,
        detail: commandTimingText,
      },
    ];
  }, [
    activeMode,
    commandTimingText,
    mapLoadState,
    routeInfo?.source,
    routeLoadState,
    terrainStageDetail,
    terrainStageState,
    terrainStatus,
    threeLoadReport,
    threeSceneRequested,
    voiceStageState,
  ]);
  const sceneCallouts = sceneCalloutsForMode(activeMode, routeTarget, resourceFocus, routeProfile);
  const projectedSceneCallouts = useMemo<ProjectedSceneCallout[]>(() => {
    const viewport = new WebMercatorViewport({
      width: stageSize.width,
      height: stageSize.height,
      longitude: viewState.longitude,
      latitude: viewState.latitude,
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
    });

    return sceneCallouts.map((callout) => {
      const boxPixelX = stageSize.width * callout.boxX / 100;
      const boxPixelY = stageSize.height * callout.boxY / 100;
      let anchorPixelX: number | null = null;
      let anchorPixelY: number | null = null;

      if (callout.anchor) {
        try {
          // Cap the elevation used for projection. Some callouts carry huge
          // elevationOffsets (up to 160 km) which, on a pitched map, throw the
          // projected anchor far from the actual location — so the leader line
          // pointed at empty map. Clamp to a small lift so it sits on the zone.
          const anchorZ = heightAt(callout.anchor.lon, callout.anchor.lat)
            + clamp(callout.anchor.elevationOffset ?? 0, 0, 300);
          const projected = viewport.project([
            callout.anchor.lon,
            callout.anchor.lat,
            anchorZ,
          ]);
          if (Number.isFinite(projected[0]) && Number.isFinite(projected[1])) {
            anchorPixelX = clamp(projected[0], 18, stageSize.width - 18);
            anchorPixelY = clamp(projected[1], 76, stageSize.height - 32);
          }
        } catch {
          anchorPixelX = null;
          anchorPixelY = null;
        }
      }

      return {
        ...callout,
        boxPixelX,
        boxPixelY,
        anchorPixelX,
        anchorPixelY,
      };
    });
  }, [heightAt, sceneCallouts, stageSize.height, stageSize.width, viewState.bearing, viewState.latitude, viewState.longitude, viewState.pitch, viewState.zoom]);

  // ── Pinned map labels ──────────────────────────────────────────────────────
  // The map's place labels (licence, marker, mine facilities, villages, power,
  // route) used to be geo-anchored deck.gl TextLayers, so they swam across the
  // screen on every zoom/pan. Instead we pin each label to a FIXED screen slot
  // (its position projected at the scene's canonical view) and draw a pointer
  // line to the live-projected anchor — so the text holds still and only the
  // pointer tracks the location. Same idea as the titled callouts.
  const mapLabelSources = useMemo(() => {
    const out: Array<{id: string; text: string; lon: number; lat: number; z: number; tone: string}> = [];
    const push = (id: string, text: string, lon: number, lat: number, lift: number, tone: string) => {
      if (!text) return;
      out.push({id, text, lon, lat, z: heightAt(lon, lat) + lift, tone});
    };
    if (activeMode === 'project' || activeMode === 'topography') {
      push('lbl-license', 'TANGA LICENSE · 6.4 sq km · 100% OWNED', PROJECT_CENTER.lon, PROJECT_CENTER.lat + 0.006, 260, '#f0b64a');
    }
    if (activeMode === 'project') {
      // Keep to a couple of spread-out facilities, with concise labels so the
      // pinned chips stay narrow and don't crowd the panel.
      const MINE_SHORT: Record<string, string> = {'process-plant': 'Processing plant', 'product-stockpile': 'Product stockpile'};
      const picks = [
        ...locatedMineFacilities().filter((i) => ['process-plant'].includes(i.id)),
        ...locatedMinePoints().filter((i) => ['product-stockpile'].includes(i.id)),
      ];
      picks.forEach((i: any) => push(`mine-${i.id}`, MINE_SHORT[i.id] ?? i.name, i.lon, i.lat, 95, '#8fb4d6'));
      (villages.length ? villages : labels).slice(0, 6).forEach((feature, idx) => {
        const name = String(feature.properties?.name ?? '');
        const point = featurePoint(feature, 70, heightAt);
        if (name) out.push({id: `village-${idx}`, text: name, lon: point[0], lat: point[1], z: point[2], tone: '#a7c0d8'});
      });
    }
    if (activeMode === 'tanzania') {
      push('lbl-marker', 'Tanga project', PROJECT_CENTER.lon, PROJECT_CENTER.lat, 320, '#c7551b');
    }
    if (activeMode === 'accessibility') {
      push('lbl-marker', 'Tanga project', PROJECT_CENTER.lon, PROJECT_CENTER.lat, 320, '#c7551b');
      POWER_GRID_NODES.forEach((node) => push(`power-${node.id}`, `${node.shortName} · ${node.distanceKm.toFixed(1)} km`, node.lon, node.lat, 300, '#e0a94f'));
      const target = ROUTE_TARGETS[routeTarget];
      push('route-target', `${target.label} · ${routeProfile.distanceLabel}`, target.lon, target.lat, 300, '#c7551b');
    }
    return out;
  }, [activeMode, heightAt, villages, labels, routeTarget, routeProfile.distanceLabel]);

  const pinnedMapLabels = useMemo(() => {
    if (!mapLabelSources.length || stageSize.width === 0) return [];
    const canon = (VIEW_STATES as any)[activeMode] ?? viewState;
    const canonVp = new WebMercatorViewport({
      width: stageSize.width, height: stageSize.height,
      longitude: canon.longitude, latitude: canon.latitude, zoom: canon.zoom, pitch: canon.pitch, bearing: canon.bearing,
    });
    const liveVp = new WebMercatorViewport({
      width: stageSize.width, height: stageSize.height,
      longitude: viewState.longitude, latitude: viewState.latitude, zoom: viewState.zoom, pitch: viewState.pitch, bearing: viewState.bearing,
    });
    const positioned = mapLabelSources.map((source) => {
      let boxPixelX = stageSize.width / 2;
      let boxPixelY = stageSize.height / 2;
      try {
        const p = canonVp.project([source.lon, source.lat, source.z]);
        if (Number.isFinite(p[0]) && Number.isFinite(p[1])) {
          boxPixelX = clamp(p[0], 96, stageSize.width - 96);
          boxPixelY = clamp(p[1], 96, stageSize.height - 60);
        }
      } catch { /* keep centre fallback */ }
      let anchorPixelX: number | null = null;
      let anchorPixelY: number | null = null;
      try {
        const p = liveVp.project([source.lon, source.lat, source.z]);
        if (Number.isFinite(p[0]) && Number.isFinite(p[1])) {
          anchorPixelX = clamp(p[0], 8, stageSize.width - 8);
          anchorPixelY = clamp(p[1], 70, stageSize.height - 24);
        }
      } catch { /* no pointer */ }
      return {...source, boxPixelX, boxPixelY, anchorPixelX, anchorPixelY};
    });

    // Keep chips clear of the chrome: the top bar / act ribbon, the bottom pager,
    // and the docked right-hand data panel — so no label is hidden behind a panel.
    const W = stageSize.width;
    const H = stageSize.height;
    // The docked right-hand data/insight panel starts at ~70% of the stage width
    // across viewports, so keep chip centres within the left 60% — their right
    // edge (≈ +95px) then always clears the panel. Left edge stays off the logo.
    const safeL = W * 0.05;
    const safeR = W * 0.6;
    const safeT = 104;       // below the top bar + act ribbon
    const safeB = H - 104;   // above the pager
    positioned.forEach((label) => {
      label.boxPixelX = clamp(label.boxPixelX, safeL, safeR);
      label.boxPixelY = clamp(label.boxPixelY, safeT, safeB);
    });
    // Greedy vertical de-collision: chips near each other in X are pushed apart
    // in Y so two labels never overlap. Process top-to-bottom, only push down.
    const MIN_GAP = 28;
    const X_PROX = 150;
    const placed: typeof positioned = [];
    positioned.slice().sort((a, b) => a.boxPixelY - b.boxPixelY).forEach((label) => {
      let y = label.boxPixelY;
      placed.forEach((other) => {
        if (Math.abs(other.boxPixelX - label.boxPixelX) < X_PROX && Math.abs(other.boxPixelY - y) < MIN_GAP) {
          y = other.boxPixelY + MIN_GAP;
        }
      });
      label.boxPixelY = clamp(y, safeT, safeB);
      placed.push(label);
    });
    return positioned;
  }, [mapLabelSources, activeMode, stageSize.width, stageSize.height, viewState.longitude, viewState.latitude, viewState.zoom, viewState.pitch, viewState.bearing]);

  const activeStoryIndex = Math.max(0, STORY_STEPS.findIndex((step) => step.mode === activeMode));
  const isFirstStory = activeStoryIndex <= 0;
  const isLastStory = activeStoryIndex >= STORY_STEPS.length - 1;

  // Prefetch the Three.js scene chunk once the user is a few scenes in (but
  // before the first 3D scene), so arriving at it is instant. Idle-scheduled so
  // it never competes with the current scene's work.
  useEffect(() => {
    if (threeSceneRequested || activeStoryIndex < 3) return;
    const w = window as unknown as {requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void};
    let idle: number | undefined;
    let timer: number | undefined;
    const warm = () => { void loadThreeSceneModule(); };
    if (w.requestIdleCallback) idle = w.requestIdleCallback(warm);
    else timer = window.setTimeout(warm, 500);
    return () => {
      if (idle !== undefined && w.cancelIdleCallback) w.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [activeStoryIndex, threeSceneRequested]);
  const activeDataTable = MODE_DATA_TABLES[activeMode];
  const activeActIndex = actIndexForMode(activeMode);
  const isClosingScene = activeStoryIndex === STORY_STEPS.length - 1;
  // The cover is a clean curtain over scene 1. "Begin" dismisses it to reveal
  // the ranking underneath (it does NOT advance — scene 1 is the peer field).
  const [coverDismissed, setCoverDismissed] = useState(false);
  // Act interstitial — a brief chapter card when the story crosses into a new
  // act (Opportunity → Asset → Value). Never on first mount or behind the cover.
  const [actCard, setActCard] = useState<StoryAct | null>(null);
  const lastActRef = useRef<string | null>(null);
  const showCover = activeStoryIndex === 0 && !coverDismissed;
  const isCoverScene = showCover;
  // Scenes without a source-data table still get a panel — key insight chips
  // from SLIDE_FACTS — so the top-left zone is never awkwardly empty.
  const insightFacts = !activeDataTable ? (SLIDE_FACTS[activeMode] ?? []) : [];
  const activeSlide: DeckSlide | undefined = slideById[MODE_NARRATIVE_SOURCE[activeMode]];
  const nextStep = STORY_STEPS[activeStoryIndex + 1];
  const nextSlide: DeckSlide | undefined = nextStep ? slideById[MODE_NARRATIVE_SOURCE[nextStep.mode]] : undefined;

  // Elapsed timer for the presenter, starts on mount, resets when notes reopen.
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerStartRef = useRef<number>(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setElapsedMs(Date.now() - timerStartRef.current), 1000);
    return () => window.clearInterval(id);
  }, []);

  // ── URL deep-link ─────────────────────────────────────────────────────
  // On mount: jump to the scene named in the #hash, if any. A bare URL (no
  // hash) always starts from the beginning — we intentionally do NOT silently
  // resume the last-seen scene from localStorage, which surprised the user.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const stored = readHashScene();
    if (!stored) return;
    const targetIndex = STORY_STEPS.findIndex((s) => s.mode === stored);
    if (targetIndex >= 0 && targetIndex !== activeStoryIndex) {
      goToStoryIndex(targetIndex);
    }
  // Intentionally run once — restore is a one-shot on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // On scene change: keep the URL and localStorage in sync.
  useEffect(() => { writeHashScene(activeMode); }, [activeMode]);

  const goToStoryIndex = useCallback((index: number) => {
    setShowCoach(false);
    try { window.localStorage?.setItem('tanga:coachSeen', '1'); } catch { /* ignore */ }
    const clamped = clamp(index, 0, STORY_STEPS.length - 1);
    const targetStep = STORY_STEPS[clamped];
    const defaults = storyStepDefaults(targetStep.mode);
    setStatusText(`${targetStep.act}: ${targetStep.label}`);
    void activateMode(targetStep.mode, {
      routeTarget: defaults.routeTarget,
      resourceFocus: defaults.resourceFocus,
    });
  }, [activateMode]);

  // ── Presenter control layer ────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);
  // VRIFY-style autoplay pacing — 5s / 10s / 15s options. 10s default (mid).
  const [autoplaySec, setAutoplaySec] = useState<5 | 10 | 15>(10);
  const [isAutoplayMenuOpen, setIsAutoplayMenuOpen] = useState(false);
  // Annotations = scene callouts on the stage. Toggle to get a clean stage
  // view for photography/screenshotting. Ctrl+A like VRIFY.
  const [annotationsOn, setAnnotationsOn] = useState(true);
  const toggleAnnotations = useCallback(() => setAnnotationsOn((prev) => !prev), []);
  // Investor inspector — plain-English "why this matters" overlay (Ctrl+I).
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const toggleInspector = useCallback(() => setIsInspectorOpen((prev) => !prev), []);
  // First-run coach marks — a one-time hint so a cold viewer knows the deck is
  // interactive. Dismisses on first navigation and never returns.
  const [showCoach, setShowCoach] = useState(false);
  useEffect(() => {
    try {
      if (!window.localStorage?.getItem('tanga:coachSeen')) {
        const t = window.setTimeout(() => setShowCoach(true), 1400);
        return () => window.clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);
  const dismissCoach = useCallback(() => {
    setShowCoach(false);
    try { window.localStorage?.setItem('tanga:coachSeen', '1'); } catch { /* ignore */ }
  }, []);

  // Pending info interstitial (a card shown between two scenes). While set, the
  // scene index does NOT change — one more forward press clears it and advances.
  const [pendingInfo, setPendingInfo] = useState<InfoSlideId | null>(null);

  const handlePrevStory = useCallback(() => {
    // Back out of an info card without leaving the current scene.
    if (pendingInfo) { setPendingInfo(null); return; }
    goToStoryIndex(activeStoryIndex - 1);
  }, [goToStoryIndex, activeStoryIndex, pendingInfo]);

  const handleNextStory = useCallback(() => {
    if (pendingInfo) { setPendingInfo(null); goToStoryIndex(activeStoryIndex + 1); return; }
    const nextMode = STORY_STEPS[activeStoryIndex + 1]?.mode;
    const info = nextMode ? INFO_BEFORE[nextMode] : undefined;
    if (info) { setPendingInfo(info); return; }
    goToStoryIndex(activeStoryIndex + 1);
  }, [goToStoryIndex, activeStoryIndex, pendingInfo]);

  // Explicit manual actions from the presenter — pause autoplay so nothing
  // auto-advances after they take the wheel.
  const handleManualPrev = useCallback(() => { setIsAutoplay(false); handlePrevStory(); }, [handlePrevStory]);
  const handleManualNext = useCallback(() => { setIsAutoplay(false); handleNextStory(); }, [handleNextStory]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  }, []);

  // Keep fullscreen state truthful whether toggled by us, by F11, or by Esc.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  // Live-pitch safety: entering fullscreen force-disarms the always-on wake
  // listener so the room's conversation can't trigger a scene jump.
  useEffect(() => {
    if (isFullscreen && wakeEnabled) setWakeEnabled(false);
  }, [isFullscreen, wakeEnabled]);

  // Autoplay ticks the story forward every 12s until it hits the last scene.
  useEffect(() => {
    if (!isAutoplay) return;
    if (isLastStory) { setIsAutoplay(false); return; }
    const timer = window.setTimeout(handleNextStory, autoplaySec * 1000);
    return () => window.clearTimeout(timer);
  }, [isAutoplay, isLastStory, handleNextStory, activeStoryIndex, autoplaySec]);

  // Idle slow-orbit: once an immersive scene has flown in and settled, gently
  // rotate the camera bearing (geolibre / VRIFY "never frozen" feel). Cancels
  // the instant the user grabs the camera and resumes after a short settle.
  // Off for reduced-motion, the cover, the globe overview, and 3D scenes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (threeVisible || isCoverScene) return;
    const ORBIT_MODES = new Set<WorkbenchMode>(['project', 'topography', 'accessibility', 'mine_planning', 'drillholes', 'resource', 'metallurgy']);
    if (!ORBIT_MODES.has(activeMode)) return;

    const SETTLE_MS = 3600;   // clear the fly-in (≤2.4s) + a beat before orbiting
    const SPEED = 1.5;        // degrees per second — a calm, barely-there drift
    lastCameraInteractRef.current = performance.now();
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (now - lastCameraInteractRef.current < SETTLE_MS) return;
      setViewState((cur) => {
        // Strip any leftover flyTo props so the bearing nudge applies instantly
        // (no per-frame transition) — the SETTLE window already cleared the fly-in.
        const {transitionInterpolator, transitionEasing, transitionDuration, ...rest} = cur as any;
        return {...rest, bearing: (((rest.bearing ?? 0) + SPEED * dt) % 360)};
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeMode, threeVisible, isCoverScene]);

  // Fire the act interstitial on an act crossing. It overlays the incoming
  // scene while its camera flies in, then dissolves. Always skippable.
  useEffect(() => {
    const act = MODE_ACT[activeMode];
    const previous = lastActRef.current;
    lastActRef.current = act;
    if (previous === null || previous === act) return;   // first mount / same act
    if (showCover) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const next = STORY_ACTS.find((a) => a.id === act) ?? null;
    setActCard(next);
    const timer = window.setTimeout(() => setActCard(null), reduce ? 700 : 1900);
    return () => window.clearTimeout(timer);
  }, [activeMode, showCover]);

  // Any click or key dismisses the act card immediately.
  useEffect(() => {
    if (!actCard) return;
    const dismiss = () => setActCard(null);
    window.addEventListener('keydown', dismiss);
    window.addEventListener('pointerdown', dismiss);
    return () => {
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('pointerdown', dismiss);
    };
  }, [actCard]);

  const toggleAutoplay = useCallback(() => setIsAutoplay((prev) => !prev), []);
  const toggleBlackout = useCallback(() => setIsBlackout((prev) => !prev), []);
  const toggleNotes = useCallback(() => setIsNotesOpen((prev) => !prev), []);
  const toggleShortcuts = useCallback(() => setIsShortcutsOpen((prev) => !prev), []);

  // Extended keyboard map — familiar to anyone who's used Keynote/PowerPoint.
  //   ← / → · PageUp / PageDown  → prev / next scene
  //   Home / End                 → first / last
  //   1..9                       → jump to scene N
  //   F                          → fullscreen
  //   B or .                     → blackout
  //   S                          → speaker notes
  //   P or Space                 → play/pause autoplay
  //   ? or /                     → shortcut sheet
  //   Esc                        → close open panels; second Esc exits fullscreen
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      // Ctrl/Cmd + A → toggle annotations (like VRIFY). Everything else with
      // a modifier goes to the browser so we don't fight shortcuts.
      if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
        event.preventDefault();
        toggleAnnotations();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === 'i' || event.key === 'I')) {
        event.preventDefault();
        toggleInspector();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key;

      // Navigation
      if (key === 'ArrowRight' || key === 'PageDown') {
        event.preventDefault();
        if (activeStoryIndex === 0 && !coverDismissed) { setCoverDismissed(true); return; }
        handleNextStory();
        return;
      }
      if (key === 'ArrowLeft' || key === 'PageUp')    { event.preventDefault(); handlePrevStory(); return; }
      if (key === 'Home') { event.preventDefault(); goToStoryIndex(0); return; }
      if (key === 'End')  { event.preventDefault(); goToStoryIndex(STORY_STEPS.length - 1); return; }
      if (/^[1-9]$/.test(key)) {
        const target = Number(key) - 1;
        if (target < STORY_STEPS.length) { event.preventDefault(); goToStoryIndex(target); return; }
      }

      // Presenter modes
      if (key === 'f' || key === 'F') { event.preventDefault(); toggleFullscreen(); return; }
      if (key === 'b' || key === 'B' || key === '.') { event.preventDefault(); toggleBlackout(); return; }
      if (key === 's' || key === 'S') { event.preventDefault(); toggleNotes(); return; }
      if (key === 'p' || key === 'P' || key === ' ') { event.preventDefault(); toggleAutoplay(); return; }
      if (key === '?' || key === '/') { event.preventDefault(); toggleShortcuts(); return; }

      if (key === 'Escape') {
        if (isDisclaimerOpen) { setIsDisclaimerOpen(false); return; }
        if (isShortcutsOpen) { setIsShortcutsOpen(false); return; }
        if (isNotesOpen)     { setIsNotesOpen(false); return; }
        if (isBlackout)      { setIsBlackout(false); return; }
        // Fall through to browser to leave fullscreen.
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNextStory, handlePrevStory, goToStoryIndex, toggleFullscreen, toggleBlackout, toggleNotes, toggleAutoplay, toggleShortcuts, toggleAnnotations, toggleInspector, isShortcutsOpen, isNotesOpen, isBlackout, isDisclaimerOpen, activeStoryIndex, coverDismissed]);


  const getTooltip = useCallback(({object, layer}: any) => {
    if (!object) return null;

    const props = object.properties ?? object;
    const layerId = String(layer?.id ?? '');
    let title = String(props.name ?? props.label ?? props.layer ?? props.highway ?? 'Map feature');
    const rows: string[] = [];

    if (layerId === 'access-route') {
      title = String(props.name ?? ROUTE_TARGETS[routeTarget].label);
      rows.push(`${formatDistance(Number(props.distanceMeters))} by road`);
      rows.push(`${formatDuration(Number(props.durationSeconds))} estimated drive`);
      rows.push(props.source === 'osrm' ? 'OSRM road geometry' : 'Fallback route');
    } else if (layerId.includes('graphite-peer')) {
      title = `#${props.displayRank ?? props.baselineRank} ${props.project ?? 'Graphite project'}`;
      rows.push(`${props.country ?? 'Unknown'} - ${props.owner ?? props.company ?? 'Operator'}`);
      rows.push(`Listed: ${props.listing ?? 'Not in peer summary'}`);
      rows.push(`M&I: ${props.measuredIndicated ?? props.resource ?? 'M&I graphite basis'}`);
      if (props.tgcGrade) rows.push(`TGC: ${props.tgcGrade}`);
      if (props.flakeDistribution) rows.push(`Flake: ${props.flakeDistribution}`);
      rows.push(String(props.sourceLabel ?? 'Peer project source'));
    } else if (layerId.includes('road')) {
      rows.push(`Road class: ${props.highway ?? 'track'}`);
    } else if (layerId.includes('village')) {
      rows.push('Village / settlement context');
    } else if (layerId.includes('power-grid')) {
      rows.push(String(props.type ?? props.detail ?? 'Power grid corridor'));
      if (Number.isFinite(Number(props.distanceKm))) {
        rows.push(`${Number(props.distanceKm).toFixed(1)} km straight-line from project`);
      }
      if (props.detail) rows.push(String(props.detail));
    } else if (layerId.includes('hypothetical-mine')) {
      rows.push(String(props.detail ?? 'Conceptual mining infrastructure'));
      rows.push('Hypothetical layout for presentation only');
    } else if (layerId === 'boundaries') {
      rows.push(String(props.layer ?? 'Project boundary'));
    } else if (layerId === 'vegetation-columns') {
      rows.push('Vegetation sample from local OSM extract');
    }

    return {
      html: [
        `<strong>${escapeHtml(title)}</strong>`,
        ...rows.map((row) => `<span>${escapeHtml(row)}</span>`),
      ].join(''),
      style: {
        background: 'rgba(2, 1, 0, 0.92)',
        border: '1px solid rgba(217, 107, 43, 0.34)',
        borderRadius: '10px',
        boxShadow: '0 18px 42px rgba(0,0,0,0.38)',
        color: '#f5f1eb',
        fontFamily: 'Poppins, Inter, sans-serif',
        fontSize: '12px',
        lineHeight: '1.35',
        maxWidth: '320px',
        padding: '10px 12px',
      },
    };
  }, [routeTarget]);

  return (
    <main
      ref={stageRef}
      className={classNames(
        'tanga-deck',
        threeVisible && 'tanga-deck--three-active',
        sceneTransition.active && 'tanga-deck--transitioning',
        storyHeroVisible && 'tanga-deck--story-hero-active',
        activeMode === 'ranking' && 'tanga-deck--ranking',
        activeMode === 'comparison' && 'tanga-deck--comparison',
        isCoverScene && 'tanga-deck--cover',
        isAutoplay && 'tanga-deck--autoplay'
      )}
      data-act={MODE_ACT[activeMode]}
      data-testid="tanga-deck-workbench"
    >
      <div className="tanga-deck__deck-stage" aria-hidden={threeVisible}>
        <DeckGL
          viewState={viewState as any}
          controller
          layers={layers}
          effects={[TANGA_LIGHTING]}
          useDevicePixels={1}
          onViewStateChange={({viewState: nextViewState, interactionState}: any) => {
            // A real user gesture pauses the idle orbit; it resumes after settle.
            if (interactionState && (interactionState.isDragging || interactionState.isPanning || interactionState.isZooming || interactionState.isRotating)) {
              lastCameraInteractRef.current = performance.now();
            }
            setViewState(nextViewState as DeckViewState);
          }}
          onClick={handleDeckClick}
          getTooltip={getTooltip}
        >
          <Map
            mapStyle={mapStyle as any}
            attributionControl={false}
            maxPitch={85}
            onLoad={handleMapLoad}
            onError={handleMapError}
            onStyleData={disableNativeTerrain}
            renderWorldCopies={false}
          />
        </DeckGL>
      </div>

      {threeSceneRequested && (
        <TangaThreeGeologyScene
          visible={threeVisible}
          mode={threeMode}
          resourceFocus={resourceFocus}
          rotationKey={0}
          cameraDropKey={0}
          cameraCommand={threeCameraCommand}
          assetQuality={assetQuality}
          onLoadState={handleThreeLoadState}
        />
      )}

      <div className="tanga-deck__shade" />

      {/* HUD command-center frame: viewport-corner reticles + edge vignette.
          Pure decoration, non-interactive. Styled in hud.css (Phase 3). */}
      {/* Geolibre-style starfield behind the globe (CSS-gated to the globe
          overview scenes; screen-blended so it only shows in the dark space). */}
      <div className="tanga-starfield" aria-hidden="true" />

      {/* Geospatial locator instrument (geolibre-style): a stylised globe with a
          pulsing Tanga marker + live lat/lon/zoom readout. Map scenes only. */}
      {!threeVisible && !isCoverScene && (
        <div className="tanga-deck__locator">
          <svg className="tanga-deck__locator-globe" viewBox="0 0 60 60" aria-hidden="true">
            <defs>
              <radialGradient id="loc-ocean" cx="38%" cy="34%" r="75%">
                <stop offset="0" stopColor="#17364e" /><stop offset="1" stopColor="#071320" />
              </radialGradient>
            </defs>
            <circle cx="30" cy="30" r="26" fill="url(#loc-ocean)" stroke="rgba(94,234,212,.4)" strokeWidth="1" />
            <ellipse cx="30" cy="30" rx="26" ry="10" fill="none" stroke="rgba(148,197,255,.18)" strokeWidth=".6" />
            <ellipse cx="30" cy="30" rx="26" ry="19" fill="none" stroke="rgba(148,197,255,.12)" strokeWidth=".6" />
            <ellipse cx="30" cy="30" rx="10" ry="26" fill="none" stroke="rgba(148,197,255,.13)" strokeWidth=".6" />
            <line x1="4" y1="30" x2="56" y2="30" stroke="rgba(148,197,255,.15)" strokeWidth=".6" />
            <circle className="tanga-deck__locator-pulse" cx="38" cy="34" r="3" fill="rgba(94,234,212,.55)" />
            <circle cx="38" cy="34" r="2" fill="#5eead4" stroke="#ffffff" strokeWidth=".7" />
          </svg>
          <div className="tanga-deck__locator-readout" aria-label="Map position">
            <span>{Math.abs(viewState.latitude).toFixed(2)}°{viewState.latitude >= 0 ? 'N' : 'S'}</span>
            <span>{Math.abs(viewState.longitude).toFixed(2)}°{viewState.longitude >= 0 ? 'E' : 'W'}</span>
            <span>Z{viewState.zoom.toFixed(1)}</span>
          </div>
        </div>
      )}

      <div className="hud-frame" aria-hidden="true" />

      {/* Info interstitial — an editorial data card shown between scenes. */}
      {pendingInfo && (
        <TangaInfoSlide key={pendingInfo} id={pendingInfo} onContinue={handleManualNext} />
      )}

      {/* Subtle scene-change flash — keyed to activeMode so it re-mounts and
          fades out each transition, giving every scene a clean "arrival". */}
      <div key={`flash-${activeMode}`} className="tanga-deck__scene-flash" aria-hidden="true" />

      <TangaStoryVideoHero
        visible={storyHeroVisible}
        videoSrc="/media/tanga-google-earth-intro-corrected-preview.mp4?v=story-hero-opt-1080-20260819"
        posterSrc="/media/tanga-first-slide-story-poster.jpg?v=story-hero-20260625"
        onComplete={completeStoryHero}
        onShowRanking={dismissStoryHero}
        onSkip={dismissStoryHero}
        onError={() => setStoryHeroState('error')}
      />

      {sceneTransition.active && (
        <div
          key={sceneTransition.key}
          className={classNames(
            'tanga-deck__portal-transition',
            sceneTransition.target === 'model' ? 'is-model' : 'is-map',
            `is-${sceneTransition.direction}`
          )}
          aria-hidden="true"
        >
          <span />
          <i />
          <em />
          <div className="tanga-deck__portal-copy">
            <small>{sceneTransition.direction === 'forward' ? 'Next scene' : sceneTransition.direction === 'back' ? 'Previous scene' : 'Scene jump'}</small>
            <strong>{sceneTransition.label}</strong>
            <p>{sceneTransition.detail}</p>
          </div>
        </div>
      )}

      {annotationsOn && !threeVisible && !showCover && projectedSceneCallouts.length > 0 && !(activeMode === 'ranking' && selectedPeerProject) && (
        <section className="tanga-deck__callout-layer" aria-label="Scene callouts">
          <svg className="tanga-deck__leader-svg" viewBox={`0 0 ${stageSize.width} ${stageSize.height}`} aria-hidden="true">
            {projectedSceneCallouts.map((callout) => callout.anchorPixelX !== null && callout.anchorPixelY !== null && (
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
                  r="4"
                  style={{color: callout.tone, fill: callout.tone, stroke: '#ffffff'}}
                />
              </g>
            ))}
          </svg>
          {projectedSceneCallouts.map((callout) => (
            <div
              key={callout.id}
              className={classNames('tanga-deck__callout', `is-${callout.side ?? 'right'}`)}
              style={{
                '--callout-x': `${callout.boxPixelX}px`,
                '--callout-y': `${callout.boxPixelY}px`,
                '--callout-tone': callout.tone,
              } as any}
            >
              <span>{callout.label}</span>
              <strong>{callout.detail}</strong>
            </div>
          ))}
        </section>
      )}

      {annotationsOn && !threeVisible && !showCover && pinnedMapLabels.length > 0 && (
        <section className="tanga-deck__map-labels" aria-label="Map place labels">
          <svg className="tanga-deck__leader-svg tanga-deck__leader-svg--pin" viewBox={`0 0 ${stageSize.width} ${stageSize.height}`} aria-hidden="true">
            {pinnedMapLabels.map((label) => label.anchorPixelX !== null && label.anchorPixelY !== null && (
              <g key={`pin-leader-${label.id}`}>
                <line x1={label.anchorPixelX} y1={label.anchorPixelY} x2={label.boxPixelX} y2={label.boxPixelY} style={{color: label.tone, stroke: label.tone}} />
                <circle cx={label.anchorPixelX} cy={label.anchorPixelY} r="3" style={{color: label.tone, fill: label.tone, stroke: '#ffffff'}} />
              </g>
            ))}
          </svg>
          {pinnedMapLabels.map((label) => (
            <div
              key={label.id}
              className="tanga-deck__pin-label"
              style={{'--pin-x': `${label.boxPixelX}px`, '--pin-y': `${label.boxPixelY}px`, '--pin-tone': label.tone} as any}
            >
              {label.text}
            </div>
          ))}
        </section>
      )}

      <section className="tanga-deck__geo-overlay" aria-label="Map legend compass and scale">
        <div className="tanga-deck__compass tanga-compass" aria-label={`Bearing ${Math.round(compassBearing)} degrees`}>
          <div className="tanga-compass__rose" style={{transform: `rotate(${-compassBearing}deg)`}}>
            <i className="tanga-compass__arrow" />
            <span className="tanga-compass__n">N</span>
          </div>
          <small className="tanga-compass__deg">{Math.round(compassBearing)}°</small>
        </div>

        <div className="tanga-deck__legend">
          <div className="tanga-deck__legend-head">
            <span>Data Legend</span>
            <strong>{MODE_LABELS[activeMode]}</strong>
          </div>
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

        <div className="tanga-deck__scale">
          <div>
            <span style={{width: `${scale.width}px`}} />
            <em>{scale.label}</em>
          </div>
          <small>{scale.detail}</small>
        </div>
      </section>

      {/* Story-rail removed — the pager scene-dots + labels below now cover
          navigation. Kept the STORY_STEPS constant in place; it drives the
          pager, keyboard shortcuts, autoplay, and speaker notes. */}

      {activeDataTable && (
        <aside key={`data-${activeMode}`} className="tanga-deck__data-panel" aria-label={activeDataTable.title}>
          <div className="tanga-deck__data-panel-head">
            <span className="tanga-deck__data-panel-eyebrow">Source data</span>
            <strong className="tanga-deck__data-panel-title">{activeDataTable.title}</strong>
            <small className="tanga-deck__data-panel-source">{activeDataTable.source}</small>
          </div>
          <table className="tanga-deck__data-table">
            <thead>
              <tr>
                {activeDataTable.columns.map((col, index) => (
                  <th key={col} className={index === 0 ? 'is-label' : 'is-num'}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Compute max of the second column (numeric) for the inline bar chart.
                const numericMax = activeDataTable.rows.reduce((max, row) => {
                  if (row.group || !row.cells) return max;
                  const n = parseFloat(row.cells[1] ?? '');
                  return Number.isFinite(n) && n > max ? n : max;
                }, 0);
                return activeDataTable.rows.map((row, index) => {
                  if (row.group) {
                    return (
                      <tr key={`group-${index}`} className="is-group">
                        <td colSpan={activeDataTable.columns.length}>{row.group}</td>
                      </tr>
                    );
                  }
                  const n = parseFloat(row.cells?.[1] ?? '');
                  const barPct = numericMax > 0 && Number.isFinite(n) ? Math.round((n / numericMax) * 100) : 0;
                  return (
                    <tr
                      key={`row-${index}`}
                      className={row.emphasis ? 'is-emphasis' : undefined}
                      style={{'--bar': barPct} as any}
                    >
                      {row.cells?.map((cell, cellIndex) => (
                        <td key={cellIndex} className={cellIndex === 0 ? 'is-label' : 'is-num'}>
                          {cellIndex > 0 && /\d/.test(cell) ? <CountUp value={cell} duration={900} /> : cell}
                        </td>
                      ))}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </aside>
      )}

      {/* Key-insight chips for scenes without a source-data table — keeps the
          top-left zone purposeful across the whole deck. */}
      {!activeDataTable && insightFacts.length > 0 && !isCoverScene && !isClosingScene && (
        <aside key={`insight-${activeMode}`} className="tanga-deck__insight-panel" aria-label="Key facts">
          <span className="tanga-deck__insight-eyebrow">{activeSlide?.narrative?.chapterTitle ?? MODE_LABELS[activeMode]}</span>
          <ul className="tanga-deck__insight-list">
            {insightFacts.map((fact) => (
              <li key={`${fact.label}-${fact.value}`}>
                <span className="tanga-deck__insight-label">{fact.label}</span>
                <strong className="tanga-deck__insight-value">{fact.value}</strong>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* Three-act story ribbon — top-center, shows narrative progression. */}
      <div className="tanga-deck__act-ribbon" aria-hidden="true">
        {STORY_ACTS.map((act, i) => (
          <div
            key={act.id}
            className={classNames(
              'tanga-deck__act-seg',
              i === activeActIndex && 'is-active',
              i < activeActIndex && 'is-done',
            )}
            style={{'--act-theme': act.theme} as any}
          >
            <span className="tanga-deck__act-num">{`Act ${['I', 'II', 'III'][i]}`}</span>
            <span className="tanga-deck__act-label">{act.label}</span>
          </div>
        ))}
      </div>

      {/* First-run coach marks — one-time interactive hint. */}
      {showCoach && !showCover && (
        <button type="button" className="tanga-deck__coach" onClick={dismissCoach} aria-label="Dismiss navigation hint">
          <span className="tanga-deck__coach-keys">
            <kbd>&larr;</kbd><kbd>&rarr;</kbd>
          </span>
          <span className="tanga-deck__coach-copy">
            <strong>This deck is interactive</strong>
            <small>Use the arrow keys or the bar below to move through the story. Press <kbd>?</kbd> for all shortcuts.</small>
          </span>
          <span className="tanga-deck__coach-dismiss">Got it</span>
        </button>
      )}

      {/* Guided narration caption — during autoplay the deck reads itself
          like a self-running pitch (great for a lobby / booth screen). */}
      {isAutoplay && !isCoverScene && !isClosingScene && activeSlide?.narrative?.narrationScript && (
        <div className="tanga-deck__narration" role="status" aria-live="polite">
          <span className="tanga-deck__narration-eyebrow">{activeSlide.narrative?.chapterTitle ?? MODE_LABELS[activeMode]}</span>
          <p key={activeMode}>{activeSlide.narrative.narrationScript}</p>
        </div>
      )}

      {/* Investor inspector (Ctrl+I) — plain-English "why this matters". */}
      {isInspectorOpen && !isCoverScene && (
        <aside className="tanga-deck__inspector" aria-label="Why this matters">
          <div className="tanga-deck__inspector-head">
            <span>Why this matters</span>
            <button type="button" onClick={toggleInspector} aria-label="Close inspector"><X size={14} strokeWidth={2.2} /></button>
          </div>
          <strong className="tanga-deck__inspector-headline">{MODE_INVESTOR_ANGLE[activeMode].headline}</strong>
          <ul className="tanga-deck__inspector-points">
            {MODE_INVESTOR_ANGLE[activeMode].points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </aside>
      )}

      {/* Cover card — animated brand intro on the first scene. */}
      {isCoverScene && (
        <div className="tanga-deck__cover" role="dialog" aria-label="Presentation cover">
          <div className="tanga-deck__cover-inner">
            <span className="tanga-deck__cover-eyebrow">Sakariya Mines &amp; Minerals · Investor Presentation</span>
            <h1 className="tanga-deck__cover-title">Tanga Graphite</h1>
            <p className="tanga-deck__cover-sub">A drill-defined, JORC-compliant flake graphite resource on Tanzania&rsquo;s Mozambique Belt — 183&nbsp;Mt @ 4.86% TGC, with port, power and rail already in reach.</p>
            <button type="button" className="tanga-deck__cover-cta" onClick={() => setCoverDismissed(true)}>
              Begin the story <ChevronRight size={18} strokeWidth={2.4} />
            </button>
            <span className="tanga-deck__cover-hint">Press &rarr; or click to begin</span>
          </div>
        </div>
      )}

      {actCard && (
        <section
          className="tanga-deck__act-card"
          style={{'--act-theme': actCard.theme} as any}
          role="status"
          aria-live="polite"
          aria-label={`Act ${actCard.numeral}: ${actCard.label}`}
        >
          <div className="tanga-deck__act-card-inner">
            <span className="tanga-deck__act-card-numeral" aria-hidden="true">{actCard.numeral}</span>
            <strong className="tanga-deck__act-card-label">{actCard.label}</strong>
            <span className="tanga-deck__act-card-rule" aria-hidden="true" />
            <p className="tanga-deck__act-card-thesis">{actCard.thesis}</p>
          </div>
        </section>
      )}

      {/* Closing CTA card — on the final scene. */}
      {isClosingScene && (
        <aside className="tanga-deck__closing" aria-label="Investment summary">
          <span className="tanga-deck__closing-eyebrow">The Investment Case</span>
          <h2 className="tanga-deck__closing-title">A de-risked graphite asset, ready to advance</h2>
          <div className="tanga-deck__closing-metrics">
            <div><strong><CountUp value="183" /> Mt</strong><span>Total resource @ 4.86% TGC</span></div>
            <div><strong>&gt;<CountUp value="97" />% TC</strong><span>Concentrate purity</span></div>
            <div><strong>US$<CountUp value="0.58" /> Bn</strong><span>Optimum pit NPV</span></div>
            <div><strong>#<CountUp value="5" /></strong><span>By M&amp;I contained graphite</span></div>
          </div>
          <p className="tanga-deck__closing-contact">
            Sakariya Mines &amp; Minerals · investor relations
            <button type="button" className="tanga-deck__disclaimer-link" onClick={() => setIsDisclaimerOpen(true)}>
              Important notice &amp; disclaimer
            </button>
          </p>
        </aside>
      )}

      {isNotesOpen && activeSlide && (
        <aside className="tanga-deck__notes" role="complementary" aria-label="Speaker notes">
          <div className="tanga-deck__notes-head">
            <span className="tanga-deck__notes-eyebrow">
              Presenter · Scene {activeStoryIndex + 1}/{STORY_STEPS.length}
              <em className="tanga-deck__notes-timer" title="Elapsed since deck opened">{fmtElapsed(elapsedMs)}</em>
            </span>
            <strong className="tanga-deck__notes-title">{activeSlide.narrative?.chapterTitle ?? activeSlide.title}</strong>
            <small className="tanga-deck__notes-beat">{activeSlide.narrative?.storyBeat ?? activeSlide.subtitle}</small>
          </div>
          {activeSlide.narrative?.narrationScript && (
            <p className="tanga-deck__notes-script">{activeSlide.narrative.narrationScript}</p>
          )}
          {activeSlide.speakerNotes && (
            <div className="tanga-deck__notes-block">
              <span className="tanga-deck__notes-label">Speaker notes</span>
              <p>{activeSlide.speakerNotes}</p>
            </div>
          )}
          {nextSlide && (
            <div className="tanga-deck__notes-next">
              <span className="tanga-deck__notes-label">Next up</span>
              <strong>{nextSlide.narrative?.chapterTitle ?? nextSlide.title}</strong>
              <small>{nextSlide.narrative?.storyBeat ?? nextSlide.subtitle}</small>
            </div>
          )}
          <button
            type="button"
            className="tanga-deck__notes-close"
            onClick={toggleNotes}
            aria-label="Close speaker notes"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </aside>
      )}

      <nav className="tanga-deck__pager" aria-label="Deck navigation">
        <button
          type="button"
          className="tanga-deck__pager-btn"
          onClick={handleManualPrev}
          disabled={isFirstStory}
          aria-label="Previous scene"
          title="Previous  (←)"
        >
          <ChevronLeft size={20} strokeWidth={2.4} />
        </button>
        <div className="tanga-deck__pager-status" aria-live="polite">
          <span className="tanga-deck__pager-label">{STORY_STEPS[activeStoryIndex]?.label ?? 'Scene'}</span>
          <strong className="tanga-deck__pager-count">
            {String(activeStoryIndex + 1).padStart(2, '0')} / {String(STORY_STEPS.length).padStart(2, '0')}
          </strong>
          <div
            className="tanga-deck__pager-dots"
            role="tablist"
            aria-label="Jump to scene"
            style={{'--pager-progress': STORY_STEPS.length > 1 ? activeStoryIndex / (STORY_STEPS.length - 1) : 0} as any}
          >
            {STORY_STEPS.map((step, i) => (
              <button
                key={step.mode}
                type="button"
                role="tab"
                aria-selected={i === activeStoryIndex}
                aria-label={`Scene ${i + 1}: ${step.label}`}
                title={`${i + 1}. ${step.label}`}
                className={classNames(
                  'tanga-deck__pager-dot',
                  i === activeStoryIndex && 'is-active',
                  i < activeStoryIndex && 'is-seen'
                )}
                onClick={() => { setIsAutoplay(false); goToStoryIndex(i); }}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          className="tanga-deck__pager-btn tanga-deck__pager-btn--next"
          onClick={handleManualNext}
          disabled={isLastStory}
          aria-label="Next scene"
          title="Next  (→)"
        >
          <ChevronRight size={20} strokeWidth={2.4} />
        </button>
        <span className="tanga-deck__pager-divider" aria-hidden="true" />
        <div className="tanga-deck__autoplay-group">
          <button
            type="button"
            className={classNames('tanga-deck__pager-btn tanga-deck__pager-btn--tool tanga-deck__pager-play', isAutoplay && 'is-active', isAutoplay && 'is-ticking')}
            style={{'--autoplay-dwell': `${autoplaySec}s`} as any}
            key={`play-${activeStoryIndex}-${autoplaySec}-${isAutoplay}`}
            onClick={toggleAutoplay}
            aria-label={isAutoplay ? 'Pause autoplay' : 'Start autoplay'}
            aria-pressed={isAutoplay}
            title={isAutoplay ? 'Pause autoplay  (P)' : 'Autoplay  (P)'}
          >
            {isAutoplay ? <Pause size={16} strokeWidth={2.4} /> : <Play size={16} strokeWidth={2.4} />}
          </button>
          <button
            type="button"
            className="tanga-deck__pager-btn tanga-deck__pager-speed"
            onClick={() => setIsAutoplayMenuOpen((prev) => !prev)}
            aria-label={`Autoplay dwell: ${autoplaySec} seconds`}
            aria-haspopup="menu"
            aria-expanded={isAutoplayMenuOpen}
            title={`${autoplaySec}s per scene — click to change`}
          >
            {autoplaySec}s
          </button>
          {isAutoplayMenuOpen && (
            <div className="tanga-deck__speed-menu" role="menu">
              {[5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  role="menuitemradio"
                  aria-checked={autoplaySec === sec}
                  className={classNames(autoplaySec === sec && 'is-active')}
                  onClick={() => { setAutoplaySec(sec as 5 | 10 | 15); setIsAutoplayMenuOpen(false); }}
                >
                  {sec} seconds
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className={classNames('tanga-deck__pager-btn tanga-deck__pager-btn--tool', annotationsOn && 'is-active')}
          onClick={toggleAnnotations}
          aria-label={annotationsOn ? 'Hide annotations' : 'Show annotations'}
          aria-pressed={annotationsOn}
          title={`Annotations  (Ctrl+A) — currently ${annotationsOn ? 'ON' : 'OFF'}`}
        >
          <MessageSquare size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className={classNames('tanga-deck__pager-btn tanga-deck__pager-btn--tool', isInspectorOpen && 'is-active')}
          onClick={toggleInspector}
          aria-label={isInspectorOpen ? 'Hide why-this-matters' : 'Show why-this-matters'}
          aria-pressed={isInspectorOpen}
          title="Why this matters  (Ctrl+I)"
        >
          <Info size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className={classNames('tanga-deck__pager-btn tanga-deck__pager-btn--tool', isNotesOpen && 'is-active')}
          onClick={toggleNotes}
          aria-label={isNotesOpen ? 'Hide speaker notes' : 'Show speaker notes'}
          aria-pressed={isNotesOpen}
          title="Speaker notes  (S)"
        >
          <NotebookText size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className={classNames('tanga-deck__pager-btn tanga-deck__pager-btn--tool', isFullscreen && 'is-active')}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isFullscreen}
          title="Fullscreen  (F)"
        >
          {isFullscreen ? <Minimize2 size={16} strokeWidth={2.2} /> : <Maximize2 size={16} strokeWidth={2.2} />}
        </button>
        <button
          type="button"
          className="tanga-deck__pager-btn tanga-deck__pager-btn--tool"
          onClick={toggleShortcuts}
          aria-label="Keyboard shortcuts"
          title="Shortcuts  (?)"
        >
          <HelpCircle size={16} strokeWidth={2.2} />
        </button>
      </nav>

      {isBlackout && (
        <div
          className="tanga-deck__blackout"
          role="button"
          tabIndex={0}
          onClick={toggleBlackout}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBlackout(); } }}
          aria-label="Blackout is active. Press B or Esc to exit."
        />
      )}

      {isDisclaimerOpen && (
        <div className="tanga-deck__disclaimer-overlay" role="dialog" aria-modal="true" aria-label="Important notice and disclaimer" onClick={() => setIsDisclaimerOpen(false)}>
          <div className="tanga-deck__disclaimer" onClick={(e) => e.stopPropagation()}>
            <div className="tanga-deck__disclaimer-head">
              <strong>Important Notice &amp; Disclaimer</strong>
              <button type="button" onClick={() => setIsDisclaimerOpen(false)} aria-label="Close disclaimer" className="tanga-deck__shortcuts-close">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="tanga-deck__disclaimer-body">
              <p><strong>Competent Person statement.</strong> The Mineral Resource estimate in this presentation was prepared by AMC Consultants Pty Ltd and is reported in accordance with the JORC Code (2012 Edition). The information is based on, and fairly represents, work compiled by the Competent Person, who consents to its inclusion in the form and context in which it appears.</p>
              <p><strong>Forward-looking statements.</strong> This presentation contains forward-looking statements — including the mine-plan, pit-optimisation and economic figures — that are based on assumptions and estimates subject to significant business, economic and technical uncertainties. Actual results may differ materially. Pit shells, NPV and mine-planning figures are conceptual, preliminary and for illustration only; they do not constitute an Ore Reserve or a feasibility-level study.</p>
              <p><strong>Not investment advice.</strong> This material is provided for information purposes only and does not constitute an offer, invitation or recommendation to subscribe for or purchase any security, nor investment, financial, legal or tax advice. Recipients should conduct their own due diligence and seek independent professional advice.</p>
              <p><strong>Sources.</strong> AMC Tanga Graphite Mineral Resource Estimate (19 Dec 2025); Sakariya / Grapeak exploration and metallurgical testwork; internal pit-optimisation modelling. Concept mine infrastructure shown in the accessibility scene is hypothetical.</p>
              <small>© Sakariya Mines &amp; Minerals. All figures subject to the qualifications above.</small>
            </div>
          </div>
        </div>
      )}

      {isShortcutsOpen && (
        <div className="tanga-deck__shortcuts" role="dialog" aria-label="Keyboard shortcuts">
          <div className="tanga-deck__shortcuts-head">
            <strong>Presenter shortcuts</strong>
            <button type="button" onClick={toggleShortcuts} aria-label="Close" className="tanga-deck__shortcuts-close">
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
          <dl className="tanga-deck__shortcuts-list">
            <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Previous / next scene</dd>
            <dt><kbd>1</kbd>–<kbd>9</kbd></dt><dd>Jump to scene</dd>
            <dt><kbd>Home</kbd> <kbd>End</kbd></dt><dd>First / last scene</dd>
            <dt><kbd>P</kbd> or <kbd>Space</kbd></dt><dd>Play / pause autoplay</dd>
            <dt><kbd>F</kbd></dt><dd>Fullscreen</dd>
            <dt><kbd>S</kbd></dt><dd>Speaker notes</dd>
            <dt><kbd>Ctrl</kbd>+<kbd>A</kbd></dt><dd>Toggle annotations</dd>
            <dt><kbd>Ctrl</kbd>+<kbd>I</kbd></dt><dd>Why this matters</dd>
            <dt><kbd>B</kbd></dt><dd>Blackout screen</dd>
            <dt><kbd>Esc</kbd></dt><dd>Close panel / exit fullscreen</dd>
            <dt><kbd>?</kbd></dt><dd>This help sheet</dd>
          </dl>
        </div>
      )}

      <header className="tanga-deck__topbar">
        <div className="tanga-deck__brand">
          <span className="tanga-deck__brand-mark">
            <img src="/A_Logo.png" alt="" />
          </span>
          <span className="tanga-deck__brand-lockup">
            <img src="/sakariya-wordmark.png" alt="Sakariya Mines & Minerals" />
            <small>Reshaping resources</small>
          </span>
        </div>
        <div className="tanga-deck__chips">
          <span className="tanga-deck__chip-scene" title={activeSlide?.narrative?.storyBeat ?? undefined}>
            {activeSlide?.narrative?.chapterTitle ?? MODE_LABELS[activeMode]}
          </span>
        </div>
        <form className="tanga-deck__command" onSubmit={handleSubmit}>
          <input
            value={commandText}
            onChange={(event) => setCommandText(event.target.value)}
            placeholder="Say or type: show resource, zoom in, rotate 360"
            aria-label="Presentation command"
          />
          <button type="submit" title="Run typed command">Run</button>
          <button type="button" title={wakeEnabled ? 'Pause wake listener' : 'Enable microphone'} className={classNames(wakeEnabled && 'is-active')} onClick={toggleVoice}>
            {wakeEnabled ? 'Pause' : 'Mic'}
          </button>
          <div className="tanga-deck__command-suggestions" aria-label="Shortlisted command prompts">
            {shortlistedPrompts.map((prompt) => (
              <button
                key={prompt.command}
                type="button"
                style={{'--prompt-tone': prompt.tone} as any}
                onClick={() => runPrompt(prompt.command)}
                title={prompt.command}
              >
                <span>{prompt.label}</span>
                <small>{prompt.command}</small>
              </button>
            ))}
          </div>
        </form>
      </header>

      <section className="tanga-deck__load-strip" aria-label="Scene readiness">
        {loadStages.map((stage) => (
          <span key={stage.id} className={`is-${stage.state}`} title={stage.detail}>
            <i aria-hidden="true" />
            <strong>{stage.label}</strong>
            <small>{sceneStateText(stage.state)} - {stage.detail}</small>
          </span>
        ))}
      </section>

      <section key={`title-${activeMode}-${resourceFocus}-${routeTarget}`} className="tanga-deck__title">
        <span>{MODE_LABELS[activeMode]}</span>
        <h1>{modeHeadline(activeMode, resourceFocus, tangaRankingInserted)}</h1>
        <p>{currentSummary}</p>
        <div className="tanga-deck__facts" aria-label="Scene facts">
          {currentFacts.map((fact) => (
            <span key={`${fact.label}-${fact.value}`}>
              <small>{fact.label}</small>
              <strong>{fact.value}</strong>
            </span>
          ))}
        </div>
        {activeMode === 'accessibility' && (
          <div className="tanga-deck__route-readout">
            <Route size={15} aria-hidden="true" />
            <span>{routeReadout}</span>
          </div>
        )}
      </section>

      {activeMode === 'accessibility' && (
        <section className="tanga-deck__route-profile" aria-label="Route elevation profile">
          <div className="tanga-deck__route-profile-head">
            <span>Route elevation</span>
            <strong>{routeProfile.targetLabel}</strong>
          </div>
          <svg viewBox="0 0 230 66" role="img" aria-label={`Elevation profile from ${routeProfile.minElevation} to ${routeProfile.maxElevation} metres`}>
            <path d="M4 62 L226 62" />
            <polyline points={routeProfile.points} />
          </svg>
          <div className="tanga-deck__route-profile-meta">
            <span>{routeProfile.distanceLabel}</span>
            <span>{routeProfile.durationLabel}</span>
            <span>{routeProfile.minElevation}-{routeProfile.maxElevation} m</span>
          </div>
        </section>
      )}

      {activeMode === 'ranking' && selectedPeerProject && (
        <aside
          className={classNames('tanga-deck__peer-popup', selectedPeerProject.isTanga && 'is-tanga')}
          aria-label={`${selectedPeerProject.project} peer project detail`}
          onPointerDown={markUiInteraction}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="tanga-deck__peer-popup-close"
            title="Close project detail"
            aria-label="Close project detail"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedPeerProject(null);
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
          <div className="tanga-deck__peer-popup-head">
            <span>Peer Project</span>
            <strong>#{selectedPeerProject.displayRank} {selectedPeerProject.project}</strong>
            <small>{selectedPeerProject.company} / {selectedPeerProject.country}</small>
          </div>
          <div className="tanga-deck__peer-popup-metric">
            <span>M&I contained graphite</span>
            <strong>{selectedPeerProject.containedGraphiteMt.toLocaleString(undefined, {maximumFractionDigits: 3})} Mt</strong>
            <small>{selectedPeerProject.status}</small>
          </div>
          <dl className="tanga-deck__peer-popup-grid">
            {peerPopupRows(selectedPeerProject).map(([label, value]) => (
              <div key={`${selectedPeerProject.project}-${label}`}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="tanga-deck__peer-popup-foot">
            <span>{selectedPeerProject.isTanga ? 'Tanga insert' : 'Global top 10 peer'}</span>
            <strong>Click another project dot to compare</strong>
          </div>
        </aside>
      )}

      {activeMode === 'ranking' && (
        <section
          className={classNames('tanga-deck__ranking', tangaRankingInserted && 'is-inserted')}
          aria-label="Top graphite project ranking"
          onPointerDown={markUiInteraction}
        >
          <div className="tanga-deck__ranking-head">
            <span>{tangaRankingInserted ? 'Global Ranking' : 'Peer Context'}</span>
            <strong>{tangaRankingInserted ? 'Tanga enters the world’s top 5 graphite deposits' : 'Top 10 public graphite projects'}</strong>
            <small>{tangaRankingInserted
              ? 'Ranked #5 by M&I contained graphite — ahead of every other Tanzanian peer.'
              : 'M&I contained graphite basis; click any globe dot or row for owner, listing, grade, flake distribution and metallurgy notes.'}</small>
          </div>

          <ol className="tanga-deck__ranking-list">
            {graphiteRows.map((project) => (
              <li
                key={`${project.project}-${project.country}`}
                className={classNames(
                  project.isTanga && 'is-tanga',
                  project.shifted && 'is-shifted',
                  selectedPeerKey === peerProjectKey(project) && 'is-selected'
                )}
                style={{'--rank-bar': `${Math.round(((project.containedGraphiteMt || 0) / maxContainedGraphite) * 100)}`} as any}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPeerKey === peerProjectKey(project)}
                onPointerDown={markUiInteraction}
                onClick={(event) => {
                  event.stopPropagation();
                  selectPeerProject(project);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    selectPeerProject(project);
                  }
                }}
              >
                <span className="tanga-deck__rank-number">{project.displayRank}</span>
                <span className="tanga-deck__rank-main">
                  <strong>
                    {project.project}
                    {project.isTanga && <span className="tanga-deck__rank-badge">NEW · TOP 5</span>}
                  </strong>
                  <small>{project.company} / {project.country}</small>
                  <span className="tanga-deck__rank-bar" aria-hidden="true"><i /></span>
                </span>
                <span className="tanga-deck__rank-figure">
                  <strong>{(project.containedGraphiteMt || 0).toFixed(1)}</strong>
                  <small>Mt C</small>
                </span>
              </li>
            ))}
          </ol>

          {tangaRankingInserted ? (
            <div className="tanga-deck__rank-vs" aria-label="Tanga versus Mahenge">
              <div className="tanga-deck__rank-vs-head">
                <span>#5 Tanga</span>
                <em>vs</em>
                <span>#4 Mahenge</span>
              </div>
              <ul>
                <li><i>Scale</i><b>7.3 Mt</b><s>comparable</s><b>9.3 Mt</b></li>
                <li className="is-win"><i>Logistics</i><b>~80 km to port</b><s>coastal edge</s><b>inland south</b></li>
                <li className="is-win"><i>Metallurgy</i><b>&gt;97% TC</b><s>premium conc.</s><b>large-flake</b></li>
                <li><i>Listing</i><b>Private</b><s>pre-market entry</s><b>ASX: BKT</b></li>
              </ul>
              <p>Comparable scale, a coastal logistics edge and &gt;97% TC metallurgy — entering the global top 5 pre-market.</p>
            </div>
          ) : (
            <div className="tanga-deck__ranking-foot">
              <span>Awaiting resource reveal</span>
              <strong>Say &ldquo;show resource&rdquo; to reveal Tanga</strong>
            </div>
          )}
        </section>
      )}

      {activeMode === 'comparison' && (
        <section className="tanga-deck__comparison" aria-label="Tanga peer comparison">
          <div className="tanga-deck__comparison-head">
            <span>Final Comparison</span>
            <strong>Tanga position after resource and metallurgy reveal</strong>
            <small>Investor-ready readout across peer slot, grade confidence, metallurgy, and logistics context.</small>
          </div>

          <div className="tanga-deck__comparison-metrics">
            {PEER_COMPARISON_METRICS.map((metric) => (
              <article key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </article>
            ))}
          </div>

          <div className="tanga-deck__comparison-grid" role="table" aria-label="Peer comparison matrix">
            <div className="tanga-deck__comparison-row is-head" role="row">
              <span>Rank</span>
              <span>Project</span>
              <span>M&I graphite</span>
              <span>Comparison note</span>
            </div>
            {comparisonRows.map((project) => (
              <div
                key={`${project.project}-${project.country}`}
                className={classNames('tanga-deck__comparison-row', project.isTanga && 'is-tanga')}
                role="row"
              >
                <span>#{project.displayRank}</span>
                <span>
                  <strong>{project.project}</strong>
                  <small>{project.company} / {project.country}</small>
                </span>
                <span>{project.resource}</span>
                <span>{peerComparisonNote(project.project)}</span>
              </div>
            ))}
          </div>

          <div className="tanga-deck__comparison-foot">
            <span>Useful presenter commands</span>
            <strong>show resource, then show metallurgy, then compare Tanga with peers</strong>
          </div>
        </section>
      )}

      <aside className={classNames('tanga-deck__voice-dock', `is-${voiceState}`)} aria-label="Voice command status and quick controls">
        <div className="tanga-deck__voice-status">
          <span>{voiceStatusCopy.kicker}</span>
          <strong>{voiceStatusCopy.message}</strong>
          <small>{voiceStatusCopy.detail}</small>
          <em className="tanga-deck__voice-debug">{voiceDebug}</em>
        </div>

        <div className="tanga-deck__recent-prompts" aria-label="Recent presentation commands">
          {recentCommands.map((prompt) => (
            <button
              key={`${prompt.label}-${prompt.command}`}
              type="button"
              style={{'--prompt-tone': prompt.tone} as any}
              onClick={() => runPrompt(prompt.command)}
              title={prompt.command}
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <div className="tanga-deck__tool-row" aria-label="Route targets">
          {([
            ['port', Ship, 'Route to Tanga Port'],
            ['power', Zap, 'Route to nearest power node'],
            ['rail', TrainFront, 'Route to railway terminal'],
          ] as const).map(([target, Icon, label]) => (
            <button
              key={target}
              type="button"
              title={label}
              aria-label={label}
              className={classNames(routeTarget === target && activeMode === 'accessibility' && 'is-active')}
              onClick={() => void activateMode('accessibility', {routeTarget: target})}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="tanga-deck__tool-row" aria-label="Geology controls">
          <button
            type="button"
            title="Show top graphite projects"
            aria-label="Show top graphite projects"
            className={classNames(activeMode === 'ranking' && 'is-active')}
            onClick={() => void activateMode('ranking')}
          >
            <ListOrdered size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Show topography"
            aria-label="Show topography"
            className={classNames(activeMode === 'topography' && 'is-active')}
            onClick={() => void activateMode('topography')}
          >
            <Mountain size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Show resource model"
            aria-label="Show resource model"
            className={classNames(activeMode === 'resource' && 'is-active')}
            onClick={() => void activateMode('resource', {resourceFocus})}
          >
            <Box size={16} aria-hidden="true" />
          </button>
          {(activeMode === 'resource' || activeMode === 'subsurface') ? (
            <button
              type="button"
              title="Break surface"
              aria-label="Break surface"
              className={classNames(activeMode === 'subsurface' && 'is-active')}
              onClick={() => void activateMode('subsurface')}
            >
              <Route size={16} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            title="Show metallurgy"
            aria-label="Show metallurgy"
            className={classNames(activeMode === 'metallurgy' && 'is-active')}
            onClick={() => void activateMode('metallurgy')}
          >
            <FlaskConical size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="tanga-deck__tool-row" aria-label="Camera controls">
          <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => applyCameraAction('zoomIn')}>
            <ZoomIn size={16} aria-hidden="true" />
          </button>
          <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => applyCameraAction('zoomOut')}>
            <ZoomOut size={16} aria-hidden="true" />
          </button>
          <button type="button" title="Camera below" aria-label="Camera below" onClick={() => applyCameraAction('bottomView')}>
            <ArrowDown size={16} aria-hidden="true" />
          </button>
          <button type="button" title="Camera top" aria-label="Camera top" onClick={() => applyCameraAction('tiltUp')}>
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button type="button" title="Rotate 90 degrees" aria-label="Rotate 90 degrees" onClick={rotateNinety}>
            <RotateCw size={16} aria-hidden="true" />
          </button>
          <button type="button" className={classNames(wakeEnabled && 'is-active')} title={voiceButtonLabel} aria-label={voiceButtonLabel} onClick={toggleVoice}>
            {wakeEnabled ? <Square size={15} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          </button>
        </div>

        {activeMode === 'resource' && (
          <div className="tanga-deck__resource-filter" aria-label="Resource focus">
            {(['Indicated', 'Inferred', 'All', 'HighTGC', 'LowTGC', 'LowUncertainty', 'HighFlake'] as const).map((focus) => (
              <button
                key={focus}
                type="button"
                className={classNames(resourceFocus === focus && 'is-active')}
                onClick={() => void activateMode('resource', {resourceFocus: focus})}
              >
                {shortResourceFocusLabel(focus)}
              </button>
            ))}
          </div>
        )}
      </aside>
    </main>
  );
}












