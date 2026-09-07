import { describe, expect, it } from 'vitest';
import {
  clampLandmarkLabelScale,
  landmarkTextHaloWidth,
  landmarkTextOpacityExpression,
  landmarkTextSizeExpression,
} from './landmarkLabelStyle';

describe('clampLandmarkLabelScale', () => {
  it('keeps a scale inside the supported range', () => {
    expect(clampLandmarkLabelScale(1.2)).toBe(1.2);
    expect(clampLandmarkLabelScale(5)).toBe(1.8);
    expect(clampLandmarkLabelScale(0)).toBe(0.7);
  });

  it('falls back to 1 for settings saved before this control existed', () => {
    expect(clampLandmarkLabelScale(undefined)).toBe(1);
    expect(clampLandmarkLabelScale(Number.NaN)).toBe(1);
  });
});

describe('landmarkTextSizeExpression', () => {
  it('reproduces the original stops at scale 1', () => {
    expect(landmarkTextSizeExpression(1)).toEqual([
      'interpolate', ['linear'], ['zoom'], 7, 9, 9, 10, 11, 12, 15, 13,
    ]);
  });

  it('scales every stop', () => {
    const expression = landmarkTextSizeExpression(2) as unknown[];
    expect(expression.slice(3)).toEqual([7, 16.2, 9, 18, 11, 21.6, 15, 23.4]);
  });
});

describe('landmarkTextHaloWidth', () => {
  it('grows with the label so contrast holds', () => {
    expect(landmarkTextHaloWidth(1)).toBe(3.5);
    expect(landmarkTextHaloWidth(1.8)).toBeGreaterThan(landmarkTextHaloWidth(1));
  });
});

describe('landmarkTextOpacityExpression', () => {
  it('uses the feature opacity directly when fade is off', () => {
    expect(landmarkTextOpacityExpression(false)).toEqual(['get', 'opacity']);
  });

  it('ramps up to the feature opacity when fade is on', () => {
    expect(landmarkTextOpacityExpression(true)).toEqual([
      'interpolate', ['linear'], ['zoom'], 8, 0, 10.5, ['get', 'opacity'],
    ]);
  });
});
