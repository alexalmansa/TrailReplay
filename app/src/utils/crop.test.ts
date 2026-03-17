import { describe, expect, it } from 'vitest';
import { getCropPreviewMetrics, getCropRegion } from './crop';

describe('crop utils', () => {
  it('adds top and bottom bars when the export is wider than the container', () => {
    const metrics = getCropPreviewMetrics(1200, 800, '16:9');

    expect(metrics.top).toBeGreaterThan(0);
    expect(metrics.bottom).toBe(metrics.top);
    expect(metrics.left).toBe(0);
    expect(metrics.frameHeight).toBeLessThan(800);
  });

  it('adds left and right bars when the export is narrower than the container', () => {
    const region = getCropRegion({ width: 1200, height: 800 }, 1080, 1920);

    expect(region.cropX).toBeGreaterThan(0);
    expect(region.cropY).toBe(0);
    expect(region.cropW).toBeLessThan(1200);
    expect(region.cropH).toBe(800);
  });
});
