# Tanga: cinematic scientific viewer

Research and implementation review — 19 September 2026. Local changes only; not a deployment certificate.

## Reference findings

- [GeoLibre live workspace](https://web.geolibre.app/) was opened and visually inspected. Its central map, side-docked layers, collapsed secondary panels and small navigation tools provide a useful separation of content and controls. No project data was uploaded.
- [GeoLibre story maps](https://geolibre.app/user-guide/storymaps/) documents chapter-specific camera moves, layer fades and optional rotation. Adapt the chapter choreography, not the entire GIS authoring interface.
- [VRIFY Present](https://help.vrify.com/en/articles/10452792-getting-started-with-vrify-present) documents interactive layers, hotspots and labels anchored in aligned project data. This review consulted the product guide; it does not claim a fresh inspection of every slide in deck 23611.
- [Seequent Visible Geology activity guide](https://files.seequent.com/PDFs/EarthScienceWeekVisibleGeology2024Activity-Designed.pdf) connects 3D models, sections and cores. Its teaching pattern is useful; synthetic educational geology is not evidence for Tanga.

## Art direction — recommendation

Retain charcoal, copper and teal. Use warm key lighting, cool fill and crisp silhouettes. Let the geology occupy the central visual field. Reveal one relationship at a time, then hold still for explanation. Reserve cyan for interaction and copper for authored emphasis; retain geological categorical colours. Avoid bloom, floating particles, animated scanlines and additional WebGL canvases.

Camera grammar: establish context → move to evidence → hold → restore context. User orbit must interrupt an authored move. Every inspection needs a return action. Prefer 1–2 second transitions and several seconds of stillness; a 15–20 minute presentation is not a continuous camera flight.

## Implemented in this local pass

| Scene | Added interaction | Evidence safeguard |
|---|---|---|
| Geology | Separated-unit reveal and reassembly | Explicitly displaced illustration; sections restore registered positions |
| Geology | Selected-unit spotlight | Retains unit geometry and classification |
| Drilling | Follow a selected hole with depth and interval readout | Recorded intervals only; marker hides in gaps |
| Resource | Replay spatial block assembly and restore | Display counts only; no changed grades or block coordinates |
| Mining | Animated pit cutaway | Target blocks stay in their true positions |
| Mining | Stepped bench reveal | Concept illustration, not excavation schedule or reserve |
| Metallurgy | Rotating layered graphite inspection | Stylised geometry, not microscopy |
| Metallurgy | Vibrating sieve-stack inspection | No inferred measured size distribution |
| Metallurgy | Two selectable sample-group displays | Equal illustrative fill, no inferred yield; reported values retained |
| Conclusion | Three-scene evidence replay | Visits actual geology, drilling and metallurgy scenes |

Metallurgy inspection models now have restrained teal-ring display plinths. These are decorative, not measurement scales. Existing pause controls and reduced-motion handling are retained. Animation controls live in existing panels, not new floating windows.

## Performance changes

- Reuse one projection converter per geology model and avoid temporary vector allocation per vertex. A 20,000-point exact-equality regression test checks that the transformed coordinates are unchanged.
- Local microbenchmark showed roughly 8× faster projection math in earlier runs. This is **not** an 8× end-to-end loading claim; downloads, decoding and GPU upload remain separate costs.
- Mining camera setup and scene readiness no longer await optional truck-route screening. Truck routes prepare separately with loading/failure feedback and cancellation guards.
- Skip heavy animation/render work when the document is hidden. Inspection illustrations share the existing renderer and add no external asset downloads or post-processing passes.

## Next design work, not yet implemented

1. Opening/location: a short globe-to-site move ending on a stationary site view; retain geographic context through a small orientation cue.
2. Footprint/surface: one controlled terrain-opacity reveal, keeping the existing boundary unchanged. Do not imply legal verification of that boundary.
3. Geology/section: a linked section-plane sweep and corresponding 2D trace; synchronize the section position rather than playing an unrelated animation.
4. Drilling/resource: select a recorded interval and highlight nearby model cells with a clear distinction between observation and interpretation. Do not imply direct one-hole validation of every nearby block.
5. Mining: north/south camera bookmarks and an optional target-to-pit inspection sequence. Keep plant scale and routes concept-labelled.
6. Metallurgy: select a sieve fraction to reveal its reported result, only where an actual fraction value exists; never infer missing fractions from decorative particles.
7. Logistics: animate route progress only along a sourced route and label schematic alternatives.
8. All scenes: expand automated collision checks at 1366×768, 1920×1080 and narrow layouts; test layers, legends, tooltips and evidence panels in combination.

## Verification and remaining limits

Type checking and production build passed after the main animation and non-blocking haul-route changes. Targeted animation tests cover count restoration, clipping restoration, unchanged vertices, finite inspection transforms and projection equivalence. The final decorative plinth adjustment is additionally type/test checked and browser inspected.

Local browser checks exercised geology separation/section reset, drilling pause, resource assembly, mining cutaway, metallurgy inspection and closing replay. Screenshots were reviewed for several key states at a compact laptop viewport. This is not an exhaustive every-slide/every-resolution certification. Full browser reduced-motion coverage, cold-network profiling and production/R2 checks remain separate acceptance tasks.

Do not commit or deploy as part of this design review. Preserve existing data and boundaries. No new mineral resource, reserve, recovery or economic claims are introduced by the animations.

## Visual retry

The second pass replaces fixed inspection camera positions with per-mode, aspect-aware framing, removes the bench-stage row during inspection, adds slow illustrative separation of graphite sheets, and improves graphite contrast. A new regression samples actual animated vertices at five times and four aspect ratios for all three inspection modes to check clipping. Type checking and these tests passed. The dev server had stopped; it was restarted before fresh browser checks at 1366×768. Pause held inspection time at 17.62 seconds across separate observations. Clicked tooltips now dismiss rather than lingering over results, and paused/reduced-motion inspections start in a settled pose. These retry changes have not been deployed or separately production-built.

## Story-flow implementation and follow-up QA — 25 September 2026

This section supersedes the corresponding items in the earlier future-work list; it does not claim every earlier idea has shipped.

| Area | Implemented behavior |
|---|---|
| Shared motion | Cubic camera easing, brief establishing movement then hold; manual orbit cancels camera automation and autoplay |
| Geology | Boundary-contained section offsets at 25 m viewing stations; optional −100 to +100 m sweep updates the registered 3D locator and filled section together |
| Drilling | Recorded-interval journey with an initial close view and subsequent whole-hole context; depth, lithology and assay readout |
| Resource | Smooth grade emphasis retaining dim full-model context; fade respects layer opacity and entry reveal |
| Mining | North pit, South pit and Whole site camera presets; drill evidence → grade targets → pit concept → processing beats |
| Metallurgy | Guided equipment closeups, stage/basket emphasis, manual sample selection stops the tour; inspection modes retain reported test-group results |
| Conclusion | Evidence recap starts presenter-controlled; explicit next/resume/return controls |
| Performance | Resolution governor lowers pixel ratio after sustained slow frames; lower-resolution main scenes skip postprocessing, without altering geometry or assays |
| Layout | Removed the deck's 1180 px minimum width, corrected duplicate closing title, retained scrollable evidence panels |

### Checks and observed results

- Type checking, cross-section regression and scene-animation regression passed. The final production rebuild and service-worker generation passed after the layout/initialization corrections.
- Linked section sweep was observed at −100 m and +100 m: locator coordinates shifted by 200 m and closed model intersections changed from 7 to 11 loops.
- Mining North-pit preset and the shared authored-camera reset both worked; reset returned camera distance from 2449 to 4798 scene units and reported the authored-view status.
- Layout audits found no panel overlaps/out-of-viewport panels in the tested mining states at laptop and tablet size. Tablet metallurgy inspection also passed at 768×1024 after the width fix. Resource overview was visually reviewed at 1920×1080.
- Reduced-motion metallurgy inspection remained at its settled 6.00-second pose across observations; manual sample selection and return-to-bench controls remained available.
- Closing screenshot confirmed the duplicate title card is gone. Additional map-scene layout checks covered Tanzania, footprint, topography and access at laptop size.
- No JavaScript errors were returned by the checked browser session. Some automation attempts lost their browser connection or hit the entry cover; only successful, correctly navigated states are counted above.

### Deliberate limits / remaining work

- Current haul-route screening rejected both candidate routes, so no trucks were spawned. This is the safe fallback, not verified truck animation. A separate route-design pass is needed; do not bypass boundary/pit screening for visual effect.
- The opening retains its existing geographic sequence, with settling motion improved; this pass did not add an entirely new terrain-opening sequence.
- Cross-section views share the same plane, but the filled view is a workbench, not a simultaneous split-screen 3D/2D comparison.
- No inferred metallurgy size fractions, economic reserve, new assay values or unsourced logistics route are introduced. Nearby-block validation and additional fraction-specific interactions still require suitable evidence and design work.
- Cold-network R2/Vercel loading, all phones, every panel combination and every slide at every resolution have not been certified. Local adaptive rendering is not a measured production speedup claim.
- No commit, R2 upload or deployment was performed by this implementation pass.

## UI, pacing and efficiency polish — no new features

Implemented after the live-app design review:

- Replaced the large copper transition and duplicate transition title with a 650 ms neutral fade (disabled for reduced motion).
- Connected the actual intro gate to the cover: finishing/skipping the intro enters the opportunity chapter directly. A DOM completion marker also handles a workbench that mounts late; deep-link entry behavior is retained.
- Unified existing panel/button styling, strengthened previous/next hierarchy, shortened navigation labels, styled the geology selector, and made section endpoint labels compact.
- Fixed resource replay controls sharing space with the grade legend. Closed and expanded replay states now have separate bounded slots.
- Refined geology fill/rim lighting and neutralised its terrain tint, preserved geological colours, softened mining target opacity after the target beat, and pulled resource framing back slightly. No boundary, pit, block or assay geometry changed.
- Reduced metallurgy exposure and fill-light intensity, widened basket-stage framing, made framing respond to resize, and kept only the selected basket's billboard visible. Hidden labels are excluded from ray picking; other baskets retain their tooltip and existing result buttons.
- Extended guided testwork holds to seven seconds per equipment stage and ten seconds at results. Camera transitions remain interruptible.
- Metallurgy highlights update on selection/mode changes instead of every frame. Telemetry writes run at 4 Hz, and settled paused/reduced-motion views skip GPU rendering until invalidated. The lightweight animation scheduler remains active to detect interaction. This is not yet an app-wide demand-rendering rewrite.
- Inspected existing preload/cache code: priority ordering and shared in-flight requests are already present, so no additional cache system was added.

Verification: separate TypeScript check, production build/service-worker generation, cross-section and scene-animation regressions passed. Browser review covered 1440×900 geology/resource/mining/metallurgy and 768×1024 metallurgy. Expanded resource and tablet metallurgy panel audits returned no overlaps/out-of-viewport panels in the tested states. Intro Skip reached the opportunity chapter without the second cover. Reduced-motion metallurgy inspection held at 6.00 seconds, with render count unchanged at 6 across a 2.2-second settled observation. No browser JavaScript errors were returned in the checked session.

Limits: this is targeted local QA, not every viewport/panel combination. Load telemetry in the development browser still showed seconds spent preparing heavy scenes; download, geometry preparation and GPU-upload costs were not independently benchmarked. No claim of faster production cold loads is made. Existing R2/Vercel deployments were not changed or validated in this pass.
