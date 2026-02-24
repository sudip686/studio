'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useThreeSceneSafe } from '@/contexts/three-scene-context';
import { projectLonLat } from '@/lib/utils/three-helpers';
import { LITHOLOGY_COLORS } from '@/lib/constants';
import { useDataCache } from '@/lib/data-cache';

// Helper to get color from lithology
function getLithologyColor(lithology: string, legendMap?: Record<string, string>): string {
    if (!lithology) return '#cccccc';
    const key = String(lithology).trim().toLowerCase().replace(/\s+/g, ' ');
    const map = legendMap ?? LITHOLOGY_COLORS.map;
    const color = map?.[key];
    return color ? color : '#cccccc';
}

// Helper for Assay Color
const ASSAY_COLOR_STEPS = 100;
const assayColorCache: { [step: number]: string } = {};
function colorForAssay(vRaw: any, min: number, max: number): string {
    const v = Number(vRaw);
    let t = Number.isFinite(v) && max > min ? (v - min) / (max - min) : 0.5;
    t = Math.max(0, Math.min(1, t));
    const step = Math.floor(t * (ASSAY_COLOR_STEPS - 1));
    if (assayColorCache[step]) return assayColorCache[step];
    const r = t, g = 1 - t, b = 0;
    const color = new THREE.Color(r, g, b);
    const hexString = '#' + color.getHexString();
    assayColorCache[step] = hexString;
    return hexString;
}

interface BoreholeLayerProps {
    modelCenter?: { lon: number, lat: number };
    type?: 'lithology' | 'assay';
    assayCutoff?: number;
    assayRange?: { min: number, max: number };
    visible?: boolean;
    transparency?: number;
    onLoaded?: () => void;
}

export default function BoreholeLayerFixed({ 
    modelCenter, 
    type = 'lithology', 
    assayCutoff, 
    assayRange = { min: 0, max: 1 },
    visible = true,
    transparency = 1.0,
    onLoaded
}: BoreholeLayerProps) {
    const sceneContext = useThreeSceneSafe();
    const { drillholeData, processedLithologyData } = useDataCache();
    console.log('[BoreholeLayer] Version 20260211-Fixed - sceneContext:', !!sceneContext);
    const meshRefs = useRef<THREE.InstancedMesh[]>([]);
    const initializedRef = useRef(false);
    
    // Stable key for modelCenter
    const centerKey = useMemo(() => 
        modelCenter ? `${modelCenter.lon.toFixed(6)}_${modelCenter.lat.toFixed(6)}` : 'none', 
    [modelCenter]);

    useEffect(() => {
        if (!sceneContext || !sceneContext.dynamicGroup || !visible || !modelCenter || !drillholeData) return;

        const { dynamicGroup, registerTooltipObject, unregisterTooltipObject } = sceneContext;

        const disposeMeshes = () => {
            meshRefs.current.forEach(mesh => {
                dynamicGroup.remove(mesh);
                if (unregisterTooltipObject) unregisterTooltipObject(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
            meshRefs.current = [];
        };

        disposeMeshes();

        const segments = type === 'lithology' ? drillholeData.lithology : drillholeData.assay;
        const features = segments.map(segment => segment.feature).filter(Boolean);

        if (!features.length) {
            if (!initializedRef.current) {
                initializedRef.current = true;
                try { onLoaded?.(); } catch {}
            }
            return;
        }

        console.log(`[BoreholeLayer] Rendering ${features.length} ${type} features from geojson`);

        const groups = new Map<string, any[]>();
        const legendMap = processedLithologyData?.legendMap ?? LITHOLOGY_COLORS.map;

        features.forEach((feature: any) => {
            let color = '#cccccc';
            const props = feature.properties ?? {};

            if (type === 'lithology') {
                const lith = props.lithology;
                color = getLithologyColor(lith, legendMap);
            } else {
                const val = props.graphitic_carbon;
                if (assayCutoff !== undefined && (val ?? 0) < assayCutoff) return;
                color = colorForAssay(val, assayRange.min, assayRange.max);
            }

            if (!groups.has(color)) groups.set(color, []);
            groups.get(color)!.push(feature);
        });

        const newMeshes: THREE.InstancedMesh[] = [];
        const tmpObj = new THREE.Object3D();
        const geom = new THREE.CylinderGeometry(2.5, 2.5, 1, 8);
        geom.center();

        for (const [hex, feats] of groups.entries()) {
            const mat = new THREE.MeshPhongMaterial({
                color: new THREE.Color(hex),
                transparent: transparency < 1.0,
                opacity: transparency,
                clipShadows: false,
                shininess: 30
            });

            let totalSegments = 0;
            feats.forEach((f: any) => {
                const coords = f.geometry?.coordinates;
                if (coords && coords.length >= 2) {
                    totalSegments += (coords.length - 1);
                }
            });

            if (totalSegments === 0) continue;

            const mesh = new THREE.InstancedMesh(geom, mat, totalSegments);
            let idx = 0;
            const instanceMap: any[] = [];

            for (const feature of feats) {
                const coords = feature.geometry?.coordinates;
                if (!coords || coords.length < 2) continue;

                for (let j = 0; j < coords.length - 1; j++) {
                    const p1 = coords[j];
                    const p2 = coords[j + 1];

                    const { x: x1, z: z1 } = projectLonLat(p1[0], p1[1], modelCenter);
                    const { x: x2, z: z2 } = projectLonLat(p2[0], p2[1], modelCenter);
                    const y1 = p1[2];
                    const y2 = p2[2];

                    const v1 = new THREE.Vector3(x1, y1, -z1);
                    const v2 = new THREE.Vector3(x2, y2, -z2);

                    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
                    const height = v1.distanceTo(v2);

                    tmpObj.position.copy(mid);
                    tmpObj.scale.set(1, height, 1);
                    tmpObj.lookAt(v2);
                    tmpObj.rotateX(Math.PI / 2);

                    tmpObj.updateMatrix();
                    mesh.setMatrixAt(idx, tmpObj.matrix);
                    instanceMap[idx] = feature.properties;
                    idx++;
                }
            }

            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
            mesh.frustumCulled = false;
            mesh.userData.isBorehole = true;

            dynamicGroup.add(mesh);
            newMeshes.push(mesh);

            if (registerTooltipObject) {
                registerTooltipObject(mesh, (instanceId) => {
                    const props = instanceMap[instanceId];
                    if (!props) return '';
                    let content = `<b>Hole ID:</b> ${props.hole_id || 'N/A'}<br/><b>Depth:</b> ${props.depth_from?.toFixed(1)} - ${props.depth_to?.toFixed(1)} m`;
                    if (type === 'lithology') {
                        content += `<br/><b>Lithology:</b> ${props.lithology || 'Unknown'}`;
                    } else {
                        content += `<br/><b>Graphitic Carbon:</b> ${props.graphitic_carbon?.toFixed(3) || 'N/A'} %`;
                    }
                    return content;
                });
            }
        }

        meshRefs.current = newMeshes;
        if (!initializedRef.current) {
            initializedRef.current = true;
            try { onLoaded?.(); } catch {}
        }

        return () => {
            disposeMeshes();
        };
    }, [sceneContext?.dynamicGroup, visible, transparency, centerKey, type, assayCutoff, assayRange.min, assayRange.max, drillholeData, processedLithologyData]);

    return null;
}
