# Tanga presentation — slide-by-slide implementation checklist

Date: 16 November 2026
Scope: desktop first; keep every scene tied to its source evidence and preserve direct navigation.

## Release checks for every slide

- [x] Capture the current 1366 × 768 opening frame for all 12 chapters before changes (`baseline-01` through `baseline-12`).
- [x] After the current edits, navigate through all 12 chapter tabs at 1366 × 768; each chapter heading and hash matched the selected chapter. Browser reported 0 console errors and 0 warnings across 144 console messages.
- [x] TypeScript typecheck (`npm run typecheck`) completed without errors.
- [ ] Re-capture all 12 openings after the visual pass; inspect any chapter whose layout, viewer or shared component changed. The changed chapters have focused captures; the full post-change matrix remains outstanding.
- [x] Check selected/detail states for geology, resource overview, both mine pits and grade filter, and the flotation cutaway.
- [ ] Recheck a fresh direct link into each 3D chapter and complete source/evidence-link checks for peers and decisions.
- [ ] Confirm claims and status labels distinguish observations, reported results, interpretations and concepts.

## Chapter checklist

| # | Chapter purpose | Data and meaning to preserve | Desktop review / implementation status |
|---:|---|---|---|
| 1 | Introduce Tanga and the project setting | Project position and provisional project boundary; no drilling before the drilling chapter | [x] Baseline opening captured; [x] route/headline revisited after geology edit |
| 2 | Place the project in Tanzania and its coastal setting | Country, regional and coastal geography; keep the locator tied to the mapped project position | [x] Baseline opening captured; [x] route/headline revisited after geology edit |
| 3 | Show work completed | Dated survey, drilling, estimate and testwork milestones; do not present plans as completed work | [x] Baseline opening captured; [x] route/headline revisited after geology edit |
| 4 | Read measured terrain | Survey coverage, measured elevations and selected profile; keep the terrain scale honest | [x] Baseline opening captured; [x] measured-terrain scene ready after navigation |
| 5 | Show recorded drilling evidence | Recorded collars, intervals and gaps; drill traces appear here as evidence, not on the opening/topography or mapped-geology surface | [x] Baseline opening captured; [x] drilling scene ready with 100 holes / 5,207 intervals after navigation |
| 6 | Connect mapped surface units to a separate depth interpretation | Seven georeferenced lithology rasters plus the soil-cover map, source colors, approximate registration; no license outline or unsupported surface-to-depth correlation | [x] Removed raised drill collars/traces from this chapter; verified 0 rendered drill segments, 8 mapped classes and EPSG:32737 source basis; [x] all three surface/relief/depth stages load with the correct opacity states; [ ] fresh direct-link recovery |
| 7 | Explain the reported estimate and block model | Preserve report totals, units, grade legend and classification; distinguish modeled/displayed blocks from reported totals | [x] Report panel checked: 148 Mt indicated, 4.94% TGC and ≈7.31 Mt contained graphite; [x] 155,853 displayed source cells and 11.13% TGC highest displayed cell are labeled separately from reported MRE totals; [ ] selected block-band/detail and fresh direct link |
| 8 | Compare peers on one measure | Dated contained-graphite benchmark and same unit; preserve source selection and qualification | [x] Baseline opening captured; [x] route/headline revisited after geology edit; [ ] check table-to-globe selection and cited figures |
| 9 | Explain the mine concept in its terrain setting | Source RF1 pit surfaces and source blocks; conceptual facilities and routes; no reserve/design implication | [x] Baseline + site opening; [x] both named pit selections and the shared block view load; [x] ≥8% TGC filter and north/south focus both preserve ready RF1 blocks; [x] 0 pit-floor cells above terrain; [x] source and concept qualifications visible |
| 10 | Present testwork, then optional process explanation | Eight laboratory composites; TC, recovery and coarse fraction keep separate definitions/scales; plant and downstream scenes remain illustrative | [x] Baseline + connected factory; [x] flotation selection opens the roof cutaway and shows matched TDM001 values; [x] full story reaches the fifth plant area and the final anode cutaway; [x] reduced-motion setting disables automatic tour while retaining the five manual area controls; [x] pathway remains labeled illustrative/separate from testwork |
| 11 | Explain the project-to-port relationship | Reported 72 km project-to-port distance and route source; distinguish mapped route from mapped road geometry | [x] Baseline captured; [x] visible 72 km project-stated distance is distinguished from 76 km mapped road geometry and 1 hr 57 min; [x] route card now says “Mapped road profile”; [x] basis caveat visible |
| 12 | Close with evidence-linked decisions | Each next-study question links to existing evidence; avoid implying approvals or completed work | [x] Baseline opening captured; [x] decision scene visible after navigation; [ ] decision links and direct navigation regression pass |

## Current focused change

- **Geology (chapter 6):** `drillSegmentsForMode` now returns an empty display set for `subsurface`. The scene still loads the registered geology surfaces and interpreted model, while drilling remains in chapter 5. In-browser evidence after the edit: `drillSegmentsRendered=0`, `geologySurfaceUnits=8`, and source basis `7 georeferenced lithology rasters (EPSG:32737) plus soil-cover map; approximate source registration`.
- **Visual baseline:** the captured map frame keeps the source palette, north-up map, opacity control, class legend, registration note and explicit three-stage sequence. The added change removes blue/pink drill symbols from this scene.
- **Geology stages:** mapped surface, terrain relief and interpreted depth all loaded at `#subsurface`; all three reported `drillSegmentsRendered=0`. The depth state reported `geologyDepthOpacity=1.000`. Screen captures are `geology-after-collar-removal-1366.png`, `geology-relief-after-removal-1366.png` and `geology-depth-after-removal-1366.png`.
- **Mine planning:** local review captured the whole-site overview, two-pit block reveal, and separate north and south selections. Runtime state reported both RF1 surfaces, RF1 source blocks ready, and zero pit-floor elevations above the displayed terrain. Captures: `mine-01-overview-post-change-1366.png`, `mine-02-blocks-post-change-1366.png`, `mine-03-north-pit-post-change-1366.png`, `mine-04-south-pit-post-change-1366.png`.
- **Metallurgy:** selecting flotation opened the corresponding roof cutaway with TDM001 values (98.6% TC, 94.4% recovery, 34.6% above 150 µm). The on-demand anode scene loaded and states it is separate from Tanga testwork. Capture: `metallurgy-anode-pathway-postchange-1366.png`.
- **Full story check:** the factory full-story control progressed through the five areas into the five-step EV-anode cutaway. The final step was reachable; reduced-motion emulation disabled automatic camera tour while leaving manual process-area controls available.
- **Port distance:** restored the supplied 72 km project-to-port figure alongside the separate 76 km / 1 hr 57 min mapped road geometry. The route panel states that the two measures use different bases and the route is not a confirmed haulage/travel-time study. Capture: `port-distance-reconciled-1366.png`.
- **Remaining:** capture and visually inspect the complete post-change matrix at 1366 × 768 and the second desktop viewport; verify fresh direct links for the 3D chapters; finish peer table/globe and decision-link checks. Do not mark the deck release-ready until these pass.
