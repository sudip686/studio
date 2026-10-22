'use client';

import {useEffect,useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import {graphitePeerRows} from '@/data/graphitePeerProjects';

type Peer = ReturnType<typeof graphitePeerRows>[number];
export default function TangaPeerBenchmark({revealed, onReveal, onReset, selected, onSelect, onResetView}: {revealed:boolean;onReveal:()=>void;onReset:()=>void;selected:Peer|null;onSelect:(peer:Peer)=>void;onResetView:()=>void}) {
  const reduced=useReducedMotion();
  const [updating,setUpdating]=useState(false);
  useEffect(()=>{
    if(reduced){setUpdating(false);return;}
    setUpdating(true);
    const timer=window.setTimeout(()=>setUpdating(false),750);
    return ()=>window.clearTimeout(timer);
  },[revealed,reduced]);
  const replay=()=>{setUpdating(!reduced);if(revealed)onReset();else onReveal();};
  const rows=graphitePeerRows(revealed);
  const selectedRow=rows.find(row=>row.project===selected?.project)??null;
  const rank=graphitePeerRows(true).find(row=>row.isTanga)!.displayRank;
  const maximum=Math.max(...rows.map(row=>row.containedGraphiteMt));
  return <section className="tanga-peer-benchmark" aria-label="Global graphite benchmark and Tanga MRE reveal" data-revealed={revealed}>
    <div className="tanga-peer-benchmark__narrative">
      <span className="tanga-peer-benchmark__eyebrow">PUT THE RESOURCE IN CONTEXT</span>
      <h2>{revealed?<>Tanga enters<br/>{' '}at <em>#{rank}.</em></>:<>One measure.<br/>{' '}Ten projects.</>}</h2>
      <p>{revealed?'7.31 Mt contained graphite from the reported 148 Mt Indicated MRE at 4.94% TGC.':'Explore the dated published peer field, then add Tanga on the same contained-graphite measure.'}</p>
      <div className="tanga-peer-benchmark__measure"><span>{revealed?'TANGA · INDICATED':'COMMON COMPARISON MEASURE'}</span><strong>{revealed?'7.31':'M&I'} <small>{revealed?'Mt':'contained graphite'}</small></strong><p>{revealed?'148 Mt × 4.94% TGC':'Measured + Indicated portions only'}</p></div>
      {selectedRow&&<div className="tanga-peer-benchmark__selection" aria-live="polite"><strong>#{selectedRow.displayRank} · {selectedRow.project}</strong><span>{selectedRow.country} · {selectedRow.company}</span><p>{selectedRow.measuredIndicated??selectedRow.resource}</p><small>{selectedRow.sourceLabel} · approximate map location</small></div>}
      <button type="button" onClick={replay}>{revealed?'Replay before Tanga':'Introduce Tanga →'}</button>
      <button className="tanga-peer-benchmark__globe-reset" type="button" onClick={onResetView}>Whole globe ↺</button>
      <small>Drag to rotate. Select a marker or project to turn the globe toward it. Projects on the far side appear as you rotate.</small>
    </div>
    <div className="tanga-peer-benchmark__chart" aria-busy={updating}>
      <header><div><span>{updating?'UPDATING RANKS…':revealed?'11 PROJECTS · INCLUDING TANGA':'10 REPORTED PROJECTS'}</span><h3>Contained graphite</h3><small>Reported M&amp;I · linear scale · Mt</small></div></header>
      <select className="tanga-peer-benchmark__select" aria-label="Select graphite project" disabled={updating} value={selectedRow?.project??''} onChange={event=>{const peer=rows.find(row=>row.project===event.target.value);if(peer)onSelect(peer);}}>
        <option value="">Choose a project on the globe</option>{rows.map(row=><option key={row.project} value={row.project}>#{row.displayRank} {row.project} · {row.containedGraphiteMt} Mt</option>)}
      </select>
      <ol aria-label="Projects ranked by reported Measured and Indicated contained graphite">
        <AnimatePresence initial={false}>{rows.map(row=><motion.li key={row.project} layout="position" initial={{opacity:0,y:row.isTanga?100:0}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:.6}} className={`${row.isTanga?'is-tanga ':''}${selectedRow?.project===row.project?'is-selected':''}`} data-project={row.project} data-rank={row.displayRank}>
          <button type="button" disabled={updating} aria-pressed={selectedRow?.project===row.project} onClick={()=>onSelect(row)} aria-label={`View ${row.project} on globe`}>
            <span className="tanga-peer-benchmark__rank">{String(row.displayRank).padStart(2,'0')}</span>
            <span className="tanga-peer-benchmark__project"><strong>{row.project}</strong><small>{row.country}{row.isTanga?' · INDICATED':''}</small></span>
            <b>{row.containedGraphiteMt.toFixed(row.isTanga?2:row.containedGraphiteMt<3?3:1)}</b>
            <span className="tanga-peer-benchmark__bar" aria-hidden="true"><i style={{width:`${row.containedGraphiteMt/maximum*100}%`}}/></span>
          </button>
        </motion.li>)}</AnimatePresence>
      </ol>

      {selectedRow&&<div className="tanga-peer-benchmark__phone-selection"><strong>{selectedRow.project} · {selectedRow.country}</strong><span>{selectedRow.measuredIndicated??selectedRow.resource}</span></div>}
      <footer>2023 published benchmark with an updated Epanko entry. Dates and reporting bases differ; this is not a current worldwide deposit census. Tanga uses its Indicated portion only. <a href="https://www.costmine.com/2023/11/07/ranked-worlds-top-10-graphite-projects/" target="_blank" rel="noreferrer">Benchmark source ↗</a></footer>
    </div>
  </section>;
}
