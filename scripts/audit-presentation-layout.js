// Read-only DOM audit, evaluated inside agent-browser. Screenshot review is still required.
(()=>{
  const selectors=['.tanga-deck__topbar','.tanga-deck__command','.tanga-deck__chapter-title','.tanga-deck__explore-toggle','.tanga-deck__coach','.tanga-deck__pager','.tanga-deck__story-cue','.tanga-story-cue','.tanga-deck__layers','.tanga-deck__notes','.tanga-deck__insight-panel','.tanga-deck__data-panel','.tanga-story-panel','.tanga-peer-benchmark__narrative','.tanga-peer-benchmark__chart','.tanga-deck__ranking','.tanga-deck__title','.tanga-deck__closing','.tanga-deck__index','.tanga-deck__narration','.tanga-three__loading','.tanga-three__nav-cluster','.tanga-three-animation-tools','.tanga-surface-control','.tanga-three__grade-legend','.tanga-three__drill-legend','.tanga-mine-story','.tanga-geology-section','.tanga-met-report','.tanga-met-visual','.tanga-process-exhibit','.tanga-cross-section','.tanga-cross-launch','.tanga-evidence-replay','.tanga-deck__sources','.tanga-deck__source-panel','.tanga-deck__coord','.tanga-deck__compass','.tanga-deck__scale','.tanga-deck__legend'];
  const visible=el=>{
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    if(!(r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0))return false;
    // getBoundingClientRect can report stale layout boxes for descendants of
    // a closed <details>; ignore those controls unless they are in its summary.
    for(let ancestor=el.parentElement;ancestor&&ancestor!==document.body;ancestor=ancestor.parentElement){
      if(ancestor.tagName==='DETAILS'&&!ancestor.open&&!ancestor.querySelector(':scope > summary')?.contains(el))return false;
    }
    return true;
  };
  const clippedByAncestor=(el,rect)=>{
    for(let ancestor=el.parentElement;ancestor&&ancestor!==document.body;ancestor=ancestor.parentElement){
      const style=getComputedStyle(ancestor),box=ancestor.getBoundingClientRect();
      const clipsX=['hidden','clip','auto','scroll'].includes(style.overflowX);
      const clipsY=['hidden','clip','auto','scroll'].includes(style.overflowY);
      if(clipsX&&(rect.right<=box.left||rect.left>=box.right))return true;
      if(clipsY&&(rect.bottom<=box.top||rect.top>=box.bottom))return true;
    }
    return false;
  };
  const panels=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(visible).map(el=>({el,selector,rect:el.getBoundingClientRect().toJSON(),scrollable:el.scrollHeight>el.clientHeight+2})));
  const overlaps=[];
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){
    const a=panels[i],b=panels[j],x=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left),y=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top);
    if(a.el.contains(b.el)||b.el.contains(a.el))continue;
    if(x>2&&y>2)overlaps.push([a.selector,b.selector,Math.round(x*y)]);
  }
  const visibleControls=[...document.querySelectorAll('button,input,select,textarea,a[href]')].filter(visible);
  const controlsOutside=visibleControls.flatMap(el=>{const r=el.getBoundingClientRect();return (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1)&&!clippedByAncestor(el,r) ? [{tag:el.tagName,label:el.getAttribute('aria-label')||el.textContent?.trim().replace(/\s+/g,' ').slice(0,64)||el.getAttribute('placeholder'),rect:r.toJSON()}] : [];});
  const mode=document.querySelector('.tanga-deck')?.dataset.mode;
  const mapModes=new Set(['project','tanzania','work_completed','ranking','accessibility','comparison']);
  const deck=document.querySelector('.tanga-deck');
  return {mode,viewport:[innerWidth,innerHeight],pageOverflow:document.documentElement.scrollWidth>innerWidth+1,ready:deck?(mapModes.has(mode)?deck.dataset.mapState:deck.dataset.threeState):undefined,overlaps,outside:panels.filter(p=>(p.rect.left<0||p.rect.right>innerWidth+1||p.rect.top<0||p.rect.bottom>innerHeight+1)&&!clippedByAncestor(p.el,p.rect)).map(p=>p.selector),controlsOutside,panels:panels.map(({el,...panel})=>panel)};
})()
