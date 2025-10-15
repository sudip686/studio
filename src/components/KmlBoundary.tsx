import { useEffect, useRef } from 'react';

interface KmlBoundaryProps {
    viewer: any;
    styled?: boolean;
}

const KmlBoundary = ({ viewer, styled = false }: KmlBoundaryProps) => {
    const kmlDataSourceRef = useRef<any>(null);
    const labelRef = useRef<any>(null);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const Cesium = window.Cesium;

        const loadKml = async () => {
            try {
                const dataSource = await Cesium.KmlDataSource.load('/tanga_boundary.kmz', {
                    camera: viewer.scene.camera,
                    canvas: viewer.scene.canvas
                });

                if (viewer && !viewer.isDestroyed()) {
                    kmlDataSourceRef.current = dataSource;
                    viewer.dataSources.add(dataSource);

                    dataSource.entities.values.forEach((entity: any) => {
                        entity.show = true;
                        if (entity.polygon) {
                            entity.polygon.outline = true;
                            entity.polygon.outlineColor = Cesium.Color.RED;
                            entity.polygon.outlineWidth = 10;
                            entity.polygon.fill = styled;
                            entity.polygon.material = styled ? Cesium.Color.WHITE.withAlpha(0.5) : undefined;
                        }
                        if (entity.polyline) {
                            entity.polyline.show = true;
                            entity.polyline.material = Cesium.Color.RED;
                            entity.polyline.width = 5;
                        }
                    });

                    const kmlLabel = viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(38.78, -4.8),
                        label: {
                            text: 'Tanga Graphite',
                            font: '24pt sans-serif',
                            fillColor: Cesium.Color.RED,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineWidth: 5,
                            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                            pixelOffset: new Cesium.Cartesian2(0, -9),
                            show: true
                        }
                    });
                    labelRef.current = kmlLabel;

                    viewer.flyTo(dataSource);
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
            }
        };
    }, [viewer, styled]);

    return null;
};

export default KmlBoundary;
