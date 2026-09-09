import { describe, expect, it } from 'vitest';
// The probe runs outside the app as plain Node, but its metrics are the
// vocabulary CAMERA.md uses to judge the camera, so they are worth pinning here
// rather than only exercising them through a headless browser. Its shapes are
// declared in src/types/replay-metrics.d.ts.
import {
  changePercentiles,
  directionReversals,
  frozenFrames,
  jitterRms,
  summarize,
  unwrapDegrees,
} from '../../../scripts/replay-metrics.mjs';

describe('directionReversals', () => {
  it('counts changes of direction, not changes of value', () => {
    expect(directionReversals([0, 1, 2, 3])).toBe(0);
    expect(directionReversals([0, 1, 0, 1])).toBe(2);
  });

  it('ignores movement inside the deadband, so float noise is not a reversal', () => {
    const noise = [0, 0.0001, -0.0001, 0.0001, -0.0001];
    expect(directionReversals(noise)).toBe(3);
    expect(directionReversals(noise, 0.001)).toBe(0);
  });
});

describe('frozenFrames', () => {
  it('reports the share of still frames and the longest run', () => {
    const { percent, longestRun } = frozenFrames([0, 0, 0, 1, 2, 2]);
    // Three of five comparisons had no movement, the longest run being two.
    expect(percent).toBeCloseTo(60, 5);
    expect(longestRun).toBe(2);
  });
});

describe('changePercentiles', () => {
  it('normalises by elapsed time, so a slow frame rate is not read as a lurch', () => {
    // The same motion sampled at 10 fps and at 1 fps.
    const fast = changePercentiles([0, 1, 2, 3], [0, 100, 200, 300]);
    const slow = changePercentiles([0, 10, 20, 30], [0, 1000, 2000, 3000]);
    expect(fast.p50).toBeCloseTo(10, 5);
    expect(slow.p50).toBeCloseTo(10, 5);
  });

  it('separates the lurch from the median', () => {
    const glide = Array.from({ length: 100 }, (_, index) => index);
    const times = glide.map((index) => index * 1000);
    const lurched = [...glide];
    lurched[50] += 40;

    const before = changePercentiles(glide, times);
    const after = changePercentiles(lurched, times);
    expect(after.p50).toBeCloseTo(before.p50, 5);
    expect(after.p99).toBeGreaterThan(before.p99 * 5);
  });
});

describe('jitterRms', () => {
  it('reads a steady pan as smooth and a tremor as not', () => {
    const pan = Array.from({ length: 60 }, (_, index) => index * 0.01);
    const tremor = pan.map((value, index) => value + (index % 2 === 0 ? 0.02 : -0.02));
    expect(jitterRms(pan)).toBeLessThan(0.01);
    expect(jitterRms(tremor)).toBeGreaterThan(0.01);
  });
});

describe('unwrapDegrees', () => {
  it('treats 359 to 1 as two degrees, not minus 358', () => {
    const unwrapped = unwrapDegrees([359, 1, 3]);
    expect(unwrapped[1] - unwrapped[0]).toBeCloseTo(2, 5);
    expect(directionReversals(unwrapped)).toBe(0);
  });
});

describe('summarize', () => {
  const sample = (t: number, marker: { x: number; y: number } | null) => ({
    t,
    progress: t / 1000,
    bearing: 0,
    pitch: 55,
    zoom: 14,
    tilesLoaded: true,
    marker,
  });

  it('flags a marker that left the canvas', () => {
    const metrics = summarize([
      sample(0, { x: 0.5, y: 0.5 }),
      sample(16, { x: 1.4, y: 0.5 }),
      sample(32, { x: 0.5, y: -0.2 }),
    ]);

    expect(metrics.marker.framesOffCanvas).toBe(2);
    expect(metrics.marker.x.max).toBeCloseTo(1.4, 5);
  });

  it('says when the frame rate makes the camera channels unrepresentative', () => {
    const slow = summarize([sample(0, { x: 0.5, y: 0.5 }), sample(1000, { x: 0.5, y: 0.5 })]);
    expect(slow.channelMetricsRepresentative).toBe(false);

    const fast = summarize(
      Array.from({ length: 61 }, (_, index) => sample(index * 16, { x: 0.5, y: 0.5 })),
    );
    expect(fast.fps).toBeGreaterThan(20);
    expect(fast.channelMetricsRepresentative).toBe(true);
  });

  it('counts frames with no marker separately from frames with a bad one', () => {
    const metrics = summarize([
      sample(0, null),
      sample(16, { x: 0.5, y: 0.5 }),
    ]);
    expect(metrics.marker.framesMissing).toBe(1);
    expect(metrics.marker.framesOffCanvas).toBe(0);
  });
});
