'use client';
import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { createRenderController, RenderController } from '@/lib/cesium-render-controller';
import { clipTilesetToRectangle } from '@/lib/utils/aoi-clip';
import { bufferRectangleMeters } from '@/lib/utils/rectangle-utils';

type PerfProfile = 'performance' | 'balanced' | 'quality';

type CesiumCtx = {
  viewer: any | null;
  ready: boolean;
  renderController: RenderController | null;
  tileset: any | null; // OSM Buildings
  kmlDataSource: any | null;
  kmlLabel: any | null;
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

export const CesiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [viewer, setViewer] = useState<any | null>(null);
  const [ready, setReady] = useState(false);
  const [renderController, setRenderController] = useState<RenderController | null>(null);
  const [tileset, setTileset] = useState<any | null>(null);
  const [kmlDataSource, setKmlDataSource] = useState<any | null>(null);
  const [kmlLabel, setKmlLabel] = useState<any | null>(null);

  const applyTilesetProfileRef = useRef<((tileset: any, p: PerfProfile) => void) | null>(null);
  const controllerRef = useRef<RenderController | null>(null);

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
      ctrl.zoomFactor = 20.0; // faster zoom speed
      ctrl.minimumZoomDistance = 1.0; // allow close to/under surface
      viewer.resolutionScale = 0.85; // lighter rendering
      (viewer as any).scene?.requestRender?.();
    } catch {}
  }, [viewer]);

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
      (viewer as any).resolutionScale = 0.75;
    } else {
      (viewer as any).resolutionScale = 0.85;
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
      if (viewer && !(viewer as any)?.isDestroyed?.()) (viewer as any).resolutionScale = 0.85;
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

    (async () => {
      if (destroyed || !containerRef.current) return;
      const Cesium = (window as any).Cesium;
      if (!Cesium) return;

      Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || '';

      // 1. Viewer with terrain
      const terrainProvider = await Cesium.createWorldTerrainAsync({
        requestVertexNormals: true,
        requestWaterMask: true,
      });
      if (destroyed) return;

      v = new Cesium.Viewer(containerRef.current, {
        terrainProvider,
        animation: false, timeline: false, geocoder: false, homeButton: false,
        sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
        infoBox: false, selectionIndicator: false, requestRenderMode: true,
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      });
      if (destroyed) { v.destroy(); return; }
      setViewer(v);

      // 2. Load KMZ to determine AOI first
      let aoi: any;
      try {
        const kmlDs = await Cesium.KmlDataSource.load('/tanga_boundary.kmz', {
          camera: v.scene.camera,
          canvas: v.scene.canvas
        });
        if (destroyed) { v.dataSources.remove(kmlDs); return; }
        await v.dataSources.add(kmlDs);
        setKmlDataSource(kmlDs);

        const entity = kmlDs.entities.values.find((e: any) => e.polygon);
        if (entity && entity.polygon) {
          entity.polygon.outline = true;
          entity.polygon.outlineColor = Cesium.Color.RED;
          entity.polygon.outlineWidth = 5;
          entity.polygon.fill = false;

          const polyPositions = entity.polygon.hierarchy.getValue(v.clock.currentTime).positions;
          aoi = Cesium.Rectangle.fromCartesianArray(polyPositions, Cesium.Ellipsoid.WGS84);

          const polyCenter = Cesium.BoundingSphere.fromPoints(polyPositions).center;
          const label = v.entities.add({
            position: polyCenter,
            label: {
              text: 'Tanga Graphite',
              font: 'bold 20px sans-serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              showBackground: true,
              backgroundColor: new Cesium.Color(0, 0, 0, 0.7),
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -20),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              eyeOffset: new Cesium.Cartesian3(0, 0, -100)
            }
          });
          if (destroyed) { v.entities.remove(label); return; }
          setKmlLabel(label);
        }
      } catch (err) {
        console.error("KMZ loading failed:", err);
        aoi = Cesium.Rectangle.fromDegrees(38.6, -5.2, 39.1, -4.5);
      }
      if (destroyed) return;

      // 3. Create buffered AOI and add limited aerial imagery
      let aoiBuffered: any;
      if (aoi) {
        aoiBuffered = bufferRectangleMeters(Cesium, aoi, 25000); // 25km buffer
      }

      const aerialProvider = Cesium.createWorldImagery
        ? Cesium.createWorldImagery({ style: Cesium.IonWorldImageryStyle.AERIAL })
        : await Cesium.IonImageryProvider.fromAssetId(2);
      
      const aerialLayer = new Cesium.ImageryLayer(aerialProvider, {
        rectangle: aoiBuffered
      });
      if (destroyed) return;
      v.imageryLayers.add(aerialLayer);

      // 4. Add OSM Buildings and clip to AOI
      try {
        const buildings = await Cesium.createOsmBuildingsAsync();
        if (destroyed) { v.scene.primitives.remove(buildings); return; }
        v.scene.primitives.add(buildings);
        setTileset(buildings);
        if (aoiBuffered) {
          clipTilesetToRectangle(v, buildings, aoiBuffered);
        }
        buildings.cullRequestsWhileMoving = true;
        buildings.cullRequestsWhileMovingMultiplier = 10.0;
        buildings.dynamicScreenSpaceError = true;
        buildings.maximumScreenSpaceError = 8;
      } catch (err) {
        console.error("OSM Buildings failed:", err);
      }
      if (destroyed) return;

      // 5. Apply 3D cues
      v.scene.globe.show = true;
      v.scene.globe.translucency.enabled = false;
      v.scene.globe.depthTestAgainstTerrain = true;
      v.scene.globe.enableLighting = true;
      // Increase brightness for more vibrancy
      v.scene.light.intensity = 2.0; // Boost lighting intensity
      v.scene.globe.baseColor = Cesium.Color.WHITE.withAlpha(0.1); // Add slight base color for vibrancy
      v.scene.atmosphere.brightnessShift = 0.2; // Brighten atmosphere
      v.scene.skyBox.brightnessShift = 0.1; // Brighten skybox
      try { v.scene.terrainExaggeration = 1.3; } catch {}

      // 6. Enable smooth VR-like navigation for cinematic experience
      const controller = v.scene.screenSpaceCameraController;
      controller.enableInputs = true;
      controller.enableRotate = false; // Disable orbit rotation
      controller.enableTranslate = true; // Keep translate for panning
      controller.enableZoom = true;
      controller.enableTilt = false; // Disable tilt, use look instead
      controller.enableLook = true; // Enable look for VR-style viewing

      // Assign left-drag to look (VR-style camera rotation without moving position)
      controller.rotateEventTypes = []; // Clear rotate events
      controller.lookEventTypes = [Cesium.CameraEventType.LEFT_DRAG]; // Left drag for looking around
      controller.translateEventTypes = [Cesium.CameraEventType.MIDDLE_DRAG]; // Middle drag for panning

      // Configure zoom with right drag and wheel for convenience
      controller.zoomEventTypes = [Cesium.CameraEventType.RIGHT_DRAG, Cesium.CameraEventType.WHEEL];

      // Minimize inertia for immediate, responsive feel
      controller.inertiaSpin = 0;
      controller.inertiaTranslate = 0.05; // Reduced for smoother feel
      controller.inertiaZoom = 0.05; // Reduced for smoother feel

      // Set damping for ultra-smooth look movement
      controller.lookDamping = 0.02; // Very low for cinematic feel

      // Enable smooth camera movements with minimal bounce
      controller.bounceAnimationTime = 0; // Disable bounce for immediate response
      controller.maximumMovementRatio = 1.0; // Allow full movement range

      // Apply faster, lighter navigation defaults
      applyFastNavProfile?.();

      // 7. Fly camera to AOI
      if (aoiBuffered) {
        await flyToRectangleFill(v, aoiBuffered);
      }
      if (destroyed) return;
      v.scene.requestRender();

      // 7. Final setup
      const renderCtrl = createRenderController(v);
      renderCtrl.bindUserInput();
      controllerRef.current = renderCtrl;
      setRenderController(renderCtrl);
      setReady(true);

    })();

    return () => {
      destroyed = true;
      if (controllerRef.current) controllerRef.current.stop();
      try { if (v && !v.isDestroyed()) v.destroy(); } catch {}
      setViewer(null);
      setRenderController(null);
      setTileset(null);
      setKmlDataSource(null);
      setKmlLabel(null);
      setReady(false);
      initializedRef.current = false;
    };
  }, []);

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
    <Ctx.Provider value={{ viewer, ready, renderController, tileset, kmlDataSource, kmlLabel, applyTilesetProfile: applyTilesetProfileRef.current, enableAoiCutaway, disableAoiCutaway, enterUndergroundMode, exitUndergroundMode, applyFastNavProfile, enableFreeFly, disableFreeFly }}>
      <div className="absolute inset-0 pointer-events-auto" ref={containerRef} />
      {children}
    </Ctx.Provider>
  );
};
