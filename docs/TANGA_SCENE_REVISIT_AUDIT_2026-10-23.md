# Tanga repeated Three.js scene revisit audit — 23 October 2026

## Run

- App: local Next.js development server at `http://localhost:3011`.
- Browser: Chromium via Playwright; one current browser page; foreground tab.
- Instrumentation patched canvas context creation and `WEBGL_lose_context` calls before the page loaded, then associated mounted canvases with `.tanga-three__canvas` through a `MutationObserver`.
- Start: `#subsurface`, then switched through `#mine_planning`, `#subsurface`, `#drillholes`, `#subsurface`, `#mine_planning`, and `#subsurface`.

## Results

- All six destination scenes exposed `.tanga-three__canvas[data-ready="true"]` and exactly one mounted scene canvas.
- Seven distinct scene contexts were created (the initial geology visit plus six transitions); six were explicitly lost by scene teardown, leaving one active context for the final geology scene.
- The browser reported zero JavaScript errors during the run. It reported 25 warnings, primarily the existing rendering/GPU warning class.
- The route interception used by a previous stalled-request probe was removed and the browser returned to the ordinary local geology URL after the audit.

## Limits

This verifies that scene revisits do not accumulate WebGL contexts. It does not measure GPU object counts, JavaScript heap, decoded image memory, or long-duration stability under a full 12-chapter tour. Those remain open in the reliability checklist.
