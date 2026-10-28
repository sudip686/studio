# Metallurgy animation design brief — 28 October 2026

## Purpose

Make Metallurgy feel like a polished investor presentation with a memorable product finale. The current experience already has a five-area conceptual plant tour, an EV-anode route (shaping, purification, coating/heat, electrode coating, cell cutaway), and a refractory route (blend, press, MgO–C brick, furnace lining). Keep those evidence boundaries and controls. The next design pass should improve composition, transition and product-scale readability instead of adding motion everywhere.

## Visual audit

The latest desktop hero captures show the end-use objects occupying a small part of a broad, dark canvas. The EV car and battery read as small props; the refractory finale reads as a plain block rather than a furnace lining. The inspector and route controls are aligned with the deck, but the product stage needs a stronger focal composition and clearer material structure.

## Proposed story

### 1. Connected plant: “Where the testwork fits”

- Start on the existing full-campus overview in neutral daylight.
- A restrained copper marker moves along the existing process route: feed → milling → flotation → dewatering → product handling.
- At each stop, the selected roof retracts, the camera makes one short ease-in, and only the relevant machine motion runs. Use the current equipment-specific motion; keep labels to one title and one sentence.
- At flotation, pause briefly on the reported laboratory result card. Keep the laboratory measurement visually separate from the conceptual plant, with its source and the explicit statement that testwork does not establish plant performance.
- End by following the concentrate cue to the product-handling bay, then transition to a separate, clearly labeled downstream-use scene.

### 2. Signature bridge: “Possible applications”

- A single dark graphite flake travels from the product bay across a narrow copper-lit route line.
- At a clean split point, the route branches to two large selectors: **EV battery anode** and **Steelmaking refractory**.
- The factory fades into a low-contrast silhouette while the chosen product scene grows into the canvas. Do not visually imply that either downstream product is already produced at Tanga.
- Add a persistent small label: “Illustrative downstream pathway · separate from reported Tanga testwork.”

### 3. EV-anode hero: “From graphite layer to cell”

1. **Shape** — close camera on graphite particles entering a rotating spheronising drum; particles resolve into a compact rounded-particle visual. Keep this explanatory, not a claimed Tanga operation.
2. **Purify** — a clean filter/vessel cutaway shows material passing through; use a restrained teal flow pulse and visible filter plates.
3. **Coat & heat** — show a thin coating moving around particles, then a warm furnace-window glow. Avoid heat numbers, chemistry or process claims absent from sources.
4. **Electrode line** — a copper foil advances under a coating head and through two counter-rotating rollers; reveal a uniform dark graphite layer on the foil.
5. **Product reveal** — camera pushes into a large, exploded battery-cell cross-section. Separate graphite anode, copper collector, separator and cathode as readable layers. Animate a few lithium-ion markers across the separator during charge, with a clear direction cue.
6. **EV context** — finish on the large cell as the hero and a smaller, refined EV silhouette with the battery pack highlighted. The vehicle is context, not the dominant object. Hold the final composition for a few seconds with the label “Illustrative application”.

### 4. Refractory hero: “From batch to furnace lining”

1. **Blend** — visible magnesia grains and graphite flakes tumble together in a cutaway mixer.
2. **Press** — the press ram cycles once slowly; a formed brick emerges with a visibly dark graphite-bearing face.
3. **Material close-up** — camera orbits the brick and reveals the pale magnesia matrix with a dark graphite-rich working face as a clean cutaway, without inventing a grade or specification.
4. **Lining reveal** — pull back through a furnace shell cutaway; the brick seats into a curved lining segment. A restrained orange heat glow illuminates the interior and graphite electrodes establish the steelmaking context.
5. **Final hold** — make the lined furnace the hero; retain a small standalone brick inset for material recognition. Label “Illustrative refractory application”.

## Art direction

- Replace the long empty presentation plinth in the product finale with a tighter stage, localized ground shadows and controlled negative space.
- Use a brighter neutral key light on the hero product, soft cool fill on steel, copper as the route accent, graphite charcoal for carbon, and a limited warm furnace glow. Keep the current stable material palette so camera movement does not shift colors.
- Use close three-quarter views for machinery, then a near-orthographic cutaway for cell layers and refractory lining. Ease between cameras; no abrupt spins or constant idle orbit.
- Scale the selected product to occupy roughly 45–60% of the 3D canvas. Keep the inspector narrow and stable so it does not cover the object.
- Prefer a small number of deliberate motions: marker travel, one process cycle, one reveal, then a quiet held hero frame.

## Controls and pacing

- Keep the existing stage selector, route selector, Play/Pause, Replay, and Return to plant controls.
- Add a compact “Skip to product” action to the plant tour. Keep manual stage selection available at every point.
- Use an authored 25–35 second full story, with a shorter 12–18 second product highlight for executive presentations.
- On reduced-motion settings, use immediate camera cuts and static final poses; preserve all stages and captions.
- Let user orbit/zoom take over immediately and stop automatic camera movement; Resume story is explicit.

## Evidence and language guardrails

- Reported Tanga testwork supports laboratory crushing/splitting, milling/screening, regrinding, flotation, filtration, drying and sizing as documented in `TANGA_PLANT_PROCESS_BASIS_2026-10-23.md`.
- Treat the plant, downstream conversion routes, product scenes and any EV/refractory destination as illustrative concepts. Do not say Tanga makes battery anode material, qualifies for EV supply, or produces refractory brick.
- Keep reported concentrate carbon, recovery and flake-size values in the evidence panel with sample/source identity and the current verification caveats; do not animate them as though they are commercial product specifications.

## Acceptance checklist for implementation

- [ ] Product finale uses most of the available 3D canvas at 1366×768 and 1707×842; no large empty stage dominates.
- [ ] EV cell shows distinct anode, copper collector, separator and cathode layers; ion direction is legible and labeled as illustrative.
- [ ] EV context vehicle remains secondary to the cell/anode product.
- [ ] Refractory finale visibly shows the MgO–C lining seated against the furnace interior, plus a separate brick detail.
- [ ] Plant-to-product transition reads as an illustrative downstream route, not an operating Tanga flow sheet.
- [ ] Play, pause, replay, manual stage selection, return-to-plant and reduced-motion states remain usable.
- [ ] Camera transitions settle cleanly; manual orbit stops automatic touring; no persistent idle motion distracts from the held frame.
- [ ] Shared typography, inspector panels, captions, color meaning, focus states and panel geometry match the rest of the presentation.
- [ ] Desktop screenshots reviewed at 1366×768 and 1707×842; no panel overlap, clipping, browser errors or layout overflow.
- [ ] Typecheck, production build and current plant-process verifier pass; performance is sampled during the animated hero because the desktop frame-budget gate is still open.

## Design decision

Keep both product destinations, but lead with the EV battery-cell cutaway as the signature finale because it communicates anode use quickly. Keep the refractory route one click away as an equally composed alternative. The implementation should first fix product-scale framing and the final cutaway forms; more particle counts or ambient animation alone will not solve the current weak focal point.
