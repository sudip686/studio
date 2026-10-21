# Tanga: a distinct purpose for every chapter

Planning document · 21 October 2026 · audited branch `codex/tanga-investor-experience`, commit `4bfa2e1`.

## Recommendation

Rebuild the presentation around a journey through the actual work: **visit the site → understand the survey → inspect the samples → reveal the interpretation → examine the model → assess the development questions**.

Each chapter must answer one new question, show new evidence, and offer one useful interaction. Keep the brand, navigation, evidence access and spatial instruments consistent. Give the main content a different composition and task in each chapter. Additional camera angles qualify as story beats only when they expose something new.

Retain eleven core chapters. Move drilling before interpreted geology. Replace the opening peer leaderboard with a project introduction; keep peer benchmarking in an optional, dated appendix. Upgrade the existing closing decision summary into a source-linked account of completed work and the next decisions.

This pass is planning and source inspection. No application implementation or deployment is included.

## What was checked

- Inspected all eleven current chapters in an active local Chrome browser at 1366 × 768. Captures use reduced motion to compare settled compositions; this is not a full motion, mobile or deployment certification.
- Reviewed the current shot definitions, narrative mappings, layer controls, geology sections, drillhole journey, block assembly and metallurgy exhibit. Several useful interactions already exist; the redesign should make them clear and purposeful rather than duplicate them.
- Inspected the user's `documents_raw` directory, report contents and example aerial, core and microscopy images. Checked the referenced survey delivery alongside that directory.
- Verified current public product documentation from VRIFY, Seequent, Esri and DHResources. Used project manager/UI routing guidance, Sakariya Design and UI Expert. UI Expert supplied general design-system advice; the specific findings below come from the local audit.

Local audit artifacts: `output/playwright/tanga-phase3-audit/`. Use `*-active.png` for the eleven settled views. Earlier captures from the embedded browser were affected by its hidden-page state and are excluded from visual conclusions. `audit.json` records the active capture results; no uncaught page exceptions were recorded. This does not certify every network asset or interaction.

## Source findings that change the plan

Project root:

```text
C:\Users\SUDIPTA CHANDA\OneDrive - SAKARIYA MINES AND MINERALS PVT LTD\PC Backup (03-Sep-2026)\Mining_Geology_Research\02_Tanga_Graphite_Project
```

The requested `MinerU_output_20260801/documents_raw` directory contains 22 Markdown documents, 60 PDF files, 88 JSON files, 1,640 extracted JPEGs and two Excel files. These counts include extraction variants, report versions and academic material; they are not counts of unique project deliverables. Every Markdown image reference resolved when Windows long paths were handled correctly. Captions, sample identities and original PDF pages still require visual verification before reuse.

### A usable survey surface exists

The adjacent survey delivery contains:

```text
wetransfer_topofraphical-survey-report_2025-09-08_0738/
  DELIVERABLES_TANGA GRAPHITE PROJECT/
    SHAPEFILES AND RASTER FILES_WGS84 UTM ZONE 37S/
      DTM.tif
      SLOPE.tif
      contour 5M.shp
      BOREHOLE.shp
      BENCHMARK.shp
      WATER STREAM.shp
      BUILDINGS.shp
```

GeoTIFF header inspection found:

| Property | DTM | Slope |
| --- | --- | --- |
| Grid | 3,858 × 12,219 | 3,858 × 12,219 |
| Pixel spacing | approximately 0.6554 m | approximately 0.6554 m |
| Projected CRS code | EPSG:32737 | EPSG:32737 |
| File size | 125.4 MB | 188.6 MB |
| NoData tag | −32767 | −9999 |

Grid spacing is not a statement of positional accuracy. The DTM uses a point raster interpretation; the slope raster uses an area interpretation with the corresponding half-cell tie-point difference. Align these explicitly before overlaying them. Verify height encoding, vertical datum, slope units, valid survey coverage and surveyed collar elevations before generating presentation assets. ARC1960 versions also exist and must not be mixed with WGS84 without transformation.

The existing `scripts/gen_hires_terrain.py` describes a Copernicus approximately 30 m DEM resampled into a 2048 × 1940 project window. Increasing the output grid density does not add measured terrain detail. Reconcile the active binary's lineage, then use the survey DTM for the surveyed area. Retain a clearly distinguished regional surface outside that coverage.

The survey report describes LiDAR acquisition, bare-earth terrain, surface models, contours and RTK borehole surveys. The inspected delivery supplies a DTM, slope raster and vectors; a live point-cloud experience remains conditional on locating and validating an actual LAS/LAZ source. The report's point-cloud screenshot is useful evidence imagery, not a substitute for a 3D point cloud.

### Evidence assets to bring into the story

Paths below are relative to `documents_raw` unless noted.

| Source | Useful content | Intended chapters | Preparation |
| --- | --- | --- | --- |
| `SURVEY REPORT_TANGA GRAPHITE PROJECT/auto/...md` | Figure 3 aerial site photographs; survey equipment and RTK work; Figure 10 point-cloud overview; survey workflow | 1, 3, 4 | Verify original page/caption; curate genuine site imagery; retain survey date/source |
| Actual survey DTM, slope and vectors above | Terrain, slope, contours, streams, surveyed boreholes and benchmarks | 3, 4, 5, 8 | CRS/datum/NoData checks; collar comparison; tiled browser assets; verify line semantics |
| `TOPOGRAPHICAL MAP_*` sheets and N–S, E–W, NE–SW profile documents | Terrain and slope legends, documented surface profiles | 4 | Read original legends and profile endpoints; distinguish surface profiles from geological sections |
| `0424046 Tanga Graphite Mineral Resource Estimate - 19 December 2025/auto/...md` | Drilling photographs, logged core, QA/QC, interpretation, validation, reported model results and testwork | 3, 5, 6, 7, 11 | Use final source and effective date; extract exact figures/tables; separate report totals from rendered selections |
| `Merged_Petrography report_Tanga Graphite Project KD_SHD_SDD_MRK/auto/...md` | Photomicrographs, sample locations, core photographs and mineral observations | 5, 6, 9 | Resolve report versions; join BHID/sample/depth identities; preserve original scale bars |
| `Total_Petro_data_Tanga_MRK_v01/office/...xlsx` and `Tanga_All_Sample_Evidence_Harvest/office/...xlsx` | Candidate sample crosswalks linking laboratory/sample identifiers | 5, 6, 9 | Audit joins, duplicates and depth intervals before linking visual evidence |
| `6798- Sakariya Tanzanian Graphite - Final Report - Rev0/auto/...md` | IMO December 2025 sample provenance, optimisation and variability tests, grade/recovery profiles and size fractions | 9 | Reconcile individual and grouped values against original tables and test conditions |
| `Graphite report_SMMPL_12042025` and `PaulSam Study Report June,23 1` | Earlier work history and supporting project imagery | 3 and appendix | Keep dates/version context; do not replace later final results with earlier summaries |

Academic papers provide regional/method context, not photographs or measurements of Tanga. Ordinary report photographs are not 360 imagery. Original photography or video would support a future site-tour appendix if genuine source files are located.

## Audit of the eleven current chapters

| Current chapter | Observed issue | Decision |
| --- | --- | --- |
| 1 · The opportunity | Peer leaderboard dominates the opening; the globe is partly obscured; the audience learns more about other projects than Tanga. | Open on Tanga and the work completed. Move detailed peers to the appendix. |
| 2 · A place in Tanzania | Geographic orientation works, but contains peer/resource labels that repeat the opening and compete with locating the project. | Make this the only country-to-site locator; reserve performance evidence for later. |
| 3 · The project footprint | A boundary/collar map repeats the geographic format. Conceptual facility outlines appear before the development story. | Use the footprint to show actual survey/drilling coverage and completed work; defer the concept layout. |
| 4 · Read the ground | Pale, smooth terrain resembles a loose sheet; exposed rectangular edges and generic callouts weaken the sense of place. | Rebuild from the survey terrain and give the viewer a useful surface/slope/profile comparison. |
| 5 · Inside the geology | Brown translucent units read as a slab at the entry angle. Two sizeable technical panels crowd the scene even in presentation mode. | Make one clear host-rock reveal; present a section and a verified sample as evidence; put technical controls in Explore. |
| 6 · Test the interpretation | The entry camera sits near surface level; collars and labels are visible but much of the sampled trace is hidden by opaque terrain. | Lead with an authored cutaway and one recorded hole. Promote the existing drillhole journey. |
| 7 · Build the model | Block geometry is visible, but muted colours, surrounding terrain and generic labels do not explain what the model adds. The presentation hides the main grade legend. | Use a deliberate sample-to-model reveal and an always-readable active legend; explain the displayed population. |
| 8 · Shape a mining concept | Grade blocks repeat chapter 7; the plant and pits compete with several controls; the conceptual sequence can run ahead of the explanation. | Use an explicitly conceptual before/after terrain view, then show fit and connections rather than another block display. |
| 9 · From rock to concentrate | A large synthetic laboratory bench is distinctive but dominates the screen. Test evidence is a narrow side column with very small detail. | Make real samples, comparative test results and flake distributions the main subject. Keep the process illustration as support. |
| 10 · Connect to market | A useful route and elevation profile already exist. Multiple bright links and overlapping destination symbols obscure the primary journey. | Guide one site-to-port route; synchronise it with the profile. Show power/rail as separate optional layers. |
| 11 · The case and next steps | A four-part decision summary already exists, but large generic cards cover a repeated globe. Completed work and decisions are weakly linked to sources. | Close on a connected evidence-to-decision view with a short, specific next-work sequence. |

The small circular N at the bottom of development screenshots is the Next.js development indicator, not a second project compass.

## Proposed sequence: one question and one distinctive experience per slide

| New order | Chapter and purpose | Main visual and meaningful interaction | Source basis | Bridge to next chapter |
| --- | --- | --- | --- | --- |
| 1 | **Meet Tanga.** What is the project and why inspect this work? | Genuine aerial site image transitions into the matching project scene. One concise project statement and up to three verified facts. A prominent Begin action. | Survey aerial imagery; approved project facts | Where is this ground? |
| 2 | **Place it on the map.** Where does the project sit? | A single guided Tanzania → Tanga coast → project arrival. A small locator remains during the descent. Tanga is the focus, with restrained country/region labels. | Source location maps; verified coordinates | What has been done here? |
| 3 | **Show the work completed.** What evidence has the team produced? | A dated work sequence with genuine survey/drilling/core photographs. Choosing a work stage highlights its actual spatial coverage. Boundary is context. | Survey report, surveyed collars, AMC work history and dated reports | What does the measured land surface look like? |
| 4 | **Read the landscape.** How does relief vary across the site? | Survey DTM in a low oblique composition, followed by Surface / Slope / Profile states. A profile cursor highlights the same point in 3D. One selected ridge/valley, supported by real survey data. | DTM, SLOPE, 5 m contours and surface profiles | How was the ground sampled? |
| 5 | **Follow a recorded hole.** What did we observe below surface? | The existing drillhole journey becomes the authored main event: collar → recorded intervals → selected assay. A linked core strip shows the corresponding sample only where identity/depth matching is verified. Other holes remain quiet context. | Surveyed collars; assay/log records; verified core images | How do those observations inform geological interpretation? |
| 6 | **Reveal the host rock.** How are samples related in three dimensions? | Terrain opens to expose the graphitic host while other units recede. One real model section is paired with its locator. A sample lens can connect a verified core/micrograph to its recorded hole. | Supplied unit meshes, model intersections, petrography and sample crosswalk | What spatial estimate was built from that interpretation? |
| 7 | **Understand the model.** What does the reported model represent? | Promote the existing block assembly as a spatial reveal, then compare Grade / Reported classification using only available attributes. An active legend and small source summary remain visible. Optional sample-versus-model section explains the evidence relationship. | Registered blocks and final AMC report | What development questions follow from this geometry? |
| 8 | **Fit a concept to the ground.** How could the components relate spatially? | Existing ground ↔ conceptual excavations and facilities, at the same camera position. One path connects pit → ROM → processing; illustrate connections without simulating production. Show one relevant footprint/terrain constraint at a time. | Survey terrain and vectors; existing conceptual geometry; stated assumptions | What do real processing tests show? |
| 9 | **Examine the test results.** How do the tested samples differ? | A specimen/micrograph lens and a clear chart of concentrate TC, recovery and flake-size fractions for the tested composites. Selecting a sample updates all measures and its source. A compact process diagram explains the sequence; the lab bench moves to optional detail. | Final IMO testwork; AMC tables; verified sample identities and microscopy | How does the site relate to transport infrastructure? |
| 10 | **Follow the connection to port.** What is the geographic route? | A restrained route flyover with a synchronised distance/elevation profile. Scrubbing the profile moves the marker along the route. Power and rail are separate choices with their own basis. | Verified route geometry, elevation sampling and documented infrastructure locations | What has been demonstrated, and what decision comes next? |
| 11 | **Turn evidence into next decisions.** What progress is demonstrated and what work remains? | A connected overview of Survey → Samples → Geology → Model → Development studies. Select an evidence node to revisit its chapter or source. Show three clearly stated next decisions with their required evidence. | Audited source register and chapter conclusions | Explore evidence / Q&A / source dossier |

This swaps the current drilling and geology chapters. It also repurposes the current footprint slide to show completed work. Peer comparison remains available once in a dated appendix; it does not recur as a second narrative ending.

## Three features that make this recognisably Tanga

1. **A measured landscape with distinct display zones.** Keep the detailed survey area as the focus, a quiet surrounding terrain band for context, and a subdued regional landscape beyond it. NoData boundaries and survey coverage stay truthful. Alternate genuine site photography and measured terrain to establish place without claiming an exact photographic camera match unless it is known.
2. **A traceable sample journey.** Where the source crosswalk supports it, follow the same BHID/sample/depth from the 3D hole to core, petrography and laboratory results. If a join is missing, present a separately identified example instead of inventing a connection.
3. **A landscape-to-model reveal that retains spatial orientation.** Use consistent coordinates and orientation as surface, samples, interpreted host and blocks appear. Each layer answers a different question; the animation communicates display order, not geological formation, interpolation history or increased certainty.

## Terrain redesign in detail

1. Validate DTM and slope metadata, height values, nodata masks and collar elevations. Check the survey footprint against the provisional presentation boundary. Keep measured collar positions and elevations; do not hide registration problems by silently moving holes to a different surface.
2. Generate a browser-friendly multiresolution terrain asset from the survey DTM. Keep finer geometry near the subject and progressively coarser geometry farther away. Do not send the full 125 MB TIFF to every viewer.
3. Render genuine imagery only where georeferenced coverage is validated. Repair texture coverage/NoData problems before increasing exposure or colour saturation. Provide a restrained shaded-relief material as an explicit alternative.
4. Blend the survey surface into a separately identified regional context; avoid a bright, floating rectangular sheet. For an isolated terrain exhibit, a deliberate cut edge/base may be used, clearly as a display treatment rather than geological thickness.
5. Use a low oblique camera across the dominant landform with a visible horizon/context, then hold. Select the final angle from actual relief and valid survey coverage. Add a stronger close view only when it reveals a specific ridge or valley.
6. Start with 1× vertical scale. If an exaggerated display is useful, label it and apply the same transformation to terrain-bound overlays, markers and profiles. Compute slope/elevation readouts from the unexaggerated source.
7. Use directional light from across the slope, controlled fill and restrained shadows. Avoid the uniformly pale material and strong general glow. Preserve visible ridge/valley contrast without hiding the dark faces.
8. Show a small active-mode legend, zoom-aware scale and north orientation. Add a vertical ruler only when it explains a section. Avoid generic cards that merely say a DEM is being displayed.

## Visual and interaction system

- Use Sakariya Coal Black `#020100`, Alloy Orange `#C7551B`, Warm Grey `#A89C94`, Dark Brown `#41200E` and Light Beige `#F5F3F0`. Keep scientific grade/lithology colours where they encode data. Reduce cyan decoration outside meaningful data/instruments.
- Use one brand/title header, a compact chapter counter and consistent Prev/Next controls. Remove duplicated chapter titles and confusing micro-step counters. Technical tools open through Explore; the primary story works without voice commands.
- Keep at least about 70% of the presentation viewport available to its main visual at laptop size. Use a consistent annotation style and safe margins; allow a few deliberate compositions: full-screen scene, scene with evidence rail, paired section, specimen/chart and connected roadmap.
- One clear headline, one evidence takeaway, at most two primary anchored callouts in the entry view. Show full tables and source pages in a single evidence drawer, opened on request. Avoid simultaneous left and right control panels in presentation mode.
- Always retain the legend essential to interpreting the active scientific colour. Hide expert controls, not the meaning of the data.
- Camera moves should arrive, reveal, then hold. Navigation and reading should not depend on a continuous orbit. Existing drillhole journey, geology sections and block reveal should be promoted and simplified before adding new controls.
- Use approximately 2–4 second transitions as a starting point, immediate pause on manual interaction, and a reduced-motion path with the same evidence. Do not force autoplay to advance a reader or require audio.
- Mobile should show the main subject first, with a collapsible evidence sheet and compact touch controls. A scrolled data table must not occupy the majority of the initial view.
- Preserve Next.js, Cesium/MapLibre, Three.js and overlay slots. Author per-chapter camera/layer/evidence states rather than creating a second viewer architecture.

## Reference patterns and how to apply them

| Verified reference | Relevant pattern | Application to this plan |
| --- | --- | --- |
| [VRIFY Present topography](https://help.vrify.com/en/articles/15809380-customize-topography-in-a-3d-slide-beta) | Independently styled property, surrounding and regional terrain zones | Focus detailed survey terrain and quieten regional context; avoid a single uniformly coloured terrain sheet |
| [VRIFY Present features](https://help.vrify.com/en/articles/15201357-getting-started-with-vrify-present-beta) | Terrain objects, drillholes, blocks, images, X-ray, labels, compass and scale | Combine real evidence with the 3D view; use controlled terrain transparency for subsurface explanation |
| [VRIFY Present](https://vrify.com/product/present) | 3D, corporate slides and genuine 360/site imagery within one presentation | Vary the medium when evidence calls for it; keep a coherent presentation shell |
| [Seequent Central visualization](https://help.seequent.com/Central/en-GB/Content/guides/visualisation.htm) | Structured object visibility, sections, legends and shared 3D investigation | Provide rigorous Explore controls and source access without crowding the authored investor view |
| [Esri: making the most of immersives](https://www.esri.com/arcgis-blog/products/story-maps/sharing-collaboration/making-the-most-of-immersives) | Map choreography, guided journeys and variation in media/narrative layout | Let every chapter introduce new evidence or a new scale; use photographs, sections and charts to give the story rhythm |
| [DHResources interactive modules](https://www.dhresources.com.au/features) and [viewer demonstration](https://www.dhresources.com.au/) | Project context, drillhole inspection, sections and guided infrastructure tours | Make the drillhole and port-route interactions answer concrete investor questions |

These are documented product patterns, not claims that we tested authenticated authoring tools or every public example deck.

## Evidence rules

- Maintain a per-claim register: source file, report version/date, printed page, table/figure, units, displayed population, qualification and review status.
- Reconcile legacy text, notes and command responses with the final sources. Some older narrative strings contain ownership, permit, product-market or confidence claims not established by the current spatial presentation.
- Keep measured samples, interpreted contacts, estimated blocks and conceptual development visibly distinct. Classification is not a directly measured uncertainty probability.
- Report resource figures only as attributed published/report values with their effective date and reporting basis. Do not derive a new resource or reserve from rendered block counts. Treat this app's 3% filter as a display threshold; preserve the final report's own terminology when explicitly citing its result.
- Reconcile the laboratory summaries with the final IMO tables before presenting them as verified. Keep TC grade, recovery and flake-size fractions distinct, and show variability rather than only the strongest sample. Testwork does not establish product qualification or commercial performance.
- Separate direct distance, routed distance and estimated travel time. Mapped infrastructure does not establish secured access, capacity or a project connection.
- Preserve the provisional boundary qualification until authoritative legal geometry is reconciled. Survey coverage and a reported licence number do not alone validate the app's polygon.

## Build sequence after this plan

| Stage | Deliverable | Completion condition |
| --- | --- | --- |
| 1 · Source and registration | Curated evidence manifest; survey DTM/slope/collar comparison; corrected asset mapping | Reproducible provenance, correct CRS/units and valid coverage; no silent source substitutions |
| 2 · Establish the visual standard | Rebuild terrain, recorded-hole evidence and testwork results as three deliberately different chapter types | Each is legible, purposeful and materially stronger at laptop and phone sizes |
| 3 · Build the full sequence | Apply the eleven-chapter storyboard; simplify existing geology/blocks/concept tools; integrate photographs and sources | Every chapter adds evidence, a decision or a useful change of scale; repeated generic beats removed |
| 4 · Rehearse and deliver | Desktop, tablet, mobile, reduced-motion and share-link walkthrough; branch preview using Vercel and Cloudflare R2 | All eleven chapters and their primary interaction load correctly; no overlap, hidden evidence or missing essential assets |

The first implementation should establish terrain quality before propagating that surface into other scenes. Preserve registered geological/block data while resolving any vertical-datum issues.

For delivery, keep lightweight application code on Vercel and versioned large terrain/media/model assets on R2. Validate the manifest and CORS for preview and production origins. The current browser audit also encountered missing R2 `generated/boundaries.geojson`, `generated/roads.geojson` and `generated/orewaste-reference.json`; corresponding local files exist. Resolve that mapping or upload path before final presentation rehearsal.

## Acceptance criteria

1. Someone seeing a slide without narration can state its question and main evidence within a few seconds.
2. Every consecutive chapter introduces a new data item, relationship, decision or scale; changing only the camera zoom does not qualify.
3. The terrain looks like measured ground, with a clear source/coverage basis, appropriate lighting, no unexplained sheet edges and no false surface detail.
4. The drilling entry view exposes sampled intervals; the geology view exposes the relevant host; the model view has an active legend. No key subject is covered by controls.
5. Source-backed media appear in the main narrative, not only in appendices. Photographs, samples, sections and lab records have verified identities and captions.
6. Completed work is explicit in chapter 3; next development decisions are explicit in chapter 11. The presentation communicates progress without suggesting that a concept is an engineered operation.
7. Check all eleven chapters at 1920 × 1080 and 1366 × 768, plus tablet 1024 × 768 and phone 390 × 844. Check touch/keyboard, reset-to-view, section/sample selection, motion pause and reduced motion.
8. On slow connections or failed assets, show a useful, labelled fallback and a retry path. The story must remain understandable without a microphone or audio.
9. Confirm that the actual deployed asset set matches the approved branch preview. Verify GPU performance on representative devices before assigning a performance guarantee.

## Immediate next deliverables

Prepare a source manifest and three concrete prototypes: **survey terrain**, **one recorded hole with its evidence**, and **comparative testwork results**. Use those to establish the visual standard, then complete the other chapters according to the matrix above.
