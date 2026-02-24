/**
 * Global overlays that appear on all views - compass, scale, and measurement tool
 * Centralized fixed slots to prevent overlap and ensure smooth UI across resolutions
 */

import { useCallback } from "react";
import * as THREE from "three";
import { useCesium } from "@/contexts/cesium-context";
import { useThreeSceneSafe } from "@/contexts/three-scene-context";
import { CompassOverlay, LogoOverlay, MetricScaleOverlay } from "@/components/overlays";
import MeasurementTool from "@/components/MeasurementTool";
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
  measurementMode = false,
  currentView,
  onLogoClick,
}: GlobalOverlaysProps) => {
  const { viewer: cesiumViewer } = useCesium();
  const threeSceneContext = useThreeSceneSafe();
  const { camera: threeCamera, controls: threeControls, renderer: threeRenderer } =
    threeSceneContext || {};

  if (hidden) return null;

  const getCesiumHeading = () => {
    if (!cesiumViewer || cesiumViewer.isDestroyed()) return 0;
    const heading = cesiumViewer.camera.heading;
    return heading;
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

    if (!Cesium.defined(intersection)) return 1000;

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
  const showCompassScale = true;
  const panelClass = `${uiTheme.panel.border} ${uiTheme.panel.blur} ${uiTheme.panel.radius} ${uiTheme.panel.shadow}`;

  const renderCompass = () => {
    if (isCesium) {
      return (
        <CompassOverlay
          mode="cesium"
          getHeading={getCesiumHeading}
          headingUnit="radians"
          className="will-change-transform transition-transform duration-150 scale-[0.9]"
        />
      );
    }
    if (isThree) {
      return (
        <CompassOverlay
          mode="three"
          getHeading={getThreeHeading}
          className="will-change-transform transition-transform duration-150 scale-[0.9]"
        />
      );
    }
    return (
      <CompassOverlay
        mode="cesium"
        getHeading={() => 0}
        className="will-change-transform transition-transform duration-150 scale-[0.9]"
      />
    );
  };

  const renderCompassPanel = () => (
    <div
      className={`pointer-events-auto ${panelClass} inline-flex w-fit self-end flex-col items-end gap-3 p-2`}
    >
      {renderCompass()}
    </div>
  );

  return (
    <>
      {/* Keep the logo in the shared overlay slots */}
      <OverlaySlot slot="top-left">
        <LogoOverlay className="will-change-transform transition-transform duration-150" onClick={onLogoClick} />
      </OverlaySlot>

      <OverlaySlot slot="top-left" wrapperClassName="w-full">
        <div className="pointer-events-auto">
          <MeasurementTool
            mode={isThree ? "three" : "cesium"}
            className="ui-dialog-inner"
          />
        </div>
      </OverlaySlot>

      {showCompassScale && (
        <OverlaySlot slot="bottom-right" wrapperClassName="flex w-full justify-end">
          {renderCompassPanel()}
        </OverlaySlot>
      )}

      {showCompassScale && (
        <OverlaySlot slot="bottom-center" wrapperClassName="flex w-full justify-center">
          <div className="pointer-events-auto">
            <MetricScaleOverlay
              mode={isCesium ? "cesium" : isThree ? "three" : "cesium"}
              getMetersIn100px={
                isCesium ? getCesiumMetersIn100px : isThree ? getThreeMetersIn100px : () => 100
              }
              className="will-change-transform transition-transform duration-150"
            />
          </div>
        </OverlaySlot>
      )}
    </>
  );
};

export default GlobalOverlays;
