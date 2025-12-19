'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { Legend } from '@/components/ui/legend';
import { graphiticCarbonLegendData } from '@/lib/constants';

declare global {
    interface Window {
        Cesium: any;
    }
}

// --- Helper Functions ---
const getAssayColor = (value: number, Cesium: any, alpha = 1.0) => {
    const v = Number(value);
    let color;
    if (!Number.isFinite(v)) {
        color = Cesium.Color.fromCssColorString('#CCCCCC');
    } else if (v > 8.0) {
        color = Cesium.Color.RED;
    } else if (v > 6.0) {
        color = Cesium.Color.ORANGE;
    } else if (v > 4) {
        color = Cesium.Color.YELLOW;
    } else if (v > 2) {
        color = Cesium.Color.GREEN;
    } else if (v > 1) {
        color = Cesium.Color.CYAN;
    } else {
        color = Cesium.Color.BLUE;
    }
    return color.withAlpha(alpha);
};

// --- UI Components ---
const DrillholeControls = ({ onAnimate, onToggle, show }: { onAnimate: () => void, onToggle: (filter: string) => void, show: boolean }) => {
    if (!show) return null;
    return (
        <div className={`absolute top-4 right-4 bg-white bg-opacity-80 p-4 rounded-lg shadow-md w-72 text-sm pointer-events-auto transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="font-bold text-lg mb-3">Drillhole Controls</h3>
            <div className="space-y-3">
                <div>
                    <button onClick={onAnimate} className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Animate Discovery
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
type AnimationPhase = 'initial' | 'loading' | 'ready' | 'surface' | 'slice' | 'final';

const AnimatedRevealViewer = () => {
    const { viewer } = useCesium();
    const [controlsVisible, setControlsVisible] = useState(false);
    const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('initial');
    
    const sceneData = useRef<any>({});
    const dataSources = useRef<any[]>([]);
    const cleanupFuncs = useRef<(()=>void)[]>([]);

    // Phase 1: Data Loading
    useEffect(() => {
        if (!viewer || animationPhase !== 'initial') return;

        const loadData = async () => {
            try {
                setAnimationPhase('loading');
                const Cesium = (window as any).Cesium as typeof import('cesium');
                const response = await fetch('/assay_data.geojson');
                const assayData = await response.json();

                const collarDataSource = new Cesium.CustomDataSource('collars');
                const traceDataSource = new Cesium.CustomDataSource('traces');
                const points: any[] = [];

                assayData.features.forEach((feature: any) => {
                    if (feature.geometry.type === 'LineString') {
                        const [start, end] = feature.geometry.coordinates;
                        const positions = Cesium.Cartesian3.fromDegreesArrayHeights([...start, ...end]);
                        points.push(positions[0], positions[1]);

                        collarDataSource.entities.add({ position: positions[0], point: { pixelSize: 8, color: Cesium.Color.DODGERBLUE } });
                        
                        const color = getAssayColor(feature.properties.graphitic_carbon, Cesium, 0.0); // Start transparent
                        traceDataSource.entities.add({ 
                            name: feature.properties.hole_id,
                            polyline: { positions, width: 5, material: new Cesium.ColorMaterialProperty(color) }
                        });
                    }
                });

                await viewer.dataSources.add(collarDataSource);
                viewer.scene.requestRender();
                await viewer.dataSources.add(traceDataSource);
                viewer.scene.requestRender();
                dataSources.current = [collarDataSource, traceDataSource];
                
                const boundingSphere = Cesium.BoundingSphere.fromPoints(points);
                sceneData.current = { boundingSphere, siteCenter: boundingSphere.center };

                setAnimationPhase('ready');
            } catch (error) {
                console.error("Error loading scene data:", error);
                setAnimationPhase('initial'); // Reset on error
            }
        };

        loadData();
    }, [viewer, animationPhase]);

    // Phase 2-4: Animation Controller
    useEffect(() => {
        if (animationPhase === 'ready') {
            // Automatically start the animation sequence once data is ready
            setAnimationPhase('surface');
            return;
        }

        if (!viewer || !sceneData.current.boundingSphere) return;

        const Cesium = (window as any).Cesium as typeof import('cesium');
        const { boundingSphere, siteCenter } = sceneData.current;
        let tickListener: (() => void) | undefined;

        const runAnimation = async () => {
            if (animationPhase === 'surface') {
                viewer.scene.screenSpaceCameraController.enableInputs = false;
                await viewer.camera.flyToBoundingSphere(boundingSphere, {
                    duration: 2.0,
                    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), 2000)
                });
                viewer.scene.requestRender();
                setAnimationPhase('slice');
            }
            else if (animationPhase === 'slice') {
                const enu = Cesium.Transforms.eastNorthUpToFixedFrame(siteCenter);
                const east4 = Cesium.Matrix4.getColumn(enu, 0, new Cesium.Cartesian4());
                const east = Cesium.Cartesian3.fromCartesian4(east4);
                const planeNormal = Cesium.Cartesian3.normalize(east, new Cesium.Cartesian3());
                const distance = -Cesium.Cartesian3.dot(planeNormal, siteCenter);

                const halfMapPlane = new Cesium.ClippingPlane(planeNormal, distance - boundingSphere.radius);
                sceneData.current.halfMapPlane = halfMapPlane; // Store for tick listener

                const planeCollection = new Cesium.ClippingPlaneCollection({
                    planes: [halfMapPlane],
                    edgeWidth: 1.5,
                    edgeColor: Cesium.Color.WHITE,
                    enabled: true
                });
                viewer.scene.globe.clippingPlanes = planeCollection;
                viewer.scene.requestRender();
                cleanupFuncs.current.push(() => { if(viewer.scene.globe.clippingPlanes) viewer.scene.globe.clippingPlanes.enabled = false; });

                viewer.scene.globe.undergroundColor = Cesium.Color.BLACK;
                viewer.scene.globe.depthTestAgainstTerrain = true;

                const up4 = Cesium.Matrix4.getColumn(enu, 2, new Cesium.Cartesian4());
                const up = Cesium.Cartesian3.fromCartesian4(up4);
                const gridPlaneDef = new Cesium.Plane(Cesium.Cartesian3.normalize(up, new Cesium.Cartesian3()), -Cesium.Cartesian3.dot(up, siteCenter));
                const gridSize = boundingSphere.radius * 3.0;
                
                const gridEntity = viewer.entities.add({
                    position: siteCenter,
                    plane: { plane: gridPlaneDef, dimensions: new Cesium.Cartesian2(gridSize, gridSize), material: new Cesium.GridMaterialProperty({ color: Cesium.Color.fromCssColorString('#6b7280'), cellAlpha: 0.35, lineCount: new Cesium.Cartesian2(24, 24) }) }
                });
                viewer.scene.requestRender();
                cleanupFuncs.current.push(() => viewer.entities.remove(gridEntity));

                const verticalGridEntity = viewer.entities.add({
                    plane: {
                        plane: new Cesium.CallbackProperty(() => new Cesium.Plane(planeNormal, sceneData.current.halfMapPlane.distance), false),
                        dimensions: new Cesium.Cartesian2(gridSize, boundingSphere.radius * 2.5),
                        material: new Cesium.GridMaterialProperty({ color: Cesium.Color.fromCssColorString('#6b7280'), cellAlpha: 0.3, lineCount: new Cesium.Cartesian2(24, 12) })
                    }
                });
                viewer.scene.requestRender();
                cleanupFuncs.current.push(() => viewer.entities.remove(verticalGridEntity));

                const duration = 5.0;
                const startTime = Cesium.JulianDate.now();

                tickListener = () => {
                    const elapsed = Cesium.JulianDate.secondsDifference(Cesium.JulianDate.now(), startTime);
                    const p = Math.min(1.0, elapsed / duration);
                    const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
                    sceneData.current.halfMapPlane.distance = Cesium.Math.lerp(distance - boundingSphere.radius, distance, ease);
                    viewer.scene.requestRender();

                    if (p >= 1.0) {
                        viewer.clock.onTick.removeEventListener(tickListener);
                        tickListener = undefined;
                        setAnimationPhase('final');
                    }
                };
                viewer.clock.onTick.addEventListener(tickListener);
            }
            else if (animationPhase === 'final') {
                const traceDataSource = dataSources.current.find(ds => ds.name === 'traces');
                if (traceDataSource) {
                    traceDataSource.entities.values.forEach((e:any) => {
                        const material = e.polyline.material.color.getValue(viewer.clock.currentTime);
                        e.polyline.material = new Cesium.ColorMaterialProperty(material.withAlpha(1.0));
                        viewer.scene.requestRender();
                    });
                }
                setControlsVisible(true);
                viewer.scene.screenSpaceCameraController.enableInputs = true;
                viewer.scene.requestRender();
            }
        };

        runAnimation();

        return () => {
            if (tickListener) {
                viewer.clock.onTick.removeEventListener(tickListener);
            }
        };
    }, [animationPhase, viewer]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (viewer && !viewer.isDestroyed()) {
                dataSources.current.forEach(ds => viewer.dataSources.remove(ds, true));
                cleanupFuncs.current.forEach(func => func());
                if (viewer.scene.globe.clippingPlanes) {
                    viewer.scene.globe.clippingPlanes.enabled = false;
                }
                viewer.scene.screenSpaceCameraController.enableInputs = true;
                viewer.scene.globe.depthTestAgainstTerrain = false;
            }
        };
    }, [viewer]);

    const handleAnimateDiscovery = () => {
        const traceDataSource = dataSources.current.find(ds => ds.name === 'traces');
        if (!traceDataSource) return;
        const sortedEntities = [...traceDataSource.entities.values].sort((a, b) => a.name.localeCompare(b.name));
        sortedEntities.forEach(entity => { if(entity.polyline) entity.polyline.show = false; });
        let index = 0;
        const interval = setInterval(() => {
            if (index < sortedEntities.length) {
                const entity = sortedEntities[index];
                if (entity.polyline) entity.polyline.show = true;
                index++;
            } else {
                clearInterval(interval);
            }
        }, 50);
        cleanupFuncs.current.push(() => clearInterval(interval));
    };

    const handleToggleVisibility = (filter: string) => {
        const traceDataSource = dataSources.current.find(ds => ds.name === 'traces');
        if (!traceDataSource) return;
        traceDataSource.entities.values.forEach((entity: any) => {
            if (entity.polyline) {
                if (filter === 'all') {
                    entity.polyline.show = true;
                } else {
                    entity.polyline.show = entity.name.startsWith(filter);
                }
            }
        });
    };

    return (
        <>
            <Legend title={graphiticCarbonLegendData.title} type="categorical" items={graphiticCarbonLegendData.items} show={controlsVisible} />
            <DrillholeControls show={controlsVisible} onAnimate={handleAnimateDiscovery} onToggle={handleToggleVisibility} />
        </>
    );
};

export default AnimatedRevealViewer;
