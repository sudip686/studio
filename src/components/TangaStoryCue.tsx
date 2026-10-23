'use client';

import {ArrowRight} from 'lucide-react';
import {TANGA_STORY} from '@/data/tanga-story';
import type {WorkbenchMode} from '@/lib/tanga-voice-command';

export default function TangaStoryCue({mode, nextView, viewLabel, viewDetail, viewIndex, viewCount, complete}: {mode: WorkbenchMode; nextView: string; viewLabel:string; viewDetail?:string; viewIndex:number; viewCount:number; complete:boolean}) {
  const story = TANGA_STORY[mode];
  return <section key={mode} className="tanga-story-cue" aria-label="Chapter purpose and next view">
    <div><span>VIEW {String(viewIndex+1).padStart(2,'0')} / {String(Math.max(1,viewCount)).padStart(2,'0')} · {story.question}</span><h2>{viewLabel}</h2><p>{viewDetail ?? story.takeaway}</p></div>
    {!complete && <div className="tanga-story-cue__next"><span>UP NEXT</span><strong>{nextView}</strong><ArrowRight size={17} aria-hidden="true"/></div>}
  </section>;
}
