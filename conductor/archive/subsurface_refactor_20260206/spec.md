# Specification: Refactor and Modularize Subsurface Viewers

## Context
The current codebase contains multiple overlapping and potentially redundant components for visualizing subsurface data (e.g., block models, boreholes). This duplication complicates maintenance, introduces inconsistencies, and hinders performance optimization.

## Goals
- **Consolidate Code:** Merge redundant logic from `BlockModelClipViewer.tsx`, `CesiumThreeBlockModel.tsx`, and `resource-model-viewer.tsx` into a shared, reusable library of components.
- **Improve Modularity:** Decompose monolithic viewer components into smaller, single-purpose sub-components (e.g., `BlockModelLayer`, `BoreholeLayer`, `ClippingControls`).
- **Enhance Maintainability:** Establish a clear pattern for adding new visualization types without duplicating scaffolding code.
- **Standardize Data Handling:** Ensure a consistent approach to loading and managing geospatial data across all viewers.

## Scope
- **Analysis:** Identify shared logic and unique features in existing viewers.
- **Architecture:** Design a new component hierarchy for subsurface visualization.
- **Refactoring:**
    - Extract common Three.js/Cesium integration logic into hooks or utility classes.
    - Create a unified `SubsurfaceViewer` container component.
    - Implement specialized layers (Block Model, Drillholes, Surfaces) as children of the container.
- **Testing:** Ensure feature parity with existing viewers and verify correct rendering.

## Technical Requirements
- **Tech Stack:** Next.js, React, TypeScript, CesiumJS, Three.js (React Three Fiber).
- **Patterns:**
    - Use React Context or custom hooks (e.g., `useSubsurfaceContext`) for state management within the viewer.
    - Implement the "Composition" pattern for layers.
- **Performance:** Optimize Three.js scene management to prevent memory leaks during component unmounting.

## Non-Goals
- Adding new visualization features (e.g., new shading models) is out of scope.
- Changing the underlying data formats is out of scope.
