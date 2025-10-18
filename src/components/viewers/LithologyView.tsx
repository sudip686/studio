'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useDataCache } from '@/lib/data-cache';
import { Legend } from '@/components/ui/legend';
import { projectLonLat, fitCameraToGroupWorldAware } from '../../lib/utils/three-helpers';
import { useThreeScene } from '../../contexts/three-scene-context';

// ## Data Structures & Constants ##
interface DrillholeSegment {
    lon: number; lat: number; elevation: number; depth_from: number; depth_to: number; hole_id: string;
    lithology?: string; graphitic_carbon?: number; feature: any;
}

const LITHOLOGY_COLOR_MAP: Record<string,string> = {
  'quartz-feldspathic':'#FAD7A0','grsc':'#212323','granulite':'#df26c4','khondalite':'#1a3523',
  'marble':'#fafafa','not recovearble':'#515A5A','soil':'#6efe70','schist':'#46f1b2',
  'nan':'#ffffff','unknown':'#cccccc'
};
const colorForLithology = (raw?: string) =>
  LITHOLOGY_COLOR_MAP[String(raw ?? 'unknown').trim().toLowerCase()] ?? '#cccccc';

function getSegmentEnds(seg: DrillholeSegment) {
  // First, try the existing method
  const g = seg?.feature?.geometry;
  if (g?.type === 'LineString' && g.coordinates?.length >= 2) {
    const [a,b] = g.coordinates; // [lon,lat,z]
    if (a?.length>=3 && b?.length>=3) return {a, b};
  }

  // Fallback: Assume vertical hole using segment properties
  if (seg.lon != null && seg.lat != null && seg.elevation != null && seg.depth_from != null && seg.depth_to != null) {
      const a = [seg.lon, seg.lat, seg.elevation - seg.depth_from];
      const b = [seg.lon, seg.lat, seg.elevation - seg.depth_to];
      return { a, b };
  }

  return null; // skip bad segments
}

export default function LithologyViewer() {
    const mountedRef = useRef(false);
    const { drillholeData, loadingStatus, error } = useDataCache();
    const { scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject } = useThreeScene();

    useEffect(() => {
        console.log('[LithologyView] Received drillholeData.lithology:', drillholeData?.lithology?.slice(0, 5));
        if (!scene || !camera || !controls || !dynamicGroup) return;
        console.log('[LithologyView] Initializing with:', { scene, camera, controls, dynamicGroup });
        if (!drillholeData || !Array.isArray(drillholeData.lithology) || drillholeData.lithology.length === 0) {
            console.warn('[LithologyView] No drillhole lithology data available.');
            return;
        }
        if (mountedRef.current) return; // StrictMode guard
        mountedRef.current = true;

        const filteredDrillholeData = drillholeData.lithology;

        const allPoints = filteredDrillholeData.map(d => ({ lon: d.lon, lat: d.lat, elevation: d.elevation }));
        const centerLon = allPoints.reduce((acc, p) => acc + p.lon, 0) / allPoints.length;
        const centerLat = allPoints.reduce((acc, p) => acc + p.lat, 0) / allPoints.length;
        const modelCenter = { lon: centerLon, lat: centerLat };
        console.log("Model Center:", modelCenter);

        const viewGroup = new THREE.Group();
        viewGroup.userData.view = 'lithology';
        dynamicGroup.add(viewGroup);

        const geometries: THREE.BufferGeometry[] = [];
        const materials: THREE.Material[] = [];

        const grouped: Record<string, DrillholeSegment[]> = {};
        for (const seg of filteredDrillholeData) {
            const color = colorForLithology(seg.lithology);
            (grouped[color] ||= []).push(seg);
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
    }, [drillholeData, loadingStatus, scene, camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject]);

    if (loadingStatus === 'loading') return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

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
