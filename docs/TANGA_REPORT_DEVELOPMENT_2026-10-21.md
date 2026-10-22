# Report-based development concept

## Review and direction

Sources: PaulSam Study Report June 2023 (75 PDF pages), and Graphite report for SMMPL dated 12 April 2025 (172 PDF pages). The complete MinerU text and image/table inventories were indexed. Location, alternatives, transport chain, facility allowances, sample preparation, analytical methods, summary and recommendations informed this implementation. Selected source maps and laboratory figures were visually inspected. No new interpretation of the individual analytical spectra or commercial product qualification is claimed.

VRIFY reference: https://vrify.com/decks/24534. Reviewed all five scenes in the user's Chrome session: regional overview, labelled pit/facility plan, drilling/resource composition and both subsurface highlights. Adopted restrained ground colour, clear foreground data, compact anchored labels and a consistent surface → drilling → geology → estimate navigator. Tanga's data and application architecture remain its own.

## Implementation checklist

- [x] Correct the development story: uphill mining and feed station, downhill processing, then concentrate transfer and stuffing before export.
- [x] Trace all three Figure 3.3 alternatives from the original 1301 × 1289 image's labelled EPSG:32737 grid; keep calibration, rounded coordinates and source-image SHA-256 in a generated reference.
- [x] Select option 2 as the report's §5.3.4 planning assumption, not an approved site decision.
- [x] Disclose the report discrepancy: option 2 is 2.15 km in its table but approximately 2.45 km in the traced image.
- [x] Move processing out of the pit-area placement to the lowland discharge candidate.
- [x] Use the 250 × 250 m land allowance to scale the illustrative campus; preserve the distinction between land allowance, levelled area and built area.
- [x] Add workshop bays, administration/laboratory, service yard, security perimeter, water provision and loading doors alongside the six process areas.
- [x] Batch static plant geometry; the latest campus contains 763 source parts in 29 meshes.
- [x] Add a feed station with the report's 15,000 m² apron and 30 × 50 m operatives-shed allowance.
- [x] Resolve overlap between the old mapped feed candidate and the current conceptual pit: screen a nearby proposed apron and its indicative connection against pit footprints, and record the shift separately from the source coordinates.
- [x] Draw an illustrative conveyor profile with terrain clearance and supporting frames. Its supports and physical profile are not supplied engineering designs.
- [x] Withhold the invented direct pit-to-lowland truck route; the report separates ore haulage to feed from the downhill conveyor leg.
- [x] Provide connected-site, feed, plant, services and individual-equipment cameras; synchronise direct story-panel navigation with the authored shot position.
- [x] Keep grade targets and drill context out of facility close-ups, with their original data retained for pit/evidence views.
- [x] Expose the report map, alternatives and placement qualifications beside the proposed-site story.
- [x] Add the report's ore → concentrate → stuffing → export chain to the logistics chapter.
- [x] Add the April report's 120 received → 40 characterised → 23 thin-section selection trail.
- [x] Show actual microscopy, SEM and preparation figures, with PDF page/figure locators and original scales retained.
- [x] Use a native evidence dialog for focus handling/Escape and stop guided playback when opening it.
- [x] Add consistent surface/drilling/geology/estimate navigation, muted subsurface ground and fine white label leaders.
- [x] Preserve terrain elevations, collar coordinates, geological meshes and resource cell values.

## Source limits and unlocated structures

The report does not supply an engineered concentrator general arrangement, surveyed plant parcel, a tailings storage design, waste-dump design, camp coordinates, utility connection design or a surveyed mine-to-feed haul route. The 250 m square is a land-budget allowance, not a cadastral parcel or an assertion that all land is levelled. Industrial arrangement, equipment dimensions, support heights and water provision are illustrative.

Mabokweni / Kwa Songoro stuffing sites are named alternatives. No precise yard plot is established, so the logistics chapter names the transfer function without inventing a georeferenced export-yard parcel. Forest-reserve overlap is flagged in the report; this presentation does not establish environmental clearance or permissions. June 2023 prices, road restrictions, capacities and production assumptions are not presented as current facts.

## Verification

TypeScript and the production/OpenNext build passed during implementation. Browser review checked source-registered development data, below-ground access, all 155,853 resource cells, facility-camera position synchronisation, and report-image loading. The screened proposed feed apron is 146 m from the old map marker (mapped E476375/N9465900; proposed E476500/N9465825). Opening report evidence changed autoplay from true to false. The 390 × 844 evidence dialog stayed inside the viewport with no horizontal overflow; normal browser sizing was restored. Final build and hosted-review outcomes accompany delivery.
