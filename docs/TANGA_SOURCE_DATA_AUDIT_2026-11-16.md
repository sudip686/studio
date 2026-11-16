# Tanga presentation source audit

Date: 16 November 2026. Scope: the user-supplied OreWaste `outputs` folder and MinerU `documents_raw` report extracts. This is a source inventory for presentation design, not a new engineering or economic review.

## Supplied source locations

- OreWaste outputs: `C:\Users\SUDIPTA CHANDA\OneDrive - SAKARIYA MINES AND MINERALS PVT LTD\Backup\Mining_Geology_Research\02_Tanga_Graphite_Project\tanga-orewaste-app\outputs`
- PaulSam study: `...\MinerU_output_20260801\documents_raw\PaulSam Study Report June,23 1\auto`
- SMMPL graphite report: `...\MinerU_output_20260801\documents_raw\Graphite report_SMMPL_12042025\auto`
- AMC MRE: `...\MinerU_output_20260801\documents_raw\0424046 Tanga Graphite Mineral Resource Estimate - 19 December 2025\auto`

The three report folders contain MinerU Markdown, extracted JSON, and source PDFs. Findings below were checked against the extracted Markdown and selected workbook/CSV metadata; no new values were transcribed into the application in this audit.

## Evidence inventory and presentation use

| Source | Checked content | Safe presentation use | Limits to preserve |
|---|---|---|---|
| `Tanga_Mine_to_Market_Planning_Report.md` | Staged case descriptions, cash-flow model basis, project caveats | A separately labeled, source-linked modeled development/economic scenario after case reconciliation | The report says planned dates/capacities are not a constructed annual mining schedule; the model consumes one selected shell's average inventory and does not create new tonnes or higher grade |
| `Tanga_Staged_Cashflow.csv` + `Tanga_Staged_Assumptions.json` | Model years 0–20 and one set of configured assumptions | A financial scenario scrubber only if the exact route/case and assumptions are confirmed and identified on screen | Not spatial mine phases; cannot drive pit growth, benches, haul roads, footprint or closure geometry |
| `Tanga_OreWaste_Report_20260919_140839.xlsx` | Workbook tabs: `Resource_Summary`, `Sensitivity`, `Parameters` | Resource summary/sensitivity with the workbook's own definitions and qualifications | No dated spatial mine phases were found in this workbook |
| `outputs\block_model.json` and the deployed `public/generated/orewaste-reference.json` | Source block model and one RF1 shell with North/South pit surfaces | Current two-pit concept and associated source blocks, with RF1 and conceptual status explicit | This is a single shell case, not a sequence of mine stages. The MRE states its resource model is not constrained by a nominal pit shell |
| PaulSam, *Study Report*, June 2023 | Sections on the proposed lowland plant, conveyor choices, road/port logistics and facility allowances | Explain why a lowland plant and a conveyor were considered; show Option 2 as the report's planning assumption with the existing approximate-registration notice | Candidate sites and map-traced alignments are not surveyed/engineered facilities or approved land parcels |
| SMMPL, *Graphite report*, 12 April 2025 | Metallurgy, product pathways and indicative downstream economics | Show testwork context and clearly separated illustrative downstream routes | Its cases/economics differ from the September 2026 planning model; do not blend figures or present either as a sanctioned investment recommendation |
| AMC, *Tanga Graphite Mineral Resource Estimate*, 19 December 2025 | Resource model, geological domains, and bench-scale testwork | Resource/geology provenance and report-linked metallurgy evidence | The report says the resource model is not reported within a constraining nominal pit shell; later RF1 geometry must remain a separate planning concept |

## Implementation consequences

1. The mine-planning image should continue to use the RF1 North/South surfaces and source blocks as one static conceptual case until dated spatial phases are supplied. A cash-flow year slider must never alter pit geometry.
2. A future cash-flow interaction belongs in an explicitly economic/scenario view. Before it is exposed, reconcile the CSV to the intended product route in the report and show its model basis, units, and scenario status.
3. Keep the connected processing-plant tour separate from the eight-composite testwork board. The plant arrangement is conceptual; TC, recovery and coarse mass fraction keep their separate denominators and report references.
4. Retain PaulSam's lowland siting and Option 2 conveyor as report-based candidates, while stating map registration and engineering limits beside the visual.
5. The 2025 downstream report and 2026 mine-to-market report have different scenario scopes. Displaying an investment ranking requires a single reconciled case set and one consistent basis.

## Work still requiring source reconciliation

- Identify which staged cash-flow row/configuration is the intended investor-facing case and tie it to a named case in the planning report.
- Confirm whether a newer, authorized mine schedule contains phase-by-phase spatial surfaces and material quantities. None were present in the checked RF1 workbook, current reference artifact, or report sections inspected here.
- Resolve whether a downstream pathway is an option, a modeled case, or an approved project decision before promoting it in the closing story.
