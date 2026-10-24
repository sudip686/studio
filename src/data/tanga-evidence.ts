export type TangaChapterId =
  | 'ranking' | 'work_completed' | 'tanzania' | 'project' | 'topography' | 'accessibility'
  | 'drillholes' | 'subsurface' | 'resource' | 'mine_planning'
  | 'metallurgy' | 'comparison';

export type EvidenceSource = {
  title: string;
  locator: string;
  qualification: string;
  href?: string;
};

export const CHAPTER_SOURCES: Record<TangaChapterId, EvidenceSource[]> = {
  ranking: [
    {title: 'Mining Intelligence / Costmine global project benchmark', locator: 'Published 7 November 2023 · reported contained-graphite values for a selected ten-project set', qualification: 'Historical selected project benchmark, not a verified current ranking of every natural graphite deposit. Costmine describes the values as based on reported estimates and studies but does not provide one row-by-row date/category ledger. A separately published Northern Miner version calls the list M&I; this is not enough to establish like-for-like categories for every row.', href: 'https://www.costmine.com/2023/11/07/ranked-worlds-top-10-graphite-projects/'},
    {title: 'Northern Miner · republished graphite project ranking', locator: '7 November 2023 · describes the selected ranking as measured and indicated contained graphite', qualification: 'This version states an M&I basis, while Costmine’s source page says reported estimates and studies. The publisher wording and primary-source spot checks do not establish a uniform row-by-row basis.', href: 'https://secure.northernminer.com/news/ranked-worlds-top-10-graphite-projects/1003860567/'},
    {title: 'Triton · Nicanda Hill Mineral Resource', locator: 'ASX technical report · September 2016 restatement · 41.5 Mt Indicated; comparison table gives 41.51 Mt for October 2015', qualification: 'Both primary values are below the 41.7 Mt in the 2023 benchmark, and the benchmark does not identify a row-by-row source table. Retain 41.7 only as published for this historical comparison; do not present the values as reconciled.', href: 'https://announcements.asx.com.au/asxpdf/20161024/pdf/43c81t8hnq20t0.pdf'},
    {title: 'Sarytogan Graphite Mineral Resource', locator: '2023 MRE · 126 Mt Indicated at 28.8% TGC · approximately 36 Mt contained graphite', qualification: 'Primary disclosure confirms the Indicated category; the selected benchmark reports 36.3 Mt.', href: 'https://announcements.asx.com.au/asxpdf/20230426/pdf/45p05z8s36gslx.pdf'},
    {title: 'Nouveau Monde Graphite · Lac Guéret / Uatnan resource', locator: 'December 2022 pit-constrained MRE · 65.644 Mt Measured + Indicated at 17.21% Cg · 11.30 Mt contained graphite', qualification: 'The 2023 Uatnan PEA resource table supports the selected benchmark figure after rounding; this is a mineral resource, not a reserve.', href: 'https://www.sec.gov/Archives/edgar/data/1649752/000110465923036286/nmg-20221231xex99d3.htm'},
    {title: 'Black Rock Mining · Mahenge Mineral Resource', locator: '2023 estimate · 116.4 Mt Measured + Indicated at 8.0% TGC · 9.3 Mt contained graphite', qualification: 'Primary disclosure supports the selected benchmark figure and M&I category.', href: 'https://announcements.asx.com.au/asxpdf/20230529/pdf/05q3wrk44jy2d7.pdf'},
    {title: 'Renascor Resources · Siviour Mineral Resource', locator: 'September 2023 estimate · 16.9 Mt Measured + 56.2 Mt Indicated · approximately 5.2 Mt contained graphite', qualification: 'Primary disclosure supports the selected benchmark figure and M&I category.', href: 'https://announcements.asx.com.au/asxpdf/20230914/pdf/05tvyxgwh07zl0.pdf'},
    {title: 'NGX · Malingunde Mineral Resource', locator: '30 June 2023 statement · 4.8 Mt Measured + 32.3 Mt Indicated · 2.73 Mt contained graphite', qualification: 'Primary disclosure supports the selected benchmark figure after rounding; the project now reports further information separately from the benchmark snapshot.', href: 'https://announcements.asx.com.au/asxpdf/20230921/pdf/05v44zt4y2vxsz.pdf'},
    {title: 'Lomiko Metals · La Loutre Mineral Resource', locator: '2023 MRE · 64.696 Mt Indicated at 4.59% Cg · 2.969 Mt contained graphite', qualification: 'Primary disclosure supports the selected benchmark figure after rounding; its reported resource category is Indicated.', href: 'https://lomiko.com/wp-content/uploads/2023/05/43-101-MRE2023-Lomiko-La-Loutre.pdf'},
    {title: 'Battery Minerals · Balama Central Mineral Resource', locator: 'March 2018 MRE · 26.6 Mt Indicated at 10.3% TGC · 2.733 Mt contained at a 6% TGC cut-off', qualification: 'Matches the 2.732 Mt figure in the 2023 benchmark after rounding. Later resource summaries use different dates and cut-offs; this is a historical row check, not a current peer value.', href: 'https://www.tirupatigraphite.co.uk/images/TG%20Company%20Presentation%20Q32023.pdf'},
    {title: 'Total Graphite · Balama Central 2025 resource update', locator: '30 September 2025 MRE · 50.1 Mt Indicated at 7.7% TGC · 3.86 Mt contained graphite', qualification: 'Later estimate at a 2.5% TGC cut-off, so it should not replace the historical 2018 row without restating the whole comparison date basis.', href: 'https://totalgraphite.com/?dlp_document=fy26-annual-report'},
    {title: 'Volt Resources · Bunyu Stage 1 Mineral Resource', locator: '14 August 2023 FS update · 8.0 Mt Measured at 5.8% and 31.9 Mt Indicated at 5.6%; about 2.25 Mt contained M&I', qualification: 'This 2.93% TGC cut-off model is a restricted Stage 1 subset, not the global Bunyu resource. Rounded category figures imply approximately 2.25 Mt contained graphite, consistent with the 2.3 Mt rounded value in the 2023 benchmark; the benchmark does not disclose its row-level source.', href: 'https://announcements.asx.com.au/asxpdf/20230814/pdf/05slswdzgwlddt.pdf'},
    {title: 'Volt Resources · Bunyu global Mineral Resource', locator: '2023 Annual Report · 20 Mt Measured at 5.3% and 155 Mt Indicated at 5.0%', qualification: 'These rounded broader-resource figures imply approximately 8.8 Mt contained graphite in M&I. This is a different scope from the Stage 1 subset and should not replace the historical benchmark value without restating the complete comparison.', href: 'https://announcements.asx.com.au/asxpdf/20230927/pdf/05vbgy3sdc39kk.pdf'},
    {title: 'Volt Resources · Bunyu 2025 Mineral Resource statement', locator: '30 June 2025 · 20 Mt Measured at 5.3% and 122 Mt Indicated at 5.2%', qualification: 'The report says expired prospecting licences removed Bunyu 2 and 3 resources from this statement. Rounded category figures imply about 7.4 Mt M&I contained graphite; this later estimate is not substituted into the 2023 snapshot.', href: 'https://announcements.asx.com.au/asxpdf/20250926/pdf/06prg2ngcqf1n7.pdf'},
    {title: 'EcoGraf · Epanko Mineral Resource Estimate', locator: 'ASX release · 11 March 2024 · 88 Mt Measured + Indicated at 7.6% TGC; 6.71 Mt contained graphite', qualification: 'Used as the updated Epanko figure in the selected comparison set.', href: 'https://www.ecograf.com.au/wp-content/uploads/2024/03/06_EGR_ASX_127-Increase-in-MRE_11-March-2024.pdf'},
    {title: 'AMC Tanga Graphite MRE', locator: 'Final report · 19 December 2025 · 148 Mt Indicated at 4.94% TGC', qualification: '7.31 Mt contained graphite in the Indicated category sorts fifth against the selected benchmark values as published. The peer rows are not harmonized on estimate date and category, so this is not a like-for-like or current global rank.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
  ],
  work_completed: [
    {title: 'AMC Tanga Graphite Mineral Resource Estimate', locator: 'Final report · 19 December 2025 · drilling §3.2; Table I', qualification: 'Work dates and estimate values are attributed to the report; no project ownership claim is made.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
    {title: 'Survey Report · Tanga Graphite Project', locator: 'Survey methods and field photographs · survey delivery dated August 2025', qualification: 'Photographs are contextual source images; they are not location-tagged to the displayed camera.'},
  ],
  tanzania: [
    {title: 'Project location', locator: 'Maramba village area · Mkinga District · Tanga Region', qualification: 'Map location context; project boundary remains provisional.'},
  ],
  project: [
    {title: 'Survey Report · Tanga Graphite Project', locator: 'Topographical survey sheets 1–2 · CRS WGS 84 / UTM zone 37S', qualification: 'Aerial image is a report figure; shown as site context, not a georeferenced orthophoto.'},
  ],
  topography: [
    {title: 'Surveyed digital terrain model', locator: 'DTM.tif · August 2025 aerial survey · EPSG:32737 · source spacing ≈0.655 m', qualification: 'Source metadata does not state the vertical datum. The DTM is sampled to a ≈7.4 m raster and ≈20 m display mesh; outer terrain uses regional DEM. Grid spacing is not an accuracy claim.'},
    {title: 'Derived slope display', locator: 'Computed from DTM elevations and source pixel spacing · degrees', qualification: 'The supplied SLOPE.tif is not displayed because its numeric units are not documented.'},
  ],
  accessibility: [
    {title:'PaulSam transportation and logistics study',locator:'June 2023 · Figure 3.5 / PDF p.36; §§3.3, 5.3 and 6',qualification:'Historical proposed transfer chain and candidate stuffing locations. No surveyed CFS parcel, approved alignment, current road capacity or commercial logistics agreement is established.'},
    {title: 'Road and infrastructure context', locator: 'OpenStreetMap features and routed path', qualification: 'Indicative geography and route distance do not establish access rights, infrastructure capacity, or a project connection.'},
  ],
  drillholes: [
    {title: 'AMC Tanga Graphite Mineral Resource Estimate', locator: 'Final report · 19 December 2025 · drilling §3.2; Figure 3.9', qualification: 'The core photograph is report evidence and is not asserted to be the selected 3D hole.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
    {title:'Collar coordinate cross-check',locator:'August 2025 survey shapefile vs AMC DH_Collar.csv · 100 records',qualification:'99 survey IDs match the displayed collars; one survey ID has a probable O/0 transcription issue. After Arc 1960 to WGS 84 transformation, TGDD1037 and TGDD1076 remain about 199 m and 190 m from their displayed survey positions. Source coordinates are retained pending reconciliation. Survey and regional terrain vertical datums are not stated.'},
  ],
  subsurface: [
      {title:'Tanga project geological map', locator:'Existing project asset · original coordinate grid and lithology legend', qualification:'Original sheet plus derived transparent rock polygons. Printed UTM grid provides approximate registration; map datum, source date and contacts require independent verification. Soil is omitted; no image contacts are extruded into the existing model.', href:'/geology_map.jpg'},
      {title:'AMC MRE · Regional geological map', locator:'19 December 2025 · Figure 2.1 · PDF p.18 / report p.8 · after Geological Survey of Tanzania, 2015', qualification:'Regional Tanzania context at 1:10,000,000; not the detailed project map or a source for extruded 3D contacts.', href:'/presentation-assets/mre-regional-geology.jpg'},
    {title: 'Merged petrography report · Tanga Graphite Project', locator: 'Sample crosswalk: TGF002 / TGDD1009 / 18.25–18.38 m; assay ID TD0058', qualification: 'A traceable sample record. The 3D geological surfaces remain interpreted between observation points.'},
    {title: 'Photomicrograph', locator: 'TGF002 · TGDD1009 · 18.25–18.38 m', qualification: 'Source micrograph reproduced without adding a scale or changing its interpretation.', href: '/presentation-assets/petrography-tgdd1009-18m.jpg'},
  ],
  resource: [
    {title: 'AMC Tanga Graphite Mineral Resource Estimate', locator: 'Final report · effective date 1 November 2025 · final 19 December 2025 · Table I', qualification: 'Published report values and classification; app block counts or display filters are not a new resource statement.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
  ],
  mine_planning: [
    {title:'Illustrative waste and water facilities',locator:'Procedural concept geometry screened against displayed terrain and current facility / pit footprints',qualification:'No source facility design or approved location is supplied. Dimensions are illustrative, not storage capacity or a hydrological / stability result. Lowland ground uses regional terrain context. Water connections are concept pipes, not validated routes.'},
    {title:'PaulSam transportation and logistics study',locator:'June 2023 · Figure 3.3 / PDF p.33; Tables 3.3, 5.3 and 5.5',qualification:'Feed point and lowland discharge digitised approximately from the UTM 37S map. Option 2 is a planning assumption, not a final site selection. Facility geometry is illustrative.',href:'/presentation-assets/paulsam-conveyor-sites.jpg'},
    {title: 'Internal concept geometry', locator: 'Existing block-model coordinates and provisional project boundary', qualification: 'Presentation concept only; not an optimised mine design, reserve, schedule, cost estimate, or permitted facility.'},
  ],
  metallurgy: [
    {title:'Global Sustainable Eco-Solutions · Graphite report for SMMPL',locator:'12 April 2025 · PDF pp.2, 15–16, 25, 46, 169–172',qualification:'120 samples received, 40 selected for characterisation, 23 for thin sections. Microscopy and spectroscopy do not establish commercial product or battery qualification.'},
    {title: 'IMO flotation testwork report', locator: 'Final report Rev. 0 · December 2025 · §3.1, Table 2 and Figures 18–19', qualification: 'Supports final cleaner TC grade and recovery values, including the TDM004 low-recovery result. Laboratory results do not establish operating performance or customer qualification.', href: '/6798-%20Sakariya%20Tanzanian%20Graphite%20-%20Final%20Report%20-%20Rev0%20(1).pdf'},
    {title: 'AMC Mineral Resource Estimate', locator: 'Final report · Table II · eight-sample coarse/fine fraction mass and TC grade', qualification: 'The displayed +150 µm values use this table’s mass fractions. IMO narrative summaries use grouped/rounded values and call TDM008 Fresh / Kaolin; AMC groups it as oxide / kaolinised. Do not mix these bases within one chart.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
  ],
  comparison: [
    {title: 'Next-stage decisions', locator: 'Survey / sample provenance / geology / model / development studies', qualification: 'Decision sequence is a work plan, not a forecast of engineering outcomes.'},
  ],
};

export const WORK_MILESTONES = [
  {
    id: 'drilling',
    date: '2022–2025',
    title: 'Diamond drilling',
    detail: 'The AMC report describes 100 diamond drillholes across the exploration program.',
    image: '/presentation-assets/verified-core-example.jpg',
    imageAlt: 'Logged Tanga graphite drill core with cut line and sampling intervals marked',
    source: 'AMC MRE · §3.2 · Figure 3.9',
  },
  {
    id: 'survey',
    date: 'August 2025',
    title: 'Aerial topographic survey',
    detail: 'A WGS 84 / UTM zone 37S terrain model, contours and survey control were delivered.',
    image: '/presentation-assets/survey-site-aerial.jpg',
    imageAlt: 'Aerial photographs of the forested hill country around the Tanga project area',
    source: 'Survey Report · topographical sheets · DTM.tif',
  },
  {
    id: 'resource',
    date: 'Nov–Dec 2025',
    title: 'Mineral Resource Estimate',
    detail: 'AMC effective date 1 November 2025; final report dated 19 December 2025.',
    image: '/presentation-assets/resource-summary-figure.png',
    imageAlt: 'Resource summary figure reproduced from the public project presentation assets',
    source: 'AMC MRE · Table I and report date',
  },
  {
    id: 'testwork',
    date: 'April–December 2025',
    title: 'Characterisation & flotation',
    detail: 'The April characterisation report and December flotation report document complementary sample and processing evidence.',
    image: '/presentation-assets/metallurgy-samples.jpg',
    imageAlt: 'Photographs of project metallurgy testwork samples',
    source: 'IMO Flotation Testwork · Final Report Rev. 0',
  },
];

export const NEXT_DECISIONS = [
  {number: '01', title: 'Close the evidence loop', detail: 'Reconcile collar elevations, survey vertical reference, sample IDs, assays and imagery in one traceable register.', chapter: 'drillholes', chapterLabel: 'Review drilling evidence', evidenceLabel: 'AMC MRE · §3.2 / Figure 3.9', evidenceHref: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
  {number: '02', title: 'Advance study confidence', detail: 'Define the next drilling, metallurgical variability and geological validation work needed for the next study stage.', chapter: 'metallurgy', chapterLabel: 'Review testwork', evidenceLabel: 'IMO testwork · §3.1 / Table 2', evidenceHref: '/6798-%20Sakariya%20Tanzanian%20Graphite%20-%20Final%20Report%20-%20Rev0%20(1).pdf'},
  {number: '03', title: 'Test development constraints', detail: 'Evaluate access, water, power, environmental, geotechnical and logistics assumptions before engineering a concept.', chapter: 'accessibility', chapterLabel: 'Review logistics', evidenceLabel: 'PaulSam · Figure 3.3 excerpt', evidenceHref: '/presentation-assets/paulsam-conveyor-sites.jpg'},
];
