import { useEffect, useRef } from 'react';

import { useCesium } from '@/contexts/cesium-context';
import { fitViewerToDataSource } from '@/lib/utils/cesium-fit';

interface KmlBoundaryProps {
    styled?: boolean;
}

const KmlBoundary = ({ styled = false }: KmlBoundaryProps) => {
    const { viewer, renderController } = useCesium();
    const kmlDataSourceRef = useRef<any>(null);
    const labelRef = useRef<any>(null);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const Cesium = (window as any).Cesium as typeof import('cesium');

        const loadKml = async () => {
            try {
                const dataSource = await Cesium.KmlDataSource.load('/tanga_boundary.kmz', {
                    camera: viewer.scene.camera,
                    canvas: viewer.scene.canvas
                });

                console.log("KMZ Data Source loaded:", dataSource);
                console.log("Number of entities in KMZ Data Source:", dataSource.entities.values.length);

                if (viewer && !viewer.isDestroyed()) {
                    kmlDataSourceRef.current = dataSource;
                    viewer.dataSources.add(dataSource);
                    viewer.scene.requestRender();

                    dataSource.entities.values.forEach((entity: any) => {
                        entity.show = true;
                        if (entity.polygon) {
                            entity.polygon.outline = true;
                            entity.polygon.outlineColor = Cesium.Color.RED;
                            entity.polygon.outlineWidth = 5;
                            entity.polygon.fill = styled;
                            entity.polygon.material = styled ? Cesium.Color.WHITE.withAlpha(0.5) : undefined;
                            // Ensure boundary is drawn on the surface only (avoid "double" outlines from altitude data)
                            entity.polygon.height = 0;
                            (entity.polygon as any).extrudedHeight = undefined;
                            entity.polygon.perPositionHeight = false;
                            entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
                        }
                        if (entity.polyline) {
                            entity.polyline.show = true;
                            entity.polyline.material = Cesium.Color.RED;
                            entity.polyline.width = 5;
                            // Clamp boundary polylines to ground so only one line renders
                            entity.polyline.clampToGround = true;
                            entity.polyline.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
                        }
                    });

                    let kmlLabel = null;
                    kmlLabel = viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(38.78, -4.8),
                        label: {
                            text: 'Tanga Graphite',
                            font: '24pt sans-serif',
                            fillColor: Cesium.Color.RED,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineWidth: 4,
                            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                            pixelOffset: new Cesium.Cartesian2(0, -9),
                            show: true,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY
                        }
                    });
                    viewer.scene.requestRender();
                    if (kmlLabel) {
                        labelRef.current = kmlLabel;
                    }

                    // Cancel any other flights that might still be running (imagery, previous view, etc.)
                    viewer.camera.cancelFlight?.();

                    // 1) render one frame so DataSourceDisplay builds draw commands
                    renderController?.pulse?.(); // <— call the controller

                    // The dataSource is ready after KmlDataSource.load resolves, so no need to await dataSource.readyPromise

                    // 2) (optional) guard: wait for next preRender to be extra safe
                    await new Promise<void>((resolve) => {
                        const remove = viewer.scene.preRender.addEventListener(() => {
                            remove();
                            resolve();
                        });
                    });

                    // 3) Start a temporary animation for the duration of the flight so you SEE it
                    const flightMs = 1600; // match your flyTo duration
                    renderController?.animateFor?.(flightMs + 300); // small buffer

                    try {
                        await fitViewerToDataSource(viewer, dataSource, {
                            headingDeg: 30,
                            pitchDeg: -35,
                            rangeScale: 3.5,
                            duration: flightMs / 1000,
                        });
                    } catch (e) {
                        const Cesium = (window as any).Cesium;
                        const offset = new Cesium.HeadingPitchRange(
                            Cesium.Math.toRadians(30),
                            Cesium.Math.toRadians(-35),
                            0
                        );
                        viewer.camera.flyTo({ destination: viewer.camera.position, duration: 0 }); // no-op to ensure camera state
                        renderController?.animateFor?.(800);
                        await viewer.zoomTo(dataSource, offset);
                    } finally {
                        renderController?.pulse?.(); // draw final frame at the end
                    }
                }
            } catch (error) {
                console.error("Error loading KML data source:", error);
            }
        };

        loadKml();

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                if (kmlDataSourceRef.current) {
                    viewer.dataSources.remove(kmlDataSourceRef.current, true);
                    kmlDataSourceRef.current = null;
                }
                if (labelRef.current) {
                    viewer.entities.remove(labelRef.current);
                    labelRef.current = null;
                }
                viewer.scene.requestRender(); // Request render after cleanup
            }
        };
    }, [viewer, styled]);

    return null;
};

export default KmlBoundary;
