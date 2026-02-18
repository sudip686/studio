/**
 * Application constants
 * Centralized definitions for legends, color maps, and static data
 */

// Base URL for large assets (fetched from R2 or local public directory)
export const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL || '';

export {
  graphiticCarbonLegendData,
  mineralDomainsLegendData,
  cesiumViewerLithologyLegendData,
  drillholeLocationMapLithologyLegendData,
  geoVisionLithologyLegendData,
  carbonGradeLegendData,
  classificationLegendData,
  geospatialViewerLithologyLegendData,
  lithologyLegendData,
  LITHOLOGY_COLOR_MAP_CSS,
  ASSAY_GRAPHITIC_CARBON,
  LITHOLOGY_COLORS,
} from './legend-definitions';
