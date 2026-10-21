const R2_STREAM_ASSETS = new Set([
  '/height.bin',
  '/texture_rgb_8192.png',
  '/media/tanga-google-earth-intro-corrected-preview.mp4',
]);

/** Keep public assets same-origin; stream only oversized R2 files through the server. */
export function assetUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const [pathname, query = ''] = normalized.split(/\?([\s\S]*)/, 2);
  const base = R2_STREAM_ASSETS.has(pathname) ? `/api/assets${pathname}` : pathname;
  return query ? `${base}?${query}` : base;
}
