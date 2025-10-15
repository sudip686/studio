import { useEffect, useRef } from 'react';

import { useCesium } from '@/contexts/cesium-context';

interface IonImageryLayerProps {
    assetId: number;
}

const IonImageryLayer = ({ assetId }: IonImageryLayerProps) => {
    const { viewer } = useCesium();
    const imageryLayerRef = useRef<any>(null);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const Cesium = (window as any).Cesium as typeof import('cesium');
        let isMounted = true;

        const loadImageryLayer = async () => {
            try {
                const provider = await Cesium.IonImageryProvider.fromAssetId(assetId);
                if (isMounted && viewer && !viewer.isDestroyed()) {
                    const layer = viewer.imageryLayers.addImageryProvider(provider);
                    imageryLayerRef.current = layer;
                    viewer.scene.requestRender();
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
