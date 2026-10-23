# Tanga spatial registration audit

Date: 23 October 2026  
Status: source-data audit; no source coordinates or elevations were changed.

## Scope and reproducibility

This audit compares the supplied August 2025 survey DTM and borehole shapefile, the regional DEM, the checked-in presentation grids, the geology GLB, the AMC MRE collar CSV and every feature returned by the block-model API. The script is read-only and can be rerun with the source paths available on the project workstation:

```powershell
python scripts/audit_tanga_spatial_data.py `
  --survey-dtm "<survey deliverables>\DTM.tif" `
  --regional-dem "<Tanga3D>\dem_S05.tif" `
  --survey-collars "<survey deliverables>\BOREHOLE.shp" `
  --mre-collars "<MRE Extracted>\01 DB\CSV\DH_Collar.csv" `
  --block-model-url http://localhost:3000/api/block-model
```

The supplied project reports paths above are local workstation inputs and are not embedded in the deployed application. The API comparison ran against the local production server. It inspected 155,952 features.

## Findings

### Terrain and interpreted model

| Source | Horizontal reference | Relevant result |
|---|---|---|
| Survey `DTM.tif` | EPSG:32737, WGS 84 / UTM 37S; PixelIsPoint | 0.6554 m source spacing; elevation units metres; vertical datum not stated; valid survey bounds E 474,962.235–477,490.879 m / N 9,464,941.590–9,472,950.273 m |
| Regional `dem_S05.tif` | EPSG:4326; 1 arc-second | Raster does not declare elevation units or vertical datum. Used as broad regional context outside the valid survey mask. |
| Presentation terrain grid | EPSG:32737 | 7.42 m × 7.42 m sampling; origin matches the runtime project center; no vertical exaggeration |
| `geologicalModel.glb` | Source positions encode UTM-like X=easting, Y=elevation, Z=−northing | 452,386 vertices in seven meshes; interpreted horizontal bounds fall within the presentation terrain. Runtime local axes and elevation origin (700 m) reproduce those coordinates. |

All 100 depth-zero drillhole collars are inside valid survey coverage. Sampling each at the nearest source PixelIsPoint cell gives recorded collar elevation minus DTM values from −2.798 m to +7.517 m (median −0.054 m; mean +0.268 m; 95th percentile absolute difference 3.216 m). This is a nearest-cell comparison, not a vertical-datum correction or an accuracy estimate. Because the survey vertical datum is not stated, collar elevations remain as recorded; the drill traces are not snapped to the terrain.

### Survey collars and MRE collar CSV

The survey `BOREHOLE.prj` declares WGS 84 / UTM zone 37S (EPSG:32737). Its 100 point records match 99 viewer hole IDs exactly, with maximum XY residual about 1×10⁻⁹ m. The remaining survey ID is `TGDD1OO7` (letter O characters) while the viewer/MRE use `TGDD1007` (zero characters); its DBF elevation field is not populated. This is a probable ID transcription issue, not an automatic alias applied to source data.

The MRE `DH_Collar.csv` labels its coordinates `ARC 1960`, `UTM`, zone `37M` (EPSG:21037). After transforming those coordinates to EPSG:32737, 98 of the 100 MRE records are within 10 m of the viewer/survey coordinates; their median offset across all 100 is 4.807 m. Two IDs differ materially:

| MRE hole ID | Distance to same-ID viewer location | Nearest other viewer hole | Distance to nearest other hole |
|---|---:|---|---:|
| TGDD1037 | 199.190 m | TGDD1076 | 4.809 m |
| TGDD1076 | 189.597 m | TGDD1037 | 4.809 m |

The transformed locations are near one another's survey locations, suggesting a possible source-level exchange or other collar-record discrepancy. Do not swap them based on proximity alone. Reconcile against signed survey records and the final MRE collar validation before using these holes for spatial joins or public interpretation.

### Resource block geometry

The API returned 155,952 blocks. The GeoJSON point geometries are longitude/latitude; the `X` and `Y` properties are consistent with the AMC Arc 1960 / UTM 37M coordinate declaration. Transforming geometry from EPSG:4326 and properties from EPSG:21037 to EPSG:32737 yields a maximum residual of approximately 2.1×10⁻⁹ m. Every feature falls within the presentation terrain bounds. The earlier apparent ~319 m discrepancy was a CRS comparison error: raw Arc 1960 property coordinates had been compared with WGS 84 projected geometry. It is not a block-model displacement and no geometry correction is warranted.

## Release implications

- Keep source drillhole positions and elevations unchanged. Do not clamp traces to the DTM.
- Preserve the distinction between surveyed terrain and regional DEM context; the regional raster vertical reference remains unknown.
- Retain the current block-model transformation. Its GeoJSON geometry and source coordinate properties agree after the correct datum transformation.
- Keep a concise caveat in the drillhole evidence panel for the two unresolved MRE/survey collar locations; use this audit for the full explanation.
- Reconcile the `TGDD1OO7` / `TGDD1007` identifier and the TGDD1037/TGDD1076 positions with the authoritative source records before further spatial analysis.

## Evidence output

The audit script prints machine-readable JSON, including raster extents and metadata, collar-to-DTM statistics, collar source crosswalks, all block geometry residual statistics and interpreted-model coordinate bounds. It fails if core grid metadata, coverage masks, dimensions, or expected CRS relationships change unexpectedly.
