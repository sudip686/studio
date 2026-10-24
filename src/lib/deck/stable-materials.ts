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
    // Treat all cartographic/site-surface categories as fixed palette layers,
    // including facility surfaces whose authored names vary between chapters.
    // A narrow list missed names such as "Conceptual plant earthwork batters"
    // and "Waste-rock bench", allowing their shadows/depth behavior to differ
    // from the other pads when the camera moved.
    const fixedPaletteSurface = /(?:\b(?:pad|apron|hardstand|earthwork|bench|berm|service lane|road marking|haul road)\b|cut and fill transition|terraced conceptual excavation|internal pit access ramp|illustrative (?:tailings|waste|water|pond|embankment|beach|liner|grading))/i.test(object.name);
    const fixedColorLayer = object.userData.deckLayer === 'blocks' || fixedPaletteSurface;
    let entries = materialOwner.material
      ? Array.isArray(materialOwner.material) ? materialOwner.material : [materialOwner.material]
      : [];

    // Grade cells and proposed earthworks are categorical display colors.
    // Convert any future lit material on these layers to an unlit equivalent
    // so orbiting cannot change their palette through diffuse/specular shading.
    if (object instanceof THREE.Mesh && fixedColorLayer && entries.some((material) => !(material instanceof THREE.MeshBasicMaterial))) {
      entries = entries.map((material) => {
        if (material instanceof THREE.MeshBasicMaterial) return material;
        const source = material as THREE.MeshStandardMaterial & {vertexColors?: boolean; wireframe?: boolean};
        const fixed = new THREE.MeshBasicMaterial({
          color: source.color ?? 0xffffff,
          map: source.map ?? null,
          alphaMap: source.alphaMap ?? null,
          alphaTest: source.alphaTest ?? 0,
          opacity: source.opacity ?? 1,
          transparent: source.transparent ?? false,
          side: source.side ?? THREE.FrontSide,
          vertexColors: source.vertexColors ?? false,
          wireframe: source.wireframe ?? false,
          toneMapped: false,
        });
        fixed.depthWrite = source.depthWrite;
        fixed.depthTest = source.depthTest;
        fixed.clippingPlanes = source.clippingPlanes;
        fixed.clipIntersection = source.clipIntersection;
        fixed.clipShadows = source.clipShadows;
        fixed.polygonOffset = source.polygonOffset;
        fixed.polygonOffsetFactor = source.polygonOffsetFactor;
        fixed.polygonOffsetUnits = source.polygonOffsetUnits;
        fixed.userData = {...source.userData};
        fixed.userData.deckCameraStableColor = true;
        return fixed;
      });
      materialOwner.material = Array.isArray(materialOwner.material) ? entries : entries[0];
    }

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
    if (fixedColorLayer) {
      const shadowOwner = object as THREE.Object3D & {castShadow?: boolean; receiveShadow?: boolean};
      shadowOwner.castShadow = false;
      shadowOwner.receiveShadow = false;
      object.userData.deckCameraStableColor = true;

      // Categorical meshes must participate in the depth buffer. A few
      // generated layers were authored as always-on-top overlays; when two
      // differently colored InstancedMeshes overlap, Three.js sorts those
      // objects relative to the camera and the visible class can flip during
      // an orbit. Keep opaque evidence surfaces depth-tested and depth-writing
      // so visibility follows geometry rather than draw order.
      for (const material of entries) {
        if (!('depthTest' in material) || !('depthWrite' in material)) continue;
        const depthMaterial = material as THREE.Material & {depthTest: boolean; depthWrite: boolean; transparent?: boolean; opacity?: number};
        depthMaterial.depthTest = true;
        if (!depthMaterial.transparent || (depthMaterial.opacity ?? 1) >= 0.999) {
          depthMaterial.depthWrite = true;
        }
        depthMaterial.needsUpdate = true;
      }

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
