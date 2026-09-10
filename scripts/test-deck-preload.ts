import assert from 'node:assert/strict';
import {cachedDeckAsset} from '../src/lib/cached-deck-asset';
import {GEOLOGY_PRELOAD_PATHS, preloadGeologyAssets} from '../src/lib/preload-geology';

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
  const a = preloadGeologyAssets(), b = preloadGeologyAssets();
  assert.equal(a, b, 'mounts share one background queue');
  await a;
  assert.deepEqual(requests, [...GEOLOGY_PRELOAD_PATHS]);
  assert.equal(maxActive, 1, 'next request waits for full previous body');
  await preloadGeologyAssets();
  assert.equal(requests.length, GEOLOGY_PRELOAD_PATHS.length, 'warm queue performs no downloads');
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
