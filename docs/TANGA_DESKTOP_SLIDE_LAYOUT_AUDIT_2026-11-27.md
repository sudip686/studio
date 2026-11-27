# Tanga desktop slide layout audit · 27 November 2026

This audit reviews the 12 desktop chapter captures at 1366 × 768 (`postchange-01` through `postchange-12` and `postchange-montage-1366.png`). It focuses on composition, hierarchy, control placement and how each view explains its evidence. It is a desktop pass; tablet and phone remain deferred.

## Deck-wide design decisions

1. Keep the scene as the primary canvas. Reserve stable areas for the project mark and chapter title (top left), evidence entry (top right), camera/layers (left rail), chapter evidence (right rail) and navigation/timeline (bottom). No panel should cover a measured point, pit, model or route.
2. Standardize HUD spacing, corner radius, label style, muted text, control height, section labels and panel scrolling. Give each slide one main evidence panel and one short takeaway; move secondary detail into the evidence drawer.
3. Make controls context-specific and ordered the same way: camera first, display/layers second, analysis or animation third. Keep reset and pause in predictable positions. Hide irrelevant controls instead of showing disabled-looking controls.
4. Protect visual contrast and geographic context: one primary data color, one context color, one human-made/concept color, with identical meanings across scenes. Keep maps and terrain bright enough to read without washing out their data overlays.
5. Put a specific visual question in each chapter heading. The camera framing, evidence panel and transition should answer that chapter's question and hand off to the next one.

## Chapter-by-chapter improvement plan

| # | Chapter and current role | Layout and visual pass |
|---|---|---|
| 01 | **Meet Tanga** — establish project and location | Keep the boundary overview as the hero. Reduce map label density, align location callouts to the same restrained annotation style, and shorten the opening card so the project outline stays unobstructed. Keep a single, legible “project at a glance” metric group. |
| 02 | **Country overview** — place the project in Tanzania | Give the project-to-port relationship a clear geographic hierarchy: country, project, port. Reduce competing callouts and use one consistent connector treatment. Frame the coast and project together at first entry. |
| 03 | **Work completed** — establish evidence already collected | Increase the photo's usable area and preserve its source caption. Put milestones in a compact, consistently spaced evidence rail; distinguish completed field work from proposed next work. Avoid letting the photo crop imply a surveyed boundary. |
| 04 | **Topography** — show the measured landscape | Use a stronger light direction and a calmer terrain palette. Give the relief surface more vertical separation, then keep survey coverage and profile controls together in one compact instrument panel. Separate measured survey extent from surrounding context. |
| 05 | **Drilling** — show where and how exploration tested the ground | Preserve the aerial/map view and distinct collar markers. Keep camera, surface opacity and hole filters together; keep the intercept/core evidence in the right rail. Reframe the default view so collars and surface relief remain distinguishable at first load. |
| 06 | **Subsurface geology** — connect mapped units to interpreted depth | Make the 2D lithology layer and 3D interpreted model a deliberate, labelled transition. Keep the unit legend and visibility controls in one rail, with the evidence summary in the opposite rail. Avoid stacking panels over the narrow geological corridor; use a broader oblique framing with the vertical exaggeration disclosed. |
| 07 | **Resource** — explain scale, grade and location | Give the block model more canvas area and move the headline resource metrics into a short top-level summary. Keep cutoff, classification and evidence controls grouped; label threshold semantics beside the slider. Reduce secondary labels over the colored blocks. |
| 08 | **Peer comparison** — put reported scale in global context | Keep the globe visible and the comparison table in a bounded, scrollable side panel. Use a single ranked list and make dates, reporting basis and caveats visible without competing with the globe. Emphasize Tanga's position only after the assumptions are stated. |
| 09 | **Mine planning** — show how the source pits, blocks and conceptual site relate | Rebuild the scene around the two source pit surfaces at their registered locations. Keep blocks visibly inside the corresponding shell; prevent terrain cutouts from extending past active source cells. Use a clean default two-pit frame, then offer North/South detail views. Group Site, Pit blocks and Plant controls consistently. Mark the layout conceptual. |
| 10 | **Metallurgy** — explain the process and testwork | Preserve the plant as the scene hero. Keep stage selection, play/pause and reset in a stable strip above the viewport; give each selected stage one evidence/result card and a short process explanation. Keep conceptual flow animation visually distinct from reported testwork results. |
| 11 | **Access and logistics** — connect site to port | Let the route carry the story. Reduce route labels to named endpoints plus the verified 72 km project-to-port measure, keep the route facts together, and avoid duplicate floating labels along the path. State when a route is illustrative. |
| 12 | **Conclusion** — consolidate the decision and next step | Keep the orbit/pullback as background context and prioritize a readable next-study decision panel. Use a single concise recap cue with a predictable route back into the deck. Keep milestone statements tied to documented commitments. |

## Recommended implementation order

1. **P0 — layout reliability:** preserve working 12-chapter entry/navigation, remove panel collisions, keep controls inside the viewport, and stabilize the source-pit/terrain relationship on Mine Planning.
2. **P1 — shared HUD polish:** unify rails, section headers, typography, scrolling, control sizes and active states; make title and chapter navigation positions predictable.
3. **P2 — signature visual passes:** Topography relief; Subsurface 2D-to-3D geology handoff; Resource block legibility; Peer globe/table balance; Metallurgy stage evidence; Mine Planning two-pit/site framing.
4. **P3 — narrative finishing:** tighten each chapter's one-line takeaway, reduce repeated copy, and make transitions point toward the next chapter's question.

## Acceptance checklist

- [ ] All 12 chapters reviewed directly at 1366 × 768 and 1707 × 842 after the layout work.
- [ ] No document overflow, clipped controls, panel overlap or labels over critical evidence.
- [ ] Camera, reset, visibility, pause and detail controls are in consistent locations where applicable.
- [ ] Each chapter has a distinct purpose, a legible evidence hierarchy and one obvious visual focal point.
- [ ] Geology, resource, drilling and peer claims retain their source, date and limitation cues.
- [ ] Mine Planning shows both RF1 source pits together, with source blocks contained and no terrain gap outside the active raster mask.
- [ ] Metallurgy keeps source testwork visually separate from the conceptual process animation.

## 27 November implementation progress

- [x] Align the desktop evidence rail: visible story panels and the peer comparison now share a 190 px top edge and a 112 px bottom safe zone at desktop breakpoints. Chapter-specific content and panel widths are retained. Local production Chrome confirmed the chapter mode on all 12 direct views at 1366 × 768 and 1707 × 842, with no document overflow or panel overlap with the chapter title or bottom pager. The two authored views without a story panel retain their full-width milestone/map composition; Metallurgy keeps its full-width plant canvas. Mine Planning and Peer captures: `.playwright-mcp/hud-mine_planning-1366x768.png` and `.playwright-mcp/hud-ranking-1366x768.png`.
- This closes only the shared vertical evidence-rail alignment item. Fresh visual acceptance of all chapters, control ordering, signature-scene framing and evidence/source checks remains open.

## Scope note

This is a prioritized design plan, not a claim that each item is already implemented. Current review captures are reference points only; acceptance needs fresh screenshots after each relevant code change. Mobile and tablet work is explicitly deferred.
