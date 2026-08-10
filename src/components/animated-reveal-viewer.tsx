'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { Legend } from '@/components/ui/legend';
import { graphiticCarbonLegendData } from '@/lib/constants';
import { Play } from 'lucide-react';
import { OverlaySlot } from '@/ui/overlays';
import { DrillholeViewerHud, SceneModePill } from '@/components/viewers/ProfessionalViewerHud';

declare global {
    interface Window {
        Cesium: any;
    }
}

const getAssayColor = (value: number, Cesium: any, alpha = 1.0) => {
    const v = Number(value);
    let color;
    if (!Number.isFinite(v)) {
        color = Cesium.Color.fromCssColorString('#CCCCCC');
    } else if (v > 8.0) {
        color = Cesium.Color.RED;
    } else if (v > 6.0) {
        color = Cesium.Color.ORANGE;
    } else if (v > 4) {
        color = Cesium.Color.YELLOW;
    } else if (v > 2) {
        color = Cesium.Color.GREEN;
    } else if (v > 1) {
        color = Cesium.Color.CYAN;
    } else {
        color = Cesium.Color.BLUE;
    }
    return color.withAlpha(alpha);
};

type AnimationPhase = 'initial' | 'loading' | 'ready' | 'surface' | 'slice' | 'final';

const AnimatedRevealViewer = () => {
    const { viewer } = useCesium();
    const [controlsVisible, setControlsVisible] = useState(false);
    const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('initial');
    const [showCollars, setShowCollars] = useState(true);
    const [showTraces, setShowTraces] = useState(true);

    const sceneData = useRef<any>({});
    const dataSources = useRef<any[]>([]);
    const cleanupFuncs = useRef<(() => void)[]>([]);

    useEffect(() => {
        if (!viewer || animationPhase !== 'initial') return;

        const loadData = async () => {
            try {
                setAnimationPhase('loading');
                const Cesium = (window as any).Cesium as typeof import('cesium');
                const response = await fetch('/assay_data.geojson');
                const assayData = await response.json();

                const collarDataSource = new Cesium.CustomDataSource('collars');
                const traceDataSource = new Cesium.CustomDataSource('traces');
                const points: any[] = [];

                assayData.features.forEach((feature: any) => {
                    if (feature.geometry.type === 'LineString') {
                        const [start, end] = feature.geometry.coordinates;
                        const positions = Cesium.Cartesian3.fromDegreesArrayHeights([...start, ...end]);
                        points.push(positions[0], positions[1]);

                        collarDataSource.entities.add({
                            position: positions[0],
                            point: {
                                pixelSize: 8,
                                color: Cesium.Color.DODGERBLUE,
                                outlineColor: Cesium.Color.WHITE.withAlpha(0.7),
                                outlineWidth: 1.5,
                            },
                        });

                        const color = getAssayColor(feature.properties.graphitic_carbon, Cesium, 0.0);
                        traceDataSource.entities.add({
                            name: feature.properties.hole_id,
                            polyline: {
                                positions,
                                width: 5,
                                material: new Cesium.ColorMaterialProperty(color),
                            },
                        });
                    }
                });

                collarDataSource.show = showCollars;
                traceDataSource.show = showTraces;
                await viewer.dataSources.add(collarDataSource);
                viewer.scene.requestRender();
                await viewer.dataSources.add(traceDataSource);
                viewer.scene.requestRender();
                dataSources.current = [collarDataSource, traceDataSource];

                const boundingSphere = Cesium.BoundingSphere.fromPoints(points);
                sceneData.current = { boundingSphere, siteCenter: boundingSphere.center };

                setAnimationPhase('ready');
            } catch (error) {
                console.error('Error loading scene data:', error);
                setAnimationPhase('initial');
            }
        };

        loadData();
    }, [animationPhase, showCollars, showTraces, viewer]);

    useEffect(() => {
        const collarDataSource = dataSources.current.find(ds => ds.name === 'collars');
        if (collarDataSource) collarDataSource.show = showCollars;
        if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
    }, [showCollars, viewer]);

    useEffect(() => {
        const traceDataSource = dataSources.current.find(ds => ds.name === 'traces');
        if (traceDataSource) traceDataSource.show = showTraces;
        if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
    }, [showTraces, viewer]);


    useEffect(() => {
        if (animationPhase === 'ready') {
            setAnimationPhase('surface');
            return;
        }

        if (!viewer || !sceneData.current.boundingSphere) return;

        const Cesium = (window as any).Cesium as typeof import('cesium');
        const { boundingSphere, siteCenter } = sceneData.current;
        let tickListener: (() => void) | undefined;

        const runAnimation = async () => {
            if (animationPhase === 'surface') {
                viewer.scene.screenSpaceCameraController.enableInputs = false;
                await viewer.camera.flyToBoundingSphere(boundingSphere, {
                    duration: 2.0,
                    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), 2000),
                });
                viewer.scene.requestRender();
                setAnimationPhase('final');
            }
            else if (animationPhase === 'final') {
                const traceDataSource = dataSources.current.find(ds => ds.name === 'traces');
                if (traceDataSource) {
                    traceDataSource.entities.values.forEach((e: any) => {
                        const material = e.polyline.material.color.getValue(viewer.clock.currentTime);
                        e.polyline.material = new Cesium.ColorMaterialProperty(material.withAlpha(1.0));
                        viewer.scene.requestRender();
                    });
                }
                setControlsVisible(true);
                viewer.scene.screenSpaceCameraController.enableInputs = true;
                viewer.scene.requestRender();
            }
        };

        runAnimation();

        return () => {
            if (tickListener) {
                viewer.clock.onTick.removeEventListener(tickListener);
            }
        };
    }, [animationPhase, viewer]);

    useEffect(() => {
        return () => {
            if (viewer && !viewer.isDestroyed()) {
                dataSources.current.forEach(ds => viewer.dataSources.remove(ds, true));
                cleanupFuncs.current.forEach(func => func());
                viewer.scene.screenSpaceCameraController.enableInputs = true;
                viewer.scene.globe.depthTestAgainstTerrain = false;
            }
        };
    }, [viewer]);

    const handleAnimateDiscovery = () => {
        const traceDataSource = dataSources.current.find(ds => ds.name === 'traces');
        if (!traceDataSource) return;
        setShowTraces(true);
        const sortedEntities = [...traceDataSource.entities.values].sort((a, b) => a.name.localeCompare(b.name));
        sortedEntities.forEach(entity => { if (entity.polyline) entity.polyline.show = false; });
        let index = 0;
        const interval = setInterval(() => {
            if (index < sortedEntities.length) {
                const entity = sortedEntities[index];
                if (entity.polyline) entity.polyline.show = true;
                viewer?.scene.requestRender();
                index++;
            } else {
                clearInterval(interval);
            }
        }, 50);
        cleanupFuncs.current.push(() => clearInterval(interval));
    };

    return (
        <>
            {controlsVisible ? (
                <>
                    <OverlaySlot slot="bottom-left" wrapperClassName="legend-panel">
                        <Legend
                            title={graphiticCarbonLegendData.title}
                            type="categorical"
                            items={graphiticCarbonLegendData.items}
                            guidance="Assay intervals are shown downhole; warmer colors indicate higher graphitic carbon."
                            show
                        />
                    </OverlaySlot>

                    <OverlaySlot slot="bottom-center">
                        <button
                            type="button"
                            onClick={handleAnimateDiscovery}
                            className="pointer-events-auto rounded-[16px] border border-white/12 bg-[linear-gradient(180deg,rgba(9,13,20,0.94),rgba(8,10,14,0.82))] px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_42px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:border-[#f1d2bf]/28"
                            data-no-deck-wheel
                        >
                            <span className="inline-flex items-center gap-2"><Play className="h-3.5 w-3.5" /> Animate discovery</span>
                        </button>
                    </OverlaySlot>

                    <OverlaySlot slot="bottom-right">
                        <SceneModePill label="Subsurface" detail="Drag to orbit, wheel to zoom, use presets above." />
                    </OverlaySlot>

                    <DrillholeViewerHud
                        mode="assay"
                        showCollars={showCollars}
                        showTraces={showTraces}
                        onShowCollarsChange={setShowCollars}
                        onShowTracesChange={setShowTraces}
                    />
                </>
            ) : null}
        </>
    );
};

export default AnimatedRevealViewer;