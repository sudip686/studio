'use client';

import {ArrowRight} from 'lucide-react';
import {TANGA_STORY} from '@/data/tanga-story';
import type {WorkbenchMode} from '@/lib/tanga-voice-command';

export default function TangaStoryCue({mode, nextView, onContinue}: {mode: WorkbenchMode; nextView: string; onContinue: () => void}) {
  const story = TANGA_STORY[mode];
  return <section key={mode} className="tanga-story-cue" aria-label="Chapter purpose and next view">
    <div><span>THE PROJECT STORY</span><h2>{story.question}</h2><p>{story.takeaway}</p></div>
    <button type="button" onClick={onContinue}><span>CONTINUE</span><strong>{nextView}</strong><ArrowRight size={17} aria-hidden="true"/></button>
  </section>;
}
