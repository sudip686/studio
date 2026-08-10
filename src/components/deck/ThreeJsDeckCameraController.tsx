"use client";

import { useEffect } from "react";
import * as THREE from "three";
import type { DeckCamera } from "@/lib/deck";
import { useThreeScene } from "@/contexts/three-scene-context";

export function ThreeJsDeckCameraController({ camera }: { camera?: DeckCamera }) {
  const { camera: threeCamera, controls, dynamicGroup } = useThreeScene();

  useEffect(() => {
    if (!threeCamera || !controls || !camera || !dynamicGroup) return;

    // Calculate the center of the model for accurate targeting
    const box = new THREE.Box3().setFromObject(dynamicGroup);
    const targetPosition = new THREE.Vector3();
    box.getCenter(targetPosition);

    // Update the controls target to the center of the model
    controls.target.copy(targetPosition);
    controls.update();

    // Convert pitch/height/heading from deck.ts to Three.js coordinates
    const pitchRad = (camera.pitch ?? 0) * (Math.PI / 180);
    const headingRad = (camera.heading ?? 0) * (Math.PI / 180);
    const distance = camera.height ?? 10000;

    // Calculate camera position based on spherical coordinates
    // Invert offsetY: positive pitch in deck.ts should put camera BELOW the target (Y < 0)
    const offsetX = distance * Math.cos(pitchRad) * Math.sin(headingRad);
    const offsetY = -distance * Math.sin(pitchRad);
    const offsetZ = distance * Math.cos(pitchRad) * Math.cos(headingRad);

    const newPosition = new THREE.Vector3(offsetX, offsetY, offsetZ).add(targetPosition);

    const duration = (camera.duration ?? 2.0) * 1000;
    const startPos = threeCamera.position.clone();
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      threeCamera.position.lerpVectors(startPos, newPosition, ease);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [threeCamera, controls, camera, dynamicGroup]);

  return null;
}
