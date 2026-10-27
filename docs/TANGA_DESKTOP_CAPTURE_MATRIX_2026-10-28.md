# Tanga desktop chapter capture matrix — 28 October 2026

Current-branch local browser sweep at **1366 × 768** and **1707 × 842**, using the 12 live presentation chapters. Each entry reached the expected map or Three.js readiness marker. The panel audit included the pager, story cue, map/3D controls, Resource reveal, grade legend, surface-opacity control, data panels and chapter-specific overlays. All 24 default opening views reported zero intersecting sibling panels and zero panels outside the viewport.

These are current-state opening captures, not before/after comparisons and not a complete test of every selected layer, sample, camera preset, evidence disclosure or source link. Resource's two competing disclosures were separately opened at both sizes; each closes the other and leaves the surface-opacity control clear. The expanded grade list is scrollable.

| # | Chapter | Mode | 1366 × 768 | 1707 × 842 |
|---:|---|---|---|---|
| 1 | Meet Tanga | `project` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-01-project.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-01-project.png) |
| 2 | Place it on the map | `tanzania` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-02-tanzania.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-02-tanzania.png) |
| 3 | Work completed | `work_completed` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-03-work_completed.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-03-work_completed.png) |
| 4 | Read the landscape | `topography` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-04-topography.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-04-topography.png) |
| 5 | Follow a recorded hole | `drillholes` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-05-drillholes.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-05-drillholes.png) |
| 6 | Reveal the host rock | `subsurface` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-06-subsurface.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-06-subsurface.png) |
| 7 | Understand the model | `resource` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-07-resource.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-07-resource.png) |
| 8 | The global peer field | `ranking` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-08-ranking.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-08-ranking.png) |
| 9 | Fit a concept to ground | `mine_planning` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-09-mine_planning.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-09-mine_planning.png) |
| 10 | Examine the testwork | `metallurgy` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-10-metallurgy.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-10-metallurgy.png) |
| 11 | Connect to the port | `accessibility` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-11-accessibility.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-11-accessibility.png) |
| 12 | Evidence to decisions | `comparison` | [Capture](../.playwright-mcp/verify-20261028-034620-1366x768-12-comparison.png) | [Capture](../.playwright-mcp/verify-20261028-034708-1707x842-12-comparison.png) |

Resource disclosure-state captures:

- 1366 × 768: [grade legend open, Resource reveal closed](../.playwright-mcp/resource-grade-legend-exclusive-1366x768.png)
- 1707 × 842: [grade legend open, Resource reveal closed](../.playwright-mcp/resource-grade-legend-exclusive-1707x842.png)

Metallurgy inspector follow-up captures after matching the shared deck-panel typography and card styling:

- 1366 × 768: [whole-plant overview](../.playwright-mcp/metallurgy-panel-polished-20261028.png) and [Flotation detail with lab-result card](../.playwright-mcp/metallurgy-panel-stage-20261028.png)
- 1707 × 842: [Flotation detail with lab-result card](../.playwright-mcp/metallurgy-inspector-flotation-1707x842-20261028.png)
- Live Cloudflare Worker `ad2cc7be-0ed5-41a7-b075-308ce6efb62d`, 1707 × 842: [overview](../.playwright-mcp/metallurgy-inspector-live-worker-ad2cc7be-1707x842.png) and [Flotation detail](../.playwright-mcp/metallurgy-flotation-live-worker-ad2cc7be-1707x842.png)

Audit runner: `scripts/verify-presentation.ps1`. It supports a chapter range with `-First` and `-Last`, custom viewport dimensions, and a custom local server through `-BaseUrl`.
