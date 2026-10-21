'use client';

import {useRef, useState} from 'react';
import {ArrowRight, ExternalLink, Minus, Plus} from 'lucide-react';

/** Original map documents remain separate from the registered, interpreted model. */
export default function TangaGeologyMapStage({step, ready, onAdvance}: {step: number; ready: boolean; onAdvance: () => void}) {
  const [regional, setRegional] = useState(false);
  const [zoom, setZoom] = useState(1);
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
    <aside className="tanga-story-panel tanga-story-panel--map" aria-label="Geology map to model story">
      <div className="tanga-story-panel__eyebrow">GEOLOGICAL FRAMEWORK · {sheet ? '01 / MAP' : step === 1 ? '02 / PLAN' : '03 / DEPTH'}</div>
      <h2>{sheet ? 'Read the geology' : step === 1 ? 'The same model, in plan' : 'Give the geology depth'}</h2>
      <p className="tanga-story-panel__intro">{sheet ? 'Start with the mapped rock units and their relationship to the recorded drilling. Then inspect the project interpretation from above and below.' : step === 1 ? 'A north-up orthographic view removes perspective. Follow the interpreted units across the project before tilting into depth.' : 'The plan lifts into the existing 3D interpretation. Rock contacts, terrain and recorded holes retain their registered coordinates.'}</p>
      <ol className="tanga-geology-map-sequence" aria-label="Map to model sequence">
        {['Read the 2D map', 'Locate the model in plan', 'Tilt into 3D'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined}><span>0{i + 1}</span>{label}</li>)}
      </ol>
      <div className="tanga-story-inline-note">{sheet ? 'Source map colours follow its original legend. In the 3D interpretation, orange highlights the graphitic-schist host.' : 'Orange: interpreted graphitic-schist host. Muted colours: surrounding modelled rock units.'}</div>
      <p className="tanga-story-datum-note">{sheet ? (regional ? 'The MRE figure is regional context at 1:10,000,000. It is separate from the detailed project map and 3D interpretation.' : 'Existing project map asset; its image-to-ground registration has not been independently verified. It is displayed as a document, not draped onto the terrain.') : 'The plan projects existing interpreted volumes; it is not a new surface outcrop map. No contacts are created by extruding the report image.'}</p>
      <button type="button" className="tanga-story-panel__compare" onClick={onAdvance} disabled={!ready}>{!ready ? 'Preparing project model…' : sheet ? 'View the project in plan' : step === 1 ? 'Lift into 3D' : 'Reveal the interpreted section'} <ArrowRight size={14}/></button>
    </aside>
  </>;
}
