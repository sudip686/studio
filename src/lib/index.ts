/**
 * Library exports - shared utilities, data caching, and constants
 */

// Data caching and providers
export { DataCacheProvider, useDataCache } from './data-cache';

// Cesium rendering
export { cesiumFit } from './utils/cesium-fit';
export { cesiumHelpers } from './utils/cesium-helpers';

// Three.js rendering
export { threeFit } from './utils/three-fit';
export { threeHelpers } from './utils/three-helpers';

// Utility functions
export * from './utils';

// Constants and legends
export * from './constants';

// Cesium-specific utilities
export { getCesium, toFixed, orientationFrom, BoreholeCylinderCache } from './boreholes/borehole-cylinders';
export { lithologyColor, assayColor, lithologyColorThree, assayColorThree, LITHOLOGY_COLOR_MAP } from './boreholes/colors';

// General utilities
export { aoi_clip } from './utils/aoi-clip';
export { drillholes_utils } from './utils/drillholes';
export { rectangleUtils } from './utils/rectangle-utils';
