import { describe, expect, it } from 'vitest';
import { createStageProfiler, percentile } from './exportProfiler';

describe('percentile', () => {
  it('returns 0 for an empty sample', () => {
    expect(percentile([], 0.95)).toBe(0);
  });

  it('returns the only value for a single sample', () => {
    expect(percentile([42], 0.95)).toBe(42);
  });

  it('picks the nearest-rank value for p95', () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(percentile(values, 0.95)).toBe(19);
  });

  it('clamps p to the last element', () => {
    expect(percentile([1, 2, 3], 1)).toBe(3);
  });
});

describe('createStageProfiler', () => {
  it('accumulates mean and total for marked durations', () => {
    const p = createStageProfiler();
    p.mark('capture', 10);
    p.mark('capture', 20);
    p.mark('capture', 30);

    const snap = p.snapshot();

    expect(snap.capture.count).toBe(3);
    expect(snap.capture.totalMs).toBe(60);
    expect(snap.capture.meanMs).toBe(20);
  });

  it('counts ticks with zero duration for render events', () => {
    const p = createStageProfiler();
    p.tick('render');
    p.tick('render');

    const snap = p.snapshot();

    expect(snap.render.count).toBe(2);
    expect(snap.render.totalMs).toBe(0);
    expect(snap.render.meanMs).toBe(0);
  });

  it('measures render cadence via the renderInterval stage', () => {
    const p = createStageProfiler();
    p.mark('renderInterval', 16);
    p.mark('renderInterval', 20);

    const snap = p.snapshot();

    expect(snap.renderInterval.count).toBe(2);
    expect(snap.renderInterval.meanMs).toBe(18);
    expect(snap.renderInterval.p95Ms).toBe(20);
  });

  it('reports an empty stage as all zeros', () => {
    const p = createStageProfiler();

    expect(p.snapshot().encodeEnqueue).toEqual({
      count: 0,
      meanMs: 0,
      p95Ms: 0,
      totalMs: 0,
    });
  });

  it('reset clears all samples', () => {
    const p = createStageProfiler();
    p.mark('capture', 5);
    p.reset();

    expect(p.snapshot().capture.count).toBe(0);
  });
});
