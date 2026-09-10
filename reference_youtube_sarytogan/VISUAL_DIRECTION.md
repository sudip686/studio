# Reference — Sarytogan PFS 3D Animation (YouTube, 05:11)

> REFERENCE ONLY. Not part of the app build. Future agents: read this + `frames_manifest.json`
> + `transcript_clean.txt` to match the visual direction for presentations.
>
> ## AGENT LOOKUP (read first)
> User asks for a slide on TOPIC → open `slide_map.json`, take that topic's `use_frames`
> as the ONLY visual reference. Copy its `design_tokens`. Never mix beats: pits ≠ orebody
> (`frame_0080`), concentrator (`frame_0125/0130`) ≠ downstream (`frame_0225/0265`).
> Topics: `mining_pit` → 0105/0095 · `metallurgy_plant` → 0130/0125 ·
> `project_location` → 0020/0047/0010 · `resource_geology` → 0080/0060/0070 ·
> `end_use_market` → 0030 · `downstream_technology` → 0225/0265 ·
> `esg_infra` → 0155/0172/0195 · `product_stat` → 0235/0080 ·
> `title_branding` → 0003 · `logistics_location` → 0295 · `people_esg` → 0150/0180.

Source: `https://www.youtube.com/watch?v=EVKrPWzrIFc` (Sarytogan Graphite channel).
Related study: Sarytogan PFS Aug 2024 (ASX:SGA).

## Storyboard (matches `frame_*.jpg` + manifest timecodes)

1. `frame_0003` — white title card: hex-cube logo + wordmark.
2. `frame_0010` — globe → Kazakhstan w/ flag. Location pitch.
3. `frame_0020` — satellite zoom, `Project Site` label + north arrow.
4. `frame_0030` — Li-ion cells macro. End-use hook.
5. `frame_0047` — terrain + `Mining License` pill. Tenement.
6. `frame_0060` — glowing `Granitic Pluton` + drill grid. Heat-source diagram.
7. `frame_0070` — drill collars + `North/Central Graphite Zone` labels.
8. `frame_0080` — aerial orebody (purple zones) + stat cards (229Mt / 28.9% TGC).
9. `frame_0095` — pits + `Low grade` / `Waste dump` labels. Mine layout.
10. `frame_0105` — clean pits panorama, no labels. Custom-label plate.
11. `frame_0125` — beneficiation plant flyover w/ process callouts.
12. `frame_0130` — plant close-up: `Flotation` / `Workshop` / `Power Substation`.
13. `frame_0150` — accommodation village. Human/ESG beat.
14. `frame_0155` — tailings dam + blue pond.
15. `frame_0172` — water map: villages + `Sherubai-Nura River` pills.
16. `frame_0180` — truck at loading shed. Product leaves site.
17. `frame_0195` — pylon + `Existing Solar Power` pano. Grid beat.
18. `frame_0225` — thermal reactor cutaway. Technology hero shot.
19. `frame_0235` — plant hall + `99.999% Carbon` / `2800° Celsius` stat overlays.
20. `frame_0265` — downstream halls w/ building callouts. Scale-up vision.
21. `frame_0295` — globe + rail route. Logistics outro / green-energy close.

## Per-topic slide recipes (detail of `slide_map.json`)

- **Mining pit slide** → `frame_0105` (clean) or `frame_0095` (labelled). Oblique 3/4 aerial,
  dark terraced voids in tan steppe, sheds tiny at horizon, cloudy top third. Labels if any:
  dark pill + cyan text + thin leader line. For a custom pit slide use 0105 and add your
  own pills in the same style.
- **Metallurgy slide** → `frame_0130` (close-up) or `frame_0125` (flyover). Closer orbit,
  white sheds on concrete pads, ONE label per unit, dark dam band behind. Never use the
  dark reactor close-up (`frame_0225`) for a flotation/crushing slide.

## Visual direction to reuse

- **Medium:** cinematic 3D animation flyovers, slow push-in / orbit. No talking heads, no stock footage.
- **Palette:** arid steppe (ochre/tan/green scrub) + industrial blue roofs + white sheds; dark slate backgrounds for tech close-ups; cyan (#~35D0E0) label text.
- **Labels:** dark pill/callout tags with thin leader lines pointing at equipment (`Thermal Reactor`, `Mill`, `Feed Bin`, `Crushing`, `Screening`, `Pilot Spheronisation Mill`). Stat cards: dark translucent panel, big cyan number + small white caption.
- **Structure:** globe bookends (zoom-in at open, route map at close) → resource proof → process tour in flow order → people/ESG → technology hero → scale-up → logistics. One idea per shot, narration carries numbers.
- **Tone:** calm, factual, investor-grade. Numbers on screen, adjectives in voiceover.

## Files

- `frame_*.jpg` — 640×360 timestamp screens, filename = seconds (`frame_0225.jpg` = 03:45).
- `frames_manifest.json` — per frame: timecode, scene description, story beat, narration window.
- `transcript_clean.txt` — full narration with `[mm:ss]` ranges (auto-caption spelling noise noted inside).
- `meta.json` — source IDs + re-fetch command for the mp4.
