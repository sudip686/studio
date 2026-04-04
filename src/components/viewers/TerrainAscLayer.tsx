'use client';

import { useEffect, useMemo, useRef } from 'react';
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
}) {
  const { dynamicGroup, renderer, setTerrainMaxY } = useThreeScene();
  const terrainGroupRef = useRef<THREE.Group | null>(null);
  const initializedRef = useRef(false);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const centerKey = useMemo(
    () => (modelCenter ? `${modelCenter.lon.toFixed(6)}_${modelCenter.lat.toFixed(6)}` : 'none'),
    [modelCenter],
  );

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
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = renderOrder;
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      group.add(mesh);

      if (meshRef.current) {
        group.remove(meshRef.current);
        const previousGeometry = meshRef.current.geometry as THREE.BufferGeometry;
        if (!previousGeometry.userData?.sharedTerrainGeometry) {
          previousGeometry.dispose();
        }
        const previousMaterial = meshRef.current.material as THREE.Material;
        previousMaterial.dispose();
      }

      meshRef.current = mesh;
      return mesh;
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
  }, [dynamicGroup, centerKey, verticalScale, renderer, clipRadiusM, quality, modelCenter, onLoaded, setTerrainMaxY]);

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
        meshRef.current = null;
      }
    };
  }, [dynamicGroup]);

  return null;
}
