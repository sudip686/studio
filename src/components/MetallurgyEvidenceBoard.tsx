'use client';

import {MET_SAMPLES} from '@/lib/deck/metallurgy-samples';
import styles from './MetallurgyEvidenceBoard.module.css';

const MEASURES = [
  {key: 'carbon', title: 'Concentrate TC', definition: 'Total carbon in the final cleaner concentrate.', source: 'IMO · Table 2'},
  {key: 'recovery', title: 'Graphite recovery', definition: 'Graphite recovered from the test feed.', source: 'IMO · Table 2'},
  {key: 'flake', title: 'Mass above 150 µm', definition: 'Concentrate mass retained above 150 µm.', source: 'AMC · Table II'},
] as const;
const IMO = '/6798-%20Sakariya%20Tanzanian%20Graphite%20-%20Final%20Report%20-%20Rev0%20(1).pdf';
const AMC = '/0424046%20Tanga%20Graphite%20Mineral%20Resource%20Estimate%20-%2019%20December%202025.pdf';

export default function MetallurgyEvidenceBoard({selected, onSelect, onEquipment}: {
  selected: number; onSelect: (index: number) => void; onEquipment: () => void;
}) {
  const sample = MET_SAMPLES[selected];
  const select = (index: number) => {
    onSelect(index);
    window.dispatchEvent(new Event('tanga:manual-exploration'));
  };
  return <section className={`${styles.board} tanga-metallurgy-board`} aria-label="Metallurgy laboratory results" data-ready="true">
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>LABORATORY EVIDENCE / 08 COMPOSITES</span>
        <h2>One deposit. Eight test responses.</h2>
        <p>High concentrate carbon across the test set. Recovery and flake size vary.</p>
      </div>
      <button className={styles.equipment} type="button" onClick={onEquipment}>Explore the 3D test sequence <span aria-hidden="true">↗</span></button>
    </header>
    <div className={styles.body}>
      <div className={styles.comparison}>
        <div className={styles.tableCaption}><strong>Compare the composites</strong><span>Each bar: 0–100% · separate measures</span></div>
        <table className={styles.table}>
          <caption className={styles.srOnly}>Eight laboratory composites. Select a sample to inspect its result and report basis. Bars use a zero to one hundred percent scale in each column.</caption>
          <thead><tr><th scope="col">Sample</th>{MEASURES.map(m => <th scope="col" key={m.key} data-measure={m.key}>{m.title}<small>{m.source}</small></th>)}</tr></thead>
          <tbody>{MET_SAMPLES.map((s, index) => <tr key={s.id} data-selected={selected === index}>
            <th scope="row"><button type="button" aria-pressed={selected === index} onClick={() => select(index)}>{s.id}<span aria-hidden="true">{s.id === 'TDM004' ? ' †' : s.id === 'TDM008' ? ' *' : ''}</span></button></th>
            {MEASURES.map(m => <td key={m.key} data-measure={m.key}><div className={styles.value}><span className={styles.track} aria-hidden="true"><i style={{width: `${parseFloat(s[m.key])}%`}}/></span><span>{parseFloat(s[m.key]).toFixed(1)}<small>%</small></span></div></td>)}
          </tr>)}</tbody>
        </table>
        <p className={styles.tableNote}>† TDM004: lower recovery, with 1.83% carbonate reported. &nbsp; * TDM008: weathering labels differ between reports.</p>
      </div>
      <aside className={styles.inspector} aria-label="Selected laboratory composite" aria-live="polite">
        <span className={styles.eyebrow}>SELECTED COMPOSITE / {String(selected + 1).padStart(2, '0')}</span>
        <h3>{sample.id}</h3>
        <dl className={styles.metrics}>{MEASURES.map(m => <div key={m.key} data-measure={m.key}><dt>{m.title}<small>{m.definition}</small></dt><dd>{parseFloat(sample[m.key]).toFixed(1)}<span>%</span></dd></div>)}</dl>
        <p className={styles.basis}>{sample.basis}.</p>
        {selected === 3 && <p className={styles.exception}>IMO identifies this carbonate-rich composite as the low-recovery exception. Its concentrate TC remains 97.8%.</p>}
        {selected === 7 && <p className={styles.exception}>IMO: “Fresh / Kaolin”. AMC groups this composite as oxide / kaolinised. The chart retains the sample ID across both sources.</p>}
        <details className={styles.sources}><summary>Reports &amp; measurement basis</summary>
          <p>TC, recovery and coarse mass share have different denominators. They are not additive yields or a complete sieve distribution.</p>
          <a href={IMO} target="_blank" rel="noreferrer">IMO flotation report · Table 2 ↗</a>
          <a href={AMC} target="_blank" rel="noreferrer">AMC MRE · Table II ↗</a>
          <p>April 2025 microscopy is separate characterisation evidence; no verified link to these flotation composites is implied.</p>
        </details>
      </aside>
    </div>
    <footer className={styles.footer}><strong>What this establishes</strong><span>Reported bench-scale response. Operating performance and customer product qualification require further work.</span></footer>
  </section>;
}
