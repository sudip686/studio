# UI Design Questionnaire & Customization Guide

This document captures **design questions, layout decisions, and easy-to-modify UI elements** for every view in the app. Use it when defining or revising UI design per view, or as a checklist when handing work to a designer.

---

## 0) Global UI & Layout (Applies to All Views)

### Global overlays (from `src/components/shared/GlobalOverlays.tsx`)
- [ ] **Logo placement**: Top-left slot. Should it stay visible on every view?
- [ ] **Compass placement**: Top-right on desktop / bottom-right on mobile.
- [ ] **Metric scale overlay**: Bottom-left. Should it be hidden for certain views?
- [ ] **Safe-area + sidebar padding**: Confirm header/sidebar offsets.
- [ ] **Alignment rule**: Left/right slots should anchor to the screen edge (within safe-area padding). Avoid offsetting right-aligned UI based on the chapter trigger width.
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
- **Prev/Next arrows**: left/right mid-screen for navigation. Next button always renders; disabled state only on the last slide.
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

---

## 9) VRIFY Deck Design System (Detailed Specification)

Use this section to recreate the VRIFY investor deck experience entirely within Studio. It covers foundations, shared components, interactions, assets, and per-slide requirements.

### 9.1 Design Foundations

#### Color palette
| Token | Value | Usage |
| --- | --- | --- |
| `brand.sunrise-start` | `#FF9D43` | Primary CTA gradient start, stat accents. |
| `brand.sunrise-mid` | `#F8731F` | CTA gradient mid tone, glow overlays. |
| `brand.sunset-end` | `#FF4D2D` | CTA gradient end, hover emphasis. |
| `surface.glass` | `rgba(255,255,255,0.05)` | Base fill for glass panels (hero container, legends). |
| `surface.glass-strong` | `rgba(255,255,255,0.10)` | Elevated tiles (stats, outlined buttons). |
| `surface.dark` | `rgba(0,0,0,0.40)` | Background for media frames, Cesium overlays. |
| `text.primary` | `#FFFFFF` | Headline text, CTA labels. |
| `text.secondary` | `rgba(255,255,255,0.70)` | Body copy, legends. |
| `text.muted` | `rgba(255,255,255,0.50)` | Helper text (“Drag to rotate”). |
| `border.glass` | `rgba(255,255,255,0.10)` | Panel outlines. |
| `shadow.primary` | `rgba(0,0,0,0.55)` | Default drop shadow for glass panels. |

#### Typography
| Token | Stack | Weight | Size / Leading | Description |
| --- | --- | --- | --- | --- |
| `type.display` | `"Space Grotesk", "Inter", sans-serif` | 600 | 40–48px / 1.25 | Hero headline, slide titles. |
| `type.title` | `"Inter", sans-serif` | 600 | 24–32px / 1.3 | Section headings, CTA prompts. |
| `type.body` | `"Inter", sans-serif` | 400 | 16px / 1.5 | Narrative copy. |
| `type.label` | `"Inter", sans-serif` | 500 | 11–12px / 1.4 | Uppercase pills and stat labels (tracking 0.3em). |

#### Spacing, radius, depth
- Base spacing unit: 4px. Default paddings: 24px (hero card), 16px (tiles, legends).
- Glass panels: radius 24–28px, `backdrop-blur-md`, shadow `0 25px 70px rgba(0,0,0,0.55)`.
- Buttons: pill radius with gradient fill; outline button uses 20% white border.
- Maintain safe areas (desktop 32px, tablet 20px, mobile 16px).

### 9.2 Shared Components & Patterns

| Component | File / Source | Layout Notes | Interaction |
| --- | --- | --- | --- |
| Hero overlay | `src/components/HeroOverlay.tsx` | Two-column glass card. Text column includes CTA pill, headline, body copy, stats grid (2×2 mobile → 1×3 desktop). Media column shows hero screenshot with gradient overlay. | Primary CTA triggers autoplay, secondary CTA opens VRIFY deck. Hero image scales to 105% on hover. |
| Stat tiles | — (inline) | Glass tile with border (10% white), value 24px, uppercase label tracking 0.3em. | Static; ensure contrast remains ≥4.5:1. |
| CTA buttons | Shared style | Gradient `sunrise-start → sunset-end`, black text, drop shadow `0 18px 45px rgba(255,120,58,0.45)`. Outline variant uses transparent fill + white/20% border. | Hover brightens gradient and scales 1.02×. Focus adds white outline (2px offset). |
| Title banner | `src/app/page.tsx` top-center | Glass pill for current slide title; fades on slide change. | 300ms opacity transition. |
| Chapter menu | `src/components/ui/chapter-menu.tsx` | Collapsible panel 320px wide. Burger trigger visible on mobile. Active item gets accent border + tinted background. | Clicking row updates slide index; include keyboard focus. |
| Legends & tooltips | `Legend`, `MetricScaleOverlay`, etc. | Glass background, secondary text color, border 10% white. | Hover raises border to 20%, tooltips remain 12px body text. |
| Autoplay controls | `src/app/page.tsx` bottom-center | Buttons follow CTA styling. Disabled `Next` sets 50% opacity and disables pointer. | Scroll throttle (1s) prevents accidental navigation. |

### 9.3 Interaction & Responsiveness
- Navigation: Scroll (throttled), Prev/Next buttons, Chapter menu selection.
- Autoplay: Each slide respects `durationMs`; stops at final slide and reverts CTA.
- Transitions: Title banner fade, hero hover zoom, CTA brightness.
- Responsive adjustments:
  - <1024px: hero becomes single column; stats tiles wrap to two columns; CTAs stack with 16px gap.
  - <768px: hide chapter list, rely on burger trigger; reduce hero padding to 16px.
- Accessibility: Maintain ≥4.5:1 contrast, provide focus outlines, ensure buttons reachable via keyboard.

### 9.4 Assets & Data
| Resource | Location | Notes |
| --- | --- | --- |
| Hero preview image | `public/Screenshot 2026-02-18 111036.png` | 1152×652 asset used in hero media. Load with `priority`. |
| Company logo | `public/A_Logo.png` | 415×416 emblem for LogoOverlay and optional hero pill. |
| Deck slides | `src/data/deck.ts` | Titles, subtitles, facts, camera presets, durations. |
| Chapter summaries | `src/data/chapters.ts` | Sidebar copy for storytelling. |
| Drillhole datasets | `public/assay_data.geojson`, `public/lithology_data.geojson` | Used across Cesium and Three.js drillhole views. |
| Block model data | `public/resource_model.bin`, `BlockModel.geojson` | Carbon probability and classification volumes. |
| Terrain assets | `public/terrain_meta.json`, `terrain_texture_8k.jpg` | Heightmap + texture for 3D terrain contexts. |

### 9.5 Slide Blueprint

| Slide ID | Story beat | Layout & Content | Data / Assets | Camera & Interaction |
| --- | --- | --- | --- | --- |
| `overview` | Introduce region | Hero context: show Tanzania location, overlay project title. | Base terrain + KML boundary. | FlyTo lon 39.05, lat -4.85, height 180k; autopan. |
| `licenses` | Exploration tenure | Emphasise permit polygon with label and quick stats. | `styled_kml`, annotation. | Height 42k, heading 10°. |
| `accessibility` | Logistics | Roads/villages overlay, highlight access corridors. | Ion imagery 3733958. | Height 48k, heading 20°. |
| `geology_map` | Regional geology | Geological raster + legend. | Ion imagery 3678736. | Height 42k, heading 18°. |
| `topography` | Terrain relief | Exaggerated terrain with KML overlay, optional callouts. | Terrain + KML. | Vertical exaggeration 1.5→1.0 transition. |
| `drillholes` | Drilling density | Gradient legend with annotation “High-grade corridor”. | `/assay_data.geojson`. | Height 22k; highlight callout. |
| `drillholes_lithology` | Lithology intervals | Categorical legend, optional filter panel top-right. | `/lithology_data.geojson`. | Height 26k, heading 12°. |
| `drillholes_assay` | Assay intervals | Gradient legend emphasising carbon percentage bins. | `/assay_data.geojson`. | Crossfade from lithology view. |
| `lithology` | 3D geology volumes | Three.js scene with categorical legend and helper text. | Lithology volume (GLB). | Auto rotate 10°; allow user interaction. |
| `assay` | 3D assay volumes | Gradient legend, opacity slider top-right. | Assay volume data. | Animate opacity from 0.3 to 0.8 over 1.5s. |
| `carbon_model` | Carbon probability | Block model view with trace toggle panel. | BlockModel GeoJSON. | Default cutoff 5%; allow toggling traces. |
| `classification` | Resource classification | RESC legend and closing CTA. | BlockModel `RescCalc`. | Provide follow-up CTAs (contact/demo). |

### 9.6 CTA Footer Template
- Headline: “Want to create your own VRIFY 3D Presentation?”
- Buttons: Primary gradient (“Get VRIFIED”), secondary outline (“Contact Us”).
- Layout: Glass panel centred, spacing 24px, CTA pill alignment matches hero pattern.

### 9.7 Maintenance Notes
- Source references: `~/vrify_assets` bundles and hero screenshot in `public/`.
- Review cadence: Audit quarterly or when VRIFY updates deck styling.
- Adding slides: Duplicate template in §7, append to blueprint table with data/camera notes.
- Cross-team workflow: Designers confirm gradients/blur; engineers ensure performance on mid hardware.

### 9.8 Diagram & Mockup References
Below are annotated diagrams that accompany the written specification. All assets live in `docs/assets/vrify/` so designers and developers can review them offline.

#### Global elements

![Hero overlay diagram](./assets/vrify/hero-layout-diagram.png)
*Hero overlay layout: callouts for CTA pill, headline, stat tiles, and media frame.*

![CTA footer layout](./assets/vrify/cta-footer-diagram.png)
*Closing CTA glass panel with gradient/outline button hierarchy.*

#### Slide reference gallery

- `overview`: ![Overview slide](./assets/vrify/slide-overview.png)
- `licenses`: ![License slide](./assets/vrify/slide-licenses.png)
- `accessibility`: ![Accessibility slide](./assets/vrify/slide-accessibility.png)
- `geology_map`: ![Geology map slide](./assets/vrify/slide-geology_map.png)
- `topography`: ![Topography slide](./assets/vrify/slide-topography.png)
- `drillholes`: ![Drillholes slide](./assets/vrify/slide-drillholes.png)
- `drillholes_lithology`: ![Drillholes lithology slide](./assets/vrify/slide-drillholes_lithology.png)
- `drillholes_assay`: ![Drillholes assay slide](./assets/vrify/slide-drillholes_assay.png)
- `lithology`: ![3D lithology slide](./assets/vrify/slide-lithology.png)
- `assay`: ![3D assay slide](./assets/vrify/slide-assay.png)
- `carbon_model`: ![Carbon model slide](./assets/vrify/slide-carbon_model.png)
- `classification`: ![Resource classification slide](./assets/vrify/slide-classification.png)

All diagrams were exported at 1.5× scale to keep annotations legible while keeping file sizes below 1 MB. If you update any slide, regenerate its companion image to maintain consistency.

### 9.9 Extending the Deck
Follow this checklist whenever a new slide or variant is added:
1. **Capture reference** – Export the corresponding VRIFY screen and add to `docs/assets/vrify/`.
2. **Update data** – Add a new entry in `src/data/deck.ts` with camera, subtitles, and duration.
3. **Document layout** – Append a new row to the Slide Blueprint table with layout, assets, and interaction notes.
4. **Specify controls** – Note any new UI panels, toggles, or legends required.
5. **Review interactions** – Confirm autoplay timing, transitions, and accessibility impact.
6. **Cross-check assets** – Ensure required datasets or Ion assets exist, updating §9.4 if necessary.
