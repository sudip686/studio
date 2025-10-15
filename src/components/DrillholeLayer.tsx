'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { useCesiumBoreholes } from '@/lib/boreholes/useCesiumBoreholes';
import { lithologyColor, assayColor } from '@/lib/boreholes/colors';
import { Legend } from '@/components/ui/legend';

import { drillholeLocationMapLithologyLegendData } from '@/lib/legend-definitions';

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
import { useDataCache, DrillholeSegment } from '@/lib/data-cache';
import { BoreholeRowBase } from '@/lib/boreholes/borehole-core';

interface DrillholeLayerProps {
    type: 'lithology' | 'assay';
}

const DrillholeLayer = ({ type }: DrillholeLayerProps) => {
    const { viewer, ready } = useCesium();
    const { drillholeData } = useDataCache();
    const [rows, setRows] = useState<BoreholeRowBase[] | null>(null);
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(1);
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const eventHandlerRef = useRef<any>(null);
    const [globeTransparency, setGlobeTransparency] = useState(1.0);

    // 1. Use data from cache based on the view type and sample terrain
    useEffect(() => {
        if (!type || !drillholeData || !viewer || !ready) return;
        const Cesium = (window as any).Cesium;

        const processAndSampleData = async () => {
            const dataToProcess = type === 'lithology' ? drillholeData.lithology : drillholeData.assay;
            const outRows: BoreholeRowBase[] = [];
            let mi = Infinity, ma = -Infinity;

            // 1) collect collars (lon, lat) per hole_id
            const collars = new Map<string, { lon: number; lat: number; originalZ: number }>();
            for (const segment of dataToProcess) {
                const hid = segment.hole_id;
                const lon = segment.lon;
                const lat = segment.lat;
                const originalZ = segment.elevation; // Store original elevation
                if (!collars.has(hid)) collars.set(hid, { lon, lat, originalZ });
            }

            // 2) sample terrain for those collars
            await viewer.terrainProvider.readyPromise;
            const positions = Array.from(collars.values()).map(c =>
                Cesium.Cartographic.fromDegrees(c.lon, c.lat)
            );
            const sampled = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions);

            // 3) map hole_id -> surfaceHeight
            const surfaceByHole = new Map<string, number>();
            Array.from(collars.keys()).forEach((hid, i) => {
                surfaceByHole.set(hid, sampled[i].height ?? 0);
            });

            // QA check — how close are collars to input z?
            let maxDelta = 0, sumAbs = 0, n = 0;
            Array.from(collars.entries()).forEach(([hid, collarData]) => {
                const zIn = collarData.originalZ;
                const zTer = surfaceByHole.get(hid);
                if (zTer != null) {
                    const d = Math.abs(zIn - zTer);
                    sumAbs += d; n++; if (d > maxDelta) maxDelta = d;
                }
            });
            if (n > 0) {
                console.log(`[Drill QA] collars: n=${n}, mean|Δz|=${(sumAbs/n).toFixed(2)} m, max|Δz|=${maxDelta.toFixed(2)} m`);
            }


            for (const segment of dataToProcess) {
                const v = Number(segment.graphitic_carbon ?? 0);

                if (type === 'assay') {
                    mi = Math.min(mi, v);
                    ma = Math.max(ma, v);
                }

                // Use sampled surface height for the segment's top Z
                const surfaceZ = surfaceByHole.get(segment.hole_id) ?? segment.elevation; // Fallback to original elevation

                const lon = Number(segment.lon);
                const lat = Number(segment.lat);
                const df  = Number(segment.depth_from);
                const dt  = Number(segment.depth_to);

                if (
                  !Number.isFinite(lon) || !Number.isFinite(lat) ||
                  !Number.isFinite(surfaceZ) || !Number.isFinite(df) || !Number.isFinite(dt) ||
                  dt <= df // zero/negative length => degenerate
                ) {
                  console.warn('[Drill QA] Skipping bad segment', {
                    hole_id: segment.hole_id, lon, lat, surfaceZ, df, dt
                  });
                  continue;
                }

                outRows.push({
                    hole_id: segment.hole_id,
                    lon, lat,
                    depth_from: df,
                    depth_to: dt,
                    lithology: segment.lithology,
                    graphitic_carbon: v,
                    z: surfaceZ
                });
            }

            if (type === 'assay') {
                const span = (ma - mi);
                if (!Number.isFinite(mi) || !Number.isFinite(ma) || span <= 0) {
                  setMin(0); setMax(1);
                } else {
                  setMin(mi); setMax(ma);
                }
            }
            setRows(outRows);
        };

        processAndSampleData();

    }, [type, drillholeData, viewer, ready]);

    // 2. Memoize the color function
    const colorFn = useMemo(() => {
        if (!viewer || !ready) return () => {};
        const Cesium = (window as any).Cesium;
        return type === 'lithology'
            ? lithologyColor(Cesium)
            : assayColor(Cesium, min, max);
    }, [viewer, ready, type, min, max]);

    // 3. Use the centralized borehole hook
    if (rows) {
      for (const r of rows) {
        const bad = [r.lon, r.lat, r.z, r.depth_from, r.depth_to].some(v => !Number.isFinite(Number(v)));
        const deg = (Number(r.depth_to) - Number(r.depth_from)) <= 0;
        if (bad || deg) {
          console.error('[Boreholes] First bad row:', r);
          break;
        }
      }
    }
    useCesiumBoreholes(viewer, rows, colorFn, { 
        radius: 10, // Example radius
        name: `boreholes-${type}`,
        fit: true 
    });

    // Effect to control globe transparency
    useEffect(() => {
        if (!viewer || !ready) return;
        viewer.scene.globe.translucency.enabled = globeTransparency < 1.0;
        viewer.scene.globe.translucency.alpha = globeTransparency;
        viewer.scene.requestRender();
    }, [viewer, ready, globeTransparency]);

    // Setup tooltip handler
    useEffect(() => {
        if (!viewer || !ready) return;
        const Cesium = (window as any).Cesium;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
            const pickedObject = viewer.scene.pick(movement.endPosition);
            console.log('Picked object:', pickedObject); // Debug log
            if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
                const entity = pickedObject.id;
                const properties = entity.properties.getValue(viewer.clock.currentTime);
                console.log('Picked entity properties:', properties); // Debug log
                setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: properties });
            } else {
                setTooltip({ display: false, top: 0, left: 0, content: null });
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        eventHandlerRef.current = handler;

        return () => {
            if (eventHandlerRef.current && !eventHandlerRef.current.isDestroyed()) {
                eventHandlerRef.current.destroy();
            }
        };
    }, [viewer, ready]);

    return (
        <div className="h-full w-full relative">
            {tooltip.display && <TooltipContent data={tooltip} />}
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }} className="pointer-events-auto">
                <div>
                    <label>Globe Transparency: </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={globeTransparency}
                        onChange={(e) => setGlobeTransparency(parseFloat(e.target.value))}
                    />
                </div>
            </div>
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
                    type="gradient"
                    gradient="linear-gradient(to right, rgb(0, 255, 0), rgb(255, 0, 0))"
                    minLabel={min.toFixed(2)}
                    maxLabel={max.toFixed(2)}
                    show={true}
                />
            )}
        </div>
    );
};

export default DrillholeLayer;