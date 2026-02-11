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
  // Optional helpers for child layers to provide scene constraints/metadata
  setTerrainMaxY?: (y: number) => void;
}

const ThreeSceneContext = createContext<SceneContextType | undefined>(undefined);

export const ThreeSceneProvider = ({ children, active = true }: { children: ReactNode, active?: boolean }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number | null>(null);
  const initOnce = useRef(false);
  const terrainMaxYRef = useRef<number | null>(null);

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

  const registerTooltipObject = useCallback((mesh: THREE.InstancedMesh, getData: (instanceId: number) => string) => {
    console.log('Registering tooltip for mesh:', mesh, getData);
    registeredTooltipObjects.current.set(mesh, getData);
  }, []);

  const unregisterTooltipObject = useCallback((mesh: THREE.InstancedMesh) => {
    console.log('Unregistering tooltip for mesh:', mesh);
    registeredTooltipObjects.current.delete(mesh);
  }, []);

  const [contextValue, setContextValue] = useState<SceneContextType>({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    dynamicGroup: null,
    mountRef: mountRef,
    tooltipState,
    registerTooltipObject,
    unregisterTooltipObject,
    setTerrainMaxY: (y: number) => { terrainMaxYRef.current = y; }
  });

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
    renderer.toneMappingExposure = 1.15; // Increased exposure for brightness
    // renderer.physicallyCorrectLights = true; // Deprecated in newer Three.js, use useLegacyLights = false if needed, but standard is fine.

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add WebGL context lost/restored handlers
    renderer.getContext().canvas.addEventListener('webglcontextlost', (e: Event) => {
      e.preventDefault();
      console.warn('WebGL context lost');
      // Optionally, re-initialize or show a message to the user
    });
    renderer.getContext().canvas.addEventListener('webglcontextrestored', () => {
      console.warn('WebGL context restored');
      // Optionally, re-upload buffers/materials if needed
      // For now, we rely on the full re-initialization on remount if needed
    });

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4a6fa5); // Brighter, more vibrant blue background
    sceneRef.current = scene;

    // Static Group (for grid, lights, etc. that don't change per view)
    const staticGroup = new THREE.Group();
    staticGroup.name = 'static-scene-elements';
    scene.add(staticGroup);

    // Optimized Lighting for Terrain (prevents washout)
    // Stronger ambient light to ensure visibility
    staticGroup.add(new THREE.AmbientLight(0xffffff, 0.8));

    // Directional light (Sun)
    // Positioned high above to minimize long shadows that might darken the terrain
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(100, 2000, 100); 
    sun.target.position.set(0, 0, 0);
    sun.castShadow = false; // Disable shadows temporarily to debug darkness
    // sun.shadow.mapSize.set(2048, 2048);
    staticGroup.add(sun);
    staticGroup.add(sun.target);

    // Enhanced grid with more vibrant colors
    const grid = new THREE.GridHelper(10000, 100, 0xcccccc, 0x888888); // Brighter grid lines
    grid.frustumCulled = false;
    staticGroup.add(grid);

    // Dynamic Group (for view-specific meshes)
    const dynamicGroup = new THREE.Group();
    dynamicGroup.name = 'dynamic-view-content';
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.5, 1e7);
    // Start from a safe, above-terrain vantage to avoid spawning under the mesh
    camera.position.set(1000, 2000, 1000);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // Enable full 360-degree navigation
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minPolarAngle = 0; // Allow vertical rotation
    // Allow full 360-degree rotation (user request)
    controls.maxPolarAngle = Math.PI;
    // Start by looking at world origin; views will refine this on fit
    controls.target.set(0, 0, 0);
    controls.update();
    controls.minAzimuthAngle = -Infinity; // Unlimited horizontal rotation
    controls.maxAzimuthAngle = Infinity;
    controlsRef.current = controls;

    setContextValue({
      scene,
      camera,
      renderer,
      controls,
      dynamicGroup,
      mountRef,
      tooltipState,
      registerTooltipObject,
      unregisterTooltipObject,
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      if (!cameraRef.current || !rendererRef.current) return;

      mouse.x = (event.clientX / rendererRef.current.domElement.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / rendererRef.current.domElement.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      let intersected = false;
      for (const [mesh, getData] of registeredTooltipObjects.current.entries()) {
        const intersects = raycaster.intersectObject(mesh);
        if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== undefined) {
            const content = getData(instanceId);
            setTooltipState({
              visible: true,
              content,
              x: event.clientX + 10,
              y: event.clientY + 10,
            });
            intersected = true;
            break;
          }
        }
      }

      if (!intersected) {
        setTooltipState(prev => ({ ...prev, visible: false }));
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    let frameCount = 0;
    const tick = () => {
      const controls = controlsRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const sceneObj = sceneRef.current;
      if (controls && renderer && camera && sceneObj) {
        try {
            controls.update();

            // FIXED SAFE BOUNDS: Prevent any dynamic clipping
            camera.near = 0.1;
            camera.far = 20000000; // 20 million units
            camera.updateProjectionMatrix();

            // Ensure camera remains above terrain maximum elevation (if known)
            if (terrainMaxYRef.current != null && Number.isFinite(terrainMaxYRef.current)) {
              const minY = terrainMaxYRef.current + 2.0; // add a small safety margin
              if (camera.position.y < minY) {
                camera.position.y = minY;
              }
            }

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

        // Re-apply DPR on resize to avoid blurry output when DPR/zoom/monitor changes
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        r.setPixelRatio(dpr);

        cam.aspect = m.clientWidth / m.clientHeight;
        cam.updateProjectionMatrix();

        // Avoid changing CSS size; only update drawing buffer size
        r.setSize(m.clientWidth, m.clientHeight, false);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
      // Dispose terrain resources if present
      try {
        const tg = scene.getObjectByName('terrain-glb');
        tg?.traverse((o: any) => {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
          mats.forEach((m: any) => m?.dispose?.());
        });
        tg?.parent?.remove(tg);
      } catch {}
      if (rendererRef.current && mountRef.current) fullyDispose(rendererRef.current, mountRef.current);
      initOnce.current = false; // Allow re-initialization on remount
    };
  }, []);

  // Update context value when tooltipState changes
  useEffect(() => {
    setContextValue(prev => ({ ...prev, tooltipState }));
  }, [tooltipState]);

  // Update context value when register/unregister functions change
  useEffect(() => {
    setContextValue(prev => ({ ...prev, registerTooltipObject, unregisterTooltipObject }));
  }, [registerTooltipObject, unregisterTooltipObject]);

  return (
    <ThreeSceneContext.Provider value={contextValue}>
      <div ref={mountRef} className="h-full w-full relative">
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {children}
        </div>
        {tooltipState.visible && (
          <div
            style={{
              position: 'absolute',
              left: tooltipState.x,
              top: tooltipState.y,
              pointerEvents: 'none',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '3px',
              zIndex: 1000,
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