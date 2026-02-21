'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useDataCache } from '@/lib/data-cache';
import { Legend } from '@/components/ui/legend';
import { ErrorDisplay } from '@/components/ui/error-display';
import { useThreeScene } from '@/contexts/three-scene-context';
import { fitCameraToGroupWorldAware } from '@/lib/utils/three-helpers';
import TerrainSurfaceLayer from './TerrainSurfaceLayer';
import BoreholeLayer from './BoreholeLayer';

const ASSAY_COLOR_STEPS = 100;
const assayColorCache: { [step: number]: string } = {};
function colorForAssay(vRaw: any, min: number, max: number): string {
    const v = Number(vRaw);
    let t = Number.isFinite(v) && max > min ? (v - min) / (max - min) : 0.5;
    t = Math.max(0, Math.min(1, t));
    const step = Math.floor(t * (ASSAY_COLOR_STEPS - 1));
    if (assayColorCache[step]) return assayColorCache[step];
    const r = t, g = 1 - t, b = 0;
    const color = new THREE.Color(r, g, b);
    const hexString = '#' + color.getHexString();
    assayColorCache[step] = hexString;
    return hexString;
}

export default function AssayViewer({ assayCutoff }: { assayCutoff?: number }) {
    console.log('[AssayViewer] Mounting version with fixed imports');
    const { processedAssayData, loadingStatus, error, refetch } = useDataCache();

    const assayRange = useMemo(() => {
        if (!processedAssayData || !processedAssayData.assayRange) return { min: 0, max: 1 };
        return processedAssayData.assayRange;
    }, [processedAssayData]);

    const assayGradient = useMemo(() => {
        const startColor = colorForAssay(assayRange.min, assayRange.min, assayRange.max);
        const midColor = colorForAssay((assayRange.min + assayRange.max) / 2, assayRange.min, assayRange.max);
        const endColor = colorForAssay(assayRange.max, assayRange.min, assayRange.max);
        return `linear-gradient(to right, ${startColor}, ${midColor}, ${endColor})`;
    }, [assayRange]);

    const { scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject } = useThreeScene();
    const [terrainReady, setTerrainReady] = useState(false);
    const [boreholesReady, setBoreholesReady] = useState(false);

    const onTerrainLoaded = useCallback(() => setTerrainReady(true), []);
    const onBoreholesLoaded = useCallback(() => setBoreholesReady(true), []);

    const tryFit = () => {
        if (!camera || !controls || !dynamicGroup) return;
        // Fit as soon as either terrain or boreholes are ready (then refit once both are ready)
        if (!terrainReady && !boreholesReady) return;
        requestAnimationFrame(() => {
            dynamicGroup.updateMatrixWorld(true);
            fitCameraToGroupWorldAware(camera, controls, dynamicGroup, {
                padding: 1.3,
                minDistance: 200,
                maxDistance: 20000,
                filter: (o) => !!o.userData.isBorehole,
            });
            console.log('[AssayView] Camera fitted to terrain + boreholes.');
        });
    };

    useEffect(() => {
        tryFit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terrainReady, boreholesReady]);

    if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

    return (
        <>
            <TerrainSurfaceLayer 
                verticalScale={1} 
                modelCenter={processedAssayData?.modelCenter}
                onLoaded={onTerrainLoaded}
            />
            <BoreholeLayer 
                modelCenter={processedAssayData?.modelCenter} 
                type="assay" 
                assayCutoff={assayCutoff}
                assayRange={assayRange}
                onLoaded={onBoreholesLoaded}
            />
            
            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
                <Legend 
                    title="Assay Value" 
                    type="gradient"
                    gradient={assayGradient}
                    minLabel={assayRange.min.toFixed(2)}
                    maxLabel={assayRange.max.toFixed(2)}
                />
            </div>
        </>
    );
}
