#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Upload the Tanga deck's large assets to Cloudflare R2 (bucket: my-geo-assets).
#
# These files are gitignored / kept out of the Vercel bundle. The app fetches
# them from NEXT_PUBLIC_ASSET_BASE_URL at runtime (see assetUrl() in
# TangaThreeGeologyScene.tsx and TangaIntroGate.tsx).
#
# PREREQUISITES (one-time):
#   1. Authenticate wrangler:      npx wrangler login
#   2. Run this from the studio/:  bash scripts/upload-r2.sh
#
# NOTE: `wrangler r2 object put` handles objects up to ~315 MB. The 8K master
# videos (600–821 MB) exceed that — upload those via the R2 dashboard
# drag-drop or `rclone` (S3 API). The app only references the 120 MB *preview*
# video, which is within the limit.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BUCKET="my-geo-assets"
PUBLIC_DIR="public"

# Files the app fetches from ASSET_BASE_URL. Object key = path after /public.
FILES=(
  "terrain_preview_meta.json"
  "height_preview_1024.bin"
  "topography.png"
  "terrain_texture_8k.jpg"
  "texture_rgb_8192.png"
  "resource_model.bin"
  "assay_data.geojson"
  "lithology_data.geojson"
  "media/tanga-google-earth-intro-corrected-preview.mp4"
  "media/tanga-first-slide-story-poster.jpg"
)

echo "Uploading ${#FILES[@]} assets to r2://${BUCKET} ..."
for key in "${FILES[@]}"; do
  src="${PUBLIC_DIR}/${key}"
  if [[ ! -f "$src" ]]; then
    echo "  ⚠ skip (missing locally): $src"
    continue
  fi
  echo "  ↑ ${key}"
  npx wrangler r2 object put "${BUCKET}/${key}" --file "$src" --remote
done

echo "Done. Now set NEXT_PUBLIC_ASSET_BASE_URL to your bucket's public URL"
echo "(enable Public access on the bucket → use the pub-*.r2.dev URL or a custom domain),"
echo "both in .env.local and in Vercel → Project → Settings → Environment Variables."
