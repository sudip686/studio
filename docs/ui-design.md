# UI Design Questionnaire & Customization Guide

This document captures **design questions, layout decisions, and easy-to-modify UI elements** for every view in the app. Use it when defining or revising UI design per view, or as a checklist when handing work to a designer.

---

## 0) Global UI & Layout (Applies to All Views)

### Global overlays (from `src/components/shared/GlobalOverlays.tsx`)
- [ ] **Logo placement**: Top-left slot. Should it stay visible on every view?
- [ ] **Compass placement**: Top-right on desktop / bottom-right on mobile.
- [ ] **Metric scale overlay**: Bottom-left. Should it be hidden for certain views?
- [ ] **Safe-area + sidebar padding**: Confirm header/sidebar offsets.
- [ ] **Overlay styling**: Background blur, opacity, border radius, padding.
- [ ] **Pointer-events**: Overlays are pointer-events-none; inner elements are pointer-events-auto. Confirm if any overlays must be fully clickable/interactive.

### General layout questions
- [ ] **Header / Chapter Sidebar**: Should they always be visible? Any view-specific hiding rules?
- [ ] **Z-index hierarchy**: Which UI must sit on top (tooltips, legends, control panels)?
- [ ] **Theme**: Light/dark? (Many controls currently use dark translucent panels.)
- [ ] **Typography**: Font, sizing, weight, line-height.
- [ ] **Spacing scale**: Margin/padding increments for all panels and controls.
- [ ] **Icons**: Needed for navigation, tools, legends?
- [ ] **Responsiveness**: Desired layout changes for tablet and mobile (hide panels, collapse into drawers, etc.).

### Common interactive elements
- [ ] **Legend style**: Categorical vs gradient. Position (default bottom-left).
- [ ] **Slider style**: Size, thumb style, gradient fill, label format.
- [ ] **Dropdowns/selects**: Background, hover states, scrollbar style.
- [ ] **Buttons**: Primary/secondary style, hover/active states.
- [ ] **Tooltips**: Background color, font size, pointer offset, max width.

---

## 0A) Shared UI Components (Overlays, Panels, Navigation)

### Base UI building blocks
- **Panel** (`src/components/ui/panel.tsx`)
  - Default styling: rounded-2xl, black/60 background, border, blur, shadow.
  - Easy customizations: border radius, blur intensity, padding, shadow strength.
- **Legend** (`src/components/ui/legend.tsx`)
  - Default position: bottom-left.
  - Categorical: color dots + labels.
  - Gradient: bar + min/max labels (width ~ w-96).
  - Easy customizations: position, width, label font size.

### Global overlays (top-level)
- **LogoOverlay** (`src/components/ui/LogoOverlay.tsx`)
  - Animated glow ring, logo image, optional reset icon.
  - Props: `onClick` toggles clickable state.
- **CompassOverlay** (`src/components/ui/CompassOverlay.tsx`)
  - Large decorative compass (32x32) with rotating needle.
  - Uses `/A_Logo.png` as center emblem.
- **MetricScaleOverlay** (`src/components/ui/MetricScaleOverlay.tsx`)
  - Gradient scale bar with dynamic label (auto-calculated meters).
- **TilesetQualityToggle** (`src/components/TilesetQualityToggle.tsx`)
  - Fixed top-right panel with performance/balanced/quality buttons.

### Storytelling & navigation UI
- **HeroOverlay** (`src/components/HeroOverlay.tsx`)
  - Top-left panel with title, description, and “Start guided tour” CTA.
- **ChapterMenu** (`src/components/ui/chapter-menu.tsx`)
  - Collapsible burger menu (top-right) with animated list items.
  - Includes chapter title, description, and 1–2 facts.
- **ChapterSidebar** (`src/components/ChapterSidebar.tsx`)
  - Right panel listing chapters; shows active chapter bullets.
- **ControlDock** (`src/components/ControlDock.tsx`)
  - Bottom-right dock with compass + metric scale (alternative layout).

### Home page overlays (from `src/app/page.tsx`)
- **Title banner**: top-center, fades between views.
- **Prev/Next arrows**: left/right mid-screen for navigation.
- **Autoplay/Stop Tour button**: top-right, above ChapterMenu.

---

## 0B) Data Requirements & Example Schemas (Global)

> These datasets are referenced by multiple views. The examples below show the **minimum fields** used in the code.

### Lithology drillhole GeoJSON (`/lithology_data.geojson`)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [38.78, -4.80, 1200],
          [38.781, -4.801, 1100]
        ]
      },
      "properties": {
        "hole_id": "DDH-01",
        "depth_from": 0,
        "depth_to": 50,
        "lithology": "Schist",
        "azimuth": 45,
        "inclination": 70
      }
    }
  ]
}
```

### Assay drillhole GeoJSON (`/assay_data.geojson`)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [38.78, -4.80, 1200],
          [38.781, -4.801, 1100]
        ]
      },
      "properties": {
        "hole_id": "DDH-01",
        "depth_from": 0,
        "depth_to": 50,
        "graphitic_carbon": 4.2,
        "azimuth": 45,
        "inclination": 70
      }
    }
  ]
}
```

### Block model GeoJSON (`/BlockModel.geojson` or `${ASSET_BASE_URL}/BlockModel.geojson`)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [38.785, -4.805, 800] },
      "properties": {
        "Id": 1001,
        "dX": 10,
        "dY": 10,
        "dZ": 10,
        "RescCalc": "Measured",
        "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC": 3.6
      }
    }
  ]
}
```

### KML/KMZ boundary
- **Local**: `/tanga_boundary.kmz` (used by KmlBoundary, KML-focused views).
- **Ion asset**: `IonKmlLayer assetId=4310565`.

### Ion imagery assets
- **Tanaga Accessibility**: `assetId=3733958`
- **Tanga Geological Map**: `assetId=3678736`


---

## 0C) Chapters & Storytelling Data

### Chapters dataset (for ChapterSidebar)
**File:** `src/data/chapters.ts`
- Required fields: `id`, `title`, `summary`, `bullets[]`.
- Example:
```ts
{
  id: 'regional',
  title: '1. Regional Setting',
  summary: 'Graphite-bearing horizons hosted within Neoproterozoic metasediments...',
  bullets: ['Licenses in Tanga Region', 'Good road access', 'Favourable structural corridor']
}
```

### Chapter menu data (for ChapterMenu)
**File:** `src/components/ui/chapter-menu.tsx`
- Uses `viewSequence` + `viewTitles` from `src/app/page.tsx`.
- Has internal `chapterDescriptions` keyed by view id.
- Example view ids used: `original`, `exaggerated_kml`, `styled_kml`, `drillhole_location_assay`, `lithology_view`, `assay_view`.

### Home storytelling UI (from `src/app/page.tsx`)
- **Title banner**: uses `viewTitles` mapping.
- **Hero overlay**: uses static text + CTA.
- **Guided tour**: uses autoplay state + stop button.
- **Prev/Next arrows**: page navigation across `viewSequence`.


---

## 1) Cesium View Switcher (Cesium + Overlays)
**File:** `src/components/CesiumViewSwitch.tsx`

### Global controls visible in many Cesium views
- [ ] **Transparency sliders** (top-center): globe opacity, map opacity (conditionally shown).
  - Position: top-center.
  - Labels: white text with opacity.
  - Slider colors: orange for globe, blue for map.
- [ ] **Tileset Quality Toggle** (top-right): performance / balanced / quality.
  - Button style: currently simple text buttons.
  - Consider visual grouping or segmented control?

### Common customizations
- [ ] Placement of sliders and toggles (do they overlap with other panels?).
- [ ] Whether the transparency controls should appear on all views or only certain ones.
- [ ] Default globe transparency, imagery transparency.
- [ ] Hover/tooltips for these sliders.

---

## 2) Standard Cesium Views (from `src/components/views/*`)

### 2.1 Original KML View
**File:** `src/components/views/OriginalKmlView.tsx`
- UI Elements: KML boundary only (no custom controls).
- Easy customizations:
  - [ ] Add a legend or small info panel?
  - [ ] Add a location title badge?
  - [ ] Custom background tone / grid when KML is focused.
- **Data required**:
  - `/tanga_boundary.kmz` with polygon/line entities.
  - Example KML snippet:
    ```xml
    <Placemark><Polygon><outerBoundaryIs>...</outerBoundaryIs></Polygon></Placemark>
    ```

### 2.2 Imagery View
**File:** `src/components/views/ImageryView.tsx`
- UI Elements: Imagery layer only (no custom controls).
- Easy customizations:
  - [ ] Add transparency slider?
  - [ ] Add imagery credit label or legend.
- **Data required**:
  - Cesium Ion imagery asset id (passed in via props).
  - Example: `assetId={3733958}`.

### 2.3 Ion Imagery View
**File:** `src/components/views/IonImageryView.tsx`
- UI Elements: **Globe transparency slider** (top-left panel).
- Panel styling: dark translucent background, white label.
- Easy customizations:
  - [ ] Panel position (currently top-left).
  - [ ] Slider range/step and default transparency.
  - [ ] Replace slider with toggle or preset buttons.
- **Data required**:
  - Cesium Ion imagery asset (default assetId=3733958).

### 2.4 Drillhole View (Cesium Drillhole Layer)
**File:** `src/components/views/DrillholeView.tsx`
- UI Elements: **Legend** only (categorical or gradient depending on type).
- Easy customizations:
  - [ ] Legend position (default bottom-left).
  - [ ] Legend style (font size, color swatches, spacing).
  - [ ] Assay gradient colors and min/max formatting.
- **Data required**:
  - `drillholeData` from `DataCache` (see **0B** samples).
  - Requires `hole_id`, `depth_from`, `depth_to`, plus `lithology` or `graphitic_carbon`.

### 2.5 Cinematic Drillhole View (Cesium + UI Panel)
**File:** `src/components/views/CinematicDrillholeView.tsx`
- UI Elements:
  - **Legend** (assay/lithology).
  - **Selection panel** top-right with dropdown and description.
- Easy customizations:
  - [ ] Panel layout (title size, description list style).
  - [ ] Dropdown styling.
  - [ ] Panel position (top-right to another slot).
- **Data required**:
  - Same drillhole GeoJSON as 2.4 (assay + lithology segments).

---

## 3) Cesium “Special Views” (from `CesiumViewSwitch`)

### 3.1 Animated Reveal View
**File:** `src/components/animated-reveal-viewer.tsx`
- UI Elements:
  - **Legend** (categorical, hidden until animation finishes).
  - **Control panel** top-right: “Animate Discovery” button.
- Easy customizations:
  - [ ] Button style, size, and color.
  - [ ] Panel show/hide animation.
  - [ ] Legend visibility rules.
- **Data required**:
  - `/assay_data.geojson` (see **0B** sample).
  - Needs `graphitic_carbon`, `hole_id`, and LineString coords.

### 3.2 Subsurface Cutaway View
**File:** `src/components/subsurface-cutaway-viewer.tsx`
- UI Elements:
  - **Cutaway control panel** top-right with slider.
  - **Return to Surface button** below.
  - **Legend** (categorical).
- Easy customizations:
  - [ ] Slider range & step.
  - [ ] Panel background opacity / blur.
  - [ ] Button style and placement.
- **Data required**:
  - `/assay_data.geojson` (LineString drillhole segments with `graphitic_carbon`).

### 3.3 KML Focused View
**File:** `src/components/kml-focused-viewer.tsx`
- UI Elements:
  - **Legend** only (categorical).
- Easy customizations:
  - [ ] Add header title / context label.
  - [ ] Add toggle to show/hide KML boundary.
- **Data required**:
  - `/tanga_boundary.kmz` and `/assay_data.geojson`.

### 3.4 Grand Canyon Drillhole Viewer (Assay/Lithology)
**File:** `src/components/grand-canyon-drillhole-viewer.tsx`
- UI Elements:
  - **Legend** (assay gradient or lithology categorical).
  - **Tooltip** on hover.
  - **Resource Model Controls** panel (top-right) with property select + transparency slider.
- Easy customizations:
  - [ ] Tooltip styling (font, background, spacing).
  - [ ] Controls panel layout and styling.
  - [ ] Legend position and style.
- **Data required**:
  - `/lithology_data.geojson` or `/assay_data.geojson`.
  - `${ASSET_BASE_URL}/BlockModel.geojson` for block model boxes.
  - `/tanga_boundary.kmz` for clipping bounds.

### 3.5 Drillhole Location Map (Assay/Lithology)
**File:** `src/components/drillhole-location-map.tsx`
- UI Elements:
  - **Tooltip** on hover.
  - **Panel** top-right with filters, palette, size, etc.
  - **Legend** (gradient or categorical).
- Easy customizations:
  - [ ] Panel width and stacking.
  - [ ] Filter label text & ordering.
  - [ ] Point-size slider style.
  - [ ] Discrete vs continuous scale UX.
  - [ ] Tooltip content order.
- **Data required**:
  - `drillholeData` from `DataCache` (lithology + assay GeoJSON).
  - Ion KML overlay assetId=4310565.

### 3.6 Terrain Clipping View
**File:** `src/components/terrain-clipping-planes.tsx`
- UI Elements: none (pure Cesium clipping).
- Easy customizations:
  - [ ] Add a simple info badge or toggle for clipping on/off.
- **Data required**:
  - `/tanga_boundary.kmz` (for bounding rectangle).

### 3.7 Block Model Box Cutter View
**File:** `src/components/block-model-box-cutter.tsx`
- UI Elements: none (scene-only).
- Easy customizations:
  - [ ] Add a panel for color mode, transparency, or clip box size.
- **Data required**:
  - `${ASSET_BASE_URL}/BlockModel.geojson` with `dX`, `dY`, `dZ`, `RescCalc`, and carbon property.

### 3.8 Block Model Clip View
**File:** `src/components/BlockModelClipViewer.tsx`
- UI Elements: none (scene-only overlay).
- Easy customizations:
  - [ ] Add a legend for carbon thresholds.
  - [ ] Add a clip radius slider.
- **Data required**:
  - `blockModelData` from `DataCache` (see **0B** BlockModel sample).

### 3.9 Resource Model Viewer
**File:** `src/components/resource-model-viewer.tsx`
- UI Elements:
  - **Tooltip** on hover.
  - **Control panel** top-left with property select + transparency sliders.
- Easy customizations:
  - [ ] Panel styling (colors, spacing, radius).
  - [ ] Tooltip style and placement.
- **Data required**:
  - `/BlockModel.geojson` and `/assay_data.geojson`.

---

## 4) Three.js View Switcher & Views

### 4.1 Three.js View Switcher
**File:** `src/components/ThreeJsViewSwitch.tsx`
- Views: `LithologyView`, `AssayView`, `BlockModelCarbonView`, `BlockModelRescView`.
- All currently show **legend bottom-left** plus view-specific controls.

### 4.2 Lithology View
**File:** `src/components/viewers/LithologyView.tsx`
- UI Elements: **Legend** bottom-left.
- Easy customizations:
  - [ ] Legend format and ordering.
  - [ ] Option to toggle terrain visibility.
- **Data required**:
  - `processedLithologyData` from `DataCache` (see **0B** lithology sample).

### 4.3 Assay View
**File:** `src/components/viewers/AssayView.tsx`
- UI Elements: **Gradient legend** bottom-left.
- Easy customizations:
  - [ ] Gradient colors and labeling.
  - [ ] Add assay cutoff control.
- **Data required**:
  - `processedAssayData` from `DataCache` (see **0B** assay sample).

### 4.4 Block Model Carbon View
**File:** `src/components/viewers/BlockModelCarbonView.tsx`
- UI Elements:
  - **Show traces checkbox** panel top-right.
  - **Gradient legend** bottom-left.
- Easy customizations:
  - [ ] Panel layout and placement.
  - [ ] Checkbox style.
  - [ ] Legend gradient and thresholds.
- **Data required**:
  - `blockModelData` from `DataCache` with carbon property.

### 4.5 Block Model Resc View
**File:** `src/components/viewers/BlockModelRescView.tsx`
- UI Elements:
  - **Legend** bottom-left.
  - **Panel** top-right with classification, opacity slider, show traces.
- Easy customizations:
  - [ ] Panel layout (dropdown, slider, checkbox).
  - [ ] Default classification filter.
  - [ ] Opacity default.
- **Data required**:
  - `blockModelData` from `DataCache` with `RescCalc` values.

---

## 5) GeoVision Views (Three.js Scene in `src/components/views/geovision/*`)

These components render in the Three.js scene (no DOM UI by default). Add UI overlays as needed.

### 5.1 GeoVision Assay
**File:** `src/components/views/geovision/GeoVisionAssayView.tsx`
- UI Elements: none (scene-only).
- Easy customizations:
  - [ ] Add legend for assay gradient.
  - [ ] Add min/max labels or slider for cutoff.
- **Data required**:
  - Drillhole segments with `graphitic_carbon` and LineString coords.
  - Example segment (JS): `{ feature: geojsonFeature, graphitic_carbon: 2.5 }`.

### 5.2 GeoVision Lithology
**File:** `src/components/views/geovision/GeoVisionLithologyView.tsx`
- UI Elements: none (scene-only).
- Easy customizations:
  - [ ] Add legend for lithology colors.
- **Data required**:
  - Drillhole segments with `lithology` and LineString coords.

### 5.3 GeoVision Block RESC
**File:** `src/components/views/geovision/GeoVisionBlockRescView.tsx`
- UI Elements: none (scene-only).
- Easy customizations:
  - [ ] Add legend for RESC classification colors.
  - [ ] Add tooltip or hover details.
- **Data required**:
  - Block segments with `lon`, `lat`, `elevation`, `dX`, `dY`, `dZ`, `RescCalc`.

### 5.4 GeoVision Block Carbon
**File:** `src/components/views/geovision/GeoVisionBlockCarbonView.tsx`
- UI Elements: none (scene-only).
- Easy customizations:
  - [ ] Add legend for carbon thresholds.
  - [ ] Add opacity control.
- **Data required**:
  - Block segments with carbon property `Kr, GRAPHITIC_CARBON in GM_Litho: GRSC`.

---

## 6) Subsurface Views (Cesium + Three.js Overlay)

### 6.1 Subsurface Viewer
**File:** `src/components/viewers/SubsurfaceViewer.tsx`
- UI Elements: none by default, but this is the container for subsurface overlays.
- **Data required**:
  - `blockModelData` + drillhole data (via `BlockModelLayer` / `BoreholeLayer`).

### 6.2 Clipping Controls
**File:** `src/components/viewers/ClippingControls.tsx`
- UI Elements: panel top-left
  - Transparency slider
  - Show boreholes checkbox
  - Show block model checkbox
  - Clipping mode select
  - Clipping height slider (only when elevation mode active)
- Easy customizations:
  - [ ] Panel location (top-left vs top-right).
  - [ ] Slider/checkbox styling.
  - [ ] Labels and tooltips.
- **Data required**:
  - None (UI-only; it drives state in `subsurface-context`).

---

## 7) View-Specific Design Questionnaire (Copy/Paste Template)

Use this checklist for any new view or when revisiting an existing one.

### View Name: ______________________
- [ ] **Purpose**: What story does this view tell?
- [ ] **Primary data shown**: (e.g., drillholes, block model, KML boundary)
- [ ] **Primary interaction**: (pan/zoom only? filter? clip?)
- [ ] **Required overlays**: (legend, controls, tooltip, scale, compass)
- [ ] **Legend type**: categorical / gradient / none
- [ ] **Control panel location**: top-left / top-right / bottom-left / bottom-right
- [ ] **Controls needed**: sliders, toggles, dropdowns, buttons
- [ ] **Tooltip style**: (font size, color, positioning)
- [ ] **Default camera state**: (heading, pitch, zoom, bounds)
- [ ] **Animation**: (fly-to, cinematic sequence, reveal)
- [ ] **Accessibility**: contrast, font size, keyboard focus
- [ ] **Responsive adjustments**: hide panels on mobile? collapse to icon?
- [ ] **Branding**: logo visibility, color palette alignment

---

## 8) Quick “Easy Modifications” Checklist

- **Legend**: position, gradient colors, labels, icon size
- **Panel styling**: background opacity, blur, border radius, padding
- **Slider**: range, step, gradient track, label format
- **Dropdown**: size, background, hover style
- **Tooltip**: background, max width, data order
- **Buttons**: primary/secondary color, hover state
- **Default values**: transparency, filters, selection defaults
