# Tanga desktop chapter capture matrix — 25 October 2026

## Scope

Captured direct chapter entry on the current `codex/tanga-investor-experience` branch at 1366×768 and 1707×842 using the local Next.js preview on port 3011. Before recording readiness, the browser probe required the workbench's active chapter ID to match the requested URL; this avoids accepting a stale ready state from the chapter that was previously mounted.

For Three.js chapters, acceptance required `data-three-state="ready"`; for map chapters, it required `data-map-state="ready"`. The chapter root reported zero browser errors, no visible error alert and no horizontal page overflow in each final capture. The Mine Planning captures were retaken after the live scene completed loading; an earlier capture showed the loading still and was discarded.

This is a warm-cache desktop capture and direct-entry readiness pass. It does not complete the full before/after comparison, camera/layer/sample interaction checklist, cold-cache timing, 30-second orbit benchmark or physical-device review.

## Current 1366×768 sweep and closing-panel correction

The current isolated production preview (`.next-tanga-drill-aerial-final`, port 3126) was traversed through all twelve chapter hashes at 1366×768. The probe waited for the selected chapter and its expected renderer to become ready, then recorded screenshots, page errors, visible alerts, horizontal overflow and primary viewer-control bounds in `.playwright-mcp/current-desktop-matrix-1366.json`. All twelve chapters reached their expected map or Three.js ready state; all six Three.js chapters had one canvas. There were no page errors, visible alerts or horizontal page overflow. This was a warm same-tab sweep, not a cold direct-entry matrix or interaction/performance benchmark. The first `work_completed` transition capture showed the Act interstitial, so that image was replaced by a direct `#work_completed` capture after the transition.

| Chapter | 1366×768 current capture |
|---|---|
| Project | `.playwright-mcp/current-1366-project.png` |
| Tanzania | `.playwright-mcp/current-1366-tanzania.png` |
| Work completed | `.playwright-mcp/current-1366-work_completed.png` |
| Topography | `.playwright-mcp/current-1366-topography.png` |
| Drillholes | `.playwright-mcp/current-1366-drillholes.png` |
| Subsurface | `.playwright-mcp/current-1366-subsurface.png` |
| Resource | `.playwright-mcp/current-1366-resource.png` |
| Ranking | `.playwright-mcp/current-1366-ranking.png` |
| Mine Planning | `.playwright-mcp/current-1366-mine_planning.png` |
| Metallurgy | `.playwright-mcp/current-1366-metallurgy.png` |
| Accessibility | `.playwright-mcp/current-1366-accessibility.png` |
| Comparison | `.playwright-mcp/current-1366-comparison.png` |

The closing decision panel had 675 px of content in a 466 px viewport panel, hiding the last decision links behind its scroll area. The three chapter actions remain visible; each report citation is now a compact disclosure that opens its source link on demand. The final development preview at 1366×768 has `scrollHeight=clientHeight=465`; at 1707×842 it also fits without scrolling. All three chapter actions and source disclosures remain available, the expanded report link was verified, and there were no page errors or horizontal overflow. Captures: `.playwright-mcp/decisions-compact-final-1366x768.png`, `.playwright-mcp/decisions-compact-final-1707x842.png`.

## Captures

| Chapter | 1366×768 | 1707×842 |
|---|---|---|
| Ranking | `.playwright-mcp/shot-matrix-ranking-1366x768.png` | `.playwright-mcp/shot-matrix-ranking-1707x842.png` |
| Project | `.playwright-mcp/shot-matrix-project-1366x768.png` | `.playwright-mcp/shot-matrix-project-1707x842.png` |
| Resource | `.playwright-mcp/shot-matrix-resource-1366x768.png` | `.playwright-mcp/shot-matrix-resource-1707x842.png` |
| Tanzania | `.playwright-mcp/shot-matrix-tanzania-1366x768.png` | `.playwright-mcp/shot-matrix-tanzania-1707x842.png` |
| Accessibility | `.playwright-mcp/shot-matrix-accessibility-1366x768.png` | `.playwright-mcp/shot-matrix-accessibility-1707x842.png` |
| Topography | `.playwright-mcp/shot-matrix-topography-1366x768.png` | `.playwright-mcp/shot-matrix-topography-1707x842.png` |
| Drillholes | `.playwright-mcp/shot-matrix-drillholes-1366x768.png` | `.playwright-mcp/shot-matrix-drillholes-1707x842.png` |
| Subsurface | `.playwright-mcp/shot-matrix-subsurface-1366x768.png` | `.playwright-mcp/shot-matrix-subsurface-1707x842.png` |
| Work completed | `.playwright-mcp/shot-matrix-work_completed-1366x768.png` | `.playwright-mcp/shot-matrix-work_completed-1707x842.png` |
| Metallurgy | `.playwright-mcp/shot-matrix-metallurgy-1366x768.png` | `.playwright-mcp/shot-matrix-metallurgy-1707x842.png` |
| Mine Planning | `.playwright-mcp/shot-matrix-mine_planning-1366x768.png` | `.playwright-mcp/shot-matrix-mine_planning-1707x842.png` |
| Comparison | `.playwright-mcp/shot-matrix-comparison-1366x768.png` | `.playwright-mcp/shot-matrix-comparison-1707x842.png` |
