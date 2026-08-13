import { describe, expect, it } from 'vitest';
import { calculateTerrainAwareAdjustments, smoothBearing, smoothZoom } from './cameraUtils';

describe('camera utilities', () => {
  it('holds the heading for small route wiggles', () => {
    expect(smoothBearing(90, 93)).toBe(90);
    expect(smoothBearing(359, 1)).toBe(359);
  });

  it('still turns smoothly once the route makes a meaningful turn', () => {
    expect(smoothBearing(90, 100, 0.1)).toBe(91);
  });

  it('caps a sharp camera turn so it enters the frame progressively', () => {
    expect(smoothBearing(0, 150)).toBe(1.25);
  });

  it('holds zoom steady for tiny terrain-estimation changes', () => {
    expect(smoothZoom(15, 15.02)).toBe(15);
  });

  it('zooms in gradually but opens the frame faster when terrain requires it', () => {
    expect(smoothZoom(15, 16)).toBeCloseTo(15.035);
    expect(smoothZoom(15, 10)).toBeCloseTo(14.88);
  });

  it('uses climb above the route low point rather than absolute altitude', () => {
    const flatHighRoute = [{ elevation: 1800 }, { elevation: 1820 }];
    expect(calculateTerrainAwareAdjustments(1800, flatHighRoute, 0).zoomAdjust).toBe(0);

    const climbingRoute = [{ elevation: 600 }, { elevation: 1800 }];
    expect(calculateTerrainAwareAdjustments(1800, climbingRoute, 1).zoomAdjust).toBeGreaterThan(1.5);
  });
});
