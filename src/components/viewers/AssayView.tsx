'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useDataCache } from '@/lib/data-cache';
import { Legend } from '@/components/ui/legend';
import { projectLonLat, fitCameraToGroupWorldAware } from '../../lib/utils/three-helpers';
import { useThreeScene } from '../../contexts/three-scene-context';
import { ErrorDisplay } from '@/components/ui/error-display';

// ## Data Structures & Constants ##
interface DrillholeSegment {
    lon: number; lat: number; elevation: number; depth_from: number; depth_to: number; hole_id: string;
    lithology?: string; graphitic_carbon?: number; feature: any;
}

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

function getSegmentEnds(seg:{feature:any}) {
  const g = seg?.feature?.geometry;
  if (g?.type === 'LineString' && g.coordinates?.length >= 2) {
    const [a,b] = g.coordinates; // [lon,lat,z]
    if (a?.length>=3 && b?.length>=3) return {a, b};
  }
  return null; // skip bad segments
}

export default function AssayViewer({ assayCutoff }: { assayCutoff?: number }) {
    const mountedRef = useRef(false);
    const { processedAssayData, loadingStatus, error, refetch } = useDataCache();
    const { scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject } = useThreeScene();

    const assayRange = useMemo(() => {
        if (!processedAssayData || !processedAssayData.assayRange) return { min: 0, max: 1 };
        return processedAssayData.assayRange;
    }, [processedAssayData]);

    const assayGradient = useMemo(() => {
        // Create CSS gradient: linear-gradient(to right, colorAtMin, colorAtMax)
        // Since colorForAssay is t=0 (green) to t=1 (red)
        const startColor = colorForAssay(assayRange.min, assayRange.min, assayRange.max);
        const midColor = colorForAssay((assayRange.min + assayRange.max) / 2, assayRange.min, assayRange.max);
        const endColor = colorForAssay(assayRange.max, assayRange.min, assayRange.max);
        return `linear-gradient(to right, ${startColor}, ${midColor}, ${endColor})`;
    }, [assayRange]);

    useEffect(() => {
    console.log('Rendering AssayView');
        if (!scene || !camera || !controls || !dynamicGroup) return;
        console.log('[AssayView] Initializing with:', { scene, camera, controls, dynamicGroup });
        if (!processedAssayData || !processedAssayData.grouped) {
            console.warn('[AssayView] No processed assay data available.');
            return;
        }
        if (mountedRef.current) return; // StrictMode guard
        mountedRef.current = true;

        const { modelCenter, grouped, byHoleId } = processedAssayData;
        console.log('[AssayView] Model Center:', modelCenter);

        const viewGroup = new THREE.Group();
        viewGroup.userData.view = 'assay';
        dynamicGroup.add(viewGroup);

        const geometries: THREE.BufferGeometry[] = [];
        const materials: THREE.Material[] = [];
        const meshes: THREE.InstancedMesh[] = [];

        // Pre-calculate traces for all holes to ensure continuity
        // Key is `${hole_id}_${depth_from}` because object references might differ between `byHoleId` and `grouped`
        const segmentTraces = new Map<string, { start: THREE.Vector3, end: THREE.Vector3 }>();
        const VERTICAL_EXAGGERATION = 10.0;
        const Y_UP = new THREE.Vector3(0, 1, 0);
        const radius = 7.5; 

        if (byHoleId) {
            Object.values(byHoleId).forEach(hole => {
                // Sort segments by depth
                const sortedSegments = [...hole.segments].sort((a, b) => a.depth_from - b.depth_from);
                if (sortedSegments.length === 0) return;

                // Initialize Start Point from the first segment's geometry (Collar)
                const firstSeg = sortedSegments[0];
                const g = firstSeg.feature?.geometry;
                let currentPos: THREE.Vector3;

                if (g?.type === 'LineString' && g.coordinates?.length > 0) {
                    const [lon, lat, elev] = g.coordinates[0];
                    const { x: sx, z: sz } = projectLonLat(lon, lat, modelCenter);
                    currentPos = new THREE.Vector3(sx, elev * VERTICAL_EXAGGERATION, -sz);
                } else {
                    currentPos = new THREE.Vector3(0, 0, 0);
                }

                for (const seg of sortedSegments) {
                    const props = seg.feature?.properties || {};
                    const azimuth = Number(props.azimuth ?? 0);
                    const inclination = Number(props.inclination ?? 0); 
                    const depthFrom = props.depth_from ?? 0;
                    const depthTo = props.depth_to ?? 0;
                    const intervalLength = Math.abs(depthTo - depthFrom);
                    const traceKey = `${seg.hole_id}_${depthFrom}`;

                    if (intervalLength <= 0) {
                         segmentTraces.set(traceKey, { start: currentPos.clone(), end: currentPos.clone() });
                         continue;
                    }

                    const azRad = THREE.MathUtils.degToRad(azimuth);
                    const incRad = THREE.MathUtils.degToRad(inclination);

                    const dy_real = -intervalLength * Math.cos(incRad);
                    const horiz_real = intervalLength * Math.sin(incRad);

                    const dx_visual = horiz_real * Math.sin(azRad) * VERTICAL_EXAGGERATION;
                    const dz_visual = horiz_real * -Math.cos(azRad) * VERTICAL_EXAGGERATION;
                    const dy_visual = dy_real * VERTICAL_EXAGGERATION;

                    const nextPos = currentPos.clone().add(new THREE.Vector3(dx_visual, dy_visual, dz_visual));

                    segmentTraces.set(traceKey, { start: currentPos.clone(), end: nextPos.clone() });
                    currentPos = nextPos;
                }
            });
        }

        Object.entries(grouped).forEach(([key, features]) => {
            // Filter by cutoff if provided
            const filteredFeatures = assayCutoff !== undefined
                ? features.filter(f => (f.graphitic_carbon ?? 0) > assayCutoff)
                : features;
                
            if (filteredFeatures.length === 0) return;

            const colorGroups: Record<string, any[]> = {};
            for (const f of filteredFeatures) {
                 const hex = colorForAssay(f.graphitic_carbon, assayRange.min, assayRange.max);
                 (colorGroups[hex] ||= []).push(f);
            }

            Object.entries(colorGroups).forEach(([hex, groupFeats]) => {
                const mat = new THREE.MeshStandardMaterial({ color: hex });
                const geo = new THREE.CylinderGeometry(1,1,1,8);
                materials.push(mat);
                geometries.push(geo);

                // Filter using the string key
                const validFeatures = groupFeats.filter(f => segmentTraces.has(`${f.hole_id}_${f.depth_from}`));
                if (validFeatures.length === 0) return;

                const mesh = new THREE.InstancedMesh(geo, mat, validFeatures.length);
                mesh.frustumCulled = false;
                mesh.userData.isDrillhole = true;
                mesh.userData.instanceData = validFeatures;
                viewGroup.add(mesh);
                meshes.push(mesh);

                let idx = 0;
                for (const f of validFeatures) {
                    const traceKey = `${f.hole_id}_${f.depth_from}`;
                    const trace = segmentTraces.get(traceKey);
                    if (!trace) continue;

                    const { start, end } = trace;
                    const L = start.distanceTo(end);
                    if (L <= 0.0001) {
                         mesh.setMatrixAt(idx++, new THREE.Matrix4().makeScale(0,0,0));
                         continue;
                    }

                    const pos = start.clone().add(end).multiplyScalar(0.5);
                    const dir = new THREE.Vector3().subVectors(end, start).normalize();
                    const quat = new THREE.Quaternion().setFromUnitVectors(Y_UP, dir);
                    const scl = new THREE.Vector3(radius, L, radius);
                    const M = new THREE.Matrix4().compose(pos, quat, scl);
                    mesh.setMatrixAt(idx++, M);
                }
                mesh.count = idx;
                mesh.instanceMatrix.needsUpdate = true;

                registerTooltipObject(mesh, (instanceId: number) => {
                    const segment = validFeatures[instanceId];
                    return `Hole ID: ${segment.hole_id}<br/>Depth: ${segment.depth_from}-${segment.depth_to}<br/>Carbon: ${segment.graphitic_carbon?.toFixed(2)}`;
                });
            });
        });

        fitCameraToGroupWorldAware(camera, controls, viewGroup);
        console.log('[AssayView] Camera fitted to group.');

        return () => {
            dynamicGroup.remove(viewGroup);
            meshes.forEach(mesh => unregisterTooltipObject(mesh)); // Unregister meshes
            viewGroup.traverse(o => {
                if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
                if ((o as THREE.Mesh).material) {
                    const m = (o as THREE.Mesh).material;
                    Array.isArray(m) ? m.forEach(mm => mm.dispose()) : m.dispose();
                }
            });
            geometries.forEach(g => g.dispose());
            materials.forEach(m => m.dispose());
            mountedRef.current = false;
        };
    }, [processedAssayData, loadingStatus, assayRange, assayCutoff, scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject]);

    if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

    return (
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
            <Legend 
                title="Assay Value" 
                type="gradient"
                gradient={assayGradient}
                minLabel={assayRange.min.toFixed(2)}
                maxLabel={assayRange.max.toFixed(2)}
            />
        </div>
    );
}