# Tanga shared data fetch cancellation — 23 October 2026

## Change

The shared data-cache provider now owns an `AbortController` for its assay and lithology load revision. Effect cleanup marks the revision cancelled and aborts its in-flight fetch. The JSON fetch helper stops candidate/attempt retries when its external signal is aborted, and retry backoff resolves early on cancellation. Existing commit guards remain in place so a late result cannot update a superseded revision. Per-request timeout controllers remain independent, preserving timeout fallback behavior.

On-demand block-model loading remains shared across consumers and was not bound to chapter unmount; its ownership is the provider-level cache, not a single scene.

## Verification

- `npm run typecheck` — passed.
- `npm run build` — passed; Next.js 16.4.2 compiled, type-checked and generated all 11 static pages.
- `npm run cf:build` — passed; OpenNext generated the Cloudflare worker and routed the three large files to the configured R2 base. OpenNext emitted its existing Windows compatibility warning.
- A browser probe stalled an intercepted assay request and navigated away from the chapter, but the Playwright route handler did not expose a conclusive browser abort event. Treat the cancellation branch as unverified until a controlled request-failure test can assert `AbortSignal` state or a cancelled request.

## Scope

This closes the implementation slice for provider-owned assay/lithology request cancellation. It does not close the broader asset-lifecycle checklist: deferred terrain upgrade failure, shared asset disposal ownership, request retry behavior and resource stability across repeated Three.js scene revisits still require explicit runtime checks.
