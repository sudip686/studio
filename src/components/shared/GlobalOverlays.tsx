/**
 * Global overlays that appear on all views - compass, scale, and measurement tool
 * Centralized fixed slots to prevent overlap and ensure smooth UI across resolutions
 */

import { useCesium } from "@/contexts/cesium-context";
import { useThreeSceneSafe } from "@/contexts/three-scene-context";
import { CompassOverlay, LogoOverlay, MetricScaleOverlay } from "@/components/overlays";

interface GlobalOverlaysProps {
  mode: "cesium" | "three" | "none";
  hidden?: boolean;
  measurementMode?: boolean;
  currentView?: string;
  onLogoClick?: () => void;
}

/**
 * Fixed UI slot container (top-left/right, bottom-left/right, top-center, bottom-center)
 * - slot wrappers are pointer-events-none; children are pointer-events-auto to avoid blocking scene
 * - includes safe-area padding to avoid notches
 * - responsive stacking and gap to avoid collisions
 */
function Slot({
  children,
  position,
  align = "start",
  className = "",
}: {
  children: React.ReactNode;
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const base =
    "fixed z-50 pointer-events-none p-3 sm:p-4 md:p-5 flex gap-3 md:gap-4";
  const alignMap: Record<string, string> = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
  };

  let posClass = "";
  let layout = "flex-col"; // stack by default in a column
  const style: React.CSSProperties = {};

  switch (position) {
    case "top-left":
      posClass = "top-0 left-0";
      style.paddingTop = "calc(env(safe-area-inset-top) + var(--header-height, 0px))";
      style.paddingLeft = "calc(env(safe-area-inset-left) + var(--chapter-sidebar-width, 0px))";
      break;
    case "top-right":
      posClass = "top-0 right-0";
      style.paddingTop = "calc(env(safe-area-inset-top) + var(--header-height, 0px))";
      style.paddingRight = "calc(env(safe-area-inset-right) + var(--chapter-trigger-width, 0px))";
      break;
    case "bottom-left":
      posClass = "bottom-0 left-0";
      style.paddingBottom = "env(safe-area-inset-bottom)";
      style.paddingLeft = "calc(env(safe-area-inset-left) + var(--chapter-sidebar-width, 0px))";
      break;
    case "bottom-right":
      posClass = "bottom-0 right-0";
      style.paddingBottom = "env(safe-area-inset-bottom)";
      style.paddingRight = "env(safe-area-inset-right)";
      break;
    case "top-center":
      posClass = "top-0 left-1/2 -translate-x-1/2";
      layout = "flex-row";
      style.paddingTop = "calc(env(safe-area-inset-top) + var(--header-height, 0px))";
      break;
    case "bottom-center":
      posClass = "bottom-0 left-1/2 -translate-x-1/2";
      layout = "flex-row";
      style.paddingBottom = "env(safe-area-inset-bottom)";
      break;
  }

  return (
    <div
      className={`${base} ${posClass} ${layout} ${alignMap[align]} max-w-full ${className}`}
      style={style}
    >
      <div className="pointer-events-auto flex flex-col gap-3 md:gap-4 max-w-full">
        {children}
      </div>
    </div>
  );
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

  const getThreeHeading = () => {
    if (!threeControls) return 0;
    // OrbitControls getAzimuthalAngle = horizontal rotation (heading)
    return threeControls.getAzimuthalAngle();
  };

  const getThreeMetersIn100px = () => {
    if (!threeCamera || !threeRenderer) return 1000;

    try {
      const canvas = threeRenderer.domElement;
      if (!canvas) return 1000;

      const cameraDistance = threeCamera.position.length();
      const fovRadians = (threeCamera as any).fov
        ? ((threeCamera as any).fov * Math.PI) / 180
        : Math.PI / 4;
      const metersPerPixel =
        (2 * cameraDistance * Math.tan(fovRadians / 2)) / canvas.clientHeight;

      return metersPerPixel * 100;
    } catch {
      return 1000;
    }
  };

  const isCesium = mode === "cesium";
  const isThree = mode === "three";

  return (
    <>
      {/* Top-left slot: Logo */}
      <Slot position="top-left" align="start">
        <LogoOverlay className="will-change-transform transition-transform duration-150" onClick={onLogoClick} />
      </Slot>

      {/* Top-right slot: Compass (desktop/tablet). Hidden on small screens to avoid header/hamburger. */}
      <Slot position="top-right" align="end" className="hidden md:flex">
        {isCesium && (
          <CompassOverlay
            mode="cesium"
            getHeading={getCesiumHeading}
            className="will-change-transform transition-transform duration-150"
          />
        )}
        {isThree && (
          <CompassOverlay
            mode="three"
            getHeading={getThreeHeading}
            className="will-change-transform transition-transform duration-150"
          />
        )}
        {!isCesium && !isThree && (
          <CompassOverlay
            mode="cesium"
            getHeading={() => 0}
            className="will-change-transform transition-transform duration-150"
          />
        )}
      </Slot>

      {/* Bottom-right slot: Compass (mobile-first) */}
      <Slot position="bottom-right" align="end" className="flex md:hidden">
        {isCesium && (
          <CompassOverlay
            mode="cesium"
            getHeading={getCesiumHeading}
            className="will-change-transform transition-transform duration-150"
          />
        )}
        {isThree && (
          <CompassOverlay
            mode="three"
            getHeading={getThreeHeading}
            className="will-change-transform transition-transform duration-150"
          />
        )}
        {!isCesium && !isThree && (
          <CompassOverlay
            mode="cesium"
            getHeading={() => 0}
            className="will-change-transform transition-transform duration-150"
          />
        )}
      </Slot>

      {/* Bottom-left slot: Metric scale */}
      <Slot position="bottom-left" align="start">
        <MetricScaleOverlay
          mode={isCesium ? "cesium" : isThree ? "three" : "cesium"}
          getMetersIn100px={
            isCesium ? getCesiumMetersIn100px : isThree ? getThreeMetersIn100px : () => 100
          }
          className="will-change-transform transition-transform duration-150"
        />
      </Slot>

      {/* Reserve top-center/bottom-center for future unique controls if needed */}
      {/* <Slot position="top-center" align="center"></Slot>
      <Slot position="bottom-center" align="center"></Slot> */}
    </>
  );
};

export default GlobalOverlays;