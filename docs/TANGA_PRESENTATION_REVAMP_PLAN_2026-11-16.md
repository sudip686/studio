# Tanga investor presentation — desktop revamp plan

Date: 16 November 2026  
Status: planning refresh; no visual implementation is claimed by this document.  
Primary audience: investors, senior management and technical reviewers.  
Priority: desktop presentation quality and release reliability; phone/tablet work remains deferred as requested.

## Direction

Shape the experience as an evidence-led project briefing with cinematic 3D used to clarify scale and relationships. Each chapter should answer one question, foreground one piece of evidence, and make the next step in the story obvious. Keep the existing 12 chapters and source basis. Polish the way they connect and appear before adding more scene features.

Use one consistent presentation shell: Sakariya identity, chapter progress, one active story panel, one evidence/source path, predictable camera controls and a quiet navigation rail. Keep geological unit colors tied to their source maps. Let each chapter have its own visual grammar inside that shell:

- **Geology:** cartographic evidence, measured terrain and a clearly separate interpretation.
- **Metallurgy:** laboratory results first; conceptual plant tour as a supporting explanation.
- **Mine planning:** natural terrain and a legible engineering concept site, with status and uncertainty explicit.
- **Other chapters:** use maps, timelines, profiles, blocks, comparisons or decisions according to the evidence being presented. Do not reuse a generic 3D scene treatment when a chart, report figure or map explains the point better.

The UI/UX Pro Max design-system query returned a generic enterprise Swiss/minimal pattern rather than a geospatial presentation match. A narrower style search also returned no relevant match. Use only its applicable guidance: clear hierarchy, visible focus, reduced-motion support, lazy loading, and at most one or two purposeful moving elements in a view. Do not import its suggested blue/orange palette; the existing Sakariya identity and source-derived geology colors govern this deck.

## Current evidence and constraints

- The branch already has a 12-chapter / 35-shot specification, source disclosures, shareable view state, fallback stills, responsive history and multiple desktop capture matrices. These are implementation assets, not proof that the current public and branch releases match.
- The latest documented 12-chapter screenshot matrices are from 28–30 October 2026. Refresh all visual baselines before changing the art direction; do not present those captures as current-day acceptance.
- The latest verified branch preview had simplified interpreted-geology collars. The stable public Vercel URL was still on `main` commit `bf751f8` on 31 October, while the branch preview was access protected. The public Cloudflare Worker was identified as the current anonymous share link. Resolve this release mismatch before calling the visual revamp investor-ready.
- Geology surfaces are based on supplied georeferenced lithology rasters and an approximate raster-map registration; they are not surveyed shapefile contacts. Interpreted depths are a separate model with no verified surface-to-depth crosswalk. Preserve these limits in the visuals and copy.
- Peer rank is scoped to the selected dated benchmark. Mine facilities, site routes and tailings/water forms remain conceptual or approximate according to their evidence status. Metallurgy testwork does not establish product qualification or an approved industrial flowsheet.
- Desktop verification targets are 1366 × 768 and 1707 × 842. Physical phone/tablet review remains a later phase.

## Story arc and distinct purpose for every chapter

The current chapter order already supports a useful arc. Keep it, but make the change in evidence unmistakable at each step.

| # | Chapter | One question | Focal visual | What changes from the previous chapter |
|---:|---|---|---|---|
| 1 | Meet Tanga | Where is the project and what is the footprint? | Natural project landscape with one locator/boundary treatment | Opens with place and project identity |
| 2 | Place it on the map | Where is Tanga in its regional setting? | Country-to-coast locator with a stable project pin | Changes scale from site to region |
| 3 | Work completed | What work supports the current story? | Dated milestone timeline with report/photo evidence | Replaces geography with a chronology of completed work |
| 4 | Read the landscape | What does the measured surface tell us? | Terrain and one selected measured profile | Turns to physical relief and survey coverage |
| 5 | Follow a recorded hole | What was actually observed downhole? | One selected recorded trajectory with intervals | Moves from surface evidence to measured subsurface observations |
| 6 | Reveal the host rock | How do mapped units relate to the separate interpretation? | Source-colored polygons on terrain, then separate depth model | Explains geological evidence and its limits |
| 7 | Understand the model | Where are the reported blocks and grade classes represented? | Resource model/section plus report totals | Moves from geology to the reported estimate representation |
| 8 | The global peer field | How does the reported contained graphite compare in the selected benchmark? | Dated, common-scale comparison followed by a globe locator | Provides external context with category/date qualifications |
| 9 | Fit a concept to ground | How might pits, feed, plant and site services relate spatially? | Full natural site overview, then pit/plant/service details | Moves from estimate to a qualified development concept |
| 10 | Examine the testwork | What did the laboratory testwork report? | Eight-sample result board with separate metric scales | Pivots from site concept to measured processing evidence |
| 11 | Connect to the port | What route and distance information is available? | Project-to-port route and provenance card | Extends the project into logistics and infrastructure context |
| 12 | Evidence to decisions | What must be resolved or studied next? | Three decision questions linked back to evidence | Closes with actions and traceable evidence returns |

Acceptance per chapter: the question and takeaway are understandable within five seconds; the focal object remains visible; source/qualification is reachable in one action; there is one clear primary next action; no duplicate visual or copy carries over without a new purpose.

## Work sequence

### Phase 0 — Release truth and clean baseline (P0)

- [ ] Check branch, PR, stable Vercel production and anonymous Cloudflare Worker independently. Record deployed commit, public/private access, runtime target and current scene version.
- [ ] Open a fresh foreground browser session on the intended public link and capture all 12 chapter openings at 1366 × 768 and 1707 × 842. Capture one selected detail for Geology, Resource, Mine Planning and Metallurgy.
- [ ] Record readiness, loading/fallback state, scene canvas count, page/console errors, panel bounds and obvious labels/scene collisions. Reuse the existing audit script and add only missing diagnostics.
- [ ] Mark each finding as narrative, composition, typography, evidence, interaction, performance or release. Rank by viewer impact and evidence risk.
- **Gate:** no art-direction change starts against an unidentified or stale release. The first baseline must be visually reviewed in foreground; readiness automation alone does not count.

### Phase 1 — Story structure and reusable composition (P0)

- [ ] Use the chapter table above to edit headings, one-sentence takeaways, transition cues and primary actions. Keep source details in disclosure panels.
- [ ] Define shared desktop safe areas for header, left instrument rail, right story/evidence panel, bottom story cue and chapter navigation. Reserve the scene focal region from measured bounds rather than fixed assumptions.
- [ ] Set shared type scale, spacing, panel width, contrast, border, button and focus tokens using current Sakariya styling. Remove redundant overlays only when their function is preserved elsewhere.
- [ ] For each chapter write a one-page shot card: default frame, target, visible layers, focal object, takeaway, interaction, evidence link, source qualification and fallback.
- **Gate:** all 12 chapters have a distinct question and focal visual; no duplicate primary actions; no panel covers a key anchor/label at either desktop size.

### Phase 2 — Recompose the signature chapters (P0/P1)

**Geology — field atlas**

- [ ] Lead with map-derived unit layers on the terrain, source palette, compact legend and north/scale instrument.
- [ ] Move from mapped surface to oblique relief, then reveal the separate interpreted model. Keep camera orientation stable; make the separation of evidence explicit.
- [ ] Make source/registration limits one readable, compact evidence disclosure. Keep license boundary off this chapter. Keep collar markers low-profile at the surface; no posts rising through the model.
- [ ] Verify toggling each unit and soil cover, stage transitions, reset, share state and interpretation-limit copy.

**Metallurgy — evidence board with plant on demand**

- [ ] Make the eight-sample results board the first visual; keep concentrate TC, recovery and +150 µm mass fraction on distinct scales and units.
- [ ] Select a sample to reveal result provenance and source locator. Keep the microscopy/material images separate unless a sample crosswalk is verified.
- [ ] Offer the connected conceptual plant as an explicit 3D explanation route. On entry, show a clear whole-plant exterior; select a process area, open its roof, move camera inside and animate only the relevant equipment.
- [ ] End at two clearly illustrative downstream pathways (EV anode and refractory), each with a visible testwork/product-qualification boundary.

**Mine planning — natural site plan**

- [ ] Open on the preferred natural oblique whole-site view; keep North-up plan, compass, scale and reset readily available.
- [ ] Establish full-site relationships before details: North pit, South pit, feed point, plant, water and waste. Keep pits and ore cells grounded to their proper surfaces and make the continuous benches readable at overview and close range.
- [ ] Use the current report-candidate / approximate map trace / illustrative status key consistently. Keep full facility names and evidence basis in the inspector.
- [ ] Limit motion to a meaningful material path (pit to feed to plant) only where route evidence supports it. Pause and reduced-motion states must be clear; unsupported routes remain static or explicitly illustrative.

- **Gate:** selected details at 1366 × 768 and 1707 × 842 remain composed, labels and controls avoid the visual focal point, reset restores the authored overview, and browser capture confirms no model is hidden by the HUD.

### Phase 3 — Polish the remaining chapters (P1)

- [ ] **Project / Tanzania:** one deliberate approach from regional locator to project footprint; avoid making the map feel like a static dashboard.
- [ ] **Work completed:** milestone chronology with a source image or report extract for each date; no decorative map motion competing with evidence.
- [ ] **Topography:** show measured coverage, a single readable profile and the transition between measured survey and regional context.
- [ ] **Drilling:** begin with terrain only, then introduce recorded collars/traces on this chapter; select and follow one hole without inventing continuity across gaps.
- [ ] **Resource:** report totals and modeled/displayed blocks remain separate; distinct legend, section/reveal, no economic cutoff implication.
- [ ] **Peer field:** present the dated common-metric comparison before globe exploration; selecting a peer synchronizes row, marker and source.
- [ ] **Infrastructure:** distinguish route services, direct distance and report estimates; make the 72 km project-to-port relationship easy to verify with a clear path and distance cue.
- [ ] **Closing:** three next-study questions each return directly to supporting evidence; remove repeated chapter-summary prose.
- **Gate:** all 12 chapter openings and all selected details pass the same typography, readability, camera-reset and source-path review.

### Phase 4 — Reliability, delivery and release (P0, parallel to visual passes)

- [ ] Bring the anonymous link to the intended current branch code through the repository’s normal release process; verify the displayed revision in the app and confirm the old public URL no longer shows the tall geology pointers.
- [ ] Independently verify Vercel and Cloudflare: direct deep links, asset proxy/range behavior, fallback stills, cache headers, service-worker update and renderer recovery.
- [ ] Measure cold and warm first-useful-frame and scene-ready times for all chapters, then foreground 30-second orbit/zoom interaction for six 3D chapters. Report distributions and hardware; do not call viewport emulation a physical-device test.
- [ ] Preserve one renderer per active 3D scene, lazy-load detail meshes, deduplicate shared requests and dispose resources on chapter changes. Confirm actual hidden-tab pause and recovery state restoration.
- [ ] Keep product access and asset-domain configuration explicit. Preview authentication, public production access and Worker access are separate facts.
- **Gate:** public link opens the intended story and share view without a login wall; direct entry and failure/retry retain usable navigation and source evidence.

### Phase 5 — Desktop acceptance and deferred device pass

- [ ] Re-capture all 12 chapters at 1366 × 768 and 1707 × 842 after each signature-chapter pass; include selected details and evidence disclosures.
- [ ] Confirm keyboard/touch-compatible selection, visible focus, contrast, pause/resume, reset, reduced motion, loading/error fallback, 3D context recovery and no panel/callout collisions.
- [ ] Review the screenshots in a visible foreground browser; store captures beside the checklist and record differences from baseline.
- [ ] Defer phone/tablet redesign to its own device pass; do not claim mobile acceptance from desktop resizing.

## Design guardrails

- Do not add animation to make a quiet slide look busy. Limit each view to one or two meaningful moving elements; stop motion during manual exploration and respect reduced-motion settings.
- Do not use a generic camera flight as a substitute for a different slide purpose. Camera moves must preserve geographic orientation or explain the change in scale.
- Do not lighten terrain by applying broad CSS filters to the whole canvas; rock categories, resource grades and labels must retain stable colors.
- Do not add new source claims, rankings, sample points, engineering details, mine routes, contacts or capacities without their source and uncertainty status.
- Do not make a panel system more consistent by flattening the distinct geology, lab-results and mine-site visual grammars.
- Keep the active architecture (Next.js, MapLibre/deck.gl, Three.js and existing overlay slots) unless a verified requirement proves it cannot support the plan.

## Definition of revamp-ready

The deck is ready for an investor/management presentation when the current public link serves the reviewed branch release; every chapter has one purpose and focal visual; the three signature chapters read distinctly; source and concept boundaries are clear; each direct chapter link, selected detail, camera reset and fallback works; and the 12-chapter desktop capture matrix is reviewed at both target sizes with no blocking overlap or browser errors. Performance and physical-device findings are published separately and never inferred from screenshots alone.

## References and project records

- Existing implementation checklist: `TANGA_NEXT_PHASE_PLAN_2026-10-23.md`
- Existing presentation purpose/reference review: `TANGA_PRESENTATION_FLOW_2026-10-22.md`
- Current shot inventory and evidence mapping: `TANGA_AUTHORED_SHOT_SPEC_2026-10-24.md`
- Current capture limitations: `TANGA_DESKTOP_CAPTURE_MATRIX_2026-10-28.md`
- Reference review: `TANGA_POLISH_REFERENCE_REVIEW_2026-10-23.md`
- UI guidance applied: `.agents/skills/ui-ux-pro-max/SKILL.md` (reduced motion, limited purposeful animation, lazy loading, focus and hierarchy)
