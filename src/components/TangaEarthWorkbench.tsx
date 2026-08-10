'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type WorkbenchMode =
  | 'tanzania'
  | 'project'
  | 'topography'
  | 'accessibility'
  | 'drillholes'
  | 'subsurface'
  | 'resource';

type RouteTarget = 'port' | 'power';
type ResourceFocus = 'Indicated' | 'Inferred' | 'All';
type LayerStatus = 'idle' | 'loading' | 'loaded' | 'error';
type LayerId =
  | 'tanzania'
  | 'tanga'
  | 'project'
  | 'labels'
  | 'topography'
  | 'roads'
  | 'route'
  | 'drillholes'
  | 'resource'
  | 'cutaway';

type LayerMeta = {
  id: LayerId;
  name: string;
  file: string;
  visible: boolean;
  status: LayerStatus;
  count?: number;
  note: string;
};

type LayerBucket = {
  dataSources: any[];
  entities: any[];
  imageryLayers: any[];
  loaded: boolean;
};

type FeatureRow = {
  layer: string;
  status: string;
  detail: string;
};

type CommandIntent = {
  mode: WorkbenchMode | null;
  routeTarget?: RouteTarget;
  resourceFocus?: ResourceFocus;
  rotate90?: boolean;
  confidence?: number;
  source?: string;
  reason?: string;
};

const CESIUM_LOCAL_BASE = '/cesium';
const PROJECT_CENTER = { lon: 38.785, lat: -4.813, height: 360 };
const TOPO_RECTANGLE = {
  west: 38.746,
  south: -4.862,
  east: 38.817,
  north: -4.761,
};

const ROUTE_TARGETS: Record<RouteTarget, { label: string; lon: number; lat: number; kind: string }> = {
  port: { label: 'Tanga Port', lon: 39.105, lat: -5.064, kind: 'port' },
  power: { label: 'Tanga grid connection', lon: 39.086, lat: -5.086, kind: 'power' },
};

const TANZANIA_OUTLINE = [
  29.34, -1.05,
  31.15, -1.0,
  33.9, -1.37,
  36.9, -1.1,
  40.45, -3.55,
  39.78, -7.85,
  40.43, -10.45,
  38.15, -11.72,
  34.75, -11.58,
  31.85, -10.35,
  29.55, -7.3,
  29.34, -1.05,
];

const INITIAL_LAYERS: Record<LayerId, LayerMeta> = {
  tanzania: {
    id: 'tanzania',
    name: 'Tanzania context',
    file: 'drawn context',
    visible: true,
    status: 'idle',
    note: 'Country outline and Tanga focus',
  },
  tanga: {
    id: 'tanga',
    name: 'Tanga area',
    file: 'tanga_boundary.kmz',
    visible: true,
    status: 'idle',
    note: 'Regional project area highlight',
  },
  project: {
    id: 'project',
    name: 'Project boundary',
    file: 'boundary.kmz',
    visible: true,
    status: 'idle',
    note: 'Mining license and AOI',
  },
  labels: {
    id: 'labels',
    name: 'Places',
    file: 'generated/labels.geojson',
    visible: false,
    status: 'idle',
    note: 'Nearby settlements and POIs',
  },
  topography: {
    id: 'topography',
    name: 'Topography',
    file: 'topography.png + terrain',
    visible: false,
    status: 'idle',
    note: 'Hillshade overlay and relief view',
  },
  roads: {
    id: 'roads',
    name: 'Road network',
    file: 'generated/roads.geojson',
    visible: false,
    status: 'idle',
    note: 'Local OSM-derived roads',
  },
  route: {
    id: 'route',
    name: 'Access route',
    file: 'generated route',
    visible: false,
    status: 'idle',
    note: 'Project to port or grid connection',
  },
  drillholes: {
    id: 'drillholes',
    name: 'Drillholes',
    file: 'assay_data.geojson',
    visible: false,
    status: 'idle',
    note: 'Downhole assay traces',
  },
  resource: {
    id: 'resource',
    name: 'Resource model',
    file: 'BlockModel.geojson',
    visible: false,
    status: 'idle',
    note: 'Filtered resource blocks',
  },
  cutaway: {
    id: 'cutaway',
    name: 'Subsurface window',
    file: 'generated cutaway',
    visible: false,
    status: 'idle',
    note: 'Transparent surface and section walls',
  },
};

const MODE_LABELS: Record<WorkbenchMode, string> = {
  tanzania: 'Tanzania context',
  project: 'Project focus',
  topography: 'Topography',
  accessibility: 'Accessibility',
  drillholes: 'Drillholes',
  subsurface: 'Subsurface',
  resource: 'Resource model',
};

const WORKFLOWS: Array<{
  label: string;
  command: string;
  mode: WorkbenchMode;
  target?: RouteTarget;
  focus?: ResourceFocus;
}> = [
  { label: 'Tanzania', command: 'show tanzania', mode: 'tanzania' },
  { label: 'Focus Project', command: 'focus project area', mode: 'project' },
  { label: 'Topography', command: 'show topography', mode: 'topography' },
  { label: 'Port Route', command: 'show route to tanga port', mode: 'accessibility', target: 'port' },
  { label: 'Power Route', command: 'show nearest power station route', mode: 'accessibility', target: 'power' },
  { label: 'Drillholes', command: 'show drillholes', mode: 'drillholes' },
  { label: 'Break Surface', command: 'go inside the earth', mode: 'subsurface' },
  { label: 'Indicated Blocks', command: 'show indicated resource', mode: 'resource', focus: 'Indicated' },
];

let cesiumRuntimePromise: Promise<any> | null = null;

function ensureCesiumRuntime() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cesium can only run in the browser.'));
  }

  if ((window as any).Cesium) {
    return Promise.resolve((window as any).Cesium);
  }

  if (cesiumRuntimePromise) {
    return cesiumRuntimePromise;
  }

  cesiumRuntimePromise = new Promise((resolve, reject) => {
    (window as any).CESIUM_BASE_URL = `${CESIUM_LOCAL_BASE}/`;

    const cssId = 'tanga-cesium-widgets';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = `${CESIUM_LOCAL_BASE}/Widgets/widgets.css`;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-tanga-cesium="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).Cesium), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Cesium.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `${CESIUM_LOCAL_BASE}/Cesium.js`;
    script.async = true;
    script.defer = true;
    script.dataset.tangaCesium = 'true';
    script.onload = () => {
      if ((window as any).Cesium) {
        resolve((window as any).Cesium);
      } else {
        reject(new Error('Cesium loaded without a runtime.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Cesium.'));
    document.head.appendChild(script);
  }).catch((error) => {
    cesiumRuntimePromise = null;
    throw error;
  });

  return cesiumRuntimePromise;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function readProperty(entity: any, key: string) {
  const value = entity?.properties?.[key];
  return value?.getValue?.() ?? value;
}

function colorForCarbon(Cesium: any, raw: unknown) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return Cesium.Color.fromCssColorString('#8f99a8').withAlpha(0.72);
  if (value >= 7) return Cesium.Color.fromCssColorString('#f97316').withAlpha(0.9);
  if (value >= 5) return Cesium.Color.fromCssColorString('#facc15').withAlpha(0.88);
  if (value >= 3) return Cesium.Color.fromCssColorString('#2dd4bf').withAlpha(0.82);
  return Cesium.Color.fromCssColorString('#5b8def').withAlpha(0.68);
}

function colorForClassification(Cesium: any, value: string) {
  if (value === 'Indicated') return Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.86);
  if (value === 'Inferred') return Cesium.Color.fromCssColorString('#10b981').withAlpha(0.7);
  if (value === 'Measured') return Cesium.Color.fromCssColorString('#3b82f6').withAlpha(0.8);
  return Cesium.Color.fromCssColorString('#94a3b8').withAlpha(0.42);
}

function makeEllipseDegrees(center: { lon: number; lat: number }, radiusLon: number, radiusLat: number, steps = 100) {
  const coords: number[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const theta = (Math.PI * 2 * index) / steps;
    coords.push(center.lon + Math.cos(theta) * radiusLon, center.lat + Math.sin(theta) * radiusLat);
  }
  return coords;
}

function commandLooksLike(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function createStreetMapBaseLayer(Cesium: any) {
  const provider =
    typeof Cesium.OpenStreetMapImageryProvider === 'function'
      ? new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
          maximumLevel: 19,
          credit: 'OpenStreetMap',
        })
      : new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          maximumLevel: 19,
          credit: 'OpenStreetMap',
        });

  return new Cesium.ImageryLayer(provider, {
    brightness: 0.9,
    contrast: 1.08,
    saturation: 0.9,
  });
}

function requestBaseImageryRender(viewer: any) {
  const layers = viewer?.imageryLayers;
  if (!viewer || !layers || layers.length === 0) return;
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers.get(index);
    layer.show = true;
    layer.alpha = 1;
  }
  viewer.scene?.requestRender?.();
}

function ruleIntent(raw: string): CommandIntent | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  if (commandLooksLike(text, ['90', 'ninety', 'rotate', 'turn model', 'turn the model'])) {
    return { mode: null, rotate90: true, confidence: 0.86, source: 'rules' };
  }
  if (commandLooksLike(text, ['power', 'powerstation', 'power station', 'grid', 'substation'])) {
    return { mode: 'accessibility', routeTarget: 'power', confidence: 0.82, source: 'rules' };
  }
  if (commandLooksLike(text, ['port', 'harbour', 'harbor', 'accessibility', 'access', 'route', 'road'])) {
    return { mode: 'accessibility', routeTarget: 'port', confidence: 0.82, source: 'rules' };
  }
  if (commandLooksLike(text, ['topo', 'terrain', 'relief', 'surface'])) {
    return { mode: 'topography', confidence: 0.82, source: 'rules' };
  }
  if (commandLooksLike(text, ['inside', 'subsurface', 'underground', 'break', 'earth', 'cutaway', 'below', 'under'])) {
    return { mode: 'subsurface', confidence: 0.82, source: 'rules' };
  }
  if (commandLooksLike(text, ['drill', 'borehole', 'hole'])) {
    return { mode: 'drillholes', confidence: 0.82, source: 'rules' };
  }
  if (commandLooksLike(text, ['indicated'])) {
    return { mode: 'resource', resourceFocus: 'Indicated', confidence: 0.84, source: 'rules' };
  }
  if (commandLooksLike(text, ['inferred'])) {
    return { mode: 'resource', resourceFocus: 'Inferred', confidence: 0.84, source: 'rules' };
  }
  if (commandLooksLike(text, ['resource', 'block', 'model', 'orebody', 'ore body'])) {
    return { mode: 'resource', confidence: 0.8, source: 'rules' };
  }
  if (commandLooksLike(text, ['project', 'focus', 'aoi', 'license', 'licence'])) {
    return { mode: 'project', confidence: 0.8, source: 'rules' };
  }
  if (commandLooksLike(text, ['tanzania', 'country', 'regional', 'overview'])) {
    return { mode: 'tanzania', confidence: 0.8, source: 'rules' };
  }

  return null;
}

export default function TangaEarthWorkbench() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any | null>(null);
  const runtimeRef = useRef<any | null>(null);
  const bucketsRef = useRef<Partial<Record<LayerId, LayerBucket>>>({});
  const headingRef = useRef(35);
  const recognitionRef = useRef<any | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [activeMode, setActiveMode] = useState<WorkbenchMode>('tanzania');
  const [routeTarget, setRouteTarget] = useState<RouteTarget>('port');
  const [resourceFocus, setResourceFocus] = useState<ResourceFocus>('Indicated');
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.7);
  const [surfaceAlpha, setSurfaceAlpha] = useState(0.38);
  const [commandText, setCommandText] = useState('');
  const [statusText, setStatusText] = useState('Loading Cesium runtime');
  const [isListening, setIsListening] = useState(false);
  const [voicePipeline, setVoicePipeline] = useState('Whisper/Text -> intent -> scene action');
  const [layers, setLayers] = useState<Record<LayerId, LayerMeta>>(INITIAL_LAYERS);
  const [rows, setRows] = useState<FeatureRow[]>([
    { layer: 'workspace', status: 'boot', detail: 'Cesium runtime pending' },
  ]);

  const activeTarget = ROUTE_TARGETS[routeTarget];

  const getBucket = useCallback((id: LayerId) => {
    if (!bucketsRef.current[id]) {
      bucketsRef.current[id] = { dataSources: [], entities: [], imageryLayers: [], loaded: false };
    }
    return bucketsRef.current[id]!;
  }, []);

  const updateLayer = useCallback((id: LayerId, patch: Partial<LayerMeta>) => {
    setLayers((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }, []);

  const pushRow = useCallback((row: FeatureRow) => {
    setRows((current) => [row, ...current.filter((item) => item.layer !== row.layer)].slice(0, 9));
  }, []);

  const setLayerVisibility = useCallback((id: LayerId, visible: boolean) => {
    const bucket = getBucket(id);
    bucket.dataSources.forEach((dataSource) => {
      dataSource.show = visible;
    });
    bucket.entities.forEach((entity) => {
      entity.show = visible;
    });
    bucket.imageryLayers.forEach((layer) => {
      layer.show = visible;
    });
    updateLayer(id, { visible });
    viewerRef.current?.scene?.requestRender?.();
  }, [getBucket, updateLayer]);

  const clearLayer = useCallback((id: LayerId) => {
    const viewer = viewerRef.current;
    const bucket = getBucket(id);
    if (!viewer) return;

    bucket.dataSources.forEach((dataSource) => {
      try {
        viewer.dataSources.remove(dataSource, true);
      } catch {}
    });
    bucket.entities.forEach((entity) => {
      try {
        viewer.entities.remove(entity);
      } catch {}
    });
    bucket.imageryLayers.forEach((layer) => {
      try {
        viewer.imageryLayers.remove(layer, true);
      } catch {}
    });
    bucketsRef.current[id] = { dataSources: [], entities: [], imageryLayers: [], loaded: false };
    updateLayer(id, { status: 'idle', visible: false, count: undefined });
    viewer.scene?.requestRender?.();
  }, [getBucket, updateLayer]);

  const flyTo = useCallback((mode: WorkbenchMode) => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    if (!viewer || !Cesium) return;

    const views: Record<WorkbenchMode, { lon: number; lat: number; height: number; pitch: number; heading: number }> = {
      tanzania: { lon: 35.35, lat: -6.45, height: 3350000, pitch: -88, heading: 0 },
      project: { lon: PROJECT_CENTER.lon, lat: PROJECT_CENTER.lat, height: 52000, pitch: -52, heading: 35 },
      topography: { lon: PROJECT_CENTER.lon, lat: PROJECT_CENTER.lat, height: 19000, pitch: -64, heading: 42 },
      accessibility: { lon: 38.94, lat: -4.94, height: 118000, pitch: -56, heading: 52 },
      drillholes: { lon: PROJECT_CENTER.lon, lat: PROJECT_CENTER.lat, height: 12500, pitch: -58, heading: 28 },
      subsurface: { lon: PROJECT_CENTER.lon, lat: PROJECT_CENTER.lat, height: 9000, pitch: -43, heading: headingRef.current },
      resource: { lon: PROJECT_CENTER.lon, lat: PROJECT_CENTER.lat, height: 10500, pitch: -48, heading: headingRef.current },
    };

    const view = views[mode];
    headingRef.current = view.heading;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(view.lon, view.lat, view.height),
      orientation: {
        heading: Cesium.Math.toRadians(view.heading),
        pitch: Cesium.Math.toRadians(view.pitch),
        roll: 0,
      },
      duration: 1.8,
    });
  }, []);

  const rotateNinety = useCallback(() => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    if (!viewer || !Cesium) return;

    headingRef.current = (headingRef.current + 90) % 360;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(PROJECT_CENTER.lon, PROJECT_CENTER.lat, activeMode === 'resource' ? 9800 : 12000),
      orientation: {
        heading: Cesium.Math.toRadians(headingRef.current),
        pitch: Cesium.Math.toRadians(activeMode === 'subsurface' ? -42 : -50),
        roll: 0,
      },
      duration: 1.25,
    });
    setStatusText(`Rotated camera to ${Math.round(headingRef.current)} degrees`);
    pushRow({ layer: 'camera', status: 'rotated', detail: `Heading ${Math.round(headingRef.current)} degrees` });
  }, [activeMode, pushRow]);

  const styleBoundaryDataSource = useCallback((
    dataSource: any,
    style: { fill: string; outline: string; lineWidth: number; alpha: number }
  ) => {
    const Cesium = runtimeRef.current;
    if (!Cesium || !dataSource?.entities?.values) return;

    dataSource.entities.values.forEach((entity: any) => {
      if (entity.polygon) {
        entity.polygon.fill = true;
        entity.polygon.material = Cesium.Color.fromCssColorString(style.fill).withAlpha(style.alpha);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.fromCssColorString(style.outline).withAlpha(0.96);
        entity.polygon.outlineWidth = style.lineWidth;
        entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
      }
      if (entity.polyline) {
        entity.polyline.width = style.lineWidth;
        entity.polyline.material = Cesium.Color.fromCssColorString(style.outline).withAlpha(0.96);
        entity.polyline.clampToGround = true;
      }
      if (entity.label) entity.label.show = false;
      if (entity.billboard) entity.billboard.show = false;
      if (entity.point) entity.point.show = false;
    });
  }, []);

  const loadKmzLayer = useCallback(async (
    id: LayerId,
    url: string,
    style: { fill: string; outline: string; lineWidth: number; alpha: number }
  ) => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    const bucket = getBucket(id);
    if (!viewer || !Cesium || bucket.loaded) {
      setLayerVisibility(id, true);
      return;
    }

    updateLayer(id, { status: 'loading', visible: true });
    try {
      const dataSource = await Cesium.KmlDataSource.load(url, {
        camera: viewer.scene.camera,
        canvas: viewer.scene.canvas,
        clampToGround: true,
      });
      viewer.dataSources.add(dataSource);
      styleBoundaryDataSource(dataSource, style);
      bucket.dataSources.push(dataSource);
      bucket.loaded = true;
      updateLayer(id, {
        status: 'loaded',
        visible: true,
        count: dataSource.entities?.values?.length ?? undefined,
      });
      pushRow({ layer: INITIAL_LAYERS[id].name, status: 'loaded', detail: url.replace(/^\//, '') });
    } catch (error) {
      updateLayer(id, { status: 'error', visible: false });
      setStatusText(error instanceof Error ? error.message : `Could not load ${url}`);
    }
  }, [getBucket, pushRow, setLayerVisibility, styleBoundaryDataSource, updateLayer]);

  const ensureBaseContext = useCallback(async () => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    if (!viewer || !Cesium) return;

    const tanzaniaBucket = getBucket('tanzania');
    if (!tanzaniaBucket.loaded) {
      const country = viewer.entities.add({
        name: 'Tanzania context',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(TANZANIA_OUTLINE),
          material: Cesium.Color.fromCssColorString('#d8f3dc').withAlpha(0.18),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#2d6a4f').withAlpha(0.92),
          outlineWidth: 2,
        },
      });
      const tangaPulse = viewer.entities.add({
        name: 'Tanga focus',
        position: Cesium.Cartesian3.fromDegrees(PROJECT_CENTER.lon, PROJECT_CENTER.lat, 0),
        ellipse: {
          semiMajorAxis: 56000,
          semiMinorAxis: 36000,
          material: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.18),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.92),
          height: 0,
        },
      });
      const projectPin = viewer.entities.add({
        name: 'Sakariya Project',
        position: Cesium.Cartesian3.fromDegrees(PROJECT_CENTER.lon, PROJECT_CENTER.lat, 850),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString('#ef4444'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: 'Tanga project',
          font: '600 13px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK.withAlpha(0.65),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -22),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      tanzaniaBucket.entities.push(country, tangaPulse, projectPin);
      tanzaniaBucket.loaded = true;
      updateLayer('tanzania', { status: 'loaded', visible: true, count: 3 });
    }

    await Promise.all([
      loadKmzLayer('tanga', '/tanga_boundary.kmz', {
        fill: '#f59e0b',
        outline: '#7c2d12',
        lineWidth: 3,
        alpha: 0.16,
      }),
      loadKmzLayer('project', '/boundary.kmz', {
        fill: '#14b8a6',
        outline: '#042f2e',
        lineWidth: 4,
        alpha: 0.22,
      }),
    ]);
  }, [getBucket, loadKmzLayer, updateLayer]);

  const ensureLabels = useCallback(async () => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    const bucket = getBucket('labels');
    if (!viewer || !Cesium || bucket.loaded) {
      setLayerVisibility('labels', true);
      return;
    }

    updateLayer('labels', { status: 'loading', visible: true });
    try {
      const response = await fetch('/generated/labels.geojson', { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Labels request failed with ${response.status}`);
      const payload = await response.json();
      let count = 0;
      for (const feature of payload.features ?? []) {
        const coords = feature.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;
        const name = String(feature.properties?.name ?? 'Place');
        const priority = Number(feature.properties?.priority ?? 0);
        if (priority < 8 && count > 4) continue;
        const entity = viewer.entities.add({
          name,
          position: Cesium.Cartesian3.fromDegrees(Number(coords[0]), Number(coords[1]), 250),
          point: {
            pixelSize: 5,
            color: Cesium.Color.fromCssColorString(feature.properties?.kind === 'place' ? '#ffffff' : '#facc15'),
            outlineColor: Cesium.Color.BLACK.withAlpha(0.72),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: name,
            font: '600 11px Inter, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        bucket.entities.push(entity);
        count += 1;
      }
      bucket.loaded = true;
      updateLayer('labels', { status: 'loaded', visible: true, count });
      pushRow({ layer: 'places', status: 'loaded', detail: `${count} local labels` });
    } catch (error) {
      updateLayer('labels', { status: 'error', visible: false });
      setStatusText(error instanceof Error ? error.message : 'Could not load labels');
    }
  }, [getBucket, pushRow, setLayerVisibility, updateLayer]);

  const ensureTopography = useCallback(async () => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    const bucket = getBucket('topography');
    if (!viewer || !Cesium) return;

    if (bucket.loaded) {
      setLayerVisibility('topography', true);
      return;
    }

    updateLayer('topography', { status: 'loading', visible: true });
    setStatusText('Loading terrain on demand');

    try {
      if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
      }

      try {
        if (Cesium.createWorldTerrainAsync) {
          viewer.terrainProvider = await Cesium.createWorldTerrainAsync({
            requestVertexNormals: true,
            requestWaterMask: false,
          });
        } else if (Cesium.createWorldTerrain) {
          viewer.terrainProvider = Cesium.createWorldTerrain({
            requestVertexNormals: true,
            requestWaterMask: false,
          });
        }
      } catch {
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      }

      if ('verticalExaggeration' in viewer.scene) {
        viewer.scene.verticalExaggeration = terrainExaggeration;
      }

      const hillshade = viewer.entities.add({
        name: 'Topography hillshade',
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(
            TOPO_RECTANGLE.west,
            TOPO_RECTANGLE.south,
            TOPO_RECTANGLE.east,
            TOPO_RECTANGLE.north
          ),
          material: new Cesium.ImageMaterialProperty({
            image: '/topography.png',
            transparent: true,
            color: Cesium.Color.WHITE.withAlpha(0.72),
          }),
          height: 35,
        },
      });
      bucket.entities.push(hillshade);

      const contourColors = ['#0f766e', '#14b8a6', '#84cc16', '#facc15', '#f97316'];
      for (let index = 0; index < 10; index += 1) {
        const coords = makeEllipseDegrees(
          PROJECT_CENTER,
          0.012 + index * 0.0042,
          0.009 + index * 0.0035,
          120
        );
        const contour = viewer.entities.add({
          name: `Relief contour ${index + 1}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(coords),
            width: index % 2 === 0 ? 1.8 : 1.2,
            material: Cesium.Color.fromCssColorString(contourColors[index % contourColors.length]).withAlpha(0.82),
            clampToGround: true,
          },
        });
        bucket.entities.push(contour);
      }

      bucket.loaded = true;
      updateLayer('topography', { status: 'loaded', visible: true, count: bucket.entities.length });
      pushRow({ layer: 'topography', status: 'loaded', detail: `vertical exaggeration ${terrainExaggeration.toFixed(1)}x` });
    } catch (error) {
      updateLayer('topography', { status: 'error', visible: false });
      setStatusText(error instanceof Error ? error.message : 'Could not load topography');
    }
  }, [getBucket, pushRow, setLayerVisibility, terrainExaggeration, updateLayer]);

  const ensureRoads = useCallback(async () => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    const bucket = getBucket('roads');
    if (!viewer || !Cesium || bucket.loaded) {
      setLayerVisibility('roads', true);
      return;
    }

    updateLayer('roads', { status: 'loading', visible: true });
    try {
      const dataSource = await Cesium.GeoJsonDataSource.load('/generated/roads.geojson', {
        clampToGround: true,
      });
      viewer.dataSources.add(dataSource);

      dataSource.entities.values.forEach((entity: any) => {
        const highway = String(readProperty(entity, 'highway') ?? '');
        if (entity.polyline) {
          const isMajor = highway === 'tertiary' || highway === 'secondary' || highway === 'primary' || highway === 'trunk';
          entity.polyline.width = isMajor ? 4 : 2.2;
          entity.polyline.material = Cesium.Color.fromCssColorString(isMajor ? '#f8fafc' : '#93a4b7').withAlpha(isMajor ? 0.95 : 0.76);
          entity.polyline.clampToGround = true;
          entity.polyline.depthFailMaterial = Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.55);
        }
      });

      bucket.dataSources.push(dataSource);
      bucket.loaded = true;
      updateLayer('roads', { status: 'loaded', visible: true, count: dataSource.entities.values.length });
      pushRow({ layer: 'roads', status: 'loaded', detail: `${dataSource.entities.values.length} local road features` });
    } catch (error) {
      updateLayer('roads', { status: 'error', visible: false });
      setStatusText(error instanceof Error ? error.message : 'Could not load roads');
    }
  }, [getBucket, pushRow, setLayerVisibility, updateLayer]);

  const ensureRoute = useCallback((target: RouteTarget) => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    if (!viewer || !Cesium) return;

    clearLayer('route');
    const bucket = getBucket('route');
    const destination = ROUTE_TARGETS[target];
    const midLon = target === 'port' ? 38.93 : 38.91;
    const midLat = target === 'port' ? -4.94 : -4.98;
    const coords = [
      PROJECT_CENTER.lon, PROJECT_CENTER.lat,
      midLon, midLat,
      destination.lon, destination.lat,
    ];

    const line = viewer.entities.add({
      name: `Route to ${destination.label}`,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(coords),
        width: 7,
        clampToGround: true,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.18,
          taperPower: 0.65,
          color: Cesium.Color.fromCssColorString(target === 'port' ? '#00d4ff' : '#facc15').withAlpha(0.95),
        }),
      },
    });
    const endPoint = viewer.entities.add({
      name: destination.label,
      position: Cesium.Cartesian3.fromDegrees(destination.lon, destination.lat, 400),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString(target === 'port' ? '#00d4ff' : '#facc15'),
        outlineColor: Cesium.Color.BLACK.withAlpha(0.78),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: destination.label,
        font: '700 13px Inter, sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK.withAlpha(0.75),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -22),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    bucket.entities.push(line, endPoint);
    bucket.loaded = true;
    updateLayer('route', { status: 'loaded', visible: true, count: 1 });
    pushRow({ layer: 'route', status: 'active', detail: `Project to ${destination.label}` });
  }, [clearLayer, getBucket, pushRow, updateLayer]);

  const ensureDrillholes = useCallback(async () => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    const bucket = getBucket('drillholes');
    if (!viewer || !Cesium || bucket.loaded) {
      setLayerVisibility('drillholes', true);
      return;
    }

    updateLayer('drillholes', { status: 'loading', visible: true });
    setStatusText('Loading drillholes on demand');
    try {
      const dataSource = await Cesium.GeoJsonDataSource.load('/assay_data.geojson', {
        clampToGround: false,
      });
      viewer.dataSources.add(dataSource);

      let count = 0;
      dataSource.entities.values.forEach((entity: any) => {
        const carbon = readProperty(entity, 'graphitic_carbon');
        if (entity.polyline) {
          entity.polyline.width = 3.2;
          entity.polyline.material = colorForCarbon(Cesium, carbon);
          entity.polyline.depthFailMaterial = Cesium.Color.WHITE.withAlpha(0.4);
          entity.polyline.clampToGround = false;
          count += 1;
        }
        if (entity.point) {
          entity.point.pixelSize = 4;
          entity.point.color = colorForCarbon(Cesium, carbon);
        }
      });

      bucket.dataSources.push(dataSource);
      bucket.loaded = true;
      updateLayer('drillholes', { status: 'loaded', visible: true, count });
      pushRow({ layer: 'drillholes', status: 'loaded', detail: `${count} assay intervals` });
    } catch (error) {
      updateLayer('drillholes', { status: 'error', visible: false });
      setStatusText(error instanceof Error ? error.message : 'Could not load drillholes');
    }
  }, [getBucket, pushRow, setLayerVisibility, updateLayer]);

  const ensureCutaway = useCallback(() => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    const bucket = getBucket('cutaway');
    if (!viewer || !Cesium) return;

    const globe = viewer.scene?.globe;
    const controller = viewer.scene?.screenSpaceCameraController;
    if (globe?.translucency) {
      globe.translucency.enabled = true;
      globe.translucency.frontFaceAlpha = surfaceAlpha;
      globe.translucency.backFaceAlpha = Math.min(0.92, surfaceAlpha + 0.22);
    }
    if (controller) {
      controller.enableCollisionDetection = false;
    }

    if (bucket.loaded) {
      setLayerVisibility('cutaway', true);
      return;
    }

    updateLayer('cutaway', { status: 'loading', visible: true });
    const west = PROJECT_CENTER.lon - 0.018;
    const east = PROJECT_CENTER.lon + 0.018;
    const south = PROJECT_CENTER.lat - 0.025;
    const north = PROJECT_CENTER.lat + 0.025;
    const wallPositions = Cesium.Cartesian3.fromDegreesArray([
      west, south,
      east, south,
      east, north,
      west, north,
      west, south,
    ]);
    const maxHeights = [900, 900, 900, 900, 900];
    const minHeights = [-1500, -1500, -1500, -1500, -1500];
    const wall = viewer.entities.add({
      name: 'Subsurface cutaway walls',
      wall: {
        positions: wallPositions,
        maximumHeights: maxHeights,
        minimumHeights: minHeights,
        material: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.28),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.52),
      },
    });
    const floor = viewer.entities.add({
      name: 'Subsurface section floor',
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          west, south,
          east, south,
          east, north,
          west, north,
        ]),
        height: -1500,
        material: Cesium.Color.fromCssColorString('#111827').withAlpha(0.4),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#f8fafc').withAlpha(0.4),
      },
    });

    bucket.entities.push(wall, floor);
    bucket.loaded = true;
    updateLayer('cutaway', { status: 'loaded', visible: true, count: 2 });
    pushRow({ layer: 'subsurface', status: 'open', detail: `surface alpha ${surfaceAlpha.toFixed(2)}` });
  }, [getBucket, pushRow, setLayerVisibility, surfaceAlpha, updateLayer]);

  const closeCutaway = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const globe = viewer.scene?.globe;
    const controller = viewer.scene?.screenSpaceCameraController;
    if (globe?.translucency) {
      globe.translucency.enabled = false;
    }
    if (controller) {
      controller.enableCollisionDetection = true;
    }
    setLayerVisibility('cutaway', false);
  }, [setLayerVisibility]);

  const ensureResource = useCallback(async (focus: ResourceFocus) => {
    const viewer = viewerRef.current;
    const Cesium = runtimeRef.current;
    if (!viewer || !Cesium) return;

    clearLayer('resource');
    const bucket = getBucket('resource');
    updateLayer('resource', { status: 'loading', visible: true });
    setStatusText(`Loading ${focus.toLowerCase()} resource blocks`);

    try {
      const response = await fetch('/api/block-model', { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Block model request failed with ${response.status}`);
      const payload = await response.json();
      const features = Array.isArray(payload.features) ? payload.features : [];
      const selected = features.filter((feature: any) => {
        const props = feature.properties ?? {};
        if (Number(props.Id) === 0) return false;
        if (focus === 'All') return true;
        return String(props.RescCalc ?? props.classification ?? 'Unknown') === focus;
      });
      const maxBlocks = focus === 'All' ? 1600 : 2800;
      const step = Math.max(1, Math.ceil(selected.length / maxBlocks));
      let count = 0;

      selected.forEach((feature: any, index: number) => {
        if (index % step !== 0) return;
        const coords = feature.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 3) return;
        const props = feature.properties ?? {};
        const lon = Number(coords[0]);
        const lat = Number(coords[1]);
        const elevation = Number(coords[2]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
        const classification = String(props.RescCalc ?? props.classification ?? 'Unknown');
        const dx = Math.max(18, Math.min(85, Number(props.dX ?? 30)));
        const dy = Math.max(18, Math.min(85, Number(props.dY ?? 30)));
        const dz = Math.max(8, Math.min(60, Number(props.dZ ?? 16)));
        const entity = viewer.entities.add({
          name: `${classification} resource block`,
          position: Cesium.Cartesian3.fromDegrees(lon, lat, Number.isFinite(elevation) ? elevation : -120),
          box: {
            dimensions: new Cesium.Cartesian3(dx, dy, dz),
            material: colorForClassification(Cesium, classification),
            outline: focus !== 'All' || classification === 'Indicated',
            outlineColor: Cesium.Color.WHITE.withAlpha(classification === 'Indicated' ? 0.65 : 0.32),
          },
          properties: {
            classification,
            carbon: props['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'],
          },
        });
        bucket.entities.push(entity);
        count += 1;
      });

      bucket.loaded = true;
      updateLayer('resource', { status: 'loaded', visible: true, count });
      pushRow({ layer: 'resource', status: focus, detail: `${count} displayed blocks from ${selected.length} selected` });
    } catch (error) {
      updateLayer('resource', { status: 'error', visible: false });
      setStatusText(error instanceof Error ? error.message : 'Could not load resource model');
    }
  }, [clearLayer, getBucket, pushRow, updateLayer]);

  const activateMode = useCallback(async (
    mode: WorkbenchMode,
    overrides: { routeTarget?: RouteTarget; resourceFocus?: ResourceFocus } = {}
  ) => {
    if (!viewerRef.current || !runtimeRef.current) return;

    const nextRouteTarget = overrides.routeTarget ?? routeTarget;
    const nextResourceFocus = overrides.resourceFocus ?? resourceFocus;
    const nextTarget = ROUTE_TARGETS[nextRouteTarget];

    setStatusText(`Mode: ${MODE_LABELS[mode]}`);
    setActiveMode(mode);
    await ensureBaseContext();

    const optionalLayers: LayerId[] = ['labels', 'topography', 'roads', 'route', 'drillholes', 'resource', 'cutaway'];
    optionalLayers.forEach((id) => {
      if (id !== 'resource') setLayerVisibility(id, false);
    });
    if (mode !== 'subsurface' && mode !== 'resource') {
      closeCutaway();
    }
    if (mode !== 'resource' && mode !== 'subsurface') {
      setLayerVisibility('resource', false);
    }

    if (mode === 'project') {
      await ensureLabels();
    }
    if (mode === 'topography') {
      await ensureLabels();
      await ensureTopography();
    }
    if (mode === 'accessibility') {
      await ensureLabels();
      await ensureRoads();
      ensureRoute(nextRouteTarget);
    }
    if (mode === 'drillholes') {
      await ensureTopography();
      await ensureDrillholes();
    }
    if (mode === 'subsurface') {
      await ensureTopography();
      ensureCutaway();
      await ensureDrillholes();
    }
    if (mode === 'resource') {
      await ensureTopography();
      ensureCutaway();
      await ensureResource(nextResourceFocus);
    }

    flyTo(mode);
    pushRow({ layer: 'command', status: MODE_LABELS[mode], detail: `Target ${mode === 'accessibility' ? nextTarget.label : 'Tanga project'}` });
  }, [
    closeCutaway,
    ensureBaseContext,
    ensureCutaway,
    ensureDrillholes,
    ensureLabels,
    ensureResource,
    ensureRoads,
    ensureRoute,
    ensureTopography,
    flyTo,
    pushRow,
    resourceFocus,
    routeTarget,
    setLayerVisibility,
  ]);

  const runWorkflow = useCallback((workflow: (typeof WORKFLOWS)[number]) => {
    const nextRouteTarget = workflow.target ?? routeTarget;
    const nextResourceFocus = workflow.focus ?? resourceFocus;
    if (workflow.target) setRouteTarget(nextRouteTarget);
    if (workflow.focus) setResourceFocus(nextResourceFocus);
    setCommandText(workflow.command);
    void activateMode(workflow.mode, { routeTarget: nextRouteTarget, resourceFocus: nextResourceFocus });
  }, [activateMode, resourceFocus, routeTarget]);

  const executeIntent = useCallback((intent: CommandIntent | null) => {
    if (!intent) {
      setStatusText('Command not mapped yet');
      return;
    }

    if (intent.rotate90) {
      rotateNinety();
      return;
    }

    if (!intent.mode) {
      setStatusText('Command not mapped yet');
      return;
    }

    const nextRouteTarget = intent.routeTarget ?? routeTarget;
    const nextResourceFocus = intent.resourceFocus ?? resourceFocus;
    if (intent.routeTarget) setRouteTarget(nextRouteTarget);
    if (intent.resourceFocus) setResourceFocus(nextResourceFocus);
    pushRow({
      layer: 'intent',
      status: intent.source ?? 'rules',
      detail: intent.reason ?? `${intent.mode}${intent.confidence ? ` (${Math.round(intent.confidence * 100)}%)` : ''}`,
    });
    void activateMode(intent.mode, { routeTarget: nextRouteTarget, resourceFocus: nextResourceFocus });
  }, [activateMode, pushRow, resourceFocus, rotateNinety, routeTarget]);

  const runCommand = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    setCommandText(raw);
    pushRow({ layer: 'voice command', status: 'heard', detail: raw });

    try {
      const response = await fetch('/api/command-intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command: raw }),
      });

      if (response.ok) {
        const payload = await response.json();
        executeIntent(payload.intent as CommandIntent);
        return;
      }
    } catch {
      // Use the deterministic parser when the local LLM route is not reachable.
    }

    executeIntent(ruleIntent(raw));
  }, [executeIntent, pushRow]);

  const handleCommandSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runCommand(commandText);
  }, [commandText, runCommand]);

  const runBrowserSpeechFallback = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusText('No Whisper endpoint or browser speech recognition is available');
      return;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => {
      setIsListening(true);
      setVoicePipeline('Browser speech -> intent -> scene action');
      setStatusText('Listening with browser speech recognition');
    };
    recognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript ?? '');
      setCommandText(transcript);
      void runCommand(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setStatusText('Voice input stopped');
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, runCommand]);


  const toggleListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }

    runBrowserSpeechFallback();
  }, [isListening, runBrowserSpeechFallback]);

  const toggleLayer = useCallback((id: LayerId) => {
    const nextVisible = !layers[id].visible;
    if (!nextVisible) {
      if (id === 'cutaway') closeCutaway();
      else setLayerVisibility(id, false);
      return;
    }

    if (id === 'labels') void ensureLabels();
    else if (id === 'topography') void ensureTopography();
    else if (id === 'roads') void ensureRoads();
    else if (id === 'route') ensureRoute(routeTarget);
    else if (id === 'drillholes') void ensureDrillholes();
    else if (id === 'resource') void ensureResource(resourceFocus);
    else if (id === 'cutaway') ensureCutaway();
    else setLayerVisibility(id, true);
  }, [
    closeCutaway,
    ensureCutaway,
    ensureDrillholes,
    ensureLabels,
    ensureResource,
    ensureRoads,
    ensureRoute,
    ensureTopography,
    layers,
    resourceFocus,
    routeTarget,
    setLayerVisibility,
  ]);

  useEffect(() => {
    let cancelled = false;
    let viewer: any | null = null;

    const boot = async () => {
      if (!containerRef.current) return;

      try {
        const Cesium = await ensureCesiumRuntime();
        if (cancelled || !containerRef.current) return;

        runtimeRef.current = Cesium;
        if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
          Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        }

        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          baseLayer: createStreetMapBaseLayer(Cesium),
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          requestRenderMode: true,
          maximumRenderTimeChange: 1.2,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        });

        viewerRef.current = viewer;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#17202a');
        viewer.scene.skyAtmosphere.show = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.00018;
        viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.15;
        viewer.scene.screenSpaceCameraController.inertiaZoom = 0.1;
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 250;
        viewer.resolutionScale = Math.min(1.1, window.devicePixelRatio || 1);
        requestBaseImageryRender(viewer);

        setIsReady(true);
        setStatusText('Workspace ready');
        pushRow({ layer: 'workspace', status: 'ready', detail: 'Light base scene loaded' });
        await activateMode('tanzania');
      } catch (error) {
        setStatusText(error instanceof Error ? error.message : 'Unable to initialize Cesium');
      }
    };

    void boot();

    return () => {
      cancelled = true;
      recognitionRef.current?.stop?.();
      if (viewer && !viewer.isDestroyed?.()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if ('verticalExaggeration' in viewer.scene) {
      viewer.scene.verticalExaggeration = terrainExaggeration;
      viewer.scene.requestRender?.();
    }
    if (layers.topography.status === 'loaded') {
      pushRow({ layer: 'topography', status: 'updated', detail: `vertical exaggeration ${terrainExaggeration.toFixed(1)}x` });
    }
  }, [layers.topography.status, pushRow, terrainExaggeration]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const globe = viewer?.scene?.globe;
    if (!globe?.translucency || !layers.cutaway.visible) return;
    globe.translucency.frontFaceAlpha = surfaceAlpha;
    globe.translucency.backFaceAlpha = Math.min(0.92, surfaceAlpha + 0.22);
    viewer.scene.requestRender?.();
  }, [layers.cutaway.visible, surfaceAlpha]);

  useEffect(() => {
    if (!isReady || activeMode !== 'resource') return;
    void ensureResource(resourceFocus);
  }, [activeMode, ensureResource, isReady, resourceFocus]);

  useEffect(() => {
    if (!isReady || activeMode !== 'accessibility') return;
    void ensureRoads().then(() => ensureRoute(routeTarget));
  }, [activeMode, ensureRoads, ensureRoute, isReady, routeTarget]);

  const modeSummary = useMemo(() => {
    if (activeMode === 'tanzania') return 'Tanzania context with the Tanga project highlighted';
    if (activeMode === 'project') return 'Project boundary, Tanga area, and nearby settlement labels';
    if (activeMode === 'topography') return 'Terrain relief, hillshade, and contour reading of the AOI';
    if (activeMode === 'accessibility') return `Road context and route to ${activeTarget.label}`;
    if (activeMode === 'drillholes') return 'Assay drillhole traces over the local surface';
    if (activeMode === 'subsurface') return 'Transparent surface, section window, and drillholes below the terrain';
    return `${resourceFocus} resource blocks with the surface opened`;
  }, [activeMode, activeTarget.label, resourceFocus]);

  const heroTitle = useMemo(() => {
    if (activeMode === 'tanzania') return 'Tanga, Tanzania';
    if (activeMode === 'project') return 'Project Area';
    if (activeMode === 'topography') return 'Topography';
    if (activeMode === 'accessibility') return 'Access Route';
    if (activeMode === 'drillholes') return 'Drillholes';
    if (activeMode === 'subsurface') return 'Inside Earth';
    return `${resourceFocus} Blocks`;
  }, [activeMode, resourceFocus]);

  const visibleLayerCount = useMemo(
    () => Object.values(layers).filter((layer) => layer.visible).length,
    [layers]
  );

  const activeWorkflowIndex = useMemo(() => {
    const exactIndex = WORKFLOWS.findIndex((workflow) => {
      if (workflow.mode !== activeMode) return false;
      if (workflow.target && workflow.target !== routeTarget) return false;
      if (workflow.focus && workflow.focus !== resourceFocus) return false;
      return true;
    });
    if (exactIndex >= 0) return exactIndex;
    return Math.max(0, WORKFLOWS.findIndex((workflow) => workflow.mode === activeMode));
  }, [activeMode, resourceFocus, routeTarget]);

  const stepMoment = useCallback((direction: -1 | 1) => {
    const nextIndex = (activeWorkflowIndex + direction + WORKFLOWS.length) % WORKFLOWS.length;
    runWorkflow(WORKFLOWS[nextIndex]);
  }, [activeWorkflowIndex, runWorkflow]);

  const enterFullscreen = useCallback(() => {
    void document.documentElement.requestFullscreen?.();
  }, []);

  return (
    <main className="tanga-earth tanga-earth--immersive" data-testid="tanga-earth-workbench">
      <section className="tanga-earth__map">
        <div ref={containerRef} className="tanga-earth__viewer" />
        <div className="tanga-earth__vignette" />
        <div className="tanga-earth__hud">
          <span>{MODE_LABELS[activeMode]}</span>
          <strong>{heroTitle}</strong>
          <small>{modeSummary}</small>
        </div>
        {!isReady ? (
          <div className="tanga-earth__loading">
            <strong>Tanga Earth Studio</strong>
            <span>{statusText}</span>
          </div>
        ) : null}
      </section>

      <header className="tanga-earth__topbar">
        <div className="tanga-earth__brand">
          <span className="tanga-earth__mark">TE</span>
          <span>
            <strong>Tanga Earth Studio</strong>
            <small>voice-driven 3D presentation</small>
          </span>
        </div>
        <div className="tanga-earth__deck-status">
          <span>{activeWorkflowIndex + 1}/{WORKFLOWS.length}</span>
          <span>{visibleLayerCount} layers</span>
          <span>{activeTarget.label}</span>
          <span>{voicePipeline}</span>
        </div>
        <form className="tanga-earth__voicebar" onSubmit={handleCommandSubmit}>
          <input
            value={commandText}
            onChange={(event) => setCommandText(event.target.value)}
            aria-label="Command"
            placeholder='Try "show topography", "route to port", "go inside the earth"'
          />
          <button type="submit">Run</button>
          <button
            type="button"
            className={classNames(isListening && 'is-active')}
            onClick={toggleListening}
            aria-pressed={isListening}
          >
            {isListening ? 'Listening' : 'Voice'}
          </button>
        </form>
      </header>

      <section className="tanga-earth__cue-card">
        <span>Current Moment</span>
        <strong>{MODE_LABELS[activeMode]}</strong>
        <p>{modeSummary}</p>
        <div className="tanga-earth__cue-actions">
          <button type="button" onClick={() => stepMoment(-1)}>Prev</button>
          <button type="button" onClick={() => stepMoment(1)}>Next</button>
          <button type="button" onClick={enterFullscreen}>VR View</button>
        </div>
      </section>

      <aside className="tanga-earth__inspector">
        <section className="tanga-earth__section">
          <h2>Live Layers</h2>
          <div className="tanga-earth__layers">
            {Object.values(layers).map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={classNames(
                  'tanga-layer',
                  layer.visible && 'is-visible',
                  layer.status === 'loading' && 'is-loading',
                  layer.status === 'error' && 'is-error'
                )}
                onClick={() => toggleLayer(layer.id)}
              >
                <span className="tanga-layer__check" aria-hidden="true" />
                <span>
                  <strong>{layer.name}</strong>
                  <small>{layer.note}</small>
                </span>
                <em>{layer.count ?? layer.status}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="tanga-earth__section">
          <h2>Route</h2>
          <div className="tanga-earth__segmented">
            {(['port', 'power'] as const).map((target) => (
              <button
                key={target}
                type="button"
                className={classNames(routeTarget === target && 'is-active')}
                onClick={() => {
                  setRouteTarget(target);
                  void activateMode('accessibility', { routeTarget: target });
                }}
              >
                {ROUTE_TARGETS[target].label}
              </button>
            ))}
          </div>
        </section>

        <section className="tanga-earth__section">
          <h2>Resource</h2>
          <div className="tanga-earth__segmented">
            {(['Indicated', 'Inferred', 'All'] as const).map((focus) => (
              <button
                key={focus}
                type="button"
                className={classNames(resourceFocus === focus && 'is-active')}
                onClick={() => {
                  setResourceFocus(focus);
                  if (activeMode === 'resource') {
                    void activateMode('resource', { resourceFocus: focus });
                  }
                }}
              >
                {focus}
              </button>
            ))}
          </div>
        </section>

        <section className="tanga-earth__section">
          <h2>Surface</h2>
          <label className="tanga-earth__range">
            <span>Relief {terrainExaggeration.toFixed(1)}x</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={terrainExaggeration}
              onChange={(event) => setTerrainExaggeration(Number(event.target.value))}
            />
          </label>
          <label className="tanga-earth__range">
            <span>Opacity {Math.round(surfaceAlpha * 100)}%</span>
            <input
              type="range"
              min="0.12"
              max="1"
              step="0.02"
              value={surfaceAlpha}
              onChange={(event) => setSurfaceAlpha(Number(event.target.value))}
            />
          </label>
        </section>

        <section className="tanga-earth__section">
          <h2>Camera</h2>
          <div className="tanga-earth__camera-actions">
            <button type="button" onClick={rotateNinety}>Rotate 90</button>
            <button type="button" onClick={() => void activateMode('subsurface')}>Dive</button>
          </div>
        </section>
      </aside>

      <section className="tanga-earth__moment-rail" aria-label="Presentation moments">
        {WORKFLOWS.map((workflow, index) => (
          <button
            key={workflow.label}
            type="button"
            className={classNames(index === activeWorkflowIndex && 'is-active')}
            onClick={() => runWorkflow(workflow)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{workflow.label}</strong>
            <small>{workflow.command}</small>
          </button>
        ))}
      </section>

      <footer className="tanga-earth__console">
        <div>
          <span>Lon {PROJECT_CENTER.lon.toFixed(3)}</span>
          <span>Lat {PROJECT_CENTER.lat.toFixed(3)}</span>
          <span>{Object.values(layers).filter((layer) => layer.status === 'loading').length} loading</span>
        </div>
        <ol>
          {rows.slice(0, 4).map((row, index) => (
            <li key={`${row.layer}-${index}`}>
              <strong>{row.layer}</strong>
              <span>{row.status}</span>
              <em>{row.detail}</em>
            </li>
          ))}
        </ol>
      </footer>
    </main>
  );
}

