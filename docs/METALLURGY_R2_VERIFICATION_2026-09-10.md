# Metallurgical laboratory exhibit and R2 audit

## Implemented locally

- Procedural Three.js testwork bench: rock samples, test mill, flotation cells, laboratory filtration/drying, sieve/analysis equipment and seven clickable sample baskets. Not a production plant, real laboratory protocol or mass-balance simulation.
- Oxide, Fresh, TDM001, TDM002, TDM003–005, TDM004 and TDM008 retain separate reported values. Group summaries are not assigned to individual tests. Basket fills do not represent measured recovery or a sieve split.
- Orbit/zoom, stage camera focus, pause, reduced-motion handling, equipment hover descriptions, sidebar/keyboard alternatives and basic results.
- Shared hover/focus guide installed across deck chapters; existing map/assay/cell tooltips retained. Geology meshes and conceptual mining objects added to picking. Invisible objects and clipped hit points excluded; pointer drag suppresses tooltips.
- Animation time clamp fixes a negative/invalid timestamp indexing failure. Regression test covers negative, NaN and infinite times.

## Verified

- Local development and production renderer opened successfully. Screenshots checked at 1366×768 and 1280×600.
- Direct 3D clicks: TDM004 returned 75.8% recovery with no invented individual carbon; TDM008 returned >73% coarse fraction. All seven selector results checked.
- Pause froze animation time; stage focus, hover descriptions and Escape dismissal of shared guide checked. Browser error output empty in checked sessions.
- `tsx scripts/test-metallurgy-lab.ts`, separate `tsc --noEmit`, and `npm run build` including Workbox passed before the subsequent R2 URL-routing edits; those later edits also typechecked. All-object/all-slide picking, touch and accessibility conformance are not exhaustively certified.

## Asset delivery

Read-only `node scripts/verify-r2-assets.mjs`: **15/20** referenced objects verified for public GET, CORS, no pointer/HTML prefix, remote length and matching local length where present. BlockModel.geojson is remote-only; its local checksum was not compared. Geology additionally has a previously verified full SHA-256 match.

Missing: earth.glb, terrain_meta.json, generated/boundaries.geojson, generated/roads.geojson, generated/orewaste-reference.json. Bulk upload was rejected by the safety review; no upload was performed in this audit. Exact-payload approval is required before retrying. Other objects were not overwritten.

Prepared R2-first paths for legacy GLBs/terrain, data-cache and large block requests. Added `.vercelignore` exclusions for verified large runtime assets and source-only research artifacts. Metadata and small map layers remain available locally as fallbacks. New lab geometry needs no binary upload.

## Deployment gate

Vercel CLI reported logged out. No production deployment of these code changes has occurred. The existing production geology asset repair remains live. Before deployment: approve/repair missing referenced R2 objects, authenticate to the account owning the existing Vercel project, verify its R2 public base environment variable, deploy without committing, then repeat live browser/network checks. Do not treat the local production build as a live deployment.
