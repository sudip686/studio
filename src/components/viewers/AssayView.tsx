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
                padding: 1.14,
                targetScreenFraction: 0.82,
                minDistance: 260,
                maxDistance: 22000,
                screenBiasX: 0.18,
                screenBiasY: 0.04,
                containMode: 'best-fit',
                viewDir: new THREE.Vector3(0.84, 0.64, 1.04).normalize(),
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
                quality="presentation"
                onLoaded={onTerrainLoaded}
            />
            <BoreholeLayer 
                modelCenter={processedAssayData?.modelCenter} 
                type="assay" 
                assayFilterRange={localRange ?? undefined}
                assayRange={assayRange}
                onLoaded={onBoreholesLoaded}
            />
            <OverlaySlot slot="top-left" wrapperClassName="w-[272px] max-w-[calc(100vw-2rem)] flex flex-col items-start">
                <div className="pointer-events-auto overflow-hidden rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,15,24,0.92),rgba(5,9,16,0.72))] p-3 text-white shadow-[0_22px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-white/74">
                            <span className="uppercase tracking-[0.18em] text-white/48">Assay filter</span>
                            <button
                                className="text-[11px] text-orange-300 hover:text-orange-200"
                                onClick={() => setLocalRange({ min: assayRange.min, max: assayRange.max })}
                            >
                                Reset
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] text-white/72">
                                Min
                                <input
                                    type="number"
                                    step="0.1"
                                    value={localRange?.min ?? assayRange.min}
                                    onChange={(e) => setLocalRange(prev => ({
                                        min: Number(e.target.value),
                                        max: Math.max(Number(e.target.value), prev?.max ?? assayRange.max)
                                    }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/28 px-2 py-1 text-[11px] text-white"
                                />
                            </label>
                            <label className="text-[11px] text-white/72">
                                Max
                                <input
                                    type="number"
                                    step="0.1"
                                    value={localRange?.max ?? assayRange.max}
                                    onChange={(e) => setLocalRange(prev => ({
                                        min: Math.min(prev?.min ?? assayRange.min, Number(e.target.value)),
                                        max: Number(e.target.value)
                                    }))}
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/28 px-2 py-1 text-[11px] text-white"
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
                            className="range-slider w-full"
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
                            className="range-slider w-full"
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
                    guidance="Higher values transition toward warm yellow-orange; lower values stay cooler for faster grade scanning."
                />
            </OverlaySlot>
        </>
    );
}
