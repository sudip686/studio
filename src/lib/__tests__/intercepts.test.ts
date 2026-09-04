import {
  computeIntercepts,
  bestPerHole,
  formatIntercept,
  summariseIntercepts,
  type Intercept,
} from '@/lib/assay/intercepts';
import type { DrillholeSegment } from '@/lib/data-cache';

/** Build an assay sample at the given depth and grade. */
function sample(
  holeId: string,
  fromM: number,
  gradePct: number,
  lengthM = 2
): DrillholeSegment {
  return {
    hole_id: holeId,
    depth_from: fromM,
    depth_to: fromM + lengthM,
    graphitic_carbon: gradePct,
    lon: 39.06,
    lat: -4.85,
    elevation: 100,
    feature: null,
  };
}

/** A run of `count` two-metre samples at a constant grade. */
function run(holeId: string, fromM: number, gradePct: number, count: number) {
  return Array.from({ length: count }, (_, i) => sample(holeId, fromM + i * 2, gradePct));
}

describe('computeIntercepts', () => {
  it('composites a contiguous above-cutoff run into a single intercept', () => {
    // 42 samples x 2m = 84m at 8% TGC, starting at 4m.
    const intercepts = computeIntercepts(run('TGDD1029', 4, 8, 42));

    expect(intercepts).toHaveLength(1);
    expect(intercepts[0]).toMatchObject({
      holeId: 'TGDD1029',
      lengthM: 84,
      fromM: 4,
      toM: 88,
    });
    expect(intercepts[0].gradePct).toBeCloseTo(8, 6);
    expect(intercepts[0].gradeThickness).toBeCloseTo(672, 4);
  });

  it('uses a length-weighted mean, not a simple average', () => {
    // 10m at 4% plus 2m at 10% is (40 + 20) / 12 = 5%, not (4 + 10) / 2 = 7%.
    const [intercept] = computeIntercepts([
      sample('H1', 0, 4, 10),
      sample('H1', 10, 10, 2),
    ]);

    expect(intercept.gradePct).toBeCloseTo(5, 6);
  });

  it('bridges internal waste no longer than maxInternalWasteM', () => {
    const segments = [
      ...run('H1', 0, 6, 5),
      sample('H1', 10, 0.5),
      ...run('H1', 12, 6, 5),
    ];

    const [intercept, ...rest] = computeIntercepts(segments, { maxInternalWasteM: 2 });

    expect(rest).toHaveLength(0);
    expect(intercept.lengthM).toBe(22);
    expect(intercept.fromM).toBe(0);
    expect(intercept.toM).toBe(22);
    // The bridged waste dilutes the reported grade.
    expect(intercept.gradePct).toBeCloseTo((6 * 20 + 0.5 * 2) / 22, 6);
  });

  it('splits the run when internal waste exceeds maxInternalWasteM', () => {
    const segments = [
      ...run('H1', 0, 6, 5),
      ...run('H1', 10, 0.5, 3),
      ...run('H1', 16, 6, 5),
    ];

    const intercepts = computeIntercepts(segments, { maxInternalWasteM: 2 });

    expect(intercepts).toHaveLength(2);
    expect(intercepts.map((i) => i.lengthM)).toEqual([10, 10]);
  });

  it('does not bridge an unsampled depth gap', () => {
    // Two 10m runs with 30m of no data between them. Merging these would
    // report "50m from 0m", 30m of which was never assayed.
    const segments = [...run('H1', 0, 6, 5), ...run('H1', 40, 6, 5)];

    const intercepts = computeIntercepts(segments);

    expect(intercepts).toHaveLength(2);
    expect(intercepts.map((i) => i.lengthM)).toEqual([10, 10]);
    expect(intercepts.map((i) => i.fromM).sort((a, b) => a - b)).toEqual([0, 40]);
  });

  it('tolerates sub-centimetre rounding between consecutive samples', () => {
    const segments = [
      sample('H1', 0, 6, 5),
      { ...sample('H1', 5, 6, 5), depth_from: 5.001 },
    ];

    expect(computeIntercepts(segments)).toHaveLength(1);
  });

  it('never ends an intercept on below-cutoff material', () => {
    const segments = [...run('H1', 0, 6, 5), sample('H1', 10, 0.5)];

    const [intercept] = computeIntercepts(segments);

    expect(intercept.toM).toBe(10);
    expect(intercept.lengthM).toBe(10);
  });

  it('drops runs shorter than minLengthM', () => {
    expect(computeIntercepts([sample('H1', 0, 9, 2)], { minLengthM: 4 })).toEqual([]);
    expect(computeIntercepts([sample('H1', 0, 9, 6)], { minLengthM: 4 })).toHaveLength(1);
  });

  it('ranks by grade x thickness, descending', () => {
    const segments = [
      ...run('LOW', 0, 4, 5),
      ...run('HIGH', 0, 9, 5),
      ...run('MID', 0, 6, 5),
    ];

    expect(computeIntercepts(segments).map((i) => i.holeId)).toEqual([
      'HIGH',
      'MID',
      'LOW',
    ]);
  });

  it('is stable for equal grade-thickness, breaking ties by hole id', () => {
    const segments = [...run('BBB', 0, 6, 5), ...run('AAA', 0, 6, 5)];

    expect(computeIntercepts(segments).map((i) => i.holeId)).toEqual(['AAA', 'BBB']);
  });

  it('does not mutate its input', () => {
    const segments = [...run('H1', 10, 6, 3), ...run('H1', 0, 6, 3)];
    const snapshot = JSON.parse(JSON.stringify(segments));

    computeIntercepts(segments);

    expect(segments).toEqual(snapshot);
  });

  describe('includes (incl) sub-run', () => {
    it('reports a richer core inside a moderate intercept', () => {
      const segments = [
        ...run('H1', 0, 4, 5),
        ...run('H1', 10, 11, 4),
        ...run('H1', 18, 4, 5),
      ];

      const [intercept] = computeIntercepts(segments);

      expect(intercept.includes).toBeDefined();
      expect(intercept.includes?.gradePct).toBeCloseTo(11, 6);
      expect(intercept.includes?.lengthM).toBe(8);
      expect(intercept.includes?.fromM).toBe(10);
    });

    it('never reports a sub-run at or below the parent grade', () => {
      // A uniform run has no richer core, so there is nothing to include.
      const [intercept] = computeIntercepts(run('H1', 0, 8, 20));

      expect(intercept.includes).toBeUndefined();
    });

    it('respects inclMinLengthM', () => {
      const segments = [
        ...run('H1', 0, 4, 10),
        sample('H1', 20, 12),
        ...run('H1', 22, 4, 10),
      ];

      const [intercept] = computeIntercepts(segments, { inclMinLengthM: 4 });

      expect(intercept.includes).toBeUndefined();
    });
  });

  describe('invalid input', () => {
    it('returns an empty list for empty, null and undefined', () => {
      expect(computeIntercepts([])).toEqual([]);
      expect(computeIntercepts(null)).toEqual([]);
      expect(computeIntercepts(undefined)).toEqual([]);
    });

    it('skips non-finite, negative and zero-length rows', () => {
      const segments = [
        { ...sample('H1', 0, 6), graphitic_carbon: undefined },
        { ...sample('H1', 2, 6), graphitic_carbon: Number.NaN },
        { ...sample('H1', 4, -1) },
        { ...sample('H1', 6, 6), depth_to: 6 },
        { ...sample('H1', 8, 6), hole_id: '  ' },
      ] as DrillholeSegment[];

      expect(computeIntercepts(segments)).toEqual([]);
    });

    it('keeps valid rows alongside invalid ones', () => {
      const segments = [
        { ...sample('H1', 0, 6), graphitic_carbon: Number.NaN },
        ...run('H1', 2, 6, 5),
      ] as DrillholeSegment[];

      const intercepts = computeIntercepts(segments);

      expect(intercepts).toHaveLength(1);
      expect(intercepts[0].lengthM).toBe(10);
    });
  });
});

describe('bestPerHole', () => {
  it('keeps only the top-ranked intercept per hole, preserving order', () => {
    const segments = [
      ...run('H1', 0, 9, 5),
      ...run('H1', 40, 4, 5),
      ...run('H2', 0, 6, 5),
    ];

    const result = bestPerHole(computeIntercepts(segments));

    expect(result.map((i) => i.holeId)).toEqual(['H1', 'H2']);
  });
});

describe('formatIntercept', () => {
  const base: Intercept = {
    holeId: 'TGDD1029',
    gradePct: 7.9712,
    lengthM: 84,
    fromM: 4,
    toM: 88,
    gradeThickness: 669,
    lon: 39.06,
    lat: -4.85,
    collarElevation: 100,
  };

  it('quotes grade, length and start depth', () => {
    expect(formatIntercept(base)).toEqual({
      headline: 'TGDD1029',
      sub: '7.97% TGC over 84m from 4m',
    });
  });

  it('appends the incl clause when present', () => {
    const withIncl: Intercept = {
      ...base,
      includes: { gradePct: 10.5044, lengthM: 8, fromM: 20, toM: 28 },
    };

    expect(formatIntercept(withIncl).sub).toContain('incl 10.50% / 8m');
  });

  it('omits the incl clause in compact form, for labels over the 3D scene', () => {
    const withIncl: Intercept = {
      ...base,
      includes: { gradePct: 10.5044, lengthM: 8, fromM: 20, toM: 28 },
    };

    expect(formatIntercept(withIncl, { includeSubRun: false }).sub).toBe(
      '7.97% TGC over 84m from 4m'
    );
  });
});

describe('summariseIntercepts', () => {
  it('counts intercepts and distinct holes, and states the cutoff', () => {
    const segments = [
      ...run('H1', 0, 6, 5),
      ...run('H1', 40, 6, 5),
      ...run('H2', 0, 9, 5),
    ];

    const summary = summariseIntercepts(computeIntercepts(segments), 3);

    expect(summary).toMatchObject({ count: 3, holeCount: 2, cutoffLabel: '>3% TGC' });
    expect(summary.bestGradePct).toBeCloseTo(9, 6);
  });

  it('handles an empty list', () => {
    expect(summariseIntercepts([])).toMatchObject({ count: 0, holeCount: 0 });
  });
});
