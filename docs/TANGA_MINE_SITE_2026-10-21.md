# Complete conceptual mine-site pass

Visual thesis: surveyed terrain, warm earth benches, restrained industrial steel and muted water should read as one coherent proposed mine site.

Content plan: connected mine overview → pit and waste handling → report-based uphill feed / lowland plant → buildings → tailings and water → facility plan.

Interaction thesis: deliberate facility camera moves, a recoverable overhead site plan, and anchored labels that follow the geometry. Static equipment supplies scale without implying a validated operating schedule.

## Checklist

- [x] Review VRIFY deck 24534, facility / pit overview.
- [x] Search PaulSam June 2023 and SMMPL April 2025 extractions for waste and tailings designs; no design/layout found.
- [x] Add screened illustrative waste-rock benches.
- [x] Add a contained tailings basin with embankments, beach and decant pool.
- [x] Add separate settling/reclaim and raw-water ponds.
- [x] Add graded disturbance aprons, service connections and parked equipment.
- [x] Keep additions within displayed terrain and clear of existing pits and facility footprints.
- [x] Record source coverage, placements, omissions and illustrative geometry dimensions.
- [x] Add focused cameras, plan view and consistent facility labels.
- [x] Improve close facility shadows without adding postprocessing passes.
- [x] Label new facilities as conceptual; no storage capacity, siting approval or engineering claim.
- [x] TypeScript, Cloudflare build, browser and responsive checks.
- [ ] Commit, push and verify the Vercel branch preview.

## Evidence limits

PaulSam Figure 3.3 supports approximate feed / discharge alternatives, not a waste dump or TSF. Its plant land allowance remains separate from these additional illustrative footprints. Spatial checks prevent graphical conflicts only; they do not evaluate drainage, seepage, geotechnical stability, protected land, permits or property rights. No facility capacity or design suitability is implied.

## Local verification · 22 October 2026

Chrome desktop review: all four facilities placed with no omissions; overhead lowland view, oblique TSF detail and shared purpose panel inspected. Phone review at 390 × 844: compact native selector, visible canvas and camera refit checked. Added static shadow caching and batched facility geometry; no quantified frame-rate improvement is claimed.

Runtime placements in EPSG:32737: tailings E477950/N9463420 (340 × 260 m); settling/reclaim E477390/N9463340 (130 × 95 m); raw water E477740/N9463930 (100 × 80 m); waste E476658.61/N9466658.61 (240 × 180 m). Terrain relief under these footprints is 15.66, 7.04, 7.03 and 28.03 m respectively. Waste uses survey coverage; the three lowland facilities use regional context terrain. These are display layouts, not engineered placements.

`npm run typecheck` passed. `npm run cf:build` passed, including the Next.js production build and OpenNext worker bundle; the existing large-asset R2 routing remains intact. No Cloudflare worker was published.
