'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';

/**
 * Click once on terrain to place a draggable, vertical clipping plane.
 * Drag with left mouse to move it. Press ESC to clear/remove.
 */
const TerrainSingleClippingPlane = () => {
  const { viewer, ready } = useCesium();

  const planeCollectionRef = useRef<Cesium.ClippingPlaneCollection | null>(null);
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const originRef = useRef<Cesium.Cartesian3 | null>(null);
  const draggingRef = useRef<boolean>(false);

  // Optional UI state (you can wire these to your own UI controls)
  const [edgeWidth] = useState<number>(1.0);
  const [unionClippingRegions] = useState<boolean>(false);

  useEffect(() => {
    if (!ready || !viewer) return;

    const Cesium = (window as any).Cesium as typeof import('cesium');

    let mounted = true;

    // --- scene flags like the Sandcastle demo ---
    const globe = viewer.scene.globe;
    const prevBackFace = globe.backFaceCulling;
    const prevSkirts = globe.showSkirts;
    globe.backFaceCulling = false;
    globe.showSkirts = false;

    // Helper: (re)create clipping plane collection at a given origin
    const createOrMovePlane = (origin: Cesium.Cartesian3) => {
      // ENU local frame at the origin
      const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);

      // Vertical plane: +X in the local ENU frame means the plane’s normal points “east”.
      // Distance < 0 clips the “-normal” side; tweak sign to flip which side is kept.
      const plane = new Cesium.ClippingPlane(new Cesium.Cartesian3(1, 0, 0), 0.0);

      if (!planeCollectionRef.current) {
        planeCollectionRef.current = new Cesium.ClippingPlaneCollection({
          modelMatrix,
          planes: [plane],
          unionClippingRegions,
          edgeWidth,
          edgeColor: Cesium.Color.WHITE,
          enabled: true
        });
        globe.clippingPlanes = planeCollectionRef.current;
        viewer.scene.requestRender();
      } else {
        // Move existing collection by updating its modelMatrix (cheapest way to "drag")
        planeCollectionRef.current.modelMatrix = modelMatrix;
        viewer.scene.requestRender();
      }
    };

    // Convert a window position to a terrain Cartesian3 (falls back to globe ellipsoid)
    const pickOnTerrain = (pos: Cesium.Cartesian2) => {
      const scene = viewer.scene;
      // Try precise terrain pick first (if depth test against terrain enabled)
      let cartesian =
        scene.pickPositionSupported ? scene.pickPosition(pos) : null;

      if (!Cesium.defined(cartesian)) {
        const ray = viewer.camera.getPickRay(pos);
        if (ray) {
          cartesian = scene.globe.pick(ray, scene);
        }
      }
      return cartesian || null;
    };

    // Input handling
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handlerRef.current = handler;

    // Left click: place plane (or start drag if it exists)
    handler.setInputAction((movement: any) => {
      const pos = movement.position as Cesium.Cartesian2;
      const picked = pickOnTerrain(pos);
      if (!picked) return;

      originRef.current = picked;
      createOrMovePlane(picked);
      draggingRef.current = true;
      viewer.scene.requestRender();
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    // Mouse move: drag plane by moving its modelMatrix origin
    handler.setInputAction((movement: any) => {
      if (!draggingRef.current) return;
      const endPos = movement.endPosition as Cesium.Cartesian2;
      const picked = pickOnTerrain(endPos);
      if (!picked) return;

      originRef.current = picked;
      createOrMovePlane(picked);
      viewer.scene.requestRender();
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Left up: stop dragging
    handler.setInputAction(() => {
      draggingRef.current = false;
      viewer.scene.requestRender();
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    // ESC: clear plane
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (globe.clippingPlanes) {
          globe.clippingPlanes.enabled = false;
          globe.clippingPlanes.removeAll();
          globe.clippingPlanes = undefined as any;
          viewer.scene.requestRender();
        }
        planeCollectionRef.current = null;
        originRef.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Optional: fly to your data first like you do in your files
    // (You can keep your existing viewer.flyTo([...]) before user interaction.)

    return () => {
      mounted = false;

      window.removeEventListener('keydown', onKeyDown);

      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }

      if (globe.clippingPlanes) {
        globe.clippingPlanes.enabled = false;
        globe.clippingPlanes.removeAll();
        globe.clippingPlanes = undefined as any;
        viewer.scene.requestRender();
      }
      planeCollectionRef.current = null;

      // Restore scene flags
      globe.backFaceCulling = prevBackFace;
      globe.showSkirts = prevSkirts;
      viewer.scene.requestRender();
    };
  }, [ready, viewer, edgeWidth, unionClippingRegions]);

  return null;
};

export default TerrainSingleClippingPlane;