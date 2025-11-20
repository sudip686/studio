import { useEffect, useState, useRef, useCallback } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { Legend } from '@/components/ui/legend';
import KmlBoundary from './KmlBoundary';
import CompassOverlay from '@/components/ui/CompassOverlay';
import MetricScaleOverlay from '@/components/ui/MetricScaleOverlay';
import { drillholeLocationMapLithologyLegendData, ASSAY_GRAPHITIC_CARBON, LITHOLOGY_COLORS } from '@/lib/legend-definitions';
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
                    <li><strong>Avg. Graphitic Carbon:</strong> {data.content.graphitic_carbon?.toFixed(3)} %</li>
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
    const uniqueIntervals = new Map<string, any>();
    for (const segment of allSegments) {
        const id = `${segment.hole_id}-${segment.depth_from}-${segment.depth_to}`;
        if (uniqueIntervals.has(id)) continue;

        const coords = segment.feature.geometry.coordinates;
        if (!coords || coords.length < 2) continue;

        const [lon0, lat0, z0] = coords[0];
        const [lon1, lat1, z1] = coords[1];

        const interval: Interval = {
            id: id,
            start: [lat0, lon0, z0],
            end: [lat1, lon1, z1],
            props: { ...segment, latitude: lat0, longitude: lon0 }
        };
        uniqueIntervals.set(id, interval);
    }
    intervalsRef.current = Array.from(uniqueIntervals.values());

    const run = async () => {
        console.log(`Creating ${intervalsRef.current.length} drillhole entities...`);
        
        viewer.entities.suspendEvents();
        for (const interval of intervalsRef.current) {
            if (isCancelled) break;
            // Creates with default transparent style
            await cache.getOrCreate(interval);
        }
        viewer.entities.resumeEvents();

        if (isCancelled) return;
        
        console.log("Finished creating entities.");
        // Initial styling is now handled by the style effect
        applyStyles();
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
        opacity: 0.15,
        outline: true,
        outlineColor: Cesium.Color.WHITE,
        radiusMeters: 8,
    };

    for (const interval of intervalsRef.current) {
        const entity = viewer.entities.getById(`bh-${interval.id}`);
        if (!entity) continue;

        let styleToApply: Style;

        if (type === 'assay') {
            const value = interval.props.graphitic_carbon;
            // For assay, we always color, even if value is 0 or undefined
            const color = colorFromLegend(legend, value ?? 0);
            styleToApply = { material: color, opacity: 1.0, outline: false, radiusMeters: 8 };
        } else { // lithology
            const value = interval.props.lithology;
            if (value) {
                const normalizedValue = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
                if (LITHOLOGY_COLORS.map[normalizedValue]) {
                    const color = colorFromLegend(legend, normalizedValue);
                    styleToApply = { material: color, opacity: 1.0, outline: false, radiusMeters: 8 };
                } else {
                    // Has a lithology value, but it's not in our legend
                    styleToApply = defaultStyle;
                }
            } else {
                // Has no lithology property at all
                styleToApply = defaultStyle;
            }
        }
        cache.applyStyle(entity, styleToApply);
    }
    
    viewer.scene.requestRender();
  };

  // UI Effects (Overlays)
  useEffect(() => {
    if (!viewer || !ready) return;
    const Cesium = (window as any).Cesium;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
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
        <KmlBoundary />
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