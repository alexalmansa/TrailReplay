import { describe, expect, it } from 'vitest';
import type { GPXPoint, GPXTrack } from '@/types';
import { DEFAULT_ACTIVITY_ICON } from '@/utils/activityIcons';
import { groupTracksBySpatialSimilarity } from './trackSpatialSimilarity';

const METERS_PER_DEGREE_LAT = 111_000;

function makePoint(lat: number, lon: number, distance: number): GPXPoint {
  return {
    lat,
    lon,
    elevation: 0,
    time: null,
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
    bounds: { minLat: 41, maxLat: 41.1, minLon: 2, maxLon: 2.1 },
    color: '#C1652F',
    visible: true,
  };
}

// A straight north-south line of `count` points, offset east by `lonOffsetMeters`.
function makeLineTrack(id: string, lonOffsetMeters: number, count = 50, totalMeters = 8000): GPXTrack {
  const lonOffsetDeg = lonOffsetMeters / (METERS_PER_DEGREE_LAT * Math.cos((41 * Math.PI) / 180));
  const points: GPXPoint[] = [];
  for (let i = 0; i < count; i++) {
    const fraction = i / (count - 1);
    const lat = 41 + (fraction * totalMeters) / METERS_PER_DEGREE_LAT;
    points.push(makePoint(lat, 2 + lonOffsetDeg, fraction * totalMeters));
  }
  return makeTrack(id, points);
}

function withTimestamps(track: GPXTrack, startMinute: number): GPXTrack {
  const base = new Date('2026-01-01T09:00:00Z').getTime();
  return {
    ...track,
    points: track.points.map((point, index) => ({
      ...point,
      time: new Date(base + (startMinute + index) * 60_000),
    })),
  };
}

describe('groupTracksBySpatialSimilarity', () => {
  it('groups tracks that follow the same route within GPS-drift tolerance', () => {
    const a = makeLineTrack('a', 0);
    const b = makeLineTrack('b', 30); // 30m east, well within tolerance
    expect(groupTracksBySpatialSimilarity([a, b])).toEqual([[a, b]]);
  });

  it('keeps tracks on clearly different routes apart', () => {
    const a = makeLineTrack('a', 0);
    const b = makeLineTrack('b', 5000); // 5km away — a different trail
    expect(groupTracksBySpatialSimilarity([a, b])).toEqual([[a], [b]]);
  });

  it('keeps tracks of very different length apart even if they start together', () => {
    const a = makeLineTrack('a', 0, 50, 8000);
    const b = makeLineTrack('b', 0, 50, 2000);
    expect(groupTracksBySpatialSimilarity([a, b])).toEqual([[a], [b]]);
  });

  it('refuses to group two tracks that both carry timestamps', () => {
    // They reach here only after failing the time-overlap pass, so the same
    // route on two different days must not be reunited by shape alone.
    const a = withTimestamps(makeLineTrack('a', 0), 0);
    const b = withTimestamps(makeLineTrack('b', 20), 60 * 24);
    expect(groupTracksBySpatialSimilarity([a, b])).toEqual([[a], [b]]);
  });

  it('still groups a timed track with untimed ones on the same route', () => {
    const timed = withTimestamps(makeLineTrack('timed', 0), 0);
    const untimed = makeLineTrack('untimed', 25);
    expect(groupTracksBySpatialSimilarity([timed, untimed])).toEqual([[timed, untimed]]);
  });
});
