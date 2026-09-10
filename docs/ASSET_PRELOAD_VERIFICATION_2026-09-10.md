# Sequential first-page asset preload

Starts 1.5 seconds after mounting the opening page (no hash or `#ranking`).
One background transfer at a time: geologicalModel GLB → assays → lithology →
full BlockModel GeoJSON → project DEM → terrain metadata/texture → fallback DEM/metadata.
Only active deck assets are included, not unused 200 MB legacy regional rasters.
Metallurgy equipment is procedural geometry, not an additional model download.

Successful public responses are stored in browser Cache Storage for 24 hours.
Foreground geology, drill collars, resource blocks and terrain reuse this cache.
Concurrent requests for the same asset share a transfer until its body/cache write completes.
Background requests have low priority. Failed requests are not cached; slide loaders
retain remote/local fallback. Storage restrictions degrade to normal fetching.
Foreground navigation remains available and can request required assets before
their background turn; it is not blocked behind the whole queue.

## Local verification

- TypeScript `npx tsc --noEmit`: passed.
- Production `npm run build` including service-worker generation: passed.
- `npx tsx scripts/test-deck-preload.ts`: passed ordered queue, maximum one
  background transfer, warm-cache reuse, in-flight deduplication, failed-response exclusion.
- Fresh browser on localhost:9004/#ranking: nine R2 assets completed sequentially
  between 4.224 and 18.619 seconds after navigation (~14.4 seconds of downloads).
- Navigation to geology and resource: no additional network requests for the GLB,
  assays, lithology, project DEM or full block model.
- Geology screenshot inspected: interpreted geology visible. Resource telemetry:
  100 drillholes and 155,853 blocks ready, initial scene construction ~4.4 seconds.
- Browser scene construction still takes time (geology ~11.2 seconds in this dev
  session). Preloading bytes does not pre-build geometry or eliminate GPU setup.

These measurements are from the local development server and this connection,
not a guaranteed loading time or a verified Vercel performance improvement.
No commit or production deployment was performed for this change.
