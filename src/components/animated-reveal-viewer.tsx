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

const Legend = ({ show }: { show: boolean }) => {
    if (!show) return null;
    return (
        <div className={`absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>
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
            </ul>
        </div>
    );
};

const ClippingControls = ({ clipBox, setClipBox, sliderRange, enabled }: { clipBox: any, setClipBox: any, sliderRange: any, enabled: boolean }) => {
    return (
        <div className={`absolute top-4 right-4 bg-white bg-opacity-80 p-4 rounded-lg shadow-md w-72 text-sm pointer-events-auto transition-opacity duration-500 ${enabled ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="font-bold text-lg mb-3">Clipping Box Controls</h3>
            <div className="space-y-3">
                <div>
                    <label className="block font-medium mb-1">X Axis (East/West)</label>
                    <div className="flex items-center space-x-2">
                        <span>Min</span>
                        <input type="range" className="w-full" min={sliderRange.x.min} max={sliderRange.x.max} value={clipBox.x_min} onChange={e => setClipBox((prev: any) => ({ ...prev, x_min: Math.min(parseFloat(e.target.value), prev.x_max) }))} />
                        <span>Max</span>
                        <input type="range" className="w-full" min={sliderRange.x.min} max={sliderRange.x.max} value={clipBox.x_max} onChange={e => setClipBox((prev: any) => ({ ...prev, x_max: Math.max(parseFloat(e.target.value), prev.x_min) }))} />
                    </div>
                </div>
                <div>
                    <label className="block font-medium mb-1">Y Axis (North/South)</label>
                    <div className="flex items-center space-x-2">
                        <span>Min</span>
                        <input type="range" className="w-full" min={sliderRange.y.min} max={sliderRange.y.max} value={clipBox.y_min} onChange={e => setClipBox((prev: any) => ({ ...prev, y_min: Math.min(parseFloat(e.target.value), prev.y_max) }))} />
                        <span>Max</span>
                        <input type="range" className="w-full" min={sliderRange.y.min} max={sliderRange.y.max} value={clipBox.y_max} onChange={e => setClipBox((prev: any) => ({ ...prev, y_max: Math.max(parseFloat(e.target.value), prev.y_min) }))} />
                    </div>
                </div>
                <div>
                    <label className="block font-medium mb-1">Z Axis (Elevation)</label>
                    <div className="flex items-center space-x-2">
                        <span>Min</span>
                        <input type="range" className="w-full" min={sliderRange.z.min} max={sliderRange.z.max} value={clipBox.z_min} onChange={e => setClipBox((prev: any) => ({ ...prev, z_min: Math.min(parseFloat(e.target.value), prev.z_max) }))} />
                        <span>Max</span>
                        <input type="range" className="w-full" min={sliderRange.z.min} max={sliderRange.z.max} value={clipBox.z_max} onChange={e => setClipBox((prev: any) => ({ ...prev, z_max: Math.max(parseFloat(e.target.value), prev.z_min) }))} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const AnimatedRevealViewer = () => {
    const { viewer, isLoaded } = useCesium();
    const [animationState, setAnimationState] = useState('initial');
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [clipBox, setClipBox] = useState({ x_min: 0, x_max: 0, y_min: 0, y_max: 0, z_min: 0, z_max: 0 });
    const [sliderRange, setSliderRange] = useState({ x: {min:0, max:0}, y: {min:0, max:0}, z: {min:0, max:0} });
    const [localTransform, setLocalTransform] = useState<any>(null);
    const [controlsEnabled, setControlsEnabled] = useState(false);

    const dataSourceRef = useRef<any>(null);
    const eventHandlerRef = useRef<any>(null);
    const onTickCallbackRef = useRef<any>(null);
    const lithologyColorMapCesiumRef = useRef<any>({});

    useEffect(() => {
        if (!isLoaded || !viewer) return;

        let isMounted = true;
        const Cesium = window.Cesium;

        Object.keys(LITHOLOGY_COLOR_MAP_CSS).forEach(key => {
            lithologyColorMapCesiumRef.current[key] = Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP_CSS[key]);
        });

        viewer.scene.screenSpaceCameraController.enableTilt = false;
        viewer.scene.screenSpaceCameraController.enableLook = false;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
            if (!controlsEnabled) return;
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
                    }
                    viewer.flyTo(customDataSource, { duration: 2.0 });
                }
            } catch (error) {
                console.error(`Error loading data:`, error);
            }
        };

        loadData();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed()) {
                if (dataSourceRef.current) viewer.dataSources.remove(dataSourceRef.current, true);
                if (eventHandlerRef.current) eventHandlerRef.current.destroy();
                if (onTickCallbackRef.current) viewer.clock.onTick.removeEventListener(onTickCallbackRef.current);
                viewer.scene.globe.clippingPlanes = undefined;
                viewer.scene.screenSpaceCameraController.enableTilt = true;
                viewer.scene.screenSpaceCameraController.enableLook = true;
            }
        };
    }, [isLoaded, viewer]);

    useEffect(() => {
        const Cesium = window.Cesium;
        if (!isLoaded || !viewer) return;

        if (animationState === 'animating' && dataSourceRef.current) {
            viewer.scene.screenSpaceCameraController.enableTilt = true;
            viewer.scene.screenSpaceCameraController.enableLook = true;

            const boundingSphere = dataSourceRef.current.entities.computeBoundingSphere();
            const center = boundingSphere.center;
            const radius = boundingSphere.radius;
            const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
            const rotation = Cesium.Matrix4.getMatrix3(transform, new Cesium.Matrix3());

            const localNormal = new Cesium.Cartesian3(1, 0, 0);
            const worldNormal = Cesium.Matrix3.multiplyByVector(rotation, localNormal, new Cesium.Cartesian3());

            const startLocalPoint = new Cesium.Cartesian3(-radius * 1.5, 0, 0);
            const startWorldPoint = Cesium.Matrix4.multiplyByPoint(transform, startLocalPoint, new Cesium.Cartesian3());
            const startDistance = Cesium.Cartesian3.dot(startWorldPoint, worldNormal);

            const endLocalPoint = new Cesium.Cartesian3(0, 0, 0);
            const endWorldPoint = Cesium.Matrix4.multiplyByPoint(transform, endLocalPoint, new Cesium.Cartesian3());
            const endDistance = Cesium.Cartesian3.dot(endWorldPoint, worldNormal);

            const clippingPlane = new Cesium.ClippingPlane(worldNormal, startDistance);

            viewer.scene.globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
                planes: [clippingPlane], edgeWidth: 1.0, edgeColor: Cesium.Color.YELLOW,
            });

            const startTime = viewer.clock.currentTime.clone();
            onTickCallbackRef.current = () => {
                const elapsedTime = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, startTime);
                const duration = 5.0;
                const progress = Math.min(elapsedTime / duration, 1.0);
                clippingPlane.distance = Cesium.Math.lerp(startDistance, endDistance, progress);
            };
            viewer.clock.onTick.addEventListener(onTickCallbackRef.current);

            viewer.camera.flyToBoundingSphere(boundingSphere, {
                duration: 5,
                offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(20.0), Cesium.Math.toRadians(-45.0), boundingSphere.radius * 2.0),
                complete: () => {
                    setAnimationState('final');
                    if (onTickCallbackRef.current) {
                        viewer.clock.onTick.removeEventListener(onTickCallbackRef.current);
                        onTickCallbackRef.current = null;
                    }
                },
            });
        } else if (animationState === 'final') {
            setControlsEnabled(true);
        }
    }, [animationState, isLoaded, viewer]);

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
        
        if (viewer.scene.globe.clippingPlanes) {
            viewer.scene.globe.clippingPlanes.removeAll();
            newPlanes.forEach(plane => viewer.scene.globe.clippingPlanes.add(plane));
        }

    }, [clipBox, localTransform, controlsEnabled, viewer]);

    return (
        <div className="h-full w-full relative pointer-events-none">
            <TooltipContent data={tooltip} />
            <Legend show={controlsEnabled} />
            <ClippingControls clipBox={clipBox} setClipBox={setClipBox} sliderRange={sliderRange} enabled={controlsEnabled} />
            {animationState === 'initial' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <button 
                        onClick={() => setAnimationState('animating')}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-2xl shadow-lg animate-pulse"
                    >
                        Start Animation
                    </button>
                </div>
            )}
        </div>
    );
};

export default AnimatedRevealViewer;
