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

const ASSAY_COLOR_STEPS = 20;
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
    const { drillholeData, loadingStatus, error, refetch } = useDataCache();
    const { scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject } = useThreeScene();

    const assayRange = useMemo(() => {
        if (!drillholeData || !drillholeData.assay) return { min: 0, max: 1 };
        const assayValues = drillholeData.assay.map(d => d.graphitic_carbon).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
        if (assayValues.length === 0) return { min: 0, max: 1 };
        const range = { min: Math.min(...assayValues), max: Math.max(...assayValues) };
        console.log('Assay range:', range);
        return range;
    }, [drillholeData]);

    useEffect(() => {
    console.log('Rendering AssayView');
        if (!scene || !camera || !controls || !dynamicGroup) return;
        console.log('[AssayView] Initializing with:', { scene, camera, controls, dynamicGroup });
        if (!drillholeData || !Array.isArray(drillholeData.assay) || drillholeData.assay.length === 0) {
            console.warn('[AssayView] No drillhole assay data available.');
            return;
        }
        if (mountedRef.current) return; // StrictMode guard
        mountedRef.current = true;

        const filteredDrillholeData = assayCutoff !== undefined
            ? drillholeData.assay.filter(d => (d.graphitic_carbon ?? 0) > assayCutoff)
            : drillholeData.assay;

        if (filteredDrillholeData.length === 0) {
            console.warn('[AssayView] No drillhole assay data after filtering.');
            return;
        }

        const allPoints = filteredDrillholeData.map(d => ({ lon: d.lon, lat: d.lat, elevation: d.elevation }));
        const centerLon = allPoints.reduce((acc, p) => acc + p.lon, 0) / allPoints.length;
        const centerLat = allPoints.reduce((acc, p) => acc + p.lat, 0) / allPoints.length;
        const modelCenter = { lon: centerLon, lat: centerLat };
        console.log('[AssayView] Model Center:', modelCenter);

        const viewGroup = new THREE.Group();
        viewGroup.userData.view = 'assay';
        dynamicGroup.add(viewGroup);

        const geometries: THREE.BufferGeometry[] = [];
        const materials: THREE.Material[] = [];

        const grouped: Record<string, DrillholeSegment[]> = {};
        for (const seg of filteredDrillholeData) {
            const hex = colorForAssay(seg.graphitic_carbon, assayRange.min, assayRange.max);
            (grouped[hex] ||= []).push(seg);
        }

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

            const M = new THREE.Matrix4(), pos=new THREE.Vector3(), q=new THREE.Quaternion(), s=new THREE.Vector3();
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
                q.setFromUnitVectors(Y_UP, dir);
                s.set(radius, L, radius);
                M.compose(pos, q, s);
                mesh.setMatrixAt(idx++, M);
            }
            mesh.count = idx;
            mesh.instanceMatrix.needsUpdate = true;
            console.log('[assay] instances:', mesh.count);

            // Register mesh for tooltip
            registerTooltipObject(mesh, (instanceId: number) => {
                const segment = features[instanceId];
                console.log('AssayView tooltip segment:', segment);
                return `Hole ID: ${segment.hole_id}<br/>Depth: ${segment.depth_from}-${segment.depth_to}<br/>Carbon: ${segment.graphitic_carbon?.toFixed(2)}`;
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
    }, [drillholeData, loadingStatus, assayRange, assayCutoff, scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject]);

    if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

    const assayLegendItems = Array.from({ length: 5 }).map((_, i) => {
        const value = assayRange.min + (assayRange.max - assayRange.min) * (i / 4);
        const color = colorForAssay(value, assayRange.min, assayRange.max);
        return { label: value.toFixed(2), color };
    });

    return (
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
            <Legend title="Assay Value" items={assayLegendItems} />
        </div>
    );
}
