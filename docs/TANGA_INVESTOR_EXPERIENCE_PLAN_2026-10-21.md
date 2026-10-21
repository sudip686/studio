# Tanga investor experience: polish plan

## Reference patterns

- [VRIFY Present](https://help.vrify.com/en/articles/8339480-what-is-a-vrify-3d-presentation) combines 3D models with 360-degree imagery and corporate content, and is designed for live investor presentations and shareable web experiences. For Tanga, keep the authored story as the default and make detailed exploration optional.
- [Seequent Central](https://my.seequent.com/releases/seequent-central/central) pairs shared 3D scenes with measurement, slicing, and view orientation. Its compass reports azimuth and dip. For Tanga, retain a compact north/bearing cue, a scale that follows zoom, and a depth cue on subsurface views.
- [DHResources viewer examples](https://www.dhresources.com.au/features) emphasize a guided tour, useful camera views, drillhole inspection, and a coastline-to-mine-to-port journey. For Tanga, keep one authored camera composition per chapter, with reset and optional inspection controls.
- [AiRE viewer](https://www.geoexplorationllc.com/viewer/) exposes orbit, zoom, camera presets, and clip planes as explicit controls. For Tanga, use those controls in Explore mode; avoid adding control clutter to the investor presentation view.

## Recommended changes

### 1. Camera and lighting across the 11 chapters

The workbench already has authored camera states in `TangaDeckWorkbench.tsx` and mode-specific Three.js lighting in `TangaThreeGeologyScene.tsx`. Improve these as one reviewed sequence rather than applying a single camera or light setting everywhere:

- Start at a clean regional globe, then step down through Tanzania, the project footprint, terrain, drilling, interpreted geology, resource, mine concept, metallurgy, access, and the closing comparison.
- Keep the project in a consistent screen quadrant as the camera moves between adjacent scales. Use a distinct oblique angle for terrain, drillhole context, and the conceptual mine; use near-top-down views only when a plan view explains the data better.
- Frame the full subject before adding labels. Use gentle 2–4 second moves followed by steady holds. Do not continuously rotate while a presenter or investor reads.
- Keep the existing warm key, cool fill, soft rim and ACES filmic lighting as the baseline for 3D models. Tune each scene's exposure against its own geology colours and satellite surface. Avoid a global saturation boost on colour-coded assay or resource layers.
- Verify the same authored views at desktop, laptop, and narrow screen sizes. Respect reduced-motion and let user orbit/zoom input take control immediately.

### 2. Make spatial instruments useful

- Keep the north arrow and azimuth readable in Explore mode; add the current view angle as a small “view pitch” readout where it fits. Do not label camera pitch as geological dip.
- Keep the scale bar tied to the actual map zoom and show a vertical depth bracket on subsurface scenes. Keep those instruments out of the hero/cover and out of the ranking panel's space.
- Add a short camera-preset menu only where it solves a specific task: site overview, north/south drill pattern, full resource model, and plant/process detail. Every preset should have a reset to the authored chapter view.
- Use section/clipping controls as optional technical exploration tools, not automatic investor-story effects.

### 3. Sharpen the narrative without adding filler

The current 11 chapters already cover regional setting, project footprint, terrain and access, drilling, geology, resource work, conceptual mine planning, metallurgy, and peer context. Avoid expanding the deck until each addition contributes evidence the current chapters cannot show. Strengthen the close around one source-grounded sequence:

**Work completed → evidence and interpretation → validation still required → next development decision.**

Use source-linked statements. Keep the peer ranking scoped to its selected projects and reported M&I contained graphite basis. Keep metallurgical values qualified until checked against original laboratory reports. Do not present a concept layout, mapped connection, modelled grade, or peer comparison as an operating or economic advantage.

### 4. Share and presentation readiness

- Keep the cover understandable without voice control, and make the first chapter open cleanly from a shared URL.
- Preserve full-screen controls, keyboard navigation, captions/speaker notes, touch orbit/zoom, reset-to-view, and a reduced-motion path.
- Keep the Vercel app and Cloudflare R2 responsibilities explicit: Vercel serves the Next.js experience; Cloudflare R2 serves large media/model assets through the configured asset base URL. Configure R2 CORS for the actual application origins.
- Before publishing a branch preview, check the cover, every chapter transition, image/model loading, narrow-screen layout, and the peer comparison caveats.

## This delivery pass

- Refined the opening cover and peer-comparison panel, reduced rank badges on the globe, and made the ranking list scroll cue visible.
- Clarified selected-peer-set language and removed promotional comparative language that could imply a demonstrated cost, product, or global ranking advantage.
- Kept the existing camera and lighting architecture; production build and TypeScript compilation passed before the final copy edit.

## Open work

- Rehearse the 11 authored camera views in order at an investor-screen aspect ratio and adjust only the views where the primary evidence is clipped, hidden, or visually flattened.
- Add an azimuth and view-pitch label to the Explore-mode compass if the 3D control remains legible on tablet and laptop.
- Verify peer-source effective dates and the Tanga testwork against the original source reports before using the values in a board or investor meeting.
- Regenerate a final cover/open-graph preview image from the deployed asset set and inspect a Vercel branch preview after push.
