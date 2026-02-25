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

const HIGH_RES_SEGMENTS = 1024;
const LOW_RES_SEGMENTS = 128;

const terrainCache = {
    meta: null as any,
    heightData: null as Float32Array | null,
    heightPromise: null as Promise<[any, Float32Array]> | null,
    texture: null as THREE.Texture | null,
    texturePromise: null as Promise<THREE.Texture> | null,
};

const loadTerrainMetaAndHeight = async () => {
    if (terrainCache.meta && terrainCache.heightData) {
        return [terrainCache.meta, terrainCache.heightData] as [any, Float32Array];
    }
    if (!terrainCache.heightPromise) {
        terrainCache.heightPromise = Promise.all([
            fetch('/terrain_meta.json').then(res => res.json()),
            fetch(`${ASSET_BASE_URL}/height.bin`).then(res => res.arrayBuffer())
        ]).then(([meta, heightBuffer]) => {
            const heightData = new Float32Array(heightBuffer);
            terrainCache.meta = meta;
            terrainCache.heightData = heightData;
            return [meta, heightData] as [any, Float32Array];
        }).catch(err => {
            terrainCache.heightPromise = null;
            throw err;
        });
    }
    return terrainCache.heightPromise;
};

const loadTerrainTexture = async (renderer?: THREE.WebGLRenderer | null, texturePath?: string) => {
    if (terrainCache.texture) return terrainCache.texture;
    if (!terrainCache.texturePromise) {
        terrainCache.texturePromise = new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                texturePath ?? `${ASSET_BASE_URL}/terrain_texture_8k.jpg`,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
                    const maxAniso = (renderer?.capabilities.getMaxAnisotropy?.() ?? 16) || 16;
                    texture.anisotropy = maxAniso;
                    texture.generateMipmaps = true;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.needsUpdate = true;
                    terrainCache.texture = texture;
                    resolve(texture);
                },
                undefined,
                (err) => {
                    terrainCache.texturePromise = null;
                    reject(err);
                }
            );
        });
    }
    return terrainCache.texturePromise;
};

const buildTerrainGeometry = (
    heightData: Float32Array,
    meta: any,
    modelCenter: { lon: number; lat: number },
    verticalScale: number,
    segmentsW: number,
    segmentsH: number
) => {
    const { bounds_utm, width: dataW, height: dataH } = meta;
    const { minX, maxX, minY, maxY } = bounds_utm;
    const globalWidth = maxX - minX;
    const globalHeight = maxY - minY;

    const sampleHeight = (easting: number, northing: number) => {
        const u = (easting - minX) / globalWidth;
        const v = (maxY - northing) / globalHeight;
        if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
        const x = u * (dataW - 1);
        const y = v * (dataH - 1);
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = Math.min(x0 + 1, dataW - 1);
        const y1 = Math.min(y0 + 1, dataH - 1);
        const dx = x - x0;
        const dy = y - y0;
        const h00 = heightData[y0 * dataW + x0];
        const h10 = heightData[y0 * dataW + x1];
        const h01 = heightData[y1 * dataW + x0];
        const h11 = heightData[y1 * dataW + x1];
        const top = h00 * (1 - dx) + h10 * dx;
        const bottom = h01 * (1 - dx) + h11 * dx;
        return top * (1 - dy) + bottom * dy;
    };

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(segmentsW * segmentsH * 3);
    const uvs = new Float32Array(segmentsW * segmentsH * 2);
    const indices: number[] = [];

    for (let iy = 0; iy < segmentsH; iy++) {
        const rowV = iy / (segmentsH - 1);
        const northing = maxY - rowV * globalHeight;

        for (let ix = 0; ix < segmentsW; ix++) {
            const colU = ix / (segmentsW - 1);
            const easting = minX + colU * globalWidth;
            const height = sampleHeight(easting, northing);
            const idx = (iy * segmentsW + ix);
            const { lat, lon } = utmToLatLon(easting, northing);
            const { x, z } = projectLonLat(lon, lat, modelCenter);

            vertices[idx * 3] = x;
            vertices[idx * 3 + 1] = height * verticalScale;
            vertices[idx * 3 + 2] = -z;

            uvs[idx * 2] = colU;
            uvs[idx * 2 + 1] = 1 - rowV;
        }
    }

    for (let iy = 0; iy < segmentsH - 1; iy++) {
        for (let ix = 0; ix < segmentsW - 1; ix++) {
            const a = iy * segmentsW + ix;
            const b = iy * segmentsW + (ix + 1);
            const c = (iy + 1) * segmentsW + ix;
            const d = (iy + 1) * segmentsW + (ix + 1);
            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
};

export function TerrainAscLayer({ verticalScale = 1, modelCenter, clipRadiusM = DEFAULT_CLIPPING_RADIUS, onLoaded }: { verticalScale?: number, modelCenter?: { lon: number, lat: number }, clipRadiusM?: number | null, onLoaded?: (info: { box: THREE.Box3; center: THREE.Vector3; size: THREE.Vector3; maxY: number }) => void }) {
    const { dynamicGroup, renderer, setTerrainMaxY } = useThreeScene();
    const terrainGroupRef = useRef<THREE.Group | null>(null);
    const initializedRef = useRef(false);
    const meshRef = useRef<THREE.Mesh | null>(null);

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

        loadTerrainMetaAndHeight().then(([meta, heightData]) => {
            if (!meta || !heightData || !modelCenter) return;
            if (heightData.length !== meta.width * meta.height) {
                console.warn(`[TerrainAscLayer] Height data size mismatch. Expected ${meta.width * meta.height}, got ${heightData.length}`);
            }

            const texPath = `${ASSET_BASE_URL}/${meta.rgb_texture || 'terrain_texture_8k.jpg'}`;

            const makeMaterial = (texture: THREE.Texture | null) => new THREE.MeshStandardMaterial({
                map: texture ?? undefined,
                color: 0xffffff,
                side: THREE.DoubleSide,
                roughness: 1.0,
                metalness: 0.0,
                emissive: 0x222222,
                emissiveIntensity: 0.5,
                clippingPlanes: clippingPlanes,
                polygonOffset: true,
                polygonOffsetFactor: 1
            });

            const lowGeometry = buildTerrainGeometry(heightData, meta, modelCenter, verticalScale, LOW_RES_SEGMENTS, LOW_RES_SEGMENTS);
            const lowMaterial = makeMaterial(null);
            const lowMesh = new THREE.Mesh(lowGeometry, lowMaterial);
            lowMesh.frustumCulled = false;
            lowMesh.receiveShadow = true;
            lowMesh.castShadow = true;
            group.add(lowMesh);
            meshRef.current = lowMesh;

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

            const upgradeToHighRes = async () => {
                try {
                    const texture = await loadTerrainTexture(renderer, texPath);
                    const highGeometry = buildTerrainGeometry(heightData, meta, modelCenter, verticalScale, HIGH_RES_SEGMENTS, HIGH_RES_SEGMENTS);
                    const highMaterial = makeMaterial(texture);
                    const highMesh = new THREE.Mesh(highGeometry, highMaterial);
                    highMesh.frustumCulled = false;
                    highMesh.receiveShadow = true;
                    highMesh.castShadow = true;
                    group.add(highMesh);

                    if (meshRef.current) {
                        group.remove(meshRef.current);
                        meshRef.current.geometry.dispose();
                        const mat = meshRef.current.material as THREE.Material;
                        mat.dispose();
                    }
                    meshRef.current = highMesh;
                } catch (e) {
                    console.error('[TerrainAscLayer] Failed to build high-res terrain:', e);
                }
            };

            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(upgradeToHighRes);
            } else {
                setTimeout(upgradeToHighRes, 0);
            }
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
                meshRef.current = null;
            }
        };
    }, [dynamicGroup, renderer]);

    return null;
}