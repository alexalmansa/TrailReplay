import { describe, expect, it } from 'vitest';
import {
  calculateTerrainAwareAdjustments,
  cameraReactivityFromStability,
  smoothBearing,
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
});
