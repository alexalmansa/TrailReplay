import { describe, expect, it } from 'vitest';
import {
  getCapturedCanvasDrawSize,
  getElevationOverlayDrawRect,
  getExportOverlayMetrics,
  getOverlayRefreshIntervalMs,
  getPopupOverlayDrawRect,
  getStatsOverlayDrawRect,
  isDrawableRect,
} from './exportOverlay';

describe('exportOverlay', () => {
  it('caps overlay refresh cadence to a smoother but safe interval', () => {
    expect(getOverlayRefreshIntervalMs(30)).toBe(21);
    expect(getOverlayRefreshIntervalMs(24)).toBe(21);
    expect(getOverlayRefreshIntervalMs(12)).toBe(42);
    expect(getOverlayRefreshIntervalMs(6)).toBe(83);
  });

  it('derives crop metrics and overlay scaling from the exported frame', () => {
    const metrics = getExportOverlayMetrics({ width: 1200, height: 800 }, 1080, 1920);

    expect(metrics.cropX).toBeGreaterThan(0);
    expect(metrics.cropY).toBe(0);
    expect(metrics.cropW).toBeLessThan(1200);
    expect(metrics.scaleToRecording).toBeGreaterThan(1);
  });

  it('keeps elevation overlay centered and inside the exported frame', () => {
    const rect = getElevationOverlayDrawRect({
      captureCanvas: { width: 800, height: 60 },
      scaleToRecording: 1.5,
      recordW: 1080,
      recordH: 1920,
      margin: 27,
    });

    expect(rect.drawWidth).toBeLessThanOrEqual(1080 * 0.85);
    expect(rect.drawX).toBeGreaterThanOrEqual(0);
    expect(rect.drawY + rect.drawHeight).toBe(1920 - 27);
  });

  it('centers and constrains the stats overlay for portrait exports', () => {
    const rect = getStatsOverlayDrawRect({
      captureCanvas: { width: 920, height: 220 },
      scaleToRecording: 1,
      recordW: 1080,
      recordH: 1920,
      margin: 27,
    });

    expect(rect.drawWidth).toBeLessThanOrEqual(1080 * 0.56);
    expect(rect.drawX).toBeCloseTo((1080 - rect.drawWidth) / 2);
    expect(rect.drawY).toBe(27);
  });

  it('keeps the stats overlay pinned to the top-left for landscape exports', () => {
    const rect = getStatsOverlayDrawRect({
      captureCanvas: { width: 520, height: 120 },
      scaleToRecording: 1,
      recordW: 1920,
      recordH: 1080,
      margin: 48,
    });

    expect(rect.drawX).toBe(48);
    expect(rect.drawY).toBe(48);
    expect(rect.drawWidth).toBeLessThanOrEqual(1920 * 0.28);
  });

  it('maps popup coordinates into the cropped export frame', () => {
    const rect = getPopupOverlayDrawRect({
      popupRect: { left: 240, top: 120, width: 320, height: 180 },
      containerRect: { left: 100, top: 50, width: 1200, height: 800 },
      cropX: 150,
      cropY: 0,
      scaleToRecording: 1.5,
    });

    expect(rect.drawX).toBeCloseTo(-15);
    expect(rect.drawY).toBeCloseTo(105);
    expect(rect.drawWidth).toBe(480);
    expect(rect.drawHeight).toBe(270);
    expect(isDrawableRect(rect)).toBe(true);
  });

  it('scales captured html2canvas output back to recording pixels', () => {
    const size = getCapturedCanvasDrawSize({ width: 600, height: 150 }, 1.8, 2);

    expect(size.drawWidth).toBe(540);
    expect(size.drawHeight).toBe(135);
  });
});
