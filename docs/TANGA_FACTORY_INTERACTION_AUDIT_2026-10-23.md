# Connected factory interaction audit

23 October 2026 · desktop local production build · branch `codex/tanga-investor-experience`.

## Reproduced defects and repairs

- Opening Lab results and returning removed the scene host without rebuilding its renderer. Before the repair, the factory panel had zero canvases. The scene now stays mounted behind the evidence board and sleeps while hidden. Returning retains the selected section, roof state, camera and one renderer.
- Whole plant did not issue a camera command when overview was already selected. Its fit also used the current lifted roofs, giving different reset positions. Reset now runs explicitly and fits the closed-campus bounds recorded before animation. Orbit damping is cleared before authored camera travel.
- Paused roof transitions could stop drawing before completing. Roof movement now independently requests frames, settles to its target and stops. Roof materials change their transparency shader state only at the opaque/translucent boundary rather than invalidating the shader every frame.
- Reduced motion disabled process motion and camera flight but still animated roofs. Roofs now snap to the same static cutaway, and the control reads Motion reduced. Changes to the device preference are observed and the listener is removed during cleanup.
- The low detail camera hid the mill behind retained walls. Inspection cameras now look down through the opened roof. The mill spins on its mounted cylinder axis only when its area is selected and open.
- A legacy button background made the laboratory evidence card dark with low contrast. The factory card now uses its intended pale surface. The inspector scrolls so source/limitation text stays reachable at short desktop heights.

## Browser evidence

Chromium, local Next.js production server on port 3012. Viewports: 1366×768 and 1707×842. These are interaction checks, not a frame-rate benchmark.

| Check | Observed result |
|---|---|
| Five area selections, process paused | Feed, milling, flotation, dewatering and product each reached open roof and settled camera/roof state; screenshots recorded at both sizes |
| Evidence return in each of five sections at 1366×768 | One visible canvas returned; process clock and camera were preserved |
| Paused settled section | Process time and renderer frame count were unchanged across a 1-second observation |
| Whole plant after an open roof | Returned to the same overview position within floating-point precision |
| Orbit then Whole plant while overview already active | Orbit changed position; reset maximum coordinate difference from the authored baseline was 0 at both viewport sizes |
| Reduced motion and keyboard selection at 1707×842 | Enter selected Flotation; static cutaway and camera settled within 200 ms; process time and render count held over the next 500 ms; Motion reduced was disabled and labelled |
| Manual orbit during camera travel | Camera travel stopped; orbit controlled the view |
| Playing process while evidence open | Hidden process time held at 1.198 seconds over 600 ms; returning resumed it and retained one canvas |
| Close selected roof | Roof returned to its closed target and reported closed state |
| Browser console | No JavaScript errors in the final run; graphics-buffer performance warnings remain |
| Production build | `npm run build` passed, including TypeScript and service-worker generation |

Screenshots: `.playwright-mcp/plant-controls-overview-{1366,1707}.png`, `.playwright-mcp/plant-controls-{feed,milling,flotation,dewatering,product}-{1366,1707}.png`, and `.playwright-mcp/plant-controls-reduced-flotation-1707.png`. The final reset-only correction changes the overview fit to fixed closed-campus bounds; cutaway compositions are unchanged.

## Still open

Source-to-operation reconciliation, public-safe flowsheet evidence, realistic campus/exterior acceptance, richer stage-specific machinery and material-transfer animation, mine-site integration, performance budgets and hosted deployment verification remain in the main checklist. This repair does not establish plant design, capacity or plant-scale performance. Phone/tablet redesign remains deferred.
