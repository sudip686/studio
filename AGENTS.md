# Project Agent Routing

This project uses senior specialist guidance for implementation, review, UI/UX, and delivery coordination. Each role assumes at least 15 years of professional experience in its discipline.

## Default Route

- Use `.agents/project-manager/AGENTS.md` when a task spans multiple workstreams, needs sequencing, or needs acceptance criteria.
- Use `.agents/coding/AGENTS.md` for implementation, refactors, tests, data plumbing, and runtime fixes.
- Use `.agents/ui-ux-designer/AGENTS.md` for layout, interaction design, visual hierarchy, responsiveness, and accessibility polish.
- Use `.agents/reviewer/AGENTS.md` before finalizing risky changes, UI regressions, data-flow changes, or production-facing behavior.

## Project Guardrails

- Preserve the existing Next.js, Cesium, Three.js, and overlay-slot architecture unless a task explicitly calls for a larger rewrite.
- Prefer reusable viewer controls and presentation HUD components over one-off overlays.
- Keep geology, resource, and drilling visuals clear about evidence and uncertainty; avoid unsupported resource/reserve claims.
- Verify visual changes with browser screenshots where possible, especially for 3D scenes.
