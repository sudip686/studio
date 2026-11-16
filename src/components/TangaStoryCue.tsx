'use client';

import {ArrowRight} from 'lucide-react';
import {TANGA_STORY} from '@/data/tanga-story';
import type {WorkbenchMode} from '@/lib/tanga-voice-command';
import type {WORK_MILESTONES} from '@/data/tanga-evidence';

type StoryMilestone = (typeof WORK_MILESTONES)[number];
export default function TangaStoryCue({mode, nextView, viewLabel, viewDetail, viewIndex, viewCount, complete, closingMilestones}: {mode: WorkbenchMode; nextView: string; viewLabel:string; viewDetail?:string; viewIndex:number; viewCount:number; complete:boolean; closingMilestones?: readonly StoryMilestone[]}) {
  const story = TANGA_STORY[mode];
  return <section key={mode} className="tanga-story-cue" aria-label="Chapter purpose and next view">
    <div><span>VIEW {String(viewIndex+1).padStart(2,'0')} / {String(Math.max(1,viewCount)).padStart(2,'0')} · {story.question}</span><h2>{viewLabel}</h2><p>{viewDetail ?? story.takeaway}</p></div>
    {!complete && <div className="tanga-story-cue__next"><span>UP NEXT</span><strong>{nextView}</strong><ArrowRight size={17} aria-hidden="true"/></div>}
    {complete && closingMilestones && <aside className="tanga-story-cue__bookend" aria-label="Project story bookend and sourced milestones">
      <div className="tanga-story-cue__orbit" aria-hidden="true"><svg viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="27" ry="12"/><ellipse cx="32" cy="32" rx="27" ry="12" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="27" ry="12" transform="rotate(120 32 32)"/><circle cx="32" cy="32" r="4"/><path d="M28 32l4-7 4 7-4 7z"/><path className="is-flake" d="M54 14l3 2-1 4-4 1-2-3z"/><path className="is-dust is-dust-a" d="M7 27l2-1 2 2-1 3-3 0-1-2z"/><path className="is-dust is-dust-b" d="M49 49l2-2 3 1 0 3-2 2-3-1z"/><path className="is-dust is-dust-c" d="M16 8l2-1 2 2-1 3-3 0-1-2z"/></svg><span>TANGA<br/>GRAPHITE</span></div>
      <div className="tanga-story-cue__milestones"><strong>THE EVIDENCE, IN ORBIT</strong><ol>{closingMilestones.map(item=><li key={item.id}><time>{item.date}</time><span>{item.title}</span></li>)}</ol><small>Port arc is illustrative; orbital ring is not a licence boundary.</small></div>
    </aside>}
  </section>;
}
