# Cloudflare R2 Cache Rules

## Bucket

Suggested bucket name:

```text
tanga-prod-assets
```

## Custom Domain

Use:

```text
assets.example.com
```

Avoid using the generated `r2.dev` URL for production customer demos.

## Object Layout

```text
tanga/
  v2026-06-06/
    height_preview_1024.bin
    terrain_preview_meta.json
    terrain_texture_8k.jpg
    resource_model.bin
    drillholes_utm.json
    assay_data.geojson
    lithology_data.geojson
```

## Cache Headers

For versioned assets:

```text
Cache-Control: public, max-age=31536000, immutable
```

For manifest files that may change:

```text
Cache-Control: public, max-age=300
```

## Upload Rule

Never overwrite files inside an existing version folder after customers have loaded it. Create a new version folder instead:

```text
v2026-06-06
v2026-06-20
v2026-07-01
```

Then update `NEXT_PUBLIC_ASSET_BASE_URL` in Vercel.

