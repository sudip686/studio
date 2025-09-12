"use client";

import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        Cesium: any;
    }
}

// Define the type for the view prop
type GeoView = 'lithology' | 'assay';

interface GeospatialViewerProps {}

// ==============================================================================
// DATA-DRIVEN COORDINATE CONVERSION
// ==============================================================================


const LITHOLOGY_COLOR_MAP_CSS: { [key: string]: string } = {
    "Quartz-Feldspathic": "#e1f6f3ff",
    "GRSC": "#4c54549c",
    "Granulite": "#b90b79ff",
    "Khondalite": "#433e43ff",
    "Marble": "#D4E6F1",
    "Not Recovearble": "#0b1414ff",
    "SOIL": "#70f35fff",
    "Schist": "#445751ff",
    "nan": "#FFFFFF",
    "UNKNOWN": "#cccccc",
};

const Legend = ({ view, assayRange }: { view: GeoView, assayRange: { min: number, max: number } }) => {
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

const GeospatialViewer = ({}: GeospatialViewerProps) => {
    console.log("GeospatialViewer component rendered");
    const cesiumContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const [view, setView] = useState<GeoView>('lithology');
    const geoJsonDataSourceRef = useRef<any>(null);
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const lithologyColorMapCesiumRef = useRef<any>({});

    useEffect(() => {
        console.log("GeospatialViewer main useEffect triggered");
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
        console.log("Lithology color map created.");

        const mapTilerKey = 'MQ8jhB5F57QiT1CrsiUJ';
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMDFlYzZkOC00ZmQ0LTRhZDYtYjkxOC1mYzNiNzg3YWEyYWIiLCJpZCI6MzMxMTEyLCJpYXQiOjE3NTYzODcxMTh9.Wr0NYWSQJXkzlvwNerpP7k6xUQqklGQdPbUELgnw9VU';

        const imageryProvider = new Cesium.UrlTemplateImageryProvider({
            url: `https://api.maptiler.com/maps/bright-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            maximumLevel: 19,
            credit: new Cesium.Credit('')
        });

        console.log("Initializing Cesium Viewer...");
        const viewer = new Cesium.Viewer(cesiumContainerRef.current!, {
            animation: false,
            timeline: false,
            imageryProvider: imageryProvider,
        });
        viewerRef.current = viewer;
        console.log("Cesium Viewer initialized.");

        // Load KML boundaries
        console.log("Loading KML boundaries...");
        Cesium.KmlDataSource.load('/mining_license_boundary.kml').then((dataSource: any) => {
            if (isMounted && viewerRef.current && !viewerRef.current.isDestroyed()) {
                console.log("Adding mining license boundary to data sources.");
                viewerRef.current.dataSources.add(dataSource);
            }
        }).catch((error: any) => {
            console.error('Error loading KML file: ', error);
        });

        Cesium.KmlDataSource.load('/tanga_boundary.kmz').then((dataSource: any) => {
            if (isMounted && viewerRef.current && !viewerRef.current.isDestroyed()) {
                console.log("Adding Tanga boundary to data sources and flying to it.");
                viewerRef.current.dataSources.add(dataSource);
                viewerRef.current.flyTo(dataSource, {
                    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-30), 5000)
                });
            }
        }).catch((error: any) => {
            console.error('Error loading KMZ file: ', error);
        });

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

        return () => {
            isMounted = false;
            console.log("GeospatialViewer component unmounting, destroying viewer.");
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
            handler.destroy();
        };
    }, []);

    useEffect(() => {
        console.log(`View changed to: ${view}`);
        if (!viewerRef.current) return;
        const viewer = viewerRef.current;
        const Cesium = window.Cesium;

        if (geoJsonDataSourceRef.current) {
            console.log("Removing previous drillhole data source.");
            viewer.dataSources.remove(geoJsonDataSourceRef.current, true);
            geoJsonDataSourceRef.current = null;
        }

        const loadData = async () => {
            try {
                const geoJsonPath = view === 'lithology' ? '/lithology_data.geojson' : '/assay_data.geojson';
                console.log(`Fetching data from: ${geoJsonPath}`);
                const response = await fetch(geoJsonPath);
                const geoJson = await response.json();
                console.log("Data fetched and parsed.");

                let minAssay = Infinity;
                let maxAssay = -Infinity;

                if (view === 'assay') {
                    console.log("Calculating assay range...");
                    geoJson.features.forEach((feature: any) => {
                        const carbon = feature.properties.graphitic_carbon;
                        if (carbon < minAssay) minAssay = carbon;
                        if (carbon > maxAssay) maxAssay = carbon;
                    });
                    setAssayRange({min: minAssay, max: maxAssay});
                    console.log(`Assay range calculated: ${minAssay} - ${maxAssay}`);
                }

                console.log("Creating custom data source for drillholes.");
                const customDataSource = new Cesium.CustomDataSource('custom-geojson');

                geoJson.features.forEach((feature: any) => {
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
                        if (view === 'lithology') {
                            color = lithologyColorMapCesiumRef.current[properties.lithology] || lithologyColorMapCesiumRef.current['UNKNOWN'];
                        } else if (view === 'assay') {
                            const carbon = properties.graphitic_carbon;
                            const range = maxAssay - minAssay;
                            const alpha = range > 0 ? (carbon - minAssay) / range : 0.5;
                            color = Cesium.Color.fromHsl((1 - alpha) * 0.33, 1, 0.5);
                        }

                        const midpoint = Cesium.Cartesian3.midpoint(startCartesian, endCartesian, new Cesium.Cartesian3());

                        const orientation = new Cesium.VelocityOrientationProperty(new Cesium.SampledPositionProperty());
                        orientation.velocity = new Cesium.ConstantProperty(Cesium.Cartesian3.subtract(endCartesian, startCartesian, new Cesium.Cartesian3()));

                        customDataSource.entities.add({
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

                if (viewer && !viewer.isDestroyed()) {
                    console.log("Adding custom data source to viewer.");
                    viewer.dataSources.add(customDataSource);
                    geoJsonDataSourceRef.current = customDataSource;
                    viewer.flyTo(customDataSource, {
                        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 5000)
                    });
                }

            } catch (error) {
                console.error(`Error loading ${view} data:`, error);
            }
        };

        loadData();

    }, [view]);


    return (
        <div className="h-full w-full relative">
            <div ref={cesiumContainerRef} className="h-full w-full" />
            {tooltip.display && <TooltipContent data={tooltip} />}
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px', zIndex: 1000 }}>
                <button onClick={() => setView('lithology')} disabled={view === 'lithology'}>Lithology</button>
                <button onClick={() => setView('assay')} disabled={view === 'assay'}>Assay</button>
            </div>
            <Legend view={view} assayRange={assayRange} />
        </div>
    );
};

export default GeospatialViewer;