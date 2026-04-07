import { describe, expect, it } from 'vitest';
import type { GPXTrack, JourneySegment } from '@/types';
import { buildComputedJourney } from '@/utils/journeyUtils';
import { projectCoordinateToJourney, projectCoordinateToTrack } from './routeProjection';

function createTrack(points: GPXTrack['points'], totalDistance: number): GPXTrack {
  return {
    id: 'track-1',
    name: 'Sample',
    points,
    totalDistance,
    totalTime: 0,
    movingTime: 0,
    elevationGain: 0,
    elevationLoss: 0,
    maxElevation: 0,
    minElevation: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    avgMovingSpeed: 0,
    bounds: {
      minLat: Math.min(...points.map((point) => point.lat)),
      maxLat: Math.max(...points.map((point) => point.lat)),
      minLon: Math.min(...points.map((point) => point.lon)),
      maxLon: Math.max(...points.map((point) => point.lon)),
    },
    color: '#C1652F',
    visible: true,
  };
}

describe('route projection', () => {
  it('projects onto the middle of a sparse track segment instead of snapping to endpoints', () => {
    const track = createTrack([
      {
        lat: 41,
        lon: 2,
        elevation: 0,
        time: null,
        heartRate: null,
        cadence: null,
        power: null,
        temperature: null,
        distance: 0,
        speed: 0,
      },
      {
        lat: 41,
        lon: 2.01,
        elevation: 0,
        time: null,
        heartRate: null,
        cadence: null,
        power: null,
        temperature: null,
        distance: 1000,
        speed: 0,
      },
    ], 1000);

    const result = projectCoordinateToTrack(track, 41, 2.005, 0);

    expect(result).not.toBeNull();
    expect(result?.lon).toBeCloseTo(2.005, 4);
    expect(result?.progress).toBeCloseTo(0.5, 2);
    expect(result?.distanceMeters).toBeLessThan(5);
  });

  it('returns playback-timeline progress for a journey segment', () => {
    const track = createTrack([
      {
        lat: 41,
        lon: 2,
        elevation: 0,
        time: new Date('2026-04-07T10:00:00Z'),
        heartRate: null,
        cadence: null,
        power: null,
        temperature: null,
        distance: 0,
        speed: 0,
      },
      {
        lat: 41,
        lon: 2.01,
        elevation: 0,
        time: new Date('2026-04-07T10:10:00Z'),
        heartRate: null,
        cadence: null,
        power: null,
        temperature: null,
        distance: 1000,
        speed: 0,
      },
    ], 1000);
    const segments: JourneySegment[] = [
      { id: 'track-segment', type: 'track', trackId: track.id, duration: 10_000 },
      { id: 'transport', type: 'transport', mode: 'walk', from: { lat: 41, lon: 2.01 }, to: { lat: 41.001, lon: 2.02 }, duration: 10_000, distance: 1000 },
    ];
    const computedJourney = buildComputedJourney(segments, [track]);

    expect(computedJourney).not.toBeNull();
    const result = projectCoordinateToJourney(computedJourney!, 41, 2.005, 0);

    expect(result).not.toBeNull();
    expect(result?.progress).toBeCloseTo(0.25, 2);
  });
});
