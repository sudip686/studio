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
}) {
  const base =
    "fixed z-50 pointer-events-none p-3 sm:p-4 md:p-5 flex gap-3 md:gap-4";
  const safeAreaTop =
    "pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]";
  const safeAreaBottom =
    "pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]";

  const alignMap: Record<string, string> = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
  };

  let posClass = "";
  let layout = "flex-col"; // stack by default in a column

  switch (position) {
    case "top-left":
      posClass = `top-0 left-0 ${safeAreaTop}`;
      break;
    case "top-right":
      posClass = `top-0 right-0 ${safeAreaTop}`;
      break;
    case "bottom-left":
      posClass = `bottom-0 left-0 ${safeAreaBottom}`;
      break;
    case "bottom-right":
      posClass = `bottom-0 right-0 ${safeAreaBottom}`;
      break;
    case "top-center":
      posClass = `top-0 left-1/2 -translate-x-1/2 ${safeAreaTop}`;
      layout = "flex-row"; // center slots can row-stack
      break;
    case "bottom-center":
      posClass = `bottom-0 left-1/2 -translate-x-1/2 ${safeAreaBottom}`;
      layout = "flex-row"; // center slots can row-stack
      break;
  }

  return (
    <div className={`${base} ${posClass} ${layout} ${alignMap[align]} max-w-full`}>
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

      {/* Top-right slot: Compass (stacked), room for additional controls if needed */}
      <Slot position="top-right" align="end">
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