# Tanga desktop viewer performance baseline — 2026-10-24

## Scope and method

This diagnostic baseline covers the local **standard Next.js production build**, at 1366 × 768 CSS pixels in Chrome 155 on Windows 11. Chapters were opened on separate loopback origins to isolate the browser's origin cache. The machine is a Dell G16 7630 with an Intel Core i9-13900HX, 31.7 GiB RAM, Intel UHD Graphics and NVIDIA RTX 4070 Laptop GPU.

For MapLibre chapters, readiness is the first `idle` event after application mount. For Three.js chapters, readiness is the scene's existing `onLoadState` report. Metallurgy uses its process-canvas readiness marker. Browser transfer totals sum same-origin `PerformanceResourceTiming.transferSize`; opaque third-party tile traffic may be absent. Frame samples are a short 1.2-second `requestAnimationFrame` interval after readiness, not GPU render timings or a 30-second camera-orbit benchmark. The sample is unthrottled and desktop-only.

## First-load and short frame sample

| Chapter | Ready / idle (ms) | Same-origin transfer (MB) | RAF median / p95 (ms) | Frames >33.4 ms |
|---|---:|---:|---:|---:|
| Ranking | 1,968 | 0.004 | 16.6 / 108.4 | 5 |
| Work completed | 1,903 | 0.004 | 4.2 / 16.6 | 2 |
| Tanzania | 3,364 | 1.469 | 20.9 / 45.7 | 12 |
| Project | 1,582 | 1.468 | 4.3 / 33.1 | 3 |
| Accessibility | 3,321 | 1.730 | 24.9 / 70.7 | 10 |
| Comparison | 3,490 | 1.703 | 16.7 / 37.6 | 9 |
| Topography | 1,831 | 10.722 | 16.6 / 41.6 | 7 |
| Drillholes | 2,832 | 30.023 | 20.8 / 75.0 | 18 |
| Subsurface | 3,523 | 30.100 | 16.6 / 41.7 | 11 |
| Resource | 12,136 | 21.435 | 25.0 / 70.6 | 5 |
| Mine planning | 11,004 | 21.739 | 29.2 / 112.4 | 14 |
| Metallurgy | 2,797* | 1.703 | 8.5 / 54.2 | 12 |

`*` Metallurgy is the observed age of the process canvas when it first reported ready; it is not the main Three.js telemetry value.

All 12 direct chapter entries completed with no failed resource entries, horizontal overflow or JavaScript errors. Several chapters emitted graphics performance warnings. The brief RAF samples are too short to clear the interaction-performance gate.

## Findings

- Resource and Mine Planning have the slowest ready times in this run. The Resource chapter's `/api/block-model` response transferred about 4.08 MB compressed (about 75.64 MB decoded), taking about 9.44 seconds for the request in this cold-origin run. Browser telemetry recorded about 426 ms for projection/filtering of 155,853 cells. Transfer, decode and later scene work all contribute; these timings do not isolate one sole cause.
- Mine Planning displayed 64,423 source blocks meeting the existing 4.5% TGC presentation threshold, including 64,423 rendered pit cells in the focused inspection view. Their coordinates, dimensions and grade values are retained. This is a display selection inside conceptual pit envelopes, not an economic cutoff or reserve shell. The focused view was visually checked in the current build at `.playwright-mcp/north-pit-focus-current.png`.
- Adding `powerPreference: 'high-performance'` to Three.js renderer creation did **not** switch this Chrome session to the laptop's RTX 4070. The live WebGL debug renderer still reported Intel UHD Graphics. This option is only a browser hint; no discrete-GPU improvement is claimed.

## Follow-up: resource-block allocation path

The Resource parser now projects source coordinates directly to scalar local offsets, rejects invalid rows before creating a `ResourceBlock`, and returns the populated array without a second filtering copy. Resource camera framing now finds the same source-cell bounds with scalar min/max values rather than allocating two temporary `THREE.Vector3` instances per displayed block. A 5,000-cell synthetic comparison matched the previous `THREE.Box3` min/max bounds and center exactly.

On the final built local Cloudflare/OpenNext preview, Resource parsed 155,853 of 155,952 features in 464.8 ms and reached `ready` in 3.064 s with 155,853 selected and rendered blocks out of 155,853 source cells. Mine Planning reached `ready` in 4.079 s; its opening overview hid grade cells as authored, and the “Resource blocks in the pits” view remained available. Neither view showed a browser JavaScript error or alert. These are warm-preview observations and are not comparable to the cold-origin baseline above, so they do not establish a speed-up. The `/api/block-model` payload still dominates transfer/decode, and the full device, cold-cache, 30-second-orbit, and deployed-host gates remain open.

## Instrumentation

The workbench exposes `data-map-state`, `data-map-first-idle-ms`, `data-three-state` and `data-three-load-ms` on its root element to support repeatable browser measurements. These values are diagnostic, not user-facing product metrics.

## Open gates

Repeat the test on physical target devices, include a 30-second orbit/drag/zoom sample for every 3D chapter, test cold and warm cache behavior on throttled networks, and measure deployed Vercel and Cloudflare builds separately. The local short-window RAF figures are not an acceptance result.

## Follow-up: cold topography discrepancy on the current branch — 2026-10-25

On branch `codex/tanga-investor-experience` at `6287f84`, a fresh Playwright browser context using the installed desktop Chrome opened the standard Next production build at 1366 × 768 on an isolated loopback origin (`http://localhost:3113/#topography`). The scene reached its existing `data-ready=true` marker at 41.45 s from navigation. No failed requests, HTTP errors or browser console errors were recorded. This is one unthrottled local cold-context observation, not a physical-device or deployed-host result.

The browser timing entries show the registered terrain context and survey grids starting at about 25.64 s: the 5.74 MB survey-height binary completed in 3.15 s, and the 1.44 MB context and coverage binaries each completed in 2.40 s. The one-ahead drilling preload also requested `assay_data.geojson` (331,049 transferred bytes; 4.87 MB decoded) from 17.68 s and completed in 10.30 s. External imagery-tile traffic was active during the same entry. These timings do not establish that one request caused the late scene start or that the preload delayed it.

This result differs sharply from the 1.83 s Topography ready time in the 24 October cache-isolated matrix. The methods are not sufficiently matched to call this a regression or a speed-up. Re-run both methods on the current branch with navigation, first useful frame, Three.js ready marker, cache state and request timings recorded together; keep the cross-chapter performance acceptance open until reconciled.

## Follow-up: pre-sized terrain buffers — 2026-10-25

`createTexturedTerrainPatchGeometry` now writes the same sampled surface into pre-sized typed position, UV, color, survey-mask and index buffers. It reuses context/slope colors rather than constructing color objects per vertex. The survey/context seam test, grid resolution, coverage rules, 401,646 triangles, source elevations and displayed color ramp are unchanged. Screenshot review at 1366 × 768 found the topography composition visually consistent with the previous capture: `.playwright-mcp/topography-terrain-typed-array-1366x768.png`.

The existing `data-terrain-build-ms` diagnostic measured 6.18 s before the edit, then 2.27 s in a fresh local Next production context and 2.59 s on its warm reload. This is an observed reduction in the terrain-geometry build operation; it does not prove an end-to-end startup improvement. Local Next `data-ready` was 58.0 s cold and 19.9 s on same-context reload; the associated scene timers were 13.20 s and 9.52 s. Those end-to-end values vary materially against the earlier 41.45 s cold and 22.95 s warm observations, so first-frame and scene-start timing still need a matched trace.

The local OpenNext/Cloudflare preview also reached Topography `ready` at 52.6 s after its worker had been warmed. Its terrain build took 2.76 s with the same grid and triangle count, no failed requests and no page errors; capture: `.playwright-mcp/topography-typed-array-cloudflare-1366x768.png`. The preview's first root request took 68.2 s; a later warm root request took 6.17 s. This is Windows local-preview evidence, not a deployed Cloudflare measurement.

## Follow-up: cold browser timing trace and prefetch scheduling — 2026-10-25

A fresh headless Chrome process on the same 1366 × 768 local production build (`.next-terrain-typed`, port 3113) recorded a 71.67 s Topography scene-ready observation. First contentful paint was 15.21 s and `DOMContentLoaded` was 16.28 s. Initial app chunks began at 3.02 s and their responses arrived between 10.91 and 16.11 s. The first 3D-specific chunk requests did not begin until 31.86 s; the largest 1.03 MB JavaScript chunk returned at 49.00 s. Terrain context, survey-height and coverage requests began at 48.55 s and completed by 51.76 s. The scene reported `data-three-load-ms=24233` at readiness. There were no failed requests or page exceptions.

This narrows the cold-start issue to substantial client startup / chunk scheduling and post-mount scene work; the terrain binary transfer is not the sole bottleneck. The trace did not collect long-task entries, exact decoded/encoded response sizes, or the inner terrain-geometry diagnostic, so it cannot apportion the 24.23 s scene interval to JavaScript evaluation, geometry generation, GPU upload or first-frame settling. To avoid a map-busy idle callback starving the large first-3D import during the normal story, the workbench now starts the existing prefetch one chapter earlier and gives `requestIdleCallback` a 1.2 s deadline. A current-code story-entry check below verifies module arrival before Topography, but it is not a matched cold direct-entry test or proof of an end-to-end cold speed-up.

The isolated production build after the change passed asset verification, optimized compilation (2.6 min), TypeScript (6.3 min), all 11 static pages and service-worker injection. In a fresh Chrome context on that build, opening `#work_completed` requested the scene code chunk at 8.31 s and received it with HTTP 200 at 11.81 s, while the viewer was still in the non-3D chapter. Switching to `#topography` in that same browser context reached `data-three-state=ready` at 29.83 s from initial navigation; scene telemetry was 14.10 s, and the inner terrain diagnostic was 469 ms for the unchanged 512×701 grid / 401,646 triangles. There were no page exceptions or failed local asset requests. ArcGIS imagery requests were cancelled when leaving the prior map chapter. These are unthrottled desktop observations, and the direct-entry cold path, transfer accounting, long tasks and camera interaction sample remain open.
