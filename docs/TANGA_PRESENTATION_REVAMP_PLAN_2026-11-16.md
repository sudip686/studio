# Tanga investor presentation — desktop revamp plan

Date: 16 November 2026
Status: desktop implementation and QA pass completed for this revision. All 12 chapters were captured and visually reviewed at 1366 × 768, opened as fresh direct links, and revisited at 1707 × 842 with matching chapter routes, no horizontal overflow, and primary UI within the viewport. Geology stage transitions, resource band selection, peer-to-globe selection and Tanga's fifth-place comparison, both RF1 pit views/blocks, the five-area metallurgy story, and the 72 km project-stated distance versus 76 km mapped road geometry were checked. TypeScript typecheck passed; browser reported no console errors or warnings. See `TANGA_SLIDE_BY_SLIDE_IMPLEMENTATION_CHECKLIST_2026-11-16.md` for evidence and remaining deployment/reviewer checks. This records local QA, not a production deployment.
Primary audience: investors, senior management and technical reviewers.
Priority: desktop presentation quality and release reliability; phone/tablet work remains deferred as requested.

**Conclusion scope:** improve the existing conclusion view only. Keep the recap/flythrough inside that slide and link its chapter nodes back to existing chapters. Do not add a new slide, route, or chapter for the recap, orbital pull-back, or bookend.

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

### User-directed experience proposal — 16 November 2026

The requested build order is **shared foundation → Metallurgy → Resource → Mine Planning → close**. Treat the following as a design checklist, not permission to invent project evidence. Reuse the existing overlay slots, view state, chapter navigation, source-qualified metrics and scene fallback before creating parallel systems.

#### Step 0 — shared presentation foundation

- [ ] Author one camera-rail contract for scene keyframes, destination validation, interruption, reset, and reduced-motion behavior; adapt it to Cesium/MapLibre/deck.gl and Three.js rather than forcing one engine-specific camera API across them.
- [ ] Consolidate the HUD into shared story, instrument, evidence and navigation primitives with measured safe areas. Preserve the distinct cartographic, laboratory-results and mine-site visual grammars.
- [ ] Centralize interface palette, spacing, typography, panel, focus and control tokens. Keep lithology/grade encodings tied to their source data; use cyan only for graphite-oriented emphasis and amber for waste/warnings where the chapter legend supports it.
- [ ] Bind every displayed metric to its source dataset/report locator and show its unit, date/category, and qualification in the evidence path.
- [ ] Benchmark post-processing before adopting it. Bloom, vignette or fog must not lower terrain legibility, alter categorical data colors, hide labels or make the six 3D chapters materially slower; natural daylight and stable source colors take precedence.

#### View-specific story proposals

- [ ] **Metallurgy — Rock to battery:** keep the eight-sample board and report results as the evidence view. Offer the connected conceptual plant as a separate explanation route, with selectable process stages, roof opening, an interior camera move, and equipment motion only where supported. Bind stage metrics to reported testwork; do not synthesize recovery/yield values. Use microscopy only as sample-linked evidence when a verified crosswalk exists and reproduction permission is established. Label EV-anode and refractory routes as illustrative downstream context unless Tanga-specific product qualification is documented.
- [ ] **Resource — The orebody awakens:** add a cut-off/category interaction only when the labels remain tied to report definitions. Keep modeled cells, report totals and uncertainty distinct; a display threshold is not an economic cut-off. A slice plane and drillhole chronology must use recorded data and preserve gaps.
- [ ] **Mine Planning — time scrubber:** a Year 0-to-closure scrubber needs dated mining phases with pit surfaces/bench states, material quantities, footprint progression and a sourced closure/rehabilitation state. The supplied outputs include a 20-year staged economic cash-flow file, but the checked project artifact `public/generated/orewaste-reference.json` contains one RF1 scenario with two North/South pit surfaces, not a year-by-year mine schedule. Do not bind economic years to pit growth, annual mining quantities, footprint changes or rehabilitation. Keep the current RF1 two-pit concept, blocks, natural terrain and conceptual-status labels visible unless spatial phase data is verified.
- [ ] **Closing — pull back and decide:** return to the regional setting, then show only committed study milestones. Supply-chain arcs remain explicitly illustrative unless supported by a sourced route/offtake basis. Any replay/download/contact control must point to a real, working action.

#### Source-folder audit — 16 November 2026

- [x] Inventory the supplied OreWaste outputs folder and the PaulSam June 2023, SMMPL April 2025 and AMC December 2025 report extraction folders.
- [x] Confirm a dated 20-year **staged economic cash-flow model** is available in `Tanga_Staged_Cashflow.csv`, with its assumptions in `Tanga_Staged_Assumptions.json`; the planning report describes a 0.5 Mtpa starter mine expanding to 2 Mtpa, with conditional scenario economics.
- [x] Confirm the PaulSam report supports the lowland plant-siting rationale and a candidate Option 2 conveyor, while the current map registration and plant/site arrangement remain approximate or conceptual.
- [x] Confirm the AMC MRE contains resource and bench-scale metallurgy evidence; the SMMPL downstream study is an indicative financial/product pathway study. Neither extracted report supplies dated spatial pit phases.
- [ ] Before using the cash-flow file in the deck, reconcile it to the intended selected product scenario and the latest planning report, then label all values as modeled scenario outputs. Do not bind this cash-flow timeline to pit surfaces or animate mine growth from it.
- [ ] Keep the two source scopes separate: OreWaste RF1 geometries support the current two-pit site concept; the staged cash-flow rows support modeled financial progression only. There is no verified year-by-year pit, bench, footprint or closure geometry in the inspected files.
- [ ] Reconcile the September 2026 mine-to-market planning report with the April 2025 downstream study before displaying an investment recommendation: their product-route cases and economics differ and must not be combined as if they share one basis.

#### Delivery order and gates

1. Complete the Phase 0 release-truth and foreground desktop baseline below.
2. Implement and verify the shared foundation without changing source-data color semantics.
3. Recompose Metallurgy around evidence first and its conceptual plant second.
4. Add Resource interactions that map directly to verified model/report fields.
5. Reconcile the modeled cash-flow scenario before considering a labeled economic timeline. Add a Mine Planning time scrubber only after valid spatial phase data is available; otherwise continue polishing the one sourced RF1 case.
6. Finish the evidence-linked close, then rerun the two-desktop-size chapter matrix and release checks.

#### Pasted visual brief — acceptance checklist

Add seven story waypoints over the existing 12 chapter IDs; retain every detailed chapter and shareable deep link. The waypoints are **Place & scale** (`project`, `tanzania`, `work_completed`, `topography`), **Geology** (`subsurface`), **Drilling** (`drillholes`), **Resource** (`resource`, `ranking`), **Metallurgy** (`metallurgy`), **Mine planning** (`mine_planning`), and **Close** (`accessibility`, `comparison`). Keep the 12-scene selector as the detailed-view picker within those seven story waypoints.

- [ ] Keep the 3D/map canvas visually full-bleed. Place the headline/takeaway in the top-left safe area, optional collapsible controls at the right, and compact legend/timeline at the bottom. Measure panel bounds against the active scene focal area so scene anchors remain visible.
- [x] Replace the noninteractive three-act ribbon and 12-dot footer with a persistent seven-waypoint rail, active label/progress fill and left/right arrow navigation. Preserve the 12 scene deep links in the All scenes picker and keep Story/Explore mode available.
- [ ] Give every chapter a finding-led headline, concise “what am I looking at?” legend, one-shot “try this” hint, reset action and source/provenance chip. Hints disappear after the first successful interaction and remain available to keyboard users until then.
- [ ] Use stable semantic colors, labels or patterns alongside color, and a colorblind-safe sequential grade ramp. Match lithology swatches to mapped-source categories; do not recolor the geology data for visual effect.
- [ ] Use 400–700 ms interface transitions and 2–4 s authored camera moves only where they preserve orientation and explain scale. Respect `prefers-reduced-motion` throughout.
- [ ] Keep touch gestures, adaptive quality and device-specific controls in the deferred phone/tablet phase. For desktop, verify keyboard focus, asset fallback, useful loading feedback and that camera interaction does not start or continue animation unexpectedly.
- [x] Replace the intro's outward-arrow symbol with an in-app forward arrow; add clickable Place / Evidence / Next-stage entry links; add an AMC estimate provenance line and an explicit sound toggle. Keep intro poster rendering before video data arrives and preserve the visible, focusable Skip intro action.
- [ ] Replace the generic bootstrap message with truthful loading-state feedback. A numeric percentage must be based on measured asset/data progress; do not fabricate completion percentages when the dynamic module or scene loader exposes only a status message.
- [ ] Intro acceptance: first paint shows the supplied poster, the three deep links open their intended chapter, playback remains muted until the viewer opts in, skip works by keyboard, and the live 3D scene crossfades in without a blank screen.

Chapter-specific acceptance from the pasted brief:

- [ ] **Place & scale:** visible north arrow and scale; scale ladder from continent to licence; only source-supported proximity facts; readable halo/chip map labels. Draw/pulse effects remain optional and must not suggest unsupported distances.
- [ ] **Geology:** terrain occupies the primary canvas; 6–7 or fewer mapped units in a toggle legend; unit highlight/dim behavior and a separate Surface ↔ subsurface control. Keep the geologic map evidence distinct from interpreted 3D geometry.
- [ ] **Drilling:** show recorded holes only on the drilling chapter; select a hole to align camera and interval profile; filter only on available fields; ID labels remain decluttered; best-intercept emphasis uses sourced assays.
- [ ] **Resource:** counters derive from the reported table at the official basis; mark that basis explicitly; any model-only threshold displays an illustrative-not-reported note. Add grade distribution/category toggles and a section plane only where they preserve the report's definitions.
- [ ] **Metallurgy:** stage rail and detail card identify one sentence, one sourced number and reference; expose the supporting table; pause/resume and static summary are available; product/downstream visuals remain clearly illustrative where not qualified by Tanga testwork.
- [ ] **Mine planning:** keep the sourced two-pit RF1 concept; add a time scrubber only when dated spatial mining phases exist. Show Conceptual study status, key assumptions, playback controls and pause-on-camera-input.
- [ ] **Close:** return to the regional/orbital context; show only committed milestones and verified disclaimer; replay/download/contact/share actions each resolve to a working destination.

Local review recorded 16 November 2026:

- [x] At 1366 × 768, the intro poster appears behind the hero copy on first paint. The in-app arrow, source-linked AMC estimate line, sound toggle and Skip intro control are visible; the chapter waypoints are legible over the image.
- [x] The intro's Place, Evidence and Next-stage links resolve to `#tanzania`, `#resource` and `#mine_planning`. Browser capture confirmed the Place and Next-stage headings and the Evidence model chapter; the sound control toggles its accessible state.
- [x] Reviewed North and South pit camera frames at both desktop sizes. The selected pit is presented with terrain context, and both RF1 shells remain together in the whole-site view. This camera composition change does not alter pit geometry or source blocks.
- [ ] The intro-to-live-scene crossfade, keyboard-only skip/waypoint navigation, sound-track audibility, and measured asset-load percentage still need explicit verification. Do not display a numeric loading percentage until the app exposes actual progress events.
- [x] Fix a hydration mismatch on direct chapter links: initialize waypoint state identically on server and client, then read the URL hash after mount. A fresh local `#mine_planning` entry selected “Fit a concept to ground” with no hydration warning, console message or page error.
- [x] At 1366 × 768 and 1707 × 842, the new rail shows seven nodes with exactly one current step; clicking Geology loads the mapped-geology chapter, ArrowRight from the Geology node advances to Drilling, and the existing scene index still lists all 12 chapters. Captures: `.playwright-mcp/story-waypoints-mine-1366x768.png` and `.playwright-mcp/story-waypoints-mine-1707x842.png`.

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
  - [x] Replace the full-screen act overlay with a 1.5-second cue below the act navigation. In Chrome, the cue measured 360 × 88 px at both desktop sizes. A fresh closing chapter link showed no cue, manual act crossings showed it, and reduced-motion crossings skipped it. Map camera commands now use zero transition duration when reduced motion is enabled. Captures: `.playwright-mcp/act-cue-desktop-1366.png` and `.playwright-mcp/act-cue-desktop-1707.png`. Opening composition and reduced-motion behavior across the full Three.js sequence remain open.

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
- [ ] Measure cold and warm first-useful-frame and scene-ready times for all chapters. The six-scene 30-second camera sweep is now measured at 1366 × 768; cold entry, first-useful-frame, repeated distributions and the second desktop size remain open.
  - [x] Complete one foreground 30-second orbit/zoom sweep on each 3D/process scene at 1366 × 768 in Chrome 157 on Windows/Intel UHD Graphics (`0x0000A788`, DPR 1.0). rAF p95 intervals: Topography 20.8 ms; Drillholes 24.8 ms; Subsurface 58.4 ms; Resource 25.1 ms; Mine Planning 16.8 ms; Metallurgy 29.2 ms. Full p50/p95/p99/max distributions and hardware details are in `TANGA_NEXT_PHASE_PLAN_2026-10-23.md`. These are single-session scheduling samples, not GPU presentation benchmarks.
  - [ ] Repeat camera samples and optimize Subsurface/Resource; run at 1707 × 842 and separately record cold/warm first useful frame and ready-time distributions.
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

## 17 November 2026 — conceptual process, mine sequence, and closing bookend

- [x] **Metallurgy separation concept:** add rising graphite-flake cues and a distinct sinking gangue stream in the flotation stage. The scene says the particles are illustrative and do not encode recovery or a plant mass balance.
- [x] **Testwork-linked sizing:** use the selected composite’s reported cumulative +150 µm mass fraction for the coarse bin and show its arithmetic complement separately with an explicit caveat. This is a visual explanation of the reported size split, not a plant product distribution.
- [x] **Mine-site concept sequence:** add an interactive 0–12 sequence with a consistent starting state, gradual pit reveal, source RF1 blocks only during the operating concept interval, conceptual facility reveal, fixed-site sun motion, fading nested pit cues, and final conceptual lake surfaces positioned from the RF1 registered pit elevations.
- [x] **Mine-plan disclosure:** name the control “Illustrative development sequence” and state that it is not a year-by-year mine schedule or closure design. Preserve the two RF1 pit shells and source ore blocks; keep generated facility layout and sequence cues explicitly conceptual.
- [x] **Closing orbit:** close on the globe, sourced milestone dates, a compact orbit/title emblem with animated graphite-hex dust, and a brighter animated project-to-port display arc. The arc remains illustrative; the orbital motif is explicitly not a licence boundary.
- [x] **Conclusion recap bookend:** keep the 15-second four-chapter flythrough inside the existing `#comparison` conclusion. The ending pulls back across the four schematic evidence scenes, resolves on an orbiting graphite-hex beacon and a legible Tanga Graphite title, then returns to the same conclusion. The recap now uses a full-screen cinematic frame so the 3D scenes lead and the four existing chapter links stay available. Local OpenNext checks at 1366 × 768 and 1707 × 842 confirmed full-viewport canvas, no overflow or page errors, all four links, automatic return, and unchanged `#comparison` route; no slide or chapter was added.
- [x] **Desktop visual review:** inspect the metallurgy overview and flotation cutaway, the mine-planning overview, and the closing globe at 1707 × 842. The new HUD elements remain inside their reserved side/footer zones. `npm run typecheck` and `git diff --check` pass.
- [x] **Product sizing and mine closure acceptance:** at 1366 × 768 and 1707 × 842, the Product inspector fits the reported 34.6% coarse fraction, calculated 65.4% remainder, conceptual sizing caveat, TDM001 identity and evidence-board action without an inner scrollbar. The mine sequence reaches Closure at both sizes, and the North Pit close view retains the conceptual lake inside the shell. Evidence is recorded in the slide-by-slide checklist.
- [x] **Fresh geology deep links:** mapped surface, terrain relief and interpreted depth returned HTTP 200 at both target desktop sizes with a ready Three.js canvas, 0 rendered drill segments, no page overflow and no browser errors.
- [x] **Build gate:** `npm run typecheck` and `npm run cf:build` pass after the conclusion and product-sizing changes. OpenNext routes the large terrain/model assets through the configured R2 base; Wrangler authentication is available for deployment verification.
- [x] **Cloudflare live verification:** deployed the pushed Worker as version `4d2e9052-1645-4f46-8dda-6d9fc2fa14ca`. On the public URL, the product-sizing route returned HTTP 200 and fit without scrolling at both target sizes; the conclusion recap rendered full-screen with all four links, no overflow and no browser errors.
- [x] **Vercel preview verification:** the dashboard shows the latest branch deployment for commit `057aea6` as Ready, and the live preview serves `057aea63af28+dirty`. The code-identical `523750f` preview passed a 12-chapter fresh-link sweep at 1366 × 768 and 1707 × 842; the latest build was rechecked on all six 3D/process scenes at 1366 × 768, each reached ready, with no page errors or overflow. Warm-session scene-ready timings ranged from 1.16–3.46 s at 1366 × 768 and 1.37–2.50 s at 1707 × 842 on the earlier preview. The existing conclusion recap filled the viewport at both sizes and links to four existing chapters; no new slide or route was added. Captures: `.playwright-mcp/vercel-conclusion-latest-523750f-1366x768.png` and `.playwright-mcp/vercel-conclusion-latest-523750f-1707x842.png`.
- [x] **Current Cloudflare chapter matrix:** all 12 direct chapter links returned HTTP 200 at 1366 × 768 and 1707 × 842, with expected route state, no horizontal overflow and no page errors. Fresh-page checks confirmed all six Three.js chapters reached `data-ready=true` at both sizes. On the live run, scene readiness ranged from 4.1–11.3 s at 1366 × 768 and 2.8–5.6 s at 1707 × 842. These are warm-edge/headless browser observations, not cold-cache or physical-device benchmarks.
- [ ] **Remaining release acceptance:** verify the stable Vercel production and anonymous public link revisions independently; measure cold first-useful-frame, repeat/1707 × 842 camera distributions, optimize the Subsurface/Resource outliers, and complete hosted renderer recovery and service-worker update checks before release.

**Evidence boundary:** the process effect is a conceptual explanation grounded by the report’s composite results; the mine sequence is an illustrative animation grounded by the supplied RF1 shells, block model, and PaulSam site-context references. The source folder does not provide a staged annual pit schedule, engineered haul-road alignment, plant mass balance, or closure design, so the visuals do not claim those designs exist.
