# Geological map to depth

## Delivery checklist

- [x] Inspect the supplied December 2025 MRE extraction and original map figure.
- [x] Identify Figure 2.1 correctly: regional Tanzania geology, report p.8 / PDF p.18, after Geological Survey of Tanzania (2015), provided by Grapeak.
- [x] Retain the existing detailed project geological map, its lithology legend, coordinate grid, scale and north arrow.
- [x] Provide a selectable MRE regional reference, original-resolution links and document zoom up to 300%.
- [x] Add four authored geology views within chapter 07: original map, model plan, 3D interpretation and interpreted section.
- [x] Project the existing model in a true north-up parallel projection, retaining its UTM registration and geometry.
- [x] Use a fitted plan camera, a subdued terrain roof and the existing orange host highlight; retain the same unit colours between plan and depth.
- [x] Restore perspective and orbit controls for the 3D tilt, section, camera reset and below-ground presets.
- [x] Use the orthographic camera for plan picking and the same projection for compass, scale and annotations.
- [x] Remove distance fog in plan so the fitted overhead camera cannot hide the geology; restore the authored atmosphere in 3D.
- [x] Defer plan commands during model loading; cancel stale camera/rotation/explode transitions on plan entry.
- [x] Keep the source document separate from the model; do not fabricate raster registration, contacts or an extruded geological model.
- [x] Source entries and reproducible asset provenance; original figure byte copy, no modified source image.
- [x] Pause guided playback during map inspection; give the geology chapter 36 seconds and update the full guided tour label to 4m 40s.

## Source and geometry limits

The MRE's map is **regional context**, not a detailed geological plan of the deposit. The detailed map at `/geology_map.jpg` is an existing project asset; its source date and image-to-ground registration have not been independently reconciled. It is therefore displayed as an original document, without draping it onto the DTM.

The next view is an orthographic projection of the already registered `geologicalModel.glb` volumes. It is explicitly a **model plan**, not an outcrop map or a newly digitised interpretation. The transition into depth changes the projection and camera, not vertices, elevations, geological contacts or drillhole coordinates. Orange remains the existing model host highlight; source map colours retain their original legend.

The existing PerspectiveCamera remains the OrbitControls navigation driver. During plan viewing its projection matrix and inverse are copied from an OrthographicCamera, whose span tracks the existing dolly distance. The same OrthographicCamera receives the world transform for picking. This preserves existing pan/zoom behaviour and correct screen anchors without rebuilding the viewer or its controls.

Reproduce the MRE figure and manifest:

```powershell
python scripts/derive-geology-story-assets.py '<MRE report auto folder>'
```

Manifest: `public/generated/geology-map-source.json`.

## Verification

- TypeScript compilation passed in the final production build.
- `npm run cf:build` passed: Next production output, service worker, OpenNext Worker bundle and Cloudflare asset preparation. Windows/OpenNext and React 18 deprecation warnings are existing environment limitations.
- Chrome desktop: both source maps load; map zoom and source switching work; plan compass reads 0 degrees and fitted model remains visible; perspective transition and reverse navigation work.
- Below-ground preset verified at camera y=-980 against target y=-250; invoking it directly from plan also updates the story to the 3D view.
- Chrome 390 x 844: document width remains 390, full map and original legend are visible, and the primary advance action appears before longer scrollable copy. Viewport restored afterwards.
- UI Expert consulted for layout/accessibility considerations; local source and camera-flow review completed. No geological mesh or drill coordinate edits.
- Deployment destination: existing branch preview and draft PR #51; production promotion remains separate.
