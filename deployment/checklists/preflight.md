# Production Preflight Checklist

## Code Safety

- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] `typescript.ignoreBuildErrors` is removed or disabled before production.
- [ ] Broad `Access-Control-Allow-Origin: *` is removed unless explicitly required.
- [ ] No production env var points to `localhost`, `127.0.0.1`, or local filesystem paths.

## Assets

- [ ] Large assets uploaded to Cloudflare R2.
- [ ] Assets are served from a custom domain.
- [ ] Versioned asset prefix is used.
- [ ] Cache headers are set.
- [ ] R2 CORS permits only customer/staging domains and Vercel preview domains.
- [ ] First scene loads with preview assets.
- [ ] High-resolution assets load only when requested.

## Voice

- [ ] Typed commands work for all core scenes.
- [ ] Production transcription does not depend on local Whisper.
- [ ] Voice API key is server-only.
- [ ] Voice upload has timeout and max audio length.
- [ ] Voice has fallback text when unavailable.
- [ ] OpenAI spend cap is configured.

## Monitoring

- [ ] Sentry DSN configured for staging/production, or Vercel monitoring enabled during internal pilot.
- [ ] Errors are tagged with release version.
- [ ] Failed asset load events are reported.
- [ ] Failed transcription events are reported.
- [ ] No black screen during startup.

## Access Control

- [ ] Staging/customer preview is password gated.
- [ ] Production domain uses HTTPS.
- [ ] Preview URLs are not shared with customers unless intended.

