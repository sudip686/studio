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
      } else if (material instanceof THREE.MeshBasicMaterial) {
        // Evidence palettes and mapped surfaces are authored colors. Keep
        // them out of the renderer's tone curve so the same class never
        // shifts hue/brightness when a view or scene exposure changes.
        material.toneMapped = false;
        material.dithering = false;
        material.userData.deckCameraStableColor = true;
        material.needsUpdate = true;
      } else if (material instanceof THREE.MeshPhongMaterial) {
        material.specular.setRGB(0, 0, 0);
        material.shininess = 0;
        material.userData.deckCameraStableColor = true;
        material.needsUpdate = true;
      }
    }

    // Grade cells and engineered pads are reference colors, not shadow
    // receivers. Shadow-map filtering on large, coplanar instanced layers can
    // shimmer as the camera moves, even when the sun and shadow frustum stay
    // fixed. The terrain and plant structures retain their authored shadows.
    const fixedPaletteSurface = /(?:plant pad|concept pad|hardstand|cleared apron|cut and fill transition|terraced conceptual excavation|internal pit access ramp|illustrative (?:tailings|waste|water|pond|embankment|beach|liner|grading))/i.test(object.name);
    if (object.userData.deckLayer === 'blocks' || fixedPaletteSurface) {
      const shadowOwner = object as THREE.Object3D & {castShadow?: boolean; receiveShadow?: boolean};
      shadowOwner.castShadow = false;
      shadowOwner.receiveShadow = false;
      object.userData.deckCameraStableColor = true;

      // Terrain-conforming concept surfaces are only centimetres above the
      // DEM. A small fixed depth bias prevents their color buffers from
      // competing with the terrain during orbit and zoom, without lifting the
      // geometry or changing its recorded site elevation.
      for (const material of entries) {
        if (!('polygonOffset' in material)) continue;
        const polygonMaterial = material as THREE.Material & {polygonOffset: boolean; polygonOffsetFactor: number; polygonOffsetUnits: number};
        polygonMaterial.polygonOffset = true;
        polygonMaterial.polygonOffsetFactor = -1;
        polygonMaterial.polygonOffsetUnits = -2;
        polygonMaterial.needsUpdate = true;
      }
    }
  });
}
