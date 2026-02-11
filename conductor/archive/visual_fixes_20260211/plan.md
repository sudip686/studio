# Plan: Fix Three.js Visuals and Camera & Cesium Zoom

## Phase 1: Data & Assets (Terrain Texture)
- [x] Task: Validate and Upgrade Satellite Texture ab6b144
    - [ ] Inspect current texture file resolution and format.
    - [ ] Source or generate a higher quality satellite texture (if current is low res/broken).
    - [ ] Update the `TerrainAscLayer` (or shared data loader) to use the correct/new texture path.
- [~] Task: Conductor - User Manual Verification 'Data & Assets (Terrain Texture)' (Protocol in workflow.md)

## Phase 2: Three.js Terrain & Camera
- [x] Task: Fix "Black" Terrain Surface e27c1fc
    - [x] Debug `TerrainSurfaceLayer` material settings (ensure texture is mapped to `map` and not overridden by vertex colors or lighting issues).
    - [x] Verify `TerrainAscLayer` correctly handles the texture coordinates (UVs).
    - [x] Test in `lithology_view` to confirm the surface is visible and textured.
- [x] Task: Implement Auto-Centering Camera Logic e27c1fc
    - [x] Create a reusable helper function `calculateOptimalView(boreholes, modelCenter)` that returns a target position and zoom level.
        -   Logic: Calculate bounding box of all boreholes. Include `modelCenter`. Determine camera position to fit this box with a margin.
    - [x] Update `TerrainSurfaceLayer` (or the parent views) to call this helper on mount/data load.
    - [x] Apply to `lithology_view`, `assay_view`, `block_model_carbon_view`, and `block_model_resc_view`.
- [x] Task: Conductor - User Manual Verification 'Three.js Terrain & Camera' (Protocol in workflow.md) 100984b

## Phase 3: Cesium Viewer Zoom Fix
- [x] Task: Define "Area of Interest" for Cesium 6a5eee6
    - [x] Extract the precise lat/lon bounds of the terrain/satellite imagery from the source data (e.g., metadata or GeoTIFF headers).
    - [x] Store these bounds in a shared constant or context reachable by the Cesium viewer.
- [x] Task: Implement Robust Zoom-to-Extent 6a5eee6
    - [x] Update the Cesium viewer component (likely `CesiumViewSwitch` or `GlobalOverlays` logic) to fly to these specific bounds when the view is activated.
    - [x] Ensure this overrides any default "whole world" or "zero coordinates" view.
- [~] Task: Conductor - User Manual Verification 'Cesium Viewer Zoom Fix' (Protocol in workflow.md)
