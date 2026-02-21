'use client';

import { useEffect, useRef, useState } from 'react';
import { useDataCache, DrillholeSegment } from '@/lib/data-cache';
import { useCesium } from '@/contexts/cesium-context';
import { Legend } from '@/components/ui/legend';
import { OverlaySlot } from '@/ui/overlays';
import { drillholeLocationMapLithologyLegendData, LITHOLOGY_COLOR_MAP_CSS } from '@/lib/constants';
import IonKmlLayer from '@/components/IonKmlLayer';

declare global {
    interface Window {
        Cesium: any;
    }
}

// --- Type Definitions ---

interface ProcessedDrillhole {
    hole_id: string;
    longitude: number;
    latitude: number;
    lithologies: Set<string>;
    assayValues: number[];
    avgAssay: number | null;
    maxAssay: number | null;
}

// --- Helper Functions ---

const CONTINUOUS_PALETTES: { [key: string]: string[] } = {
    Viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
    Plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
    Inferno: ['#000004', '#57106e', '#b5367a', '#f1605d', '#fd9a44', '#fcfdbf'],
};

const getContinuousColor = (value: number, min: number, max: number, paletteName: string, Cesium: any) => {
    const palette = CONTINUOUS_PALETTES[paletteName] || CONTINUOUS_PALETTES['Viridis'];
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    
    // Map ratio to segments
    const segmentCount = palette.length - 1;
    const index = Math.min(Math.floor(ratio * segmentCount), segmentCount - 1);
    const startColorHex = palette[index];
    const endColorHex = palette[index + 1];
    
    // Local ratio within the segment
    const localRatio = (ratio * segmentCount) - index;

    const startColor = Cesium.Color.fromCssColorString(startColorHex);
    const endColor = Cesium.Color.fromCssColorString(endColorHex);
    
    return Cesium.Color.lerp(startColor, endColor, localRatio, new Cesium.Color());
};

const norm = (s: any) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// --- UI Components ---

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
                {data.content.max_graphitic_carbon !== undefined && (
                    <li><strong>Max. Graphitic Carbon:</strong> {data.content.max_graphitic_carbon?.toFixed(3)} %</li>
                )}
            </ul>
        </div>
    );
};

// --- View-Specific Components ---

interface LithologyMapViewProps {
    viewer: any;
    ready: boolean;
    processedData: Map<string, ProcessedDrillhole>;
    uniqueLithologies: string[];
}

function LithologyMapView({ viewer, ready, processedData, uniqueLithologies }: LithologyMapViewProps) {
    const [lithologyFilter, setLithologyFilter] = useState('All');
    const entitiesRef = useRef<any[]>([]);
    const lithologyColorMapCesiumRef = useRef<any>({});

    useEffect(() => {
        if (!viewer || !ready || processedData.size === 0) return;
        const Cesium = window.Cesium;

        Object.keys(LITHOLOGY_COLOR_MAP_CSS).forEach(key => {
            const k = norm(key);
            lithologyColorMapCesiumRef.current[k] = Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP_CSS[key]);
        });
        lithologyColorMapCesiumRef.current.unknown = Cesium.Color.WHITE;

        (async () => {
            const positions = Array.from(processedData.values()).map(c => Cesium.Cartographic.fromDegrees(c.longitude, c.latitude));
            const clamped = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions);

            entitiesRef.current.forEach(entity => viewer.entities.remove(entity));
            entitiesRef.current = [];

            let plotted = 0;
            Array.from(processedData.values()).forEach((data: ProcessedDrillhole, i) => {
                const hTop = Number(clamped[i]?.height ?? 0);
                if (typeof data.longitude !== 'number' || typeof data.latitude !== 'number' || !Number.isFinite(data.longitude) || !Number.isFinite(data.latitude)) return;

                const wantAll = lithologyFilter === 'All';
                const wantOne = !wantAll && data.lithologies.has(norm(lithologyFilter));

                if (data.lithologies.size > 0 && (wantAll || wantOne)) {
                    const firstLithology = data.lithologies.values().next().value as string;
                    const key = norm(firstLithology);
                    const color = lithologyColorMapCesiumRef.current[key] ?? lithologyColorMapCesiumRef.current.unknown;

                    const entity = new Cesium.Entity({
                        position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, hTop),
                        point: {
                            pixelSize: 20,
                            color,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 1,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        properties: { hole_id: data.hole_id, latitude: data.latitude, longitude: data.longitude, lithology: Array.from(data.lithologies).join(', '), graphitic_carbon: data.avgAssay, max_graphitic_carbon: data.maxAssay }
                    });
                    viewer.entities.add(entity);
                    entitiesRef.current.push(entity);
                    plotted++;
                }
            });
            console.log(`[DrillholeLocationMap] plotted=${plotted} mode=lithology`);
        })();

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                entitiesRef.current.forEach(entity => viewer.entities.remove(entity));
            }
        };
    }, [viewer, ready, processedData, lithologyFilter]);

    return (
        <>
            <OverlaySlot slot="top-right" wrapperClassName="w-[320px] flex flex-col items-end">
              <div className="pointer-events-auto p-4 rounded-2xl backdrop-blur-md bg-black/60 border border-white/15 shadow-2xl max-w-xs">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-white/90 drop-shadow-sm">Filter by Lithology</label>
                    <select
                        value={lithologyFilter}
                        onChange={(e) => setLithologyFilter(e.target.value)}
                        className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    >
                        {uniqueLithologies.map((lith: string) => (
                            <option key={lith} value={lith}>{lith}</option>
                        ))}
                    </select>
                </div>
              </div>
            </OverlaySlot>
            <OverlaySlot slot="bottom-left">
              <Legend
                  title={drillholeLocationMapLithologyLegendData.title}
                  type="categorical"
                  items={drillholeLocationMapLithologyLegendData.items}
                  show={true}
              />
            </OverlaySlot>
        </>
    );
}

interface AssayMapViewProps {
    viewer: any;
    ready: boolean;
    processedData: Map<string, ProcessedDrillhole>;
    ranges: { avg: { min: number, max: number }, max: { min: number, max: number } };
}

function AssayMapView({ viewer, ready, processedData, ranges }: AssayMapViewProps) {
    const [assayFilterValue, setAssayFilterValue] = useState(0);
    const [metric, setMetric] = useState<'average' | 'max'>('max');
    const [scaleType, setScaleType] = useState<'continuous' | 'discrete'>('continuous');
    const [continuousPalette, setContinuousPalette] = useState('Viridis');
    const [manualBreaks, setManualBreaks] = useState('1, 1.5, 2');
    const [pointSize, setPointSize] = useState(20);
    const entitiesRef = useRef<any[]>([]);

    const currentRange = ranges[metric === 'average' ? 'avg' : 'max'];

    useEffect(() => {
        if (!viewer || !ready || processedData.size === 0) return;
        const Cesium = window.Cesium;

        (async () => {
            const positions = Array.from(processedData.values()).map(c => Cesium.Cartographic.fromDegrees(c.longitude, c.latitude));
            const clamped = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions);

            entitiesRef.current.forEach(entity => viewer.entities.remove(entity));
            entitiesRef.current = [];

            let plotted = 0;
            Array.from(processedData.values()).forEach((data: ProcessedDrillhole, i) => {
                const hTop = Number(clamped[i]?.height ?? 0);
                if (typeof data.longitude !== 'number' || typeof data.latitude !== 'number' || !Number.isFinite(data.longitude) || !Number.isFinite(data.latitude)) return;

                const value = metric === 'average' ? data.avgAssay : data.maxAssay;

                if (!(assayFilterValue > 0 && (value === null || value < assayFilterValue))) {
                    let color;
                    if (value !== null) {
                        if (scaleType === 'continuous') {
                            if (Number.isFinite(value)) {
                                color = getContinuousColor(value, currentRange.min, currentRange.max, continuousPalette, Cesium);
                            }
                        } else {
                            const breaks = manualBreaks.split(',').map(Number);
                            let breakIndex = breaks.findIndex(b => value <= b);
                            if (breakIndex === -1) breakIndex = breaks.length;
                            const palette = CONTINUOUS_PALETTES[continuousPalette] || CONTINUOUS_PALETTES['Viridis'];
                            color = Cesium.Color.fromCssColorString(palette[breakIndex % palette.length]);
                        }
                    } else {
                        color = Cesium.Color.GRAY;
                    }

                    const entity = new Cesium.Entity({
                        position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, hTop),
                        point: {
                            pixelSize: pointSize,
                            color,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 1,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        properties: { hole_id: data.hole_id, latitude: data.latitude, longitude: data.longitude, lithology: Array.from(data.lithologies).join(', '), graphitic_carbon: data.avgAssay, max_graphitic_carbon: data.maxAssay }
                    });
                    viewer.entities.add(entity);
                    entitiesRef.current.push(entity);
                    plotted++;
                }
            });
            console.log(`[DrillholeLocationMap] plotted=${plotted} mode=assay metric=${metric}`);
        })();

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                entitiesRef.current.forEach(entity => viewer.entities.remove(entity));
            }
        };
    }, [viewer, ready, processedData, assayFilterValue, scaleType, continuousPalette, manualBreaks, currentRange, metric, pointSize]);

    return (
        <>
            <OverlaySlot slot="top-right" wrapperClassName="w-[320px] flex flex-col items-end">
              <div className="pointer-events-auto flex flex-col gap-3 p-4 rounded-2xl backdrop-blur-md bg-black/60 border border-white/15 shadow-2xl max-w-xs">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-white/90 drop-shadow-sm">Metric</label>
                    <select
                        value={metric}
                        onChange={(e) => setMetric(e.target.value as 'average' | 'max')}
                        className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    >
                        <option value="max">Maximum</option>
                        <option value="average">Average</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-white/90 drop-shadow-sm">Point Size: {pointSize}px</label>
                    <input
                        type="range"
                        min="5"
                        max="50"
                        value={pointSize}
                        onChange={(e) => setPointSize(Number(e.target.value))}
                        className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer range-slider"
                        style={{
                            background: `linear-gradient(to right, #f97316 0%, #f97316 ${(pointSize - 5) / (50 - 5) * 100}%, rgba(0,0,0,0.3) ${(pointSize - 5) / (50 - 5) * 100}%, rgba(0,0,0,0.3) 100%)`
                        }}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-white/90 drop-shadow-sm">Min. Graphitic Carbon (%)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={assayFilterValue}
                        onChange={(e) => setAssayFilterValue(Number(e.target.value))}
                        className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-white/90 drop-shadow-sm">Scale Type</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setScaleType('continuous')}
                            disabled={scaleType === 'continuous'}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                scaleType === 'continuous'
                                    ? 'bg-orange-500 text-white shadow-lg'
                                    : 'bg-black/40 text-white/70 border border-white/20 hover:bg-black/60'
                            }`}
                        >
                            Continuous
                        </button>
                        <button
                            onClick={() => setScaleType('discrete')}
                            disabled={scaleType === 'discrete'}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                scaleType === 'discrete'
                                    ? 'bg-orange-500 text-white shadow-lg'
                                    : 'bg-black/40 text-white/70 border border-white/20 hover:bg-black/60'
                            }`}
                        >
                            Discrete
                        </button>
                    </div>
                </div>

                {scaleType === 'continuous' && (
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-white/90 drop-shadow-sm">Color Palette</label>
                        <select
                            value={continuousPalette}
                            onChange={(e) => setContinuousPalette(e.target.value)}
                            className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        >
                            <option value="Viridis">Viridis</option>
                            <option value="Plasma">Plasma</option>
                            <option value="Inferno">Inferno</option>
                        </select>
                    </div>
                )}

                {scaleType === 'discrete' && (
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-white/90 drop-shadow-sm">Interval Breaks</label>
                        <input
                            type="text"
                            value={manualBreaks}
                            onChange={(e) => setManualBreaks(e.target.value)}
                            placeholder="1, 1.5, 2"
                            className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        />
                    </div>
                )}
              </div>
            </OverlaySlot>
            <OverlaySlot slot="bottom-left">
              <Legend
                  title={`${metric === 'average' ? 'Avg.' : 'Max.'} Assay (Graphitic Carbon)`}
                  type="gradient"
                  gradient={`linear-gradient(to right, ${(CONTINUOUS_PALETTES[continuousPalette] || CONTINUOUS_PALETTES['Viridis']).join(', ')})`}
                  minLabel={currentRange.min.toFixed(2)}
                  maxLabel={currentRange.max.toFixed(2)}
                  show={true}
              />
            </OverlaySlot>
        </>
    );
}


// --- Main Component ---

interface DrillholeLocationMapProps {
    displayMode: 'lithology' | 'assay';
    imageryAlpha?: number;
}

const DrillholeLocationMap = ({ displayMode }: DrillholeLocationMapProps) => {
    const { viewer, ready } = useCesium();
    const { drillholeData } = useDataCache();
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [processedData, setProcessedData] = useState<Map<string, ProcessedDrillhole>>(new Map());
    const [uniqueLithologies, setUniqueLithologies] = useState<string[]>(['All']);
    const [ranges, setRanges] = useState<{ avg: { min: number, max: number }, max: { min: number, max: number } }>({ avg: { min: 0, max: 1 }, max: { min: 0, max: 1 } });
    const hasFlownRef = useRef(false);

    // Data Processing Hook
    useEffect(() => {
        console.log('[DrillholeLocationMap] drillholeData:', drillholeData);
        if (!drillholeData) return;

        const collarData = new Map<string, ProcessedDrillhole>();
        const processSegment = (segment: DrillholeSegment) => {
            const { hole_id, lon, lat } = segment;
            if (!collarData.has(hole_id)) {
                collarData.set(hole_id, {
                    hole_id, longitude: lon, latitude: lat, lithologies: new Set(), assayValues: [] as number[], avgAssay: null, maxAssay: null
                });
            }
            return collarData.get(hole_id)!;
        };

        drillholeData.lithology.forEach((segment: DrillholeSegment) => {
            const data = processSegment(segment);
            if (segment.lithology) data.lithologies.add(norm(segment.lithology));
        });

        drillholeData.assay.forEach((segment: DrillholeSegment) => {
            const data = processSegment(segment);
            const value = segment.graphitic_carbon;
            if (value !== undefined && value !== null && Number.isFinite(Number(value))) {
                data.assayValues.push(Number(value));
            }
        });
        
        let minAvg = Infinity, maxAvg = -Infinity;
        let minMax = Infinity, maxMax = -Infinity;

        collarData.forEach((data: ProcessedDrillhole) => {
            if (data.assayValues.length > 0) {
                const sum = data.assayValues.reduce((a: number, b: number) => a + b, 0);
                data.avgAssay = sum / data.assayValues.length;
                data.maxAssay = Math.max(...data.assayValues);

                if (data.avgAssay < minAvg) minAvg = data.avgAssay;
                if (data.avgAssay > maxAvg) maxAvg = data.avgAssay;
                if (data.maxAssay < minMax) minMax = data.maxAssay;
                if (data.maxAssay > maxMax) maxMax = data.maxAssay;
            } else {
                data.avgAssay = null;
                data.maxAssay = null;
            }
        });
        
        const calcRange = (min: number, max: number) => {
             if (min === Infinity || max === -Infinity) return { min: 0, max: 1 };
             if (min === max) return { min: Math.max(0, min - 0.5), max: max + 0.5 };
             return { min, max };
        };

        setRanges({
            avg: calcRange(minAvg, maxAvg),
            max: calcRange(minMax, maxMax)
        });

        setProcessedData(collarData);

        const allLithologies = new Set<string>();
        drillholeData.lithology.forEach((f: DrillholeSegment) => {
            if (f.lithology) allLithologies.add(norm(f.lithology));
        });
        setUniqueLithologies(['All', ...Array.from(allLithologies).sort()]);
    }, [drillholeData]);

    // Tooltip Hook
    useEffect(() => {
        if (!viewer || !ready) return;
        const Cesium = window.Cesium;
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction((movement: any) => {
            const picked = viewer.scene.pick(movement.endPosition);
            if (!picked) {
                if (tooltip.display) setTooltip({ display: false, top: 0, left: 0, content: null });
                return;
            }
            if (Cesium.defined(picked.id) && picked.id?.properties) {
                const props = picked.id.properties.getValue(viewer.clock.currentTime);
                setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: props });
            } else {
                if (tooltip.display) setTooltip({ display: false, top: 0, left: 0, content: null });
            }
            viewer.scene.requestRender();
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        return () => { if (!handler.isDestroyed()) handler.destroy(); };
    }, [viewer, ready, tooltip.display]);

    // Fly-to-entities Hook
    useEffect(() => {
        if (viewer && processedData.size > 0 && !hasFlownRef.current) {
            const entities: any[] = [];
            viewer.entities.values.forEach((entity: any) => {
                if(entity.point) entities.push(entity);
            });
            if (entities.length > 0) {
                viewer.flyTo(entities);
                hasFlownRef.current = true;
            }
        }
    }, [viewer, processedData, displayMode]); // Rerun fly-to when mode changes if needed

    return (
        <div className="h-full w-full relative pointer-events-none">
            <IonKmlLayer assetId={4310565} />
            {tooltip.display && <TooltipContent data={tooltip} />}
            
            {displayMode === 'lithology' ? (
                <LithologyMapView 
                    viewer={viewer} 
                    ready={ready} 
                    processedData={processedData}
                    uniqueLithologies={uniqueLithologies}
                />
            ) : (
                <AssayMapView 
                    viewer={viewer}
                    ready={ready}
                    processedData={processedData}
                    ranges={ranges}
                />
            )}
        </div>
    );
};

export default DrillholeLocationMap;
