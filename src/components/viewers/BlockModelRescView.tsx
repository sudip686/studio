'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Legend } from '@/components/ui/legend';
import { OverlaySlot } from '@/ui/overlays';
import { useDataCache, BlockSegment } from '@/lib/data-cache';

import { projectLonLat, fitCameraToGroupWorldAware } from '../../lib/utils/three-helpers';
import { useThreeScene } from '../../contexts/three-scene-context';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LITHOLOGY_COLOR_MAP } from '@/lib/boreholes/colors';
import TerrainSurfaceLayer from './TerrainSurfaceLayer';
import BoreholeLayer from './BoreholeLayer';


const RESC_LEGEND = [
  { label: 'Measured',  color: '#0000ff' },
  { label: 'Indicated', color: '#ff0000' },
  { label: 'Inferred',  color: '#00ff00' },
  { label: 'Unknown',   color: '#999999' },
];

<<<<<<< HEAD
type AssayRangeFilter = { min: number; max: number } | null;

export default function BlockModelRescViewer({ assayFilterRange }: { assayFilterRange?: AssayRangeFilter }) {
=======
const lithologyLegendItems = Object.entries(LITHOLOGY_COLOR_MAP).map(([label, color]) => ({
  label: label.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
  color,
}));

export default function BlockModelRescViewer({ assayCutoff }: { assayCutoff?: number }) {
>>>>>>> 7a2b9f91fb44e873326a1069779a434d9e7effad
    const { scene, camera, controls, dynamicGroup, renderer, registerTooltipObject, unregisterTooltipObject } = useThreeScene();
    const mountedRef = useRef(false);

    const { blockModelData, loadingStatus, error, refetch } = useDataCache();
    const [blockOpacity, setBlockOpacity] = useState(0.8);
    const [showTraces, setShowTraces] = useState(true);
    const [selectedClassification, setSelectedClassification] = useState('All');
    const [localRange, setLocalRange] = useState<AssayRangeFilter>(assayFilterRange ?? null);

    const pick = (o: any, keys: string[]) => {
      for (const k of keys) if (o?.[k] !== undefined) return o[k];
      return undefined;
    };
    const asNumber = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    useEffect(() => {
      if (assayFilterRange) {
        setLocalRange({ ...assayFilterRange });
        return;
      }
      if (!localRange && Number.isFinite(carbonRange.min) && Number.isFinite(carbonRange.max)) {
        setLocalRange({ min: carbonRange.min, max: carbonRange.max });
      }
    }, [assayFilterRange, carbonRange.min, carbonRange.max, localRange]);

    const modelCenter = useMemo(() => {
      if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
        return { lon: 0, lat: 0 }; 
      }
      const centerLon = blockModelData.reduce((s, d) => s + d.lon, 0) / blockModelData.length;
      const centerLat = blockModelData.reduce((s, d) => s + d.lat, 0) / blockModelData.length;
      return { lon: centerLon, lat: centerLat };
    }, [blockModelData]);

    useEffect(() => {
      if (!scene || !camera || !renderer || !controls || !dynamicGroup) return;
      if (mountedRef.current) return;
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

        if (localRange) {
          const carbonValue = Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
          if (!Number.isFinite(carbonValue)) return false;
          return carbonValue >= localRange.min && carbonValue <= localRange.max;
        }
        return true;
      });

      if (filteredBlocks.length === 0) {
        console.warn('[BlockModelRescViewer] No blocks after filtering.');
      }

      const blocks = filteredBlocks as BlockSegment[];

      const viewGroup = new THREE.Group();
      viewGroup.name = 'BlockModelRescView_Group';
      dynamicGroup.add(viewGroup);

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

        const mat = new THREE.MeshStandardMaterial({ color: hex, transparent: false, opacity: 1.0 });
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

          // BLOCKS are (lat, lon, elev) in source ? swap when projecting: 
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
        meshes.push(mesh); 
        totalDrawn += i;
      }
      console.log('[block_resc] in:', blockModelData.length, 'drawn:', totalDrawn);

      // >>> NEW: Fit camera once content is there
      viewGroup.updateMatrixWorld(true);
      controls.update();
      fitCameraToGroupWorldAware(camera, controls, viewGroup, 1.35);

      return () => {
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
    }, [blockModelData, loadingStatus, blockOpacity, scene, camera, controls, dynamicGroup, modelCenter, localRange, selectedClassification]);

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

    return (
      <>
        <TerrainSurfaceLayer verticalScale={1} modelCenter={modelCenter} />
        <BoreholeLayer modelCenter={modelCenter} type="lithology" visible={showTraces} />
<<<<<<< HEAD
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', pointerEvents: 'auto' }}>
          <Legend title="Classification" items={RESC_LEGEND} />
        </div>
        <div className="absolute top-4 right-4 z-50 bg-black/60 text-white rounded p-3 space-y-3 pointer-events-auto">
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
=======
        <OverlaySlot slot="bottom-left">
          <div className="flex flex-col gap-3">
            <Legend title="Lithology" items={lithologyLegendItems} />
            <Legend title="Classification" items={RESC_LEGEND} />
          </div>
        </OverlaySlot>
        <OverlaySlot slot="top-right" wrapperClassName="w-[320px] flex flex-col items-end">
          <div className="pointer-events-auto bg-black/60 text-white rounded p-3 space-y-2">
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
        </OverlaySlot>
>>>>>>> 7a2b9f91fb44e873326a1069779a434d9e7effad

      </>
    );
}
