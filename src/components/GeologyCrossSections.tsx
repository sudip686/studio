'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {intersectBlocks,intersectUnit,projectDrills,sampleSectionPits,sampleSectionTerrain,sectionDefinitions,sectionWorld,type SectionDefinition,type SectionPoint,type SectionSource} from '@/lib/deck/cross-section';

const path=(points:SectionPoint[],close=false)=>points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${(-y).toFixed(2)}`).join(' ')+(close?' Z':'');
const gradeColor=(grade:number)=>grade>=5?'#efa15b':grade>=3?'#55c3c8':'#d8e1e5';
function ticks(low:number,high:number){const raw=(high-low)/7,power=10**Math.floor(Math.log10(raw||1)),step=[1,2,5,10].map(x=>x*power).find(x=>x>=raw)!;return Array.from({length:Math.floor(high/step)-Math.ceil(low/step)+1},(_,i)=>(Math.ceil(low/step)+i)*step);}

export default function GeologyCrossSections({source,onView,loadSectionBlocks}:{source:SectionSource;onView:(section:SectionDefinition|null,flat:boolean)=>void;loadSectionBlocks?:()=>Promise<SectionSource['blocks']>}){
  const definitions=useMemo(()=>sectionDefinitions(source),[source]);
  const [selected,setSelected]=useState(0),[open,setOpen]=useState(false),[halfWidth,setHalfWidth]=useState(25);
  const [blocks,setBlocks]=useState(false),[pits,setPits]=useState(false),[zoom,setZoom]=useState(1),[pan,setPan]=useState<[number,number]>([0,0]);
  const [hole,setHole]=useState<string|null>(null);
  const [loadedBlocks,setLoadedBlocks]=useState<SectionSource['blocks']|null>(null),[blockStatus,setBlockStatus]=useState('');
  useEffect(()=>{if(!blocks||!loadSectionBlocks||loadedBlocks)return;let cancelled=false;setBlockStatus('Loading full grade cells on demand…');loadSectionBlocks().then(data=>{if(!cancelled){setLoadedBlocks(data);setBlockStatus('');}}).catch(()=>{if(!cancelled)setBlockStatus('Grade cells unavailable. Toggle off and on to retry. Geology remains available.');});return()=>{cancelled=true;};},[blocks,loadSectionBlocks,loadedBlocks]);
  const plotRef=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;pan:[number,number]}|null>(null);
  const [size,setSize]=useState({w:900,h:400});
  const section=definitions[selected]??definitions[0];
  const result=useMemo(()=>section?{
    units:source.units.map(u=>({...intersectUnit(u.geometry,section),name:u.name,color:u.color})),
    terrain:sampleSectionTerrain(source,section),blocks:intersectBlocks(loadedBlocks??source.blocks,section),pits:sampleSectionPits(source,section),
  }:null,[source,section,loadedBlocks]);
  const drills=useMemo(()=>section?projectDrills(source.drills,section,halfWidth):[],[source,section,halfWidth]);
  useEffect(()=>{if(!open||!plotRef.current)return;const element=plotRef.current.querySelector('svg')!;const resize=()=>setSize({w:element.clientWidth,h:element.clientHeight});resize();const observer=new ResizeObserver(resize);observer.observe(element);return()=>observer.disconnect();},[open]);
  useEffect(()=>{setZoom(1);setPan([0,0]);setHole(null);},[selected]);
  if(!section||!result)return <aside className="tanga-cross-launch">Sections unavailable: no model-axis line inside the supplied boundary.</aside>;
  const heights=[...result.terrain.map(p=>p[1]),...result.units.flatMap(u=>[...u.loops.flat().map(p=>p[1]),...u.open.flat().map(p=>p[1])])].filter(Number.isFinite);
  const low=Math.min(...heights)-30,high=Math.max(...heights)+30;
  const unitsPerPixel=Math.max((section.max-section.min)/(size.w-110),(high-low)/(size.h-90))/zoom;
  const viewWidth=size.w*unitsPerPixel,viewHeight=size.h*unitsPerPixel;
  const viewX=(section.min+section.max-viewWidth)/2+pan[0],viewY=-(high+low+viewHeight)/2+pan[1];
  const font=12*unitsPerPixel;
  const unitLoops=result.units.reduce((sum,u)=>sum+u.loops.length,0),openSegments=result.units.reduce((sum,u)=>sum+u.open.length,0);
  const mask=path([...result.terrain,[section.max,low-10000],[section.min,low-10000]],true);
  const holeRows=drills.filter(d=>d.holeId===hole);
  const choose=(index:number)=>{setSelected(index);onView(definitions[index],open);};
  const boundary=source.boundary;const bx=boundary.map(p=>p[0]),bz=boundary.map(p=>p[1]);const mapSpan=Math.max(Math.max(...bx)-Math.min(...bx),Math.max(...bz)-Math.min(...bz));
  const mapX=(x:number)=>85+(x-(Math.min(...bx)+Math.max(...bx))/2)/mapSpan*110,mapZ=(z:number)=>65+(z-(Math.min(...bz)+Math.max(...bz))/2)/mapSpan*110;
  const endpoints=[sectionWorld(section,section.min),sectionWorld(section,section.max)];
  const selector=<label>Section<select aria-label="Cross-section view" value={selected} onChange={e=>choose(Number(e.target.value))}>{definitions.map((s,i)=><option key={s.id} value={i}>{s.ends.join('–')} · {s.title}</option>)}</select></label>;
  if(!open)return <aside className="tanga-cross-launch" aria-label="Geological cross-sections">
    <small>MODEL-DERIVED SECTIONS</small><h2>Read across the deposit</h2>{selector}
    <button onClick={()=>onView(section,false)}>Locate {section.ends.join('–')} in 3D</button>
    <button onClick={()=>{onView(section,true);setOpen(true);}}>Open filled cross-section</button>
    <p>North, South and longitudinal views. Actual model intersections; no invented contacts.</p>
  </aside>;
  return <section className="tanga-cross-section" aria-label="Filled geological cross-section" data-section-id={section.id} data-closed-loops={unitLoops} data-open-segments={openSegments} data-projected-holes={new Set(drills.map(d=>d.holeId)).size}>
    <header><div><small>INTERPRETED GEOLOGY · SECTION {section.ends.join('–')}</small><h2>{section.title}</h2></div><button onClick={()=>{setOpen(false);onView(section,false);}}>Return to 3D locator</button></header>
    <aside className="tanga-cross-section__tools">
      {selector}
      <svg viewBox="0 0 170 130" className="tanga-cross-section__locator" role="img" aria-label={`${section.ends.join(' to ')} location inside the unchanged provisional project boundary; north up`}>
        <path d={boundary.map((p,i)=>`${i?'L':'M'}${mapX(p[0])},${mapZ(p[1])}`).join(' ')+'Z'} fill="#253e45" stroke="#dca15f"/>
        {source.pits.map((p,i)=><polygon key={i} points={p.ring.map(q=>`${mapX(q[0])},${mapZ(q[1])}`).join(' ')} fill="none" stroke="#869da6" strokeDasharray="2 2"/>)}
        <line x1={mapX(endpoints[0][0])} y1={mapZ(endpoints[0][1])} x2={mapX(endpoints[1][0])} y2={mapZ(endpoints[1][1])} stroke="#63ddd7" strokeWidth="2"/>
        {endpoints.map((p,i)=><text key={i} x={mapX(p[0])+5} y={mapZ(p[1])-5} fill="#fff" fontSize="11">{section.ends[i]}</text>)}<text x="10" y="16" fill="#ddd" fontSize="10">N ↑</text>
      </svg>
      <p>Azimuth {section.azimuth.toFixed(1)}°<br/>Model-envelope axis, not measured strike.</p>
      <label>Drill projection ±{halfWidth} m<input aria-label="Drill projection half-width" type="range" min="0" max="100" step="5" value={halfWidth} onChange={e=>{setHalfWidth(Number(e.target.value));setHole(null);}}/></label>
      <small>Default ±25 m is a viewing window, not a geological thickness or drill-spacing criterion.</small>
      <label className="tanga-cross-check"><input type="checkbox" checked={blocks} onChange={e=>setBlocks(e.target.checked)}/> Plane-intersecting grade cells</label>
      {blocks&&blockStatus&&<small role="status">{blockStatus}</small>}
      <label className="tanga-cross-check"><input type="checkbox" checked={pits} onChange={e=>setPits(e.target.checked)}/> Conceptual pit profiles</label>
      <div className="tanga-cross-section__zoom"><button onClick={()=>setZoom(z=>Math.min(4,z*1.5))} disabled={zoom>=4}>Zoom +</button><button onClick={()=>setZoom(z=>Math.max(1,z/1.5))} disabled={zoom<=1}>Zoom −</button><button onClick={()=>{setZoom(1);setPan([0,0]);}}>Fit</button></div>
      <small>Equal horizontal/vertical scale · drag to pan · {zoom.toFixed(1)}× view</small>
      <div className="tanga-cross-section__legend">{result.units.map(u=><div key={u.name} data-section-unit={u.name} data-loops={u.loops.length} data-open={u.open.length}><i style={{background:u.color}}/><span>{u.name}{!u.loops.length?' · no closed fill':''}</span></div>)}</div>
      <p>Assay / cell TGC:<br/><span style={{color:'#d8e1e5'}}>● &lt;3%</span> · <span style={{color:'#55c3c8'}}>● 3–&lt;5%</span> · <span style={{color:'#efa15b'}}>● ≥5%</span></p>
      <small>Display bins, not economic cutoffs. Geological fill comes from the plane; only drill traces use the projection window.</small>
    </aside>
    <div ref={plotRef} className="tanga-cross-section__plot">
      <div className="tanga-cross-section__unit-key">{result.units.map(u=><span key={u.name}><i style={{background:u.color}}/>{u.name.replace(/_/g,' ')}</span>)}</div>
      <svg viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`} role="img" aria-label={`${section.title}, equal-scale model intersections, distance in metres and supplied elevation datum`} onPointerDown={e=>{if(e.button!==0||(e.target instanceof Element&&e.target.closest('[data-section-hole]')))return;drag.current={x:e.clientX,y:e.clientY,pan};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!drag.current)return;setPan([drag.current.pan[0]-(e.clientX-drag.current.x)*unitsPerPixel,drag.current.pan[1]-(e.clientY-drag.current.y)*unitsPerPixel]);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
        <defs><clipPath id="tanga-section-ground"><path d={mask}/></clipPath></defs>
        {ticks(0,section.max-section.min).map(distance=>{const x=section.min+distance;return <g key={x}><line x1={x} x2={x} y1={-high} y2={-low} stroke="#3e545e" strokeDasharray="3 5" vectorEffect="non-scaling-stroke"/><text x={x} y={-low+font*1.6} fontSize={font} fill="#a4bbc4" textAnchor="middle">{Math.round(distance)}</text></g>;})}
        {ticks(low,high).map(y=><g key={y}><line x1={section.min} x2={section.max} y1={-y} y2={-y} stroke="#3e545e" strokeDasharray="3 5" vectorEffect="non-scaling-stroke"/><text x={section.min-font} y={-y+font*.3} fontSize={font} fill="#a4bbc4" textAnchor="end">{Math.round(y)}</text></g>)}
        <g clipPath="url(#tanga-section-ground)">
          {result.units.map(u=><g key={u.name}><path d={u.loops.map(r=>path(r,true)).join(' ')} fill={u.color} fillOpacity=".8" fillRule="evenodd" stroke={u.color} strokeWidth=".8" vectorEffect="non-scaling-stroke"/><path d={u.open.map(l=>path(l)).join(' ')} fill="none" stroke={u.color} strokeDasharray="4 3" vectorEffect="non-scaling-stroke"/></g>)}
          {blocks&&result.blocks.map((b,i)=><rect key={i} x={b.min} y={-b.high} width={b.max-b.min} height={b.high-b.low} fill={gradeColor(b.carbon)} fillOpacity=".72" stroke="#07121a" strokeWidth=".35" vectorEffect="non-scaling-stroke"><title>{b.carbon.toFixed(2)}% TGC · true plane–cell intersection</title></rect>)}
        </g>
        <path d={path(result.terrain)} fill="none" stroke="#efe4c9" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
        {pits&&result.pits.map((line,i)=><path key={i} d={path(line)} fill="none" stroke="#ffbf65" strokeWidth="2" strokeDasharray="7 4" vectorEffect="non-scaling-stroke"/>)}
        {drills.map((d,i)=><path key={i} data-section-hole={d.holeId} d={path(d.line)} fill="none" strokeLinecap="round" stroke={hole===d.holeId?'#fff':gradeColor(d.carbon)} strokeWidth={hole===d.holeId?5:2.5} vectorEffect="non-scaling-stroke" onClick={()=>setHole(d.holeId)}><title>{d.holeId} · {d.depthFrom}–{d.depthTo} m · {d.carbon.toFixed(2)}% TGC · projected into section</title></path>)}
        {section.ends.map((end,i)=><text key={end} x={i?section.max:section.min} y={-high-font} fill="#71e4da" fontSize={font*1.5} textAnchor="middle">{end}</text>)}
        <text x={(section.min+section.max)/2} y={-low+font*3.2} textAnchor="middle" fontSize={font} fill="#d1e0e4">Distance from {section.ends[0]} (m) · Elevation (m, supplied datum) · V:H = 1:1</text>
      </svg>
      <div className="tanga-cross-section__inspection" aria-live="polite">{hole?<><strong>{hole}</strong> · {holeRows.length} projected intervals · {Math.min(...holeRows.map(d=>d.depthFrom))}–{Math.max(...holeRows.map(d=>d.depthTo))} m logged depth <button onClick={()=>setHole(null)}>Clear</button></>:<>Select a drill trace to inspect its source ID. Hover intervals for logged depth and TGC.</>}</div>
    </div>
    <footer>{unitLoops} closed model loops · {openSegments} unfilled ambiguous segments · {new Set(drills.map(d=>d.holeId)).size} projected holes{blocks?` · ${result.blocks.length} plane-intersecting cells`:''}. Geological fill is masked above sampled terrain. Raw drill elevations are not snapped; datum and contacts require verification. Conceptual pits are not reserves. Overlapping source units retain their original geometry.</footer>
  </section>;
}
