// BlockModelCarbonView.tsx
'use client';
import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
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

const CARBON_PALETTE = ['#17304a', '#205375', '#2b7a78', '#78c07f', '#f6d860', '#f08a5d'];
const DEFAULT_BLOCK_MODEL_FIT = {
  padding: 1.16,
  targetScreenFraction: 0.82,
  minDistance: 360,
  maxDistance: 24000,
  screenBiasX: 0.14,
  screenBiasY: 0.03,
  viewDir: new THREE.Vector3(0.86, 0.66, 1.0).normalize(),
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

function colorForCarbon(vRaw: any, min: number, max: number): string {
    const value = Number(vRaw);
    let t = Number.isFinite(value) && max > min ? (value - min) / (max - min) : 0.5;
    t = Math.max(0, Math.min(1, t));
    const scaled = t * (CARBON_PALETTE.length - 1);
    const lowerIndex = Math.floor(scaled);
    const upperIndex = Math.min(CARBON_PALETTE.length - 1, lowerIndex + 1);
    const mix = scaled - lowerIndex;
    return `#${new THREE.Color(CARBON_PALETTE[lowerIndex]).lerp(new THREE.Color(CARBON_PALETTE[upperIndex]), mix).getHexString()}`;
}

type AssayRangeFilter = { min: number; max: number } | null;

function rangesMatch(left: AssayRangeFilter | undefined, right: AssayRangeFilter | undefined) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return Math.abs(left.min - right.min) < 0.0001 && Math.abs(left.max - right.max) < 0.0001;
}

export default function BlockModelCarbonViewer({
  opacity = 0.8,
  assayFilterRange,
  presentationMode = false,
  meshVisible = true,
  terrainOpacity = 1,
}: {
  opacity?: number;
  assayFilterRange?: AssayRangeFilter;
  presentationMode?: boolean;
  meshVisible?: boolean;
  terrainOpacity?: number;
}) {

  const { camera, controls, dynamicGroup, registerTooltipObject, unregisterTooltipObject } = useThreeScene();
  const effectiveTerrainOpacity = Math.min(1, terrainOpacity * 1.3);
  const viewGroupRef = useRef<THREE.Group | null>(null);
  const { blockModelData, resourceStatus, resourceErrors, loadBlockModel } = useDataCache();
  const [showTraces, setShowTraces] = useState(true);
  const [localRange, setLocalRange] = useState<AssayRangeFilter>(assayFilterRange ?? null);
  const cameraFitOptions = presentationMode ? PRESENTATION_BLOCK_MODEL_FIT : DEFAULT_BLOCK_MODEL_FIT;

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
    if (!blockModelData && resourceStatus.blockModel === 'idle') {
      loadBlockModel();
    }
  }, [blockModelData, loadBlockModel, resourceStatus.blockModel]);

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
    viewGroup.name = 'BlockModelCarbonView_Group';
    dynamicGroup.add(viewGroup);
    viewGroupRef.current = viewGroup;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const blockMeshes: THREE.InstancedMesh[] = [];

    // group blocks by color
    const buckets = new Map<string, BlockSegment[]>();
    for (const b of blocks) {
      const color = colorForCarbon(
        b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"],
        carbonRange.min,
        carbonRange.max,
      );
      if (!buckets.has(color)) buckets.set(color, []);
      buckets.get(color)!.push(b);
    }

    // build instances per color
    buckets.forEach((items, color) => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: opacity < 0.999,
        opacity,
        roughness: 0.38,
        metalness: 0.06,
        emissive: new THREE.Color(color).multiplyScalar(0.06),
        emissiveIntensity: 0.16,
      });
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
      fitCameraToGroupWorldAware(camera, controls, viewGroup, cameraFitOptions);
    });

    return () => {
      if (viewGroupRef.current === viewGroup) {
        viewGroupRef.current = null;
      }
      disposeViewGroup(viewGroup, blockMeshes);
    };
  }, [
    blockModelData,
    opacity,
    camera,
    controls,
    dynamicGroup,
    modelCenter,
    localRange,
    carbonRange.min,
    carbonRange.max,
    registerTooltipObject,
    unregisterTooltipObject,
    disposeViewGroup,
    cameraFitOptions,
  ]);

  if (resourceStatus.blockModel === 'loading' || (resourceStatus.blockModel === 'idle' && !blockModelData)) {
    return (
      <div className="viewer-status-card">
        <div className="viewer-status-card__spinner" />
        <div className="viewer-status-card__copy">
          <strong>Loading carbon block model</strong>
          <span>Building the terrain, block model, and lithology overlays for the current chapter.</span>
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
          <strong>No block model yet</strong>
          <span>Refresh once the carbon model dataset is available.</span>
        </div>
      </div>
    );
  }

  const carbonGradient = `linear-gradient(to right, ${CARBON_PALETTE.join(', ')})`;

  const lithologyLegendItems = useMemo(() => {
    return Object.entries(LITHOLOGY_COLOR_MAP).map(([label, color]) => ({
      label: label.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      color,
    }));
  }, []);

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
        <aside className="overlay-inspector" data-testid="carbon-model-inspector">
            <div className="overlay-inspector__header">
              <p className="overlay-inspector__eyebrow">Block model chapter</p>
              <h3 className="overlay-inspector__title">Carbon controls</h3>
              <p className="overlay-inspector__summary">
                Focus the model on higher-grade blocks and keep drillhole traces available for quick geological context.
              </p>
            </div>
            <div className="overlay-inspector__body">
              <section className="overlay-inspector__section">
                <div className="overlay-inspector__section-top">
                  <span className="overlay-inspector__section-label">Carbon filter</span>
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
                <label className="overlay-inspector__check">
                  <input type="checkbox" checked={showTraces} onChange={e => setShowTraces(e.target.checked)} />
                  <span>Show drillhole traces</span>
                </label>
              </section>
              <Legend title="Lithology" items={lithologyLegendItems} fullWidth />
              <Legend
                title="Carbon Value"
                type="gradient"
                gradient={carbonGradient}
                minLabel={(localRange?.min ?? carbonRange.min).toFixed(2)}
                maxLabel={(localRange?.max ?? carbonRange.max).toFixed(2)}
                guidance="Blocks are colored by graphitic carbon concentration from low to high."
                fullWidth
              />
            </div>
        </aside>
      </OverlaySlot>
    </>
  );
}


