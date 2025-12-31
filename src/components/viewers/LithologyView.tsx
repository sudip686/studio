'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useDataCache } from '@/lib/data-cache';
import { Legend } from '@/components/ui/legend';
import { projectLonLat, fitCameraToGroupWorldAware } from '../../lib/utils/three-helpers';
import { useThreeScene } from '../../contexts/three-scene-context';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LITHOLOGY_COLOR_MAP } from '@/lib/boreholes/colors';

// ## Data Structures & Constants ##
interface DrillholeSegment {
    lon: number; lat: number; elevation: number; depth_from: number; depth_to: number; hole_id: string;
    lithology?: string; graphitic_carbon?: number; feature: any;
}

function getSegmentEnds(seg:{feature:any}) {
  const g = seg?.feature?.geometry;
  if (g?.type === 'LineString' && g.coordinates?.length >= 2) {
    const [a,b] = g.coordinates; // [lon,lat,z]
    if (a?.length>=3 && b?.length>=3) return {a, b};
  }
  return null; // skip bad segments
}

export default function LithologyViewer({ assayCutoff }: { assayCutoff?: number } = {}) {
    const mountedRef = useRef(false);
    const { processedLithologyData, loadingStatus, error, refetch } = useDataCache();
    const { scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject } = useThreeScene();

    useEffect(() => {
        console.log('Rendering LithologyView');
        if (!scene || !camera || !controls || !dynamicGroup || !processedLithologyData) return;
        if (mountedRef.current) return; // StrictMode guard
        mountedRef.current = true;

        const { modelCenter, grouped } = processedLithologyData;

        // If grouped data is not available, don't render yet
        if (!grouped || Object.keys(grouped).length === 0) {
            console.warn('[LithologyView] No grouped data available yet');
            mountedRef.current = false;
            return;
        }

        const viewGroup = new THREE.Group();
        viewGroup.userData.view = 'lithology';
        dynamicGroup.add(viewGroup);

        const geometries: THREE.BufferGeometry[] = [];
        const materials: THREE.Material[] = [];
        const meshes: THREE.InstancedMesh[] = [];

        // Pre-calculate traces for all holes to ensure continuity
        const segmentTraces = new Map<any, { start: THREE.Vector3, end: THREE.Vector3 }>();
        const VERTICAL_EXAGGERATION = 10.0;
        const Y_UP = new THREE.Vector3(0, 1, 0);
        const radius = 7.5; // Thickness 15 -> Radius 7.5

        if (processedLithologyData.byHoleId) {
            Object.values(processedLithologyData.byHoleId).forEach(hole => {
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
                    // Apply VE to Elevation immediately for the start point
                    currentPos = new THREE.Vector3(sx, elev * VERTICAL_EXAGGERATION, -sz);
                } else {
                    currentPos = new THREE.Vector3(0, 0, 0);
                }

                for (const seg of sortedSegments) {
                    const props = seg.feature?.properties || {};
                    const azimuth = Number(props.azimuth ?? 0);
                    const inclination = Number(props.inclination ?? 0); // 0 is vertical down
                    const depthFrom = props.depth_from ?? 0;
                    const depthTo = props.depth_to ?? 0;
                    const intervalLength = Math.abs(depthTo - depthFrom);

                    if (intervalLength <= 0) {
                         segmentTraces.set(seg, { start: currentPos.clone(), end: currentPos.clone() });
                         continue;
                    }

                    const azRad = THREE.MathUtils.degToRad(azimuth);
                    const incRad = THREE.MathUtils.degToRad(inclination);

                    // Calculate displacements
                    const dy_real = -intervalLength * Math.cos(incRad);
                    const horiz_real = intervalLength * Math.sin(incRad);

                    // Apply VE to displacements
                    const dx_visual = horiz_real * Math.sin(azRad) * VERTICAL_EXAGGERATION;
                    const dz_visual = horiz_real * -Math.cos(azRad) * VERTICAL_EXAGGERATION;
                    const dy_visual = dy_real * VERTICAL_EXAGGERATION;

                    const nextPos = currentPos.clone().add(new THREE.Vector3(dx_visual, dy_visual, dz_visual));

                    segmentTraces.set(seg, { start: currentPos.clone(), end: nextPos.clone() });
                    
                    // Advance
                    currentPos = nextPos;
                }
            });
        }

        // Render loop using pre-calculated traces
        Object.entries(grouped).forEach(([hex, features]) => {
            const mat = new THREE.MeshStandardMaterial({ color: hex });
            const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
            materials.push(mat);
            geometries.push(geo);

            // Filter features that have a calculated trace
            const validFeatures = features.filter(f => segmentTraces.has(f));
            if (validFeatures.length === 0) return;

            const mesh = new THREE.InstancedMesh(geo, mat, validFeatures.length);
            mesh.frustumCulled = false;
            mesh.userData.isDrillhole = true;
            mesh.userData.instanceData = validFeatures;
            viewGroup.add(mesh);
            meshes.push(mesh);

            let idx = 0;
            for (const f of validFeatures) {
                const trace = segmentTraces.get(f);
                if (!trace) continue;

                const { start, end } = trace;
                const L = start.distanceTo(end);
                
                if (L <= 0.0001) {
                    mesh.setMatrixAt(idx++, new THREE.Matrix4().makeScale(0, 0, 0));
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
            console.log('[lithology] instances:', mesh.count);

            // Register mesh for tooltip
            registerTooltipObject(mesh, (instanceId: number) => {
                const segment = validFeatures[instanceId];
                return `Hole ID: ${segment.hole_id}<br/>Depth: ${segment.depth_from}-${segment.depth_to}<br/>Lithology: ${segment.lithology}`; 
            });
        });

        fitCameraToGroupWorldAware(camera, controls, viewGroup);
        console.log('[LithologyView] Camera fitted to group.');

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
    }, [processedLithologyData, scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject]);

    if (loadingStatus === 'loading') return <div>Loading...</div>;
    if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

    // Only create legend items if LITHOLOGY_COLOR_MAP exists
    const lithologyLegendItems = (LITHOLOGY_COLOR_MAP && Object.entries(LITHOLOGY_COLOR_MAP).length > 0)
        ? Object.entries(LITHOLOGY_COLOR_MAP).map(([label, color]) => ({
            label: label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            color,
        }))
        : [];

    return (
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
            <Legend title="Lithology" items={lithologyLegendItems} />
        </div>
    );
}