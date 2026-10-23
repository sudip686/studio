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
    {title: 'Mining Intelligence / Costmine global project benchmark', locator: 'Published 7 November 2023 · reported contained-graphite values for a selected ten-project set', qualification: 'Historical selected project benchmark, not a verified current ranking of every natural graphite deposit. Estimate dates and reported categories vary; Epanko is updated using its 2024 MRE.', href: 'https://www.costmine.com/2023/11/07/ranked-worlds-top-10-graphite-projects/'},
    {title: 'Triton · Nicanda Hill Mineral Resource', locator: 'ASX technical report · September 2016 MRE · 41.5 Mt Indicated contained graphite', qualification: 'Spot check against the 2023 benchmark’s 41.7 Mt figure; this confirms that the benchmark summary is not sufficient to assert one uniform category across peer entries.', href: 'https://announcements.asx.com.au/asxpdf/20161024/pdf/43c81t8hnq20t0.pdf'},
    {title: 'EcoGraf · Epanko Mineral Resource Estimate', locator: 'ASX release · 11 March 2024 · 88 Mt Measured + Indicated at 7.6% TGC; 6.71 Mt contained graphite', qualification: 'Used as the updated Epanko figure in the selected comparison set.', href: 'https://www.ecograf.com.au/wp-content/uploads/2024/03/06_EGR_ASX_127-Increase-in-MRE_11-March-2024.pdf'},
    {title: 'AMC Tanga Graphite MRE', locator: 'Final report · 19 December 2025 · 148 Mt Indicated at 4.94% TGC', qualification: '7.31 Mt contained graphite in the Indicated category places Tanga fifth within this selected comparison set; this does not establish a current global rank.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
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
    {title: 'IMO flotation testwork report', locator: 'Final report Rev. 0 · December 2025', qualification: 'Reported laboratory results; do not infer product qualification or commercial performance.', href: '/6798-%20Sakariya%20Tanzanian%20Graphite%20-%20Final%20Report%20-%20Rev0%20(1).pdf'},
    {title: 'AMC Mineral Resource Estimate', locator: 'Final report · Table II · flake and concentrate summaries', qualification: 'Composite results vary; carbon grade, recovery and flake fraction are distinct measures.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
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
  {number: '01', title: 'Close the evidence loop', detail: 'Reconcile collar elevations, survey vertical reference, sample IDs, assays and imagery in one traceable register.'},
  {number: '02', title: 'Advance study confidence', detail: 'Define the next drilling, metallurgical variability and geological validation work needed for the next study stage.'},
  {number: '03', title: 'Test development constraints', detail: 'Evaluate access, water, power, environmental, geotechnical and logistics assumptions before engineering a concept.'},
];
