# Plant process basis and motion verification

23 October 2026 · connected factory desktop pass.

## Source-to-section mapping

Reviewed source: `6798- Sakariya Tanzanian Graphite - Final Report - Rev0/auto/6798- Sakariya Tanzanian Graphite - Final Report - Rev0.md` in the supplied MinerU report tree. The original PDF is already available in the app as `public/6798- Sakariya Tanzanian Graphite - Final Report - Rev0 (1).pdf` (4,442,678 bytes). The operation inspector links to that PDF and names the relevant procedure. Laboratory operations establish the explanatory basis; they do not establish industrial equipment selection, capacity, plant layout or performance.

| Factory area | Report evidence | What the 3D representation adds |
|---|---|---|
| Feed & crushing | IMO Appendix D, A.1: stage crushing and splitting laboratory samples | Receiving hopper, conveyor and industrial crushers are illustrative |
| Milling & classification | IMO Appendix D, A.2: rod milling and screening; B.3: concentrate regrinding | Industrial mill, drive, bearings and cyclone cluster illustrate preparation; the cyclone arrangement is not specified by these laboratory procedures |
| Flotation | IMO Appendix D, B.1–B.2: agitation, air addition, froth collection; Table 2: final cleaner results | Cell banks, launders and transfer route are a conceptual industrial translation. Laboratory values appear only in this area's selected-composite card, with all eight results available separately |
| Concentrate dewatering | IMO Appendix D, B.9: concentrate filtration, drying and sizing | Filter press and rotary dryer are industrial concepts. Laboratory drying conditions do not prescribe the shown dryer or any plant operating condition |
| Product handling | No reviewed laboratory procedure specifies industrial storage/loadout | Covered warehouse, pallets, bags and transfer are explicitly conceptual; no product specification or capacity is assigned |

The confidential PaulSam study has no approved equipment schedule or general arrangement suitable for reconstructing an engineered plant. This pass adds no confidential details from it. The public-facing plant remains an illustrative arrangement; public release permissions and engineering evidence remain gates in the main plan. Water and tailings engineering is not inferred from laboratory filtration.

## Geometry and animation

- Replaced four generic spheres travelling through the entire campus with separate, instanced feed, flotation and product-transfer cues. Their paths follow modelled conveyors, launders and connecting racks. Travel uses segment lengths so a junction does not arbitrarily change the displayed speed.
- Extended the modelled dewatering transfer into the covered store. Added building portals at process connections and palletised bag forms inside storage. All additions use local model coordinates and the existing campus scale; no site registration or source coordinates changed.
- Added mill and dryer shell ribs, retained their mounted rotation axes and kept bearings/supports fixed. Only the selected open equipment section advances its activity clock. The overview shows the feed and product connections; hidden evidence views, Pause and reduced motion do not advance equipment.
- Added flotation paddle rotation, surface froth and concentrate-direction cues. These are explanatory display motion with no hydraulic, recovery, residence-time, production or mass-balance meaning. Filter plates remain stationary.
- Machinery and particle detail share geometry/materials. Particle transforms have declared bounds to avoid angle-dependent culling; paused sections reuse their static activity state. The detailed motion helper is mounted only in metallurgy; the mine site reuses the common exterior, portals, shell detail and storage forms.
- Preserved corrugated roof material hooks when cloning roofs for independent opacity. Simplified the selected-operation explanation and moved procedure locators into a source disclosure. Flotation retains its selected laboratory composite; other areas link to the eight-composite evidence board without repeating the same grade as if it described their operation.

## Verification

- `node_modules/.bin/tsx.cmd scripts/verify-tanga-plant-process.ts` passed: correct mounted rotation axes, selected-area isolation, paused clocks, finite instance matrices, instance bounds and transfer destination inside covered storage.
- `npm run typecheck` and `npm run build` passed. The production build includes TypeScript, route generation and service-worker generation.
- Chromium at 1366×768: all five selected areas reached settled camera/roof state. In each, only the selected activity clock advanced; Pause held every clock over a 350 ms observation. One canvas remained and the page had no horizontal overflow.
- Chromium at 1707×842: overview and all five paused cutaways reached ready and were captured. Source disclosure identified product handling as concept only. Returning from Lab results preserved one live canvas.
- The shared mine-planning scene reached ready with one canvas. Its Inspect the processing plant view loaded the updated common model with its anchored annotations and conceptual-design qualification.
- No JavaScript errors in the checked production-browser run. Graphics-buffer warnings remain; these checks do not prove the frame-time or cold-load performance targets.

Screenshots: `.playwright-mcp/plant-process-overview-{1366,1707}.png`, `.playwright-mcp/plant-process-{feed,milling,flotation,dewatering,product}-{1366,1707}.png` and `.playwright-mcp/plant-process-shared-mine-1707.png`. Final screenshots refresh the compact evidence-card treatment after the geometry/motion matrix.

## Remaining acceptance

Campus realism and whole-facility visual acceptance, credible overall site scale/terrain contact, independent public-release checks, advanced performance measurements and hosted deployment verification remain open. The model is not an approved plant design. Phone/tablet work remains deferred.
