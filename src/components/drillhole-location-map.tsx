"use client";

import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        Cesium: any;
    }
}

const LITHOLOGY_COLOR_MAP_CSS: { [key: string]: string } = {
    "Quartz-Feldspathic": "#FAD7A0",
    "GRSC": "#839192",
    "Granulite": "#be028fff",
    "Khondalite": "#189ad6ff",
    "Marble": "#D4E6F1",
    "Not Recovearble": "#515A5A",
    "SOIL": "#17fc73ff",
    "Schist": "#AED6F1",
    "nan": "#FFFFFF",
    "UNKNOWN": "#cccccc",
};

const Legend = ({ view, assayRange, show }: { view: 'lithology' | 'assay', assayRange: { min: number, max: number }, show: boolean }) => {
    if (!show) return null;
    return (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto">
            <h3 className="font-bold text-lg mb-2">{view === 'lithology' ? 'Lithology' : 'Assay (Graphitic Carbon)'}</h3>
            {view === 'lithology' ? (
                <ul className="space-y-1">
                    {Object.entries(LITHOLOGY_COLOR_MAP_CSS).map(([name, color]) => (
                        (name !== 'nan' && name !== 'UNKNOWN') && (
                        <li key={name} className="flex items-center">
                            <span className="inline-block w-4 h-4 rounded-full mr-2 border border-gray-400" style={{ backgroundColor: color }}></span>
                            <span>{name}</span>
                        </li>
                        )
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center">
                    <div className="w-full h-6 rounded" style={{ background: 'linear-gradient(to right, hsl(120, 100%, 50%), hsl(0, 100%, 50%))' }}></div>
                    <div className="flex justify-between w-full text-xs mt-1">
                        <span>{assayRange.min.toFixed(2)}</span>
                        <span>{assayRange.max.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const TooltipContent = ({ data }: { data: any }) => {
    if (!data) return null;

    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none"
            style={{ top: data.top, left: data.left, transform: 'translate(15px, 15px)' }}
        >
            <p className="font-bold text-base mb-1">Hole ID: {data.content.hole_id}</p>
            <ul className="list-none space-y-1">
                <li><strong>Lat:</strong> {data.content.latitude?.toFixed(5)}</li>
                <li><strong>Lon:</strong> {data.content.longitude?.toFixed(5)}</li>
                 {data.content.lithology && <li><strong>Lithology:</strong> {data.content.lithology}</li>}
                {data.content.graphitic_carbon !== undefined && (
                    <li><strong>Avg. Graphitic Carbon:</strong> {data.content.graphitic_carbon?.toFixed(3)} %</li>
                )}
            </ul>
        </div>
    );
};

const DrillholeLocationMap = () => {
    const cesiumContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const [view, setView] = useState<'lithology' | 'assay'>('lithology');
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const [markerSize, setMarkerSize] = useState(10);
    const [colorPalette, setColorPalette] = useState('Viridis');
    const lithologyColorMapCesiumRef = useRef<any>({});

    const [colorScaleType, setColorScaleType] = useState('continuous');

    const [manualBreaks, setManualBreaks] = useState('1, 1.5, 2');

    useEffect(() => {
        let isMounted = true;
        if (typeof window === 'undefined' || !cesiumContainerRef.current) {
            return;
        }

        if (!window.Cesium) {
            console.error("Cesium is not loaded.");
            return;
        }

        const Cesium = window.Cesium;
        Object.keys(LITHOLOGY_COLOR_MAP_CSS).forEach(key => {
            lithologyColorMapCesiumRef.current[key] = Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP_CSS[key]);
        });

        const mapTilerKey = 'MQ8jhB5F57QiT1CrsiUJ';
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzMmJlZTgxYi0wMjE5LTRhYzAtYTM1ZS02NzE0MDYxMGQzODMiLCJpZCI6MzMxMTEyLCJpYXQiOjE3NTgxNzk2Njh9.oqTC-DWfZOq776pNzMR9eYnS3VA17n6y3jOcuoXkJqs';

        const imageryProvider = new Cesium.UrlTemplateImageryProvider({
            url: `https://api.maptiler.com/maps/bright-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            maximumLevel: 19,
            credit: new Cesium.Credit('')
        });

        const viewer = new Cesium.Viewer(cesiumContainerRef.current!, {
            animation: false,
            timeline: false,
            imageryProvider: imageryProvider,
            sceneMode: Cesium.SceneMode.SCENE2D,
        });
        viewerRef.current = viewer;

        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;

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

        const loadData = async () => {
            if (!viewerRef.current || viewerRef.current.isDestroyed()) {
                return;
            }
            const viewer = viewerRef.current;
            viewer.entities.removeAll();
            try {
                // Load KMZ Boundary
                const kmzDataSource = await Cesium.KmlDataSource.load("/tanga_boundary.kmz", {
                    camera: viewer.camera,
                    canvas: viewer.canvas
                });
                if (!isMounted || viewer.isDestroyed()) return;
                await viewer.dataSources.add(kmzDataSource);

                if (!isMounted || viewer.isDestroyed()) return;
                const lithologyResponse = await fetch('/lithology_data.geojson');
                if (!isMounted || viewer.isDestroyed()) return;
                const lithologyData = await lithologyResponse.json();

                if (!isMounted || viewer.isDestroyed()) return;
                const assayResponse = await fetch('/assay_data.geojson');
                if (!isMounted || viewer.isDestroyed()) return;
                const assayData = await assayResponse.json();

                if (!isMounted || viewer.isDestroyed()) return;

                const collarData = new Map<string, any>();

                lithologyData.features.forEach((feature: any) => {
                    const { hole_id } = feature.properties;
                    if (!collarData.has(hole_id)) {
                        let longitude, latitude;
                        if (feature.geometry.type === 'LineString') {
                            longitude = feature.geometry.coordinates[0][0];
                            latitude = feature.geometry.coordinates[0][1];
                        } else { // Point
                            longitude = feature.geometry.coordinates[0];
                            latitude = feature.geometry.coordinates[1];
                        }

                        collarData.set(hole_id, {
                            ...feature.properties,
                            longitude,
                            latitude,
                            lithologies: new Set(),
                            assayValues: []
                        });
                    }
                    collarData.get(hole_id).lithologies.add(feature.properties.lithology);
                });

                assayData.features.forEach((feature: any) => {
                    const { hole_id, graphitic_carbon } = feature.properties;
                    if (collarData.has(hole_id)) {
                        collarData.get(hole_id).assayValues.push(graphitic_carbon);
                    }
                });
                
                let minAvgAssay = Infinity;
                let maxAvgAssay = -Infinity;

                collarData.forEach(data => {
                    if (data.assayValues.length > 0) {
                        const sum = data.assayValues.reduce((a: number, b: number) => a + b, 0);
                        data.avgAssay = sum / data.assayValues.length;
                        if (data.avgAssay < minAvgAssay) minAvgAssay = data.avgAssay;
                        if (data.avgAssay > maxAvgAssay) maxAvgAssay = data.avgAssay;
                    } else {
                        data.avgAssay = null;
                    }
                });
                
                if (!isMounted) return;
                setAssayRange({min: minAvgAssay, max: maxAvgAssay});

                if (viewer.isDestroyed()) return;

                collarData.forEach(data => {
                    let color;
                    if (view === 'lithology') {
                        const firstLithology = data.lithologies.values().next().value;
                        color = lithologyColorMapCesiumRef.current[firstLithology] || lithologyColorMapCesiumRef.current['UNKNOWN'];
                    } else {
                        if (data.avgAssay !== null) {
                            if (colorScaleType === 'continuous') {
                                const range = maxAvgAssay - minAvgAssay;
                                const alpha = range > 0 ? (data.avgAssay - minAvgAssay) / range : 0.5;
                                color = Cesium.Color.fromHsl((1 - alpha) * 0.33, 1, 0.5);
                            } else {
                                const breaks = manualBreaks.split(',').map(Number);
                                const value = data.avgAssay;
                                let colorIndex = breaks.findIndex(b => value < b);
                                if (colorIndex === -1) colorIndex = breaks.length;
                                color = Cesium.Color.fromRandom({ alpha: 1, minimumRed: 0.2, minimumGreen: 0.2, minimumBlue: 0.2 });
                            }
                        } else {
                            color = Cesium.Color.GRAY;
                        }
                    }

                    if (viewer.isDestroyed()) return;
                    viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude),
                        point: {
                            pixelSize: markerSize,
                            color: color,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 1
                        },
                        properties: { 
                            hole_id: data.hole_id, 
                            latitude: data.latitude, 
                            longitude: data.longitude,
                            lithology: Array.from(data.lithologies).join(', '),
                            graphitic_carbon: data.avgAssay
                        }
                    });
                });
                
                if (!viewer.isDestroyed()) {
                    viewer.flyTo(viewer.entities);
                }


            } catch (error) {
                if (isMounted) {
                    console.error(`Error loading data:`, error);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
            handler.destroy();
        };
    }, [view, markerSize, colorPalette, colorScaleType, manualBreaks]);


    return (
        <div className="h-full w-full relative">
            <div ref={cesiumContainerRef} className="h-full w-full" />
            {tooltip.display && <TooltipContent data={tooltip} />}
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                    <button onClick={() => setView('lithology')} disabled={view === 'lithology'}>Lithology</button>
                    <button onClick={() => setView('assay')} disabled={view === 'assay'}>Assay</button>
                </div>
                <div>
                    <label>Marker Size: </label>
                    <input type="range" min="1" max="20" value={markerSize} onChange={(e) => setMarkerSize(Number(e.target.value))} />
                </div>
                {view === 'assay' && (
                    <div>
                        <div>
                            <label>Color Scale Type: </label>
                            <select value={colorScaleType} onChange={(e) => setColorScaleType(e.target.value)}>
                                <option value="continuous">Continuous</option>
                                <option value="discrete">Discrete</option>
                            </select>
                        </div>
                        <div>
                            <label>Color Palette: </label>
                            <select value={colorPalette} onChange={(e) => setColorPalette(e.target.value)}>
                                <option value="Viridis">Viridis</option>
                                <option value="Plasma">Plasma</option>
                                <option value="Inferno">Inferno</option>
                                <option value="Magma">Magma</option>
                                <option value="Cividis">Cividis</option>
                            </select>
                        </div>
                        {colorScaleType === 'discrete' && (
                            <div>
                                <label>Manual Breaks: </label>
                                <input type="text" value={manualBreaks} onChange={(e) => setManualBreaks(e.target.value)} />
                            </div>
                        )}
                    </div>
                )}
            </div>
            <Legend view={view} assayRange={assayRange} show={true} />
        </div>
    );
};

export default DrillholeLocationMap;