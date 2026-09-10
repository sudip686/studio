import {assetUrl} from './asset-url';
import {cachedDeckAsset} from './cached-deck-asset';

// One background transfer at a time, in presentation priority order.
// Only assets used by this deck; exclude unused 200 MB legacy regional rasters.
export const GEOLOGY_PRELOAD_PATHS = [
  '/geologicalModel.glb',
  '/assay_data.geojson', '/lithology_data.geojson',
  '/BlockModel.geojson',
  '/height_hires.bin', '/terrain_hires_meta.json',
  '/terrain_texture_hires.jpg', '/height_preview_1024.bin',
  '/terrain_preview_meta.json',
] as const;
let warmup: Promise<void> | undefined;

export function preloadGeologyAssets(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (warmup) return warmup;
  warmup = (async () => {
    const warm = async (path: string) => {
      try {
        const remote = assetUrl(path);
        let response: Response;
        try { response = await cachedDeckAsset(remote, {priority: 'low'}); }
        catch (error) {
          if (remote === path) throw error;
          response = await cachedDeckAsset(path === '/BlockModel.geojson' ? '/api/block-model' : path, {priority: 'low'});
        }
        if (!response.ok) response = await cachedDeckAsset(path === '/BlockModel.geojson' ? '/api/block-model' : path, {priority: 'low'});
        if (!response.ok) return;
        // Consume the body even if persistent storage is unavailable.
        await response.arrayBuffer();
      } catch { /* Opportunistic only; the slide retains its normal retry path. */ }
    };
    for (const path of GEOLOGY_PRELOAD_PATHS) await warm(path);
  })().finally(() => { warmup = undefined; });
  return warmup;
}
