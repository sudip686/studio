// BlockModelCarbonView.tsx
'use client';
import { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/contexts/three-scene-context';
import { useDataCache, BlockSegment } from '@/lib/data-cache';
import { projectLonLat, fitCameraToGroupWorldAware } from '@/lib/utils/three-helpers';

import { Legend } from '@/components/ui/legend';
import { OverlaySlot } from '@/ui/overlays';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LITHOLOGY_COLOR_MAP } from '@/lib/boreholes/colors';
import TerrainSurfaceLayer from './TerrainSurfaceLayer';
import BoreholeLayer from './BoreholeLayer';

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

type AssayRangeFilter = { min: number; max: number } | null;

export default function BlockModelCarbonViewer({
  opacity = 0.8, assayFilterRange
}: { opacity?: number; assayFilterRange?: AssayRangeFilter }) {

  const { scene, camera, controls, dynamicGroup, renderer, registerTooltipObject, unregisterTooltipObject } = useThreeScene();
  const mountedRef = useRef(false);
  const { blockModelData, loadingStatus, error, refetch } = useDataCache();
  const [showTraces, setShowTraces] = useState(true);
  const [localRange, setLocalRange] = useState<AssayRangeFilter>(assayFilterRange ?? null);

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

  const modelCenter = useMemo(() => {
    if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
      return { lon: 0, lat: 0 }; 
    }
    const allPoints = blockModelData.map(b => ({ lon: b.lon, lat: b.lat, elevation: b.elevation }));
    const centerLon = allPoints.reduce((acc, p) => acc + p.lon, 0) / allPoints.length;
    const centerLat = allPoints.reduce((acc, p) => acc + p.lat, 0) / allPoints.length;
    return { lon: centerLon, lat: centerLat };
  }, [blockModelData]);

  useEffect(() => {
    if (assayFilterRange) {
      setLocalRange({ ...assayFilterRange });
      return;
    }
    if (!localRange && Number.isFinite(carbonRange.min) && Number.isFinite(carbonRange.max)) {
      setLocalRange({ min: carbonRange.min, max: carbonRange.max });
    }
  }, [assayFilterRange, carbonRange.min, carbonRange.max, localRange]);

  useEffect(() => {
    if (!scene || !camera || !controls || !dynamicGroup || !renderer) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
      console.warn('[BlockModelCarbonViewer] blocks not ready or wrong shape:', blockModelData);
      return;
    }

    const filteredBlocks = blockModelData.filter(b => {
      const idVal = Number(b.Id);
      if (idVal === 0) return false;

      if (localRange) {
        const carbonValue = Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
        if (!Number.isFinite(carbonValue)) return false;
        return carbonValue >= localRange.min && carbonValue <= localRange.max;
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

    // group blocks by color
    const buckets = new Map<number, BlockSegment[]>();
    for (const b of blocks) {
      const color = colorForCarbon(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
      if (!buckets.has(color)) buckets.set(color, []);
      buckets.get(color)!.push(b);
    }

    // build instances per color
    buckets.forEach((items, color) => {
      const mat = new THREE.MeshStandardMaterial({ color, transparent: false, opacity: 1.0 });
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

      registerTooltipObject(mesh, (instanceId: number) => {
          const block = items[instanceId];
          return `ID: ${block.Id}<br/>Lat: ${block.lat.toFixed(4)}<br/>Lon: ${block.lon.toFixed(4)}<br/>Elev: ${block.elevation.toFixed(2)}<br/>Carbon: ${Number(block["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]).toFixed(2)}`;
      });
    });

    requestAnimationFrame(() => {
      fitCameraToGroupWorldAware(camera, controls, viewGroup, 1.35);
    });

    return () => {
      dynamicGroup.remove(viewGroup);
      blockMeshes.forEach(mesh => unregisterTooltipObject(mesh));
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
  }, [blockModelData, opacity, scene, camera, controls, dynamicGroup, modelCenter, localRange, registerTooltipObject, unregisterTooltipObject]);

  if (loadingStatus === 'loading') return <div>Loading...</div>;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  const carbonGradient = "linear-gradient(to right, #00ff00, #ff0000)";

  const lithologyLegendItems = useMemo(() => {
    return Object.entries(LITHOLOGY_COLOR_MAP).map(([label, color]) => ({
      label: label.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      color,
    }));
  }, []);

  return (
    <>
      <TerrainSurfaceLayer verticalScale={1} modelCenter={modelCenter} />
      <BoreholeLayer modelCenter={modelCenter} type="lithology" visible={showTraces} />
      <OverlaySlot slot="top-right" wrapperClassName="w-[320px] flex flex-col items-end">
        <div className="pointer-events-auto bg-black/60 text-white rounded p-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>Assay range filter</span>
              <button
                className="text-[11px] text-orange-300 hover:text-orange-200"
                onClick={() => setLocalRange({ min: carbonRange.min, max: carbonRange.max })}
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                Min
                <input
                  type="number"
                  step="0.1"
                  value={localRange?.min ?? carbonRange.min}
                  onChange={(e) => setLocalRange(prev => ({
                    min: Number(e.target.value),
                    max: Math.max(Number(e.target.value), prev?.max ?? carbonRange.max)
                  }))}
                  className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1 text-xs"
                />
              </label>
              <label className="text-xs">
                Max
                <input
                  type="number"
                  step="0.1"
                  value={localRange?.max ?? carbonRange.max}
                  onChange={(e) => setLocalRange(prev => ({
                    min: Math.min(prev?.min ?? carbonRange.min, Number(e.target.value)),
                    max: Number(e.target.value)
                  }))}
                  className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1 text-xs"
                />
              </label>
            </div>
            <input
              type="range"
              min={carbonRange.min}
              max={carbonRange.max}
              step={0.1}
              value={localRange?.min ?? carbonRange.min}
              onChange={(e) => setLocalRange(prev => ({
                min: Number(e.target.value),
                max: Math.max(Number(e.target.value), prev?.max ?? carbonRange.max)
              }))}
              className="w-full"
            />
            <input
              type="range"
              min={carbonRange.min}
              max={carbonRange.max}
              step={0.1}
              value={localRange?.max ?? carbonRange.max}
              onChange={(e) => setLocalRange(prev => ({
                min: Math.min(prev?.min ?? carbonRange.min, Number(e.target.value)),
                max: Number(e.target.value)
              }))}
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showTraces} onChange={e=>setShowTraces(e.target.checked)} />
            Show traces
          </label>
        </div>
      </OverlaySlot>

      <OverlaySlot slot="bottom-left">
        <div className="flex flex-col gap-3">
          <Legend title="Lithology" items={lithologyLegendItems} />
          <Legend
            title="Carbon Value"
            type="gradient"
            gradient={carbonGradient}
            minLabel={carbonRange.min.toFixed(2)}
            maxLabel={carbonRange.max.toFixed(2)}
          />
        </div>
      </OverlaySlot>
    </>
  );
}
