import { describe, expect, it } from 'vitest';
import { createTransportSegment } from './createTransportSegment';

describe('createTransportSegment', () => {
  it('enforces a minimum duration for very short trips', () => {
    const segment = createTransportSegment('car', { lat: 41.39, lon: 2.17 }, { lat: 41.39, lon: 2.17 });

    expect(segment.duration).toBe(3000);
    expect(segment.distance).toBe(0);
  });

  it('caps very long transport animations to 10 seconds', () => {
    const segment = createTransportSegment('walk', { lat: 0, lon: 0 }, { lat: 1, lon: 0 });

    expect(segment.duration).toBe(10000);
    expect(segment.distance).toBeGreaterThan(100);
    expect(segment.id.startsWith('transport-')).toBe(true);
  });
});
