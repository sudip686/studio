// BlockModelCarbonView.tsx
'use client';
import { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/contexts/three-scene-context';
import { useDataCache, Block } from '@/lib/data-cache';
import { projectLonLat, fitCameraToGroupWorldAware } from '@/lib/utils/three-helpers';
import CompassOverlay from '@/components/ui/CompassOverlay';
import { ScaleBarOverlay } from '@/components/ui/ScaleBarOverlay';
import { Legend } from '@/components/ui/legend';
import { ErrorDisplay } from '@/components/ui/error-display';

const CARBON_COLOR_STEPS = 20;
const carbonColorCache: { [step: number]: string } = {};
function colorForCarbon(vRaw: any): number {
    const v = Number(vRaw);
    let t = Number.isFinite(v) ? v / 10 : 0.5; // Assuming a scale of 0-10 for carbon
    t = Math.max(0, Math.min(1, t));
    const step = Math.floor(t * (CARBON_COLOR_STEPS - 1));
    if (carbonColorCache[step]) return parseInt(carbonColorCache[step].substring(1), 16);
    const r = t, g = 1 - t, b = 0;
    const color = new THREE.Color(r, g, b);
    const hexString = '#' + color.getHexString();
    carbonColorCache[step] = hexString;
    return color.getHex();
}

function getThreeHeading(camera: THREE.PerspectiveCamera, THREE: any) {
    const v = new THREE.Vector3();
    camera.getWorldDirection(v);
    return Math.atan2(v.x, v.z);
};


export default function BlockModelCarbonViewer({
  opacity = 0.8, assayCutoff
}: { opacity?: number; assayCutoff?: number }) {

  const { scene, camera, controls, dynamicGroup, renderer, registerTooltipObject, unregisterTooltipObject } = useThreeScene();
  const mountedRef = useRef(false);
  const { blockModelData, drillholeData, loadingStatus, error, refetch } = useDataCache();
  const [showTraces, setShowTraces] = useState(true);

  const modelCenter = useMemo(() => {
    if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
      return { lon: 0, lat: 0 }; // Default or handle appropriately
    }
    const allPoints = blockModelData.map(b => ({ lon: b.lon, lat: b.lat, elevation: b.elevation }));
    const centerLon = allPoints.reduce((acc, p) => acc + p.lon, 0) / allPoints.length;
    const centerLat = allPoints.reduce((acc, p) => acc + p.lat, 0) / allPoints.length;
    return { lon: centerLon, lat: centerLat };
  }, [blockModelData]);

  console.log('[BlockModelCarbonViewer] modelCenter:', modelCenter);

  useEffect(() => {
    if (!scene || !camera || !controls || !dynamicGroup || !renderer) return;
    if (mountedRef.current) return; // StrictMode guard
    mountedRef.current = true;

    if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
      console.warn('[BlockModelCarbonViewer] blocks not ready or wrong shape:', blockModelData);
      return;
    }

    const filteredBlocks = assayCutoff !== undefined
      ? blockModelData.filter(b => {
          const carbonValue = Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
          return Number.isFinite(carbonValue) && carbonValue > assayCutoff;
        })
      : blockModelData;

    if (filteredBlocks.length === 0) {
      console.warn('[BlockModelCarbonViewer] No blocks after filtering.');
      return;
    }

    const blocks = filteredBlocks as Block[];

    const viewGroup = new THREE.Group();
    viewGroup.name = 'BlockModelCarbonView_Group';
    dynamicGroup.add(viewGroup);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const blockMeshes: THREE.InstancedMesh[] = [];
    let traceMesh: THREE.InstancedMesh | null = null;

    // group blocks by color
    const buckets = new Map<number, Block[]>();
    for (const b of blocks) {
      const color = colorForCarbon(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
      if (!buckets.has(color)) buckets.set(color, []);
      buckets.get(color)!.push(b);
    }

    // build instances per color
    buckets.forEach((items, color) => {
      const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity });
      const geom = new THREE.BoxGeometry(1, 1, 1);
      materials.push(mat);
      geometries.push(geom);

      const mesh = new THREE.InstancedMesh(geom, mat, items.length);
      mesh.frustumCulled = false;
      mesh.userData.kind = 'blocks';

      const M = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();

      items.forEach((bl, i) => {
        const { x, z } = projectLonLat(bl.lon, bl.lat, modelCenter);
        pos.set(x, bl.elevation, -z);
        scl.set(bl.dX, bl.dY, bl.dZ);
        M.compose(pos, quat, scl);
        mesh.setMatrixAt(i, M);
      });

      mesh.instanceMatrix.needsUpdate = true;
      viewGroup.add(mesh);
      blockMeshes.push(mesh);

      // Register mesh for tooltip
      registerTooltipObject(mesh, (instanceId: number) => {
          const block = items[instanceId];
          return `ID: ${block.Id}<br/>Lat: ${block.lat.toFixed(4)}<br/>Lon: ${block.lon.toFixed(4)}<br/>Elev: ${block.elevation.toFixed(2)}<br/>Carbon: ${Number(block["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]).toFixed(2)}`;
      });
    });

    // OPTIONAL THIN TRACES (drillholes are lon,lat,z → no swap)
    if (showTraces && drillholeData?.lithology?.length) {
      const tGeo = new THREE.CylinderGeometry(1,1,1,8);
      const tMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      geometries.push(tGeo); materials.push(tMat);

      const trace = new THREE.InstancedMesh(tGeo, tMat, drillholeData.lithology.length);
      trace.frustumCulled = false;
      viewGroup.add(trace);
      traceMesh = trace;

      const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
      const Y = new THREE.Vector3(0,1,0);
      let i = 0;
      for (const seg of drillholeData.lithology) {
        const g = seg.feature?.geometry;
        if (!(g?.type === 'LineString' && g.coordinates?.length >= 2)) continue;
        const [a,b] = g.coordinates; // [lon, lat, z]
        if (!a || !b || a.length < 3 || b.length < 3) continue;

        const { x:sx, z:sz } = projectLonLat(a[0], a[1], modelCenter); 
        const { x:ex, z:ez } = projectLonLat(b[0], b[1], modelCenter); 
        const A = new THREE.Vector3(sx, a[2], -sz);
        const B = new THREE.Vector3(ex, b[2], -ez);
        const L = A.distanceTo(B);
        if (!(L > 0)) continue;

        P.copy(A).add(B).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(B, A).normalize();
        Q.setFromUnitVectors(Y, dir);
        S.set(3, L, 3); // Triple the radius
        M.compose(P, Q, S);
        trace.setMatrixAt(i++, M);
      }
      trace.count = i;
      trace.instanceMatrix.needsUpdate = true;

      // Register trace for tooltip
      registerTooltipObject(trace, (instanceId: number) => {
          const segment = drillholeData.lithology[instanceId];
          return `Hole ID: ${segment.hole_id}<br/>Depth: ${segment.depth_from}-${segment.depth_to}<br/>Lithology: ${segment.lithology}`; // Assuming lithology is a string
      });
    }

    requestAnimationFrame(() => {
      fitCameraToGroupWorldAware(camera, controls, viewGroup, 1.35);
    });

    return () => {
      dynamicGroup.remove(viewGroup);
      blockMeshes.forEach(mesh => unregisterTooltipObject(mesh));
      if (traceMesh) unregisterTooltipObject(traceMesh);
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
  }, [blockModelData, opacity, scene, camera, controls, dynamicGroup, modelCenter, assayCutoff, drillholeData, showTraces, registerTooltipObject, unregisterTooltipObject]);

  if (loadingStatus === 'loading') return <div>Loading...</div>;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  const carbonLegendItems = Array.from({ length: 5 }).map((_, i) => {
    const value = 0 + (10 - 0) * (i / 4);
    const color = new THREE.Color(value / 10, 1 - (value / 10), 0).getStyle();
    return { label: value.toFixed(2), color };
  });

  return (
    <>
      <div className="absolute top-4 right-4 z-50 bg-black/60 text-white rounded p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showTraces} onChange={e=>setShowTraces(e.target.checked)} />
          Show traces
        </label>
      </div>
      {camera && renderer && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', pointerEvents: 'auto' }}>
          <CompassOverlay mode="three" getHeading={() => getThreeHeading(camera, THREE)} />
          <ScaleBarOverlay
            camera={camera}
            rendererDom={renderer.domElement}
            THREE={THREE}
            planeY={0}
          />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
        <Legend title="Carbon Value" items={carbonLegendItems} />
      </div>
    </>
  );
}