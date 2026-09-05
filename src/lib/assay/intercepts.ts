/**
 * Composite raw assay intervals into reportable drill intercepts.
 *
 * The deck used to describe its own rendering ("every block is shaded by
 * grade") while the numbers that actually sell the project sat unused in
 * `assay_data.geojson`. This module derives those numbers so scene labels can
 * quote them directly, in the same shape a mining deck reports them:
 *
 *   TGDD1029 — 7.97% TGC over 84m from 4m
 *
 * Everything here is pure and immutable: inputs are never mutated, and the
 * same segments always produce the same ranked list.
 */

import type { DrillholeSegment } from '@/lib/data-cache';

/** A contiguous run of assay intervals above the reporting cutoff. */
export interface Intercept {
  holeId: string;
  /** Length-weighted mean grade across the run, in % TGC. */
  gradePct: number;
  lengthM: number;
  fromM: number;
  toM: number;
  /** grade x thickness — the standard way to rank intercepts by significance. */
  gradeThickness: number;
  lon: number;
  lat: number;
  collarElevation: number;
  /** Best higher-grade sub-run inside this intercept, reported as "incl". */
  includes?: {
    gradePct: number;
    lengthM: number;
    fromM: number;
    toM: number;
  };
}

export interface InterceptOptions {
  /** Reporting cutoff in % TGC. Defaults to the project's 3% TGC cutoff. */
  cutoffPct?: number;
  /** Runs shorter than this are dropped as insignificant. */
  minLengthM?: number;
  /**
   * Below-cutoff material this long or shorter is carried through a run as
   * internal dilution rather than ending it — otherwise one weak sample
   * splits an otherwise continuous intercept into two unimpressive halves.
   */
  maxInternalWasteM?: number;
  /** Cutoff for the nested "incl" sub-run. */
  inclCutoffPct?: number;
  /** Sub-runs shorter than this are not worth reporting as "incl". */
  inclMinLengthM?: number;
}

export const DEFAULT_INTERCEPT_OPTIONS: Required<InterceptOptions> = {
  cutoffPct: 3,
  minLengthM: 4,
  maxInternalWasteM: 2,
  inclCutoffPct: 6,
  inclMinLengthM: 4,
};

/**
 * Depth discontinuity tolerated when joining consecutive samples. Assay
 * tables carry small rounding differences between one sample's end and the
 * next one's start; anything larger is a genuine unsampled gap.
 */
const GAP_TOLERANCE_M = 0.01;

/** A segment that passed validation and is safe to composite. */
interface CleanSegment {
  holeId: string;
  fromM: number;
  toM: number;
  lengthM: number;
  gradePct: number;
  lon: number;
  lat: number;
  elevation: number;
}

/**
 * Drop anything we cannot composite honestly. Assay exports routinely carry
 * nulls, sentinel negatives for "not analysed", and zero-length rows; silently
 * averaging those in would misstate a grade on an investor slide.
 */
function toCleanSegment(segment: DrillholeSegment): CleanSegment | null {
  const gradePct = Number(segment.graphitic_carbon);
  const fromM = Number(segment.depth_from);
  const toM = Number(segment.depth_to);
  const holeId = typeof segment.hole_id === 'string' ? segment.hole_id.trim() : '';

  if (!holeId) return null;
  if (!Number.isFinite(gradePct) || gradePct < 0) return null;
  if (!Number.isFinite(fromM) || !Number.isFinite(toM)) return null;

  const lengthM = toM - fromM;
  if (!(lengthM > 0)) return null;

  const lon = Number(segment.lon);
  const lat = Number(segment.lat);
  const elevation = Number(segment.elevation);

  return {
    holeId,
    fromM,
    toM,
    lengthM,
    gradePct,
    lon: Number.isFinite(lon) ? lon : Number.NaN,
    lat: Number.isFinite(lat) ? lat : Number.NaN,
    elevation: Number.isFinite(elevation) ? elevation : 0,
  };
}

/** Length-weighted mean grade. Returns 0 for a zero-length run. */
function weightedGrade(run: readonly CleanSegment[]): number {
  const length = totalLength(run);
  if (length <= 0) return 0;
  return run.reduce((sum, s) => sum + s.gradePct * s.lengthM, 0) / length;
}

function totalLength(run: readonly CleanSegment[]): number {
  return run.reduce((sum, s) => sum + s.lengthM, 0);
}

/**
 * Best contiguous sub-run above `inclCutoffPct`, by grade x thickness. This is
 * the "incl 19.29 gpt / 5.2m" half of an industry intercept quote — the part
 * that shows the run is not uniformly marginal.
 *
 * A sub-run only qualifies if it grades *higher* than the run containing it.
 * "84m at 7.97% including 46m at 7.88%" reads as a mistake, because in mining
 * usage "including" promises the reader a richer core, not a longer average.
 */
function bestSubRun(
  run: readonly CleanSegment[],
  parentGradePct: number,
  opts: Required<InterceptOptions>
): Intercept['includes'] | undefined {
  const parentLength = totalLength(run);

  // Split the run into blocks of above-incl-cutoff material, then score every
  // contiguous window inside each block. Windows of every length are tried, so
  // a short very rich core is found inside a long moderate one.
  const qualifying = allWindows(aboveCutoffBlocks(run, opts.inclCutoffPct))
    .map((candidate) => ({
      candidate,
      length: totalLength(candidate),
      gradePct: weightedGrade(candidate),
    }))
    .filter(
      (window) =>
        window.length >= opts.inclMinLengthM &&
        // A sub-run spanning the whole intercept adds no information.
        window.length < parentLength &&
        window.gradePct > parentGradePct
    );

  if (qualifying.length === 0) return undefined;

  const best = qualifying.reduce((winner, window) =>
    window.gradePct * window.length > winner.gradePct * winner.length ? window : winner
  );

  return {
    gradePct: best.gradePct,
    lengthM: best.length,
    fromM: best.candidate[0].fromM,
    toM: best.candidate[best.candidate.length - 1].toM,
  };
}

/** Contiguous blocks of samples at or above `cutoffPct`. */
function aboveCutoffBlocks(
  run: readonly CleanSegment[],
  cutoffPct: number
): CleanSegment[][] {
  const blocks: CleanSegment[][] = [];
  let current: CleanSegment[] = [];

  for (const segment of run) {
    if (segment.gradePct >= cutoffPct) {
      current = [...current, segment];
    } else if (current.length > 0) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length > 0) blocks.push(current);

  return blocks;
}

/**
 * Every contiguous sub-window of every block. Blocks hold a handful of samples
 * at most, so the quadratic enumeration is cheap.
 */
function allWindows(blocks: readonly CleanSegment[][]): CleanSegment[][] {
  const windows: CleanSegment[][] = [];
  for (const block of blocks) {
    for (let start = 0; start < block.length; start += 1) {
      for (let end = start + 1; end <= block.length; end += 1) {
        windows.push(block.slice(start, end));
      }
    }
  }
  return windows;
}

function buildIntercept(
  run: readonly CleanSegment[],
  opts: Required<InterceptOptions>
): Intercept | null {
  if (run.length === 0) return null;

  const lengthM = totalLength(run);
  if (lengthM < opts.minLengthM) return null;

  const gradePct = weightedGrade(run);
  const first = run[0];
  const last = run[run.length - 1];

  return {
    holeId: first.holeId,
    gradePct,
    lengthM,
    fromM: first.fromM,
    toM: last.toM,
    gradeThickness: gradePct * lengthM,
    lon: first.lon,
    lat: first.lat,
    collarElevation: first.elevation,
    includes: bestSubRun(run, gradePct, opts),
  };
}

/**
 * Composite one hole's ordered segments into intercepts.
 *
 * Trailing internal waste is trimmed so an intercept never ends on
 * below-cutoff material — reporting "84m" that includes 2m of waste at the
 * bottom would overstate the run.
 */
function interceptsForHole(
  segments: readonly CleanSegment[],
  opts: Required<InterceptOptions>
): Intercept[] {
  const ordered = [...segments].sort((a, b) => a.fromM - b.fromM);

  const results: Intercept[] = [];
  let run: CleanSegment[] = [];
  let pendingWaste: CleanSegment[] = [];

  const flush = () => {
    const intercept = buildIntercept(run, opts);
    if (intercept) results.push(intercept);
    run = [];
    pendingWaste = [];
  };

  /** Depth of the last sample we have data for, ore or bridged waste. */
  const lastSampledDepth = (): number | null => {
    const tail = pendingWaste.length > 0 ? pendingWaste : run;
    return tail.length > 0 ? tail[tail.length - 1].toM : null;
  };

  for (const segment of ordered) {
    // A depth gap with no samples at all is not dilution — it is missing data.
    // Bridging it would report an interval length partly never assayed, so the
    // run has to end at the last sample we actually hold.
    const previousDepth = lastSampledDepth();
    if (previousDepth !== null && segment.fromM - previousDepth > GAP_TOLERANCE_M) {
      flush();
    }

    if (segment.gradePct >= opts.cutoffPct) {
      // Absorb any waste we were holding: it is internal dilution now.
      run = run.length === 0 ? [segment] : [...run, ...pendingWaste, segment];
      pendingWaste = [];
      continue;
    }

    if (run.length === 0) continue; // waste before any ore — nothing to carry.

    pendingWaste = [...pendingWaste, segment];
    if (totalLength(pendingWaste) > opts.maxInternalWasteM) {
      flush(); // too much waste to bridge — the run ends before it.
    }
  }

  flush();
  return results;
}

/**
 * Composite raw assay segments into intercepts ranked by grade x thickness
 * (most significant first).
 *
 * Returns `[]` for empty or wholly invalid input rather than throwing —
 * callers render labels from this and must degrade to "no labels" cleanly.
 */
export function computeIntercepts(
  segments: readonly DrillholeSegment[] | null | undefined,
  options: InterceptOptions = {}
): Intercept[] {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const opts: Required<InterceptOptions> = { ...DEFAULT_INTERCEPT_OPTIONS, ...options };

  const byHole = new Map<string, CleanSegment[]>();
  for (const segment of segments) {
    const clean = toCleanSegment(segment);
    if (!clean) continue;
    const existing = byHole.get(clean.holeId);
    byHole.set(clean.holeId, existing ? [...existing, clean] : [clean]);
  }

  const all: Intercept[] = [];
  for (const holeSegments of byHole.values()) {
    all.push(...interceptsForHole(holeSegments, opts));
  }

  // Ties broken by hole id so the ranking — and therefore which labels get
  // drawn — is stable across renders.
  return all.sort(
    (a, b) => b.gradeThickness - a.gradeThickness || a.holeId.localeCompare(b.holeId)
  );
}

/** Keep only the best intercept per hole, preserving rank order. */
export function bestPerHole(intercepts: readonly Intercept[]): Intercept[] {
  const seen = new Set<string>();
  return intercepts.filter((intercept) => {
    if (seen.has(intercept.holeId)) return false;
    seen.add(intercept.holeId);
    return true;
  });
}

const round = (value: number, dp: number) => {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
};

export interface FormatInterceptOptions {
  /**
   * Append the "incl" clause. Off for labels floating over the 3D scene: the
   * clause wraps them to three lines, which both crowds the model and halves
   * how many labels fit. The full quote belongs in the docked panel, where
   * there is room to read it.
   */
  includeSubRun?: boolean;
  /**
   * Include the "from Xm" collar depth. Off for labels floating over the 3D
   * scene, where brevity is what makes the grade readable at a glance.
   */
  includeDepth?: boolean;
}

/**
 * Format an intercept for display, following the convention used across mining
 * decks: the hole id as the headline, the grade quote beneath it.
 */
export function formatIntercept(
  intercept: Intercept,
  options: FormatInterceptOptions = {}
): { headline: string; sub: string } {
  const { includeSubRun = true, includeDepth = true } = options;

  const grade = round(intercept.gradePct, 2).toFixed(2);
  const length = round(intercept.lengthM, 0).toFixed(0);
  const from = round(intercept.fromM, 0).toFixed(0);

  // Grade and width only, joined by a slash — the industry's own shorthand and
  // the form the reference deck uses ("6.15gpt / 8.3m"). The wordy version,
  // "5.57% TGC over 82m from 0m", was twice the characters for the same two
  // facts, and the filler words are what a reader's eye has to wade through
  // before reaching the number. Depth is kept for the panel, where there is
  // room to read a sentence.
  let sub = includeDepth
    ? `${grade}% TGC over ${length}m from ${from}m`
    : `${grade}% TGC / ${length}m`;

  if (includeSubRun && intercept.includes) {
    const inclGrade = round(intercept.includes.gradePct, 2).toFixed(2);
    const inclLength = round(intercept.includes.lengthM, 0).toFixed(0);
    // Its own line rather than appended with a separator: the reference puts
    // "incl" on a new line, which keeps every line a short, scannable figure
    // instead of one long run-on.
    sub += `
incl ${inclGrade}% / ${inclLength}m`;
  }

  return { headline: intercept.holeId, sub };
}

/**
 * Grade-banded accent colour for an intercept label, matching the bands the
 * assay legend already uses so a label's colour and the trace it points at
 * agree. Shared by the 3D scene and the deck chrome.
 */
export function interceptTone(gradePct: number): string {
  if (gradePct >= 8) return '#9d00ff';
  if (gradePct >= 6) return '#ff1616';
  if (gradePct >= 4) return '#ff9f0a';
  return '#fff200';
}

/** Summary stats for a cutoff-disclosure label, disclosing the reporting cutoff. */
export function summariseIntercepts(
  intercepts: readonly Intercept[],
  cutoffPct: number = DEFAULT_INTERCEPT_OPTIONS.cutoffPct
): { count: number; holeCount: number; cutoffLabel: string; bestGradePct: number } {
  const holes = new Set(intercepts.map((i) => i.holeId));
  const bestGradePct = intercepts.reduce((max, i) => Math.max(max, i.gradePct), 0);
  return {
    count: intercepts.length,
    holeCount: holes.size,
    cutoffLabel: `>${round(cutoffPct, 1)}% TGC`,
    bestGradePct,
  };
}
