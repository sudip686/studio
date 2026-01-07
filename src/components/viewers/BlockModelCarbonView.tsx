// BlockModelCarbonView.tsx
'use client';
import { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/contexts/three-scene-context';
import { useDataCache, BlockSegment } from '@/lib/data-cache';
import { projectLonLat, fitCameraToGroupWorldAware } from '@/lib/utils/three-helpers';

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
  // Added processedLithologyData to destructured props
  const { blockModelData, processedLithologyData, loadingStatus, error, refetch } = useDataCache();
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

    const filteredBlocks = blockModelData.filter(b => {
      const idVal = Number(b.Id);
      if (idVal === 0) return false;

      if (assayCutoff !== undefined) {
        const carbonValue = Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
        return Number.isFinite(carbonValue) && carbonValue > assayCutoff;
      }
      return true;
    });

    if (filteredBlocks.length === 0) {
      console.warn('[BlockModelCarbonViewer] No blocks after filtering.');
      return;
    }

    const blocks = filteredBlocks as BlockSegment[];

    const viewGroup = new THREE.Group();
    viewGroup.name = 'BlockModelCarbonView_Group';
    dynamicGroup.add(viewGroup);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const blockMeshes: THREE.InstancedMesh[] = [];
    let traceMesh: THREE.InstancedMesh | null = null;

    // group blocks by color
    const buckets = new Map<number, BlockSegment[]>();
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

      const VERTICAL_EXAGGERATION = 1.0;
      items.forEach((bl, i) => {
        const { x, z } = projectLonLat(bl.lon, bl.lat, modelCenter);
        pos.set(x, bl.elevation * VERTICAL_EXAGGERATION, -z);
        scl.set(bl.dX, bl.dY * VERTICAL_EXAGGERATION, bl.dZ);
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
  }, [blockModelData, processedLithologyData, opacity, scene, camera, controls, dynamicGroup, modelCenter, assayCutoff, showTraces, registerTooltipObject, unregisterTooltipObject]);

  if (loadingStatus === 'loading') return <div>Loading...</div>;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  const carbonRange = useMemo(() => {
    if (!blockModelData) return { min: 0, max: 10 };
    let min = Infinity, max = -Infinity;
    blockModelData.forEach(b => {
      const v = Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
      if (Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    });
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 10 : max };
  }, [blockModelData]);

  const carbonGradient = "linear-gradient(to right, #00ff00, #ff0000)";

  return (
    <>
      <div className="absolute top-4 right-4 z-50 bg-black/60 text-white rounded p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showTraces} onChange={e=>setShowTraces(e.target.checked)} />
          Show traces
        </label>
      </div>

      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
        <Legend
            title="Carbon Value"
            type="gradient"
            gradient={carbonGradient}
            minLabel={carbonRange.min.toFixed(2)}
            maxLabel={carbonRange.max.toFixed(2)}
        />
      </div>
    </>
  );
}
