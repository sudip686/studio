# Tanga presentation — next-pass improvement plan

Status: partially implemented and browser-checked on 2026-09-10. See `PRESENTATION_VERIFICATION_2026-09-10.md` for current coverage and unresolved work. The chapter table below remains a backlog, not a claim that every proposal is complete.

## Direction and constraints

Retain the copper, charcoal and warm-neutral theme, the existing boundary, eleven chapters, and the Next.js/Cesium/Three.js architecture. Aim for 16.5 minutes of authored content within a 15–20 minute session. Add detail through optional exploration rather than extra compulsory slides.

Prioritize readable evidence and reliable interaction before more animation. Distinguish source observations, geological interpretations and presentation concepts. Do not turn the north/south concepts into a full-extraction claim or import scenario economics as established project results. No commits or production deployment are implied by this plan.

## Priority 0 — reliability and claim consistency

1. Replace accumulating layout overrides with shared overlay slots: heading, left legend, right utility panel and bottom navigation. Only one right utility panel at a time; opening notes, layers or evidence must consistently replace the previous panel. Keep persistent navigation unobstructed.
2. Define two label budgets: presentation has at most two key callouts; exploration permits additional labels within measured free space. Currently several drillhole callouts cover the resource body, while drill collars distract from the pits and plant. Default those drilling layers off in mining/metallurgy, retaining an explicit exploration toggle.
3. Make camera targets data-bound and scene-specific. Preserve an authored reset, then offer whole-site and detail views without generic zoom commands accidentally leaving the subject behind an overlay. Stop camera movement immediately on user input.
4. Audit all legacy copy and interstitials, not just the main headings. Review claims such as neighbouring projects proving geology, workable terrain lowering costs, drainage already understood, infrastructure reducing CAPEX, and “optimum pit ore.” Remove unsupported statements or qualify them with a dated source and assumptions. Keep project boundary terminology consistent.
5. Add a reproducible visual regression suite and a short presenter preflight. Test all chapters and transitions before extending the feature set.

Acceptance: at 1258×566, 1366×768 and 1920×1080, no primary UI rectangles intersect, every control is reachable, content scrolls inside panels, labels avoid controls, and all panels can be dismissed using keyboard and pointer. Also inspect 200% browser zoom and one tablet-size viewport. No uncaught errors or persistent blank canvas on repeated navigation.

## Slide-by-slide plan

| Chapter | Proposed visual/interaction improvement | Transition into the next chapter | Acceptance |
|---|---|---|---|
| 1. The opportunity | Lead with a clean Tanga locator and one verified takeaway. Keep the peer ranking optional, with metric, date and comparison basis visible. Avoid opening with a dense list. | Keep the project marker fixed while the globe approaches Tanzania. | Viewers can identify Tanga immediately; peer comparison does not mix reporting bases silently. |
| 2. A place in Tanzania | Country → region → project camera stops; reveal coast and port only when useful. Use restrained labels and a scale change cue. | Move to the same project anchor rather than resetting to a new orientation. | Country and project remain identifiable through the flight; no rapid spin or clipped text. |
| 3. The project footprint | Boundary first, then drilling footprint and proposed facilities as separately controlled layers. Use a compact overview inset only if it clarifies location at close zoom. | Tilt into relief while retaining the same boundary outline. | Boundary remains unchanged; conceptual facilities are visibly distinguished from existing ones. |
| 4. Read the ground | Add satellite/relief toggle, restrained contours and a terrain profile along a selected line. Use shallow lighting to reveal relief; clearly state any vertical exaggeration. | Carry the profile line into the geological section. | Profile derives from the loaded DEM; no invented drainage, accessibility or build-cost conclusion. |
| 5. Inside the geology | Highest-value new feature: real section clipping through the supplied GLB. Add host-only/all-units views and a linked rock-unit legend. Use the supplied section image as labelled source context, not a texture stretched into 3D. | Preserve the section and reveal the drillholes that intersect it. | Clipping applies to model and relevant drill traces consistently; no fabricated contacts or weathering surfaces. Source image orientation/location is established before claiming exact correspondence. |
| 6. Test the interpretation | Start with drilling coverage; select one hole to show logged lithology and assay intervals in the evidence panel. Provide a representative interval, not only the strongest intercept. | Keep the selected hole visible while blocks appear around it. | Hole IDs, from/to depths and values match source rows; evidence selection is reversible and does not hide the legend. |
| 7. Build the model | Preserve the full population. Add full-model/section/grade-focus views; show active threshold and visible-versus-total counts. Offer 4.5% and 5% TGC display filters in exploration, clearly non-economic. Limit default callouts. | Fade the lower-grade context and pull above ground to locate the two concepts. | Filtering never changes source grades or cell dimensions; reset restores every selected block. Display filtering is not called extraction or reserves. |
| 8. Shape a mining concept | Three authored views: both pits, north detail, south detail. Add a comparison between the supplied RF 1 surface and our adapted two-envelope concept. Improve terrain/contour intersections before adding continuous ramps or vehicle scale cues. | Follow an illustrative material path to the plant only after a contained route is defined. | Exactly two named concepts remain inside the boundary with no mutual overlap. Any ramp has continuous elevations, stated width/grade assumptions and verified containment. Direct source grids are not confused with our redesigned envelopes. |
| 9. From rock to concentrate | Sequence feed preparation → flotation → thickening/dewatering → product handling. Highlight one process group at a time. Add roof fade/cutaway on demand, internal supports and human/vehicle scale cues. Replace the oversized foundation-block appearance with a terrain-conforming conceptual platform treatment. | Pull back from product handling to transport context. | Equipment is visible without evidence-panel collisions. Footprint checks include all scaled geometry. Testwork is separate from assumed plant throughput and product qualification. |
| 10. Connect to market | Trace the route in stages, then show a compact elevation/profile view. Differentiate mapped connections, proposed connections and verified facilities. Keep route labels off the central map. | Return to the site with a concise recap of evidence and open decisions. | Distances use a documented route/method. No claim of secured access, capacity or power connection without evidence. |
| 11. The case and next steps | Replace repeated promotional metrics with three grounded takeaways and a short development sequence: evidence → validation → design decisions. Add a Q&A chapter picker and replay controls. | End on a stable site view; no automatic looping. | Closing claims have sources or explicit uncertainty. Optional replay returns to the requested chapter without restarting the cover. |

## Cinematic rules

- Maintain one dominant subject per shot. Use stage lighting consistently; reserve copper emphasis for the active subject rather than every object.
- Use deliberate camera travel followed by long holds. A starting target is 2–4 seconds of travel, then a stable narration interval; adjust after live rehearsal.
- Do not orbit continuously while evidence text is being read. Offer motion-reduced/static equivalents for every transition.
- Preload the next chapter without changing the current view. Start its narration budget only once ready; pause for errors or manual exploration rather than silently skipping content.
- Treat the 90-second chapter budget as a total shared by shots and interstitials. Rehearse the full tour; loading delays and Q&A must be measured separately.

## Performance and resilience

- Benchmark the full 155,853-block view on the presentation machine before increasing effects. Optimize internal-face rendering or use geometry-preserving LOD; do not reintroduce undocumented sparse block sampling.
- Record frame rate, transition latency and memory after repeated chapter loops. Proposed acceptance target: at least 30 FPS during ordinary orbit on the target machine, with no monotonic GPU-memory growth. This is a target, not a current benchmark result.
- Keep the known-working mining rendering path until post-processing is independently tested against black-frame failures. Test terrain preview-to-detail upgrades, reset, repeated navigation, and missing-asset recovery.
- Add a preflight checklist: assets ready, source versions recorded, controls working, no active microphone unless intentionally enabled, default camera restored, and full-screen text legible.
- Prepare a labelled static fallback for each critical chapter if WebGL fails. Any offline mode requires checking all map, imagery, font and script dependencies; do not describe the current deck as offline-ready.

## Delivery sequence

1. Reliability/copy pass: overlay slots, label budgets, scene-specific camera controls, legacy claims and regression coverage.
2. Geology/evidence pass: clipping, rock-unit selection, linked drill log, complete-resource filters and provenance.
3. Mining/plant pass: source-grid comparison, terrain stitching, north/south details, contained ramps, process-group focus and improved foundations.
4. Narrative/rehearsal pass: staged transitions, timing readiness, simplified opening/closing, performance benchmark and fallback behaviour.

Each phase ends with screenshots, automated checks where applicable, a list of tested interactions and explicit unresolved items. Do not claim the whole plan complete when only one phase is verified.

## First-pass progress — 10 September 2026

### Mining / metallurgy redesign follow-up

#### Larger campus and dedicated animated metallurgy chapter

The latest plant is a 960 × 672 m conceptual campus, replacing the 672 × 432 m pad. It adds a covered blending/feed hall, second flotation train, reclaim thickener, maintenance/spares building, product-storage/loadout hall and pipe/conveyor connections while retaining the previous equipment scale. The overview camera now includes the campus bounds, not just the pits. Live boundary checks and geometry tests admit the footprint plus 20 m planning margin; this remains a presentation layout, not a capacity or engineering design.

Metallurgy is now one authored chapter view: animated illustrative flakes, gentle bubbles, a process-flow marker, three measurement explanations, and the separate reported carbon/recovery/coarse-fraction panel. Pause and reduced-motion styles are included. It no longer loads a concealed 3D mine scene. Browser checks at 1366×768 and 1258×566 covered layout, pause, Layers/evidence separation and return to mining. TypeScript and the expanded plant/evidence tests pass; browser error output was empty. No commits made. Truck-route and original laboratory-report verification limitations remain open.

#### Evidence-story addition

Mining now has a replayable four-stage reveal: selected drill traces → high-grade target cells → bench surfaces → processing complex. The presenter can select a stage directly, hide/show evidence holes, pause motion, or inspect a source hole by clicking its ID. Replay resets the authored overview. Reduced-motion preference bypasses automatic reveals while retaining manual stage selection.

Eight holes were selected in the live data: TGDD1003, TGDD1009, TGDD1046, TGDD1019, TGDD1021, TGDD1030, TGDD1033 and TGDD1049. Selection spans collar positions within each crest footprint and does not rank by assay. Traces retain original interval coordinates and show actual assay-colour tiers; markers represent the first available interval, without terrain snapping. This establishes sampling context, not verified hole-to-block provenance.

Browser checks covered manual stage selection, replay reset, hole visibility and flying to TGDD1003 (settled camera distance approximately 351 m). Panel height is bounded above the planning note and pager at 1366×768. Source-selection tests cover the per-pit budget, spatial endpoints, duplicate intervals and empty pit input. Existing truck-route limitations remain unchanged.

Final follow-up: the dev server stopped during verification and was restarted. A fresh load then reached stage 3 (Processing) automatically, with no reported browser errors. TypeScript and the evidence/geometry tests passed. This check does not certify every slide or browser size.

- Plant footprint increased to 672 × 432 m (2.56 times the former pad area), with all scaled equipment and the 20 m planning margin checked against the unchanged boundary and pit separation. Added a fourth mining camera stop for the plant.
- Mining displays 68,094 source model cells with centre positions inside the crest footprints and between each conceptual floor/surface, selected at ≥4.5% TGC. The ≥5% tier is copper; 4.5–<5% is teal. These are display targets, not reserves, economic cutoffs or a full-cell excavation/tonnage calculation. X-ray/solid toggle retains original dimensions and positions. Pit surfaces reveal after the targets.
- Dedicated metallurgy evidence panel now separates concentrate TC, recovery and +150 µm coarse-fraction summaries. Existing deck-summary values are explicitly labelled pending original laboratory-report verification; no complete sieve distribution, feed assay, financial model or ore-reserve estimate was fabricated. Panel scrolls at smaller viewports, moves the plant composition left and yields to Layers.
- Low-poly truck, piecewise-linear corridor, terrain sampling, pit/plant/boundary avoidance and pause/reduced-motion support are implemented. **Not complete:** final clean-load routing admitted zero corridors within the interactive search time budget. Truck movement is therefore withheld. An earlier, less restrictive pass showed two trucks but is not the delivered validation result. Next step: precompute/review terrain-supported corridors outside the render thread, then add continuous internal pit ramps and plant-pad access. Current code is explicitly rim-to-ground receiving only.
- Process-flow marker and motion control are active independently of trucks. Evidence mode pauses process/truck motion.
- Checked mining overview, north/south/plant stops, X-ray/solid mode, pause, wheel zoom, and metallurgy at 1600×900 and 1366×768 during this pass. Final clean mining load had no reported browser errors. TypeScript and updated pit/plant/haul-route geometry tests pass. No full-deck regression or performance certification is claimed; no commits made.

Implemented:
- Mining now has overview, north-pit and south-pit authored stops, fitted to the respective conceptual envelope.
- Resource Key labels suppress individual intercept callouts and allow two story labels; All data labels restores the detailed evidence. Source block geometry is unchanged.
- Mining and metallurgy enter with drilling hidden; users can enable it in Layers, and Reset restores the chapter-specific default.
- Why-this-matters copy for location, terrain, access, drilling, metallurgy, mining and closing distinguishes context/testwork/concepts from verified operating outcomes.
- The 3D scale stacks its value beneath the bar to avoid wrapped units in close-ups.

Verified on localhost:9004: mining overview → north → south, resource Key → All, plant drilling enable → Reset, and evidence restoration after closing Layers. Screenshots inspected at 1258×566 and plant evidence at 1366×768. Browser errors were empty. TypeScript, site-planning gates and mine-scene geometry tests passed.

This is partial phase 1 delivery, not an all-slide or all-viewport certification. Shared overlay-slot consolidation, remaining legacy/interstitial claims, reverse-navigation/zoom regression, plant process cameras and all subsequent phases remain open. The existing boundary and source geometry were not changed in this pass; no commits were made.
