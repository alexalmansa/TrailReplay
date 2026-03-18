import { describe, expect, it } from 'vitest';
import type { GPXTrack, JourneySegment } from '@/types';
import {
  buildComputedJourney,
  calculateBearing,
  calculateDistance,
  getAllJourneyCoordinates,
  getBearingAtProgress,
  getCompletedCoordinates,
  getJourneyElevationData,
  getJourneyPointAtProgress,
  getSegmentAtProgress,
  getTrackEndPoint,
  getTrackStartPoint,
  interpolateTransportRoute,
} from '@/utils/journeyUtils';

function createTrack(id: string, color = '#10B981'): GPXTrack {
  return {
    id,
    name: `Track ${id}`,
    points: [
      {
        lat: 41.0,
        lon: 2.0,
        elevation: 100,
        time: null,
        heartRate: null,
        cadence: null,
        power: null,
        temperature: null,
        distance: 0,
        speed: 2,
      },
      {
        lat: 41.001,
        lon: 2.001,
        elevation: 130,
        time: null,
        heartRate: null,
        cadence: null,
        power: null,
        temperature: null,
        distance: 120,
        speed: 3,
      },
    ],
    totalDistance: 120,
    totalTime: 60000,
    movingTime: 58000,
    elevationGain: 30,
    elevationLoss: 0,
    maxElevation: 130,
    minElevation: 100,
    maxSpeed: 10,
    avgSpeed: 7,
    avgMovingSpeed: 7.2,
    bounds: {
      minLat: 41.0,
      maxLat: 41.001,
      minLon: 2.0,
      maxLon: 2.001,
    },
    color,
    visible: true,
  };
}

describe('journeyUtils', () => {
  it('returns null for empty journeys and exposes track start/end points', () => {
    const track = createTrack('track-1');

    expect(buildComputedJourney([], [track])).toBeNull();
    expect(getTrackStartPoint(track)).toEqual({ lat: 41.0, lon: 2.0 });
    expect(getTrackEndPoint(track)).toEqual({ lat: 41.001, lon: 2.001 });
  });

  it('builds computed journeys with track and transport timings', () => {
    const track = createTrack('track-1');
    const journeySegments: JourneySegment[] = [
      { id: 'segment-track', type: 'track', trackId: track.id, duration: 60000 },
      {
        id: 'segment-transport',
        type: 'transport',
        mode: 'car',
        from: { lat: 41.001, lon: 2.001 },
        to: { lat: 41.01, lon: 2.01 },
        duration: 30000,
        distance: 0,
      },
    ];

    const computed = buildComputedJourney(journeySegments, [track]);

    expect(computed).not.toBeNull();
    expect(computed?.totalDuration).toBe(90000);
    expect(computed?.trackDuration).toBe(60000);
    expect(computed?.transportDuration).toBe(30000);
    expect(computed?.segmentTimings).toHaveLength(2);
    expect(computed?.segmentTimings[0]).toMatchObject({
      type: 'track',
      trackId: track.id,
      color: track.color,
      progressStartRatio: 0,
      progressEndRatio: 60000 / 90000,
    });
    expect(computed?.segmentTimings[1]).toMatchObject({
      type: 'transport',
      transportMode: 'car',
      progressStartRatio: 60000 / 90000,
      progressEndRatio: 1,
    });
    expect(computed?.coordinates[0].segmentType).toBe('track');
    expect(computed?.coordinates.at(-1)?.segmentType).toBe('transport');
    expect(computed?.totalDistance).toBeGreaterThan(track.totalDistance);
  });

  it('resolves segment progress, interpolated points, and completed coordinates', () => {
    const track = createTrack('track-1');
    const journeySegments: JourneySegment[] = [
      { id: 'segment-track', type: 'track', trackId: track.id, duration: 60000 },
      {
        id: 'segment-transport',
        type: 'transport',
        mode: 'bike',
        from: { lat: 41.001, lon: 2.001 },
        to: { lat: 41.005, lon: 2.005 },
        duration: 60000,
        distance: 0,
      },
    ];

    const computed = buildComputedJourney(journeySegments, [track]);
    if (!computed) {
      throw new Error('Expected computed journey');
    }

    const segmentInfo = getSegmentAtProgress(0.75, computed.segmentTimings);
    expect(segmentInfo?.segment.type).toBe('transport');
    expect(segmentInfo?.localProgress).toBeCloseTo(0.5, 4);

    const point = getJourneyPointAtProgress(0.75, computed.coordinates, computed.segmentTimings);
    expect(point?.segmentType).toBe('transport');
    expect(point?.lat).toBeGreaterThan(41.001);
    expect(point?.lon).toBeGreaterThan(2.001);

    const completed = getCompletedCoordinates(0.75, computed.coordinates, computed.segmentTimings);
    expect(completed.length).toBeGreaterThan(2);
    expect(completed.at(-1)).toEqual([point?.lon ?? 0, point?.lat ?? 0]);

    const allCoords = getAllJourneyCoordinates(computed.coordinates);
    expect(allCoords).toHaveLength(computed.coordinates.length);
  });

  it('computes bearings, elevation profile, and interpolated transport routes', () => {
    const eastBearing = calculateBearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    expect(eastBearing).toBeCloseTo(90, 0);
    expect(calculateDistance(41.0, 2.0, 41.001, 2.001)).toBeGreaterThan(0);

    const transportPoints = interpolateTransportRoute(
      { lat: 41.0, lon: 2.0 },
      { lat: 41.01, lon: 2.02 },
      4
    );
    expect(transportPoints).toHaveLength(5);
    expect(transportPoints[0]).toMatchObject({ lat: 41.0, lon: 2.0, elevation: 0 });
    expect(transportPoints[4]).toMatchObject({ lat: 41.01, lon: 2.02, elevation: 0 });

    const track = createTrack('track-1');
    const computed = buildComputedJourney([{ id: 'segment-track', type: 'track', trackId: track.id, duration: 60000 }], [track]);
    if (!computed) {
      throw new Error('Expected computed journey');
    }

    const bearingAtProgress = getBearingAtProgress(0.5, computed.coordinates, computed.segmentTimings);
    expect(bearingAtProgress).toBeGreaterThanOrEqual(0);
    expect(bearingAtProgress).toBeLessThanOrEqual(360);

    const elevationData = getJourneyElevationData(computed.coordinates, computed.segmentTimings);
    expect(elevationData).toHaveLength(computed.coordinates.length);
    expect(elevationData[0]).toMatchObject({
      distance: 0,
      elevation: 100,
      progress: 0,
      segmentType: 'track',
    });
    expect(elevationData.at(-1)?.progress).toBe(1);
  });
});
