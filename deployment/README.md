# Deploying the Tanga Graphite Investor Deck

The app is a Next.js (App Router) site. It deploys to **Vercel** from GitHub, and
serves its large 3D/media assets from **Cloudflare R2** (bucket `my-geo-assets`).

---

## Architecture at a glance

| Layer | Where it lives |
|---|---|
| App code + small assets (< ~8 MB) | GitHub → Vercel |
| Large assets (terrain textures, block/drill data, intro video) | Cloudflare R2, fetched via `NEXT_PUBLIC_ASSET_BASE_URL` |

The app reads `NEXT_PUBLIC_ASSET_BASE_URL` at runtime (`assetUrl()` in
`src/components/TangaThreeGeologyScene.tsx` and `TangaIntroGate.tsx`). When it's
set, large files load from R2; when it's empty, they fall back to `/public`.

**The site deploys and runs even with R2 unconfigured** — the default terrain
tier (`terrain_texture_8k.jpg`, committed) is used and the intro gate has a 2 s
fallback if the video is missing. R2 just offloads bandwidth and unlocks the
192 MB high-res texture + full intro video.

---

## 1. Push to GitHub

```bash
git push -u origin vrify-story-phase1
```

Vercel preview-deploys every branch. To make this the production deploy, either
merge into your production branch or point the Vercel project at this branch.

---

## 2. Configure the Vercel project

Settings that matter (also in `deployment/vercel/project-settings.md`):

- **Install command:** `npm install --legacy-peer-deps` (already in `vercel.json`).
- **Build command:** `next build` (default). `postbuild` injects the service worker.
- **Framework preset:** Next.js.
- **Node version:** 20.x.

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_ASSET_BASE_URL` | `https://pub-<hash>.r2.dev` **or** your custom domain | Public R2 URL — **not** the `*.r2.cloudflarestorage.com` S3 endpoint (that needs signed requests). |
| `NEXT_PUBLIC_VOICE_ENGINE` | e.g. `browser` | Optional; controls the voice command engine. |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | *(only if Cesium chapters are used)* | Optional. |

Set the same values in `.env.local` for local dev.

---

## 3. Upload large assets to Cloudflare R2

**Bucket:** `my-geo-assets` · **Account:** `ebe5c114128b858b4d5a1a680311826d`

### 3a. Enable a public URL (required for the browser to read assets)

R2 buckets are private by default. In the Cloudflare dashboard →
**R2 → my-geo-assets → Settings**:

- Either **Enable Public Access** (gives you a `https://pub-<hash>.r2.dev` URL), or
- Connect a **custom domain** (e.g. `assets.yourdomain.com`) — preferred for
  production (see `deployment/cloudflare/r2-cache-rules.md`).

Use that URL as `NEXT_PUBLIC_ASSET_BASE_URL`.

### 3b. Upload the files

**Option A — wrangler (files ≤ ~315 MB):**

```bash
npx wrangler login
bash scripts/upload-r2.sh
```

`scripts/upload-r2.sh` uploads exactly the objects the app requests:
`terrain_preview_meta.json`, `height_preview_1024.bin`, `topography.png`,
`terrain_texture_8k.jpg`, `texture_rgb_8192.png`, `resource_model.bin`,
`assay_data.geojson`, `lithology_data.geojson`, and the intro preview
video + poster under `media/`. Object keys mirror the `/public` paths.

**Option B — 8K master videos (600–821 MB) exceed wrangler's per-object limit.**
Upload those via the dashboard drag-drop, or with `rclone` using the S3 API:

```bash
# ~/.config/rclone/rclone.conf
# [r2]
# type = s3
# provider = Cloudflare
# access_key_id = <R2 access key>
# secret_access_key = <R2 secret>
# endpoint = https://ebe5c114128b858b4d5a1a680311826d.r2.cloudflarestorage.com
rclone copy public/media r2:my-geo-assets/media --progress
```

Generate the access key/secret in **R2 → Manage R2 API Tokens**.

### 3c. CORS

Apply `deployment/cloudflare/r2-cors.json` to the bucket so the browser can fetch
cross-origin (R2 → Settings → CORS Policy).

---

## 4. Verify

1. Deploy on Vercel; open the deployment URL.
2. Confirm the intro video plays (or falls back cleanly) and the 3D scenes
   (scenes 6–9) load terrain + blocks.
3. DevTools → Network: large assets should come from the R2 host, not the
   Vercel domain.

---

## What is gitignored (never committed / deployed)

See `.gitignore` "Large files hosted on Cloudflare R2":
`public/media/` (2.6 GB video), `public/generated/*.obj` (75 MB test meshes),
`public/texture_rgb_8192.png` (192 MB), `public/height.bin`,
`public/BlockModel.geojson`, `public/dem_utm.tif`, `public/*.kmz`.
