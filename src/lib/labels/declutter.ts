/**
 * Greedy leader-line label placement.
 *
 * The reference decks anchor every label to a point in the 3D scene, which
 * reads beautifully with five labels and turns into a wall of overlapping
 * boxes with twenty. This module keeps the anchoring and fixes the crowding:
 * high-priority labels get placed first, each one takes the nearest offset
 * that collides with nothing, and anything that cannot be placed cleanly is
 * dropped rather than stacked on top of a neighbour.
 *
 * Pure and deterministic — the same candidates in the same viewport always
 * produce the same layout, so labels do not jitter between frames.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LabelCandidate {
  id: string;
  /** Where the leader line starts, in stage pixels. */
  anchorPx: { x: number; y: number };
  /** Rendered label box size, in stage pixels. */
  width: number;
  height: number;
  /** Higher wins when two labels compete for the same space. */
  priority: number;
}

export type LabelSide = 'left' | 'right' | 'top' | 'bottom';

export interface PlacedLabel {
  id: string;
  /** Box centre, in stage pixels. */
  boxPx: { x: number; y: number };
  side: LabelSide;
  anchorPx: { x: number; y: number };
}

export interface PlaceLabelsOptions {
  /** Minimum gap between two label boxes, and from the stage edge. */
  padding?: number;
  /** Hard cap on visible labels, applied after priority sorting. */
  maxVisible?: number;
  /** Regions labels must avoid — legend, compass, scale bar, pager. */
  keepOutRects?: readonly Rect[];
  /** Leader-line lengths to try, nearest first. */
  offsetDistances?: readonly number[];
}

export interface PlaceLabelsResult {
  placed: PlacedLabel[];
  /** Ids that could not be placed without overlapping something. */
  dropped: string[];
}

const DEFAULT_PADDING = 8;
const DEFAULT_OFFSETS = [72, 110, 150, 200] as const;

/**
 * Candidate directions, in preference order. Sideways placement is tried
 * before vertical because a horizontal leader line crosses less of the scene
 * and keeps the label clear of the geometry it points at.
 */
const DIRECTIONS: ReadonlyArray<{ side: LabelSide; dx: number; dy: number }> = [
  { side: 'right', dx: 1, dy: 0 },
  { side: 'left', dx: -1, dy: 0 },
  { side: 'right', dx: 0.82, dy: -0.57 },
  { side: 'left', dx: -0.82, dy: -0.57 },
  { side: 'right', dx: 0.82, dy: 0.57 },
  { side: 'left', dx: -0.82, dy: 0.57 },
  { side: 'top', dx: 0, dy: -1 },
  { side: 'bottom', dx: 0, dy: 1 },
];

function rectsOverlap(a: Rect, b: Rect, padding: number): boolean {
  return (
    a.x - padding < b.x + b.width &&
    a.x + a.width + padding > b.x &&
    a.y - padding < b.y + b.height &&
    a.y + a.height + padding > b.y
  );
}

function boxRect(centreX: number, centreY: number, width: number, height: number): Rect {
  return { x: centreX - width / 2, y: centreY - height / 2, width, height };
}

function withinStage(rect: Rect, width: number, height: number, padding: number): boolean {
  return (
    rect.x >= padding &&
    rect.y >= padding &&
    rect.x + rect.width <= width - padding &&
    rect.y + rect.height <= height - padding
  );
}

function isFiniteAnchor(candidate: LabelCandidate): boolean {
  return (
    Number.isFinite(candidate.anchorPx?.x) &&
    Number.isFinite(candidate.anchorPx?.y) &&
    Number.isFinite(candidate.width) &&
    Number.isFinite(candidate.height) &&
    candidate.width > 0 &&
    candidate.height > 0
  );
}

/**
 * Place as many labels as fit, highest priority first.
 *
 * Anchors behind the camera or off-stage arrive as non-finite pixels from the
 * projection step; those are dropped up front rather than being clamped to an
 * edge, where they would point at nothing.
 */
export function placeLabels(
  candidates: readonly LabelCandidate[] | null | undefined,
  viewport: { width: number; height: number },
  options: PlaceLabelsOptions = {}
): PlaceLabelsResult {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { placed: [], dropped: [] };
  }

  const width = Number(viewport?.width);
  const height = Number(viewport?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { placed: [], dropped: candidates.map((c) => c.id) };
  }

  const padding = options.padding ?? DEFAULT_PADDING;
  const offsets = options.offsetDistances ?? DEFAULT_OFFSETS;
  const keepOut = options.keepOutRects ?? [];

  const dropped: string[] = [];

  const usable = candidates.filter((candidate) => {
    if (isFiniteAnchor(candidate)) return true;
    dropped.push(candidate.id);
    return false;
  });

  // Priority first; id breaks ties so placement is stable frame to frame.
  const ordered = [...usable].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id)
  );

  const limit = options.maxVisible ?? ordered.length;
  const placed: PlacedLabel[] = [];
  const occupied: Rect[] = [...keepOut];

  for (const candidate of ordered) {
    if (placed.length >= limit) {
      dropped.push(candidate.id);
      continue;
    }

    const spot = findSpot(candidate, { width, height }, offsets, occupied, padding);
    if (!spot) {
      dropped.push(candidate.id);
      continue;
    }

    placed.push({
      id: candidate.id,
      boxPx: { x: spot.x, y: spot.y },
      side: spot.side,
      anchorPx: { x: candidate.anchorPx.x, y: candidate.anchorPx.y },
    });
    occupied.push(boxRect(spot.x, spot.y, candidate.width, candidate.height));
  }

  return { placed, dropped };
}

/** Nearest non-colliding offset around a candidate's anchor, if any. */
function findSpot(
  candidate: LabelCandidate,
  viewport: { width: number; height: number },
  offsets: readonly number[],
  occupied: readonly Rect[],
  padding: number
): { x: number; y: number; side: LabelSide } | null {
  for (const distance of offsets) {
    for (const direction of DIRECTIONS) {
      // Offset from the anchor to the near edge of the box, so a wide label
      // does not creep back over its own anchor point.
      const x =
        candidate.anchorPx.x + direction.dx * (distance + candidate.width / 2);
      const y =
        candidate.anchorPx.y + direction.dy * (distance + candidate.height / 2);

      const rect = boxRect(x, y, candidate.width, candidate.height);
      if (!withinStage(rect, viewport.width, viewport.height, padding)) continue;
      if (occupied.some((other) => rectsOverlap(rect, other, padding))) continue;

      return { x, y, side: direction.side };
    }
  }
  return null;
}
