'use client';

import {useEffect} from 'react';
import {motion, useReducedMotion} from 'framer-motion';

// Interstitial "info slides" that sit BETWEEN the immersive 3D scenes to break
// the terrain+panel repetition and surface real numbers from the AMC "Tanga
// Graphite Mineral Resource Estimate" (19 Dec 2025). Each uses a distinct
// editorial layout (table / chart / value story) so no two consecutive slides
// look alike. Shown via the pending-info gate in TangaDeckWorkbench.

export type InfoSlideId = 'cross-section' | 'resource-breakdown' | 'flake-purity' | 'battery-value';

const RESOURCE_ROWS = [
  {domain: 'Oxide', ind: '22', inf: '5', tgc: '5.36', w: 12.6, color: '#d96a2a'},
  {domain: 'Transition', ind: '58', inf: '15', tgc: '4.90', w: 39.3, color: '#c98a5a'},
  {domain: 'Fresh', ind: '69', inf: '16', tgc: '4.66', w: 48.1, color: '#8fb4d6'},
];
const FLAKE = [
  {id: 'T1', v: 35}, {id: 'T2', v: 42}, {id: 'T3', v: 61}, {id: 'T4', v: 61},
  {id: 'T5', v: 65}, {id: 'T6', v: 67}, {id: 'T7', v: 57}, {id: 'T8', v: 73},
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function TangaInfoSlide({id, onContinue}: {id: InfoSlideId; onContinue: () => void}) {
  const reduce = useReducedMotion();

  // Continue on Enter / Space / → (Esc/← handled by the deck's own keydown).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  const rise = (delay: number) =>
    reduce
      ? {initial: {opacity: 0}, animate: {opacity: 1}, transition: {duration: 0.2}}
      : {initial: {opacity: 0, y: 14}, animate: {opacity: 1, y: 0}, transition: {duration: 0.5, ease: EASE, delay}};

  return (
    <motion.section
      className={`tanga-info tanga-info--${id}`}
      role="dialog"
      aria-label="Project data"
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: reduce ? 0.15 : 0.32, ease: EASE}}
      onClick={onContinue}
    >
      <div className="tanga-info__card" onClick={(e) => e.stopPropagation()}>
        {id === 'cross-section' && (
          <>
            <motion.div className="tanga-info__eyebrow" {...rise(0.05)}>The Asset · Deposit geometry</motion.div>
            <motion.h2 className="tanga-info__title" {...rise(0.1)}>A slice through the deposit</motion.h2>
            <motion.p className="tanga-info__sub" {...rise(0.15)}>A cross-section is a thin vertical slice. The graphitic schist band carries the grade — drilled from surface down through oxide, transition and fresh rock.</motion.p>
            <motion.div className="tanga-info__section" {...rise(0.22)}>
              <svg viewBox="0 0 720 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Schematic geological cross-section of the graphitic schist deposit">
                <defs>
                  <linearGradient id="tgcGrade" x1="0" y1="0" x2="1" y2="0.4">
                    <stop offset="0" stopColor="#4fd6c0" /><stop offset="0.5" stopColor="#f0b64a" /><stop offset="1" stopColor="#f4634e" />
                  </linearGradient>
                </defs>
                {/* ground body */}
                <path d="M0,88 80,80 160,92 240,74 320,84 400,70 480,86 560,78 640,90 720,82 L720,300 L0,300 Z" fill="rgba(18,26,34,.85)" stroke="none" />
                {/* weathering boundaries */}
                <path d="M0,112 80,104 160,116 240,98 320,108 400,94 480,110 560,102 640,114 720,106" fill="none" stroke="rgba(148,197,255,.28)" strokeWidth="1" strokeDasharray="4 4" />
                <path d="M0,150 80,142 160,154 240,136 320,146 400,132 480,148 560,140 640,152 720,144" fill="none" stroke="rgba(148,197,255,.2)" strokeWidth="1" strokeDasharray="4 4" />
                {/* dipping graphitic schist band (mineralised) */}
                <path d="M96,150 610,214 610,244 96,180 Z" fill="url(#tgcGrade)" opacity="0.9" />
                <path d="M96,150 610,214" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1" />
                <path d="M96,180 610,244" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
                {/* terrain surface line */}
                <path d="M0,88 80,80 160,92 240,74 320,84 400,70 480,86 560,78 640,90 720,82" fill="none" stroke="rgba(94,234,212,.85)" strokeWidth="1.6" />
                {/* drillholes */}
                {[[200,79],[320,84],[440,79],[540,80]].map(([x,y],i)=>(
                  <g key={i}>
                    <line x1={x} y1={y} x2={x+22} y2={y+150} stroke="rgba(226,240,250,.7)" strokeWidth="1.3" />
                    <circle cx={x} cy={y} r="3.4" fill="#5eead4" stroke="#fff" strokeWidth="1" />
                  </g>
                ))}
                {/* labels */}
                <text x="10" y="104" fill="rgba(183,201,222,.85)" fontSize="9" fontFamily="ui-monospace,monospace">OXIDE</text>
                <text x="10" y="140" fill="rgba(183,201,222,.75)" fontSize="9" fontFamily="ui-monospace,monospace">TRANSITION</text>
                <text x="10" y="186" fill="rgba(183,201,222,.65)" fontSize="9" fontFamily="ui-monospace,monospace">FRESH</text>
                <text x="330" y="205" fill="#fff" fontSize="10.5" fontFamily="ui-monospace,monospace" fontWeight="600">GRAPHITIC SCHIST</text>
                <text x="596" y="262" fill="rgba(94,234,212,.9)" fontSize="9" fontFamily="ui-monospace,monospace" textAnchor="end">≥3% TGC</text>
              </svg>
            </motion.div>
            <div className="tanga-info__src">Schematic after the AMC MRE geological model · graphitic schist · 3% TGC cut-off · ordinary kriging</div>
          </>
        )}

        {id === 'resource-breakdown' && (
          <>
            <motion.div className="tanga-info__eyebrow" {...rise(0.05)}>The Asset · Mineral Resource</motion.div>
            <motion.h2 className="tanga-info__title" {...rise(0.1)}>183 Mt @ 4.86% TGC</motion.h2>
            <motion.p className="tanga-info__sub" {...rise(0.15)}>The full JORC estimate — by classification and weathering domain, not just the headline.</motion.p>
            <motion.div className="tanga-info__stack" {...rise(0.2)}>
              {RESOURCE_ROWS.map((r) => <i key={r.domain} style={{width: `${r.w}%`, background: r.color}} />)}
            </motion.div>
            <motion.table className="tanga-info__table" {...rise(0.26)}>
              <thead><tr><th>Domain</th><th>Indicated (Mt)</th><th>Inferred (Mt)</th><th>TGC %</th></tr></thead>
              <tbody>
                {RESOURCE_ROWS.map((r) => (
                  <tr key={r.domain}><td>{r.domain}</td><td>{r.ind}</td><td>{r.inf}</td><td>{r.tgc}</td></tr>
                ))}
                <tr className="is-total"><td>Total</td><td>148</td><td>35</td><td>4.86</td></tr>
              </tbody>
            </motion.table>
            <div className="tanga-info__src">AMC MRE Table I · ordinary kriging · 3% TGC cut-off · JORC 2012</div>
          </>
        )}

        {id === 'flake-purity' && (
          <>
            <motion.div className="tanga-info__eyebrow" {...rise(0.05)}>The Value · Metallurgy testwork</motion.div>
            <motion.h2 className="tanga-info__title" {...rise(0.1)}>Coarse flake, &gt;97% carbon</motion.h2>
            <motion.p className="tanga-info__sub" {...rise(0.15)}>Conventional flotation lifts pit ore to a high-purity concentrate — and most of that flake stays coarse.</motion.p>

            {/* Recovery flowsheet — feed → flotation → concentrate */}
            <motion.div className="tanga-met__flow" {...rise(0.2)}>
              <div className="tanga-met__node">
                <span>Feed</span><strong>5.70% TGC</strong><small>Optimum pit ore</small>
              </div>
              <i className="tanga-met__arrow" aria-hidden="true" />
              <div className="tanga-met__node">
                <span>Flotation recovery</span><strong>93.0% / 94.4%</strong><small>Oxide / fresh</small>
              </div>
              <i className="tanga-met__arrow" aria-hidden="true" />
              <div className="tanga-met__node is-out">
                <span>Concentrate</span><strong>&gt;97% TC</strong><small>97–99% across composites</small>
              </div>
            </motion.div>

            {/* Flake-size distribution — coarse share per composite */}
            <motion.div className="tanga-met__dist-head" {...rise(0.26)}>
              <span>Flake size · share coarser than 150 µm</span>
              <em>8 variability composites</em>
            </motion.div>
            <div className="tanga-met__bars">
              {FLAKE.map((b, i) => (
                <motion.div
                  className={`tanga-met__bar${b.id === 'T8' ? ' is-best' : ''}${b.id === 'T1' ? ' is-low' : ''}`}
                  key={b.id}
                  initial={reduce ? {opacity: 0} : {opacity: 0, y: 8}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: reduce ? 0.2 : 0.4, ease: EASE, delay: reduce ? 0 : 0.32 + i * 0.05}}
                >
                  <span className="pct">{b.v}%</span>
                  <div className="track" title={`${b.v}% coarse (+150 µm) · ${100 - b.v}% fines`}>
                    <i className="coarse" style={{height: `${b.v}%`}} />
                  </div>
                  <span className="id">{b.id}</span>
                </motion.div>
              ))}
            </div>

            <motion.div className="tanga-met__key" {...rise(0.5)}>
              <span><i className="sw sw--coarse" />+150&nbsp;µm coarse flake</span>
              <span><i className="sw sw--fine" />−150&nbsp;µm fines — still &gt;95% TC, sold as anode feedstock</span>
            </motion.div>

            <motion.div className="tanga-met__stats" {...rise(0.56)}>
              <div><span>Weakest</span><strong>35%</strong></div>
              <div><span>Median</span><strong>61%</strong></div>
              <div className="is-best"><span>Best · TDM008</span><strong>73%</strong></div>
              <div className="is-warn"><span>TDM004 recovery</span><strong>75.8%</strong></div>
            </motion.div>

            <div className="tanga-info__src">AMC MRE Table II · 8 variability composites · recoveries from optimisation testwork · TDM004 is a carbonate-rich recovery outlier</div>
          </>
        )}

        {id === 'battery-value' && (
          <>
            <motion.div className="tanga-info__eyebrow" {...rise(0.05)}>The Value · Product pathway</motion.div>
            <motion.h2 className="tanga-info__title" {...rise(0.1)}>Fines that pay: spherical graphite</motion.h2>
            <motion.p className="tanga-info__sub" {...rise(0.15)}>The &lt;150&nbsp;µm fraction assays &gt;95% TC — the feedstock spec for coated spherical graphite in lithium-ion anodes. The whole product is saleable.</motion.p>
            <div className="tanga-info__flow">
              {[
                {k: 'Concentrate', v: '>97% TC'},
                {k: '<150 µm fraction', v: '>95% TC'},
                {k: 'Anode feedstock', v: 'Spherical graphite', hero: true},
              ].map((c, i) => (
                <motion.div
                  className={`tanga-info__chip${c.hero ? ' is-hero' : ''}`}
                  key={c.k}
                  {...rise(0.22 + i * 0.12)}
                >
                  <div className="k">{c.k}</div><div className="val">{c.v}</div>
                </motion.div>
              ))}
            </div>
            <div className="tanga-info__src">AMC MRE executive summary · JORC Industrial Mineral (Clause 49)</div>
          </>
        )}

        <button type="button" className="tanga-info__continue" onClick={onContinue}>
          Continue <span aria-hidden="true">→</span>
        </button>
      </div>
    </motion.section>
  );
}
