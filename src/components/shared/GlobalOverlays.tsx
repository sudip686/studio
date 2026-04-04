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
  measurementMode?: boolean;
  currentView?: string;
  onLogoClick?: () => void;
}

const GlobalOverlays = ({
  mode,
  hidden = false,
  currentView,
}: GlobalOverlaysProps) => {
  const { viewer: cesiumViewer } = useCesium();
  const [isMounted, setIsMounted] = useState(false);
  const threeSceneContext = useThreeSceneSafe();
  const threeCamera = threeSceneContext?.camera;
  const threeControls = threeSceneContext?.controls;
  const threeRenderer = threeSceneContext?.renderer;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (hidden) return null;

  const getCesiumHeading = () => {
    if (!cesiumViewer || cesiumViewer.isDestroyed()) return 0;
    return cesiumViewer.camera.heading;
  };

  const getCesiumMetersIn100px = () => {
    if (!cesiumViewer || cesiumViewer.isDestroyed()) return 1000;
    const scene = cesiumViewer.scene;
    const camera = scene.camera;
    const canvas = scene.canvas;

    const Cesium = (window as any).Cesium;
    if (!Cesium) return 1000;

    // Get distance to center of screen
    const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
    const ray = camera.getPickRay(center);
    const intersection = scene.globe.pick(ray, scene);

    if (!Cesium.defined(intersection)) {
        // Fallback calculation based on height
        const cartographic = camera.positionCartographic;
        const height = cartographic.height;
        const fov = camera.frustum.fovy;
        return (2 * height * Math.tan(fov / 2)) / canvas.clientHeight * 100;
    }

    const distance = Cesium.Cartesian3.distance(camera.positionWC, intersection);

    // Estimate meters per pixel at this distance
    const fov = camera.frustum.fovy;
    const metersPerPixel = (2 * distance * Math.tan(fov / 2)) / canvas.clientHeight;

    return metersPerPixel * 100;
  };

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
  const panelClass = `${uiTheme.panel.border} ${uiTheme.panel.blur} ${uiTheme.panel.radius} ${uiTheme.panel.shadow}`;
  const sceneLabel = currentView ? currentView.replace(/_/g, " ") : isThree ? "3D scene" : "map scene";

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

  const renderCompassPanel = () => (
    <div
      className={`pointer-events-auto ${panelClass} inline-flex w-fit self-end flex-col items-end gap-2 bg-[linear-gradient(180deg,rgba(18,12,8,0.92),rgba(10,9,8,0.78))] p-1.5`}
    >
      {renderCompass()}
    </div>
  );

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
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-full border border-[#f1d2bf]/14 bg-[linear-gradient(180deg,rgba(24,16,12,0.88),rgba(10,9,8,0.78))] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#f1d2bf]/62 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            {sceneLabel}
          </div>
          <div className="flex items-end gap-2">
            {renderCompassPanel()}
            <div
              className={`pointer-events-auto ${panelClass} inline-flex items-center justify-center bg-[linear-gradient(180deg,rgba(24,16,12,0.88),rgba(10,9,8,0.76))] px-3 py-2`}
            >
              {renderScaleOverlay()}
            </div>
          </div>
        </div>
      </div>
    </OverlaySlot>
    </>
  );
};

export default GlobalOverlays;
