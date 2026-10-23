import * as THREE from 'three';

/**
 * Keep fixed palette colors steady while the camera moves. Matte diffuse
 * shading retains shape; map/resource/pad colors should use unlit materials.
 * Translucent glazing keeps its authored surface response, but never samples
 * a view-dependent environment map.
 */
export function stabilizeSceneMaterialAppearance(root: THREE.Object3D) {
  root.traverse((object) => {
    const materialOwner = object as THREE.Object3D & {material?: THREE.Material | THREE.Material[]};
    const entries = materialOwner.material
      ? Array.isArray(materialOwner.material) ? materialOwner.material : [materialOwner.material]
      : [];

    for (const material of entries) {
      if ('fog' in material && material.fog) {
        material.fog = false;
        material.needsUpdate = true;
      }

      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMap = null;
        material.envMapIntensity = 0;
        if (!material.transparent) {
          material.metalness = 0;
          material.roughness = Math.max(material.roughness, 0.96);
        }
        if (material instanceof THREE.MeshPhysicalMaterial && !material.transparent) {
          material.clearcoat = 0;
          material.clearcoatRoughness = 1;
          material.sheen = 0;
        }
        material.userData.deckCameraStableColor = true;
        material.needsUpdate = true;
      } else if (material instanceof THREE.MeshPhongMaterial) {
        material.specular.setRGB(0, 0, 0);
        material.shininess = 0;
        material.userData.deckCameraStableColor = true;
        material.needsUpdate = true;
      }
    }
  });
}
