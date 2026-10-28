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

The isolated production build after the change passed asset verification, optimized compilation (2.6 min), TypeScript (6.3 min), all 11 static pages and service-worker injection. In a fresh Chrome context on that build, opening `#work_completed` requested the scene code chunk at 8.31 s and received it with HTTP 200 at 11.81 s, while the viewer was still in the non-3D chapter. Switching to `#topography` in that same browser context reached `data-three-state=ready` at 29.83 s from initial navigation; scene telemetry was 14.10 s, and the inner terrain diagnostic was 469 ms for the unchanged 512×701 grid / 401,646 triangles. There were no page exceptions or failed local asset requests. ArcGIS imagery requests were cancelled when leaving the prior map chapter. These are unthrottled desktop observations; they establish that prefetch works on a normal story entry but do not show a cold-start speed-up.

The direct-entry path was then measured in two fresh browser contexts against the same isolated production build with service workers blocked. On the first request to the already-running local server, `#topography` reached ready in 25.73 s (FCP 4.37 s, scene timer 7.36 s, terrain build 1.22 s). A second fresh context against the warm server reached ready in 9.89 s (FCP 0.48 s, scene timer 6.97 s, terrain build 1.90 s). Both retained the 512×701 / 401,646-triangle mesh. On the second run, 39 same-origin resource entries totalled 11.05 MB transferred and 23.35 MB decoded; the largest responses were the 5.74 MB survey-height grid and compressed assay/lithology payloads decoding to 4.87/4.85 MB. The Long Tasks observer recorded 19 tasks over 50 ms, with a maximum of 2.249 s. Neither run had a failed local request or page exception; capture: `.playwright-mcp/topography-cold-current-1366x768.png`.

These browser-cache-isolated runs vary by more than 2.5× even with the same code and mesh. The faster warm-server sample cannot stand in for a cold server, throttled network or target-device result. Terrain generation and main-thread long tasks remain candidates for profiling; the trace does not attribute each long task to a specific function. The chapter's camera interaction, 30-second frame distribution, throttled-network behavior and deployed-host timing remain open.

## Follow-up: release the hidden 2D map stage during 3D chapters — 2026-10-25

An 8-second local Chrome A/B probe at 1366×768 found that the opacity-hidden MapLibre/DeckGL stage continued to consume work while the Three.js Topography chapter was active. Hiding that stage with `display:none` after the chapter transition settled changed the observed sample from 80 frame intervals (median 24.9 ms, p90 312.5 ms, p95 458.3 ms, 63.8% at or below 33.4 ms) to 230 intervals (median 4.3 ms, p90 62.5 ms, p95 262.4 ms, 87.0% at or below 33.4 ms). These are short, host-sensitive A/B samples; the long tail remains high and the result is not a controlled device benchmark or a performance acceptance result.

The source rule now releases `.tanga-deck__deck-stage` only under `.tanga-deck--three-active:not(.tanga-deck--transitioning)`. A fresh isolated Next production build passed compile, TypeScript, all 11 static pages and Workbox injection. On that actual build, Chrome at 1366×768 confirmed Topography `data-three-state=ready` with the map stage at `display:none`; the `#project` chapter restored it to `display:block`, MapLibre state `ready`, and two 1366×768 canvases; returning to Topography restored `display:none` and `ready`. No page exceptions occurred. Screenshots: `.playwright-mcp/map-paused-topography-1366x768.png` and `.playwright-mcp/map-restored-built-css-1366x768.png`.

This verifies stage visibility and restoration on the local production build. It does not establish that every 3D chapter benefits equally, eliminate long frames, or close the 30-second interaction, physical-device, network-throttling or deployed-host gates.

## Follow-up: defer drilling prefetch until the terrain chapter is ready — 2026-10-25

The earlier cold trace showed the assay prefetch beginning before the direct Topography entry reached its ready marker. The workbench now waits for the current Topography scene to report `ready` before it schedules the next-chapter drilling payload; re-entering Topography resets the report to `loading` so a previous chapter's ready state cannot start the prefetch early. Work-completed-to-Topography and the other existing immediate-next-chapter prefetches are unchanged.

On the isolated production build at 1366×768, navigating Project → Topography recorded the Topography ready marker at 30.858 s and the first `/api/assets/assay_data.geojson` request at 31.403 s. Project and Topography were rendered before entering drilling; the drilling scene reached ready at 47.382 s and reported 5,207 rendered recorded intervals. Playing the selected recorded-hole journey changed its readout to 15.8 m and 2.69% TGC; no page exceptions occurred. The same build also contains the raised aerial drilling camera; screenshot: `.playwright-mcp/drilling-evidence-introduced-current.png`.

This confirms request ordering and a user-triggered journey on this unthrottled local route. It does not compare matched end-to-end startup times, confirm both drilling assets finished preloading before transition, or close the cold/warm, 30-second interaction, physical-device and deployed-host gates.

## Follow-up: 30-second drilling frame sample — 2026-10-25

On the isolated Next production build for commit `b8425ee`, desktop Chrome at 1366×768 reached the direct Drilling scene in 29.7 s in one fresh context and 56.1 s in a second; no matched cold-cache or throttled-network claim is made. The first 30-second settled idle window recorded 633 intervals (median 8.3 ms, p90 229.1 ms, p95 254.1 ms, p99 466.6 ms, max 699.8 ms; 82.8% at or below 33.4 ms). A 30-second scripted pointer-event orbit with pointer capture handled by the harness recorded 464 intervals (median 8.4 ms, p90 258.2 ms, p95 300.0 ms, p99 528.9 ms, max 958.1 ms; 78.0% at or below 33.4 ms). Camera position changed 3,819.6 m, the scene remained ready and the accepted run recorded no page errors. Capture: `.playwright-mcp/drilling-aerial-orbit-start-1366x768.png` and `.playwright-mcp/drilling-aerial-orbit-accepted-1366x768.png`.

A separate 12-second V8 sampling profile in the settled scene collected 1,058 samples, 763 of them idle; JavaScript included `_animationFrame` and scene/chunk functions but no single sampled hotspot explained the long frame intervals. The profile is diagnostic only and does not isolate GPU, driver, OS scheduling, or image-tile work. The 30-second evidence covers one local desktop chapter and a scripted event stream, not the named physical laptop's full chapter matrix or physical mouse input. The p95 target remains unmet; cold/warm variance, GPU attribution, other 3D chapters, physical-device and deployed-host checks remain open. The Next production build and `npm run cf:build` passed on this source; OpenNext emitted its documented Windows/WSL compatibility warning, so this does not verify a deployed Worker.

## Follow-up: Topography draw scale and extended orbit — 25 October 2026

On the current branch (`2204ca9` plus the uncommitted 1× draw-scale change), Chrome 155 on Windows 11 rendered the standard local Next.js production build at 1707 × 842. An extended scripted pointer orbit on the previous 1.25× Topography scale recorded 505 RAF intervals over 40.3 s (median 58.3 ms, p90 91.5 ms, p95 95.8 ms, p99 104.0 ms, max 108.2 ms; 0% at or below 33.4 ms). The same orbit on the 1× build recorded 515 intervals over 42.0 s (median 58.2 ms, p90 91.4 ms, p95 95.7 ms, p99 100.1 ms, max 128.9 ms; 0.4% at or below 33.4 ms). Both scenes remained ready. The renderer's diagnostic snapshot reported 13 draw calls and 401,998 triangles. The fixed 1× capture was visually consistent with the 1.25× capture: `.playwright-mcp/desktop-orbit-topography-1707x842.png` and `.playwright-mcp/desktop-orbit-topography-1x-1707x842.png`.

This is not a matched 30-second hardware benchmark: the script's actual sample windows were about 40 seconds and other Chrome tabs were open. The 1× cap prevents unnecessary high-DPI overdraw and keeps resolution fixed while orbiting, but the paired samples show no measurable frame-time improvement. Do not claim a performance gain; the desktop p95 target and native-device GPU/CPU attribution remain open. The standard production and Cloudflare/OpenNext builds passed; the OpenNext command emitted its Windows/WSL warning. The new Topography scene reported zero browser console errors.

## Follow-up: live Worker 12-chapter render probe — 28 October 2026

The public Cloudflare Worker was opened at 1707 × 842 in the available Chrome/Playwright browser session. Each chapter used a forced direct document navigation with the browser HTTP cache left warm. A preload script recorded the first draw call from a visible WebGL canvas; the app's chapter-specific MapLibre-idle or Three.js-ready marker was awaited, followed by a 1.2-second requestAnimationFrame sample. This is diagnostic evidence from the current live deployment, not a cold-cache or target-device benchmark. Other tabs were open, and the short frame samples are especially sensitive to browser/GPU contention.

| Chapter | FCP (ms) | First visible WebGL draw (ms) | Chapter ready, wall time (ms) | RAF median / p95 (ms) |
|---|---:|---:|---:|---:|
| Project | 656 | 1,707 | 4,089 | 4.2 / 58.4 |
| Tanzania | 668 | 1,436 | 4,257 | 87.5 / 100.0 |
| Work completed | 668 | 2,259 | 3,969 | 50.0 / 94.7 |
| Topography | 816 | 1,746 | 5,278 | 45.8 / 83.3 |
| Drillholes | 580 | 1,768 | 6,209 | 50.0 / 75.0 |
| Subsurface | 420 | 5,657 | 6,929 | 58.4 / 208.5 |
| Resource | 340 | 1,849 | 6,734 | 66.7 / 204.1 |
| Ranking | 368 | 1,476 | 3,922 | 58.3 / 124.3 |
| Mine planning | 648 | 1,767 | 7,747 | 50.0 / 199.9 |
| Metallurgy | 420 | 2,043 | 5,026 | 75.0 / 92.1 |
| Accessibility | 336 | 1,416 | 4,202 | 108.2 / 391.6 |
| Comparison | 532 | 1,750 | 3,660 | 83.3 / 133.3 |

All 12 chapters reached their route-appropriate ready marker; the script recorded no JavaScript exceptions or console errors. The hidden MapLibre stage reported `mapState=error` while the six Three.js chapters reported `threeState=ready`; this did not prevent their visible 3D render, but the map-state semantics during Three.js chapters need review. Same-origin `transferSize` summed to only 0.01–0.02 MB per document in this warm session, so it is not a useful measure of full scene transfer and is not compared with the 24 October cold-origin figures. The first-WebGL-draw hook is a render-call proxy, not a pixel-confirmed useful frame. RAF samples recorded only 7–89 intervals per chapter over 1.2 seconds, with p95 from 58 to 392 ms; they are too noisy and too short to serve as a motion acceptance result. Re-run in an isolated, cache-controlled browser and collect full 30-second interaction distributions before drawing performance conclusions.

## Follow-up: report the hidden MapLibre stage as inactive — 28 October 2026

A live 12-chapter probe had shown `mapState=error` on the six Three.js chapters even while their visible 3D scene was ready. The workbench now reports the map stage as `idle` while Three.js owns the view and ignores MapLibre errors/context notifications from that inactive stage. Active map chapters keep their own MapLibre loading, error and recovery status.

Local desktop browser checks at 1366 × 768 confirmed Topography and Resource as `map=idle / three=ready`, and Metallurgy as `map=idle / three=ready / factory=ready / roofSettled=true`; no scene or map fallback appeared. Project returned `map=ready / three=idle` with no map fallback. Captures: `.playwright-mcp/map-state-idle-topography-1366x768.png` and `.playwright-mcp/map-state-ready-project-1366x768.png`. The Cloudflare build passed and live Worker version `af5e816b-dcdd-42c1-8bfa-cf51deb7db4e` repeated the Topography, Project and Metallurgy status checks. No page errors were reported. A non-fatal “There is no style added to the map” console warning still appeared during a hidden-stage startup; it did not block 3D readiness and should be investigated separately if it appears in an active map chapter.

This corrects the inactive-stage status reporting; it does not establish a cold-cache timing, map-source reliability on every route, or 30-second interaction performance.

## Follow-up: isolated 30-second Three.js drag sample — 28 October 2026

Measured the current public Worker version `f4b4ceb9-55a7-487a-b47d-182c49852256` with a fresh Playwright context in the installed system Chrome, `serviceWorkers: block`, and a 1366 × 768 viewport. The WebGL debug renderer reported the laptop's Intel UHD Graphics on Direct3D 11. Each chapter was opened directly, awaited its Three.js/factory `ready` marker, settled for 1.5 s, then received a 30-second scripted mouse drag with pointer movement paced at 50 ms. The first Topography entry used a fresh browser cache; subsequent same-origin chapters shared that context and could reuse transferred assets. This isolates the browser context from the user's 97 open Chrome processes but still shares the machine's Intel GPU. It is a drag/orbit sample, not a physical-mouse or zoom test.

| Chapter | Ready (ms) | RAF intervals | Median (ms) | P90 (ms) | P95 (ms) | P99 (ms) | Max (ms) | >33.4 ms | >100 ms | Long tasks / max (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Topography | 4,811 | 987 | 33.3 | 50.0 | 54.2 | 66.7 | 104.2 | 446 | 1 | 12 / 479 |
| Drillholes | 3,308 | 785 | 41.5 | 54.1 | 58.3 | 99.9 | 133.2 | 501 | 7 | 10 / 628 |
| Subsurface | 2,418 | 868 | 37.5 | 50.0 | 54.1 | 83.3 | 204.1 | 494 | 5 | 19 / 628 |
| Resource | 1,864 | 713 | 41.7 | 58.4 | 66.8 | 100.0 | 120.7 | 521 | 8 | 25 / 628 |
| Mine planning | 3,401 | 753 | 41.6 | 54.1 | 58.4 | 87.6 | 116.7 | 506 | 4 | 35 / 849 |
| Metallurgy | 1,497 | 1,023 | 25.1 | 50.0 | 66.6 | 83.3 | 100.0 | 301 | 0 | 62 / 849 |

Every scene remained `ready=true` for the full sample; the browser recorded no page exceptions. The observed p95 intervals of 54.1–66.8 ms do not meet a 30 fps p95 target (33.4 ms). A 12-second Topography V8 profile collected 7,471 samples, of which 6,655 were idle; no single JavaScript function dominated. This does not attribute the missed frame budget to the GPU, driver, renderer or app code, and long-task attribution also varied by chapter. Collect a matched zoom sample, physical-mouse run, renderer/GPU timing and controlled background-load baseline before selecting a visual-quality trade-off. Performance acceptance remains open.
