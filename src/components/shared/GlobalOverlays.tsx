/**
 * Shared presentation HUD for compass and scale.
 * These elements are placed through the overlay slot system so they stay clear of the deck rail and footer.
 */

import { useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import { useCesium } from "@/contexts/cesium-context";
import { useThreeSceneSafe } from "@/contexts/three-scene-context";
import { CompassOverlay, MetricScaleOverlay } from "@/components/overlays";
import { OverlaySlot, uiTheme } from "@/ui/overlays";

interface GlobalOverlaysProps {
  mode: "cesium" | "three" | "none";
  hidden?: boolean;
  showCompass?: boolean;
  measurementMode?: boolean;
  currentView?: string;
  onLogoClick?: () => void;
}

const GlobalOverlays = ({
  mode,
  hidden = false,
  showCompass = true,
  currentView,
}: GlobalOverlaysProps) => {
  const cesiumContext = useCesium();
  const cesiumViewer = mode === "cesium" ? cesiumContext.viewer : null;
  const [isMounted, setIsMounted] = useState(false);
  const [, forceUpdate] = useState(0);
  const [debugFrameCount, setDebugFrameCount] = useState(0);
  const threeSceneContext = useThreeSceneSafe();
  const threeCamera = threeSceneContext?.camera;
  const threeControls = threeSceneContext?.controls;
  const threeRenderer = threeSceneContext?.renderer;

  // DEBUG: Log mode changes
  useEffect(() => {
    console.log('[GlobalOverlays] Mode changed:', { mode, isCesium: mode === 'cesium', isThree: mode === 'three', cesiumViewer: !!cesiumViewer });
  }, [mode, cesiumViewer]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getCesiumHeading = useCallback(() => {
    if (!cesiumViewer || cesiumViewer.isDestroyed()) return 0;
    const heading = cesiumViewer.camera.heading;
    console.log('[GlobalOverlays] getCesiumHeading called:', heading, 'viewer:', !!cesiumViewer);
    return heading;
  }, [cesiumViewer]);

  const getCesiumMetersIn100px = useCallback(() => {
    if (!cesiumViewer || cesiumViewer.isDestroyed()) {
      console.log('[GlobalOverlays] getCesiumMetersIn100px: viewer not ready');
      return 1000;
    }
    const scene = cesiumViewer.scene;
    if (!scene) {
      console.log('[GlobalOverlays] getCesiumMetersIn100px: scene not ready');
      return 1000;
    }
    const camera = scene.camera;
    const canvas = scene.canvas;

    const Cesium = (window as any).Cesium;
    if (!Cesium) {
      console.log('[GlobalOverlays] getCesiumMetersIn100px: Cesium not available');
      return 1000;
    }

    // Get distance to center of screen
    const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
    const ray = camera.getPickRay(center);
    const intersection = scene.globe.pick(ray, scene);

    if (!Cesium.defined(intersection)) {
        // Fallback calculation based on height
        const cartographic = camera.positionCartographic;
        const height = cartographic.height;
        const fov = camera.frustum.fovy;
        const result = (2 * height * Math.tan(fov / 2)) / canvas.clientHeight * 100;
        console.log('[GlobalOverlays] getCesiumMetersIn100px (fallback):', result, 'height:', height);
        return result;
    }

    const distance = Cesium.Cartesian3.distance(camera.positionWC, intersection);

    // Estimate meters per pixel at this distance
    const fov = camera.frustum.fovy;
    const metersPerPixel = (2 * distance * Math.tan(fov / 2)) / canvas.clientHeight;
    const result = metersPerPixel * 100;
    console.log('[GlobalOverlays] getCesiumMetersIn100px:', result, 'distance:', distance);

    return result;
  }, [cesiumViewer]);

  // Force re-render on camera movement for Cesium using preRender event
  useEffect(() => {
    if (!cesiumViewer || cesiumViewer.isDestroyed()) return;

    const preRenderHandler = () => {
      setDebugFrameCount(prev => prev + 1);
      forceUpdate(prev => prev + 1);
    };

    cesiumViewer.scene?.preRender?.addEventListener(preRenderHandler);
    console.log('[GlobalOverlays] Attached preRender listener');

    return () => {
      if (cesiumViewer && !cesiumViewer.isDestroyed()) {
        cesiumViewer.scene?.preRender?.removeEventListener(preRenderHandler);
      }
      console.log('[GlobalOverlays] Removed preRender listener');
    };
  }, [cesiumViewer]);

  const getThreeHeading = useCallback(() => {
    if (threeControls) {
      try {
        if (typeof (threeControls as any).getAzimuthalAngle === 'function') {
          return (threeControls as any).getAzimuthalAngle();
        }
      } catch (err) {
        // Fallback to camera orientation
      }
    }

    if (threeCamera) {
      // Calculate heading from camera rotation
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(threeCamera.quaternion);
      // Project to XZ plane and get angle
      return Math.atan2(direction.x, direction.z);
    }
    return 0;
  }, [threeControls, threeCamera]);

  const getThreeMetersIn100px = useCallback(() => {
    if (!threeCamera || !threeRenderer) return 1000;

    try {
      const canvas = threeRenderer.domElement;
      if (!canvas) return 1000;

      // Use camera position relative to its target (or origin)
      const target = (threeControls as any)?.target as THREE.Vector3;
      const distance = target
        ? threeCamera.position.distanceTo(target)
        : threeCamera.position.length();
        
      const fov = (threeCamera as THREE.PerspectiveCamera).fov ?? 75;
      const fovRadians = (fov * Math.PI) / 180;
      
      // Calculate visible height at this distance
      const visibleHeight = 2 * Math.tan(fovRadians / 2) * distance;
      const metersPerPixel = visibleHeight / canvas.clientHeight;

      const result = metersPerPixel * 100;
      if (!Number.isFinite(result) || result <= 0) return 100;
      return result;
    } catch {
      return 1000;
    }
  }, [threeCamera, threeRenderer, threeControls]);

  const isCesium = mode === "cesium";
  const isThree = mode === "three";
  const sceneLabel = isThree ? "3D navigation" : isCesium ? "Map navigation" : "Scene tools";

  if (hidden) return null;

  const renderCompass = () => {
    if (isCesium) {
      return (
        <CompassOverlay
          mode="cesium"
          getHeading={getCesiumHeading}
          headingUnit="radians"
          className="will-change-transform transition-transform duration-150 scale-[0.84]"
        />
      );
    }
    if (isThree) {
      return (
        <CompassOverlay
          mode="three"
          getHeading={getThreeHeading}
          className="will-change-transform transition-transform duration-150 scale-[0.84]"
        />
      );
    }
    return (
        <CompassOverlay
          mode="cesium"
          getHeading={() => 0}
          className="will-change-transform transition-transform duration-150 scale-[0.84]"
        />
    );
  };

  const renderScaleOverlay = () => (
    <MetricScaleOverlay
      mode={isCesium ? "cesium" : isThree ? "three" : "cesium"}
      getMetersIn100px={
        isCesium ? getCesiumMetersIn100px : isThree ? getThreeMetersIn100px : () => 100
      }
      className="will-change-transform transition-transform duration-150"
    />
  );

  return (
    <>
    <OverlaySlot slot="bottom-right">
      <div
        className={`pointer-events-auto transition-opacity duration-300 ${
          isMounted ? "opacity-100" : "opacity-0"
        }`}
        data-no-deck-wheel
      >
        <div className="scene-utilities">
          <div className="scene-utilities__label">
            {sceneLabel}
          </div>
          <div className="scene-utilities__stack">
            {showCompass ? renderCompass() : null}
            {renderScaleOverlay()}
          </div>
        </div>
      </div>
    </OverlaySlot>
    </>
  );
};

export default GlobalOverlays;
