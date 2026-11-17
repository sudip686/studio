# Tanga desktop panel inventory

Source audit for the desktop overlay consolidation item in `TANGA_NEXT_PHASE_PLAN_2026-10-23.md`.
This is a component ownership map, not a claim of visual acceptance; chapter-by-chapter bounds still need browser review.

| Overlay | Owner | Purpose | Layout/overlap concern |
|---|---|---|---|
| Chapter title and scene facts | `TangaDeckWorkbench` | Chapter framing and key measurements | Shares the upper-left safe area with the canvas labels and load strip. |
| Chapter story panel | `TangaChapterStoryPanel` in `TangaStoryPanels.tsx` | Main takeaway and chapter-specific actions | Must reserve the right-side canvas and stay clear of pager/voice controls. |
| Evidence drawer | `TangaEvidenceDrawer` in `TangaStoryPanels.tsx` | Sources, assumptions and limitations | Modal drawer should supersede other overlays while open. |
| Source-data panel | `TangaDeckWorkbench` (`tanga-deck__data-panel`) | Tables or selected source values | Shares a right-side dock with inspector, layers and notes. |
| Key-facts panel | `TangaDeckWorkbench` (`tanga-deck__insight-panel`) | Short investor-facing metrics | Repeats some title/story facts; require one canonical owner per metric. |
| Investor inspector | `TangaDeckWorkbench` (`tanga-deck__inspector`) | “Why this matters” explanation | Can collide with data, layers, notes and scene-specific inspectors. |
| Speaker notes | `TangaDeckWorkbench` (`tanga-deck__notes`) | Presenter-only narration and timing | Should displace, not stack with, other right-side drawers. |
| Scene-specific controls | Chapter viewer components | Geology stages, mine-plan focus, process-stage selection, layer controls | Must use shared HUD spacing and avoid covering the subject/callouts. |
| Route profile and voice dock | `TangaDeckWorkbench` | Route evidence and voice quick controls | Bottom safe area; coordinate with pager and chapter-story footer. |

## Desktop acceptance checklist

- [ ] Capture each chapter at 1366×768 and 1707×842 with default overlays.
- [ ] Open every pair of panels that can coexist; verify drawers are mutually exclusive where they share a dock.
- [ ] Verify no panel covers the primary 3D subject, map, scale/compass, chapter pager or source controls.
- [ ] Confirm repeated metrics have one canonical display and consistent formatting.
- [ ] Record measured bounds and accepted safe areas before consolidating CSS overrides.
- [ ] Recheck all affected chapters after CSS/component changes.
