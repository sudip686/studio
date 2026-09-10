# Presentation implementation and verification — 10 September 2026

No commits. Existing project boundary and source block dimensions/coordinates preserved.

## Implemented in this pass

- Geology: north–south moving clipping plane applied to registered scene coordinates, GRSC host isolation, keyboard-operable position slider, whole-model restoration. The plane follows stage rotation. Cut surfaces remain open, not capped or newly interpreted.
- Plant: individually tagged roof panels for cutaway; crushing/milling, flotation and dewatering/product highlight selections; automatic plant-detail camera. Existing 960 × 672 m campus remains unchanged in footprint.
- Foundation: sampled 5 m perimeter retaining skirt replaces the uniform-depth box. This is a presentation platform, not a cut/fill or retaining-wall design.
- Metallurgy: sample/group selector separates available carbon, recovery and +150 µm results. Missing individual results are not inferred from group summaries. TDM004 explicitly reports 75.8% recovery. Laboratory verification remains pending.
- Layout: metallurgy has no geological layer, camera-reset or annotation toolbar controls. Notes and competing evidence panels are mutually exclusive. Compact geology controls clear the compass/scale; animated flakes cannot overpaint the title; notes timer clears its close button.
- Narrative: opening and closing now follow evidence → interpretation → concept → validation. Autoplay waits for 3D readiness; native inputs, selectors, buttons and disclosures own keyboard input while focused.
- Route search: deterministic 6,000-node bound replaces the 180 ms deadline. Cached terrain/containment checks, yielding batches and navigation cancellation keep route work bounded and interruptible.

## Verification performed

Local development server: http://localhost:9004. Browser screenshots inspected for all eleven chapters at 1366 × 768 and 1258 × 566. Earlier screenshots captured some camera/asset transitions; the reusable script now explicitly checks chapter mode, 3D readiness and camera settlement.

The DOM audit checks selected major panels for overlap and viewport overflow. No remaining collisions were detected in the checked states. This is not exhaustive testing of every possible panel/shot combination or a phone-layout guarantee.

Targeted interactions verified:

- Geology cutaway on/off and host isolation; keyboard slider 50 → 51, matching the live clipping attribute.
- Actual canvas wheel zoom: camera distance 8,333 → 6,759 → 8,333 m. Authored reset remains available. Toolbar zoom was not separately certified: early off-screen locator attempts did not change the camera.
- Plant roofs hidden, flotation selected (`data-plant-cutaway=true`, `data-plant-process=separate`), detail camera visibly frames equipment. Roof restoration remains available.
- Metallurgy TDM004 selection and pause control; compact notes replace the report without covering the illustration.
- Resource Layers on right and grade legend on left remain separate at compact size.
- Closing evidence/decision cards remain readable and scroll within the safe panel area.

Automated checks passed: `npx tsc --noEmit`, `node scripts/test-site-planning.mjs`, `tsx scripts/test-mine-scene.ts`, `git diff --check`. Geometry tests include roof tags, complete campus bounds, contour coverage, slope rejection, invalid terrain and route cancellation. Clean browser `errors` output was empty. A transient React dependency-array warning occurred during hot reload and was absent after a fresh load.

Reusable checks: `scripts/verify-presentation.ps1` and `scripts/audit-presentation-layout.js`. Start the local server and an agent-browser session named `final-pass` before running the script. Screenshots are written to the browser's temporary screenshot directory.

## Still incomplete — do not present as finished

1. **Integrated internal pit ramps, graded access and truck haulage.** Neither pit produced an admitted rim-to-apron route in the current candidate search (18 m corridor, 5 m samples, ≤20% terrain grade, unchanged boundary and pit/plant avoidance). One final attempted north search reached 4 nodes; the south search reached 1,693. This is a failed bounded candidate search, not proof that no engineering solution exists. Trucks remain withheld. No ramp geometry was fabricated or claimed as complete.
2. Foundation geometry is terrain-following at its perimeter, but a high retaining platform remains visually prominent. Graded plant-pad earthworks and practical access require a separate integrated layout iteration.
3. Panel coordination is improved within the existing architecture; accumulated legacy CSS has not been replaced by a fully unified component system. Full shot-by-shot combinations, reduced-motion emulation, touch-device testing, performance/memory benchmarking and production build verification are not completed.
4. Original laboratory/source-report verification and complete sieve/impurity data are not available. No new reserve, economic, throughput or product-qualification claims were added.

The external UI-review MCP request was denied because it would export project details. Review continued locally using project guidance, slides/UI-styling skills, source inspection and browser screenshots; no external review result is claimed.
