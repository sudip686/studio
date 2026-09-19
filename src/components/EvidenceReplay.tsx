'use client';
import {useEffect,useRef,useState} from 'react';
import type {WorkbenchMode} from '@/lib/tanga-voice-command';
const STEPS=[{mode:'subsurface',label:'Interpreted geology'},{mode:'drillholes',label:'Recorded drill evidence'},{mode:'metallurgy',label:'Reported testwork'}] as const;

/** Revisits actual deck scenes, not fabricated summary images. */
export default function EvidenceReplay({mode,ready,navigate}:{mode:WorkbenchMode;ready:boolean;navigate:(mode:WorkbenchMode)=>void}){
  const [index,setIndex]=useState(-1),[paused,setPaused]=useState(false);
  const go=useRef(navigate);go.current=navigate;
  useEffect(()=>{const hide=()=>{if(document.hidden)setPaused(true);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
  const next=()=>{if(index>=2){setIndex(-1);go.current('comparison');}else{setIndex(index+1);go.current(STEPS[index+1].mode);}};
  useEffect(()=>{
    if(index<0||paused||!ready||mode!==STEPS[index].mode||document.hidden)return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=setTimeout(()=>{if(document.hidden)return;if(index===2){setIndex(-1);go.current('comparison');}else{setIndex(index+1);go.current(STEPS[index+1].mode);}},8000);
    return()=>clearTimeout(timer);
  },[index,paused,ready,mode]);
  useEffect(()=>{if(index>=0&&mode!==STEPS[index].mode)setIndex(-1);},[mode,index]);
  if(index<0)return mode==='comparison'?<button className="tanga-evidence-replay-start" onClick={()=>{setPaused(false);setIndex(0);go.current('subsurface');}}>Replay the evidence · 3 scenes</button>:null;
  return <aside className="tanga-evidence-replay" aria-label="Closing evidence replay"><strong>{index+1}/3 · {STEPS[index].label}</strong><span>{ready?'Evidence view ready':'Preparing evidence view…'}</span><button aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'Resume replay':'Pause replay'}</button><button onClick={next}>Next evidence</button><button onClick={()=>{setIndex(-1);go.current('comparison');}}>Return to conclusion</button></aside>;
}
