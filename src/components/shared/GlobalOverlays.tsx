/**
 * Global overlays that appear on all views - compass, scale, and measurement tool
 */

import { useCesium } from '@/contexts/cesium-context';
import { useThreeSceneSafe } from '@/contexts/three-scene-context';
import { CompassOverlay, MetricScaleOverlay } from '@/components/overlays';
import { Panel } from '@/components/ui/panel';

interface GlobalOverlaysProps {
  mode: 'cesium' | 'three' | 'none';
  hidden?: boolean;
  measurementMode?: boolean;
  currentView?: string;
}

const GlobalOverlays = ({ mode, hidden = false, measurementMode = false, currentView }: GlobalOverlaysProps) => {
  const { viewer: cesiumViewer } = useCesium();
  const threeSceneContext = useThreeSceneSafe();
  const { camera: threeCamera, controls: threeControls, renderer: threeRenderer } = threeSceneContext || {};

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

    // Get distance to center of screen
    const center = new (window as any).Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
    const ray = camera.getPickRay(center);
    const intersection = scene.globe.pick(ray, scene);

    if (!(window as any).Cesium.defined(intersection)) return 1000;

    const distance = (window as any).Cesium.Cartesian3.distance(camera.positionWC, intersection);

    // Estimate meters per pixel at this distance
    const fov = camera.frustum.fovy;
    const metersPerPixel = (2 * distance * Math.tan(fov / 2)) / canvas.clientHeight;

    return metersPerPixel * 100;
  };

  const getThreeHeading = () => {
    if (!threeControls) return 0;
    // For Three.js OrbitControls, getAzimuthalAngle() gives the horizontal rotation
    // This is the correct way to get compass heading in Three.js views
    return threeControls.getAzimuthalAngle();
  };

  const getThreeMetersIn100px = () => {
    if (!threeCamera || !threeRenderer) return 1000;

    try {
      const canvas = threeRenderer.domElement;
      if (!canvas) return 1000;

      // Get camera distance to scene center (assuming scene is centered at origin)
      const cameraDistance = threeCamera.position.length();

      // Use camera's field of view to calculate meters per pixel
      const fovRadians = (threeCamera.fov * Math.PI) / 180;
      const metersPerPixel = (2 * cameraDistance * Math.tan(fovRadians / 2)) / canvas.clientHeight;

      return metersPerPixel * 100;
    } catch (error) {
      console.warn('Error calculating Three.js scale:', error);
      return 1000;
    }
  };

  return (
    <>
      {/* Always show compass and scale on all pages */}
      <div className={`pointer-events-none absolute right-4 bottom-4 flex flex-col items-end gap-4 ${hidden ? 'opacity-0' : ''}`}>
        {mode === 'cesium' && (
          <CompassOverlay
            mode="cesium"
            getHeading={getCesiumHeading}
            className="pointer-events-auto"
          />
        )}
        {mode === 'three' && (
          <CompassOverlay
            mode="three"
            getHeading={getThreeHeading}
            className="pointer-events-auto"
          />
        )}
        {mode === 'none' && (
          <CompassOverlay
            mode="cesium"
            getHeading={() => 0}
            className="pointer-events-auto"
          />
        )}
        <MetricScaleOverlay
          mode={mode === 'cesium' ? 'cesium' : mode === 'three' ? 'three' : 'cesium'}
          getMetersIn100px={mode === 'cesium' ? getCesiumMetersIn100px : mode === 'three' ? getThreeMetersIn100px : () => 100}
          className="pointer-events-auto"
        />
      </div>
    </>
  );
};

export default GlobalOverlays;
