/** Colours sampled from the supplied project map, shared by surface and model.
 * Unspecified model schist is deliberately not assigned a mapped subtype. */
export const MAPPED_ROCK_UNITS = [
  {label:'Graphitic schist',color:'#d8d8e1'},
  {label:'Khondalite',color:'#a188da'},
  {label:'Kyanite sillimanite schist',color:'#0755f5'},
  {label:'Mafic granulite',color:'#b065ac'},
  {label:'Quartzofeldspathic rock',color:'#f169e1'},
  {label:'Quartzite',color:'#f5d333'},
  {label:'Crystalline limestone',color:'#41a9ec'},
] as const;

/** All categories on the supplied project map; soil cover is a surface class,
 * not an added lithology in the interpreted model. */
export const MAPPED_SURFACE_UNITS = [
  {label:'Soil cover',color:'#f4e5cc'},
  ...MAPPED_ROCK_UNITS,
] as const;

export function modelRockUnit(name:string) {
  // GLTFLoader sanitizes spaces to underscores in Object3D names.
  const suffix=name.replace(/^GM[_\s]*Litho[_\s]*-[_\s]*/i,'').replace(/_/g,' ').trim();
  const index:Record<string,number>={GRSC:0,Khondalite:1,Granulite:3,'Quartz-Feldspathic':4,Marble:6};
  if(index[suffix]!==undefined){const unit=MAPPED_ROCK_UNITS[index[suffix]];return {...unit,matched:true,basis:suffix==='Marble'?'Model marble / mapped crystalline limestone.':suffix==='Granulite'?'Model granulite / mapped mafic granulite.':'Source-map colour correspondence.'};}
  return suffix==='SOIL'
    ? {label:'Soil cover',color:'#bca77a',matched:false,basis:'Model cover unit; omitted from the mapped rock overlay.'}
    : {label:'Schist · subtype unspecified',color:'#91a494',matched:false,basis:'Model label does not resolve the mapped schist subtype. Neutral colour retained.'};
}

export const MODEL_ROCK_UNITS=['GRSC','Khondalite','Granulite','Quartz-Feldspathic','Marble','Schist','SOIL'].map(name=>modelRockUnit(name));
