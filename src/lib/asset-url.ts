const R2_STREAM_ASSETS = new Set([
  '/height.bin',
  '/height_hires.bin',
  '/height_preview_1024.bin',
  '/terrain_texture_8k.jpg',
  '/texture_rgb_8192.png',
  '/geologicalModel.glb',
  '/assay_data.geojson',
  '/lithology_data.geojson',
  '/resource_model.bin',
  '/media/tanga-first-slide-story-poster.jpg',
  '/media/tanga-google-earth-intro-corrected-preview.mp4',
]);

/** Keep public assets same-origin, including R2 drill/model files on preview hosts. */
export function assetUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const [pathname, query = ''] = normalized.split(/\?([\s\S]*)/, 2);
  const base = pathname === '/BlockModel.geojson'
    ? '/api/block-model'
    : R2_STREAM_ASSETS.has(pathname)
      ? `/api/assets${pathname}`
      : pathname;
  return query ? `${base}?${query}` : base;
}
