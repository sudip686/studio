'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
  { label: 'Indicated', color: '#f59e0b' },
  { label: 'Inferred', color: '#10b981' },
];

const DEFAULT_BLOCK_MODEL_FIT = {
  padding: 1.16,
  targetScreenFraction: 0.82,
  minDistance: 360,
  maxDistance: 24000,
  screenBiasX: 0.14,
  screenBiasY: 0.03,
  viewDir: new THREE.Vector3(0.84, 0.66, 0.98).normalize(),
};

const PRESENTATION_BLOCK_MODEL_FIT = {
  padding: 1.12,
  targetScreenFraction: 0.86,
  minDistance: 320,
  maxDistance: 22000,
  screenBiasX: 0.12,
  screenBiasY: 0,
  viewDir: new THREE.Vector3(1.02, 0.72, 0.56).normalize(),
};

type AssayRangeFilter = { min: number; max: number } | null;
type ClassificationFilter = 'All' | 'Indicated' | 'Inferred';

function rangesMatch(left: AssayRangeFilter | undefined, right: AssayRangeFilter | undefined) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return Math.abs(left.min - right.min) < 0.0001 && Math.abs(left.max - right.max) < 0.0001;
}

const lithologyLegendItems = Object.entries(LITHOLOGY_COLOR_MAP).map(([label, color]) => ({
  label: label.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
  color,
}));

export default function BlockModelRescViewer({
    assayFilterRange,
    classificationFilter,
    presentationMode = false,
    meshVisible = true,
    terrainOpacity = 1,
}: {
    assayFilterRange?: AssayRangeFilter;
    classificationFilter?: ClassificationFilter;
    presentationMode?: boolean;
    meshVisible?: boolean;
    terrainOpacity?: number;
}) {
    const { camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject } = useThreeScene();
    const viewGroupRef = useRef<THREE.Group | null>(null);

    const { blockModelData, resourceStatus, resourceErrors, loadBlockModel } = useDataCache();
    const [blockOpacity, setBlockOpacity] = useState(0.8);
    const [showTraces, setShowTraces] = useState(true);
    const defaultClassification = 'All';
    const [selectedClassification, setSelectedClassification] = useState(defaultClassification);
    const [localRange, setLocalRange] = useState<AssayRangeFilter>(assayFilterRange ?? null);
    const classificationOptions = ['All', 'Indicated', 'Inferred'];
    const cameraFitOptions = presentationMode ? PRESENTATION_BLOCK_MODEL_FIT : DEFAULT_BLOCK_MODEL_FIT;
    const effectiveTerrainOpacity = Math.min(1, terrainOpacity * 1.3);

    useEffect(() => {
      if (!blockModelData && resourceStatus.blockModel === 'idle') {
        loadBlockModel();
      }
    }, [blockModelData, loadBlockModel, resourceStatus.blockModel]);

    useEffect(() => {
      setSelectedClassification(defaultClassification);
    }, [defaultClassification]);

    useEffect(() => {
      if (classificationFilter) {
        setSelectedClassification(classificationFilter);
      }
    }, [classificationFilter]);

    const pick = (o: any, keys: string[]) => {
      for (const k of keys) if (o?.[k] !== undefined) return o[k];
      return undefined;
    };
    const asNumber = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

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

    useEffect(() => {
      if (assayFilterRange) {
        setLocalRange((current) => (rangesMatch(current, assayFilterRange) ? current : { ...assayFilterRange }));
        return;
      }
      if (Number.isFinite(carbonRange.min) && Number.isFinite(carbonRange.max)) {
        setLocalRange((current) => {
          const nextRange = { min: carbonRange.min, max: carbonRange.max };
          if (current && rangesMatch(current, nextRange)) {
            return current;
          }
          return current ?? nextRange;
        });
      }
    }, [assayFilterRange, carbonRange.min, carbonRange.max]);

    const disposeViewGroup = useCallback((group: THREE.Group | null, meshes: THREE.InstancedMesh[] = []) => {
      if (!group || !dynamicGroup) return;
      dynamicGroup.remove(group);
      meshes.forEach((mesh) => unregisterTooltipObject(mesh));
      group.traverse((object) => {
        if ((object as THREE.Mesh).geometry) {
          (object as THREE.Mesh).geometry.dispose();
        }
        if ((object as THREE.Mesh).material) {
          const material = (object as THREE.Mesh).material;
          Array.isArray(material) ? material.forEach((entry) => entry.dispose()) : material.dispose();
        }
      });
    }, [dynamicGroup, unregisterTooltipObject]);

    const modelCenter = useMemo(() => {
      if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
        return { lon: 0, lat: 0 }; 
      }
      const centerLon = blockModelData.reduce((s, d) => s + d.lon, 0) / blockModelData.length;
      const centerLat = blockModelData.reduce((s, d) => s + d.lat, 0) / blockModelData.length;
      return { lon: centerLon, lat: centerLat };
    }, [blockModelData]);

    useEffect(() => {
      disposeViewGroup(viewGroupRef.current);
      viewGroupRef.current = null;

      if (!camera || !controls || !dynamicGroup) return;
      if (!blockModelData || !Array.isArray(blockModelData) || blockModelData.length === 0) {
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
        return;
      }

      const blocks = filteredBlocks as BlockSegment[];

      const viewGroup = new THREE.Group();
      viewGroup.name = 'BlockModelRescView_Group';
      dynamicGroup.add(viewGroup);
      viewGroupRef.current = viewGroup;

      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];

      // COLOR BY RescCalc
      const colorForResc = (v: any) => {
        const s = String(v ?? "Unknown").trim();
        if (s === "Indicated") return "#f59e0b";
        if (s === "Inferred") return "#10b981";
        return "#94a3b8";
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

        const mat = new THREE.MeshStandardMaterial({
          color: hex,
          transparent: blockOpacity < 0.999,
          opacity: blockOpacity,
          roughness: 0.4,
          metalness: 0.05,
          emissive: new THREE.Color(hex).multiplyScalar(0.045),
          emissiveIntensity: 0.14,
        });
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
        totalDrawn += i;

        // Register tooltip for this mesh
        if (registerTooltipObject) {
          registerTooltipObject(mesh, (instanceId: number) => {
            const block = list[instanceId];
            const classification = String(pick(block, ["RescCalc","rescCalc","classification","CLASS","Class"]) ?? "Unknown");
            return `ID: ${block.Id}<br/>Lat: ${block.lat?.toFixed(4) || 'N/A'}<br/>Lon: ${block.lon?.toFixed(4) || 'N/A'}<br/>Elev: ${block.elevation?.toFixed(2) || 'N/A'}<br/>Classification: ${classification}<br/>Carbon: ${Number(block["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]).toFixed(2)}`;
          });
        }
      }

      // >>> NEW: Fit camera once content is there
      viewGroup.updateMatrixWorld(true);
      controls.update();
      fitCameraToGroupWorldAware(camera, controls, viewGroup, cameraFitOptions);

      return () => {
        if (viewGroupRef.current === viewGroup) {
          viewGroupRef.current = null;
        }
        disposeViewGroup(viewGroup);
      };
    }, [blockModelData, blockOpacity, camera, controls, dynamicGroup, modelCenter, localRange, selectedClassification, disposeViewGroup, cameraFitOptions]);

    useEffect(() => {
      if (!camera || !controls || !dynamicGroup) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'f') {
          requestAnimationFrame(() => {
            dynamicGroup.updateMatrixWorld(true); // Use dynamicGroup for fitting
            fitCameraToGroupWorldAware(camera, controls, dynamicGroup, cameraFitOptions);
          });
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [camera, controls, dynamicGroup, cameraFitOptions]);

    if (resourceStatus.blockModel === 'loading' || (resourceStatus.blockModel === 'idle' && !blockModelData)) {
      return (
        <div className="viewer-status-card">
          <div className="viewer-status-card__spinner" />
          <div className="viewer-status-card__copy">
            <strong>Loading classification model</strong>
            <span>Preparing category blocks, trace overlays, and confidence filters.</span>
          </div>
        </div>
      );
    }
    if (resourceErrors.blockModel && !blockModelData) {
      return <ErrorDisplay message={resourceErrors.blockModel} onRetry={loadBlockModel} />;
    }

    if (!blockModelData) {
      return (
        <div className="viewer-status-card viewer-status-card--subtle">
          <div className="viewer-status-card__copy">
            <strong>No classification model yet</strong>
            <span>Refresh once the resource-classification dataset is available.</span>
          </div>
        </div>
      );
    }

    return (
      <>
        <TerrainSurfaceLayer
          verticalScale={1}
          modelCenter={modelCenter}
          quality="presentation"
          meshVisible={meshVisible}
          meshOpacity={effectiveTerrainOpacity}
        />
        <BoreholeLayer
          modelCenter={modelCenter}
          type="lithology"
          visible={showTraces}
          visualMode={presentationMode ? 'presentation' : 'default'}
        />
        <OverlaySlot slot="top-right" wrapperClassName="overlay-inspector-slot overlay-inspector-slot--right">
          <aside className="overlay-inspector" data-testid="classification-inspector">
              <div className="overlay-inspector__header">
                <p className="overlay-inspector__eyebrow">Classification chapter</p>
                <h3 className="overlay-inspector__title">Confidence controls</h3>
                <p className="overlay-inspector__summary">
                  Filter by grade, switch resource classes, and keep the trace context visible without crowding the scene.
                </p>
              </div>
              <div className="overlay-inspector__body">
                <section className="overlay-inspector__section">
                  <div className="overlay-inspector__section-top">
                    <span className="overlay-inspector__section-label">Model filter</span>
                    <div className="overlay-inspector__pill-row">
                      <button
                        type="button"
                        className="overlay-inspector__pill"
                        onClick={() => setLocalRange({ min: 3, max: carbonRange.max })}
                      >
                        &gt;3% TGC
                      </button>
                      <button
                        type="button"
                        className="overlay-inspector__pill"
                        onClick={() => setLocalRange({ min: 5, max: carbonRange.max })}
                      >
                        &gt;5% TGC
                      </button>
                      <button
                        type="button"
                        className="overlay-inspector__link"
                        onClick={() => setLocalRange({ min: carbonRange.min, max: carbonRange.max })}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="overlay-inspector__field-grid">
                    <label className="overlay-inspector__field">
                      <span>Minimum</span>
                      <input
                        type="number"
                        step="0.1"
                        value={localRange?.min ?? carbonRange.min}
                        onChange={(e) => setLocalRange(prev => ({
                          min: Number(e.target.value),
                          max: Math.max(Number(e.target.value), prev?.max ?? carbonRange.max)
                        }))}
                      />
                    </label>
                    <label className="overlay-inspector__field">
                      <span>Maximum</span>
                      <input
                        type="number"
                        step="0.1"
                        value={localRange?.max ?? carbonRange.max}
                        onChange={(e) => setLocalRange(prev => ({
                          min: Math.min(prev?.min ?? carbonRange.min, Number(e.target.value)),
                          max: Number(e.target.value)
                        }))}
                      />
                    </label>
                  </div>
                  <div className="overlay-inspector__slider-stack">
                    <label className="overlay-inspector__slider-label">
                      Lower cutoff
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
                        className="range-slider w-full"
                      />
                    </label>
                    <label className="overlay-inspector__slider-label">
                      Upper cutoff
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
                        className="range-slider w-full"
                      />
                    </label>
                  </div>
                  <label className="overlay-inspector__field overlay-inspector__field--stack">
                    <span>Classification</span>
                    <select
                      value={selectedClassification}
                      onChange={e => setSelectedClassification(e.target.value)}
                    >
                      {classificationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="overlay-inspector__slider-label">
                    Block opacity
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={blockOpacity}
                      onChange={(e) => setBlockOpacity(parseFloat(e.target.value))}
                      className="range-slider w-full"
                    />
                  </label>
                  <label className="overlay-inspector__check">
                    <input type="checkbox" checked={showTraces} onChange={e => setShowTraces(e.target.checked)} />
                    <span>Show drillhole traces</span>
                  </label>
                </section>
                <Legend title="Lithology" items={lithologyLegendItems} fullWidth />
                <Legend
                  title="Classification"
                  items={RESC_LEGEND}
                  guidance="Indicated blocks are amber and inferred blocks are green to match the model view."
                  fullWidth
                />
              </div>
          </aside>
        </OverlaySlot>
      </>
    );
}


