'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowRight, ExternalLink, Eye, EyeOff, Minus, Plus} from 'lucide-react';
import {MAPPED_ROCK_UNITS,MODEL_ROCK_UNITS} from '@/lib/deck/geology-palette';

export type GeologyUnitSelection = {title:string;rows:string[];tone:string};

/** Original map documents remain separate from the registered, interpreted model. */
export default function TangaGeologyMapStage({step, ready, onAdvance, onStage, selectedUnit, onSelectUnit, hiddenUnits, onToggleUnit}: {step: number; ready: boolean; onAdvance: () => void; onStage: (step:number)=>void; selectedUnit:GeologyUnitSelection|null; onSelectUnit:(unit:GeologyUnitSelection|null)=>void; hiddenUnits:string[]; onToggleUnit:(unit:string)=>void}) {
  const [regional, setRegional] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [legendOpen,setLegendOpen]=useState(false);
  const pan = useRef<{x: number; y: number; left: number; top: number} | null>(null);
  const storyPanel = useRef<HTMLElement|null>(null);
  useEffect(()=>{if(storyPanel.current)storyPanel.current.scrollTop=0;},[step]);
  const sheet = step === 0;
  const source = regional ? '/presentation-assets/mre-regional-geology.jpg' : '/geology_map.jpg';
  return <>
    {sheet && <section className="tanga-geology-map-sheet" aria-label="Original geological maps" onPointerDown={() => window.dispatchEvent(new Event('tanga:manual-exploration'))} onKeyDown={event => {event.stopPropagation();window.dispatchEvent(new Event('tanga:manual-exploration'));}}>
      <div className="tanga-geology-map-sheet__toolbar">
        <div role="group" aria-label="Geological map document">
          <button type="button" aria-pressed={!regional} onClick={() => {setRegional(false);setZoom(1);}}>Project map</button>
          <button type="button" aria-pressed={regional} onClick={() => {setRegional(true);setZoom(1);}}>MRE regional context</button>
        </div>
        <span className="tanga-geology-map-sheet__source-tag">SOURCE MAP <i/> {regional ? 'REGIONAL' : 'PROJECT DETAIL'}</span>
        <div role="group" aria-label="Map document zoom">
          <button type="button" aria-label="Zoom out map document" disabled={zoom === 1} onClick={() => setZoom(v => Math.max(1, v - .5))}><Minus size={15}/></button>
          <button type="button" aria-label="Reset map document zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="Zoom in map document" disabled={zoom === 3} onClick={() => setZoom(v => Math.min(3, v + .5))}><Plus size={15}/></button>
        </div>
      </div>
      <div className="tanga-geology-map-sheet__viewport" tabIndex={0} aria-label="Geological map; drag or scroll to inspect when enlarged" key={source}
        style={{cursor: zoom > 1 ? 'grab' : 'default', touchAction: zoom > 1 ? 'none' : 'auto'}}
        onPointerDown={event => {if(zoom <= 1 || event.button !== 0) return; pan.current = {x:event.clientX,y:event.clientY,left:event.currentTarget.scrollLeft,top:event.currentTarget.scrollTop};event.currentTarget.setPointerCapture(event.pointerId);}}
        onPointerMove={event => {if(!pan.current) return;event.currentTarget.scrollLeft = pan.current.left + pan.current.x - event.clientX;event.currentTarget.scrollTop = pan.current.top + pan.current.y - event.clientY;}}
        onPointerUp={() => {pan.current = null;}} onPointerCancel={() => {pan.current = null;}} onLostPointerCapture={() => {pan.current = null;}}>

        <img draggable={false} src={source} alt={regional ? 'AMC MRE Figure 2.1: Tanzania regional geology with Tanga marked in the Mozambique Belt and the original legend' : 'Existing Tanga project geological map with lithology legend, coordinate grid, north arrow, scale and recorded drillhole locations'} style={{width: `${zoom * 100}%`, height: `${zoom * 100}%`}}/>
      </div>
      <footer><span>{regional ? 'AMC · 19 Dec 2025 · Fig. 2.1 · PDF p.18' : 'Tanga project geological map · original legend and grid retained'}</span><a href={source} target="_blank" rel="noreferrer">Full resolution <ExternalLink size={12}/></a></footer>
    </section>}
    {(step >= 1 && step <= 3) && <div className={`tanga-geology-surface-legend ${legendOpen?'is-open':''}`} aria-label={step===3?"Model rock types":"Mapped rock types"}>
      <header><strong>{step===3?'INTERPRETED MODEL':'MAPPED GEOLOGY'}</strong><small>{step===3?'7 model units':'7 map units'}</small></header>
      <button type="button" aria-expanded={legendOpen} onClick={()=>setLegendOpen(value=>!value)}>{step===3?'Model':'Map'} legend · 7 units {legendOpen?'−':'+'}</button>
      <div>{(step===3?MODEL_ROCK_UNITS:MAPPED_ROCK_UNITS).map(({color,label})=>step===3
        ? <span key={label}><i style={{background:color}}/>{label}</span>
        : <div className="tanga-geology-surface-legend__row" key={label}>
          <button className="tanga-geology-surface-legend__unit" type="button" aria-pressed={selectedUnit?.title===label} onClick={()=>{if(selectedUnit?.title===label){onSelectUnit(null);return;}if(hiddenUnits.includes(label))onToggleUnit(label);onSelectUnit({title:label,rows:['Digitized project-map polygon.','Approximate printed-grid registration; not a surveyed contact.'],tone:color});}}><i style={{background:color}}/>{label}</button>
          <button className="tanga-geology-surface-legend__visibility" type="button" aria-label={`${hiddenUnits.includes(label)?'Show':'Hide'} ${label}`} aria-pressed={!hiddenUnits.includes(label)} onClick={()=>onToggleUnit(label)} title={`${hiddenUnits.includes(label)?'Show':'Hide'} this mapped unit`}>{hiddenUnits.includes(label)?<EyeOff size={14}/>:<Eye size={14}/>}</button>
        </div>)}</div>
      {step===3&&<p>Map colours match only where unit names resolve.</p>}
    </div>}
    <aside ref={storyPanel} className="tanga-story-panel tanga-story-panel--map" aria-label="Geology map to model story">
      <div className="tanga-story-panel__eyebrow">GEOLOGICAL FRAMEWORK · {['01 / SOURCE','02 / OVERHEAD','03 / RELIEF','04 / DEPTH'][step]}</div>
      <h2>{['Begin with the map','Read the rock pattern','See the same rocks in relief','Look beneath the mapped surface'][step]}</h2>
      <p className="tanga-story-panel__intro">{['Read the source rock units, coordinate grid and drilling evidence. Next, place the digitized areas against the terrain.','The map palette separates seven digitized surface units. Select a polygon or legend unit to inspect its name and source basis.','Tilt the same map to read the terrain beneath it. Surface colours do not represent depth, thickness or dip.','The mapped surface fades while the separate 3D interpretation appears. Matching colours indicate named units only where the model labels resolve.'][step]}</p>
      <ol className="tanga-geology-map-sequence" aria-label="Map to model sequence">
        {['Source sheet','Mapped surface','Terrain relief','Interpreted depth'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined}><button type="button" onClick={()=>onStage(i)}><span>0{i + 1}</span>{label}</button></li>)}
      </ol>
      <div className="tanga-story-inline-note">{step<3 ? 'Source palette · transparent terrain context' : 'Matched names · unresolved units stay neutral · scale 1:1'}</div>
      <details className="tanga-geology-basis"><summary>Source &amp; interpretation limits</summary><p className="tanga-story-datum-note">{sheet ? (regional ? 'The MRE figure is regional context at 1:10,000,000. It is separate from the detailed project map and 3D interpretation.' : 'Original sheet retained. Coloured areas are digitized from its printed UTM grid; original geological shapefiles were not supplied.') : (step < 3 ? 'Derived polygons, approximately registered from the printed grid and clipped to displayed terrain. Datum and contacts need verification. Grab sampling is reported, but usable sample coordinates were not found.' : 'Mapped surface areas and modelled volumes are distinct interpretations. No mapped contacts are extruded into the model. Five named model units correspond to mapped colours; unspecified schist and soil remain distinct. Quartzite and kyanite-sillimanite schist have no resolved named volume.')}</p></details>
      {selectedUnit && <section className="tanga-geology-selected-unit" aria-live="polite"><header><i style={{background:selectedUnit.tone}}/><strong>{selectedUnit.title}</strong><button type="button" onClick={()=>onSelectUnit(null)} aria-label="Clear selected map unit">×</button></header>{selectedUnit.rows.map(row=><p key={row}>{row}</p>)}</section>}
      <span className="tanga-geology-basis-tag">{step<3?'Approximate map registration':'Geological interpretation · not observed everywhere'}</span>
      <button type="button" className="tanga-story-panel__compare" onClick={onAdvance}>{!ready ? ['Continue to mapped surface','Continue to terrain relief','Continue to interpreted depth','Inspect sample evidence'][step] : ['Place the map on terrain','Tilt the mapped surface','Reveal interpreted depth','Inspect the sample evidence'][step]} <ArrowRight size={14}/></button>
    </aside>
  </>;
}
