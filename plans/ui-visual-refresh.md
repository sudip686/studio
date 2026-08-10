# Plan — Continuous 3D World + Cinematic Investor Deck (VRIFY-style)

> **Reference:** https://vrify.com/decks/22622 (resolves to VRIFY's featured Canterra Minerals deck). Target feel: fly smoothly through **one continuous 3D world** — satellite terrain → drillholes → MRE block model — with cinematic eased camera moves, autoplay, a minimal thumbnail rail, and annotations. Clean, premium, investor-grade.
>
> **Goal chosen by user:** Move toward **one continuous 3D world** (not just polish the hybrid), plus cinematic render quality and a VRIFY-minimal visual refresh.
> **Non-goal:** Don't change the underlying data (resource numbers, drillhole assays, geology). Preserve voice commands and every story beat. This is a *presentation/engine* upgrade, not a data or narrative rewrite.
>
> **Branch:** `vrify-story-phase1` · **Stack:** Next.js + React + deck.gl/MapLibre (map) + Three.js (3D world), styling in one `src/app/globals.css`.
> **Execution model:** Phases are ordered by risk. Phases 1–2 are low-risk cinematic wins on the existing Three scene and can ship independently. Phase 3 is the big migration. Each phase is self-contained for a fresh chat context.

---

## Orientation — the two engines and the seam (read first)

**Entry chain:** `src/app/page.tsx` → `TangaIntroGate.tsx` → `TangaDeckWorkbench.tsx`.

**Engine split today (the core problem):**

| Story mode | Engine | Scale | Notes |
|---|---|---|---|
| `ranking` | deck.gl globe | world | Peer projects on globe |
| `tanzania` | deck.gl globe | country | Tanga highlighted in Tanzania |
| `project` | **deck.gl** | local | Raised DEM cells, roads, villages, AOI — *synthetic* relief (`localTerrainCells`, `reliefHeightAt`) |
| `topography` | **deck.gl** | local | Same synthetic relief, exaggerated |
| `accessibility` | **deck.gl** | regional | Routes to port (57 km) / power / rail, concept mine facilities |
| `drillholes` | **Three.js** | local | **Real** terrain (heightmap + satellite texture) + assay traces |
| `subsurface` | **Three.js** | local | Cutaway of real terrain, holes below |
| `resource` | **Three.js** | local | Block/voxel model on real terrain |
| `metallurgy` | **Three.js** | local | Recovery reveal |

The **deck.gl↔Three.js switch happens between `accessibility` and `drillholes`**, masked by `tanga-deck__portal-transition` (a wipe). That wipe exists *because* the two engines can't cross-fade — that's the seam that reads as "not smooth." Worse: `project`/`topography` use **synthetic sine-wave relief** (`reliefHeightAt`) while `drillholes`+ use the **real terrain mesh** — so the same place looks different before vs after the switch.

**The Three.js world already exists and is strong** — `TangaThreeGeologyScene.tsx` (~2,699 lines):
- Real terrain: `/terrain_preview_meta.json` + `/height_preview_1024.bin` + satellite texture (`/terrain_texture_8k.jpg`, `/texture_rgb_8192.png`), `VERTICAL_EXAGGERATION`, patch `7200×6800` m.
- Drillholes (`loadDrillholes`), block model (`loadBlockModel`), collars, cutaway roof/curtain.
- `WebGLRenderer({antialias:true})`, `shadowMap.enabled`, `HemisphereLight` + key `DirectionalLight`, `THREE.Fog(0x15202c, 4600, 12000)`, `MeshStandardMaterial` (PBR), `OrbitControls` with `enableDamping`.
- **Missing for cinematic grade:** no `toneMapping` (no ACES), no soft-shadow filter config, no post-processing/bloom, camera moves are `lerp`-midpoint not eased waypoint fly-throughs.

**Chrome (busier than VRIFY):** `tanga-deck__topbar`, `__story-rail` (9 acts), `__geo-overlay` (compass+legend+scale), `__callout-layer`, `__command*` voice console, `__voice-status`. All in one `globals.css` (~11,344 lines) with a real `:root` token layer (~lines 379–518).

**Target architecture:** ONE continuous Three.js world hosts every **local/regional** mode (`project`→`metallurgy`); the **globe** modes (`ranking`, `tanzania`) stay deck.gl/MapLibre and transition into the 3D world via a **camera dive + crossfade**, not a wipe.

---

## Phase 0 — Scene Architecture Audit (no code changes)

**Objective:** Decide the engine boundary and camera model precisely. Output appended under "Phase 0 Findings."

**Tasks:**
1. **Engine-boundary decision.** For each of `project`, `topography`, `accessibility`: list every deck.gl layer it renders (grep the `layers` array builders + `VIEW_STATES`, `sceneCalloutsForMode`, `legendForMode` in `TangaDeckWorkbench.tsx`) and what data feeds it (AOI boundary, roads, villages, vegetation, routes, mine facilities). Mark each layer **MIGRATE-TO-THREE** or **STAYS-MAP**. Expectation: `project`/`topography` migrate (they already want real terrain); `accessibility`'s 57 km routes likely exceed the `7200×6800` terrain patch → decide: widen the Three world, use a low-detail far terrain ring, or keep `accessibility` as a map beat that the camera pulls back into.
2. **Terrain coverage check.** Read `/public/terrain_preview_meta.json` (bounds, resolution) and confirm the real terrain mesh covers the AOI + village + near routes. Record the world extent in meters and where each mode's camera sits inside it.
3. **Camera inventory.** Transcribe `VIEW_STATES` (deck.gl lon/lat/zoom/pitch/bearing) and the Three camera targets (`DEFAULT_CAMERA_TARGET`, per-mode views, `terrainOpacityForView`). This becomes the waypoint list Phase 2 turns into a fly-through path.
4. **Data-color inventory.** List which colors are *data semantics* (assay `colorForCarbon`, `terrainColor`, legend `tone`, block grade) vs *chrome*. Data colors are never tokenized/restyled.
5. **Asset/perf budget.** Note terrain texture sizes (8k/8192), `AssetQuality` tiers, and current load flow so Phase 3 doesn't blow the frame budget when more layers move into Three.
6. **Baseline capture.** `npm run dev`, screenshot/record all 9 modes + the deck→Three portal wipe. Save to `plans/_before/`.

**Verification checklist:**
- [ ] Per-mode layer table with MIGRATE-TO-THREE / STAYS-MAP verdict + data source for each layer.
- [ ] Terrain world extent (meters, bounds) recorded; AOI/village/route coverage confirmed or gap noted.
- [ ] Camera waypoint list (all modes, both engines) transcribed.
- [ ] Data-vs-chrome color inventory.
- [ ] `plans/_before/` has recordings of all modes + the wipe seam.

**Anti-pattern guards:** No code edits. Don't assume terrain covers a mode — verify against the meta bounds. Don't plan to move globe modes into Three (wrong scale).

---

## Phase 1 — Cinematic Render Grade (low-risk, ship-alone win)

**What to implement (in `TangaThreeGeologyScene.tsx`, renderer/lights only):**
- `renderer.toneMapping = THREE.ACESFilmicToneMapping`; tune `renderer.toneMappingExposure` (~0.9–1.2). Confirm `renderer.outputColorSpace = THREE.SRGBColorSpace`.
- `renderer.shadowMap.type = THREE.PCFSoftShadowMap`; configure the key `DirectionalLight` shadow camera bounds to the terrain extent + reasonable `mapSize` (2048) so shadows are soft and not clipped.
- Warm/cool light balance + subtle `Fog`/`FogExp2` tuning for aerial depth (keep existing fog color family).
- *Optional, gated:* a restrained `UnrealBloomPass` (EffectComposer) only on emissive highlights (high-grade blocks, active collars) — low threshold, low strength. If it costs >2ms/frame on the standard quality tier, cut it.
- Respect `prefers-reduced-motion` for any new idle animation.

**Documentation references:** Phase 0 asset/perf budget; existing renderer setup (lines ~1397–1405), lights (~1553–1554), fog (~1252). Copy existing material/light patterns; don't swap `MeshStandardMaterial` types.

**Verification checklist:**
- [ ] Terrain + blocks visibly richer (contrast/highlight/shadow) vs `plans/_before/`; screenshot each Three mode.
- [ ] No z-fighting/shadow acne; shadow covers full terrain (no hard clip line).
- [ ] Frame time on standard quality tier within budget (record before/after ms).
- [ ] Data colors (assay/grade) still read correctly after tone mapping (spot-check legend vs blocks).

**Anti-pattern guards:** Don't over-bloom (investor decks read as gaudy fast). Don't change data-driven material colors. Keep it on all `AssetQuality` tiers or gate cleanly by tier.

---

## Phase 2 — Cinematic Camera Choreography

**What to implement:** Replace mode-swap camera jumps with an eased, damped **waypoint fly-through** in the Three world.
- Introduce a small camera-tween utility (eased `cubic-bezier`-style easing on position **and** target, with `enableDamping` for the settle). Reuse the existing `lerp`/`DEFAULT_CAMERA_TARGET` machinery (~lines 502–504) rather than a new controls lib.
- Each mode = a **waypoint** (position, target, duration) from the Phase 0 inventory. Moving between adjacent modes flies the camera along an eased arc through the shared world instead of cutting.
- Gate autoplay pacing off the same tween so autoplay feels like a guided flight.
- `prefers-reduced-motion` → snap instead of fly.

**Documentation references:** Phase 0 camera waypoint list; existing camera lerp helpers.

**Verification checklist:**
- [ ] Forward/back between the Three modes flies smoothly (no cut) at 60fps target.
- [ ] Autoplay drives the same eased path.
- [ ] Reduced-motion snaps cleanly.
- [ ] OrbitControls still hand back to the user after a move (no locked camera).

**Anti-pattern guards:** Don't stack a second animation lib. Don't leave the camera unclickable after tweens. Don't tween through the terrain (clamp path above surface using `terrainSurfaceY`).

---

## Phase 3 — Migrate Local Modes Into the One World (the big one)

**What to implement (per Phase 0 verdicts):** Recreate the **MIGRATE-TO-THREE** deck.gl layers as Three.js objects on the *real* terrain, so `project`/`topography`/`accessibility` render in the same world as `drillholes`+ — killing the synthetic-relief mismatch and the engine switch.
- **AOI boundary** → extruded/ribboned line snapped to `terrainSurfaceY`.
- **Roads / routes** → tube/line geometry draped on terrain (reuse route data + `terrainSurfaceY` draping already used for drill collars).
- **Villages / markers / mine facilities** → instanced meshes/sprites placed via the existing local-coordinate helpers.
- **Topography** becomes a camera framing + terrain-shading state of the same mesh, not a separate synthetic surface. Retire `localTerrainCells`/`reliefHeightAt` for these modes (keep only if a mode stays map).
- Wire these modes into the `GeologyMode`/scene state so the story-rail drives them within Three.
- Keep `accessibility` per Phase 0: if routes exceed the patch, add a low-detail far-terrain ring or a controlled pull-back beat.

**Documentation references:** Phase 0 layer table + terrain extent; existing Three draping (`terrainSurfaceY`, `collarSurfacePoint`, drill layer builders); the deck.gl layer builders being ported (for exact data/coords).

**Verification checklist:**
- [ ] `project`, `topography`, (and `accessibility` per decision) render inside the Three world with real terrain — no deck.gl for them.
- [ ] AOI/roads/villages sit correctly on the surface (no floating/sunk geometry) at multiple camera angles.
- [ ] Same location looks identical moving `project`→`drillholes` (mismatch gone).
- [ ] Callouts/legend for these modes still anchor (ported to the Three callout system used by `drillholes`+).
- [ ] Voice commands for these modes still select the right scene.

**Anti-pattern guards:** Don't keep both the synthetic and real terrain for a migrated mode. Don't hard-code coordinates — reuse the offset/coordinate helpers. Preserve `data-testid`s used by tests.

---

## Phase 4 — Seamless Globe → World Handoff

**What to implement:** Replace the `tanga-deck__portal-transition` wipe with a continuous transition from the deck.gl globe (`ranking`/`tanzania`) into the Three world:
- On `tanzania`→`project`, do a **camera dive**: deck.gl flies/zooms toward the AOI while the Three world **crossfades in** (opacity/scale) at matching framing, so it reads as diving through cloud into the site.
- Match bearing/pitch/center at the crossover so there's no positional jump.
- Keep the wipe only as a reduced-motion / low-GPU fallback.

**Documentation references:** Phase 0 camera waypoints (globe side = `VIEW_STATES.ranking/tanzania`, world side = Phase 3 `project` waypoint); existing portal-transition + `threeVisible` gating in `TangaDeckWorkbench.tsx` (~lines 3256–3300).

**Verification checklist:**
- [ ] `tanzania`→`project` transition has no wipe and no positional pop (center/bearing continuous).
- [ ] Reverse (`project`→`tanzania`) pulls back out smoothly.
- [ ] Reduced-motion/low-GPU still works (fallback path).
- [ ] Three world doesn't mount-flash (preload/prewarm before crossfade).

**Anti-pattern guards:** Don't try to render the globe in Three (keep MapLibre for world scale). Don't crossfade before the Three world is ready (guard on load state).

---

## Phase 5 — VRIFY-Minimal Chrome + Token Refresh

**What to implement (CSS-led, `globals.css` + minimal class edits):**
- **Declutter to VRIFY minimalism:** thin **thumbnail/scene rail** (replaces or slims `story-rail`), small brand mark, autoplay control, an **annotations toggle** (callouts on/off). Demote compass/legend/scale into a collapsible panel or on-hover, so the 3D world is the hero.
- **Token refresh** in existing `:root`: add glass/elevation/glow/motion tokens (don't rename existing). Apply across topbar, rail, console, overlays, callouts using tokens only.
- Refresh `TangaIntroGate` + `.tanga-boot` for a cohesive premium first impression.
- Ensure focus rings + `prefers-reduced-motion` on all chrome.

**Documentation references:** existing `:root` tokens (~lines 379–518), 32 existing `@keyframes` (reuse), surface→line map from Phase 0.

**Verification checklist:**
- [ ] Chrome reads minimal/premium; 3D world dominates the frame.
- [ ] Thumbnail rail + autoplay + annotations toggle work and drive scenes.
- [ ] No overlapping chrome at 1440/1100/768 (the app has only 7 media queries — tighten).
- [ ] No hard-coded chrome hex outside `:root`; data colors untouched.
- [ ] All `data-testid` hooks intact.

**Anti-pattern guards:** Don't tokenize data-viz colors. Don't remove features (voice, autoplay) — relocate/slim them. One stylesheet only.

---

## Phase 6 — Final Verification

- [ ] `npm run build` clean.
- [ ] Existing tests green (`src/**/__tests__`); no `data-testid` renamed (grep to confirm).
- [ ] End-to-end fly-through: `ranking`→…→`metallurgy` with autoplay — one continuous experience, no wipe, no relief mismatch, 60fps target on standard tier.
- [ ] 5 voice commands still drive scenes (`next slide`, `show project area`, `show resource model`, `show road route to Tanga port`, `rotate 360 degree`).
- [ ] `plans/_after/` recordings vs `plans/_before/`; side-by-side shows the VRIFY-level continuity + grade.
- [ ] A11y: focus rings, reduced-motion honored, text-on-glass contrast ≥4.5:1.
- [ ] Perf: frame-time budget recorded per quality tier; no regression from added Three layers.

**Grep-before-done guards:** new chrome hex outside `:root`; duplicate `@keyframes`; renamed testids; camera paths clipping terrain; both synthetic + real terrain live for a migrated mode.

---

## Phase 0 Findings
_(fill during Phase 0: engine-boundary table, terrain extent, camera waypoint list, data-vs-chrome colors, perf budget, before-recording manifest)_
