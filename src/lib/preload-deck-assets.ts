import {assetUrl} from './asset-url';
import {cachedDeckAsset} from './cached-deck-asset';

export type DeckPreloadStage = 'topography' | 'drillholes' | 'subsurface' | 'resource';

/**
 * Only warm the next authored chapter. The intro used to fetch every geology,
 * drilling and resource payload in sequence, including high-resolution rasters
 * that the Three.js presentation scenes do not use. These paths now mirror the
 * actual scene loaders so a warm request can be shared through the asset cache.
 */
const STAGE_ASSETS: Record<DeckPreloadStage, readonly string[]> = {
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
  for (const path of STAGE_ASSETS[stage]) {
    if(signal?.aborted)break;
    await warm(path,signal);
  }
}
