# Tanga phase 3 implementation checklist

Branch: `codex/tanga-investor-experience`  
Acceptance storyboard: [TANGA_PHASE_3_STORYBOARD_AND_SOURCE_AUDIT_2026-10-21.md](./TANGA_PHASE_3_STORYBOARD_AND_SOURCE_AUDIT_2026-10-21.md)

## Cross-deck standards

- [x] Each of the 11 chapters has a distinct question and presentation purpose.
- [x] The story has a consistent evidence drawer and chapter-specific source scope.
- [x] Evidence panels distinguish sourced facts, interpretation, and limitations.
- [x] Ranking/peer comparison is moved to Explore instead of repeating the resource-model chapter.
- [x] The closing chapter is a decision sequence tied to work completed, not a second summary slide.
- [ ] Verify navigation, keyboard controls, touch controls, reset view, and reduced-motion behavior in a browser.
- [ ] Verify consistent type, spacing, legends, panel alignment, and source labels across desktop, tablet, and phone.

## Chapter 01 — Meet Tanga

- [x] Establish the project and the opening investor question.
- [x] Use the site-context imagery and three qualified, source-backed project facts.
- [x] Make the first action enter the project scene and hand off into the geographic story.
- [ ] Verify the intro, panel, and 3D view compose cleanly on desktop and phone.
- [ ] Verify the poster/deep-link path and the failed or blocked video fallback.

## Chapter 02 — Place it on the map

- [x] Move from Tanzania to the Tanga coast and project location in one guided sequence.
- [x] Keep the map labels and location claims tied to cited geographic sources.
- [x] Give this chapter a guided camera-scale descent rather than a static location card.
- [ ] Verify the camera framing and labels at wide, medium, and phone aspect ratios.

## Chapter 03 — Work completed

- [x] Show dated work milestones as the primary evidence for completed activity.
- [x] Add verified survey-site and core context images with clear source notes.
- [x] Provide an interactive milestone selector.
- [ ] Verify each milestone updates the content and image without leaving stale text.
- [ ] Verify dates and image credits remain legible at presentation and phone sizes.

## Chapter 04 — Read the landscape

- [x] Use the supplied August 2025 survey DTM inside its valid footprint.
- [x] Use regional DEM context outside the 16.862% surveyed footprint and label both sources.
- [x] Derive slope from the survey DTM in degrees; display surface, slope, and profile views.
- [x] Preserve the unknown vertical datum caveat and avoid shifting recorded collar elevations.
- [x] Keep the 0.655 m source cell, approximately 7.4 m output grid, and 1× vertical scale distinct.
- [ ] Visually verify NoData boundaries, mesh relief, contour/profile alignment, and source labels.
- [ ] Verify surface/slope/profile controls and reset behavior on touch and mouse.

## Chapter 05 — Follow a recorded hole

- [x] Present a recorded drillhole with interval context and source qualification.
- [x] Include the core example with a note that it is not the selected 3D hole.
- [x] Retain a vertical-reference caveat instead of moving collars to match the DTM.
- [ ] Verify hole selection, interval updates, and legend behavior.
- [ ] Verify collar/terrain alignment is understandable without implying datum reconciliation.

## Chapter 06 — Reveal the host rock

- [x] Present interpreted geology as an explicit interpretation, separate from source assay data.
- [x] Connect petrography sample TGF002 to TGDD1009, interval 18.25–18.38 m, and assay ID TD0058.
- [x] Keep the petrography crosswalk separate from the non-identical 18.0–18.9 m assay composite.
- [x] Use the genuine TGF002 image and expose its source in the evidence drawer.
- [ ] Verify geological cutaway/section, sample highlighting, and compact source citations.

## Chapter 07 — Understand the model

- [x] Give the reported resource/model a separate purpose from geology and peer ranking.
- [x] Keep classification, basis, and source context attached to the model view.
- [x] Preserve active grade legend and population controls.
- [ ] Verify class/grade filters, legend updates, and source panel against the final MRE PDF.
- [ ] Confirm no reserve, tenure, or unsupported economic/security claim appears.

## Chapter 08 — Fit a concept to ground

- [x] Present mine geometry as a conceptual fit-to-ground view.
- [x] Keep the conceptual status visible and avoid implying an approved mine plan.
- [x] Make the concept/terrain toggle the chapter-specific action.
- [ ] Verify the toggle, camera, and caveat remain visible in all supported layouts.

## Chapter 09 — Examine testwork

- [x] Give metallurgy/testwork a distinct evidence chapter with source-scoped content.
- [x] Keep composite, carbon, recovery, and flake-size interpretations qualified by source.
- [x] Provide a selectable/comparable testwork interaction.
- [ ] Verify every selector changes the displayed evidence and the axes/legend remain accurate.
- [ ] Check that no product-quality or unsupported recovery claim is presented as a guarantee.

## Chapter 10 — Connect to port

- [x] Separate transport/access context from geology, resource, and testwork chapters.
- [x] Qualify the route and distance as contextual evidence rather than a feasibility result.
- [x] Provide a route/profile scrub interaction.
- [ ] Verify route geometry, labels, distance basis, profile, and source attribution.
- [ ] Check the route panel and map controls at phone width.

## Chapter 11 — Evidence to decisions

- [x] Tie completed work to the evidence now available and three concrete next decisions.
- [x] Keep each proposed decision linked to chapter-scoped sources and limitations.
- [x] Make source/decision evidence the closing action rather than duplicating comparison content.
- [ ] Verify the decision sequence and source drawer can be used without losing the final chapter.

## Deployment and release gates

- [x] Vercel dashboard has `NEXT_PUBLIC_ASSET_BASE_URL` for Production and Preview.
- [x] Vercel dashboard lists the merged Tanga PR deployment as Ready and a Tanga branch preview as Ready.
- [x] Cloudflare R2 bucket `my-geo-assets` exists, has public access enabled, and contains the legacy terrain, texture, model, and intro objects.
- [x] Cloudflare R2 CORS allows GET/HEAD from the stable production and preview origins and local development origins.
- [x] Add OpenNext/Workers build, local preview, and deploy configuration without publishing a Worker.
- [ ] Confirm the Cloudflare Worker runtime variable matches the R2 public base before first deployment.
- [ ] Run typecheck and Vercel build after final code changes.
- [ ] Run Cloudflare build/preview after final code changes and verify same-origin asset streaming and Range handling.
- [ ] Capture and review the 11-chapter desktop walkthrough plus tablet and phone layouts.
- [ ] Review the final diff, commit changes, and push `codex/tanga-investor-experience`.

## Implementation notes

- Cloudflare R2 currently has Public Development URL enabled but no custom domain; it is rate-limited and Cloudflare recommends a custom domain for production workloads.
- Current investor-deck asset reads use same-origin URLs and a same-origin streaming endpoint for oversized R2 objects, so adding a new Worker origin to R2 CORS is not required for those paths.
- The Worker itself has not been created or deployed. First publish is a separate `npm run cf:deploy` action.
- Survey vertical datum is not stated in the DTM metadata. The deck preserves that limitation and leaves recorded collar elevations unchanged.

_Updated during implementation._
