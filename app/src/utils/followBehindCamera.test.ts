import { describe, expect, it } from 'vitest';
import {
  FOLLOW_BEHIND_STOP_COUNT,
  getFollowBehindCameraTarget,
  getFollowBehindLevelForStopIndex,
  getFollowBehindStopIndexForLevel,
  getFollowBehindZoomLevelForPreset,
  getNearestFollowBehindPreset,
  getSuggestedFollowBehindZoomLevel,
} from './followBehindCamera';

const LAT = 42.5;

function suggestedZoom(totalDistanceMeters: number, videoDurationSeconds: number, latitudeDeg = LAT) {
  const level = getSuggestedFollowBehindZoomLevel({
    totalDistanceMeters, videoDurationSeconds, latitudeDeg,
  });
  return { level, zoom: getFollowBehindCameraTarget(level, 'playback').zoom };
}

describe('follow-behind distance stops', () => {
  it('offers more stops than the four named presets', () => {
    expect(FOLLOW_BEHIND_STOP_COUNT).toBeGreaterThan(4);
  });

  it('keeps the named presets on exactly the framing they always had', () => {
    // Saved projects store a level, so these must not drift.
    expect(getFollowBehindCameraTarget(getFollowBehindZoomLevelForPreset('far'), 'playback'))
      .toEqual({ zoom: 11, pitch: 30 });
    expect(getFollowBehindCameraTarget(getFollowBehindZoomLevelForPreset('medium'), 'playback'))
      .toEqual({ zoom: 14, pitch: 35 });
    expect(getFollowBehindCameraTarget(getFollowBehindZoomLevelForPreset('close'), 'playback'))
      .toEqual({ zoom: 15, pitch: 45 });
    expect(getFollowBehindCameraTarget(getFollowBehindZoomLevelForPreset('very-close'), 'playback'))
      .toEqual({ zoom: 16, pitch: 55 });
  });

  it('steps monotonically closer, without skipping or repeating a stop', () => {
    const zooms: number[] = [];
    for (let index = 0; index < FOLLOW_BEHIND_STOP_COUNT; index++) {
      const level = getFollowBehindLevelForStopIndex(index);
      expect(getFollowBehindStopIndexForLevel(level)).toBe(index);
      zooms.push(getFollowBehindCameraTarget(level, 'playback').zoom);
    }
    for (let i = 1; i < zooms.length; i++) {
      expect(zooms[i]).toBeGreaterThan(zooms[i - 1]);
    }
  });

  it('clamps stepping at both ends so the buttons cannot run off the scale', () => {
    expect(getFollowBehindLevelForStopIndex(-3)).toBe(getFollowBehindLevelForStopIndex(0));
    expect(getFollowBehindLevelForStopIndex(FOLLOW_BEHIND_STOP_COUNT + 5))
      .toBe(getFollowBehindLevelForStopIndex(FOLLOW_BEHIND_STOP_COUNT - 1));
  });

  it('snaps a level saved before the extra stops existed onto a real stop', () => {
    const index = getFollowBehindStopIndexForLevel(40);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(FOLLOW_BEHIND_STOP_COUNT);
  });
});

describe('suggested starting distance', () => {
  it('starts further back for replays that cover more ground per second of video', () => {
    // 185 m per video second against 3.4 km — one starting preset cannot suit both.
    const short = suggestedZoom(11_107, 60);
    const long = suggestedZoom(206_157, 60);

    expect(short.zoom).toBeGreaterThan(long.zoom);
    expect(getNearestFollowBehindPreset(long.level)).toBe('far');
  });

  it('depends on ground per second of video, not on route length alone', () => {
    // Same route, four times the clip length: the marker travels a quarter as
    // fast, so the camera should start closer.
    expect(suggestedZoom(21_097, 60).zoom).toBeGreaterThan(suggestedZoom(21_097, 15).zoom);
  });

  it('gives the same starting distance to replays that travel at the same rate', () => {
    // 20 km in 60s and 5 km in 15s are both 333 m per second of video.
    expect(suggestedZoom(20_000, 60).level).toBe(suggestedZoom(5_000, 15).level);
  });

  it('always lands on one of the stops the slider exposes', () => {
    for (const [distance, duration] of [[200, 90], [11_107, 60], [1_000_000, 15]] as const) {
      const level = getSuggestedFollowBehindZoomLevel({
        totalDistanceMeters: distance, videoDurationSeconds: duration, latitudeDeg: LAT,
      });
      expect(getFollowBehindLevelForStopIndex(getFollowBehindStopIndexForLevel(level))).toBe(level);
    }
  });

  it('accounts for Mercator scale changing with latitude', () => {
    // The same zoom shows less ground far from the equator, so a polar route
    // has to start further back than an equatorial one moving at the same rate.
    expect(suggestedZoom(11_107, 60, 78).zoom).toBeLessThanOrEqual(suggestedZoom(11_107, 60, 0).zoom);
  });

  it('falls back to the default preset when the route is not measurable yet', () => {
    const fallback = getFollowBehindZoomLevelForPreset('medium');

    expect(getSuggestedFollowBehindZoomLevel({
      totalDistanceMeters: 0, videoDurationSeconds: 60, latitudeDeg: LAT,
    })).toBe(fallback);
    expect(getSuggestedFollowBehindZoomLevel({
      totalDistanceMeters: 10_000, videoDurationSeconds: 0, latitudeDeg: LAT,
    })).toBe(fallback);
    expect(getSuggestedFollowBehindZoomLevel({
      totalDistanceMeters: 10_000, videoDurationSeconds: 60, latitudeDeg: Number.NaN,
    })).toBe(fallback);
  });
});
