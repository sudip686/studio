export type TangaChapterId =
  | 'ranking' | 'tanzania' | 'project' | 'topography' | 'accessibility'
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
    {title: 'Surveyed digital terrain model', locator: 'DTM.tif · August 2025 aerial survey · EPSG:32737 · source spacing ≈0.655 m', qualification: 'Source metadata does not state the vertical datum. The DTM is sampled to a ≈7.4 m presentation grid; outer terrain uses regional DEM. Grid spacing is not an accuracy claim.'},
    {title: 'Derived slope display', locator: 'Computed from DTM elevations and source pixel spacing · degrees', qualification: 'The supplied SLOPE.tif is not displayed because its numeric units are not documented.'},
  ],
  accessibility: [
    {title: 'Road and infrastructure context', locator: 'OpenStreetMap features and routed path', qualification: 'Indicative geography and route distance do not establish access rights, infrastructure capacity, or a project connection.'},
  ],
  drillholes: [
    {title: 'AMC Tanga Graphite Mineral Resource Estimate', locator: 'Final report · 19 December 2025 · drilling §3.2; Figure 3.9', qualification: 'The core photograph is report evidence and is not asserted to be the selected 3D hole.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
  ],
  subsurface: [
    {title: 'Merged petrography report · Tanga Graphite Project', locator: 'Sample crosswalk: TGF002 / TGDD1009 / 18.25–18.38 m; assay ID TD0058', qualification: 'A traceable sample record. The 3D geological surfaces remain interpreted between observation points.'},
    {title: 'Photomicrograph', locator: 'TGF002 · TGDD1009 · 18.25–18.38 m', qualification: 'Source micrograph reproduced without adding a scale or changing its interpretation.', href: '/presentation-assets/petrography-tgdd1009-18m.jpg'},
  ],
  resource: [
    {title: 'AMC Tanga Graphite Mineral Resource Estimate', locator: 'Final report · effective date 1 November 2025 · final 19 December 2025 · Table I', qualification: 'Published report values and classification; app block counts or display filters are not a new resource statement.', href: '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf'},
  ],
  mine_planning: [
    {title: 'Internal concept geometry', locator: 'Existing block-model coordinates and provisional project boundary', qualification: 'Presentation concept only; not an optimised mine design, reserve, schedule, cost estimate, or permitted facility.'},
  ],
  metallurgy: [
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
    date: 'December 2025',
    title: 'Flotation testwork',
    detail: 'A final Rev. 0 testwork report records results across optimisation and variability composites.',
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
