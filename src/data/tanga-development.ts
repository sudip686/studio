import reference from '../../public/generated/paulsam-development-reference.json';

export const DEVELOPMENT_REFERENCE = reference;
export const DEVELOPMENT_SITE = reference.sites.find(site => site.id === reference.selectedSite)!;
export const DEVELOPMENT_SOURCE = 'PaulSam · June 2023 · Fig. 3.3, Tables 3.3 / 5.5';
export type DevelopmentView = 'overview'|'feed'|'plant'|'services'|'tailings'|'waste'|'campus';
export const DEVELOPMENT_FACILITIES:ReadonlyArray<{id:DevelopmentView;label:string;detail:string;title?:string;explanation?:string}> = [
  {id:'overview', label:'Connected site', detail:'Mine → uphill feed point → lowland processing',title:'The connected mine concept',explanation:'PaulSam gives 2.15 km in its table and about 2.45 km on the map; neither supplies a road centerline, so truck motion is illustrative. Candidate and conveyor traces are approximate; site layouts are concepts.'},
  {id:'feed', label:'Feed-in point', detail:'Receiving, bulking and conveyor transfer',title:'Receive and transfer the feed',explanation:'The proposed apron clears the concept pits near PaulSam’s uphill feed point. Receiving, bulking and conveyor equipment are illustrative.'},
  {id:'plant', label:'Concentrator', detail:'Six processing areas on the lowland candidate',title:'From feed to concentrate',explanation:'Inspect receiving, milling, flotation, thickening, dewatering and product handling. Equipment and internal arrangement are illustrative.'},
  {id:'services', label:'Site services', detail:'Workshop, offices, water and electrical provision',title:'Support the operation',explanation:'Workshop bays, administration, laboratory, water provision and electrical equipment complete the illustrative operating campus.'},
  {id:'waste',label:'Waste rock',detail:'Illustrative benched landform and working apron',title:'Waste-rock management',explanation:'Three illustrative lifts show waste-rock benches and batters. The footprint clears the pits inside the provisional boundary; it does not establish an approved dump.'},
  {id:'tailings',label:'Tailings & water',detail:'Illustrative embankment, beach, decant and ponds',title:'Tailings & water systems',explanation:'A concept tailings embankment, dry beach and decant pool. Separate ponds serve settling / reclaim and raw-water roles. Locations and capacities are unconfirmed.'},
  {id:'campus',label:'Lowland site view',detail:'Read plant, ponds and containment from above',title:'Read the whole lowland site',explanation:'Read the plant, tailings and separate ponds together. Added footprints extend beyond the report’s plant land allowance and require separate siting studies.'},
] as const;
