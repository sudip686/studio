import { useEffect, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';

interface IonKmlLayerProps {
    assetId: number;
}

const IonKmlLayer = ({ assetId }: IonKmlLayerProps) => {
    const { viewer } = useCesium();
    const dataSourceRef = useRef<any>(null);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const Cesium = (window as any).Cesium as typeof import('cesium');
        let isMounted = true;

        const loadKml = async () => {
            try {
                const resource = await Cesium.IonResource.fromAssetId(assetId);
                const dataSource = await Cesium.KmlDataSource.load(resource, {
                    camera: viewer.scene.camera,
                    canvas: viewer.scene.canvas,
                    clampToGround: true
                });

                if (isMounted && viewer && !viewer.isDestroyed()) {
                    // Style entities for visibility
                    dataSource.entities.values.forEach((entity: any) => {
                        if (entity.polygon) {
                            entity.polygon.outline = true;
                            entity.polygon.outlineColor = Cesium.Color.RED;
                            entity.polygon.fill = false;
                            
                            // Workaround for Windows outlineWidth limitation: 
                            // Add a separate polyline to ensure thick boundary is visible
                            const positions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;
                            viewer.entities.add({
                                polyline: {
                                    positions: [...positions, positions[0]], // Close the loop
                                    width: 5,
                                    material: Cesium.Color.RED,
                                    clampToGround: true
                                }
                            });
                        }
                        if (entity.polyline) {
                            entity.polyline.width = 5;
                            entity.polyline.material = Cesium.Color.RED;
                            entity.polyline.clampToGround = true;
                        }
                    });

                    dataSourceRef.current = dataSource;
                    await viewer.dataSources.add(dataSource);
                    viewer.scene.requestRender();
                }
            } catch (error) {
                console.error(`Error loading ION KML asset ${assetId}:`, error);
            }
        };

        loadKml();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed() && dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current, true);
                dataSourceRef.current = null;
            }
        };
    }, [viewer, assetId]);

    return null;
};

export default IonKmlLayer;
