# Metallurgy downstream animation storyboard

**Status:** Guided story implemented on the desktop presentation; the individual routes remain available for presenter-led exploration.

## Story purpose

Show how reported laboratory testwork informs a conceptual process story, then make two possible graphite end uses tangible: EV battery anode material and magnesia-carbon refractory. The scene should make the handoff visually memorable while keeping the evidence boundary obvious.

The plant, downstream equipment, battery, vehicle and furnace are illustrative. The Tanga reports reviewed for this presentation do not establish an industrial flowsheet, anode or refractory product specification, customer qualification, or commercial offtake.

## Run of show

### Guided presentation mode

- The **Play full story** action runs the 30-second five-area facility tour, then continues into the 30-second EV-anode route and holds on the cell/EV context.
- Pause freezes both the facility and downstream sequence. Stop returns to the processing plant. The user can switch to the refractory route during the downstream portion; manual route changes end the automatic story.
- The EV-anode path is the default cinematic close because it gives the story a recognizable application. The refractory route remains a peer option, not a lower-status product claim.
- The downstream handoff stays clearly labeled as illustrative and carries the product-qualification boundary throughout.

### 1. Establish the facility

- Hold on the bright oblique connected-plant view for 2–3 seconds.
- A restrained copper route trace travels from receiving through preparation, flotation and dewatering to product handling.
- Keep the whole plant in view; no particles or equipment motion should imply throughput or operating rates.

### 2. Open the product handoff

- Focus the product-handling hall, lift its roof and reveal the existing conceptual storage/loadout equipment.
- Pause the material cue at the end of the plant route.
- Transition to a separate downstream exhibit with a visible label: **Illustrative end-use pathways**. The visual separation makes clear that these products are not part of the Tanga plant design.

### 3. Let the presenter choose an end use

Use two equal, clear route cards: **EV battery anode** and **Steelmaking refractory**. Each route has a short stage rail and one readable camera focus per step. Keep the alternative route available without resetting the whole presentation.

### 4A. EV battery anode route — about 24–30 seconds

1. **Shape:** graphite flakes enter a compact shaping drum; the camera follows the material across the drum.
2. **Purify:** a wash vessel and filter press cycle once, with water/filtration motion kept inside the equipment.
3. **Coat and heat:** move laterally to the coating and heat-treatment line; show a restrained furnace glow, not an unqualified product badge.
4. **Electrode:** track the copper foil beneath the coating head and through the calender rollers; the layered anode becomes the focal object.
5. **Battery and EV context:** move into the cell cutaway, reveal the graphite/copper layers, then animate a small number of Li⁺ markers during charging. End on the EV as context, not as a claim that Tanga material is in a vehicle.

### 4B. Refractory route — about 18–24 seconds

1. **Blend:** orbit the mixer briefly as graphite and magnesia particles combine.
2. **Press:** lower the press ram once to form the conceptual brick.
3. **Brick detail:** move close to the cutaway face to distinguish the graphite-bearing working face from the magnesia-carbon body.
4. **Furnace context:** pull back to the steelmaking furnace lining; use a subtle heat shimmer/glow and keep the lining geometry legible.

### 5. Close and return

- Hold on the selected product or application for 2 seconds with the qualification boundary still visible.
- Offer **Replay route** and **Return to plant**. Returning restores the same plant overview and selected stage.
- Pause freezes the camera, machinery, particles and highlights together. Reduced-motion mode presents the final pose of each step without camera travel.

## Visual and interaction direction

- Use the existing bright exhibit palette, fixed site lighting and matte process materials. Keep bright copper only for the active route and evidence callouts.
- Use short, deliberate camera moves between authored stage targets. Avoid continuous orbit, multiple simultaneous moving elements, decorative sparks, and unsupported operating speeds.
- Keep the exhibit and inspector on the shared deck panel system. Stage title, one-line explanation and step rail remain in fixed positions; allow text to wrap without hiding the 3D focal object.
- Retain stage-by-stage selection so a presenter can skip the autoplay and explain each process at their own pace.
- Keep laboratory results accessible as a separate evidence view. Do not animate an observed recovery or grade value as though it were a measured plant performance.

## Acceptance checks before release

- Every stage opens directly, frames the intended object, and returns to the same plant view.
- The selected route is visually distinct; no anode or refractory geometry appears inside the Tanga facility model.
- Pause, replay, step selection, route switching, keyboard access and reduced-motion behavior work at 1366×768 and 1707×842.
- Captions and persistent qualification copy are readable and do not overlap the scene, inspector or presentation pager.
- No motion encodes tonnes per hour, recovery, grade, qualification, offtake or an approved engineering layout.

## Verification record

- Local desktop: the connected story paused at the second downstream stage for seven seconds, resumed through the Cell + EV final pose, and had no alerts or document overflow at 1366×768. At 1707×842 the overview controls fit without colliding with the title.
- Reduced motion: the full autoplay control is disabled; the user can still select the refractory route and jump to its furnace-lining final pose.
- Public Cloudflare Worker version `4a98bbb1-7ebc-4290-9b4a-3b4765bda17b`: the full 60-second story reached the Cell + EV final pose at 1366×768 with the qualification boundary visible, no alerts, and no document overflow.
- Standard Next and Cloudflare/OpenNext production builds, TypeScript, and `scripts/verify-tanga-plant-process.ts` passed. Visual captures are recorded in `TANGA_NEXT_PHASE_PLAN_2026-10-23.md`.
