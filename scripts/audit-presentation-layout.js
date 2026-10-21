// Read-only DOM audit, evaluated inside agent-browser. Screenshot review is still required.
(()=>{
  const selectors=['.tanga-deck__pager','.tanga-deck__chapter-title','.tanga-three__nav-cluster','.tanga-deck__layers','.tanga-deck__notes','.tanga-deck__insight-panel','.tanga-deck__data-panel','.tanga-three__grade-legend','.tanga-three__drill-legend','.tanga-mine-story','.tanga-geology-section','.tanga-met-report','.tanga-met-visual','.tanga-deck__closing','.tanga-process-exhibit','.tanga-cross-section','.tanga-cross-launch','.tanga-evidence-replay'];
  const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0;};
  const panels=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(visible).map(el=>({el,selector,rect:el.getBoundingClientRect().toJSON(),scrollable:el.scrollHeight>el.clientHeight+2})));
  const overlaps=[];
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){
    const a=panels[i],b=panels[j],x=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left),y=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top);
    if(a.el.contains(b.el)||b.el.contains(a.el))continue;
    if(x>2&&y>2)overlaps.push([a.selector,b.selector,Math.round(x*y)]);
  }
  return {mode:location.hash,viewport:[innerWidth,innerHeight],ready:document.querySelector('[data-ready]')?.getAttribute('data-ready'),status:document.querySelector('[data-status]')?.getAttribute('data-status'),overlaps,outside:panels.filter(p=>p.rect.left<0||p.rect.right>innerWidth+1||p.rect.top<0||p.rect.bottom>innerHeight+1).map(p=>p.selector),panels:panels.map(({el,...panel})=>panel)};
})()
