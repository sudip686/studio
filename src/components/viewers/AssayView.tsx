'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useDataCache } from '@/lib/data-cache';
import { Legend } from '@/components/ui/legend';
import { OverlaySlot } from '@/ui/overlays';
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

type AssayRangeFilter = { min: number; max: number } | null;

export default function AssayViewer({ assayFilterRange }: { assayFilterRange?: AssayRangeFilter }) {
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
    const [localRange, setLocalRange] = useState<AssayRangeFilter>(assayFilterRange ?? null);

    const onTerrainLoaded = useCallback(() => setTerrainReady(true), []);
    const onBoreholesLoaded = useCallback(() => setBoreholesReady(true), []);

    useEffect(() => {
        if (assayFilterRange) {
            setLocalRange({ ...assayFilterRange });
        } else {
            setLocalRange({ min: assayRange.min, max: assayRange.max });
        }
    }, [assayFilterRange, assayRange.min, assayRange.max]);

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
                assayFilterRange={localRange ?? undefined}
                assayRange={assayRange}
                onLoaded={onBoreholesLoaded}
            />
            <OverlaySlot slot="top-right" wrapperClassName="w-[320px] flex flex-col items-end">
                <div className="pointer-events-auto bg-black/60 text-white rounded p-3 space-y-3">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-white/80">
                            <span>Assay range filter</span>
                            <button
                                className="text-[11px] text-orange-300 hover:text-orange-200"
                                onClick={() => setLocalRange({ min: assayRange.min, max: assayRange.max })}
                            >
                                Reset
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs">
                                Min
                                <input
                                    type="number"
                                    step="0.1"
                                    value={localRange?.min ?? assayRange.min}
                                    onChange={(e) => setLocalRange(prev => ({
                                        min: Number(e.target.value),
                                        max: Math.max(Number(e.target.value), prev?.max ?? assayRange.max)
                                    }))}
                                    className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1 text-xs"
                                />
                            </label>
                            <label className="text-xs">
                                Max
                                <input
                                    type="number"
                                    step="0.1"
                                    value={localRange?.max ?? assayRange.max}
                                    onChange={(e) => setLocalRange(prev => ({
                                        min: Math.min(prev?.min ?? assayRange.min, Number(e.target.value)),
                                        max: Number(e.target.value)
                                    }))}
                                    className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1 text-xs"
                                />
                            </label>
                        </div>
                        <input
                            type="range"
                            min={assayRange.min}
                            max={assayRange.max}
                            step={0.1}
                            value={localRange?.min ?? assayRange.min}
                            onChange={(e) => setLocalRange(prev => ({
                                min: Number(e.target.value),
                                max: Math.max(Number(e.target.value), prev?.max ?? assayRange.max)
                            }))}
                            className="w-full"
                        />
                        <input
                            type="range"
                            min={assayRange.min}
                            max={assayRange.max}
                            step={0.1}
                            value={localRange?.max ?? assayRange.max}
                            onChange={(e) => setLocalRange(prev => ({
                                min: Math.min(prev?.min ?? assayRange.min, Number(e.target.value)),
                                max: Number(e.target.value)
                            }))}
                            className="w-full"
                        />
                    </div>
                </div>
            </OverlaySlot>

            <OverlaySlot slot="bottom-left">
                <Legend 
                    title="Assay Value" 
                    type="gradient"
                    gradient={assayGradient}
                    minLabel={(localRange?.min ?? assayRange.min).toFixed(2)}
                    maxLabel={(localRange?.max ?? assayRange.max).toFixed(2)}
                    guidance="Higher values trend toward red; lower values trend toward green. Use the hover tooltip to inspect exact values at a location."
                />
            </OverlaySlot>
        </>
    );
}
