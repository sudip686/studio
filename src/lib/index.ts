/**
 * Library exports - shared utilities, data caching, and constants
 */

// Data caching and providers
export { DataCacheProvider, useDataCache } from './data-cache';

// Cesium rendering
export { fitViewerToDataSource as cesiumFit } from './utils/cesium-fit';
export * as cesiumHelpers from './utils/cesium-helpers';

// Three.js rendering
export { fitCameraToGroup as threeFit } from './utils/three-fit';
export * as threeHelpers from './utils/three-helpers';

// Utility functions
export * from './utils';

// Constants and legends
export * from './constants';

// Cesium-specific utilities
export { getCesium, toFixed, orientationFrom, BoreholeCylinderCache } from './boreholes/borehole-cylinders';
export { lithologyColor, assayColor, lithologyColorThree, assayColorThree, LITHOLOGY_COLOR_MAP } from './boreholes/colors';

// General utilities
export { clipTilesetToRectangle as aoi_clip } from './utils/aoi-clip';
export * as drillholes_utils from './utils/drillholes';
export * as rectangleUtils from './utils/rectangle-utils';
