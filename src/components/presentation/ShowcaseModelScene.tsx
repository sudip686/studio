'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export type ShowcaseModelVariant = 'flakes' | 'geology' | 'earth';
export type AccentTone = 'amber' | 'teal' | 'sky';

export const showcaseAccentMap: Record<AccentTone, { badge: string; glow: string; ring: string }> = {
  amber: {
    badge: 'border-amber-300/24 bg-amber-300/10 text-amber-100/86',
    glow: 'from-amber-300/28 via-orange-300/12 to-transparent',
    ring: '#fbbf24',
  },
  teal: {
    badge: 'border-teal-300/24 bg-teal-300/10 text-teal-100/86',
    glow: 'from-teal-300/26 via-cyan-300/12 to-transparent',
    ring: '#2dd4bf',
  },
  sky: {
    badge: 'border-sky-300/24 bg-sky-300/10 text-sky-100/86',
    glow: 'from-sky-300/26 via-blue-300/12 to-transparent',
    ring: '#7dd3fc',
  },
};

function GraphiteFlakeCluster() {
  const groupRef = useRef<THREE.Group | null>(null);

  const flakes = useMemo(
    () => [
      { position: [-1.25, 0.35, 0.1], rotation: [0.18, 0.44, -0.16], scale: [2.35, 0.15, 1.2], color: '#7c8796' },
      { position: [-0.45, -0.2, -0.25], rotation: [-0.26, 0.9, 0.18], scale: [2.15, 0.16, 1.05], color: '#909cab' },
      { position: [0.55, 0.55, -0.15], rotation: [0.34, 1.24, -0.12], scale: [1.95, 0.14, 1.15], color: '#a8b4c2' },
      { position: [1.15, -0.45, 0.28], rotation: [-0.18, 1.66, 0.22], scale: [1.72, 0.13, 0.92], color: '#c4d0da' },
      { position: [0.1, -0.85, 0.45], rotation: [0.22, 2.14, -0.08], scale: [1.48, 0.12, 0.86], color: '#e2e8f0' },
    ],
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.26;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.45) * 0.08;
  });

  return (
    <group ref={groupRef} position={[0, -0.05, 0]}>
      {flakes.map((flake, index) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={`flake-${index}`}
          position={flake.position as [number, number, number]}
          rotation={flake.rotation as [number, number, number]}
          scale={flake.scale as [number, number, number]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={flake.color}
            roughness={0.22}
            metalness={0.38}
            emissive="#0f172a"
            emissiveIntensity={0.08}
          />
        </mesh>
      ))}
    </group>
  );
}

function GLBAsset({
  path,
  fitScale,
  yOffset = 0,
}: {
  path: string;
  fitScale: number;
  yOffset?: number;
}) {
  const { scene } = useGLTF(path);
  const groupRef = useRef<THREE.Group | null>(null);

  const preparedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    clone.scale.setScalar(fitScale / maxDimension);
    return clone;
  }, [fitScale, scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.22;
    groupRef.current.rotation.x = 0.16 + Math.sin(state.clock.elapsedTime * 0.32) * 0.04;
  });

  return (
    <group ref={groupRef} position={[0, yOffset, 0]} castShadow receiveShadow>
      <Center>
        <primitive object={preparedScene} />
      </Center>
    </group>
  );
}

export function ShowcaseModelScene({
  variant,
  ringColor,
  cameraPosition = [0, 0.25, 6.2],
  fov = 28,
}: {
  variant: ShowcaseModelVariant;
  ringColor: string;
  cameraPosition?: [number, number, number];
  fov?: number;
}) {
  return (
    <Canvas camera={{ position: cameraPosition, fov }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={1.15} />
      <directionalLight position={[4.5, 5.5, 5]} intensity={2.6} color="#fff1d6" castShadow />
      <directionalLight position={[-3.5, 1.5, -4]} intensity={1.45} color="#8bd5ff" />
      <pointLight position={[0, 2.4, 2.4]} intensity={1.1} color={ringColor} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]}>
        <circleGeometry args={[2.55, 64]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.84, 0]}>
        <ringGeometry args={[2.08, 2.42, 64]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.22} />
      </mesh>

      <Suspense fallback={null}>
        {variant === 'flakes' ? <GraphiteFlakeCluster /> : null}
        {variant === 'geology' ? <GLBAsset path="/geologicalModel.glb" fitScale={3.4} yOffset={-0.15} /> : null}
        {variant === 'earth' ? <GLBAsset path="/earth.glb" fitScale={3.05} /> : null}
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload('/geologicalModel.glb');
useGLTF.preload('/earth.glb');
