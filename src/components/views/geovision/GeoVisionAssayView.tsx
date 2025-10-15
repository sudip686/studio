'use client';
import { useEffect } from 'react';
import * as THREE from 'three';

export type DrillholeSegment = { feature: any; graphitic_carbon?: number };

const STEPS = 20;
const cache: Record<number,string> = {};
function colorForAssay(vRaw: any, min: number, max: number) {
  const v = Number(vRaw);
  let t = Number.isFinite(v) && max > min ? (v - min) / (max - min) : 0.5;
  t = Math.max(0, Math.min(1, t));
  const k = Math.floor(t * (STEPS - 1));
  if (cache[k]) return cache[k];
  const c = new THREE.Color(t, 1 - t, 0);
  return (cache[k] = `#${c.getHexString()}`);
}

export default function GeoVisionAssayView({
  scene,
  drillholeData,
  modelCenter,
  assayRange,
  getSegmentEndpoints
}: {
  scene: THREE.Scene;
  drillholeData: DrillholeSegment[];
  modelCenter: { lon: number; lat: number };
  assayRange: { min: number; max: number };
  getSegmentEndpoints: (seg: any) => { a: number[]; b: number[] } | null;
}) {
  useEffect(() => {
    console.log(`[assay] input segments:`, drillholeData?.length ?? 0);
    if (!scene || !drillholeData?.length) return;

    const group = new THREE.Group();
    group.userData.view = 'assay';
    scene.add(group);

    const project = (lon:number, lat:number) => {
      const R = 6371e3, dLon=(lon-modelCenter.lon)*Math.PI/180, dLat=(lat-modelCenter.lat)*Math.PI/180;
      return { x: R*dLon*Math.cos(modelCenter.lat*Math.PI/180), z: R*dLat };
    };

    const grouped: Record<string, any[]> = {};
    for (const seg of drillholeData) {
      const hex = colorForAssay(seg.graphitic_carbon, assayRange.min, assayRange.max);
      (grouped[hex] ||= []).push(seg);
    }

    Object.entries(grouped).forEach(([hex, features]) => {
      const mat = new THREE.MeshStandardMaterial({ color: hex });
      const geo = new THREE.CylinderGeometry(1,1,1,8);
      const mesh = new THREE.InstancedMesh(geo, mat, features.length);
      mesh.frustumCulled = false;
      mesh.userData.isDrillhole = true;
      mesh.userData.instanceData = features;
      group.add(mesh);

      const M = new THREE.Matrix4(), pos=new THREE.Vector3(), q=new THREE.Quaternion(), s=new THREE.Vector3();
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
        q.setFromUnitVectors(Y_UP, dir);
        s.set(radius, L, radius);
        M.compose(pos, q, s);
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
  }, [scene, drillholeData, modelCenter, assayRange]);

  return null;
}
