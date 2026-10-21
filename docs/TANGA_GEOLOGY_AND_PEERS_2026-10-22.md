# Geological overlay, camera transition and peer chapter

Visual thesis: the ground stays the dominant image, with source-coloured rock polygons and a restrained edge inspector.

Content plan: source sheet → transparent mapped rock polygons on terrain → existing 3D interpretation → resource estimate → dated peer comparison → conceptual development.

Interaction thesis: preserve spatial registration while tilting from north-up plan toward the horizon; link each peer row and numbered globe marker to one selection; recover the whole globe with one action.

## Checklist

- [x] Inspect VRIFY 24464 slide 26 in Chrome: bedrock colour polygons over terrain, transparent outside mapped areas.
- [x] Inspect VRIFY 24303 slide 7: terrain overlay, compact anchored labels and distinct evidence layers.
- [x] Search local project data for original geological shapefiles. The available shapefiles are topographic features; no geological polygon file was found.
- [x] Digitize seven rock types from the existing project sheet. Retain original legend colours; omit soil, roads, drainage, text and map furniture.
- [x] Register vectors approximately from three printed UTM grid intersections and retain processing/source provenance.
- [x] Drape vectors on the existing terrain; preserve source geological-model vertices and drilling coordinates.
- [x] Provide overhead plan → near-horizontal model camera, with a surface-layer fade.
- [x] Search reports for grab samples. AMC §3.1 describes 155 reconnaissance and 170 detailed-mapping grab samples. Usable coordinate records were not found; point locations are withheld.
- [x] Move peer comparison immediately after the resource chapter, including chapter navigation and guided route.
- [x] Keep globe visible between narrow edge columns; provide selectable peer rows and on-globe pins with common selection.
- [x] Preserve the historical benchmark basis and fifth-of-eleven Tanga calculation.
- [x] Review desktop and phone screenshots; verify globe pin/row selection, source map, plan and depth transition.
- [x] TypeScript and production/Cloudflare build.
- [ ] Commit/push branch and verify Vercel preview.

## Source and limits

`scripts/derive-geology-polygons.py` produces `public/generated/geology-surface-polygons.json` from `public/geology_map.jpg` using colour segmentation. It records the source SHA-256, grid tie points and processing steps. These are derived vectors, not original shapefiles. Map date, coordinate datum and contacts need independent verification. Raster digitization retains approximate shapes and can omit small or faint mapped areas. No image contacts are extruded into 3D; the existing model is a separate interpretation.

The displayed project locations in the peer dataset are approximate. The comparison uses the dated 2023 published M&I contained-graphite set with an updated Epanko entry, and adds only Tanga's 148 Mt Indicated portion at 4.94% TGC (7.31 Mt contained graphite). It does not establish a current global top-ten census.

Reference decks: https://vrify.com/decks/24464 and https://vrify.com/decks/24303. No reference-deck assets or geological data were copied.

## Local review

Verified seven surface units; north-up orthographic view and restored perspective at the low authored angle. Source GLB bounds and vertex data remain unchanged. The polygon layer fades while the existing model appears. Camera far clipping now covers the overhead map distance. Cross-section labels are suppressed in map plan.

Desktop globe reviewed with narrow edge columns. The list selected Lac Gueret and turned to Canada; the Sarytogan globe pin selected the corresponding list row. Phone selector chose Siviour and turned to Australia. The 10 → 11 comparison recalculated Tanga to fifth. Chapter labels show geology 06, resource 07, peer comparison 08, mine concept 09.

Phone review at 390 × 844 includes compact map legend and purpose controls. TypeScript and the Cloudflare/Next.js production build passed. Console checks on the reviewed local scenes showed no runtime errors.
