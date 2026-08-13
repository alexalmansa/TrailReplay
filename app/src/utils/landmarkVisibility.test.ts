import { describe, expect, it } from 'vitest';
import { selectVisibleLandmarks } from './landmarkVisibility';
import type { RouteLandmark } from '@/types/landmarks';

const landmarks: RouteLandmark[] = Array.from({ length: 8 }, (_, index) => ({ id: String(index), type: 'custom', source: 'automatic', display: 'subtle', lat: 45, lon: 6, progress: index / 8, title: String(index), importance: 5 - Math.min(index, 4) as 1 | 2 | 3 | 4 | 5, routeDistanceMeters: index * 100 }));

describe('selectVisibleLandmarks', () => {
  it('caps very-close icon candidates at six', () => {
    expect(selectVisibleLandmarks(landmarks, { mode: 'follow-behind', preset: 'very-close', progress: 0, totalDistanceMeters: 1_000 }).length).toBe(6);
  });
});
