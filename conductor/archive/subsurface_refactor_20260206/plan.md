# Implementation Plan - Refactor and Modularize Subsurface Viewers

## Phase 1: Analysis and Architecture Design [checkpoint: ee65335]
- [x] Task: Analyze existing viewer components (`BlockModelClipViewer.tsx`, `CesiumThreeBlockModel.tsx`, `resource-model-viewer.tsx`) to document shared logic and unique requirements. 2dc4c3a
- [x] Task: Design the new component hierarchy and interface definitions for the unified `SubsurfaceViewer` and its sub-components. 03fd44c
- [x] Task: Conductor - User Manual Verification 'Analysis and Architecture Design' (Protocol in workflow.md) ee65335

## Phase 2: Core Infrastructure & Hooks [checkpoint: 950f468]
- [x] Task: Extract common Cesium/Three.js setup logic into a custom hook (e.g., `useGeoScene`). d70e6a5
    - [ ] Write Tests for hook logic (if applicable).
    - [ ] Implement `useGeoScene` hook.
- [x] Task: Create a shared context provider (`SubsurfaceContext`) to manage viewer state (camera, clipping planes, selected objects). 4ae3dc1
    - [ ] Write Tests for context provider.
    - [ ] Implement `SubsurfaceContext`.
- [x] Task: Conductor - User Manual Verification 'Core Infrastructure & Hooks' (Protocol in workflow.md) 950f468

## Phase 3: Component Implementation [checkpoint: ec5ca19]
- [x] Task: Implement the base `SubsurfaceViewer` container component. ecf689e
- [x] Task: Implement the `BlockModelLayer` component. d0c2560
- [x] Task: Implement the `BoreholeLayer` component. 88fde3f
- [x] Task: Implement reusable `ClippingControls` component. 35ae9b5
- [x] Task: Conductor - User Manual Verification 'Component Implementation' (Protocol in workflow.md) ec5ca19

## Phase 4: Integration and Verification
- [x] Task: Replace usages of old viewer components with the new `SubsurfaceViewer` composition in one "Chapter" page as a pilot. 4ead81a
- [x] Task: Verify feature parity (rendering correctness, interaction, performance) against the legacy implementation.
- [x] Task: Roll out the new component to remaining pages.
- [x] Task: Remove legacy components. 5c64362
- [x] Task: Conductor - User Manual Verification 'Integration and Verification' (Protocol in workflow.md)
