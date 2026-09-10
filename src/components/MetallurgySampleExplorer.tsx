'use client';
import {useState} from 'react';

// Reported deck summaries only. Group results must never become individual assays.
const SAMPLES=[
  {id:'Oxide group',carbon:'98.4% TC',recovery:'93.0%',flake:'>57%',basis:'Oxide composite group summary'},
  {id:'Fresh group',carbon:'98.6% TC',recovery:'94.4%',flake:'Not supplied for the whole group',basis:'Fresh composite group summary'},
  {id:'TDM001',carbon:'Not supplied',recovery:'Not supplied',flake:'34.8%',basis:'Individual reported coarse fraction'},
  {id:'TDM002',carbon:'Not supplied',recovery:'Not supplied',flake:'42.5%',basis:'Individual reported coarse fraction'},
  {id:'TDM003–005',carbon:'Not supplied',recovery:'Not supplied as a group',flake:'>61%',basis:'Grouped coarse-fraction summary; TDM004 recovery is separately reported as 75.8%'},
  {id:'TDM004',carbon:'Not supplied',recovery:'75.8%',flake:'Only grouped >61% summary available',basis:'Reported carbonate-rich recovery outlier'},
  {id:'TDM008',carbon:'Not supplied',recovery:'Not supplied',flake:'>73%',basis:'Individual reported coarse fraction'},
];
export default function MetallurgySampleExplorer(){
  const [index,setIndex]=useState(0),sample=SAMPLES[index];
  return <section className="tanga-met-samples" aria-label="Explore reported metallurgy samples">
    <label htmlFor="met-sample">Explore a reported sample or group</label>
    <select id="met-sample" value={index} onChange={e=>setIndex(Number(e.target.value))}>{SAMPLES.map((s,i)=><option key={s.id} value={i}>{s.id}</option>)}</select>
    <div aria-live="polite" data-met-sample={sample.id}><strong>{sample.id}</strong><dl><dt>Concentrate carbon</dt><dd>{sample.carbon}</dd><dt>Recovery</dt><dd>{sample.recovery}</dd><dt>+150 µm fraction</dt><dd>{sample.flake}</dd></dl><small>{sample.basis}. Source: existing deck summaries; original laboratory verification pending. Missing values are not inferred from group averages.</small></div>
  </section>;
}
