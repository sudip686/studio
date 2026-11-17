import * as THREE from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

const STUDIO_LIGHT = '/presentation-assets/studio-small-08-1k.hdr';

/** Attach a studio reflection only to authored process-equipment finishes. */
export function loadStudioLighting(
  renderer: THREE.WebGLRenderer,
  equipment: THREE.Object3D,
  onStatus: (status: 'ready' | 'fallback') => void,
) {
  let cancelled = false;
  let environment: THREE.WebGLRenderTarget | undefined;
  const finishes = new Set<THREE.MeshStandardMaterial>();
  equipment.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial && material.userData.studioFinish) finishes.add(material);
    }
  });
  new RGBELoader().load(STUDIO_LIGHT, texture => {
    if (cancelled || renderer.getContext().isContextLost()) {
      texture.dispose();
      return;
    }
    const generator = new THREE.PMREMGenerator(renderer);
    try {
      environment = generator.fromEquirectangular(texture);
      for (const material of finishes) {
        material.envMap = environment.texture;
        material.envMapIntensity = .42;
        material.needsUpdate = true;
      }
      onStatus('ready');
    } catch {
      onStatus('fallback');
    } finally {
      generator.dispose();
      texture.dispose();
    }
  }, undefined, () => { if (!cancelled) onStatus('fallback'); });
  return (disposeGpuResources: boolean) => {
    cancelled = true;
    if (environment && disposeGpuResources) environment.dispose();
  };
}
