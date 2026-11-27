# Tanga desktop layout plan

## 27 November 2026 — slide-by-slide layout pass

Review basis: the current local 12-chapter desktop montage at 1366 × 768 (`postchange-montage-1366.png`) and the existing desktop layout checklist. This is a visual planning pass, not acceptance of later camera shots, open inspectors, or live deployment behavior. Keep the scene as the primary surface and retain the current Sakariya visual language.

### Shared placement contract

- Keep the brand/header compact at the top left and the seven story waypoints centered at the top. Avoid placing chapter-specific actions in this persistent navigation row.
- Reserve the upper-left safe area for chapter number and one-line takeaway. Keep the line short enough to avoid crossing the subject.
- Place chapter-specific controls in one compact left rail. Default to the primary action and expose specialist layers/camera options through a clearly named disclosure.
- Use one right-side inspector for interpretation, evidence and source links. Avoid a second card that repeats its headline or facts elsewhere on the slide.
- Keep the lower story cue and chapter navigator in distinct rows with enough separation from legends, profiles and annotations. Where the visual requires more height, allow the cue to collapse without hiding the navigation.
- Keep camera/reset, orientation, scale and scene-specific layer controls in predictable positions. Never make a decorative annotation look like a button or a control look like a story label.
- Set panel bounds against the focal scene region at 1366 × 768 and 1920 × 1080. Verify the initial and selected-detail states, including text wrapping, open disclosures and keyboard focus, before accepting each chapter.

### Slide-by-slide plan

| # | Chapter | What the current desktop view asks the viewer to process | Next layout pass |
|---|---|---|---|
| 01 | Project | Aerial image, licence outline, several map labels, onboarding instruction, story cue and project-summary card all compete for attention. | Make the licence and lower-aerial image the sole focal pair. Reduce map labels to the project name and one boundary key; keep one short project summary and the source caption in the right inspector. Move first-use instructions beside Next and keep the boundary status in the caption. |
| 02 | Regional setting | Globe/map, project and port labels, infrastructure callouts, route cues and a right summary all compete. | Keep the globe/map dominant. Replace scattered route actions with one compact route selector (project, port, power/rail where supported); show the selected endpoints and one distance readout in the inspector. Fade or hide unselected route labels. |
| 03 | Work completed | Large source photograph, milestone rail, thumbnail selection and right-side milestone details repeat related information. | Keep the documentary image largest. Use one dated milestone selector and one evidence card containing the result, source/caption and image provenance. Remove duplicate milestone titles/captions from other panels. |
| 04 | Topography | Terrain is clear, but terrain layers, profile/trace, opacity and map options are split across controls. | Group terrain source, opacity and profile/trace under one “Terrain” control group. Keep the elevation key and scale near the canvas edge; show one profile with named endpoints and keep its line clear of the ridgeline. |
| 05 | Drillholes | The left rail is dense while collar labels, selected-hole details, interval evidence and the lower cue share a textured map. | Default to one hole selector and one layer control. Put selected hole, depth/assay interval and core/photo evidence together in the right inspector. Keep collars simple and labels hidden until selection; do not show holes on earlier landscape chapters. |
| 06 | Geology | The source map is a narrow north–south figure in a broad light canvas, with layers/stages/legend distributed around it. | Give the source map a terrain context and fit its full extent with a readable margin; never stretch the map geometry to fill the canvas. Put “Mapped surface → Relief → Interpreted depth” in one stage strip, and put the lithology legend/visibility controls in one collapsible rail. Match map/model colors and keep the licence line absent. |
| 07 | Resource | The dipping orebody, large reported-tonnage card, model labels and cut-off/category controls compete for the same view. | Preserve the orebody as the focal visual. Keep the reported estimate and reporting basis in the right inspector header; group cut-off, category and section controls on the left. Replace floating explanatory boxes with one selected-block/threshold readout and keep reported tonnes distinct from displayed model occupancy. |
| 08 | Peer comparison | The opening thesis, globe and ten-row ranking panel each demand equal attention; table rows are difficult to scan at presentation scale. | Shorten the left thesis to one comparison statement. Give the globe a larger unobstructed viewport and the ranking a fixed-width, readable ten-row panel with a compact metric/date/source header. Selecting a row must highlight its globe marker; keep the Tanga reveal and “fifth” basis explicit. |
| 09 | Mine planning | Two conceptual pits share the terrain with site facilities, source/status labels, several view controls and a large inspector. | Keep both sourced pits together in the default natural oblique overview. Use one destination selector for Site / North / South / Blocks / Plant and one compact camera menu. Put concept status and source basis in the inspector; show full facility names on selection. Keep pit rims, benches and ore blocks grounded and visible around the HUD. |
| 10 | Metallurgy | The bright plant scene is framed by several top action/stage rows, a right evidence panel and multiple pathway controls. | Normalize the panel typography and geometry to the rest of the deck while leaving the plant bright. Use one stage strip along the plant frame, one Play/Pause + Whole plant action row, and show Open roof only for a selected hall. The right inspector should show one operation, one sourced result and its evidence link; downstream anode/refractory visuals need a clear conceptual label. |
| 11 | Port access | Map route, infrastructure labels, lower profile, route stages, distance cards and the right inspector compete for a shared reading order. | Make the selected route the clear map focal path. Put route selection and endpoints together; keep report-stated 72 km and mapped-road 76 km in separate, labeled rows. Collapse optional utility nodes and keep the elevation profile in one stable lower-left area without overlapping navigation. |
| 12 | Conclusion | Globe/orbit, presenter prompt, map locator, bottom story cue and next-study decisions repeat the closing message. | Keep the current single conclusion slide. Use the globe/orbit as the hero, a compact location label on the map, and one right decision panel with three evidence-linked next-study questions. Remove duplicate summary prose; keep Replay and Copy/Share as the final clear actions. |

### Recommended execution order

1. Fix the common safe areas and control roles, then verify them on a map chapter, the light-background Metallurgy scene and the full 3D Mine Planning scene.
2. Reduce scene obstruction in Geology, Drilling and Peer comparison; check selected states and evidence/source access.
3. Rebalance the Project, Regional, Work completed, Topography, Resource, Port and Conclusion panels using the same spacing, type and disclosure behavior.
4. Capture all 12 chapters and at least one selected-detail state for Geology, Resource, Mine Planning and Metallurgy at 1366 × 768 and 1920 × 1080. Check scene focal area, panel overlap, clipping/scroll, control position, label readability, keyboard focus and source access.
5. Repeat the visual and interaction pass on the intended live desktop deployment. Keep phone/tablet acceptance separate and deferred.

### Checklist status

- [ ] Apply and document the shared placement contract across all 12 chapters.
- [ ] Complete the slide-specific composition updates above without changing source values, geological colors, pit locations, or report qualifications.
- [ ] Verify initial and selected-detail states at both desktop sizes; confirm no panel hides a key scene anchor or another control.
- [ ] Recheck all 12 deep links and core interactions on the current branch deployment.

Reviewed the 12 chapter entry views on the local investor branch in Chrome at 1366 × 768. The screenshots cover the opening composition. Later shots, open drawers and deployment performance need separate verification.

## Shared layout

- [ ] Reserve the bottom centre for chapter navigation. Fold the large “Up next” card into the forward control and put the current shot caption directly under its chapter heading. Give the 3D subject the space currently between these two bars.
- [ ] Use a consistent lower-left compass and scale on spatial slides. Group reset, orbit preset and surface opacity in a single camera menu beside them. Keep the active chapter action next to the evidence it changes.
- [ ] Give sources and evidence one upper-right entry point with two clearly named tabs. Set aside space for the open inspector when framing the camera. Fit both the scene and its labels inside the remaining rectangle.
- [ ] Prioritise the selected label. Offset overlapping markers, shorten inactive labels and show the full text on focus or click. Make the control contrast and focus ring readable over both bright map imagery and dark backgrounds.

## Chapter worklist

| Chapter | What the opening view shows | Proposed layout and interaction |
|---|---|---|
| 01 · Project | The onboarding prompt sits above the licence, its boundary explanation overlaps the outline, and the lower boundary runs behind navigation. | Fit the complete licence in the free map area. Put its provisional status in the photo caption, use a small boundary key and anchor first-use keyboard help to Next. |
| 02 · Regional setting | Several southern peer markers gather along the bottom edge behind the story cue. Two map callouts compete with Tanga. | Open with a composition that includes Tanga, the coast and the southern cluster above navigation. Label Tanga and its port first. Reveal the peer names together when the presenter selects the cluster. |
| 03 · Work completed | The selected milestone appears on the photo, in a four-thumbnail inspector and again below the photo. | Give the source photograph the largest rectangle. Use a four-stop dated selector below it and a caption with the milestone result and original-image link. Keep the caption and footage together when advancing. |
| 04 · Topography | The A–B chart sits on the right, Trace is on the left and opacity sits in a separate lower-left panel. | Place Trace and the distance cursor on the elevation chart. Frame both terrain endpoints in the free canvas. Dragging either cursor should move the other, with distance and elevation shown once. |
| 05 · Drilling | Small collars compete with a dark satellite texture. Follow recorded hole, Follow a drillhole and a sample link offer different starting points. | Make Follow TGDD1009 the main action beside the selected collar in the inspector. During playback, show one depth cursor, the assay interval and its core image together. Keep hole selection available in a compact dropdown. |
| 06 · Geology | The long north–south map occupies a narrow central strip. Lithology controls sit at left, stage controls at right and chapter shortcuts overhead. | Put Mapped surface → Relief → Interpreted depth in one stage selector above the canvas. Use a searchable, scrollable rock legend with visibility and isolate controls. Frame the selected contact through the tilt and keep the map key visible. |
| 07 · Resource | Two black callouts cover the narrow orebody. Grade controls are on the left and the reported estimate is on the right. | Put the reported estimate and its basis in a fixed inspector header. Group cut-off, slice and visible model counts beneath it. Replace the large highest-grade callout with a small pin and show its value in the inspector when selected. |
| 08 · Peer comparison | The ranking table clips its lower rows at laptop height. The globe’s right edge meets the table and southern Africa’s markers overlap. | Give the globe its own viewport and fit all ten table rows, with a fixed metric header. Put Introduce Tanga directly above the table. Keep the same numeric scale during reveal and highlight the selected row and marker together. |
| 09 · Mine planning | Site, pit blocks, camera angles, flyover and terrain comparison compete. The right inspector consumes as much attention as either pit. | Default to a two-pit overview with compact North, South and Plant labels. Put Site / Pit blocks / Plant in one destination selector. Offer Fly to plant in Site and Open roof in Plant. Keep the concept designation beside the title. |
| 10 · Metallurgy | Five stage tabs and five commands share two narrow header rows. The full plant is small inside a second frame, and lab evidence has two entry points. | Give the plant more height. Keep a single stage strip below it and put Whole plant and Play/Pause together on the canvas. Show Open roof only where it acts on a selected hall. Use one right-hand inspector for the selected operation and its laboratory evidence. |
| 11 · Port access | The distance card, road profile, infrastructure callouts and three material stages compete with the route. The third stage sits low in the inspector. | Keep the full selected leg and both endpoints in frame. Use a three-leg selector above a compact route profile. Keep the project-stated 72 km and the mapped-road measurement separately labelled. Put utility nodes behind an optional layer. |
| 12 · Conclusion | The map, presenter-control prompt, bottom cue and three study questions establish competing reading orders. | Let the camera settle on the project, then reveal one clearly titled decision panel. Give each question one supporting evidence link. Place Replay and Share at the end and preserve the return path from evidence to the same closing question. |

## Build and acceptance order

1. Implement shared navigation, camera controls and evidence placement. Check map, terrain, factory and photo layouts before propagating the changes.
2. Fix the highest-impact chapters first, in order of Peer comparison, Mine planning, Metallurgy and Geology. Verify all ten peer rows and the Tanga reveal, both pit rims and their labels, the flotation cutaway, and the same mapped contact through a tilt.
3. Apply the remaining chapter changes in story order. Verify that the selected drill interval, reported resource basis, separate port distances and closing evidence links survive navigation.
4. Capture each chapter at 1366 × 768 and 1920 × 1080 in presented and inspection states. Exercise every primary action with mouse and keyboard. Test these same flows on the branch deployment, including a cold entry and repeated transitions into Drilling.

## Implementation and review

- [x] Reframe the opening Project overview so the complete provisional boundary stays above chapter navigation at 1366 × 768 and 1707 × 842. Keep the closer Tested Ground shot as a distinct follow-up. Local production-build captures: `.playwright-mcp/project-overview-adjusted-1366.png` and `.playwright-mcp/project-overview-adjusted-1707.png`.

- [x] Shared desktop navigation and shot captions, consolidated Evidence entry, keyboard focus, and camera controls.
- [x] Chapter layout changes across all 12 entry views. Chrome captures at 1366 × 768 and 1920 × 1080.
- [x] Interaction checks for switching evidence milestones, opening sources, selecting geology stages, filtering resource cells, showing all ten peer rows and revealing Tanga at fifth, navigating from Site to Plant and back, opening the flotation roof, and enabling port power infrastructure.
- [x] Move the Metallurgy camera/process toolbar into the heading row so it no longer overlays the plant. Production-build checks at 1366 × 768 covered the initial facility and selected Flotation with the roof settled open; a 1920 × 1080 check covered Flotation and the anode pathway. At each state the title/toolbar did not overlap, actions ended above the canvas, and there was no document overflow. Capture: `.playwright-mcp/metallurgy-toolbar-1366.png`. The selected Flotation inspector still scrolls and remains open for its own density pass.
- [x] Lead the selected Flotation inspector with its report-backed result before showing the conceptual separation graphic. At 1366 × 768, the selected composite's TC, recovery and coarse fraction are fully visible without scrolling; lower conceptual/source details remain scrollable. Capture: `.playwright-mcp/metallurgy-evidence-first-1366.png`.
- [x] Refine Peer Comparison's laptop layout: remove the pre-reveal oversized “Mt” placeholder, state the dated-set caveat in the narrative, and compact the ranking rows. On a production build at 1366 × 768, all ten published benchmark rows fit before reveal; after inserting Tanga, the eleventh row remains reachable in the list's own scroll area. The Tanga state shows 7.31 Mt, its 148 Mt × 4.94% TGC basis, and the MRE link. At 1920 × 1080 all rows fit in the panel. Neither size has document overflow. Capture: `.playwright-mcp/peer-unrevealed-1366.png`.
- [x] Verify the Peer Comparison change on the pushed Vercel branch preview at 1366 × 768. All ten pre-reveal rows fit, the comparison caveat is visible, the document has no overflow, the map reaches ready state, and the browser console has no errors or warnings.
- [x] Audit Mine Planning's Site, Pit blocks and Plant panel states at desktop sizes. At 1366 × 768, both source pit shells and their grade blocks are visible together; the right inspector keeps its own scroll for supporting details without covering the map or bottom navigation. At 1920 × 1080, the Plant controls fit without panel scroll and the facility/site labels remain visible. No document overflow. Captures: `.playwright-mcp/mine-planning-layout-1366-pass.png`, `.playwright-mcp/mine-planning-blocks-layout-1366-pass.png`, `.playwright-mcp/mine-planning-plant-1920.png`.
- [ ] Complete visual acceptance for every later shot and inspector at both sizes. Camera framing still uses authored presets. A live camera fit tied to the available canvas, regional peer-cluster expansion, and an in-deck return to a specific closing question remain open.
- [ ] Verify the branch deployment and repeat cold and warm transitions into Drilling.
