'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDataCache, type DrillholeSegment } from '@/lib/data-cache';
import { OverlaySlot } from '@/ui/overlays';

type SlideKey =
  | 'drillholes'
  | 'drillholes_lithology'
  | 'drillholes_assay'
  | 'lithology'
  | 'assay'
  | 'carbon_model'
  | 'classification'
  | 'metallurgy'
  | 'product_quality';

type HighlightMetric = {
  label: string;
  value: string;
  tone?: 'warm' | 'cool' | 'mint';
};

type HighlightRow = {
  metric: string;
  value: string;
  note?: string;
};

type HighlightSpec = {
  eyebrow: string;
  title: string;
  summary: string;
  source: string;
  metrics: HighlightMetric[];
  rows: HighlightRow[];
};

const toneClasses: Record<NonNullable<HighlightMetric['tone']>, string> = {
  warm: 'from-amber-200/20 via-orange-300/12 to-amber-500/6 text-amber-100',
  cool: 'from-sky-200/20 via-cyan-300/12 to-blue-500/6 text-sky-100',
  mint: 'from-emerald-200/20 via-teal-300/12 to-emerald-500/6 text-emerald-100',
};

const STATIC_MRE = {
  totalResource: '183 Mt @ 4.86% TGC',
  indicated: '148 Mt @ 4.94% TGC',
  inferred: '35 Mt @ 4.52% TGC',
  indicatedSplit: '22 / 58 / 69 Mt',
  inferredSplit: '5 / 15 / 16 Mt',
};

function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString('en-US', { maximumFractionDigits });
}

function formatFixed(value: number, fractionDigits = 2) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatMeters(value: number, fractionDigits = 1) {
  return `${formatFixed(value, fractionDigits)} m`;
}

function formatPercentValue(value: number, fractionDigits = 2) {
  return `${formatFixed(value, fractionDigits)}% TGC`;
}

function titleCase(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summarizeHoleDepths(segments: DrillholeSegment[]) {
  const maxDepthByHole = new Map<string, number>();

  for (const segment of segments) {
    const current = maxDepthByHole.get(segment.hole_id) ?? 0;
    maxDepthByHole.set(segment.hole_id, Math.max(current, Number(segment.depth_to ?? 0)));
  }

  const depths = Array.from(maxDepthByHole.values()).filter((value) => Number.isFinite(value));
  const totalMetres = depths.reduce((sum, value) => sum + value, 0);
  const longestHole = depths.length > 0 ? Math.max(...depths) : 0;
  const averageHoleDepth = depths.length > 0 ? totalMetres / depths.length : 0;

  return {
    holeCount: maxDepthByHole.size,
    totalMetres,
    averageHoleDepth,
    longestHole,
  };
}

function summarizeAssay(segments: DrillholeSegment[]) {
  const values = segments
    .map((segment) => Number(segment.graphitic_carbon))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  const min = values.length > 0 ? values[0] : 0;
  const max = values.length > 0 ? values[values.length - 1] : 0;
  const mean = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const midpoint = Math.floor(values.length / 2);
  const median =
    values.length === 0
      ? 0
      : values.length % 2 === 0
        ? (values[midpoint - 1] + values[midpoint]) / 2
        : values[midpoint];

  return {
    intervalCount: segments.length,
    min,
    max,
    mean,
    median,
  };
}

function summarizeLithology(segments: DrillholeSegment[]) {
  const counts = new Map<string, number>();

  for (const segment of segments) {
    const key = String(segment.lithology ?? 'Unknown')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const dominantEntry = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];

  return {
    intervalCount: segments.length,
    uniqueLithologies: counts.size,
    dominantLithology: dominantEntry ? titleCase(dominantEntry[0]) : 'Unknown',
    dominantCount: dominantEntry?.[1] ?? 0,
  };
}

function buildSpecs(args: {
  combinedDepths: ReturnType<typeof summarizeHoleDepths>;
  lithologyDepths: ReturnType<typeof summarizeHoleDepths>;
  assayDepths: ReturnType<typeof summarizeHoleDepths>;
  assaySummary: ReturnType<typeof summarizeAssay>;
  lithologySummary: ReturnType<typeof summarizeLithology>;
  blockModelCount: number;
}) {
  const {
    combinedDepths,
    lithologyDepths,
    assayDepths,
    assaySummary,
    lithologySummary,
    blockModelCount,
  } = args;

  const dynamicSource = 'Computed from the local lithology, assay, and block-model presentation datasets loaded in the deck.';

  return {
    drillholes: {
      eyebrow: 'Coverage confidence',
      title: 'Drillhole coverage summary',
      summary:
        'This scene should explain why the dataset is investable: broad collar coverage, meaningful total drilling, and enough interval density to support interpretation and estimation.',
      source: dynamicSource,
      metrics: [
        { label: 'Drillholes', value: formatNumber(combinedDepths.holeCount), tone: 'cool' },
        { label: 'Drilled metres', value: formatMeters(combinedDepths.totalMetres), tone: 'mint' },
        { label: 'Assay intervals', value: formatNumber(assaySummary.intervalCount), tone: 'warm' },
      ],
      rows: [
        { metric: 'Lithology intervals', value: formatNumber(lithologySummary.intervalCount), note: 'Logged geological intervals available for host-unit interpretation.' },
        { metric: 'Average hole depth', value: formatMeters(combinedDepths.averageHoleDepth), note: 'Average depth derived from the deepest logged interval per hole.' },
        { metric: 'Longest hole', value: formatMeters(combinedDepths.longestHole), note: 'Maximum logged drillhole depth in the current presentation dataset.' },
        { metric: 'Assay range', value: `${formatFixed(assaySummary.min, 3)} to ${formatFixed(assaySummary.max, 3)}% TGC`, note: 'Observed graphitic carbon range across assay intervals.' },
      ],
    },
    drillholes_lithology: {
      eyebrow: 'Host rock control',
      title: 'Lithology drillhole table',
      summary:
        'The lithology drillhole slide should explain the logged geological framework with numeric evidence, not just colors on traces.',
      source: dynamicSource,
      metrics: [
        { label: 'Logged holes', value: formatNumber(lithologyDepths.holeCount), tone: 'cool' },
        { label: 'Lithology intervals', value: formatNumber(lithologySummary.intervalCount), tone: 'mint' },
        { label: 'Lithology domains', value: formatNumber(lithologySummary.uniqueLithologies), tone: 'warm' },
      ],
      rows: [
        { metric: 'Primary host', value: lithologySummary.dominantLithology, note: 'Most frequently logged lithology in the presentation dataset.' },
        { metric: 'Host interval count', value: formatNumber(lithologySummary.dominantCount), note: 'Number of intervals assigned to the dominant host unit.' },
        { metric: 'Average hole depth', value: formatMeters(lithologyDepths.averageHoleDepth), note: 'Average depth from the lithology interval set.' },
        { metric: 'Longest logged hole', value: formatMeters(lithologyDepths.longestHole), note: 'Deepest hole represented in the lithology presentation data.' },
      ],
    },
    drillholes_assay: {
      eyebrow: 'Grade validation',
      title: 'Assay drillhole table',
      summary:
        'This panel should justify the assay view with the headline distribution statistics that investors expect to see beside the 3D traces.',
      source: dynamicSource,
      metrics: [
        { label: 'Assay holes', value: formatNumber(assayDepths.holeCount), tone: 'cool' },
        { label: 'Max TGC', value: formatPercentValue(assaySummary.max, 2), tone: 'warm' },
        { label: 'Average TGC', value: formatPercentValue(assaySummary.mean, 2), tone: 'mint' },
      ],
      rows: [
        { metric: 'Interval count', value: formatNumber(assaySummary.intervalCount), note: 'Assay intervals visible in the presentation dataset.' },
        { metric: 'Minimum TGC', value: formatPercentValue(assaySummary.min, 3), note: 'Lowest graphitic carbon value recorded in the assay intervals.' },
        { metric: 'Median TGC', value: formatPercentValue(assaySummary.median, 2), note: 'Median graphitic carbon value for a central tendency check.' },
        { metric: 'Longest assayed hole', value: formatMeters(assayDepths.longestHole), note: 'Deepest hole represented by the assay interval set.' },
      ],
    },
    lithology: {
      eyebrow: 'Geology framework',
      title: '3D lithology briefing',
      summary:
        'The lithology scene should read like a validated geological framework, with the model supported by drill density, logging coverage, and weathering context.',
      source: dynamicSource,
      metrics: [
        { label: 'Drillholes', value: formatNumber(lithologyDepths.holeCount), tone: 'cool' },
        { label: 'Metres drilled', value: formatMeters(lithologyDepths.totalMetres), tone: 'mint' },
        { label: 'Logged intervals', value: formatNumber(lithologySummary.intervalCount), tone: 'warm' },
      ],
      rows: [
        { metric: 'Primary host', value: lithologySummary.dominantLithology, note: 'Dominant logged lithology across the 3D interpretation dataset.' },
        { metric: 'Interpretation method', value: '24 cross-sections', note: 'Wireframed mineralized envelopes interpreted from section control.' },
        { metric: 'Lithology domains', value: formatNumber(lithologySummary.uniqueLithologies), note: 'Unique lithology categories loaded into the presentation model.' },
        { metric: 'Density basis', value: '1.95 / 2.33 / 2.65 t/m^3', note: 'Average density values by oxide, transition, and fresh weathering domains.' },
      ],
    },
    assay: {
      eyebrow: 'Grade architecture',
      title: 'Assay summary table',
      summary:
        'The assay slide should pair the 3D traces with the reporting-grade statistics that explain continuity, distribution, and estimation readiness.',
      source: dynamicSource,
      metrics: [
        { label: 'Assay records', value: formatNumber(assaySummary.intervalCount), tone: 'cool' },
        { label: 'Assay metres', value: formatMeters(assayDepths.totalMetres), tone: 'mint' },
        { label: 'Average TGC', value: formatPercentValue(assaySummary.mean, 2), tone: 'warm' },
      ],
      rows: [
        { metric: 'Minimum grade', value: formatPercentValue(assaySummary.min, 3), note: 'Lower bound of graphitic carbon values in the assay dataset.' },
        { metric: 'Maximum grade', value: formatPercentValue(assaySummary.max, 2), note: 'Upper bound of graphitic carbon values in the assay dataset.' },
        { metric: 'Median grade', value: formatPercentValue(assaySummary.median, 2), note: 'Median value used to describe central grade tendency.' },
        { metric: 'Reporting cut-off', value: '3% TGC', note: 'Public reporting threshold used in the MRE-driven presentation content.' },
        { metric: 'Estimation method', value: 'Ordinary Kriging', note: 'Grade interpolation approach used for the resource model and supporting slides.' },
      ],
    },
    carbon_model: {
      eyebrow: 'MRE snapshot',
      title: 'Carbon block model',
      summary:
        'This panel should read like the resource model evidence card, tying the block visualization back to interpolation settings and the headline resource statement.',
      source: 'AMC Project 0424046 Draft MRE, Tables 1 and 27 to 30.',
      metrics: [
        { label: 'Total resource', value: STATIC_MRE.totalResource, tone: 'cool' },
        { label: 'Method', value: 'Ordinary Kriging', tone: 'mint' },
        { label: 'Model cells', value: formatNumber(blockModelCount), tone: 'warm' },
      ],
      rows: [
        { metric: 'Resource grade', value: '4.86% TGC', note: 'Headline average grade in the draft MRE summary.' },
        { metric: 'Indicated resource', value: STATIC_MRE.indicated, note: 'Higher-confidence category reported in the draft MRE.' },
        { metric: 'Inferred resource', value: STATIC_MRE.inferred, note: 'Peripheral category reported in the draft MRE.' },
        { metric: 'Density basis', value: '1.95 / 2.33 / 2.65 t/m^3', note: 'Density assignment by oxide, transition, and fresh rock domains.' },
        { metric: 'Reported cut-off', value: '3% TGC', note: '5% remains a visual emphasis threshold, not the public reporting cut-off.' },
      ],
    },
    classification: {
      eyebrow: 'JORC readiness',
      title: 'Classification summary',
      summary:
        'The classification slide should land as an investor-facing confidence statement, with headline tonnage and grade supported by category detail.',
      source: 'AMC Project 0424046 Draft MRE, Tables 1 and 37.',
      metrics: [
        { label: 'Total resource', value: STATIC_MRE.totalResource, tone: 'cool' },
        { label: 'Indicated', value: STATIC_MRE.indicated, tone: 'mint' },
        { label: 'Inferred', value: STATIC_MRE.inferred, tone: 'warm' },
      ],
      rows: [
        { metric: 'Indicated grade', value: '4.94% TGC', note: 'Average grade for the indicated resource category.' },
        { metric: 'Inferred grade', value: '4.52% TGC', note: 'Average grade for the inferred resource category.' },
        { metric: 'Indicated split', value: STATIC_MRE.indicatedSplit, note: 'Oxide / transition / fresh indicated tonnage split.' },
        { metric: 'Inferred split', value: STATIC_MRE.inferredSplit, note: 'Oxide / transition / fresh inferred tonnage split.' },
        { metric: 'JORC edition', value: '2012', note: 'Resource classification aligned to JORC Code reporting.' },
        { metric: 'Cut-off date', value: '01/11/2025', note: 'Draft MRE reporting cut-off date.' },
      ],
    },
    metallurgy: {
      eyebrow: 'Metallurgy de-risking',
      title: 'Flotation testwork summary',
      summary:
        'The metallurgy slide should read like a conversion checkpoint: premium concentrate grades, strong recoveries, and a clear explanation of the one weaker carbonate-rich composite.',
      source: 'IMO Graphite Flotation Report 6798, executive summary, Table 2, and conclusions.',
      metrics: [
        { label: 'Oxide optim.', value: '98.4% TC / 93.0%', tone: 'cool' },
        { label: 'Fresh optim.', value: '98.6% TC / 94.4%', tone: 'mint' },
        { label: 'Recovery band', value: '89.1% to 95.2%', tone: 'warm' },
      ],
      rows: [
        { metric: 'Oxide composites', value: '97.6% to 98.4% TC', note: 'Cleaner 6 concentrate grades across oxide composites TDM006 and TDM007.' },
        { metric: 'Fresh composites', value: '97.18% to 98.64% TC', note: 'Cleaner 6 concentrate grades across fresh composites TDM001 to TDM008.' },
        { metric: 'Low outlier', value: '75.8% recovery', note: 'TDM004 was weaker due to elevated carbonate content around 1.8%.' },
        { metric: 'Product threshold', value: '>97% TC concentrate', note: 'IMO notes this is premium product quality versus a typical saleable minimum flake grade above 94% TC.' },
        { metric: 'Next testwork', value: 'Bulk concentrate and battery testwork', note: 'Recommended follow-on program includes larger-scale concentrate generation, comminution work, and scoping study economics.' },
      ],
    },
    product_quality: {
      eyebrow: 'Product value',
      title: 'Premium graphite product case',
      summary:
        'This slide should turn metallurgy into market relevance: premium purity, strong large-flake distribution, and direct linkage to the headline scale of the Tanga resource.',
      source: 'IMO Graphite Flotation Report 6798 and Sakariya Investor Deck January 2026.',
      metrics: [
        { label: 'Resource base', value: STATIC_MRE.totalResource, tone: 'cool' },
        { label: 'Purity', value: '>97% TC', tone: 'mint' },
        { label: 'Flake value', value: '>60% large & jumbo', tone: 'warm' },
      ],
      rows: [
        { metric: 'Oxide flake content', value: '>57% at +150 um', note: 'Oxide composites delivered premium-price flake distribution in the flotation report.' },
        { metric: 'Fresh flake content', value: '>61% at +150 um', note: 'TDM003 to TDM005 delivered strong large-flake distribution.' },
        { metric: 'Best flake result', value: '>73% at +150 um', note: 'Fresh kaolin composite TDM008 delivered the standout premium flake outcome.' },
        { metric: 'Lower flake cases', value: '34.8% and 42.5%', note: 'TDM001 and TDM002 had lower premium-price flake distribution than the other fresh composites.' },
        { metric: 'Commercial framing', value: 'Battery and premium flake markets', note: 'Investor-deck framing positions the product above the purity threshold for higher-value markets including battery anodes.' },
      ],
    },
  } satisfies Record<SlideKey, HighlightSpec>;
}

export default function ThreeJsDataOverlay({ slideId }: { slideId: string }) {
  const { drillholeData, blockModelData } = useDataCache();

  const combinedDepths = useMemo(
    () => summarizeHoleDepths([...(drillholeData?.lithology ?? []), ...(drillholeData?.assay ?? [])]),
    [drillholeData?.assay, drillholeData?.lithology]
  );
  const lithologyDepths = useMemo(
    () => summarizeHoleDepths(drillholeData?.lithology ?? []),
    [drillholeData?.lithology]
  );
  const assayDepths = useMemo(
    () => summarizeHoleDepths(drillholeData?.assay ?? []),
    [drillholeData?.assay]
  );
  const assaySummary = useMemo(
    () => summarizeAssay(drillholeData?.assay ?? []),
    [drillholeData?.assay]
  );
  const lithologySummary = useMemo(
    () => summarizeLithology(drillholeData?.lithology ?? []),
    [drillholeData?.lithology]
  );

  const highlightSpecs = useMemo(
    () =>
      buildSpecs({
        combinedDepths,
        lithologyDepths,
        assayDepths,
        assaySummary,
        lithologySummary,
        blockModelCount: blockModelData?.length ?? 0,
      }),
    [assayDepths, assaySummary, blockModelData?.length, combinedDepths, lithologyDepths, lithologySummary]
  );

  const supportedSlides = new Set<SlideKey>([
    'drillholes',
    'drillholes_lithology',
    'drillholes_assay',
    'lithology',
    'assay',
    'carbon_model',
    'classification',
    'metallurgy',
    'product_quality',
  ]);

  if (!supportedSlides.has(slideId as SlideKey)) return null;

  const spec = highlightSpecs[slideId as SlideKey];

  return (
    <OverlaySlot slot="top-right" wrapperClassName="w-[min(24rem,calc(100vw-3rem))] flex flex-col items-end">
      <motion.aside
        key={slideId}
        initial={{ opacity: 0, y: 20, x: 12 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
        className="pointer-events-none relative w-full overflow-hidden rounded-[28px] border border-white/18 bg-[linear-gradient(180deg,rgba(14,17,24,0.98),rgba(8,10,15,0.95))] p-4 text-white shadow-[0_18px_46px_rgba(0,0,0,0.32)] backdrop-blur-sm"
        data-testid="three-data-panel"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/68">{spec.eyebrow}</p>
              <h3 className="mt-2 text-[1.15rem] font-semibold tracking-[-0.03em] text-white">{spec.title}</h3>
              <p className="mt-2 max-w-[19rem] text-[12px] leading-5 text-white/86">{spec.summary}</p>
            </div>
            <div className="hidden h-12 w-px bg-gradient-to-b from-white/40 via-white/10 to-transparent md:block" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {spec.metrics.map((metric) => (
              <div
                key={metric.label}
                className={`rounded-[20px] border border-white/16 bg-gradient-to-br px-3 py-3 ${
                  toneClasses[metric.tone ?? 'cool']
                }`}
              >
                <p className="text-[9px] uppercase tracking-[0.22em] text-white/70">{metric.label}</p>
                <p
                  className="mt-1.5 text-[0.95rem] font-semibold tracking-[-0.04em] text-white"
                  data-testid={`metric-${metric.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-[20px] border border-white/14 bg-black/34">
            <div className="flex items-center justify-between border-b border-white/12 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/58">Key data</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/48">Source backed</p>
            </div>
            <table className="w-full border-collapse text-left">
              <tbody>
                {spec.rows.map((row) => (
                  <tr key={`${row.metric}-${row.value}`} className="border-t border-white/10 first:border-t-0">
                    <td className="px-3 py-2.5 align-top">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{row.metric}</p>
                      {row.note ? <p className="mt-1 text-[11px] leading-4.5 text-white/72">{row.note}</p> : null}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top">
                      <p className="text-[12px] font-semibold tracking-[-0.02em] text-white/94">{row.value}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-[18px] border border-white/12 bg-white/[0.06] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/58">Source</p>
            <p className="mt-1.5 text-[11px] leading-4.5 text-white/84">{spec.source}</p>
          </div>
        </div>
      </motion.aside>
    </OverlaySlot>
  );
}
