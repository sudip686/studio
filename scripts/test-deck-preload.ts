import assert from 'node:assert/strict';
import {cachedDeckAsset} from '../src/lib/cached-deck-asset';
import {preloadDeckAssets} from '../src/lib/preload-deck-assets';

async function main() {
  const entries = new Map<string, Response>();
  const requests: string[] = [];
  let active = 0, maxActive = 0;
  const cache = {
    match: async (key: string) => entries.get(key)?.clone(),
    put: async (key: string, response: Response) => {
      const body = await response.arrayBuffer();
      entries.set(key, new Response(body, {headers: response.headers}));
    },
  };
  Object.assign(globalThis, {
    window: {location: {href: 'http://localhost:9004/'}, caches: {}},
    caches: {open: async () => cache},
    fetch: async (url: string) => {
      requests.push(new URL(url, 'http://localhost:9004/').pathname);
      active++; maxActive = Math.max(active, maxActive);
      return new Response(new ReadableStream({
        start(controller) {
          setTimeout(() => {
            controller.enqueue(new Uint8Array(2048));
            active--; controller.close();
          }, 10);
        },
      }), {headers: {'content-type': 'application/octet-stream'}});
    },
  });
  const a = preloadDeckAssets('subsurface'), b = preloadDeckAssets('subsurface');
  assert.equal(a, b, 'same-stage requests share one background queue');
  await a;
  assert.deepEqual(requests, ['/api/assets/geologicalModel.glb', '/terrain_texture_hires.jpg']);
  assert.equal(maxActive, 1, 'next request waits for full previous body');
  await preloadDeckAssets('subsurface');
  assert.equal(requests.length, 2, 'warm queue performs no downloads');
  await preloadDeckAssets('topography');
  assert.deepEqual(requests.slice(2), [
    '/terrain_hires_meta.json',
    '/terrain_context_512.bin',
    '/survey_height_hires.bin',
    '/survey_coverage_hires.bin',
  ], 'each chapter warms only its own scene dependencies');
  entries.clear(); requests.length = 0;
  await Promise.all([cachedDeckAsset('/geologicalModel.glb'), cachedDeckAsset('/geologicalModel.glb')]);
  assert.equal(requests.length, 1, 'foreground and background share an in-flight asset');
  Object.assign(globalThis, {fetch: async () => new Response('unavailable', {status: 503})});
  entries.clear();
  await cachedDeckAsset('/geologicalModel.glb');
  assert.equal(entries.size, 0, 'failed responses never poison the cache');
  console.log('PASS: ordered queue, one transfer, warm-cache reuse, in-flight deduplication, failed-response exclusion');
}
void main().catch(error => {console.error(error); process.exitCode = 1;});
