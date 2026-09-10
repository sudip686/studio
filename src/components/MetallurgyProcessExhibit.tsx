'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createMetallurgyPlant,MET_GROUPS,PROCESS_STAGES,BASKET_POSITIONS} from '@/lib/deck/metallurgy-plant';
import MetallurgySampleExplorer from './MetallurgySampleExplorer';

export default function MetallurgyProcessExhibit({paused,onToggle}:{paused:boolean;onToggle:()=>void}){
  const host=useRef<HTMLDivElement>(null),pausedRef=useRef(paused),command=useRef<(n:number)=>void>();
  const [stage,setStage]=useState(-1),[group,setGroup]=useState(0),[evidence,setEvidence]=useState(false),[error,setError]=useState('');
  const [tip,setTip]=useState<{x:number;y:number;text:string}|null>(null);
  pausedRef.current=paused;
  useEffect(()=>{
    const el=host.current;if(!el)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError('3D renderer unavailable. Reported test results remain available.');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
    renderer.domElement.setAttribute('aria-label','Interactive graphite metallurgical testwork bench. Drag to orbit, scroll to zoom; stage buttons provide keyboard access.');el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,1000),plant=createMetallurgyPlant();scene.add(plant.root);
    const labels=BASKET_POSITIONS.map(([x,z],i)=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.SpriteMaterial({map:texture,depthTest:false});const sprite=new THREE.Sprite(material);sprite.position.set(x,9,z);sprite.scale.set(10,2.5,1);sprite.userData.testGroup=i;sprite.userData.stage=4;sprite.renderOrder=20;scene.add(sprite);return {canvas,texture,material,sprite};});
    labels.forEach(({canvas,texture},i)=>{const ctx=canvas.getContext('2d')!;ctx.fillStyle='#132a32';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#58c8bd';ctx.lineWidth=5;ctx.strokeRect(3,3,506,122);ctx.fillStyle='#fff';ctx.font='bold 47px sans-serif';ctx.textAlign='center';ctx.fillText(MET_GROUPS[i].id,256,78);texture.needsUpdate=true;});
    scene.add(new THREE.HemisphereLight(0xe5f3ff,0x68503c,2.2));
    for(const [x,y,z,c,intensity] of [[-35,75,40,0xffddb3,3],[40,35,-30,0x76d9de,3]]){const light=new THREE.DirectionalLight(c,intensity);light.position.set(x,y,z);scene.add(light);}
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=25;controls.maxDistance=240;controls.maxPolarAngle=Math.PI*.48;
    const fullPosition=()=>{const c=new THREE.PerspectiveCamera(36,Math.max(1,el.clientWidth)/Math.max(1,el.clientHeight),.1,1000),centre=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(.12,.3,1).normalize();let distance=150;
      for(let i=0;i<5;i++){c.position.copy(centre).addScaledVector(direction,distance);c.lookAt(centre);c.updateMatrixWorld();let extent=0;for(const x of [-61,73])for(const y of [-12,14])for(const z of [-21,21]){const p=new THREE.Vector3(x,y,z).project(c);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));}distance*=extent*1.13;}
      return centre.clone().addScaledVector(direction,distance);
    };
    let target=new THREE.Vector3(0,1,0),destination=fullPosition(),tween=true,userOrbit=false,selectedStage=-1;
    camera.position.copy(destination);controls.target.copy(target);
    command.current=n=>{selectedStage=n;setStage(n);const x=PROCESS_STAGES[n]?.x??0;target=new THREE.Vector3(x,n<0?1:4,0);destination=n<0?fullPosition():new THREE.Vector3(x+12,24,42);tween=true;userOrbit=false;setTip(null);};
    const start=()=>{tween=false;userOrbit=true;setTip(null);};controls.addEventListener('start',start);
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(selectedStage<0&&!userOrbit){destination=fullPosition();tween=true;}};const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=false,lastPick=0,downAt=[0,0];
    const basketClick=(event:PointerEvent)=>{if(Math.hypot(event.clientX-downAt[0],event.clientY-downAt[1])>6)return;const r=el.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...plant.pickables,...labels.map(l=>l.sprite)],false)[0];const index=hit?.object.userData.testGroup;if(Number.isInteger(index)&&MET_GROUPS[index]){setGroup(index);setEvidence(true);command.current?.(4);}};
    const pick=(event:PointerEvent)=>{if(down||performance.now()-lastPick<60)return;lastPick=performance.now();const r=el.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...plant.pickables,...labels.map(l=>l.sprite)],false)[0];const n=hit?.object.userData.stage;const item=PROCESS_STAGES[n],sample=MET_GROUPS[hit?.object.userData.testGroup];el.style.cursor=sample?'pointer':item?'help':'grab';setTip(item?{x:Math.max(8,Math.min(r.width-260,event.clientX-r.left+16)),y:Math.max(8,Math.min(r.height-110,event.clientY-r.top+14)),text:sample?`${sample.id}: ${sample.basis}. Click for results.`:`${item.title}. ${item.brief}`} :null);};
    const pointerDown=(event:PointerEvent)=>{down=true;downAt=[event.clientX,event.clientY];setTip(null);};const up=()=>{down=false;};const leave=()=>setTip(null);
    el.addEventListener('pointermove',pick);el.addEventListener('pointerdown',pointerDown);el.addEventListener('pointerup',basketClick);window.addEventListener('pointerup',up);el.addEventListener('pointerleave',leave);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=performance.now(),time=0;
    const draw=(now:number)=>{const delta=Math.max(0,Math.min(.05,(now-last)/1000));last=now;const visible=el.getClientRects().length>0&&!document.hidden;
      if(visible){if(!pausedRef.current&&!reduced.matches){time+=delta;plant.update(time);}
        if(tween){camera.position.lerp(destination,reduced.matches?1:.08);controls.target.lerp(target,reduced.matches?1:.08);if(camera.position.distanceTo(destination)<.03)tween=false;}
        controls.update();renderer.render(scene,camera);el.dataset.processTime=time.toFixed(2);el.dataset.cameraDistance=camera.position.distanceTo(controls.target).toFixed(1);el.dataset.userOrbit=String(userOrbit);
      }frame=requestAnimationFrame(draw);
    };frame=requestAnimationFrame(draw);el.dataset.ready='true';
    return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();command.current=undefined;labels.forEach(l=>{l.texture.dispose();l.material.dispose();});el.removeEventListener('pointermove',pick);el.removeEventListener('pointerdown',pointerDown);el.removeEventListener('pointerup',basketClick);window.removeEventListener('pointerup',up);el.removeEventListener('pointerleave',leave);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  },[]);
  const result=MET_GROUPS[group];
  return <section className="tanga-process-exhibit" aria-label="Animated graphite metallurgical testwork">
    <header><div><small>METALLURGICAL TESTWORK · ILLUSTRATIVE LAB EQUIPMENT</small><h2>Characterise the graphite.</h2></div><div className="tanga-process-actions"><button onClick={()=>command.current?.(-1)} data-deck-tip="Restore the full testwork bench after orbiting or zooming.">Full bench</button><button onClick={onToggle} aria-pressed={paused}>{paused?'Play testwork':'Pause testwork'}</button><button onClick={()=>setEvidence(v=>!v)} aria-expanded={evidence}>Test evidence</button></div></header>
    <div className="tanga-process-body">
      <div className="tanga-process-scene"><div ref={host} className="tanga-process-canvas"/>{error&&<p role="alert">{error}</p>}{tip&&<div className="tanga-process-tooltip" role="tooltip" style={{left:tip.x,top:tip.y}}>{tip.text}</div>}<div className="tanga-process-caption">{stage<0?'Sample → lab milling → flotation test → filtration → characterisation':PROCESS_STAGES[stage].brief}<small>Drag to orbit · scroll to zoom · hover equipment · click a stage below</small></div></div>
      <aside className="tanga-process-results"><label>Reported test group<select aria-label="Processing test group" value={group} onChange={e=>setGroup(Number(e.target.value))}>{MET_GROUPS.map((g,i)=><option key={g.id} value={i}>{g.id}</option>)}</select></label>
        <div className="tanga-process-quality" data-deck-tip="TC describes concentrate composition, not feed grade. Recovery is the proportion of feed graphite recovered in testwork."><strong>{result.carbon}</strong><span>Concentrate carbon</span><b>{result.recovery} recovery</b></div>
        <div className="tanga-process-basket-result" aria-live="polite" data-test-group={result.id}><strong>{result.id} · basic results</strong><p>+150 µm: {result.coarse}<br/>Finer fraction: {result.fine}</p><small>{result.basis}</small></div>
        {MET_GROUPS.map((g,i)=><button key={g.id} className="tanga-process-bin" aria-pressed={group===i} onClick={()=>{setGroup(i);setEvidence(true);command.current?.(4);}} data-deck-tip={`Inspect ${g.id}: ${g.basis}. Not a production output.`}><i aria-hidden="true">▥</i><span>{g.id}<strong>Inspect test results</strong></span></button>)}
        <p>Groups can overlap individual samples; results are not additive. Transfers and basket fill are illustrative.</p>
        {evidence&&<div className="tanga-process-evidence"><MetallurgySampleExplorer key={group} initialIndex={group}/></div>}
      </aside>
    </div>
    <nav className="tanga-process-stages" aria-label="Inspect testwork equipment">{PROCESS_STAGES.map((s,i)=><button key={s.id} aria-pressed={stage===i} data-deck-tip={s.brief} onClick={()=>command.current?.(i)}><b>0{i+1}</b>{s.title}</button>)}</nav>
    <footer>Illustrative testwork sequence, not the verified laboratory protocol. Results: existing deck summaries; laboratory verification pending. TC, recovery and flake size measure different characteristics.</footer>
  </section>;
}
