import { describe, expect, it } from 'vitest';
import { hasUnsavedProjectContent } from './hasUnsavedWork';

describe('hasUnsavedProjectContent', () => {
  it('is false when there are no tracks, pictures, or journey', () => {
    expect(hasUnsavedProjectContent({ tracks: [], pictures: [], journey: null })).toBe(false);
  });

  it('is true when there is at least one track', () => {
    expect(hasUnsavedProjectContent({
      tracks: [{ id: 't1' } as never],
      pictures: [],
      journey: null,
    })).toBe(true);
  });

  it('is true when there is at least one picture', () => {
    expect(hasUnsavedProjectContent({
      tracks: [],
      pictures: [{ id: 'p1' } as never],
      journey: null,
    })).toBe(true);
  });

  it('is true when a journey exists even with no tracks or pictures', () => {
    expect(hasUnsavedProjectContent({
      tracks: [],
      pictures: [],
      journey: { id: 'j1', name: 'x', segments: [], totalDuration: 0, totalDistance: 0 },
    })).toBe(true);
  });
});
