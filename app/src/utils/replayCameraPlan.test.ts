import { describe, expect, it } from 'vitest';
import {
  getIntroCameraPose,
  getOpeningPreloadProgresses,
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
      center: [0, 0], zoom: 16, pitch: 55, bearing: 90,
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
});
