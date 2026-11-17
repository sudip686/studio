'use client';

import {ArrowRight} from 'lucide-react';
import {useRef, useState} from 'react';
import TangaClosingFlythrough from './TangaClosingFlythrough';
import {TANGA_STORY} from '@/data/tanga-story';
import type {WorkbenchMode} from '@/lib/tanga-voice-command';
import type {WORK_MILESTONES} from '@/data/tanga-evidence';

type StoryMilestone = (typeof WORK_MILESTONES)[number];
export default function TangaStoryCue({mode, nextView, viewLabel, viewDetail, viewIndex, viewCount, complete, closingMilestones}: {mode: WorkbenchMode; nextView: string; viewLabel:string; viewDetail?:string; viewIndex:number; viewCount:number; complete:boolean; closingMilestones?: readonly StoryMilestone[]}) {
  const story = TANGA_STORY[mode];
  const [recapOpen, setRecapOpen] = useState(false);
  const recapLaunch = useRef<HTMLButtonElement>(null);
  return <section key={mode} className="tanga-story-cue" aria-label="Chapter purpose and next view">
    {!complete && <div><span>VIEW {String(viewIndex+1).padStart(2,'0')} / {String(Math.max(1,viewCount)).padStart(2,'0')} · {story.question}</span><h2>{viewLabel}</h2><p>{viewDetail ?? story.takeaway}</p></div>}
    {!complete && <div className="tanga-story-cue__next"><span>UP NEXT</span><strong>{nextView}</strong><ArrowRight size={17} aria-hidden="true"/></div>}
    {complete && closingMilestones && <aside className="tanga-story-cue__bookend" aria-label="Project story bookend and sourced milestones">
      <div className="tanga-story-cue__orbit" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <ellipse cx="32" cy="32" rx="27" ry="19"/>
          <ellipse cx="32" cy="32" rx="29" ry="24" transform="rotate(-24 32 32)"/>
          {closingMilestones.map((item, index) => (
            <polygon key={item.id} className="is-flake" points="28,13 30,10 34,10 36,13 34,16 30,16" transform={`rotate(${90 * index} 32 32)`}/>
          ))}
          <path className="is-dust" d="M7 27l2-1 2 2-1 3-3 0-1-2z"/>
          <path className="is-dust is-dust-b" d="M49 49l2-2 3 1 0 3-2 2-3-1z"/>
        </svg>
        <span>TANGA<br/>GRAPHITE</span>
      </div>
      <div className="tanga-story-cue__milestones">
        <strong>PROJECT WORK COMPLETED</strong>
        <ol>{closingMilestones.map(item => (
          <li key={item.id} title={item.source}><time>{item.date}</time><span>{item.title}</span></li>
        ))}</ol>
        <button ref={recapLaunch} className="tanga-recap-launch" type="button" aria-expanded={recapOpen} onClick={() => setRecapOpen(open => !open)}>Play 15-second recap <ArrowRight size={14} aria-hidden="true"/></button>
      </div>
    </aside>}
    {complete && closingMilestones && recapOpen && <TangaClosingFlythrough onClose={() => { setRecapOpen(false); recapLaunch.current?.focus(); }}/>}
  </section>;
}
