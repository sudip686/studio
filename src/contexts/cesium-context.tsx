'use client';
import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { createRenderController, RenderController } from '@/lib/cesium-render-controller';
import { bufferRectangleMeters } from '@/lib/utils/rectangle-utils';

type PerfProfile = 'performance' | 'balanced' | 'quality';
type InteractionMode = 'presentation' | 'explore';
type BoundaryLayerMeta = {
  id: string;
  kind: 'primary' | 'license';
  dataSource: any | null;
  color: string;
  label: string;
};

type CesiumCtx = {
  viewer: any | null;
  ready: boolean;
  renderController: RenderController | null;
  tileset: any | null; // OSM Buildings
  kmlDataSource: any | null;
  kmlLabel: any | null;
  kmlOutline: any | null;
  boundaryLayers: BoundaryLayerMeta[];
  applyTilesetProfile: ((tileset: any, p: PerfProfile) => void) | null;
  enableAoiCutaway: ((opts?: { keepInside?: boolean; edgeStyling?: boolean }) => void) | null;
  disableAoiCutaway: (() => void) | null;
  enterUndergroundMode: (() => void) | null;
  exitUndergroundMode: (() => void) | null;
  applyFastNavProfile: (() => void) | null;
  enableFreeFly: (() => void) | null;
  disableFreeFly: (() => void) | null;
};

const Ctx = createContext<CesiumCtx>({ 
  viewer: null, 
  ready: false, 
  renderController: null, 
  tileset: null, 
  kmlDataSource: null,
  kmlLabel: null,
  kmlOutline: null,
  boundaryLayers: [],
  applyTilesetProfile: null,
  enableAoiCutaway: null,
  disableAoiCutaway: null,
  enterUndergroundMode: null,
  exitUndergroundMode: null,
  applyFastNavProfile: null,
  enableFreeFly: null,
  disableFreeFly: null
});

export const useCesium = () => useContext(Ctx);

const RESOLUTION_SCALE_BY_PROFILE: Record<PerfProfile, number> = {
  performance: 0.84,
  balanced: 0.92,
  quality: 1,
};

const GLOBE_SSE_BY_PROFILE: Record<PerfProfile, number> = {
  performance: 2.8,
  balanced: 2.2,
  quality: 1.9,
};

const CESIUM_CDN_BASE = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium';
let cesiumGlobalPromise: Promise<any> | null = null;

function loadCesiumGlobal() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cesium can only be loaded in the browser.'));
  }

  const existingCesium = (window as any).Cesium;
  if (existingCesium) {
    return Promise.resolve(existingCesium);
  }

  if (cesiumGlobalPromise) {
    return cesiumGlobalPromise;
  }

  cesiumGlobalPromise = new Promise((resolve, reject) => {
    const finish = () => {
      const runtime = (window as any).Cesium;
      if (runtime) {
        resolve(runtime);
      } else {
        reject(new Error('Cesium script loaded but window.Cesium is unavailable.'));
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-cesium-runtime="true"], script[src*="/Cesium.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener('load', finish, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Cesium.')), { once: true });
      return;
    }

    (window as any).CESIUM_BASE_URL = `${CESIUM_CDN_BASE}/`;

    const script = document.createElement('script');
    script.src = `${CESIUM_CDN_BASE}/Cesium.js`;
    script.async = true;
    script.defer = true;
    script.dataset.cesiumRuntime = 'true';
    script.onload = finish;
    script.onerror = () => reject(new Error('Failed to load Cesium.'));
    document.head.appendChild(script);
  }).catch((error) => {
    cesiumGlobalPromise = null;
    throw error;
  });

  return cesiumGlobalPromise;
}

export const CesiumProvider: React.FC<{
  children: React.ReactNode;
  interactionMode?: InteractionMode;
  perfProfile?: PerfProfile;
}> = ({
  children,
  interactionMode = 'explore',
  perfProfile = 'quality',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [viewer, setViewer] = useState<any | null>(null);
  const [ready, setReady] = useState(false);
  const [renderController, setRenderController] = useState<RenderController | null>(null);
  const [tileset, setTileset] = useState<any | null>(null);
  const [kmlDataSource, setKmlDataSource] = useState<any | null>(null);
  const [kmlLabel, setKmlLabel] = useState<any | null>(null);
  const [kmlOutline, setKmlOutline] = useState<any | null>(null);
  const [boundaryLayers, setBoundaryLayers] = useState<BoundaryLayerMeta[]>([]);

  const applyTilesetProfileRef = useRef<((tileset: any, p: PerfProfile) => void) | null>(null);
  const controllerRef = useRef<RenderController | null>(null);
  const boundaryDataSourcesRef = useRef<any[]>([]);
  const boundaryEntitiesRef = useRef<any[]>([]);

  const applyTilesetProfile = React.useCallback((targetTileset: any, profile: PerfProfile) => {
    try {
      if (!targetTileset) return;
      targetTileset.maximumScreenSpaceError =
        profile === 'performance' ? 18 : profile === 'balanced' ? 12 : 8;
      targetTileset.dynamicScreenSpaceError = profile !== 'quality';
      targetTileset.skipLevelOfDetail = profile === 'performance';
      targetTileset.preferLeaves = profile === 'quality';
      targetTileset.foveatedScreenSpaceError = profile !== 'quality';
    } catch {}
  }, []);

  useEffect(() => {
    applyTilesetProfileRef.current = applyTilesetProfile;
  }, [applyTilesetProfile]);

  const safeRemoveDataSource = React.useCallback((targetViewer: any, dataSource: any) => {
    try {
      if (!targetViewer || targetViewer.isDestroyed?.() || !targetViewer.dataSources || !dataSource) return;
      targetViewer.dataSources.remove(dataSource, true);
    } catch {}
  }, []);

  const safeRemoveEntity = React.useCallback((targetViewer: any, entity: any) => {
    try {
      if (!targetViewer || targetViewer.isDestroyed?.() || !targetViewer.entities || !entity) return;
      targetViewer.entities.remove(entity);
    } catch {}
  }, []);

  // AOI cutaway state
  const cutawayActiveRef = useRef(false);
  const prevBackFaceRef = useRef<boolean | null>(null);
  const prevSkirtsRef = useRef<boolean | null>(null);

  const enableAoiCutaway = React.useCallback((opts?: { keepInside?: boolean; edgeStyling?: boolean }) => {
    try {
      if (!viewer || !kmlDataSource || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene) return;
      const Cesium = (window as any).Cesium as any;
      if (!Cesium) return;

      const keepInside = opts?.keepInside ?? true;
      const edgeStyling = opts?.edgeStyling ?? true;

      // Collect rings from KML polygons
      const time = Cesium.JulianDate.now();
      const polygons: any[] = [];
      for (const e of kmlDataSource.entities.values) {
        const poly = e.polygon;
        if (!poly || !poly.hierarchy) continue;
        const hierarchy = poly.hierarchy.getValue(time);
        if (!hierarchy) continue;

        const collect = (h: any) => {
          const ring = (h.positions || h).slice?.() || [];
          if (ring.length >= 3) polygons.push(ring);
          if (h.holes && h.holes.length) {
            for (const hole of h.holes) collect(hole);
          }
        };
        collect(hierarchy);
      }
      if (!polygons.length) return;

      const planes: any[] = [];
      for (const ring of polygons) {
        const pts = ring;
        const n = pts.length;
        for (let i = 0; i < n; i++) {
          const curr = pts[i];
          const next = pts[(i + 1) % n];

          const midpoint = Cesium.Cartesian3.multiplyByScalar(
            Cesium.Cartesian3.add(curr, next, new Cesium.Cartesian3()),
            0.5,
            new Cesium.Cartesian3()
          );

          const up = Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.clone(midpoint),
            new Cesium.Cartesian3()
          );

          const right = Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.subtract(next, midpoint, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
          );

          let normal = Cesium.Cartesian3.cross(right, up, new Cesium.Cartesian3());
          normal = Cesium.Cartesian3.normalize(normal, normal);

          const finalNormal = keepInside
            ? Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3())
            : normal;

          const originCentered = new Cesium.Plane(finalNormal, 0.0);
          const distance = Cesium.Plane.getPointDistance(originCentered, midpoint);

          planes.push(new Cesium.ClippingPlane(finalNormal, distance));
        }
      }

      const globe = (viewer as any).scene?.globe;
      if (!globe) return;
      if (!cutawayActiveRef.current) {
        prevBackFaceRef.current = globe.backFaceCulling;
        prevSkirtsRef.current = globe.showSkirts;
      }

      // Compute a spherical cutout around the AOI center as a robust fallback (BlockModelClip style)
      let center = Cesium.Cartesian3.fromDegrees(38.78, -4.8, 0.0);
      let distance = 40000.0;
      if (polygons.length > 0) {
        try {
          const bs = Cesium.BoundingSphere.fromPoints(polygons[0]);
          if (bs && Cesium.defined(bs.center)) {
            center = bs.center;
            distance = Math.max(bs.radius, 25000.0);
          }
        } catch {}
      }

      // Always use a local spherical/cylindrical "puck" cutout around AOI center (matches BlockModelClip look)
      globe.backFaceCulling = false;
      globe.showSkirts = false;

      globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(center),
        planes: [
          new Cesium.ClippingPlane(new Cesium.Cartesian3(1.0, 0.0, 0.0), distance),
          new Cesium.ClippingPlane(new Cesium.Cartesian3(-1.0, 0.0, 0.0), distance),
          new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), distance),
          new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, -1.0, 0.0), distance),
        ],
        unionClippingRegions: true,
        edgeWidth: edgeStyling ? 1.0 : 0.0,
        edgeColor: Cesium.Color.WHITE,
        enabled: true,
      });

      // Apply same clipping to OSM Buildings tileset if present
      try {
        if (tileset) {
          const dup = (globe.clippingPlanes?.planes || []).map((pl: any) => new Cesium.ClippingPlane(pl.normal, pl.distance));
          tileset.clippingPlanes = new Cesium.ClippingPlaneCollection({
            planes: dup,
            unionClippingRegions: globe.clippingPlanes?.unionClippingRegions,
            edgeWidth: edgeStyling ? 1.0 : 0.0,
            edgeColor: Cesium.Color.WHITE,
            enabled: true,
          });
        }
      } catch {}

      cutawayActiveRef.current = true;
      viewer.scene.requestRender();
    } catch {}
  }, [viewer, kmlDataSource, tileset]);

  const disableAoiCutaway = React.useCallback(() => {
    try {
      if (!viewer || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene) return;
      const globe = (viewer as any).scene?.globe;
      if (!globe) return;
      if (globe.clippingPlanes) {
        globe.clippingPlanes.enabled = false;
        globe.clippingPlanes.removeAll();
        globe.clippingPlanes = undefined as any;
      }
      // Clear tileset clipping as well
      try {
        if (tileset && tileset.clippingPlanes) {
          tileset.clippingPlanes.enabled = false;
          tileset.clippingPlanes.removeAll();
          tileset.clippingPlanes = undefined as any;
        }
      } catch {}

      if (prevBackFaceRef.current !== null) globe.backFaceCulling = prevBackFaceRef.current;
      if (prevSkirtsRef.current !== null) globe.showSkirts = prevSkirtsRef.current;

      cutawayActiveRef.current = false;
      viewer.scene.requestRender();
    } catch {}
  }, [viewer, tileset]);

  const applyFastNavProfile = React.useCallback(() => {
    try {
      if (!viewer || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene) return;
      const ctrl = (viewer as any).scene?.screenSpaceCameraController;
      if (!ctrl) return;
      ctrl.inertiaTranslate = 0.0;
      ctrl.inertiaZoom = 0.0;
      ctrl.inertiaSpin = 0.0;
      ctrl.lookDamping = 0.0;
      ctrl.zoomFactor = 16.0;
      ctrl.minimumZoomDistance = interactionMode === 'presentation' ? 8000.0 : 1.0;
      ctrl.maximumZoomDistance = interactionMode === 'presentation' ? 220000.0 : 40000000.0;
      viewer.resolutionScale = interactionMode === 'presentation' ? 0.98 : 0.82;
      (viewer as any).scene?.requestRender?.();
    } catch {}
  }, [interactionMode, viewer]);

  const undergroundRef = useRef(false);
  const enterUndergroundMode = React.useCallback(() => {
    try {
      if (!viewer || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene) return;
      const Cesium = (window as any).Cesium;
      const globe = (viewer as any).scene?.globe;
      const ctrl = (viewer as any).scene?.screenSpaceCameraController;
      if (!globe || !ctrl) return;
      ctrl.enableCollisionDetection = false; // allow camera below terrain
      globe.translucency.enabled = true;
      globe.translucency.frontFaceAlpha = 0.35; // see-through terrain
      if (Cesium?.Color) {
        (globe as any).undergroundColor = new Cesium.Color(0.0, 0.0, 0.0, 0.6);
      }
      globe.depthTestAgainstTerrain = true;
      undergroundRef.current = true;
      (viewer as any).scene?.requestRender?.();
    } catch {}
  }, [viewer]);

  const exitUndergroundMode = React.useCallback(() => {
    try {
      if (!viewer || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene) return;
      const globe = (viewer as any).scene?.globe;
      const ctrl = (viewer as any).scene?.screenSpaceCameraController;
      if (!globe || !ctrl) return;
      ctrl.enableCollisionDetection = true;
      globe.translucency.enabled = false;
      undergroundRef.current = false;
      (viewer as any).scene?.requestRender?.();
    } catch {}
  }, [viewer]);

  // =========================
  // Free-Fly Navigation Mode
  // =========================
  const freeFlyActiveRef = useRef(false);
  const freeFlyRafRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const baseSpeedRef = useRef<number>(50); // meters per second baseline
  const lastTimeRef = useRef<number>(0);
  const throttleRef = useRef<{ forward: number; strafe: number; vertical: number }>({ forward: 0, strafe: 0, vertical: 0 });
  const inputActiveUntilRef = useRef<number>(0);
  const rightDragRef = useRef<{ active: boolean; last?: { x: number; y: number } }>({ active: false });

  const markInputActive = () => {
    inputActiveUntilRef.current = performance.now() + 300; // keep lower resolution for 300ms after input
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    keysRef.current.add(e.key);
    if (e.key === '+' || e.key === '=') { baseSpeedRef.current = Math.min(baseSpeedRef.current * 1.2, 2000); }
    if (e.key === '-' || e.key === '_') { baseSpeedRef.current = Math.max(baseSpeedRef.current / 1.2, 1); }
    markInputActive();
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    keysRef.current.delete(e.key);
    markInputActive();
  };

  const buildScreenHandler = () => {
    const Cesium = (window as any).Cesium as any;
    const handler = new Cesium.ScreenSpaceEventHandler((viewer as any).scene?.canvas);
    handler.setInputAction(() => {
      rightDragRef.current.active = true;
      rightDragRef.current.last = undefined;
      markInputActive();
    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    handler.setInputAction(() => {
      rightDragRef.current.active = false;
      throttleRef.current.forward = 0;
      throttleRef.current.strafe = 0;
      throttleRef.current.vertical = 0;
      markInputActive();
    }, Cesium.ScreenSpaceEventType.RIGHT_UP);
    handler.setInputAction((movement: any) => {
      if (!rightDragRef.current.active) return;
      const end = movement.endPosition;
      const last = rightDragRef.current.last;
      if (last) {
        const dx = end.x - last.x;
        const dy = end.y - last.y;
        // Forward/back from vertical drag; strafe from horizontal
        throttleRef.current.forward = Math.max(-1, Math.min(1, throttleRef.current.forward + (-dy * 0.01)));
        throttleRef.current.strafe = Math.max(-1, Math.min(1, throttleRef.current.strafe + (dx * 0.01)));
        // If Shift is held, vertical move from dy (hold shift for climb/dive)
        const shiftHeld = keysRef.current.has('Shift') || keysRef.current.has('ShiftLeft') || keysRef.current.has('ShiftRight');
        throttleRef.current.vertical = shiftHeld ? Math.max(-1, Math.min(1, throttleRef.current.vertical + (-dy * 0.01))) : 0;
      }
      rightDragRef.current.last = { x: end.x, y: end.y };
      markInputActive();
    }, Cesium.ScreenSpaceEventType.RIGHT_DRAG);
    return handler;
  };

  const stepFreeFly = (now: number) => {
    if (!viewer || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene || !freeFlyActiveRef.current) {
      freeFlyRafRef.current = null;
      return;
    }
    const Cesium = (window as any).Cesium as any;
    const camera = (viewer as any).camera;
    const scene = (viewer as any).scene;

    const dt = Math.min(0.05, Math.max(0.0, (now - (lastTimeRef.current || now)) / 1000));
    lastTimeRef.current = now;

    // Performance scaling during active input
    if (performance.now() < inputActiveUntilRef.current) {
      (viewer as any).resolutionScale = 0.82;
    } else {
      (viewer as any).resolutionScale = 0.96;
    }

    // Movement inputs
    const keys = keysRef.current;
    const shift = keys.has('Shift') || keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = baseSpeedRef.current * (shift ? 3.0 : 1.0);

    let forward = 0;
    if (keys.has('w') || keys.has('W')) forward += 1;
    if (keys.has('s') || keys.has('S')) forward -= 1;
    forward += throttleRef.current.forward;

    let strafe = 0;
    if (keys.has('d') || keys.has('D')) strafe += 1;
    if (keys.has('a') || keys.has('A')) strafe -= 1;
    strafe += throttleRef.current.strafe;

    let vertical = 0;
    if (keys.has('e') || keys.has('E')) vertical += 1;
    if (keys.has('q') || keys.has('Q')) vertical -= 1;
    vertical += throttleRef.current.vertical;

    // Apply motion in camera local axes
    if (forward !== 0) camera.moveForward(forward * speed * dt);
    if (strafe !== 0) camera.moveRight(strafe * speed * dt);
    if (vertical !== 0) camera.moveUp(vertical * speed * dt);

    // Optional: auto underground visuals when moving below surface (simple heuristic)
    try {
      const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(camera.position);
      if (carto && carto.height < 0) {
        enterUndergroundMode?.();
      }
    } catch {}

    scene.requestRender?.();
    freeFlyRafRef.current = requestAnimationFrame(stepFreeFly);
  };

  const screenHandlerRef = useRef<any>(null);
  const keyHandlersRef = useRef<{ down?: any; up?: any }>({});

  const enableFreeFly = React.useCallback(() => {
    try {
      if (!viewer || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene) return;
      if (freeFlyActiveRef.current) return;
      // Attach listeners
      keyHandlersRef.current.down = handleKeyDown;
      keyHandlersRef.current.up = handleKeyUp;
      window.addEventListener('keydown', keyHandlersRef.current.down);
      window.addEventListener('keyup', keyHandlersRef.current.up);
      screenHandlerRef.current = buildScreenHandler();
      // Start loop
      freeFlyActiveRef.current = true;
      lastTimeRef.current = performance.now();
      freeFlyRafRef.current = requestAnimationFrame(stepFreeFly);
      markInputActive();
    } catch {}
  }, [viewer, enterUndergroundMode]);

  const disableFreeFly = React.useCallback(() => {
    try {
      if (!freeFlyActiveRef.current) return;
      freeFlyActiveRef.current = false;
      // Remove listeners
      if (keyHandlersRef.current.down) window.removeEventListener('keydown', keyHandlersRef.current.down);
      if (keyHandlersRef.current.up) window.removeEventListener('keyup', keyHandlersRef.current.up);
      keyHandlersRef.current.down = undefined;
      keyHandlersRef.current.up = undefined;
      if (screenHandlerRef.current && !screenHandlerRef.current.isDestroyed?.()) {
        screenHandlerRef.current.destroy?.();
      }
      screenHandlerRef.current = null;
      // Stop RAF
      if (freeFlyRafRef.current) cancelAnimationFrame(freeFlyRafRef.current);
      freeFlyRafRef.current = null;
      // Restore resolution
      if (viewer && !(viewer as any)?.isDestroyed?.()) (viewer as any).resolutionScale = 0.78;
      throttleRef.current = { forward: 0, strafe: 0, vertical: 0 };
      rightDragRef.current = { active: false, last: undefined };
    } catch {}
  }, [viewer]);


  useEffect(() => {
    if (!containerRef.current) return;
    if (initializedRef.current) return; // StrictMode double-mount guard
    initializedRef.current = true;

    let v: any;
    let destroyed = false;

    // Helper to fly so a rectangle fills the view
    function flyToRectangleFill(viewer: any, rect: any, pitchDeg = -35, headingDeg = 25) {
      const Cesium = (window as any).Cesium;
      const corners = [
        Cesium.Cartesian3.fromRadians(rect.west, rect.south),
        Cesium.Cartesian3.fromRadians(rect.west, rect.north),
        Cesium.Cartesian3.fromRadians(rect.east, rect.south),
        Cesium.Cartesian3.fromRadians(rect.east, rect.north),
      ];
      const bs = Cesium.BoundingSphere.fromPoints(corners);
      return viewer.camera.flyToBoundingSphere(
        bs,
        {
          duration: 1.2,
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(headingDeg),
            Cesium.Math.toRadians(pitchDeg),
            bs.radius * 1.2 // standoff so it fills nicely
          )
        }
      );
    }

    const registerBoundaryDataSource = (dataSource: any) => {
      if (dataSource) boundaryDataSourcesRef.current.push(dataSource);
    };

    const registerBoundaryEntity = (entity: any) => {
      if (entity) boundaryEntitiesRef.current.push(entity);
    };

    const styleBoundaryDataSource = (
      Cesium: any,
      dataSource: any,
      style: { outlineColor: string; fillColor?: string; lineColor?: string; lineWidth?: number; fill?: boolean }
    ) => {
      if (!dataSource?.entities?.values) return;
      const time = Cesium.JulianDate.now();
      const polygonSets: any[][] = [];
      dataSource.entities.values.forEach((entity: any) => {
        if (entity.polygon) {
          entity.polygon.outline = true;
          entity.polygon.outlineColor = Cesium.Color.fromCssColorString(style.outlineColor).withAlpha(0.95);
          entity.polygon.outlineWidth = style.lineWidth ?? 4;
          entity.polygon.fill = style.fill ?? false;
          if (style.fillColor) {
            entity.polygon.material = Cesium.Color.fromCssColorString(style.fillColor);
          }
          const hierarchy = entity.polygon.hierarchy?.getValue?.(time);
          const positions = hierarchy?.positions;
          if (Array.isArray(positions) && positions.length > 2) {
            polygonSets.push(positions);
          }
        }
        if (entity.polyline) {
          entity.polyline.width = style.lineWidth ?? 4;
          entity.polyline.material = Cesium.Color.fromCssColorString(style.lineColor ?? style.outlineColor).withAlpha(0.92);
          entity.polyline.clampToGround = true;
        }
        if (entity.label) {
          entity.label.show = false;
        }
      });
      return polygonSets;
    };

    (async () => {
      if (destroyed || !containerRef.current) return;
      const Cesium = await loadCesiumGlobal();
      if (!Cesium) return;

      Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || '';

      // 1. Viewer starts immediately with a lightweight terrain provider.
      v = new Cesium.Viewer(containerRef.current, {
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        animation: false, timeline: false, geocoder: false, homeButton: false,
        sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
        infoBox: false, selectionIndicator: false, requestRenderMode: true,
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      });
      if (destroyed) { v.destroy(); return; }
      setViewer(v);

      if (typeof Cesium.createWorldTerrainAsync === 'function') {
        void Cesium.createWorldTerrainAsync({
          requestVertexNormals: true,
          requestWaterMask: false,
        })
          .then((terrainProvider: any) => {
            if (destroyed || !v || v.isDestroyed?.()) return;
            v.terrainProvider = terrainProvider;
            v.scene.requestRender?.();
          })
          .catch((e: unknown) => {
            console.warn("Failed to load World Terrain (likely missing/invalid Ion token). Using Ellipsoid terrain.", e);
          });
      }

      // 2. Load boundary layers and determine AOI from the merged project KMZ
      let aoi: any;
      try {
        const kmlDs = await Cesium.KmlDataSource.load('/boundary.kmz', {
          camera: v.scene.camera,
          canvas: v.scene.canvas
        });
        if (destroyed) {
          safeRemoveDataSource(v, kmlDs);
          return;
        }
        await v.dataSources.add(kmlDs);
        registerBoundaryDataSource(kmlDs);
        setKmlDataSource(kmlDs);

        const polygonSets = styleBoundaryDataSource(Cesium, kmlDs, {
          outlineColor: '#c7551b',
          lineColor: '#2dd4bf',
          lineWidth: 3,
          fill: false,
        }) ?? [];
        const allPositions = polygonSets.flat();

        if (allPositions.length > 2) {
          aoi = Cesium.Rectangle.fromCartesianArray(allPositions, Cesium.Ellipsoid.WGS84);

          polygonSets.forEach((polyPositions, index) => {
            const outline = v.entities.add({
              id: `boundary-outline-${index}`,
              polyline: {
                positions: [...polyPositions, polyPositions[0]],
                clampToGround: true,
                width: 4,
                material: new Cesium.PolylineGlowMaterialProperty({
                  glowPower: 0.08,
                  taperPower: 0.75,
                  color: Cesium.Color.fromCssColorString('#c7551b').withAlpha(0.96),
                }),
              },
            });
            registerBoundaryEntity(outline);
            if (destroyed) {
              safeRemoveEntity(v, outline);
            }
          });
          if (destroyed) {
            return;
          }
          setKmlOutline(boundaryEntitiesRef.current[0] ?? null);

          const polyCenter = Cesium.BoundingSphere.fromPoints(allPositions).center;
          const label = v.entities.add({
            position: polyCenter,
            point: {
              pixelSize: 12,
              color: Cesium.Color.WHITE.withAlpha(0.95),
              outlineColor: Cesium.Color.fromCssColorString('#c7551b').withAlpha(0.98),
              outlineWidth: 4,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: 'Tanga Project',
              font: '700 15px Poppins, Inter, sans-serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: Cesium.Color.WHITE.withAlpha(0.96),
              outlineColor: Cesium.Color.fromCssColorString('#05080c').withAlpha(0.92),
              outlineWidth: 3,
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString('#05080c').withAlpha(0.78),
              backgroundPadding: new Cesium.Cartesian2(10, 6),
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -22),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              eyeOffset: new Cesium.Cartesian3(0, 0, -100)
            }
          });
          registerBoundaryEntity(label);
          if (destroyed) {
            safeRemoveEntity(v, label);
            return;
          }
          setKmlLabel(label);
        }

        setBoundaryLayers([
          {
            id: 'tanga-primary',
            kind: 'primary',
            dataSource: kmlDs,
            color: '#c7551b',
            label: polygonSets.length > 1 ? 'Merged licence footprint' : 'Project AOI',
          },
        ]);
      } catch (err) {
        console.error("KMZ loading failed:", err);
        aoi = Cesium.Rectangle.fromDegrees(38.6, -5.2, 39.1, -4.5);
        setBoundaryLayers([]);
      }
      if (destroyed) return;

      // 3. Create buffered AOI and add limited aerial imagery
      let aoiBuffered: any;
      if (aoi) {
        aoiBuffered = bufferRectangleMeters(Cesium, aoi, 90000); // Wider imagery footprint for presentation framing
      }

      const aerialProvider = Cesium.createWorldImagery
        ? Cesium.createWorldImagery({ style: Cesium.IonWorldImageryStyle.AERIAL })
        : await Cesium.IonImageryProvider.fromAssetId(2);
      
      const aerialLayer = new Cesium.ImageryLayer(
        aerialProvider,
        interactionMode === 'presentation' || !aoiBuffered
          ? undefined
          : { rectangle: aoiBuffered }
      );
      aerialLayer.alpha = 1.0;
      aerialLayer.brightness = 1.16;
      aerialLayer.contrast = 1.08;
      aerialLayer.saturation = 1.14;
      aerialLayer.gamma = 0.92;
      if (destroyed) return;
      v.imageryLayers.add(aerialLayer);

      // 4. Apply 3D cues
      v.scene.globe.show = true;
      v.scene.globe.translucency.enabled = false;
      v.scene.globe.depthTestAgainstTerrain = true;
      v.scene.globe.enableLighting = true;
      v.scene.light.intensity = 3.2;
      v.scene.globe.baseColor = Cesium.Color.fromCssColorString('#dbeafe').withAlpha(0.36);
      v.scene.atmosphere.brightnessShift = 0.52;
      v.scene.skyAtmosphere.brightnessShift = 0.36;
      v.scene.globe.maximumScreenSpaceError = interactionMode === 'presentation' ? GLOBE_SSE_BY_PROFILE[perfProfile] : 1.8;
      v.scene.globe.tileCacheSize = interactionMode === 'presentation' ? 160 : 220;
      v.targetFrameRate = interactionMode === 'presentation' ? 30 : 45;
      try { v.scene.skyBox.brightnessShift = 0.24; } catch {}
      try { v.scene.terrainExaggeration = 1.3; } catch {}

      // 5. Configure navigation to match the active interaction mode.
      const controller = v.scene.screenSpaceCameraController;
      controller.enableInputs = true;
      controller.enableRotate = false;
      controller.enableZoom = true;
      controller.enableLook = true;
      controller.rotateEventTypes = [];
      controller.lookEventTypes = [Cesium.CameraEventType.LEFT_DRAG];

      if (interactionMode === 'presentation') {
        controller.enableTranslate = false;
        controller.enableTilt = false;
        controller.translateEventTypes = [];
        controller.tiltEventTypes = [Cesium.CameraEventType.PINCH];
        controller.zoomEventTypes = [Cesium.CameraEventType.WHEEL];
        controller.zoomFactor = 2.8;
        controller.minimumZoomDistance = 12000.0;
        controller.maximumZoomDistance = 180000.0;
      } else {
        controller.enableTranslate = true;
        controller.enableTilt = true;
        controller.translateEventTypes = [Cesium.CameraEventType.MIDDLE_DRAG];
        controller.tiltEventTypes = [
          { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.SHIFT },
          Cesium.CameraEventType.PINCH,
        ];
        controller.zoomEventTypes = [Cesium.CameraEventType.RIGHT_DRAG, Cesium.CameraEventType.WHEEL];
      }

      controller.inertiaSpin = 0;
      controller.inertiaTranslate = interactionMode === 'presentation' ? 0.0 : 0.03;
      controller.inertiaZoom = interactionMode === 'presentation' ? 0.02 : 0.03;
      controller.lookDamping = interactionMode === 'presentation' ? 0.008 : 0.015;
      controller.bounceAnimationTime = 0;
      controller.maximumMovementRatio = interactionMode === 'presentation' ? 0.7 : 0.85;
      v.resolutionScale = interactionMode === 'presentation' ? RESOLUTION_SCALE_BY_PROFILE[perfProfile] : 0.82;

      // 6. Fly camera to AOI
      if (aoiBuffered) {
        await flyToRectangleFill(v, aoiBuffered);
      }
      if (destroyed) return;
      v.scene.requestRender();

      // 6.1 Removed global zoom clamp.
      // Previously we clamped zoom relative to the initial camera height, which unintentionally
      // limited all CesiumProvider-based views. Leaving zoom distances to Cesium defaults avoids
      // cross-view side effects. If a specific view needs limits, set them locally in that view.

      // 7. Final setup
      const renderCtrl = createRenderController(v);
      renderCtrl.bindUserInput();
      controllerRef.current = renderCtrl;
      setRenderController(renderCtrl);
      setReady(true);

    })().catch(err => console.error("CesiumProvider: Async IIFE failed", err));

    return () => {
      destroyed = true;
      disableFreeFly();
      if (controllerRef.current) controllerRef.current.stop();
      if (v && !v.isDestroyed?.()) {
        boundaryEntitiesRef.current.forEach((entity) => safeRemoveEntity(v, entity));
        boundaryEntitiesRef.current = [];
        boundaryDataSourcesRef.current.forEach((dataSource) => safeRemoveDataSource(v, dataSource));
        boundaryDataSourcesRef.current = [];
      }
      try { if (v && !v.isDestroyed()) v.destroy(); } catch {}
      setViewer(null);
      setRenderController(null);
      setTileset(null);
      setKmlDataSource(null);
      setKmlLabel(null);
      setKmlOutline(null);
      setBoundaryLayers([]);
      setReady(false);
      initializedRef.current = false;
    };
  }, [interactionMode, safeRemoveDataSource, safeRemoveEntity, applyTilesetProfile]);

  useEffect(() => {
    if (!viewer || !ready || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene) return;
    const v: any = viewer;

    try {
      if (interactionMode === 'presentation') {
        v.resolutionScale = RESOLUTION_SCALE_BY_PROFILE[perfProfile];
        v.scene.globe.maximumScreenSpaceError = GLOBE_SSE_BY_PROFILE[perfProfile];
      }
      if (tileset) {
        applyTilesetProfile(tileset, perfProfile);
      }
      v.scene.requestRender?.();
    } catch {}
  }, [applyTilesetProfile, interactionMode, perfProfile, ready, tileset, viewer]);

  // InteractionQualityScaler: lighten rendering during active interaction (pointer/touch/wheel),
  // then restore crisp quality shortly after idle. Cesium-only; fully guarded.
  useEffect(() => {
    if (!viewer || !ready || (viewer as any)?.isDestroyed?.() || !(viewer as any).scene) return;
    const v: any = viewer;
    const scene = v.scene;
    const canvas: HTMLCanvasElement | undefined = scene?.canvas;
    if (!canvas) return;

    let destroyed = false;
    let restoreTimer: number | null = null;
    let lastInputAt = 0;

    const fxaaStage = (scene.postProcessStages as any)?.fxaa;
    const baseline = {
      res: v.resolutionScale ?? 1.0,
      fxaa: fxaaStage ? fxaaStage.enabled : undefined,
      sse: tileset ? tileset.maximumScreenSpaceError : undefined,
    };

    const restore = () => {
      if (destroyed) return;
      try { v.resolutionScale = baseline.res ?? 1.0; } catch {}
      try { if (tileset && baseline.sse !== undefined) tileset.maximumScreenSpaceError = baseline.sse; } catch {}
      try { if (fxaaStage && baseline.fxaa !== undefined) fxaaStage.enabled = baseline.fxaa; } catch {}
      scene?.requestRender?.();
    };

    const scheduleRestore = () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        if (destroyed) return;
        if (performance.now() - lastInputAt >= 280) {
          restore();
        }
      }, 320) as unknown as number;
    };

    const activate = () => {
      if (destroyed) return;
      lastInputAt = performance.now();
      try {
        const base = baseline.res ?? 1.0;
        v.resolutionScale = Math.max(0.82, Math.min(0.9, base * 0.88));
      } catch {}
      try { if (tileset) tileset.maximumScreenSpaceError = 16; } catch {}
      try { if (fxaaStage) fxaaStage.enabled = false; } catch {}
      scene?.requestRender?.();
      scheduleRestore();
    };

    const onPointerDown = () => activate();
    const onPointerMove = () => activate();
    const onPointerUp = () => scheduleRestore();
    const onWheel = () => activate();

    canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
    canvas.addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.addEventListener('pointerup', onPointerUp, { passive: true });
    canvas.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      destroyed = true;
      try {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
      } catch {}
      if (restoreTimer) clearTimeout(restoreTimer);
      restore();
    };
  }, [viewer, ready, tileset, perfProfile]);
  // Keyboard toggles for convenience: U = underground toggle, P = fast nav, F = free-fly toggle
  useEffect(() => {
    if (!viewer || !ready) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'u' || e.key === 'U') {
        if (undergroundRef.current) {
          exitUndergroundMode?.();
        } else {
          enterUndergroundMode?.();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        applyFastNavProfile?.();
      } else if (e.key === 'f' || e.key === 'F') {
        if (freeFlyActiveRef.current) {
          disableFreeFly?.();
        } else {
          enableFreeFly?.();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewer, ready, enterUndergroundMode, exitUndergroundMode, applyFastNavProfile, enableFreeFly, disableFreeFly]);

  return (
    <Ctx.Provider value={{ viewer, ready, renderController, tileset, kmlDataSource, kmlLabel, kmlOutline, boundaryLayers, applyTilesetProfile: applyTilesetProfileRef.current, enableAoiCutaway, disableAoiCutaway, enterUndergroundMode, exitUndergroundMode, applyFastNavProfile, enableFreeFly, disableFreeFly }}>
      <div className="absolute inset-0 pointer-events-auto" ref={containerRef} />
      {children}
    </Ctx.Provider>
  );
};




