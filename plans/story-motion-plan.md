# Tanga Deck — Story & Motion Plan

**Goal:** make the deck feel like a cinematic investor *story*, not a slide switcher — professional-grade motion, act interstitials, and staged reveals — without slowing the pace or hurting accessibility.

**Plan only. Nothing built until approved.**

---

## What already exists (we elevate, not rebuild)

- **3 Acts** — `STORY_ACTS`: The Opportunity (`#8fb4d6`) → The Asset (`#d96a2a`) → The Value (`#e0a94f`), mapped per scene via `MODE_ACT`. Shown today only as the small top **ACT ribbon**.
- **Per-scene narrative** — `chapterTitle`, `storyBeat`, `narrationScript`, `MODE_INVESTOR_ANGLE` (headline + 3 points) already written for every scene.
- **Scene-transition overlay** — `sceneTransition` state + `.tanga-deck__portal-transition` (map/model, forward/back/jump) + `.tanga-deck__scene-flash`.
- **Reveal model** — `revealSequence` (fade-in / slide-up / draw-line + delays) in `deck.ts` (data exists; only partly wired to the live workbench).
- **`framer-motion`** already a dependency and used in overlays/showcases.
- **Motion tokens** — `--ease-hud`, `--dur-fast/med/slow` in `hud.css`; reduced-motion already respected in several places.

So the raw materials for a story are all here — they just aren't choreographed into a narrative arc yet.

---

## Design principles

1. **Story spine = the 3 Acts.** The single biggest "story" lift is marking each act transition with a brief cinematic **interstitial**, so the deck reads as Opportunity → Asset → Value.
2. **Motion conveys meaning, never decoration.** Map→3D = "descend into the model"; 3D→map = "pull back to context"; boundary "draws" on; data "arrives".
3. **Fast & skippable.** Interstitials ≤ 2.5s, always click/→ to skip, always auto-advance. An investor deck must never feel slow.
4. **One motion language.** Everything uses `--ease-hud` + the duration tokens. Reduced-motion → instant (no holds, no interstitials).
5. **Autoplay-aware.** Interstitial durations fit inside the autoplay dwell so unattended playback still flows.

---

## Phase 1 — Act interstitials (highest story impact)

A brief full-screen "chapter card" **only when crossing into a new act** (`MODE_ACT[from] !== MODE_ACT[to]`), e.g. entering The Asset or The Value.

- **Content:** big act numeral (I / II / III) + act label ("THE ASSET") + a **one-line act thesis** (new copy, ~8 words) + a thin act-tinted rule.
- **Motion (framer-motion + `--ease-hud`):** freeze-frame the outgoing scene, darken/blur it; numeral scales up + fades in (`--dur-med`); label + thesis slide up staggered; thin cyan/act line draws left→right; hold ~1.2s; dissolve into the first scene of the act as its camera fly-in begins.
- **New data:** add `thesis` to `STORY_ACTS` (3 short lines). New `<ActInterstitial>` component (own file, framer-motion), triggered from the existing scene-change path.
- **Guardrails:** skip on click/→/Esc; auto-advance; reduced-motion renders a static 400ms label swap; autoplay uses the same ≤2.5s budget.

## Phase 2 — Elevated scene transitions

Upgrade the existing `portal-transition` to a premium, consistent motion:
- Cross-dissolve + a single thin cyan **sweep** in the travel direction, carrying the scene label ("Next scene · Topography").
- **Semantic direction:** map→3D dives (scale-in + downward wipe); 3D→map pulls back (scale-out + upward wipe); jumps use a neutral dissolve.
- Unify timings on the tokens; kill the current abrupt `scene-flash` in favour of this.

## Phase 3 — In-slide staged reveals (wire the reveal model)

On each scene's arrival, choreograph its key elements in instead of popping:
- **Order:** title/eyebrow → data panel slides in from its dock → licence boundary **draws on** (map scenes) / block model **builds up** (3D) → callouts fade in and their leader lines draw last.
- Implement with framer-motion variants driven by the existing `revealSequence` timings; stagger via `--dur-*`. Everything instant under reduced-motion.

## Phase 4 — Optional info interstitials (only where they add punch)

1–2 brief **context cards** at pivotal beats — not every slide — reusing the Act-interstitial component with a lighter treatment. Candidates (copy already exists in `MODE_INVESTOR_ANGLE`):
- Before the **resource reveal**: "The block model — the core of the value."
- Before the **investment case** (closing): a one-line thesis recap.

---

## Guardrails / risks

- **Accessibility:** every interstitial skippable + auto-advancing; full reduced-motion path; focus never trapped; announce act changes politely.
- **Performance:** interstitials are DOM/CSS/framer-motion overlays — they must not stall the WebGL scene behind (freeze a poster or just darken; don't spin up new heavy layers).
- **Pace:** hard cap every hold; provide a global "reduce cinematics" toggle if the user wants a fast investor run.
- **Scope containment:** all new work is additive components + `hud.css` motion; no changes to the CSS extraction or the deck data model beyond adding `thesis` strings.

## Suggested build order
1. Phase 1 (act interstitials) → the visible "story" win. Verify via agent-browser (screenshot the card mid-transition + confirm skip/reduced-motion).
2. Phase 2 (transitions) → cohesive travel between scenes.
3. Phase 3 (staged reveals) → each scene "arrives".
4. Phase 4 (info cards) → only if they earn their place.
