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

## Cold-cache subsurface sample

A fresh local production origin (`localhost:3011`) was opened directly at `#subsurface` after clearing that origin's CacheStorage and service-worker registrations. Playwright injected `Cache-Control: no-cache` and `Pragma: no-cache` request headers. The Three.js `data-ready="true"` marker appeared at 9.84 seconds after navigation. The run recorded zero failed requests and zero JavaScript console errors; 16 graphics-buffer warnings appeared.

Eight large same-origin responses reported `Content-Length` headers totaling 37,523,709 bytes (37.5 MB): survey aerial 428,420; assay GeoJSON 4,874,074; terrain texture 6,242,357; terrain context 1,435,648; survey height 5,742,592; survey coverage 1,435,648; geological model GLB 12,517,520; lithology GeoJSON 4,847,450 bytes. The request was not bandwidth-throttled. These origin body sizes are not measured wire-transfer totals, and the resource timing API returned no encoded-size entries for these assets in this run. This single local sample exceeds the proposed 8-second 3D target and needs a repeat under the named network/device conditions before release decisions.

## Adaptive governor retest: 30-second desktop subsurface orbit

After changing the resolution governor to inspect the 90-frame p90 rather than the mean, a foreground 1707 x 842 subsurface orbit collected 857 requestAnimationFrame intervals over 30 seconds. Median was 33.3 ms; p90 41.9 ms; p95 50.1 ms; p99 70.8 ms; one 962.3 ms outlier occurred; 59.3% of frames were at or below 33.4 ms. The governor stepped render scale from 1.00 down to 0.75. Console errors were zero; the browser continued to emit graphics-buffer warnings.

This confirms that the percentile governor adapts during a sustained slow run, but the p95 remained above target and this run was not a controlled before/after benchmark. Resource caching, external map tile activity, and host scheduling can vary between runs. Do not claim a performance gain from this result; continue investigating the desktop rendering cost and repeat with controlled assets and a native-device capture.

## Findings and remaining measurements

- Warm-cache foreground 3D first-useful frames were 3.42–4.81 seconds at 390 × 844 and 3.64–5.24 seconds at 1707 × 842. These are below the plan's 8-second warm target, but do not describe a cold network start.
- One clean-origin local subsurface run reached `data-ready` at 9.84 seconds with 37.5 MB in large response bodies. It is a useful cold-cache diagnostic, not a controlled network benchmark; exact wire transfer and throttled repeat remain open.
- Desktop 3D frame-pacing p95 values were 45.7–58.4 ms in this short sample, above the 33 ms target. Portrait p95 values were 12.6–24.9 ms in the same test environment. Prioritize desktop resource/subsurface/mine-plan rendering without reducing scientific data.
- The renderer emits recurring GPU buffer `READ-usage` performance warnings in this browser. The runs recorded zero JavaScript console errors. The warnings remain a performance investigation item.
- One chapter loop recorded `Evidence to decisions` at 7.6–7.8 seconds, but a fresh instrumented foreground load measured DOMContentLoaded at 29 ms and the chapter heading at 311 ms. The slow result was not reproduced and is treated as a harness outlier; full asset/transition readiness remains unmeasured.
- Do next: repeat with cache/service-worker disabled and capture actual wire transfer; repeat the 30-second desktop orbit after the p90 governor change and collect a controlled before/after plus phone-sized distributions; inject texture/model/API failure and context loss; test rapid scene switching; repeat on a named physical laptop and phone rather than browser viewport emulation.

## Mine-plan target-overlay production recheck — 24 October 2026

The conceptual mine-plan target story now draws 1,380 source cells, selected as the highest-grade cell in each 50 m grid location and grade band, while retaining the exact 70,892 qualifying-cell count. Each displayed block retains its source position, size and grade class. The resource chapter still displays its full source population. This keeps the mine-plan target cue spatially representative without rendering the full overlapping block population.

On the optimized local Next.js production server at `localhost:3013`, Chrome at 1707 × 842 ran a 33-second foreground orbit at renderer scale 0.90. The browser requestAnimationFrame sample contained 1,258 intervals: median 25.0 ms, p90 37.8 ms, p95 50.0 ms, p99 54.3 ms; 84.5% of intervals were at or below 33.4 ms. The scene stayed ready and logged zero JavaScript errors. This sample shows continued desktop frame-time headroom above the plan's 33 ms p95 target; it is not a controlled before/after comparison, a GPU timer, a cold-cache test, or a physical-device certification.

## Resource-cell geometry and 30-second desktop orbit — 24 October 2026

Chrome 155 on Windows used Intel UHD Graphics through ANGLE / Direct3D 11. The optimized Next.js production app ran at 1707 × 842, DPR 1, with the browser tab visible and the Resource scene ready at render scale 1.00. All 155,853 source blocks remained rendered. A 30-second orbit was driven by pointer events on the live OrbitControls canvas; requestAnimationFrame intervals were sampled in-page. Other browser tabs were open, so this remains a desktop diagnostic rather than an isolated, controlled device benchmark.

| Resource geometry | RAF intervals | Median | p90 | p95 | p99 | Max | ≤33.4 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Before: `BoxGeometry` (24 face-split vertices per instance) | 848 | 25.1 ms | 75.1 ms | 112.6 ms | 174.8 ms | 220.6 ms | 54.6% |
| After: indexed cube (8 shared vertices per instance) | 975 | 21.0 ms | 66.6 ms | 112.4 ms | 146.1 ms | 200.0 ms | 62.3% |

Each cell retains its source position, dimensions, grade class and color. The geometry change reduces per-instance transformed vertices by two thirds without removing or aggregating source blocks. The resource model remained intact at 1707 × 842; capture: `.playwright-mcp/resource-indexed-cells-production-1707x842.png`. Both runs stayed `ready=true` at render scale 1.00 with zero JavaScript errors. The p95 remained about 112 ms, above the 33 ms target. Lower median/p90 and more intervals under 33.4 ms do not establish a robust speed-up because scheduling stalls, other open tabs and the absence of an isolated controlled A/B run remain. Continue desktop resource-rendering investigation; do not close the performance gate from this sample.

## Reproduction notes

The optimized application was served with `npm start -- -p 3002`. Browser scripts navigated to each chapter through a fresh query and hash, waited for its authored chapter heading, and for Three.js chapters waited on `.tanga-three__canvas[data-ready="true"]`. The browser tab was explicitly foregrounded before timing. A background tab reports no first useful frame because its animation loop intentionally pauses.
