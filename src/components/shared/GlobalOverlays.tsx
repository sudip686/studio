/**
 * Global overlays that appear on all views - compass, scale, and measurement tool
 */

import { useCesium } from '@/contexts/cesium-context';
import { useThreeScene } from '@/contexts/three-scene-context';
import { CompassOverlay, MetricScaleOverlay } from '@/components/overlays';

interface GlobalOverlaysProps {
  mode: 'cesium' | 'three' | 'none';
  hidden?: boolean;
  measurementMode?: boolean;
  currentView?: string;
}

const GlobalOverlays = ({ mode, hidden = false, measurementMode = false, currentView }: GlobalOverlaysProps) => {
  const { viewer: cesiumViewer } = useCesium();
  const { camera: threeCamera } = useThreeScene();

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
    if (!threeCamera) return 0;
    // For Three.js, we need to calculate heading from camera direction
    // This is a simplified implementation
    const direction = threeCamera.getWorldDirection(new (window as any).THREE.Vector3());
    const heading = Math.atan2(direction.x, direction.z);
    return heading;
  };

  const getThreeMetersIn100px = () => {
    if (!threeCamera) return 1000;
    // Simplified scale calculation for Three.js
    // This would need more sophisticated implementation based on your scene scale
    return 1000;
  };

  return (
    <>
      {mode === 'cesium' && (
        <div className={`absolute right-4 bottom-4 flex flex-row gap-4 items-end ${hidden ? 'opacity-0' : ''}`}>
          <MetricScaleOverlay
            mode="cesium"
            getMetersIn100px={getCesiumMetersIn100px}
          />
          <CompassOverlay
            mode="cesium"
            getHeading={getCesiumHeading}
          />
        </div>
      )}
      {mode === 'three' && (
        <div className={`absolute right-4 bottom-4 flex flex-row gap-4 items-end ${hidden ? 'opacity-0' : ''}`}>
          <MetricScaleOverlay
            mode="three"
            getMetersIn100px={getThreeMetersIn100px}
          />
          <CompassOverlay
            mode="three"
            getHeading={getThreeHeading}
          />
        </div>
      )}
    </>
  );
};

export default GlobalOverlays;
