import { describe, expect, it } from 'vitest';
import { resolveOverlayPlacement, computeOverlayDrawPosition } from './overlayPosition';

describe('resolveOverlayPlacement', () => {
  it('splits every explicit position into vertical + horizontal', () => {
    expect(resolveOverlayPlacement('top-left', 1920, 1080)).toEqual({ vertical: 'top', horizontal: 'left' });
    expect(resolveOverlayPlacement('top-center', 1920, 1080)).toEqual({ vertical: 'top', horizontal: 'center' });
    expect(resolveOverlayPlacement('top-right', 1920, 1080)).toEqual({ vertical: 'top', horizontal: 'right' });
    expect(resolveOverlayPlacement('bottom-left', 1920, 1080)).toEqual({ vertical: 'bottom', horizontal: 'left' });
    expect(resolveOverlayPlacement('bottom-center', 1920, 1080)).toEqual({ vertical: 'bottom', horizontal: 'center' });
    expect(resolveOverlayPlacement('bottom-right', 1920, 1080)).toEqual({ vertical: 'bottom', horizontal: 'right' });
  });

  it('resolves auto to legacy portrait-center / landscape-left by frame aspect', () => {
    // landscape (wide) → top-left
    expect(resolveOverlayPlacement('auto', 1920, 1080)).toEqual({ vertical: 'top', horizontal: 'left' });
    // portrait (narrow) → top-center
    expect(resolveOverlayPlacement('auto', 1080, 1920)).toEqual({ vertical: 'top', horizontal: 'center' });
    // square counts as narrow (width <= height) → top-center, matching the old isNarrowFrame rule
    expect(resolveOverlayPlacement('auto', 1080, 1080)).toEqual({ vertical: 'top', horizontal: 'center' });
  });
});

describe('computeOverlayDrawPosition', () => {
  const base = {
    frameLeft: 0,
    frameTop: 0,
    frameWidth: 1000,
    frameHeight: 600,
    overlayWidth: 200,
    overlayHeight: 100,
    margin: 20,
  };

  it('pins top-left at the margin', () => {
    const p = computeOverlayDrawPosition({ ...base, position: 'top-left' });
    expect(p).toEqual({ drawX: 20, drawY: 20 });
  });

  it('centers top-center horizontally', () => {
    const p = computeOverlayDrawPosition({ ...base, position: 'top-center' });
    expect(p.drawX).toBe((1000 - 200) / 2);
    expect(p.drawY).toBe(20);
  });

  it('pins top-right against the right margin', () => {
    const p = computeOverlayDrawPosition({ ...base, position: 'top-right' });
    expect(p.drawX).toBe(1000 - 200 - 20);
    expect(p.drawY).toBe(20);
  });

  it('anchors bottom-left to the frame bottom', () => {
    const p = computeOverlayDrawPosition({ ...base, position: 'bottom-left' });
    expect(p.drawX).toBe(20);
    expect(p.drawY).toBe(600 - 100 - 20);
  });

  it('anchors bottom-right to both bottom and right', () => {
    const p = computeOverlayDrawPosition({ ...base, position: 'bottom-right' });
    expect(p.drawX).toBe(1000 - 200 - 20);
    expect(p.drawY).toBe(600 - 100 - 20);
  });

  it('respects a non-zero frame origin', () => {
    const p = computeOverlayDrawPosition({ ...base, position: 'top-left', frameLeft: 100, frameTop: 50 });
    expect(p).toEqual({ drawX: 120, drawY: 70 });
  });

  it('places auto by frame aspect', () => {
    // wide frame → left
    const wide = computeOverlayDrawPosition({ ...base, position: 'auto', frameWidth: 1000, frameHeight: 600 });
    expect(wide).toEqual({ drawX: 20, drawY: 20 });
    // tall frame → centered
    const tall = computeOverlayDrawPosition({ ...base, position: 'auto', frameWidth: 600, frameHeight: 1000 });
    expect(tall.drawX).toBe((600 - 200) / 2);
    expect(tall.drawY).toBe(20);
  });
});
