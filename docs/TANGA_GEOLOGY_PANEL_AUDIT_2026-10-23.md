# Geology panel and typography audit

23 October 2026 · desktop production browser · latest user follow-up: remove overlapping panels and match the previous drilling slide's UI and text colors.

## Reproduced problems

- At 1366×768 the mapped-unit legend occupied y=342–618 and overlapped Surface opacity at y=593–664. Opening Inspection tools placed the geological section controls at y=348–656 behind that legend.
- Selected-unit text and expanded source evidence scrolled the primary Continue action below the right story panel. The fourth, sample-evidence view had the same problem with its interpretation reveal/restore action.
- Geology mixed a pale paper panel and serif heading with the preceding drilling chapter's dark panel and sans-serif UI.
- Choosing Layers left the Tools popup open over its drawer. Reopening Tools while notes were visible placed its buttons underneath the notes panel, preventing pointer access to Hide speaker notes.

## Changes

- Compass/scale and camera controls stay in the top of one bounded left rail. Surface opacity, the per-unit legend and inspection controls use a flowing, independently scrolling area below. The legend is rendered into a scene-owned overlay slot; it no longer uses a second fixed screen position.
- Inspection mode uses the same body area as the rock key. Its close control remains above that scrolling area. The default map view shows all eight unit visibility controls at 1366×768 without scrolling. The fourth view uses a compact rail when the legend is absent.
- All geology story panels now have a fixed heading and action area with a scrolling evidence body. Expanding sources or selecting a unit cannot push Continue or reveal/restore behind the pager.
- Geology uses the drilling chapter's panel background, warm-white primary text, muted paragraph color, Space Grotesk heading and copper accent/actions. Source lithology swatches are unchanged. The earlier bright atlas palette is superseded by the user's latest consistency request.
- Tools closes after choosing an action or clicking elsewhere. An open Tools popup has an explicit layer above notes and utility drawers. Sources remains the modal evidence drawer with its own accessible close control.

## Verification evidence

Local Next.js production server, Chromium; 1366×768 and 1707×842. UI styling skill, project UI/coding/reviewer guidance and UI Expert critique were used.

| State | Evidence |
|---|---|
| Mapped surface, relief and interpreted depth | Left and right panels were disjoint at both sizes; captures include selected Graphitic schist, expanded source evidence and open inspection tools |
| Selected-unit/source expansion | Primary action remained the topmost element at its center in all three stages at both sizes |
| Inspect/close control | Close remained topmost and clickable while the inspection body scrolled; the hidden rock key did not overlap the tools |
| Complete map legend | Crystalline limestone's visibility button, the last of eight, was visible and topmost at 1366×768 (y=604–628) |
| Fourth geology view | Interpretation reveal/restore stayed visible in its fixed footer; its center passed the topmost-element check at both sizes |
| Layers, speaker notes and why-this-matters | Each opened its panel, closed the Tools popup, and allowed the corresponding hide action to be reached after reopening Tools at both sizes |
| Sources | Close sources remained topmost and clickable at both sizes |
| Palette comparison | Drilling and geology use the same panel background rgba(17,27,35,0.93), primary text #f5f1eb, paragraph color #b6c4cc, heading family Space Grotesk and accent #e2ad78 |
| Overflow and runtime | No horizontal page overflow in the checked geology stages; no JavaScript console errors in the final browser runs. Graphics-buffer warnings remain |
| Build | `npm run build` passed, including TypeScript and service-worker generation; `git diff --check` passed with line-ending warnings only |

Before captures: `.playwright-mcp/geology-panels-before-1366.png`, `geology-panels-tools-before-1366.png`, `geology-notes-menu-collision-before.png`.

After captures: `.playwright-mcp/geology-panels-final-{plan,relief,depth}-selected-{1366,1707}.png`, `geology-panels-final-{plan,relief,depth}-tools-{1366,1707}.png`, `geology-panels-final-section-{1366,1707}.png`, `geology-panels-final-layers-1707.png` and `geology-panels-final-sources-1707.png`. The plain mapped entry capture is `geology-panels-final-plan-1366.png`.

This audit covers desktop geology and the related shared utility popups. Phone/tablet redesign, other chapter compositions, frame-time budgets and hosted deployment acceptance remain in the main checklist.

## Current desktop spot check

23 October 2026 · local development build · interpreted-depth stage with Graphitic schist selected.

- Rechecked the latest layout at 1366×768 and 1707×842. The geology rail and right story panel occupy separate sides of the viewport; the story evidence body scrolls independently while the interpretation action remains in its fixed footer.
- Confirmed the preceding drilling chapter's matched typography/panel treatment remains applied. This focused check found no panel collision and no browser JavaScript errors; it does not replace the full stage-and-popup matrix above.
- Captures: `.playwright-mcp/geology-latest-1366x768-review.png` and `.playwright-mcp/geology-latest-1707x842-review.png`.

## Follow-up: match the preceding chapter's control treatment

23 October 2026 · desktop local development browser · latest visual polish request.

- Kept the geology story panel on the same shared presentation tokens as drilling: panel `#111b23` at 93% opacity, primary text `#f5f1eb`, supporting text `#b6c4cc`, Space Grotesk headings and copper actions.
- Updated the three geology stage controls to use the same dark control surface, warm-white inactive text, 7 px control radius, clear copper active state and keyboard focus treatment as the presentation HUD. This makes the labels readable at a glance and the active stage more obvious.
- Screenshot: `.playwright-mcp/geology-ui-aligned-ready.png` (1707 × 842). Ready desktop scene inspected after the transition; the scene, rail, map sequence and story panel all rendered without overlap. Browser reported zero JavaScript errors during the review.
