# Vercel Project Settings

## Project

- Framework preset: Next.js.
- Root directory: repository root containing `package.json`.
- Build command: `npm run build`.
- Install command: `npm ci`.
- Output directory: leave default for Next.js.

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
- Remove broad CORS headers from app code during the hardening pass unless a real integration needs them.
- Remove `typescript.ignoreBuildErrors: true` during the hardening pass.

