# Design: Unified Subsurface Viewer

## 1. Component Hierarchy

```mermaid
graph TD
    ParentPage[Page / Chapter] --> SubsurfaceViewer
    SubsurfaceViewer --> SubsurfaceProvider
    SubsurfaceProvider --> ThreeOverlay
    SubsurfaceProvider --> ControlDock[Control Dock (UI)]
    ThreeOverlay --> BlockModelLayer
    ThreeOverlay --> BoreholeLayer
    ThreeOverlay --> KMZClippingMask
```

## 2. Interface Definitions

### `SubsurfaceViewer`
The main entry point. Initializes the context and the Three.js synchronization.

```typescript
interface SubsurfaceViewerProps {
  className?: string;
  children?: React.ReactNode; // Layers and UI controls go here
}
```

### `useThreeOverlay` (Hook)
Manages the lifecycle of the Three.js scene synchronized with Cesium.

```typescript
interface ThreeOverlayState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  ready: boolean;
}

// Hook signature
function useThreeOverlay(viewer: Cesium.Viewer | undefined): ThreeOverlayState | null;
```

### `SubsurfaceContext`
Shares the Three.js state and global subsurface configurations (clipping, selection) with child layers.

```typescript
interface SubsurfaceContextType {
  // Three.js instances
  three: ThreeOverlayState | null;
  
  // Clipping
  clippingPlanes: Cesium.ClippingPlaneCollection | null;
  setClippingPlanes: (planes: Cesium.ClippingPlaneCollection) => void;
  
  // Data Cache (Wrapped wrapper around existing cache or local state)
  // ...
}
```

### `BlockModelLayer`
Renders the block model using InstancedMesh.

```typescript
interface BlockModelLayerProps {
  dataUrl?: string; // Optional: can override context data
  colorProperty: string; // e.g., "Kr, GRAPHITIC_CARBON..."
  opacity?: number;
}
```

## 3. Implementation Details

### Composition Pattern
The `SubsurfaceViewer` will use React composition to allow flexibility.

```tsx
<SubsurfaceViewer>
  <BlockModelLayer colorProperty="Carbon" />
  <ClippingControls type="box" />
</SubsurfaceViewer>
```

### Synchronization Logic (in `useThreeOverlay`)
1.  **Init:** Create `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.WebGLRenderer` (with `alpha: true`).
2.  **Loop:** Listen to `viewer.scene.postRender`.
3.  **Sync:** In the loop:
    -   Clone Cesium camera FOV, aspect, near, far.
    -   Convert Cesium View Matrix to Three.js World Matrix.
    -   Render Three.js scene.
4.  **Cleanup:** Remove listener, dispose geometries/materials.
