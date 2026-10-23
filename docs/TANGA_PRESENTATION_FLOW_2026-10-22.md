# Presentation flow and VRIFY reference pass

## Design direction

The project is the hero: a large evidence canvas, one clear message per view,
compact controls, consistent typography, and a visible route through the story.
Interaction: advance through authored views, explore freely, recover the camera,
and disclose source detail on demand.

## References reviewed in Chrome

- Mithril, VRIFY 24464: 32-slide sequence. Editorial opening; common metric and aligned bars in 18–20; regional → property → mapped observations → geology → drilling → resource in 21–29; field photographs in 30–32.
- RUA, [VRIFY 24303](https://vrify.com/decks/24303): 19-slide sequence. Keep geography stable while changing one evidence layer; muted context, labelled targets, related source images and sections. Reviewed the regional and geophysics views.
- Discovery, VRIFY 24534: five-slide sequence. Facility footprints and fine leaders, followed by a muted surface roof over brighter subsurface evidence.
- Silver North, [VRIFY 24527](https://vrify.com/decks/24527): reviewed the 52-slide outline and slide 12. Its property map uses semi-transparent, category-coloured polygons, an anchored legend, and geographic labels over satellite context.
- Scorpio Gold, [VRIFY 24631](https://vrify.com/decks/24631): reviewed the 49-slide outline and its district geology / target views. The clearest pattern is one claim per view, labelled map features, a separate legend, and a map-to-target-to-resource sequence.
- Silver Tiger, [VRIFY 24392](https://vrify.com/decks/24392): reviewed the 74-slide outline. Its construction, mine-phase, exploration, and appendix sections show why long sequences need named chapters and a purposeful change of evidence at each step.
- [GeoLibre](https://web.geolibre.app/): reviewed its layer workspace. Separate layer naming, basemap context, opacity, and feature identification make map controls easier to understand.
- GitHub and Vercel: checked the current branch, latest preview entry, and deployment panel. The project branch remains the implementation source; the preview is access protected.
- Some first frames show loading or camera travel; detailed conclusions use the settled views and the supplied Tanga evidence. Reference assets and geological interpretations are not copied.

Additional primary design references:
- [VRIFY Present](https://vrify.com/product/present): combine source evidence and focused 3D views in one narrative.
- [Seequent Central visualisation](https://help.seequent.com/Central/en-GB/Content/guides/visualisation.htm): independent layer appearance, geology drapes and reproducible views.
- [Sketchfab lighting and shadows](https://sketchfab.com/blogs/community/how-to-fine-tune-your-lighting-and-shadows-on-sketchfab/): environment reflections and grounded shadows for physical materials.

## Acceptance checklist

- [x] Review the supplied VRIFY deck and open reference decks.
- [x] Geology: add an oblique mapped-surface stage before revealing separate interpreted volumes.
- [x] Geology: preserve orientation and camera framing during surface-to-depth reveal.
- [x] Geology: compact, reversible stage navigation; disclose approximate raster registration and model scope.
- [x] Geology: show clear unit boundaries with a softened, semi-transparent map overlay; retain the source palette and disclose unmatched model names.
- [x] Geology: distinguish the source map sheet from digitized project-map areas and the separate interpreted volume.
- [x] Peers: common linear bar scale, numerical values, clear dated benchmark basis and Tanga reveal.
- [x] Peers: declutter close globe markers without moving their geographic anchors.
- [x] All chapters: coherent next-view cue and current view progress.
- [x] All chapters: compact common presentation controls and consistent evidence-panel styling.
- [x] Review all 12 Tanga chapters in Chrome; check key geology, peers and phone layouts.
- [x] Review this pass, run typecheck and deployment build; push the branch and check the new Vercel deployment (Vercel status: success for `9e026dd`).

## Bright 3D and testwork follow-up

- [x] Bright, natural satellite-map surfaces for Three.js terrain views; keep categorical geology colours independent of the basemap.
- [x] Omit triangles bridging surveyed and regional elevation sources; retain every recorded height and leave the unverified join open. Hide incomplete scene assembly behind its loading status.
- [x] Use wall-clock camera travel and frame-time damping so slow frames do not stretch the instrument camera move or leave long orbit inertia. No FPS improvement is claimed.
- [x] Keep the camera focus ahead of fog, including portrait framing and direct jumps into the depth stage. Place the phone opacity control below the navigation instruments.
- [x] Absolute surface opacity 0–100%, including correct depth writes and an Auto restore.
- [x] Shared map/model rock palette; normalize GLTFLoader-sanitized unit names before matching. Unresolved model labels remain distinct.
- [x] Focus metallurgy on one instrument, one question and one reported test group.
- [x] Remove the competing full-bench transfers and seven basket buttons from the main view.
- [x] Add studio reflection lighting, cabinet plinths, contact shadows and instrument construction detail.
- [x] Keep actual microscopy, SEM and preparation figures available in a report-image dialog.
- [x] Replace the highest-point retaining plinth with a median-level illustrative cut/fill pad; preserve original terrain positions for a real before/after restoration. No engineered slope or earthworks quantity is claimed.
- [x] Daylight steel, corrugated roofs, safety rails, earthworks and water materials for the mine campus.
- [x] Use one facility selector and a primary plant action; remove the duplicated seven-button wall.
- [x] Limit whole-site key labels to pits, feed and processing; detailed facility views retain their own labels.
- [x] Review opacity endpoints, colour correspondence, every metallurgy instrument stage and mobile layout in Chrome.
- [x] Make drilling open on a high-clarity, near-opaque satellite surface; retain map controls and lower-opacity subsurface inspection.

## Purpose of each chapter

| Chapter | Distinct visual job |
|---|---|
| Project | Establish the landscape and project footprint |
| Tanzania | Move from country to coastal region |
| Work completed | Connect dated fieldwork, survey, estimate and testwork |
| Terrain | Read the measured surface and ridge profile |
| Drilling | Separate recorded observations from interpretation |
| Geology | Source → mapped surface → oblique terrain → interpreted depth → sample evidence |
| Resource | Relate the reported estimate to model location and grade |
| Peers | Compare contained graphite consistently, then insert Tanga |
| Mine concept | Follow pit, waste, feed, plant, services and water relationships |
| Metallurgy | Examine source testwork and material evidence |
| Infrastructure | Follow the material and export chain |
| Decisions | Close on the next questions for study |

## Evidence limits

Surface polygons are derived from a raster map with approximate grid registration;
they are not supplied geological shapefiles. Existing 3D contacts are a separate
interpretation. No grab-sample coordinates are invented. Peer ranking describes
the selected dated benchmark, not a current worldwide census. Mine facilities
remain illustrative and do not establish approved or engineered siting.
