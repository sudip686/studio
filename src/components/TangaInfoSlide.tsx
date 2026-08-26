'use client';

import {useEffect} from 'react';
import {motion, useReducedMotion} from 'framer-motion';

// Interstitial "info slides" that sit BETWEEN the immersive 3D scenes to break
// the terrain+panel repetition and surface real numbers from the AMC "Tanga
// Graphite Mineral Resource Estimate" (19 Dec 2025). Each uses a distinct
// editorial layout (table / chart / value story) so no two consecutive slides
// look alike. Shown via the pending-info gate in TangaDeckWorkbench.

export type InfoSlideId = 'resource-breakdown' | 'flake-purity' | 'battery-value';

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
            <motion.p className="tanga-info__sub" {...rise(0.15)}>Eight flotation composites — share of flake coarser than 150&nbsp;µm.</motion.p>
            <motion.div className="tanga-info__purity" {...rise(0.2)}>
              <span className="big">97–99%</span><span className="cap">TC concentrate purity</span>
            </motion.div>
            <div className="tanga-info__bars">
              {FLAKE.map((b, i) => (
                <motion.div
                  className="tanga-info__bar"
                  key={b.id}
                  initial={reduce ? {opacity: 0} : {opacity: 0, scaleY: 0}}
                  animate={{opacity: 1, scaleY: 1}}
                  transition={{duration: reduce ? 0.2 : 0.45, ease: EASE, delay: reduce ? 0 : 0.28 + i * 0.05}}
                >
                  <span className="v">{b.v}</span>
                  <i className="col" style={{height: `${b.v}%`, ...(b.id === 'T8' ? {background: 'linear-gradient(180deg,#5eead4,rgba(94,234,212,.4))'} : {})}} />
                  <span className="id">{b.id}</span>
                </motion.div>
              ))}
            </div>
            <div className="tanga-info__src">AMC MRE Table II · flake size vs TC grade · best sample TDM008 73%</div>
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
