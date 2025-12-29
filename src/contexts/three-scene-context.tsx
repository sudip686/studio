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
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || initOnce.current) return;
    initOnce.current = true;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
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
    scene.background = new THREE.Color(0x1a202c);
    scene.fog = new THREE.Fog(0x1a202c, 2000, 15000);
    sceneRef.current = scene;

    // Static Group (for grid, lights, etc. that don't change per view)
    const staticGroup = new THREE.Group();
    staticGroup.name = 'static-scene-elements';
    scene.add(staticGroup);

    staticGroup.add(new THREE.HemisphereLight(0xffffff, 0x666688, 1.2));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.5); d1.position.set(-1500, 2000, 1200); staticGroup.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.8); d2.position.set(1500, 600, -1200); staticGroup.add(d2);
    const grid = new THREE.GridHelper(10000, 100, 0x888888, 0x888888);
    grid.frustumCulled = false;
    staticGroup.add(grid);

    // Dynamic Group (for view-specific meshes)
    const dynamicGroup = new THREE.Group();
    dynamicGroup.name = 'dynamic-view-content';
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.5, 1e7);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
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

    const tick = () => {
      if (controlsRef.current && rendererRef.current && cameraRef.current) {
        controlsRef.current.update();
        rendererRef.current.render(sceneRef.current!, cameraRef.current!); // Use sceneRef.current and cameraRef.current
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => {
      if (cameraRef.current && rendererRef.current && mountRef.current) {
        const cam = cameraRef.current, r = rendererRef.current, m = mountRef.current;
        cam.aspect = m.clientWidth / m.clientHeight;
        cam.updateProjectionMatrix();
        r.setSize(m.clientWidth, m.clientHeight);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
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
