'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import proj4 from 'proj4';
import { useThreeScene } from '../../contexts/three-scene-context';
import { projectLonLat } from '@/lib/utils/three-helpers';
import { ASSET_BASE_URL } from '@/lib/constants';

// Register UTM Zone 37S
proj4.defs("EPSG:32737", "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs");

function utmToLatLon(easting: number, northing: number) {
    const [lon, lat] = proj4("EPSG:32737", "WGS84", [easting, northing]);
    return { lat, lon };
}

const DEFAULT_CLIPPING_RADIUS = 3000;

export function TerrainAscLayer({ verticalScale = 1, modelCenter, clipRadiusM = DEFAULT_CLIPPING_RADIUS, onLoaded }: { verticalScale?: number, modelCenter?: { lon: number, lat: number }, clipRadiusM?: number | null, onLoaded?: (info: { box: THREE.Box3; center: THREE.Vector3; size: THREE.Vector3; maxY: number }) => void }) {
    const { dynamicGroup, renderer, setTerrainMaxY } = useThreeScene();
    const terrainGroupRef = useRef<THREE.Group | null>(null);
    const initializedRef = useRef(false);

    const centerKey = useMemo(() => 
        modelCenter ? `${modelCenter.lon.toFixed(6)}_${modelCenter.lat.toFixed(6)}` : 'none', 
    [modelCenter]);

    useEffect(() => {
        if (!dynamicGroup || !modelCenter || initializedRef.current) return;
        initializedRef.current = true;

        console.log('[TerrainAscLayer] Initializing terrain with binary height & baked texture');

        if (renderer) renderer.localClippingEnabled = true;

        const group = new THREE.Group();
        group.name = 'TerrainAscLayer';
        terrainGroupRef.current = group;
        dynamicGroup.add(group);

        const radius = clipRadiusM ?? DEFAULT_CLIPPING_RADIUS;
        const clippingPlanes = clipRadiusM === null ? [] : [
            new THREE.Plane(new THREE.Vector3(1, 0, 0), radius),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), radius),
            new THREE.Plane(new THREE.Vector3(0, 0, 1), radius),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), radius)
        ];

        Promise.all([
            fetch('/terrain_meta.json').then(res => res.json()),
            fetch(`${ASSET_BASE_URL}/height.bin`).then(res => res.arrayBuffer())
        ]).then(([meta, heightBuffer]) => {
            const { bounds_utm, width: dataW, height: dataH } = meta;
            const { minX, maxX, minY, maxY } = bounds_utm;
            
            const heightData = new Float32Array(heightBuffer);
            
            // Validate data size
            if (heightData.length !== dataW * dataH) {
                console.warn(`[TerrainAscLayer] Height data size mismatch. Expected ${dataW*dataH}, got ${heightData.length}`);
            }

            const globalWidth = maxX - minX;
            const globalHeight = maxY - minY;

            // Bilinear interpolation for smoother terrain
            const sampleHeight = (easting: number, northing: number) => {
                // Map coords to pixel space 0..W-1, 0..H-1
                const u = (easting - minX) / globalWidth;
                const v = (maxY - northing) / globalHeight; // Y is flipped in image coords usually (Top-Left origin)

                // Clamp
                if (u < 0 || u > 1 || v < 0 || v > 1) return 0;

                const x = u * (dataW - 1);
                const y = v * (dataH - 1);

                const x0 = Math.floor(x);
                const y0 = Math.floor(y);
                const x1 = Math.min(x0 + 1, dataW - 1);
                const y1 = Math.min(y0 + 1, dataH - 1);

                const dx = x - x0;
                const dy = y - y0;

                // Index: y * width + x
                const h00 = heightData[y0 * dataW + x0];
                const h10 = heightData[y0 * dataW + x1];
                const h01 = heightData[y1 * dataW + x0];
                const h11 = heightData[y1 * dataW + x1];

                // Bilinear
                const top = h00 * (1 - dx) + h10 * dx;
                const bottom = h01 * (1 - dx) + h11 * dx;
                return top * (1 - dy) + bottom * dy;
            };

            const SEGMENTS_W = 1024; // Increased resolution
            const SEGMENTS_H = 1024; 
            
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array(SEGMENTS_W * SEGMENTS_H * 3);
            const uvs = new Float32Array(SEGMENTS_W * SEGMENTS_H * 2);
            const indices: number[] = [];
            
            for (let iy = 0; iy < SEGMENTS_H; iy++) {
                const rowV = iy / (SEGMENTS_H - 1);
                const northing = maxY - rowV * globalHeight;

                for (let ix = 0; ix < SEGMENTS_W; ix++) {
                    const colU = ix / (SEGMENTS_W - 1);
                    const easting = minX + colU * globalWidth;

                    const height = sampleHeight(easting, northing);
                    const idx = (iy * SEGMENTS_W + ix);
                    const { lat, lon } = utmToLatLon(easting, northing);
                    const { x, z } = projectLonLat(lon, lat, modelCenter);
                    
                    vertices[idx * 3] = x;
                    vertices[idx * 3 + 1] = height * verticalScale;
                    vertices[idx * 3 + 2] = -z; // Z is -Z in this projection logic
                    
                    uvs[idx * 2] = colU;
                    uvs[idx * 2 + 1] = 1 - rowV; // Texture V is usually 0 at bottom, 1 at top? 
                    // If image is top-down (dem), rowV=0 is Top (MaxY). 
                    // Standard UV: (0,0) is bottom-left. 
                    // If texture matches DEM (Top-Left origin in file), then:
                    // When rowV=0 (Top), V should be 1.
                    // When rowV=1 (Bottom), V should be 0.
                    // So 1 - rowV is correct.
                }
            }
            
            for (let iy = 0; iy < SEGMENTS_H - 1; iy++) {
                for (let ix = 0; ix < SEGMENTS_W - 1; ix++) {
                    const a = iy * SEGMENTS_W + ix;
                    const b = iy * SEGMENTS_W + (ix + 1);
                    const c = (iy + 1) * SEGMENTS_W + ix;
                    const d = (iy + 1) * SEGMENTS_W + (ix + 1);
                    indices.push(a, c, b);
                    indices.push(b, c, d);
                }
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            // Load Baked Texture
            const textureLoader = new THREE.TextureLoader();
            const texPath = `${ASSET_BASE_URL}/${meta.rgb_texture || 'terrain_texture_8k.jpg'}`;
            
            textureLoader.load(texPath, (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
                
                const maxAniso = (renderer?.capabilities.getMaxAnisotropy?.() ?? 16) || 16;
                texture.anisotropy = maxAniso;
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.needsUpdate = true;

                const mat = new THREE.MeshStandardMaterial({
                    map: texture,
                    color: 0xffffff,
                    side: THREE.DoubleSide,
                    roughness: 1.0, // Fully rough for terrain
                    metalness: 0.0,
                    emissive: 0x222222, // Low ambient emission to prevent blackness
                    emissiveIntensity: 0.5,
                    clippingPlanes: clippingPlanes,
                    polygonOffset: true,
                    polygonOffsetFactor: 1
                });
                
                const mesh = new THREE.Mesh(geometry, mat);
                mesh.frustumCulled = false;
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                group.add(mesh);

                // Compute bounds and notify listeners so camera/controls can fit safely
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
                } catch (e) {
                    console.warn('[TerrainAscLayer] Failed to compute bounds:', e);
                }
            });

        }).catch(err => {
            console.error('[TerrainAscLayer] Failed to load terrain data:', err);
            initializedRef.current = false;
        });

    }, [dynamicGroup, centerKey, verticalScale, renderer]);

    useEffect(() => {
        return () => {
            if (terrainGroupRef.current && dynamicGroup) {
                dynamicGroup.remove(terrainGroupRef.current);
                terrainGroupRef.current.traverse((o) => {
                    if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
                    if ((o as THREE.Mesh).material) {
                        const m = (o as THREE.Mesh).material as THREE.Material;
                        m.dispose();
                    }
                });
                terrainGroupRef.current = null;
                initializedRef.current = false;
            }
        };
    }, [dynamicGroup, renderer]);

    return null;
}