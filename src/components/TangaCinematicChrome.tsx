'use client';

import {useEffect, useState, type RefObject} from 'react';
import {lowPowerPresentation} from '@/lib/deck/cinematic-style';

export default function TangaCinematicChrome({root, view, mode}: {
  root: RefObject<HTMLElement | null>;
  view: string;
  mode: string;
}) {
  const [quality, setQuality] = useState<'low' | 'standard'>('low');
  const [lines, setLines] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => setQuality(lowPowerPresentation() ? 'low' : 'standard'), []);
  useEffect(() => {
    const deck = root.current;
    if (!deck) return;
    const geology = ['topography', 'drillholes', 'subsurface', 'resource', 'mine_planning'].includes(mode);
    let hide: number | undefined;
    const number = (value: string) => Number(value).toLocaleString('en-US');
    function read() {
      if (!deck || hide !== undefined) return;
      const canvas = deck.querySelector<HTMLElement>(geology ? `.tanga-three.is-${mode} .tanga-three__canvas` : '.tanga-process-canvas');
      const data = canvas?.dataset;
      const ready = geology || mode === 'metallurgy' ? data?.ready === 'true' : deck.dataset.mapState === 'ready';
      if ((geology && deck.dataset.threeState === 'error') || (!geology && mode !== 'metallurgy' && deck.dataset.mapState === 'error')) {
        setFinished(true);
        return;
      }
      const next: string[] = [];
      if (geology && data?.surveyReady === 'true') next.push('Survey terrain ready');
      if (geology && data?.loadedDrillholes && Number(data.loadedDrillholes) > 0) next.push(`${number(data.loadedDrillholes)} drillholes loaded`);
      if (mode === 'resource' && data?.loadedResourceCells && Number(data.loadedResourceCells) > 0) next.push(`${number(data.loadedResourceCells)} model cells loaded for display`);
      if (mode === 'metallurgy' && ready) next.push('Processing model ready');
      if (!geology && mode !== 'metallurgy' && ready) next.push('Geographic view ready');
      if (ready && !next.length) next.push('3D scene ready');
      setLines(previous => previous.join('|') === next.join('|') ? previous : next);
      if (ready) {
        observer.disconnect();
        hide = window.setTimeout(() => setFinished(true), 2500);
      }
    }
    const observer = new MutationObserver(read);
    observer.observe(deck, {childList: true, subtree: true, attributes: true, attributeFilter: [
      'data-ready', 'data-map-state', 'data-three-state', 'data-survey-ready', 'data-loaded-drillholes', 'data-loaded-resource-cells',
    ]});
    read();
    return () => { observer.disconnect(); window.clearTimeout(hide); };
  }, [mode, root]);

  return <>
    <div className="tanga-cinematic-frame" data-quality={quality} aria-hidden="true">
      <i/><i/><i/><i/>
      {mode !== 'metallurgy' && <span key={view} className="tanga-cinematic-scan"/>}
    </div>
    {!finished && lines.length > 0 && <ul className="tanga-cinematic-boot" aria-label="Scene load status">
      {lines.map((line, index) => <li key={line} style={{animationDelay: `${index * 130}ms`}}>{line}</li>)}
    </ul>}
  </>;
}
