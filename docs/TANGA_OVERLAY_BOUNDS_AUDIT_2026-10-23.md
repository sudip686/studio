# Tanga presentation overlay bounds audit

Date: 23 October 2026  
Branch: `codex/tanga-investor-experience`  
Build: local production build at `http://localhost:3010`

## Method and scope

Measured visible overlay `getBoundingClientRect()` values after entering each chapter directly and dismissing the intro. The desktop and phone sweeps covered all 12 chapter entries at 1440 × 900 and 390 × 844. The 768 × 844 audit first sampled the five chapters with the most competing UI, then covered the seven remaining entries and reviewed their screenshot set. A pre-change tablet sweep exposed the narrow geology canvas and cue collision. The tablet screenshots also exposed the blank responsive background on Work completed; the chapter now uses its active source-evidence image behind the timeline panel.

These are viewport-space DOM bounds, not 3D camera-target or annotation collision measurements. A positive page-overflow check means the document width did not exceed the viewport; it does not establish physical-device GPU performance.

## Representative measured bounds

Bounds are `x, y, width, height` in CSS pixels.

| Viewport and view | Primary evidence panel | Chapter/view cue | Pager | Result |
|---|---:|---:|---:|---|
| Desktop 1440 × 900, typical chapter | Right story panel begins at `x=1076, y=190, w=340`; height varies by chapter | `x=300, y=723, w=740, h=73` | `x=380, y=806, w=679, h=72` | Separate horizontal/vertical slots |
| Desktop 1440 × 900, geology source map | Map sheet `x=300, y=208, w=740, h=588`; story panel at right | Hidden; map stage owns Continue | `x=380, y=806, w=679, h=72` | Map fits between story header and pager |
| Desktop 1440 × 900, peer comparison | Peer canvas `x=24, y=174, w=1392, h=566` | Hidden; comparison canvas contains its narrative | `x=380, y=806, w=679, h=72` | Removes cue from under the globe |
| Desktop 1440 × 900, metallurgy | Process exhibit `x=24, y=154, w=1392, h=560` | `x=300, y=723, w=740, h=73` | `x=380, y=806, w=679, h=72` | Exhibit and cue do not overlap |
| Phone 390 × 844, typical chapter | Story panel `x=12, y=493, w=366, h=200` | `x=12, y=709, w=236, h=45` | `x=10, y=762, w=370, h=72` | 16 px panel-to-cue gap; 8 px cue-to-pager gap |
| Phone 390 × 844, geology source map | Map sheet `x=12, y=173, w=366, h=306`; story panel `x=12, y=498, w=366, h=195` | Hidden; map stage owns Continue | `x=10, y=762, w=370, h=72` | Separate map and stage panel |
| Phone 390 × 844, peer comparison | Peer canvas `x=12, y=170, w=366, h=523` | Hidden; comparison canvas owns narrative | `x=10, y=762, w=370, h=72` | No duplicate cue below the panel |
| Phone 390 × 844, metallurgy | Process exhibit `x=12, y=154, w=366, h=537` | `x=12, y=709, w=236, h=45` | `x=10, y=762, w=370, h=72` | Exhibit and cue are separated |
| Tablet 768 × 844, typical chapter | Story panel `x=14, y=432, w=740, h=210` | `x=14, y=698, w=740, h=42` | `x=48, y=750, w=671, h=72` | Full-width bottom-sheet hierarchy |
| Tablet 768 × 844, geology source map | Map sheet `x=14, y=170, w=740, h=254`; story panel `x=14, y=432, w=740, h=210` | Hidden; map stage owns Continue | `x=48, y=750, w=671, h=72` | Replaced the pre-change 148 px wide map sheet |
| Tablet 768 × 844, Work completed | Source photograph fills `x=0, y=0, w=768, h=844`; story panel `x=14, y=432, w=740, h=210` | `x=14, y=698, w=740, h=42` | `x=48, y=750, w=671, h=72` | Active evidence image loaded; brand and controls paint above it |
| Phone 390 × 844, Work completed | Source photograph fills `x=0, y=0, w=390, h=844`; story panel `x=12, y=493, w=366, h=200` | `x=12, y=709, w=236, h=45` | `x=10, y=762, w=370, h=72` | Active evidence image loaded; no horizontal overflow |
| Tablet 768 × 844, peer comparison | Peer canvas `x=24, y=174, w=720, h=566` | Hidden; comparison canvas owns narrative | `x=48, y=750, w=671, h=72` | No cue overlap |
| Tablet 768 × 844, metallurgy | Process exhibit `x=24, y=154, w=720, h=504` | `x=14, y=698, w=740, h=42` | `x=48, y=750, w=671, h=72` | Exhibit ends 40 px before cue |

All probed pages reported no horizontal document overflow. Desktop, tablet and phone checks now cover all 12 chapter entries. The focused 768 × 844 check found and fixed the Work completed image gap; the final production build was reloaded and checked at 768 × 844 and 390 × 844. The active core photograph loaded, the brand and controls remain above it, and panel/cue/pager bounds stay in their measured slots.

## Changes informed by the audit

- At 761–900 px, the geology sheet now uses the full content width, the chapter panel moves below it, and a compact cue sits above the pager.
- The story cue is informational. The pager Next control is the single chapter/view navigation action; its accessible name describes the next view or chapter.
- During the four geology map stages, the map panel is the single Continue action and the pager's duplicate Next button is hidden. Stage tabs and previous navigation remain available.
- The full-screen peer comparison supplies its own narrative, so the covered global story cue is hidden at every viewport.
- At widths up to 1200 px, Work completed now uses the selected source photograph as a full-bleed backdrop, below the brand, chapter title, evidence panel and navigation. This replaces the blank canvas produced when the 3D stage is hidden on smaller screens.

## Still open

- At 1707 × 842, measured callout rectangles for the topography, drillholes, resource and mine-planning overview. None intersected the primary story panel or left the viewport. Still measure the authored subsurface depth stages, mine facility close-ups and phone/tablet layouts; the original DOM bounds sweep does not establish collisions in those views.
- Inventory every chapter-specific tool, disclosure and fallback panel before claiming complete overlay consolidation.
