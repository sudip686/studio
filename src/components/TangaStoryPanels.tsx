'use client';

import {useEffect, useState} from 'react';
import {ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, X} from 'lucide-react';
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

export function TangaChapterStoryPanel({chapter, onOpenSurvey, onToggleSurfaceConcept, surfaceConceptView = false, onRevealGeology, geologySectionShown = false, milestoneId = 'survey', onMilestoneChange}: {chapter: TangaChapterId; onOpenSurvey?: () => void; onToggleSurfaceConcept?: () => void; surfaceConceptView?: boolean; onRevealGeology?: () => void; geologySectionShown?: boolean; milestoneId?: string; onMilestoneChange?: (id: string) => void}) {
  const milestoneIndex = Math.max(0, WORK_MILESTONES.findIndex((item) => item.id === milestoneId));
  const milestone = WORK_MILESTONES[milestoneIndex];

  if (chapter === 'ranking') return <aside className="tanga-story-panel tanga-story-panel--timeline" aria-label="Work completed timeline">
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
    <h2>Where the evidence meets the landscape</h2>
    <p className="tanga-story-panel__intro">A graphite project in the Maramba area of Mkinga District, framed by the August 2025 topographical survey.</p>
    <img className="tanga-story-project-image" src="/presentation-assets/survey-site-aerial.jpg" alt="Aerial photographs of the forested Tanga project landscape"/>
    <div className="tanga-story-image-caption"><span>Survey report · site photographs</span><small>Context imagery · not a georeferenced orthophoto</small></div>
  </aside>;

  if (chapter === 'drillholes') return <aside className="tanga-story-panel tanga-story-panel--drill" aria-label="Drilling evidence">
    <div className="tanga-story-panel__eyebrow">OBSERVATION · DRILL CORE</div>
    <h2>From core to interpreted continuity</h2>
    <p className="tanga-story-panel__intro">Core records provide direct observations at discrete intervals. The interpretation between holes carries a different level of certainty.</p>
    <img className="tanga-story-project-image" src="/presentation-assets/verified-core-example.jpg" alt="Photograph of labelled Tanga graphite drill core with a cut line and sampling intervals"/>
    <div className="tanga-story-image-caption"><span>AMC MRE · Figure 3.9</span><small>Report image · not the selected 3D hole</small></div>
    <div className="tanga-story-inline-note">100 diamond drillholes described in AMC MRE §3.2</div>
    <div className="tanga-story-datum-note">Collars retain source elevations. The survey DTM vertical datum is not stated, so collar-to-surface alignment is unverified.</div>
  </aside>;

  if (chapter === 'subsurface') return <aside className="tanga-story-panel tanga-story-panel--geology" aria-label="Petrography sample evidence">
    <div className="tanga-story-panel__eyebrow">SAMPLE TRACE · TGF002</div>
    <h2>One sample, connected across datasets</h2>
    <div className="tanga-sample-crosswalk"><span>Petrography <b>TGF002</b></span><i>↔</i><span>Hole <b>TGDD1009</b></span><i>↔</i><span>Assay <b>TD0058</b></span></div>
    <img className="tanga-story-micrograph" src="/presentation-assets/petrography-tgdd1009-18m.jpg" alt="Photomicrograph for Tanga petrography sample TGF002"/>
    <div className="tanga-story-image-caption"><span>18.25–18.38 m · graphite-bearing schist</span><small>Source scale bar retained</small></div>
    <p className="tanga-story-panel__intro">The 3D contacts are geological interpretations between observations; this image documents the named sample only.</p>
    {onRevealGeology && <button type="button" className="tanga-story-panel__compare" aria-pressed={geologySectionShown} onClick={onRevealGeology}>{geologySectionShown ? 'Restore full interpretation' : 'Reveal interpreted section'} <ArrowRight size={14}/></button>}
  </aside>;

  if (chapter === 'mine_planning') return <aside className="tanga-story-panel tanga-story-panel--concept" aria-label="Concept and terrain comparison">
    <div className="tanga-story-panel__eyebrow">CONCEPT · REGISTERED TO TERRAIN</div>
    <h2>Fit the concept to the ground</h2>
    <p className="tanga-story-panel__intro">Switch between the measured terrain and the supplied conceptual layout from the same camera position. The geometry remains illustrative.</p>
    {onToggleSurfaceConcept && <button type="button" className="tanga-story-panel__compare" aria-pressed={surfaceConceptView} onClick={onToggleSurfaceConcept}>{surfaceConceptView ? 'Show concept over terrain' : 'Compare measured terrain'} <ArrowRight size={14}/></button>}
    <p className="tanga-story-panel__qualification">Concept geometry is not an optimised mine design, reserve, schedule, cost estimate or permitted facility.</p>
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
