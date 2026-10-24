# Mine-to-feed animation route audit

Date: 24 October 2026. Desktop presentation implementation on `codex/tanga-investor-experience`.

## Source basis

- PaulSam Geo-Engineering, June 2023 study, extracted as `PaulSam Study Report June,23 1.md`: Findings state that an earth road of approximately 2 km would connect the mine to a feed-in point; section 5.10 describes a planning truck fleet. The report does not provide georeferenced endpoints or a road centerline for that mine-to-feed road.
- `public/generated/paulsam-development-reference.json`: site 2 feed point is an approximate image-grid trace from PaulSam Figure 3.3. Its registration explicitly is not surveyed facility control.
- Candidate pits come from the existing conceptual mine-planning model and are not approved pit designs.

## Display behavior

One illustrative truck follows the selected pit's conceptual internal ramp, then a terrain-sampled path toward the approximate mapped feed apron. The generated path avoids the conceptual pit envelopes and samples the available terrain; it is not constrained to the provisional licence boundary because the report describes a mine-access road to a separate feed point. No land access, settlement, forest-reserve, road-engineering, drainage, gradient, or permitting assessment is implied. It is a presentation connection only: the report's approximate 2 km estimate is not used to set or validate this centerline, and the generated route is not a surveyed alignment, road design, permit, operating speed, haulage rate, or production schedule. The reported estimate and this generated geometry must remain separate in the story copy.

The road is rendered with a fixed-color gravel palette so camera movement does not alter its apparent color. The truck shares the presentation motion clock, pauses with the shared pause state, and remains static under reduced motion or when the browser tab is hidden. Its movement is illustrative pacing; the separate conveyor cue retains the approximate report-traced alignment.

## Desktop verification

- Fresh local `#mine_planning` entry at 1366 × 768 reached `data-ready=true`, produced one truck and a generated pit-to-feed path, and showed no in-page alert or JavaScript error.
- The route planner completed with 34 terrain samples on the closest candidate pit configuration. This sample count is a rendering diagnostic, not route length or route validation.
- Captures: `.playwright-mcp/mine-haul-route-1366x768.png`, `.playwright-mcp/mine-haul-route-1707x842.png`, and `.playwright-mcp/mine-haul-route-feed-detail-1366x768.png`.

## Remaining limit

The route cannot be accepted as a credible mine road until its mine/FIP control points and road alignment are supplied or validated against a source. The generated visualization must not be described as the report's mapped 2 km route.
