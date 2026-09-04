import {
  placeLabels,
  type LabelCandidate,
  type PlacedLabel,
  type Rect,
} from '@/lib/labels/declutter';

const VIEWPORT = { width: 1920, height: 1080 };
const BOX = { width: 190, height: 44 };

function candidate(
  id: string,
  x: number,
  y: number,
  priority = 1
): LabelCandidate {
  return { id, anchorPx: { x, y }, ...BOX, priority };
}

function rectOf(placed: PlacedLabel): Rect {
  return {
    x: placed.boxPx.x - BOX.width / 2,
    y: placed.boxPx.y - BOX.height / 2,
    ...BOX,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Every pair of placed boxes, for invariant checks. */
function pairs(placed: PlacedLabel[]): Array<[PlacedLabel, PlacedLabel]> {
  const out: Array<[PlacedLabel, PlacedLabel]> = [];
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) out.push([placed[i], placed[j]]);
  }
  return out;
}

describe('placeLabels', () => {
  it('places a lone label near its anchor', () => {
    const { placed, dropped } = placeLabels([candidate('a', 900, 500)], VIEWPORT);

    expect(dropped).toEqual([]);
    expect(placed).toHaveLength(1);
    expect(placed[0].anchorPx).toEqual({ x: 900, y: 500 });
  });

  it('never returns two overlapping boxes, even for tightly clustered anchors', () => {
    // 24 anchors inside a 240x140 box: the crowding case that makes naive
    // percentage placement unreadable.
    const candidates = Array.from({ length: 24 }, (_, i) =>
      candidate(`h${i}`, 800 + (i % 6) * 40, 450 + Math.floor(i / 6) * 35, 24 - i)
    );

    const { placed } = placeLabels(candidates, VIEWPORT);

    expect(placed.length).toBeGreaterThan(1);
    for (const [a, b] of pairs(placed)) {
      expect(overlaps(rectOf(a), rectOf(b))).toBe(false);
    }
  });

  it('keeps every placed box inside the stage', () => {
    const candidates = [
      candidate('edge-left', 5, 540),
      candidate('edge-right', 1915, 540),
      candidate('edge-top', 960, 5),
      candidate('edge-bottom', 960, 1075),
    ];

    const { placed } = placeLabels(candidates, VIEWPORT);

    for (const label of placed) {
      const rect = rectOf(label);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(VIEWPORT.width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(VIEWPORT.height);
    }
  });

  it('routes labels around keep-out regions', () => {
    const keepOutRects: Rect[] = [{ x: 24, y: 24, width: 260, height: 180 }];
    const candidates = Array.from({ length: 6 }, (_, i) =>
      candidate(`k${i}`, 150, 60 + i * 20)
    );

    const { placed } = placeLabels(candidates, VIEWPORT, { keepOutRects });

    for (const label of placed) {
      expect(overlaps(rectOf(label), keepOutRects[0])).toBe(false);
    }
  });

  it('places the highest-priority label first and drops the weakest', () => {
    const candidates = Array.from({ length: 30 }, (_, i) =>
      candidate(`p${i}`, 960, 540, i) // identical anchors — maximum competition
    );

    const { placed, dropped } = placeLabels(candidates, VIEWPORT);

    expect(placed[0].id).toBe('p29');
    expect(dropped).toContain('p0');
  });

  it('honours maxVisible', () => {
    const candidates = Array.from({ length: 20 }, (_, i) =>
      candidate(`m${i}`, 200 + i * 80, 300 + (i % 5) * 90, 20 - i)
    );

    const { placed, dropped } = placeLabels(candidates, VIEWPORT, { maxVisible: 6 });

    expect(placed).toHaveLength(6);
    expect(placed.length + dropped.length).toBe(20);
  });

  it('accounts for every candidate exactly once', () => {
    const candidates = Array.from({ length: 24 }, (_, i) =>
      candidate(`n${i}`, 800 + (i % 6) * 40, 450 + Math.floor(i / 6) * 35, 24 - i)
    );

    const { placed, dropped } = placeLabels(candidates, VIEWPORT);

    const ids = [...placed.map((p) => p.id), ...dropped].sort();
    expect(ids).toEqual(candidates.map((c) => c.id).sort());
  });

  it('is deterministic', () => {
    const candidates = Array.from({ length: 18 }, (_, i) =>
      candidate(`d${i}`, 700 + (i % 5) * 55, 400 + Math.floor(i / 5) * 45, 18 - i)
    );

    const first = placeLabels(candidates, VIEWPORT);
    const second = placeLabels(candidates, VIEWPORT);

    expect(second).toEqual(first);
  });

  it('is order-independent for a fixed set of priorities', () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      candidate(`o${i}`, 600 + (i % 4) * 70, 380 + Math.floor(i / 4) * 60, 12 - i)
    );

    const forward = placeLabels(candidates, VIEWPORT);
    const reversed = placeLabels([...candidates].reverse(), VIEWPORT);

    expect(reversed).toEqual(forward);
  });

  describe('invalid input', () => {
    it('returns empty results for empty, null and undefined', () => {
      expect(placeLabels([], VIEWPORT)).toEqual({ placed: [], dropped: [] });
      expect(placeLabels(null, VIEWPORT)).toEqual({ placed: [], dropped: [] });
      expect(placeLabels(undefined, VIEWPORT)).toEqual({ placed: [], dropped: [] });
    });

    it('drops anchors that did not project to finite pixels', () => {
      const candidates = [
        { id: 'nan-x', anchorPx: { x: Number.NaN, y: 10 }, ...BOX, priority: 1 },
        { id: 'inf-y', anchorPx: { x: 10, y: Number.POSITIVE_INFINITY }, ...BOX, priority: 1 },
        candidate('ok', 900, 500),
      ];

      const { placed, dropped } = placeLabels(candidates, VIEWPORT);

      expect(dropped).toEqual(expect.arrayContaining(['nan-x', 'inf-y']));
      expect(placed.map((p) => p.id)).toEqual(['ok']);
    });

    it('drops zero-sized boxes', () => {
      const { dropped } = placeLabels(
        [{ id: 'empty', anchorPx: { x: 900, y: 500 }, width: 0, height: 0, priority: 1 }],
        VIEWPORT
      );

      expect(dropped).toEqual(['empty']);
    });

    it('drops everything when the viewport is degenerate', () => {
      const candidates = [candidate('a', 10, 10), candidate('b', 20, 20)];

      expect(placeLabels(candidates, { width: 0, height: 0 }).dropped).toHaveLength(2);
      expect(placeLabels(candidates, { width: Number.NaN, height: 100 }).dropped).toHaveLength(2);
    });

    it('drops everything when no box can fit, without throwing', () => {
      const candidates = Array.from({ length: 5 }, (_, i) => candidate(`t${i}`, 60, 45));

      const { placed, dropped } = placeLabels(candidates, { width: 120, height: 90 });

      expect(placed).toEqual([]);
      expect(dropped).toHaveLength(5);
    });
  });
});
