# Tanga geology polygon and map-registration audit

Date: 23 October 2026
Branch: `codex/tanga-investor-experience`
Scope: visual QA of the checked-in map and derived surface polygons. The source raster and coordinates are unchanged. A narrow, graphitic-schist-only raster cleanup was applied and its effect recorded below.

## Evidence reviewed

- `public/geology_map.jpg`, 1,240 × 1,755 px, with the printed UTM grid and seven-unit legend.
- `public/generated/geology-surface-polygons.json`, whose provenance points to that map.
- `scripts/derive-geology-polygons.py`, which creates colour masks, closes 5 × 5 px gaps in graphitic schist and 3 × 3 px gaps in other units, simplifies contours, and retains holes.
- A source-map overlay rendered from the GeoJSON using its documented grid transform. The overlay was inspected at full resolution.
- The supplied `documents_raw` report tree was searched for GIS vector files (`.shp`, `.gpkg`) and source elevation rasters (`.tif`, `.tiff`). No such project GIS files were found in that tree. This does not establish that no authoritative files exist elsewhere.
- The December 2025 MRE and April 2025 graphite report text were searched for sample-specific grab-sample coordinates and IDs.

## Registration check

The map has four labelled vertical grid lines and five labelled horizontal grid lines. Pixel positions below are measured at the centre of the printed grid line; double-width antialiased lines are represented by their centre pixel.

| Axis | Printed coordinate | Measured image pixel | Pixel predicted by current transform | Residual |
|---|---:|---:|---:|---:|
| E | 474,000 m | 174 | 174.0 | 0.0 px |
| E | 476,000 m | 477 | 476.5 | +0.5 px |
| E | 478,000 m | 779.5 | 779.0 | +0.5 px |
| E | 480,000 m | 1,082 | 1,081.5 | +0.5 px |
| N | 9,472,000 m | 328 | 328.0 | 0.0 px |
| N | 9,470,000 m | 630.5 | 631.0 | −0.5 px |
| N | 9,468,000 m | 933.5 | 934.0 | −0.5 px |
| N | 9,466,000 m | 1,236.5 | 1,237.0 | −0.5 px |
| N | 9,464,000 m | 1,539 | 1,540.0 | −1.0 px |

Independent least-squares pixel-to-grid fits across all four easting lines and all five northing lines have maximum image-space residuals of 0.20 px. The current transform is within 1 px of every measured line centre. At the map's approximate 6.6 m/px scale, this is an internal printed-grid fit check, not a surveyed positional accuracy. The raster does not independently establish its datum, map date, control-point quality, or the accuracy of any digitized contact.

## Polygon review

All seven feature names and swatch colours match the map legend. The source-aligned overlay confirms that broad coloured bodies occupy the corresponding printed map areas. It also shows raster-derived artifacts: thin drainage/road/linework interrupts masks, creating narrow cuts, tiny fragments and apparent holes. This is most visible in the Graphitic schist feature.

| Map unit | Polygon pieces | Rings including holes | Coordinate vertices |
|---|---:|---:|---:|
| Graphitic schist | 73 | 95 | 1,738 |
| Khondalite | 28 | 29 | 416 |
| Kyanite sillimanite schist | 1 | 1 | 7 |
| Mafic granulite | 20 | 21 | 275 |
| Quartzofeldspathic rock | 12 | 12 | 115 |
| Quartzite | 24 | 24 | 260 |
| Crystalline limestone | 1 | 1 | 8 |

The counts are a QA signal, not a geological count. A hole in a colour mask may be an overprinted symbol, line, soil gap, or actual uncoloured area. The raster alone does not support deciding which. For the visibly fragmented graphitic-schist class only, a 5 × 5 px morphological closing now bridges narrow raster interruptions (about 33 m at the printed-grid scale). This reduced its pieces from 95 to 73 and its holes from 48 to 22. The original colour threshold, larger gaps and outer contours are retained; this is scan cleanup, not a geological reinterpretation or authoritative contact repair. Keep the UI disclosure that these are digitized map polygons, approximately registered, and not surveyed contacts. Original GIS remains necessary for exact contacts.

## Grab-sample locations

The December 2025 MRE text reports 155 reconnaissance grab samples and 170 detailed-mapping grab samples, as well as pit and channel samples. The reviewed report text gives aggregate counts but yielded no per-sample grab IDs paired with coordinates. The separate local sample-evidence workbook contains drill-core interval entities with calculated midpoints and is explicitly marked confidential; those points are not surface grab-sample locations and must not be repurposed as such. No grab-sample markers were added. A source register with surface sample IDs and verified coordinates is still required to show them.

## 3D map footprint check

The local production view `?view=plan#subsurface` was inspected at 1,440 × 900. The north-up drape fits the full mapped surface extent inside the displayed terrain patch, while surrounding terrain imagery remains visible as context. The existing camera fit uses the mapped extent and viewport aspect ratio; the geology surface is not stretched to fill the canvas. No camera or geometry change was warranted by this check. The map basis remains approximate printed-grid registration, and the context must not be read as extending survey coverage beyond its source mask.

## Decision and follow-up

- Printed-grid registration has been checked against all visible labelled grid lines. No registration edit is justified by the residuals.
- The north-up mapped-surface view was checked at desktop size; existing extent-aware framing preserves the complete drape and surrounding terrain context without distorting the map.
- The polygon source check is complete, with raster contamination and fragmentation recorded. Narrow graphitic-schist interruptions have limited scan cleanup; exact contact repair remains dependent on authoritative shapefiles/georeferenced source data or a reviewed digitization.
- No grab-sample coordinates were added. The report-text check and sample-type distinction are recorded above; reconsider markers only when a source register pairs surface sample IDs with verified coordinates and provenance.
- The map should remain a translucent surface overlay over the existing terrain, with regional context clearly separate. Do not use the map raster as elevation or project these surface colours into the interpreted depth model.

## Follow-up: source-map soil-cover category

The source sheet's legend contains Soil cover in addition to the seven coloured rock units. The earlier 3D legend omitted this class. The generator now traces the pale soil-cover raster pixels, clips them to the map's existing approximate mapped footprint, and draws the class beneath the seven rock layers. The generated soil-cover feature is one outer polygon with 64 interior rings; it retains map gaps rather than inventing a continuous surveyed soil boundary. This is a more faithful rendering of the source symbol, not an authoritative GIS polygon.

The 3D legend and shared-view state now expose eight map classes. Soil cover uses a restrained base tint; the seven rock layers keep their source swatches and remain individually toggleable. A visibility check confirmed the soil layer can be hidden independently. Desktop production captures at 1366 × 768 and 1707 × 842 are recorded in `.playwright-mcp/geology-soil-1366-final.png` and `.playwright-mcp/geology-soil-final-desktop.png`; the 1366 × 768 relief capture is `.playwright-mcp/geology-soil-relief-1366-retry.png`. For the graphitic-schist scan artifacts, the generator now closes only 5 × 5 px gaps (about 33 m at the printed-grid scale); its output decreases from 95 to 73 pieces and 48 to 22 holes. The original raster swatch threshold is unchanged, and larger gaps remain. The stage-01 source map now works as a smaller reference card over a visible 3D scene, keeping the story/navigation controls in view while the traced geology remains the visual focus. These are display improvements, not authoritative contact corrections; the original shapefile/georeferenced layer remains necessary for exact boundaries.
