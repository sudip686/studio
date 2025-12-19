'use client';

import { useEffect, useRef, useState } from 'react';
import { useDataCache, DrillholeSegment } from '@/lib/data-cache';
import { useCesium } from '@/contexts/cesium-context';
import { Legend } from '@/components/ui/legend';
import { drillholeLocationMapLithologyLegendData, LITHOLOGY_COLOR_MAP_CSS } from '@/lib/constants';

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
}

// --- Helper Functions ---

const CONTINUOUS_PALETTES: { [key: string]: string[] } = {
    Viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
    Plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
    Inferno: ['#000004', '#57106e', '#b5367a', '#f1605d', '#fd9a44', '#fcfdbf'],
};

const getContinuousColor = (value: number, min: number, max: number, paletteName: string, Cesium: any) => {
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const startColor = Cesium.Color.fromCssColorString('#440154');
    const endColor = Cesium.Color.fromCssColorString('#fde725');
    return Cesium.Color.lerp(startColor, endColor, ratio, new Cesium.Color());
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
                        properties: { hole_id: data.hole_id, latitude: data.latitude, longitude: data.longitude, lithology: Array.from(data.lithologies).join(', '), graphitic_carbon: data.avgAssay }
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
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px', zIndex: 1000 }} className="pointer-events-auto">
                <label>Filter by Lithology: </label>
                <select value={lithologyFilter} onChange={(e) => setLithologyFilter(e.target.value)}>
                    {uniqueLithologies.map((lith: string) => <option key={lith} value={lith}>{lith}</option>)}
                </select>
            </div>
            <Legend
                title={drillholeLocationMapLithologyLegendData.title}
                type="categorical"
                items={drillholeLocationMapLithologyLegendData.items}
                show={true}
            />
        </>
    );
}

interface AssayMapViewProps {
    viewer: any;
    ready: boolean;
    processedData: Map<string, ProcessedDrillhole>;
    assayRange: { min: number; max: number };
}

function AssayMapView({ viewer, ready, processedData, assayRange }: AssayMapViewProps) {
    const [assayFilterValue, setAssayFilterValue] = useState(0);
    const [scaleType, setScaleType] = useState<'continuous' | 'discrete'>('continuous');
    const [continuousPalette, setContinuousPalette] = useState('Viridis');
    const [manualBreaks, setManualBreaks] = useState('1, 1.5, 2');
    const entitiesRef = useRef<any[]>([]);

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

                if (!(assayFilterValue > 0 && (data.avgAssay === null || data.avgAssay < assayFilterValue))) {
                    let color;
                    if (data.avgAssay !== null) {
                        if (scaleType === 'continuous') {
                            if (Number.isFinite(data.avgAssay)) {
                                color = getContinuousColor(data.avgAssay, assayRange.min, assayRange.max, continuousPalette, Cesium);
                            }
                        } else {
                            const breaks = manualBreaks.split(',').map(Number);
                            const value = data.avgAssay;
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
                            pixelSize: 20,
                            color,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 1,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        properties: { hole_id: data.hole_id, latitude: data.latitude, longitude: data.longitude, lithology: Array.from(data.lithologies).join(', '), graphitic_carbon: data.avgAssay }
                    });
                    viewer.entities.add(entity);
                    entitiesRef.current.push(entity);
                    plotted++;
                }
            });
            console.log(`[DrillholeLocationMap] plotted=${plotted} mode=assay`);
        })();

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                entitiesRef.current.forEach(entity => viewer.entities.remove(entity));
            }
        };
    }, [viewer, ready, processedData, assayFilterValue, scaleType, continuousPalette, manualBreaks, assayRange]);

    return (
        <>
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }} className="pointer-events-auto">
                <div>
                    <label>Min. Graphitic Carbon (%): </label>
                    <input type="number" min="0" step="0.5" value={assayFilterValue} onChange={(e) => setAssayFilterValue(Number(e.target.value))} />
                </div>
                <div>
                    <label>Scale Type: </label>
                    <button onClick={() => setScaleType('continuous')} disabled={scaleType === 'continuous'}>Continuous</button>
                    <button onClick={() => setScaleType('discrete')} disabled={scaleType === 'discrete'}>Discrete</button>
                </div>
                {scaleType === 'continuous' && (
                    <div>
                        <label>Continuous Color Scale: </label>
                        <select value={continuousPalette} onChange={(e) => setContinuousPalette(e.target.value)}>
                            <option value="Viridis">Viridis</option>
                            <option value="Plasma">Plasma</option>
                            <option value="Inferno">Inferno</option>
                        </select>
                    </div>
                )}
                {scaleType === 'discrete' && (
                    <div>
                        <label>Interval Breaks (comma-separated): </label>
                        <input type="text" value={manualBreaks} onChange={(e) => setManualBreaks(e.target.value)} />
                    </div>
                )}
            </div>
            <Legend
                title="Avg. Assay (Graphitic Carbon)"
                type="gradient"
                gradient={`linear-gradient(to right, ${(CONTINUOUS_PALETTES[continuousPalette] || CONTINUOUS_PALETTES['Viridis']).join(', ')})`}
                minLabel={assayRange.min.toFixed(2)}
                maxLabel={assayRange.max.toFixed(2)}
                show={true}
            />
        </>
    );
}


// --- Main Component ---

interface DrillholeLocationMapProps {
    displayMode: 'lithology' | 'assay';
}

const DrillholeLocationMap = ({ displayMode }: DrillholeLocationMapProps) => {
    const { viewer, ready } = useCesium();
    const { drillholeData } = useDataCache();
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [processedData, setProcessedData] = useState<Map<string, ProcessedDrillhole>>(new Map());
    const [uniqueLithologies, setUniqueLithologies] = useState<string[]>(['All']);
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const hasFlownRef = useRef(false);

    // Data Processing Hook
    useEffect(() => {
        if (!drillholeData) return;

        const collarData = new Map<string, ProcessedDrillhole>();
        const processSegment = (segment: DrillholeSegment) => {
            const { hole_id, lon, lat } = segment;
            if (!collarData.has(hole_id)) {
                collarData.set(hole_id, {
                    hole_id, longitude: lon, latitude: lat, lithologies: new Set(), assayValues: [] as number[], avgAssay: null
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
        
        let minAvgAssay = Infinity, maxAvgAssay = -Infinity;
        collarData.forEach((data: ProcessedDrillhole) => {
            if (data.assayValues.length > 0) {
                const sum = data.assayValues.reduce((a: number, b: number) => a + b, 0);
                data.avgAssay = sum / data.assayValues.length;
                if (data.avgAssay < minAvgAssay) minAvgAssay = data.avgAssay;
                if (data.avgAssay > maxAvgAssay) maxAvgAssay = data.avgAssay;
            } else {
                data.avgAssay = null;
            }
        });
        
        if (minAvgAssay === Infinity || maxAvgAssay === -Infinity) {
            setAssayRange({ min: 0, max: 1 });
        } else if (minAvgAssay === maxAvgAssay) {
            setAssayRange({ min: Math.max(0, minAvgAssay - 0.5), max: maxAvgAssay + 0.5 });
        } else {
            setAssayRange({ min: minAvgAssay, max: maxAvgAssay });
        }

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
        <div className="h-full w-full relative">
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
                    assayRange={assayRange}
                />
            )}
        </div>
    );
};

export default DrillholeLocationMap;
