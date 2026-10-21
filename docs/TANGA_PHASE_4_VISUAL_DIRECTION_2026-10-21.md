# Tanga: next visual direction

Research and proposed work · 21 October 2026 · builds on `codex/tanga-investor-experience` / `1ae273b`.

## Direction

Give Tanga the precision of a geological model and the composition of a documentary: natural land, clear subsurface reveals, genuine field evidence, restrained Sakariya copper accents, and deliberate pauses.

The current deck already contains authored shots, a compass, scale, slope/profile controls, sections, a sample crosswalk, model filters, a concept sequence, a route profile and source drawers. The proposals below extend those features. They are design recommendations, not claims about changes already made.

Professional consistency should come from typography, controls, spacing and evidence treatment. Chapter uniqueness should come from the subject, camera composition and the question being answered.

## Verified references

- [VRIFY Present](https://vrify.com/product/present): combined interactive models, site imagery, corporate content and presentation delivery.
- [VRIFY topography customization, beta](https://help.vrify.com/en/articles/15809380-customize-topography-in-a-3d-slide-beta): separately styled property, surrounding and regional terrain zones; independent styles and surrounding distance. Its named zones do not establish Tanga's legal property extent.
- [VRIFY camera guidance](https://help.vrify.com/en/articles/12169422-change-the-camera-angle-on-3d-and-360-slides): save starting viewpoints and avoid extreme zoom/wide angles.
- [VRIFY readability guidance](https://help.vrify.com/en/articles/16766763-slide-readability-best-practices): muted background colours, relevant labels only, projection-readable type and focused layer density.
- [VRIFY X-ray, beta](https://help.vrify.com/en/articles/15853430-add-an-x-ray-effect-to-a-3d-object-beta): preserve the visibility of objects obscured by terrain or other models.
- [VRIFY images within 3D scenes, beta](https://help.vrify.com/en/articles/15809945-add-2d-images-to-a-3d-slide-beta): images and cross-sections positioned in a scene, with billboard or topography-drape options.
- [Shapespark camera](https://help.shapespark.com/hc/en-us/articles/360009384478-Camera): exposure, field of view, colour treatment and camera navigation.
- [Shapespark walkthroughs](https://www.shapespark.com/industries-architecture-and-interior-design): defined views, guided tours, realistic lighting, information hotspots and selectable configurations.
- [Esri scene presentations](https://www.esri.com/about/newsroom/arcwatch/share-a-3d-scene-in-a-presentation): saved viewpoints, lighting states and slices in a guided presentation.
- [Matterport guided-tour guidance](https://support.matterport.com/s/article/Guided-Tour-Best-Practices?ardId=kA05d000001DX1kCAG&language=en_US): curated highlights, camera ordering and shorter tours. The indexed article was available; the direct support page returned a loading/CSS error during this research.

These document transferable product patterns. The lighting recipes, camera angles and layouts below are proposed specifically for Tanga; they are not documented settings copied from those companies. VRIFY beta features are labelled as such. No access to private customer presentations is implied.

Route used: local project manager, UI/UX and reviewer guidance; frontend design skill; official web documentation; UI Expert for general critique. UI Expert returned generic design-system advice rather than a visual inspection, so the concrete decisions below come from the code and existing browser captures.

## 1. Style the land in three levels

**Priority: first. Chapters 1, 4, 5, 7 and 8.**

Keep the surveyed area as the detailed foreground. Give nearby regional terrain a muted olive/slate surface, then fade the distant context into the background. Replace bright exposed tile edges with a restrained rendering boundary or context skirt outside the data; do not create fictitious geological layers on its side.

The current topography material explicitly disables satellite texture and uses vertex colours. This is a visualization choice, not proof of missing terrain data. Improve material contrast and context styling before considering a new elevation source.

Use two separate outlines only when useful: actual survey coverage and provisional project outline. They must not be presented as one legal boundary. Keep the coverage caveat accessible.

- [x] Define survey, nearby-context and distant-context material treatments.
- [x] Keep measured elevations at 1× and disclose the regional DEM outside the survey.
- [x] Resolve the existing 1× HUD versus 1.25× callout inconsistency.
- [ ] Review ridge silhouettes and cut edges at wide and close views.

## 2. Give each scene an appropriate light treatment

**Priority: first. Chapters 4–9.**

The scene already has a hemisphere light, warm directional key, cool fill, rim light, ACES tone mapping and shadow maps. Adding more lights alone will not solve the terrain. Adjust their balance and direction for the subject.

Starting art-direction proposals:

- Terrain: a raking key approximately 20–30° above the horizon, across the principal visible ridges; gentle fill preserves readable valleys.
- Geology: a neutral key and quiet rim to separate the host unit; low-chroma context.
- Model: neutral illumination and subdued terrain so grade colours remain stable.
- Concept: soft daylight and contact shadows around geometry actually supplied by the concept.
- Testwork: neutral, even illumination; preserve the original appearance of source photographs.

These are illustrative lighting states, not site solar measurements. Keep grade/category legends independent of cinematic colour grading. Ambient occlusion and precomputed shading can improve depth, with a simpler quality tier for phones.

- [x] Tune key direction, exposure and fill as one recipe per scene.
- [x] Reduce decorative illumination and keep grading colours outside the light treatment.
- [ ] Confirm camera-facing slopes and shadowed slopes both remain readable.
- [ ] Check projector contrast and mobile frame rate.

## 3. Direct the camera around a question

**Priority: first. All chapters.**

Replace repeated reset/zoom/underside moves with a small sequence: establish the subject, reveal one relationship, hold for explanation. Refit the camera to visible geometry and the available canvas after panels are placed. Pause camera motion when a viewer selects an object.

Use perspective for shape and a section-aligned or orthographic view for reading distances/contacts. A 35–45° perspective field of view is an initial tuning range, not a universal rule. Terrain views around 25–35° above horizontal are worth testing against the current framing. Keep north orientation discoverable and retain Reset.

| Chapter | Proposed camera/composition | New information exposed |
| --- | --- | --- |
| 1 · Meet Tanga | Genuine landscape image matched to a restrained oblique site view | Connect the project name to real ground |
| 2 · Location | Country → coast → site, holding a small locator | Spatial context without another peer ranking |
| 3 · Work completed | Stable site coverage view with large selected evidence image | Where documented work occurred |
| 4 · Terrain | Oblique ridge silhouette → cross-ridge profile view | Elevation and slope relationships |
| 5 · Drilling | Selected collar → side-on trace with terrain locally clipped | The observed intervals and depth progression |
| 6 · Geology | Three-quarter host view → section-normal hold | Interpreted contacts and their relation to observations |
| 7 · Model | Oblique volume → selected slice/population at the same orientation | How represented blocks relate to sampled evidence |
| 8 · Concept | Stable three-quarter view for a surface/concept comparison | Concept fit and connections on the ground |
| 9 · Testwork | Close evidence composition with charts and sample imagery | What the tests measure and how results differ |
| 10 · Logistics | Corridor overview → restrained following motion, then port context | Journey continuity and elevation context |
| 11 · Decisions | Stable spatial evidence overview with three linked actions | How completed work informs the next decisions |

- [x] Keep chapter camera beats purpose-specific and define safe areas for the large evidence stage and panels.
- [x] Remove the authored underside camera beat; each remaining move reveals a different relationship.
- [x] Avoid below-surface entry frames where terrain occludes the main subject.
- [ ] Verify entry state on cold deep links, as well as chapter-to-chapter navigation.

## 4. Make the geology reveal one memorable continuous action

**Priority: second. Chapters 5–7.**

Upgrade the existing cutaway and section controls into a continuous surface → recorded traces → interpreted host → selected model population sequence. Prefer an actual clipping plane and readable cut surface to making the entire site glassy.

Show a subtle outline for a selected obscured object during the reveal. Use a quiet teal/copper accent rather than a permanently pulsing effect. Keep the relevant depth ruler and source state visible. Any exploded position must be clearly illustrative, with an immediate return to true coordinates; default to clipping in place.

- [x] Reuse existing section, visibility and camera commands.
- [x] Show observations before interpretation and the selected model population in the executive route.
- [x] Add a reversible section reveal; its clipping state changes immediately and camera travel honors reduced motion.
- [x] Retain the existing X-ray treatment for objects viewed through terrain.

## 5. Put real evidence on the main stage

**Priority: first. Chapters 3, 5, 6 and 9.**

Chapter 3 currently changes a right-side image and text, while its central stage can be visually empty. Promote the selected milestone image into the main composition and link the selector to genuine survey/drilling coverage where the corresponding spatial evidence exists.

Extend the existing sample crosswalk into a selection journey: actual interval marker → verified source image → caption/scale → interpretation context. For testwork, make report charts and actual sample images larger than the illustrative laboratory bench.

Use a source image in a standard frame when its position or camera bearing is unknown. Only drape images with georeferencing. Only offer 360 navigation if genuine panoramic source media is available. The current generic core image is not the selected 3D hole and must retain that qualification.

- [x] Make the selected milestone image the main stage on desktop and retain the source image in the mobile panel.
- [x] Link the measured survey to its terrain chapter; do not attach other evidence images to unverified locations.
- [x] Keep report identities and sample scales in the evidence captions/source drawer.
- [x] Load local source imagery eagerly with a stable dark poster surface behind it.

## 6. Simplify the presentation controls and improve annotations

**Priority: first. All chapters.**

Keep the existing compass, scale and source drawer. Reduce the default presentation toolbar to Previous, Next, chapter progress, Explore and essential orientation. Put advanced actions in one compact tools menu, reachable by keyboard and touch.

Use one annotation style with consistent padding, alignment and leader rules. Show one key relationship at entry and up to two labels during explanation. Selection can reveal more. Keep leaders clear of the subject, hide back-facing anchors and prevent labels landing over navigation. Camera movement should settle before detail labels appear.

Add a small locator inset with a view direction in geography/route scenes when it explains orientation; do not add a second compass. A stage/presentation type size should be checked from several metres away, because many current captions are comfortable only close to the screen.

- [x] Keep the shared callout treatment and existing label collision layout; keep the new evidence stage clear of the chapter panel.
- [x] Keep the evidence and navigation panels inside measured desktop and phone safe areas.
- [x] Keep the active population legend available in model views.
- [x] Increase panel contrast with a bright-room display control.

## 7. Compare surface and concept with the same camera

**Priority: second. Chapter 8, optionally Chapter 4.**

Upgrade the existing concept/terrain toggle into a registered before/after wipe, or a clean crossfade when a wipe would obscure 3D controls. Lock camera, scale and lighting while the viewer compares the two states. Use the supplied conceptual surfaces only.

Selecting the conceptual north pit, south pit or processing area can isolate that component and show its connections. Do not animate haulage on a route that has not passed the current geometry checks. Keep conceptual status visible.

- [x] Keep surface and concept views registered by toggling terrain and concept layers without moving the camera.
- [x] Expose one labelled, keyboard-focusable comparison control.
- [x] Retain the concept caveat and verified route-availability state.
- [x] Do not add simulated production or construction detail without a source.

## 8. Build a short executive route through the same content

**Priority: second. Whole presentation.**

The current default is 90 seconds per chapter, a 16.5-minute tour. Add a roughly 3–4-minute executive route with curated highlights and a separate full technical route. Timing is a proposed target to validate with a real spoken rehearsal.

Each stop opens on a completed, readable view. Prefetch the next chapter, keep a source poster visible while heavy assets load and allow the viewer to pause/explore at any point. Share chapter-specific links and a short written takeaway. The technical content remains accessible from the same app.

- [x] Curate seven highlights: location, work, ground, drilling, geology, model and next decisions.
- [x] Set the executive route to 30 seconds per stop (3:30 total) while preserving configurable timings for the full technical tour.
- [x] Keep the source image visible while it loads and hold the existing scene status through heavy 3D asset loading.
- [ ] Test a cold shared link with a typical laptop connection.

## Suggested implementation order

1. Fix terrain presentation, label consistency and the sparse milestone composition: proposals 1, 5 and 6.
2. Author camera and light states together: proposals 2 and 3.
3. Add the continuous geological reveal and registered concept comparison: proposals 4 and 7.
4. Curate and rehearse the executive route: proposal 8.

Before accepting the next phase, capture all eleven settled chapters at 1680×945, 1366×768, 768×1024 and 390×844; inspect motion at full and reduced settings; verify observed/interpreted/conceptual labels; and check shared-link load behaviour. Visual improvements must preserve measured terrain and source scope.

## Verification still to complete

- [ ] Inspect ridge silhouettes and shadow readability in rendered 3D at wide and close views; the local 3D browser screenshot timed out during this pass.
- [ ] Check projector-room text contrast and mobile frame rate on a physical device.
- [ ] Capture all eleven settled chapters at 1680×945, 1366×768, 768×1024 and 390×844.
- [ ] Rehearse the 3:30 executive route aloud and check a cold shared link on a typical laptop connection after preview deployment.
