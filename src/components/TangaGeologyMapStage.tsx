'use client';

import {useRef, useState} from 'react';
import {ArrowRight, ExternalLink, Minus, Plus} from 'lucide-react';

/** Original map documents remain separate from the registered, interpreted model. */
export default function TangaGeologyMapStage({step, ready, onAdvance}: {step: number; ready: boolean; onAdvance: () => void}) {
  const [regional, setRegional] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [legendOpen,setLegendOpen]=useState(false);
  const pan = useRef<{x: number; y: number; left: number; top: number} | null>(null);
  const sheet = step === 0;
  const source = regional ? '/presentation-assets/mre-regional-geology.jpg' : '/geology_map.jpg';
  return <>
    {sheet && <section className="tanga-geology-map-sheet" aria-label="Original geological maps" onPointerDown={() => window.dispatchEvent(new Event('tanga:manual-exploration'))} onKeyDown={event => {event.stopPropagation();window.dispatchEvent(new Event('tanga:manual-exploration'));}}>
      <div className="tanga-geology-map-sheet__toolbar">
        <div role="group" aria-label="Geological map document">
          <button type="button" aria-pressed={!regional} onClick={() => {setRegional(false);setZoom(1);}}>Project map</button>
          <button type="button" aria-pressed={regional} onClick={() => {setRegional(true);setZoom(1);}}>MRE regional context</button>
        </div>
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
    {step === 1 && <div className={`tanga-geology-surface-legend ${legendOpen?'is-open':''}`} aria-label="Mapped rock types"><button type="button" aria-expanded={legendOpen} onClick={()=>setLegendOpen(value=>!value)}>Rock legend · 7 units {legendOpen?'−':'+'}</button><div>{[['#d8d8e1','Graphitic schist'],['#a188da','Khondalite'],['#0755f5','Kyanite sillimanite schist'],['#b065ac','Mafic granulite'],['#f169e1','Quartzofeldspathic rock'],['#f5d333','Quartzite'],['#41a9ec','Crystalline limestone']].map(([color,label])=><span key={label}><i style={{background:color}}/>{label}</span>)}</div></div>}
    <aside className="tanga-story-panel tanga-story-panel--map" aria-label="Geology map to model story">
      <div className="tanga-story-panel__eyebrow">GEOLOGICAL FRAMEWORK · {sheet ? '01 / MAP' : step === 1 ? '02 / PLAN' : '03 / DEPTH'}</div>
      <h2>{sheet ? 'Read the geology' : step === 1 ? 'Rock types on the ground' : 'Give the geology depth'}</h2>
      <p className="tanga-story-panel__intro">{sheet ? 'Start with the mapped rock units and their relationship to the recorded drilling. Then inspect the project interpretation from above and below.' : step === 1 ? 'Only the mapped rock areas are coloured. Transparent gaps keep the terrain visible; hover a polygon to identify its rock type.' : 'The camera drops from overhead toward the horizon. The surface map fades as the existing registered 3D geological interpretation is revealed.'}</p>
      <ol className="tanga-geology-map-sequence" aria-label="Map to model sequence">
        {['Read the source map', 'Drape the rock polygons', 'Tilt into the 3D model'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined}><span>0{i + 1}</span>{label}</li>)}
      </ol>
      <div className="tanga-story-inline-note">{sheet ? 'Source map colours follow its original legend. In the 3D interpretation, orange highlights the graphitic-schist host.' : (step === 1 ? 'Polygon colours follow the source-map legend. Soil cover is transparent.' : 'Orange: interpreted graphitic-schist host. Muted colours: surrounding modelled rock units.')}</div>
      <p className="tanga-story-datum-note">{sheet ? (regional ? 'The MRE figure is regional context at 1:10,000,000. It is separate from the detailed project map and 3D interpretation.' : 'Source sheet retained for comparison. The next view digitizes its coloured rock areas using the printed UTM grid; original geological shapefiles were not supplied.') : (step === 1 ? 'Derived polygons, approximately registered from the printed grid and clipped to displayed terrain. Map datum and contacts need verification. Grab sampling is reported, but usable sample coordinates were not found.' : 'Mapped surface areas and modelled volumes are distinct interpretations. No report-image contacts are extruded into the existing model.')}</p>
      <button type="button" className="tanga-story-panel__compare" onClick={onAdvance} disabled={!ready}>{!ready ? 'Preparing project model…' : sheet ? 'Drape the rock polygons' : step === 1 ? 'Lift into 3D' : 'Reveal the interpreted section'} <ArrowRight size={14}/></button>
    </aside>
  </>;
}
