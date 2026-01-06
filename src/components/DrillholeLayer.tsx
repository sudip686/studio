import { useEffect, useState, useRef, useCallback } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { Legend } from '@/components/ui/legend';
import IonKmlLayer from './IonKmlLayer';
import CompassOverlay from '@/components/ui/CompassOverlay';
import MetricScaleOverlay from '@/components/ui/MetricScaleOverlay';
import { drillholeLocationMapLithologyLegendData, ASSAY_GRAPHITIC_CARBON, LITHOLOGY_COLORS } from '@/lib/constants';
import { useDataCache, DrillholeSegment } from '@/lib/data-cache';
import { BoreholeCylinderCache, Interval, Style } from '@/lib/boreholes/borehole-cylinders';
import { colorFromLegend } from '@/lib/boreholes/legend-color';

const TooltipContent = ({ data }: { data: any }) => {
    if (!data || !data.content) return null;
    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none"
            style={{ top: data.top, left: data.left, transform: 'translate(15px, 15px)' }}
        >
            <p className="font-bold text-base mb-1">Hole ID: {data.content.hole_id}</p>
            <ul className="list-none space-y-1">
                <li><strong>Lat:</strong> {data.content.latitude?.toFixed(5)}</li>
                <li><strong>Lon:</strong> {data.content.longitude?.toFixed(5)}</li>
                {data.content.lithology && <li><strong>Lithologies:</strong> {data.content.lithology}</li>}
                {data.content.graphitic_carbon !== undefined && (
                    <li><strong>Graphitic Carbon:</strong> {data.content.graphitic_carbon?.toFixed(3)} %</li>
                )}
            </ul>
        </div>
    );
};

interface DrillholeLayerProps {
    type: 'lithology' | 'assay';
}

const DrillholeLayer = ({ type }: DrillholeLayerProps) => {
  const { viewer, ready } = useCesium();
  const { drillholeData } = useDataCache();
  const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
  const [uiTick, setUiTick] = useState(0);
  
  const cacheRef = useRef<BoreholeCylinderCache | null>(null);
  const intervalsRef = useRef<any[]>([]);

  // Main effect for creating and styling geometries
  useEffect(() => {
    if (!viewer || !ready || !drillholeData) return;
    let isCancelled = false;

    cacheRef.current = new BoreholeCylinderCache(viewer);
    const cache = cacheRef.current;

    const allSegments = [...(drillholeData.lithology || []), ...(drillholeData.assay || [])];
    
    // Group by Hole ID
    const holes: Record<string, DrillholeSegment[]> = {};
    for (const seg of allSegments) {
        if (!holes[seg.hole_id]) holes[seg.hole_id] = [];
        holes[seg.hole_id].push(seg);
    }

    const uniqueIntervals = new Map<string, any>();
    const Cesium = (window as any).Cesium;

    Object.values(holes).forEach(segments => {
        // Sort by depth
        segments.sort((a, b) => a.depth_from - b.depth_from);
        if (segments.length === 0) return;

        // Determine Collar Position (Start of first segment)
        const firstSeg = segments[0];
        const g = firstSeg.feature?.geometry;
        if (!g || g.type !== 'LineString' || g.coordinates.length < 1) return;
        
        // GeoJSON is [lon, lat, elev]
        const [startLon, startLat, startElev] = g.coordinates[0];
        let currentPos = Cesium.Cartesian3.fromDegrees(startLon, startLat, startElev);

        segments.forEach(seg => {
            const props = seg.feature?.properties || {};
            const azimuth = Number(props.azimuth ?? 0);
            const inclination = Number(props.inclination ?? 0); // 0 = Vertical Down
            const depthFrom = props.depth_from ?? 0;
            const depthTo = props.depth_to ?? 0;
            const len = Math.abs(depthTo - depthFrom);
            
            if (len <= 0) return;

            // Calculate direction in Local ENU Frame
            // Inclination 0 = Down (-Z in ENU? No, Down is -Z).
            // ThreeJS logic was: dy = -len * cos(inc). horiz = len * sin(inc).
            // If inc=0, dy = -len (Down), horiz=0. Correct.
            
            const incRad = Cesium.Math.toRadians(inclination);
            const azRad = Cesium.Math.toRadians(azimuth);

            // In ENU: X=East, Y=North, Z=Up
            // We want 'Down' to be -Z.
            const verticalComponent = -Math.cos(incRad); // Down
            const horizontalComponent = Math.sin(incRad); 

            // Azimuth 0 = North (Y), 90 = East (X)
            const x = horizontalComponent * Math.sin(azRad); // East
            const y = horizontalComponent * Math.cos(azRad); // North
            const z = verticalComponent; // Up/Down

            const localDirection = new Cesium.Cartesian3(x, y, z);
            
            // Transform Local Direction to Fixed Frame (ECEF)
            // We need the transform matrix at the current position
            const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(currentPos);
            // Remove translation from matrix to rotate vector only
            const rotationMatrix = Cesium.Matrix4.getMatrix3(enuToFixed, new Cesium.Matrix3());
            
            const fixedDirection = Cesium.Matrix3.multiplyByVector(rotationMatrix, localDirection, new Cesium.Cartesian3());
            Cesium.Cartesian3.normalize(fixedDirection, fixedDirection);
            
            const nextPos = new Cesium.Cartesian3();
            Cesium.Cartesian3.add(currentPos, Cesium.Cartesian3.multiplyByScalar(fixedDirection, len, new Cesium.Cartesian3()), nextPos);

            // Create Interval
            const id = `${seg.hole_id}-${depthFrom}-${depthTo}`;
            
            // Convert back to Lat/Lon/Alt for the cache interface (overhead but keeps interface clean)
            const startCart = Cesium.Cartographic.fromCartesian(currentPos);
            const endCart = Cesium.Cartographic.fromCartesian(nextPos);

            const interval: Interval = {
                id: id,
                start: [
                    Cesium.Math.toDegrees(startCart.latitude),
                    Cesium.Math.toDegrees(startCart.longitude),
                    startCart.height
                ],
                end: [
                    Cesium.Math.toDegrees(endCart.latitude),
                    Cesium.Math.toDegrees(endCart.longitude),
                    endCart.height
                ],
                props: { ...seg, latitude: Cesium.Math.toDegrees(startCart.latitude), longitude: Cesium.Math.toDegrees(startCart.longitude) }
            };

            // Handling duplicates (e.g. assay vs lithology overlap)
            if (uniqueIntervals.has(id)) {
                const existing = uniqueIntervals.get(id);
                if (seg.graphitic_carbon !== undefined && seg.graphitic_carbon !== null) {
                    existing.props.graphitic_carbon = seg.graphitic_carbon;
                }
                if (seg.lithology) {
                    existing.props.lithology = seg.lithology;
                }
            } else {
                uniqueIntervals.set(id, interval);
            }

            // Advance
            currentPos = nextPos;
        });
    });

    intervalsRef.current = Array.from(uniqueIntervals.values());

    const run = async () => {
        console.log(`Creating ${intervalsRef.current.length} drillhole entities...`);
        
        // Batch processing to prevent UI blocking
        const BATCH_SIZE = 200;
        const total = intervalsRef.current.length;
        const entitiesCreated = [];
        
        viewer.entities.suspendEvents();
        
        for (let i = 0; i < total; i += BATCH_SIZE) {
            if (isCancelled) break;
            
            const batch = intervalsRef.current.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(interval => cache.getOrCreate(interval));
            
            // Wait for this batch to complete
            const newEntities = await Promise.all(batchPromises);
            
            // Filter out nulls and add to list
            newEntities.forEach(e => {
                if (e) entitiesCreated.push(e);
            });
            
            // Resume events briefly to let Cesium render this batch
            viewer.entities.resumeEvents();
            viewer.scene.requestRender();
            
            // Yield to main thread to keep UI responsive
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Suspend again for next batch
            viewer.entities.suspendEvents();
        }
        
        viewer.entities.resumeEvents();

        if (isCancelled) return;
        
        console.log("Finished creating entities.");
        // Initial styling is now handled by the style effect
        applyStyles();

        // Fly to entities to ensure visibility
        if (entitiesCreated.length > 0) {
            viewer.flyTo(entitiesCreated, {
                duration: 2.0,
                offset: new (window as any).Cesium.HeadingPitchRange(
                    0, 
                    (window as any).Cesium.Math.toRadians(-45), 
                    0
                )
            });
        }
    };

    run();

    return () => {
      isCancelled = true;
      console.log("Cleaning up borehole cache...");
      cacheRef.current?.destroy();
      cacheRef.current = null;
    }
  }, [viewer, ready, drillholeData]);

  // Effect for applying styles when type changes
  useEffect(() => {
    applyStyles();
  }, [type]);

  const applyStyles = () => {
    if (!cacheRef.current || !intervalsRef.current.length || !viewer) return;
    console.log(`Applying style for type: ${type}`);

    const Cesium = (window as any).Cesium;
    const cache = cacheRef.current;
    const legend = type === 'assay' ? ASSAY_GRAPHITIC_CARBON : LITHOLOGY_COLORS;

    const defaultStyle: Style = {
        material: Cesium.Color.GREY,
        opacity: 0.5,
        outline: true,
        outlineColor: Cesium.Color.WHITE,
        radiusMeters: 2.5,
    };

    for (const interval of intervalsRef.current) {
        const entity = viewer.entities.getById(`bh-${interval.id}`);
        if (!entity) continue;

        let styleToApply: Style | null = null;
        let visible = false;

        if (type === 'assay') {
            const value = interval.props.graphitic_carbon;
            // Only show segments that have assay data
            if (value !== undefined && value !== null) {
                const color = colorFromLegend(legend, value);
                styleToApply = { material: color, opacity: 1.0, outline: false, radiusMeters: 2.5 };
                visible = true;
            }
        } else { // lithology
            const value = interval.props.lithology;
            if (value) {
                const normalizedValue = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
                // Only show segments that have lithology data and map to a color
                if (LITHOLOGY_COLORS.map[normalizedValue]) {
                    const color = colorFromLegend(legend, normalizedValue);
                    styleToApply = { material: color, opacity: 1.0, outline: false, radiusMeters: 2.5 };
                    visible = true;
                } else if (normalizedValue === 'unknown' || normalizedValue === 'nan') {
                     // Optionally hide or show unknowns. Here we show them grey.
                     styleToApply = defaultStyle;
                     visible = true;
                }
            }
        }
        
        entity.show = visible;
        if (visible && styleToApply) {
            cache.applyStyle(entity, styleToApply);
        }
    }
    
    viewer.scene.requestRender();
  };

  // UI Effects (Overlays)
  useEffect(() => {
    if (!viewer || !ready) return;
    const Cesium = (window as any).Cesium;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    // ...
    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.endPosition);

      if (picked?.id?.properties) {
        setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: picked.id.properties.getValue(viewer.clock.currentTime) });
      } else {
        setTooltip({ display: false, top: 0, left: 0, content: null });
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    const removePreRender = viewer.scene.preRender.addEventListener(() => {
        requestAnimationFrame(() => setUiTick(t => (t + 1) % 1_000_000));
    });

    return () => {
      if (!handler.isDestroyed()) handler.destroy();
      removePreRender();
    };
  }, [viewer, ready]);

  const getHeading = useCallback(() => {
    if (!viewer) return 0;
    const Cesium = (window as any).Cesium;
    return Cesium.Math.toDegrees(viewer.camera.heading);
  }, [viewer]);

  const getMetersIn100px = useCallback(() => {
    if (!viewer) return 0;
    const Cesium = (window as any).Cesium;
    const { scene } = viewer;
    const canvas = scene.canvas;
    const p1 = new Cesium.Cartesian2(canvas.clientWidth / 2 - 50, canvas.clientHeight - 10);
    const p2 = new Cesium.Cartesian2(canvas.clientWidth / 2 + 50, canvas.clientHeight - 10);

    const r1 = scene.camera.getPickRay(p1);
    const r2 = scene.camera.getPickRay(p2);
    let c1 = r1 ? scene.globe.pick(r1, scene) : undefined;
    let c2 = r2 ? scene.globe.pick(r2, scene) : undefined;

    if (c1 && c2) return Cesium.Cartesian3.distance(c1, c2);

    const ellipsoid = scene.globe.ellipsoid;
    const center = scene.camera.positionCartographic;
    if (!center) return 0;
    const metersPerPx = Math.tan(scene.camera.frustum.fovy / 2) * center.height / (canvas.clientHeight / 2);
    const dLon = (100 * metersPerPx) / ellipsoid.maximumRadius;
    const gc1 = new Cesium.Cartographic(center.longitude - dLon / 2, center.latitude, 0);
    const gc2 = new Cesium.Cartographic(center.longitude + dLon / 2, center.latitude, 0);
    const geod = new Cesium.EllipsoidGeodesic(gc1, gc2, ellipsoid);
    return geod.surfaceDistance || 0;
  }, [viewer]);

  return (
    <div className="h-full w-full relative z-20 pointer-events-none">
        <IonKmlLayer assetId={4310565} />
        <CompassOverlay mode="cesium" getHeading={getHeading} />
        <MetricScaleOverlay mode="cesium" getMetersIn100px={getMetersIn100px} />
        <TooltipContent data={tooltip} />
        {type === 'lithology' ? (
            <Legend
                title={drillholeLocationMapLithologyLegendData.title}
                type="categorical"
                items={drillholeLocationMapLithologyLegendData.items}
                show={true}
            />
        ) : (
            <Legend
                title="Assay (Graphitic Carbon)"
                type="categorical"
                items={ASSAY_GRAPHITIC_CARBON.bins}
                show={true}
            />
        )}
    </div>
  );
};

export default DrillholeLayer;
