# Tanga next phase: presentation quality and viewer reliability

Date: 23 October 2026. Status: implementation in progress on `codex/tanga-investor-experience`.

## Outcome

Make Tanga feel like one professionally directed presentation: viewers understand the project, follow the evidence, and can explore without losing their place. Keep the existing Next.js, Cesium/MapLibre/deck.gl, Three.js and overlay-slot architecture. Extend the existing presentation controls instead of creating parallel controls.

The next release should prioritize composition, legible evidence and predictable interaction. More geometry and animation are valuable only when they clarify a chapter's purpose.

## Review basis and findings

This plan combines the earlier reference review, a fresh Chrome review of the branch preview (closing chapter, geology source and mapped stages, metallurgy, peer comparison and mine overview), a fresh look at GeoLibre and VRIFY 24527 slide 12, and targeted source inspection. It is not a fresh exhaustive audit of every slide in every reference deck or a measured performance benchmark. Design and UI styling skills and the UI Expert critique were used.

Observed opportunities:

- Geology simultaneously presents chapter navigation, surface/drilling/geology/estimate navigation, four map/model stages, a story footer and a stage action. The map is readable, but the controls compete for attention. The mapped view has a narrow terrain image surrounded by broad grey space.
- Metallurgy has a clearer sequence than before, but the flotation equipment occupies a small part of its pale canvas. The selected result and the separate SEM observation are visible together, even though the UI correctly states they are not linked.
- The mine overview frames the pits prominently while the lowland plant and water facilities sit near the bottom edge and behind the lower overlays. Some facility label headings truncate.
- The peer globe now fits between the panels. Preserve this improvement; further work should emphasize selection, hierarchy and the dated comparison basis.
- The final chapter repeats similar wording in its callout, right panel and bottom cue. Give this chapter an explicit decision-oriented visual composition.
- Source inspection confirms existing presentation/explore modes, layer search and opacity, projected label placement, scene load states, asset caching, resolution adaptation and chapter hash links. These are foundations to consolidate, not missing features to recreate.
- The 3D error message currently asks the viewer to switch scenes and return. An in-place retry and an intelligible fallback would be better for a live meeting.
- Chapter hashes currently restore the chapter; the map/model substage and selected object need an explicit share-state design.
- Workbench and geology-scene files each contain thousands of lines. Extract the responsibilities touched by this work in small steps to make future UI changes less likely to break scene behavior.

## Reference patterns to adapt

| Reference | Useful pattern | Tanga application |
|---|---|---|
| [VRIFY Present](https://vrify.com/product/present) | Mix project context, source material and interactive 3D; move between prepared narrative and questions | Keep the guided story, then offer a clear return from exploration to its exact view |
| [VRIFY 24527, slide 12](https://vrify.com/decks/24527) | Translucent categorical polygons over satellite context, anchored legend, restrained outlines | Improve the existing geology drape and its framing; retain source rock colors and show map registration limits |
| [VRIFY 24303](https://vrify.com/decks/24303) | Stable geography while successive views change the evidence | Preserve orientation between mapped units, drilling and the separate geological interpretation |
| [VRIFY 24464](https://vrify.com/decks/24464) | Regional-to-project-to-geology/drilling progression and visual comparisons | Give every authored view one question, one focal object and one takeaway |
| [VRIFY 24534](https://vrify.com/decks/24534) | Facility relationships, fine annotation leaders, surface/subsurface contrast | Author mine-site overview and detail compositions around connected facilities |
| [VRIFY 24631](https://vrify.com/decks/24631) | Map/target/resource sequence and independent legends | Keep legends stable while revealing different evidence |
| [GeoLibre](https://web.geolibre.app/) | Named layers, compact selected-layer opacity, identify tool and orientation readouts | Consolidate existing layers into a compact inspector with selection, source and reset behavior |

These are presentation and interaction references. Their geological assets, project claims and proprietary branding are not inputs to the Tanga model. Deck-specific observations other than the fresh 24527 review come from the previous review recorded in TANGA_PRESENTATION_FLOW_2026-10-22.md.

## Visual direction

Use restrained dark panels, warm white typography, the existing copper brand accent and bright natural satellite terrain. Geological colors remain categorical and independent of the brand accent. Reduce decorative gradients, repeated frames and overly small uppercase text.

- Define one shared spacing, typography, panel, button and focus-state system in the existing design tokens/CSS.
- Desktop default: one concise story panel, one compact instrument group, one navigation rail. Aim to keep at least 65–70% of the primary scene region free of opaque interface panels where the chapter permits.
- Use a short active-view title and one sentence explaining its meaning. Detail belongs in the existing evidence disclosure.
- Maintain one primary Continue action per authored view. Stage navigation and chapter navigation must look and behave differently.
- On phones, use a compact bottom sheet that expands for evidence; do not shrink the desktop panel stack into the scene.
- Use at least 16 px for ordinary explanatory text and 44 px touch targets. Small metadata is secondary and available in a larger evidence view.
- Give each terrain view an authored daylight setup. Calibrate texture brightness and color handling before adding light intensity. Preserve rock-color distinctions and avoid clipped highlights.
- Camera motion should establish a view, then stop. User input interrupts travel immediately. Reduced-motion users receive the same information without flight or autoplay.

## Workstream checklist

### A. Establish reliability and a measurable baseline — P0

- [ ] Record first useful frame, scene-ready time, transfer size, frame times and failure modes for all 12 chapters on the current branch.
  - [x] Warm-cache, foreground Chromium baseline recorded at 390 × 844 and 1707 × 842 on Intel UHD Graphics; includes 12 chapter startup signals, 3D readiness markers and short RAF frame-pacing samples: `docs/TANGA_VIEWER_BASELINE_2026-10-23.md`.
  - [ ] Repeat with cold cache and real network-transfer accounting; capture 30-second orbit distributions and failure/recovery behavior on the named laptop and physical phone. The warm browser run does not satisfy these checks.
  - [x] Changed adaptive resolution to respond to sustained 90-frame p90 latency and recorded a 30-second desktop subsurface orbit: p95 remained 50.1 ms after render scale stepped to 0.75, so this confirms adaptation but not a measured speed-up. Details and limitations: `docs/TANGA_VIEWER_BASELINE_2026-10-23.md`.
- [x] Audit survey, regional terrain, collars, resource blocks and interpreted mesh transforms against their coordinate/elevation metadata. Report unresolved vertical-reference and two-hole source discrepancies; do not shift recorded drillholes to make them look attached. Reproducible results: `docs/TANGA_SPATIAL_REGISTRATION_AUDIT_2026-10-23.md` and `scripts/audit_tanga_spatial_data.py`.
- [ ] Exercise orbit, below-ground camera, zoom, reset, direct chapter entry and rapid chapter switching. The authored geology camera being overwritten by a generic startup tween was reproduced and fixed; initial 390 px and desktop chapter entry now retain their authored views. Remaining interaction and stale-update cases are unverified.
- [x] Introduce in-place scene retry, visible loading stages and a chapter-specific static fallback from the actual project scene. Keep explanation and navigation usable when WebGL or assets fail. Five project scenes use saved rendered stills; metallurgy uses the original analytical table. A forced model 503 showed the still, story panel, pager and retry; after removing the failure, retry returned to `3DReady`. Simulated WebGL loss in the geology scene and metallurgy showed the appropriate still/evidence view; context restoration returned both to usable renderers. At 390 × 844 the fallback image loaded without horizontal overflow. See `TANGA_STATIC_FALLBACKS_2026-10-23.md`.
- [ ] Make asset fetches deduplicate and cancel or ignore obsolete work safely; failed promises must be retryable. Check shared asset ownership before changing disposal.
- [ ] Verify WebGL context loss/restoration, background-tab behavior and repeated scene revisits; restore the same authored state after recovery where possible.

Acceptance: no unhandled error or stranded loading state in the agreed navigation/failure matrix; datum or coverage gaps are visible and documented rather than hidden by geometry edits.

### B. Unify the presentation interface — P0

- [ ] Inventory all existing panels and controls and consolidate duplicate information into the common overlay slots.
- [ ] Merge the chapter-purpose cue and local Continue action into a single consistent story/navigation hierarchy.
- [x] Simplify the current 4m51s guided-story and separate per-chapter timing controls into a clear tour preset plus advanced timing settings. Renamed the preset "Full story", clarified that play controls chapter views and that advanced 60/90/120-second timing applies to chapter playback only, and added full-tour plus timing controls to the phone Tools sheet. Verified on the local production app at 390 × 844 and 1440 × 900: full-story playback starts at chapter 1, timing selection updates, the advanced menu explains the authored timing distinction, and the phone page has no horizontal overflow.
- [x] Make the existing presentation/explore toggle explicit: explore pauses the story; Return to story restores the current authored shot and layer state. Verified on the local production build with autoplay running: entering Explore stopped playback, remained on chapter 7 through a 1.2 s wait, and returning restored the authored view while preserving 55% surface opacity.
- [ ] Use measured panel bounds to reserve space for the model, camera target and labels on desktop/tablet/phone.
- [ ] Consolidate scattered style overrides into semantic tokens as affected components are changed; keep a screenshot baseline for each chapter.

Acceptance: no duplicated primary Continue action; no model focal point or selected label covered by a panel in the target viewport matrix; controls keep consistent positions and keyboard focus.

### C. Make geology the signature interaction — P0/P1

- [ ] Check digitized polygons against the source sheet, including fragmentation, holes, unit assignment and possible raster-label/line contamination. Do not smooth or invent geological contacts for visual effect.
- [ ] Audit map registration using identifiable coordinate-grid control points. Record the transform and residuals; improve registration only where the source supports it.
- [ ] Reframe the map footprint within the available canvas. Use registered surrounding imagery/terrain where available, and clearly distinguish survey coverage from regional context; do not bridge unverified elevation joins.
- [x] Re-tune the measured-DEM elevation tint and terrain fill light for clearer ridge/valley relief; retain the 1× source elevation and identify the tint as display treatment, not land cover. Reviewed the ready desktop scene.
- [x] Keep source sheet → north-up mapped units → oblique mapped terrain → separate interpreted depth. Show a deliberate transition rather than implying that polygons are physically extruded into the existing model. Verified all four authored stages in the local production build: the source image loads; mapped and relief stages identify digitized surface polygons; depth stage explicitly says "separate interpreted volumes" and preserves the viewpoint while the surface opacity fades and model depth opacity rises.
- [x] Add click/tap selection to the existing hover identification: highlight a unit, dim other units gently, and show its name, swatch, source and interpretation status in the shared inspector. Fixed the pointer-up selection path so a click after hover is not swallowed by hover throttling or OrbitControls. Verified on the local production build by clicking a mapped polygon: the Graphitic schist inspector appeared and the share URL gained `feature=Graphitic+schist`; the same selection persisted through mapped surface → terrain relief → interpreted depth → mapped surface. Legend selection remains available as the keyboard/touch alternative.
- [x] Couple map/model highlighting only for verified unit-name mappings. Keep unmatched units explicitly distinct.
- [x] Put map-fill opacity beside the mapped-geology layer; retain terrain opacity as a separate clearly named control. The current two opacities must not be confused.
- [ ] Include a fixed section view or section-plane interaction only where supported by the existing model. Label orientation and vertical scale; flag any exaggeration.
- [ ] Add grab-sample markers only if report coordinates or a defensible map registration are available, with sample IDs and provenance.

Acceptance: select a rock unit in plan, tilt, reveal the interpretation and return without losing orientation; its color and evidence basis remain understandable throughout. No invented sample locations or volume reconstruction.

### D. Make annotations and selection consistent — P1

- [ ] Extend the existing anchor/label placement system across map and Three.js views with stable feature IDs and explicit coordinate spaces.
- [ ] Use one prominent selected annotation and a small number of contextual annotations per view. Collapse lower-priority labels instead of letting them fill the scene.
- [ ] Reproject leaders during camera movement; hide labels behind the camera or outside coverage. Define occluded versus deliberate x-ray labels consistently.
- [ ] Clicking a model object, legend row, peer row or map marker selects the same feature, with an equivalent keyboard/touch route.
- [ ] Preserve complete facility names in the inspector even when compact map labels abbreviate them.

Acceptance: marker endpoints stay attached at every camera preset and during zoom/resize; selection is reversible and never depends on hover alone.

### E. Give every chapter a distinct visual job — P1

| Chapter | Next improvement | Signature action / proof |
|---|---|---|
| 1. Meet Tanga | Strong project landscape, brief introduction, immediate entry into the story | One controlled approach to the project footprint; intro media can be skipped |
| 2. Place it on the map | Clear country → region → project scale change | Stable locator inset as the camera approaches Tanga |
| 3. Work completed | Make the documented work visible as a dated evidence timeline | Select a milestone to reveal its actual survey, drilling or report asset |
| 4. Read the landscape | Explain relief using the measured surface | Select a supported transect and relate the profile to the 3D terrain; show coverage |
| 5. Follow a recorded hole | Make recorded drilling understandable | Select one actual hole and follow intervals with depth/assay/lithology; keep the recorded trajectory |
| 6. Reveal the host rock | Deliver the geology sequence in workstream C | Select one mapped rock unit and retain orientation into the interpreted depth view |
| 7. Understand the model | Relate report totals to spatial representation | Show a model section or category reveal, with report totals distinguished from displayed/sampled blocks |
| 8. Global peer field | Retain the clear globe; sharpen the comparison narrative | Show the dated peer list, introduce Tanga, highlight its position and link each peer to its source |
| 9. Fit a concept to ground | Author a complete site composition before facility close-ups | Frame pit, feed, plant and water facilities together, then trace the proposed material/water relationships |
| 10. Examine the testwork | Give actual evidence visual prominence | Larger instrument or source image beside one selected result group; distinguish TC, recovery and size fractions |
| 11. Connect to the port | Make logistics legible | Follow the selected route and clearly distinguish route geometry, direct distance and estimates |
| 12. Evidence to decisions | Replace repeated closing text with a decision map | Three clear study questions, each linked back to its supporting evidence and next work |

- [ ] Create an authored-shot specification for each row: camera target, visible layers, one takeaway, interaction, source and fallback image.
- [ ] Reduce the metallurgy canvas whitespace by fitting the selected instrument to the view. Use authentic report images as primary evidence when an illustrative model adds little explanatory value.
  - [x] Matched camera-fit calculations to the closer 24° exhibit camera, left margin around every fitted stage, and changed the exhibit bay to a contrasting dark finish. All five desktop stages and phone stages 1, 3 and 5 were visually reviewed.
- [x] Reframe mine overview using the complete pit, plant and facility footprint; keep close plant detail in its authored view.
- [ ] Keep facility footprint and location status explicit: report candidate, approximate registration, or illustrative addition. Tailings/water geometry remains a concept until supported by engineering.
- [ ] Keep peer comparison after resource. Verify the common metric, reporting date and category for every entry before asserting a rank. Any fifth-place claim is scoped to the selected benchmark unless a current comprehensive census supports it.
- [ ] Trace metallurgy figures and any consent/qualification statements to the actual report wording and permissions before the investor release. Do not link SEM images to result groups without evidence.

Acceptance: every chapter introduces a different question or dataset; advancing never merely changes the camera without adding meaning. The displayed data basis can be reached from the view.

### F. Make sharing and delivery dependable — P1/P2

- [x] Extend existing chapter URLs with a small versioned, validated view state: chapter, substage, selected peer/map unit and layer options. Preserve old hash links and provide safe defaults for invalid state.
- [x] Add Copy this view and a deterministic Return to story. Avoid embedding private report content or unbounded camera data in links.
- [ ] Refine preloading around the current and next authored views. Audit existing high-resolution image warmups before adding further downloads.
  - [x] Send the block-model warmup directly to `/api/block-model` instead of probing the nonexistent `/BlockModel.geojson` path first; local production opening logged no console errors.
- [ ] Apply device-appropriate resolution and asset detail while preserving source values. Load detailed plant meshes only for relevant close-ups.
- [ ] Add a presenter readiness view for required assets, missing data and a validated set of fallback images. An optional predownload mode must state exactly which chapters/assets are ready; do not promise full offline maps.
- [ ] Validate Vercel preview and Cloudflare Worker preview independently, including same-origin R2 requests, range requests where relevant, caching and stale service-worker behavior.
- [ ] Check the intended investor link in a clean unauthenticated session. If access is protected, resolve the intended sharing method explicitly without silently changing protection settings.
- [ ] Review the existing R2 development-URL dependency and plan a production asset domain if supported by the user's domain setup. Recheck current account state before any deployment changes.

Acceptance: a shared link opens the intended view; missing assets produce a usable fallback; both runtime targets are checked before release. Build compatibility alone does not establish a working Cloudflare deployment.

## Implementation order and release gates

1. **Foundation:** A plus the UI inventory in B. Establish a real baseline and fix reproduced geometry/navigation failures first.
2. **First visible release:** B, C and the shared annotation pieces of D. Deliver the unified shell and a polished geology experience together.
3. **Full story release:** finish D and E across all 12 chapters, concentrating on mine-site framing and metallurgy evidence.
4. **Delivery release:** F, cross-device checks, source review, deployment verification and a complete rehearsal.

Keep checklist items open until evidence exists. Implement small commits on the existing project branch with before/after screenshots and a rollback point for each release. Extract shared scene loading, camera/state and label responsibilities only as needed for these changes; retain the current rendering architecture.

## Proposed acceptance targets

These are targets to measure during implementation, not claims about current performance. Record device/GPU, browser, viewport, network and cold/warm cache conditions with results.

- Desktop UI and meaningful fallback/intro content within 2.5 seconds; target first usable project 3D within 8 seconds on a named reference laptop at 20 Mbps / 100 ms RTT. Budget and tune actual assets after the baseline.
- Warm transition to the next prepared view within 1 second excluding deliberate camera travel.
- During a 30-second orbit, target median 60 FPS on the reference desktop and p95 frame time at or below 33 ms; use a recorded mobile device with a 30 FPS target. Reduce display detail rather than change scientific data.
- Repeated full-story navigation: three loops without context exhaustion, stale selections or retained scene resources growing continuously. Use renderer/resource counters where browser memory metrics are unavailable.
- Layout snapshots at 1920×1080, 1366×768, 1024×768, 390×844 and 844×390. No hidden primary controls or clipped active feature.
- Keyboard navigation, focus visibility, reduced motion, touch selection, dialog dismissal and readable contrast checked in each shared component and representative chapter.
- Failure checks: missing model, failed texture, slow asset response, unavailable route service, context loss, direct substage link and quick previous/next actions.
- Release checks: typecheck, required builds, focused regression tests for shared state/loading/label logic, current browser screenshots, verified source references and deployment-specific asset checks.

## First implementation package

Start with the measured viewer baseline, one consolidated story/navigation shell, and the geology sequence. This addresses the most visible repetition and protects the spatial behavior on which drilling, resource and mine planning depend. Follow with the mine overview and metallurgy compositions, then apply the shared patterns to the remaining chapters.

## Implemented package and verification notes

- [x] Compare survey DTM, regional DEM, all 100 viewer collars, the original survey collar shapefile, AMC MRE collar CSV, interpreted geology GLB bounds, presentation grids and all 155,952 resource block features. Record the two unresolved collar mismatches and undeclared vertical references; preserve every recorded source coordinate. Reproduction steps and detailed results are in `TANGA_SPATIAL_REGISTRATION_AUDIT_2026-10-23.md`.
- [x] Clear failed shared drillhole, terrain-boundary and road promises so transient request/parse errors can retry on revisit; keep assay intervals available if optional lithology enrichment fails, then retry that enrichment later. `npm run typecheck` and `npm run cf:build` pass. Full network-failure injection, rapid-switch and WebGL-context-recovery checks remain open in A.
- [x] Add in-place retry for a failed Three.js scene. Retry remounts the current chapter scene and keeps the presenter in place.
- [x] Save/restore authored shot, peer selection, mapped geology unit and validated layer visibility/opacity in version 1 links.
- [x] Let a viewer select a mapped unit from the legend or by pointer selection on the map, see its evidence limits in the story panel, and dim the other polygons. Verified named links highlight only the matching interpreted model units; unmatched names remain separate.
- [x] Split digitized map-polygon visibility/opacity from terrain, interpreted 3D model and other site context; keep concise layer labels and default earlier v1 links to the new layer's safe visible/full-opacity setting.
- [x] Remove the redundant bottom Continue cue from the four-step map/model story where the map panel already owns stage navigation.
- [x] Keep metallurgy report figures accessible from the results inspector instead of placing a large source thumbnail over the equipment canvas; tighten the instrument framing.
- [x] Make Explore → Return to story reapply the current authored camera/view without discarding layer settings; the local copy-link action reports success.
- [x] Add a static authored scene image on Three.js scene failure; the chapter story panel, navigation and in-place retry remain available. Add the original report analytical table as metallurgy's WebGL failure fallback. Captures and limitations are in `TANGA_STATIC_FALLBACKS_2026-10-23.md`.
- [x] Expand mine overview bounds to include the actual conceptual plant and illustrative facility footprints; use a wider, higher-angle overview and keep close-up actions separate.
- [x] Confirm the local app and local Cloudflare Worker preview load the versioned geology stage with `ready=true`; the Worker served terrain, geological-model and geology-polygon requests successfully.
- [x] Confirm the copy-link button reports success and the explore toggle returns to the story presentation.
- [x] Confirm the production build renders a dedicated mapped-polygon control; reducing it to 35% visibly fades the surface while terrain opacity remains unchanged, and the setting is written into the share URL.
- [x] Confirm the Cloudflare local Worker preview restores a 35% mapped-geology setting from the expanded v1 URL and reaches scene `ready=true` without browser console errors. A hosted Cloudflare deployment was not changed or verified.
- [x] Confirm clean production builds for Next.js and OpenNext/Cloudflare, with no browser console errors on checked geology/mine/metallurgy views. MapLibre emitted graphics-buffer performance warnings; a controlled frame-rate benchmark has not been recorded.
- [x] Fix the initial geology camera being replaced by a later generic startup tween, and delay Three.js `ready` until a populated frame has rendered and the authored camera move settles. Verified on the local production app and local Cloudflare Worker preview: desktop (1707×842) retained its 16.2° authored view; phone (390×844) used the 25° relief view; both had no horizontal page overflow, settled camera state, visible terrain/polygons, and first useful frame at about 4.1–4.6 seconds. The Worker run logged no browser errors; it did log graphics-buffer warnings.
- [ ] Complete 12-chapter and responsive screenshot review; measure cold/warm load, transfer and frame-time budgets.
  - [x] Reviewed fully ready desktop captures for all 12 chapters; later project chapters show no visible alerts, and 3D views reached ready.
  - [x] Captured and visually reviewed 390 × 844 mobile layouts for resource, peer, logistics and closing chapters; separated resource camera/opacity controls and moved the closing evidence action clear of the decision panel. No horizontal overflow or browser errors in this focused pass. The full multi-viewport matrix and device GPU/frame-time measurements remain open.
- [ ] Validate scene retry against stale requests and repeated scene revisits.
  - [x] Injected one 503 for the interpreted geology model, confirmed `ready=false`, and verified the retry alert remains clickable above the presentation HUD at desktop and 390 × 844. After removing the failure, retry fetched the model with HTTP 200 and returned the scene to `ready=true`. Three console errors in this run were the injected 503 and failed remote fallback; no new console errors appeared during recovery.
  - [x] Simulated WebGL loss and restoration with `WEBGL_lose_context` in both the subsurface viewer and metallurgy exhibit; both surfaced recovery UI, rebuilt, and returned to ready.
  - [x] Forced context loss after orbiting the subsurface scene; recovery restored the saved camera position, target and field of view, then returned to ready. Cleared the stale camera command during retry so it cannot overwrite the recovered view.
  - [x] Rapid chapter revisits across surface, drilling, geology, model, mine planning and back to geology ended on the selected chapter with one live canvas, `ready=true` and no alerts or console errors. Local production browser checks only.
- [x] Inspect the revised metallurgy camera fit after a clean production reload: all five instrument stages rendered at 1707 × 842 and 390 × 844, with no horizontal overflow; phone screenshots sampled stages 1, 3 and 5.
- [x] Capture and wire local production stills for terrain, drillhole, interpreted geology, resource and conceptual mine scenes; use the original lab analytical page if the metallurgy renderer fails. Injected a 503 for `geologicalModel.glb` after clearing the app cache: fallback image loaded, story panel and pager stayed usable, and retry returned to 3D readiness after removing the injected response. Simulated WebGL loss/restoration in the geology and metallurgy scenes; each showed its still/evidence fallback and recovered. Phone fallback at 390 × 844 loaded with no horizontal overflow. The 503 test intentionally produced three browser errors; recovery added no browser errors.
- [ ] Verify the pushed Vercel preview and live Cloudflare deployment, inspect public access and production R2 asset configuration. The local Cloudflare preview passed; the hosted Vercel session currently redirects to login.

Responsive review note: the earlier 390 px capture showed a transparent canvas while reporting ready, so it was not a valid visual pass. A clean local production and Cloudflare Worker capture now shows visible terrain and mapped polygons; the ready state is withheld until the first useful frame and authored camera motion complete. Mobile visual checks now cover the mapped-relief geology view and all five metallurgy stages at 390 × 844 without horizontal overflow. The full responsive chapter matrix, cold-cache transfer budget and native-device GPU behavior remain open.
