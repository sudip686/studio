'use client';

import { useEffect, useRef, useState } from 'react';
import { useDataCache } from '@/lib/data-cache';
import { Legend } from '@/components/ui/legend';
import { OverlaySlot } from '@/ui/overlays';
import { useThreeScene } from '../../contexts/three-scene-context';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LITHOLOGY_COLOR_MAP } from '@/lib/boreholes/colors';
import TerrainSurfaceLayer from './TerrainSurfaceLayer';
import BoreholeLayer from './BoreholeLayer';
import { fitCameraToGroupWorldAware } from '../../lib/utils/three-helpers';

export default function LithologyView() {
    const { processedLithologyData, loadingStatus, error, refetch } = useDataCache();
    const { scene, camera, controls, dynamicGroup } = useThreeScene();
    const mountedRef = useRef(false);
    const [terrainReady, setTerrainReady] = useState(false);
    const [boreholesReady, setBoreholesReady] = useState(false);

    const onTerrainLoaded = useCallback(() => setTerrainReady(true), []);
    const onBoreholesLoaded = useCallback(() => setBoreholesReady(true), []);

    useEffect(() => {
        if (!processedLithologyData || !camera || !controls || !dynamicGroup) return;
        if (mountedRef.current) return;
        
    }, [processedLithologyData, camera, controls, dynamicGroup]);

    if (loadingStatus === 'loading') return <div>Loading...</div>;
    if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

    // Stabilize legend items with useMemo
    const lithologyLegendItems = React.useMemo(() => {
        return (LITHOLOGY_COLOR_MAP && Object.entries(LITHOLOGY_COLOR_MAP).length > 0)
            ? Object.entries(LITHOLOGY_COLOR_MAP).map(([label, color]) => ({
                label: label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                color,
            }))
            : [];
    }, []);

    const tryFit = () => {
        if (!camera || !controls || !dynamicGroup) return;
        // Fit as soon as either terrain or boreholes are ready (then refit once both are ready)
        if (!terrainReady && !boreholesReady) return;
        requestAnimationFrame(() => {
            dynamicGroup.updateMatrixWorld(true);
            // Clamp the fitting area so the massive terrain mesh doesn't force an extreme zoom-out
            fitCameraToGroupWorldAware(camera, controls, dynamicGroup, {
                padding: 1.3,
                minDistance: 200,
                maxDistance: 20000,
                filter: (o) => !!o.userData.isBorehole, // Only fit to boreholes
            });
            console.log('[LithologyView] Camera fitted to terrain + boreholes.');
        });
    };

    useEffect(() => {
        tryFit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terrainReady, boreholesReady]);

    return (
        <>
            <TerrainSurfaceLayer 
                verticalScale={1} 
                modelCenter={processedLithologyData?.modelCenter}
                onLoaded={onTerrainLoaded}
            />
            <BoreholeLayer 
                modelCenter={processedLithologyData?.modelCenter} 
                type="lithology" 
                onLoaded={onBoreholesLoaded}
            />
            
            <OverlaySlot slot="bottom-left">
                <Legend title="Lithology" items={lithologyLegendItems} />
            </OverlaySlot>
        </>
    );
}
