'use client';

import {useEffect,useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import {graphitePeerEvidence, graphitePeerRows} from '@/data/graphitePeerProjects';

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
  const selectedEvidence=selectedRow?graphitePeerEvidence(selectedRow):null;
  const rank=graphitePeerRows(true).find(row=>row.isTanga)!.displayRank;
  const maximum=Math.max(...rows.map(row=>row.containedGraphiteMt));
  return <section className="tanga-peer-benchmark" aria-label="Global graphite benchmark and Tanga MRE reveal" data-revealed={revealed}>
    <div className="tanga-peer-benchmark__narrative">
      <span className="tanga-peer-benchmark__eyebrow">PUT THE RESOURCE IN CONTEXT</span>
      <h2>{revealed?<>Tanga enters<br/>{' '}at <em>#{rank}.</em></>:<>One measure.<br/>{' '}Ten projects.</>}</h2>
      <p>{revealed?'7.31 Mt contained graphite from the reported 148 Mt Indicated MRE at 4.94% TGC; fifth within this selected peer set.':'Explore the dated published peer field, then add Tanga using the reported contained-graphite measure.'}</p>
      {(!selectedRow||selectedRow.isTanga)&&<div className="tanga-peer-benchmark__measure"><span>{revealed?'TANGA · INDICATED':'COMPARISON MEASURE'}</span><strong>{revealed?'7.31':'Reported'} <small>{revealed?'Mt contained graphite':'contained graphite · Mt'}</small></strong><p>{revealed?'148 Mt × 4.94% TGC':'Source estimate dates and reported categories vary.'}</p>{revealed&&<a href="/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf" target="_blank" rel="noreferrer">Open Tanga MRE ↗</a>}</div>}
      {selectedRow&&!selectedRow.isTanga&&selectedEvidence&&<div className="tanga-peer-benchmark__selection" aria-live="polite"><strong>#{selectedRow.displayRank} · {selectedRow.project}</strong><span>{selectedRow.country} · {selectedRow.company}</span><p>{selectedRow.measuredIndicated??selectedRow.resource}</p><small>{selectedEvidence.dateLabel}</small><a href={selectedEvidence.href} target="_blank" rel="noreferrer">Open {selectedEvidence.sourceLabel} ↗</a></div>}
      <button type="button" onClick={replay}>{revealed?'Replay before Tanga':'Introduce Tanga →'}</button>
      <button className="tanga-peer-benchmark__globe-reset" type="button" onClick={onResetView}>Whole globe ↺</button>
      {!selectedRow&&<small>Drag to rotate. Select a marker or project to turn the globe toward it. Projects on the far side appear as you rotate.</small>}
    </div>
    <div className="tanga-peer-benchmark__chart" aria-busy={updating}>
      <header><div><span>{updating?'UPDATING RANKS…':revealed?'11 PROJECTS · INCLUDING TANGA':'10-PROJECT PUBLISHED BENCHMARK'}</span><h3>Contained graphite</h3><small>Reported project figures · linear scale · Mt</small></div></header>
      <select className="tanga-peer-benchmark__select" aria-label="Select graphite project" disabled={updating} value={selectedRow?.project??''} onChange={event=>{const peer=rows.find(row=>row.project===event.target.value);if(peer)onSelect(peer);}}>
        <option value="">Choose a project on the globe</option>{rows.map(row=><option key={row.project} value={row.project}>#{row.displayRank} {row.project} · {row.containedGraphiteMt} Mt</option>)}
      </select>
      <ol aria-label="Projects ranked by reported contained graphite">
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
      <details className="tanga-peer-benchmark__basis"><summary>Comparison basis &amp; sources</summary><p>The ten-project set comes from the 7 Nov 2023 Mining Intelligence benchmark. Epanko is updated using EcoGraf’s 11 Mar 2024 MRE; Tanga is inserted using its final MRE dated 19 Dec 2025 and its Indicated contained graphite. The displayed fifth place is within this selected comparison set. Estimate dates and reported categories vary; this is not a current worldwide deposit census. Globe pins show approximate project locations.</p><a href="https://www.costmine.com/2023/11/07/ranked-worlds-top-10-graphite-projects/" target="_blank" rel="noreferrer">Published benchmark ↗</a><a href="https://www.ecograf.com.au/wp-content/uploads/2024/03/06_EGR_ASX_127-Increase-in-MRE_11-March-2024.pdf" target="_blank" rel="noreferrer">Epanko 2024 MRE ↗</a><a href="/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf" target="_blank" rel="noreferrer">Tanga 2025 MRE ↗</a></details>
    </div>
  </section>;
}
