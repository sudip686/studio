import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type Center = { lon: number; lat: number };

export function projectLonLat(lon: number, lat: number, center: Center) {
  const R = 6371e3;
  const dLon = (lon - center.lon) * (Math.PI / 180);
  const dLat = (lat - center.lat) * (Math.PI / 180);
  const x = R * dLon * Math.cos(center.lat * Math.PI / 180);
  const z = R * dLat;
  return { x, z };
}

export function fitCameraToGroupWorldAware(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  group: THREE.Object3D,
  padding = 1.2
) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  if (!box.isEmpty()) {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    let distance = (maxDim / 2) / Math.tan(fov / 2);
    distance *= padding;

    const dir = new THREE.Vector3(0, 0, 1);
    const newPos = center.clone().add(dir.multiplyScalar(distance));
    camera.near = Math.max(0.5, distance / 1000);
    camera.far = distance * 1000;
    camera.updateProjectionMatrix();

    camera.position.copy(newPos);
    controls.target.copy(center);
    controls.update();
  }
}

export function fullyDispose(renderer: THREE.WebGLRenderer, mount: HTMLElement) {
  try { renderer.dispose(); } catch {}
  try { (renderer.getContext() as WebGLRenderingContext | WebGL2RenderingContext)?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
  try { mount.removeChild(renderer.domElement); } catch {}
}

export function disposeThree(mount: HTMLElement, renderer: THREE.WebGLRenderer, scene: THREE.Scene, controls?: OrbitControls, extra: THREE.Object3D[] = []) {
  try { controls?.dispose(); } catch {}
  if (scene) {
    scene.traverse((o:any) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      mats.forEach((m:any)=> m?.dispose?.());
    });
  }
  extra.forEach(o => {
    try { o.parent?.remove(o); } catch {}
  });
  try { renderer.dispose(); } catch {}
  try { (renderer.getContext() as any)?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
  try { mount.removeChild(renderer.domElement); } catch {}
}