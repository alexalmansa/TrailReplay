import { describe, expect, it } from 'vitest';
import type { GPXPoint, GPXTrack, TrackSegment } from '@/types';
import { buildComputedJourney } from '@/utils/journeyUtils';
import { calculateCurrentLiveStats } from './liveStats';

function point(distance: number, elevation: number, seconds: number): GPXPoint {
  return {
    lat: 42 + distance / 100_000,
    lon: 1,
    elevation,
    time: new Date(seconds * 1000),
    heartRate: null,
    cadence: null,
    power: null,
    temperature: null,
    distance,
    speed: 10,
  };
}

function track(id: string, elevations: [number, number, number]): GPXTrack {
  return {
    id,
    name: id,
    activityIcon: '🏃',
    points: [
      point(0, elevations[0], 0),
      point(500, elevations[1], 50),
      point(1000, elevations[2], 100),
    ],
    totalDistance: 1000,
    totalTime: 100,
    movingTime: 100,
    elevationGain: 0,
    elevationLoss: 0,
    maxElevation: Math.max(...elevations),
    minElevation: Math.min(...elevations),
    maxSpeed: 10,
    avgSpeed: 10,
    avgMovingSpeed: 10,
    bounds: { minLat: 42, maxLat: 42.01, minLon: 1, maxLon: 1 },
    color: id === 'first' ? '#C1652F' : '#3B82F6',
    visible: true,
  };
}

describe('calculateCurrentLiveStats', () => {
  it('can restart distance, duration, pace basis, and elevation for each track', () => {
    const tracks = [track('first', [100, 120, 140]), track('second', [50, 70, 60])];
    const segments: TrackSegment[] = tracks.map((entry) => ({
      id: `segment-${entry.id}`,
      type: 'track',
      trackId: entry.id,
      duration: 1000,
    }));
    const computedJourney = buildComputedJourney(segments, tracks)!;
    const currentPosition = {
      ...tracks[1].points[1],
      segmentIndex: 1,
      segmentType: 'track' as const,
      trackId: 'second',
    };
    const common = {
      activeTrack: tracks[0],
      computedJourney,
      currentPosition,
      playbackProgress: 0.75,
      segmentTimings: computedJourney.segmentTimings,
      totalDistance: computedJourney.totalDistance,
      tracks,
    };

    const cumulative = calculateCurrentLiveStats({ ...common, restartPerTrack: false });
    const perTrack = calculateCurrentLiveStats({ ...common, restartPerTrack: true });

    expect(cumulative.distance).toBe(1500);
    expect(cumulative.duration).toBe(150);
    expect(cumulative.elevationGain).toBe(60);
    expect(perTrack.distance).toBe(500);
    expect(perTrack.duration).toBe(50);
    expect(perTrack.elevationGain).toBe(20);
    expect(perTrack.averageSpeed).toBe(10);
  });
});
