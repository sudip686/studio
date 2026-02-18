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
    registeredTooltipObjects.current.set(mesh, getData);
  }, []);

  const unregisterTooltipObject = useCallback((mesh: THREE.InstancedMesh) => {
    registeredTooltipObjects.current.delete(mesh);
  }, []);

  const setTerrainMaxY = useCallback((y: number) => { 
    terrainMaxYRef.current = y; 
  }, []);

  const [sceneReady, setSceneReady] = useState(false);

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
    renderer.toneMappingExposure = 1.15; 

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4a6fa5); 
    sceneRef.current = scene;

    const staticGroup = new THREE.Group();
    staticGroup.name = 'static-scene-elements';
    scene.add(staticGroup);

    staticGroup.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(100, 2000, 100); 
    sun.target.position.set(0, 0, 0);
    staticGroup.add(sun);
    staticGroup.add(sun.target);

    const grid = new THREE.GridHelper(10000, 100, 0xcccccc, 0x888888); 
    grid.frustumCulled = false;
    staticGroup.add(grid);

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

            if (terrainMaxYRef.current != null && Number.isFinite(terrainMaxYRef.current)) {
              const minY = terrainMaxYRef.current + 2.0; 
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
    setTerrainMaxY
  }), [sceneReady, tooltipState, registerTooltipObject, unregisterTooltipObject, setTerrainMaxY]);

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