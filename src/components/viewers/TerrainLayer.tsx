'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
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

        // Function to handle model setup with realistic terrain material
        const setupModel = (gltf: any) => {
            const model = gltf.scene;

            // Apply vertical scale (compensating for baked-in exaggeration)
            model.scale.set(1, verticalScale / TERRAIN_BAKED_SCALE, 1);

            // Create a more realistic earth material with noise variation
            const createRealisticEarthMaterial = (): THREE.MeshStandardMaterial => {
                // Base earthy color palette - natural soil/rock tones
                const baseColor = new THREE.Color(0x5d6757); // Primary earthy green-brown
                const variationColors = [
                    new THREE.Color(0x4a5245), // Darker earth
                    new THREE.Color(0x6b7563), // Lighter soil
                    new THREE.Color(0x3d4438), // Shadow areas
                    new THREE.Color(0x7a846f), // Highlight areas
                ];

                return {
                    color: baseColor,
                    roughness: 0.85,
                    metalness: 0.1,
                    envMapIntensity: 1.2,
                    side: THREE.DoubleSide,
                    polygonOffset: true,
                    polygonOffsetFactor: 1,
                    polygonOffsetUnits: 1,
                    clipShadows: true,
                    // Add noise-based color variation for natural look
                    vertexColors: false,
                } as any;
            };

            // Ensure materials handle lighting correctly
            model.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = true;

                    if (child.material) {
                        child.material.side = THREE.DoubleSide;

                        // Fix "pixels breaking" (Z-fighting/shimmering)
                        child.material.polygonOffset = true;
                        child.material.polygonOffsetFactor = 1;
                        child.material.polygonOffsetUnits = 1;

                        // Natural earth terrain material - realistic like Google Earth
                        const earthColor = new THREE.Color(0x5d6757); // Natural earthy green-brown
                        child.material.color = earthColor;
                        child.material.roughness = 0.85; // Slightly rough for natural soil/rock
                        child.material.metalness = 0.1; // Very slight metallic for wet rock areas
                        child.material.envMapIntensity = 1.2; // Enhanced environmental reflection

                        // Apply clipping planes
                        child.material.clippingPlanes = planes;
                        child.material.clipShadows = true;

                        // Add subtle noise variation for realism using SimplexNoise
                        const simplex = new SimplexNoise();
                        const originalPositionAttribute = (child as THREE.Mesh).geometry.attributes.position;
                        const count = originalPositionAttribute.count;
                        const positionAttribute = originalPositionAttribute;
                        const normalAttribute = (child as THREE.Mesh).geometry.attributes.normal;

                        // Create a new geometry with noise-displaced surface
                        const newGeometry = new THREE.BufferGeometry();
                        const newPositions = new Float32Array(count * 3);
                        const newNormals = new Float32Array(count * 3);

                        for (let i = 0; i < count; i++) {
                            const x = positionAttribute.getX(i);
                            const y = positionAttribute.getY(i);
                            const z = positionAttribute.getZ(i);

                            // Use noise based on X and Z coordinates for natural variation
                            const noiseScale = 500; // Scale of variation
                            const noiseValue = simplex.noise((x / noiseScale), (z / noiseScale));

                            // Subtly displace the surface (very subtle, ~2-3% max)
                            newPositions[i * 3] = x;
                            newPositions[i * 3 + 1] = y + noiseValue * 0.025; // Very subtle displacement
                            newPositions[i * 3 + 2] = z;

                            // Recalculate normals for better lighting
                            if (i > 0 && i < count - 1) {
                                const p0 = [x, y, z];
                                const p1 = [
                                    positionAttribute.getX(Math.min(i + 1, count - 1)),
                                    positionAttribute.getY(Math.min(i + 1, count - 1)),
                                    positionAttribute.getZ(Math.min(i + 1, count - 1))
                                ];
                                const p2 = [
                                    positionAttribute.getX(Math.max(i - 1, 0)),
                                    positionAttribute.getY(Math.max(i - 1, 0)),
                                    positionAttribute.getZ(Math.max(i - 1, 0))
                                ];

                                const v1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
                                const v2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

                                const normalX = v1[1] * v2[2] - v1[2] * v2[1];
                                const normalY = v1[2] * v2[0] - v1[0] * v2[2];
                                const normalZ = v1[0] * v2[1] - v1[1] * v2[0];

                                const length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
                                newNormals[i * 3] = normalX / length;
                                newNormals[i * 3 + 1] = normalY / length;
                                newNormals[i * 3 + 2] = normalZ / length;
                            } else {
                                newNormals[i * 3] = normalAttribute.getX(i);
                                newNormals[i * 3 + 1] = normalAttribute.getY(i);
                                newNormals[i * 3 + 2] = normalAttribute.getZ(i);
                            }
                        }

                        newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
                        newGeometry.setAttribute('normal', new THREE.BufferAttribute(newNormals, 3));
                        (child as THREE.Mesh).geometry = newGeometry;
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
