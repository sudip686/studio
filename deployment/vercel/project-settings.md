# Vercel Project Settings

## Project

- Framework preset: Next.js.
- Root directory: repository root containing `package.json`.
- Build command: `npm run build`.
- Install command: `npm install --legacy-peer-deps` (matches `vercel.json` and the current lockfile).
- Output directory: leave default for Next.js.

The app is hosted on Vercel. Cloudflare is used for the public R2 asset origin
configured with `NEXT_PUBLIC_ASSET_BASE_URL`; this repository does not include a
Cloudflare Pages or Workers deployment adapter.

## Environment Variables

Create separate values for:

- Production
- Preview
- Development

Use `env.production.example` as the source template.

## Spend Protection

- Enable spend notifications.
- Set a low initial spend limit.
- Keep heavy assets on R2 so Vercel fast data transfer is used mainly for app code and API routes.

## Domains

Suggested:

- `demo.example.com` - customer-facing polished demo.
- `staging.example.com` - internal testing.
- `assets.example.com` - Cloudflare R2 custom domain, not hosted in Vercel.

## Production Safety Notes

- Do not place `OPENAI_API_KEY` in a `NEXT_PUBLIC_*` variable.
- TypeScript checking remains enabled during production builds.
- The app does not add wildcard CORS headers to its own responses. Configure
  cross-origin access on the Cloudflare R2 bucket for the specific app origins.

