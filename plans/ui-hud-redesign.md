# Tanga Deck — HUD Redesign Plan

**Direction:** Cool sci-fi / command-center HUD over the 3D terrain and globe.
**Scope:** Full 3-phase redesign (fix collisions → unify design system → futuristic polish).
**Owner surfaces:** `src/app/globals.css` (tokens + panel styles), `src/components/TangaDeckWorkbench.tsx` (chrome/layout), `src/components/TangaThreeGeologyScene.tsx` (scene-side overlays only).

> Verification is now possible end-to-end: `agent-browser` (installed) drives the local
> dev server on `localhost:9004` and screenshots real WebGL frames. Every phase ends with a
> before/after screenshot pass across all 10 scenes at 1600×900 and 1280×720.

---

## Design principles (HUD)

1. **The 3D is the hero.** Chrome frames the edges; the center stays clear. Panels are
   glass overlays that *sit on* the scene, never boxes that replace it.
2. **Cool glass, warm signal.** Base UI shifts to cool cyan/slate glass. The existing warm
   orange (`--deck-accent`) is *demoted to a signal color* — used only for the live/active
   state, CTAs, and alerts, not for every border.
3. **Thin, precise, technical.** 1px hairline borders with a faint inner glow, corner ticks,
   monospace numeric readouts, uppercase micro-labels. No heavy filled cards.
4. **Legibility floor.** Any text over imagery sits on a scrim guaranteeing ≥ 4.5:1 contrast.
5. **One motion language.** Shared easing + duration tokens for transitions, panel in/out,
   and reveals.

---

## Token layer (new + revised) — `globals.css`

Add a cool HUD palette alongside the existing warm tokens (do **not** delete the warm ones —
they become the signal layer):

```css
:root {
  /* HUD cool base */
  --hud-cyan: 94, 234, 212;          /* teal-300 signal-cool */
  --hud-ice:  148, 197, 255;         /* cool fill / secondary */
  --hud-slate-0: 8, 13, 18;          /* deepest panel ground */
  --hud-slate-1: 14, 21, 28;
  --hud-line:      rgba(148, 197, 255, 0.16);   /* hairline */
  --hud-line-live: rgba(var(--deck-accent), 0.55); /* warm = active only */
  --hud-glow:      0 0 0 1px rgba(94,234,212,0.14), 0 8px 30px rgba(0,0,0,0.45);

  /* Glass panel primitive */
  --glass-bg: linear-gradient(180deg, rgba(14,21,28,0.72), rgba(8,13,18,0.82));
  --glass-blur: 14px;
  --glass-radius: 12px;
  --glass-pad: clamp(12px, 1vw, 16px);

  /* Motion */
  --ease-hud: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-fast: 160ms;
  --dur-med:  320ms;
  --dur-slow: 620ms;

  /* Type — technical */
  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", monospace;
  --micro-label: 0.625rem;  /* uppercase 0.16em tracking */
}
```

**One primitive to rule the panels:** create `.hud-panel` (glass bg, blur, hairline border +
inner glow, corner ticks via `::before/::after`) and refactor these onto it:
`tanga-deck__data-panel`, `tanga-deck__insight-panel`, the drillhole/TGC legends, and the
coach tooltip. This alone kills most inconsistency.

---

## Phase 1 — Fix real collisions (ship first)

Concrete bugs found in screenshots (scene 7 + slide 1):

| # | Bug | Fix | Location |
|---|-----|-----|----------|
| 1.1 | Top-left cluster overlaps: brand lockup + "…zoom in, rotate" hint chip + RUN/MIC all stacked in the same corner | Rebuild the top-left as one flex toolbar row: `[brand] · [hint chip] · [RUN][MIC]` with defined gaps; wrap/hide hint chip < 1200px | `TangaDeckWorkbench.tsx` topbar + `.tanga-deck__topbar*` |
| 1.2 | `TGC GRADE` legend clipped ("Very high" cut at panel edge); drillhole legend cramped | Panels size to content with internal `overflow:auto`; never fixed-height clip | legend CSS |
| 1.3 | Map-scene data panel centered over globe, hides the hero | Dock left as a HUD rail, cap `width: min(300px, 24vw)`, add left scrim gutter so globe peeks | `.tanga-deck__data-panel` |
| 1.4 | Intro "Global peer field" card low-contrast over globe | Put on `.hud-panel` scrim; move to lower-left, out of globe center | intro gate |

**Exit check:** screenshot all 10 scenes; assert no element bounding-box overlaps another
interactive control; center 40% viewport column is scene-only.

---

## Phase 2 — Design-system unification

- **2.1** Introduce the cool token layer + `.hud-panel` primitive (above).
- **2.2** Migrate all panels/legends/tooltips onto `.hud-panel`. Delete the per-panel
  bespoke gradients/borders.
- **2.3** Re-scope the accent: audit every `rgba(var(--deck-accent)…)` border → switch
  structural borders to `--hud-line`; keep warm only on active tab, autoplay-live, primary CTA.
- **2.4** Type pass: numeric readouts (grades, MT, camera dist, bearing) → `--font-mono`;
  micro-labels uppercase with tracking; one modular type scale.
- **2.5** Corner ticks + hairline framing on the shell edges for the "instrument" feel.

**Exit check:** a single screenshot of any scene shows all panels sharing identical glass,
border, radius, and label treatment.

---

## Phase 3 — Futuristic polish

- **3.1 Motion system:** route scene transition, panel enter/exit, reveal, and coach in/out
  through `--ease-hud` + duration tokens. Panels slide+fade from their dock edge.
- **3.2 Depth scrims:** replace hard panel boxes with edge-gradient scrims behind side rails
  so text lifts off the 3D without a visible box; add a subtle screen vignette.
- **3.3 Live HUD accents:** thin animated scanline/pulse on the *active* tab and autoplay
  ring; bearing/scale readouts get a faint cyan glow.
- **3.4 Globe/terrain framing:** corner reticle marks at the viewport corners; optional
  faint grid graticule fade at edges to reinforce "command center".

**Exit check:** full 10-scene screenshot pass + a short screen recording of one Act→Act
transition; confirm 60fps-feel (no layout thrash) and contrast floor holds.

---

## Risks / guardrails

- **Don't touch scene geometry/lighting** (just fixed) — this plan is chrome-only except
  scene-docked overlays.
- Keep the warm brand identity recognizable (user chose HUD *lean*, not a rebrand): warm
  stays as the signal/live color.
- All color changes must keep the ≥ 4.5:1 text-contrast floor over imagery.
- Ship Phase 1 independently so collision fixes land even if 2–3 iterate.

## Rollout order
1. Phase 1 collision fixes → commit → screenshot proof.
2. Token layer + `.hud-panel` primitive → migrate panels → commit.
3. Accent re-scope + type pass → commit.
4. Motion + depth + live accents → commit.
