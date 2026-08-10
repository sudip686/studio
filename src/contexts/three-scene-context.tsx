// src/contexts/three-scene-context.tsx
'use client';

import React, { createContext, useContext, useRef, useEffect, useState, ReactNode, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { fullyDispose } from '../lib/utils/three-helpers'; // Assuming three-helpers is in lib/utils

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

interface SceneContextType {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  dynamicGroup: THREE.Group | null;
  mountRef: React.RefObject<HTMLDivElement>;
  tooltipState: TooltipState;
  registerTooltipObject: (mesh: THREE.InstancedMesh, getData: (instanceId: number) => string) => void;
  unregisterTooltipObject: (mesh: THREE.InstancedMesh) => void;
  registerTooltipTarget: (object: THREE.Object3D, getData: (hit: THREE.Intersection<THREE.Object3D>) => string) => void;
  unregisterTooltipTarget: (object: THREE.Object3D) => void;
  // Optional helpers for child layers to provide scene constraints/metadata
  setTerrainMaxY?: (y: number) => void;
  setTerrainMinY?: (y: number) => void;
  meshVisible: boolean;
  setMeshVisible: (visible: boolean) => void;
}

const ThreeSceneContext = createContext<SceneContextType | undefined>(undefined);

type PerfProfile = 'performance' | 'balanced' | 'quality';

const PIXEL_RATIO_BY_PROFILE: Record<PerfProfile, number> = {
  performance: 1.2,
  balanced: 1.65,
  quality: 2,
};

export const ThreeSceneProvider = ({
  children,
  active = true,
  perfProfile = 'quality',
}: {
  children: ReactNode,
  active?: boolean,
  perfProfile?: PerfProfile,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number | null>(null);
  const initOnce = useRef(false);
  const terrainMaxYRef = useRef<number | null>(null);
  const terrainMinYRef = useRef<number | null>(null);

  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });

  // Handle active state visibility/interaction
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.domElement.style.display = active ? 'block' : 'none';
      rendererRef.current.domElement.style.pointerEvents = active ? 'auto' : 'none';
    }
    if (controlsRef.current) {
      controlsRef.current.enabled = active;
    }
  }, [active]);

  const registeredTooltipObjects = useRef(new Map<THREE.InstancedMesh, (instanceId: number) => string>());
  const registeredTooltipTargets = useRef(new Map<THREE.Object3D, (hit: THREE.Intersection<THREE.Object3D>) => string>());

  const registerTooltipObject = useCallback((mesh: THREE.InstancedMesh, getData: (instanceId: number) => string) => {
    registeredTooltipObjects.current.set(mesh, getData);
  }, []);

  const unregisterTooltipObject = useCallback((mesh: THREE.InstancedMesh) => {
    registeredTooltipObjects.current.delete(mesh);
  }, []);

  const registerTooltipTarget = useCallback((object: THREE.Object3D, getData: (hit: THREE.Intersection<THREE.Object3D>) => string) => {
    registeredTooltipTargets.current.set(object, getData);
  }, []);

  const unregisterTooltipTarget = useCallback((object: THREE.Object3D) => {
    registeredTooltipTargets.current.delete(object);
  }, []);

  const setTerrainMaxY = useCallback((y: number) => { 
    terrainMaxYRef.current = y; 
  }, []);

  const setTerrainMinY = useCallback((y: number) => {
    terrainMinYRef.current = y;
  }, []);

  const [sceneReady, setSceneReady] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('day');
  const [meshVisible, setMeshVisible] = useState(true);

  // Adaptive lighting based on time of day (simulated)
  useEffect(() => {
    const updateLighting = () => {
      const hour = new Date().getHours();
      setTimeOfDay(hour >= 6 && hour < 18 ? 'day' : 'night');
    };
    updateLighting();
    const interval = setInterval(updateLighting, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    const mount = mountRef.current;
    if (!renderer || !mount) return;

    const maxRatio = PIXEL_RATIO_BY_PROFILE[perfProfile];
    const nextRatio = Math.min(window.devicePixelRatio || 1, maxRatio);
    renderer.setPixelRatio(nextRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.toneMappingExposure =
      perfProfile === 'performance' ? 1.28 : perfProfile === 'balanced' ? 1.36 : 1.44;
    renderer.domElement.style.filter =
      perfProfile === 'performance'
        ? 'brightness(1.04) contrast(1.05) saturate(1.04)'
        : perfProfile === 'balanced'
          ? 'brightness(1.06) contrast(1.07) saturate(1.06)'
          : 'brightness(1.08) contrast(1.09) saturate(1.07)';
  }, [perfProfile, sceneReady]);

  // Handle active state visibility/interaction
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || initOnce.current) return;
    initOnce.current = true;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.44;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.sortObjects = true;
    renderer.setClearColor(0xffffff, 1);

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.filter = 'brightness(1.08) contrast(1.09) saturate(1.07)';
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.Fog(0xfafafa, 120000, 420000);
    sceneRef.current = scene;

    const staticGroup = new THREE.Group();
    staticGroup.name = 'static-scene-elements';
    scene.add(staticGroup);

    // Adaptive lighting for realistic earth terrain
    const ambientIntensity = timeOfDay === 'day' ? 0.86 : 0.6;
    const hemisphereIntensity = timeOfDay === 'day' ? 0.4 : 0.26;

    staticGroup.add(new THREE.HemisphereLight(0xffffff, 0xd8dfe8, hemisphereIntensity));
    staticGroup.add(new THREE.AmbientLight(0xffffff, ambientIntensity));

    const sunIntensity = timeOfDay === 'day' ? 2.35 : 1.24;
    const sun = new THREE.DirectionalLight(0xf8fcff, sunIntensity);
    sun.position.set(2600, 4600, 2500);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.00005;
    sun.shadow.normalBias = 0.01;
    sun.shadow.camera.left = -4500;
    sun.shadow.camera.right = 4500;
    sun.shadow.camera.top = 4500;
    sun.shadow.camera.bottom = -4500;
    sun.shadow.camera.near = 100;
    sun.shadow.camera.far = 12000;
    sun.target.position.set(0, 0, 0);
    staticGroup.add(sun);
    staticGroup.add(sun.target);

    // Rim light for edge definition (subtle, adaptive)
    const rimIntensity = timeOfDay === 'day' ? 0.72 : 0.42;
    const rimLight = new THREE.DirectionalLight(0xe8f4ff, rimIntensity);
    rimLight.position.set(-2400, 1700, -2800);
    staticGroup.add(rimLight);

    // Warm fill light for depth (subtle, adaptive)
    const fillIntensity = timeOfDay === 'day' ? 0.66 : 0.38;
    const fillLight = new THREE.PointLight(0xfff3d9, fillIntensity, 12000);
    fillLight.position.set(0, 1800, 2200);
    staticGroup.add(fillLight);

    // Add a subtle ground light for terrain realism
    const groundIntensity = timeOfDay === 'day' ? 0.08 : 0.04;
    const groundLight = new THREE.DirectionalLight(0xe8f4ff, groundIntensity);
    groundLight.position.set(0, -1000, 0);
    staticGroup.add(groundLight);

    const dynamicGroup = new THREE.Group();
    dynamicGroup.name = 'dynamic-view-content';
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.5, 1e7);
    camera.position.set(1000, 2000, 1000);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controlsRef.current = controls;

    setSceneReady(true);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      if (!cameraRef.current || !rendererRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      let bestDistance = Number.POSITIVE_INFINITY;
      let bestContent = '';

      for (const [mesh, getData] of registeredTooltipObjects.current.entries()) {
        const intersects = raycaster.intersectObject(mesh);
        if (intersects.length > 0) {
          const hit = intersects[0];
          const instanceId = hit.instanceId;
          if (instanceId !== undefined && hit.distance < bestDistance) {
            bestDistance = hit.distance;
            bestContent = getData(instanceId);
          }
        }
      }

      for (const [object, getData] of registeredTooltipTargets.current.entries()) {
        const intersects = raycaster.intersectObject(object, true) as THREE.Intersection<THREE.Object3D>[];
        if (intersects.length > 0) {
          const hit = intersects[0];
          if (hit.distance < bestDistance) {
            bestDistance = hit.distance;
            bestContent = getData(hit);
          }
        }
      }

      if (bestContent) {
        setTooltipState({
          visible: true,
          content: bestContent,
          x: event.clientX + 10,
          y: event.clientY + 10,
        });
      } else {
        setTooltipState(prev => prev.visible ? { ...prev, visible: false } : prev);
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    const tick = () => {
      const controls = controlsRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const sceneObj = sceneRef.current;
      if (controls && renderer && camera && sceneObj) {
        try {
            controls.update();
            camera.near = 0.1;
            camera.far = 20000000; 
            camera.updateProjectionMatrix();

            // NOTE: We intentionally do NOT clamp camera.position.y to terrain height.
            // OrbitControls allows full 360° rotation (including going "under" the terrain)
            // by adjusting polar angle; clamping Y breaks that behavior once terrain loads.

            renderer.render(sceneObj, camera);
        } catch (e) {
            console.warn('[ThreeSceneContext] Tick error:', e);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => {
      if (cameraRef.current && rendererRef.current && mountRef.current) {
        const cam = cameraRef.current;
        const r = rendererRef.current;
        const m = mountRef.current;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        r.setPixelRatio(dpr);
        cam.aspect = m.clientWidth / m.clientHeight;
        cam.updateProjectionMatrix();
        r.setSize(m.clientWidth, m.clientHeight, false);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
      if (rendererRef.current && mountRef.current) fullyDispose(rendererRef.current, mountRef.current);
      initOnce.current = false; 
    };
  }, []);

  const contextValue = React.useMemo(() => ({
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    controls: controlsRef.current,
    dynamicGroup: dynamicGroupRef.current,
    mountRef,
    tooltipState,
    registerTooltipObject,
    unregisterTooltipObject,
    registerTooltipTarget,
    unregisterTooltipTarget,
    setTerrainMaxY,
    setTerrainMinY,
    meshVisible,
    setMeshVisible
  }), [sceneReady, tooltipState, registerTooltipObject, unregisterTooltipObject, registerTooltipTarget, unregisterTooltipTarget, setTerrainMaxY, setTerrainMinY, meshVisible]);

  return (
    <ThreeSceneContext.Provider value={contextValue}>
      <div ref={mountRef} className="relative h-full w-full overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01))]" />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {children}
        </div>
        {tooltipState.visible && (
          <div
            className="absolute pointer-events-none z-50 rounded-xl border border-[#f1d2bf]/18 bg-[linear-gradient(180deg,rgba(26,18,13,0.98),rgba(13,10,8,0.94))] backdrop-blur-md shadow-[0_18px_45px_rgba(0,0,0,0.7)] p-3 text-sm text-white"
            style={{
              left: tooltipState.x,
              top: tooltipState.y,
              transform: 'translate(15px, 15px)',
            }}
            dangerouslySetInnerHTML={{ __html: tooltipState.content }}
          />
        )}
      </div>
    </ThreeSceneContext.Provider>
  );
};

export const useThreeScene = () => {
  const context = useContext(ThreeSceneContext);
  if (context === undefined) {
    throw new Error('useThreeScene must be used within a ThreeSceneProvider');
  }
  return context;
};

export const useThreeSceneSafe = () => {
  return useContext(ThreeSceneContext);
};
