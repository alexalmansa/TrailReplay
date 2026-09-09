import { describe, expect, it } from 'vitest';
import type { GPXPoint, GPXTrack } from '@/types';
import { DEFAULT_ACTIVITY_ICON } from '@/utils/activityIcons';
import { getTrackTimeRange, groupTracksByTimeOverlap } from './trackTimeOverlap';

function makePoint(time: Date | null, distance = 0): GPXPoint {
  return {
    lat: 41,
    lon: 2,
    elevation: 0,
    time,
    heartRate: null,
    cadence: null,
    power: null,
    temperature: null,
    distance,
    speed: 0,
  };
}

function makeTrack(id: string, points: GPXPoint[]): GPXTrack {
  return {
    id,
    name: id,
    activityIcon: DEFAULT_ACTIVITY_ICON,
    points,
    totalDistance: points[points.length - 1]?.distance ?? 0,
    totalTime: 0,
    movingTime: 0,
    elevationGain: 0,
    elevationLoss: 0,
    maxElevation: 0,
    minElevation: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    avgMovingSpeed: 0,
    bounds: { minLat: 41, maxLat: 41, minLon: 2, maxLon: 2 },
    color: '#C1652F',
    visible: true,
  };
}

function trackFromTimes(id: string, startMinute: number, endMinute: number): GPXTrack {
  const base = new Date('2026-01-01T09:00:00Z').getTime();
  return makeTrack(id, [
    makePoint(new Date(base + startMinute * 60_000), 0),
    makePoint(new Date(base + endMinute * 60_000), 1000),
  ]);
}

function untimedTrack(id: string): GPXTrack {
  return makeTrack(id, [makePoint(null, 0), makePoint(null, 1000)]);
}

describe('getTrackTimeRange', () => {
  it('derives the start/end from the first and last timestamped points', () => {
    const track = trackFromTimes('a', 0, 30);
    const range = getTrackTimeRange(track);
    expect(range?.start.toISOString()).toBe('2026-01-01T09:00:00.000Z');
    expect(range?.end.toISOString()).toBe('2026-01-01T09:30:00.000Z');
  });

  it('returns null when no point has a timestamp', () => {
    expect(getTrackTimeRange(untimedTrack('a'))).toBeNull();
  });
});

describe('groupTracksByTimeOverlap', () => {
  it('groups two tracks whose time windows overlap', () => {
    const a = trackFromTimes('a', 0, 60);
    const b = trackFromTimes('b', 10, 70);
    expect(groupTracksByTimeOverlap([a, b])).toEqual([[a, b]]);
  });

  it('keeps tracks recorded at disjoint times apart', () => {
    const a = trackFromTimes('a', 0, 30);
    const b = trackFromTimes('b', 120, 150);
    expect(groupTracksByTimeOverlap([a, b])).toEqual([[a], [b]]);
  });

  it('chains transitive overlaps into one cluster', () => {
    const a = trackFromTimes('a', 0, 30);
    const b = trackFromTimes('b', 20, 50);
    const c = trackFromTimes('c', 45, 75);
    expect(groupTracksByTimeOverlap([a, b, c])).toEqual([[a, b, c]]);
  });

  it('never groups tracks without timestamps', () => {
    const a = untimedTrack('a');
    const b = untimedTrack('b');
    expect(groupTracksByTimeOverlap([a, b])).toEqual([[a], [b]]);
  });
});
