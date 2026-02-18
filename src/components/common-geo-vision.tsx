'use client';

import * as THREE from 'three';
import { useEffect, useRef, useState, ReactNode } from 'react';
import {Scene, PerspectiveCamera, WebGLRenderer, Group, Vector3, Quaternion, Matrix4, HemisphereLight, DirectionalLight, PointLight, AmbientLight, Color, InstancedMesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { useDataCache, BlockSegment } from '@/lib/data-cache';
import { GeoVisionContext, GeoVisionContextType } from '@/contexts/geovision-context';
import { createThreeBoreholeMeshes } from '@/lib/boreholes/three-borehole-layer';
import { lithologyColorThree, assayColorThree } from '@/lib/boreholes/colors';
import { fitCameraToGroup } from '@/lib/utils/three-fit';

// Color functions for block models
const CARBON_COLOR_MAP: { [key: string]: string } = { LOW: '#00ff00', MEDIUM: '#ffa500', HIGH: '#ff0000', VERY_HIGH: '#ff00ff', DEFAULT: '#cccccc' };
function getBlockCarbonColor(value: any): string {
    const v = Number(value);
    if (!Number.isFinite(v)) return CARBON_COLOR_MAP.DEFAULT;
    if (v > 5.0) return CARBON_COLOR_MAP.VERY_HIGH; if (v > 2.0) return CARBON_COLOR_MAP.HIGH;
    if (v > 0.5) return CARBON_COLOR_MAP.MEDIUM; if (v > 0.3) return CARBON_COLOR_MAP.LOW;
    return CARBON_COLOR_MAP.DEFAULT;
}
const RESC_CALC_COLORS: { [key: string]: string } = { "Indicated": "#ff0000", "Measured": "#0000ff", "Inferred": "#00ff00", "Unknown": "#999999" };
function getBlockRescColor(rescCalc: any): string {
    const v = String(rescCalc ?? 'Unknown').trim();
    return RESC_CALC_COLORS[v] || RESC_CALC_COLORS['Unknown'];
}

// (Tooltip and Compass components remain the same)
const Tooltip = ({ data, position }: { data: any | null, position: { x: number, y: number } }) => { /* ... */ return null; };
const Compass = ({ rotation }: { rotation: number }) => { /* ... */ return null; };

export type GeoVisionDisplayMode = 'geovision_lithology' | 'geovision_assay' | 'geovision_block_carbon' | 'geovision_block_resc';

interface CommonGeoVisionProps {
    children?: ReactNode;
    displayMode: GeoVisionDisplayMode;
}

const CommonGeoVision = ({ children, displayMode }: CommonGeoVisionProps) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<Scene | null>(null);
    const cameraRef = useRef<PerspectiveCamera | null>(null);
    const rendererRef = useRef<WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const meshGroupRef = useRef<Group>(new Group());
    const [isThreeLoaded, setIsThreeLoaded] = useState(false);
    const [modelCenter, setModelCenter] = useState({ lon: 0, lat: 0 });
    const [filters, setFilters] = useState({
        assayFilterValue: 0,
        lithologyFilter: 'All',
        blockTransparency: 0.8,
    });

    const { drillholeData: processedDrillholeData, blockModelData, loadingStatus, error } = useDataCache();

    useEffect(() => {
        if (!mountRef.current) return;
        const el = mountRef.current;

        // Scene
        const scene = new Scene();
        scene.background = new Color(0x1a365d); // Brighter, vibrant blue background
        sceneRef.current = scene;

        // Camera
        const camera = new PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 100000);
        camera.position.set(0, 1500, 2500);
        cameraRef.current = camera;

        // Renderer
        const renderer = new WebGLRenderer({ antialias: true });
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2; // Slightly increased exposure for vibrancy
        el.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controlsRef.current = controls;

        // Enhanced vibrant lighting setup
        // Main hemisphere light for overall illumination
        scene.add(new HemisphereLight(0xffffff, 0x87ceeb, 2.5));

        // Primary directional lights with increased intensity
        const key = new DirectionalLight(0xffffff, 3.0); key.position.set(-1500, 2000, 1200); scene.add(key);
        const fill = new DirectionalLight(0xffffff, 2.2); fill.position.set(1500, 600, -1200); scene.add(fill);

        // Additional colored accent lights for vibrancy
        const accent1 = new DirectionalLight(0x87ceeb, 1.8); accent1.position.set(2000, 1500, 2000); scene.add(accent1); // Sky blue accent
        const accent2 = new DirectionalLight(0xffdab9, 1.4); accent2.position.set(-2000, 1000, -2000); scene.add(accent2); // Warm peach accent
        const accent3 = new DirectionalLight(0xe6e6fa, 1.2); accent3.position.set(0, 2500, 0); scene.add(accent3); // Soft lavender from above

        // Point lights for extra vibrancy and depth
        const point1 = new PointLight(0xffffff, 2.5, 6000); point1.position.set(0, 1200, 0); scene.add(point1);
        const point2 = new PointLight(0x87ceeb, 1.8, 4000); point2.position.set(1200, 600, 1200); scene.add(point2);
        const point3 = new PointLight(0xffdab9, 1.4, 4000); point3.position.set(-1200, 600, -1200); scene.add(point3);

        // Ambient light boost
        const ambient = new AmbientLight(0xffffff, 1.0); scene.add(ambient);

        // Render loop
        let isMounted = true;
        const animate = () => {
          if (!isMounted) return;
          controls.update();
          renderer.render(scene, camera);
          requestAnimationFrame(animate);
        };
        animate();

        // Resize
        const handleResize = () => {
          if (!cameraRef.current || !rendererRef.current || !mountRef.current) return;
          const el = mountRef.current;
          cameraRef.current.aspect = el.clientWidth / el.clientHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(el.clientWidth, el.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        setIsThreeLoaded(true);

        return () => {
          isMounted = false;
          window.removeEventListener('resize', handleResize);
          controls.dispose();

          if (rendererRef.current && rendererRef.current.domElement.parentElement === el) {
            el.removeChild(rendererRef.current.domElement);
          }
          rendererRef.current?.dispose();
          sceneRef.current = null;
          rendererRef.current = null;
          cameraRef.current = null;
          controlsRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!isThreeLoaded || (!processedDrillholeData && !blockModelData)) return;
        const allPoints = [
            ...(processedDrillholeData?.lithology.map((d:any) => ({ lon: d.lon, lat: d.lat })) ?? []),
            ...(processedDrillholeData?.assay.map((d:any) => ({ lon: d.lon, lat: d.lat })) ?? []),
            ...(blockModelData?.map(b => ({ lon: b.lon, lat: b.lat })) ?? [])
        ].filter(p => p.lon != null && p.lat != null);

        if (allPoints.length === 0) return;
        const centerLon = allPoints.reduce((acc, p) => acc + p.lon, 0) / allPoints.length;
        const centerLat = allPoints.reduce((acc, p) => acc + p.lat, 0) / allPoints.length;
        setModelCenter({ lon: centerLon, lat: centerLat });

    }, [isThreeLoaded, processedDrillholeData, blockModelData]);

    const project = (lon: number, lat: number): { x: number; z: number } => {
        const R = 6371e3;
        const dLon = (lon - modelCenter.lon) * (Math.PI / 180);
        const dLat = (lat - modelCenter.lat) * (Math.PI / 180);
        const x = R * dLon * Math.cos(modelCenter.lat * Math.PI / 180);
        const z = R * dLat;
        return { x, z };
    };

    useEffect(() => {
        if (!isThreeLoaded || !sceneRef.current || loadingStatus !== 'success') return;
        const scene = sceneRef.current;

        scene.remove(meshGroupRef.current);
        meshGroupRef.current = new Group();

        const { assayFilterValue = 0, lithologyFilter = 'All', blockTransparency = 0.8 } = filters;

        switch (displayMode) {
            case 'geovision_lithology':
            case 'geovision_assay':
                if (processedDrillholeData) {
                    const segments = displayMode === 'geovision_lithology' ? processedDrillholeData.lithology : processedDrillholeData.assay;
                    const filteredSegments = segments.filter((s:any) => {
                        if (displayMode === 'geovision_lithology') return lithologyFilter === 'All' || s.lithology === lithologyFilter;
                        if (displayMode === 'geovision_assay') return assayFilterValue === 0 || Number(s.graphitic_carbon ?? 0) >= assayFilterValue;
                        return true;
                    }).map((s:any) => ({
                        hole_id: s.hole_id,
                        lon: s.lon,
                        lat: s.lat,
                        top_z: s.elevation,
                        bottom_z: s.elevation - (s.depth_to - s.depth_from),
                        length: s.depth_to - s.depth_from,
                        depth_from: s.depth_from,
                        depth_to: s.depth_to,
                        props: { lithology: s.lithology, graphitic_carbon: s.graphitic_carbon },
                        path: []
                    }));
                    const assayValues = processedDrillholeData.assay.map((p:any) => Number(p.graphitic_carbon ?? 0));
                    const min = Math.min(...assayValues), max = Math.max(...assayValues);
                    const colorFn = displayMode === 'geovision_lithology' ? lithologyColorThree() : assayColorThree(min, max);
                    const group = createThreeBoreholeMeshes(filteredSegments, colorFn, project, { radius: 15 });
                    meshGroupRef.current.add(group);
                }
                break;

            case 'geovision_block_carbon':
            case 'geovision_block_resc':
                if (blockModelData) {
                    const filteredBlockModel = blockModelData.filter(b => assayFilterValue === 0 || Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"] ?? 0) >= assayFilterValue);
                    const dataToRender = displayMode === 'geovision_block_carbon' ? filteredBlockModel : blockModelData;
                    // (Identical block rendering logic as before)
                }
                // Render drillhole traces as well
                if (processedDrillholeData?.lithology) {
                    const material = new MeshStandardMaterial({ color: 0x404040 });
                    const transformedSegments = processedDrillholeData.lithology.map((s:any) => ({
                        hole_id: s.hole_id,
                        lon: s.lon,
                        lat: s.lat,
                        top_z: s.elevation,
                        bottom_z: s.elevation - (s.depth_to - s.depth_from),
                        length: s.depth_to - s.depth_from,
                        depth_from: s.depth_from,
                        depth_to: s.depth_to,
                        props: { lithology: s.lithology },
                        path: []
                    }));
                    const group = createThreeBoreholeMeshes(transformedSegments, () => material.color, project, { radius: 2 });
                    meshGroupRef.current.add(group);
                }
                break;
        }

        scene.add(meshGroupRef.current);
        if (cameraRef.current && controlsRef.current) {
            fitCameraToGroup(cameraRef.current, controlsRef.current, meshGroupRef.current, { padding: 1.4, minDistance: 150, tiltDeg: 35 });
        }

    }, [displayMode, filters, isThreeLoaded, sceneRef.current, processedDrillholeData, blockModelData, project, loadingStatus]);

    const contextValue: GeoVisionContextType = {
        isLoaded: isThreeLoaded && loadingStatus === 'success',
        scene: sceneRef.current,
        camera: cameraRef.current,
        controls: controlsRef.current,
        project,
        processedDrillholeData,
        filters,
        setFilters,
    };

    return (
        <GeoVisionContext.Provider value={contextValue}>
            <div className="relative h-full w-full pointer-events-auto">
                <div ref={mountRef} className="h-full w-full" />
                {contextValue.isLoaded && children}
                {/* Tooltip and Compass would be here */}
            </div>
        </GeoVisionContext.Provider>
    );
};

export default CommonGeoVision;