'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { VRButton, XR, useXR, createXRStore } from '@react-three/xr';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDataCache } from '@/lib/data-cache';

const store = createXRStore();

// VR Scene Component
function VRScene({ viewType }: { viewType: 'lithology' | 'assay' | 'block-model' }) {
  const { processedLithologyData, processedAssayData, blockModelData } = useDataCache();
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  // isPresenting is not directly exposed in v6 hook, check state or assume active inside XR
  const isPresenting = (store as any).useStore((s: any) => s.session !== null);

  useEffect(() => {
    if (isPresenting) {
      // Adjust camera for VR
      camera.near = 0.1;
      camera.far = 10000;
      camera.updateProjectionMatrix();
    }
  }, [isPresenting, camera]);

  // Create VR-friendly visualization
  useEffect(() => {
    if (!groupRef.current) return;

    // Clear existing objects
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    if (viewType === 'lithology' && processedLithologyData) {
      // Create simplified VR lithology visualization
      Object.values(processedLithologyData.byHoleId).forEach((borehole, index) => {
        const cylinderGeometry = new THREE.CylinderGeometry(2, 2, borehole.length * 0.1, 8);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(index * 0.1, 0.7, 0.5),
          transparent: true,
          opacity: 0.8
        });

        const mesh = new THREE.Mesh(cylinderGeometry, material);
        mesh.position.copy(borehole.orientation!.midpoint);
        mesh.quaternion.copy(borehole.orientation!.quaternion);
        mesh.scale.set(1, borehole.length * 0.1, 1);

        groupRef.current!.add(mesh);
      });
    }

    if (viewType === 'assay' && processedAssayData) {
      // Create simplified VR assay visualization
      Object.values(processedAssayData.byHoleId).forEach((borehole) => {
        borehole.segments.forEach((segment) => {
          const value = segment.graphitic_carbon || 0;
          const intensity = Math.max(0, Math.min(1, (value - processedAssayData.assayRange.min) /
            (processedAssayData.assayRange.max - processedAssayData.assayRange.min)));

          const geometry = new THREE.SphereGeometry(1, 8, 8);
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.1, intensity, 0.5 + intensity * 0.3),
            emissive: new THREE.Color().setHSL(0.1, intensity * 0.5, intensity * 0.2)
          });

          const mesh = new THREE.Mesh(geometry, material);
          // Position based on segment data
          mesh.position.set(segment.lon * 0.01, segment.elevation * 0.001, segment.lat * 0.01);

          groupRef.current!.add(mesh);
        });
      });
    }

    if (viewType === 'block-model' && blockModelData) {
      // Create simplified VR block model visualization
      blockModelData.slice(0, 1000).forEach((block, index) => { // Limit for VR performance
        const geometry = new THREE.BoxGeometry(block.dX * 0.1, block.dZ * 0.1, block.dY * 0.1);
        const value = block['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'];
        const intensity = typeof value === 'number' ? Math.max(0, Math.min(1, value / 10)) : 0.5;

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.3, intensity, 0.4 + intensity * 0.4),
          transparent: true,
          opacity: 0.7
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(block.lon * 0.01, block.elevation * 0.001, block.lat * 0.01);

        groupRef.current!.add(mesh);
      });
    }
  }, [viewType, processedLithologyData, processedAssayData, blockModelData]);

  return (
    <group ref={groupRef}>
      {/* Lighting for VR */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* VR Navigation Helpers */}
      <Text
        position={[0, 2, -5]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {viewType.toUpperCase()} VR VIEW
      </Text>

      <Text
        position={[0, 1.5, -5]}
        fontSize={0.3}
        color="lightblue"
        anchorX="center"
        anchorY="middle"
      >
        Use controllers to explore • Point and click for details
      </Text>
    </group>
  );
}



// Main VR Viewer Component
export default function VRViewer({ viewType }: { viewType: 'lithology' | 'assay' | 'block-model' }) {
  const [vrSupported, setVrSupported] = useState(false);

  useEffect(() => {
    // Check VR support
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        setVrSupported(supported);
      });
    }
  }, []);

  if (!vrSupported) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl mb-4">VR Not Supported</h2>
          <p className="text-gray-400">
            Your browser or device doesn't support WebXR VR experiences.
            <br />
            Try using a VR headset with a compatible browser like Oculus Browser or Chrome with WebXR flags enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* VR Button */}
      <div className="absolute top-4 left-4 z-50">
        <VRButton store={store} />
      </div>

      {/* VR Instructions */}
      <div className="absolute top-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg max-w-sm">
        <h3 className="font-bold mb-2">VR Controls</h3>
        <ul className="text-sm space-y-1">
          <li>• Move around with teleportation</li>
          <li>• Use triggers to interact</li>
          <li>• Look around naturally</li>
          <li>• Press menu button to exit</li>
        </ul>
      </div>

      {/* VR Canvas */}
      <Canvas
        camera={{ position: [0, 5, 10], fov: 75 }}
        gl={{ antialias: true }}
        style={{ background: 'linear-gradient(to bottom, #001122, #000000)' }}
      >
        <XR store={store}>
          <Suspense fallback={
            <Html center>
              <div className="text-white text-xl">Loading VR Experience...</div>
            </Html>
          }>
            <VRScene viewType={viewType} />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
}