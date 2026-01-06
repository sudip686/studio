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

    // Added processedLithologyData
    const { blockModelData, processedLithologyData, loadingStatus, error, refetch } = useDataCache();
    const [blockOpacity, setBlockOpacity] = useState(0.8);
    const [showTraces, setShowTraces] = useState(true);
    const [selectedClassification, setSelectedClassification] = useState('All');

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

      const filteredBlocks = blockModelData.filter(b => {
        const idVal = Number(b.Id);
        if (idVal === 0) return false;

        // Filter by Classification
        if (selectedClassification !== 'All') {
             const rescKeys = ["RescCalc","rescCalc","classification","CLASS","Class"];
             const val = String(pick(b, rescKeys) ?? "Unknown").trim();
             if (val !== selectedClassification) return false;
        }

        if (assayCutoff !== undefined) {
          const carbonValue = Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
          return Number.isFinite(carbonValue) && carbonValue > assayCutoff;
        }
        return true;
      });

      if (filteredBlocks.length === 0) {
        console.warn('[BlockModelRescViewer] No blocks after filtering.');
        // Don't return here, let the traces draw if available
      }

      const blocks = filteredBlocks as BlockSegment[];

      const viewGroup = new THREE.Group(); // Group for this specific view
      viewGroup.name = 'BlockModelRescView_Group';
      dynamicGroup.add(viewGroup); // Add to the shared dynamic group

      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];
      const meshes: THREE.InstancedMesh[] = [];

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
          const VERTICAL_EXAGGERATION = 1.0;
          P.set(x, ele * VERTICAL_EXAGGERATION, -z);
          Q.identity();
          S.set(Math.max(0.25, asNumber(b.dX, 1)), Math.max(0.25, asNumber(b.dY, 1)) * VERTICAL_EXAGGERATION, Math.max(0.25, asNumber(b.dZ, 1)));
          M.compose(P, Q, S);
          mesh.setMatrixAt(i++, M);
        }
        mesh.count = i;
        mesh.instanceMatrix.needsUpdate = true;
        viewGroup.add(mesh);
        meshes.push(mesh); // Keep track of block meshes for cleanup/tooltips if needed
        totalDrawn += i;
      }
      console.log('[block_resc] in:', blockModelData.length, 'drawn:', totalDrawn);

      let traceMesh: THREE.InstancedMesh | null = null;

      // REPLACED TRACE LOGIC
      if (showTraces && processedLithologyData?.byHoleId) {
          const segmentTraces = new Map<any, { start: THREE.Vector3, end: THREE.Vector3 }>();
          const VERTICAL_EXAGGERATION = 1.0;
          const Y_UP = new THREE.Vector3(0, 1, 0);
          
          // Calculate traces
          Object.values(processedLithologyData.byHoleId).forEach(hole => {
              const sortedSegments = [...hole.segments].sort((a, b) => a.depth_from - b.depth_from);
              if (sortedSegments.length === 0) return;

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

                  if (intervalLength <= 0) {
                       segmentTraces.set(seg, { start: currentPos.clone(), end: currentPos.clone() });
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

                  segmentTraces.set(seg, { start: currentPos.clone(), end: nextPos.clone() });
                  currentPos = nextPos;
              }
          });

          // Gather all segments that have a trace
          const allSegments = Object.values(processedLithologyData.byHoleId)
              .flatMap(h => h.segments)
              .filter(s => segmentTraces.has(s));

          if (allSegments.length > 0) {
              const tGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
              const tMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
              geometries.push(tGeo); materials.push(tMat);

              const trace = new THREE.InstancedMesh(tGeo, tMat, allSegments.length);
              trace.frustumCulled = false;
              viewGroup.add(trace);
              traceMesh = trace;

              let idx = 0;
              const radius = 3.0; // Keeping thin trace style

              for (const seg of allSegments) {
                  const tr = segmentTraces.get(seg);
                  if (!tr) continue;
                  const { start, end } = tr;
                  const L = start.distanceTo(end);
                  if (L <= 0.0001) {
                       trace.setMatrixAt(idx++, new THREE.Matrix4().makeScale(0,0,0));
                       continue;
                  }
                  const pos = start.clone().add(end).multiplyScalar(0.5);
                  const dir = new THREE.Vector3().subVectors(end, start).normalize();
                  const quat = new THREE.Quaternion().setFromUnitVectors(Y_UP, dir);
                  const scl = new THREE.Vector3(radius, L, radius);
                  
                  const M = new THREE.Matrix4().compose(pos, quat, scl);
                  trace.setMatrixAt(idx++, M);
              }
              trace.count = idx;
              trace.instanceMatrix.needsUpdate = true;

              registerTooltipObject(trace, (instanceId: number) => {
                   const segment = allSegments[instanceId];
                   return `Hole ID: ${segment.hole_id}<br/>Depth: ${segment.depth_from}-${segment.depth_to}`;
              });
          }
      }

      // >>> NEW: Fit camera once content is there
      viewGroup.updateMatrixWorld(true);
      controls.update();
      fitCameraToGroupWorldAware(camera, controls, viewGroup, 1.35);

      return () => {
        // Cleanup: remove view-specific group and dispose its resources
        dynamicGroup.remove(viewGroup);
        if (traceMesh) unregisterTooltipObject(traceMesh);
        // Also unregister block meshes if needed, though RescView didn't have tooltips for blocks in previous version?
        // Ah, current code didn't use tooltips for blocks. But I should clear them if I add them.
        
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
    }, [blockModelData, processedLithologyData, loadingStatus, blockOpacity, showTraces, scene, camera, controls, dynamicGroup, modelCenter, assayCutoff, registerTooltipObject, unregisterTooltipObject, selectedClassification]); // added selectedClassification dependency

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
        <div className="absolute top-4 right-4 z-50 bg-black/60 text-white rounded p-3 space-y-2 pointer-events-auto">
          <label className="block text-sm">Classification</label>
          <select 
            value={selectedClassification} 
            onChange={e => setSelectedClassification(e.target.value)}
            className="w-full p-1 rounded bg-gray-700 text-white border border-gray-600 text-sm"
          >
            <option value="All">All</option>
            <option value="Measured">Measured</option>
            <option value="Indicated">Indicated</option>
            <option value="Inferred">Inferred</option>
            <option value="Unknown">Unknown</option>
          </select>
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