import * as THREE from 'three';

/** Architectural context for the standalone plant exhibit. The mine-planning
 * chapter owns the mapped terrain and the project road alignments. */
export function createMetallurgyLandscape(plantScale: THREE.Vector3) {
  const context = new THREE.Group();
  context.name = 'Illustrative plant surroundings';
  context.scale.copy(plantScale);

  const geometry = new THREE.PlaneGeometry(4700, 4700, 180, 180);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const graded = new THREE.Color(0x927d62);
  const dryGrass = new THREE.Color(0x9a9769);
  const scrub = new THREE.Color(0x606e53);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const distance = Math.max(Math.abs(x), Math.abs(z));
    const outside = THREE.MathUtils.smoothstep(distance, 275, 600);
    const swale = Math.sin(x * .006 + Math.sin(z * .004)) * Math.cos(z * .007);
    const ridge = .5 + .5 * Math.sin(x * .004 - z * .002 + 1.2);
    const rise = outside * (10 * swale + ridge * ridge * (12 + 75 * THREE.MathUtils.smoothstep(distance, 700, 1900)));
    position.setY(i, .30 + rise);
    const meadow = THREE.MathUtils.smoothstep(distance + 12 * swale, 246, 320);
    color.copy(dryGrass).lerp(scrub, .5 + .25 * swale + .22 * Math.cos(z * .028 + x * .013));
    color.lerp(graded, 1 - meadow).multiplyScalar(.96 + .04 * Math.sin(z * .09) * Math.cos(x * .048));
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const soil = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1});
  soil.userData.terrainHorizon = true;
  // Paint the approach on the ground itself. It joins the existing southern
  // gate at x=30, z=246 in plant coordinates, and follows the rolling land.
  soil.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSiteXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSiteXZ = position.xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSiteXZ;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float along = max(0.0, vSiteXZ.y - 246.0);
        float bend = 84.0 * (1.0 - cos(along * 0.005)) + along * smoothstep(150.0, 520.0, along) * 0.22;
        float across = abs(vSiteXZ.x - 30.0 - bend);
        float aa = max(0.15, fwidth(across));
        float entry = smoothstep(245.0, 246.0, vSiteXZ.y);
        float shoulder = (1.0 - smoothstep(8.0-aa, 8.0+aa, across)) * entry;
        float carriageway = (1.0 - smoothstep(6.0-aa, 6.0+aa, across)) * entry;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.28,.224,.157), shoulder);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.075,.086,.079), carriageway);
      `);
  };
  const terrain = new THREE.Mesh(geometry, soil);
  terrain.name = 'Illustrative graded ground and gate approach';
  terrain.receiveShadow = true;
  context.add(terrain);
  return context;
}
