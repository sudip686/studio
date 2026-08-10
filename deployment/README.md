# Tanga POC Deployment Package

This folder is intentionally separate from the POC implementation. It contains the production deployment plan, environment templates, Cloudflare/Vercel setup notes, and verification scripts needed to launch the existing app without changing or breaking current local functionality.

## Target

- Customer-facing POC for approximately 100-200 users/month.
- Monthly budget target: USD 100.
- Priorities: fast first load, reliable typed commands, production voice transcription, no black screens, and no dependency on local files or local Whisper.

## Recommended Stack

| Layer | Service | Budget stance |
| --- | --- | --- |
| Next.js app hosting | Vercel Pro | Required for customer-facing deployment and preview workflows. |
| Heavy assets | Cloudflare R2 with custom asset domain | Required; keeps terrain/model/texture traffic off Vercel. |
| Voice transcription | OpenAI speech-to-text API with strict usage limits | Required for reliable customer voice; local Whisper remains local-only. |
| Error monitoring | Sentry Team, or Sentry Developer during internal pilot | Recommended; Team fits budget if OpenAI usage is capped. |
| Analytics | Vercel included usage dashboards first | Optional paid analytics can wait. |
| Cesium ion paid plan | Not included | Does not fit USD 100/month. Use self-hosted/generated assets for the production POC. |

## Folder Contents

- `budget-100-usd.md` - monthly cost model and hard spend caps.
- `architecture.md` - production architecture and request flow.
- `vercel/env.production.example` - production environment variable template.
- `vercel/project-settings.md` - Vercel configuration steps.
- `cloudflare/r2-cors.json` - R2 CORS policy template.
- `cloudflare/r2-cache-rules.md` - custom domain and cache rules.
- `asset-manifest.production.example.json` - suggested production asset manifest.
- `checklists/preflight.md` - launch readiness checklist.
- `checklists/customer-qa.md` - customer-experience QA checklist.
- `scripts/verify-production.ps1` - read-only verification helper for staging/production URLs.

## Non-Goals

- This folder does not rewrite the POC.
- This folder does not remove local Whisper or local development settings.
- This folder does not change `next.config.ts`, app routes, or rendering behavior.

## Deployment Sequence

1. Upload large assets to Cloudflare R2 under a versioned prefix.
2. Configure Vercel project and production environment variables.
3. Add production transcription endpoint support in the app in a controlled implementation pass.
4. Run typecheck, build, and screenshot QA locally.
5. Deploy to Vercel preview.
6. Run `scripts/verify-production.ps1` against the preview URL.
7. Promote to staging/customer URL only after the checklists pass.

