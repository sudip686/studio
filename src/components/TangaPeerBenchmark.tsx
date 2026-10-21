'use client';

import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import {graphitePeerRows, TANGA_INSERT_PROJECT} from '@/data/graphitePeerProjects';

export default function TangaPeerBenchmark({revealed, onReveal, onReset}: {revealed: boolean; onReveal: () => void; onReset: () => void}) {
  const reduced = useReducedMotion();
  const rows = graphitePeerRows(revealed);
  const rank = graphitePeerRows(true).find(row => row.isTanga)!.displayRank;
  return <section className="tanga-peer-benchmark" aria-label="Global graphite benchmark and Tanga MRE reveal" data-revealed={revealed}>
    <div className="tanga-peer-benchmark__narrative">
      <span className="tanga-peer-benchmark__eyebrow">REPORTED NATURAL GRAPHITE PROJECTS</span>
      <h2>{revealed ? <>Tanga enters<br/>at <em>#{rank}.</em></> : <>First, meet<br/>the global field.</>}</h2>
      <p>{revealed ? 'The Indicated MRE changes Tanga’s position within this published comparison set.' : 'Ten reported projects, ranked on one measure: Measured + Indicated contained graphite.'}</p>
      <div className="tanga-peer-benchmark__mre">
        <span>AMC · TANGA MRE · 19 DEC 2025</span>
        <strong>148 Mt <small>Indicated</small></strong>
        <div>at 4.94% TGC</div>
        <b>{TANGA_INSERT_PROJECT.containedGraphiteMt.toFixed(2)} Mt <small>contained graphite</small></b>
      </div>
      <button type="button" onClick={revealed ? onReset : onReveal}>{revealed ? 'Replay the top 10 → Tanga reveal' : 'Introduce Tanga’s MRE →'}</button>
      <small>Historical global project benchmark, published in 2023, with an updated Epanko entry. Report dates and reporting bases differ. This comparison does not establish a current worldwide deposit ranking.</small>
    </div>
    <div className="tanga-peer-benchmark__chart">
      <header><div><span>{revealed ? 'THE SAME FIELD · WITH TANGA' : 'THE REPORTED TOP 10 · BEFORE TANGA'}</span><h3>M&I contained graphite</h3></div><span>Million tonnes</span></header>
      <ol aria-label="Projects ranked by reported Measured and Indicated contained graphite">
        <AnimatePresence initial={false}>
          {rows.map(row => <motion.li key={row.project} layout="position" initial={{opacity: 0, y: row.isTanga ? 170 : 0}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} transition={{duration: reduced ? 0 : .8, layout: {duration: reduced ? 0 : 1, ease: [.22,1,.36,1]}}} className={row.isTanga ? 'is-tanga' : ''} data-project={row.project} data-rank={row.displayRank}>
            <span className="tanga-peer-benchmark__rank">{String(row.displayRank).padStart(2, '0')}</span>
            <div className="tanga-peer-benchmark__project"><strong>{row.project}</strong><small>{row.country}{row.isTanga ? ' · INDICATED MRE' : ''}</small></div>
            <div className="tanga-peer-benchmark__bar" aria-hidden="true"><motion.i initial={false} animate={{width: `${row.containedGraphiteMt / 41.7 * 100}%`}} transition={{duration: reduced ? 0 : .8}}/></div>
            <b>{row.containedGraphiteMt.toFixed(row.isTanga ? 2 : 1)}</b>
          </motion.li>)}
        </AnimatePresence>
      </ol>
      <footer>Ranking is calculated from the displayed M&I contained-graphite values. Tanga’s total MRE and Inferred material are excluded from its comparison value. <a href="https://www.costmine.com/2023/11/07/ranked-worlds-top-10-graphite-projects/" target="_blank" rel="noreferrer">Published benchmark ↗</a></footer>
    </div>
  </section>;
}
