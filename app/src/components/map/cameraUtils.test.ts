import { describe, expect, it } from 'vitest';
import {
  calculateTerrainAwareAdjustments,
  cameraCenterChaseDurationFromStability,
  cameraReactivityFromStability,
  frameTimeMultiplierFromDeltaMs,
  smoothBearing,
  smoothCoordinate,
  smoothPitch,
  smoothZoom,
} from './cameraUtils';

describe('camera utilities', () => {
  it('holds the heading for small route wiggles', () => {
    expect(smoothBearing(90, 93)).toBe(90);
    expect(smoothBearing(359, 1)).toBe(359);
  });

  it('still turns smoothly once the route makes a meaningful turn', () => {
    expect(smoothBearing(90, 100, 0.1)).toBeCloseTo(90.85);
  });

  it('caps a sharp camera turn so it enters the frame progressively', () => {
    expect(smoothBearing(0, 150)).toBeCloseTo(0.85);
  });

  it('still widens the deadband at low stability, ignoring a turn the baseline would follow', () => {
    // reactivity 0.25 (lowest stability) widens the deadband to 4/0.25 = 16
    // degrees, so a 10-degree wiggle is still ignored the same as before.
    expect(smoothBearing(90, 100, undefined, undefined, 0.25)).toBe(90);
  });

  it('turns faster at low stability than naively scaling speed by reactivity would', () => {
    // Low stability (reactivity 0.25) used to also cap turn speed at 0.25x
    // baseline (maxChange 0.85 * 0.25 = 0.2125/frame) — slow enough that on
    // a curvy route the camera's facing direction permanently fell behind
    // the route's real heading, breaking the follow-behind chase-camera
    // illusion. It should now turn noticeably faster than that old cap,
    // while still slower than the reactivity-1 baseline.
    const oldNaiveMaxChange = 0.85 * 0.25;
    const baselineMaxChange = 0.85 * 1;
    const result = smoothBearing(0, 90, undefined, undefined, 0.25);
    expect(result).toBeGreaterThan(oldNaiveMaxChange);
    expect(result).toBeLessThan(baselineMaxChange);
    expect(result).toBeCloseTo(0.53125, 5);
  });

  it('holds zoom steady for tiny terrain-estimation changes', () => {
    expect(smoothZoom(15, 15.02)).toBe(15);
  });

  it('zooms in gradually but opens the frame faster when terrain requires it', () => {
    expect(smoothZoom(15, 16)).toBeCloseTo(15.035);
    expect(smoothZoom(15, 10)).toBeCloseTo(14.88);
  });

  it('holds pitch steady for small terrain changes and opens the view progressively', () => {
    expect(smoothPitch(45, 44.8)).toBe(45);
    expect(smoothPitch(45, 30)).toBe(44.4);
  });

  it('uses climb above the route low point rather than absolute altitude', () => {
    const flatHighRoute = [{ elevation: 1800 }, { elevation: 1820 }];
    expect(calculateTerrainAwareAdjustments(1800, flatHighRoute, 0).zoomAdjust).toBe(0);

    const climbingRoute = [{ elevation: 600 }, { elevation: 1800 }];
    expect(calculateTerrainAwareAdjustments(1800, climbingRoute, 1).zoomAdjust).toBeGreaterThan(1.5);
  });

  it('maps the stability slider to a reactivity multiplier centered on the tuned defaults', () => {
    expect(cameraReactivityFromStability(0.5)).toBeCloseTo(1);
    expect(cameraReactivityFromStability(0)).toBeCloseTo(0.25);
    expect(cameraReactivityFromStability(1)).toBeCloseTo(1.75);
    expect(cameraReactivityFromStability(Number.NaN)).toBeCloseTo(1);
  });

  it('turns the stable endpoint into a cinematic centre glide', () => {
    expect(cameraCenterChaseDurationFromStability(0)).toBe(900);
    expect(cameraCenterChaseDurationFromStability(0.25)).toBe(300);
    expect(cameraCenterChaseDurationFromStability(0.5)).toBe(100);
    expect(cameraCenterChaseDurationFromStability(1)).toBe(55);
    expect(cameraCenterChaseDurationFromStability(Number.NaN)).toBe(100);
  });

  it('filters positional corrections much more strongly at maximum stability', () => {
    const target: [number, number] = [10, 0];
    const cinematic = smoothCoordinate(
      [0, 0],
      target,
      1000 / 60,
      cameraCenterChaseDurationFromStability(0),
    );
    const defaultCamera = smoothCoordinate(
      [0, 0],
      target,
      1000 / 60,
      cameraCenterChaseDurationFromStability(0.5),
    );

    expect(cinematic[0]).toBeLessThan(defaultCamera[0] / 5);
  });

  it('a low reactivity holds the heading through bigger route wiggles than the default', () => {
    expect(smoothBearing(90, 93, undefined, undefined, 0.25)).toBe(90);
    expect(smoothBearing(90, 100, undefined, undefined, 0.25)).toBe(90);
  });

  it('a high reactivity turns and zooms faster than the default', () => {
    const stableChange = smoothBearing(0, 150, undefined, undefined, 0.25) - 0;
    const reactiveChange = smoothBearing(0, 150, undefined, undefined, 1.75) - 0;
    expect(reactiveChange).toBeGreaterThan(stableChange);

    const stableZoom = smoothZoom(15, 16, undefined, undefined, 0.25);
    const reactiveZoom = smoothZoom(15, 16, undefined, undefined, 1.75);
    expect(reactiveZoom - 15).toBeGreaterThan(stableZoom - 15);
  });

  it('maps elapsed time to a frame-time multiplier centered on a 60fps reference frame', () => {
    expect(frameTimeMultiplierFromDeltaMs(1000 / 60)).toBeCloseTo(1);
    expect(frameTimeMultiplierFromDeltaMs(1000 / 30)).toBeCloseTo(2);
    expect(frameTimeMultiplierFromDeltaMs(1000 / 120)).toBeCloseTo(0.5);
    // Non-finite or non-positive deltas (first frame, clock hiccups) fall back to neutral.
    expect(frameTimeMultiplierFromDeltaMs(0)).toBe(1);
    expect(frameTimeMultiplierFromDeltaMs(Number.NaN)).toBe(1);
    // A huge gap (e.g. a backgrounded tab) is clamped rather than flinging the camera.
    expect(frameTimeMultiplierFromDeltaMs(10_000)).toBeCloseTo(4);
  });

  it('produces the same total camera movement over a fixed clip regardless of export fps', () => {
    // Simulates exporting the same 1-second turn at 30fps vs 60fps: without
    // frame-time compensation, 60fps calls the smoothing function twice as
    // often and the camera would travel roughly twice as far in that second.
    const runFrames = (frameCount: number, deltaMs: number) => {
      let bearing = 0;
      for (let i = 0; i < frameCount; i += 1) {
        const multiplier = frameTimeMultiplierFromDeltaMs(deltaMs);
        bearing = smoothBearing(bearing, 90, undefined, undefined, 1, multiplier);
      }
      return bearing;
    };

    const after30fps = runFrames(30, 1000 / 30);
    const after60fps = runFrames(60, 1000 / 60);
    expect(after60fps).toBeCloseTo(after30fps, 1);
  });

  it('smoothCoordinate snaps straight to target on the first call', () => {
    expect(smoothCoordinate([0, 0], [1, 2], -1)).toEqual([1, 2]);
    expect(smoothCoordinate([0, 0], [1, 2], 0)).toEqual([1, 2]);
  });

  it('smoothCoordinate reaches the target once elapsed time covers the chase duration', () => {
    expect(smoothCoordinate([0, 0], [1, 2], 100, 100)).toEqual([1, 2]);
    expect(smoothCoordinate([0, 0], [1, 2], 500, 100)).toEqual([1, 2]);
  });

  it('smoothCoordinate advances proportionally to elapsed time for a partial step', () => {
    expect(smoothCoordinate([0, 0], [10, 20], 25, 100)).toEqual([2.5, 5]);
  });

  it('smoothCoordinate keeps narrowing the gap to a fixed target over repeated small steps', () => {
    let position: [number, number] = [0, 0];
    let previousGap = 10;
    for (let i = 0; i < 10; i += 1) {
      position = smoothCoordinate(position, [10, 0], 10, 100);
      const gap = 10 - position[0];
      expect(gap).toBeLessThan(previousGap);
      expect(gap).toBeGreaterThan(0);
      previousGap = gap;
    }
  });
});
