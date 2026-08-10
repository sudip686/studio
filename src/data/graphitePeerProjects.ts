export type GraphitePeerProject = {
  baselineRank: number;
  project: string;
  country: string;
  company: string;
  owner?: string;
  listing?: string;
  status: string;
  resource: string;
  totalResource?: string;
  measuredIndicated?: string;
  tgcGrade?: string;
  flakeDistribution?: string;
  metallurgy?: string;
  containedGraphiteMt: number;
  lon: number;
  lat: number;
  sourceLabel: string;
  isTanga?: boolean;
};

export const GRAPHITE_PEER_PROJECTS: GraphitePeerProject[] = [
  {
    baselineRank: 1,
    project: 'Balama North / Nicanda Hill',
    country: 'Mozambique',
    company: 'Triton Minerals',
    owner: 'Triton Minerals Ltd.',
    listing: 'ASX: TON',
    status: 'DFS / development',
    resource: '41.7 Mt M&I contained graphite',
    totalResource: 'Large Nicanda Hill / Balama North MRE; public material references ~1.44 Bt at ~11% TGC.',
    measuredIndicated: '41.7 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: 'Indicated resource basis around 11.1% TGC',
    flakeDistribution: 'Predominantly fine/small flake in Triton project material; coarse split not cleanly separated here.',
    metallurgy: 'DFS-stage flake concentrate testwork noted in public project material.',
    containedGraphiteMt: 41.7,
    lon: 39.09,
    lat: -13.22,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
  {
    baselineRank: 2,
    project: 'Sarytogan',
    country: 'Kazakhstan',
    company: 'Sarytogan Graphite',
    owner: 'Sarytogan Graphite Ltd.',
    listing: 'ASX: SGA',
    status: 'PFS / development',
    resource: '36.3 Mt M&I contained graphite',
    totalResource: 'High-grade microcrystalline graphite deposit; ranked here by contained graphite.',
    measuredIndicated: '36.3 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: 'Indicated 126 Mt @ 28.8% TGC; total 229 Mt @ 28.9% TGC',
    flakeDistribution: 'Microcrystalline graphite; conventional flake-size distribution is not applicable.',
    metallurgy: 'PFS product testing includes micronised and battery-use product pathways.',
    containedGraphiteMt: 36.3,
    lon: 74.95,
    lat: 49.64,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
  {
    baselineRank: 3,
    project: 'Lac Gueret',
    country: 'Canada',
    company: 'Mason / NMG',
    owner: 'Mason Resources / Nouveau Monde Graphite context',
    listing: 'TSXV: LLG / NYSE, TSXV: NMG',
    status: 'PEA / development',
    resource: '11.3 Mt M&I contained graphite',
    totalResource: 'Uatnan / Lac Gueret scope includes 65.64 Mt M&I at 17.2% Cg.',
    measuredIndicated: '11.3 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: 'M&I 65.64 Mt @ 17.2% Cg/TGC',
    flakeDistribution: 'Historic concentrate split reported across +50, +80, +150 and -150 mesh; current battery path is less coarse-flake-led.',
    metallurgy: 'Battery-anode and flake concentrate pathway referenced in project disclosures.',
    containedGraphiteMt: 11.3,
    lon: -69.06,
    lat: 51.08,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
  {
    baselineRank: 4,
    project: 'Mahenge',
    country: 'Tanzania',
    company: 'Black Rock Mining',
    owner: 'Black Rock Mining Ltd. with Government of Tanzania free-carried interest',
    listing: 'ASX: BKT',
    status: 'Permitted / development',
    resource: '9.3 Mt M&I contained graphite',
    totalResource: 'Large Mahenge graphite resource; reserve disclosure includes 70.5 Mt at 8.5% TGC.',
    measuredIndicated: '9.3 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: 'Reserve 70.5 Mt @ 8.5% TGC',
    flakeDistribution: 'Large-flake profile; public material describes a high large/jumbo fraction in premium concentrate.',
    metallurgy: 'Pilot plant and large-flake concentrate marketing story noted in public material.',
    containedGraphiteMt: 9.3,
    lon: 36.74,
    lat: -8.68,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
  {
    baselineRank: 5,
    project: 'Siviour',
    country: 'Australia',
    company: 'Renascor Resources',
    owner: 'Renascor Resources Ltd.',
    listing: 'ASX: RNU',
    status: 'Permitting / development',
    resource: '5.2 Mt M&I contained graphite',
    totalResource: '123.6 Mt at 6.9% TGC in project summaries',
    measuredIndicated: '5.2 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: 'Total 123.6 Mt @ 6.9% TGC',
    flakeDistribution: 'Scoping split: jumbo 8%, large 25%, medium 15%, small 39%, fine 13%.',
    metallurgy: 'Integrated mine-to-purified spherical graphite pathway in public project material.',
    containedGraphiteMt: 5.2,
    lon: 136.55,
    lat: -33.83,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
  {
    baselineRank: 6,
    project: 'Epanko',
    country: 'Tanzania',
    company: 'EcoGraf',
    owner: 'EcoGraf Ltd. with Government of Tanzania free-carried interest',
    listing: 'ASX: EGR',
    status: 'BFS / permitted',
    resource: '6.7 Mt M&I contained graphite',
    totalResource: '290.8 Mt at 7.2% TGC; 21.01 Mt contained graphite total.',
    measuredIndicated: '6.7 Mt M&I contained graphite: 2.5 Mt Measured + 4.2 Mt Indicated',
    tgcGrade: 'Total 290.8 Mt @ 7.2% TGC',
    flakeDistribution: 'Concentrate sizing: 20.0% jumbo, 35.4% large, 30.3% medium, 7.4% small, 6.9% fines.',
    metallurgy: 'BFS-stage concentrate and downstream battery-anode testwork referenced.',
    containedGraphiteMt: 6.7,
    lon: 36.61,
    lat: -8.54,
    sourceLabel: 'Epanko MRE table: 21.01 Mt total; 6.7 Mt M&I contained graphite',
  },
  {
    baselineRank: 7,
    project: 'La Loutre',
    country: 'Canada',
    company: 'Lomiko Metals',
    owner: 'Lomiko Metals Inc.',
    listing: 'TSXV: LMR',
    status: 'PEA / development',
    resource: '2.9 Mt M&I contained graphite',
    totalResource: 'PFS reserve basis references 46.8 Mt at 4.79% Cg; MRE includes 64.7 Mt Indicated at 4.59% Cg.',
    measuredIndicated: '2.9 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: 'Indicated 64.7 Mt @ 4.59% Cg; reserve 46.8 Mt @ 4.79% Cg',
    flakeDistribution: 'PFS product profile is fines-led, with about one-third of concentrate coarser than +100 mesh.',
    metallurgy: 'Metallurgy/process work referenced in local atlas project record.',
    containedGraphiteMt: 2.9,
    lon: -75.45,
    lat: 45.9,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
  {
    baselineRank: 8,
    project: 'Malingunde',
    country: 'Malawi',
    company: 'NGX',
    owner: 'NGX Ltd.',
    listing: 'ASX: NGX',
    status: 'PFS / development',
    resource: '2.733 Mt M&I contained graphite',
    totalResource: '65.1 Mt at 7.1% TGC project resource basis in public Malingunde material.',
    measuredIndicated: '2.733 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: 'Resource 65.1 Mt @ 7.1% TGC',
    flakeDistribution: 'LCT split: 5% super jumbo, 19% jumbo, 26% large, 9% medium, 25% small, 16% fine.',
    metallurgy: 'PFS flotation concentrate work referenced in local atlas source set.',
    containedGraphiteMt: 2.733,
    lon: 33.58,
    lat: -13.9,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
  {
    baselineRank: 9,
    project: 'Balama Central',
    country: 'Mozambique',
    company: 'Tirupati Graphite',
    owner: 'Tirupati Graphite PLC',
    listing: 'LSE: TGR',
    status: 'MRE / development',
    resource: '2.732 Mt M&I contained graphite',
    totalResource: 'Balama Central public disclosures include 32.9 Mt at 10.2% TGC and FS reserve work.',
    measuredIndicated: '2.732 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: 'MRE 32.9 Mt @ 10.2% TGC; reserve 19.66 Mt @ 11.06% TGC',
    flakeDistribution: 'Project-level split not cleanly separated; Mozambique portfolio material describes c.60-70% small and 30-40% coarser flake.',
    metallurgy: 'Flake graphite development and process work referenced in public material.',
    containedGraphiteMt: 2.732,
    lon: 38.88,
    lat: -13.32,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
  {
    baselineRank: 10,
    project: 'Bunyu',
    country: 'Tanzania',
    company: 'Volt Resources',
    owner: 'Volt Resources Ltd.',
    listing: 'ASX: VRC',
    status: 'FS / development',
    resource: '2.3 Mt M&I contained graphite',
    totalResource: '461 Mt at 4.9% TGC with 22.6 Mt contained graphite in public project summary.',
    measuredIndicated: '2.3 Mt M&I contained graphite on peer-ranking basis',
    tgcGrade: '461 Mt @ 4.9% TGC',
    flakeDistribution: '+300 um 12%, +180 um 27%, +150 um 15%, -150 um 46%.',
    metallurgy: 'Feasibility update and offtake-oriented concentrate story referenced.',
    containedGraphiteMt: 2.3,
    lon: 39.31,
    lat: -10.35,
    sourceLabel: 'Mining Intelligence peer ranking',
  },
];

export const TANGA_INSERT_PROJECT: GraphitePeerProject = {
  baselineRank: 0,
  project: 'Tanga Graphite',
  country: 'Tanzania',
  company: 'Sakariya / local MRE',
  owner: 'Sakariya Mines & Minerals',
  listing: 'Private / unlisted',
  status: 'MRE revealed in model',
  resource: '7.3 Mt M&I contained graphite',
  totalResource: '183 Mt total MRE at 4.86% TGC; 8.89 Mt contained graphite total.',
  measuredIndicated: '148 Mt Indicated at 4.94% TGC; 7.3 Mt contained graphite',
  tgcGrade: '4.94% TGC Indicated; 4.86% TGC total MRE',
  flakeDistribution: 'Most ore types show >60% large-flake content at +150 um; best fresh composite exceeds 73%.',
  metallurgy: '>97% TC concentrate purity; 93.0% oxide and 94.4% fresh recovery',
  containedGraphiteMt: 7.31,
  lon: 38.785,
  lat: -4.813,
  sourceLabel: 'Tanga MRE: 148 Mt Indicated @ 4.94% TGC',
  isTanga: true,
};

function rankByMeasuredIndicatedContainedGraphite(projects: GraphitePeerProject[]) {
  return [...projects].sort((left, right) => {
    const difference = right.containedGraphiteMt - left.containedGraphiteMt;
    if (difference !== 0) return difference;
    return left.project.localeCompare(right.project);
  });
}

export function graphitePeerRows(includeTanga: boolean) {
  const rankedPeers = rankByMeasuredIndicatedContainedGraphite(GRAPHITE_PEER_PROJECTS);

  if (!includeTanga) {
    return rankedPeers.map((project, index) => ({
      ...project,
      displayRank: index + 1,
      shifted: false,
    }));
  }

  const rows = rankByMeasuredIndicatedContainedGraphite([...GRAPHITE_PEER_PROJECTS, TANGA_INSERT_PROJECT]);
  const tangaIndex = rows.findIndex((project) => project.isTanga);

  return rows.map((project, index) => ({
    ...project,
    displayRank: index + 1,
    shifted: !project.isTanga && tangaIndex >= 0 && index > tangaIndex,
  }));
}
