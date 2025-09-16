'use client';

import { useEffect, useRef, useState } from 'react';


declare global {
    interface Window {
        Cesium: any;
        ko: any;
    }
}

// Define the type for the view prop
type CesiumView = 'original' | 'exaggerated_kml' | 'styled_kml' | 'ion_imagery' | 'geojson_drillholes_lithology' | 'geojson_drillholes_assay' | 'tiff_overlay' | 'project_location';

interface CesiumViewerProps {
    view: CesiumView;
}

// ==============================================================================
// PROJ4-BASED COORDINATE CONVERSION
// ==============================================================================


// --- New Data Interfaces ---
interface DrillholeSegmentData {
    hole_id: string;
    x: number; // Latitude
    y: number; // Longitude
    z: number; // Surface elevation
    depth_from: number;
    depth_to: number;
}

interface LithologySegment extends DrillholeSegmentData {
    lithology: string;
}

interface AssaySegment extends DrillholeSegmentData {
    graphitic_carbon: number;
}

const LITHOLOGY_COLOR_MAP_CSS: { [key: string]: string } = {
    "Quartz-Feldspathic": "#dead5fff",
    "GRSC": "#19292aff",
    "Granulite": "#a1089aff",
    "Khondalite": "#c58fc1ff",
    "Marble": "#D4E6F1",
    "Not Recovearble": "#515A5A",
    "SOIL": "#2df27cff",
    "Schist": "#153224ff",
    "nan": "#FFFFFF",
    "UNKNOWN": "#cccccc",
};

const Legend = ({ view, assayRange, show }: { view: CesiumView, assayRange: { min: number, max: number }, show: boolean }) => {
    if (!show) return null;
    return (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto">
            <h3 className="font-bold text-lg mb-2">{view === 'geojson_drillholes_lithology' ? 'Lithology' : 'Assay (Graphitic Carbon)'}</h3>
            {view === 'geojson_drillholes_lithology' ? (
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
                <li><strong>Depth From:</strong> {data.content.depth_from?.toFixed(2)} m</li>
                <li><strong>Depth To:</strong> {data.content.depth_to?.toFixed(2)} m</li>
                {data.content.lithology && <li><strong>Lithology:</strong> {data.content.lithology}</li>}
                {data.content.graphitic_carbon !== undefined && (
                    <li><strong>Graphitic Carbon:</strong> {data.content.graphitic_carbon?.toFixed(3)} %</li>
                )}
            </ul>
        </div>
    );
};

const CesiumViewer = ({ view }: CesiumViewerProps) => {
    const cesiumContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null); // Using any for Cesium Viewer instance
    const styledKmlHandlerRef = useRef<any>(null);
    const ionImageryLayerRef = useRef<any>(null);
    const tiffOverlayLayerRef = useRef<any>(null);
    const projectLocationLayerRef = useRef<any>(null);
    const geoJsonDataSourceRef = useRef<any>(null); // To hold the GeoJSON data source
    const lastViewRef = useRef<CesiumView | null>(null);
    const kmlLabelRef = useRef<any>(null);
    const kmlBoundaryRef = useRef<any>(null);
    const lithologyColorMapCesiumRef = useRef<any>({});
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });

    // Effect for initializing the viewer
    useEffect(() => {
        console.log("CesiumViewer main useEffect triggered");
        let isMounted = true;
        if (typeof window === 'undefined' || !cesiumContainerRef.current) {
            return;
        }

        if (!window.Cesium) {
            console.error("Cesium is not loaded.");
            return;
        }
        console.log("Cesium is loaded.");

        const Cesium = window.Cesium;

        

        Object.keys(LITHOLOGY_COLOR_MAP_CSS).forEach(key => {
            lithologyColorMapCesiumRef.current[key] = Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP_CSS[key]);
        });
        console.log("CesiumViewer: Lithology color map created.");

        const mapTilerKey = 'MQ8jhB5F57QiT1CrsiUJ';
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMDFlYzZkOC00ZmQ0LTRhZDYtYjkxOC1mYzNiNzg3YWEyYWIiLCJpZCI6MzMxMTEyLCJpYXQiOjE3NTYzODcxMTh9.Wr0NYWSQJXkzlvwNerpP7k6xUQqklGQdPbUELgnw9VU';

        const imageryProvider = new Cesium.UrlTemplateImageryProvider({
            url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            maximumLevel: 19,
            credit: new Cesium.Credit('') // Credits managed globally or removed for presentation
        });

        console.log("CesiumViewer: Initializing Cesium Viewer...");
        const viewer = new Cesium.Viewer(cesiumContainerRef.current!, {
            animation: true,
            timeline: false,
            imageryProvider: imageryProvider,
        });
        viewerRef.current = viewer;
        console.log("CesiumViewer: Cesium Viewer initialized.");

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
            const pickedObject = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
                const entity = pickedObject.id;
                const properties = entity.properties.getValue(viewer.clock.currentTime);
                setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: properties });
            } else {
                setTooltip({ display: false, top: 0, left: 0, content: null });
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Hide the toolbar initially
        const toolbar = document.getElementById("cesium-toolbar");
        if(toolbar) toolbar.style.display = 'none';


        // Load initial data (KML)
        console.log("CesiumViewer: Loading KML boundaries...");
        Cesium.KmlDataSource.load('/tanga_boundary.kmz').then((kmzDataSource: any) => {
            if(isMounted && viewerRef.current && !viewerRef.current.isDestroyed()){
                console.log("CesiumViewer: Adding Tanga boundary to data sources and flying to it.");
                viewer.dataSources.add(kmzDataSource);
                viewer.flyTo(kmzDataSource);

                // Create a single label for the entire KMZ
                kmlLabelRef.current = viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(38.78, -4.8), // Approximate center
                    label: {
                        text: 'Tanga Graphite',
                        font: '16pt sans-serif',
                        fillColor: Cesium.Color.YELLOW,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        outlineWidth: 2,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -9)
                    }
                });
            }
        }).catch((error: any) => {
            console.error('CesiumViewer: Error loading KMZ file: ', error);
        });
        
        // Setup vertical exaggeration UI
        const viewModel = {
            exaggeration: 1.0,
        };
        Cesium.knockout.track(viewModel);
        if(toolbar && !Cesium.knockout.dataFor(toolbar)) {
            console.log("CesiumViewer: Applying Knockout bindings for vertical exaggeration.");
            Cesium.knockout.applyBindings(viewModel, toolbar);
            Cesium.knockout.getObservable(viewModel, 'exaggeration').subscribe(
                (value: any) => viewer.scene.verticalExaggeration = Number(value)
            );
        }


        return () => {
            isMounted = false;
            console.log("CesiumViewer: Component unmounting, destroying viewer.");
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
            handler.destroy();
        };
    }, []);

    // Effect for switching views
    useEffect(() => {
        console.log(`CesiumViewer: View changed to: ${view}`);
        if (!viewerRef.current || lastViewRef.current === view) {
            return;
        }

        const viewer = viewerRef.current;
        const Cesium = window.Cesium;
        const toolbar = document.getElementById("cesium-toolbar");

        const unloadView = async (viewName: CesiumView) => {
            console.log(`CesiumViewer: Unloading view: ${viewName}`);
            if (kmlLabelRef.current) {
                kmlLabelRef.current.show = false;
            }
            if (viewName === 'exaggerated_kml') {
                if(toolbar) toolbar.style.display = 'none';
                viewer.scene.verticalExaggeration = 1.0;
            }
            if (viewName === 'styled_kml') {
                if (styledKmlHandlerRef.current && !styledKmlHandlerRef.current.isDestroyed()) {
                    styledKmlHandlerRef.current.destroy();
                    styledKmlHandlerRef.current = null;
                }
                 const kmlDataSource = viewer.dataSources.get(0);
                 const kmlEntity = kmlDataSource?.entities.values.find((e: any) => e.polygon);
                 if(kmlEntity) kmlEntity.polygon.material = Cesium.Color.TRANSPARENT;
            }
            if (viewName === 'ion_imagery') {
                if (ionImageryLayerRef.current) {
                    viewer.imageryLayers.remove(ionImageryLayerRef.current, true);
                    ionImageryLayerRef.current = null;
                }
            }
            if (viewName === 'tiff_overlay') {
                if (tiffOverlayLayerRef.current) {
                    viewer.imageryLayers.remove(tiffOverlayLayerRef.current, true);
                    tiffOverlayLayerRef.current = null;
                }
            }
            if (viewName === 'project_location') {
                if (projectLocationLayerRef.current) {
                    viewer.imageryLayers.remove(projectLocationLayerRef.current, true);
                    projectLocationLayerRef.current = null;
                }
            }
            if (viewName.startsWith('geojson_drillholes')) {
                if (geoJsonDataSourceRef.current) {
                    viewer.dataSources.remove(geoJsonDataSourceRef.current, true);
                    geoJsonDataSourceRef.current = null;
                }
            }
        };

        const loadView = async (viewName: CesiumView) => {
            console.log(`CesiumViewer: Loading view: ${viewName}`);
            if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
            const viewer = viewerRef.current;
            const kmlDataSource = viewer.dataSources.get(0);
            if (!kmlDataSource) return;
            const kmlEntity = kmlDataSource.entities.values.find((e: any) => e.polygon);

            if (viewName === 'original') {
                if (kmlLabelRef.current) {
                    kmlLabelRef.current.show = true;
                }
                viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                    //`https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=MQ8jhB5F57QiT1CrsiUJ`
                    `https://api.maptiler.com/tiles/countries/?key=GvHUzx7jEMeTwOrsIxwV#1.0/0.00000/0.00000`
                );
                if (kmlEntity) {
                    kmlEntity.polygon.fill = false;
                    await viewer.flyTo(kmlDataSource);
                }
            } else if (viewName === 'exaggerated_kml') {
                if (!kmlEntity) return;
                viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                    `https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=MQ8jhB5F57QiT1CrsiUJ`
                );
                await viewer.flyTo(kmlEntity, {
                    duration: 3.0,
                    offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(30.0), Cesium.Math.toRadians(-45.0), 80000)
                });
                viewer.scene.verticalExaggeration = 3.0;
                if(toolbar) toolbar.style.display = 'block';
            } else if (viewName === 'styled_kml') {
                if (!kmlEntity) return;
                const originalMaterial = Cesium.Color.WHITE.withAlpha(0.5);
                kmlEntity.polygon.fill = true;
                kmlEntity.polygon.material = originalMaterial;

                await viewer.flyTo(kmlEntity, {
                    duration: 3.0,
                    offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(0.0), Cesium.Math.toRadians(-50.0), 15000)
                });

                styledKmlHandlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
                styledKmlHandlerRef.current.setInputAction((movement: any) => {
                    const pickedObject = viewer.scene.pick(movement.endPosition);
                    // Logic for highlighting (simplified)
                }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

            } else if (viewName === 'ion_imagery') {
                try {
                    const layer = await Cesium.IonImageryProvider.fromAssetId(3678736);
                    ionImageryLayerRef.current = await viewer.imageryLayers.addImageryProvider(layer);
                } catch (error: any) {
                    console.error("Error loading ION imagery:", error);
                }
            } else if (viewName === 'tiff_overlay') {
                try {
                    const provider = await Cesium.IonImageryProvider.fromAssetId(3710994);
                    await provider.readyPromise;
                    const layer = viewer.imageryLayers.addImageryProvider(provider);
                    tiffOverlayLayerRef.current = layer;
                    const rect = provider.rectangle ?? Cesium.Rectangle.fromDegrees(-180, -90, 180, 90);
                    viewer.camera.flyTo({ destination: rect, duration: 1.5 });
                } catch (err) {
                    console.error("Failed to load Ion imagery:", err);
                }
            } else if (viewName === 'project_location') {
                try {
                    const imageryProvider = new Cesium.UrlTemplateImageryProvider({
                        url: 'https://api.maptiler.com/tiles/01993d63-21f6-7dd7-b9de-1d295f7e4cbd/tiles.json?key=GvHUzx7jEMeTwOrsIxwV'
                    });
                    await imageryProvider.readyPromise;
                    const layer = viewer.imageryLayers.addImageryProvider(imageryProvider);
                    layer.alpha = 0.5; // Set transparency
                    projectLocationLayerRef.current = layer;

                    viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                        `https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=MQ8jhB5F57QiT1CrsiUJ`
                    );

                    // Fly to the location from the URL fragment
                    viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(38.95765, -4.93155, 80000), // lon, lat, height
                        orientation: {
                            heading: Cesium.Math.toRadians(0.0),
                            pitch: Cesium.Math.toRadians(-45.0),
                        },
                        duration: 3.0
                    });

                    viewer.scene.verticalExaggeration = 3.0;
                    if(toolbar) toolbar.style.display = 'block';

                } catch (err) {
                    console.error("Failed to load Project Location view:", err);
                }
            } else if (viewName.startsWith('geojson_drillholes')) {
                if (!geoJsonDataSourceRef.current) {
                    geoJsonDataSourceRef.current = new Cesium.CustomDataSource('drillholes');
                    viewer.dataSources.add(geoJsonDataSourceRef.current);
                }
                geoJsonDataSourceRef.current.entities.removeAll();

                try {
                    const isLithology = viewName === 'geojson_drillholes_lithology';
                    console.log(`CesiumViewer: Fetching data for ${viewName}`);
                    const response = await fetch(isLithology ? '/lithology_data.geojson' : '/assay_data.geojson');
                    const data = await response.json();
                    console.log("CesiumViewer: Data fetched and parsed.");
                    
                    let minAssay = Infinity, maxAssay = -Infinity;
                    if (!isLithology) {
                        data.features.forEach((feature: { properties: AssaySegment }) => {
                            const d = feature.properties;
                            if (d.graphitic_carbon < minAssay) minAssay = d.graphitic_carbon;
                            if (d.graphitic_carbon > maxAssay) maxAssay = d.graphitic_carbon;
                        });
                    }
                    setAssayRange({ min: minAssay, max: maxAssay });

                    data.features.forEach((feature: any) => {
                        if (feature.geometry.type === 'LineString') {
                            const { properties } = feature;
                            const [startCoords, endCoords] = feature.geometry.coordinates;

                            const startCartesian = Cesium.Cartesian3.fromDegrees(startCoords[0], startCoords[1], startCoords[2]);
                            const endCartesian = Cesium.Cartesian3.fromDegrees(endCoords[0], endCoords[1], endCoords[2]);

                            const length = Cesium.Cartesian3.distance(startCartesian, endCartesian);
                            if (length === 0) {
                                return; // Skip zero-length cylinders
                            }

                            let color;
                            if (isLithology) {
                                const lithology = properties.lithology;
                                color = lithologyColorMapCesiumRef.current[lithology] || lithologyColorMapCesiumRef.current['UNKNOWN'];
                            } else {
                                const carbon = properties.graphitic_carbon;
                                const range = maxAssay - minAssay;
                                const alpha = range > 0 ? (carbon - minAssay) / range : 0.5;
                                color = Cesium.Color.fromHsl((1 - alpha) * 0.33, 1, 0.5);
                            }

                            const midpoint = Cesium.Cartesian3.midpoint(startCartesian, endCartesian, new Cesium.Cartesian3());
                            const orientation = new Cesium.VelocityOrientationProperty(new Cesium.SampledPositionProperty());
                            orientation.velocity = new Cesium.ConstantProperty(Cesium.Cartesian3.subtract(endCartesian, startCartesian, new Cesium.Cartesian3()));

                            geoJsonDataSourceRef.current.entities.add({
                                position: midpoint,
                                orientation: orientation,
                                cylinder: {
                                    length: length,
                                    topRadius: 15,
                                    bottomRadius: 15,
                                    material: color,
                                },
                                properties: { ...properties, latitude: startCoords[1], longitude: startCoords[0] }
                            });
                        }
                    });

                    viewer.flyTo(geoJsonDataSourceRef.current, {
                        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 5000)
                    });

                } catch (error: any) {
                    console.error(`CesiumViewer: Error loading drillhole data:`, error);
                }
            }
        };

        const switchToView = async () => {
            if (lastViewRef.current) {
                await unloadView(lastViewRef.current);
            }
            await loadView(view);
            lastViewRef.current = view;
        };

        switchToView();

    }, [view]);


    return (
        <div className="h-full w-full relative">
            <div ref={cesiumContainerRef} className="h-full w-full" />
            <div id="cesium-toolbar" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(42, 42, 42, 0.8)', padding: '4px', borderRadius: '4px', color: 'white', zIndex: 1000, display: 'none' }}>
                <table>
                    <tbody>
                    <tr>
                        <td>Exaggeration</td>
                        <td><input type="range" min="1" max="10" step="0.1" data-bind="value: exaggeration, valueUpdate: 'input'" /></td>
                        <td><input type="text" size={5} data-bind="value: exaggeration" /></td>
                    </tr>
                </tbody></table>
            </div>
            <Legend view={view} assayRange={assayRange} show={view === 'geojson_drillholes_lithology' || view === 'geojson_drillholes_assay'} />
            {tooltip.display && <TooltipContent data={tooltip} />}
        </div>
    );
};

export default CesiumViewer;
