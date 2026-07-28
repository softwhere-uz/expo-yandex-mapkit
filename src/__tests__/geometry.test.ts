import { boundingBox, distanceBetween, pathLength } from '../geometry';

// Geometry utilities (issue #2, Section A) — pure-JS distance / bounds helpers (yamap#227). No map
// instance needed; work on every platform incl. web.
describe('geometry utilities', () => {
  it('distanceBetween ~ the great-circle distance in metres', () => {
    // ~1 degree of latitude ≈ 111.2 km.
    const d = distanceBetween({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('distanceBetween is zero for the same point', () => {
    expect(
      distanceBetween({ latitude: 41.31, longitude: 69.24 }, { latitude: 41.31, longitude: 69.24 })
    ).toBe(0);
  });

  it('pathLength sums the segment distances', () => {
    const pts = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
      { latitude: 1, longitude: 1 },
    ];
    const expected = distanceBetween(pts[0], pts[1]) + distanceBetween(pts[1], pts[2]);
    expect(pathLength(pts)).toBeCloseTo(expected, 5);
    expect(pathLength([])).toBe(0);
    expect(pathLength([{ latitude: 1, longitude: 1 }])).toBe(0);
  });

  it('boundingBox returns the SW/NE corners containing every point, null when empty', () => {
    const box = boundingBox([
      { latitude: 41.3, longitude: 69.2 },
      { latitude: 41.5, longitude: 69.0 },
      { latitude: 41.1, longitude: 69.4 },
    ]);
    expect(box).toEqual({
      southWest: { latitude: 41.1, longitude: 69.0 },
      northEast: { latitude: 41.5, longitude: 69.4 },
    });
    expect(boundingBox([])).toBeNull();
  });
});
