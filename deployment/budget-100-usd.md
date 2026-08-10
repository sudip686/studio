# USD 100/Month Budget Plan

This plan keeps the production POC inside a USD 100/month target by using hosted static assets, strict voice limits, and built-in platform observability before adding expensive managed geospatial services.

## Recommended Monthly Budget

| Item | Plan | Monthly budget | Notes |
| --- | --- | ---: | --- |
| Vercel | Pro | 20 USD | Required baseline for customer-facing Next.js previews, rollback, spend controls, and team workflow. |
| Cloudflare R2 | Standard | 0-5 USD | The current heavy public files are below 500 MB, but budget 5 USD for versioned copies and request rounding. |
| OpenAI transcription | `gpt-4o-mini-transcribe` or equivalent STT | 25-35 USD | Use push-to-talk or VAD chunks, not constant upload. Put a monthly hard cap in OpenAI billing. |
| Sentry | Team or Developer | 0-26 USD | Use Team for customer pilot if budget allows; use Developer only for internal pilot. |
| Domain/DNS | Registrar + Cloudflare DNS | 1-2 USD | Annual domain cost spread monthly. |
| Buffer | Usage/headroom | 12-28 USD | Protects against R2 request rounding, function usage, and voice spikes. |

## Recommended Option

Use:

- Vercel Pro: 20 USD
- Cloudflare R2: 5 USD budget
- OpenAI voice cap: 30 USD
- Sentry Team: 26 USD
- Domain: 2 USD
- Buffer: 17 USD

Estimated monthly budget: 100 USD.

## Lower-Cost Internal Pilot Option

Use:

- Vercel Pro: 20 USD
- Cloudflare R2: 5 USD budget
- OpenAI voice cap: 25 USD
- Sentry Developer: 0 USD
- Domain: 2 USD
- Buffer: 48 USD

Estimated monthly budget: 52 USD.

This is acceptable only while internal testing is active. For customer-facing access, Sentry Team or equivalent error monitoring is strongly recommended.

## Cost Controls

- Set Vercel spend limit/alerts.
- Set OpenAI monthly usage cap around 30 USD for the customer POC.
- Use voice activity detection and stop uploading silence.
- Keep typed commands as the fallback, so voice failure does not block the presentation.
- Store large assets in R2, never Vercel Blob or the Next.js function layer.
- Use versioned R2 paths with long cache TTLs.
- Do not enable paid Cesium ion for this budget.

## What Is Not Covered

- Cesium ion commercial plan.
- High-volume public traffic.
- Multiple production environments with many Vercel seats.
- 24/7 managed support/SLA.
- Heavy always-on realtime voice streaming.

