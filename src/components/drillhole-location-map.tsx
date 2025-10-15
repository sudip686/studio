'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import Legend from '@/components/ui/legend';
import { drillholeLocationMapLithologyLegendData, LITHOLOGY_COLOR_MAP_CSS } from '@/lib/legend-definitions';

declare global {
    interface Window {
        Cesium: any;
    }
}



const CONTINUOUS_PALETTES: { [key: string]: string[] } = {
    Viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
    Plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
    Inferno: ['#000004', '#57106e', '#b5367a', '#f1605d', '#fd9a44', '#fcfdbf'],
};

const getContinuousColor = (value: number, min: number, max: number, paletteName: string, Cesium: any) => {
    const palette = CONTINUOUS_PALETTES[paletteName];
    if (!palette) return Cesium.Color.GRAY;

    const ratio = (value - min) / (max - min);
    const index = Math.min(Math.floor(ratio * (palette.length - 1)), palette.length - 2);
    const localRatio = (ratio - (index / (palette.length - 1))) * (palette.length - 1);

    const startColor = Cesium.Color.fromCssColorString(palette[index]);
    const endColor = Cesium.Color.fromCssColorString(palette[index + 1]);

    return Cesium.Color.lerp(startColor, endColor, localRatio, new Cesium.Color());
};




interface TooltipContentProps {
    data: any;
}

const TooltipContent = ({ data }: TooltipContentProps) => {
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

interface DrillholeLocationMapProps {
    displayMode: 'lithology' | 'assay';
}

const DrillholeLocationMap = ({ displayMode }: DrillholeLocationMapProps) => {
    const { viewer, isLoaded } = useCesium();
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const [markerSize, setMarkerSize] = useState(10);
    const [scaleType, setScaleType] = useState<'continuous' | 'discrete'>('continuous');
    const [continuousPalette, setContinuousPalette] = useState('Viridis');
    const [manualBreaks, setManualBreaks] = useState('1, 1.5, 2');

    const [lithologyFilter, setLithologyFilter] = useState('All');
    const [assayFilterValue, setAssayFilterValue] = useState(0);
    const [uniqueLithologies, setUniqueLithologies] = useState<string[]>(['All']);

    const componentItems = useRef<any[]>([]);
    const eventHandlerRef = useRef<any>(null);
    const lithologyColorMapCesiumRef = useRef<any>({});

    useEffect(() => {
        if (!isLoaded || !viewer) return;

        let isMounted = true;
        const Cesium = window.Cesium;

        const cleanup = () => {
            componentItems.current.forEach(item => {
                if (viewer.dataSources.contains(item)) {
                    viewer.dataSources.remove(item, true);
                } else if (viewer.entities.contains(item)) {
                    viewer.entities.remove(item);
                }
            });
            componentItems.current = [];
            if (eventHandlerRef.current && !eventHandlerRef.current.isDestroyed()) {
                eventHandlerRef.current.destroy();
            }
            if (viewer && !viewer.isDestroyed()) {
                viewer.scene.mode = Cesium.SceneMode.SCENE3D; // Reset to 3D
            }
        };

        cleanup();

        // Set viewer to 2D mode
        viewer.scene.mode = Cesium.SceneMode.SCENE2D;
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;

        Object.keys(LITHOLOGY_COLOR_MAP_CSS).forEach(key => {
            lithologyColorMapCesiumRef.current[key] = Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP_CSS[key]);
        });

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
            const pickedObject = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
                const entity = pickedObject.id;
                const properties = entity.properties.getValue(viewer.clock.currentTime);
                if (isMounted) {
                    setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: properties });
                }
            } else {
                if (isMounted) {
                    setTooltip({ display: false, top: 0, left: 0, content: null });
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        eventHandlerRef.current = handler;

        const loadData = async () => {
            try {
                const kmzDataSource = await Cesium.KmlDataSource.load("/tanga_boundary.kmz");
                if (!isMounted || viewer.isDestroyed()) return;
                viewer.dataSources.add(kmzDataSource);
                componentItems.current.push(kmzDataSource);

                const [lithologyResponse, assayResponse] = await Promise.all([
                    fetch('/lithology_data.geojson'),
                    fetch('/assay_data.geojson')
                ]);
                if (!isMounted) return;
                const [lithologyData, assayData] = await Promise.all([lithologyResponse.json(), assayResponse.json()]);
                if (!isMounted) return;

                const allLithologies = new Set<string>();
                lithologyData.features.forEach((feature: any) => {
                    if(feature.properties.lithology) {
                        allLithologies.add(feature.properties.lithology);
                    }
                });
                if (isMounted) {
                    setUniqueLithologies(['All', ...Array.from(allLithologies).sort()]);
                }

                const collarData = new Map<string, any>();
                lithologyData.features.forEach((feature: any) => {
                    const { hole_id } = feature.properties;
                    if (!collarData.has(hole_id)) {
                        let longitude, latitude;
                        if (feature.geometry.type === 'LineString') {
                            [longitude, latitude] = feature.geometry.coordinates[0];
                        } else { 
                            [longitude, latitude] = feature.geometry.coordinates;
                        }
                        collarData.set(hole_id, { ...feature.properties, longitude, latitude, lithologies: new Set(), assayValues: [] });
                    }
                    collarData.get(hole_id).lithologies.add(feature.properties.lithology);
                });

                assayData.features.forEach((feature: any) => {
                    const { hole_id, graphitic_carbon } = feature.properties;
                    if (collarData.has(hole_id)) collarData.get(hole_id).assayValues.push(graphitic_carbon);
                });
                
                let minAvgAssay = Infinity, maxAvgAssay = -Infinity;
                collarData.forEach(data => {
                    if (data.assayValues.length > 0) {
                        const sum = data.assayValues.reduce((a: number, b: number) => a + b, 0);
                        data.avgAssay = sum / data.assayValues.length;
                        if (data.avgAssay < minAvgAssay) minAvgAssay = data.avgAssay;
                        if (data.avgAssay > maxAvgAssay) maxAvgAssay = data.avgAssay;
                    } else { data.avgAssay = null; }
                });
                
                if (!isMounted) return;
                setAssayRange({min: minAvgAssay, max: maxAvgAssay});

                const entitiesToAdd: any[] = [];
                collarData.forEach(data => {
                    // LITHOLOGY FILTER
                    if (displayMode === 'lithology' && lithologyFilter !== 'All') {
                        if (!data.lithologies.has(lithologyFilter)) {
                            return; // Skip this entity
                        }
                    }

                    // ASSAY FILTER
                    if (displayMode === 'assay' && assayFilterValue > 0) {
                        if (data.avgAssay === null || data.avgAssay < assayFilterValue) {
                            return; // Skip this entity
                        }
                    }

                    let color;
                    if (displayMode === 'lithology') {
                        const firstLithology = data.lithologies.values().next().value;
                        color = lithologyColorMapCesiumRef.current[firstLithology] || lithologyColorMapCesiumRef.current['UNKNOWN'];
                    } else { // displayMode === 'assay'
                        if (data.avgAssay !== null) {
                            if (scaleType === 'continuous') {
                                color = getContinuousColor(data.avgAssay, minAvgAssay, maxAvgAssay, continuousPalette, Cesium);
                            } else {
                                // Discrete color logic
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
                    }
                    const entity = new Cesium.Entity({
                        position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude),
                        point: { pixelSize: markerSize, color: color, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 },
                        properties: { hole_id: data.hole_id, latitude: data.latitude, longitude: data.longitude, lithology: Array.from(data.lithologies).join(', '), graphitic_carbon: data.avgAssay }
                    });
                    entitiesToAdd.push(entity);
                });
                
                if (isMounted && !viewer.isDestroyed()) {
                    entitiesToAdd.forEach(entity => {
                        viewer.entities.add(entity);
                        componentItems.current.push(entity);
                    });
                    viewer.flyTo(componentItems.current);
                }

            } catch (error) {
                if (isMounted) console.error(`Error loading data:`, error);
            }
        };

        loadData();

        return () => {
            isMounted = false;
            cleanup();
        };
    }, [isLoaded, viewer, displayMode, markerSize, scaleType, continuousPalette, manualBreaks, lithologyFilter, assayFilterValue]);

    return (
        <div className="h-full w-full relative pointer-events-none">
            {tooltip.display && <TooltipContent data={tooltip} />}
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }} className="pointer-events-auto">
                <div>
                    <label>Marker Size: </label>
                    <input type="range" min="1" max="20" value={markerSize} onChange={(e) => setMarkerSize(Number(e.target.value))} />
                </div>

                {displayMode === 'lithology' && (
                    <div>
                        <label>Filter by Lithology: </label>
                        <select value={lithologyFilter} onChange={(e) => setLithologyFilter(e.target.value)}>
                            {uniqueLithologies.map(lith => <option key={lith} value={lith}>{lith}</option>)}
                        </select>
                    </div>
                )}

                {displayMode === 'assay' && (
                    <>
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
                                <select value="Viridis" onChange={(e) => setContinuousPalette(e.target.value)}>
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
                    </>
                )}
            </div>
                        {displayMode === 'lithology' ? (
                <Legend
                    title={drillholeLocationMapLithologyLegendData.title}
                    type="categorical"
                    items={drillholeLocationMapLithologyLegendData.items}
                    show={true}
                />
            ) : (
                <Legend
                    title="Avg. Assay (Graphitic Carbon)"
                    type="gradient"
                    gradient={`linear-gradient(to right, ${(CONTINUOUS_PALETTES[continuousPalette] || CONTINUOUS_PALETTES['Viridis']).join(', ')})`}
                    minLabel={assayRange.min.toFixed(2)}
                    maxLabel={assayRange.max.toFixed(2)}
                    show={true}
                />
            )}
        </div>
    );
};

export default DrillholeLocationMap;
