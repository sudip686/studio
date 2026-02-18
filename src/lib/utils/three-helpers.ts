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

function computeBoxFromObject(object: THREE.Object3D, filter?: (o: THREE.Object3D) => boolean): THREE.Box3 {
    const box = new THREE.Box3();
    const v1 = new THREE.Vector3();

    object.updateMatrixWorld(true);

    object.traverse((node) => {
        if (filter && !filter(node)) return;

        if (node instanceof THREE.InstancedMesh) {
            const mesh = node;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const geomBox = mesh.geometry.boundingBox;

            if (geomBox) {
                const matrix = new THREE.Matrix4();
                for (let i = 0; i < mesh.count; i++) {
                    mesh.getMatrixAt(i, matrix);
                    const worldMatrix = new THREE.Matrix4().copy(mesh.matrixWorld).multiply(matrix);
                    const instanceBox = geomBox.clone().applyMatrix4(worldMatrix);
                    box.union(instanceBox);
                }
            }
        } else if (node instanceof THREE.Mesh) {
            if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
            const geomBox = node.geometry.boundingBox;
            if (geomBox) {
                 const worldBox = geomBox.clone().applyMatrix4(node.matrixWorld);
                 box.union(worldBox);
            }
        }
    });

    return box;
}

type FitOptions = {
  padding?: number;
  // Limit the horizontal (XZ) area considered when fitting. Helps avoid huge terrain meshes
  // forcing the camera to zoom out too far. Units are in scene meters.
  clampXZRadius?: number;
  // Safety clamps for distance from target
  minDistance?: number;
  maxDistance?: number;
  // Optional direction from which to view the scene (defaults to slightly top-down)
  viewDir?: THREE.Vector3;
  // Optional filter to include only specific objects in bounds calculation
  filter?: (object: THREE.Object3D) => boolean;
};

export function fitCameraToGroupWorldAware(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  group: THREE.Object3D,
  paddingOrOptions: number | FitOptions = 1.2
) {
  const opts: FitOptions = typeof paddingOrOptions === 'number' ? { padding: paddingOrOptions } : (paddingOrOptions ?? {});
  const padding = opts.padding ?? 1.2;
  const clampR = opts.clampXZRadius;
  const minDistance = opts.minDistance ?? 25;
  const maxDistance = opts.maxDistance ?? Infinity;
  const viewDir = opts.viewDir ?? new THREE.Vector3(0, 1, 1).normalize();
  
  // Use custom box computation to handle InstancedMesh
  const box = computeBoxFromObject(group, opts.filter);

  if (!box.isEmpty()) {
    // Optionally clamp the horizontal extent to avoid over-zoom when a very large
    // terrain mesh is present but we only want to frame a local region.
    if (Number.isFinite(clampR as number)) {
      const preCenter = new THREE.Vector3();
      box.getCenter(preCenter);
      const clampBox = new THREE.Box3(
        new THREE.Vector3(preCenter.x - (clampR as number), box.min.y, preCenter.z - (clampR as number)),
        new THREE.Vector3(preCenter.x + (clampR as number), box.max.y, preCenter.z + (clampR as number))
      );
      box.intersect(clampBox);
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Guard against zero size (single point)
    const effectiveSize = maxDim > 0.1 ? maxDim : 100;

    const fov = (camera.fov * Math.PI) / 180;
    let distance = (effectiveSize / 2) / Math.tan(fov / 2);
    distance *= padding;
    // Apply distance clamps
    distance = Math.max(minDistance, Math.min(distance, maxDistance));

    // Use an oblique angle (Bird's eye view) instead of side view
    const dir = viewDir.clone().normalize();
    const newPos = center.clone().add(dir.multiplyScalar(distance));
    
    // Ensure far plane is sufficient
    const far = Math.max(distance * 10, 5_000_000);
    camera.near = Math.max(0.1, Math.min(distance / 1000, 10));
    camera.far = far;
    camera.updateProjectionMatrix();

    camera.position.copy(newPos);
    controls.target.copy(center);
    controls.update();
  } else {
      console.warn('[fitCameraToGroupWorldAware] Bounding box is empty.');
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