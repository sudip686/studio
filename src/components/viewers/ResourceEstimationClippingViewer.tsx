// src/components/viewers/ResourceEstimationClippingViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { useDataCache } from '@/lib/data-cache';
import { Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, AmbientLight, Plane, Vector3, Object3D, MeshPhongMaterial, Color, BoxGeometry, InstancedMesh } from 'three';
import { Legend } from '@/components/ui/legend';
import { OverlaySlot } from '@/ui/overlays';

const RESC_LEGEND_ITEMS = [
  { label: 'Measured',  color: '#0000ff' },
  { label: 'Indicated', color: '#ff0000' },
  { label: 'Inferred',  color: '#00ff00' },
  { label: 'Unknown',   color: '#999999' },
];

// Helper to pick a value from a feature's properties, checking multiple possible keys.
const pick = (o: any, keys: string[]) => {
  for (const k of keys) if (o?.[k] !== undefined) return o[k];
  return undefined;
};

// Helper to convert a value to a number, with a fallback.
const asNumber = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Determines block color based on its resource classification.
const colorForResc = (v: any) => {
    const s = String(v ?? "Unknown").trim();
    if (s === "Measured") return "#0000ff";
    if (s === "Indicated") return "#ff0000";
    if (s === "Inferred") return "#00ff00";
    return "#999999";
};

export default function ResourceEstimationClippingViewer() {
  const { viewer, ready } = useCesium();
  const { blockModelData, loadingStatus, error } = useDataCache();
  const threeStateRef = useRef<any>(null);
  const [clippingHeight, setClippingHeight] = useState(0);
  const clippingPlaneRef = useRef<any>(null);
  const threeClippingPlaneRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !viewer || !blockModelData || !(window as any).Cesium) return;
    const Cesium = (window as any).Cesium as typeof import('cesium');

    let mounted = true;
    const requestRender = () => viewer.scene.requestRender();

    // Initialize Three.js Scene
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const renderer = new WebGLRenderer({
      canvas: viewer.canvas,
      context: (viewer.scene as any).context._gl,
      alpha: true,
    });
    renderer.autoClear = false;
    renderer.localClippingEnabled = true;

    const light = new DirectionalLight(0xffffff, 0.8);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new AmbientLight(0xffffff, 0.4));
    
    threeStateRef.current = { renderer, scene, camera };

    // --- Clipping Plane Setup ---
    const cesiumClippingPlane = new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 0, -1), 0);
    clippingPlaneRef.current = cesiumClippingPlane;
    
    const clippingPlanes = new Cesium.ClippingPlaneCollection({
        planes: [cesiumClippingPlane],
        edgeWidth: 1.0,
        edgeColor: Cesium.Color.WHITE,
        enabled: true,
    });
    
    // Apply to globe
    viewer.scene.globe.clippingPlanes = clippingPlanes;
    
    // Create corresponding Three.js plane
    const threeClippingPlane = new Plane(new Vector3(0, 0, -1), 0);
    threeClippingPlaneRef.current = threeClippingPlane;


    // --- Block Model Rendering ---
    const blocks = blockModelData;
    const rescKeys = ["RescCalc","rescCalc","classification","CLASS","Class"];
    const grouped: Record<string, any[]> = {};
    for (const b of blocks) {
      const v = pick(b, rescKeys);
      const color = colorForResc(v);
      (grouped[color] ??= []).push(b);
    }
    
    const tmpObj = new Object3D();
    for (const [hex, arr] of Object.entries(grouped)) {
        const mat = new MeshPhongMaterial({
            color: new Color(hex),
            clippingPlanes: [threeClippingPlane],
            clipShadows: true,
            transparent: true,
            opacity: 0.8,
        });

        const geom = new BoxGeometry(1, 1, 1);
        const mesh = new InstancedMesh(geom, mat, arr.length);

        let i = 0;
        for (const f of arr) {
            const pos = Cesium.Cartesian3.fromDegrees(f.lon, f.lat, f.elevation);
            tmpObj.position.set(pos.x, pos.y, pos.z);
            tmpObj.scale.set(f.dX, f.dZ, f.dY); // Note: Z and Y are often swapped between conventions
            tmpObj.rotation.set(0, 0, 0);
            tmpObj.updateMatrix();
            mesh.setMatrixAt(i++, tmpObj.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);
    }

    // --- Camera Sync and Render Loop ---
    const tmpV = new Vector3();
    const postRender = () => {
      if (!threeStateRef.current) return;

      const cv = viewer.camera;
      const frustum = cv.frustum as any;
      const width = viewer.canvas.clientWidth;
      const height = viewer.canvas.clientHeight;

      const fov = Cesium.Math.toDegrees(frustum.fovy);
      threeStateRef.current.camera.fov = fov;
      threeStateRef.current.camera.aspect = width / height;
      threeStateRef.current.camera.near = frustum.near;
      threeStateRef.current.camera.far = frustum.far;

      const pos = cv.positionWC;
      const dir = cv.directionWC;
      const up = cv.upWC;

      threeStateRef.current.camera.position.set(pos.x, pos.y, pos.z);
      tmpV.set(pos.x + dir.x, pos.y + dir.y, pos.z + dir.z);
      threeStateRef.current.camera.up.set(up.x, up.y, up.z);
      threeStateRef.current.camera.lookAt(tmpV);
      threeStateRef.current.camera.updateProjectionMatrix();

      threeStateRef.current.renderer.state.reset();
      threeStateRef.current.renderer.render(threeStateRef.current.scene, threeStateRef.current.camera);
    };

    viewer.scene.postRender.addEventListener(postRender);
    viewer.flyTo(blockModelData.map((b:any) => Cesium.Cartesian3.fromDegrees(b.lon, b.lat, b.elevation)));
    requestRender();

    return () => {
        mounted = false;
        viewer.scene.postRender.removeEventListener(postRender);
        if (viewer.scene.globe.clippingPlanes) {
            viewer.scene.globe.clippingPlanes.removeAll();
        }
        if (threeStateRef.current) {
            threeStateRef.current.scene.traverse((o: any) => {
                if (o.isMesh) {
                    o.geometry?.dispose?.();
                    o.material?.dispose?.();
                }
            });
            threeStateRef.current = null;
        }
        requestRender();
    };

  }, [ready, viewer, blockModelData]);

  useEffect(() => {
    if (clippingPlaneRef.current) {
        clippingPlaneRef.current.distance = clippingHeight;
    }
    if (threeClippingPlaneRef.current) {
        threeClippingPlaneRef.current.constant = clippingHeight;
    }
    if (viewer) {
        viewer.scene.requestRender();
    }
  }, [clippingHeight, viewer]);

  if (loadingStatus === 'loading') return <div className="text-white">Loading Block Model...</div>;
  if (error) return <div className="text-white">Error: {error}</div>;

  return (
    <>
      <OverlaySlot slot="bottom-left">
        <Legend
          title="Resource Classification"
          items={RESC_LEGEND_ITEMS}
          guidance="Colors indicate resource classification for block model cells. Use the slider to clip by elevation."
        />
      </OverlaySlot>

      <OverlaySlot slot="top-left">
        <div className="pointer-events-auto text-white bg-black/30 border border-white/10 backdrop-blur-md rounded-[18px] shadow-[0_18px_45px_rgba(0,0,0,0.65)] px-4 py-3 w-fit max-w-[70vw]">
          <div className="text-xs uppercase tracking-[0.3em] text-accent/80">Clipping</div>
          <div className="mt-2 flex flex-col gap-2">
            <label className="text-xs text-gray-200">Clipping Height (Elevation)</label>
            <input
              type="range"
              min="-500"
              max="500"
              step="10"
              value={clippingHeight}
              onChange={(e) => setClippingHeight(parseFloat(e.target.value))}
              className="w-64 max-w-[60vw]"
            />
            <div className="text-xs text-gray-200/90">{clippingHeight} m</div>
          </div>
        </div>
      </OverlaySlot>
    </>
  );
}
