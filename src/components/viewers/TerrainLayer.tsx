'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useThreeScene } from '../../contexts/three-scene-context';
import { projectLonLat } from '@/lib/utils/three-helpers';

// Calculated center of the terrain from Topography.asc (UTM Zone 37S)
const TERRAIN_CENTER = {
    lon: 38.784201,
    lat: -4.811259
};

const CLIPPING_RADIUS = 3000; // 3km radius
const TERRAIN_BAKED_SCALE = 1.6; // Default exaggeration from TerrainGlbBuilder

export function TerrainLayer({ verticalScale = 1, modelCenter }: { verticalScale?: number, modelCenter?: { lon: number, lat: number } }) {
    const { dynamicGroup, renderer } = useThreeScene();
    const terrainGroupRef = useRef<THREE.Group | null>(null);

    useEffect(() => {
        if (!dynamicGroup) return;

        // Enable local clipping on the renderer
        if (renderer) {
            renderer.localClippingEnabled = true;
        }

        // Create a group for the terrain
        const group = new THREE.Group();
        group.name = 'TerrainLayer';
        terrainGroupRef.current = group;
        dynamicGroup.add(group);

        // Define clipping planes in World Space centered at (0,0,0)
        // Since the drillholes are centered at (0,0,0) in the scene (relative to modelCenter)
        // We want to clip everything outside the box +/- 3000m around (0,0,0)
        const planes = [
            new THREE.Plane(new THREE.Vector3(1, 0, 0), CLIPPING_RADIUS),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), CLIPPING_RADIUS),
            new THREE.Plane(new THREE.Vector3(0, 0, 1), CLIPPING_RADIUS),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), CLIPPING_RADIUS)
        ];

        const loader = new GLTFLoader();

        // Function to handle model setup
        const setupModel = (gltf: any) => {
            const model = gltf.scene;
            
            // Apply vertical scale (compensating for baked-in exaggeration)
            model.scale.set(1, verticalScale / TERRAIN_BAKED_SCALE, 1);
            
            // Ensure materials handle lighting correctly
            model.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = true;
                    // Ensure the material is not too dark or invisible
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        
                        // Fix "pixels breaking" (Z-fighting/shimmering)
                        child.material.polygonOffset = true;
                        child.material.polygonOffsetFactor = 1;
                        child.material.polygonOffsetUnits = 1;
                        
                        // Adjust appearance
                        child.material.roughness = 1.0;
                        child.material.metalness = 0.0;

                        // Apply clipping planes
                        child.material.clippingPlanes = planes;
                        child.material.clipShadows = true;
                    }
                }
            });

            group.add(model);
        };

        // Try loading terrain.glb first (higher resolution), fallback to terrain_min.glb
        const loadTerrain = (url: string) => {
            return new Promise<void>((resolve, reject) => {
                loader.load(
                    url,
                    (gltf) => {
                        setupModel(gltf);
                        resolve();
                    },
                    undefined,
                    (err) => reject(err)
                );
            });
        };

        const MIN_ELEVATION = 433.17; // From Topography.asc

        // Position the terrain group relative to the model center
        if (modelCenter) {
            const { x, z } = projectLonLat(TERRAIN_CENTER.lon, TERRAIN_CENTER.lat, modelCenter);
            // Three.js uses (x, y, -z) for (East, Up, North) usually in this project's context
            // Apply vertical offset based on min elevation and vertical scale
            // The GLB is likely generated with base at 0 (relative to min elev), so we shift it up.
            group.position.set(x, MIN_ELEVATION * verticalScale, -z);
            console.log('[TerrainLayer] Positioned terrain at:', x, MIN_ELEVATION * verticalScale, -z, 'relative to', modelCenter);
        } else {
             console.warn('[TerrainLayer] No modelCenter provided, terrain at (0,0,0)');
        }

        loadTerrain('/terrain.glb')
            .catch(() => {
                console.log('[TerrainLayer] terrain.glb not found, trying terrain_min.glb');
                return loadTerrain('/terrain_min.glb');
            })
            .catch((err) => {
                console.error('[TerrainLayer] Failed to load terrain:', err);
            });

        return () => {
            if (terrainGroupRef.current) {
                dynamicGroup.remove(terrainGroupRef.current);
                // Dispose resources
                terrainGroupRef.current.traverse((obj) => {
                    if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
                    if ((obj as THREE.Mesh).material) {
                        const m = (obj as THREE.Mesh).material;
                        if (Array.isArray(m)) m.forEach(mm => mm.dispose());
                        else m.dispose();
                    }
                });
                terrainGroupRef.current = null;
            }
        };
    }, [dynamicGroup, verticalScale, modelCenter]);

    return null;
}
