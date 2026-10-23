'use client';

import {useEffect, useState} from 'react';
import {ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {TGC_GRADE_BINS, ASSAY_INTERVAL_BINS} from '@/lib/deck/grade-legend';
import {DEVELOPMENT_FACILITIES,type DevelopmentView} from '@/data/tanga-development';
import {CHAPTER_SOURCES, NEXT_DECISIONS, WORK_MILESTONES, type TangaChapterId} from '@/data/tanga-evidence';

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

export function TangaChapterStoryPanel({chapter, onOpenSurvey, onToggleSurfaceConcept, surfaceConceptView = false, surfaceCompareSplit = 50, onSurfaceCompareSplit, onRevealGeology, geologySectionShown = false, milestoneId = 'survey', onMilestoneChange, onInspectPlant, onInspectDevelopment, onSiteOrientation, developmentViewId, availableDevelopment = []}: {developmentViewId?:string;availableDevelopment?:string[];chapter: TangaChapterId; onOpenSurvey?: () => void; onToggleSurfaceConcept?: () => void; surfaceConceptView?: boolean; surfaceCompareSplit?: number; onSurfaceCompareSplit?: (split:number)=>void; onRevealGeology?: () => void; geologySectionShown?: boolean; milestoneId?: string; onMilestoneChange?: (id: string) => void; onInspectPlant?: () => void; onInspectDevelopment?: (view:DevelopmentView)=>void; onSiteOrientation?: (orientation:'plan'|'oblique')=>void}) {
  const developmentView=DEVELOPMENT_FACILITIES.find(view=>view.id===developmentViewId) ?? (developmentViewId==='north-pit'?{title:'Read the northern excavation',explanation:'Compare the candidate shell with terrain and model footprint. Benches and access path are illustrative, with no engineered road or grade.'}:developmentViewId==='south-pit'?{title:'Read the southern excavation',explanation:'Compare the candidate shell with terrain and model footprint. Excavation limits, access and slopes remain illustrative pending engineering.'}:undefined);
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
    <div className="tanga-terrain-scale"><strong>1×</strong><span>True vertical scale<br/>Relief is not exaggerated</span></div>
    <ol className="tanga-terrain-reading"><li><b>01</b><span>Orient to the full surveyed surface.</span></li><li><b>02</b><span>Advance to the ridge profile for a lower, raking view.</span></li><li><b>03</b><span>Follow the recorded drilling beneath this surface.</span></li></ol>
    <p className="tanga-story-panel__qualification">The displayed mesh is resampled for interaction. Terrain context does not establish drainage design, ground conditions or buildability.</p>
  </aside>;

  if (chapter === 'drillholes') return <aside className="tanga-story-panel tanga-story-panel--drill" aria-label="Drilling evidence">
    <div className="tanga-story-panel__eyebrow">OBSERVATION · DRILL CORE</div>
    <h2>Start with what was sampled</h2>
    <p className="tanga-story-panel__intro">Core records provide direct observations at discrete intervals. The interpretation between holes carries a different level of certainty.</p>
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
    <div className="tanga-story-resource-number"><strong>148<span>Mt</span></strong><small>Indicated mineral resource</small></div>
    <dl className="tanga-story-resource-facts"><div><dt>Reported grade</dt><dd>4.94% TGC</dd></div><div><dt>Contained graphite</dt><dd>≈7.31 Mt</dd></div></dl>
    <div className="tanga-compact-grade-key" aria-label="Displayed block TGC legend"><span>DISPLAYED BLOCK TGC</span><div>{TGC_GRADE_BINS.map(bin=><span key={bin.key}><i style={{background:bin.color}}/>{bin.range}</span>)}</div></div>
    <p className="tanga-story-panel__intro">Rotate the model to see its extent. Use the grade legend to isolate a displayed grade band.</p>
    <p className="tanga-story-panel__qualification">Indicated portion of the supplied AMC MRE. Displayed blocks and filters do not constitute a new resource estimate or an ore reserve.</p>
  </aside>;

  if (chapter === 'mine_planning') return <aside className="tanga-story-panel tanga-story-panel--concept" aria-label="Concept and terrain comparison">
    <div className="tanga-story-panel__eyebrow">CONCEPT · REGISTERED TO TERRAIN</div>
    <h2>{developmentView?.title ?? 'From the ridge to the lowlands'}</h2>
    <p className="tanga-story-panel__intro">{developmentView?.explanation ?? 'Trace the report-based feed candidate to the lowland plant, then inspect illustrative site services.'}</p>
    <span className="tanga-site-concept-tag">Proposed site · illustrative facilities</span>
    <div className="tanga-site-status-key" role="group" aria-label="Site feature evidence status">
      <span><i data-status="report"/>Report candidate</span>
      <span><i data-status="approximate"/>Approx. map trace</span>
      <span><i data-status="illustrative"/>Illustrative</span>
    </div>
    <select className="tanga-development-select" aria-label="Mine site view" value={developmentViewId ?? 'overview'} onChange={event=>onInspectDevelopment?.(event.target.value as DevelopmentView)}>{(developmentViewId==='north-pit'||developmentViewId==='south-pit')&&<option value={developmentViewId} disabled>{developmentViewId==='north-pit'?'North pit':'South pit'}</option>}{DEVELOPMENT_FACILITIES.map(view=><option key={view.id} value={view.id} disabled={!developmentAvailable(view.id)}>{view.label}</option>)}</select>
    <div className="tanga-site-orientation" role="group" aria-label="Site camera view">
      <button type="button" disabled={!onSiteOrientation} onClick={()=>onSiteOrientation?.('plan')}>North-up plan</button>
      <button type="button" disabled={!onSiteOrientation} onClick={()=>onSiteOrientation?.('oblique')}>Oblique view</button>
    </div>

    <details className="tanga-development-source"><summary>Report location &amp; alternatives</summary><p>Option 2 is the report’s planning assumption: 2.15 km and 24° reported inclination. The map trace is approximately 2.45 km, so its alignment and the 2.15 km table estimate need reconciliation. Options 1 and 3 are alternatives, not additional operating conveyors.</p><img src="/presentation-assets/paulsam-conveyor-sites.jpg" alt="PaulSam Figure 3.3 showing three candidate feed stations and conveyor alignments on a labelled UTM 37S grid"/><p>Figure 3.3 · PDF p.33 · June 2023. Locations traced approximately from the grid. The proposed feed apron is offset nearby to clear the current conceptual pit envelope. No surveyed plant parcel or engineered alignment is supplied.</p></details>
    <button type="button" className="tanga-story-panel__link" disabled={!onInspectPlant} onClick={onInspectPlant}>Inspect the processing plant <ArrowRight size={14}/></button>
    {onToggleSurfaceConcept && <button type="button" className="tanga-story-panel__compare" aria-pressed={surfaceConceptView} onClick={onToggleSurfaceConcept}>{surfaceConceptView ? 'Close terrain comparison' : 'Compare original terrain'} <ArrowRight size={14}/></button>}
    {surfaceConceptView && onSurfaceCompareSplit && <label className="tanga-story-compare-range" htmlFor="tanga-terrain-comparison-split"><span>Wipe position · {Math.round(surfaceCompareSplit)}% concept</span><input id="tanga-terrain-comparison-split" type="range" min="8" max="92" step="1" value={Math.round(surfaceCompareSplit)} aria-label="Terrain comparison wipe position" aria-valuetext={`${Math.round(surfaceCompareSplit)} percent concept site`} onChange={event=>onSurfaceCompareSplit(Number(event.target.value))}/></label>}
    <details className="tanga-development-source"><summary>Concept scope &amp; limits</summary><p>Plant candidate: report-based, outside the provisional mine boundary. Added waste and water placements are illustrative and exceed the plant allowance. Capacity, drainage, ground conditions and land approval remain unverified. Lowland additions use regional terrain context. The pad and cut/fill transition are illustrative; terrain, slopes and earthworks require survey and engineering. Compare original terrain restores the ungraded source surface.</p></details>
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
    <p className="tanga-story-panel__intro">A practical sequence for reducing the uncertainties that matter before engineering decisions.</p>
    <ol>{NEXT_DECISIONS.map((decision) => <li key={decision.number}><span>{decision.number}</span><div><strong>{decision.title}</strong><p>{decision.detail}</p></div></li>)}</ol>
    <div className="tanga-story-close">Evidence assembled <ArrowRight size={14}/> questions to resolve <ArrowRight size={14}/> study decisions</div>
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
