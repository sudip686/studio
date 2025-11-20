'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Legend } from '@/components/ui/legend';
import { useDataCache, BlockSegment } from '@/lib/data-cache';
import CompassOverlay from '@/components/ui/CompassOverlay';
import { ScaleBarOverlay } from '@/components/ui/ScaleBarOverlay';
import { projectLonLat, fitCameraToGroupWorldAware } from '../../lib/utils/three-helpers';
import { useThreeScene } from '../../contexts/three-scene-context'; // NEW: Import useThreeScene
import { ErrorDisplay } from '@/components/ui/error-display';


const RESC_LEGEND = [
  { label: 'Measured',  color: '#0000ff' },
  { label: 'Indicated', color: '#ff0000' },
  { label: 'Inferred',  color: '#00ff00' },
  { label: 'Unknown',   color: '#999999' },
];

export default function BlockModelRescViewer({ assayCutoff }: { assayCutoff?: number }) {
    const { scene, camera, controls, dynamicGroup, renderer, registerTooltipObject, unregisterTooltipObject } = useThreeScene();
    const mountedRef = useRef(false);

    const { blockModelData, drillholeData, loadingStatus, error, refetch } = useDataCache();
    const [blockOpacity, setBlockOpacity] = useState(0.8);
    const [showTraces, setShowTraces] = useState(true);

    // simple pick/asNumber helpers used in your file
    const pick = (o: any, keys: string[]) => {
      for (const k of keys) if (o?.[k] !== undefined) return o[k];
      return undefined;
    };
    const asNumber = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    function getThreeHeading(camera: THREE.PerspectiveCamera, THREE: any) {
        const v = new THREE.Vector3();
        camera.getWorldDirection(v);
        return Math.atan2(v.x, v.z);
    };

    const modelCenter = useMemo(() => {
      if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
        return { lon: 0, lat: 0 }; // Default or handle appropriately
      }
      const centerLon = blockModelData.reduce((s, d) => s + d.lon, 0) / blockModelData.length;
      const centerLat = blockModelData.reduce((s, d) => s + d.lat, 0) / blockModelData.length;
      return { lon: centerLon, lat: centerLat };
    }, [blockModelData]);

    useEffect(() => {
      if (!scene || !camera || !renderer || !controls || !dynamicGroup) return;
      if (mountedRef.current) return; // StrictMode guard
      mountedRef.current = true;

      if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
        console.warn('[BlockModelRescViewer] blockModelData not ready or wrong shape:', blockModelData);
        return;
      }

      const filteredBlocks = assayCutoff !== undefined
        ? blockModelData.filter(b => {
            const carbonValue = Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
            return Number.isFinite(carbonValue) && carbonValue > assayCutoff;
          })
        : blockModelData;

      if (filteredBlocks.length === 0) {
        console.warn('[BlockModelRescViewer] No blocks after filtering.');
        return;
      }

      const blocks = filteredBlocks as BlockSegment[];

      const viewGroup = new THREE.Group(); // Group for this specific view
      viewGroup.name = 'BlockModelRescView_Group';
      dynamicGroup.add(viewGroup); // Add to the shared dynamic group

      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];

      // COLOR BY RescCalc
      const colorForResc = (v: any) => {
        const s = String(v ?? "Unknown").trim();
        if (s === "Measured") return "#0000ff";
        if (s === "Indicated") return "#ff0000";
        if (s === "Inferred") return "#00ff00";
        return "#999999";
      };

      // BATCH BLOCKS BY COLOR
      const rescKeys = ["RescCalc","rescCalc","classification","CLASS","Class"];
      const grouped: Record<string, any[]> = {};
      for (const b of blocks) {
        const v = pick(b, rescKeys);
        const color = colorForResc(v);
        (grouped[color] ??= []).push(b);
      }

      let totalDrawn = 0;
      for (const [hex, list] of Object.entries(grouped)) {
        if (!list.length) continue;

        const mat = new THREE.MeshStandardMaterial({ color: hex, transparent: true, opacity: Math.max(0.05, blockOpacity) });
        const geo = new THREE.BoxGeometry(1,1,1);
        materials.push(mat); geometries.push(geo);

        const mesh = new THREE.InstancedMesh(geo, mat, list.length);
        mesh.frustumCulled = false;

        const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
        let i = 0;
        for (const b of list) {
          const lon = asNumber(b.lon ?? b.longitude);
          const lat = asNumber(b.lat ?? b.latitude);
          const ele = asNumber(b.elevation ?? b.z, 0);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;

          // BLOCKS are (lat, lon, elev) in source → swap when projecting: 
          const { x, z } = projectLonLat(lon, lat, modelCenter);  
          P.set(x, ele, -z);
          Q.identity();
          S.set(Math.max(0.25, asNumber(b.dX, 1)), Math.max(0.25, asNumber(b.dY, 1)), Math.max(0.25, asNumber(b.dZ, 1)));
          M.compose(P, Q, S);
          mesh.setMatrixAt(i++, M);
        }
        mesh.count = i;
        mesh.instanceMatrix.needsUpdate = true;
        viewGroup.add(mesh);
        totalDrawn += i;
      }
      console.log('[block_resc] in:', blockModelData.length, 'drawn:', totalDrawn);

      // OPTIONAL THIN TRACES (drillholes are lon,lat,z → no swap)
      if (showTraces && drillholeData?.lithology?.length) {
        const tGeo = new THREE.CylinderGeometry(1,1,1,8);
        const tMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        geometries.push(tGeo); materials.push(tMat);

        const trace = new THREE.InstancedMesh(tGeo, tMat, drillholeData.lithology.length);
        trace.frustumCulled = false;
        viewGroup.add(trace);

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
          S.set(3, L, 3);
          M.compose(P, Q, S);
          trace.setMatrixAt(i++, M);
        }
        trace.count = i;
        trace.instanceMatrix.needsUpdate = true;
      }

      // >>> NEW: Fit camera once content is there
      viewGroup.updateMatrixWorld(true);
      controls.update();
      fitCameraToGroupWorldAware(camera, controls, viewGroup, 1.35);

      return () => {
        // Cleanup: remove view-specific group and dispose its resources
        dynamicGroup.remove(viewGroup);
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
    }, [blockModelData, drillholeData, loadingStatus, blockOpacity, showTraces, scene, camera, controls, dynamicGroup, modelCenter, assayCutoff]);

    useEffect(() => {
      if (!camera || !controls || !dynamicGroup) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'f') {
          requestAnimationFrame(() => {
            dynamicGroup.updateMatrixWorld(true); // Use dynamicGroup for fitting
            fitCameraToGroupWorldAware(camera, controls, dynamicGroup, 1.35);
          });
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [camera, controls, dynamicGroup]);

    if (loadingStatus === 'loading') return <div>Loading...</div>;
    if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

    return (
      <>
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
          <Legend title="Classification" items={RESC_LEGEND} />
        </div>
        <div className="absolute top-4 right-4 z-50 bg-black/60 text-white rounded p-3 space-y-2">
          <label className="block text-sm">Block opacity</label>
          <input type="range" min="0.05" max="1" step="0.05"
                 value={blockOpacity}
                 onChange={(e)=>setBlockOpacity(parseFloat(e.target.value))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showTraces} onChange={e=>setShowTraces(e.target.checked)} />
            Show traces
          </label>
        </div>
        {camera && renderer && ( // Check camera and renderer for overlays
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', pointerEvents: 'auto' }}>
            <CompassOverlay mode="three" getHeading={() => getThreeHeading(camera, THREE)} />
            <ScaleBarOverlay
              camera={camera}
              rendererDom={renderer.domElement} // Get canvas from renderer
              THREE={THREE}
              planeY={0}
            />
          </div>
        )}
      </>
    );
}