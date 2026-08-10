'use client';

import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataCache } from '@/lib/data-cache';
import { useThreeScene } from '../../contexts/three-scene-context';
import { ErrorDisplay } from '@/components/ui/error-display';
import TerrainSurfaceLayer from './TerrainSurfaceLayer';
import BoreholeLayer from './BoreholeLayer';
import { fitCameraToGroupWorldAware } from '../../lib/utils/three-helpers';

const DEFAULT_LITHOLOGY_FIT = {
    padding: 1.14,
    targetScreenFraction: 0.84,
    minDistance: 260,
    maxDistance: 22000,
    screenBiasX: 0.16,
    screenBiasY: 0.04,
    containMode: 'best-fit' as const,
    viewDir: new THREE.Vector3(0.82, 0.62, 1.02).normalize(),
};

const PRESENTATION_LITHOLOGY_FIT = {
    padding: 1.11,
    targetScreenFraction: 0.88,
    minDistance: 240,
    maxDistance: 20000,
    screenBiasX: 0.1,
    screenBiasY: -0.03,
    containMode: 'best-fit' as const,
    viewDir: new THREE.Vector3(1.04, 0.58, 0.56).normalize(),
};

export default function LithologyView({
    presentationMode = false,
    meshVisible = true,
    terrainOpacity = 1,
}: {
    presentationMode?: boolean;
    meshVisible?: boolean;
    terrainOpacity?: number;
}) {
    const { processedLithologyData, resourceStatus, resourceErrors, refetch } = useDataCache();
    const { camera, controls, dynamicGroup } = useThreeScene();
    const [terrainReady, setTerrainReady] = useState(false);
    const [boreholesReady, setBoreholesReady] = useState(false);
    const [isFitting, setIsFitting] = useState(false);

    // Determine if we're on a presentation slide (SSR-safe).
    const isPresentationSlide = useMemo(() => {
        if (typeof window === 'undefined') return false;
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        return ['lithology', 'assay', 'carbon_model', 'classification'].some((id) =>
            pathSegments.includes(id)
        );
    }, []);

    // Presentation slides get enhanced material quality
    const enhancedPresentationMode = presentationMode || isPresentationSlide;

    const cameraFitOptions = enhancedPresentationMode ? PRESENTATION_LITHOLOGY_FIT : DEFAULT_LITHOLOGY_FIT;
    const effectiveTerrainOpacity = Math.min(1, terrainOpacity * 1.3);

    const onTerrainLoaded = useCallback(() => setTerrainReady(true), []);
    const onBoreholesLoaded = useCallback(() => setBoreholesReady(true), []);

    const tryFit = () => {
        if (!camera || !controls || !dynamicGroup) return;
        if (!terrainReady && !boreholesReady) return;
        if (isFitting) return;

        setIsFitting(true);
        // Use requestIdleCallback for non-critical fitting operations
        const fitOperation = () => {
            dynamicGroup.updateMatrixWorld(true);
            fitCameraToGroupWorldAware(camera, controls, dynamicGroup, {
                ...cameraFitOptions,
                filter: (o) => !!o.userData.isBorehole,
            });
            console.log('[LithologyView] Camera fitted to terrain + boreholes.');
            setTimeout(() => setIsFitting(false), 2000);
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

    useEffect(() => {
        console.log('[LithologyView] meshVisible:', meshVisible);
    }, [meshVisible]);

    if (resourceStatus.lithology === 'loading' || (resourceStatus.lithology === 'idle' && !processedLithologyData)) {
        return (
            <div className="viewer-status-card">
                <div className="viewer-status-card__spinner" />
                <div className="viewer-status-card__copy">
                    <strong>Loading lithology model</strong>
                    <span>Preparing terrain, borehole traces, and host-unit colors.</span>
                </div>
            </div>
        );
    }

    if (resourceErrors.lithology && !processedLithologyData) {
        return <ErrorDisplay message={resourceErrors.lithology} onRetry={refetch} />;
    }
    if (!processedLithologyData) {
        return (
            <div className="viewer-status-card viewer-status-card--subtle">
                <div className="viewer-status-card__copy">
                    <strong>No lithology data yet</strong>
                    <span>Refresh the chapter once the dataset is available.</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <TerrainSurfaceLayer
                verticalScale={1}
                modelCenter={processedLithologyData?.modelCenter}
                quality="presentation"
                onLoaded={onTerrainLoaded}
                meshVisible={meshVisible}
                meshOpacity={effectiveTerrainOpacity}
                showEnvironment={false}
                sceneMode={'clean'}
            />
            <BoreholeLayer 
                modelCenter={processedLithologyData?.modelCenter} 
                type="lithology" 
                visualMode={enhancedPresentationMode ? 'presentation' : 'default'}
                onLoaded={onBoreholesLoaded}
            />
        </>
    );
}







