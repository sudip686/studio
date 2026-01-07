'use client';
import { useEffect } from 'react';
import * as THREE from 'three';

export type BlockSegment = {
  lon:number; lat:number; elevation:number; dX:number; dY:number; dZ:number; RescCalc?: string;
};

const RESC: Record<string,string> = { Indicated:'#ff0000', Measured:'#0000ff', Inferred:'#00ff00', Unknown:'#999999' };
const rescColor = (v:any) => RESC[String(v ?? 'Unknown').trim()] ?? RESC.Unknown;

export default function GeoVisionBlockRescView({
  scene, blocks, traces, modelCenter, opacity=0.8, getSegmentEndpoints,
  registerTooltipObject, unregisterTooltipObject
}:{
  scene: THREE.Scene;
  blocks: BlockSegment[];
  traces: any[];
  modelCenter: { lon:number; lat:number };
  opacity?: number;
  getSegmentEndpoints: (seg: any) => { a: number[]; b: number[] } | null;
  registerTooltipObject?: (mesh: THREE.InstancedMesh, getData: (instanceId: number) => string) => void;
  unregisterTooltipObject?: (mesh: THREE.InstancedMesh) => void;
}) {
  useEffect(() => {
    console.log(`[block_resc] input blocks:`, blocks?.length ?? 0);
    console.log(`[block_resc] input traces:`, traces?.length ?? 0);
    if (!scene) return;

    const group = new THREE.Group();
    group.userData.view = 'block_resc';
    scene.add(group);

    const project = (lon:number, lat:number) => {
      const R=6371e3, dLon=(lon-modelCenter.lon)*Math.PI/180, dLat=(lat-modelCenter.lat)*Math.PI/180;
      return { x: R*dLon*Math.cos(modelCenter.lat*Math.PI/180), z: R*dLat };
    };

    // Blocks by RescCalc
    if (blocks?.length) {
      const buckets: Record<string, BlockSegment[]> = {};
      for (const b of blocks) {
        const hex = rescColor(b.RescCalc);
        (buckets[hex] ||= []).push(b);
      }
      Object.entries(buckets).forEach(([hex, list]) => {
        const mat = new THREE.MeshStandardMaterial({ color: hex, transparent: false, opacity: 1.0 });
        const geo = new THREE.BoxGeometry(1,1,1);
        const mesh = new THREE.InstancedMesh(geo, mat, list.length);
        mesh.frustumCulled = false;
        mesh.userData.isBlock = true;
        mesh.userData.instanceData = list;
        group.add(mesh);

        const M=new THREE.Matrix4(), pos=new THREE.Vector3(), q=new THREE.Quaternion(), s=new THREE.Vector3();
        let idx=0;
        for (const b of list) {
          const {x,z} = project(b.lat as number, b.lon as number);
          if (idx === 0) {
            console.log('[block view] first block raw:', b.lon, b.lat, '(lat,lon order)');
            console.log('projected block pos:', x, -z, b.elevation);
          }
          pos.set(x,b.elevation,-z);
          q.identity();
          const sx = Math.max(0.25, Number(b.dX) || 0);
          const sy = Math.max(0.25, Number(b.dY) || 0);
          const sz = Math.max(0.25, Number(b.dZ) || 0);
          s.set(sx, sy, sz);
          M.compose(pos,q,s);
          mesh.setMatrixAt(idx++, M);
        }
        mesh.count = idx;
        mesh.instanceMatrix.needsUpdate = true;
        console.log(`[block_resc] drew blocks:`, mesh.count);

        // Register tooltip for block meshes
        if (registerTooltipObject) {
          registerTooltipObject(mesh, (instanceId: number) => {
            const block = list[instanceId];
            return `Lat: ${block.lat?.toFixed(4) || 'N/A'}<br/>` +
                   `Lon: ${block.lon?.toFixed(4) || 'N/A'}<br/>` +
                   `Elevation: ${block.elevation?.toFixed(2) || 'N/A'}m<br/>` +
                   `Classification: ${block.RescCalc || 'Unknown'}`;
          });
        }
      });
    }

    // Thin grey traces
    if (traces?.length) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x404040 });
      const geo = new THREE.CylinderGeometry(1,1,1,8);
      const mesh = new THREE.InstancedMesh(geo, mat, traces.length);
      mesh.frustumCulled = false;
      mesh.userData.isDrillhole = true;
      mesh.userData.instanceData = traces;
      group.add(mesh);

      const M=new THREE.Matrix4(), pos=new THREE.Vector3(), q=new THREE.Quaternion(), s=new THREE.Vector3();
      const Y_UP = new THREE.Vector3(0, 1, 0);
      const radius = 1;
      let idx=0;
      for (const f of traces) {
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
        M.compose(pos,q,s);
        mesh.setMatrixAt(idx++, M);
      }
      mesh.count = idx;
      mesh.instanceMatrix.needsUpdate = true;
      console.log(`[block_resc] drew traces:`, mesh.count);
    }

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
    }, [scene, blocks, traces, modelCenter, opacity, getSegmentEndpoints]);
  
    // component renders nothing (scene managed externally)
    return null;
  }
