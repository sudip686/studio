'use client';
import {useEffect,useRef,useState} from 'react';

const FIGURES=[
  {id:'microscopy',label:'Microscopy',image:'graphite-tgf002-microscopy.jpg',caption:'TGF002 · stereo microscopy · Figure 4 · PDF p.25',detail:'The report documents graphite together with associated gangue minerals. This image is a sample observation, not a commercial product specification.'},
  {id:'sem',label:'SEM',image:'graphite-sem.jpg',caption:'Representative graphite concentrates · Figure 45 · PDF p.46',detail:'The SEM images document flake morphology and associated mineral inclusions. The report’s analytical work does not establish customer qualification or battery performance.'},
  {id:'preparation',label:'Sample preparation',image:'graphite-lab-workflow.jpg',caption:'Laboratory separation and size fractions · Figure 2 · PDF p.16',detail:'The report describes crushing, sieving, water separation, collection, filtration and drying. This laboratory workflow is distinct from an industrial flowsheet.'},
] as const;

export default function TangaMaterialEvidence({onClose}:{onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),[index,setIndex]=useState(0),figure=FIGURES[index];
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  return <dialog ref={dialog} className="tanga-material-evidence" aria-labelledby="material-evidence-heading" onClose={onClose} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>
    <header><div><span>REPORT EVIDENCE · 12 APRIL 2025</span><h2 id="material-evidence-heading">Inside the graphite samples</h2><p>Global Sustainable Eco-Solutions · Graphite report for SMMPL</p></div><button type="button" aria-label="Close material evidence" onClick={()=>dialog.current?.close()}>×</button></header>
    <div className="tanga-material-counts"><span><strong>120</strong> samples received</span><i>→</i><span><strong>40</strong> selected for characterisation</span><i>→</i><span><strong>23</strong> selected for thin sections</span></div>
    <nav aria-label="Choose a report figure">{FIGURES.map((item,i)=><button key={item.id} type="button" aria-pressed={index===i} onClick={()=>setIndex(i)}>{item.label}</button>)}</nav>
    <figure><img src={`/presentation-assets/${figure.image}`} alt={figure.caption}/><figcaption>{figure.caption} <a href={`/presentation-assets/${figure.image}`} target="_blank" rel="noreferrer">Open full-size figure ↗</a></figcaption></figure>
    <p>{figure.detail}</p><footer>Microscopy · XRD · Raman · FTIR. These are characterisation methods; purity, recovery and end-use qualification require their own evidence.</footer>
  </dialog>;
}
