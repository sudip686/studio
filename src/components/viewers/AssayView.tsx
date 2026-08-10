'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useDataCache } from '@/lib/data-cache';
import { ErrorDisplay } from '@/components/ui/error-display';
import { useThreeScene } from '@/contexts/three-scene-context';
import { fitCameraToGroupWorldAware } from '@/lib/utils/three-helpers';
import TerrainSurfaceLayer from './TerrainSurfaceLayer';
import BoreholeLayer from './BoreholeLayer';

const DEFAULT_ASSAY_FIT = {
    padding: 1.14,
    targetScreenFraction: 0.82,
    minDistance: 260,
    maxDistance: 22000,
    screenBiasX: 0.18,
    screenBiasY: 0.04,
    containMode: 'best-fit' as const,
    viewDir: new THREE.Vector3(0.84, 0.64, 1.04).normalize(),
};

const PRESENTATION_ASSAY_FIT = {
    padding: 1.11,
    targetScreenFraction: 0.87,
    minDistance: 240,
    maxDistance: 20000,
    screenBiasX: 0.12,
    screenBiasY: -0.03,
    containMode: 'best-fit' as const,
    viewDir: new THREE.Vector3(1.02, 0.6, 0.58).normalize(),
};

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

type AssayRangeFilter = { min: number; max: number } | null;

function rangesMatch(left: AssayRangeFilter | undefined, right: AssayRangeFilter | undefined) {
    if (!left && !right) return true;
    if (!left || !right) return false;
    return Math.abs(left.min - right.min) < 0.0001 && Math.abs(left.max - right.max) < 0.0001;
}

export default function AssayViewer({
    assayFilterRange,
    presentationMode = false,
    meshVisible = true,
    terrainOpacity = 1,
}: {
    assayFilterRange?: AssayRangeFilter;
    presentationMode?: boolean;
    meshVisible?: boolean;
    terrainOpacity?: number;
}) {
    const { processedAssayData, resourceStatus, resourceErrors, refetch } = useDataCache();

    const assayRange = useMemo(() => {
        if (!processedAssayData || !processedAssayData.assayRange) return { min: 0, max: 1 };
        return processedAssayData.assayRange;
    }, [processedAssayData]);

    const { camera, controls, dynamicGroup } = useThreeScene();
    const [terrainReady, setTerrainReady] = useState(false);
    const [boreholesReady, setBoreholesReady] = useState(false);
    const [localRange, setLocalRange] = useState<AssayRangeFilter>(assayFilterRange ?? null);
    const cameraFitOptions = presentationMode ? PRESENTATION_ASSAY_FIT : DEFAULT_ASSAY_FIT;
    const effectiveTerrainOpacity = Math.min(1, terrainOpacity * 1.3);

    const onTerrainLoaded = useCallback(() => setTerrainReady(true), []);
    const onBoreholesLoaded = useCallback(() => setBoreholesReady(true), []);

    useEffect(() => {
        if (assayFilterRange) {
            setLocalRange((current) => (rangesMatch(current, assayFilterRange) ? current : { ...assayFilterRange }));
            return;
        }

        setLocalRange((current) => {
            const nextRange = { min: assayRange.min, max: assayRange.max };
            if (current && rangesMatch(current, nextRange)) {
                return current;
            }
            return current ?? nextRange;
        });
    }, [assayFilterRange, assayRange.min, assayRange.max]);

    const tryFit = () => {
        if (!camera || !controls || !dynamicGroup) return;
        // Fit as soon as either terrain or boreholes are ready (then refit once both are ready)
        if (!terrainReady && !boreholesReady) return;

        // Use requestIdleCallback for non-critical fitting operations
        const fitOperation = () => {
            dynamicGroup.updateMatrixWorld(true);
            fitCameraToGroupWorldAware(camera, controls, dynamicGroup, {
                ...cameraFitOptions,
                filter: (o) => !!o.userData.isBorehole,
            });
            console.log('[AssayView] Camera fitted to terrain + boreholes.');
        };

        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(fitOperation, { timeout: 2000 });
        } else {
            requestAnimationFrame(fitOperation);
        }
    };

    useEffect(() => {
        tryFit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terrainReady, boreholesReady, presentationMode]);

    // DEBUG: Log meshVisible prop
    useEffect(() => {
        console.log('[AssayView] meshVisible:', meshVisible);
    }, [meshVisible]);

    if (resourceStatus.assay === 'loading' || (resourceStatus.assay === 'idle' && !processedAssayData)) {
        return (
            <div className="viewer-status-card">
                <div className="viewer-status-card__spinner" />
                <div className="viewer-status-card__copy">
                    <strong>Loading assay model</strong>
                    <span>Preparing terrain, drillhole intervals, and grade filters.</span>
                </div>
            </div>
        );
    }

    if (resourceErrors.assay && !processedAssayData) {
        return <ErrorDisplay message={resourceErrors.assay} onRetry={refetch} />;
    }

    if (!processedAssayData) {
        return (
            <div className="viewer-status-card viewer-status-card--subtle">
                <div className="viewer-status-card__copy">
                    <strong>No assay data yet</strong>
                    <span>Refresh the chapter once the assay dataset becomes available.</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <TerrainSurfaceLayer
                verticalScale={1}
                modelCenter={processedAssayData?.modelCenter}
                quality="presentation"
                onLoaded={onTerrainLoaded}
                meshVisible={meshVisible}
                meshOpacity={effectiveTerrainOpacity}
                showEnvironment={false}
                sceneMode={'clean'}
            />
            <BoreholeLayer 
                modelCenter={processedAssayData?.modelCenter} 
                type="assay" 
                assayFilterRange={localRange ?? undefined}
                assayRange={assayRange}
                visualMode={presentationMode ? 'presentation' : 'default'}
                onLoaded={onBoreholesLoaded}
            />
        </>
    );
}





