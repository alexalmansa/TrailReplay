import { describe, expect, it } from 'vitest';
import {
  clampLandmarkScale,
  landmarkIconSizeExpression,
  landmarkTextHaloWidth,
  landmarkTextOpacityExpression,
  landmarkTextSizeExpression,
} from './landmarkSymbolStyle';

describe('clampLandmarkScale', () => {
  it('keeps a scale inside the supported range', () => {
    expect(clampLandmarkScale(1.2)).toBe(1.2);
    expect(clampLandmarkScale(5)).toBe(1.8);
    expect(clampLandmarkScale(0)).toBe(0.7);
  });

  it('falls back to 1 for settings saved before this control existed', () => {
    expect(clampLandmarkScale(undefined)).toBe(1);
    expect(clampLandmarkScale(Number.NaN)).toBe(1);
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

describe('landmarkIconSizeExpression', () => {
  const selected = ['boolean', ['get', 'selected'], false];

  it('reproduces the original icon stops at scale 1', () => {
    expect(landmarkIconSizeExpression(1)).toEqual([
      'interpolate', ['linear'], ['zoom'],
      7, ['case', selected, 0.702, 0.52],
      9, ['case', selected, 0.837, 0.62],
      15, ['case', selected, 1.242, 0.92],
    ]);
  });

  it('scales the pin by the same setting as the label', () => {
    const iconAt15 = (landmarkIconSizeExpression(1.5) as unknown[])[8] as unknown[];
    const textAt15 = (landmarkTextSizeExpression(1.5) as unknown[])[10] as number;

    // Both ends of the ramp move together: 0.92 * 1.5 and 13 * 1.5.
    expect(iconAt15[3]).toBe(1.38);
    expect(textAt15).toBe(19.5);
  });

  it('keeps the zoom curve outermost, which MapLibre requires', () => {
    expect((landmarkIconSizeExpression(1.2) as unknown[])[0]).toBe('interpolate');
  });

  it('clamps like the label ramp does', () => {
    expect(landmarkIconSizeExpression(99)).toEqual(landmarkIconSizeExpression(1.8));
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
