import {assetUrl} from './asset-url';
import {cachedDeckAsset} from './cached-deck-asset';

export type DeckPreloadStage = 'topography' | 'drillholes' | 'subsurface' | 'resource';
export type DeckAssetPreparationStatus = 'not-prepared' | 'preparing' | 'cached' | 'loaded-not-cached' | 'failed' | 'cancelled';
export type DeckAssetPreparationItem = {
  stage: DeckPreloadStage;
  path: string;
  status: DeckAssetPreparationStatus;
  bytes: number;
  error?: string;
};

/**
 * Only warm the next authored chapter. The intro used to fetch every geology,
 * drilling and resource payload in sequence, including high-resolution rasters
 * that the Three.js presentation scenes do not use. These paths now mirror the
 * actual scene loaders so a warm request can be shared through the asset cache.
 */
export const DECK_PRELOAD_ASSETS: Record<DeckPreloadStage, readonly string[]> = {
  topography: [
    '/terrain_hires_meta.json?v=registered-grid-v2',
    '/terrain_context_512.bin?v=registered-grid-v2',
    '/survey_height_hires.bin?v=registered-grid-v2',
    '/survey_coverage_hires.bin?v=registered-grid-v2',
  ],
  drillholes: ['/assay_data.geojson', '/lithology_data.geojson'],
  subsurface: ['/geologicalModel.glb', '/terrain_texture_hires.jpg?v=survey-2026-10-21'],
  resource: ['/api/block-model'],
};

export const DECK_PRELOAD_ASSET_LABELS: Record<string, string> = {
  '/terrain_hires_meta.json?v=registered-grid-v2': 'Terrain metadata',
  '/terrain_context_512.bin?v=registered-grid-v2': 'Terrain elevation grid',
  '/survey_height_hires.bin?v=registered-grid-v2': 'Survey elevation grid',
  '/survey_coverage_hires.bin?v=registered-grid-v2': 'Survey coverage mask',
  '/assay_data.geojson': 'Assay intervals',
  '/lithology_data.geojson': 'Lithology intervals',
  '/geologicalModel.glb': 'Interpreted geology model',
  '/terrain_texture_hires.jpg?v=survey-2026-10-21': 'Survey terrain imagery',
  '/api/block-model': 'Reported resource block model',
};

export async function isDeckAssetCached(path: string) {
  if (typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    const cache = await caches.open('tanga-public-3d-v2');
    const cached = await cache.match(new URL(assetUrl(path), window.location.href).href);
    const storedAt = Number(cached?.headers.get('x-tanga-stored-at'));
    return Boolean(cached && Number.isFinite(storedAt) && Date.now() - storedAt < 24 * 60 * 60 * 1000);
  } catch {
    return false;
  }
}

export async function prepareDeckAssets(
  onItem: (item: DeckAssetPreparationItem) => void,
  signal?: AbortSignal
) {
  const results: DeckAssetPreparationItem[] = [];
  for (const [stage, paths] of Object.entries(DECK_PRELOAD_ASSETS) as Array<[DeckPreloadStage, readonly string[]]>) {
    for (const path of paths) {
      if (signal?.aborted) return results;
      onItem({stage, path, status: 'preparing', bytes: 0});
      try {
        const response = await cachedDeckAsset(assetUrl(path), {priority: 'low', signal} as RequestInit);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType=response.headers.get('content-type')?.toLowerCase()??'';
        const expectsImage=path.endsWith('.jpg');
        const expectsJson=path.endsWith('.json')||path.endsWith('.geojson')||path.startsWith('/api/');
        if(contentType.includes('text/html')||expectsImage&&!contentType.includes('image/jpeg')||expectsJson&&!contentType.includes('json')){
          throw new Error(`Unexpected content type${contentType?`: ${contentType}`:''}`);
        }
        const reader = response.body?.getReader();
        let bytes = 0;
        if (reader) {
          while (true) {
            if (signal?.aborted) {
              await reader.cancel().catch(() => {});
              const result: DeckAssetPreparationItem = {stage, path, status: 'cancelled', bytes};
              results.push(result);
              onItem(result);
              return results;
            }
            const {done, value} = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            onItem({stage, path, status: 'preparing', bytes});
          }
        } else {
          bytes = (await response.arrayBuffer()).byteLength;
        }
        if(bytes===0||path.endsWith('.glb')&&bytes<1024)throw new Error('Asset body is empty or incomplete');
        const status = await isDeckAssetCached(path) ? 'cached' : 'loaded-not-cached';
        const result: DeckAssetPreparationItem = {stage, path, status, bytes};
        results.push(result);
        onItem(result);
      } catch (error) {
        const result: DeckAssetPreparationItem = {
          stage,
          path,
          status: signal?.aborted ? 'cancelled' : 'failed',
          bytes: 0,
          error: error instanceof Error ? error.message : 'Request failed',
        };
        results.push(result);
        onItem(result);
        if (signal?.aborted) return results;
      }
    }
  }
  return results;
}

async function warm(path: string, signal?: AbortSignal) {
  if(signal?.aborted)return;
  try {
    const response = await cachedDeckAsset(assetUrl(path), {priority: 'low',signal} as RequestInit);
    if (!response.ok || signal?.aborted) return;
    // Consume the body so a successful cacheable asset is written to the
    // public deck cache. Failures remain opportunistic; the scene retries it.
    await response.arrayBuffer();
  } catch {
    // The scene's normal loader owns user-visible errors and retry behavior.
  }
}

export async function preloadDeckAssets(stage: DeckPreloadStage, signal?: AbortSignal): Promise<void> {
  if (typeof window === 'undefined') return;
  // Keep the existing single-transfer policy so the next scene's most
  // important file gets the available bandwidth first. The shared asset cache
  // deduplicates these cancellable consumers with scene-owned fetches.
  for (const path of DECK_PRELOAD_ASSETS[stage]) {
    if(signal?.aborted)break;
    await warm(path,signal);
  }
}
