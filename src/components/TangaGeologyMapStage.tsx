'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowRight, ExternalLink, Eye, EyeOff} from 'lucide-react';
import {MAPPED_SURFACE_UNITS, MODEL_ROCK_UNITS} from '@/lib/deck/geology-palette';

export type GeologyUnitSelection = {title:string;rows:string[];tone:string};

/** Keep the source sheet available as evidence while leading with the 3D map. */
export default function TangaGeologyMapStage({step, ready, onAdvance, onStage, selectedUnit, onSelectUnit, hiddenUnits, onToggleUnit}: {step:number;ready:boolean;onAdvance:()=>void;onStage:(step:number)=>void;selectedUnit:GeologyUnitSelection|null;onSelectUnit:(unit:GeologyUnitSelection|null)=>void;hiddenUnits:string[];onToggleUnit:(unit:string)=>void}) {
  const [legendOpen,setLegendOpen]=useState(false);
  const storyPanel=useRef<HTMLElement|null>(null);
  useEffect(()=>{if(storyPanel.current)storyPanel.current.scrollTop=0;},[step]);

  const stages=['Mapped surface','Terrain relief','Interpreted depth'];
  const eyebrow=['01 / MAPPED SURFACE','02 / TERRAIN RELIEF','03 / INTERPRETED DEPTH'][step] ?? stages[0];
  const headings=['Map the rock units','Read the terrain relief','Reveal the interpreted depth'][step] ?? 'Map the rock units';
  const intros=[
    'The source-map units are draped onto the real terrain. Select a colour to isolate a mapped class and inspect its evidence basis.',
    'Tilt the same mapped surface to read its relationship to the land. Surface polygons do not encode dip, thickness or depth.',
    'The surface fades as the separate interpreted geological model appears. Matching colours indicate named units only where the model labels resolve.',
  ];
  const nextLabels=['Tilt to terrain relief','Reveal interpreted depth','Open interpreted section'];
  const mapUnits=step<2;

  return <>
    {step<3&&<div className={`tanga-geology-surface-legend ${legendOpen?'is-open':''}`} aria-label={mapUnits?'Mapped rock types':'Interpreted model rock types'}>
      <header><strong>{mapUnits?'MAPPED GEOLOGY':'INTERPRETED MODEL'}</strong><small>{mapUnits?'8 map classes':'7 model units'}</small></header>
      <button type="button" aria-expanded={legendOpen} onClick={()=>setLegendOpen(value=>!value)}>{mapUnits?'Map':'Model'} legend · {mapUnits?8:7} classes {legendOpen?'−':'+'}</button>
      <div>{(mapUnits?MAPPED_SURFACE_UNITS:MODEL_ROCK_UNITS).map(({color,label})=>mapUnits
        ? <div className="tanga-geology-surface-legend__row" key={label}>
          <button className="tanga-geology-surface-legend__unit" type="button" aria-pressed={selectedUnit?.title===label} onClick={()=>{if(selectedUnit?.title===label){onSelectUnit(null);return;}if(hiddenUnits.includes(label))onToggleUnit(label);onSelectUnit({title:label,rows:[label==='Soil cover'?'Source-map soil-cover class; generalized mapped footprint.':'Digitized project-map polygon.','Approximate printed-grid registration; not a surveyed contact.'],tone:color});}}><i style={{background:color}}/>{label}</button>
          <button className="tanga-geology-surface-legend__visibility" type="button" aria-label={`${hiddenUnits.includes(label)?'Show':'Hide'} ${label}`} aria-pressed={!hiddenUnits.includes(label)} onClick={()=>onToggleUnit(label)} title={`${hiddenUnits.includes(label)?'Show':'Hide'} this mapped unit`}>{hiddenUnits.includes(label)?<EyeOff size={14}/>:<Eye size={14}/>}</button>
        </div>
        : <span key={label}><i style={{background:color}}/>{label}</span>)}</div>
      {!mapUnits&&<p>Map colours match only where unit names resolve.</p>}
    </div>}

    <aside ref={storyPanel} className="tanga-story-panel tanga-story-panel--map" aria-label="Geology map to model story">
      <div className="tanga-story-panel__eyebrow">GEOLOGICAL FRAMEWORK · {eyebrow}</div>
      <h2>{headings}</h2>
      <p className="tanga-story-panel__intro">{intros[step] ?? intros[0]}</p>
      <ol className="tanga-geology-map-sequence" aria-label="Geology evidence sequence">
        {stages.map((label,index)=><li key={label} aria-current={step===index?'step':undefined}><button type="button" onClick={()=>onStage(index)}><span>0{index+1}</span>{label}</button></li>)}
      </ol>
      <div className="tanga-story-inline-note">{step<2?'8 mapped classes · approximate registration':'Separate interpreted volumes · true vertical scale'}</div>
      <details className="tanga-geology-basis"><summary>Source &amp; interpretation limits</summary><p className="tanga-story-datum-note">{step<2?'Surface polygons are colour-traced from the scanned project map and registered from its printed grid. They are approximate map interpretations, not original shapefiles or surveyed contacts.':'Mapped surface areas and modelled volumes are distinct interpretations. No mapped contacts are extruded into the model. Unmatched model units remain distinct.'}</p><a href="/geology_map.jpg" target="_blank" rel="noreferrer">Open original project map <ExternalLink size={13}/></a></details>
      {selectedUnit&&<section className="tanga-geology-selected-unit" aria-live="polite"><header><i style={{background:selectedUnit.tone}}/><strong>{selectedUnit.title}</strong><button type="button" onClick={()=>onSelectUnit(null)} aria-label="Clear selected map unit">×</button></header>{selectedUnit.rows.map(row=><p key={row}>{row}</p>)}</section>}
      <span className="tanga-geology-basis-tag">{step<2?'Approximate map registration':'Geological interpretation · not observed everywhere'}</span>
      <button type="button" className="tanga-story-panel__compare" onClick={onAdvance} title={ready?undefined:'The 3D geology scene is still loading'}>{nextLabels[step] ?? 'Continue'} <ArrowRight size={14}/></button>
    </aside>
  </>;
}
