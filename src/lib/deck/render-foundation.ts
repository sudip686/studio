import * as THREE from 'three';

const exposure = {
  topography: 1.04,
  drillholes: 1.12,
  subsurface: 1.08,
  resource: 1.12,
  mine_planning: 1,
  metallurgy: .93,
};

export function configurePresentationRenderer(renderer: THREE.WebGLRenderer, chapter: keyof typeof exposure) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = exposure[chapter];
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/** Cap the backing store as well as DPR. Hold it steady while orbiting. */
export function sizePresentationRenderer(
  renderer: THREE.WebGLRenderer, width: number, height: number, pixelRatio: number, maximumRatio: number,
) {
  const pixelBudget = 3840 * 2160;
  const budgetRatio = Math.sqrt(pixelBudget / (width * height));
  const ratio = Math.min(pixelRatio, maximumRatio, budgetRatio);
  renderer.setDrawingBufferSize(width, height, ratio);
  return ratio;
}
