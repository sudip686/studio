# Tanga cinematic implementation and verification

Visual thesis: warm geological terrain, copper identity, cyan evidence, and a continuous journey from ground to product.
Content: globe → country → licence/terrain → interpreted geology → drilling → resource → conceptual mine → processing/testwork → transport → investment case.
Interaction: authored approach/reveal/exit shots; pause on manual exploration; restore an authored view; coordinated HUD slots.

## Evidence contract

- Generated Project boundary is a provisional planning constraint, approximately 20.76 km²; it is not confirmed as the stated 6.4 km² mining licence.
- Ignore the unrelated standalone mining_license_boundary.kml.
- Use original block GeoJSON attributes and positions, never RGB-derived grades or rescaled display geometry for planning.
- Geological GLB contains named interpreted units; provenance and geologist approval remain pending. Do not translate meshes apart in geographically registered views.
- Excavations, equipment, plant siting, bench/ramp assumptions and routes are conceptual. No economic optimisation, reserves, engineered tailings storage or final process capacity is inferred.

## Work packages

1. Spatial foundation: original blocks, named geological meshes, boundary containment and complete-footprint tests.
2. Mine: connected mineralised cell candidates, explicit geometric assumptions, terraced excavation, persistent terrain cut at every LOD, candidate rejection reporting.
3. Plant: connected ROM/crusher/milling/flotation/dewatering/product elements, pads, water equipment, structural details and process labels; common site in mine and metallurgy.
4. Story: add geology to sequence; place mine before metallurgy and logistics after product; synchronise voice and visual navigation.
5. Presentation UI: quiet default, explore toggle, exclusive utility slot, protected labels, no clipped legends, pause autoplay on manual gestures.
6. Verification: type check, spatial unit checks, browser screenshots after each package, zoom/reset/layers, low-height viewport, scene traversal, console checks.

## Deferred evidence-dependent features

Confirmed legal containment needs the authoritative licence. Engineered pit stages, geotechnical slopes, operating ramps, land/environmental buffers, water balance, tailings design, throughput and final equipment selection need source designs. A supplied approved pit wireframe should replace conceptual excavation generation. Never silently invent these inputs.

## Browser acceptance

Verify 1258×566, 1366×768 and 1920×1080. Check geometry after terrain quality changes; same project orientation between geology/drilling/resource; pit is an excavation, plant is visible and connected; every admitted facility fits provisional polygon; controls are usable and model can be recovered after zoom/orbit. Record any unchecked state rather than claiming universal verification.

## Chapter-by-chapter delivery plan

| Chapter | Question and visual proof | Camera / transition to next chapter |
| --- | --- | --- |
| 1 · Opportunity | Establish the public peer context; retain source dates and comparison basis. | Wide field, then regional push. Do not confuse peer rank with technical confidence. |
| 2 · Tanzania | Where is the project relative to the coast and regional context? | Country overview → Tanga region; maintain the geographic anchor. |
| 3 · Project footprint | What land is being shown? Provisional outline, not an asserted legal licence. | Full boundary → tested ground, then reduce altitude toward terrain. |
| 4 · Read the ground | Show relief, drainage and existing access as constraints. | Raking oblique light reveals terrain; next scene opens the same ground. |
| 5 · Inside the geology | Supplied seven-unit interpretation; copper GRSC host, translucent surrounding units. | Fit the model bounds → section angle. Keep all units spatially registered, not exploded. |
| 6 · Test the interpretation | Drilling, original intervals and composite evidence test the interpretation. | Coverage → section → intercept detail. Distinguish observations from interpreted contacts. |
| 7 · Build the model | Original-coordinate grade blocks; screen sampling is for rendering, not a new estimate. | Overview → grade detail → underside. Grade legend is distinct from the layer drawer. |
| 8 · Shape a mining concept | Show separately admitted terraced footprints and contained plant pad. | Data-dependent oblique fit → operating angle → detail. Label as conceptual, never optimum. |
| 9 · Rock to concentrate | ROM, feed/crushing, milling, flotation, thickening, dewatering and product handling. | Fit the actual plant location; a small travelling marker follows connected process stages. Testwork remains separate evidence, not proof of this plant design. |
| 10 · Connect to market | Existing route context explains the downstream logistics question. | Pull back from the site → coastal link. Off-site roads are context, not facilities claimed inside the licence. |
| 11 · Case and next steps | Summarise reported evidence and the next decisions. | Return to peer context; finish with licence, engineering and flowsheet validation rather than an unsupported pit NPV. |

## Geometry method and interpretation limits

1. Use raw model point coordinates and dX/dY/dZ dimensions; no display recentering or grade-from-RGB inference.
2. Screen cells at 3% TGC for conceptual geometry only. Build eight-neighbour connected horizontal clusters, retaining groups with at least eight supporting blocks.
3. Form a convex footprint from each cluster's block corners. This may bridge internal gaps, so it is a candidate envelope, not a geological solid or optimised shell.
4. Expand the footprint for depth / tan(45°) plus one 5 m berm per 12 m level. Floor derives from the lowest supporting block; terrain at the footprint centre is a simplifying assumption.
5. Admit a crest only when the full polygon is inside the provisional boundary and does not overlap an earlier admitted crest. Rendered excavation triangles also stay inside that crest.
6. Search 50 m grid positions for a 280×180 m plant plus 20 m margin. Reject boundary/pit conflicts; rank remaining positions by local relief and distance. This is a geometric screening heuristic, not an engineering siting study.
7. Reapply terrain excavation when higher-resolution terrain loads. No haul ramp, tailings facility, mining schedule, economics or capacity is fabricated.

## Verification log

- TypeScript check passed after spatial integration; rerun after final UI changes.
- `node scripts/test-site-planning.mjs`: passed point/ring, concavity, overlap, disconnected cluster, plant margin and missing-boundary tests.
- Live dataset: three admitted candidate crests, one omitted conflicting/outside candidate; plant plus margin admitted. These checks apply to the provisional polygon only.
- Browser checks found and corrected hidden loading failures, GLB node-axis mismatch, stale processing camera, overbright materials and resource/intercept/layer collision.
- Final viewport and traversal results are recorded below after testing; unverified engineering items remain deferred above.

### Final local verification — 10 September 2026

- Traversed all eleven chapters on `http://localhost:9004`; also checked the opening cover and return navigation into 3D scenes.
- Resource legend/layers checked at 1258×566, 1366×768 and 1920×1080. No intersection between the measured principal HUD rectangles in the compact resource/layers state. Long panels scroll within their allotted area; they no longer stretch their internal rows to fill a tall viewport.
- Actual wheel zoom changed geometry-camera distances: geology 5352→6100 m, resource 1922→2191 m, mine 1367→1558 m, plant 431→492 m. Authored reset tested. Reset now restores the scene's default terrain transparency instead of hiding underground resource blocks behind opaque ground.
- Geological model: seven units loaded; converted local bounds approximately X −591…497 m, Y −103…118 m, Z −2898…2603 m. Corrected both export-axis interpretation and stale geometry bounding boxes; camera framing uses recomputed bounds.
- Source-data endpoint loaded; live site audit reported three contained candidate excavations, one rejected candidate, and an admitted plant pad plus planning margin. No legal licence certification is implied.
- Fixed additional observed collisions: resource/intercept legend, layer drawer/projected labels, logistics chart/navigation, ranking panel/explore button, and map pin labels/narrative captions.
- Final `npx tsc --noEmit`, spatial unit tests and `git diff --check` passed. Browser error capture returned no uncaught errors on the final traversal.
- Coverage is desktop presentation QA, not exhaustive testing of every camera pose, network-failure path, mobile device or production deployment. No production build/deployment or engineering validation was performed. No commit was made.

### Remaining evidence gates

The supplied GLB is visualised as an interpretation, not independently validated geological truth. Confirm the legal licence polygon before asserting legal containment. Obtain engineered pits/ramps, exclusions, approved plant flowsheet and capacity, water/tailings designs and economic inputs before presenting this conceptual layout as an operating design. These are not silently substituted with decorative geometry.

### Approved continuation — existing boundary retained

The user has explicitly requested keeping the current boundary unchanged. Do not replace it with the TIFF extent or delay presentation work for the unavailable export folder. Presentation-grade conceptual geometry is authorised; engineering or legal certification is not implied.

Implemented in this continuation:

- Default chapter budget: 90 seconds across 11 chapters (16.5 minutes, excluding opening intro, loading delays and manual exploration). Alternative budgets: 60 seconds / 11 minutes and 120 seconds / 22 minutes.
- Divide each chapter budget across its authored camera shots and any outgoing information card. Hold the final shot before ending autoplay. Restart the progress indicator for each shot/card.
- Chapter-specific presenter guidance and spoken bridges connect place → footprint → terrain → interpreted geology → drilling → grade model → conceptual pits → processing → logistics → next steps.
- Presenter notes distinguish sampled evidence, geological interpretation and illustrative development assumptions. Autoplay captions use these bridges rather than the older mismatched source-slide script.
- Widened the timing menu; suppress the first-run navigation coach while timing, notes, layers or autoplay are active to prevent the observed collision.

Next geometry work remains separate: presentation-grade ramp continuity and vehicles, richer plant detailing, and clearer rock-unit/mineralisation inspection. All geometry must continue to use the existing containment checks; no boundary edits are authorised.

### Geometry refinement continuation

- Replaced the clipped 8 m pit-surface grid with convex inset contours for batter faces, berms and floor. Existing crests, depths and boundary remain unchanged. Coarse underlying terrain can still affect the appearance where it intersects the contour surface; this is not an engineered excavation mesh.
- Added plant service lanes, flotation stairs, tank ladders/platforms, electrical kiosk and transformer detail within the original pad.
- Corrected terrain hiding the plant base: a level conceptual platform is placed above the maximum ground height sampled on a 10 m grid, with a foundation down to the sampled low ground. This is illustrative, not a retaining-wall or earthworks design.
- Added `scripts/test-mine-scene.ts`: tests projected contour coverage, elevation range, crest containment, complete plant bounds and platform placement. Run with the local `tsx` runner. Extended spatial tests for inward offsets and collapsed contours.
- Verification: geometry tests, spatial tests and TypeScript passed. Live mining/processing scenes loaded and were screenshot-inspected; zoom in/out and the mining layer drawer were exercised. Browser error capture was empty. No full-deck repeat or production build in this pass.
- Remaining: continuous haul ramps/vehicles, clearer geology inspection, terrain/contour intersection polish and a final full-deck regression pass. No commit made.

### Ore/waste reference integration and user revisions

- Imported a compact, reproducible reference from the supplied ore/waste application's `outputs/block_model.json` using `scripts/import-orewaste-reference.mjs`. `public/generated/orewaste-reference.json` retains 12,262 RF 1 ore-sample blocks, source timestamp and SHA-256; financial results and reserve labels are excluded.
- Source coordinates are interpreted as UTM 37S and converted to WGS84 with a Tanga-region sanity check. This is recorded as an inferred CRS, not independent survey verification. The existing project boundary is unchanged.
- The two RF scenarios are not two spatial pits. RF 1 sample footprints are divided north/south, adapted into separate contained convex presentation envelopes, and depth-limited. This does not reproduce the exported excavation grid or claim full extraction. Convex grouping can bridge internal gaps. Bench styling adopts 10 m benches, 70° batter and 6.36 m berm from the supplied conceptual design metadata.
- Live result: two contained envelopes, no rejected envelope, and a contained 420×270 m plant plus 20 m margin. Camera frames both pits. Enlarged plant includes pitched roofs, end walls and clerestory glazing; all equipment and foundation bounds are tested.
- Resource scene now retains all 155,853 loaded selected blocks at original dimensions and coordinates. Removed systematic sparse sampling and quadratic grade-bucket copying. Wire overlays are omitted above 20,000 blocks; source cells are not enlarged. Updated camera fits the full model extent.
- Metallurgy evidence is a dedicated right-side scrollable column. Higher-specificity CSS fixes its former bottom-strip placement; duplicate generic panels are suppressed. Layers temporarily replace evidence rather than covering it.
- Fixed the mining black-frame regression by bypassing post-processing for this scene and disabling redundant depth-only terrain twins. Screenshot verification confirms both pits are visible.
- Checks passed: TypeScript, geometry tests, source-informed north/south containment/non-overlap and enlarged-pad tests, `git diff --check`. Live zoom changed pit camera distance 4578→4017 m; resource coverage reports 155853/155853. Metallurgy evidence measured at x954/y150, 280×310 px on a 1258×566 viewport; layer switching screenshot-inspected. No uncaught browser errors observed during the targeted checks.
- Not completed in this revision: direct source-grid excavation rendering, continuous haul ramps, interactive geological section slicing, full-deck/multi-device regression or production deployment. Source reference images remain reference material, not yet added to the deck. No commit made.
