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

## Follow-up — 24 October 2026

- Extended `disposeObject` in `TangaThreeGeologyScene.tsx` to dispose every direct `THREE.Texture` material property, not only `map` and `alphaMap`. A per-teardown set avoids repeated disposal when materials share one texture. This covers additional GLTF slots such as normal, roughness, metalness, emissive and environment maps.
- `npm run typecheck`, `npm run build` and `npm run cf:build` passed after the change.
- A fresh local Chromium revisit through subsurface → drillholes → mine planning → resource → subsurface → mine planning → subsurface reached `data-ready=true` for each chapter, retained one mounted `.tanga-three__canvas`, and reported zero JavaScript errors.
- An exploratory WebGL2 wrapper observed texture/buffer create/delete calls, but context-loss invalidation did not map cleanly to explicit delete counts. Its live-resource figures are not treated as a leak measurement. GPU-object, heap and decoded-image stability therefore remain unverified.

## Renderer-info repeat sample — 24 October 2026

- Added an opt-in `?scene-memory=1` diagnostic to the Three.js viewer. It records the renderer's live `renderer.info.memory` geometry/texture counts, program count, draw calls, triangles and context-loss state on the canvas element. It also records one final sample before scene teardown. The normal presentation has no diagnostic polling or visible UI when this query flag is absent.
- Browser: current local Chromium session, 1707 × 842 viewport, warm assets, local Next.js development server at port 3011. Navigated `subsurface → resource → mine_planning → drillholes → subsurface → mine_planning`. Every view reached `data-ready=true`, retained one scene canvas and had no horizontal document overflow or browser JavaScript errors.
- Renderer counts by view (geometries / textures / programs / draw calls / triangles): subsurface `36 / 1 / 10 / 49 / 649,552`; resource `18 / 1 / 6 / 24 / 2,397,370`; mine planning `193 / 2 / 17 / 201 / 1,261,635`; drillholes `12 / 1 / 4 / 16 / 542,958`.
- The second subsurface and mine-planning entries returned the same counts as their first entries. This is evidence against renderer geometry/texture/program-count growth during this short warm desktop revisit sequence. It does not measure JavaScript heap, decoded image memory, browser GPU allocations outside `renderer.info`, a full 12-chapter tour, or production-build performance. Frame-time values from this development-server run are not used as performance acceptance data.
