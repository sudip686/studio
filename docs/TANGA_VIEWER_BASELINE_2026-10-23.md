# Tanga viewer baseline — 23 October 2026

Status: partial, warm-cache Chromium baseline. This is a reproducible comparison point, not a release certification.

## Run conditions

- Local optimized Next.js production server after `npm run cf:build`, at `localhost:3002`; this checks the built application, not the hosted Vercel or Cloudflare services.
- Chrome 155 on Windows, Intel UHD Graphics, Direct3D 11 / ANGLE, device pixel ratio 1.0 for the 1707 × 842 run. Browser tab was foregrounded; hidden-tab periods were excluded because the renderer suspends while hidden.
- Second viewport: 390 × 844 in the same browser session. Browser HTTP and application CacheStorage were warm. Encoded resource body totals include cached application resources; `transferSize` was only about 4–31 kB per chapter and does not represent a cold download. Cold transfer sizes are still unmeasured.
- Chapter first-content elapsed time is measured from navigation until the chapter heading is available, then a short settle interval. It is not a full content-ready or map-tile-ready metric. For Three.js chapters, `firstUsefulFrameMs` is the viewer's own readiness signal after populated rendering and authored camera travel.
- Frame samples are browser `requestAnimationFrame` intervals over 1.4 seconds after the scene is ready. They include browser/GPU scheduling stalls and are a frame-pacing proxy, not a hardware GPU timer. The metallurgy canvas uses a separate composition and does not expose the Three.js first-useful-frame marker.

## Foreground warm-cache results

| Chapter | Startup signal at 390 × 844 | Startup signal at 1707 × 842 | 3D RAF median / p95 at 390 | 3D RAF median / p95 at desktop |
|---|---:|---:|---:|---:|---:|
| Meet Tanga | 1.1 s | 1.8 s | — | — | — |
| Place it on the map | 1.1 s | 2.0 s | — | — | — |
| Work completed | 1.2 s | 1.8 s | — | — | — |
| Read the landscape | 4.12 s first useful frame | 4.28 s first useful frame | 8.4 / 16.6 ms | 33.1 / 49.7 ms |
| Follow a recorded hole | 3.78 s first useful frame | 4.06 s first useful frame | 8.3 / 12.6 ms | 33.3 / 45.7 ms |
| Reveal the host rock | 3.42 s first useful frame | 3.64 s first useful frame | 8.3 / 12.6 ms | 37.3 / 54.2 ms |
| Understand the model | 4.17 s first useful frame | 4.54 s first useful frame | 12.6 / 24.9 ms | 37.3 / 54.3 ms |
| The global peer field | 1.1 s | 1.7 s | — | — | — |
| Fit a concept to ground | 4.81 s first useful frame | 5.24 s first useful frame | 12.4 / 16.6 ms | 29.2 / 58.4 ms |
| Examine the testwork | Ready at 1.0 s; no first-frame marker | Ready at 3.3 s; no first-frame marker | 8.1 / 8.5 ms | 8.5 / 29.2 ms |
| Connect to the port | 1.3 s | 2.0 s | — | — | — |
| Evidence to decisions | 7.6 s | 7.8 s | — | — | — |

For map/story chapters, startup time means navigation to the active chapter heading. For Three.js chapters, it means the scene's first useful frame. Metallurgy exposes scene readiness but no first-frame marker. Treat these as different signals.

Warm encoded resource-body totals across each chapter navigation ranged from roughly 1.0 to 8.1 MB on the phone-sized viewport and 1.1 to 8.0 MB on desktop. These totals include shared JavaScript and other resources, so they are not per-chapter asset budgets. Drillhole view was the largest sampled chapter at about 8 MB. Actual cold wire transfer and cached-asset reuse need separate measurement.

## Longer resource-view sample

On the 1707 × 842 Intel UHD run, the resource scene reported its first useful frame at 5.06 seconds. The adaptive resolution governor started at render scale 1.00 and reduced to 0.75 after sustained slow frames. Sparse frame samples moved from about 33–37 ms at scale 1.00 to about 16–36 ms at scale 0.75. This demonstrates adaptation, but the remaining slow samples and short observation window do not establish the 30-second-orbit target.

## Findings and remaining measurements

- Warm-cache foreground 3D first-useful frames were 3.42–4.81 seconds at 390 × 844 and 3.64–5.24 seconds at 1707 × 842. These are below the plan's 8-second warm target, but do not describe a cold network start.
- Desktop 3D frame-pacing p95 values were 45.7–58.4 ms in this short sample, above the 33 ms target. Portrait p95 values were 12.6–24.9 ms in the same test environment. Prioritize desktop resource/subsurface/mine-plan rendering without reducing scientific data.
- The renderer emits recurring GPU buffer `READ-usage` performance warnings in this browser. The runs recorded zero JavaScript console errors. The warnings remain a performance investigation item.
- One chapter loop recorded `Evidence to decisions` at 7.6–7.8 seconds, but a fresh instrumented foreground load measured DOMContentLoaded at 29 ms and the chapter heading at 311 ms. The slow result was not reproduced and is treated as a harness outlier; full asset/transition readiness remains unmeasured.
- Do next: repeat with cache/service-worker disabled and capture actual wire transfer; collect 30-second orbit frame distributions after adaptation on both viewport sizes; inject texture/model/API failure and context loss; test rapid scene switching; repeat on a named physical laptop and phone rather than browser viewport emulation.

## Reproduction notes

The optimized application was served with `npm start -- -p 3002`. Browser scripts navigated to each chapter through a fresh query and hash, waited for its authored chapter heading, and for Three.js chapters waited on `.tanga-three__canvas[data-ready="true"]`. The browser tab was explicitly foregrounded before timing. A background tab reports no first useful frame because its animation loop intentionally pauses.
