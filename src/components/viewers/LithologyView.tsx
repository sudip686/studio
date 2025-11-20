'use client';

import { useEffect, useRef } from 'react';
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

export default function LithologyViewer() {
    const mountedRef = useRef(false);
    const { processedLithologyData, loadingStatus, error, refetch } = useDataCache();
    const { scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject } = useThreeScene();

    useEffect(() => {
    console.log('Rendering LithologyView');
        if (!scene || !camera || !controls || !dynamicGroup || !processedLithologyData) return;
        if (mountedRef.current) return; // StrictMode guard
        mountedRef.current = true;

        const { grouped, modelCenter } = processedLithologyData;

        const viewGroup = new THREE.Group();
        viewGroup.userData.view = 'lithology';
        dynamicGroup.add(viewGroup);

        const geometries: THREE.BufferGeometry[] = [];
        const materials: THREE.Material[] = [];
        const meshes: THREE.InstancedMesh[] = [];

        Object.entries(grouped).forEach(([hex, features]) => {
            const mat = new THREE.MeshStandardMaterial({ color: hex });
            const geo = new THREE.CylinderGeometry(1,1,1,8);
            materials.push(mat);
            geometries.push(geo);

            const mesh = new THREE.InstancedMesh(geo, mat, features.length);
            mesh.frustumCulled = false;
            mesh.userData.isDrillhole = true;
            mesh.userData.instanceData = features;
            viewGroup.add(mesh);
            meshes.push(mesh);

            const M = new THREE.Matrix4();
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            const scl = new THREE.Vector3();
            const Y_UP = new THREE.Vector3(0, 1, 0);
            const radius = 50;

            let idx = 0;
            for (const f of features) {
                const ends = getSegmentEnds(f); if (!ends) continue;
                const a = ends.a;
                const b = ends.b;

                const { x: sx, z: sz } = projectLonLat(a[0], a[1], modelCenter);
                const { x: ex, z: ez } = projectLonLat(b[0], b[1], modelCenter);
                const A = new THREE.Vector3(sx, a[2], -sz);
                const B = new THREE.Vector3(ex, b[2], -ez);

                if (idx === 1) console.log('projected A:', A.toArray());

                const L = A.distanceTo(B);
                if (!(L > 0)) continue; // skip degenerate

                pos.copy(A).add(B).multiplyScalar(0.5);
                const dir = new THREE.Vector3().subVectors(B, A).normalize();
                quat.setFromUnitVectors(Y_UP, dir);
                scl.set(radius, L, radius);
                M.compose(pos, quat, scl);
                mesh.setMatrixAt(idx++, M);
            }
            mesh.count = idx;
            mesh.instanceMatrix.needsUpdate = true;
            console.log('[lithology] instances:', mesh.count);

            // Register mesh for tooltip
            registerTooltipObject(mesh, (instanceId: number) => {
                const segment = features[instanceId];
                return `Hole ID: ${segment.hole_id}<br/>Depth: ${segment.depth_from}-${segment.depth_to}<br/>Lithology: ${segment.lithology}`; // Assuming lithology is a string
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

    const lithologyLegendItems = Object.entries(LITHOLOGY_COLOR_MAP).map(([label, color]) => ({
        label: label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format label nicely
        color,
    }));

    return (
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
            <Legend title="Lithology" items={lithologyLegendItems} />
        </div>
    );
}
