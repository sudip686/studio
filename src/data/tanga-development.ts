import reference from '../../public/generated/paulsam-development-reference.json';

export const DEVELOPMENT_REFERENCE = reference;
export const DEVELOPMENT_SITE = reference.sites.find(site => site.id === reference.selectedSite)!;
export const DEVELOPMENT_SOURCE = 'PaulSam · June 2023 · Fig. 3.3, Tables 3.3 / 5.5';
export const DEVELOPMENT_FACILITIES = [
  {id:'overview', label:'Connected site', detail:'Mine → uphill feed point → lowland processing'},
  {id:'feed', label:'Feed-in point', detail:'Receiving, bulking and conveyor transfer'},
  {id:'plant', label:'Concentrator', detail:'Six processing areas on the lowland candidate'},
  {id:'services', label:'Site services', detail:'Workshop, offices, water and electrical provision'},
] as const;
