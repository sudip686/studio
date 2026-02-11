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

function computeBoxFromObject(object: THREE.Object3D): THREE.Box3 {
    const box = new THREE.Box3();
    const v1 = new THREE.Vector3();

    object.updateMatrixWorld(true);

    object.traverse((node) => {
        if (node instanceof THREE.InstancedMesh) {
            const mesh = node;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const geomBox = mesh.geometry.boundingBox;

            if (geomBox) {
                const matrix = new THREE.Matrix4();
                for (let i = 0; i < mesh.count; i++) {
                    mesh.getMatrixAt(i, matrix);
                    // Matrix is local to the InstancedMesh.
                    // We need to apply the InstancedMesh's world matrix to get to world space.
                    // But wait, box.setFromObject works in World Space.
                    // InstancedMesh.getMatrixAt returns local transformation of the instance relative to the Mesh.
                    // The Mesh itself has a world matrix.
                    
                    const instanceMatrix = matrix.multiply(mesh.matrixWorld); // Wrong order? 
                    // Instance local * Mesh world = Instance World
                    // Actually: Instance Matrix is (I * M_instance).
                    // World Position = M_mesh * M_instance * v_local.
                    // So we should multiply mesh.matrixWorld * matrix.
                    
                    // But matrix multiplication in Three.js: a.multiply(b) -> a = a * b.
                    // We want: World = MeshWorld * InstanceLocal.
                    // So: newMatrix.copy(mesh.matrixWorld).multiply(matrix).
                    
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

export function fitCameraToGroupWorldAware(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  group: THREE.Object3D,
  padding = 1.2
) {
  // Use custom box computation to handle InstancedMesh
  const box = computeBoxFromObject(group);

  if (!box.isEmpty()) {
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

    const dir = new THREE.Vector3(0, 0, 1);
    const newPos = center.clone().add(dir.multiplyScalar(distance));
    camera.near = Math.max(0.5, distance / 1000);
    camera.far = distance * 10000; // Increased far plane just in case
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