/**
 * UI overlay components
 * Components that render on top of visualizations including:
 * - Map overlays (compass, scale indicators)
 * - Legends and color scales
 * - Tooltips and interactive overlays
 * - Quality/quality toggles for data layers
 */

// Quality and layer controls
export { default as TilesetQualityToggle } from '../TilesetQualityToggle';

// Navigation and spatial indicators
export { CompassOverlay } from '../ui/CompassOverlay';
export { LogoOverlay } from '../ui/LogoOverlay';
export { MetricScaleOverlay } from '../ui/MetricScaleOverlay';