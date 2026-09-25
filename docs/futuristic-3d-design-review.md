# Tanga: cinematic scientific viewer

Research and implementation review — 19 September 2026. Local changes only; not a deployment certificate.

## Reference findings

- [GeoLibre live workspace](https://web.geolibre.app/) was opened and visually inspected. Its central map, side-docked layers, collapsed secondary panels and small navigation tools provide a useful separation of content and controls. No project data was uploaded.
- [GeoLibre story maps](https://geolibre.app/user-guide/storymaps/) documents chapter-specific camera moves, layer fades and optional rotation. Adapt the chapter choreography, not the entire GIS authoring interface.
- [VRIFY Present](https://help.vrify.com/en/articles/10452792-getting-started-with-vrify-present) documents interactive layers, hotspots and labels anchored in aligned project data. This review consulted the product guide; it does not claim a fresh inspection of every slide in deck 23611.
- [Seequent Visible Geology activity guide](https://files.seequent.com/PDFs/EarthScienceWeekVisibleGeology2024Activity-Designed.pdf) connects 3D models, sections and cores. Its teaching pattern is useful; synthetic educational geology is not evidence for Tanga.

## Art direction — recommendation

Retain charcoal, copper and teal. Use warm key lighting, cool fill and crisp silhouettes. Let the geology occupy the central visual field. Reveal one relationship at a time, then hold still for explanation. Reserve cyan for interaction and copper for authored emphasis; retain geological categorical colours. Avoid bloom, floating particles, animated scanlines and additional WebGL canvases.

Camera grammar: establish context → move to evidence → hold → restore context. User orbit must interrupt an authored move. Every inspection needs a return action. Prefer 1–2 second transitions and several seconds of stillness; a 15–20 minute presentation is not a continuous camera flight.

## Implemented in this local pass

| Scene | Added interaction | Evidence safeguard |
|---|---|---|
| Geology | Separated-unit reveal and reassembly | Explicitly displaced illustration; sections restore registered positions |
| Geology | Selected-unit spotlight | Retains unit geometry and classification |
| Drilling | Follow a selected hole with depth and interval readout | Recorded intervals only; marker hides in gaps |
| Resource | Replay spatial block assembly and restore | Display counts only; no changed grades or block coordinates |
| Mining | Animated pit cutaway | Target blocks stay in their true positions |
| Mining | Stepped bench reveal | Concept illustration, not excavation schedule or reserve |
| Metallurgy | Rotating layered graphite inspection | Stylised geometry, not microscopy |
| Metallurgy | Vibrating sieve-stack inspection | No inferred measured size distribution |
| Metallurgy | Two selectable sample-group displays | Equal illustrative fill, no inferred yield; reported values retained |
| Conclusion | Three-scene evidence replay | Visits actual geology, drilling and metallurgy scenes |

Metallurgy inspection models now have restrained teal-ring display plinths. These are decorative, not measurement scales. Existing pause controls and reduced-motion handling are retained. Animation controls live in existing panels, not new floating windows.

## Performance changes

- Reuse one projection converter per geology model and avoid temporary vector allocation per vertex. A 20,000-point exact-equality regression test checks that the transformed coordinates are unchanged.
- Local microbenchmark showed roughly 8× faster projection math in earlier runs. This is **not** an 8× end-to-end loading claim; downloads, decoding and GPU upload remain separate costs.
- Mining camera setup and scene readiness no longer await optional truck-route screening. Truck routes prepare separately with loading/failure feedback and cancellation guards.
- Skip heavy animation/render work when the document is hidden. Inspection illustrations share the existing renderer and add no external asset downloads or post-processing passes.

## Next design work, not yet implemented

1. Opening/location: a short globe-to-site move ending on a stationary site view; retain geographic context through a small orientation cue.
2. Footprint/surface: one controlled terrain-opacity reveal, keeping the existing boundary unchanged. Do not imply legal verification of that boundary.
3. Geology/section: a linked section-plane sweep and corresponding 2D trace; synchronize the section position rather than playing an unrelated animation.
4. Drilling/resource: select a recorded interval and highlight nearby model cells with a clear distinction between observation and interpretation. Do not imply direct one-hole validation of every nearby block.
5. Mining: north/south camera bookmarks and an optional target-to-pit inspection sequence. Keep plant scale and routes concept-labelled.
6. Metallurgy: select a sieve fraction to reveal its reported result, only where an actual fraction value exists; never infer missing fractions from decorative particles.
7. Logistics: animate route progress only along a sourced route and label schematic alternatives.
8. All scenes: expand automated collision checks at 1366×768, 1920×1080 and narrow layouts; test layers, legends, tooltips and evidence panels in combination.

## Verification and remaining limits

Type checking and production build passed after the main animation and non-blocking haul-route changes. Targeted animation tests cover count restoration, clipping restoration, unchanged vertices, finite inspection transforms and projection equivalence. The final decorative plinth adjustment is additionally type/test checked and browser inspected.

Local browser checks exercised geology separation/section reset, drilling pause, resource assembly, mining cutaway, metallurgy inspection and closing replay. Screenshots were reviewed for several key states at a compact laptop viewport. This is not an exhaustive every-slide/every-resolution certification. Full browser reduced-motion coverage, cold-network profiling and production/R2 checks remain separate acceptance tasks.

Do not commit or deploy as part of this design review. Preserve existing data and boundaries. No new mineral resource, reserve, recovery or economic claims are introduced by the animations.

## Visual retry

The second pass replaces fixed inspection camera positions with per-mode, aspect-aware framing, removes the bench-stage row during inspection, adds slow illustrative separation of graphite sheets, and improves graphite contrast. A new regression samples actual animated vertices at five times and four aspect ratios for all three inspection modes to check clipping. Type checking and these tests passed. The dev server had stopped; it was restarted before fresh browser checks at 1366×768. Pause held inspection time at 17.62 seconds across separate observations. Clicked tooltips now dismiss rather than lingering over results, and paused/reduced-motion inspections start in a settled pose. These retry changes have not been deployed or separately production-built.
