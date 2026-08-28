import { describe, expect, it } from 'vitest';
import type { GPXPoint, GPXTrack, TrackSegment } from '@/types';
import { buildComputedJourney } from '@/utils/journeyUtils';
import { calculateCurrentLiveStats, elapsedTrackTime } from './liveStats';

function point(distance: number, elevation: number, seconds: number | null): GPXPoint {
  return {
    lat: 42 + distance / 100_000,
    lon: 1,
    elevation,
    time: seconds === null ? null : new Date(seconds * 1000),
    heartRate: null,
    cadence: null,
    power: null,
    temperature: null,
    distance,
    speed: 10,
  };
}

function track(id: string, elevations: [number, number, number], hasTime = true): GPXTrack {
  return {
    id,
    name: id,
    activityIcon: '🏃',
    points: [
      point(0, elevations[0], hasTime ? 0 : null),
      point(500, elevations[1], hasTime ? 50 : null),
      point(1000, elevations[2], hasTime ? 100 : null),
    ],
    totalDistance: 1000,
    totalTime: hasTime ? 100 : 0,
    movingTime: hasTime ? 100 : 0,
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

  it('falls back to elapsed video time when no track has recorded timestamps (e.g. Constant Pace)', () => {
    const tracks = [track('first', [100, 120, 140], false)];
    const segments: TrackSegment[] = tracks.map((entry) => ({
      id: `segment-${entry.id}`,
      type: 'track',
      trackId: entry.id,
      duration: 40_000,
    }));
    const computedJourney = buildComputedJourney(segments, tracks)!;
    const currentPosition = {
      ...tracks[0].points[1],
      segmentIndex: 0,
      segmentType: 'track' as const,
      trackId: 'first',
    };

    const stats = calculateCurrentLiveStats({
      activeTrack: tracks[0],
      computedJourney,
      currentPosition,
      playbackProgress: 0.5,
      restartPerTrack: false,
      segmentTimings: computedJourney.segmentTimings,
      totalDistance: computedJourney.totalDistance,
      tracks,
      videoDurationSeconds: 40,
    });

    expect(stats.duration).toBe(20);
  });

  it('falls back to the segment\'s share of video time per-track when that track has no timestamps', () => {
    const tracks = [track('first', [100, 120, 140]), track('second', [50, 70, 60], false)];
    const segments: TrackSegment[] = tracks.map((entry) => ({
      id: `segment-${entry.id}`,
      type: 'track',
      trackId: entry.id,
      duration: 20_000,
    }));
    const computedJourney = buildComputedJourney(segments, tracks)!;
    const currentPosition = {
      ...tracks[1].points[1],
      segmentIndex: 1,
      segmentType: 'track' as const,
      trackId: 'second',
    };

    const stats = calculateCurrentLiveStats({
      activeTrack: tracks[0],
      computedJourney,
      currentPosition,
      playbackProgress: 0.75,
      restartPerTrack: true,
      segmentTimings: computedJourney.segmentTimings,
      totalDistance: computedJourney.totalDistance,
      tracks,
      videoDurationSeconds: 40,
    });

    // Progress 0.75 is halfway through the second (20s-video) segment.
    expect(stats.duration).toBe(10);
  });

  it('elapsedTrackTime falls back to video time with no journey and an untimed active track', () => {
    const untimed = track('solo', [100, 120, 140], false);
    expect(elapsedTrackTime([], [], untimed, 0.5, 30)).toBe(15);
  });
});
