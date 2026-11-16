# Tanga investor presentation — desktop revamp plan

Date: 16 November 2026
Status: desktop implementation and QA pass completed for this revision. All 12 chapters were captured and visually reviewed at 1366 × 768, opened as fresh direct links, and revisited at 1707 × 842 with matching chapter routes, no horizontal overflow, and primary UI within the viewport. Geology stage transitions, resource band selection, peer-to-globe selection and Tanga's fifth-place comparison, both RF1 pit views/blocks, the five-area metallurgy story, and the 72 km project-stated distance versus 76 km mapped road geometry were checked. TypeScript typecheck passed; browser reported no console errors or warnings. See `TANGA_SLIDE_BY_SLIDE_IMPLEMENTATION_CHECKLIST_2026-11-16.md` for evidence and remaining deployment/reviewer checks. This records local QA, not a production deployment.
Primary audience: investors, senior management and technical reviewers.
Priority: desktop presentation quality and release reliability; phone/tablet work remains deferred as requested.

## Direction

### Creative concept: **Tanga — From Ground to Graphite**

Make the guided presentation feel like a premium mining-project film that the viewer can pause and explore. The terrain is the continuous stage: begin with Tanzania and the coastal setting, descend to the Tanga landscape, reveal measured work and geology, then travel through the reported resource, a qualified mine concept, testwork and the route to port. End by returning to the evidence and the decisions still ahead. The film-like quality comes from authored camera shots, natural scale cues, purposeful reveals and strong scene composition—not from adding decorative motion to every object.

Provide two complementary ways to experience the same story:

- **Guided tour:** a deliberate, presenter-ready sequence of composed shots, short camera moves and concise chapter statements. The viewer can pause, skip, or take control at any moment. A user interaction stops the active camera move immediately.
- **Explore:** the existing direct chapter navigation, layer toggles, evidence panels and free camera controls. Opening a direct link must still land on the intended view without forcing a cinematic intro.

Use a three-act film grammar inside the existing chapters: **I · The place** (Tanzania, project setting, completed work); **II · What the evidence shows** (terrain, drilling, geology, resource, selected peers); **III · What development could involve** (mine concept, testwork, logistics, decisions). Each chapter gets a distinct establishing frame, one focal subject, one evidence beat and a clear visual handoff. The camera preserves orientation when moving between scales and resets to the authored frame with one action.

### Art direction: premium field-film, not a generic dashboard

- **Hero canvas:** full-bleed natural terrain with realistic ground color, readable elevation, broad daylight and atmospheric depth. Keep the active geography large in frame; avoid a darkened global filter that makes the ground look synthetic.
- **Editorial type:** large, confident chapter headlines (about 40–64 px on desktop), one short takeaway, readable supporting copy and small restrained technical labels. Let the visual carry the scene; keep the detailed source notes one deliberate action away.
- **Color:** use Sakariya identity as a restrained interface accent, warm mineral/earth color in the landscape, source-matched lithology colors in geology, stable grade colors in resource, and disciplined dark/cyan callouts where they help equipment labels. Do not recolor data layers to fit a cinematic grade.
- **Panels:** one active story panel at a time, anchored to a safe area with a maximum useful width. Give evidence and source controls a repeatable visual treatment. Fade HUD density down during an authored flyover, then restore full controls on pause, pointer/keyboard use, or Explore.
- **Motion:** use short establishing moves, push-ins, orbit reveals, and layer builds only where they explain a change in scale or evidence. Keep camera motion smooth and spatially legible; avoid rapid cuts, perpetual orbit, simultaneous moving callouts, or repeated camera spins. Reduced motion uses direct composed-frame changes.
- **Sound:** no auto-playing soundtrack. If narration is added later, make it optional, muted by default, captioned and independent of camera controls.

### Film-to-interactive shot grammar

Every guided chapter follows the same simple rhythm, adapted to its evidence: **establish** the place or dataset; **reveal** one focal layer/object; **read** the key fact with its date/source; **hand off** to the next question. Keep each beat visually distinct from the prior chapter. During a transition, retain a stable compass cue and a small chapter marker so a cinematic move does not disorient a technical viewer. The opening should feel like an aerial arrival over the real project terrain; the closing should pull back to the Tanga-to-port context and return to the evidence/decision list.

Reference review: the repository’s Sarytogan Graphite PFS animation notes a sequence of globe/location, satellite approach, geology/resource, open pits, processing plant, workforce/infrastructure, downstream technology and logistics. Borrow its continuity, oblique pit framing, plant flyover, restrained leader labels and one visual idea per shot; do not copy its project data, claims, exact graphics or downstream product assumptions. VRIFY describes its presentations as a shareable blend of 3D models, 360° imagery and corporate PDF content, and its newer 3D slide guidance includes topography, drillholes, 2D lines, layers, labels, highlights and a compass. This supports a cinematic experience with technical evidence and navigation kept together. [Sarytogan PFS 3D animation](https://www.youtube.com/watch?v=EVKrPWzrIFc), [VRIFY 3D Presentation overview](https://help.vrify.com/en/articles/8339480-what-is-a-vrify-3d-presentation), [VRIFY 3D slide guide](https://help.vrify.com/en/articles/13893832-create-a-3d-slide-beta), [VRIFY community-engagement case study](https://www.vrify.com/articles/transforming-community-engagement-through-interactive-presentation-software).

### Graphite peer-presentation review — current references

| Reference | What the presentation does | What to adapt for Tanga | What to keep out of Tanga |
|---|---|---|---|
| **EcoGraf, 2026 IMARC presentation, 27 October 2026** | Connects upstream mine, mechanical shaping, downstream purification and anode-cell manufacturing in a single process story; links its mine-layout slide to a video, then follows with a processing-plant flythrough. A later slide combines location context with a compact set of mine, resource, grade, recovery and transport metrics. | Add an optional authored 3D mine-site sequence that establishes the whole site, then focuses on the pits; follow it with a separate plant flythrough. Keep process stages visually connected while each keeps its own evidence and qualification. Use a compact, source-linked metric strip only where units and definitions stay legible. | Do not imply Tanga has EcoGraf’s BFS, permits, reserve, financing, production, facility network, process route or product specifications. Keep proposed downstream anode/refractory pathways clearly illustrative and separate from Tanga’s reported testwork. |
| **Black Rock Mining, RIU Sydney presentation, 5 May 2026; company recording published 14 May 2026** | The current public materials frame Mahenge through a staged/module-based development narrative and pair the presentation with a recorded conference version. The slide copy found in the public 2025 corporate deck also uses a three-pillar investment-case graphic and a staged upstream-to-downstream diagram. | Tell Tanga’s story in an ordered sequence: evidence already available → study questions → conceptual site relationships → possible next-stage choices. Reuse a simple three-part close for geology/data confidence, processing evidence and development studies, with every item linked back to its source or explicitly marked as a future question. | Do not import Black Rock’s investment case, economics, modular production assumptions, approvals, funding, offtake, partners, schedule or risk status. These are Mahenge-specific and dated. |

**Access note:** EcoGraf’s latest deck is available as a company-hosted PDF. Black Rock’s official presentation archive lists the 5 May 2026 deck, but its current attachment link returns 404; the company’s own video page publishes the 14 May recording. The accessible visual details for the older Black Rock corporate deck are treated only as historical design reference, not as a substitute for the latest slide file. [EcoGraf 2026 IMARC presentation](https://www.ecograf.com.au/wp-content/uploads/2026/10/20261027_EGR_Corporate-Presentation-IMARC.pdf), [Black Rock presentation archive](https://blackrockmining.com.au/category/presentations/), [Black Rock May 2026 recording](https://blackrockmining.com.au/riu-sydney-resources-round-up-presentation-may-2026/), [Black Rock October 2025 deck](https://blackrockmining.com.au/wp-content/uploads/Investor-Presentation-211025.pdf).

**Design decision:** use peer presentations to improve story order and 3D shot references, not to copy their investor claims or flatten Tanga into a conventional corporate slide deck. The distinguishing treatment remains an interactive, evidence-linked aerial tour with an editorial laboratory/results chapter and clear transitions between mapped data, interpretation and conceptual development.

The UI/UX Pro Max design-system query returned a generic enterprise Swiss/minimal pattern rather than a geospatial presentation match. A narrower style search also returned no relevant match. Use only its applicable guidance: clear hierarchy, visible focus, reduced-motion support, lazy loading, and at most one or two purposeful moving elements in a view. Do not import its suggested blue/orange palette; the existing Sakariya identity and source-derived geology colors govern this deck.

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

Keep the current chapter order and make the film feel like one journey with carefully differentiated visual sequences. Use a short aerial arrival for the opening; use camera travel only when moving between real scales or revealing a relationship. A repeatable frame does not mean repeating the same composition: the map, timeline, profile, drill trajectory, geology, block model, peer comparison, site concept, testwork, route and closing each need their own visual language.

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

### Signature sequence direction

| Beat | Shot treatment | Viewer takeaway |
|---|---|---|
| Opening | Start above the regional terrain; descend toward the project and settle into a broad, natural site frame. Project name and location arrive after the ground is visible. | This is a real place with a defined setting. |
| Evidence journey | Match camera direction and scale as the story moves from surface survey to recorded holes, mapped geology and a separate subsurface interpretation. Use a clean graphic/section treatment when the evidence changes from geographic context to measured values. | Show what was measured, what was interpreted, and where the boundary between them lies. |
| Resource and peers | Build the resource view from the report’s own legend and totals; transition to a simple common-scale ranking before opening the globe. | Place the reported estimate in context, with dates and category limitations visible. |
| Development concept | Pull back to a natural oblique site overview, then make a single controlled move to the pits, material path, plant and services. Keep conceptual facilities visibly labeled as such. | Explain spatial relationships without implying an approved design. |
| Testwork and destination | Change the visual grammar to a bright, editorial laboratory/results board; use a short optional conceptual plant tour to explain process stages, then separate illustrative product pathways. | Report testwork findings and explain possible downstream context without asserting qualification. |
| Close | Trace the sourced route to the port, then pull back to the regional frame and finish with three evidence-linked decisions. | Leave the audience with a clear next step and a way back to its evidence. |

Acceptance per chapter: the question and takeaway are understandable within five seconds; the focal object remains visible; source/qualification is reachable in one action; there is one clear primary next action; no duplicate visual or copy carries over without a new purpose.

## Work sequence

### Phase 0 — Release truth and clean baseline (P0)

- [ ] Check branch, PR, stable Vercel production and anonymous Cloudflare Worker independently. Record deployed commit, public/private access, runtime target and current scene version.
  - [x] Compare release targets for branch commit `85f35ef`. Vercel reports a successful Preview deployment, and both its exact URL and the branch alias returned HTTP 302 for anonymous requests. GitHub PR #63 is merged, and the current branch has no open PR to `main`. The public Vercel link reports `54a38ca938c4+dirty` (Vercel production), and the public Worker reports `9931088be728+dirty` (Cloudflare Workers / OpenNext). In foreground Chrome at 1366 × 768, both public South pit deep links reached scene and block readiness with 12,026 source cells loaded and no page alerts. Both public video proxies returned HTTP 206 and `Content-Range: bytes 0-31/47482143` for a 32-byte range. Public deployment of the branch and hosted recovery for this revision remain open.
- [ ] Open a fresh foreground browser session on the intended public link and capture all 12 chapter openings at 1366 × 768 and 1707 × 842. Capture one selected detail for Geology, Resource, Mine Planning and Metallurgy.
- [ ] Record readiness, loading/fallback state, scene canvas count, page/console errors, panel bounds and obvious labels/scene collisions. Reuse the existing audit script and add only missing diagnostics.
- [ ] Mark each finding as narrative, composition, typography, evidence, interaction, performance or release. Rank by viewer impact and evidence risk.
- **Gate:** no art-direction change starts against an unidentified or stale release. The first baseline must be visually reviewed in foreground; readiness automation alone does not count.

### Phase 1 — Story structure and reusable composition (P0)

- [ ] Use the chapter table above to edit headings, one-sentence takeaways, transition cues and primary actions. Keep source details in disclosure panels.
- [ ] Write and rehearse one concise guided-tour line per chapter. Align its timing to the visual reveal; keep sound optional and captions available if narration is introduced.
- [ ] Define authored camera start, focus and end frames for the opening arrival and every signature sequence. Validate the destination before animating; user input interrupts camera travel immediately.
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

- [ ] **Guided film behavior:** preserve a visible pause/skip affordance, keep the current chapter and progress discoverable, pause camera choreography on any direct user input, and restore full Explore controls on demand. A deep link opens directly into Explore at its authored frame.
  - [x] Fix guided playback controls so clicking Pause keeps the current route and focus on the same button. At 1366 × 768 in foreground Chrome, both Full Story and Highlights paused and resumed on the current chapter. Space resumed Highlights from the focused button. Switching to another tab paused Highlights, which remained paused on return. A map drag stopped Full Story, and Arrow Right advanced to the next Project view and stopped autoplay. Capture: `.playwright-mcp/presentation-highlights-paused.png`. These checks cover the playback controls and manual interruption on the Project view.
- [ ] **Opening and act transitions:** make the first frame feel like an aerial arrival, then use brief act transitions at meaningful story boundaries only. Avoid a full-screen interstitial on every chapter; reduced-motion removes holds and camera travel.

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
  - [x] Restore the active Mine Planning stage and pit block selection after WebGL context loss. In foreground local Chrome, `WEBGL_lose_context` triggered the fallback and the rebuilt renderer returned to the matching camera position, target and pit block visibility. South at 1366 × 768 returned to stage 2 with only South blocks visible. North and the two-pit view at 1707 × 842 restored their respective selections and retained the 12,026-cell loaded block set. The South run recorded zero page exceptions. Captures: `.playwright-mcp/mine-south-recovery-fallback.png` and `.playwright-mcp/mine-south-recovery-restored.png`. Hosted recovery and other chapter states remain open.
  - [x] Build the clean `85f35ef4b2ff` checkout with `npm run cf:build`. In the local Wrangler preview, Chrome forced context loss after the South pit reached readiness and confirmed the same camera position, target, South selection and 12,026-cell loaded set after restoration. The same preview returned HTTP 206 for the 32-byte intro video range request. Capture: `.playwright-mcp/mine-south-recovery-opennext-1366.png`.
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
- Current implementation and data-fidelity checklist: `TANGA_SLIDE_BY_SLIDE_IMPLEMENTATION_CHECKLIST_2026-11-16.md`
- Existing presentation purpose/reference review: `TANGA_PRESENTATION_FLOW_2026-10-22.md`
- Current shot inventory and evidence mapping: `TANGA_AUTHORED_SHOT_SPEC_2026-10-24.md`
- Current capture limitations: `TANGA_DESKTOP_CAPTURE_MATRIX_2026-10-28.md`
- Reference review: `TANGA_POLISH_REFERENCE_REVIEW_2026-10-23.md`
- UI guidance applied: `.agents/skills/ui-ux-pro-max/SKILL.md` (reduced motion, limited purposeful animation, lazy loading, focus and hierarchy)
