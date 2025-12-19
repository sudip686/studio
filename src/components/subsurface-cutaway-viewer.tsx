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

const getAssayColor = (value: number, Cesium: any) => {
    const v = Number(value);
    if (!Number.isFinite(v)) return Cesium.Color.fromCssColorString('#CCCCCC');
    if (v > 5.0) return Cesium.Color.RED;
    if (v > 2.0) return Cesium.Color.ORANGE;
    if (v > 0.5) return Cesium.Color.YELLOW;
    if (v > 0.3) return Cesium.Color.GREEN;
    if (v > 0.1) return Cesium.Color.CYAN;
    return Cesium.Color.BLUE;
};

const SubsurfaceCutawayViewer = () => {
    const { viewer, ready } = useCesium(); // Using new context
    
    const [viewState, setViewState] = useState<'subsurface' | 'animating' | 'surface'>('subsurface');
    const [clipDistance, setClipDistance] = useState(0);
    
    const clippingPlaneRef = useRef<any>(null);
    const dataSourceRef = useRef<any>(null);
    const gridPlaneRef = useRef<any>(null);
    const boundingSphereRef = useRef<any>(null);

    // Effect to setup the initial cutaway view
    useEffect(() => {
        if (!ready || !viewer) return;
        const Cesium = (window as any).Cesium as typeof import('cesium');
        let isMounted = true;

        const setupScene = async () => {
            try {
                const response = await fetch('/assay_data.geojson');
                const assayData = await response.json();
                if (!isMounted) return;

                const drillholeDataSource = new Cesium.CustomDataSource('drillholes_cutaway');
                const points: any[] = [];
                assayData.features.forEach((feature: any) => {
                    if (feature.geometry.type === 'LineString') {
                        const [start, end] = feature.geometry.coordinates;
                        const positions = Cesium.Cartesian3.fromDegreesArrayHeights([...start, ...end]);
                        points.push(positions[0]);
                        points.push(positions[1]);
                        const color = getAssayColor(feature.properties.graphitic_carbon, Cesium);
                        drillholeDataSource.entities.add({ polyline: { positions, width: 5, material: color } });
                    }
                });
                
                await viewer.dataSources.add(drillholeDataSource);
                dataSourceRef.current = drillholeDataSource;

                if (points.length > 0) {
                    const boundingSphere = Cesium.BoundingSphere.fromPoints(points);
                    boundingSphereRef.current = boundingSphere;
                    viewer.camera.flyToBoundingSphere(boundingSphere, { 
                        duration: 1.5,
                        offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(45.0), Cesium.Math.toRadians(-30.0), boundingSphere.radius * 1.5)
                    });

                    const normal = Cesium.Cartesian3.fromElements(0.707, 0.707, 0);
                    const plane = new Cesium.ClippingPlane(normal, 0);
                    clippingPlaneRef.current = plane;

                    viewer.scene.globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
                        planes: [plane],
                        edgeWidth: 1.0,
                        edgeColor: Cesium.Color.WHITE,
                        enabled: true
                    });

                    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a202c');

                    gridPlaneRef.current = viewer.entities.add({
                        position: boundingSphere.center,
                        plane: {
                            plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Z, 0.0),
                            dimensions: new Cesium.Cartesian2(20000, 20000),
                            material: new Cesium.GridMaterialProperty({ color: Cesium.Color.GREY, cellAlpha: 0.2, lineCount: new Cesium.Cartesian2(80, 80) })
                        },
                    });
                }
            } catch (error) {
                console.error("Error setting up cutaway view:", error);
            }
        };

        setupScene();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed()) {
                if (dataSourceRef.current) viewer.dataSources.remove(dataSourceRef.current, true);
                if (gridPlaneRef.current) viewer.entities.remove(gridPlaneRef.current);
                if (viewer.scene.globe.clippingPlanes) {
                    viewer.scene.globe.clippingPlanes.enabled = false;
                    viewer.scene.globe.clippingPlanes.removeAll();
                }
                viewer.scene.globe.baseColor = Cesium.Color.BLACK;
            }
        };
    }, [ready, viewer]);
    
    // Effect to handle slider updates
    useEffect(() => {
        if (clippingPlaneRef.current) {
            clippingPlaneRef.current.distance = clipDistance;
            viewer.scene.requestRender();
        }
    }, [clipDistance, viewer]);

    // Effect to handle return to surface animation
    useEffect(() => {
        if (viewState !== 'animating' || !ready || !viewer || !boundingSphereRef.current) return;

        const Cesium = (window as any).Cesium as typeof import('cesium');

        // 1. Remove subsurface elements
        if (viewer.scene.globe.clippingPlanes) {
            viewer.scene.globe.clippingPlanes.enabled = false;
        }
        if (gridPlaneRef.current) {
            viewer.entities.remove(gridPlaneRef.current);
            gridPlaneRef.current = null;
        }

        // 2. Animate camera to surface view
        viewer.flyTo(dataSourceRef.current, {
            duration: 2.5,
            complete: () => {
                // 3. Reset globe state
                if (viewer && !viewer.isDestroyed()) {
                    viewer.scene.globe.baseColor = Cesium.Color.BLACK;
                    setViewState('surface');
                }
            }
        });

    }, [viewState, ready, viewer]);

    return (
        <div className="h-full w-full relative pointer-events-none">
            <div className={`absolute top-4 right-4 bg-white bg-opacity-80 p-4 rounded-lg shadow-md w-72 text-sm pointer-events-auto transition-opacity duration-300 ${viewState === 'subsurface' ? 'opacity-100' : 'opacity-0'}`}>
                <h3 className="font-bold text-lg mb-2">Cutaway Control</h3>
                <label className="block font-medium mb-1">Slice Position</label>
                <input 
                    type="range" 
                    className="w-full" 
                    min="-5000" 
                    max="5000" 
                    step="50"
                    value={clipDistance}
                    onChange={e => setClipDistance(parseFloat(e.target.value))}
                />
            </div>

            {viewState === 'subsurface' && (
                 <div className="absolute top-32 right-4 z-10 pointer-events-auto">
                    <button 
                        onClick={() => setViewState('animating')} 
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg"
                    >
                        Return to Surface
                    </button>
                </div>
            )}

            <Legend title={graphiticCarbonLegendData.title} type="categorical" items={graphiticCarbonLegendData.items} show={viewState === 'subsurface'} />
        </div>
    );
};

export default SubsurfaceCutawayViewer;
