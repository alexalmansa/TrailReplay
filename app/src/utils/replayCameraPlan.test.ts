import { describe, expect, it } from 'vitest';
import {
  getIntroCameraPose,
  getOpeningPreloadProgresses,
  getPredictivePlaybackPoses,
  getPlaybackCameraPose,
  getRouteBearingAtProgress,
} from './replayCameraPlan';

const coordinates = [[0, 0], [0.01, 0], [0.02, 0]];
const options = {
  coordinates,
  elevationData: [],
  followBehindZoomLevel: 100,
  progress: 0,
};

describe('replay camera plan', () => {
  it('returns the camera poses used by each non-overview camera mode', () => {
    expect(getIntroCameraPose({ ...options, cameraMode: 'follow' })).toMatchObject({
      center: [0, 0], zoom: 14, pitch: 0, bearing: 0,
    });
    expect(getPlaybackCameraPose({ ...options, cameraMode: 'follow-behind' })).toMatchObject({
      center: [0, 0], zoom: 16.5, pitch: 56, bearing: 90,
    });
    expect(getIntroCameraPose({ ...options, cameraMode: 'follow-behind' })).toMatchObject({
      center: [0, 0], zoom: 16.5, pitch: 56, bearing: 90,
    });
    expect(getPlaybackCameraPose({ ...options, cameraMode: 'overview' })).toBeNull();
  });

  it('creates evenly spaced opening coverage based on replay duration', () => {
    expect(getOpeningPreloadProgresses(60_000, 12_000, 4)).toEqual([
      0,
      1 / 15,
      2 / 15,
      expect.closeTo(0.2, 10),
    ]);
  });

  it('calculates a forward route bearing', () => {
    expect(getRouteBearingAtProgress(coordinates, 0)).toBeCloseTo(90, 5);
  });

  it('widens the close camera progressively as a route climbs', () => {
    const elevationData = [
      { elevation: 600 },
      { elevation: 1800 },
      { elevation: 2400 },
    ];

    expect(getPlaybackCameraPose({
      ...options,
      cameraMode: 'follow-behind',
      elevationData,
      progress: 0,
    })).toMatchObject({ zoom: 16.5, pitch: 56 });

    // Both pull-backs are deliberately small now. They exist to take the edge
    // off genuinely steep ground, not to re-frame the shot: keeping the marker
    // in view is `setCenterElevation`'s job. A big climb spends the whole
    // budget and it is still only 0.8 zoom levels and 4 degrees.
    expect(getPlaybackCameraPose({
      ...options,
      cameraMode: 'follow-behind',
      elevationData,
      progress: 1,
    })).toMatchObject({ zoom: 15.7, pitch: 52 });
  });

  it('adds an incoming-bearing warmup pose around a turn', () => {
    const poses = getPredictivePlaybackPoses({
      currentProgress: 0,
      horizonMs: 60_000,
      options: {
        cameraMode: 'follow-behind',
        coordinates: [[0, 0], [0.01, 0], [0.01, 0.01]],
        elevationData: [],
        followBehindZoomLevel: 100,
      },
      sampleCount: 3,
      totalDurationMs: 60_000,
    });

    expect(poses.length).toBeGreaterThan(2);
    expect(new Set(poses.map((pose) => Math.round(pose.bearing))).size).toBeGreaterThan(1);
  });
});
