'use client';
import * as THREE from 'three';
import { useEffect } from 'react';

export default function SurveyGridThree({
  scene,
  size = 4000,
  spacing = 100,
  majorEvery = 5,
  colorMinor = 0x606770,
  colorMajor = 0x9aa0a6,
}: {
  scene: THREE.Scene;
  size?: number;
  spacing?: number;
  majorEvery?: number;
  colorMinor?: number;
  colorMajor?: number;
}) {
  useEffect(() => {
    if (!scene) return;
    const gMinor = new THREE.GridHelper(size, size / spacing, colorMinor, colorMinor);
    gMinor.material.transparent = true;
    (gMinor.material as THREE.Material).opacity = 0.25;
    const gMajor = new THREE.GridHelper(size, size / (spacing * majorEvery), colorMajor, colorMajor);
    (gMajor.material as THREE.Material).opacity = 0.5;
    gMajor.material.transparent = true;

    scene.add(gMinor);
    scene.add(gMajor);

    return () => {
      scene.remove(gMinor); scene.remove(gMajor);
      gMinor.geometry.dispose(); (gMinor.material as any).dispose?.();
      gMajor.geometry.dispose(); (gMajor.material as any).dispose?.();
    };
  }, [scene, size, spacing, majorEvery, colorMinor, colorMajor]);

  return null;
}
