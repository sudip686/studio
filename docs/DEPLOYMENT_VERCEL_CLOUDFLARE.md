# Vercel and Cloudflare deployment

## Vercel

Vercel remains the primary Next.js deployment. Keep the project framework as Next.js and the build command as `npm run build`. `vercel.json` retains the existing `npm install --legacy-peer-deps` install command because the current React Three Fiber dependency graph has conflicting optional peer ranges.

Set `NEXT_PUBLIC_ASSET_BASE_URL` in the Vercel project build environment to the public Cloudflare R2 asset base. The source tree keeps the local-public-file fallback for development and Node deployments.

Dashboard check (21 October 2026): the Studio project already has `NEXT_PUBLIC_ASSET_BASE_URL` configured for Production and Preview. Its Vercel deployment list shows the Tanga branch preview as Ready and the merged PR #48 deployment on `main` as Ready. No Vercel setting change is needed for this work.

## Cloudflare Workers

The Cloudflare target uses OpenNext for Cloudflare Workers. The adapter requires Next.js `>=16.4.1`; this project is pinned by its lockfile to Next.js `16.4.2`. The `wrangler.jsonc` target is Workers, not Pages. It uses the Node.js compatibility flag required by Next's Node runtime route handlers.

Before a Cloudflare build, make `NEXT_PUBLIC_ASSET_BASE_URL` available to the build process. The script reads it from the process environment or `.env.production` / `.env.local`; do not commit those local environment files. `wrangler.jsonc` also sets the account's current public R2 development URL for Worker requests. Replace it with a bucket custom domain when one is assigned; Cloudflare marks the development URL as rate-limited and not recommended for production workloads.

Commands:

```powershell
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

`cf:preview` and `cf:deploy` both rebuild first. `cf:deploy` publishes to the configured Cloudflare account and is intentionally not part of CI by default.

Workers static assets have a 25 MiB individual file limit. The build script stages `.open-next/assets`, routes the 198 MiB legacy terrain grid, 192 MiB regional texture and 45 MiB intro video through the same-origin asset endpoint backed by R2, and omits oversized unused source/demo media and the superseded draft DOCX. The R2 uploader includes the survey mask, surveyed elevations, derived slope, revised terrain texture, and legacy terrain assets. Upload those objects before deploying a Cloudflare build.

Dashboard check (21 October 2026): the Cloudflare account has no Workers & Pages project yet. Its `my-geo-assets` R2 bucket exists, has Public Access enabled, contains about 3.27 GB, and has the 198 MiB legacy terrain grid, 192 MiB texture, 47.48 MiB presentation intro video, and project data objects. Its Public Development URL is enabled; no custom domain is assigned. The configured CORS policy allows `GET`/`HEAD` from `http://localhost:9004`, `http://localhost:3000`, `https://studio-nine-rosy-71.vercel.app`, and `https://studio-sudip686s-projects.vercel.app`; allowed headers are `*`. The build helper copies the build URL into ignored `.dev.vars` for local preview when it is present in `.env.local`.

The application streams large objects through its same-origin `/api/assets/...` route, so browser-side R2 CORS is not required for the current investor-deck paths. The existing CORS list is useful for earlier pages that still fetch objects directly, but it does not include unique Vercel deployment preview URLs. If a future feature loads an R2 URL directly in the browser, add its exact origin and expose `ETag`, `Content-Length`, and `Cache-Control`.

The adapter configuration does not create a Worker, publish a deployment, create a storage bucket, or change account-level routing. The current Cloudflare account has no Worker project; `npm run cf:preview` can be used for a local Worker preview, and `npm run cf:deploy` publishes the first Worker when the account is ready.

## Terrain source and display

The registered survey binaries and `terrain_context_512.bin` must ship as ordinary Git objects. `.gitattributes` overrides the broad LFS rule for these files. `npm run build` and `npm run cf:build` validate their dimensions and reject pointer files before packaging. The Three.js viewer uses the metadata's `context_grid` entry; do not substitute the legacy R2 `height_hires.bin` without regenerating matching metadata.

The application terrain is built from the August 2025 survey `DTM.tif` on the same EPSG:32737 project grid. Source elevation is retained only for valid survey cells; the remaining scene tile uses the regional Copernicus DEM. The survey covers 16.862% of the wider presentation terrain tile. Its vertical datum is not stated in the source metadata, and collar elevations are left at their recorded values pending a vertical-reference reconciliation.

Rebuild locally with `python scripts/build_survey_terrain.py`, then rebuild the reprojected imagery texture with `python scripts/gen_hires_texture.py`. These scripts require rasterio, numpy, pyproj, Pillow and mercantile (the working environment used `C:\temp\tanga-raster-tools`).
