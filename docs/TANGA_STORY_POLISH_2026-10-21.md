# Tanga story and presentation polish

## Direction

Visual thesis: graphite-dark presentation surfaces, a restrained copper accent and a readable 3D evidence canvas.

Content plan: name the project; locate it; establish the comparison basis; show the completed work; follow survey → drilling → geology → estimate; connect the illustrative site concept to testwork and infrastructure; close on study decisions.

Interaction thesis: a complete guided route; purposeful authored camera views; technical controls disclosed when viewers choose to inspect. Reuse the existing Three.js and MapLibre viewers and overlay slots.

The live production URL was still the earlier 11-chapter release during review. This pass builds on the repaired 12-chapter branch in PR #50. Review destination: the existing `codex/tanga-investor-experience` Vercel branch alias.

## Implementation checklist

- [x] Make Tanga Graphite the opening headline and add an explicit Enter the project action.
- [x] Show the three story acts in the introduction: place/scale, evidence, next stage.
- [x] Prevent the introductory overlay flashing on deep links while checking navigation state.
- [x] Route the complete guided story through all 12 chapters, with 270 seconds of authored hold time plus loading/transition time.
- [x] Give every chapter a distinct question, takeaway and duration in one typed story map.
- [x] Correct the act progression so the project/location/comparison chapters precede the evidence chapters.
- [x] Add a concise purpose/takeaway and next-view action on desktop 3D chapters.
- [x] Hide persistent terrain, geology and mine tool panels until Inspection tools is selected; retain direct orbit, zoom, below-ground and reset controls.
- [x] Keep resource grade colours available through an expandable key.
- [x] Explain the reported Indicated estimate alongside the spatial block model: 148 Mt, 4.94% TGC, approximately 7.31 Mt contained graphite.
- [x] Add direct processing-plant inspection from the mine chapter's story panel.
- [x] Make north/south pit camera shots reveal the pit concept, and make plant camera shots reveal the processing phase.
- [x] Advance the four work milestones through different source images and keep manual milestone selection synchronised with the story position.
- [x] Remove the duplicated milestone thumbnail and the closing chapter's obsolete peer-comparison shot.
- [x] Align presenter bridges with the actual next chapter.
- [x] Respect reduced-motion preferences for the new cue transition; suppress the desktop cue at narrow widths.
- [x] Suppress duplicate autoplay narration where the chapter cue is visible.
- [x] Show the guided chapter's actual duration instead of the normal autoplay duration.

## Verification record

- Final TypeScript and production/OpenNext Cloudflare builds passed.
- Browser checks exercised the opening/location/benchmark/work sequence, milestone-to-terrain advance, the terrain inspector, drilling/geology/resource chapters, the geological section cue, resource legend expansion and direct plant inspection.
- Complete guided playback reached chapter 12 and stopped with autoplay off. Intermediate checks confirmed the benchmark, drilling, geology, resource, mine and infrastructure chapters.
- Laptop (1366 × 768) and phone (390 × 844) checks found no horizontal overflow; the desktop cue is suppressed on phone and visible buttons remain within the viewport. Normal browser sizing was restored.
- Hosted review destination is the existing Vercel branch alias; deployment readiness and visual checks are reported with delivery.

## Evidence limits

This pass changes narrative, layout and inspection entry points. It does not change terrain elevations, collar coordinates, block values, resource classification, pit footprints or plant equipment geometry. The existing source-date, comparison-set, vertical-reference and conceptual-design qualifications remain in place.
