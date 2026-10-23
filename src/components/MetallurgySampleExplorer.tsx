'use client';
import {useState} from 'react';

import {MET_SAMPLES as SAMPLES} from '@/lib/deck/metallurgy-samples';
export default function MetallurgySampleExplorer({initialIndex=0}:{initialIndex?:number}){
  const [index,setIndex]=useState(initialIndex),sample=SAMPLES[index];
  return <section className="tanga-met-samples" aria-label="Explore reported metallurgy samples">
    <label htmlFor="met-sample">Explore one variability composite</label>
    <select id="met-sample" value={index} onChange={e=>setIndex(Number(e.target.value))}>{SAMPLES.map((s,i)=><option key={s.id} value={i}>{s.id}</option>)}</select>
    <div aria-live="polite" data-met-sample={sample.id}><strong>{sample.id}</strong><dl><dt>Concentrate TC</dt><dd>{sample.carbon}</dd><dt>Recovery</dt><dd>{sample.recovery}</dd><dt>+150 µm mass fraction</dt><dd>{sample.flake}</dd></dl><small>{sample.basis}. TC/recovery: IMO Final Report Rev. 0, Table 2. Flake mass fraction: AMC MRE, Table II. Source reports use different weathering labels for TDM008.</small></div>
  </section>;
}
