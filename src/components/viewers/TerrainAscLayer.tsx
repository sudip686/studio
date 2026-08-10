'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '../../contexts/three-scene-context';
import {
  createTerrainMaterial,
  describeTerrainError,
  prepareTerrainSurface,
} from '@/lib/terrain/shared-terrain-cache';

const DEFAULT_CLIPPING_RADIUS = 3000;

export function TerrainAscLayer({
  verticalScale = 1,
  modelCenter,
  clipRadiusM = DEFAULT_CLIPPING_RADIUS,
  quality = 'interactive',
  onLoaded,
  meshVisible: propsMeshVisible,
  meshOpacity = 1,
}: {
  verticalScale?: number;
  modelCenter?: { lon: number; lat: number };
  clipRadiusM?: number | null;
  quality?: 'interactive' | 'presentation';
  onLoaded?: (info: {
    box: THREE.Box3;
    center: THREE.Vector3;
    size: THREE.Vector3;
    maxY: number;
  }) => void;
  meshVisible?: boolean;
  meshOpacity?: number;
}) {
  const [meshVisibleState, setMeshVisibleState] = useState(true);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const { dynamicGroup, renderer, setTerrainMaxY, camera, controls } = useThreeScene();
  const terrainGroupRef = useRef<THREE.Group | null>(null);
  const initializedRef = useRef(false);
  const adaptiveQualityRef = useRef<'low' | 'medium' | 'high'>('high');

  const meshVisible = propsMeshVisible !== undefined ? propsMeshVisible : meshVisibleState;
  const applyOpacity = useCallback((material: THREE.Material | THREE.Material[] | null | undefined, opacityRaw: number) => {
    if (!material) return;
    const opacity = THREE.MathUtils.clamp(opacityRaw, 0.05, 1);
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((m) => {
      const mat = m as THREE.Material & { opacity?: number; transparent?: boolean; depthWrite?: boolean; needsUpdate?: boolean };
      if (typeof mat.opacity === 'number') {
        mat.opacity = opacity;
        mat.transparent = opacity < 0.999;
        mat.depthWrite = opacity >= 0.999;
        mat.needsUpdate = true;
      }
    });
  }, []);

  // Adaptive quality: adjust based on camera distance for presentation slides
  const centerKey = useMemo(
    () => (modelCenter ? `${modelCenter.lon.toFixed(6)}_${modelCenter.lat.toFixed(6)}` : 'none'),
    [modelCenter],
  );

  const getAdaptiveQuality = useCallback(() => {
    if (!camera || !controls) return adaptiveQualityRef.current;

    // Calculate distance from camera to terrain center
    const terrainPosition = new THREE.Vector3();
    if (dynamicGroup) {
      dynamicGroup.getWorldPosition(terrainPosition);
      const distance = camera.position.distanceTo(terrainPosition);

      // Adaptive quality based on distance
      if (distance < 5000) {
        adaptiveQualityRef.current = 'high';
      } else if (distance < 15000) {
        adaptiveQualityRef.current = 'medium';
      } else {
        adaptiveQualityRef.current = 'low';
      }
    }
    return adaptiveQualityRef.current;
  }, [camera, controls, dynamicGroup]);

  // Monitor camera movement for quality adjustment
  useEffect(() => {
    let lastCameraPosition = new THREE.Vector3();
    const checkCameraMovement = () => {
      if (camera) {
        const movement = camera.position.distanceTo(lastCameraPosition);
        if (movement > 100) {
          // Reduce quality during fast movement to maintain performance
          adaptiveQualityRef.current = 'medium';
        }
        lastCameraPosition.copy(camera.position);
      }
    };

    const interval = setInterval(checkCameraMovement, 100);
    return () => clearInterval(interval);
  }, [camera]);

  useEffect(() => {
    if (!dynamicGroup || !modelCenter || initializedRef.current) return;
    initializedRef.current = true;

    let disposed = false;
    let idleCallbackId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (renderer) renderer.localClippingEnabled = true;

    const group = new THREE.Group();
    group.name = 'TerrainAscLayer';
    terrainGroupRef.current = group;
    dynamicGroup.add(group);

    const radius = clipRadiusM ?? DEFAULT_CLIPPING_RADIUS;
    const clippingPlanes =
      clipRadiusM === null
        ? []
        : [
            new THREE.Plane(new THREE.Vector3(1, 0, 0), radius),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), radius),
            new THREE.Plane(new THREE.Vector3(0, 0, 1), radius),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), radius),
          ];

    const attachMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, renderOrder: number) => {
      const previousMesh = meshRef.current;
      if (previousMesh && previousMesh.parent === group) {
        group.remove(previousMesh);
        const previousMaterial = previousMesh.material;
        if (Array.isArray(previousMaterial)) {
          previousMaterial.forEach((entry) => entry.dispose());
        } else {
          previousMaterial.dispose();
        }
        meshRef.current = null;
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = meshVisible;
      applyOpacity(mesh.material, meshOpacity);
      console.log('[TerrainAscLayer] Attaching mesh, visible:', meshVisible);
      meshRef.current = mesh;
      mesh.renderOrder = renderOrder;
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      group.add(mesh);

      return mesh;
    };

    const toggleMeshVisibility = () => {
      setMeshVisibleState((prev) => {
        const next = !prev;
        if (meshRef.current) {
          meshRef.current.visible = next;
        }
        return next;
      });
    };

    const updateBounds = () => {
      try {
        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(group);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        const maxY = box.max.y;
        setTerrainMaxY?.(maxY);
        onLoaded?.({ box, center, size, maxY });
      } catch (error) {
        console.warn('[TerrainAscLayer] Failed to compute bounds:', error);
      }
    };

    const preferHighQuality = quality === 'presentation';

    prepareTerrainSurface(modelCenter, verticalScale, renderer, { includeHigh: preferHighQuality })
      .then((resources) => {
        console.log('[TerrainAscLayer] prepareTerrainSurface resolved:', {
          texture: resources.texture?.name,
          hasHighGeom: !!resources.highGeometry,
          hasLowGeom: !!resources.lowGeometry
        });
        if (disposed || !terrainGroupRef.current) return;


        attachMesh(
          preferHighQuality && resources.highGeometry ? resources.highGeometry : resources.lowGeometry,
          createTerrainMaterial({
            texture: resources.texture,
            normalMap: resources.normalMap,
            clippingPlanes,
            highQuality: preferHighQuality && !!resources.highGeometry,
            renderer,
          }),
          0,
        );
        updateBounds();

        if (preferHighQuality) {
          return;
        }

        const upgradeToHighRes = async () => {
          try {
            if (disposed || !terrainGroupRef.current) return;

            const upgraded = await prepareTerrainSurface(modelCenter, verticalScale, renderer, { includeHigh: true });
            if (disposed || !terrainGroupRef.current || !upgraded.highGeometry) return;

            attachMesh(
              upgraded.highGeometry,
              createTerrainMaterial({
                texture: upgraded.texture,
                normalMap: upgraded.normalMap,
                clippingPlanes,
                highQuality: true,
                renderer,
              }),
              1,
            );
          } catch (error) {
            if (!disposed) {
              console.warn(
                '[TerrainAscLayer] High-res terrain unavailable, keeping low-res surface.',
                describeTerrainError(error),
              );
            }
          }
        };

        if ('requestIdleCallback' in window) {
          idleCallbackId = (window as any).requestIdleCallback(upgradeToHighRes);
        } else {
          timeoutId = setTimeout(upgradeToHighRes, 0);
        }
      })
      .catch((error) => {
        console.error('[TerrainAscLayer] Failed to load terrain data:', error);
        console.log('[TerrainAscLayer] Error details:', describeTerrainError(error));
        initializedRef.current = false;
      });

    return () => {
      disposed = true;
      if (idleCallbackId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [applyOpacity, dynamicGroup, centerKey, verticalScale, renderer, clipRadiusM, quality, modelCenter, onLoaded, setTerrainMaxY, meshOpacity, meshVisible]);

  useEffect(() => {
    return () => {
      if (terrainGroupRef.current && dynamicGroup) {
        dynamicGroup.remove(terrainGroupRef.current);
        terrainGroupRef.current.traverse((object) => {
          const mesh = object as THREE.Mesh;
          const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
          if (geometry && !geometry.userData?.sharedTerrainGeometry) {
            geometry.dispose();
          }

          if (mesh.material) {
            const material = mesh.material as THREE.Material;
            material.dispose();
          }
        });
        terrainGroupRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [dynamicGroup]);

  // Sync mesh visibility - respond to propsMeshVisible changes immediately
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.visible = meshVisible;
    }
  }, [meshVisible]);

  useEffect(() => {
    if (!meshRef.current) return;
    applyOpacity(meshRef.current.material, meshOpacity);
  }, [applyOpacity, meshOpacity]);


  return null;
}

