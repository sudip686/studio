// utils/three-fit.ts
import * as THREE from 'three';

export function fitCameraToGroup(
  camera: THREE.PerspectiveCamera,
  controls: any | undefined,
  group: THREE.Group,
  {
    padding = 1.3,       // 30% margin around the box
    minDistance = 50,    // never get too close
    tiltDeg = 30,        // slight top-down look
  } = {}
) {
  // Compute bounds
  const box = new THREE.Box3().setFromObject(group);
  if (!box.isEmpty()) {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Frame based on largest dimension
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    let distance = (maxDim / (2 * Math.tan(fov / 2))) * padding;
    distance = Math.max(distance, minDistance);

    // Set camera position behind & above target
    const phi = THREE.MathUtils.degToRad(90 - tiltDeg); // elevation angle
    const theta = THREE.MathUtils.degToRad(35);         // azimuth
    const offset = new THREE.Vector3(
      distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.sin(theta)
    );

    camera.position.copy(center).add(offset);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }
}
