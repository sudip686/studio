/**
 * Shared/common components used across both Cesium and Three.js visualizations
 * Includes layout components and utilities shared between different visualization types
 */

// Layout and structure components
export { default as GeospatialLayout } from '../GeospatialLayout';

// Clipping plane and terrain interaction components
export { default as TerrainSingleClippingPlane } from '../TerrainSingleClippingPlane';
export { default as TerrainClippingPlanes } from '../terrain-clipping-planes';
export { default as TerrainClippingViewer } from '../terrain-clipping-viewer';
export { default as KMZPolygonClippingPlanes } from '../KMZPolygonClippingPlanes';

// NOTE: The following specialized viewers are currently unused but kept for reference
// - animated-reveal-viewer.tsx - Animated reveal capability for layered visualization
// - downhole-plot.tsx - Chart visualization for downhole data (may be useful for future features)
// - statistical-analysis.tsx - Statistics panel for data analysis (placeholder for future analytics)
// - subsurface-cutaway-viewer.tsx - Alternative cutaway visualization method
// - grand-canyon-drillhole-viewer.tsx - Grand Canyon specific drillhole viewer
// - resource-model-viewer.tsx - Alternative resource model viewer
// - kml-focused-viewer.tsx - KML-focused visualization approach
// - block-model-box-cutter.tsx - Alternative block model clipping approach
// - drillhole-location-map.tsx - Drillhole location mapping component

