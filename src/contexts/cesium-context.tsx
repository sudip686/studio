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
};

const Ctx = createContext<CesiumCtx>({ 
  viewer: null, 
  ready: false, 
  renderController: null, 
  tileset: null, 
  kmlDataSource: null,
  kmlLabel: null,
  applyTilesetProfile: null 
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

  return (
    <Ctx.Provider value={{ viewer, ready, renderController, tileset, kmlDataSource, kmlLabel, applyTilesetProfile: applyTilesetProfileRef.current }}>
      <div className="absolute inset-0 pointer-events-auto" ref={containerRef} />
      {children}
    </Ctx.Provider>
  );
};
