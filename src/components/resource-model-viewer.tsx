"use client";

import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        Cesium: any;
    }
}

const TooltipContent = ({ data }: { data: any }) => {
    if (!data) return null;

    const propertyEntries = Object.entries(data.content).map(([key, value]) => {
        // Ensure value is a string or number before calling toFixed
        const displayValue = typeof value === 'number' ? value.toFixed(3) : String(value);
        return <li key={key}><strong>{key}:</strong> {displayValue}</li>;
    });

    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none"
            style={{ top: data.top, left: data.left, transform: 'translate(15px, 15px)' }}
        >
            <p className="font-bold text-base mb-1">Entity Properties</p>
            <ul className="list-none space-y-1">
                {propertyEntries}
            </ul>
        </div>
    );
};

const ResourceModelViewer = () => {
    const cesiumContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const [properties, setProperties] = useState<string[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<string>("");
    const [blockTransparency, setBlockTransparency] = useState(0.5);
    const [assayTransparency, setAssayTransparency] = useState(0.8);
    const [blockModelData, setBlockModelData] = useState<any>(null);
    const [assayData, setAssayData] = useState<any>(null);
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });

    // Effect for initializing the viewer
    useEffect(() => {
        let isMounted = true;
        if (typeof window === 'undefined' || !cesiumContainerRef.current) return;
        if (!window.Cesium) {
            console.error("Cesium is not loaded.");
            return;
        }

        const Cesium = window.Cesium;
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMDFlYzZkOC00ZmQ0LTRhZDYtYjkxOC1mYzNiNzg3YWEyYWIiLCJpZCI6MzMxMTEyLCJpYXQiOjE3NTYzODcxMTh9.Wr0NYWSQJXkzlvwNerpP7k6xUQqklGQdPbUELgnw9VU';

        const viewer = new Cesium.Viewer(cesiumContainerRef.current!, {
            animation: false,
            timeline: false,
            sceneMode: Cesium.SceneMode.SCENE3D,
            useLogarithmicDepthBuffer: false, // Disable logarithmic depth buffer
            highDynamicRange: false, // optional: fewer shader variants
        });
        viewerRef.current = viewer;

        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;

        // Tooltip Handler
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
            try {
                if (!viewer || viewer.isDestroyed()) return;

                const pickedObject = viewer.scene.pick(movement.endPosition);
                if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
                    const properties = pickedObject.id.properties.getValue(viewer.clock.currentTime);
                    if (isMounted) {
                        setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: properties });
                    }
                } else {
                    if (isMounted) {
                        setTooltip({ display: false, top: 0, left: 0, content: null });
                    }
                }
            } catch {
                // If pick shader compilation fails on some frames/devices, don't blow up the app
                setTooltip({ display: false, top: 0, left: 0, content: null });
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Fetch data once
        const fetchData = async () => {
            try {
                console.log("Fetching data...");
                const [blockModelResponse, assayResponse, kmzDataSource] = await Promise.all([
                    fetch('/BlockModel.geojson'),
                    fetch('/assay_data.geojson'),
                    Cesium.KmlDataSource.load("/tanga_boundary.kmz", {
                        camera: viewer.camera,
                        canvas: viewer.canvas
                    })
                ]);
                console.log("Data fetched, processing...");
                const [blockModel, assay] = await Promise.all([blockModelResponse.json(), assayResponse.json()]);
                
                if (isMounted) {
                    console.log("Block Model Data:", blockModel);
                    await viewer.dataSources.add(kmzDataSource);
                    setBlockModelData(blockModel);
                    setAssayData(assay);

                    // Set available properties for visualization
                    setProperties(["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC", "RescCalc"]);
                    setSelectedProperty("Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"); // Default to Kr, GRAPHITIC_CARBON in GM_Litho: GRSC
                    console.log("Data processing complete.");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
            handler.destroy();
        };
    }, []);

    // Effect for rendering data when it changes
    useEffect(() => {
        console.log("Rendering effect triggered.");
        console.log("Block model data:", blockModelData);

        if (!viewerRef.current || viewerRef.current.isDestroyed() || !blockModelData) {
            console.log("Viewer or data not ready, returning.");
            return;
        }
        const viewer = viewerRef.current;
        const Cesium = window.Cesium;
        viewer.entities.removeAll();

        console.log(`Processing ${blockModelData.features.length} features.`);
        if (blockModelData.features.length > 0) {
            console.log("First feature properties:", blockModelData.features[0].properties);
        }

        // Render Block Model
        let min = Infinity, max = -Infinity;
        if (selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC") {
            blockModelData.features.forEach((feature: any) => {
                const value = parseFloat(feature.properties[selectedProperty]);
                if (!isNaN(value)) {
                    if (value < min) min = value;
                    if (value > max) max = value;
                }
            });
        }
        console.log(`Min/Max values for ${selectedProperty}: ${min}/${max}`);

        let entitiesAdded = 0;
        const blocksToRender = blockModelData.features.filter((feature: any) => {
            const properties = feature.properties;
            if (selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC") {
                const value = parseFloat(properties[selectedProperty]);
                return !isNaN(value);
            } else if (selectedProperty === "RescCalc") {
                const value = properties[selectedProperty];
                return ["Indicated", "Measured", "Inferred"].includes(value);
            }
            return false;
        });

        blocksToRender.forEach((feature: any) => {
            const { geometry, properties } = feature;
            let color = Cesium.Color.RED.withAlpha(1.0);
            let shouldPlot = false;

            if (selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC") {
                const value = parseFloat(properties[selectedProperty]);
                if (!isNaN(value)) {
                    shouldPlot = true;
                    const ratio = max > min ? (value - min) / (max - min) : 0.5;
                    color = Cesium.Color.fromHsl(0.6 - ratio * 0.6, 1.0, 0.5).withAlpha(blockTransparency);
                }
            } else if (selectedProperty === "RescCalc") {
                const value = properties[selectedProperty];
                if (["Indicated", "Measured", "Inferred"].includes(value)) {
                    shouldPlot = true;
                    switch (value) {
                        case "Indicated":
                            color = Cesium.Color.BLUE.withAlpha(blockTransparency);
                            break;
                        case "Measured":
                            color = Cesium.Color.GREEN.withAlpha(blockTransparency);
                            break;
                        case "Inferred":
                            color = Cesium.Color.YELLOW.withAlpha(blockTransparency);
                            break;
                    }
                }
            }

            if (shouldPlot) {
                const { dX, dY, dZ } = properties;
                const dimensions = new Cesium.Cartesian3(parseFloat(dX), parseFloat(dY), parseFloat(dZ));
                const position = Cesium.Cartesian3.fromDegrees(geometry.coordinates[0], geometry.coordinates[1], geometry.coordinates[2]);

                viewer.entities.add({
                    position: position,
                    box: {
                        dimensions: dimensions,
                        material: color,
                    },
                    properties: properties
                });
                entitiesAdded++;
            }
        });
        console.log(`${entitiesAdded} block entities added to the viewer.`);

        // Render Assay Data
        if (assayData) {
            let minAssay = Infinity, maxAssay = -Infinity;
            assayData.features.forEach((feature: any) => {
                const value = parseFloat(feature.properties.graphitic_carbon);
                if (!isNaN(value)) {
                    if (value < minAssay) minAssay = value;
                    if (value > maxAssay) maxAssay = value;
                }
            });

            assayData.features.forEach((feature: any) => {
                if (feature.geometry.type === 'LineString') {
                    const { properties } = feature;
                    const [startCoords, endCoords] = feature.geometry.coordinates;

                    const startCartesian = Cesium.Cartesian3.fromDegrees(startCoords[0], startCoords[1], startCoords[2]);
                    const endCartesian = Cesium.Cartesian3.fromDegrees(endCoords[0], endCoords[1], endCoords[2]);

                    const length = Cesium.Cartesian3.distance(startCartesian, endCartesian);
                    if (length === 0) return;

                    const carbon = properties.graphitic_carbon;
                    const range = maxAssay - minAssay;
                    const alpha = range > 0 ? (carbon - minAssay) / range : 0.5;
                    const color = Cesium.Color.fromHsl((1 - alpha) * 0.33, 1, 0.5).withAlpha(assayTransparency);

                    const midpoint = Cesium.Cartesian3.midpoint(startCartesian, endCartesian, new Cesium.Cartesian3());
                    const orientation = new Cesium.VelocityOrientationProperty(new Cesium.SampledPositionProperty());
                    orientation.velocity = new Cesium.ConstantProperty(Cesium.Cartesian3.subtract(endCartesian, startCartesian, new Cesium.Cartesian3()));

                    viewer.entities.add({
                        position: midpoint,
                        orientation: orientation,
                        cylinder: {
                            length: length,
                            topRadius: 2, // Smaller radius for traces
                            bottomRadius: 2,
                            material: color,
                        },
                        properties: { ...properties, latitude: startCoords[1], longitude: startCoords[0] }
                    });
                }
            });
        }

        // Explicitly fly to a known location for debugging
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(38.785, -4.805, 5000), // Approximate center of your data
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-90.0),
                roll: Cesium.Math.toRadians(0.0)
            },
            duration: 3 // seconds
        });

    }, [blockModelData, assayData, selectedProperty, blockTransparency, assayTransparency]);


    return (
        <div className="h-full w-full relative">
            <div ref={cesiumContainerRef} className="h-full w-full" />
            {tooltip.display && <TooltipContent data={tooltip} />}
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '8px' }}>
                <h4>Resource Model Controls</h4>
                <div>
                    <label>Visualize Property: </label>
                    <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} style={{width: "100%"}}>
                        {properties.map(prop => <option key={prop} value={prop}>{prop}</option>)}
                    </select>
                </div>
                <div>
                    <label>Block Transparency: </label>
                    <input type="range" min="0" max="1" step="0.05" value={blockTransparency} onChange={(e) => setBlockTransparency(parseFloat(e.target.value))} />
                </div>
                <div>
                    <label>Assay Transparency: </label>
                    <input type="range" min="0" max="1" step="0.05" value={assayTransparency} onChange={(e) => setAssayTransparency(parseFloat(e.target.value))} />
                </div>
            </div>
        </div>
    );
};

export default ResourceModelViewer;