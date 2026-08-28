import { describe, expect, it } from 'vitest';
import { selectVisibleLandmarks } from './landmarkVisibility';
import type { RouteLandmark } from '@/types/landmarks';

const landmarks: RouteLandmark[] = Array.from({ length: 8 }, (_, index) => ({ id: String(index), type: 'custom', source: 'automatic', display: 'subtle', lat: 45, lon: 6, progress: index / 8, title: String(index), importance: 5 - Math.min(index, 4) as 1 | 2 | 3 | 4 | 5, routeDistanceMeters: index * 100 }));

describe('selectVisibleLandmarks', () => {
  it('caps very-close icon candidates at six', () => {
    expect(selectVisibleLandmarks(landmarks, { mode: 'follow-behind', preset: 'very-close', progress: 0, totalDistanceMeters: 1_000 }).length).toBe(6);
  });

  it('keeps a wider landmark window for long-distance far views', () => {
    const distant = [{ ...landmarks[0], id: 'distant', routeDistanceMeters: 12_000 }];
    expect(selectVisibleLandmarks(distant, { mode: 'follow-behind', preset: 'far', progress: 0, totalDistanceMeters: 100_000 })).toHaveLength(1);
    expect(selectVisibleLandmarks(distant, { mode: 'follow-behind', preset: 'close', progress: 0, totalDistanceMeters: 100_000 })).toHaveLength(0);
  });

  it('uses actual route distance when replay time is not proportional to distance', () => {
    const nearMarker = [{ ...landmarks[0], id: 'actual-distance', routeDistanceMeters: 70_000 }];
    expect(selectVisibleLandmarks(nearMarker, {
      mode: 'follow-behind',
      preset: 'medium',
      progress: 0.2,
      totalDistanceMeters: 100_000,
      currentDistanceMeters: 70_000,
    })).toHaveLength(1);
  });
});
