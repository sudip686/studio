'use client';

/** Product-stage illustration, deliberately separate from geographical mine geometry. */
export default function MetallurgyVisualStory({paused,onToggle}:{paused:boolean;onToggle:()=>void}) {
  return <section className="tanga-met-visual" data-paused={paused} aria-label="Illustrative graphite processing story">
    <header><div><small>FROM ROCK TO CONCENTRATE</small><h2>The product story</h2></div><button onClick={onToggle} aria-pressed={paused}>{paused?'Play illustration':'Pause illustration'}</button></header>
    <div className="tanga-met-visual__specimen">
      <svg viewBox="120 40 520 270" role="img" aria-label="Stylised graphite flakes, not laboratory imagery or a measured size distribution">
        <defs>
          <linearGradient id="graphite-face" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a6b8c4"/><stop offset=".35" stopColor="#34434e"/><stop offset=".7" stopColor="#111d27"/><stop offset="1" stopColor="#66838d"/></linearGradient>
          <radialGradient id="graphite-halo"><stop stopColor="#b77338" stopOpacity=".22"/><stop offset="1" stopColor="#b77338" stopOpacity="0"/></radialGradient>
        </defs>
        <ellipse cx="390" cy="192" rx="330" ry="145" fill="url(#graphite-halo)"/>
        <g className="tanga-met-visual__flakes">
          {[{x:280,y:190,s:1.2,r:-13},{x:440,y:195,s:1,r:20},{x:370,y:118,s:1.1,r:5},{x:205,y:237,s:.65,r:-28},{x:555,y:230,s:.6,r:12}].map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r}) scale(${p.s})`}>
            <polygon points="-110,6 -44,-61 73,-44 114,5 46,65 -77,51" fill="#101820" stroke="#62717a" strokeWidth="2" transform="translate(0 8)"/>
            <polygon points="-110,6 -44,-61 73,-44 114,5 46,65 -77,51" fill="url(#graphite-face)" stroke="#acbfc5" strokeWidth="1.5"/>
            <path d="M-92 3 L45 50 M-63 -18 L75 29 M-42 -40 L89 9" stroke="#b9cad0" strokeOpacity=".25" fill="none"/>
          </g>)}
        </g>
        <g className="tanga-met-visual__bubbles" fill="none" stroke="#6facb6" strokeOpacity=".6">
          {[0,1,2,3,4,5].map(i=><circle key={i} cx={110+i*102} cy={300-i%2*35} r={3+i%3*2} style={{animationDelay:`${-i*.8}s`}}/>)}
        </g>
      </svg>
      <div className="tanga-met-visual__questions">
        <div><b>TC</b><span><strong>Concentrate composition</strong>How much of the concentrate is carbon?</span></div>
        <div><b>↗</b><span><strong>Recovery</strong>How much feed graphite reaches concentrate?</span></div>
        <div><b>µm</b><span><strong>Flake distribution</strong>How much remains above each sieve size?</span></div>
      </div>
      <div className="tanga-met-visual__caption"><strong>Three measurements. Three different questions.</strong><span>Purity, recovery and flake size are not interchangeable.</span></div>
    </div>
    <div className="tanga-met-visual__process" aria-label="Illustrative processing sequence">
      <i className="tanga-met-visual__traveller" aria-hidden="true"/>
      {[['01','Liberate','Crushing & milling'],['02','Separate','Flotation'],['03','Dewater','Thickening & filtration'],['04','Characterise','Carbon & sieve testing']].map(([n,title,detail])=><div key={n}><b>{n}</b><strong>{title}</strong><span>{detail}</span></div>)}
    </div>
    <footer>Illustration only · no throughput or recovery simulation · flakes are not to scale.<br/>Reported test summaries are shown separately; product qualification remains to be established.</footer>
  </section>;
}
