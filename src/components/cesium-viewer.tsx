'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';

declare global {
    interface Window {
        Cesium: any;
        ko: any;
    }
}

type CesiumView = 'original' | 'exaggerated_kml' | 'styled_kml' | 'ion_imagery' | 'geojson_drillholes_lithology' | 'geojson_drillholes_assay' | 'tiff_overlay' | 'drillhole_3d_combined' | 'subsurface_deposit_view';

interface CesiumViewerProps {
    view: CesiumView;
}

interface DrillholeSegmentData {
    hole_id: string;
    x: number; 
    y: number; 
    z: number; 
    depth_from: number;
    depth_to: number;
}

interface AssaySegment extends DrillholeSegmentData {
    graphitic_carbon: number;
}

const LITHOLOGY_COLOR_MAP_CSS: { [key: string]: string } = {
    "Quartz-Feldspathic": "#d39127ff",
    "GRSC": "#19292aff",
    "Granulite": "#a1089aff",
    "Khondalite": "#4f1dc4ff",
    "Marble": "#D4E6F1",
    "Not Recovearble": "#515A5A",
    "SOIL": "#2df27cff",
    "Schist": "#153224ff",
    "nan": "#ffffffbe",
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

const SubsurfaceAssayLegend = ({ assayRange, show }: { assayRange: { min: number, max: number }, show: boolean }) => {
    if (!show) return null;
    return (
        <div className="absolute bottom-20 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto">
            <h3 className="font-bold text-lg mb-2">Drill Trace (g/t Au)</h3>
            <div className="flex flex-col items-center">
                <div className="w-full h-6 rounded" style={{ background: 'linear-gradient(to right, hsl(120, 100%, 50%), hsl(0, 100%, 50%))' }}></div>
                <div className="flex justify-between w-full text-xs mt-1">
                    <span>{assayRange.min.toFixed(2)}</span>
                    <span>{assayRange.max.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

const MineralDomainsLegend = ({ show }: { show: boolean }) => {
    if (!show) return null;
    const legendItems = [
        { color: '#ff0000', label: 'High-Grade' },
        { color: '#ffa500', label: 'Medium-Grade' },
        { color: '#00ff00', label: 'Low-Grade' },
        { color: '#0000ff', label: 'Underground' },
        { color: '#ffff00', label: 'Laterite' },
    ];
    return (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto">
            <h3 className="font-bold text-lg mb-2">Gold Mineralised Domains</h3>
            <ul className="space-y-1">
                {legendItems.map(({ color, label }) => (
                    <li key={label} className="flex items-center">
                        <span className="inline-block w-4 h-4 mr-2" style={{ backgroundColor: color }}></span>
                        <span>{label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const CesiumViewer = ({ view }: CesiumViewerProps) => {
    const { viewer, isLoaded } = useCesium();
    const lastViewRef = useRef<CesiumView | null>(null);

    const componentDataSources = useRef<any[]>([]);
    const componentEntities = useRef<any[]>([]);
    const componentImageryLayers = useRef<any[]>([]);
    const componentPrimitives = useRef<any[]>([]);
    const eventHandlerRef = useRef<any>(null);

    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [showSubsurfaceAssayLegend, setShowSubsurfaceAssayLegend] = useState(false);
    const [showMineralDomainsLegend, setShowMineralDomainsLegend] = useState(false);

    useEffect(() => {
        if (!isLoaded || !viewer) return;

        const Cesium = window.Cesium;
        const lithologyColorMapCesium: { [key: string]: any } = {};
        Object.keys(LITHOLOGY_COLOR_MAP_CSS).forEach(key => {
            lithologyColorMapCesium[key] = Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP_CSS[key]);
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

        const cleanup = () => {
            componentDataSources.current.forEach(ds => viewer.dataSources.remove(ds, true));
            componentEntities.current.forEach(e => viewer.entities.remove(e));
            componentImageryLayers.current.forEach(l => viewer.imageryLayers.remove(l, true));
            componentPrimitives.current.forEach(p => viewer.scene.primitives.remove(p));
            
            componentDataSources.current = [];
            componentEntities.current = [];
            componentImageryLayers.current = [];
            componentPrimitives.current = [];

            if (eventHandlerRef.current && !eventHandlerRef.current.isDestroyed()) {
                eventHandlerRef.current.destroy();
                eventHandlerRef.current = null;
            }
            
            viewer.scene.globe.depthTestAgainstTerrain = true;
            viewer.scene.verticalExaggeration = 1.0;
            viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider(); // Reset to default
        };

        const loadView = async (viewName: CesiumView) => {
            cleanup();

            const kmlDataSource = await Cesium.KmlDataSource.load('/tanga_boundary.kmz');
            viewer.dataSources.add(kmlDataSource);
            componentDataSources.current.push(kmlDataSource);
            const kmlEntity = kmlDataSource.entities.values.find((e: any) => e.polygon);

            if (viewName === 'original') {
                viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                    `https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=MQ8jhB5F57QiT1CrsiUJ`
                );
                if (kmlEntity) kmlEntity.polygon.fill = false;
                await viewer.flyTo(kmlDataSource);
            } else if (viewName === 'exaggerated_kml') {
                viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
                    `https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=MQ8jhB5F57QiT1CrsiUJ`
                );
                await viewer.flyTo(kmlEntity, { duration: 3.0, offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(30.0), Cesium.Math.toRadians(-45.0), 80000) });
                viewer.scene.verticalExaggeration = 3.0;
            } else if (viewName === 'styled_kml') {
                if (kmlEntity) {
                    kmlEntity.polygon.fill = true;
                    kmlEntity.polygon.material = Cesium.Color.WHITE.withAlpha(0.5);
                }
                await viewer.flyTo(kmlEntity, { duration: 3.0, offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(0.0), Cesium.Math.toRadians(-50.0), 15000) });
            } else if (viewName === 'ion_imagery' || viewName === 'drillhole_3d_combined' || viewName === 'subsurface_deposit_view') {
                const layer = await Cesium.IonImageryProvider.fromAssetId(3678736);
                const imageryLayer = viewer.imageryLayers.addImageryProvider(layer);
                componentImageryLayers.current.push(imageryLayer);
            } else if (viewName === 'tiff_overlay') {
                const provider = await Cesium.IonImageryProvider.fromAssetId(3733958);
                const layer = viewer.imageryLayers.addImageryProvider(provider);
                componentImageryLayers.current.push(layer);
                const rect = provider.rectangle ?? Cesium.Rectangle.fromDegrees(-180, -90, 180, 90);
                viewer.camera.flyTo({ destination: rect, duration: 1.5 });
            }

            if (viewName.startsWith('geojson_drillholes') || viewName === 'drillhole_3d_combined' || viewName === 'subsurface_deposit_view') {
                const isLithology = viewName === 'geojson_drillholes_lithology';
                const response = await fetch(isLithology ? '/lithology_data.geojson' : '/assay_data.geojson');
                const data = await response.json();

                let minAssay = Infinity, maxAssay = -Infinity;
                if (!isLithology || viewName === 'drillhole_3d_combined' || viewName === 'subsurface_deposit_view') {
                    data.features.forEach((feature: { properties: AssaySegment }) => {
                        const d = feature.properties;
                        if (d.graphitic_carbon < minAssay) minAssay = d.graphitic_carbon;
                        if (d.graphitic_carbon > maxAssay) maxAssay = d.graphitic_carbon;
                    });
                    setAssayRange({ min: minAssay, max: maxAssay });
                }

                const customDataSource = new Cesium.CustomDataSource('drillholes');
                data.features.forEach((feature: any) => {
                    if (feature.geometry.type === 'LineString') {
                        const { properties } = feature;
                        const [startCoords, endCoords] = feature.geometry.coordinates;
                        const startCartesian = Cesium.Cartesian3.fromDegrees(startCoords[0], startCoords[1], startCoords[2]);
                        const endCartesian = Cesium.Cartesian3.fromDegrees(endCoords[0], endCoords[1], endCoords[2]);
                        const length = Cesium.Cartesian3.distance(startCartesian, endCartesian);
                        if (length === 0) return;

                        let color;
                        if (isLithology) {
                            color = lithologyColorMapCesium[properties.lithology] || lithologyColorMapCesium['UNKNOWN'];
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
                componentDataSources.current.push(customDataSource);
                if (!viewName.includes('combined') && !viewName.includes('deposit')) {
                    viewer.flyTo(customDataSource, { offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 5000) });
                }
            }

            if (viewName === 'drillhole_3d_combined' || viewName === 'subsurface_deposit_view') {
                setShowSubsurfaceAssayLegend(true);
                setShowMineralDomainsLegend(true);
                viewer.scene.globe.depthTestAgainstTerrain = false;
                if (viewName === 'drillhole_3d_combined') viewer.scene.globe.show = false;

                const modelUrl = viewName === 'drillhole_3d_combined' ? '/geologicalModel.glb' : '/mineral_domains.glb';
                const model = await Cesium.Model.fromGltf({ url: modelUrl });
                const primitive = viewer.scene.primitives.add(model);
                componentPrimitives.current.push(primitive);

                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(38.8, -5.2, 15000),
                    orientation: { heading: Cesium.Math.toRadians(15.0), pitch: Cesium.Math.toRadians(-35.0), roll: 0.0 },
                    duration: 3
                });
            }

            lastViewRef.current = viewName;
        };

        if (lastViewRef.current !== view) {
            loadView(view);
        }

        return () => { cleanup(); };
    }, [isLoaded, viewer, view]);

    return (
        <div className="pointer-events-none">
            <Legend view={view} assayRange={assayRange} show={view === 'geojson_drillholes_lithology' || view === 'geojson_drillholes_assay'} />
            <SubsurfaceAssayLegend assayRange={assayRange} show={showSubsurfaceAssayLegend} />
            <MineralDomainsLegend show={showMineralDomainsLegend} />
            {tooltip.display && <TooltipContent data={tooltip} />}
        </div>
    );
};

export default CesiumViewer;