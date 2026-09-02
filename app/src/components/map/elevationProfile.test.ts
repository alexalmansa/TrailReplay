import { describe, expect, it } from 'vitest';
import { getElevationAtProgress } from './elevationProfile';

describe('elevation profile interpolation', () => {
  const points = [
    { progress: 0.1, elevation: 100 },
    { progress: 0.4, elevation: 220 },
    { progress: 0.9, elevation: 120 },
  ];

  it('interpolates smoothly between sparse GPX samples', () => {
    expect(getElevationAtProgress(points, 0.25)).toBeCloseTo(160);
    expect(getElevationAtProgress(points, 0.65)).toBeCloseTo(170);
  });

  it('clamps progress outside the segment', () => {
    expect(getElevationAtProgress(points, 0)).toBe(100);
    expect(getElevationAtProgress(points, 1)).toBe(120);
  });

  it('handles empty and repeated-progress data safely', () => {
    expect(getElevationAtProgress([], 0.5)).toBe(0);
    expect(getElevationAtProgress([
      { progress: 0, elevation: 100 },
      { progress: 0, elevation: 200 },
      { progress: 1, elevation: 300 },
    ], 0.5)).toBe(250);
  });
});
