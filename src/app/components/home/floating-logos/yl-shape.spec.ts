import { YL_SHAPE_BOUNDS, isInsideYlShape, packPointsInYlShape } from './yl-shape';

// Seeded generator so the dart-throwing in packPointsInYlShape is
// reproducible: a spacing assertion that depended on Math.random() would be
// flaky the one run in a hundred that hits a relaxation.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('yl-shape', () => {
  describe('YL_SHAPE_BOUNDS', () => {
    it('should be the tight box around the mark, not the SVG canvas', () => {
      expect(YL_SHAPE_BOUNDS).toEqual({
        minX: 287,
        minY: 80,
        maxX: 601,
        maxY: 731,
        width: 314,
        height: 651
      });
    });
  });

  describe('isInsideYlShape', () => {
    it('should accept points on the mark', () => {
      expect(isInsideYlShape(390, 350)).toBeTrue();  // red diamond
      expect(isInsideYlShape(350, 600)).toBeTrue();  // left leg
      expect(isInsideYlShape(550, 710)).toBeTrue();  // cream foot
    });

    it('should reject points in the bounding box but off the mark', () => {
      expect(isInsideYlShape(390, 100)).toBeFalse();  // gap between the spikes
      expect(isInsideYlShape(601, 80)).toBeFalse();   // top-right box corner
      expect(isInsideYlShape(550, 400)).toBeFalse();  // right of the legs
    });

    it('should reject points outside the bounding box', () => {
      expect(isInsideYlShape(0, 0)).toBeFalse();
      expect(isInsideYlShape(800, 800)).toBeFalse();
    });
  });

  describe('packPointsInYlShape', () => {
    it('should return one point per radius, index-aligned', () => {
      const radii = [3, 8, 5, 12, 4];
      const points = packPointsInYlShape(radii, { random: seededRandom(7) });

      expect(points.length).toBe(radii.length);
      points.forEach(point => {
        expect(Number.isFinite(point.x)).toBeTrue();
        expect(Number.isFinite(point.y)).toBeTrue();
      });
    });

    it('should place every point on the mark', () => {
      const radii = new Array(120).fill(6);
      const points = packPointsInYlShape(radii, { random: seededRandom(11) });

      points.forEach(point => {
        expect(isInsideYlShape(point.x, point.y)).toBeTrue();
      });
    });

    it('should keep comfortably-sized items at least their radii apart', () => {
      const radii = new Array(12).fill(5);
      const points = packPointsInYlShape(radii, { random: seededRandom(3) });

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const gap = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          expect(gap).toBeGreaterThanOrEqual(radii[i] + radii[j]);
        }
      }
    });

    it('should still place every item when they cannot possibly fit', () => {
      // Radii wider than the whole mark: spacing gets relaxed away and
      // overlap is accepted, but no item may be dropped or left undefined.
      const radii = new Array(20).fill(YL_SHAPE_BOUNDS.width);
      const points = packPointsInYlShape(radii, { random: seededRandom(5) });

      expect(points.length).toBe(radii.length);
      points.forEach(point => {
        expect(isInsideYlShape(point.x, point.y)).toBeTrue();
      });
    });

    it('should be deterministic for a given random source', () => {
      const radii = [4, 9, 6, 6, 11];
      const first = packPointsInYlShape(radii, { random: seededRandom(42) });
      const second = packPointsInYlShape(radii, { random: seededRandom(42) });

      expect(first).toEqual(second);
    });

    it('should handle an empty request', () => {
      expect(packPointsInYlShape([])).toEqual([]);
    });
  });
});
