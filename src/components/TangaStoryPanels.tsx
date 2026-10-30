'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {TGC_GRADE_BINS, ASSAY_INTERVAL_BINS} from '@/lib/deck/grade-legend';
import {DEVELOPMENT_FACILITIES,type DevelopmentView} from '@/data/tanga-development';
import {CHAPTER_SOURCES, NEXT_DECISIONS, WORK_MILESTONES, type TangaChapterId} from '@/data/tanga-evidence';

const PIT_RESOURCE_GRADE_BANDS=TGC_GRADE_BINS
  .filter(bin=>bin.key==='medium'||bin.key==='high'||bin.key==='very-high')
  .map(bin=>({...bin,displayRange:bin.key==='medium'?'4.5–<6%':bin.key==='high'?'6–<8%':'≥8%'}));

const MINE_PLANT_FOCUSES=[
  ['all','Whole plant'],['feed','ROM & crushing'],['milling','Milling & cyclones'],['flotation','Flotation cells'],
  ['thickening','Thickener & water'],['dewatering','Filter press & dryer'],['product','Product handling'],
] as const;

export function TangaEvidenceDrawer({chapter}: {chapter: TangaChapterId}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return <>
    <button className="tanga-evidence-trigger" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <BookOpen size={15} aria-hidden="true"/> Sources &amp; basis
    </button>
    {open && <div className="tanga-evidence-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="tanga-evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="tanga-evidence-title">
        <header>
          <div><span>{chapter.replace('_', ' ').toUpperCase()} · EVIDENCE</span><h2 id="tanga-evidence-title">Sources &amp; basis</h2><p>Trace the claims in this view to their source and limits.</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close sources"><X size={19}/></button>
        </header>
        <div className="tanga-evidence-list">
          {CHAPTER_SOURCES[chapter].map((source) => <article key={`${source.title}-${source.locator}`}>
            <div className="tanga-evidence-source-title"><CheckCircle2 size={15} aria-hidden="true"/><strong>{source.title}</strong></div>
            <span>{source.locator}</span>
            <p>{source.qualification}</p>
            {source.href && <a href={source.href} target="_blank" rel="noreferrer">Open source <ArrowRight size={14}/></a>}
          </article>)}
        </div>
        <footer>Evidence is shown with its stated scope. A visual interpretation does not extend the source data.</footer>
      </section>
    </div>}
  </>;
}

function SceneMotionControl({paused,onToggle}:{paused:boolean;onToggle:()=>void}) {
  return <div className="tanga-story-motion" role="group" aria-label="3D scene animation">
    <span><i aria-hidden="true" data-state={paused?'paused':'playing'}/>{paused?'Scene motion paused':'Scene motion active'}</span>
    <button type="button" aria-pressed={paused} onClick={onToggle}>{paused?'Resume motion':'Pause motion'}</button>
  </div>;
}

export function TangaChapterStoryPanel({chapter, onOpenSurvey, onToggleSurfaceConcept, surfaceConceptView = false, surfaceCompareSplit = 50, onSurfaceCompareSplit, onRevealGeology, geologySectionShown = false, milestoneId = 'survey', onMilestoneChange, onInspectPlant, onPlantProcessFocus, onInspectDevelopment, onSiteOrientation, onRevealPitBlocks, pitBlockFocusIndex = null, pitBlocksStatus = 'ready', pitGradeFocus = null, onPitGradeFocusChange, developmentViewId, availableDevelopment = [], siteContextVisible = true, onShowSiteContext, sceneMotionPaused = false, onToggleSceneMotion}: {developmentViewId?:string;availableDevelopment?:string[];chapter: TangaChapterId; onOpenSurvey?: () => void; onToggleSurfaceConcept?: () => void; surfaceConceptView?: boolean; surfaceCompareSplit?: number; onSurfaceCompareSplit?: (split:number)=>void; onRevealGeology?: () => void; geologySectionShown?: boolean; milestoneId?: string; onMilestoneChange?: (id: string) => void; onInspectPlant?: () => void; onPlantProcessFocus?:(stage:string,roofOpen:boolean)=>void; onInspectDevelopment?: (view:DevelopmentView)=>void; onSiteOrientation?: (orientation:'plan'|'oblique')=>void; onRevealPitBlocks?:(pitIndex?:number)=>void; pitBlockFocusIndex?:number|null; pitBlocksStatus?:'loading'|'ready'|'error'; pitGradeFocus?:string|null; onPitGradeFocusChange?:(grade:string|null)=>void; siteContextVisible?:boolean; onShowSiteContext?:()=>void; sceneMotionPaused?:boolean; onToggleSceneMotion?:()=>void}) {
  const panelRef=useRef<HTMLElement|null>(null);
  const [minePanelSection,setMinePanelSection]=useState<'site'|'blocks'|'sources'>(()=>['pit-blocks','north-pit','south-pit'].includes(developmentViewId??'')?'blocks':'site');
  const [siteOrientation,setSiteOrientation]=useState<'plan'|'oblique'>('oblique');
  const [plantProcessFocus,setPlantProcessFocus]=useState('all');
  const [plantRoofOpen,setPlantRoofOpen]=useState(false);

  useEffect(()=>{
    if(chapter!=='mine_planning')return;
    const onOrientationChange=(event:Event)=>{
      const orientation=(event as CustomEvent<'plan'|'oblique'>).detail;
      if(orientation==='plan'||orientation==='oblique')setSiteOrientation(orientation);
    };
    window.addEventListener('tanga:mine-orientation-change',onOrientationChange);
    setSiteOrientation('oblique');
    return()=>window.removeEventListener('tanga:mine-orientation-change',onOrientationChange);
  },[chapter]);

  useEffect(()=>{
    if(developmentViewId!=='plant'){
      setPlantProcessFocus('all');
      setPlantRoofOpen(false);
      return;
    }
    const panel=panelRef.current;
    if(panel)window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{if(panel.isConnected)panel.scrollTop=panel.scrollHeight;}));
  },[developmentViewId]);

  useEffect(()=>{
    if(chapter!=='mine_planning')return;
    // Keep the information panel in step with the authored 3D pit-block view.
    setMinePanelSection(['pit-blocks','north-pit','south-pit'].includes(developmentViewId??'')?'blocks':'site');
  },[chapter,developmentViewId]);
  const developmentView=DEVELOPMENT_FACILITIES.find(view=>view.id===developmentViewId) ?? (developmentViewId==='north-pit'?{title:'Read the northern excavation',explanation:'Compare the candidate shell with terrain and model footprint. Benches and access path are illustrative, with no engineered road or grade.'}:developmentViewId==='south-pit'?{title:'Read the southern excavation',explanation:'Compare the candidate shell with terrain and model footprint. Excavation limits, access and slopes remain illustrative pending engineering.'}:developmentViewId==='pit-blocks'?{title:'Resource blocks in both pits',explanation:'Compare source grade cells within the two conceptual pit cutaways. Focus one excavation or return to the whole-site view.'}:undefined);
  const blockInspectorActive=chapter==='mine_planning'&&minePanelSection==='blocks';
  const developmentAvailable=(id:DevelopmentView)=>Boolean(onInspectDevelopment)&&!((id==='tailings'||id==='waste')&&!availableDevelopment.includes(id))&&!(id==='campus'&&!availableDevelopment.length);
  const milestoneIndex = Math.max(0, WORK_MILESTONES.findIndex((item) => item.id === milestoneId));
  const milestone = WORK_MILESTONES[milestoneIndex];

  if (chapter === 'work_completed') return <aside className="tanga-story-panel tanga-story-panel--timeline" aria-label="Work completed timeline">
    <div className="tanga-story-panel__eyebrow">PROJECT PROGRESS · SOURCE-DATED</div>
    <h2>Work completed</h2>
    <p className="tanga-story-panel__intro">Four distinct evidence milestones. Select one to inspect what it adds to the project picture.</p>
    <nav className="tanga-story-timeline" aria-label="Select a project milestone">
      {WORK_MILESTONES.map((item, index) => <button type="button" key={item.id} className={index === milestoneIndex ? 'is-active' : ''} onClick={() => onMilestoneChange?.(item.id)} aria-current={index === milestoneIndex ? 'step' : undefined}>
        <span>{item.date}</span><strong>{item.title}</strong>
      </button>)}
    </nav>
    <div className="tanga-story-feature">
      <img src={milestone.image} alt={milestone.imageAlt} loading="eager" fetchPriority="high"/>
      <div><span>{milestone.source}</span><p>{milestone.detail}</p></div>
    </div>
    {milestone.id === 'survey' && onOpenSurvey && <button type="button" className="tanga-story-panel__link" onClick={onOpenSurvey}>Open the measured terrain chapter <ArrowRight size={14}/></button>}
    <p className="tanga-story-panel__qualification">The DTM is spatially registered. Report photographs and figures are shown as source context, not mapped locations.</p>
    <div className="tanga-story-panel__stepper"><button type="button" aria-label="Previous milestone" onClick={() => onMilestoneChange?.(WORK_MILESTONES[(milestoneIndex + WORK_MILESTONES.length - 1) % WORK_MILESTONES.length].id)}><ChevronLeft size={16}/></button><span>{String(milestoneIndex + 1).padStart(2, '0')} / {String(WORK_MILESTONES.length).padStart(2, '0')}</span><button type="button" aria-label="Next milestone" onClick={() => onMilestoneChange?.(WORK_MILESTONES[(milestoneIndex + 1) % WORK_MILESTONES.length].id)}><ChevronRight size={16}/></button></div>
  </aside>;

  if (chapter === 'project') return <aside className="tanga-story-panel tanga-story-panel--project" aria-label="Tanga project introduction">
    <div className="tanga-story-panel__eyebrow">TANGA REGION · TANZANIA</div>
    <h2>Tanga Graphite, on the ground</h2>
    <p className="tanga-story-panel__intro">A graphite project in the Maramba area of Mkinga District, framed by the August 2025 topographical survey.</p>
    <img className="tanga-story-project-image" src="/presentation-assets/survey-site-aerial.jpg" alt="Aerial photographs of the forested Tanga project landscape"/>
    <div className="tanga-story-image-caption"><span>Survey report · site photographs</span><small>Context imagery · not a georeferenced orthophoto</small></div>
  </aside>;

  if (chapter === 'topography') return <aside className="tanga-story-panel tanga-story-panel--terrain" aria-label="Surveyed terrain basis">
    <div className="tanga-story-panel__eyebrow">SURVEY SURFACE · AUGUST 2025</div>
    <h2>Read the ground before the concept</h2>
    <p className="tanga-story-panel__intro">The ridges and valleys provide a measured surface reference for drilling, geology and the proposed site.</p>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    <div className="tanga-terrain-scale"><strong>1×</strong><span>True vertical scale<br/>Relief is not exaggerated</span></div>
    <ol className="tanga-terrain-reading"><li><b>01</b><span>Orient to the full surveyed surface.</span></li><li><b>02</b><span>Advance to the ridge profile for a lower, raking view.</span></li><li><b>03</b><span>Follow the recorded drilling beneath this surface.</span></li></ol>
    <p className="tanga-story-panel__qualification">The displayed mesh is resampled for interaction. Terrain context does not establish drainage design, ground conditions or buildability.</p>
  </aside>;

  if (chapter === 'drillholes') return <aside className="tanga-story-panel tanga-story-panel--drill" aria-label="Drilling evidence">
    <div className="tanga-story-panel__eyebrow">OBSERVATION · DRILL CORE</div>
    <h2>Start with what was sampled</h2>
    <p className="tanga-story-panel__intro">Core records provide direct observations at discrete intervals. The interpretation between holes carries a different level of certainty.</p>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    <img className="tanga-story-project-image" src="/presentation-assets/verified-core-example.jpg" alt="Photograph of labelled Tanga graphite drill core with a cut line and sampling intervals"/>
    <div className="tanga-story-image-caption"><span>AMC MRE · Figure 3.9</span><small>Report image · not the selected 3D hole</small></div>
    <div className="tanga-compact-grade-key" aria-label="Recorded interval TGC legend"><span>RECORDED INTERVAL TGC</span><div>{ASSAY_INTERVAL_BINS.map(bin=><span key={bin.key}><i style={{background:bin.color}}/>{bin.label}</span>)}</div></div>
    <div className="tanga-story-inline-note">100 diamond drillholes described in AMC MRE §3.2</div>
    <div className="tanga-story-datum-note">Collar symbols mark the DTM surface; drill traces retain recorded elevations. Their vertical datum agreement requires verification. Use Below ground to inspect the traces from underneath.</div>
  </aside>;

  if (chapter === 'subsurface') return <aside className="tanga-story-panel tanga-story-panel--geology" aria-label="Petrography sample evidence">
    <header className="tanga-geology-story__header">
    <div className="tanga-story-panel__eyebrow">SAMPLE TRACE · TGF002</div>
    <h2>Connect the observations</h2>
    </header>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    <div className="tanga-geology-story__body">
    <div className="tanga-sample-crosswalk"><span>Petrography <b>TGF002</b></span><i>↔</i><span>Hole <b>TGDD1009</b></span><i>↔</i><span>Assay <b>TD0058</b></span></div>
    <img className="tanga-story-micrograph" src="/presentation-assets/petrography-tgdd1009-18m.jpg" alt="Photomicrograph for Tanga petrography sample TGF002"/>
    <div className="tanga-story-image-caption"><span>18.25–18.38 m · graphite-bearing schist</span><small>Source scale bar retained</small></div>
    <p className="tanga-story-panel__intro">The 3D contacts are geological interpretations between observations; this image documents the named sample only.</p>
    </div>
    {onRevealGeology && <footer className="tanga-geology-story__footer"><button type="button" className="tanga-story-panel__compare" aria-pressed={geologySectionShown} onClick={onRevealGeology}>{geologySectionShown ? 'Restore full interpretation' : 'Reveal interpreted section'} <ArrowRight size={14}/></button></footer>}
  </aside>;

  if (chapter === 'resource') return <aside className="tanga-story-panel tanga-story-panel--resource" aria-label="Reported resource estimate explained">
    <div className="tanga-story-panel__eyebrow">REPORTED MRE · AMC · DECEMBER 2025</div>
    <h2>Scale, grade and location</h2>
    <p className="tanga-story-panel__intro">The report describes the estimate. The 3D cells show where modelled grades sit within the deposit.</p>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    <div className="tanga-story-resource-number"><strong>148<span>Mt</span></strong><small>Indicated mineral resource</small></div>
    <dl className="tanga-story-resource-facts"><div><dt>Reported grade</dt><dd>4.94% TGC</dd></div><div><dt>Contained graphite</dt><dd>≈7.31 Mt</dd></div></dl>
    <div className="tanga-compact-grade-key" aria-label="Displayed block TGC legend"><span>DISPLAYED BLOCK TGC</span><div>{TGC_GRADE_BINS.map(bin=><span key={bin.key}><i style={{background:bin.color}}/>{bin.range}</span>)}</div></div>
    <p className="tanga-story-panel__intro">Rotate the model to see its extent. Use the grade legend to isolate a displayed grade band.</p>
    <p className="tanga-story-panel__qualification">Indicated portion of the supplied AMC MRE. Displayed blocks and filters do not constitute a new resource estimate or an ore reserve.</p>
  </aside>;

  if (chapter === 'mine_planning') return <aside ref={panelRef} className="tanga-story-panel tanga-story-panel--concept" aria-label={blockInspectorActive?'Mine plan information: pit-block controls':'Concept and terrain comparison'}>
    <div className="tanga-story-panel__eyebrow">CONCEPT · REGISTERED TO TERRAIN</div>
    <h2>{blockInspectorActive?'Pit-block controls':developmentView?.title ?? 'From the ridge to the lowlands'}</h2>
    <p className="tanga-story-panel__intro">{blockInspectorActive?'Focus a pit or filter the source cells by displayed TGC band.':developmentViewId==='plant'?'Explore six process areas. Equipment and roof cutaways are illustrative.':developmentView?.explanation ?? 'Trace the report-based feed candidate to the lowland plant, then inspect illustrative site services.'}</p>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    {!siteContextVisible&&<div className="tanga-site-context-hidden" role="status">
      <div><strong>Site concept layers are hidden</strong><span>The terrain remains visible. Turn site context back on to see the pits, plant and connected facilities.</span></div>
      {onShowSiteContext&&<button type="button" onClick={onShowSiteContext}>Show site concept <ArrowRight size={14}/></button>}
    </div>}
    <div className="tanga-site-panel-switcher" role="group" aria-label="Mine plan information">
      {([['site','Site'],['blocks','Pit blocks'],['sources','Sources']] as const).map(([section,label])=><button key={section} type="button" aria-pressed={minePanelSection===section} onClick={()=>{setMinePanelSection(section);if(section==='blocks'&&!['pit-blocks','north-pit','south-pit'].includes(developmentViewId??''))onRevealPitBlocks?.();}}>{label}</button>)}
    </div>
    {minePanelSection==='site'&&<div className="tanga-site-panel-content">
      <div className="tanga-site-status-key" role="group" aria-label="Site feature evidence status">
        <span data-status="report"><i aria-hidden="true"/>Report candidate</span>
        <span data-status="approximate"><i aria-hidden="true"/>Approx. map trace</span>
        <span data-status="illustrative"><i aria-hidden="true"/>Illustrative</span>
      </div>
      <select className="tanga-development-select" aria-label="Mine site view" value={developmentViewId ?? 'overview'} onChange={event=>onInspectDevelopment?.(event.target.value as DevelopmentView)}>{developmentViewId==='pit-blocks'&&<option value="pit-blocks" disabled>Both pit cutaways</option>}{(developmentViewId==='north-pit'||developmentViewId==='south-pit')&&<option value={developmentViewId} disabled>{developmentViewId==='north-pit'?'North pit':'South pit'}</option>}{DEVELOPMENT_FACILITIES.map(view=><option key={view.id} value={view.id} disabled={!developmentAvailable(view.id)}>{view.label}</option>)}</select>
      <div className="tanga-site-orientation" role="group" aria-label="Site camera view">
        <button type="button" aria-pressed={siteOrientation==='plan'} disabled={!onSiteOrientation} onClick={()=>{setSiteOrientation('plan');onSiteOrientation?.('plan');}}>North-up plan</button>
        <button type="button" aria-pressed={siteOrientation==='oblique'} disabled={!onSiteOrientation} onClick={()=>{setSiteOrientation('oblique');onSiteOrientation?.('oblique');}}>Oblique view</button>
      </div>
      {developmentViewId!=='plant'&&<div className="tanga-site-panel-actions">
        <button type="button" className="tanga-story-panel__link" disabled={!onInspectPlant} onClick={onInspectPlant}>Processing plant <ArrowRight size={14}/></button>
        {onToggleSurfaceConcept&&<button type="button" className="tanga-story-panel__compare" aria-pressed={surfaceConceptView} onClick={onToggleSurfaceConcept}>{surfaceConceptView?'Close terrain comparison':'Compare terrain'} <ArrowRight size={14}/></button>}
      </div>}
      {developmentViewId==='plant'&&<section className="tanga-site-plant-controls" aria-label="Processing plant roof cutaway">
        <div className="tanga-site-panel-subtitle">PLANT WALKTHROUGH · CONCEPT ONLY</div>
        <label htmlFor="tanga-mine-plant-focus">Process area</label>
        <select id="tanga-mine-plant-focus" aria-label="Processing plant area" value={plantProcessFocus} onChange={event=>{const focus=event.target.value;setPlantProcessFocus(focus);onPlantProcessFocus?.(focus,plantRoofOpen);}}>
          {MINE_PLANT_FOCUSES.map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select>
        <button type="button" className="tanga-site-plant-controls__roof" aria-pressed={plantRoofOpen} disabled={!onPlantProcessFocus} onClick={()=>{const open=!plantRoofOpen;setPlantRoofOpen(open);onPlantProcessFocus?.(plantProcessFocus,open);}}>
          {plantRoofOpen?(plantProcessFocus==='all'?'Close plant roofs':'Close selected roof'):(plantProcessFocus==='all'?'Open plant roofs':'Open selected roof')}
        </button>
        <small>Concept equipment; not engineered.</small>
      </section>}
    </div>}
    {minePanelSection==='blocks'&&<div className="tanga-site-panel-content">
      <div className="tanga-site-panel-subtitle">SOURCE BLOCK MODEL · OPEN PIT</div>
      {pitBlocksStatus!=='ready'&&<small className="tanga-pit-grade-state tanga-pit-block-status" data-state={pitBlocksStatus} role="status">{pitBlocksStatus==='loading'?'Source cells are loading. You can still explore the pit cutaway.':'Source block data failed to load. Choose Inspect to retry.'}</small>}
      <button type="button" className="tanga-story-panel__compare tanga-story-panel__pit-block-reveal" aria-label={pitBlocksStatus==='error'?'Retry source block model and frame both conceptual pits':'Frame source blocks in both conceptual pits'} aria-pressed={pitBlockFocusIndex===null} disabled={!onRevealPitBlocks} onClick={()=>onRevealPitBlocks?.()}>{pitBlocksStatus==='error'?'Retry blocks & frame pits':'Frame both pit cutaways'} <ArrowRight size={14}/></button>
      <div className="tanga-pit-focus-actions" role="group" aria-label="Focus source blocks inside pit shells">
        <button type="button" aria-pressed={pitBlockFocusIndex===0} disabled={!onRevealPitBlocks} onClick={()=>onRevealPitBlocks?.(0)}>North pit · inspect blocks</button>
        <button type="button" aria-pressed={pitBlockFocusIndex===1} disabled={!onRevealPitBlocks} onClick={()=>onRevealPitBlocks?.(1)}>South pit · inspect blocks</button>
      </div>
      <div className="tanga-compact-grade-key tanga-pit-grade-key" aria-label="Filter resource blocks by TGC grade band"><span>RESOURCE BLOCKS · TGC</span><div role="group" aria-label="Show resource blocks by grade band">{PIT_RESOURCE_GRADE_BANDS.map(bin=><button key={bin.key} type="button" className="tanga-pit-grade-filter" aria-pressed={pitGradeFocus===bin.key} disabled={!onPitGradeFocusChange} onClick={()=>onPitGradeFocusChange?.(pitGradeFocus===bin.key?null:bin.key)}><i style={{background:bin.color}}/>{bin.displayRange}</button>)}</div><small className="tanga-pit-grade-state" role="status">{pitGradeFocus ? `Showing ${PIT_RESOURCE_GRADE_BANDS.find(bin=>bin.key===pitGradeFocus)?.displayRange ?? 'selected'} TGC blocks` : 'All displayed grade bands'}</small></div>
      <p className="tanga-story-panel__qualification">Showing source cells at ≥4.5% TGC within the conceptual cutaways. Bands match the resource model; they are not economic cutoffs or reserves.</p>
    </div>}
    {minePanelSection==='sources'&&<div className="tanga-site-panel-content">
      <div className="tanga-site-panel-subtitle">REPORT BASIS &amp; LIMITS</div>
      <details className="tanga-development-source"><summary>Report location &amp; alternatives</summary><p>Option 2 is the report’s planning assumption: 2.15 km and 24° reported inclination. The map trace is approximately 2.45 km, so its alignment and the 2.15 km table estimate need reconciliation. Options 1 and 3 are alternatives, not additional operating conveyors.</p><img loading="lazy" src="/presentation-assets/paulsam-conveyor-sites.jpg" alt="PaulSam Figure 3.3 showing three candidate feed stations and conveyor alignments on a labelled UTM 37S grid"/><p>Figure 3.3 · PDF p.33 · June 2023. Locations traced approximately from the grid. The proposed feed apron is offset nearby to clear the current conceptual pit envelope. No surveyed plant parcel or engineered alignment is supplied.</p></details>
      <details className="tanga-development-source"><summary>Concept scope &amp; limits</summary><p>Plant candidate: report-based, outside the provisional mine boundary. At the uphill feed-in point, PaulSam Table 5.9 gives a 30 × 50 m (1,500 m²) built-up allowance; Table 5.1 lists 1,200 m² for the operatives shed and amenities. The model follows Table 5.9, while the exterior and approximate map placement remain illustrative. Added waste and water placements are illustrative and exceed the plant allowance. Capacity, drainage, ground conditions and land approval remain unverified. The roadside swales are visual cues only; no alignment, flow direction or hydraulic design is sourced. Lowland additions use regional terrain context. The pad and cut/fill transition are illustrative; terrain, slopes and earthworks require survey and engineering. Compare terrain restores the ungraded source surface.</p></details>
      <details className="tanga-site-facility-register">
        <summary>Full site names &amp; location status</summary>
        <ul>
          <li><strong>Feed-in point &amp; operatives shed</strong><span>Report allowance; approximate Figure 3.3 map registration; illustrative exterior</span></li>
          <li><strong>Processing candidate · Option 2</strong><span>Report planning assumption; approximate map registration</span></li>
          <li><strong>Tailings impoundment</strong><span>Illustrative placement; regional terrain context</span></li>
          <li><strong>Settling and reclaim-water pond</strong><span>Illustrative placement; regional terrain context</span></li>
          <li><strong>Raw-water pond</strong><span>Illustrative placement; regional terrain context</span></li>
          <li><strong>Waste-rock landform</strong><span>Illustrative placement; supplied survey terrain</span></li>
        </ul>
        <p>Compact map labels are shortened for readability. Added facilities are conceptual and need siting, environmental and engineering studies; any footprint that fails terrain or conflict screening is withheld from the view.</p>
      </details>
      {surfaceConceptView&&onSurfaceCompareSplit&&<label className="tanga-story-compare-range" htmlFor="tanga-terrain-comparison-split"><span>Wipe position · {Math.round(surfaceCompareSplit)}% concept</span><input id="tanga-terrain-comparison-split" type="range" min="8" max="92" step="1" value={Math.round(surfaceCompareSplit)} aria-label="Terrain comparison wipe position" aria-valuetext={`${Math.round(surfaceCompareSplit)} percent concept site`} onChange={event=>onSurfaceCompareSplit(Number(event.target.value))}/></label>}
    </div>}
  </aside>;

  if (chapter === 'accessibility') return <aside className="tanga-story-panel tanga-story-panel--logistics" aria-label="Report development and export chain">
    <div className="tanga-story-panel__eyebrow">PAULSAM · JUNE 2023 · LOGISTICS CONCEPT</div><h2>Ore, concentrate, export cargo</h2>
    <p className="tanga-story-panel__intro">Different materials need different links. The report separates hillside ore transport from road delivery of concentrate.</p>
    <ol className="tanga-development-chain">{[['Mine to feed point','Local ore haulage · route requires survey'],['Feed point to lowlands','Candidate conveyor · planning option 2'],['Processing to stuffing yard','Concentrate haulage · road upgrades assessed'],['Stuffing and storage','Mabokweni / Kwa Songoro alternatives'],['Port of exit','Tanga preferred in the 2023 study']].map(([title,detail],i)=><li key={title}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{title}</strong><small>{detail}</small></div></li>)}</ol>
    <p className="tanga-story-panel__qualification">Study §§3.3, 5.3 and 6. A stuffing yard plot is not georeferenced in the supplied report. Map infrastructure and the displayed route do not establish a project connection or current capacity.</p>
  </aside>;

  if (chapter === 'comparison') return <aside className="tanga-story-panel tanga-story-panel--decisions" aria-label="Evidence-led next decisions">
    <div className="tanga-story-panel__eyebrow">CLOSE · WHAT COMES NEXT</div>
    <h2>Turn evidence into the next decisions</h2>
    <p className="tanga-story-panel__intro">Choose a question to open its supporting chapter or source; this decision view stays open in this tab.</p>
    <ol>{NEXT_DECISIONS.map((decision) => <li key={decision.number}>
      <span>{decision.number}</span>
      <div>
        <strong>{decision.title}</strong>
        <p>{decision.detail}</p>
        <nav className="tanga-decision-links" aria-label={`${decision.title} supporting evidence`}>
          <a href={`/?v=1#${decision.chapter}`} target="_blank" rel="noreferrer">{decision.chapterLabel}<ArrowRight size={13}/></a>
          <details className="tanga-decision-source">
            <summary>{decision.evidenceLabel}</summary>
            <a href={decision.evidenceHref} target="_blank" rel="noreferrer">Open source evidence<ArrowRight size={13}/></a>
          </details>
        </nav>
      </div>
    </li>)}</ol>
  </aside>;

  return null;
}

export function TangaMilestoneStage({milestoneId}: {milestoneId: string}) {
  const milestone = WORK_MILESTONES.find((item) => item.id === milestoneId) ?? WORK_MILESTONES[1];
  const isFigure = milestone.id === 'resource';
  return <section className={`tanga-milestone-stage${isFigure ? ' is-figure' : ''}`} aria-label={`${milestone.title} source evidence`}>
    <img src={milestone.image} alt={milestone.imageAlt} loading="eager" fetchPriority="high"/>
    <div className="tanga-milestone-stage__shade"/>
    <div className="tanga-milestone-stage__caption"><span>{milestone.date} · {milestone.source}</span><h2>{milestone.title}</h2><p>{milestone.detail}</p></div>
    <span className="tanga-milestone-stage__tag">Source evidence</span>
  </section>;
}
