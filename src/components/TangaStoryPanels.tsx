'use client';

import './TangaChapterArt.css';
import {useEffect, useRef, useState} from 'react';
import {ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Factory, Mountain, Ship, X} from 'lucide-react';
import {TGC_GRADE_BINS, ASSAY_INTERVAL_BINS} from '@/lib/deck/grade-legend';
import {DEVELOPMENT_FACILITIES,type DevelopmentView} from '@/data/tanga-development';
import {CHAPTER_SOURCES, NEXT_DECISIONS, WORK_MILESTONES, type TangaChapterId} from '@/data/tanga-evidence';

const PIT_RESOURCE_GRADE_BANDS=TGC_GRADE_BINS
  .filter(bin=>bin.key==='low'||bin.key==='medium'||bin.key==='high'||bin.key==='very-high')
  .map(bin=>({...bin,displayRange:bin.key==='low'?'3–<4.5%':bin.key==='medium'?'4.5–<6%':bin.key==='high'?'6–<8%':'≥8%'}));

const MINE_PLANT_FOCUSES=[
  ['all','Whole plant'],['feed','ROM & crushing'],['milling','Milling & cyclones'],['flotation','Flotation cells'],
  ['thickening','Thickener & water'],['dewatering','Filter press & dryer'],['product','Product handling'],
] as const;

export function TangaEvidenceDrawer({chapter, exploring, onExplore}: {chapter: TangaChapterId; exploring: boolean; onExplore: () => void}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<"evidence" | "sources">("evidence");

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    return () => triggerRef.current?.focus();
  }, [open]);

  return <>
    <button ref={triggerRef} className="tanga-evidence-trigger" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <BookOpen size={15} aria-hidden="true"/> Evidence
    </button>
    {open && <div className="tanga-evidence-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="tanga-evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="tanga-evidence-title" onKeyDown={event=>{
        event.stopPropagation();
        if(event.key==='Escape')setOpen(false);
        if(event.key!=='Tab')return;
        const items=event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]');
        const first=items[0],last=items[items.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }}>
        <header>
          <div><span>{chapter.replace('_', ' ').toUpperCase()} · EVIDENCE</span><h2 id="tanga-evidence-title">Chapter evidence</h2></div>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close evidence"><X size={19}/></button>
        </header>
        <div className="tanga-evidence-tabs" role="group" aria-label="Evidence view">
          <button type="button" aria-pressed={tab === 'evidence'} onClick={() => setTab('evidence')}>Explore</button>
          <button type="button" aria-pressed={tab === 'sources'} onClick={() => setTab('sources')}>Sources &amp; basis</button>
        </div>
        <div className="tanga-evidence-list">
          {tab === 'evidence' ? <button type="button" className="tanga-evidence-explore" onClick={() => { setOpen(false); onExplore(); }}>{exploring ? 'Return to story' : 'Open chapter inspection'} <ArrowRight size={15}/></button> :
          CHAPTER_SOURCES[chapter].map((source) => <article key={`${source.title}-${source.locator}`}>
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

export function TangaChapterStoryPanel({chapter, onOpenSurvey, onTerrainToolsMount, onResourceToolsMount, onShareView, utilitiesVisible, onToggleUtilities, onOpenGeology, onFramePort, onToggleSurfaceConcept, surfaceConceptView = false, surfaceCompareSplit = 50, onSurfaceCompareSplit, onRevealGeology, geologySectionShown = false, milestoneId = 'survey', onMilestoneChange, onInspectPlant, onPlantProcessFocus, onInspectDevelopment, onSiteOrientation, onRevealPitBlocks, pitBlockFocusIndex = null, pitBlocksStatus = 'ready', pitGradeFocus = null, onPitGradeFocusChange, developmentViewId, availableDevelopment = [], siteContextVisible = true, onShowSiteContext, sceneMotionPaused = false, onToggleSceneMotion, portDistanceInfo}: {developmentViewId?:string;availableDevelopment?:string[];chapter: TangaChapterId; onOpenSurvey?: () => void; onResourceToolsMount?: (element: HTMLDivElement | null) => void; onShareView?: () => void; utilitiesVisible?: boolean; onToggleUtilities?: () => void; onTerrainToolsMount?: (element: HTMLDivElement | null) => void; onOpenGeology?:()=>void; onFramePort?:(stage:'ore'|'concentrate'|'cargo')=>void; onToggleSurfaceConcept?: () => void; surfaceConceptView?: boolean; surfaceCompareSplit?: number; onSurfaceCompareSplit?: (split:number)=>void; onRevealGeology?: () => void; geologySectionShown?: boolean; milestoneId?: string; onMilestoneChange?: (id: string) => void; onInspectPlant?: () => void; onPlantProcessFocus?:(stage:string,roofOpen:boolean)=>void; onInspectDevelopment?: (view:DevelopmentView)=>void; onSiteOrientation?: (orientation:'plan'|'oblique')=>void; onRevealPitBlocks?:(pitIndex?:number)=>void; pitBlockFocusIndex?:number|null; pitBlocksStatus?:'loading'|'ready'|'error'; pitGradeFocus?:string|null; onPitGradeFocusChange?:(grade:string|null)=>void; siteContextVisible?:boolean; onShowSiteContext?:()=>void; sceneMotionPaused?:boolean; onToggleSceneMotion?:()=>void; portDistanceInfo?:{projectStated:string;mappedRoute:string;mappedDuration:string;mappedRouteSource:'osrm'|'fallback'}}) {
  const panelRef=useRef<HTMLElement|null>(null);
  const [minePanelSection,setMinePanelSection]=useState<'site'|'blocks'|'plant'|'sources'>(()=>['pit-blocks','north-pit','south-pit'].includes(developmentViewId??'')?'blocks':developmentViewId==='plant'?'plant':'site');
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
    setMinePanelSection(['pit-blocks','north-pit','south-pit'].includes(developmentViewId??'')?'blocks':developmentViewId==='plant'?'plant':'site');
  },[chapter,developmentViewId]);
  const developmentView=DEVELOPMENT_FACILITIES.find(view=>view.id===developmentViewId) ?? (developmentViewId==='north-pit'?{title:'Read the northern pit shell',explanation:'Inspect the report-derived RF1 bench surface with source ore blocks at their registered positions. Ramp engineering is not included in the supplied shell.'}:developmentViewId==='south-pit'?{title:'Read the southern pit shell',explanation:'Inspect the report-derived RF1 bench surface with source ore blocks at their registered positions. Ramp engineering is not included in the supplied shell.'}:developmentViewId==='pit-blocks'?{title:'RF1 shell and ore blocks',explanation:'Compare the two source bench surfaces and the RF1 ore cells contained within them. Grade colours are a viewing aid, not an economic cutoff.'}:undefined);
  const blockInspectorActive=chapter==='mine_planning'&&minePanelSection==='blocks';
  const developmentAvailable=(id:DevelopmentView)=>Boolean(onInspectDevelopment)&&!((id==='tailings'||id==='waste')&&!availableDevelopment.includes(id))&&!(id==='campus'&&!availableDevelopment.length);
  const milestoneIndex = Math.max(0, WORK_MILESTONES.findIndex((item) => item.id === milestoneId));
  const milestone = WORK_MILESTONES[milestoneIndex];

  if (chapter === 'work_completed') return <aside className="tanga-story-panel tanga-story-panel--timeline" aria-label="Work completed timeline">
    <div className="tanga-story-panel__eyebrow">PROJECT PROGRESS · SOURCE-DATED</div>
    <h2>Work completed</h2>
    <p className="tanga-story-panel__intro">Four distinct evidence milestones. Select one to inspect what it adds to the project picture.</p>
    <nav className="tanga-story-timeline" aria-label="Select a project milestone">
      {WORK_MILESTONES.map((item, index) => <button type="button" key={item.id} className={index === milestoneIndex ? 'is-active' : ''} style={{'--milestone-image': `url("${item.image}")`} as React.CSSProperties} onClick={() => onMilestoneChange?.(item.id)} aria-current={index === milestoneIndex ? 'step' : undefined}>
        <span>{item.date}</span><strong>{item.title}</strong>
      </button>)}
    </nav>
    <div key={milestone.id} className="tanga-story-feature">
      <img key={milestone.image} src={milestone.image} alt={milestone.imageAlt} loading="eager" fetchPriority="high"/>
      <div><span>{milestone.source}</span><p>{milestone.detail}</p></div>
    </div>
    {milestone.id === 'survey' && onOpenSurvey && <button type="button" className="tanga-story-panel__link" onClick={onOpenSurvey}>Open the measured terrain chapter <ArrowRight size={14}/></button>}
    <p className="tanga-story-panel__qualification">The DTM is spatially registered. Report photographs and figures are shown as source context, not mapped locations.</p>
    <div className="tanga-story-panel__stepper"><button type="button" aria-label="Previous milestone" onClick={() => onMilestoneChange?.(WORK_MILESTONES[(milestoneIndex + WORK_MILESTONES.length - 1) % WORK_MILESTONES.length].id)}><ChevronLeft size={16}/></button><span>{String(milestoneIndex + 1).padStart(2, '0')} / {String(WORK_MILESTONES.length).padStart(2, '0')}</span><button type="button" aria-label="Next milestone" onClick={() => onMilestoneChange?.(WORK_MILESTONES[(milestoneIndex + 1) % WORK_MILESTONES.length].id)}><ChevronRight size={16}/></button></div>
  </aside>;

  if (chapter === 'project') return <aside className="tanga-story-panel tanga-story-panel--project" aria-label="Tanga project introduction">
    <div className="tanga-story-panel__eyebrow">TANGA REGION · TANZANIA</div>
    <h2>Tanga Graphite</h2>
    <p className="tanga-story-panel__intro">A graphite project in the Maramba area of Mkinga District, framed by the August 2025 topographical survey.</p>
    <img className="tanga-story-project-image" src="/presentation-assets/tanga-survey-figure-3-aerial.jpg" alt="Survey aerial photograph looking across Tanga hills toward more open lowlands"/>
    <div className="tanga-story-image-caption"><span>Survey report · Figure 3 · lower aerial</span><small>Context photograph; map outline shows the provisional project boundary.</small></div>
  </aside>;

  if (chapter === 'topography') return <aside className="tanga-story-panel tanga-story-panel--terrain" aria-label="Surveyed terrain basis">
    <div className="tanga-story-panel__eyebrow">SURVEY SURFACE · AUGUST 2025</div>
    <h2>Ridges and valleys</h2>
    <p className="tanga-story-panel__intro">The measured surface anchors the drill collars and proposed site.</p>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    <div className="tanga-terrain-scale"><strong>1×</strong><span>3D terrain · true vertical scale</span></div>
    <div className="tanga-terrain-tools-slot" ref={onTerrainToolsMount}/>
    <p className="tanga-story-panel__qualification">The interactive mesh is resampled. Drainage and buildability require engineering studies.</p>
  </aside>;

  if (chapter === 'drillholes') return <aside className="tanga-story-panel tanga-story-panel--drill" aria-label="Drilling evidence">
    <div className="tanga-story-panel__eyebrow">OBSERVATION · DRILL CORE</div>
    <h2>Inside the drill core</h2>
    <p className="tanga-story-panel__intro">Intervals show recorded TGC grades. Use Below ground to inspect trace placement.</p>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    <div className="tanga-compact-grade-key" aria-label="Recorded interval TGC legend"><span>RECORDED INTERVAL TGC</span><div>{ASSAY_INTERVAL_BINS.map(bin=><span key={bin.key}><i style={{background:bin.color}}/>{bin.label}</span>)}</div></div>
    <div className="tanga-story-inline-note">100 diamond drillholes described in AMC MRE §3.2</div>
    <p className="tanga-story-datum-note">Collars sit on the displayed terrain. Traces use recorded elevations; the vertical datum still needs verification.</p>
    <details className="tanga-drill-source">
      <summary>View core photograph</summary>
      <figure>
        <img className="tanga-story-project-image" loading="lazy" src="/presentation-assets/verified-core-example.jpg" alt="Labelled Tanga graphite drill core with a cut line and sample intervals"/>
        <figcaption>AMC MRE, Figure 3.9. Report example independent of the selected hole.</figcaption>
      </figure>
    </details>
    <button type="button" className="tanga-story-panel__link" onClick={onOpenGeology}>
      Inspect TGF002 · TGDD1009 · 18.25–18.38 m <ArrowRight size={14}/>
    </button>
  </aside>;

  if (chapter === 'subsurface') return <aside className="tanga-story-panel tanga-story-panel--geology" aria-label="Petrography sample evidence">
    <header className="tanga-geology-story__header">
    <div className="tanga-story-panel__eyebrow">SAMPLE TRACE · TGF002</div>
    <h2>From core to thin section</h2>
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
    <h2>The reported estimate</h2>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    <section className="tanga-story-resource-summary" aria-label="Reported indicated resource figures">
      <div className="tanga-story-resource-number"><strong>148<span>Mt</span></strong><small>Indicated mineral resource</small></div>
      <dl className="tanga-story-resource-facts"><div><dt>Reported grade</dt><dd>4.94% TGC</dd><i className="tanga-grade-fraction" aria-hidden="true"/></div><div><dt>Contained graphite</dt><dd>≈7.31 Mt</dd></div></dl>
    </section>
    <div className="tanga-compact-grade-key" aria-label="Displayed block TGC legend"><span>DISPLAYED BLOCK TGC</span><div>{TGC_GRADE_BINS.map(bin=><span key={bin.key}><i style={{background:bin.color}}/>{bin.range}</span>)}</div></div>
    <p className="tanga-story-panel__intro">Use the grade key and section controls to inspect the displayed model.</p>
    <div className="tanga-resource-tools-slot" ref={onResourceToolsMount}/>
    <p className="tanga-story-panel__qualification">Indicated portion of the supplied AMC MRE. Displayed blocks and filters do not constitute a new resource estimate or an ore reserve.</p>
  </aside>;

  if (chapter === 'mine_planning') return <aside ref={panelRef} className="tanga-story-panel tanga-story-panel--concept" aria-label={blockInspectorActive?'Mine plan information: pit-block controls':'Concept and terrain comparison'}>
    <div className="tanga-story-panel__eyebrow">CONCEPT · REGISTERED TO TERRAIN</div>
    <h2>{blockInspectorActive?'Inside the two pits':developmentView?.title ?? 'From the ridge to the lowlands'}</h2>
    <p className="tanga-story-panel__intro">{blockInspectorActive?'Select a shell to inspect its registered ore cells.':developmentViewId==='plant'?'Explore six process areas. Equipment and roof cutaways are illustrative.':developmentView?.explanation ?? 'Trace the report-based feed candidate to the lowland plant, then inspect illustrative site services.'}</p>
    {onToggleSceneMotion&&<SceneMotionControl paused={sceneMotionPaused} onToggle={onToggleSceneMotion}/>}
    {!siteContextVisible&&<div className="tanga-site-context-hidden" role="status">
      <div><strong>Site concept layers are hidden</strong><span>The terrain remains visible. Turn site context back on to see the pits, plant and connected facilities.</span></div>
      {onShowSiteContext&&<button type="button" onClick={onShowSiteContext}>Show site concept <ArrowRight size={14}/></button>}
    </div>}
    <div className="tanga-site-panel-switcher" role="group" aria-label="Mine planning destinations">
      {([['site','Site'],['blocks','Pit blocks'],['plant','Plant'],['sources','Sources']] as const).map(([section,label])=><button key={section} type="button" aria-pressed={minePanelSection===section} onClick={()=>{setMinePanelSection(section);if(section==='plant')onInspectPlant?.();if(section==='site'&&(blockInspectorActive||developmentViewId==='plant'))onInspectDevelopment?.('overview');if(section==='blocks'&&!['pit-blocks','north-pit','south-pit'].includes(developmentViewId??''))onRevealPitBlocks?.();}}>{label}</button>)}
    </div>
    {(minePanelSection==='site'||minePanelSection==='plant')&&<div className="tanga-site-panel-content">
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
        <button type="button" className="tanga-story-panel__link" disabled={!onInspectPlant} onClick={onInspectPlant}>Fly to processing plant <ArrowRight size={14}/></button>
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
      <div className="tanga-site-panel-subtitle">RF1 SOURCE SHELL · ORE BLOCKS</div>
      {pitBlocksStatus!=='ready'&&<small className="tanga-pit-grade-state tanga-pit-block-status" data-state={pitBlocksStatus} role="status">{pitBlocksStatus==='loading'?'Source cells are loading. You can still explore the pit cutaway.':'Source block data failed to load. Choose Inspect to retry.'}</small>}
      <button type="button" className="tanga-story-panel__compare tanga-story-panel__pit-block-reveal" aria-label={pitBlocksStatus==='error'?'Retry RF1 ore blocks and frame both pit shells':'Frame RF1 ore blocks in both source pit shells'} aria-pressed={pitBlockFocusIndex===null} disabled={!onRevealPitBlocks} onClick={()=>onRevealPitBlocks?.()}>{pitBlocksStatus==='error'?'Retry RF1 blocks & frame pits':'Frame both RF1 pit shells'} <ArrowRight size={14}/></button>
      <div className="tanga-pit-focus-actions" role="group" aria-label="Focus source blocks inside pit shells">
        <button type="button" aria-pressed={pitBlockFocusIndex===0} disabled={!onRevealPitBlocks} onClick={()=>onRevealPitBlocks?.(0)}><img src="/presentation-assets/rf1-north-benches.svg" alt="" width="22" height="64"/><span>North pit<br/><small>Inspect blocks</small></span></button>
        <button type="button" aria-pressed={pitBlockFocusIndex===1} disabled={!onRevealPitBlocks} onClick={()=>onRevealPitBlocks?.(1)}><img src="/presentation-assets/rf1-south-benches.svg" alt="" width="22" height="64"/><span>South pit<br/><small>Inspect blocks</small></span></button>
      </div>
      <div className="tanga-compact-grade-key tanga-pit-grade-key" aria-label="Filter resource blocks by TGC grade band"><span>RESOURCE BLOCKS · TGC</span><div role="group" aria-label="Show resource blocks by grade band">{PIT_RESOURCE_GRADE_BANDS.map(bin=><button key={bin.key} type="button" className="tanga-pit-grade-filter" aria-pressed={pitGradeFocus===bin.key} disabled={!onPitGradeFocusChange} onClick={()=>onPitGradeFocusChange?.(pitGradeFocus===bin.key?null:bin.key)}><i style={{background:bin.color}}/>{bin.displayRange}</button>)}</div><small className="tanga-pit-grade-state" role="status">{pitGradeFocus ? `Showing ${PIT_RESOURCE_GRADE_BANDS.find(bin=>bin.key===pitGradeFocus)?.displayRange ?? 'selected'} TGC blocks` : 'All displayed grade bands'}</small></div>
      <p className="tanga-story-panel__qualification">RF1 source cells ≥3% TGC inside the optimized shells. Grade colours describe displayed cells.</p>
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
    <p className="tanga-story-panel__intro">Ore travels downhill toward a candidate feed point; concentrate moves by road to storage and port.</p>
    {portDistanceInfo&&<section className="tanga-logistics-distances" aria-label="Project-stated and mapped route distances to Tanga Port">
      <div><span>PROJECT-STATED DISTANCE</span><strong>{portDistanceInfo.projectStated}</strong><small>Project to Tanga Port</small></div>
      <div><span>DISPLAYED ROAD GEOMETRY</span><strong>{portDistanceInfo.mappedRoute}</strong><small>{portDistanceInfo.mappedRouteSource==='osrm'?`${portDistanceInfo.mappedDuration} · mapped road network`:'Indicative mapped path · route not verified'}</small></div>
      <p>The report distance and mapped road path use different bases. The mapped route is illustrative, not a verified haulage or travel-time study.</p>
    </section>}
    {onToggleUtilities && <label className="tanga-logistics-utilities"><input type="checkbox" checked={utilitiesVisible} onChange={onToggleUtilities}/> Show power infrastructure</label>}
    <ol className="tanga-material-flow" aria-label="Material journey from mine to port">
      <li><Mountain aria-hidden="true"/><div><small>01 / ORE</small><strong>{onFramePort ? <button type="button" onClick={() => onFramePort('ore')}>Hillside to lowlands</button> : 'Hillside to lowlands'}</strong><p>Local haulage to the feed point, then a candidate conveyor. The alignment requires survey.</p></div></li>
      <li><Factory aria-hidden="true"/><div><small>02 / CONCENTRATE</small><strong>{onFramePort ? <button type="button" onClick={() => onFramePort('concentrate')}>Plant to storage yard</button> : 'Plant to storage yard'}</strong><p>Road haulage after processing. The study considers yards at Mabokweni and Kwa Songoro.</p></div></li>
      <li><Ship aria-hidden="true"/><div><small>03 / EXPORT CARGO</small><strong>{onFramePort ? <button type="button" onClick={() => onFramePort('cargo')}>Storage yard to port</button> : 'Storage yard to port'}</strong><p>Tanga was the preferred port in the 2023 study.</p></div></li>
    </ol>
    <p className="tanga-story-panel__qualification">Study §§3.3, 5.3 and 6. No stuffing-yard plot is georeferenced in the report; mapped links and port capacity are unverified.</p>
  </aside>;

  if (chapter === 'comparison') return <aside className="tanga-story-panel tanga-story-panel--decisions" aria-label="Evidence-led next decisions">
    <h2>What should the next study resolve?</h2>
    <ol>{NEXT_DECISIONS.map((decision) => <li key={decision.number}>
      <div>
        <strong>{decision.title}</strong>
        <p>{decision.detail}</p>
        <nav className="tanga-decision-links" aria-label={`${decision.title} supporting evidence`}>
          <a href={`/?v=1&view=${decision.view}#${decision.chapter}`} target="_blank" rel="noreferrer">
            <img alt="" loading="lazy" src={decision.thumbnail}/>
            {decision.chapterLabel}<ArrowRight size={13} aria-hidden="true"/>
          </a>
          <a href={decision.evidenceHref} target="_blank" rel="noreferrer">{decision.evidenceLabel}<ArrowRight size={13} aria-hidden="true"/></a>
        </nav>
      </div>
    </li>)}</ol>
    <button type="button" className="tanga-story-panel__link" onClick={onShareView}>Copy closing view link <ArrowRight size={14}/></button>
  </aside>;

  return null;
}

export function TangaMilestoneStage({milestoneId, onSelect}: {milestoneId: string; onSelect: (id: string) => void}) {
  const milestone = WORK_MILESTONES.find((item) => item.id === milestoneId) ?? WORK_MILESTONES[1];
  const isFigure = milestone.id === 'resource' || milestone.id === 'survey';
  return <section className={`tanga-milestone-stage${isFigure ? ' is-figure' : ''}`} data-milestone={milestone.id} aria-label={`${milestone.title} source evidence`}>
    <img key={milestone.image} src={milestone.image} alt={milestone.imageAlt} loading="eager" fetchPriority="high"/>
    <div className="tanga-milestone-stage__shade"/>
    <div className="tanga-milestone-stage__caption"><span>{milestone.date} · {milestone.source}</span><h2>{milestone.title}</h2><p>{milestone.detail}</p></div>
    <nav className="tanga-milestone-stage__selector" aria-label="Work completed milestones">{WORK_MILESTONES.map(item =>
      <button key={item.id} type="button" aria-current={item.id === milestone.id ? 'step' : undefined} onClick={() => onSelect(item.id)}>
        <small>{item.date}</small><strong>{item.title}</strong>
      </button>
    )}</nav>
    <a className="tanga-milestone-stage__tag" href={milestone.image} target="_blank" rel="noreferrer">Open full source image ↗</a>
  </section>;
}
