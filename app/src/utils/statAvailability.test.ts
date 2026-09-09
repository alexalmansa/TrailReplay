import { describe, expect, it } from 'vitest';
import type { GPXPoint, GPXTrack, StatId } from '@/types';
import { DEFAULT_ACTIVITY_ICON } from '@/utils/activityIcons';
import { getAvailableStats, getStatAvailability } from './statAvailability';

function makeTrack(id: string, timed: boolean, withHeartRate = false): GPXTrack {
  const points: GPXPoint[] = [0, 1].map((index) => ({
    lat: 41 + index * 0.01,
    lon: 2,
    elevation: 100,
    time: timed ? new Date(Date.UTC(2026, 0, 1, 9, index)) : null,
    heartRate: withHeartRate ? 140 + index : null,
    cadence: null,
    power: null,
    temperature: null,
    distance: index * 1000,
    speed: 0,
  }));

  return {
    id,
    name: id,
    activityIcon: DEFAULT_ACTIVITY_ICON,
    points,
    totalDistance: 1000,
    totalTime: 0,
    movingTime: 0,
    elevationGain: 0,
    elevationLoss: 0,
    maxElevation: 100,
    minElevation: 100,
    maxSpeed: 0,
    avgSpeed: 0,
    avgMovingSpeed: 0,
    bounds: { minLat: 41, maxLat: 41.01, minLon: 2, maxLon: 2 },
    color: '#C1652F',
    visible: true,
  };
}

const CONFIGURED: StatId[] = [
  'duration',
  'distance',
  'pace',
  'elevation',
  'speed',
  'heartRate',
  'altitude',
];

describe('statAvailability', () => {
  it('reports what any one track carries', () => {
    expect(getStatAvailability([makeTrack('a', false), makeTrack('b', true)])).toEqual({
      hasRecordedTime: true,
      hasHeartRate: false,
    });
    expect(getStatAvailability([makeTrack('a', true, true)])).toEqual({
      hasRecordedTime: true,
      hasHeartRate: true,
    });
    expect(getStatAvailability([])).toEqual({ hasRecordedTime: false, hasHeartRate: false });
  });

  it('drops the clock-dependent stats when no route has timestamps', () => {
    expect(getAvailableStats(CONFIGURED, [makeTrack('a', false, true)])).toEqual([
      'distance',
      'elevation',
      'heartRate',
      'altitude',
    ]);
  });

  it('drops heart rate when no route recorded a sensor', () => {
    expect(getAvailableStats(CONFIGURED, [makeTrack('a', true)])).toEqual([
      'duration',
      'distance',
      'pace',
      'elevation',
      'speed',
      'altitude',
    ]);
  });

  it('keeps every configured stat once a route carries both', () => {
    expect(getAvailableStats(CONFIGURED, [makeTrack('a', true, true)])).toEqual(CONFIGURED);
  });

  it('keeps elevation answerable even for a flat route', () => {
    expect(getAvailableStats(['elevation', 'altitude'], [makeTrack('a', false)])).toEqual([
      'elevation',
      'altitude',
    ]);
  });
});
