# Tanga: reference review and next presentation polish pass

Date: 23 October 2026. Reviewed branch: `codex/tanga-investor-experience`, commit `0ac3b98`.

This is a planning extension to the [main checklist](TANGA_NEXT_PHASE_PLAN_2026-10-23.md). The user requested a current-state and online reference review after pausing implementation. No application code or hosting configuration was changed for this review. The existing reliability and source-verification gates remain required.

## What was actually inspected

- The worktree was clean at the start. Read the current story data, evidence register, scene index, layer controls, projected callout placement and relevant investor CSS.
- Ran the existing optimized build on `localhost:3013` and reviewed Chrome screenshots and accessibility state at 2560 × 1215 CSS pixels, DPR 1.5. Views sampled: geology relief, mine overview, metallurgy flotation, peer comparison, drilling coverage and closing decisions. The scene index was opened and inspected. This is a desktop sample, not a new 12-chapter responsive or performance certification.
- Reviewed the already-open Vercel preview at `https://studio-5ppx878de-sudip686s-projects.vercel.app/`: Work completed and the completed mine overview. That preview still says “Guided story” and exposes a bottom Continue button; the local branch says “Full story” and has a noninteractive next-view cue. Deployment-to-commit correspondence was not established; assess the exact preview build before treating its UI as current branch behavior.
- Inspected all four VRIFY decks present in the Chrome inventory, sampling the relevant views below. This was not an exhaustive review of every slide. Scorpio's Manhattan Overview panorama showed an empty loading view during the sample; it is excluded from visual conclusions.
- Opened the official Cesium Melbourne story and the Esri Power of Proximity briefing in Chrome. Viewed Cesium slides 1–2 and Esri slides 1–2. GeoLibre was inspected in its existing empty-layer workspace; populated project behavior was not tested.

## Reference evidence and useful adaptations

| Reference | Fresh observation or verified source | Application to Tanga |
|---|---|---|
| [Silver North / VRIFY 24527, slide 12](https://vrify.com/decks/24527) | District Claim Status uses colored translucent areas over visible satellite relief, one compact legend and a thumbnail rail. These are company claim polygons, not geological units. | Use the layering and legend hierarchy for Tanga's mapped rocks; preserve the distinction between a map unit, project boundary and interpreted volume. |
| [RUA / VRIFY 24303, slides 3–4](https://vrify.com/decks/24303) | Model Level establishes the property and named targets; the next view adds a geochemistry overlay to the same geography. | Keep one recognisable footprint while the next chapter reveals a new dataset. Carry orientation between surface, drilling, map and interpretation. |
| [Scorpio / VRIFY 24631, slide 47](https://vrify.com/decks/24631) | Geology Overview shows interpreted colored volumes with a translucent surface and short leaders to named pits. The open deck's own title includes “DONT USE”; it is used here only as an observed UI reference. | Give the depth stage a clear surface/subsurface separation and restrained labels. The reference does not validate Tanga's geometry or claims. |
| [Silver Tiger / VRIFY 24392, slides 30–31](https://vrify.com/decks/24392) | The site overview separates pit, crusher, waste and ponds with short names; the following phase view introduces a different layer and legend over the terrain. | Explain connected facilities before close-ups. Any Tanga sequence remains a presentation sequence, not a production schedule. |
| [GeoLibre workspace](https://web.geolibre.app/) | Layer list, named visibility controls, exact opacity value, compact-view affordance, identify tool, reset pitch/bearing and a stable readout bar are visible. | Expand Tanga's existing inspector and controls consistently; show the selected layer's controls rather than another permanent panel stack. |
| [Cesium Melbourne story](https://ion.cesium.com/stories/viewer/?id=bc9cf675-c8dd-409c-8a13-052bd65de63f) and [official tutorial](https://cesium.com/learn/ion/stories-introduction/) | Live story has one readable information panel, small navigation group and reset control over a dominant 3D scene. The tutorial documents saved scene views and feature inspection. | Treat authored camera state as a recoverable view and keep one primary explanation beside it. |
| [Esri Power of Proximity briefing](https://storymaps.arcgis.com/briefings/fa6d97fe4b564aa3a222a8843b908bfc) and [Briefings overview](https://www.esri.com/arcgis-blog/products/story-maps/announcements/briefings-in-arcgis-storymaps) | The first two slides use a predictable header and strong title/content hierarchy. Official guidance supports maps, 3D scenes, media and linked slides. [Swipe documentation](https://doc.esri.com/en/arcgis-storymaps/latest/author-and-share/add-swipes.html) describes same-frame map/image comparison. | Alternate full-scene 3D, source evidence and concise decision layouts inside one shell. Use a comparison wipe only for spatially aligned representations. |
| [Sketchfab annotation introduction](https://sketchfab.com/blogs/community/want-your-models-to-tell-a-story-meet-our-new-annotations-feature/) | Official indexed source describes model points with descriptions and saved camera positions. The page returned 403 when opened; no fresh live Sketchfab model was visually reviewed. | Numbered hotspots can select a feature, open evidence and recover its best view without relying on hover. |
| [Matterport guided-tour practices](https://support.matterport.com/s/article/Guided-Tour-Best-Practices?ardId=kA05d000001DX1kCAG&language=en_US) and [editing features](https://support.matterport.com/s/article/Overview-of-Matterport-s-Editing-Features?language=en_US) | Official indexed guidance describes choosing tour positions, viewing angles and order, with titles, tags and descriptions. The direct support page showed a CSS/loading error. | Plan overview → relationship → detail as deliberate stops. A real 360° site tour requires real captured imagery; none is assumed here. |
| [Spline interaction concepts](https://docs.spline.design/interaction-states-events-and-actions/concepts/events-interactivity) | Official documentation describes events that transition between object states. This is documentation review, not a fresh visual appraisal of a Spline production app. | Define short, interruptible state transitions for highlights and panels using the existing Three.js stack. |

These are design references. Tanga keeps its own brand, source assets, data and rendering architecture.

## Current findings that change the next action

1. **Shared controls work, but the visual hierarchy is still fragmented.** Geology has the act ribbon, chapter label, surface/drilling/geology/estimate ribbon, four map stages, instruments and a story panel. Reduce simultaneous hierarchy while retaining direct navigation in the scene picker and Tools.
2. **Text is too small for presentation use.** Current CSS includes several 7–11 px labels and explanatory strings. Give ordinary explanation 16–18 px, panel headings 24–30 px and a clear metadata tier. Compact metadata must expand into readable evidence.
3. **Camera composition uses too much of the full viewport.** The geology horizon leaves a broad grey upper area; the mine shows a large finite terrain rectangle; the peer globe is small within the free central area. Fit the subject to the measured area between HUD panels, using different overview and detail compositions.
4. **Metallurgy still prioritises an illustrative object over evidence.** The flotation instrument occupies a small portion of the large blue bay. Place the verified result group and report figure prominently; use the model to explain the relevant operation. Source checks remain open.
5. **Mine relationships need a stronger visual sequence.** The lowland plant is present, but its compact label truncates and the relationship to feed and water is difficult to read in the overview. Use numbered facilities and a selected-relationship treatment, then a close equipment view.
6. **Drilling labels need a denominator correction.** The runtime initially exposed “98 holes drilled” alongside the 100-hole source panel. `assayFactsFromSegments()` derives `holeCount` from the reportable intercept summary; `threeCallouts()` labels that number as holes drilled. Use distinct totals for report holes, loaded traces and holes with above-threshold intercepts. Keep derived intercepts identified as app calculations, with their compositing basis accessible.
7. **The peer panel has unused vertical space.** The ten rows occupy the upper portion while the panel extends much further down. Use content-based height or fill the selected-project area with its dated source and category; enlarge the globe within the remaining safe rectangle.
8. **The closing scene still repeats a broad message.** A large globe, a callout, a right-hand three-step panel and a bottom cue all explain next decisions. Make the three decisions the composition, each with a direct link to supporting evidence.
9. **Core capabilities already exist.** The app has chapter URLs, versioned view state, layer settings, camera recovery, opacity, projected leaders, failure stills and a scene index. Improve these components in place. The current scene index is text-only; it has no thumbnails.
10. **Rendering cost still constrains polish.** The recorded local cold sample was 9.84 s with 37.5 MB in large response bodies. That is prior measured evidence, not a new result from this visual review. Preserve the existing performance gates before adding more detail or concurrent canvases.

## Thirteen implementation packages

The first nine packages refine existing A–F requirements. Packages 10–12 correspond to section G; package 13 is the distinct chapter art-direction reset in section H of the main checklist. Priorities are proposed implementation order, not completion claims.

| ID / priority | Change and intended result | Existing owner / acceptance evidence |
|---|---|---|
| BP01 · P0 | **Identify the reviewed release.** Record commit/deployment identity in presenter diagnostics; verify the exact share link on Vercel and Cloudflare. | F. A screenshot and asset response check must correspond to the named build; unauthenticated sharing tested separately. |
| BP02 · P0 | **One presentation shell.** Use one concise story/evidence panel, compact instruments and one navigation group. Apply semantic spacing, typography and panel tokens. Hide detailed layer controls until selected. | B. At least 65–70% of the primary scene region remains free of opaque HUD where feasible; narrative text ≥16 px, primary touch targets ≥44 px; no second chapter Continue action. |
| BP03 · P0 | **Compose around the subject.** Fit cameras using the scene's free rectangle; author one overview and one purposeful detail shot. Keep a named plan, oblique and below-ground route where supported. | A/B/E. Selected subject and leaders remain clear at 1366×768, 1920×1080, 1024×768 and 390×844. User input stops travel; reset restores the authored shot. |
| BP04 · P0 | **Natural terrain and intentional materials.** Calibrate texture color space/exposure, sun and fill; use modest contact shadows for plant detail, consistent roughness, restrained edge treatment and a deliberate background at the finite terrain edge. | A/C/E. Preserve DEM elevations, recorded drill coordinates and categorical rock colors. Compare matched captures before/after; inspect highlights and relief without adding unexplained vertical exaggeration or invented context terrain. |
| BP05 · P0 | **Make geology the signature reveal.** Refine the existing source → mapped surface → relief → interpreted depth sequence. Keep a selected unit and its color visible in one inspector. Use a readable relief view and retain a near-horizontal structural view as a separate preset. | C/D. Selection, orientation and layer state survive forward/back navigation. Unmatched map/model units remain distinct. Surface fill, terrain and interpreted-model opacity stay separately named. Raster artifacts require source-faithful extraction work, not invented contacts. |
| BP06 · P0 | **Make metallurgy evidence-led.** Start with a readable report figure and one sourced result group; use the equipment inset or detail state for explanation. Distinguish concentrate carbon, recovery and particle size. | E. Original report/page/test IDs are reachable; SEM remains separate unless a sample link is verified. Fit all five instrument stages without the large empty bay; source totals and permissions verified before release. |
| BP07 · P1 | **Explain a connected mine site.** Present overview → pit/feed → lowland plant → waste/water relationships → facility detail. Use short numbered map labels and full names/basis in the selected inspector. Improve materials and scale cues in the existing plant model. | D/E. Overview includes all relevant facilities; chosen relationship is visually traceable. Report candidate, approximate placement and illustrative additions have visible status. No unsupported capacity, schedule or engineering claim. |
| BP08 · P0 | **One selected feature everywhere.** A map marker, model object, legend or list row resolves to the same stable ID, selected state, evidence and camera action. One selected label has priority; contextual labels yield. | D/E. Orbit, zoom, resize and reverse navigation keep leader endpoints attached; behind-camera labels disappear. Full facility names and keyboard/touch selection work. Reconcile drilling count denominators during this caption pass. |
| BP09 · P1 | **Sharper peer and closing compositions.** Enlarge the globe without panel overlap; keep the dated comparison basis near the selected peer. End with three linked decision questions supported by source thumbnails, rather than another large globe plus repeated text. | E. Rank wording is scoped to the verified comparison set. Every close-out decision returns to its evidence and back. Captures show legible source/category/date and unobscured geography. |
| BP10 · P1 | **Visual chapter index.** Extend the existing All scenes overlay with lazy thumbnail stills, chapter title, question and current state. Optional desktop rail appears only on request. | G1. All 12 chapters remain keyboard/touch reachable; thumbnail loading creates no hidden WebGL scenes; selection closes the index and preserves story/explore behavior. |
| BP11 · P2 | **Same-camera comparison wipe.** Extend Compare original terrain with a draggable wipe for original surface versus concept; add terrain versus mapped geology only where both sides share registration. | G2. Both sides use the same camera, scale and coverage; keyboard slider is available. Use the current renderer/scissor or paired validated stills, rather than a second live scene. Labels identify each side and retain registration limits. |
| BP12 · P2 | **Executive highlights route.** Add a clearly labelled short route through six existing shots, with an approximately 90-second target after assets are ready; keep the complete 12-chapter story. | G3. Short route has a different label from chapter timing, no fabricated content and explicit return to the full story. Preload readiness and failure stills are checked before timing; manual interruption and reduced motion remain usable. |
| BP13 · P1 | **Redesign two chapters; reorient one.** Geology becomes a bright field atlas; metallurgy becomes a high-key sample/results board; mine planning keeps its site concept but starts from a north-up overview and offers a clear plan ↔ oblique preset. Keep the shared rendering architecture. | H. Desktop captures at 1707×842 and 1366×768; geology keeps map/relief/interpretation distinct, metallurgy separates TC/recovery/flake and preserves TDM008’s source-label discrepancy, and mine planning marks candidate/approximate/illustrative facilities with a visible compass, scale and reset view. Phone/tablet remains deferred. |

## Implementation tracker across both plans

The detailed workstream checkboxes remain authoritative in [the next-phase checklist](TANGA_NEXT_PHASE_PLAN_2026-10-23.md). This crosswalk prevents the reference-review packages from disappearing inside the larger A–G items.

- [ ] **BP01 / F:** Exact release identity and independent Vercel/Cloudflare/share-link verification.
  - [x] Show the build revision and runtime target in presenter Tools; hosted deployment/share verification remains open.
- [ ] **BP02 / B:** One shared presentation shell, semantic style tokens and clear panel hierarchy.
- [ ] **BP03 / A, B, E:** Subject-aware camera composition and recovery across viewport sizes.
- [ ] **BP04 / A, C, E:** Natural terrain/material treatment with source geometry preserved.
- [ ] **BP05 / C, D:** Geology sequence, selection continuity and map/model distinction.
- [ ] **BP06 / E:** Evidence-led metallurgy with verified report locators and qualifications.
- [ ] **BP07 / D, E:** Connected conceptual mine site with facility status and clear labels.
- [ ] **BP08 / D:** Complete cross-view feature selection and label review.
  - [x] Correct the drill callout denominator to holes with qualifying intercepts.
- [ ] **BP09 / E:** Peer and closing-scene composition, benchmark basis and linked evidence.
- [ ] **BP10 / G1:** Complete the visual chapter index release check.
  - [x] Add the lazy image cards, chapter questions, current-view indicator and dialog keyboard focus handling.
  - [x] Confirm desktop dialog visibility, chapter 9 jump and return to the requested URL hash.
  - [x] Finish desktop keyboard traversal, focus return and all 10 thumbnail path checks.
  - [ ] Defer phone/tablet review as requested.
- [x] **BP11 / G2:** Same-camera comparison wipe.
  - [x] Add the source/concept terrain split in one renderer with the live camera and a draggable, labelled divider; keep source limits in the concept panel.
  - [x] Verify the wipe pointer drag and keyboard range, comparison close, production build, and fresh desktop load with no JavaScript errors; measured 44.3 FPS with and without the wipe in a short local smoke sample.
- [ ] **BP12 / G3:** Six-shot executive highlights route.
  - [x] Add the 90-second six-view route with authored shots, per-stop indicator, load-aware holds, manual interruption and a separate full-story restart.
  - [x] Walk all six views in the desktop production build; the route ended on management decisions with no JavaScript errors.
- [ ] **BP13 / H:** Distinct geology, metallurgy and mine-planning visual identities; desktop first.
  - [ ] Approve/author the field-atlas, laboratory-evidence and engineering-board compositions and their exact source/qualification language.
  - [ ] Implement and visually review each at the two desktop target sizes; preserve camera, layer and evidence interactions.
  - [ ] Defer phone/tablet styling until the later device pass.

## Chapter-by-chapter storyboard for the next pass

This table is a proposed art-direction brief. Exact camera targets, source IDs, layer masks and fallback files still need to be captured in the authored-shot implementation specification required by E.

| Chapter | Unique question and visual action | Composition and evidence treatment |
|---|---|---|
| 1 · Meet Tanga | What is this project? Approach the project landscape once. | Strong actual project aerial; concise title and one-line introduction. Keep immediate entry and skipped-intro path; no unsupported opening rank claim. |
| 2 · Place it on the map | Where is it? Country → region → project. | Preserve a small locator and orientation while the main view changes scale. Keep only relevant country/region/site labels. |
| 3 · Work completed | What work stands behind it? Select a dated milestone. | One large source image plus a compact timeline; selected image, caption and report locator agree. Avoid repeated title and milestone descriptions in multiple panels. |
| 4 · Read the landscape | What does measured terrain show? Follow a supported profile. | Oblique daylight terrain overview with coverage boundary; selected transect ties a small elevation profile to the 3D surface. 1× elevation, declared datum limits. |
| 5 · Follow a recorded hole | What was sampled? Follow one real recorded trace. | Coverage first, then one selected hole/interval and compact depth readout. Separate report hole total, loaded traces and filtered intercept population; identify the unrelated source core photograph. |
| 6 · Reveal the host rock | How do surface mapping and depth interpretation relate? Select a unit and move through four stages. | Satellite relief with translucent source colors, narrow outlines and a stable legend/inspector. Clear transition to separate interpreted volumes; maintain orientation rather than extruding polygons. |
| 7 · Understand the model | What does the reported estimate add? Reveal a section/category. | One dominant spatial model, readable legend and small report-total card. Distinguish reported numbers from sampled/displayed blocks and view filters. |
| 8 · Global peer field | How does the dated peer set compare? Introduce Tanga and select a peer. | Bigger globe in the free center, content-sized chart, one selected source card. Use a common metric and verified category/date for the selected benchmark. |
| 9 · Fit a concept to ground | How could the proposed site connect? Trace a facility relationship. | Wide overview of pit/feed/plant/waste/water, then detailed facility camera. Candidate status visible; numbered short labels resolve to complete names and source basis. |
| 10 · Examine the testwork | What did a specific test show? Select one verified test group. | Report figure/result is the primary evidence; 3D instrument explains its step. TC, recovery and size fraction have their own labels and locators. |
| 11 · Connect to the port | What connections need study? Follow the site-to-port chain. | Selected route and endpoints, compact locator, clearly distinguished routed/direct/estimated distance; infrastructure presence is not a secured project connection. |
| 12 · Evidence to decisions | What should management decide next? Open supporting evidence for a study question. | Three clear decision nodes: reconcile observations, advance study confidence, test development constraints. Each links to its evidence and returns to the closing view. |

## Component and motion specification

- Extend the existing overlay slots. Use one `StoryPanel`, one `SelectedFeatureInspector`, one compact `SceneInstruments` group and the existing pager/index. These are responsibility names for the refactor, not a request to build parallel controls.
- Use existing tokens first, then add semantic aliases for panel background/border, primary/secondary text, active feature, spacing and focus state. Keep geological palette tokens separate from copper brand emphasis.
- Target 16–18 px explanatory body, 24–30 px panel heading, 32–48 px scene headline where space permits, 12–14 px secondary metadata with an accessible expanded view. Validate actual rendered sizes rather than relying on CSS declarations alone.
- Collapse story/evidence into a phone bottom sheet with summary, selected object and evidence tabs only where needed. Expanded content must not steal the orbit gesture from the uncovered scene. Test portrait and landscape.
- Keep compass, scale and reset in one stable location. Make auto versus manual surface opacity visible, with an accessible numeric value and reset. Put mapped-fill opacity next to that layer in the inspector.
- Prefer brief fades and stable spatial continuity over decorative movement. Camera travel should reveal a changed question/layer, stop after arrival and respond immediately to input. Reduced motion uses direct view changes.
- Define selected, unselected, loading, error, empty and disabled states for each touched component. Preserve chapter fallback images and keep source reading possible when WebGL fails.

## Sequence and release proof

1. Identify the exact branch preview and retain the current cold/frame-time baseline. Reconcile the drilling caption denominator and keep geology/metallurgy/peer source limitations visible.
2. Implement BP02, BP03 and BP08 together on geology and drilling as the reference components. Capture matched desktop/tablet/phone frames and camera/leader behavior.
3. Apply the shared patterns to metallurgy, mine planning, peers and closing; then the other chapter layouts. Compare the 12 chapters as a contact sheet so repeated compositions and weak focal points are obvious.
4. Add G1 thumbnails, then G2 comparison and G3 highlights after the underlying shots are stable. Reuse cached stills and scene state; measure any additional transfer/render cost.
5. Complete the existing A–F gates: responsive matrix, keyboard/touch/reduced motion, source traceability, 30-second orbit, cold/warm transfer, stale request/retry/context recovery and independently verified Vercel/Cloudflare share links.

Future capture-dependent possibilities: real site 360° stops, surveyed facility designs and authenticated photogrammetry can strengthen the experience when suitable source data and publication rights exist. They are not assumed inputs to this scoped pass.
