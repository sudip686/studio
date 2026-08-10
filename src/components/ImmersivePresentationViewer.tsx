'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useDataCache } from '@/lib/data-cache';
import { LITHOLOGY_COLOR_MAP } from '@/lib/boreholes/colors';

// Presentation slides configuration
const PRESENTATION_SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Tanga Graphite',
    description: 'Interactive Geological Exploration',
    position: new THREE.Vector3(0, 5, 15),
    target: new THREE.Vector3(0, 0, 0),
    duration: 3000
  },
  {
    id: 'lithology',
    title: 'Lithology Overview',
    description: 'Explore rock formations and geological structures',
    position: new THREE.Vector3(20, 8, 10),
    target: new THREE.Vector3(0, 0, 0),
    duration: 4000
  },
  {
    id: 'assay',
    title: 'Assay Data Analysis',
    description: 'Graphitic carbon distribution and concentrations',
    position: new THREE.Vector3(-15, 6, 12),
    target: new THREE.Vector3(0, 0, 0),
    duration: 4000
  },
  {
    id: 'blocks',
    title: 'Block Model Visualization',
    description: '3D resource estimation and classification',
    position: new THREE.Vector3(5, 10, -8),
    target: new THREE.Vector3(0, 0, 0),
    duration: 4000
  }
];

// Custom First-Person Controls
function FirstPersonControls({ enabled, onPositionChange }: {
  enabled: boolean;
  onPositionChange: (position: THREE.Vector3, rotation: THREE.Euler) => void;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  });

  // Mouse look variables
  const mouse = useRef({ x: 0, y: 0 });
  const isMouseDown = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true;
          break;
        case 'Space':
          event.preventDefault();
          keys.current.up = true;
          break;
        case 'ShiftLeft':
          keys.current.down = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false;
          break;
        case 'Space':
          keys.current.up = false;
          break;
        case 'ShiftLeft':
          keys.current.down = false;
          break;
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown.current = true;
      mouse.current.x = event.clientX;
      mouse.current.y = event.clientY;
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown.current) return;

      const deltaX = event.clientX - mouse.current.x;
      const deltaY = event.clientY - mouse.current.y;

      euler.current.y -= deltaX * 0.002;
      euler.current.x -= deltaY * 0.002;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));

      camera.quaternion.setFromEuler(euler.current);

      mouse.current.x = event.clientX;
      mouse.current.y = event.clientY;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, camera]);

  useFrame((state, delta) => {
    if (!enabled) return;

    // Reset velocity
    velocity.current.set(0, 0, 0);

    // Calculate movement direction
    direction.current.set(0, 0, 0);
    if (keys.current.forward) direction.current.z -= 1;
    if (keys.current.backward) direction.current.z += 1;
    if (keys.current.left) direction.current.x -= 1;
    if (keys.current.right) direction.current.x += 1;
    if (keys.current.up) direction.current.y += 1;
    if (keys.current.down) direction.current.y -= 1;

    // Normalize and apply camera rotation
    if (direction.current.length() > 0) {
      direction.current.normalize();
      direction.current.applyQuaternion(camera.quaternion);
      velocity.current.copy(direction.current).multiplyScalar(15 * delta);
    }

    // Apply movement
    camera.position.add(velocity.current);

    // Notify parent of position change
    onPositionChange(camera.position.clone(), euler.current.clone());
  });

  return null;
}

// Scene Component
function PresentationScene({
  currentSlide,
  isAutoPlay,
  onSlideChange,
  cameraMode,
  onPositionChange,
  onFpsUpdate
}: {
  currentSlide: number;
  isAutoPlay: boolean;
  onSlideChange: (slide: number) => void;
  cameraMode: 'orbit' | 'first-person';
  onPositionChange: (position: THREE.Vector3, rotation: THREE.Euler) => void;
  onFpsUpdate: (fps: number) => void;
}) {
  const { processedLithologyData, processedAssayData, blockModelData } = useDataCache();
  const { camera, controls } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const slideTimerRef = useRef<NodeJS.Timeout>();
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });
  const [showHotspots, setShowHotspots] = useState(true);

  // FPS monitoring
  useFrame(() => {
    fpsCounterRef.current.frames++;
    const now = Date.now();
    if (now - fpsCounterRef.current.lastTime >= 1000) {
      onFpsUpdate(fpsCounterRef.current.frames);
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTime = now;
    }
  });

  // Smooth camera transitions
  useEffect(() => {
    if (!camera) return;

    const slide = PRESENTATION_SLIDES[currentSlide];
    if (!slide) return;

    const startPosition = camera.position.clone();
    const startQuaternion = camera.quaternion.clone();
    const endPosition = slide.position;
    const endQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-0.3, Math.atan2(endPosition.x, endPosition.z), 0)
    );

    let progress = 0;
    const duration = 2000; // 2 seconds transition
    const startTime = Date.now();

    const animate = () => {
      progress = Math.min((Date.now() - startTime) / duration, 1);

      // Smooth easing
      const eased = 1 - Math.pow(1 - progress, 3);

      // Interpolate position
      camera.position.lerpVectors(startPosition, endPosition, eased);

      // Interpolate rotation
      camera.quaternion.slerpQuaternions(startQuaternion, endQuaternion, eased);

      camera.updateProjectionMatrix();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [currentSlide, camera]);

  // Auto-play timer
  useEffect(() => {
    if (isAutoPlay && currentSlide < PRESENTATION_SLIDES.length - 1) {
      slideTimerRef.current = setTimeout(() => {
        onSlideChange(currentSlide + 1);
      }, PRESENTATION_SLIDES[currentSlide].duration);
    }

    return () => {
      if (slideTimerRef.current) {
        clearTimeout(slideTimerRef.current);
      }
    };
  }, [isAutoPlay, currentSlide, onSlideChange]);

  // Create geological visualization
  useEffect(() => {
    if (!groupRef.current) return;

    // Clear existing objects
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a4d3a,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    groupRef.current.add(ground);

    // Create lithology visualization
    if (processedLithologyData?.byHoleId) {
      Object.values(processedLithologyData.byHoleId).slice(0, 50).forEach((borehole, index) => {
        // Validate borehole data to prevent NaN values
        if (!borehole.orientation?.midpoint || !borehole.orientation?.quaternion ||
            borehole.length <= 0 || isNaN(borehole.length)) {
          return; // Skip invalid borehole
        }

        const midpoint = borehole.orientation.midpoint;
        if (isNaN(midpoint.x) || isNaN(midpoint.y) || isNaN(midpoint.z)) {
          return; // Skip if position contains NaN
        }

        const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, borehole.length * 0.05, 8);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(index * 0.05, 0.7, 0.5),
          transparent: true,
          opacity: 0.9,
          emissive: new THREE.Color().setHSL(index * 0.05, 0.3, 0.1)
        });

        const mesh = new THREE.Mesh(cylinderGeometry, material);
        mesh.position.copy(midpoint);
        mesh.quaternion.copy(borehole.orientation.quaternion);
        mesh.userData = {
          type: 'borehole',
          data: borehole,
          isHotspot: true
        };
        groupRef.current!.add(mesh);
      });
    }

    // Create assay spheres
    if (processedAssayData?.byHoleId) {
      Object.values(processedAssayData.byHoleId).slice(0, 100).forEach((borehole) => {
        borehole.segments.slice(0, 5).forEach((segment, segIndex) => {
          // Validate segment data to prevent NaN values
          if (isNaN(segment.lon) || isNaN(segment.lat) || isNaN(segment.elevation)) {
            return; // Skip invalid segment
          }

          const value = segment.graphitic_carbon || 0;
          const intensity = Math.max(0, Math.min(1, (value - processedAssayData.assayRange.min) /
            (processedAssayData.assayRange.max - processedAssayData.assayRange.min)));

          const geometry = new THREE.SphereGeometry(0.3, 8, 8);
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.1, intensity, 0.5 + intensity * 0.3),
            emissive: new THREE.Color().setHSL(0.1, intensity * 0.8, intensity * 0.3),
            transparent: true,
            opacity: 0.8
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(
            segment.lon * 0.1,
            segment.elevation * 0.001 + segIndex,
            segment.lat * 0.1
          );
          mesh.userData = {
            type: 'assay',
            data: segment,
            isHotspot: true
          };
          groupRef.current!.add(mesh);
        });
      });
    }

    // Create block model cubes
    if (blockModelData) {
      blockModelData.slice(0, 200).forEach((block, index) => {
        // Validate block data to prevent NaN values
        if (isNaN(block.lon) || isNaN(block.lat) || isNaN(block.elevation) ||
            isNaN(block.dX) || isNaN(block.dY) || isNaN(block.dZ) ||
            block.dX <= 0 || block.dY <= 0 || block.dZ <= 0) {
          return; // Skip invalid block
        }

        const geometry = new THREE.BoxGeometry(block.dX * 0.05, block.dZ * 0.05, block.dY * 0.05);
        const value = block['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'];
        const intensity = typeof value === 'number' ? Math.max(0, Math.min(1, value / 10)) : 0.5;

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.3, intensity, 0.4 + intensity * 0.4),
          transparent: true,
          opacity: 0.7,
          emissive: new THREE.Color().setHSL(0.3, intensity * 0.5, intensity * 0.2)
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          block.lon * 0.1,
          block.elevation * 0.001,
          block.lat * 0.1
        );
        mesh.userData = {
          type: 'block',
          data: block,
          isHotspot: index % 10 === 0 // Only some blocks are hotspots
        };
        groupRef.current!.add(mesh);
      });
    }
  }, [processedLithologyData, processedAssayData, blockModelData]);

  const currentSlideData = PRESENTATION_SLIDES[currentSlide];

  return (
    <group ref={groupRef}>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <pointLight position={[-30, 20, -30]} intensity={0.5} color={0x4488ff} />
      <pointLight position={[30, 15, 30]} intensity={0.3} color={0xff8844} />

      {/* Atmospheric fog */}
      <fog attach="fog" args={['#001122', 50, 200]} />

      {/* Slide Title and Info */}
      <Html position={[0, 8, -10]} center>
        <div className="bg-black/80 text-white p-6 rounded-lg max-w-md text-center backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-2">{currentSlideData?.title}</h2>
          <p className="text-gray-300">{currentSlideData?.description}</p>
          <div className="mt-4 text-sm text-gray-400">
            Slide {currentSlide + 1} of {PRESENTATION_SLIDES.length}
          </div>
        </div>
      </Html>

      {/* Navigation Instructions */}
      <Html position={[-8, 6, -5]} center>
        <div className="bg-blue-900/80 text-white p-4 rounded-lg text-sm backdrop-blur-sm">
          <div className="font-bold mb-2">Controls:</div>
          <div>• WASD: Move around</div>
          <div>• Mouse: Look around (click & drag)</div>
          <div>• Space: Move up</div>
          <div>• Shift: Move down</div>
        </div>
      </Html>

      {/* Camera Controls */}
      {cameraMode === 'orbit' && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2}
        />
      )}
      {cameraMode === 'first-person' && (
        <FirstPersonControls
          enabled={true}
          onPositionChange={onPositionChange}
        />
      )}
    </group>
  );
}

// Main Immersive Presentation Component
export default function ImmersivePresentationViewer({ viewType }: { viewType: 'presentation' }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'first-person'>('orbit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCompass, setShowCompass] = useState(true);
  const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3(0, 5, 15));
  const [cameraRotation, setCameraRotation] = useState(new THREE.Euler());
  const [fps, setFps] = useState(60);
  const containerRef = useRef<HTMLDivElement>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });



  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handlePositionChange = useCallback((position: THREE.Vector3, rotation: THREE.Euler) => {
    setCameraPosition(position);
    setCameraRotation(rotation);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, PRESENTATION_SLIDES.length - 1));
  const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  return (
    <div
      ref={containerRef}
      className={`h-full w-full relative ${isFullscreen ? 'bg-black' : 'bg-gray-900'}`}
    >
      {/* Top Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center bg-black/60 backdrop-blur-md rounded-lg p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded text-white font-medium transition"
          >
            ← Previous
          </button>
          <button
            onClick={nextSlide}
            disabled={currentSlide === PRESENTATION_SLIDES.length - 1}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded text-white font-medium transition"
          >
            Next →
          </button>
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`px-4 py-2 rounded text-white font-medium transition ${
              isAutoPlay ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {isAutoPlay ? '⏸️ Pause' : '▶️ Auto Play'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={cameraMode}
            onChange={(e) => setCameraMode(e.target.value as 'orbit' | 'first-person')}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
          >
            <option value="orbit">Orbit Camera</option>
            <option value="first-person">First Person</option>
          </select>

          <button
            onClick={() => setShowCompass(!showCompass)}
            className={`px-4 py-2 rounded text-white font-medium transition ${
              showCompass ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            🧭 Compass
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded text-white font-medium transition"
          >
            {isFullscreen ? '🗗 Exit Fullscreen' : '🗖 Fullscreen'}
          </button>
        </div>
      </div>

      {/* Compass Overlay */}
      {showCompass && (
        <div className="absolute top-20 right-4 z-40 bg-black/80 backdrop-blur-md rounded-lg p-4">
          <div className="text-white text-center">
            <div className="text-lg font-bold mb-2">🧭 Navigation</div>
            <div className="text-sm text-gray-300">
              Position: ({cameraPosition.x.toFixed(1)}, {cameraPosition.y.toFixed(1)}, {cameraPosition.z.toFixed(1)})
            </div>
            <div className="text-sm text-gray-300">
              Rotation: ({(cameraRotation.x * 180 / Math.PI).toFixed(1)}°, {(cameraRotation.y * 180 / Math.PI).toFixed(1)}°)
            </div>
          </div>
        </div>
      )}

      {/* FPS Counter */}
      <div className="absolute bottom-4 right-4 z-40 bg-black/60 backdrop-blur-md rounded px-3 py-2 text-white text-sm">
        FPS: {fps}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-40 bg-black/60 backdrop-blur-md rounded-full h-2">
        <div
          className="bg-blue-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${((currentSlide + 1) / PRESENTATION_SLIDES.length) * 100}%` }}
        />
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 5, 15], fov: 75 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        }}
        style={{ background: 'linear-gradient(to bottom, #001122, #000011)' }}
      >
        <Suspense fallback={
          <Html center>
            <div className="text-white text-2xl">Loading Immersive Experience...</div>
          </Html>
        }>
          <PresentationScene
            currentSlide={currentSlide}
            isAutoPlay={isAutoPlay}
            onSlideChange={setCurrentSlide}
            cameraMode={cameraMode}
            onPositionChange={handlePositionChange}
            onFpsUpdate={setFps}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
