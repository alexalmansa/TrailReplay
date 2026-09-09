import { describe, expect, it } from 'vitest';
import type { GPXPoint, GPXTrack } from '@/types';
import { DEFAULT_ACTIVITY_ICON } from '@/utils/activityIcons';
import { buildTrackTimeIndex, trackPositionAtTime } from './trackPositionAtTime';

const BASE = new Date('2026-01-01T09:00:00Z').getTime();

function makePoint(lat: number, minutesFromBase: number | null, distance: number): GPXPoint {
  return {
    lat,
    lon: 2,
    elevation: 0,
    time: minutesFromBase === null ? null : new Date(BASE + minutesFromBase * 60_000),
    heartRate: null,
    cadence: null,
    power: null,
    temperature: null,
    distance,
    speed: 0,
  };
}

function makeTrack(points: GPXPoint[]): GPXTrack {
  return {
    id: 'track',
    name: 'track',
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
    bounds: { minLat: 41, maxLat: 42, minLon: 2, maxLon: 2 },
    color: '#C1652F',
    visible: true,
  };
}

// Starts at 09:10, ends at 09:30, moving 41 -> 43 over 2000m.
const track = makeTrack([
  makePoint(41, 10, 0),
  makePoint(42, 20, 1000),
  makePoint(43, 30, 2000),
]);

describe('trackPositionAtTime', () => {
  it('interpolates position by wall-clock time, not by distance fraction', () => {
    const index = buildTrackTimeIndex(track)!;
    // 09:15 is halfway between the first two points.
    const position = trackPositionAtTime(track, index, BASE + 15 * 60_000);
    expect(position.lat).toBeCloseTo(41.5, 6);
    expect(position.distance).toBeCloseTo(500, 6);
    expect(position.state).toBe('during');
  });

  it('parks at the start before the track begins', () => {
    const index = buildTrackTimeIndex(track)!;
    const position = trackPositionAtTime(track, index, BASE);
    expect(position.lat).toBe(41);
    expect(position.distance).toBe(0);
    expect(position.state).toBe('before');
  });

  it('parks at the finish once the track is done', () => {
    const index = buildTrackTimeIndex(track)!;
    const position = trackPositionAtTime(track, index, BASE + 45 * 60_000);
    expect(position.lat).toBe(43);
    expect(position.distance).toBe(2000);
    expect(position.state).toBe('after');
  });

  it('skips untimed points when building the index', () => {
    const partial = makeTrack([
      makePoint(41, null, 0),
      makePoint(42, 20, 1000),
      makePoint(43, 30, 2000),
    ]);
    const index = buildTrackTimeIndex(partial)!;
    expect(index.times).toHaveLength(2);
    expect(index.indices).toEqual([1, 2]);
  });

  it('returns null when a track has fewer than two timestamps', () => {
    const untimed = makeTrack([makePoint(41, null, 0), makePoint(42, null, 1000)]);
    expect(buildTrackTimeIndex(untimed)).toBeNull();
  });
});
