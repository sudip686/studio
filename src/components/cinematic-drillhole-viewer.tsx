'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { useDataCache } from '@/lib/data-cache';
import { BoreholeCylinderCache, Interval, Style } from '@/lib/boreholes/borehole-cylinders';
import { colorFromLegend } from '@/lib/boreholes/legend-color';
import { ASSAY_GRAPHITIC_CARBON, LITHOLOGY_COLORS } from '@/lib/constants';

type AnimationPhase = 'initial' | 'ready' | 'descending' | 'subsurface' | 'complete';

interface CinematicDrillholeViewerProps {
    type: 'lithology' | 'assay';
}

const CinematicDrillholeViewer = ({ type }: CinematicDrillholeViewerProps) => {
    const { viewer, ready } = useCesium();
    const { drillholeData } = useDataCache();
    const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('initial');

    const cacheRef = useRef<BoreholeCylinderCache | null>(null);
    const intervalsRef = useRef<any[]>([]);
    const animationRef = useRef<any>(null);
    const startPositionRef = useRef<any>(null);
    const clippingPlaneRef = useRef<any>(null);

    // Initialize drillhole entities when component mounts
    useEffect(() => {
        if (!viewer || !ready || !drillholeData) {
            console.log('[CinematicDrillholeViewer] Missing dependencies:', { viewer: !!viewer, ready, drillholeData: !!drillholeData });
            return;
        }

        const initializeEntities = async () => {
            try {
                console.log('[CinematicDrillholeViewer] Starting initialization for type:', type);

                // First, clean up any existing cinematic entities to prevent ID conflicts
                const entitiesToRemove: any[] = [];
                viewer.entities.values.forEach((entity: any) => {
                    if (entity.id && entity.id.startsWith('cinematic-')) {
                        entitiesToRemove.push(entity);
                    }
                });
                entitiesToRemove.forEach(entity => viewer.entities.remove(entity));
                console.log('[CinematicDrillholeViewer] Cleaned up', entitiesToRemove.length, 'existing entities');

                setAnimationPhase('ready');

                // Create a separate cache for cinematic drillholes to avoid ID conflicts
                cacheRef.current = new BoreholeCylinderCache(viewer, 'cinematic');
                const cache = cacheRef.current;

                // Process drillhole segments based on type
                const segmentsToUse = type === 'assay' ? (drillholeData.assay || []) : (drillholeData.lithology || []);
                console.log('[CinematicDrillholeViewer] Processing', segmentsToUse.length, 'segments for type:', type);

                const holes: Record<string, any[]> = {};
                for (const seg of segmentsToUse) {
                    if (!holes[seg.hole_id]) holes[seg.hole_id] = [];
                    holes[seg.hole_id].push(seg);
                }

                const uniqueIntervals = new Map<string, any>();
                const Cesium = (window as any).Cesium;

                Object.values(holes).forEach(segments => {
                    segments.sort((a, b) => a.depth_from - b.depth_from);
                    if (segments.length === 0) return;

                    const firstSeg = segments[0];
                    const g = firstSeg.feature?.geometry;
                    if (!g || g.type !== 'LineString' || g.coordinates.length < 2) return;

                    const coords = g.coordinates;
                    if (coords.length < 2) return;

                    // Create simple vertical intervals for cinematic effect
                    for (let i = 0; i < coords.length - 1; i++) {
                        const [startLon, startLat, startElev] = coords[i];
                        const [endLon, endLat, endElev] = coords[i + 1];

                        const startPos = Cesium.Cartesian3.fromDegrees(startLon, startLat, startElev);
                        const endPos = Cesium.Cartesian3.fromDegrees(endLon, endLat, endElev);

                        const id = `${type}-${firstSeg.hole_id}-${i}`;

                        const interval: Interval = {
                            id: id,
                            start: [startLat, startLon, startElev],
                            end: [endLat, endLon, endElev],
                            props: {
                                ...firstSeg,
                                latitude: startLat,
                                longitude: startLon,
                                graphitic_carbon: firstSeg.graphitic_carbon,
                                lithology: firstSeg.lithology
                            }
                        };

                        uniqueIntervals.set(id, interval);
                    }
                });

                intervalsRef.current = Array.from(uniqueIntervals.values());
                console.log('[CinematicDrillholeViewer] Created', intervalsRef.current.length, 'intervals');

                // Create entities with better error handling
                const entitiesCreated: any[] = [];
                viewer.entities.suspendEvents();

                for (const interval of intervalsRef.current.slice(0, 50)) { // Limit to first 50 for performance
                    try {
                        const entity = await cache.getOrCreate(interval);
                        if (entity) entitiesCreated.push(entity);
                    } catch (error) {
                        console.warn('[CinematicDrillholeViewer] Error creating entity:', error);
                    }
                }

                viewer.entities.resumeEvents();
                console.log('[CinematicDrillholeViewer] Created', entitiesCreated.length, 'entities');

                // Apply initial styles (transparent)
                applyStyles(true);

                // Start the animation immediately if we have entities
                if (entitiesCreated.length > 0) {
                    setAnimationPhase('descending');
                } else {
                    console.warn('[CinematicDrillholeViewer] No entities created, skipping animation');
                    setAnimationPhase('complete');
                }
            } catch (error) {
                console.error('[CinematicDrillholeViewer] Error in initialization:', error);
                setAnimationPhase('complete');
            }
        };

        initializeEntities();

        return () => {
            if (cacheRef.current) {
                cacheRef.current.destroy();
                cacheRef.current = null;
            }
            if (animationRef.current) {
                viewer.clock.onTick.removeEventListener(animationRef.current);
                animationRef.current = null;
            }

            // Restore default scene settings
            if (viewer.scene) {
                viewer.scene.globe.show = true;
                viewer.scene.globe.clippingPlanes = undefined;
                // Note: skyBox and sun will be restored by other components if needed
            }
        };
    }, [viewer, ready, drillholeData, type]);

    // Apply styles to entities
    const applyStyles = useCallback((transparent = false) => {
        if (!cacheRef.current || !intervalsRef.current.length || !viewer) return;

        const cache = cacheRef.current;
        const legend = type === 'assay' ? ASSAY_GRAPHITIC_CARBON : LITHOLOGY_COLORS;
        const Cesium = (window as any).Cesium;

        const defaultStyle: Style = {
            material: transparent ? Cesium.Color.TRANSPARENT : Cesium.Color.GREY,
            opacity: transparent ? 0.0 : 0.5,
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            radiusMeters: 2.5,
        };

        for (const interval of intervalsRef.current) {
            const entity = viewer.entities.getById(`cinematic-${interval.id}`);
            if (!entity) continue;

            let styleToApply: Style | null = null;
            let visible = !transparent;

            if (type === 'assay') {
                const value = interval.props.graphitic_carbon;
                if (value !== undefined && value !== null) {
                    const color = colorFromLegend(legend, value);
                    styleToApply = { material: color, opacity: transparent ? 0.0 : 1.0, outline: false, radiusMeters: 2.5 };
                } else {
                    visible = false;
                }
            } else {
                const value = interval.props.lithology;
                if (value) {
                    const normalizedValue = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
                    if (LITHOLOGY_COLORS.map[normalizedValue]) {
                        const color = colorFromLegend(legend, normalizedValue);
                        styleToApply = { material: color, opacity: transparent ? 0.0 : 1.0, outline: false, radiusMeters: 2.5 };
                    } else {
                        styleToApply = defaultStyle;
                    }
                } else {
                    visible = false;
                }
            }

            entity.show = visible;
            if (visible && styleToApply) {
                cache.applyStyle(entity, styleToApply);
            }
        }

        viewer.scene.requestRender();
    }, [viewer, type]);

    // Camera animation sequence - seamless transition from current camera position
    useEffect(() => {
        if (!viewer || animationPhase !== 'descending') return;

        const Cesium = (window as any).Cesium;

        // Store the starting camera position (from the drillhole location view)
        if (!startPositionRef.current) {
            startPositionRef.current = viewer.camera.position.clone();
        }

        const startPosition = startPositionRef.current;

        // Calculate subsurface position by moving down from current position
        const cartographic = Cesium.Cartographic.fromCartesian(startPosition);
        const surfaceElevation = cartographic.height;

        // Move down 150 meters below the current surface level
        const subsurfacePosition = Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            surfaceElevation - 150
        );

        // Create clipping plane at current surface level
        const enu = Cesium.Transforms.eastNorthUpToFixedFrame(startPosition);
        const up4 = Cesium.Matrix4.getColumn(enu, 2, new Cesium.Cartesian4());
        const up = Cesium.Cartesian3.fromCartesian4(up4);
        const planeNormal = Cesium.Cartesian3.normalize(up, new Cesium.Cartesian3());
        const distance = -Cesium.Cartesian3.dot(planeNormal, startPosition);

        const clippingPlane = new Cesium.ClippingPlane(planeNormal, distance);
        clippingPlaneRef.current = clippingPlane;

        const planeCollection = new Cesium.ClippingPlaneCollection({
            planes: [clippingPlane],
            edgeWidth: 1.0,
            edgeColor: Cesium.Color.CYAN.withAlpha(0.3),
            enabled: true
        });
        viewer.scene.globe.clippingPlanes = planeCollection;

        // Enable underground rendering
        viewer.scene.globe.show = true;
        viewer.scene.globe.undergroundColor = Cesium.Color.BLACK;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.enableLighting = true;

        // Disable sky box for better underground experience
        viewer.scene.skyBox = undefined;
        viewer.scene.sun = undefined;

        const duration = 5.0; // Longer, more cinematic transition
        const startTime = Cesium.JulianDate.now();

        let revealProgress = 0;

        animationRef.current = () => {
            const elapsed = Cesium.JulianDate.secondsDifference(Cesium.JulianDate.now(), startTime);
            const progress = Math.min(1.0, elapsed / duration);

            // Smooth easing function (ease-in-out cubic)
            const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            // Interpolate camera position from surface to subsurface
            const currentPos = new Cesium.Cartesian3();
            Cesium.Cartesian3.lerp(startPosition, subsurfacePosition, ease, currentPos);

            // Gradually adjust pitch for more cinematic view
            const startPitch = viewer.camera.pitch;
            const targetPitch = Cesium.Math.toRadians(-25); // More level view for VR
            const currentPitch = Cesium.Math.lerp(startPitch, targetPitch, ease);

            viewer.camera.setView({
                destination: currentPos,
                orientation: {
                    heading: viewer.camera.heading, // Keep current heading
                    pitch: currentPitch,
                    roll: 0
                }
            });

            // Keep clipping plane at surface level to allow viewing terrain from below
            clippingPlane.distance = distance;

            // Reveal drillholes progressively with a slight delay
            const revealDelay = 0.3; // Start revealing after 30% of animation
            const adjustedProgress = Math.max(0, (progress - revealDelay) / (1 - revealDelay));
            const newRevealProgress = Math.min(1.0, adjustedProgress * 1.2); // Reveal slightly faster

            if (newRevealProgress > revealProgress) {
                revealProgress = newRevealProgress;
                applyStyles(revealProgress < 1.0);
            }

            if (progress >= 1.0) {
                viewer.clock.onTick.removeEventListener(animationRef.current);
                animationRef.current = null;
                setAnimationPhase('subsurface');
            }
        };

        viewer.clock.onTick.addEventListener(animationRef.current);
    }, [animationPhase, viewer, applyStyles]);

    // Enable VR controls when subsurface phase is reached
    useEffect(() => {
        if (!viewer || animationPhase !== 'subsurface') return;

        // Enable VR-like controls
        viewer.scene.screenSpaceCameraController.enableInputs = true;
        setAnimationPhase('complete');
    }, [animationPhase, viewer]);

    return (
        <div className="h-full w-full relative z-20 pointer-events-none">
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg text-sm">
                <h3 className="font-bold text-lg mb-2">VR Drillhole Experience</h3>
                <p className="mb-1">Phase: {animationPhase}</p>
                <p className="mb-1">Type: {type}</p>
                <p className="text-xs opacity-75">Left-click + drag to look around</p>
                <p className="text-xs opacity-75">Mouse wheel to zoom</p>
            </div>
        </div>
    );
};

export default CinematicDrillholeViewer;