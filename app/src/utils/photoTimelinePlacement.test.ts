import { describe, expect, it } from 'vitest';
import type { GPXTrack, JourneySegment } from '@/types';
import { buildComputedJourney } from '@/utils/journeyUtils';
import { findTimestampPlacement } from './photoTimelinePlacement';

function createTrack(points: GPXTrack['points']): GPXTrack {
  return {
    id: 'track-1',
    name: 'Timed Track',
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

describe('findTimestampPlacement', () => {
  it('interpolates on a single timed track', () => {
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
    ]);

    const result = findTimestampPlacement({
      timestamp: new Date('2026-04-07T10:05:00Z'),
      tracks: [track],
      journeySegments: [],
      computedJourney: null,
      activeTrackId: track.id,
    });

    expect(result.reason).toBeNull();
    expect(result.match?.lon).toBeCloseTo(2.005, 4);
    expect(result.match?.progress).toBeCloseTo(0.5, 2);
  });

  it('maps timestamp placement into the playback timeline for a journey track segment', () => {
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
    ]);
    const journeySegments: JourneySegment[] = [
      { id: 'segment-1', type: 'track', trackId: track.id, duration: 8_000 },
      { id: 'segment-2', type: 'transport', mode: 'walk', from: { lat: 41, lon: 2.01 }, to: { lat: 41.001, lon: 2.02 }, duration: 12_000, distance: 1000 },
    ];
    const computedJourney = buildComputedJourney(journeySegments, [track]);

    const result = findTimestampPlacement({
      timestamp: new Date('2026-04-07T10:05:00Z'),
      tracks: [track],
      journeySegments,
      computedJourney,
      activeTrackId: track.id,
    });

    expect(result.reason).toBeNull();
    expect(result.match?.progress).toBeCloseTo(0.2, 2);
  });

  it('returns out-of-range when the timestamp falls outside the timed route', () => {
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
    ]);

    const result = findTimestampPlacement({
      timestamp: new Date('2026-04-07T11:00:00Z'),
      tracks: [track],
      journeySegments: [],
      computedJourney: null,
      activeTrackId: track.id,
    });

    expect(result.match).toBeNull();
    expect(result.reason).toBe('timestamp-out-of-range');
  });

  it('returns no-timed-route when the GPX has no usable timestamps', () => {
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
    ]);

    const result = findTimestampPlacement({
      timestamp: new Date('2026-04-07T10:05:00Z'),
      tracks: [track],
      journeySegments: [],
      computedJourney: null,
      activeTrackId: track.id,
    });

    expect(result.match).toBeNull();
    expect(result.reason).toBe('no-timed-route');
  });
});
