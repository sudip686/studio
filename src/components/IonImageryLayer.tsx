import { useEffect, useRef } from 'react';

interface IonImageryLayerProps {
    viewer: any;
    assetId: number;
}

const IonImageryLayer = ({ viewer, assetId }: IonImageryLayerProps) => {
    const imageryLayerRef = useRef<any>(null);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const Cesium = window.Cesium;
        let isMounted = true;

        const loadImageryLayer = async () => {
            try {
                const provider = await Cesium.IonImageryProvider.fromAssetId(assetId);
                if (isMounted && viewer && !viewer.isDestroyed()) {
                    const layer = viewer.imageryLayers.addImageryProvider(provider);
                    imageryLayerRef.current = layer;
                    viewer.flyTo(layer);
                }
            } catch (error) {
                console.error(`Error loading ION imagery asset ${assetId}:`, error);
            }
        };

        loadImageryLayer();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed() && imageryLayerRef.current) {
                viewer.imageryLayers.remove(imageryLayerRef.current, true);
                imageryLayerRef.current = null;
            }
        };
    }, [viewer, assetId]);

    return null;
};

export default IonImageryLayer;
