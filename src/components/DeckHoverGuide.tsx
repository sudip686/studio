'use client';
import {useEffect,useRef,useState} from 'react';

/** Delegated guide for every chapter. Scene-object picking remains in its renderer. */
export default function DeckHoverGuide({mode}:{mode:string}){
  const marker=useRef<HTMLSpanElement>(null);
  const [tip,setTip]=useState<{text:string;x:number;y:number}|null>(null);
  useEffect(()=>{
    setTip(null);const root=marker.current?.closest('main');if(!root)return;
    let current:Element|null=null,dismissed:Element|null=null;
    const show=(target:EventTarget|null,x:number,y:number)=>{
      const element=target instanceof Element?target.closest('[data-deck-tip],button,a,select,input,[role=tab],.tanga-three__callout,.tanga-deck__callout'):null;
      if(element!==current){current=element;dismissed=null;}
      if(!element||!root.contains(element)||dismissed===element){setTip(null);return;}
      const explicit=element.getAttribute('data-deck-tip');
      const label=element.getAttribute('aria-label')||element.getAttribute('title')||element.textContent?.trim();
      let text=explicit||label||'';
      if(element instanceof HTMLSelectElement&&!explicit)text=`${label||'Choose a view'}. Use the list to change the displayed selection.`;
      if(element instanceof HTMLInputElement&&element.type==='range')text=`${label||'Adjust display'}: ${element.value}. Drag or use arrow keys.`;
      if(!text||text.length>320){setTip(null);return;}
      setTip({text,x:Math.max(10,Math.min(window.innerWidth-290,x+15)),y:y+110>window.innerHeight?Math.max(10,y-105):y+18});
    };
    const move=(e:PointerEvent)=>{if(e.buttons){setTip(null);return;}show(e.target,e.clientX,e.clientY);};
    const focus=(e:FocusEvent)=>{const element=e.target as Element;if(!element.matches(':focus-visible'))return;const r=element.getBoundingClientRect();show(e.target,r.left,r.bottom);};
    const clear=()=>setTip(null);const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){dismissed=current;clear();}};
    const pointerDown=()=>{dismissed=current;clear();};
    root.addEventListener('pointermove',move);root.addEventListener('pointerleave',clear);root.addEventListener('focusin',focus);root.addEventListener('focusout',clear);root.addEventListener('pointerdown',pointerDown);root.addEventListener('scroll',clear,true);window.addEventListener('keydown',escape);
    return()=>{root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',clear);root.removeEventListener('focusin',focus);root.removeEventListener('focusout',clear);root.removeEventListener('pointerdown',pointerDown);root.removeEventListener('scroll',clear,true);window.removeEventListener('keydown',escape);};
  },[mode]);
  return <><span ref={marker} hidden/>{tip&&<div className="tanga-hover-guide" role="tooltip" style={{left:tip.x,top:tip.y}}>{tip.text}</div>}</>;
}
