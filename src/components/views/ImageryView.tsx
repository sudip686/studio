'use client';

import { useEffect } from 'react';
import { useCesium } from '@/contexts/cesium-context'; // Import flyHome
import IonImageryLayer from '../IonImageryLayer';

interface ImageryViewProps {
    assetId: number;
}

const ImageryView = ({ assetId }: ImageryViewProps) => {
    const { viewer, ready } = useCesium();

    useEffect(() => {
        if (!ready || !viewer) return;
        if (viewer.dataSources.length === 0) viewer.camera.flyHome(0);
    }, [ready, viewer]);

    return <IonImageryLayer assetId={assetId} />;
};

export default ImageryView;
