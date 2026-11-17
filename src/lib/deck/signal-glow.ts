import * as THREE from 'three';

/** Small additive halos rendered with the scene depth buffer. */
export function createSignalGlow(count: number, color: number, size: number) {
  const dimension = 32;
  const pixels = new Uint8Array(dimension * dimension * 4);
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const radius = Math.hypot((x + .5) * 2 / dimension - 1, (y + .5) * 2 / dimension - 1);
      const offset = (y * dimension + x) * 4;
      pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - radius) ** 3 * 255)], offset);
    }
  }
  const texture = new THREE.DataTexture(pixels, dimension, dimension);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  const material = new THREE.PointsMaterial({
    color, size, map: texture, opacity: .64, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false,
    toneMapped: false, fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {points, positions};
}
