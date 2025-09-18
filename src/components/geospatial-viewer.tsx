'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';

declare global {
    interface Window {
        Cesium: any;
    }
}

type GeoView = 'lithology' | 'assay';

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

const GeospatialViewer = () => {
    const { viewer, isLoaded } = useCesium();
    const [view, setView] = useState<GeoView>('lithology');
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    
    const dataSourceRef = useRef<any>(null);
    const eventHandlerRef = useRef<any>(null);
    const lithologyColorMapCesiumRef = useRef<any>({});

    useEffect(() => {
        if (!isLoaded || !viewer) return;

        const Cesium = window.Cesium;

        Object.keys(LITHOLOGY_COLOR_MAP_CSS).forEach(key => {
            lithologyColorMapCesiumRef.current[key] = Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP_CSS[key]);
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
        eventHandlerRef.current = handler;

        const loadData = async () => {
            if (dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current, true);
                dataSourceRef.current = null;
            }

            try {
                const geoJsonPath = view === 'lithology' ? '/lithology_data.geojson' : '/assay_data.geojson';
                const response = await fetch(geoJsonPath);
                const geoJson = await response.json();

                let minAssay = Infinity, maxAssay = -Infinity;
                if (view === 'assay') {
                    geoJson.features.forEach((feature: any) => {
                        const carbon = feature.properties.graphitic_carbon;
                        if (carbon < minAssay) minAssay = carbon;
                        if (carbon > maxAssay) maxAssay = carbon;
                    });
                    setAssayRange({min: minAssay, max: maxAssay});
                }

                const customDataSource = new Cesium.CustomDataSource('custom-geojson');
                geoJson.features.forEach((feature: any) => {
                    if (feature.geometry.type === 'LineString') {
                        const { properties } = feature;
                        const [startCoords, endCoords] = feature.geometry.coordinates;
                        const startCartesian = Cesium.Cartesian3.fromDegrees(startCoords[0], startCoords[1], startCoords[2]);
                        const endCartesian = Cesium.Cartesian3.fromDegrees(endCoords[0], endCoords[1], endCoords[2]);
                        const length = Cesium.Cartesian3.distance(startCartesian, endCartesian);
                        if (length === 0) return;

                        let color;
                        if (view === 'lithology') {
                            color = lithologyColorMapCesiumRef.current[properties.lithology] || lithologyColorMapCesiumRef.current['UNKNOWN'];
                        } else {
                            const carbon = properties.graphitic_carbon;
                            const range = maxAssay - minAssay;
                            const alpha = range > 0 ? (carbon - minAssay) / range : 0.5;
                            color = Cesium.Color.fromHsl((1 - alpha) * 0.33, 1, 0.5);
                        }

                        const midpoint = Cesium.Cartesian3.midpoint(startCartesian, endCartesian, new Cesium.Cartesian3());
                        const orientation = new Cesium.VelocityOrientationProperty(new Cesium.SampledPositionProperty());
                        orientation.velocity = new Cesium.ConstantProperty(Cesium.Cartesian3.subtract(endCartesian, startCartesian, new Cesium.Cartesian3()));

                        customDataSource.entities.add({
                            position: midpoint, orientation: orientation,
                            cylinder: { length: length, topRadius: 15, bottomRadius: 15, material: color },
                            properties: { ...properties, latitude: startCoords[1], longitude: startCoords[0] }
                        });
                    }
                });

                viewer.dataSources.add(customDataSource);
                dataSourceRef.current = customDataSource;
                viewer.flyTo(customDataSource, { offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 5000) });

            } catch (error) {
                console.error(`Error loading ${view} data:`, error);
            }
        };

        loadData();

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                if (dataSourceRef.current) {
                    viewer.dataSources.remove(dataSourceRef.current, true);
                }
                if (eventHandlerRef.current && !eventHandlerRef.current.isDestroyed()) {
                    eventHandlerRef.current.destroy();
                }
            }
        };
    }, [isLoaded, viewer, view]);

    return (
        <div className="h-full w-full relative pointer-events-none">
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }} className="pointer-events-auto">
                <button onClick={() => setView('lithology')} disabled={view === 'lithology'} className="bg-white p-2 mr-2 rounded">Lithology</button>
                <button onClick={() => setView('assay')} disabled={view === 'assay'} className="bg-white p-2 rounded">Assay</button>
            </div>
            <Legend view={view} assayRange={assayRange} />
            <TooltipContent data={tooltip} />
        </div>
    );
};

export default GeospatialViewer;
