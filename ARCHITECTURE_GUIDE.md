## Modular Architecture Guide

### How to Use the New Modular Structure

This document explains the new modular architecture and how to import components and utilities.

### Component Imports

#### Option 1: Import from Specific Subdirectory (Recommended for specific use)
```typescript
// Cesium components
import { CesiumViewSwitch, DrillholeLayer } from '@/components/cesium-components';

// Three.js components
import { CommonGeoVision, ThreeJsViewSwitch } from '@/components/three-components';

// Specialized viewers
import { LithologyView, AssayView } from '@/components/viewers';

// High-level views
import { DrillholeView, ImageryView } from '@/components/views';

// UI overlays
import { TilesetQualityToggle } from '@/components/overlays';
```

#### Option 2: Import from Component Root (For checking available components)
If needed, import directly:
```typescript
import CesiumViewSwitch from '@/components/CesiumViewSwitch';
import CommonGeoVision from '@/components/common-geo-vision';
```

### Library and Utility Imports

#### Constants (Legends and Color Maps)
```typescript
// Import all constants
import * as constants from '@/lib/constants';

// Import specific constants
import {
  graphiticCarbonLegendData,
  LITHOLOGY_COLOR_MAP_CSS,
  LITHOLOGY_COLORS,
  ASSAY_GRAPHITIC_CARBON,
} from '@/lib/constants';

// Or import from specific module
import { cesiumViewerLithologyLegendData } from '@/lib/constants/legend-definitions';
```

#### Borehole Utilities
```typescript
// Cesium borehole utilities
import { toFixed, orientationFrom, BoreholeCylinderCache } from '@/lib/boreholes/borehole-cylinders';

// Color generation functions
import { lithologyColor, assayColor, lithologyColorThree, assayColorThree } from '@/lib/boreholes/colors';
```

#### Data Cache
```typescript
import { DataCacheProvider, useDataCache } from '@/lib/data-cache';
```

#### Utility Functions
```typescript
// Three.js utilities
import { threeFit } from '@/lib/utils/three-fit';
import { threeHelpers } from '@/lib/utils/three-helpers';

// Cesium utilities
import { cesiumFit } from '@/lib/utils/cesium-fit';
import { cesiumHelpers } from '@/lib/utils/cesium-helpers';

// Geometric utilities
import { aoi_clip } from '@/lib/utils/aoi-clip';
import { drillholes_utils } from '@/lib/utils/drillholes';
import { rectangleUtils } from '@/lib/utils/rectangle-utils';
```

### Directory Organization Reference

#### `src/components/cesium-components/`
**Purpose:** Cesium-based GIS visualization components
**Contains:**
- `CesiumViewSwitch` - Switches between Cesium and other views
- `DrillholeLayer` - Renders drillhole data in Cesium
- `CesiumThreeBlockModel` - Block model visualization for Cesium
- `IonImageryLayer` - Cesium Ion imagery layers
- `KmlBoundary` - KML boundary visualization
- `KMZPolygonClippingPlanes` - KMZ polygon clipping
- `BoreholePrewarmer` - Pre-loads borehole data

#### `src/components/three-components/`
**Purpose:** Three.js-based client-side 3D visualization
**Contains:**
- `CommonGeoVision` - Core Three.js scene setup
- `GeoVisionHost` - Three.js visualization host
- `ThreeJsViewSwitch` - Switches between Three.js views
- `BlockModelClipViewer` - Block model clipping viewer

#### `src/components/viewers/`
**Purpose:** Specialized data visualization components
**Contains:**
- `LithologyView` - Three.js lithology visualization
- `AssayView` - Three.js assay data visualization
- `BlockModelCarbonView` - Carbon content visualization
- `BlockModelRescView` - RESC classification visualization
- `ResourceEstimationClippingViewer` - Resource estimation display

#### `src/components/views/`
**Purpose:** High-level page/screen components
**Contains:**
- `DrillholeView` - Drillhole page view
- `ImageryView` - Imagery page view
- `IonImageryView` - Ion imagery view
- `OriginalKmlView` - KML original view
- `geovision/` - GeoVision-specific views (Three.js integrated)

#### `src/components/overlays/`
**Purpose:** UI overlays that sit on top of main visualizations
**Contains:**
- `TilesetQualityToggle` - Quality control overlay
- `CompassOverlay` - Navigation compass
- `MetricScaleOverlay` - Scale indicator

#### `src/components/shared/`
**Purpose:** Common/reusable components
**Contains:**
- `GeospatialLayout` - Layout wrapper
- Clipping plane components (terrain, KMZ polygon)

#### `src/lib/constants/`
**Purpose:** Application-wide constants
**Contains:**
- `legend-definitions.ts` - All legend data and color maps
- Exported constants: `LITHOLOGY_COLORS`, `LITHOLOGY_COLOR_MAP_CSS`, `ASSAY_GRAPHITIC_CARBON`, etc.

#### `src/lib/boreholes/`
**Purpose:** Borehole visualization utilities
**Contains:**
- `borehole-cylinders.ts` - Cesium borehole rendering
- `colors.ts` - Color generation for lithology/assay data

#### `src/lib/utils/`
**Purpose:** General utility functions
**Contains:**
- `cesium-fit.ts` - Cesium camera fitting
- `cesium-helpers.ts` - Cesium helper functions
- `three-fit.ts` - Three.js camera fitting
- `three-helpers.ts` - Three.js helper functions
- `aoi-clip.ts` - Area of interest clipping
- `drillholes.ts` - Drillhole utilities
- `rectangle-utils.ts` - Rectangle/bounds utilities

### Adding New Components

**For Cesium-based components:**
1. Create new `.tsx` file in `src/components/`
2. Add export to `src/components/cesium-components/index.ts`

**For Three.js-based components:**
1. Create new `.tsx` file in `src/components/`
2. Add export to `src/components/three-components/index.ts`

**For new constants/legends:**
1. Add to `src/lib/constants/legend-definitions.ts`
2. Add export to `src/lib/constants/index.ts`

**For new utilities:**
1. Create new file in appropriate `src/lib/utils/` subfolder
2. Export from `src/lib/utils/` index.ts if creating new subfolder

### Component Dependency Map

```
┌─────────────────────────────────┐
│      App Pages                   │
│  (chapters/*, app/page.tsx)      │
└──────────┬──────────────────────┘
           │
     ┌─────▼──────┬──────────────────┐
     │             │                  │
┌────▼───────┐ ┌──▼────────────┐ ┌──▼────────────┐
│ Cesium     │ │ Three.js      │ │ Views         │
│ Components │ │ Components    │ │ (pages)       │
└──────┬─────┘ └──┬────────────┘ └──┬────────────┘
       │          │                  │
   ┌───▼────────┬─▼─────────────┬────▼───────┐
   │            │               │            │
┌──▼──────┐ ┌──▼───────┐ ┌─────▼─────┐ ┌───▼────┐
│Overlays │ │Viewers   │ │ Shared    │ │lib/*   │
│Components│ │          │ │           │ │Utils   │
└──────────┘ └──────────┘ └───────────┘ └────────┘
```

### Build and Development

All changes maintain zero compilation errors:
```bash
# Build verification
npm run build
# Output: ✓ Compiled successfully

# Development
npm run dev
# Starts dev server with all modular imports resolved

# Type checking (optional)
npm run type-check
```

### Migration Notes

If you have old import paths from before the modularization:

**Before:**
```typescript
import { legendData } from '@/lib/legend-definitions';
import Component from '@/components/SomeComponent';
```

**After:**
```typescript
import { legendData } from '@/lib/constants';
import { SomeComponent } from '@/components/cesium-components';
// or
import SomeComponent from '@/components/SomeComponent';
```

All old import paths still work (files weren't moved, only new organization added), but using the new patterns is recommended for consistency.

### Performance Considerations

- Barrel exports enable tree-shaking by bundlers
- Logical grouping helps code splitting
- Library components are efficiently packaged
- No performance impact from reorganization

### Questions?

Refer to the specific `index.ts` files in each directory for detailed documentation about available exports and their purposes.
