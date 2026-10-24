# Tanga authored-shot specification

Date: 24 October 2026  
Status: first-pass desktop specification from the current branch. This records shipped camera/story behavior and makes missing fallback states explicit; it is not a claim that every shot has passed its desktop capture gate.

The application has 12 chapters and 35 authored chapter shots (including the single-shot metallurgy and decision chapters). A shot is a selected camera/evidence composition within a chapter. The map view states are defined by `VIEW_STATES` and `STORY_SHOTS` in `src/components/TangaDeckWorkbench.tsx`; Three.js chapter cameras are defined by `cameraShotForMode` in `src/components/TangaThreeGeologyScene.tsx`. Mine-plan and metallurgy have additional scene-local camera routines described below.

## Chapter opening shots

| # / chapter | Camera target and opening composition | Visible evidence / one takeaway | Presenter interaction | Source shown in the chapter | Runtime fallback |
|---|---|---|---|---|---|
| 01 Project | MapLibre, `VIEW_STATES.project`: project center, zoom 12.6, pitch 46°, bearing 20°. Boundary-led oblique site view. | Project footprint in its terrain setting. The boundary is a presentation constraint, not a newly verified legal survey. | Trace boundary; `Tested ground` shot moves closer (zoom 13.35, pitch 54°, bearing 28°). | Existing boundary layer, survey imagery and source disclosure. | No static scene fallback is wired for map chapters. Keep the story shell and source controls available if the map renderer fails. |
| 02 Tanzania | MapLibre, center 36.4°E / 6.5°S, zoom 4.35, pitch 32°, bearing −12°. Country-to-coast framing. | Place Tanga in Tanzania and its coastal setting before showing project-scale evidence. | Advance to `Tanga region` (center 38.2°E / 5.4°S, zoom 6.15, pitch 42°, bearing −15°). | Regional basemap, project marker and regional report map in Sources & basis. | No static scene fallback is wired for map chapters. |
| 03 Work completed | MapLibre, regional overview (center 38°E / 6.4°S, zoom 1.75, top-down). Keep the map quiet behind the milestone evidence. | Four dated evidence milestones: diamond drilling, aerial survey, reported estimate and flotation testwork. | Select each milestone card; the evidence card changes while the regional locator stays fixed. | AMC MRE §3.2 and the linked survey, estimate and IMO testwork source entries. | No static scene fallback is wired for map chapters; retain the milestone content and source links if map rendering fails. |
| 04 Read the landscape | Three.js survey terrain. Authored camera from (−6200, 4700, 8100) through (−4550, 3250, 5900), target (0, −30, 0); 42° field of view. | Oblique measured relief at 1:1 vertical scale, with regional DEM outside survey coverage. | Orbit/reset; `Ridge profile` sweeps the measured cross-ridge profile. | August 2025 aerial DTM, coverage mask and regional DEM; see `TANGA_SPATIAL_REGISTRATION_AUDIT_2026-10-23.md`. | `/presentation-assets/tanga-fallback-topography.jpg`. |
| 05 Follow a recorded hole | Three.js project-scale drill camera. Authored from (−2180, 820, 3180) through (1220, 285, 1840), target (100, −125, −90); 36° field of view. | Recorded collars, traces and assayed intervals; untested space between holes remains interpretation. | Coverage → section angle → best intercepts; select a recorded hole and play/pause its sampled intervals. | Recorded drillhole/collar and assay tables; denominator wording is “holes with intercepts,” distinct from the 100-hole campaign. | `/presentation-assets/tanga-fallback-drillholes.jpg`. |
| 06 Reveal the host rock | Three.js mapped surface opens north-up, tilts into draped terrain, then reveals the separate model; default depth camera target (40, −285, 0), 36° field of view. | Raster-derived surface polygons, terrain and interpreted 3D contacts are separate evidence layers. Approximate map registration is disclosed. | Select a unit; toggle layers; move through mapped surface → relief → interpreted depth → reversible section. | Digitized Tanga MRE map, interpretation GLB and source basis. No grab-sample coordinates are available to place markers. | `/presentation-assets/tanga-fallback-subsurface.jpg` (interpreted-depth still). |
| 07 Understand the model | Three.js resource camera from (−2380, 820, 3420) through (1120, 245, 1880), target (20, −160, 10); 36° field of view. | Reported estimate gives scale and grade; colored cells locate modeled values, not reserves or a new estimate. | Rotate; isolate a grade band; replay/stop spatial block assembly; inspect a section. | 19 December 2025 AMC MRE and its block model; the display threshold is not an economic cutoff. | `/presentation-assets/tanga-fallback-resource.jpg`. |
| 08 The global peer field | MapLibre, center 30°E / 12°N, zoom 1.55, top-down. Peer bars/globe carry the comparison; avoid an unsupported current-world-rank headline. | Ten values as published in the selected benchmark, then Tanga's 7.31 Mt Indicated insertion at fifth within that set. | Show baseline → insert Tanga; select a peer to open its dated source and qualification. | 7 November 2023 selected benchmark plus separately dated Tanga MRE; unresolved peer discrepancies remain disclosed. | No static scene fallback is wired for peer/map chapters. Keep the ranked table and dated-source panel usable if the globe/map renderer fails. |
| 09 Fit a concept to ground | Three.js natural oblique whole-site shot is the opening view (81° compass bearing); `Reset` restores it. North-up is a secondary plan preset (0°). Detail actions target each pit, feed area, plant, service yard, water and waste features. | Keep natural terrain context around both conceptual pit envelopes and the lowland processing candidate. Separate report candidates, approximate map traces and illustrative facilities. | Orbit, reset, north-up, site sequence, facility inspector, optional concept layers and purposeful motion. | PaulSam June 2023 candidate 2 and feed-in point, RF1 block-coordinate screening, provisional boundary and registered terrain; all other facility layouts remain illustrative. | `/presentation-assets/tanga-fallback-mine-planning.jpg`. |
| 10 Examine the testwork | Standalone metallurgy exhibit frames the complete campus; selected stage cameras fit the relevant bay. The separate exhibit uses a 24° camera angle and whole-plant reset. | Actual sample results lead; the factory is a process explanation. TC, recovery and +150 µm mass fraction answer different questions. | Select one of five process areas; open/close its roof; play/pause operation cues; reset to overview. | IMO Final Report Rev. 0, Table 2, and AMC MRE Table II. SEM/microscopy stays separate without a verified sample crosswalk. | `/presentation-assets/metallurgy-report-page.png` (analytical results page). |
| 11 Connect to the port | MapLibre, center 38.95°E / 4.98°S, zoom 9.55, pitch 44°, bearing −16°. Corridor first; the coastal shot moves toward the port. | Show geographic relationships and route provenance; do not imply secured capacity, permissions or operating access. | Access corridor → coastal link; switch port/rail/power route target. | Labeled route-service result (OSRM or local estimated fallback), open map context and project source disclosures. | No static scene fallback is wired for map chapters. Keep route text, distance provenance and source controls visible if the map renderer fails. |
| 12 Evidence to decisions | MapLibre closing frame, center 38.5°E / 8.1°S, zoom 3.4, pitch 26°, bearing −8°. Keep the decision map and evidence links in focus. | Three next-study questions: reconcile datasets, strengthen study confidence and test development constraints. | Select a question to return to its evidence; open Sources & basis or Explore. | Cross-links to the MRE, drilling, testwork, peer benchmark and concept disclosures. | No static scene fallback is wired for map chapters; retain the decision content and links independently of the map. |

## Authored shots within chapters

`STORY_SHOTS` in `TangaDeckWorkbench.tsx` is the implementation source for this sequence. Preserve the following evidence changes when editing camera or UI composition:

- **Tanzania:** country overview → Tanga region.
- **Project:** project overview → tested ground.
- **Work completed:** diamond drilling → aerial survey → reported estimate → flotation testwork.
- **Topography:** surveyed land → ridge profile.
- **Drilling:** coverage → section angle → best intercepts.
- **Geology:** mapped surface → mapped terrain in relief → interpreted depth → interpreted host section.
- **Resource:** model overview → model detail → model section.
- **Peers:** ten reported projects → Tanga enters the selected benchmark.
- **Mine planning:** whole site → north pit → south pit → waste-rock landform → feed station → processing candidate → services → tailings/water → lowland campus.
- **Metallurgy:** one results-led exhibit with five selectable process areas: feed/crushing, milling, flotation, dewatering and product handling.
- **Infrastructure:** access corridor → coastal link.
- **Decisions:** one closing view with direct evidence returns.

The executive highlights route is a separate six-shot, 90-second route: project boundary → recorded intercepts → interpreted geology → resource model → Tanga's peer insertion → decisions. The full story retains all 12 chapters.

## Gaps to close before shot acceptance

1. The five Three.js project scenes and metallurgy have runtime fallbacks. The map, peer, route and closing views do not yet have runtime still fallbacks; chapter-index thumbnails do not count as runtime fallbacks.
2. The chapter matrix defines the default camera and story purpose. It does not replace the open 1366×768 and 1707×842 before/after review of every chapter and selected detail.
3. Map chapters must preserve usable source/evidence text when their renderer fails; current documentation does not prove that failure behavior for each of those views.
4. For all source claims and limits, follow `TANGA_NEXT_PHASE_PLAN_2026-10-23.md`; this shot specification does not promote conceptual geometry or approximate registration to engineering evidence.

## Implementation references

- Chapter questions and takeaways: `src/data/tanga-story.ts`.
- Default map camera and authored shots: `src/components/TangaDeckWorkbench.tsx` (`VIEW_STATES`, `STORY_SHOTS`).
- Three.js camera presets: `src/components/TangaThreeGeologyScene.tsx` (`cameraShotForMode`).
- Three.js fallback stills and analytical page: `src/components/TangaDeckWorkbench.tsx` (`STATIC_SCENE_FALLBACKS`).
- Mine-plan and metallurgy visuals: `src/lib/deck/`, `src/components/MetallurgyProcessExhibit.tsx`.
- Existing visual reference and purpose audit: `docs/TANGA_PRESENTATION_FLOW_2026-10-22.md`.
