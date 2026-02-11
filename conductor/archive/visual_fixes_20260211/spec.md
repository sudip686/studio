# Specification: Fix Three.js Visuals and Camera & Cesium Zoom

## 1. Overview
This feature track addresses visual and navigational issues in the 3D viewing components. It involves fixing the "black" surface model in Three.js views by ensuring the satellite texture is correctly loaded and applied (potentially upgrading the source), ensuring optimal camera centering on boreholes and terrain, and fixing the zoom-to-extent behavior in the Cesium viewer to properly focus on the terrain/satellite imagery bounds.

## 2. Functional Requirements

### 2.1 Three.js Surface Model (Terrain)
-   **Texture Fix:** Investigate and resolve the issue causing the terrain mesh to appear black.
-   **Satellite Imagery:** Ensure the terrain uses a high-quality satellite image texture.
-   **Shared Component:** Apply these fixes to the shared `TerrainSurfaceLayer` component so that `lithology_view`, `assay_view`, `block_model_carbon_view`, and `block_model_resc_view` all benefit.

### 2.2 Three.js Camera Control
-   **Auto-Centering:** On view load, the camera must automatically position itself to optimally frame the content.
-   **Targeting:** The camera target should balance between:
    -   Fitting all visible boreholes.
    -   Centering on the defined "Model Center" coordinates.
-   **Scope:** This behavior must be consistent across all four Three.js views.

### 2.3 Cesium Viewer Zoom
-   **Area of Interest:** Define the "Area of Interest" as the bounding box of the terrain/satellite imagery.
-   **Zoom Behavior:** Fix the discrepancy where the Cesium view fails to zoom in properly. It should robustly fly to or clamp the camera view to the terrain bounds upon loading or selecting the view.

## 3. Non-Functional Requirements
-   **Performance:** Texture loading should not significantly degrade startup time (consider resolution limits if necessary).
-   **Usability:** Camera transitions should be smooth (no sudden jumps).

## 4. Acceptance Criteria
-   [ ] The terrain surface in all four Three.js views displays a visible, proper satellite image texture (not black).
-   [ ] Loading any of the four Three.js views results in the camera automatically centering and zooming to fit the boreholes and model center.
-   [ ] The Cesium viewer correctly zooms in to frame the terrain/satellite imagery bounds when the relevant layer/view is active.

## 5. Out of Scope
-   Changes to 2D plot views.
-   Modifications to the underlying data parsing logic (unless directly required for bounding box calculations).
