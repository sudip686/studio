# Analysis of Subsurface Viewer Components

## 1. Components Analyzed
- `src/components/BlockModelClipViewer.tsx`
- `src/components/CesiumThreeBlockModel.tsx`
- `src/components/resource-model-viewer.tsx`

## 2. Findings

### Common Patterns
- **Three.js Integration:** Both `BlockModelClipViewer` and `CesiumThreeBlockModel` manually set up a Three.js scene, renderer, and camera, and synchronize it with the Cesium camera loop. This code is highly repetitive.
- **Data Loading:** All components fetch GeoJSON data. `BlockModelClipViewer` uses a `useDataCache` hook, while the others fetch directly inside `useEffect`.
- **Instanced Rendering:** The two Three.js components correctly use `InstancedMesh` for performance, which is a pattern that must be preserved. `resource-model-viewer` uses Cesium Entities, which is likely a performance bottleneck for large datasets.

### Unique Features & Logic to Preserve
- **Clipping Strategies:**
    - `BlockModelClipViewer`: Uses a "Puck" style clipping (inverted box) defined by 4 planes around a center point.
    - `CesiumThreeBlockModel`: Derives clipping planes dynamically from a KMZ polygon.
- **Color Mapping:**
    - `BlockModelClipViewer`: Hardcoded color map for Carbon.
    - `CesiumThreeBlockModel`: Uses a `color` property directly from the GeoJSON.
    - `resource-model-viewer`: Dynamic UI-driven coloring (Carbon gradient vs. Resource Category discrete colors).
- **Interaction:** `resource-model-viewer` has the most developed UI (tooltips, dropdowns) which should be ported to the new system.

## 3. Refactoring Strategy

### New Hook: `useThreeOverlay`
- **Responsibility:**
    - Initialize Three.js scene, camera, renderer.
    - Register the `postRender` listener to sync with Cesium.
    - Handle cleanup/disposal.
    - Expose `scene`, `camera`, `renderer` to children.

### New Context: `SubsurfaceContext`
- **Responsibility:**
    - Store loaded data (Block Model, Assays).
    - Manage state for: `selectedProperty`, `transparency`, `clippingMode` (Box vs. Polygon).
    - Store clipping planes to be shared across materials.

### New Components
- **`SubsurfaceViewer` (Container):** Wraps the context and the hook.
- **`BlockModelLayer`:** Renders the `InstancedMesh`. Accepts `data` and `colorFn` as props.
- **`ClippingManager`:** Logic to generate planes from either a point+radius (Puck) or a KMZ (Polygon) and update the context.

## 4. Action Items
- Extract camera sync logic into `src/hooks/use-three-overlay.ts`.
- Create `src/contexts/subsurface-context.tsx`.
- Implement `BlockModelLayer` to replace the logic in the three existing files.
