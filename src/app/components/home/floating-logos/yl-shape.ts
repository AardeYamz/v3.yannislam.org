/**
 * Geometry of the YL tangram mark, used as a stencil by the background
 * animation's `mosaic` mode: small logos get packed at random points that
 * land inside this outline, so the crowd of little YLs reads as one big YL.
 *
 * The coordinates are the `points` attributes of the `<polygon>` pieces in
 * `src/assets/images/logos/clearcolor.svg`, verbatim, so they live in that
 * file's 800x800 viewBox space ("shape units" below). Nothing here knows
 * about pixels — callers scale the sampled points themselves.
 */

export interface ShapePoint {
  readonly x: number;
  readonly y: number;
}

type Polygon = readonly ShapePoint[];

// One entry per piece of the mark, in clearcolor.svg's order:
// spike-left, spike-right, cap, arm-left, arm-right, diamond, leg-left,
// leg-right, foot-green, foot-orange, foot-cream. Flat x,y pairs purely to
// keep the table readable next to the SVG it was copied from.
const PIECES: readonly (readonly number[])[] = [
  [287, 194, 287, 80, 343, 193],
  [437, 194, 493, 80, 493, 194],
  [360, 204, 420, 204, 390, 265],
  [354, 333, 289, 203, 348, 203, 384, 275],
  [425, 333, 396, 275, 432, 203, 491, 203],
  [361, 342, 390, 284, 419, 342, 390, 402],
  [323, 539, 384, 417, 384, 667, 323, 669],
  [395, 412, 458, 538, 458, 670, 396, 670],
  [321, 680, 377, 680, 352, 731, 295, 731],
  [484, 731, 427, 731, 402, 681, 458, 680],
  [601, 731, 496, 731, 471, 681, 575, 680]
];

function toPolygon(flat: readonly number[]): Polygon {
  const points: ShapePoint[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    points.push({ x: flat[i], y: flat[i + 1] });
  }
  return points;
}

export const YL_SHAPE_POLYGONS: readonly Polygon[] = PIECES.map(toPolygon);

function bounds(): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const polygon of YL_SHAPE_POLYGONS) {
    for (const { x, y } of polygon) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Tight box around the inked pieces — not the SVG's 800x800 canvas. */
export const YL_SHAPE_BOUNDS = bounds();

// Ray casting: count the polygon edges a ray shot left from (x, y) crosses.
// Odd means inside. Handles the concave pieces (the arms, the legs) that a
// convex-only test or a triangle fan would get wrong.
function isInsidePolygon(x: number, y: number, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = (a.y > y) !== (b.y > y);
    if (straddles && x < a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x)) {
      inside = !inside;
    }
  }
  return inside;
}

/** True when (x, y) — in shape units — falls on any piece of the mark. */
export function isInsideYlShape(x: number, y: number): boolean {
  return YL_SHAPE_POLYGONS.some(polygon => isInsidePolygon(x, y, polygon));
}

// The pieces cover roughly 28% of their bounding box, so rejection sampling
// against the box lands a point in ~4 tries on average; 200 is far past
// "unlucky" and only exists so a bad shape edit can't spin forever.
const IN_SHAPE_ATTEMPTS = 200;

// Strictly inside the red diamond, used if rejection sampling somehow comes
// up empty — a stacked logo beats a crash or an undefined position.
const FALLBACK_POINT: ShapePoint = { x: 390, y: 350 };

function randomPointInShape(random: () => number): ShapePoint {
  for (let i = 0; i < IN_SHAPE_ATTEMPTS; i++) {
    const x = YL_SHAPE_BOUNDS.minX + random() * YL_SHAPE_BOUNDS.width;
    const y = YL_SHAPE_BOUNDS.minY + random() * YL_SHAPE_BOUNDS.height;
    if (isInsideYlShape(x, y)) return { x, y };
  }
  return FALLBACK_POINT;
}

export interface PackOptions {
  /** Injectable for deterministic tests. */
  readonly random?: () => number;
  /** Candidate points tried per item before the spacing rule is relaxed. */
  readonly attemptsPerItem?: number;
  /** Multiplier applied to the spacing requirement on each relaxation. */
  readonly relaxFactor?: number;
  /** How many times spacing may be relaxed before overlap is accepted. */
  readonly maxRelaxations?: number;
}

interface PlacedItem extends ShapePoint {
  readonly r: number;
}

function fits(candidate: ShapePoint, radius: number, placed: readonly PlacedItem[], spacing: number): boolean {
  return placed.every(other =>
    Math.hypot(candidate.x - other.x, candidate.y - other.y) >= (radius + other.r) * spacing);
}

/**
 * Scatters one point per entry of `radii` (radii in shape units) inside the
 * mark, keeping items at least the sum of their radii apart. Returns centers
 * in shape units, index-aligned with `radii`.
 *
 * Dart throwing with progressive relaxation, rather than an exact packing:
 * big items go first (they're the hardest to fit), and an item that can't
 * find room after `attemptsPerItem` darts settles for a looser spacing
 * requirement instead of being dropped. Every item always gets a position —
 * a slightly tight cluster is much less noticeable than a hole in the
 * silhouette, and callers rely on the returned array being complete.
 */
export function packPointsInYlShape(radii: readonly number[], options: PackOptions = {}): ShapePoint[] {
  const {
    random = Math.random,
    attemptsPerItem = 60,
    relaxFactor = 0.82,
    maxRelaxations = 6
  } = options;

  const largestFirst = radii.map((_, i) => i).sort((a, b) => radii[b] - radii[a]);
  const placed: PlacedItem[] = [];
  const points: ShapePoint[] = new Array<ShapePoint>(radii.length);

  for (const index of largestFirst) {
    const radius = radii[index];
    let spacing = 1;
    let point: ShapePoint | undefined;

    for (let relaxation = 0; relaxation <= maxRelaxations && !point; relaxation++) {
      for (let attempt = 0; attempt < attemptsPerItem; attempt++) {
        const candidate = randomPointInShape(random);
        if (fits(candidate, radius, placed, spacing)) {
          point = candidate;
          break;
        }
      }
      spacing *= relaxFactor;
    }

    point ??= randomPointInShape(random);
    points[index] = point;
    placed.push({ x: point.x, y: point.y, r: radius });
  }

  return points;
}
