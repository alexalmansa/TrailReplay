import { describe, expect, it } from 'vitest';
import { resolveRouteLandmarks } from './resolveRouteLandmarks';
import type { RouteLandmark } from '@/types/landmarks';

const landmark = (id: string, source: RouteLandmark['source'], distance: number, importance: RouteLandmark['importance'] = 3): RouteLandmark => ({ id, type: 'custom', source, display: 'subtle', lat: 45, lon: 6 + distance / 100_000, progress: 0, title: id, importance, routeDistanceMeters: distance });

describe('resolveRouteLandmarks', () => {
  it('prefers a user landmark when candidates share an anchor', () => {
    expect(resolveRouteLandmarks([landmark('automatic', 'automatic', 100), landmark('user', 'user', 110)]).map((entry) => entry.id)).toEqual(['user']);
  });

  it('caps lower-priority labels in the same route corridor', () => {
    expect(resolveRouteLandmarks([landmark('first', 'automatic', 100), landmark('second', 'automatic', 200)]).length).toBe(1);
  });
});
