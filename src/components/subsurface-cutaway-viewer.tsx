'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';

declare global {
    interface Window {
        Cesium: any;
    }
}

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

const Legend = () => (
    <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto">
        <h3 className="font-bold text-lg mb-2">Lithology</h3>
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
    </div>
);

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
            </ul>
        </div>
    );
};

const ClippingControls = ({ clipBox, setClipBox, sliderRange, enabled }: { clipBox: any, setClipBox: any, sliderRange: any, enabled: boolean }) => {
    if (!enabled) return null;

    const handleMinChange = (axis: 'x' | 'y' | 'z', value: number) => {
        setClipBox((prev: any) => ({ ...prev, [`${axis}_min`]: Math.min(value, prev[`${axis}_max`]) }));
    };

    const handleMaxChange = (axis: 'x' | 'y' | 'z', value: number) => {
        setClipBox((prev: any) => ({ ...prev, [`${axis}_max`]: Math.max(value, prev[`${axis}_min`]) }));
    };

    return (
        <div className="absolute top-4 right-4 bg-white bg-opacity-80 p-4 rounded-lg shadow-md w-72 text-sm pointer-events-auto">
            <h3 className="font-bold text-lg mb-3">Clipping Box Controls</h3>
            <div className="space-y-3">
                <div>
                    <label className="block font-medium mb-1">X Axis (East/West)</label>
                    <div className="flex items-center space-x-2">
                        <span>Min</span>
                        <input type="range" className="w-full" min={sliderRange.x.min} max={sliderRange.x.max} value={clipBox.x_min} onChange={e => handleMinChange('x', parseFloat(e.target.value))} />
                        <span>Max</span>
                        <input type="range" className="w-full" min={sliderRange.x.min} max={sliderRange.x.max} value={clipBox.x_max} onChange={e => handleMaxChange('x', parseFloat(e.target.value))} />
                    </div>
                </div>
                <div>
                    <label className="block font-medium mb-1">Y Axis (North/South)</label>
                    <div className="flex items-center space-x-2">
                        <span>Min</span>
                        <input type="range" className="w-full" min={sliderRange.y.min} max={sliderRange.y.max} value={clipBox.y_min} onChange={e => handleMinChange('y', parseFloat(e.target.value))} />
                        <span>Max</span>
                        <input type="range" className="w-full" min={sliderRange.y.min} max={sliderRange.y.max} value={clipBox.y_max} onChange={e => handleMaxChange('y', parseFloat(e.target.value))} />
                    </div>
                </div>
                <div>
                    <label className="block font-medium mb-1">Z Axis (Elevation)</label>
                    <div className="flex items-center space-x-2">
                        <span>Min</span>
                        <input type="range" className="w-full" min={sliderRange.z.min} max={sliderRange.z.max} value={clipBox.z_min} onChange={e => handleMinChange('z', parseFloat(e.target.value))} />
                        <span>Max</span>
                        <input type="range" className="w-full" min={sliderRange.z.min} max={sliderRange.z.max} value={clipBox.z_max} onChange={e => handleMaxChange('z', parseFloat(e.target.value))} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const SubsurfaceCutawayViewer = () => {
    const { viewer, isLoaded } = useCesium();
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const lithologyColorMapCesiumRef = useRef<any>({});
    
    const [clipBox, setClipBox] = useState({ x_min: 0, x_max: 0, y_min: 0, y_max: 0, z_min: 0, z_max: 0 });
    const [sliderRange, setSliderRange] = useState({ x: {min:0, max:0}, y: {min:0, max:0}, z: {min:0, max:0} });
    const [localTransform, setLocalTransform] = useState<any>(null);
    const [controlsEnabled, setControlsEnabled] = useState(false);

    const dataSourceRef = useRef<any>(null);
    const eventHandlerRef = useRef<any>(null);

    useEffect(() => {
        if (!isLoaded || !viewer) return;

        let isMounted = true;
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

        const loadDrillholesAndClip = async () => {
            try {
                const response = await fetch('/lithology_data.geojson');
                const geoJson = await response.json();
                
                const customDataSource = new Cesium.CustomDataSource('drillholes');
                const points: any[] = [];

                geoJson.features.forEach((feature: any) => {
                    if (feature.geometry.type === 'LineString') {
                        const { properties } = feature;
                        const [startCoords, endCoords] = feature.geometry.coordinates;
                        points.push(Cesium.Cartesian3.fromDegrees(startCoords[0], startCoords[1], startCoords[2]));
                        points.push(Cesium.Cartesian3.fromDegrees(endCoords[0], endCoords[1], endCoords[2]));

                        const startCartesian = Cesium.Cartesian3.fromDegrees(startCoords[0], startCoords[1], startCoords[2]);
                        const endCartesian = Cesium.Cartesian3.fromDegrees(endCoords[0], endCoords[1], endCoords[2]);
                        const length = Cesium.Cartesian3.distance(startCartesian, endCartesian);
                        if (length === 0) return;

                        const color = lithologyColorMapCesiumRef.current[properties.lithology] || lithologyColorMapCesiumRef.current['UNKNOWN'];
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

                if (isMounted && !viewer.isDestroyed()) {
                    viewer.dataSources.add(customDataSource);
                    dataSourceRef.current = customDataSource;

                    if (points.length > 0) {
                        const boundingSphere = Cesium.BoundingSphere.fromPoints(points);
                        const center = boundingSphere.center;
                        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
                        setLocalTransform(transform);

                        const inverseTransform = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());
                        const localPoints = points.map(p => Cesium.Matrix4.multiplyByPoint(inverseTransform, p, new Cesium.Cartesian3()));
                        const localBoundingBox = Cesium.AxisAlignedBoundingBox.fromPoints(localPoints);

                        setClipBox({
                            x_min: localBoundingBox.minimum.x, x_max: localBoundingBox.maximum.x,
                            y_min: localBoundingBox.minimum.y, y_max: localBoundingBox.maximum.y,
                            z_min: localBoundingBox.minimum.z, z_max: localBoundingBox.maximum.z,
                        });

                        const rangePadding = 1000;
                        setSliderRange({
                            x: { min: localBoundingBox.minimum.x - rangePadding, max: localBoundingBox.maximum.x + rangePadding },
                            y: { min: localBoundingBox.minimum.y - rangePadding, max: localBoundingBox.maximum.y + rangePadding },
                            z: { min: localBoundingBox.minimum.z - rangePadding, max: localBoundingBox.maximum.z + rangePadding },
                        });

                        viewer.scene.globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
                            planes: [], edgeWidth: 1.0, edgeColor: Cesium.Color.YELLOW,
                        });
                        setControlsEnabled(true);
                    }

                    viewer.flyTo(customDataSource, {
                        duration: 3.0,
                        offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(30.0), Cesium.Math.toRadians(-45.0), 8000)
                    });
                }
            } catch (error) {
                console.error(`Error loading drillhole data:`, error);
            }
        };

        loadDrillholesAndClip();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed()) {
                if (dataSourceRef.current) {
                    viewer.dataSources.remove(dataSourceRef.current, true);
                }
                if (eventHandlerRef.current && !eventHandlerRef.current.isDestroyed()) {
                    eventHandlerRef.current.destroy();
                }
                viewer.scene.globe.clippingPlanes = undefined;
            }
        };
    }, [isLoaded, viewer]);

    useEffect(() => {
        if (!controlsEnabled || !viewer || !localTransform) return;

        const Cesium = window.Cesium;
        const transform = localTransform;
        const rotation = Cesium.Matrix4.getMatrix3(transform, new Cesium.Matrix3());

        const planeDefs = [
            { normal: new Cesium.Cartesian3(-1, 0, 0), point: new Cesium.Cartesian3(clipBox.x_max, 0, 0) },
            { normal: new Cesium.Cartesian3(1, 0, 0),  point: new Cesium.Cartesian3(clipBox.x_min, 0, 0) },
            { normal: new Cesium.Cartesian3(0, -1, 0), point: new Cesium.Cartesian3(0, clipBox.y_max, 0) },
            { normal: new Cesium.Cartesian3(0, 1, 0),  point: new Cesium.Cartesian3(0, clipBox.y_min, 0) },
            { normal: new Cesium.Cartesian3(0, 0, -1), point: new Cesium.Cartesian3(0, 0, clipBox.z_max) },
            { normal: new Cesium.Cartesian3(0, 0, 1),  point: new Cesium.Cartesian3(0, 0, clipBox.z_min) },
        ];

        const newPlanes: any[] = [];
        for (const p_def of planeDefs) {
            const worldPoint = Cesium.Matrix4.multiplyByPoint(transform, p_def.point, new Cesium.Cartesian3());
            const worldNormal = Cesium.Matrix3.multiplyByVector(rotation, p_def.normal, new Cesium.Cartesian3());
            const distance = Cesium.Cartesian3.dot(worldPoint, worldNormal);
            newPlanes.push(new Cesium.ClippingPlane(worldNormal, distance));
        }
        
        viewer.scene.globe.clippingPlanes.removeAll();
        newPlanes.forEach(plane => viewer.scene.globe.clippingPlanes.add(plane));

    }, [clipBox, localTransform, controlsEnabled, viewer]);

    return (
        <div className="h-full w-full relative pointer-events-none">
            <TooltipContent data={tooltip} />
            <Legend />
            <ClippingControls clipBox={clipBox} setClipBox={setClipBox} sliderRange={sliderRange} enabled={controlsEnabled} />
        </div>
    );
};

export default SubsurfaceCutawayViewer;