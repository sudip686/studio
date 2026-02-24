'use client';
import { useEffect, useRef, useState } from 'react';
import { useCesium } from '../contexts/cesium-context';
import { waitOneFrame } from '../lib/utils/cesium-helpers';
import { useDataCache } from '@/lib/data-cache';
import AnimatedRevealViewer from '@/components/animated-reveal-viewer';
import SubsurfaceCutawayViewer from '@/components/subsurface-cutaway-viewer';
import KmlFocusedViewer from '@/components/kml-focused-viewer';
import GrandCanyonDrillholeViewer from '@/components/grand-canyon-drillhole-viewer';
import DrillholeLocationMap from '@/components/drillhole-location-map';
import TerrainClippingPlanes from '@/components/terrain-clipping-planes'; // Corrected import
import BlockModelBoxCutter from '@/components/block-model-box-cutter';
import DrillholeLayer from '@/components/DrillholeLayer';
import CinematicDrillholeViewer from '@/components/cinematic-drillhole-viewer';
import { OverlaySlot } from "@/ui/overlays";
import { Legend } from "@/components/ui/legend";
import { drillholeLocationMapLithologyLegendData } from "@/lib/constants";
import SubsurfaceViewer from '@/components/viewers/SubsurfaceViewer';
import BlockModelLayer from '@/components/viewers/BlockModelLayer';
import BoreholeLayer from '@/components/viewers/BoreholeLayer';
import ClippingControls from '@/components/viewers/ClippingControls';

type CesiumView = 'original' | 'exaggerated_kml' | 'styled_kml' | 'tanaga_accessibility' | 'tanga_geological_map' | 'geojson_drillholes_lithology' | 'geojson_drillholes_assay' | 'tiff_overlay' | 'project_location' | 'geospatial_lithology' | 'geospatial_assay' | 'drillhole_lithology_reveal' | 'subsurface_cutaway' | 'kml_focused_view' | 'terrain_traces' | 'resource_model_viewer' | 'cesium_three_block_model' | 'grand_canyon_assay' | 'grand_canyon_lithology' | 'drillhole_location_lithology' | 'drillhole_location_assay' | 'terrain_clipping' | 'block_model_box_cutter_grade' | 'block_model_box_cutter_class' | 'block_model_clip_view' | 'cinematic_drillhole_assay' | 'cinematic_drillhole_lithology' | 'modular_subsurface';

const TERRAIN_BOUNDS = {
    west: 37.9,
    south: -6.1,
    east: 40.1,
    north: -3.9
};

const LITHOLOGY_COLOR_MAP: { [key: string]: string } = {
    "Quartz-Feldspathic": "#f79a06ff",
    "GRSC": "#19292aff",
    "Granulite": "#a1089aff",
    "Khondalite": "#4f1dc4ff",
    "Marble": "#D4E6F1",
    "Not Recovearble": "#515A5A",
    "SOIL": "#0afc6bff",
    "Schist": "#153224ff",
    "nan": "#ffffffbe",
    "UNKNOWN": "#cccccc",
};

export default function CesiumViewSwitch({ view }: { view: CesiumView }) {
  const { viewer, ready, kmlDataSource, kmlLabel, enableAoiCutaway, disableAoiCutaway } = useCesium();
  const { drillholeData, processedAssayData } = useDataCache();
  const lastViewRef = useRef<CesiumView | null>(null);

  const [globeAlpha, setGlobeAlpha] = useState(1.0);   // 0..1 - Default to 100% opacity
  const [imageryAlpha, setImageryAlpha] = useState(1.0);

  // State
  const [specialView, setSpecialView] = useState<string | null>(null);
  const [drillholeType, setDrillholeType] = useState<'lithology' | 'assay'>('lithology');
  const [grandCanyonMode, setGrandCanyonMode] = useState<'assay' | 'lithology'>('assay');
  const [drillholeLocationMode, setDrillholeLocationMode] = useState<'assay' | 'lithology'>('assay');
  const [boxCutterMode, setBoxCutterMode] = useState<'grade' | 'class'>('grade');
  const [cinematicDrillholeMode, setCinematicDrillholeMode] = useState<'assay' | 'lithology'>('assay');

  // Legends should show whenever we are plotting data with color encoding in Cesium.
  const showCesiumDrillholeLegend = view === 'geojson_drillholes_lithology' || view === 'geojson_drillholes_assay';
  const assayRange = processedAssayData?.assayRange ?? { min: 0, max: 1 };
  const assayGradient = `linear-gradient(to right, hsl(120, 100%, 50%), hsl(60, 100%, 50%), hsl(0, 100%, 50%))`;

  const specialViewMap = {
      drillhole_lithology_reveal: 'animatedReveal',
      subsurface_cutaway: 'subsurfaceCutaway',
      kml_focused_view: 'kmlFocused',
      resource_model_viewer: 'resourceModel',
      cesium_three_block_model: 'cesiumThreeBlockModel',
      grand_canyon_assay: 'grandCanyon',
      grand_canyon_lithology: 'grandCanyon',
      drillhole_location_assay: 'drillholeLocation',
      drillhole_location_lithology: 'drillholeLocation',
      terrain_clipping: 'terrainClipping',
      block_model_box_cutter_grade: 'boxCutter',
      block_model_box_cutter_class: 'boxCutter',
      block_model_clip_view: 'blockModelClip',
      cinematic_drillhole_assay: 'cinematicDrillhole',
      cinematic_drillhole_lithology: 'cinematicDrillhole',
      modular_subsurface: 'modularSubsurface',
  };

  // Apply transparency whenever sliders change (and when viewer is ready)
  useEffect(() => {
    if (!viewer || !ready || viewer.isDestroyed()) return;
    const Cesium = (window as any).Cesium;

    // Globe translucency (terrain/globe)
    // Enable Cesium’s built-in translucency pipeline
    if (viewer.scene.globe) { // Add this check
      viewer.scene.globe.translucency.enabled = globeAlpha < 1.0;
      viewer.scene.globe.translucency.frontFaceAlpha = globeAlpha;   // 0..1
    }

    // Imagery layer transparency
    if (ionImageryLayerRef.current) {
        ionImageryLayerRef.current.alpha = imageryAlpha;
    }

    viewer.scene.requestRender();
  }, [viewer, ready, globeAlpha, imageryAlpha]);

  // Refs for persistent data
  const kmlDataSourceRef = useRef<any>(null);
  const kmlLabelRef = useRef<any>(null);
  const styledKmlHandlerRef = useRef<any>(null);
  const ionImageryLayerRef = useRef<any>(null);
  const geospatialDsRef = useRef<any>(null);
  const tiffOverlayLayerRef = useRef<any>(null);
  const projectLocationLayerRef = useRef<any>(null);
  const terrainTracesKmlRef = useRef<any>(null);
  const terrainTracesEntitiesRef = useRef<any[]>([]);

  // Base KMZ Loader is now handled by CesiumProvider.
  // We sync the KML data from the provider to local refs for the view transition logic.
  useEffect(() => {
    kmlDataSourceRef.current = kmlDataSource;
  }, [kmlDataSource]);

  useEffect(() => {
    kmlLabelRef.current = kmlLabel;
  }, [kmlLabel]);

  // View Transition Logic
  useEffect(() => {
    let cancelled = false;
    const v = viewer;
    if (!v || !ready || v.isDestroyed()) return;
    if (lastViewRef.current === view) return;

    const Cesium = (window as any).Cesium;

    // Cleanup function for proper memory management
    const cleanup = () => {
      if (cancelled) return;

      // Dispose of any existing special views
      setSpecialView(null);

      // Clear any existing event handlers
      if (styledKmlHandlerRef.current && !styledKmlHandlerRef.current.isDestroyed()) {
        styledKmlHandlerRef.current.destroy();
        styledKmlHandlerRef.current = null;
      }

      // Clear temporary entities and data sources
      if (projectLocationLayerRef.current) {
        v.entities.remove(projectLocationLayerRef.current);
        projectLocationLayerRef.current = null;
      }

      if (terrainTracesKmlRef.current) {
        v.dataSources.remove(terrainTracesKmlRef.current, true);
        terrainTracesKmlRef.current = null;
      }

      terrainTracesEntitiesRef.current.forEach((entity: any) => v.entities.remove(entity));
      terrainTracesEntitiesRef.current = [];

      // Clear imagery layers if not needed for new view
      if (ionImageryLayerRef.current && !['tanaga_accessibility', 'tanga_geological_map', 'drillhole_location_lithology'].includes(view)) {
        v.imageryLayers.remove(ionImageryLayerRef.current, true);
        ionImageryLayerRef.current = null;
      }

      // Force render update
      v.scene.requestRender();
    };

    const unload = async (prev: CesiumView | null) => {
      if (!prev || cancelled || v.isDestroyed()) return;
      setSpecialView(null);
      disableAoiCutaway?.();

      if (prev === 'exaggerated_kml') {
        v.scene.verticalExaggeration = 1.0;
      }
      
      if (prev === 'styled_kml') {
        if (styledKmlHandlerRef.current && !styledKmlHandlerRef.current.isDestroyed()) {
          styledKmlHandlerRef.current.destroy();
          styledKmlHandlerRef.current = null;
        }
        const kmlDataSource = kmlDataSourceRef.current;
        if (kmlDataSource) {
            const entity = kmlDataSource.entities.values.find((e:any) => e.polygon);
            if (entity && entity.polygon) {
                entity.polygon.fill = false;
            }
        }
      }

      if (prev === 'tanaga_accessibility' || prev === 'tanga_geological_map' || prev === 'drillhole_location_lithology') {
        if (ionImageryLayerRef.current) {
          v.imageryLayers.remove(ionImageryLayerRef.current, true);
          ionImageryLayerRef.current = null;
        }
      }



      if (prev === 'project_location') {
        if (projectLocationLayerRef.current) {
          v.entities.remove(projectLocationLayerRef.current);
          projectLocationLayerRef.current = null;
        }
        if (kmlDataSourceRef.current) kmlDataSourceRef.current.show = true;
      }

      if (prev === 'terrain_traces') {
        if (terrainTracesKmlRef.current) {
          v.dataSources.remove(terrainTracesKmlRef.current, true);
          terrainTracesKmlRef.current = null;
        }
        terrainTracesEntitiesRef.current.forEach((entity: any) => v.entities.remove(entity));
        terrainTracesEntitiesRef.current = [];
        v.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      }

      v.scene.requestRender();
    };

    const load = async (next: CesiumView) => {
      if (cancelled || v.isDestroyed()) return;
      v.camera.cancelFlight?.();
      await waitOneFrame(v);
      if (cancelled || v.isDestroyed()) return;

      if (next === 'original' || next === 'block_model_clip_view' || next === 'tanaga_accessibility') { // Explicitly disable AOI cutaway for tanaga_accessibility
        disableAoiCutaway?.();
      } else {
        enableAoiCutaway?.({ keepInside: true, edgeStyling: true });
      }

      if (next === 'original') {
        if (kmlDataSourceRef.current) {
          kmlDataSourceRef.current.show = true;
          if (kmlLabelRef.current) kmlLabelRef.current.show = true;
          await v.flyTo(kmlDataSourceRef.current);
        }
      }
      else if (next === 'exaggerated_kml') {
        const kmlDataSource = kmlDataSourceRef.current;
        if (!kmlDataSource) return;
        const kmlEntity = kmlDataSource.entities.values.find((e:any) => e.polygon);
        if (!kmlEntity) return;
        if (kmlLabelRef.current) kmlLabelRef.current.show = false;
        await v.flyTo(kmlEntity, { duration: 3.0, offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(30.0), Cesium.Math.toRadians(-45.0), 80000) });
        v.scene.verticalExaggeration = 3.0;
      }
      else if (next === 'styled_kml') {
        const kmlDataSource = kmlDataSourceRef.current;
        if (!kmlDataSource) return;
        const kmlEntity = kmlDataSource.entities.values.find((e:any) => e.polygon);
        if (!kmlEntity) return;
        if (kmlLabelRef.current) kmlLabelRef.current.show = false;
        const originalMaterial = Cesium.Color.WHITE.withAlpha(0.5);
        kmlEntity.polygon.fill = true;
        kmlEntity.polygon.material = originalMaterial;
        await v.flyTo(kmlEntity, { duration: 3.0, offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(0.0), Cesium.Math.toRadians(-50.0), 15000) });
        const handler = new Cesium.ScreenSpaceEventHandler(v.scene.canvas);
        let highlightedEntity: any = undefined;
        handler.setInputAction(function onMouseMove(movement: any) {
            const pickedObject = v.scene.pick(movement.endPosition);
            if (Cesium.defined(highlightedEntity)) {
                highlightedEntity.polygon.material = originalMaterial;
                highlightedEntity = undefined;
            }
            if (Cesium.defined(pickedObject) && (pickedObject as any).id === kmlEntity) {
                highlightedEntity = (pickedObject as any).id;
                (pickedObject as any).id.polygon.material = Cesium.Color.YELLOW.withAlpha(0.5);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        styledKmlHandlerRef.current = handler;
      }
      else if (next === 'tanaga_accessibility' || next === 'tanga_geological_map' || next === 'drillhole_location_lithology') {
        if (kmlDataSourceRef.current) kmlDataSourceRef.current.show = false;
        
        // Clear clipping planes for full visibility
        if (v.scene.globe.clippingPlanes) {
             v.scene.globe.clippingPlanes.enabled = false;
             v.scene.globe.clippingPlanes = undefined;
        }

        try {
            const assetId = next === 'tanaga_accessibility' ? 3733958 : 3678736;
            const layer = await v.imageryLayers.addImageryProvider(await Cesium.IonImageryProvider.fromAssetId(assetId));
            ionImageryLayerRef.current = layer;
            
            // Fly to the specific terrain bounds
            const rect = Cesium.Rectangle.fromDegrees(
                TERRAIN_BOUNDS.west, 
                TERRAIN_BOUNDS.south, 
                TERRAIN_BOUNDS.east, 
                TERRAIN_BOUNDS.north
            );
            await v.flyTo(layer, { 
                destination: rect,
                duration: 2.0 
            });
        } catch (error) {
            console.error("Error loading ION imagery:", error);
        }
      }
      else if (
        next === 'geojson_drillholes_lithology' || 
        next === 'geojson_drillholes_assay' ||
        next === 'geospatial_lithology' || 
        next === 'geospatial_assay'
      ) {
        setDrillholeType(next.includes('lithology') ? 'lithology' : 'assay');
        setSpecialView('drillhole');
      }
      else if (next === 'project_location') {
        if (kmlDataSourceRef.current) kmlDataSourceRef.current.show = false;
        if (kmlLabelRef.current) kmlLabelRef.current.show = false;
        const centerPoint = Cesium.Cartesian3.fromDegrees(38.78, -4.8);
        const marker = v.entities.add({ position: centerPoint, point: { pixelSize: 12, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 } });
        projectLocationLayerRef.current = marker;
        await v.flyTo(marker, { offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), 500000) });
      }
      else if (next === 'tiff_overlay') {
        console.warn("TIFF overlay loading logic not implemented yet.");
        // Placeholder for actual TIFF overlay loading logic
      }
      else {
        const specialViewMap = {
            drillhole_lithology_reveal: 'animatedReveal',
            subsurface_cutaway: 'subsurfaceCutaway',
            kml_focused_view: 'kmlFocused',
            resource_model_viewer: 'resourceModel',
            cesium_three_block_model: 'cesiumThreeBlockModel',
            grand_canyon_assay: 'grandCanyon',
            grand_canyon_lithology: 'grandCanyon',
            drillhole_location_assay: 'drillholeLocation',
            drillhole_location_lithology: 'drillholeLocation',
            terrain_clipping: 'terrainClipping',
            block_model_box_cutter_grade: 'boxCutter',
            block_model_box_cutter_class: 'boxCutter',
            block_model_clip_view: 'blockModelClip',
            cinematic_drillhole_assay: 'cinematicDrillhole',
            cinematic_drillhole_lithology: 'cinematicDrillhole',
            modular_subsurface: 'modularSubsurface',
        };
        if (next in specialViewMap) {
            if (next.startsWith('grand_canyon')) setGrandCanyonMode(next.endsWith('assay') ? 'assay' : 'lithology');
            if (next.startsWith('drillhole_location')) setDrillholeLocationMode(next.endsWith('assay') ? 'assay' : 'lithology');
            if (next.startsWith('block_model_box_cutter')) setBoxCutterMode(next.endsWith('grade') ? 'grade' : 'class');
            if (next.startsWith('cinematic_drillhole')) setCinematicDrillholeMode(next.endsWith('assay') ? 'assay' : 'lithology');
            setSpecialView(specialViewMap[next as keyof typeof specialViewMap]);
        }
      }

      if (!cancelled) v.scene.requestRender();
    };

    (async () => {
      await unload(lastViewRef.current);
      if (cancelled) return;
      await load(view);
      if (!cancelled) lastViewRef.current = view;
    })();

    return () => {
      cancelled = true;
    };
  }, [viewer, ready, view, drillholeData]);

  // Ensure AOI cutaway applies once KML is available for non-original views
  useEffect(() => {
    if (!viewer || !ready || viewer.isDestroyed()) return;
    if (!kmlDataSource) return;
    if (view !== 'original' && view !== 'block_model_clip_view' && view !== 'tanaga_accessibility') { // Explicitly exclude tanaga_accessibility
      enableAoiCutaway?.({ keepInside: true, edgeStyling: true });
    }
  }, [viewer, ready, kmlDataSource, view, enableAoiCutaway]);

  return (
    <>
        {specialView === 'drillhole' && <DrillholeLayer type={drillholeType} />}
        {specialView === 'animatedReveal' && <AnimatedRevealViewer />}
        {specialView === 'subsurfaceCutaway' && <SubsurfaceCutawayViewer />}
        {specialView === 'kmlFocused' && <KmlFocusedViewer />}
        {specialView === 'resourceModel' && (
            <SubsurfaceViewer initialState={{ transparency: 0.5 }}>
                <BlockModelLayer colorMode="classification" />
                <BoreholeLayer />
                <ClippingControls />
            </SubsurfaceViewer>
        )}
        {specialView === 'cesiumThreeBlockModel' && (
            <SubsurfaceViewer initialState={{ clippingMode: 'polygon' }}>
                <BlockModelLayer colorMode="json" />
                <ClippingControls />
            </SubsurfaceViewer>
        )}
        {specialView === 'grandCanyon' && <GrandCanyonDrillholeViewer displayMode={grandCanyonMode} />}
        {specialView === 'drillholeLocation' && <DrillholeLocationMap displayMode={drillholeLocationMode} />}
        {specialView === 'terrainClipping' && <TerrainClippingPlanes />}{/* Corrected component */}
        {specialView === 'boxCutter' && <BlockModelBoxCutter colorMode={boxCutterMode} />}
        {specialView === 'blockModelClip' && (
            <SubsurfaceViewer initialState={{ clippingMode: 'box' }}>
                <BlockModelLayer colorMode="carbon" />
                <ClippingControls />
            </SubsurfaceViewer>
        )}
        {specialView === 'cinematicDrillhole' && <CinematicDrillholeViewer type={cinematicDrillholeMode} />}
        {specialView === 'modularSubsurface' && (
            <SubsurfaceViewer>
                <BlockModelLayer />
                <BoreholeLayer />
                <ClippingControls />
            </SubsurfaceViewer>
        )}

      {/* Transparency controls */}
      <OverlaySlot slot="top-center">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-white/80 drop-shadow-sm">
              Globe opacity {Math.round(globeAlpha * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={globeAlpha}
              onChange={(e) => setGlobeAlpha(parseFloat(e.target.value))}
              className="w-32 h-1 bg-black/30 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${globeAlpha * 100}%, rgba(0,0,0,0.3) ${globeAlpha * 100}%, rgba(0,0,0,0.3) 100%)`
              }}
            />
          </div>

          {view === 'drillhole_location_lithology' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-white/80 drop-shadow-sm">
                Map opacity {Math.round(imageryAlpha * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={imageryAlpha}
                onChange={(e) => setImageryAlpha(parseFloat(e.target.value))}
                className="w-32 h-1 bg-black/30 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${imageryAlpha * 100}%, rgba(0,0,0,0.3) ${imageryAlpha * 100}%, rgba(0,0,0,0.3) 100%)`
                }}
              />
            </div>
          )}
        </div>
      </OverlaySlot>

      {/* Bottom-left legend for Cesium drillhole views */}
      {showCesiumDrillholeLegend && (
        <OverlaySlot slot="bottom-left">
          {view === 'geojson_drillholes_lithology' ? (
            <Legend
              title={drillholeLocationMapLithologyLegendData.title}
              type="categorical"
              items={drillholeLocationMapLithologyLegendData.items}
              guidance="Colors correspond to lithology classes. Hover a segment to see lithology and interval details."
              show
            />
          ) : (
            <Legend
              title="Assay (Graphitic Carbon)"
              type="gradient"
              gradient={assayGradient}
              minLabel={assayRange.min.toFixed(2)}
              maxLabel={assayRange.max.toFixed(2)}
              guidance="Higher values trend toward red; lower values trend toward green. Hover a segment to see the exact assay value."
              show
            />
          )}
        </OverlaySlot>
      )}

    </>
  );
}
