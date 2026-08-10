'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import proj4 from 'proj4';
import { useThreeScene } from '@/contexts/three-scene-context';
import { projectLonLat } from '@/lib/utils/three-helpers';

type ForgeTerrainObjLayerProps = {
  objUrl?: string;
  modelCenter?: { lon: number; lat: number };
  meshVisible?: boolean;
  meshOpacity?: number;
  verticalScale?: number;
  visualMode?: 'default' | 'technical';
  onLoaded?: () => void;
};

export default function ForgeTerrainObjLayer({
  objUrl = '/generated/forge3d_test_terrain_simplified.obj',
  modelCenter,
  meshVisible = true,
  meshOpacity = 1,
  verticalScale = 1,
  visualMode = 'default',
  onLoaded,
}: ForgeTerrainObjLayerProps) {
  const { dynamicGroup, setTerrainMaxY } = useThreeScene();
  const terrainGroupRef = useRef<THREE.Group | null>(null);
  const TECHNICAL_TERRAIN_BASE = '#c4d0d8';
  const TECHNICAL_TERRAIN_EMISSIVE = '#324859';
  const TECHNICAL_TERRAIN_SHEEN = '#f3f8fb';
  const effectiveVerticalScale = visualMode === 'technical' ? verticalScale * 1.08 : verticalScale;

  const scale = useMemo(() => {
    const horizontal = 14000;
    const vertical = 2300 * effectiveVerticalScale;
    return new THREE.Vector3(horizontal, vertical, horizontal);
  }, [effectiveVerticalScale]);

  useEffect(() => {
    if (!(proj4 as any).defs['EPSG:32737']) {
      proj4.defs('EPSG:32737', '+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs');
    }
  }, []);

  useEffect(() => {
    if (!dynamicGroup) return;

    let disposed = false;
    const loader = new OBJLoader();
    const group = new THREE.Group();
    group.name = 'ForgeTerrainObjLayer';
    terrainGroupRef.current = group;
    dynamicGroup.add(group);

    const loadObj = () =>
      new Promise<THREE.Group>((resolve, reject) => {
        loader.load(objUrl, resolve, undefined, reject);
      });

    const loadMeta = async () => {
      try {
        const res = await fetch('/generated/forge3d_test_terrain_meta.json', { cache: 'no-store' });
        if (!res.ok) return null as any;
        return await res.json();
      } catch {
        return null;
      }
    };

    Promise.all([loadObj(), loadMeta()])
      .then(([object, meta]) => {
        if (disposed) return;
        console.info(`[ForgeTerrainObjLayer] loading OBJ from ${objUrl}`);
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          const geometry = mesh.geometry;
          if (geometry) {
            // Recompute smooth normals for a less faceted terrain surface.
            if (geometry.attributes.normal) {
              geometry.deleteAttribute('normal');
            }
            geometry.computeVertexNormals();
            geometry.normalizeNormals();
          }

          const technicalLook = visualMode === 'technical';
          mesh.castShadow = false;
          mesh.receiveShadow = technicalLook;
          mesh.frustumCulled = false;
          const mat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(technicalLook ? '#d6e0e7' : '#b9cad6'),
            emissive: new THREE.Color(technicalLook ? '#496072' : '#5a7488'),
            emissiveIntensity: technicalLook ? 0.1 : 0.14,
            roughness: technicalLook ? 0.56 : 0.74,
            metalness: technicalLook ? 0.08 : 0.04,
            clearcoat: technicalLook ? 0.22 : 0.08,
            clearcoatRoughness: technicalLook ? 0.44 : 0.68,
            sheen: technicalLook ? 0.36 : 0.12,
            sheenColor: new THREE.Color(TECHNICAL_TERRAIN_SHEEN),
          });
          mat.transparent = meshOpacity < 0.999;
          mat.opacity = THREE.MathUtils.clamp(meshOpacity, 0.05, 1);
          mat.depthWrite = meshOpacity >= 0.999;
          mesh.material = mat;
        });

        const hint = meta?.viewer_scale_hint;
        const scaleHint =
          hint && Number.isFinite(hint.x) && Number.isFinite(hint.y) && Number.isFinite(hint.z)
            ? new THREE.Vector3(Number(hint.x), Number(hint.y) * verticalScale, Number(hint.z))
            : null;
        object.scale.copy(scaleHint ?? scale);

        // Align terrain in the same world frame as drillholes/models:
        // - X/Z from crop center UTM projected relative to active modelCenter
        // - Y from absolute elevation center so collars sit near terrain surface
        const minElev = Number(meta?.dem_min_max?.[0]);
        const maxElev = Number(meta?.dem_min_max?.[1]);
        const elevCenter =
          Number.isFinite(minElev) && Number.isFinite(maxElev) ? (minElev + maxElev) * 0.5 * effectiveVerticalScale : 0;

        if (modelCenter && meta?.crop_center_utm && Number.isFinite(meta.crop_center_utm.x) && Number.isFinite(meta.crop_center_utm.y)) {
          const [lon, lat] = proj4('EPSG:32737', 'WGS84', [Number(meta.crop_center_utm.x), Number(meta.crop_center_utm.y)]);
          const { x, z } = projectLonLat(lon, lat, modelCenter);
          object.position.set(x, elevCenter, -z);
          console.info('[ForgeTerrainObjLayer] world alignment', {
            cropCenterUtm: meta.crop_center_utm,
            modelCenter,
            projected: { x, z: -z, y: elevCenter },
          });
        } else {
          object.position.set(0, elevCenter, 0);
          console.warn('[ForgeTerrainObjLayer] Missing modelCenter/crop_center_utm, using fallback origin alignment.');
        }

        object.visible = meshVisible;
        group.add(object);
        console.info('[ForgeTerrainObjLayer] OBJ attached to scene', {
          children: object.children.length,
          scale: object.scale.toArray(),
          position: object.position.toArray(),
        });

        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(group);
        setTerrainMaxY?.(box.max.y);
        onLoaded?.();
      })
      .catch((error) => {
        console.error('[ForgeTerrainObjLayer] Failed to load OBJ:', error);
      });

    return () => {
      disposed = true;
      if (terrainGroupRef.current) {
        dynamicGroup.remove(terrainGroupRef.current);
        terrainGroupRef.current.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
      }
      terrainGroupRef.current = null;
    };
  }, [dynamicGroup, meshOpacity, modelCenter, objUrl, scale, meshVisible, onLoaded, setTerrainMaxY, effectiveVerticalScale, visualMode]);

  useEffect(() => {
    if (!terrainGroupRef.current) return;
    terrainGroupRef.current.visible = meshVisible;
  }, [meshVisible]);

  useEffect(() => {
    const group = terrainGroupRef.current;
    if (!group) return;
    const clamped = THREE.MathUtils.clamp(meshOpacity, 0.05, 1);
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m) => {
        const mat = m as THREE.Material & { opacity?: number; transparent?: boolean; depthWrite?: boolean; needsUpdate?: boolean };
        if (typeof mat.opacity === 'number') {
          mat.opacity = clamped;
          mat.transparent = clamped < 0.999;
          mat.depthWrite = clamped >= 0.999;
          mat.needsUpdate = true;
        }
      });
    });
  }, [meshOpacity]);

  return null;
}

