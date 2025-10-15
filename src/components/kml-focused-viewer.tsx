'use client';

import { useEffect, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import Legend from '@/components/ui/legend';
import { graphiticCarbonLegendData } from '@/lib/legend-definitions';

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

const KmlFocusedViewer = () => {
    const { viewer, isLoaded } = useCesium();
    const dataSources = useRef<any[]>([]).current;
    const gridPlaneRef = useRef<any>(null);

    useEffect(() => {
        if (!isLoaded || !viewer) return;
        const Cesium = window.Cesium;
        let isMounted = true;

        const setupScene = async () => {
            try {
                // 1. Load KML boundary
                const kmlDataSource = await Cesium.KmlDataSource.load('/tanga_boundary.kmz', {
                    camera: viewer.scene.camera,
                    canvas: viewer.scene.canvas
                });
                if (!isMounted) return;
                await viewer.dataSources.add(kmlDataSource);
                dataSources.push(kmlDataSource);

                // 2. Load drillhole data
                const response = await fetch('/assay_data.geojson');
                const assayData = await response.json();
                if (!isMounted) return;

                const drillholeDataSource = new Cesium.CustomDataSource('drillholes_kml_focused');
                assayData.features.forEach((feature: any) => {
                    if (feature.geometry.type === 'LineString') {
                        const [start, end] = feature.geometry.coordinates;
                        const color = getAssayColor(feature.properties.graphitic_carbon, Cesium);
                        drillholeDataSource.entities.add({
                            polyline: {
                                positions: Cesium.Cartesian3.fromDegreesArrayHeights([...start, ...end]),
                                width: 5,
                                material: color,
                            },
                        });
                    }
                });
                await viewer.dataSources.add(drillholeDataSource);
                dataSources.push(drillholeDataSource);

                // 3. Fly camera to KML extent
                viewer.flyTo(kmlDataSource, {
                    duration: 2.0,
                    complete: () => {
                        if (isMounted && !viewer.isDestroyed()) {
                            // 4. Hide globe and show grid
                            viewer.scene.globe.show = false;
                            viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#1a202c');

                            const boundingSphere = kmlDataSource.entities.values[0]?.polygon?.hierarchy?.getValue(viewer.clock.currentTime)?.positions?.[0];
                            if(boundingSphere) {
                                const center = Cesium.BoundingSphere.fromPoints(boundingSphere)?.center;
                                gridPlaneRef.current = viewer.entities.add({
                                    name: 'KML Focus Grid',
                                    position: center,
                                    plane: {
                                        plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Z, 0),
                                        dimensions: new Cesium.Cartesian2(40000, 40000),
                                        material: new Cesium.GridMaterialProperty({ color: Cesium.Color.GREY, cellAlpha: 0.2, lineCount: new Cesium.Cartesian2(100, 100) })
                                    }
                                });
                            }
                        }
                    }
                });

            } catch (error) {
                console.error("Error in KML Focused Viewer:", error);
            }
        };

        setupScene();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed()) {
                dataSources.forEach(ds => viewer.dataSources.remove(ds, true));
                if (gridPlaneRef.current) viewer.entities.remove(gridPlaneRef.current);
                viewer.scene.globe.show = true;
                viewer.scene.backgroundColor = Cesium.Color.BLACK;
            }
        };
    }, [isLoaded, viewer]);

    return (
        <div className="h-full w-full relative pointer-events-none">
            <Legend title={graphiticCarbonLegendData.title} type="categorical" items={graphiticCarbonLegendData.items} show={true} />
        </div>
    );
};

export default KmlFocusedViewer;
