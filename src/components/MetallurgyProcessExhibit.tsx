'use client';

import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {createMetallurgyPlant,MET_GROUPS} from '@/lib/deck/metallurgy-plant';
import {cameraEase} from '@/lib/deck/presentation-motion';
import MetallurgySampleExplorer from './MetallurgySampleExplorer';
import TangaMaterialEvidence from './TangaMaterialEvidence';

const STAGE_COPY=[
  {title:'Start with the material.',question:'What did the laboratory receive?',detail:'Graphite-bearing rock is examined before preparation. The source report includes actual sample microscopy and preparation photographs.',label:'Rock sample'},
  {title:'Liberate the graphite.',question:'Can graphite separate from the host rock?',detail:'Crushing and milling illustrate particle liberation. Laboratory conditions and flake preservation need their own test records.',label:'Preparation'},
  {title:'Test the separation response.',question:'How does the sample respond to flotation?',detail:'Bench cells illustrate graphite separation. Recovery is a reported test result; the bubbles do not calculate a yield.',label:'Flotation'},
  {title:'Recover the test concentrate.',question:'What is collected for measurement?',detail:'Filtration and drying illustrate preparation of a concentrate for analysis. This is a laboratory exhibit, separate from the proposed mine plant.',label:'Dewatering'},
  {title:'Read three different measurements.',question:'Carbon, recovery and size answer different questions.',detail:'Concentrate carbon describes composition. Recovery describes graphite recovered from feed. The coarse fraction describes a sieve-size result.',label:'Characterisation'},
] as const;

/** A focused instrument exhibit; equipment is illustrative, results are sourced separately. */
export default function MetallurgyProcessExhibit({paused,onToggle,onInspectEvidence}:{paused:boolean;onToggle:()=>void;onInspectEvidence?:()=>void}){
  const host=useRef<HTMLDivElement>(null),command=useRef<(stage:number)=>void>();
  const pausedRef=useRef(paused);pausedRef.current=paused;
  const [stage,setStage]=useState(2),[group,setGroup]=useState(0),[error,setError]=useState(''),[rendererAttempt,setRendererAttempt]=useState(0);
  const [figureIndex,setFigureIndex]=useState(0);
  const [materialEvidence,setMaterialEvidence]=useState(false),[evidence,setEvidence]=useState(false);
  const groupRef=useRef(group);groupRef.current=group;
  useEffect(()=>{command.current?.(stage);},[group,stage]);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    setError('');
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError('3D equipment unavailable. Reported test summaries and source images remain available.');return;}
    let contextLost=false;
    const onContextLost=(event:Event)=>{event.preventDefault();contextLost=true;el.dataset.ready='false';setError('Graphics context lost. Laboratory exhibit unavailable until graphics recover.');};
    const onContextRestored=()=>{if(!contextLost)return;contextLost=false;setError('Graphics restored; rebuilding the laboratory exhibit…');window.setTimeout(()=>setRendererAttempt(value=>value+1),0);};
    renderer.domElement.addEventListener('webglcontextlost',onContextLost,false);
    renderer.domElement.addEventListener('webglcontextrestored',onContextRestored,false);
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Illustrative laboratory equipment in 3D. Drag to orbit or scroll to zoom. Select a stage to frame an instrument.');
    el.appendChild(renderer.domElement);
    // Match the deck's dark geospatial stages. Light equipment and teal
    // flotation surfaces read clearly against this instrument-bay backdrop.
    const scene=new THREE.Scene();scene.background=new THREE.Color('#142630');
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);room.dispose();scene.environment=environment.texture;
    const camera=new THREE.PerspectiveCamera(24,1,.1,1000),controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.minDistance=15;controls.maxDistance=200;controls.maxPolarAngle=Math.PI*.49;
    const plant=createMetallurgyPlant();scene.add(plant.root);
    const plinth=new THREE.Group();scene.add(plinth);
    const cabinetMaterial=new THREE.MeshStandardMaterial({color:0xf1f3f0,roughness:.5,metalness:.05});
    const topMaterial=new THREE.MeshStandardMaterial({color:0xb8c4c9,roughness:.4,metalness:.55});
    const floorMaterial=new THREE.MeshStandardMaterial({color:0x263a42,roughness:.92});
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(500,500),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-8;floor.receiveShadow=true;scene.add(floor);
    scene.add(new THREE.HemisphereLight(0xeaf2f4,0x43545d,.95));
    const key=new THREE.DirectionalLight(0xfffcf5,1.65);key.position.set(-30,70,45);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-100;key.shadow.camera.right=100;key.shadow.camera.top=70;key.shadow.camera.bottom=-70;key.shadow.camera.far=250;key.shadow.normalBias=.12;scene.add(key);
    const fill=new THREE.DirectionalLight(0xe5f2ff,.7);fill.position.set(45,20,-35);scene.add(fill);
    const target=new THREE.Vector3(),destination=new THREE.Vector3(),fromPosition=new THREE.Vector3(),fromTarget=new THREE.Vector3();
    let selected=2,userOrbit=false,cameraStarted=performance.now(),tween=true,dirty=true,ready=false,last=performance.now(),time=0,frame=0;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    function cabinet(bounds:THREE.Box3){
      for(const child of [...plinth.children]){plinth.remove(child);if(child instanceof THREE.Mesh)child.geometry.dispose();}
      const centre=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
      const w=Math.max(20,size.x+5),d=Math.max(16,size.z+5);
      const base=new THREE.Mesh(new THREE.BoxGeometry(w,6,d),cabinetMaterial);base.position.set(centre.x,-4,centre.z);base.castShadow=true;base.receiveShadow=true;plinth.add(base);
      const top=new THREE.Mesh(new THREE.BoxGeometry(w+1,.6,d+1),topMaterial);top.position.set(centre.x,-.65,centre.z);top.receiveShadow=true;plinth.add(top);
      for(const x of [-.25,.25]){const handle=new THREE.Mesh(new THREE.BoxGeometry(Math.min(6,w*.15),.2,.35),topMaterial);handle.position.set(centre.x+x*w,-2,centre.z+d/2+.2);plinth.add(handle);}
      bounds.expandByObject(plinth);
    }
    function frameStage(n:number){
      selected=n;const bounds=new THREE.Box3();
      plant.pickables.forEach(mesh=>{
        mesh.visible=mesh.userData.stage===n&&!mesh.userData.transfer&&(mesh.userData.testGroup===undefined||mesh.userData.testGroup===groupRef.current);
        if(mesh.visible)bounds.expandByObject(mesh);
      });
      cabinet(bounds);target.copy(bounds.getCenter(new THREE.Vector3()));
      const direction=new THREE.Vector3(.55,.42,1).normalize();let distance=Math.max(25,bounds.getSize(new THREE.Vector3()).length());
      const fit=new THREE.PerspectiveCamera(camera.fov,camera.aspect,.1,1000);
      for(let i=0;i<5;i++){
        fit.position.copy(target).addScaledVector(direction,distance);fit.lookAt(target);fit.updateMatrixWorld();let extent=0;
        for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const point=new THREE.Vector3(x,y,z).project(fit);extent=Math.max(extent,Math.abs(point.x),Math.abs(point.y));}
        // Leave breathing room for every instrument against this deliberately
        // closer exhibit camera; the same fit is shared by all five stages.
        distance*=extent/0.68;
      }
      destination.copy(target).addScaledVector(direction,distance);fromPosition.copy(camera.position);fromTarget.copy(controls.target);cameraStarted=performance.now();tween=true;dirty=true;userOrbit=false;
      if(!ready){camera.position.copy(destination);controls.target.copy(target);ready=true;tween=false;}
      renderer.domElement.setAttribute('aria-label',`${STAGE_COPY[n].label}: illustrative laboratory equipment in 3D. Drag to orbit, scroll to zoom.`);
      el!.dataset.stage=String(n);el!.dataset.visibleInstruments=String(plant.pickables.filter(m=>m.visible).length);
    }
    command.current=frameStage;
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(!userOrbit)frameStage(selected);dirty=true;};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const change=()=>{dirty=true;};const start=()=>{tween=false;userOrbit=true;window.dispatchEvent(new Event('tanga:manual-exploration'));};
    controls.addEventListener('change',change);controls.addEventListener('start',start);
    const draw=(now:number)=>{
      const wallDelta=Math.max(0,(now-last)/1000),dt=Math.min(.1,wallDelta);last=now;
      controls.dampingFactor=1-Math.exp(-Math.min(.2,wallDelta)*5);
      if(!document.hidden&&el.getClientRects().length){
        if(!pausedRef.current&&!reduced.matches){time+=dt;plant.update(time);dirty=true;}
        if(tween){const progress=reduced.matches?1:cameraEase((now-cameraStarted)/1100);camera.position.lerpVectors(fromPosition,destination,progress);controls.target.lerpVectors(fromTarget,target,progress);if(progress===1)tween=false;dirty=true;}
        controls.update();if(dirty&&!contextLost){renderer.render(scene,camera);dirty=false;}
        el.dataset.cameraMoving=String(tween);el.dataset.processTime=time.toFixed(2);
      }
      frame=requestAnimationFrame(draw);
    };frame=requestAnimationFrame(draw);el.dataset.ready='true';
    return()=>{
      cancelAnimationFrame(frame);observer.disconnect();controls.dispose();command.current=undefined;
      renderer.domElement.removeEventListener('webglcontextlost',onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored',onContextRestored);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));}});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());environment.dispose();pmrem.dispose();key.shadow.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
  },[rendererAttempt]);
  const result=MET_GROUPS[group],copy=STAGE_COPY[stage];
  const sourceFigure=stage===1||stage===3
    ? {index:2,image:'graphite-lab-workflow.jpg',label:'Laboratory preparation',locator:'Figure 2 · PDF p.16'}
    : stage===0?{index:0,image:'graphite-tgf002-microscopy.jpg',label:'TGF002 · microscopy',locator:'Figure 4 · PDF p.25'}
    : {index:1,image:'graphite-sem.jpg',label:'Concentrate morphology · SEM',locator:'Figure 45 · PDF p.46'};
  return <section className="tanga-process-exhibit tanga-process-exhibit--focused" aria-label="Graphite laboratory testwork" data-inspection="bench">
    <header><div><small>BENCH-SCALE TESTWORK · ILLUSTRATIVE EQUIPMENT</small><h2>{copy.title}</h2></div><div className="tanga-process-actions"><button type="button" onClick={()=>command.current?.(stage)}>Reset view</button><button type="button" onClick={onToggle} aria-pressed={paused}>{paused?'Play motion':'Pause motion'}</button></div></header>
    <nav className="tanga-process-stages" aria-label="Testwork stages">{STAGE_COPY.map((item,i)=><button type="button" key={item.label} aria-label={`0${i+1} ${item.label}`} aria-pressed={stage===i} onClick={()=>{setStage(i);window.dispatchEvent(new Event('tanga:manual-exploration'));}}><b>0{i+1}</b><span className="tanga-process-label-long">{item.label}</span><span className="tanga-process-label-short" aria-hidden="true">{['Rock','Prepare','Float','Dry','Measure'][i]}</span></button>)}</nav>
    <div className="tanga-process-body">
      <div className="tanga-process-scene"><div ref={host} className="tanga-process-canvas"/>
        {error&&<figure className="tanga-process-static-fallback"><img src="/presentation-assets/metallurgy-report-page.png" alt="Original metallurgy report analytical table page."/><figcaption>Original report excerpt · analytical table</figcaption></figure>}
        {error&&<p role="alert">{error} <button type="button" onClick={()=>{setError('');setRendererAttempt(value=>value+1);}}>Retry 3D exhibit</button></p>}<div className="tanga-process-caption"><span>{copy.question}</span><small>Drag to orbit · scroll to zoom</small></div></div>
    <aside className="tanga-process-results">
        <small className="tanga-process-kicker">0{stage+1} / 05 · {copy.label.toUpperCase()}</small><h3>Reported test response</h3>
        <label>Variability composite<select aria-label="Select a variability composite" value={group} onChange={event=>setGroup(Number(event.target.value))}>{MET_GROUPS.map((item,i)=><option key={item.id} value={i}>{item.id}</option>)}</select></label>
        <dl className="tanga-process-metrics" aria-live="polite"><div><dt>Concentrate total carbon (TC)</dt><dd>{result.carbon}</dd></div><div><dt>Graphite recovery</dt><dd>{result.recovery}</dd></div><div><dt>Mass fraction above 150 µm</dt><dd>{result.coarse}</dd></div></dl>
        <button type="button" className="tanga-material-entry" onClick={()=>{onInspectEvidence?.();setFigureIndex(sourceFigure.index);setMaterialEvidence(true);}}>Open report evidence: {sourceFigure.label} <span>{sourceFigure.locator} · April 2025 · separate characterisation evidence ↗</span></button>
        <details open={evidence} onToggle={event=>setEvidence(event.currentTarget.open)}><summary>Result basis &amp; definitions</summary><p>{copy.detail}</p><p>{result.basis}. Groups may overlap individual samples; values are not additive.</p><MetallurgySampleExplorer key={group} initialIndex={group}/></details>
      </aside>
    </div>
    <footer>Equipment is illustrative. TC and recovery: IMO Final Report Rev. 0, Table 2. +150 µm mass fraction: AMC MRE, Table II. The reports classify TDM008 differently (IMO: “Fresh / Kaolin”; AMC: oxide / kaolinised). These are laboratory results, not operating performance or product qualification.</footer>
    {materialEvidence&&<TangaMaterialEvidence initialIndex={figureIndex} onClose={()=>setMaterialEvidence(false)}/>}
  </section>;
}
