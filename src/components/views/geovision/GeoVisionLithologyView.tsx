'use client';
import { useEffect } from 'react';
import * as THREE from 'three';

export type DrillholeSegment = {
  hole_id: string;
  lithology?: string;
  feature: any;
};

const LITHOLOGY_COLOR_MAP: Record<string,string> = {
  'quartz-feldspathic':'#FAD7A0','grsc':'#212323','granulite':'#df26c4','khondalite':'#1a3523',
  'marble':'#fafafa','not recovearble':'#515A5A','soil':'#6efe70','schist':'#46f1b2',
  'nan':'#ffffff','unknown':'#cccccc'
};
const colorForLithology = (raw?: string) =>
  LITHOLOGY_COLOR_MAP[String(raw ?? 'unknown').trim().toLowerCase()] ?? '#cccccc';

export default function GeoVisionLithologyView({
  scene,
  drillholeData,
  modelCenter,
  getSegmentEndpoints
}: {
  scene: THREE.Scene;
  drillholeData: DrillholeSegment[];
  modelCenter: { lon: number; lat: number };
  getSegmentEndpoints: (seg: any) => { a: number[]; b: number[] } | null;
}) {
  useEffect(() => {
    console.log(`[lithology] input segments:`, drillholeData?.length ?? 0);
    if (!scene || !drillholeData?.length) return;

    const group = new THREE.Group();
    group.userData.view = 'lithology';
    scene.add(group);

    const project = (lon: number, lat: number) => {
      const R = 6371e3;
      const dLon = (lon - modelCenter.lon) * Math.PI/180;
      const dLat = (lat - modelCenter.lat) * Math.PI/180;
      return { x: R * dLon * Math.cos(modelCenter.lat * Math.PI/180), z: R * dLat };
    };

    const grouped: Record<string, DrillholeSegment[]> = {};
    for (const seg of drillholeData) {
      const color = colorForLithology(seg.lithology);
      (grouped[color] ||= []).push(seg);
    }

    Object.entries(grouped).forEach(([hex, features]) => {
      const mat = new THREE.MeshStandardMaterial({ color: hex });
      const geo = new THREE.CylinderGeometry(1,1,1,8);
      const mesh = new THREE.InstancedMesh(geo, mat, features.length);
      mesh.frustumCulled = false;
      mesh.userData.isDrillhole = true;
      mesh.userData.instanceData = features;
      group.add(mesh);

      const M = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      const Y_UP = new THREE.Vector3(0, 1, 0);
      const radius = 15;

      let idx = 0;
      for (const f of features) {
        const ends = getSegmentEndpoints(f);
        if (!ends) continue;
        const [lonA, latA, zA] = ends.a;
        const [lonB, latB, zB] = ends.b;

        const { x: sx, z: sz } = project(lonA, latA);
        const { x: ex, z: ez } = project(lonB, latB);
        const A = new THREE.Vector3(sx, zA, -sz);
        const B = new THREE.Vector3(ex, zB, -ez);

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
      console.log(`[${group.userData.view}] drew instances:`, mesh.count);
    });

    return () => {
      scene.remove(group);
      group.traverse(obj => {
        if (obj instanceof THREE.InstancedMesh || obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [scene, drillholeData, modelCenter]);

  return null;
}
