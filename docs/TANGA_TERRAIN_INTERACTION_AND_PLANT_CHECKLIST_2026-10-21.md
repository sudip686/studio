# Tanga terrain, interaction, annotations and processing plant

## Repair checklist

- [x] Identify the deployed terrain fault: survey binaries were 132-byte Git LFS pointers; the fallback regional grid had dimensions from an earlier release.
- [x] Ship the matching survey height, validity and slope grids as ordinary Git binaries, with a bounded 512 × 701 regional context grid.
- [x] Validate raster dimensions, coverage, ranges and LFS pointer signatures in both deployment build paths.
- [x] Use one EPSG:32737 metre coordinate frame for terrain, geology, blocks and drill traces, with correct raster pixel centres.
- [x] Preserve measured collar and model elevations. Remove artificial terrain/collar lifts and geometry reveal scaling.
- [x] Bound the terrain display mesh at 403,968 triangles, down from approximately 2.87 million. The source survey raster and displayed mesh have different sampling intervals.
- [x] Remove duplicate terrain rebuilds, defer imagery/slope downloads, suppress hidden deck layers, debounce heavy hover picking and remove the bloom passes.
- [x] Enable unrestricted orbit beneath the ground, an explicit Below ground button, automatic ground transparency, and Reset view.
- [x] Preserve the current camera when switching elevation and derived slope.
- [x] Anchor assay labels to the named hole and depth interval, block labels to actual source cells, and geology labels to the transformed source object.
- [x] Project map anchors through the live MapLibre globe camera; use actual boundary vertices, active route geometry and named power-node coordinates.
- [x] Hide anchors outside the screen or behind the camera. Keep pointer endpoints at their projected positions and reserve live information-panel rectangles during label placement.
- [x] Correct the local scale calculation at close camera distances.
- [x] Restore the ten-project peer comparison and animate Tanga into position five; retain a separate Work completed chapter.
- [x] Qualify the ranking as the published 2023 project comparison set with an updated Epanko entry, rather than a current worldwide deposit census.
- [x] Add six processing areas: ROM/crushing, milling/classification, flotation, thickening/reclaim water, filtration/drying and product handling.
- [x] Add crusher framing, a grizzly, mill drives/bearings, cyclones, launders, walkways, guardrails, pumps, thickener details, process pipes, filter-press rails, product silos, reagent tanks and yard fittings.
- [x] Batch 601 static plant parts into 26 material/process meshes, retaining separately addressable roofs.
- [x] Add whole-plant and six equipment camera views, roof cutaways and object-anchored process labels.
- [x] Retain the existing contained site-placement checks, conceptual pit footprints and explicit engineering limitations.
- [x] Correct the phone body overflow and keep navigation above the peer chart.

## Browser checks

- [x] Walk through all 12 chapters: project, Tanzania, peers, work completed, terrain, drilling, geology, resource, mine concept, testwork, logistics and next decisions.
- [x] Confirm the peer chart starts with 10 projects and introduces Tanga as row 5 of 11; replay resets the sequence.
- [x] Confirm the registered terrain loads with survey coverage available.
- [x] Confirm drilling reports 100 holes / 5,207 intervals, and geology reports 100 holes / 2,382 intervals with seven interpreted units.
- [x] Confirm the resource view renders all 155,853 selected source cells.
- [x] Confirm wheel zoom changes camera distance and pointer positions track zoom without edge clamping.
- [x] Confirm Below ground places the subsurface camera at y = −980 m in the local frame, beneath its target at −250 m, and Reset view returns above ground.
- [x] Confirm elevation → slope leaves both camera position and target unchanged after the introductory flight settles.
- [x] Inspect the plant campus and a thickener close-up. The selected thickener annotation follows its actual object.
- [x] Review desktop and 1366 × 768 laptop compositions, and the peer layout at 390 × 844.

Runtime timings vary by GPU and view. Sampled warm frames on the available Intel integrated graphics ranged from roughly 25–58 ms for the drilling/geology/resource views; this is not a 60 fps guarantee or a cross-device performance certification.

## Evidence and limitations

- The source DTM is the August 2025 survey in EPSG:32737, sampled to an approximately 7.4 m raster and an approximately 20 m display mesh. Outer terrain uses the regional DEM. Sampling interval is not an accuracy statement.
- All 100 source collars sampled inside survey coverage. Recorded collar-to-DTM differences ranged from −2.99 to +7.57 m. The vertical reference remains unverified; source traces have not been snapped to the surface.
- The plant is an illustrative mechanical layout, not an engineered, sized, permitted or costed facility. Site containment does not establish geotechnical suitability, earthworks quantities, process capacity, water balance or access design.
- No screened truck route was admitted for the current terrain/site configuration. The app withholds the haul animation rather than drawing an unverified connection.
- Peer source: [Costmine / Mining Intelligence, 7 November 2023](https://www.costmine.com/2023/11/07/ranked-worlds-top-10-graphite-projects/). Epanko update: [EcoGraf 2024 Annual Report](https://www.ecograf.com.au/wp-content/uploads/2024/09/EcoGraf-Annual-Report-2024.pdf). Tanga: supplied AMC report, final 19 December 2025, 148 Mt Indicated at 4.94% TGC; approximately 7.31 Mt contained graphite. Inferred material is excluded from this comparison.

## Release checks

- [x] `npm run typecheck` passed after the final implementation changes.
- [x] Terrain raster integrity validation passed for both build paths.
- [x] Optimised Next.js compilation and page generation passed through `npm run cf:build`.
- [x] OpenNext produced `.open-next/worker.js`; static asset size checks passed.
- [x] Final diff passed `git diff --check`.

Hosted preview results are recorded in the pull request. Cloudflare compatibility is checked through the OpenNext build; a Cloudflare Worker has not been published by this repair.
